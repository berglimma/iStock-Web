import { isFirebaseEnabled } from '../firebase/admin.js';
import { firestoreStore } from './firestoreStore.js';
import { sqliteStore } from './sqliteStore.js';
import type { DataStore } from './types.js';

export { DIAS_HISTORICO_CHAT, historicoChatDesde } from './types.js';

function resolveStore(): DataStore {
  const mode = (process.env.DATA_STORE || '').toLowerCase();
  if (mode === 'sqlite') return sqliteStore;
  if (mode === 'firestore') return firestoreStore;
  if (isFirebaseEnabled()) return firestoreStore;
  return sqliteStore;
}

export const store: DataStore = resolveStore();

export function isFirestoreSync(): boolean {
  return store.kind === 'firestore';
}

export function criadoPorLabel(nome: string, email: string): string {
  return nome?.trim() || email;
}
