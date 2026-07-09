import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './config';

export { isFirebaseConfigured };

export async function firebaseLogin(email: string, senha: string): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function firebaseCadastro(email: string, senha: string): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function firebaseLogout(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function refreshIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}

export function onFirebaseAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}
