import { v4 as uuid } from 'uuid';
import type { DocumentData } from 'firebase-admin/firestore';
import { firestore, firebaseStorage } from '../firebase/admin.js';
import {
  avaliacaoFromDoc, avaliacaoToDoc, clienteFromDoc, clienteToDoc,
  conversaFromDoc, lancamentoFromDoc, lancamentoToDoc, mensagemFromDoc, mensagemToDoc,
  toIso, toTimestamp,
} from '../firebase/mappers.js';
import { obterCriterios, salvarCriterios, type CriteriosAssistente, type ModoAssistente } from '../services/assistenteIA.js';
import type { Avaliacao, Cliente, Conversa, Lancamento, Mensagem } from '../types.js';
import type { PapelUsuario } from '../middleware/auth.js';
import {
  comMetricasLancamento,
  type DataStore,
  type LancamentoComMetricas,
  type MensagemAssistenteRecord,
  type SessaoAssistenteRecord,
  type UsuarioRecord,
} from './types.js';

const db = () => firestore();

export const firestoreStore: DataStore = {
  kind: 'firestore',

  async listLancamentos(): Promise<LancamentoComMetricas[]> {
    const snap = await db().collection('lancamentos').orderBy('data', 'desc').get();
    return snap.docs.map((d) => comMetricasLancamento(lancamentoFromDoc(d.id, d.data())));
  },

  async createLancamento(l: Lancamento, criadoPor: string): Promise<string> {
    const id = l.id || uuid();
    const now = new Date().toISOString();
    const doc = { ...lancamentoToDoc({ ...l, data: now, criadoPor }), criadoPor };
    await db().collection('lancamentos').doc(id).set(doc);
    return id;
  },

  async updateLancamento(id: string, l: Lancamento): Promise<void> {
    await db().collection('lancamentos').doc(id).set(lancamentoToDoc({ ...l, id }), { merge: true });
  },

  async deleteLancamento(id: string): Promise<void> {
    await db().collection('lancamentos').doc(id).delete();
  },

  async listAvaliacoes(): Promise<Avaliacao[]> {
    const snap = await db().collection('avaliacoes').orderBy('data', 'desc').get();
    return snap.docs.map((d) => avaliacaoFromDoc(d.id, d.data()));
  },

  async getAvaliacao(id: string): Promise<Avaliacao | null> {
    const doc = await db().collection('avaliacoes').doc(id).get();
    if (!doc.exists) return null;
    return avaliacaoFromDoc(doc.id, doc.data()!);
  },

  async createAvaliacao(a: Avaliacao, criadoPor: string): Promise<string> {
    const id = a.id || uuid();
    const now = new Date().toISOString();
    const doc = avaliacaoToDoc({
      ...a,
      status: 'Em avaliação',
      data: now,
      criadoPor,
      pagamentoAprovado: false,
      fotos: a.fotos || [],
    });
    await db().collection('avaliacoes').doc(id).set(doc);
    return id;
  },

  async updateAvaliacao(id: string, patch: Partial<Avaliacao>): Promise<void> {
    const atual = await firestoreStore.getAvaliacao(id);
    if (!atual) return;
    const merged = { ...atual, ...patch };
    await db().collection('avaliacoes').doc(id).set(avaliacaoToDoc(merged), { merge: true });
  },

  async deleteAvaliacao(id: string): Promise<void> {
    await db().collection('avaliacoes').doc(id).delete();
  },

  async listClientes(): Promise<Cliente[]> {
    const snap = await db().collection('clientes').orderBy('nome').get();
    return snap.docs.map((d) => clienteFromDoc(d.id, d.data()));
  },

  async createCliente(c: Cliente, criadoPor: string): Promise<string> {
    const id = c.id || uuid();
    const doc = clienteToDoc({ ...c, data: new Date().toISOString(), criadoPor });
    await db().collection('clientes').doc(id).set(doc);
    return id;
  },

  async updateCliente(id: string, c: Cliente): Promise<void> {
    await db().collection('clientes').doc(id).set(clienteToDoc({ ...c, id }), { merge: true });
  },

  async deleteCliente(id: string): Promise<void> {
    await db().collection('clientes').doc(id).delete();
  },

  async listConversas(participanteId: string): Promise<Conversa[]> {
    const snap = await db().collection('conversas')
      .where('participantes', 'array-contains', participanteId)
      .get();
    return snap.docs
      .map((d) => conversaFromDoc(d.id, d.data()))
      .sort((a, b) => {
        const da = a.ultimaMensagemData ? new Date(a.ultimaMensagemData).getTime() : 0;
        const db2 = b.ultimaMensagemData ? new Date(b.ultimaMensagemData).getTime() : 0;
        return db2 - da;
      });
  },

  async findConversaPorCliente(clienteId: string, vendedorId: string): Promise<Conversa | null> {
    const conversas = await firestoreStore.listConversas(vendedorId);
    return conversas.find((c) => c.clienteId === clienteId) ?? null;
  },

  async createConversa(c: Conversa): Promise<string> {
    const ref = await db().collection('conversas').add({
      clienteId: c.clienteId,
      clienteNome: c.clienteNome,
      vendedorId: c.vendedorId,
      vendedorNome: c.vendedorNome,
      participantes: c.participantes,
      ultimaMensagem: c.ultimaMensagem ?? null,
      ultimaMensagemData: c.ultimaMensagemData ? toTimestamp(c.ultimaMensagemData) : null,
    });
    return ref.id;
  },

  async listMensagens(conversaId: string): Promise<Mensagem[]> {
    const snap = await db().collection('conversas').doc(conversaId)
      .collection('mensagens').orderBy('data').get();
    return snap.docs.map((d) => mensagemFromDoc(d.id, { ...d.data(), conversaId }));
  },

  async createMensagem(conversaId: string, msg: Mensagem): Promise<{ id: string; data: string }> {
    const now = new Date().toISOString();
    const ref = await db().collection('conversas').doc(conversaId).collection('mensagens').add(
      mensagemToDoc({ ...msg, conversaId, data: now }),
    );
    return { id: ref.id, data: now };
  },

  async updateConversaUltimaMensagem(conversaId: string, texto: string, data: string): Promise<void> {
    await db().collection('conversas').doc(conversaId).update({
      ultimaMensagem: texto,
      ultimaMensagemData: toTimestamp(data),
    });
  },

  async getUsuarioByEmail(email: string): Promise<UsuarioRecord | null> {
    const snap = await db().collection('usuarios')
      .where('email', '==', email.toLowerCase().trim()).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return usuarioFromDoc(d.id, d.data());
  },

  async getUsuarioById(id: string): Promise<UsuarioRecord | null> {
    const doc = await db().collection('usuarios').doc(id).get();
    if (!doc.exists) return null;
    return usuarioFromDoc(doc.id, doc.data()!);
  },

  async createUsuario(u: UsuarioRecord): Promise<void> {
    await db().collection('usuarios').doc(u.id).set({
      nome: u.nome,
      email: u.email.toLowerCase().trim(),
      papel: u.papel,
      dataCadastro: toTimestamp(u.dataCadastro),
    });
  },

  async updateUsuario(id: string, patch: Partial<UsuarioRecord>): Promise<void> {
    const data: DocumentData = {};
    if (patch.nome) data.nome = patch.nome;
    if (patch.email) data.email = patch.email.toLowerCase().trim();
    if (patch.papel) data.papel = patch.papel;
    await db().collection('usuarios').doc(id).update(data);
  },

  async countAdministradores(): Promise<number> {
    const snap = await db().collection('usuarios')
      .where('papel', '==', 'Administrador').get();
    return snap.size;
  },

  async deleteUsuario(id: string): Promise<void> {
    await db().collection('usuarios').doc(id).delete();
  },

  async getCriteriosAssistente(usuarioId: string): Promise<CriteriosAssistente | null> {
    const doc = await db().collection('assistente_criterios').doc(usuarioId).get();
    if (!doc.exists) return obterCriterios(usuarioId);
    return doc.data() as CriteriosAssistente;
  },

  async saveCriteriosAssistente(usuarioId: string, dados: Partial<CriteriosAssistente>): Promise<CriteriosAssistente> {
    const atual = await firestoreStore.getCriteriosAssistente(usuarioId);
    const base = atual ?? obterCriterios(usuarioId);
    const merged = { ...base, ...dados };
    await db().collection('assistente_criterios').doc(usuarioId).set(merged, { merge: true });
    return merged;
  },

  async listSessoesAssistente(usuarioId: string, modo?: ModoAssistente): Promise<SessaoAssistenteRecord[]> {
    let q = db().collection('assistente_sessoes').where('usuarioId', '==', usuarioId);
    if (modo) q = q.where('modo', '==', modo);
    const snap = await q.orderBy('atualizadoEm', 'desc').get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        usuarioId: data.usuarioId as string,
        modo: data.modo as ModoAssistente,
        titulo: data.titulo as string,
        criadoEm: toIso(data.criadoEm),
        atualizadoEm: toIso(data.atualizadoEm),
      };
    });
  },

  async getSessaoAssistente(id: string, usuarioId: string): Promise<SessaoAssistenteRecord | null> {
    const doc = await db().collection('assistente_sessoes').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    if (data.usuarioId !== usuarioId) return null;
    return {
      id: doc.id,
      usuarioId: data.usuarioId as string,
      modo: data.modo as ModoAssistente,
      titulo: data.titulo as string,
      criadoEm: toIso(data.criadoEm),
      atualizadoEm: toIso(data.atualizadoEm),
    };
  },

  async createSessaoAssistente(s: SessaoAssistenteRecord): Promise<void> {
    await db().collection('assistente_sessoes').doc(s.id).set({
      usuarioId: s.usuarioId,
      modo: s.modo,
      titulo: s.titulo,
      criadoEm: toTimestamp(s.criadoEm),
      atualizadoEm: toTimestamp(s.atualizadoEm),
    });
  },

  async updateSessaoAssistente(id: string, atualizadoEm: string): Promise<void> {
    await db().collection('assistente_sessoes').doc(id).update({
      atualizadoEm: toTimestamp(atualizadoEm),
    });
  },

  async deleteSessaoAssistente(id: string): Promise<void> {
    const msgs = await db().collection('assistente_sessoes').doc(id).collection('mensagens').get();
    const batch = db().batch();
    msgs.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db().collection('assistente_sessoes').doc(id));
    await batch.commit();
  },

  async listMensagensAssistente(sessaoId: string): Promise<MensagemAssistenteRecord[]> {
    const snap = await db().collection('assistente_sessoes').doc(sessaoId)
      .collection('mensagens').orderBy('data').get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        sessaoId,
        papel: data.papel as 'usuario' | 'assistente',
        conteudo: data.conteudo as string,
        metadados: data.metadados as Record<string, unknown> | undefined,
        data: toIso(data.data),
      };
    });
  },

  async createMensagemAssistente(m: MensagemAssistenteRecord): Promise<void> {
    await db().collection('assistente_sessoes').doc(m.sessaoId)
      .collection('mensagens').doc(m.id).set({
        papel: m.papel,
        conteudo: m.conteudo,
        metadados: m.metadados ?? null,
        data: toTimestamp(m.data),
      });
  },

  async uploadFile(buffer: Buffer, storagePath: string, contentType: string): Promise<{ url: string; path: string }> {
    const bucket = firebaseStorage().bucket();
    const file = bucket.file(storagePath);
    const token = uuid();
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    return { url, path: storagePath };
  },
};

function usuarioFromDoc(id: string, d: DocumentData): UsuarioRecord {
  return {
    id,
    nome: d.nome as string,
    email: d.email as string,
    papel: d.papel as PapelUsuario,
    dataCadastro: toIso(d.dataCadastro),
  };
}
