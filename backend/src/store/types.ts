import type { Avaliacao, Cliente, Conversa, Lancamento, Mensagem } from '../types.js';
import type { PapelUsuario } from '../middleware/auth.js';
import type { CriteriosAssistente, ModoAssistente } from '../services/assistenteIA.js';

export const DIAS_LIMITE_ESTOQUE = 30;
export const DIAS_HISTORICO_CHAT = 30;

export function historicoChatDesde(dias = DIAS_HISTORICO_CHAT): Date {
  return new Date(Date.now() - dias * 86400000);
}

export type LancamentoComMetricas = Lancamento & {
  diasNoEstoque: number;
  estaHaMuitoTempoNoEstoque: boolean;
};

export interface UsuarioRecord {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  senhaHash?: string;
  dataCadastro: string;
}

export interface SessaoAssistenteRecord {
  id: string;
  usuarioId: string;
  modo: ModoAssistente;
  titulo: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface MensagemAssistenteRecord {
  id: string;
  sessaoId: string;
  papel: 'usuario' | 'assistente';
  conteudo: string;
  metadados?: Record<string, unknown>;
  data: string;
}

export interface DataStore {
  readonly kind: 'sqlite' | 'firestore';

  listLancamentos(): Promise<LancamentoComMetricas[]>;
  createLancamento(l: Lancamento, criadoPor: string): Promise<string>;
  updateLancamento(id: string, l: Lancamento): Promise<void>;
  deleteLancamento(id: string): Promise<void>;

  listAvaliacoes(): Promise<Avaliacao[]>;
  getAvaliacao(id: string): Promise<Avaliacao | null>;
  createAvaliacao(a: Avaliacao, criadoPor: string): Promise<string>;
  updateAvaliacao(id: string, patch: Partial<Avaliacao>): Promise<void>;
  deleteAvaliacao(id: string): Promise<void>;

  listClientes(): Promise<Cliente[]>;
  createCliente(c: Cliente, criadoPor: string): Promise<string>;
  updateCliente(id: string, c: Cliente): Promise<void>;
  deleteCliente(id: string): Promise<void>;

  listConversas(participanteId: string): Promise<Conversa[]>;
  findConversaPorCliente(clienteId: string, vendedorId: string): Promise<Conversa | null>;
  createConversa(c: Conversa): Promise<string>;
  listMensagens(conversaId: string): Promise<Mensagem[]>;
  createMensagem(conversaId: string, msg: Mensagem): Promise<{ id: string; data: string }>;
  updateConversaUltimaMensagem(conversaId: string, texto: string, data: string): Promise<void>;
  /** Remove mensagens com mais de DIAS_HISTORICO_CHAT dias. */
  purgarMensagensAntigas(conversaId: string): Promise<number>;

  getUsuarioByEmail(email: string): Promise<UsuarioRecord | null>;
  getUsuarioById(id: string): Promise<UsuarioRecord | null>;
  createUsuario(u: UsuarioRecord): Promise<void>;
  updateUsuario(id: string, patch: Partial<UsuarioRecord>): Promise<void>;
  countAdministradores(): Promise<number>;
  deleteUsuario(id: string): Promise<void>;

  getCriteriosAssistente(usuarioId: string): Promise<CriteriosAssistente | null>;
  saveCriteriosAssistente(usuarioId: string, dados: Partial<CriteriosAssistente>): Promise<CriteriosAssistente>;
  listSessoesAssistente(usuarioId: string, modo?: ModoAssistente): Promise<SessaoAssistenteRecord[]>;
  getSessaoAssistente(id: string, usuarioId: string): Promise<SessaoAssistenteRecord | null>;
  createSessaoAssistente(s: SessaoAssistenteRecord): Promise<void>;
  updateSessaoAssistente(id: string, atualizadoEm: string): Promise<void>;
  deleteSessaoAssistente(id: string): Promise<void>;
  listMensagensAssistente(sessaoId: string): Promise<MensagemAssistenteRecord[]>;
  createMensagemAssistente(m: MensagemAssistenteRecord): Promise<void>;

  uploadFile(buffer: Buffer, storagePath: string, contentType: string): Promise<{ url: string; path: string }>;
}

export function comMetricasLancamento(l: Lancamento): LancamentoComMetricas {
  const dias = Math.max(0, Math.floor((Date.now() - new Date(l.data).getTime()) / 86400000));
  return {
    ...l,
    diasNoEstoque: dias,
    estaHaMuitoTempoNoEstoque: l.status !== 'Vendido' && dias >= DIAS_LIMITE_ESTOQUE,
  };
}
