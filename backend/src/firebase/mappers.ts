import { Timestamp, type DocumentData } from 'firebase-admin/firestore';
import type { Avaliacao, Cliente, Lancamento, Mensagem, Conversa } from '../types.js';

export function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export function toTimestamp(value?: string): Timestamp {
  return Timestamp.fromDate(value ? new Date(value) : new Date());
}

export function lancamentoFromDoc(id: string, d: DocumentData): Lancamento {
  return {
    id,
    nome: d.nome,
    tipoProduto: d.tipoProduto,
    modelo: d.modelo,
    capacidade: d.capacidade,
    cor: d.cor,
    telefone: d.telefone,
    serial: d.serial,
    lacrado: Boolean(d.lacrado),
    condicaoPercentual: d.condicaoPercentual,
    custoCompra: d.custoCompra,
    valor: d.valor,
    status: d.status,
    data: toIso(d.data),
    criadoPor: d.criadoPor,
    clienteVendaId: d.clienteVendaId,
    clienteVendaNome: d.clienteVendaNome,
    dataVenda: d.dataVenda ? toIso(d.dataVenda) : undefined,
    observacoes: d.observacoes,
    problemasModelo: d.problemasModelo,
  };
}

export function lancamentoToDoc(l: Lancamento): Record<string, unknown> {
  return {
    nome: l.nome,
    tipoProduto: l.tipoProduto,
    modelo: l.modelo ?? null,
    capacidade: l.capacidade ?? null,
    cor: l.cor ?? null,
    telefone: l.telefone ?? null,
    serial: l.serial ?? null,
    lacrado: l.lacrado,
    condicaoPercentual: l.condicaoPercentual ?? null,
    custoCompra: l.custoCompra ?? null,
    valor: l.valor,
    status: l.status,
    data: toTimestamp(l.data),
    criadoPor: l.criadoPor ?? null,
    clienteVendaId: l.clienteVendaId ?? null,
    clienteVendaNome: l.clienteVendaNome ?? null,
    dataVenda: l.dataVenda ? toTimestamp(l.dataVenda) : null,
    observacoes: l.observacoes ?? null,
    problemasModelo: l.problemasModelo ?? [],
  };
}

export function avaliacaoFromDoc(id: string, d: DocumentData): Avaliacao {
  return {
    id,
    tipoProduto: d.tipoProduto,
    nome: d.nome,
    modelo: d.modelo,
    capacidade: d.capacidade,
    cor: d.cor,
    telefone: d.telefone,
    serial: d.serial,
    lacrado: Boolean(d.lacrado),
    condicaoPercentual: d.condicaoPercentual,
    observacoes: d.observacoes,
    fotos: d.fotos ?? [],
    status: d.status,
    valorEstimado: d.valorEstimado,
    valorCompraSugerido: d.valorCompraSugerido,
    valorVendaReal: d.valorVendaReal,
    pagamentoAprovado: Boolean(d.pagamentoAprovado),
    data: toIso(d.data),
    dataAvaliacao: d.dataAvaliacao ? toIso(d.dataAvaliacao) : undefined,
    dataVendaReal: d.dataVendaReal ? toIso(d.dataVendaReal) : undefined,
    dataAprovacao: d.dataAprovacao ? toIso(d.dataAprovacao) : undefined,
    dataPagamento: d.dataPagamento ? toIso(d.dataPagamento) : undefined,
    dataRecusa: d.dataRecusa ? toIso(d.dataRecusa) : undefined,
    justificativaRecusa: d.justificativaRecusa,
    retirada: d.retirada,
    criadoPor: d.criadoPor,
    lancamentoId: d.lancamentoId,
    problemasModelo: d.problemasModelo,
  };
}

export function avaliacaoToDoc(a: Avaliacao): Record<string, unknown> {
  return {
    tipoProduto: a.tipoProduto,
    nome: a.nome,
    modelo: a.modelo ?? null,
    capacidade: a.capacidade ?? null,
    cor: a.cor ?? null,
    telefone: a.telefone ?? null,
    serial: a.serial ?? null,
    lacrado: a.lacrado,
    condicaoPercentual: a.condicaoPercentual ?? null,
    observacoes: a.observacoes ?? null,
    fotos: a.fotos ?? [],
    status: a.status,
    valorEstimado: a.valorEstimado ?? null,
    valorCompraSugerido: a.valorCompraSugerido ?? null,
    valorVendaReal: a.valorVendaReal ?? null,
    pagamentoAprovado: a.pagamentoAprovado ?? false,
    data: toTimestamp(a.data),
    dataAvaliacao: a.dataAvaliacao ? toTimestamp(a.dataAvaliacao) : null,
    dataVendaReal: a.dataVendaReal ? toTimestamp(a.dataVendaReal) : null,
    dataAprovacao: a.dataAprovacao ? toTimestamp(a.dataAprovacao) : null,
    dataPagamento: a.dataPagamento ? toTimestamp(a.dataPagamento) : null,
    dataRecusa: a.dataRecusa ? toTimestamp(a.dataRecusa) : null,
    justificativaRecusa: a.justificativaRecusa ?? null,
    retirada: a.retirada ?? null,
    criadoPor: a.criadoPor ?? null,
    lancamentoId: a.lancamentoId ?? null,
    problemasModelo: a.problemasModelo ?? [],
  };
}

export function clienteFromDoc(id: string, d: DocumentData): Cliente {
  return {
    id,
    nome: d.nome,
    email: d.email,
    telefone: d.telefone,
    possuiWhatsApp: Boolean(d.possuiWhatsApp),
    tiposNotificacao: d.tiposNotificacao ?? [],
    ativo: d.ativo !== false,
    data: toIso(d.data),
    criadoPor: d.criadoPor,
  };
}

export function clienteToDoc(c: Cliente): Record<string, unknown> {
  return {
    nome: c.nome,
    email: c.email ?? null,
    telefone: c.telefone ?? null,
    possuiWhatsApp: c.possuiWhatsApp,
    tiposNotificacao: c.tiposNotificacao ?? [],
    ativo: c.ativo !== false,
    data: toTimestamp(c.data),
    criadoPor: c.criadoPor ?? null,
  };
}

export function conversaFromDoc(id: string, d: DocumentData): Conversa {
  return {
    id,
    clienteId: d.clienteId,
    clienteNome: d.clienteNome,
    vendedorId: d.vendedorId,
    vendedorNome: d.vendedorNome,
    participantes: d.participantes ?? [],
    ultimaMensagem: d.ultimaMensagem,
    ultimaMensagemData: d.ultimaMensagemData ? toIso(d.ultimaMensagemData) : undefined,
  };
}

export function mensagemFromDoc(id: string, d: DocumentData): Mensagem {
  return {
    id,
    conversaId: d.conversaId,
    remetenteId: d.remetenteId,
    remetenteNome: d.remetenteNome,
    tipo: d.tipo ?? 'texto',
    texto: d.texto,
    mediaURL: d.mediaURL,
    mediaPath: d.mediaPath,
    duracaoAudio: d.duracaoAudio,
    data: toIso(d.data),
  };
}

export function mensagemToDoc(m: Mensagem): Record<string, unknown> {
  return {
    conversaId: m.conversaId,
    remetenteId: m.remetenteId,
    remetenteNome: m.remetenteNome,
    tipo: m.tipo || 'texto',
    texto: m.texto ?? null,
    mediaURL: m.mediaURL ?? null,
    mediaPath: m.mediaPath ?? null,
    duracaoAudio: m.duracaoAudio ?? null,
    data: toTimestamp(m.data),
  };
}
