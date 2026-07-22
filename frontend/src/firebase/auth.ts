import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './config';

export { isFirebaseConfigured, getFirebaseAuth };

function traduzirErroFirebase(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Login cancelado.';
    case 'auth/popup-blocked-by-browser':
      return 'O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.';
    case 'auth/cancelled-popup-request':
      return 'Aguarde o login anterior terminar.';
    case 'auth/account-exists-with-different-credential':
      return 'Este e-mail já está cadastrado com outro método de login.';
    case 'auth/network-request-failed':
      return 'Falha de conexão. Verifique sua internet.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/missing-email':
      return 'Informe o e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/user-not-found':
      return 'Conta não encontrada. Use o mesmo e-mail do app iOS ou crie uma conta.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Faça login com e-mail/senha ou Google.';
    case 'auth/weak-password':
      return 'Senha muito fraca (mínimo 6 caracteres).';
    case 'auth/operation-not-allowed':
      return 'Método de login desabilitado no Firebase. Ative E-mail/Senha ou Google no Console.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde e tente novamente.';
    case 'auth/requires-recent-login':
      return 'Confirme sua senha novamente para continuar.';
    default:
      return 'Não foi possível autenticar.';
  }
}

export function erroFirebase(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return traduzirErroFirebase(String((err as { code: string }).code));
  }
  if (err instanceof Error) return err.message;
  return 'Erro ao autenticar.';
}

export async function firebaseLogin(email: string, senha: string): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function firebaseLoginGoogle(): Promise<{ user: User; idToken: string }> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function firebaseRedefinirSenha(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  const destino = import.meta.env.VITE_APP_URL || window.location.origin;
  await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
    url: `${destino}/login`,
    handleCodeInApp: false,
  });
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

/** Reautentica o usuário atual com e-mail/senha (ações sensíveis). */
export async function firebaseReautenticar(senha: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Sessão inválida. Faça login novamente.');
  const cred = EmailAuthProvider.credential(user.email, senha);
  await reauthenticateWithCredential(user, cred);
}

/** Remove o usuário autenticado no Firebase Auth (após reauth + limpeza Firestore). */
export async function firebaseExcluirUsuarioAtual(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;
  await deleteUser(user);
}

export async function refreshIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}

export function onFirebaseAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}

/** Mantém o token JWT em cache atualizado enquanto a sessão Firebase estiver ativa. */
export function onFirebaseTokenRefresh(cb: (token: string | null) => void) {
  return onIdTokenChanged(getFirebaseAuth(), async (user) => {
    if (!user) {
      cb(null);
      return;
    }
    const token = await user.getIdToken();
    localStorage.setItem('istock_token', token);
    cb(token);
  });
}
