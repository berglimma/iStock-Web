export type TipoProduto =
  | 'iPhone' | 'iMac' | 'Watch' | 'iPad' | 'Apple Watch' | 'MacBook'
  | 'AirPods' | 'Apple TV' | 'Magic Mouse' | 'iPod' | 'Outro';

/** Normaliza tipos legados gravados como "Mac" no Firestore. */
export function normalizarTipoProduto(tipo: unknown): TipoProduto {
  if (tipo === 'Mac') return 'iMac';
  return (tipo as TipoProduto) || 'Outro';
}

export type StatusProduto = 'Disponível' | 'Reservado' | 'Vendido';
export type StatusAvaliacao = 'Em avaliação' | 'Avaliado' | 'Aprovado' | 'Compra recusada' | 'No estoque';
export type GravidadeDefeito = 'Leve' | 'Moderado' | 'Alto';

export interface ProblemaModelo {
  id: string;
  titulo: string;
  descricao: string;
  gravidade: GravidadeDefeito;
}

export interface Lancamento {
  id?: string;
  nome: string;
  tipoProduto: TipoProduto;
  modelo?: string;
  capacidade?: string;
  cor?: string;
  telefone?: string;
  serial?: string;
  lacrado: boolean;
  condicaoPercentual?: number;
  custoCompra?: number;
  valor: number;
  status: StatusProduto;
  data: string;
  criadoPor?: string;
  clienteVendaId?: string;
  clienteVendaNome?: string;
  dataVenda?: string;
  observacoes?: string;
  problemasModelo?: ProblemaModelo[];
}

export interface FotoAvaliacao {
  id: string;
  url: string;
  path?: string;
}

export interface RetiradaProduto {
  nomeRecebedor: string;
  documentoRecebedor?: string;
  observacoes?: string;
  foto?: FotoAvaliacao;
  data: string;
  registradoPor?: string;
}

export interface Avaliacao {
  id?: string;
  tipoProduto: TipoProduto;
  nome: string;
  modelo?: string;
  capacidade?: string;
  cor?: string;
  telefone?: string;
  serial?: string;
  lacrado: boolean;
  condicaoPercentual?: number;
  observacoes?: string;
  fotos: FotoAvaliacao[];
  status: StatusAvaliacao;
  valorEstimado?: number;
  valorCompraSugerido?: number;
  valorVendaReal?: number;
  pagamentoAprovado: boolean;
  data: string;
  dataAvaliacao?: string;
  dataVendaReal?: string;
  dataAprovacao?: string;
  dataPagamento?: string;
  dataRecusa?: string;
  justificativaRecusa?: string;
  retirada?: RetiradaProduto;
  criadoPor?: string;
  lancamentoId?: string;
  problemasModelo?: ProblemaModelo[];
}

export interface Cliente {
  id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  possuiWhatsApp: boolean;
  tiposNotificacao: TipoProduto[];
  ativo: boolean;
  data: string;
  criadoPor?: string;
}

export interface Conversa {
  id?: string;
  clienteId: string;
  clienteNome: string;
  vendedorId: string;
  vendedorNome: string;
  participantes: string[];
  ultimaMensagem?: string;
  ultimaMensagemData?: string;
}

export interface Mensagem {
  id?: string;
  conversaId: string;
  remetenteId: string;
  remetenteNome: string;
  tipo: 'texto' | 'foto' | 'audio';
  texto?: string;
  mediaURL?: string;
  mediaPath?: string;
  duracaoAudio?: number;
  data: string;
}

export interface NotificacaoPainel {
  id?: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data: string;
  referenciaId?: string;
}

export interface TransacaoLog {
  id?: string;
  tipo: string;
  descricao: string;
  valor?: number;
  usuarioId?: string;
  usuarioNome?: string;
  referenciaId?: string;
  data: string;
}
