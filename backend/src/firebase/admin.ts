import { readFileSync, existsSync } from 'fs';
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app: App | null = null;

function loadServiceAccount(): Record<string, unknown> | null {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido');
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && existsSync(credPath)) {
    return JSON.parse(readFileSync(credPath, 'utf8'));
  }

  return null;
}

export function isFirebaseEnabled(): boolean {
  return Boolean(
    process.env.DATA_STORE === 'firestore' ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

export function getFirebaseApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'istock-4771d';
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'istock-4771d.firebasestorage.app';

  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      projectId,
      storageBucket,
    });
  } else if (process.env.DATA_STORE === 'firestore') {
    throw new Error(
      'DATA_STORE=firestore requer FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS'
    );
  } else {
    app = initializeApp({ projectId, storageBucket });
  }

  return app;
}

export function firestoreDatabaseId(): string {
  return process.env.FIRESTORE_DATABASE_ID || 'istock';
}

export function firestore() {
  return getFirestore(getFirebaseApp(), firestoreDatabaseId());
}

export function firebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function firebaseStorage() {
  return getStorage(getFirebaseApp());
}
