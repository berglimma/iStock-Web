import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { api } from '../api/client';
import {
  isFirebaseConfigured,
  firebaseLogin,
  firebaseLoginGoogle,
  firebaseCadastro,
  firebaseLogout,
  firebaseRedefinirSenha,
  firebaseReautenticar,
  firebaseExcluirUsuarioAtual,
  onFirebaseAuthChange,
  onFirebaseTokenRefresh,
  erroFirebase,
} from '../firebase/auth';
import type { Usuario } from '../types';

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  erro: string | null;
  firebaseAtivo: boolean;
  login: (email: string, senha: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  redefinirSenha: (email: string) => Promise<void>;
  cadastro: (nome: string, email: string, senha: string, papel: string) => Promise<void>;
  excluirConta: (senha: string) => Promise<void>;
  sair: () => void;
  limparErro: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function backendQuerFirebase(): Promise<boolean> {
  const config = await api.config();
  return Boolean(config.firebase || config.sync === 'firestore');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [firebaseAtivo, setFirebaseAtivo] = useState(false);
  const firebaseAtivoRef = useRef(false);

  function ativarFirebase(valor: boolean) {
    firebaseAtivoRef.current = valor;
    setFirebaseAtivo(valor);
  }

  /** Garante modo Firebase quando a nuvem (Firestore) está ativa — evita cair no login local. */
  async function garantirModoFirebase(): Promise<boolean> {
    if (firebaseAtivoRef.current) return true;
    if (!isFirebaseConfigured()) return false;
    try {
      const quer = await backendQuerFirebase();
      if (quer) {
        ativarFirebase(true);
        return true;
      }
    } catch {
      // Se o client Firebase está configurado e o backend não responde, ainda tenta Auth no client
      ativarFirebase(true);
      return true;
    }
    return false;
  }

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    let unsubToken: (() => void) | undefined;
    let cancelado = false;

    async function init() {
      try {
        let backendFirestore: boolean | null = null;

        if (isFirebaseConfigured()) {
          for (let tentativa = 0; tentativa < 3; tentativa++) {
            try {
              backendFirestore = await backendQuerFirebase();
              break;
            } catch {
              if (tentativa < 2) await new Promise((r) => setTimeout(r, 500 * (tentativa + 1)));
            }
          }
        }

        if (cancelado) return;

        // Firestore no backend → Firebase Auth. Se o backend ainda não respondeu, assume nuvem
        // quando o client já tem VITE_FIREBASE_* (evita cair no login local e no erro do /auth/login).
        const usarFirebase = isFirebaseConfigured() && (backendFirestore === true || backendFirestore === null);
        ativarFirebase(usarFirebase);

        if (usarFirebase) {
          unsubToken = onFirebaseTokenRefresh(() => {});
          unsubAuth = onFirebaseAuthChange(async (user) => {
            if (!user) {
              localStorage.removeItem('istock_token');
              setUsuario(null);
              setCarregando(false);
              return;
            }
            try {
              const idToken = await user.getIdToken();
              localStorage.setItem('istock_token', idToken);
              const r = await api.firebaseSession(idToken);
              setUsuario(r.usuario);
            } catch {
              localStorage.removeItem('istock_token');
              setUsuario(null);
            } finally {
              setCarregando(false);
            }
          });
          return;
        }
      } catch {
        // fallback local
      }

      if (cancelado) return;

      const token = localStorage.getItem('istock_token');
      if (token) {
        api.me()
          .then((r) => setUsuario(r.usuario))
          .catch(() => localStorage.removeItem('istock_token'))
          .finally(() => setCarregando(false));
      } else {
        setCarregando(false);
      }
    }

    init();
    return () => {
      cancelado = true;
      unsubAuth?.();
      unsubToken?.();
    };
  }, []);

  const loginComFirebase = async (email: string, senha: string) => {
    const { idToken } = await firebaseLogin(email, senha);
    localStorage.setItem('istock_token', idToken);
    const r = await api.firebaseSession(idToken);
    setUsuario(r.usuario);
  };

  const login = async (email: string, senha: string) => {
    setErro(null);
    const usarFirebase = await garantirModoFirebase();
    if (usarFirebase) {
      try {
        await loginComFirebase(email, senha);
      } catch (err) {
        throw new Error(erroFirebase(err));
      }
      return;
    }

    try {
      const r = await api.login(email, senha);
      localStorage.setItem('istock_token', r.token);
      setUsuario(r.usuario);
    } catch (err) {
      // Backend em Firestore rejeita login local — migra para Firebase Auth
      const e = err as Error & { code?: string; firebase?: boolean };
      if ((e.code === 'FIREBASE_REQUIRED' || e.firebase || e.message?.includes('login Firebase')) && isFirebaseConfigured()) {
        ativarFirebase(true);
        try {
          await loginComFirebase(email, senha);
          return;
        } catch (fbErr) {
          throw new Error(erroFirebase(fbErr));
        }
      }
      throw err;
    }
  };

  const loginGoogle = async () => {
    setErro(null);
    const usarFirebase = await garantirModoFirebase();
    if (!usarFirebase) {
      throw new Error('Login com Google requer sincronização Firebase ativa.');
    }
    try {
      const { idToken } = await firebaseLoginGoogle();
      localStorage.setItem('istock_token', idToken);
      const r = await api.firebaseSession(idToken);
      setUsuario(r.usuario);
    } catch (err) {
      throw new Error(erroFirebase(err));
    }
  };

  const redefinirSenha = async (email: string) => {
    setErro(null);
    const usarFirebase = await garantirModoFirebase();
    if (!usarFirebase) {
      throw new Error('Redefinição de senha disponível apenas no modo nuvem (Firebase).');
    }
    try {
      await firebaseRedefinirSenha(email);
    } catch (err) {
      throw new Error(erroFirebase(err));
    }
  };

  const cadastro = async (nome: string, email: string, senha: string, papel: string) => {
    setErro(null);
    const usarFirebase = await garantirModoFirebase();
    if (usarFirebase) {
      try {
        const { idToken } = await firebaseCadastro(email, senha);
        const r = await api.cadastro({ nome, email, senha, papel, idToken });
        localStorage.setItem('istock_token', r.token);
        setUsuario(r.usuario);
      } catch (err) {
        throw new Error(erroFirebase(err));
      }
      return;
    }
    const r = await api.cadastro({ nome, email, senha, papel });
    localStorage.setItem('istock_token', r.token);
    setUsuario(r.usuario);
  };

  const excluirConta = async (senha: string) => {
    setErro(null);
    const usarFirebase = await garantirModoFirebase();
    if (usarFirebase) {
      try {
        await firebaseReautenticar(senha);
      } catch (err) {
        throw new Error(erroFirebase(err));
      }

      await api.excluirConta(senha);

      try {
        await firebaseExcluirUsuarioAtual();
      } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
        if (code !== 'auth/user-not-found' && code !== 'auth/user-token-expired') {
          throw new Error(erroFirebase(err));
        }
      }

      localStorage.removeItem('istock_token');
      setUsuario(null);
      return;
    }

    await api.excluirConta(senha);
    localStorage.removeItem('istock_token');
    setUsuario(null);
  };

  const sair = () => {
    if (firebaseAtivoRef.current) firebaseLogout().catch(() => {});
    localStorage.removeItem('istock_token');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, carregando, erro, firebaseAtivo, login, loginGoogle, redefinirSenha, cadastro, excluirConta, sair, limparErro: () => setErro(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
