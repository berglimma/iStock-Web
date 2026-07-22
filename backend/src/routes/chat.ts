import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { DIAS_HISTORICO_CHAT, store } from '../store/index.js';
import type { Mensagem } from '../types.js';

const router = Router();

router.use(authMiddleware);

router.get('/conversas', async (req, res) => {
  res.json(await store.listConversas(req.user!.id));
});

router.post('/conversas', async (req, res) => {
  const { clienteId, clienteNome } = req.body as { clienteId?: string; clienteNome?: string };
  if (!clienteId || !clienteNome?.trim()) {
    return res.status(400).json({ erro: 'Selecione um contato para iniciar a conversa.' });
  }

  const existente = await store.findConversaPorCliente(clienteId, req.user!.id);
  if (existente?.id) {
    return res.status(200).json(existente);
  }

  const id = await store.createConversa({
    clienteId,
    clienteNome: clienteNome.trim(),
    vendedorId: req.user!.id,
    vendedorNome: req.user!.nome,
    participantes: [req.user!.id, clienteId],
  });

  res.status(201).json({
    id,
    clienteId,
    clienteNome: clienteNome.trim(),
    vendedorId: req.user!.id,
    vendedorNome: req.user!.nome,
    participantes: [req.user!.id, clienteId],
  });
});

router.get('/conversas/:id/mensagens', async (req, res) => {
  const conversaId = req.params.id;
  try {
    await store.purgarMensagensAntigas(conversaId);
  } catch {
    // purga best-effort
  }
  const mensagens = await store.listMensagens(conversaId);
  res.json({
    mensagens,
    retencaoDias: DIAS_HISTORICO_CHAT,
  });
});

router.post('/conversas/:id/mensagens', async (req, res) => {
  const body = req.body as Partial<Mensagem>;
  const texto = (body.texto || '').trim();
  if (!texto && body.tipo === 'texto') {
    return res.status(400).json({ erro: 'Mensagem vazia.' });
  }

  const { id, data } = await store.createMensagem(req.params.id, {
    conversaId: req.params.id,
    remetenteId: req.user!.id,
    remetenteNome: req.user!.nome,
    tipo: body.tipo || 'texto',
    texto: texto || body.texto,
    mediaURL: body.mediaURL,
    data: new Date().toISOString(),
  });
  await store.updateConversaUltimaMensagem(req.params.id, texto || '[mídia]', data);
  res.status(201).json({ id, data });
});

export default router;
