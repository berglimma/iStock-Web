export type PrioridadeSugestao = 'baixa' | 'media' | 'alta';

export interface SugestaoPainel {
  id: string;
  titulo: string;
  mensagem: string;
  prioridade: PrioridadeSugestao;
}

export interface ContextoNegocio {
  receita: number;
  lucro: number;
  itensEstoque: number;
  produtosParados: number;
  avaliacoesPendentes: number;
  avaliacoesAvaliadas: number;
  pagamentosPendentes: number;
  comprasRecusadas: number;
  margemMedia?: number;
  estoqueVazio: boolean;
}

export function montarSugestoes(ctx: ContextoNegocio): SugestaoPainel[] {
  const lista: SugestaoPainel[] = [];

  if (ctx.lucro < 0) {
    lista.push({
      id: 'lucro-negativo',
      titulo: 'Despesas acima da receita',
      mensagem: `O período fechou com prejuízo de R$ ${Math.abs(ctx.lucro).toFixed(2)}. Revise preços de venda e custos de compra.`,
      prioridade: 'alta',
    });
  }

  if (ctx.produtosParados > 0) {
    lista.push({
      id: 'estoque-parado',
      titulo: `${ctx.produtosParados} produto(s) parado(s)`,
      mensagem: 'Há itens há mais de 45 dias sem vender. Considere promoções ou ajuste de preço.',
      prioridade: ctx.produtosParados >= 3 ? 'alta' : 'media',
    });
  }

  if (ctx.avaliacoesPendentes > 0) {
    lista.push({
      id: 'avaliacoes-pendentes',
      titulo: `${ctx.avaliacoesPendentes} avaliação(ões) aguardando`,
      mensagem: 'Conclua as avaliações para não perder oportunidades de compra.',
      prioridade: 'media',
    });
  }

  if (ctx.avaliacoesAvaliadas > 0) {
    lista.push({
      id: 'avaliacoes-concluidas',
      titulo: `${ctx.avaliacoesAvaliadas} avaliado(s) sem aprovação`,
      mensagem: 'Aprove a compra ou registre o valor de venda real para liberar estoque.',
      prioridade: 'media',
    });
  }

  if (ctx.comprasRecusadas > 0) {
    lista.push({
      id: 'compras-recusadas',
      titulo: `${ctx.comprasRecusadas} compra(s) recusada(s)`,
      mensagem: 'Revise justificativas e ajuste critérios de precificação para reduzir perdas.',
      prioridade: 'media',
    });
  }

  if (ctx.pagamentosPendentes > 0) {
    lista.push({
      id: 'pagamentos-pendentes',
      titulo: 'Pagamentos pendentes',
      mensagem: 'Confirme pagamentos aprovados para manter o fluxo de caixa organizado.',
      prioridade: 'alta',
    });
  }

  if (ctx.margemMedia != null && ctx.margemMedia < 15) {
    lista.push({
      id: 'margem-baixa',
      titulo: 'Margem média abaixo de 15%',
      mensagem: `Margem atual: ${ctx.margemMedia.toFixed(1)}%. Aumente preços ou negocie melhores custos.`,
      prioridade: 'alta',
    });
  }

  if (ctx.estoqueVazio) {
    lista.push({
      id: 'estoque-vazio',
      titulo: 'Estoque vazio',
      mensagem: 'Cadastre produtos ou converta avaliações aprovadas em estoque.',
      prioridade: 'alta',
    });
  }

  if (ctx.receita === 0 && !ctx.estoqueVazio) {
    lista.push({
      id: 'sem-vendas',
      titulo: 'Sem vendas no período',
      mensagem: 'Divulgue o estoque e entre em contato com clientes cadastrados.',
      prioridade: 'media',
    });
  }

  if (lista.length === 0) {
    lista.push({
      id: 'tudo-ok',
      titulo: 'Operação saudável',
      mensagem: 'Indicadores dentro do esperado. Continue monitorando margem e giro de estoque.',
      prioridade: 'baixa',
    });
  }

  return lista;
}

export function carregarContextoNegocio(db: import('better-sqlite3').Database): ContextoNegocio {
  const agora = new Date();
  const inicio = new Date(agora);
  inicio.setDate(inicio.getDate() - 30);

  const lancamentos = db.prepare('SELECT * FROM lancamentos').all() as Record<string, unknown>[];
  const avaliacoes = db.prepare('SELECT * FROM avaliacoes').all() as Record<string, unknown>[];

  const vendidos = lancamentos.filter((l) => {
    if (l.status !== 'Vendido' || !l.data_venda) return false;
    const d = new Date(String(l.data_venda));
    return d >= inicio && d <= agora;
  });

  const receita = vendidos.reduce((s, l) => s + Number(l.valor || 0), 0);
  const custoVendidos = vendidos.reduce((s, l) => s + Number(l.custo_compra || 0), 0);

  const despesasAvaliacoes = avaliacoes
    .filter((a) => a.pagamento_aprovado && a.data_pagamento)
    .filter((a) => {
      const d = new Date(String(a.data_pagamento));
      return d >= inicio && d <= agora;
    })
    .reduce((s, a) => s + Number(a.valor_compra_sugerido || 0), 0);

  const despesas = despesasAvaliacoes + custoVendidos;
  const lucro = receita - despesas;

  const noEstoque = lancamentos.filter((l) => l.status === 'Disponível' || l.status === 'Reservado');
  const parados = noEstoque.filter((l) => {
    const dias = Math.floor((agora.getTime() - new Date(String(l.data)).getTime()) / 86400000);
    return dias > 45;
  });

  const margens: number[] = [];
  for (const l of vendidos) {
    const custo = Number(l.custo_compra || 0);
    if (custo > 0) margens.push(((Number(l.valor) - custo) / custo) * 100);
  }

  return {
    receita,
    lucro,
    itensEstoque: noEstoque.length,
    produtosParados: parados.length,
    avaliacoesPendentes: avaliacoes.filter((a) => a.status === 'Em avaliação').length,
    avaliacoesAvaliadas: avaliacoes.filter((a) => a.status === 'Avaliado').length,
    pagamentosPendentes: avaliacoes.filter((a) => a.status === 'Aprovado' && !a.pagamento_aprovado).length,
    comprasRecusadas: avaliacoes.filter((a) => a.status === 'Compra recusada').length,
    margemMedia: margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : undefined,
    estoqueVazio: noEstoque.length === 0,
  };
}
