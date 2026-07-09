import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = process.env.DATABASE_PATH || './data/istock.db';
const backupPath = process.env.DATABASE_BACKUP_PATH || '';

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function restoreFromBackup() {
  if (!backupPath || !fs.existsSync(backupPath)) return;
  if (fs.existsSync(dbPath)) return;

  ensureDir(dbPath);
  fs.copyFileSync(backupPath, dbPath);
  console.log(`✅ Banco restaurado de ${backupPath}`);
}

export function backupDatabase() {
  if (!backupPath || !fs.existsSync(dbPath)) return;

  try {
    ensureDir(backupPath);
    const tempPath = `${backupPath}.tmp`;
    fs.copyFileSync(dbPath, tempPath);
    fs.renameSync(tempPath, backupPath);
  } catch (error) {
    console.warn('⚠️ Falha ao salvar backup do banco:', error);
  }
}

restoreFromBackup();
ensureDir(dbPath);

const db = new Database(dbPath, { timeout: 5000 });
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

export { db };

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL DEFAULT 'Consultor de vendas',
      data_cadastro TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lancamentos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo_produto TEXT NOT NULL,
      modelo TEXT,
      capacidade TEXT,
      cor TEXT,
      telefone TEXT,
      serial TEXT,
      lacrado INTEGER NOT NULL DEFAULT 0,
      condicao_percentual INTEGER,
      custo_compra REAL,
      valor REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Disponível',
      data TEXT NOT NULL,
      criado_por TEXT,
      cliente_venda_id TEXT,
      cliente_venda_nome TEXT,
      data_venda TEXT,
      observacoes TEXT,
      problemas_modelo TEXT
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id TEXT PRIMARY KEY,
      tipo_produto TEXT NOT NULL,
      nome TEXT NOT NULL,
      modelo TEXT,
      capacidade TEXT,
      cor TEXT,
      telefone TEXT,
      serial TEXT,
      lacrado INTEGER NOT NULL DEFAULT 0,
      condicao_percentual INTEGER,
      observacoes TEXT,
      fotos TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Em avaliação',
      valor_estimado REAL,
      valor_compra_sugerido REAL,
      valor_venda_real REAL,
      pagamento_aprovado INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      data_avaliacao TEXT,
      data_venda_real TEXT,
      data_aprovacao TEXT,
      data_pagamento TEXT,
      data_recusa TEXT,
      justificativa_recusa TEXT,
      retirada TEXT,
      criado_por TEXT,
      lancamento_id TEXT,
      problemas_modelo TEXT
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT,
      possui_whatsapp INTEGER NOT NULL DEFAULT 0,
      tipos_notificacao TEXT NOT NULL DEFAULT '[]',
      ativo INTEGER NOT NULL DEFAULT 1,
      data TEXT NOT NULL,
      criado_por TEXT
    );

    CREATE TABLE IF NOT EXISTS conversas (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      cliente_nome TEXT NOT NULL,
      vendedor_id TEXT NOT NULL,
      vendedor_nome TEXT NOT NULL,
      participantes TEXT NOT NULL,
      ultima_mensagem TEXT,
      ultima_mensagem_data TEXT
    );

    CREATE TABLE IF NOT EXISTS mensagens (
      id TEXT PRIMARY KEY,
      conversa_id TEXT NOT NULL,
      remetente_id TEXT NOT NULL,
      remetente_nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'texto',
      texto TEXT,
      media_url TEXT,
      media_path TEXT,
      duracao_audio REAL,
      data TEXT NOT NULL,
      FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notificacoes_painel (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      lida INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      referencia_id TEXT
    );

    CREATE TABLE IF NOT EXISTS transacoes_log (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL,
      usuario_id TEXT,
      usuario_nome TEXT,
      referencia_id TEXT,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assistente_criterios (
      usuario_id TEXT PRIMARY KEY,
      dados TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assistente_sessoes (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      modo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assistente_mensagens (
      id TEXT PRIMARY KEY,
      sessao_id TEXT NOT NULL,
      papel TEXT NOT NULL,
      conteudo TEXT NOT NULL,
      metadados TEXT,
      data TEXT NOT NULL,
      FOREIGN KEY (sessao_id) REFERENCES assistente_sessoes(id) ON DELETE CASCADE
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM usuarios').get() as { c: number };
  if (count.c === 0) {
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      `INSERT INTO usuarios (id, nome, email, senha_hash, papel, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, 'Administrador', 'admin@istock.com', hash, 'Administrador', new Date().toISOString());
    console.log('✅ Usuário demo criado: admin@istock.com / admin123');
  }

  backupDatabase();

  if (backupPath) {
    const intervalMs = Number(process.env.DATABASE_BACKUP_INTERVAL_MS || 300000);
    setInterval(backupDatabase, intervalMs);
    process.on('SIGTERM', backupDatabase);
    process.on('SIGINT', backupDatabase);
  }
}
