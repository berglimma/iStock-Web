/**
 * Copia dados do SQLite local para o Firestore (banco istock).
 * Uso: npm run migrate:firestore -w backend
 */
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { avaliacaoToDoc, clienteToDoc, lancamentoToDoc, toTimestamp } from '../firebase/mappers.js';
import { firestore } from '../firebase/admin.js';
import type { Avaliacao, Cliente, Lancamento } from '../types.js';

const dbPath = resolve(process.env.DATABASE_PATH || './data/istock.db');

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

async function migrate() {
  if (!existsSync(dbPath)) {
    console.log('SQLite não encontrado:', dbPath);
    return;
  }

  const sqlite = new Database(dbPath, { readonly: true });
  const fs = firestore();

  const avaliacoes = sqlite.prepare('SELECT * FROM avaliacoes').all() as Record<string, unknown>[];
  const lancamentos = sqlite.prepare('SELECT * FROM lancamentos').all() as Record<string, unknown>[];
  const clientes = sqlite.prepare('SELECT * FROM clientes').all() as Record<string, unknown>[];

  console.log(`Migrando: ${avaliacoes.length} avaliações, ${lancamentos.length} lançamentos, ${clientes.length} clientes`);
  console.log('Destino: Firestore banco', process.env.FIRESTORE_DATABASE_ID || 'istock');

  for (const row of avaliacoes) {
    const a = rowToAvaliacao(row);
    await fs.collection('avaliacoes').doc(a.id!).set(avaliacaoToDoc(a));
    console.log('  ✓ avaliacao', a.id, a.nome);
  }

  for (const row of lancamentos) {
    const l = rowToLancamento(row);
    await fs.collection('lancamentos').doc(l.id!).set(lancamentoToDoc(l));
    console.log('  ✓ lancamento', l.id, l.nome);
  }

  for (const row of clientes) {
    const c = rowToCliente(row);
    await fs.collection('clientes').doc(c.id!).set(clienteToDoc(c));
    console.log('  ✓ cliente', c.id, c.nome);
  }

  const usuarios = sqlite.prepare('SELECT * FROM usuarios').all() as Record<string, unknown>[];
  for (const row of usuarios) {
    const id = row.id as string;
    await fs.collection('usuarios').doc(id).set({
      nome: row.nome,
      email: (row.email as string).toLowerCase().trim(),
      papel: row.papel,
      dataCadastro: toTimestamp(row.data_cadastro as string),
    }, { merge: true });
    console.log('  ✓ usuario', id);
  }

  sqlite.close();
  console.log('Migração concluída.');
}

migrate().catch((e) => {
  console.error('Erro na migração:', e);
  process.exit(1);
});
