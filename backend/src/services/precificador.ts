import type { Avaliacao, TipoProduto } from '../types.js';

export function estimarPreco(avaliacao: Pick<Avaliacao, 'tipoProduto' | 'capacidade' | 'lacrado' | 'condicaoPercentual' | 'modelo'>) {
  let base = valorBase(avaliacao.tipoProduto);
  base *= multiplicadorCapacidade(avaliacao.capacidade);

  if (avaliacao.lacrado) {
    base *= 1.12;
  } else {
    const condicao = (avaliacao.condicaoPercentual ?? 85) / 100;
    base *= 0.55 + condicao * 0.45;
  }

  const modelo = avaliacao.modelo?.toLowerCase() ?? '';
  if (modelo.includes('pro') || modelo.includes('max') || modelo.includes('ultra')) base *= 1.18;
  else if (modelo.includes('mini') || modelo.includes('se')) base *= 0.88;

  const venda = Math.round(base / 50) * 50;
  const compra = Math.round((venda * 0.78) / 50) * 50;

  const detalhes = `Base ${avaliacao.tipoProduto} · ${avaliacao.lacrado ? 'lacrado' : `usado ${avaliacao.condicaoPercentual ?? 0}%`} · margem sugerida R$ ${(Math.max(venda, 100) - Math.max(compra, 50)).toFixed(2)}`;

  return {
    valorVenda: Math.max(venda, 100),
    valorCompra: Math.max(compra, 50),
    detalhes,
  };
}

function valorBase(tipo: TipoProduto): number {
  const map: Record<string, number> = {
    iPhone: 3800, iPad: 2600, MacBook: 6200, iMac: 4800, Mac: 4800,
    'Apple Watch': 1900, Watch: 1900, AirPods: 950,
    'Apple TV': 1350, 'Magic Mouse': 420, iPod: 650, Outro: 900,
  };
  return map[tipo] ?? 900;
}

function multiplicadorCapacidade(capacidade?: string): number {
  if (!capacidade) return 1;
  const t = capacidade.toLowerCase();
  if (t.includes('2tb') || t.includes('2 tb')) return 1.55;
  if (t.includes('1tb') || t.includes('1 tb')) return 1.35;
  if (t.includes('512')) return 1.2;
  if (t.includes('256')) return 1.08;
  if (t.includes('128')) return 1;
  if (t.includes('64')) return 0.92;
  if (t.includes('32')) return 0.85;
  return 1;
}
