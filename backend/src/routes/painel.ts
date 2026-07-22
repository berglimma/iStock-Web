import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { firestore } from '../firebase/admin.js';
import { toIso } from '../firebase/mappers.js';
import { isFirestoreSync, store } from '../store/index.js';
import { montarSugestoes, type ContextoNegocio } from '../services/relatorioAnalise.js';

const router = Router();
router.use(authMiddleware);

function contextoDeListas(
  lancamentos: Awaited<ReturnType<typeof store.listLancamentos>>,
  avaliacoes: Awaited<ReturnType<typeof store.listAvaliacoes>>,
): ContextoNegocio {
  const agora = new Date();
  const inicio = new Date(agora);
  inicio.setDate(inicio.getDate() - 30);

  const vendidos = lancamentos.filter((l) => {
    if (l.status !== 'Vendido') return false;
    const d = new Date(l.dataVenda || l.data);
    return d >= inicio && d <= agora;
  });

  const receita = vendidos.reduce((s, l) => s + (l.valor || 0), 0);
  const custoVendidos = vendidos.reduce((s, l) => s + (l.custoCompra || 0), 0);
  const despesasAvaliacoes = avaliacoes
    .filter((a) => a.pagamentoAprovado && a.dataPagamento)
    .filter((a) => {
      const d = new Date(a.dataPagamento!);
      return d >= inicio && d <= agora;
    })
    .reduce((s, a) => s + (a.valorCompraSugerido || 0), 0);

  const noEstoque = lancamentos.filter((l) => l.status === 'Disponível' || l.status === 'Reservado');
  const margens = vendidos
    .filter((l) => (l.custoCompra || 0) > 0)
    .map((l) => ((l.valor - (l.custoCompra || 0)) / (l.custoCompra || 1)) * 100);

  return {
    receita,
    lucro: receita - (despesasAvaliacoes + custoVendidos),
    itensEstoque: noEstoque.length,
    produtosParados: noEstoque.filter((l) => l.estaHaMuitoTempoNoEstoque).length,
    avaliacoesPendentes: avaliacoes.filter((a) => a.status === 'Em avaliação').length,
    avaliacoesAvaliadas: avaliacoes.filter((a) => a.status === 'Avaliado').length,
    pagamentosPendentes: avaliacoes.filter((a) => a.status === 'Aprovado' && !a.pagamentoAprovado).length,
    comprasRecusadas: avaliacoes.filter((a) => a.status === 'Compra recusada').length,
    margemMedia: margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : undefined,
    estoqueVazio: noEstoque.length === 0,
  };
}

router.get('/resumo', async (_req, res) => {
  const [lancamentos, avaliacoes] = await Promise.all([
    store.listLancamentos(),
    store.listAvaliacoes(),
  ]);

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const noEstoque = lancamentos.filter((l) => l.status !== 'Vendido');
  const estoquePorCategoria: Record<string, number> = {};
  for (const l of noEstoque) {
    const tipo = l.tipoProduto || 'Outro';
    estoquePorCategoria[tipo] = (estoquePorCategoria[tipo] || 0) + 1;
  }

  const vendasMes = lancamentos
    .filter((l) => {
      if (l.status !== 'Vendido') return false;
      const d = l.dataVenda ? new Date(l.dataVenda) : new Date(l.data);
      return d >= inicioMes;
    })
    .sort((a, b) => new Date(b.dataVenda || b.data).getTime() - new Date(a.dataVenda || a.data).getTime())
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      titulo: l.modelo || l.nome,
      tipoProduto: l.tipoProduto,
      valor: l.valor,
      data: l.dataVenda || l.data,
    }));

  const avaliados = avaliacoes
    .filter((a) => a.status === 'Avaliado' || (a.status === 'Aprovado' && !a.valorVendaReal))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      titulo: a.modelo || a.nome,
      status: a.status,
      valorEstimado: a.valorEstimado,
      valorCompraSugerido: a.valorCompraSugerido,
      valorVendaReal: a.valorVendaReal,
      pagamentoAprovado: a.pagamentoAprovado,
      data: a.data,
    }));

  const sugestoes = montarSugestoes(contextoDeListas(lancamentos, avaliacoes)).slice(0, 6);

  let atividade: Array<{
    id: string;
    tipo: string;
    titulo: string;
    detalhes?: string;
    valor?: number;
    data: string;
    usuario?: string;
  }> = [];

  if (isFirestoreSync()) {
    try {
      const snap = await firestore().collection('transacoes').orderBy('data', 'desc').limit(12).get();
      atividade = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          tipo: String(data.tipo || ''),
          titulo: String(data.titulo || ''),
          detalhes: data.detalhes ? String(data.detalhes) : undefined,
          valor: typeof data.valor === 'number' ? data.valor : undefined,
          data: toIso(data.data),
          usuario: data.usuario ? String(data.usuario) : undefined,
        };
      });
    } catch {
      atividade = [];
    }
  }

  res.json({
    estoquePorCategoria,
    vendasMes,
    avaliados,
    sugestoes,
    atividade,
  });
});

export default router;
