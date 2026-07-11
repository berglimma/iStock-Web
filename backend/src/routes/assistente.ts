import { Router } from 'express';
import { authMiddleware, requirePapel, type PapelUsuario } from '../middleware/auth.js';
import {
  gerarRespostaAssistente,
  tituloModo,
  type CriteriosAssistente,
  type ModoAssistente,
} from '../services/assistenteIA.js';
import { store } from '../store/index.js';

const router = Router();
router.use(authMiddleware);
router.use(requirePapel('Administrador', 'Consultor de vendas', 'Cliente'));

const MODOS_VALIDOS: ModoAssistente[] = ['negociacao', 'consultor-vendas', 'consultor-tecnico'];

function modosPermitidos(papel: PapelUsuario): ModoAssistente[] {
  if (papel === 'Cliente') return ['consultor-tecnico'];
  return MODOS_VALIDOS;
}

function podeEditarCriterios(papel: PapelUsuario): boolean {
  return papel === 'Administrador' || papel === 'Consultor de vendas';
}

router.get('/criterios', async (req, res) => {
  if (!podeEditarCriterios(req.user!.papel)) {
    return res.json({ criterios: null });
  }
  const criterios = await store.getCriteriosAssistente(req.user!.id);
  res.json({ criterios });
});

router.put('/criterios', async (req, res) => {
  if (!podeEditarCriterios(req.user!.papel)) {
    return res.status(403).json({ erro: 'Apenas a loja pode editar critérios' });
  }
  const dados = req.body as Partial<CriteriosAssistente>;
  const criterios = await store.saveCriteriosAssistente(req.user!.id, dados);
  res.json({ criterios });
});

router.get('/sessoes', async (req, res) => {
  const modo = req.query.modo as ModoAssistente | undefined;
  const permitidos = modosPermitidos(req.user!.papel);
  const filtro = modo && permitidos.includes(modo) ? modo : undefined;
  if (modo && !permitidos.includes(modo)) {
    return res.status(403).json({ erro: 'Modo não disponível para o seu perfil' });
  }
  const sessoes = await store.listSessoesAssistente(req.user!.id, filtro);
  res.json(sessoes.map((s) => ({
    id: s.id,
    modo: s.modo,
    titulo: s.titulo,
    criadoEm: s.criadoEm,
    atualizadoEm: s.atualizadoEm,
  })));
});

router.post('/sessoes', async (req, res) => {
  const { modo, titulo } = req.body as { modo: ModoAssistente; titulo?: string };
  if (!MODOS_VALIDOS.includes(modo)) {
    return res.status(400).json({ erro: 'Modo inválido' });
  }
  if (!modosPermitidos(req.user!.papel).includes(modo)) {
    return res.status(403).json({ erro: 'Modo não disponível para o seu perfil' });
  }

  const id = crypto.randomUUID();
  const agora = new Date().toISOString();
  const nome = titulo?.trim() || tituloModo(modo);

  await store.createSessaoAssistente({
    id,
    usuarioId: req.user!.id,
    modo,
    titulo: nome,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  const abertura = gerarRespostaAssistente(modo, req.user!.id, '', true);
  await store.createMensagemAssistente({
    id: crypto.randomUUID(),
    sessaoId: id,
    papel: 'assistente',
    conteudo: abertura,
    metadados: { tipo: 'abertura' },
    data: agora,
  });

  res.status(201).json({ id, modo, titulo: nome, criadoEm: agora, atualizadoEm: agora });
});

router.get('/sessoes/:id/mensagens', async (req, res) => {
  const sessao = await store.getSessaoAssistente(req.params.id, req.user!.id);
  if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada' });
  if (!modosPermitidos(req.user!.papel).includes(sessao.modo)) {
    return res.status(403).json({ erro: 'Modo não disponível para o seu perfil' });
  }
  const msgs = await store.listMensagensAssistente(req.params.id);
  res.json(msgs);
});

router.post('/sessoes/:id/mensagens', async (req, res) => {
  const sessao = await store.getSessaoAssistente(req.params.id, req.user!.id);
  if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada' });
  if (!modosPermitidos(req.user!.papel).includes(sessao.modo)) {
    return res.status(403).json({ erro: 'Modo não disponível para o seu perfil' });
  }

  const { conteudo } = req.body as { conteudo: string };
  if (!conteudo?.trim()) return res.status(400).json({ erro: 'Mensagem vazia' });

  const agora = new Date().toISOString();
  const userMsgId = crypto.randomUUID();
  await store.createMensagemAssistente({
    id: userMsgId,
    sessaoId: sessao.id,
    papel: 'usuario',
    conteudo: conteudo.trim(),
    data: agora,
  });

  const resposta = gerarRespostaAssistente(sessao.modo, req.user!.id, conteudo, false);
  const criterios = podeEditarCriterios(req.user!.papel)
    ? await store.getCriteriosAssistente(req.user!.id)
    : null;
  const aiMsgId = crypto.randomUUID();
  await store.createMensagemAssistente({
    id: aiMsgId,
    sessaoId: sessao.id,
    papel: 'assistente',
    conteudo: resposta,
    metadados: criterios ? { criterios } : {},
    data: agora,
  });

  await store.updateSessaoAssistente(sessao.id, agora);

  res.json({
    usuario: { id: userMsgId, sessaoId: sessao.id, papel: 'usuario', conteudo: conteudo.trim(), data: agora },
    assistente: {
      id: aiMsgId,
      sessaoId: sessao.id,
      papel: 'assistente',
      conteudo: resposta,
      metadados: criterios ? { criterios } : {},
      data: agora,
    },
  });
});

router.delete('/sessoes/:id', async (req, res) => {
  const sessao = await store.getSessaoAssistente(req.params.id, req.user!.id);
  if (!sessao) return res.status(404).json({ erro: 'Sessão não encontrada' });
  await store.deleteSessaoAssistente(sessao.id);
  res.json({ ok: true });
});

export default router;
