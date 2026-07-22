export type PapelUsuario = 'Administrador' | 'Consultor de vendas' | 'Cliente';
export type TipoProduto = 'iPhone' | 'iMac' | 'Watch' | 'iPad' | 'Apple Watch' | 'MacBook' | 'AirPods' | 'Apple TV' | 'Magic Mouse' | 'iPod' | 'Outro';
export type StatusProduto = 'Disponível' | 'Reservado' | 'Vendido';
export type StatusAvaliacao = 'Em avaliação' | 'Avaliado' | 'Aprovado' | 'Compra recusada' | 'No estoque';
export type GravidadeDefeito = 'Leve' | 'Moderado' | 'Alto';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
}

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
  diasNoEstoque?: number;
  estaHaMuitoTempoNoEstoque?: boolean;
}

export interface FotoAvaliacao {
  id: string;
  url: string;
  path?: string;
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
  retirada?: RetiradaProduto;
  criadoPor?: string;
  lancamentoId?: string;
  problemasModelo?: ProblemaModelo[];
  justificativaRecusa?: string;
}

export interface RetiradaProduto {
  nomeRecebedor: string;
  documentoRecebedor?: string;
  observacoes?: string;
  foto?: FotoAvaliacao;
  data: string;
  registradoPor?: string;
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
  data: string;
}

export const STATUS_AVALIACAO: StatusAvaliacao[] = [
  'Em avaliação', 'Avaliado', 'Aprovado', 'Compra recusada', 'No estoque',
];

export const TIPOS_COM_CAPACIDADE: TipoProduto[] = ['iPhone', 'iPad', 'iMac', 'MacBook', 'iPod', 'Apple TV'];
export const TIPOS_COM_BATERIA: TipoProduto[] = ['iPhone', 'iPad', 'MacBook', 'Watch', 'Apple Watch', 'iPod'];

export const TIPOS_PRODUTO: TipoProduto[] = [
  'iPhone', 'iMac', 'Watch', 'iPad', 'Apple Watch', 'MacBook',
  'AirPods', 'Apple TV', 'Magic Mouse', 'iPod', 'Outro',
];

/** Normaliza tipos legados gravados como "Mac" no Firestore. */
export function normalizarTipoProduto(tipo: string | undefined | null): TipoProduto {
  if (tipo === 'Mac') return 'iMac';
  return (tipo as TipoProduto) || 'Outro';
}

export const PAPEIS: { valor: PapelUsuario; rotulo: string; descricao: string }[] = [
  { valor: 'Administrador', rotulo: 'Administrador', descricao: 'Acesso total ao sistema (máx. 4 contas).' },
  { valor: 'Consultor de vendas', rotulo: 'Consultor', descricao: 'Vendas, estoque, avaliações e clientes.' },
  { valor: 'Cliente', rotulo: 'Cliente', descricao: 'Avaliações e mensagens com a loja.' },
];

export type SidebarItem = 'painel' | 'relatorios' | 'avaliacoes' | 'pesquisa' | 'cadastro' | 'produtos' | 'clientes' | 'mensagens' | 'assistente';

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

export interface SessaoAssistente {
  id: string;
  modo: ModoAssistente;
  titulo: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface MensagemAssistente {
  id: string;
  sessaoId: string;
  papel: 'usuario' | 'assistente';
  conteudo: string;
  metadados?: Record<string, unknown>;
  data: string;
}

export const ASSISTENTE_MODOS: {
  id: ModoAssistente;
  titulo: string;
  descricao: string;
  icone: string;
  cor: string;
}[] = [
  {
    id: 'negociacao',
    titulo: 'Assistente de Negociação',
    descricao: 'Analise ofertas, descontos, trocas e contrapropostas com seus critérios.',
    icone: '🤝',
    cor: '#34c759',
  },
  {
    id: 'consultor-vendas',
    titulo: 'Consultor Apple — Meu cliente',
    descricao: 'Roteiro de vendas, argumentos e sugestões do seu estoque.',
    icone: '🛍️',
    cor: '#007aff',
  },
  {
    id: 'consultor-tecnico',
    titulo: 'Consultor Apple — Minha dúvida',
    descricao: 'Diagnóstico técnico, defeitos conhecidos e checklist de inspeção.',
    icone: '🔧',
    cor: '#73b8ff',
  },
];

export function abasParaPapel(papel: PapelUsuario): SidebarItem[] {
  switch (papel) {
    case 'Administrador':
      return ['painel', 'relatorios', 'avaliacoes', 'pesquisa', 'cadastro', 'produtos', 'clientes', 'mensagens', 'assistente'];
    case 'Consultor de vendas':
      return ['painel', 'avaliacoes', 'pesquisa', 'cadastro', 'produtos', 'clientes', 'mensagens', 'assistente'];
    case 'Cliente':
      return ['avaliacoes', 'mensagens', 'assistente'];
    default:
      return ['painel'];
  }
}

/** Modos do Assistente de IA disponíveis conforme o papel (Cliente só tira dúvidas técnicas). */
export function modosAssistenteParaPapel(papel: PapelUsuario): ModoAssistente[] {
  if (papel === 'Cliente') return ['consultor-tecnico'];
  return ['negociacao', 'consultor-vendas', 'consultor-tecnico'];
}

export const SIDEBAR_LABELS: Record<SidebarItem, string> = {
  painel: 'Painel',
  relatorios: 'Relatórios',
  avaliacoes: 'Avaliações',
  pesquisa: 'Pesquisa',
  cadastro: 'Cadastrar',
  produtos: 'Produtos',
  clientes: 'Clientes',
  mensagens: 'Mensagens',
  assistente: 'Assistente de IA',
};
