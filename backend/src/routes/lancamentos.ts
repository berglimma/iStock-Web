import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { registrarTransacao, TipoTransacao } from '../services/transacaoLogService.js';
import { criadoPorLabel, store } from '../store/index.js';
import type { Lancamento } from '../types.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  res.json(await store.listLancamentos());
});

router.get('/metricas', async (_req, res) => {
  const items = await store.listLancamentos();
  const noEstoque = items.filter((i) => i.status === 'Disponível' || i.status === 'Reservado');
  const vendidos = items.filter((i) => i.status === 'Vendido');
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const vendidosNoMes = vendidos.filter((i) => i.dataVenda && new Date(i.dataVenda) >= inicioMes);

  res.json({
    valorTotalEstoque: noEstoque.reduce((s, i) => s + i.valor, 0),
    custoTotalEstoque: noEstoque.reduce((s, i) => s + (i.custoCompra ?? 0), 0),
    receitaTotalVendida: vendidos.reduce((s, i) => s + i.valor, 0),
    receitaMes: vendidosNoMes.reduce((s, i) => s + i.valor, 0),
    noEstoque: noEstoque.length,
    disponiveis: items.filter((i) => i.status === 'Disponível').length,
    reservados: items.filter((i) => i.status === 'Reservado').length,
    vendidos: vendidos.length,
    vendidosNoMes: vendidosNoMes.length,
    parados: items.filter((i) => i.estaHaMuitoTempoNoEstoque).length,
  });
});

router.post('/', async (req, res) => {
  const l = req.body as Lancamento;
  const criadoPor = criadoPorLabel(req.user!.nome, req.user!.email);
  const id = await store.createLancamento(l, criadoPor);
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const l = req.body as Lancamento;
  const items = await store.listLancamentos();
  const anterior = items.find((i) => i.id === req.params.id);
  await store.updateLancamento(req.params.id, l);

  if (l.status === 'Vendido' && anterior?.status !== 'Vendido') {
    const titulo = l.modelo ? `${l.nome} — ${l.modelo}` : l.nome;
    await registrarTransacao({
      tipo: TipoTransacao.vendaProduto,
      titulo: `Venda: ${titulo}`,
      detalhes: l.clienteVendaNome ? `Cliente: ${l.clienteVendaNome}` : undefined,
      valor: l.valor,
      referenciaId: req.params.id,
      usuario: criadoPorLabel(req.user!.nome, req.user!.email),
    });
  }

  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await store.deleteLancamento(req.params.id);
  res.json({ ok: true });
});

export default router;
