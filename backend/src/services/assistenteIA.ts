import { db } from '../db/database.js';
import { estimarPreco } from './precificador.js';
import { buscarDefeitos, sugestoesModelo } from './defeitosService.js';
import { carregarContextoNegocio, montarSugestoes } from './relatorioAnalise.js';
import type { TipoProduto } from '../types.js';
import { responderNegociacaoLocal } from './negociacaoMotor.js';
import { responderConsultorTecnicoLocal, responderConsultorVendasLocal } from './consultorAppleMotor.js';
import { gerarRespostaGemini } from './geminiService.js';

export type ModoAssistente = 'negociacao' | 'consultor-vendas' | 'consultor-tecnico';
export type TomAtendimento = 'consultivo' | 'assertivo' | 'tecnico';
export type FlexibilidadePreco = 'baixa' | 'media' | 'alta';

export interface CriteriosAssistente {
  margemMinimaPercentual: number;
  descontoMaximoPercentual: number;
  valorMinimoMargem: number;
  tomAtendimento: TomAtendimento;
  aceitarTroca: boolean;
  priorizarLacrado: boolean;
  flexibilidadePreco: FlexibilidadePreco;
  notasPersonalizadas: string;
}

export const CRITERIOS_PADRAO: CriteriosAssistente = {
  margemMinimaPercentual: 15,
  descontoMaximoPercentual: 8,
  valorMinimoMargem: 150,
  tomAtendimento: 'consultivo',
  aceitarTroca: true,
  priorizarLacrado: true,
  flexibilidadePreco: 'media',
  notasPersonalizadas: '',
};

export function obterCriterios(usuarioId: string): CriteriosAssistente {
  const row = db.prepare('SELECT dados FROM assistente_criterios WHERE usuario_id = ?').get(usuarioId) as
    | { dados: string }
    | undefined;
  if (!row) return { ...CRITERIOS_PADRAO };
  return { ...CRITERIOS_PADRAO, ...JSON.parse(row.dados) };
}

export function salvarCriterios(usuarioId: string, criterios: Partial<CriteriosAssistente>) {
  const atual = obterCriterios(usuarioId);
  const merged = { ...atual, ...criterios };
  db.prepare(
    `INSERT INTO assistente_criterios (usuario_id, dados, atualizado_em) VALUES (?, ?, ?)
     ON CONFLICT(usuario_id) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em`
  ).run(usuarioId, JSON.stringify(merged), new Date().toISOString());
  return merged;
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function extrairValores(texto: string): number[] {
  const matches = texto.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/gi) || [];
  return matches
    .map((m) => parseFloat(m.replace(/r\$\s*/i, '').replace(/\./g, '').replace(',', '.')))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function extrairModelos(texto: string): string[] {
  const t = texto.toLowerCase();
  const padroes = [
    'iphone 15 pro max', 'iphone 15 pro', 'iphone 15', 'iphone 14 pro max', 'iphone 14 pro',
    'iphone 14', 'iphone 13 pro max', 'iphone 13 pro', 'iphone 13', 'iphone 12', 'iphone 11',
    'iphone se', 'iphone x', 'macbook pro', 'macbook air', 'ipad pro', 'ipad air', 'ipad',
    'airpods pro', 'airpods', 'apple watch', 'apple tv',
  ];
  return padroes.filter((p) => t.includes(p));
}

function detectarIntencao(texto: string) {
  const t = texto.toLowerCase();
  return {
    desconto: /desconto|abaix|barat|menor pre|melhor pre|oferta/.test(t),
    troca: /troc|permut|entrada|dar de entrada|upgrade/.test(t),
    pagamento: /pagar|pagamento|pix|cartão|cartao|parcel|à vista|a vista/.test(t),
    defeito: /defeito|problema|quebr|trinc|risc|bateria|tela|não liga|nao liga/.test(t),
    comparacao: /compar|diferença|diferenca|vale a pena|melhor op/.test(t),
    estoque: /estoque|disponível|disponivel|tem o|vocês têm|voces tem/.test(t),
  };
}

function inferirTipo(modelo: string): TipoProduto {
  const m = modelo.toLowerCase();
  if (m.includes('iphone')) return 'iPhone';
  if (m.includes('macbook')) return 'MacBook';
  if (m.includes('ipad')) return 'iPad';
  if (m.includes('airpods')) return 'AirPods';
  if (m.includes('watch')) return 'Apple Watch';
  if (m.includes('apple tv')) return 'Apple TV';
  return 'Outro';
}

function itensEstoqueRelevantes(modelos: string[]) {
  const rows = db.prepare(
    `SELECT nome, modelo, tipo_produto, valor, lacrado, condicao_percentual, capacidade
     FROM lancamentos WHERE status = 'Disponível' ORDER BY data DESC LIMIT 30`
  ).all() as Record<string, unknown>[];

  if (modelos.length === 0) return rows.slice(0, 6);

  return rows.filter((r) => {
    const texto = `${r.nome} ${r.modelo}`.toLowerCase();
    return modelos.some((m) => texto.includes(m));
  }).slice(0, 6);
}

function abertura(modo: ModoAssistente, criterios: CriteriosAssistente): string {
  const ctx = carregarContextoNegocio(db);
  const sugestoes = montarSugestoes(ctx).slice(0, 2);

  if (modo === 'negociacao') {
    return [
      '**Assistente de Negociação** — pronto para apoiar seu atendimento.',
      '',
      'Descreva a situação normalmente. Exemplos:',
      '• Cliente quer pagar R$ 3.900',
      '• Troca de iPhone 13 por 15 Pro',
      '• Pedido de desconto à vista',
      '',
      `**Seus critérios:** margem mín. ${criterios.margemMinimaPercentual}% · desconto máx. ${criterios.descontoMaximoPercentual}% · tom ${criterios.tomAtendimento}`,
      criterios.notasPersonalizadas ? `**Nota da loja:** ${criterios.notasPersonalizadas}` : '',
      '',
      `**Panorama:** ${ctx.itensEstoque} itens em estoque · ${ctx.produtosParados} parado(s)`,
      sugestoes.length ? `**Alerta:** ${sugestoes[0].titulo} — ${sugestoes[0].mensagem}` : '',
    ].filter(Boolean).join('\n');
  }

  if (modo === 'consultor-vendas') {
    const destaques = itensEstoqueRelevantes([]);
    const lista = destaques.length
      ? destaques.map((i) => `• ${i.nome}${i.modelo ? ` (${i.modelo})` : ''} — ${brl(Number(i.valor))}`).join('\n')
      : '• Estoque vazio no momento — cadastre produtos ou converta avaliações.';

    return [
      '**Consultor Apple — atendimento ao cliente**',
      '',
      'Vou ajudar com argumentos de venda, comparação de modelos e sugestões do seu estoque.',
      '',
      '**Destaques disponíveis:**',
      lista,
      '',
      `Tom configurado: **${criterios.tomAtendimento}** · prioriza lacrado: **${criterios.priorizarLacrado ? 'sim' : 'não'}**`,
    ].join('\n');
  }

  return [
    '**Consultor Apple — suporte técnico**',
    '',
    'Pergunte sobre defeitos conhecidos, diagnóstico, numeração (A-number) ou condição de um aparelho.',
    '',
    '**Modelos com mais consultas:**',
    sugestoesModelo.map((s) => `• ${s}`).join('\n'),
    '',
    'Informe modelo, sintoma ou numeração para uma análise detalhada.',
  ].join('\n');
}

function respostaNegociacao(texto: string, criterios: CriteriosAssistente): string {
  const valores = extrairValores(texto);
  const modelos = extrairModelos(texto);
  const intencao = detectarIntencao(texto);
  const estoque = itensEstoqueRelevantes(modelos);
  const linhas: string[] = ['### Análise da negociação', ''];

  if (estoque.length > 0) {
    linhas.push('**Itens relacionados no estoque:**');
    for (const item of estoque) {
      const tipo = String(item.tipo_produto) as TipoProduto;
      const est = estimarPreco({
        tipoProduto: tipo,
        modelo: String(item.modelo || ''),
        capacidade: String(item.capacidade || ''),
        lacrado: Boolean(item.lacrado),
        condicaoPercentual: Number(item.condicao_percentual || 85),
      });
      const margem = est.valorVenda - est.valorCompra;
      const precoAnunciado = Number(item.valor);
      linhas.push(
        `• **${item.nome}** — anunciado ${brl(precoAnunciado)} · compra ref. ${brl(est.valorCompra)} · margem ref. ${brl(margem)}`
      );
    }
    linhas.push('');
  }

  const valorOferta = valores[0];
  const valorReferencia = estoque.length ? Number(estoque[0].valor) : undefined;

  if (valorOferta && valorReferencia) {
    const diff = ((valorOferta - valorReferencia) / valorReferencia) * 100;
    const descontoPedido = diff < 0 ? Math.abs(diff) : 0;

    if (intencao.desconto || diff < 0) {
      if (descontoPedido > criterios.descontoMaximoPercentual) {
        linhas.push(
          `**Oferta ${brl(valorOferta)}** está **${descontoPedido.toFixed(1)}% abaixo** do anunciado (${brl(valorReferencia)}).`,
          `Seu limite de desconto é **${criterios.descontoMaximoPercentual}%** — **não recomendo aceitar** sem ajustar margem ou incluir acessório/bundle.`,
        );
        const contraproposta = Math.round(valorReferencia * (1 - criterios.descontoMaximoPercentual / 100) / 50) * 50;
        linhas.push(`**Contraproposta sugerida:** ${brl(contraproposta)} (dentro do seu critério).`);
      } else {
        linhas.push(
          `**Oferta ${brl(valorOferta)}** — desconto de ${descontoPedido.toFixed(1)}% dentro do limite (${criterios.descontoMaximoPercentual}%).`,
          '**Pode fechar** se a margem líquida atingir seu mínimo.',
        );
      }
    } else if (valorOferta >= valorReferencia) {
      linhas.push(`**Oferta ${brl(valorOferta)}** está **acima ou igual** ao preço anunciado — **excelente oportunidade de fechamento**.`);
    }
    linhas.push('');
  }

  if (intencao.troca) {
    if (!criterios.aceitarTroca) {
      linhas.push('**Troca/permuta:** seus critérios indicam **não aceitar troca** neste perfil de negociação.');
    } else if (modelos.length >= 2) {
      const entrada = modelos[0];
      const saida = modelos[1];
      const estSaida = estimarPreco({ tipoProduto: inferirTipo(saida), modelo: saida, lacrado: true, condicaoPercentual: 100 });
      const estEntrada = estimarPreco({ tipoProduto: inferirTipo(entrada), modelo: entrada, lacrado: false, condicaoPercentual: 78 });
      const diff = estSaida.valorVenda - estEntrada.valorCompra;
      linhas.push(
        `**Troca ${entrada} → ${saida}:**`,
        `• Valor referência do destino: ${brl(estSaida.valorVenda)}`,
        `• Crédito estimado da entrada: ${brl(estEntrada.valorCompra)}`,
        `• **Diferença sugerida a receber:** ${brl(Math.max(diff, criterios.valorMinimoMargem))}`,
        'Inspecione bateria, Face ID e origem das peças antes de fechar.',
      );
    } else {
      linhas.push(
        '**Troca detectada** — informe os dois modelos (entrada e saída) e condição do aparelho do cliente para calcular a diferença.',
      );
    }
    linhas.push('');
  }

  if (intencao.pagamento && valores.length) {
    linhas.push(
      `**Pagamento ${brl(valores[0])}:** confirme se é à vista (pode justificar desconto dentro do limite) ou parcelado (preserve margem).`,
      criterios.flexibilidadePreco === 'baixa'
        ? 'Flexibilidade **baixa** — mantenha preço firme e destaque garantia/origem.'
        : criterios.flexibilidadePreco === 'alta'
          ? 'Flexibilidade **alta** — pode ceder até o limite de desconto para fechar hoje.'
          : 'Flexibilidade **média** — negocie valor agregado (capa, película, assistência) antes de baixar preço.',
    );
    linhas.push('');
  }

  if (linhas.length <= 2) {
    linhas.push(
      'Para uma análise mais precisa, inclua:',
      '• Valor proposto pelo cliente (R$)',
      '• Modelo desejado e condição',
      '• Se há troca, desconto ou urgência',
    );
  }

  const fechamento = criterios.tomAtendimento === 'assertivo'
    ? '**Tom assertivo:** apresente o valor com segurança e limite claro de concessão.'
    : criterios.tomAtendimento === 'tecnico'
      ? '**Tom técnico:** detalhe estado do aparelho, procedência e diferenciais antes de falar preço.'
      : '**Tom consultivo:** entenda a necessidade do cliente e conduza para a melhor opção do estoque.';

  linhas.push('', fechamento);
  return linhas.join('\n');
}

function respostaConsultorVendas(texto: string, criterios: CriteriosAssistente): string {
  const modelos = extrairModelos(texto);
  const intencao = detectarIntencao(texto);
  const estoque = itensEstoqueRelevantes(modelos);
  const linhas: string[] = ['### Roteiro de vendas', ''];

  if (modelos.length) {
    for (const modelo of modelos) {
      const tipo = inferirTipo(modelo);
      const lacrado = criterios.priorizarLacrado;
      const est = estimarPreco({ tipoProduto: tipo, modelo, lacrado, condicaoPercentual: lacrado ? 100 : 88 });
      linhas.push(
        `**${modelo.charAt(0).toUpperCase() + modelo.slice(1)}**`,
        `• Faixa sugerida: ${brl(est.valorVenda)} (lacrado ${lacrado ? 'sim' : 'usado premium'})`,
        `• Argumento: desempenho Apple, integração ecossistema, valor de revenda`,
      );
      const noEstoque = estoque.find((e) => String(e.modelo || e.nome).toLowerCase().includes(modelo));
      if (noEstoque) {
        linhas.push(`• **Temos em estoque:** ${noEstoque.nome} por ${brl(Number(noEstoque.valor))} — priorize este item!`);
      }
      linhas.push('');
    }
  }

  if (intencao.comparacao && modelos.length >= 2) {
    linhas.push(
      '**Comparativo:** destaque geração mais recente (bateria, câmera, suporte iOS) e posicione o modelo superior como melhor custo-benefício de longo prazo.',
      '',
    );
  }

  if (intencao.estoque || estoque.length) {
    linhas.push('**Sugestões do seu estoque:**');
    if (estoque.length === 0) {
      linhas.push('Nenhum item correspondente disponível — ofereça avaliação do aparelho atual do cliente ou encomenda.');
    } else {
      for (const item of estoque) {
        const badge = item.lacrado ? '🟢 Lacrado' : `🔵 ${item.condicao_percentual ?? 85}%`;
        linhas.push(`• ${item.nome} — ${brl(Number(item.valor))} (${badge})`);
      }
    }
    linhas.push('');
  }

  if (linhas.length <= 2) {
    linhas.push(
      'Informe o modelo de interesse ou perfil do cliente (uso, orçamento, troca) para montar um roteiro personalizado.',
      '',
    );
  }

  if (criterios.notasPersonalizadas) {
    linhas.push(`**Política da loja:** ${criterios.notasPersonalizadas}`);
  }
  linhas.push('**Dica:** confirme garantia, acessórios inclusos e opções de pagamento antes de apresentar o valor final.');

  return linhas.join('\n');
}

function respostaConsultorTecnico(texto: string): string {
  const modelos = extrairModelos(texto);
  const intencao = detectarIntencao(texto);
  const numeracao = texto.match(/\bA\d{4}\b/i)?.[0]?.toUpperCase();
  const linhas: string[] = ['### Diagnóstico técnico', ''];

  const alvo = modelos[0] || (numeracao ? texto : '');
  const tipo = modelos[0] ? inferirTipo(modelos[0]) : 'iPhone';
  const defeitos = buscarDefeitos(tipo, alvo || texto);

  if (numeracao) {
    linhas.push(`**Numeração ${numeracao}** identificada — cruzando com base de modelos Apple.`, '');
  }

  if (defeitos.length) {
    linhas.push('**Problemas conhecidos neste modelo:**');
    for (const d of defeitos) {
      const emoji = d.gravidade === 'Alto' ? '🔴' : d.gravidade === 'Moderado' ? '🟡' : '🟢';
      linhas.push(`${emoji} **${d.titulo}** (${d.gravidade}): ${d.descricao}`);
    }
    linhas.push('');
  } else if (modelos.length) {
    linhas.push(`Sem defeitos críticos catalogados para **${modelos[0]}**. Realize inspeção padrão: bateria, tela, câmeras, Face ID/Touch ID, IMEI e peças originais.`, '');
  }

  if (intencao.defeito) {
    linhas.push(
      '**Checklist rápido:**',
      '1. Saúde da bateria (< 80% = alerta)',
      '2. Mensagens de peça desconhecida em Ajustes',
      '3. Teste de microfone, alto-falante e vibração',
      '4. Verificar conta iCloud deslogada',
      '5. Teste de estresse térmico (5 min de câmera/vídeo)',
      '',
    );
  }

  if (linhas.length <= 2) {
    linhas.push(
      'Descreva o modelo, sintoma ou numeração (ex.: A2482) para consultar a base de defeitos Apple do iStock.',
      '',
      '**Exemplos:** "iPhone 13 aquecendo", "MacBook Pro teclado butterfly", "AirPods Pro chiando"',
    );
  }

  return linhas.join('\n');
}

export async function gerarRespostaAssistente(
  modo: ModoAssistente,
  usuarioId: string,
  mensagem: string,
  historicoVazio: boolean,
  opcoes?: {
    criterios?: CriteriosAssistente | null;
    historico?: Array<{ papel: 'usuario' | 'assistente'; conteudo: string }>;
    estoque?: Array<{ nome: string; modelo?: string; valor: number; lacrado?: boolean }>;
  },
): Promise<string> {
  const criterios = opcoes?.criterios ?? obterCriterios(usuarioId);
  const texto = mensagem.trim();
  const estoque = opcoes?.estoque ?? [];

  if (historicoVazio && !texto) {
    return abertura(modo, criterios);
  }

  if (!texto) {
    return 'Envie uma mensagem descrevendo a situação para eu analisar com seus critérios personalizados.';
  }

  const contextoEstoque = estoque
    .slice(0, 8)
    .map((e) => `- ${e.modelo || e.nome}: R$ ${e.valor}${e.lacrado ? ' (lacrado)' : ''}`)
    .join('\n');

  const gemini = await gerarRespostaGemini({
    modo,
    mensagem: texto,
    criterios,
    historico: opcoes?.historico,
    contextoEstoque,
  });
  if (gemini) return gemini;

  switch (modo) {
    case 'negociacao':
      return responderNegociacaoLocal(texto, criterios, estoque);
    case 'consultor-vendas':
      return responderConsultorVendasLocal(texto, estoque);
    case 'consultor-tecnico':
      return responderConsultorTecnicoLocal(texto);
    default:
      return 'Modo de assistente não reconhecido.';
  }
}

export function tituloModo(modo: ModoAssistente): string {
  const map: Record<ModoAssistente, string> = {
    negociacao: 'Assistente de Negociação',
    'consultor-vendas': 'Consultor Apple — Vendas',
    'consultor-tecnico': 'Consultor Apple — Técnico',
  };
  return map[modo];
}
