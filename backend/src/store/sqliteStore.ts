import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import { obterCriterios, salvarCriterios, type CriteriosAssistente, type ModoAssistente } from '../services/assistenteIA.js';
import type { Avaliacao, Cliente, Conversa, Lancamento, Mensagem } from '../types.js';
import {
  comMetricasLancamento,
  historicoChatDesde,
  type DataStore,
  type LancamentoComMetricas,
  type MensagemAssistenteRecord,
  type SessaoAssistenteRecord,
  type UsuarioRecord,
} from './types.js';

function rowToLancamento(row: Record<string, unknown>): Lancamento {
  return {
    id: row.id as string,
    nome: row.nome as string,
    tipoProduto: row.tipo_produto as Lancamento['tipoProduto'],
    modelo: row.modelo as string | undefined,
    capacidade: row.capacidade as string | undefined,
    cor: row.cor as string | undefined,
    telefone: row.telefone as string | undefined,
    serial: row.serial as string | undefined,
    lacrado: Boolean(row.lacrado),
    condicaoPercentual: row.condicao_percentual as number | undefined,
    custoCompra: row.custo_compra as number | undefined,
    valor: row.valor as number,
    status: row.status as Lancamento['status'],
    data: row.data as string,
    criadoPor: row.criado_por as string | undefined,
    clienteVendaId: row.cliente_venda_id as string | undefined,
    clienteVendaNome: row.cliente_venda_nome as string | undefined,
    dataVenda: row.data_venda as string | undefined,
    observacoes: row.observacoes as string | undefined,
    problemasModelo: row.problemas_modelo ? JSON.parse(row.problemas_modelo as string) : undefined,
  };
}

function rowToAvaliacao(row: Record<string, unknown>): Avaliacao {
  return {
    id: row.id as string,
    tipoProduto: row.tipo_produto as Avaliacao['tipoProduto'],
    nome: row.nome as string,
    modelo: row.modelo as string | undefined,
    capacidade: row.capacidade as string | undefined,
    cor: row.cor as string | undefined,
    telefone: row.telefone as string | undefined,
    serial: row.serial as string | undefined,
    lacrado: Boolean(row.lacrado),
    condicaoPercentual: row.condicao_percentual as number | undefined,
    observacoes: row.observacoes as string | undefined,
    fotos: JSON.parse((row.fotos as string) || '[]'),
    status: row.status as Avaliacao['status'],
    valorEstimado: row.valor_estimado as number | undefined,
    valorCompraSugerido: row.valor_compra_sugerido as number | undefined,
    valorVendaReal: row.valor_venda_real as number | undefined,
    pagamentoAprovado: Boolean(row.pagamento_aprovado),
    data: row.data as string,
    dataAvaliacao: row.data_avaliacao as string | undefined,
    dataVendaReal: row.data_venda_real as string | undefined,
    dataAprovacao: row.data_aprovacao as string | undefined,
    dataPagamento: row.data_pagamento as string | undefined,
    dataRecusa: row.data_recusa as string | undefined,
    justificativaRecusa: row.justificativa_recusa as string | undefined,
    retirada: row.retirada ? JSON.parse(row.retirada as string) : undefined,
    criadoPor: row.criado_por as string | undefined,
    lancamentoId: row.lancamento_id as string | undefined,
    problemasModelo: row.problemas_modelo ? JSON.parse(row.problemas_modelo as string) : undefined,
  };
}

function rowToCliente(row: Record<string, unknown>): Cliente {
  return {
    id: row.id as string,
    nome: row.nome as string,
    email: row.email as string | undefined,
    telefone: row.telefone as string | undefined,
    possuiWhatsApp: Boolean(row.possui_whatsapp),
    tiposNotificacao: JSON.parse((row.tipos_notificacao as string) || '[]'),
    ativo: Boolean(row.ativo),
    data: row.data as string,
    criadoPor: row.criado_por as string | undefined,
  };
}

export const sqliteStore: DataStore = {
  kind: 'sqlite',

  async listLancamentos(): Promise<LancamentoComMetricas[]> {
    const rows = db.prepare('SELECT * FROM lancamentos ORDER BY data DESC').all() as Record<string, unknown>[];
    return rows.map((r) => comMetricasLancamento(rowToLancamento(r)));
  },

  async createLancamento(l: Lancamento, criadoPor: string): Promise<string> {
    const id = l.id || uuid();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO lancamentos (
      id, nome, tipo_produto, modelo, capacidade, cor, telefone, serial, lacrado,
      condicao_percentual, custo_compra, valor, status, data, criado_por, observacoes, problemas_modelo
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, l.nome, l.tipoProduto, l.modelo ?? null, l.capacidade ?? null, l.cor ?? null,
      l.telefone ?? null, l.serial ?? null, l.lacrado ? 1 : 0, l.condicaoPercentual ?? null,
      l.custoCompra ?? null, l.valor, l.status || 'Disponível', now, criadoPor,
      l.observacoes ?? null, l.problemasModelo ? JSON.stringify(l.problemasModelo) : null
    );
    return id;
  },

  async updateLancamento(id: string, l: Lancamento): Promise<void> {
    db.prepare(`UPDATE lancamentos SET
      nome=?, tipo_produto=?, modelo=?, capacidade=?, cor=?, telefone=?, serial=?,
      lacrado=?, condicao_percentual=?, custo_compra=?, valor=?, status=?,
      observacoes=?, problemas_modelo=?, cliente_venda_id=?, cliente_venda_nome=?, data_venda=?
      WHERE id=?`).run(
      l.nome, l.tipoProduto, l.modelo ?? null, l.capacidade ?? null, l.cor ?? null,
      l.telefone ?? null, l.serial ?? null, l.lacrado ? 1 : 0, l.condicaoPercentual ?? null,
      l.custoCompra ?? null, l.valor, l.status, l.observacoes ?? null,
      l.problemasModelo ? JSON.stringify(l.problemasModelo) : null,
      l.clienteVendaId ?? null, l.clienteVendaNome ?? null, l.dataVenda ?? null, id
    );
  },

  async deleteLancamento(id: string): Promise<void> {
    db.prepare('DELETE FROM lancamentos WHERE id = ?').run(id);
  },

  async listAvaliacoes(): Promise<Avaliacao[]> {
    const rows = db.prepare('SELECT * FROM avaliacoes ORDER BY data DESC').all() as Record<string, unknown>[];
    return rows.map(rowToAvaliacao);
  },

  async getAvaliacao(id: string): Promise<Avaliacao | null> {
    const row = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? rowToAvaliacao(row) : null;
  },

  async createAvaliacao(a: Avaliacao, criadoPor: string): Promise<string> {
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO avaliacoes (
      id, tipo_produto, nome, modelo, capacidade, cor, telefone, serial, lacrado,
      condicao_percentual, observacoes, fotos, status, data, criado_por, problemas_modelo
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, a.tipoProduto, a.nome, a.modelo ?? null, a.capacidade ?? null, a.cor ?? null,
      a.telefone ?? null, a.serial ?? null, a.lacrado ? 1 : 0, a.condicaoPercentual ?? null,
      a.observacoes ?? null, JSON.stringify(a.fotos || []), 'Em avaliação', now,
      criadoPor, a.problemasModelo ? JSON.stringify(a.problemasModelo) : null
    );
    return id;
  },

  async updateAvaliacao(id: string, patch: Partial<Avaliacao>): Promise<void> {
    const atual = await sqliteStore.getAvaliacao(id);
    if (!atual) return;
    const a = { ...atual, ...patch };
    db.prepare(`UPDATE avaliacoes SET
      tipo_produto=?, nome=?, modelo=?, capacidade=?, cor=?, telefone=?, serial=?,
      lacrado=?, condicao_percentual=?, observacoes=?, fotos=?, status=?,
      valor_estimado=?, valor_compra_sugerido=?, valor_venda_real=?, pagamento_aprovado=?,
      data_avaliacao=?, data_aprovacao=?, data_pagamento=?, data_recusa=?, justificativa_recusa=?,
      retirada=?, lancamento_id=?, problemas_modelo=?
      WHERE id=?`).run(
      a.tipoProduto, a.nome, a.modelo ?? null, a.capacidade ?? null, a.cor ?? null,
      a.telefone ?? null, a.serial ?? null, a.lacrado ? 1 : 0, a.condicaoPercentual ?? null,
      a.observacoes ?? null, JSON.stringify(a.fotos || []), a.status,
      a.valorEstimado ?? null, a.valorCompraSugerido ?? null, a.valorVendaReal ?? null,
      a.pagamentoAprovado ? 1 : 0,
      a.dataAvaliacao ?? null, a.dataAprovacao ?? null, a.dataPagamento ?? null,
      a.dataRecusa ?? null, a.justificativaRecusa ?? null,
      a.retirada ? JSON.stringify(a.retirada) : null, a.lancamentoId ?? null,
      a.problemasModelo ? JSON.stringify(a.problemasModelo) : null, id
    );
  },

  async deleteAvaliacao(id: string): Promise<void> {
    db.prepare('DELETE FROM avaliacoes WHERE id = ?').run(id);
  },

  async listClientes(): Promise<Cliente[]> {
    const rows = db.prepare('SELECT * FROM clientes ORDER BY nome').all() as Record<string, unknown>[];
    return rows.map(rowToCliente);
  },

  async createCliente(c: Cliente, criadoPor: string): Promise<string> {
    const id = uuid();
    db.prepare(`INSERT INTO clientes (id, nome, email, telefone, possui_whatsapp, tipos_notificacao, ativo, data, criado_por)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      id, c.nome, c.email ?? null, c.telefone ?? null, c.possuiWhatsApp ? 1 : 0,
      JSON.stringify(c.tiposNotificacao || []), c.ativo !== false ? 1 : 0,
      new Date().toISOString(), criadoPor
    );
    return id;
  },

  async updateCliente(id: string, c: Cliente): Promise<void> {
    db.prepare(`UPDATE clientes SET nome=?, email=?, telefone=?, possui_whatsapp=?, tipos_notificacao=?, ativo=? WHERE id=?`)
      .run(c.nome, c.email ?? null, c.telefone ?? null, c.possuiWhatsApp ? 1 : 0,
        JSON.stringify(c.tiposNotificacao || []), c.ativo ? 1 : 0, id);
  },

  async deleteCliente(id: string): Promise<void> {
    db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
  },

  async listConversas(participanteId: string): Promise<Conversa[]> {
    const rows = db.prepare(
      `SELECT * FROM conversas WHERE participantes LIKE ? ORDER BY ultima_mensagem_data DESC`
    ).all(`%${participanteId}%`) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      clienteId: r.cliente_id as string,
      clienteNome: r.cliente_nome as string,
      vendedorId: r.vendedor_id as string,
      vendedorNome: r.vendedor_nome as string,
      participantes: JSON.parse(r.participantes as string),
      ultimaMensagem: r.ultima_mensagem as string | undefined,
      ultimaMensagemData: r.ultima_mensagem_data as string | undefined,
    }));
  },

  async findConversaPorCliente(clienteId: string, vendedorId: string): Promise<Conversa | null> {
    const conversas = await sqliteStore.listConversas(vendedorId);
    return conversas.find((c) => c.clienteId === clienteId) ?? null;
  },

  async createConversa(c: Conversa): Promise<string> {
    const id = uuid();
    db.prepare(`INSERT INTO conversas (id, cliente_id, cliente_nome, vendedor_id, vendedor_nome, participantes)
      VALUES (?,?,?,?,?,?)`).run(
      id, c.clienteId, c.clienteNome, c.vendedorId, c.vendedorNome, JSON.stringify(c.participantes)
    );
    return id;
  },

  async listMensagens(conversaId: string): Promise<Mensagem[]> {
    const desdeIso = historicoChatDesde().toISOString();
    const rows = db.prepare(
      'SELECT * FROM mensagens WHERE conversa_id = ? AND data >= ? ORDER BY data ASC',
    ).all(conversaId, desdeIso) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      conversaId: r.conversa_id as string,
      remetenteId: r.remetente_id as string,
      remetenteNome: r.remetente_nome as string,
      tipo: r.tipo as Mensagem['tipo'],
      texto: r.texto as string | undefined,
      mediaURL: r.media_url as string | undefined,
      data: r.data as string,
    }));
  },

  async createMensagem(conversaId: string, msg: Mensagem): Promise<{ id: string; data: string }> {
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO mensagens (id, conversa_id, remetente_id, remetente_nome, tipo, texto, media_url, data)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      id, conversaId, msg.remetenteId, msg.remetenteNome, msg.tipo || 'texto',
      msg.texto ?? null, msg.mediaURL ?? null, now
    );
    return { id, data: now };
  },

  async updateConversaUltimaMensagem(conversaId: string, texto: string, data: string): Promise<void> {
    db.prepare(`UPDATE conversas SET ultima_mensagem=?, ultima_mensagem_data=? WHERE id=?`)
      .run(texto, data, conversaId);
  },

  async purgarMensagensAntigas(conversaId: string): Promise<number> {
    const desdeIso = historicoChatDesde().toISOString();
    const r = db.prepare('DELETE FROM mensagens WHERE conversa_id = ? AND data < ?').run(conversaId, desdeIso);
    return r.changes;
  },

  async getUsuarioByEmail(email: string): Promise<UsuarioRecord | null> {
    const row = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.toLowerCase().trim()) as Record<string, string> | undefined;
    if (!row) return null;
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      papel: row.papel as UsuarioRecord['papel'],
      senhaHash: row.senha_hash,
      dataCadastro: row.data_cadastro,
    };
  },

  async getUsuarioById(id: string): Promise<UsuarioRecord | null> {
    const row = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as Record<string, string> | undefined;
    if (!row) return null;
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      papel: row.papel as UsuarioRecord['papel'],
      senhaHash: row.senha_hash,
      dataCadastro: row.data_cadastro,
    };
  },

  async createUsuario(u: UsuarioRecord): Promise<void> {
    db.prepare(
      'INSERT INTO usuarios (id, nome, email, senha_hash, papel, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(u.id, u.nome, u.email.toLowerCase().trim(), u.senhaHash ?? '', u.papel, u.dataCadastro);
  },

  async updateUsuario(id: string, patch: Partial<UsuarioRecord>): Promise<void> {
    const atual = await sqliteStore.getUsuarioById(id);
    if (!atual) return;
    const u = { ...atual, ...patch };
    db.prepare('UPDATE usuarios SET nome=?, email=?, senha_hash=?, papel=? WHERE id=?')
      .run(u.nome, u.email, u.senhaHash ?? '', u.papel, id);
  },

  async countAdministradores(): Promise<number> {
    const r = db.prepare(`SELECT COUNT(*) as c FROM usuarios WHERE papel = 'Administrador'`).get() as { c: number };
    return r.c;
  },

  async deleteUsuario(id: string): Promise<void> {
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  },

  async getCriteriosAssistente(usuarioId: string): Promise<CriteriosAssistente | null> {
    return obterCriterios(usuarioId);
  },

  async saveCriteriosAssistente(usuarioId: string, dados: Partial<CriteriosAssistente>): Promise<CriteriosAssistente> {
    return salvarCriterios(usuarioId, dados);
  },

  async listSessoesAssistente(usuarioId: string, modo?: ModoAssistente): Promise<SessaoAssistenteRecord[]> {
    let sql = 'SELECT * FROM assistente_sessoes WHERE usuario_id = ?';
    const params: string[] = [usuarioId];
    if (modo) { sql += ' AND modo = ?'; params.push(modo); }
    sql += ' ORDER BY atualizado_em DESC';
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      usuarioId: r.usuario_id as string,
      modo: r.modo as ModoAssistente,
      titulo: r.titulo as string,
      criadoEm: r.criado_em as string,
      atualizadoEm: r.atualizado_em as string,
    }));
  },

  async getSessaoAssistente(id: string, usuarioId: string): Promise<SessaoAssistenteRecord | null> {
    const row = db.prepare('SELECT * FROM assistente_sessoes WHERE id = ? AND usuario_id = ?')
      .get(id, usuarioId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      usuarioId: row.usuario_id as string,
      modo: row.modo as ModoAssistente,
      titulo: row.titulo as string,
      criadoEm: row.criado_em as string,
      atualizadoEm: row.atualizado_em as string,
    };
  },

  async createSessaoAssistente(s: SessaoAssistenteRecord): Promise<void> {
    db.prepare(
      `INSERT INTO assistente_sessoes (id, usuario_id, modo, titulo, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)`
    ).run(s.id, s.usuarioId, s.modo, s.titulo, s.criadoEm, s.atualizadoEm);
  },

  async updateSessaoAssistente(id: string, atualizadoEm: string): Promise<void> {
    db.prepare('UPDATE assistente_sessoes SET atualizado_em = ? WHERE id = ?').run(atualizadoEm, id);
  },

  async deleteSessaoAssistente(id: string): Promise<void> {
    db.prepare('DELETE FROM assistente_mensagens WHERE sessao_id = ?').run(id);
    db.prepare('DELETE FROM assistente_sessoes WHERE id = ?').run(id);
  },

  async listMensagensAssistente(sessaoId: string): Promise<MensagemAssistenteRecord[]> {
    const rows = db.prepare('SELECT * FROM assistente_mensagens WHERE sessao_id = ? ORDER BY data ASC')
      .all(sessaoId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      sessaoId: r.sessao_id as string,
      papel: r.papel as 'usuario' | 'assistente',
      conteudo: r.conteudo as string,
      metadados: r.metadados ? JSON.parse(r.metadados as string) : undefined,
      data: r.data as string,
    }));
  },

  async createMensagemAssistente(m: MensagemAssistenteRecord): Promise<void> {
    db.prepare(
      `INSERT INTO assistente_mensagens (id, sessao_id, papel, conteudo, metadados, data) VALUES (?,?,?,?,?,?)`
    ).run(m.id, m.sessaoId, m.papel, m.conteudo, m.metadados ? JSON.stringify(m.metadados) : null, m.data);
  },

  async uploadFile(buffer: Buffer, storagePath: string, _contentType: string): Promise<{ url: string; path: string }> {
    const fs = await import('fs');
    const path = await import('path');
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const fullPath = path.join(uploadDir, storagePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    return { url: `/uploads/${storagePath}`, path: fullPath };
  },
};
