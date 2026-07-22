import type { CriteriosAssistente } from './assistenteIA.js';

export type IntencaoNegociacao =
  | 'desconto' | 'troca' | 'contraproposta' | 'fechamento' | 'objecao' | 'parcelamento' | 'geral';

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function extrairValores(texto: string): number[] {
  const matches = texto.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)/gi) || [];
  return matches
    .map((m) => parseFloat(m.replace(/r\$\s*/i, '').replace(/\./g, '').replace(',', '.')))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

export function detectarIntencaoNegociacao(texto: string): IntencaoNegociacao {
  const t = texto.toLowerCase();
  const regras: [IntencaoNegociacao, string[]][] = [
    ['troca', ['troca', 'trocar', 'entrada', 'dar o meu', 'dar meu', 'permuta', 'usado como entrada']],
    ['contraproposta', ['contraproposta', 'ofereceu', 'propôs', 'propos', 'quer pagar', 'me deu', 'só tem', 'só pode', 'no máximo']],
    ['parcelamento', ['parcel', 'vezes', 'cartão', 'cartao', 'credito', 'crédito', 'financiar', '12x', '10x', '6x']],
    ['desconto', ['desconto', 'abaixar', 'abaixa', 'mais barato', 'baratear', 'reduzir', '% off']],
    ['objecao', ['caro', 'pensar', 'concorrente', 'depois volto', 'não sei', 'nao sei', 'vou ver', 'muito alto']],
    ['fechamento', ['fechar', 'fechamos', 'vou levar', 'fecha hoje', 'pix na hora', 'fechar negócio']],
  ];
  let melhor: IntencaoNegociacao = 'geral';
  let score = 0;
  for (const [intencao, palavras] of regras) {
    const s = palavras.reduce((acc, p) => acc + (t.includes(p) ? 1 : 0), 0);
    if (s > score) { score = s; melhor = intencao; }
  }
  if (score > 0) return melhor;
  const vals = extrairValores(texto);
  if (vals.length >= 2 || (vals.length === 1 && (t.includes('pagar') || t.includes('r$')))) return 'contraproposta';
  return 'geral';
}

export function responderNegociacaoLocal(
  pergunta: string,
  criterios: CriteriosAssistente,
  estoque: Array<{ nome: string; modelo?: string; valor: number; lacrado?: boolean }>,
): string {
  const texto = pergunta.trim();
  if (!texto) {
    return [
      'Olá! Sou seu assistente de negociação.',
      '',
      'Descreva a situação com o cliente e eu ajudo com estratégia, valores e o que falar.',
      '',
      'Exemplos:',
      '• "Cliente quer pagar R$ 3.900 no iPhone 15 Pro de R$ 4.500"',
      '• "Quer trocar um iPhone 13 em um 15 Pro"',
      '• "Pediu 15% de desconto, como respondo?"',
    ].join('\n');
  }

  const intencao = detectarIntencaoNegociacao(texto);
  const valores = extrairValores(texto);
  let lista = [...estoque];
  if (criterios.priorizarLacrado) {
    lista = lista.sort((a, b) => Number(b.lacrado) - Number(a.lacrado));
  }

  let corpo = '';
  switch (intencao) {
    case 'desconto': {
      const oferta = valores[0];
      const ref = lista[0]?.valor ?? valores[1];
      if (oferta && ref) {
        const desc = ((ref - oferta) / ref) * 100;
        if (desc > criterios.descontoMaximoPercentual) {
          const contra = Math.round(ref * (1 - criterios.descontoMaximoPercentual / 100) / 50) * 50;
          corpo = [
            '📌 **Situação:** pedido de desconto acima do limite',
            '',
            `⚠️ Desconto pedido (~${desc.toFixed(1)}%) ultrapassa o máximo de **${criterios.descontoMaximoPercentual}%**.`,
            '',
            '💡 **Estratégia**',
            `Contraproposta sugerida: **${brl(contra)}**. Ofereça PIX ou acessório em vez de baixar mais.`,
            '',
            '💬 **Sugestão de fala**',
            `"Consigo chegar em ${brl(contra)} no PIX mantendo a garantia e o suporte da loja. É o melhor que posso fazer hoje."`,
          ].join('\n');
        } else {
          corpo = [
            '📌 **Situação:** desconto dentro do critério',
            '',
            `✅ Oferta ${brl(oferta)} está dentro do limite (${criterios.descontoMaximoPercentual}%).`,
            '',
            '💬 **Sugestão de fala**',
            `"Fechamos nesse valor com PIX à vista e garantia inclusa."`,
          ].join('\n');
        }
      } else {
        corpo = '📌 Informe o preço anunciado e o valor pedido pelo cliente para calcular o desconto com segurança.';
      }
      break;
    }
    case 'troca':
      if (!criterios.aceitarTroca) {
        corpo = [
          '📌 **Situação:** pedido de troca',
          '',
          '⚠️ Pelos critérios da loja, **troca/permuta não é prioridade**.',
          '',
          '💬 **Sugestão de fala**',
          '"Hoje priorizamos venda direta para garantir o melhor preço e suporte. Posso montar uma condição especial no PIX para você."',
        ].join('\n');
      } else {
        corpo = [
          '📌 **Situação:** troca / upgrade',
          '',
          '💡 Avalie o aparelho de entrada (bateria, Face ID, procedência) e calcule a diferença com margem mínima.',
          `Margem mínima configurada: **${criterios.margemMinimaPercentual}%** / R$ ${criterios.valorMinimoMargem}.`,
          '',
          '💬 **Sugestão de fala**',
          '"Vamos avaliar seu aparelho na hora e eu já te mostro a diferença para o upgrade."',
        ].join('\n');
      }
      break;
    case 'fechamento':
      corpo = [
        '📌 **Situação:** cliente perto de fechar',
        '',
        '💡 Remova fricção: PIX na hora, garantia clara, acessórios inclusos.',
        '',
        '💬 **Sugestão de fala**',
        '"Se fecharmos agora, separo o aparelho, testo na sua frente e já deixo a garantia registrada."',
      ].join('\n');
      break;
    case 'objecao':
      corpo = [
        '📌 **Situação:** objeção de preço / dúvida',
        '',
        '💡 Reforce procedência, garantia e comparação com concorrente (estado, bateria, nota fiscal).',
        '',
        '💬 **Sugestão de fala**',
        '"Entendo. A diferença costuma estar na procedência e no suporte. Posso te mostrar o histórico e a garantia inclusa."',
      ].join('\n');
      break;
    case 'parcelamento':
      corpo = [
        '📌 **Situação:** parcelamento',
        '',
        '💡 Preserve margem no cartão; reserve desconto para PIX à vista.',
        '',
        '💬 **Sugestão de fala**',
        '"No cartão mantenho o valor anunciado; no PIX consigo uma condição especial dentro da nossa política."',
      ].join('\n');
      break;
    case 'contraproposta': {
      const oferta = valores[0];
      const ref = lista[0]?.valor ?? valores[1];
      corpo = [
        '📌 **Situação:** contraproposta do cliente',
        '',
        oferta ? `Cliente ofereceu **${brl(oferta)}**${ref ? ` (ref. ${brl(ref)})` : ''}.` : 'Cliente apresentou uma proposta.',
        '',
        `Respeite desconto máx. **${criterios.descontoMaximoPercentual}%** e margem mín. **${criterios.margemMinimaPercentual}%**.`,
        '',
        '💬 **Sugestão de fala**',
        '"Consigo melhorar um pouco, mas preciso manter a qualidade e a garantia. Vamos alinhar um meio-termo justo."',
      ].join('\n');
      break;
    }
    default:
      corpo = [
        '📌 **Análise geral**',
        '',
        lista.length
          ? `Itens úteis no estoque: ${lista.slice(0, 3).map((i) => `${i.modelo || i.nome} (${brl(i.valor)})`).join(', ')}`
          : 'Descreva modelo, valor pedido e se há troca/desconto para eu montar a estratégia.',
        '',
        '💬 **Sugestão de fala**',
        '"Me conta o orçamento e o uso principal que eu te indico a melhor opção disponível."',
      ].join('\n');
  }

  return `${corpo}\n\n⚙️ _Critérios: desconto máx. ${criterios.descontoMaximoPercentual}%, margem mín. ${criterios.margemMinimaPercentual}%, tom ${criterios.tomAtendimento}._`;
}
