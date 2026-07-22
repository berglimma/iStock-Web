import type { CriteriosAssistente, ModoAssistente } from './assistenteIA.js';

const SYSTEM_PROMPTS: Record<ModoAssistente, string> = {
  negociacao: `Você é o Assistente de Negociação do app iStock, especializado em vendas de produtos Apple no Brasil.
Ajude consultores com descontos seguros, trocas, contrapropostas, fechamento e objeções.
Regras: português brasileiro; respeite SEMPRE os [Critérios da loja]; use seções curtas com emojis 📌 💡 💬 💰 ⚠️;
inclua frases prontas; valores em R$; não invente preços de mercado; respostas concisas (~12 linhas).`,
  'consultor-vendas': `Você é o Consultor Apple de vendas do iStock.
Ajude com argumentos de venda, comparação de modelos e benefícios do ecossistema Apple.
Use português brasileiro, seções claras e frases prontas para o consultor falar ao cliente.`,
  'consultor-tecnico': `Você é o Consultor Apple técnico do iStock.
Ajude com diagnóstico, defeitos conhecidos e checklist de inspeção de aparelhos Apple.
Seja objetivo, use português brasileiro e passos numerados quando fizer sentido.`,
};

function blocoCriterios(c: CriteriosAssistente): string {
  return [
    '[Critérios da loja]',
    `- Margem mínima: ${c.margemMinimaPercentual}% / R$ ${c.valorMinimoMargem}`,
    `- Desconto máximo: ${c.descontoMaximoPercentual}%`,
    `- Tom: ${c.tomAtendimento}`,
    `- Aceitar troca: ${c.aceitarTroca ? 'sim' : 'não'}`,
    `- Priorizar lacrado: ${c.priorizarLacrado ? 'sim' : 'não'}`,
    `- Flexibilidade de preço: ${c.flexibilidadePreco}`,
    c.notasPersonalizadas ? `- Notas: ${c.notasPersonalizadas}` : '',
  ].filter(Boolean).join('\n');
}

export async function gerarRespostaGemini(opts: {
  modo: ModoAssistente;
  mensagem: string;
  criterios: CriteriosAssistente;
  historico?: Array<{ papel: 'usuario' | 'assistente'; conteudo: string }>;
  contextoEstoque?: string;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const system = [
    SYSTEM_PROMPTS[opts.modo],
    '',
    blocoCriterios(opts.criterios),
    opts.contextoEstoque ? `\n[Estoque relevante]\n${opts.contextoEstoque}` : '',
  ].join('\n');

  const contents = [
    ...(opts.historico || []).slice(-8).map((m) => ({
      role: m.papel === 'usuario' ? 'user' : 'model',
      parts: [{ text: m.conteudo }],
    })),
    { role: 'user', parts: [{ text: opts.mensagem }] },
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) {
      console.warn('Gemini HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const texto = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')?.trim();
    return texto || null;
  } catch (err) {
    console.warn('Gemini falhou, usando motor local:', err instanceof Error ? err.message : err);
    return null;
  }
}
