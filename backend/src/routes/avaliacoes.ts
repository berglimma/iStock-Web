import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { pesquisarDefeitos } from '../services/defeitosService.js';
import { estimarPreco } from '../services/precificador.js';
import { registrarTransacao, TipoTransacao, tituloAvaliacao } from '../services/transacaoLogService.js';
import { criadoPorLabel, store } from '../store/index.js';
import type { Avaliacao, Lancamento, RetiradaProduto } from '../types.js';

const router = Router();

router.use(authMiddleware);

function usuario(req: Request) {
  return criadoPorLabel(req.user!.nome, req.user!.email);
}

router.get('/', async (_req, res) => {
  res.json(await store.listAvaliacoes());
});

router.get('/metricas', async (_req, res) => {
  const items = await store.listAvaliacoes();
  const aprovadas = items.filter((a) => a.status === 'Aprovado');
  const avaliadas = items.filter((a) => a.status === 'Avaliado' && a.valorEstimado);

  res.json({
    emAvaliacao: items.filter((a) => a.status === 'Em avaliação').length,
    aprovadasSemPagamento: aprovadas.filter((a) => !a.pagamentoAprovado).length,
    totalCompradoAprovado: aprovadas.reduce((s, a) => s + (a.valorCompraSugerido ?? 0), 0),
    totalPagamentoPendente: aprovadas.filter((a) => !a.pagamentoAprovado).reduce((s, a) => s + (a.valorCompraSugerido ?? 0), 0),
    totalPagamentoAprovado: items.filter((a) => a.pagamentoAprovado).reduce((s, a) => s + (a.valorCompraSugerido ?? 0), 0),
    totalEstimadoAvaliadas: avaliadas.reduce((s, a) => s + (a.valorEstimado ?? 0), 0),
    totalVendaRealAvaliadas: avaliadas.reduce((s, a) => s + (a.valorVendaReal ?? a.valorEstimado ?? 0), 0),
  });
});

router.post('/', async (req, res) => {
  const a = req.body as Avaliacao;
  if (!a.nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
  if (!a.telefone?.trim()) return res.status(400).json({ erro: 'Telefone de contato obrigatório' });

  const criadoPor = criadoPorLabel(req.user!.nome, req.user!.email);
  const problemas = a.problemasModelo?.length
    ? a.problemasModelo
    : pesquisarDefeitos(a.tipoProduto, a.modelo).problemas;

  const id = await store.createAvaliacao({ ...a, problemasModelo: problemas }, criadoPor);
  const titulo = tituloAvaliacao(a.nome, a.modelo);
  await registrarTransacao({
    tipo: TipoTransacao.avaliacaoCriada,
    titulo: `Nova avaliação: ${titulo}`,
    referenciaId: id,
    usuario: usuario(req),
  });
  res.status(201).json({ id });
});

router.post('/:id/avaliar', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.status !== 'Em avaliação') return res.status(400).json({ erro: 'Avaliação já processada' });

  const resultado = estimarPreco(av);
  const problemas = av.problemasModelo?.length
    ? av.problemasModelo
    : pesquisarDefeitos(av.tipoProduto, av.modelo).problemas;
  const now = new Date().toISOString();
  const observacoes = av.observacoes
    ? `${av.observacoes}\n${resultado.detalhes}`
    : resultado.detalhes;

  await store.updateAvaliacao(req.params.id, {
    status: 'Avaliado',
    valorEstimado: resultado.valorVenda,
    valorCompraSugerido: resultado.valorCompra,
    dataAvaliacao: now,
    problemasModelo: problemas,
    observacoes,
  });
  const titulo = tituloAvaliacao(av.nome, av.modelo);
  await registrarTransacao({
    tipo: TipoTransacao.avaliacaoConcluida,
    titulo: `Avaliação: ${titulo}`,
    detalhes: 'Estimativa de venda registrada.',
    valor: resultado.valorVenda,
    referenciaId: req.params.id,
    usuario: usuario(req),
  });
  res.json({ ...resultado, status: 'Avaliado' });
});

router.post('/:id/aprovar', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.status !== 'Avaliado') return res.status(400).json({ erro: 'Avalie o preço antes de aprovar' });

  const now = new Date().toISOString();
  await store.updateAvaliacao(req.params.id, { status: 'Aprovado', dataAprovacao: now });
  await registrarTransacao({
    tipo: TipoTransacao.compraAprovada,
    titulo: `Compra aprovada: ${tituloAvaliacao(av.nome, av.modelo)}`,
    valor: av.valorCompraSugerido,
    referenciaId: req.params.id,
    usuario: usuario(req),
  });
  res.json({ ok: true });
});

router.post('/:id/recusar', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.status !== 'Avaliado') return res.status(400).json({ erro: 'Somente avaliações concluídas podem ser recusadas' });

  const { justificativa } = req.body;
  if (!justificativa?.trim()) return res.status(400).json({ erro: 'Justificativa obrigatória' });

  const now = new Date().toISOString();
  await store.updateAvaliacao(req.params.id, {
    status: 'Compra recusada',
    justificativaRecusa: justificativa.trim(),
    dataRecusa: now,
  });
  await registrarTransacao({
    tipo: TipoTransacao.compraRecusada,
    titulo: `Compra não aprovada: ${tituloAvaliacao(av.nome, av.modelo)}`,
    detalhes: justificativa.trim(),
    valor: av.valorCompraSugerido,
    referenciaId: req.params.id,
    usuario: usuario(req),
  });
  res.json({ ok: true });
});

router.post('/:id/aprovar-pagamento', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.status !== 'Aprovado') return res.status(400).json({ erro: 'Compra não aprovada' });

  const now = new Date().toISOString();
  await store.updateAvaliacao(req.params.id, { pagamentoAprovado: true, dataPagamento: now });
  await registrarTransacao({
    tipo: TipoTransacao.pagamentoAprovado,
    titulo: `Pagamento aprovado: ${tituloAvaliacao(av.nome, av.modelo)}`,
    valor: av.valorCompraSugerido,
    referenciaId: req.params.id,
    usuario: usuario(req),
  });
  res.json({ ok: true });
});

router.post('/:id/valor-real', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });

  const { valor } = req.body as { valor?: number };
  if (!valor || valor <= 0) return res.status(400).json({ erro: 'Informe um valor de venda válido' });

  const now = new Date().toISOString();
  await store.updateAvaliacao(req.params.id, { valorVendaReal: valor, dataVendaReal: now });
  await registrarTransacao({
    tipo: TipoTransacao.valorVendaAtualizado,
    titulo: `Venda real: ${tituloAvaliacao(av.nome, av.modelo)}`,
    detalhes: av.valorVendaReal ? 'Valor de venda atualizado.' : 'Valor de venda registrado.',
    valor,
    valorAnterior: av.valorVendaReal,
    referenciaId: req.params.id,
    usuario: usuario(req),
  });
  res.json({ ok: true });
});

router.post('/:id/retirada', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.status !== 'Aprovado') return res.status(400).json({ erro: 'Compra não aprovada' });
  if (av.retirada) return res.status(400).json({ erro: 'Retirada já registrada' });

  const { nomeRecebedor, documentoRecebedor, observacoes, foto } = req.body as {
    nomeRecebedor?: string;
    documentoRecebedor?: string;
    observacoes?: string;
    foto?: { id: string; url: string; path?: string };
  };

  if (!nomeRecebedor?.trim()) return res.status(400).json({ erro: 'Informe quem recebeu o produto' });

  const retirada: RetiradaProduto = {
    nomeRecebedor: nomeRecebedor.trim(),
    documentoRecebedor: documentoRecebedor?.trim() || undefined,
    observacoes: observacoes?.trim() || undefined,
    foto,
    data: new Date().toISOString(),
    registradoPor: criadoPorLabel(req.user!.nome, req.user!.email),
  };

  await store.updateAvaliacao(req.params.id, { retirada });
  const detalhes = [
    `Recebedor: ${retirada.nomeRecebedor}`,
    retirada.documentoRecebedor ? `Documento: ${retirada.documentoRecebedor}` : null,
    retirada.observacoes ? `Obs.: ${retirada.observacoes}` : null,
  ].filter(Boolean).join(' | ');
  await registrarTransacao({
    tipo: TipoTransacao.retiradaRegistrada,
    titulo: `Retirada: ${tituloAvaliacao(av.nome, av.modelo)}`,
    detalhes,
    referenciaId: req.params.id,
    usuario: usuario(req),
  });
  res.json({ ok: true });
});

router.post('/:id/estoque', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  if (!av) return res.status(404).json({ erro: 'Avaliação não encontrada' });
  if (av.status !== 'Aprovado') return res.status(400).json({ erro: 'Compra não aprovada' });
  if (!av.pagamentoAprovado) return res.status(400).json({ erro: 'Aprove o pagamento antes de adicionar ao estoque' });
  if (!av.retirada) return res.status(400).json({ erro: 'Registre a retirada do produto antes de adicionar ao estoque' });

  const valorVenda = av.valorVendaReal ?? av.valorEstimado ?? 0;
  if (valorVenda <= 0) return res.status(400).json({ erro: 'Informe o valor de venda antes de adicionar ao estoque' });

  const criadoPor = criadoPorLabel(req.user!.nome, req.user!.email);
  const now = new Date().toISOString();
  const lanc: Lancamento = {
    nome: av.nome,
    tipoProduto: av.tipoProduto,
    modelo: av.modelo,
    capacidade: av.capacidade,
    cor: av.cor,
    telefone: av.telefone,
    serial: av.serial,
    lacrado: av.lacrado,
    condicaoPercentual: av.condicaoPercentual,
    custoCompra: av.valorCompraSugerido,
    valor: valorVenda,
    status: 'Disponível',
    data: now,
    criadoPor,
    observacoes: av.observacoes,
    problemasModelo: av.problemasModelo,
  };
  const lancId = await store.createLancamento(lanc, criadoPor);
  await store.updateAvaliacao(req.params.id, { status: 'No estoque', lancamentoId: lancId });
  await registrarTransacao({
    tipo: TipoTransacao.adicionadoEstoque,
    titulo: `No estoque: ${tituloAvaliacao(av.nome, av.modelo)}`,
    valor: valorVenda,
    referenciaId: lancId,
    usuario: usuario(req),
  });
  res.json({ lancamentoId: lancId });
});

router.put('/:id', async (req, res) => {
  const a = req.body as Avaliacao;
  await store.updateAvaliacao(req.params.id, a);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const av = await store.getAvaliacao(req.params.id);
  await store.deleteAvaliacao(req.params.id);
  if (av) {
    await registrarTransacao({
      tipo: TipoTransacao.avaliacaoExcluida,
      titulo: `Avaliação excluída: ${tituloAvaliacao(av.nome, av.modelo)}`,
      detalhes: 'Exclusão autorizada por administrador.',
      valor: av.valorVendaReal ?? av.valorEstimado,
      referenciaId: req.params.id,
      usuario: usuario(req),
    });
  }
  res.json({ ok: true });
});

export default router;
