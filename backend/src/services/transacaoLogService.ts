import { firestore } from '../firebase/admin.js';
import { toTimestamp } from '../firebase/mappers.js';
import { isFirestoreSync } from '../store/index.js';

/** Valores iguais ao enum `TipoTransacao` do iOS. */
export const TipoTransacao = {
  avaliacaoCriada: 'Avaliação criada',
  avaliacaoConcluida: 'Avaliação concluída',
  compraAprovada: 'Compra aprovada',
  compraRecusada: 'Compra não aprovada',
  retiradaRegistrada: 'Retirada registrada',
  pagamentoAprovado: 'Pagamento aprovado',
  valorVendaAtualizado: 'Valor de venda atualizado',
  adicionadoEstoque: 'Adicionado ao estoque',
  avaliacaoExcluida: 'Avaliação excluída',
  vendaProduto: 'Produto vendido',
} as const;

export interface TransacaoLogInput {
  tipo: string;
  titulo: string;
  detalhes?: string;
  valor?: number;
  valorAnterior?: number;
  referenciaId?: string;
  usuario?: string;
}

export function tituloAvaliacao(nome: string, modelo?: string): string {
  const base = nome.trim();
  if (modelo?.trim()) return `${base} — ${modelo.trim()}`;
  return base;
}

export async function registrarTransacao(input: TransacaoLogInput): Promise<void> {
  if (!isFirestoreSync()) return;

  await firestore().collection('transacoes').add({
    tipo: input.tipo,
    titulo: input.titulo,
    detalhes: input.detalhes ?? null,
    valor: input.valor ?? null,
    valorAnterior: input.valorAnterior ?? null,
    referenciaId: input.referenciaId ?? null,
    usuario: input.usuario ?? null,
    data: toTimestamp(),
  });
}

export async function atualizarContadorAdministradores(): Promise<void> {
  if (!isFirestoreSync()) return;

  const snap = await firestore().collection('usuarios')
    .where('papel', '==', 'Administrador')
    .get();

  await firestore().collection('config').doc('limites').set(
    { administradores: snap.size },
    { merge: true },
  );
}
