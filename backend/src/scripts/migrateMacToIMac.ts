/**
 * Normaliza tipoProduto "Mac" → "iMac" no Firestore (banco istock).
 * Uso: npm run migrate:imac -w backend
 */
import 'dotenv/config';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const saCandidates = [
  resolve(root, 'firebase-service-account.json'),
  resolve(root, 'backend/firebase-service-account.json'),
  resolve(process.cwd(), 'firebase-service-account.json'),
  resolve(process.cwd(), '../firebase-service-account.json'),
];
for (const p of saCandidates) {
  if (existsSync(p)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = p;
    break;
  }
}

const { firestore } = await import('../firebase/admin.js');

async function migrarColecao(nome: string) {
  const db = firestore();
  const snap = await db.collection(nome).get();
  let atualizados = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const patch: Record<string, unknown> = {};
    if (data.tipoProduto === 'Mac') patch.tipoProduto = 'iMac';
    if (Array.isArray(data.tiposNotificacao) && data.tiposNotificacao.includes('Mac')) {
      patch.tiposNotificacao = data.tiposNotificacao.map((t: string) => (t === 'Mac' ? 'iMac' : t));
    }
    if (Object.keys(patch).length) {
      await doc.ref.update(patch);
      atualizados += 1;
    }
  }
  console.log(`${nome}: ${atualizados} documento(s) atualizado(s)`);
}

console.log('Migrando Mac → iMac no Firestore...');
await migrarColecao('lancamentos');
await migrarColecao('avaliacoes');
await migrarColecao('clientes');
console.log('Concluído.');
