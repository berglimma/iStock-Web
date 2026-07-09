import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { isFirebaseConfigured, firebaseLogin, firebaseLoginGoogle, firebaseCadastro, firebaseLogout, firebaseRedefinirSenha, onFirebaseAuthChange, onFirebaseTokenRefresh, erroFirebase } from '../firebase/auth';
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
  sair: () => void;
  limparErro: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [firebaseAtivo, setFirebaseAtivo] = useState(false);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    let unsubToken: (() => void) | undefined;

    async function init() {
      try {
        const config = await api.config();
        const usarFirebase = config.firebase && isFirebaseConfigured();
        setFirebaseAtivo(usarFirebase);

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
      unsubAuth?.();
      unsubToken?.();
    };
  }, []);

  const login = async (email: string, senha: string) => {
    setErro(null);
    if (firebaseAtivo) {
      try {
        const { idToken } = await firebaseLogin(email, senha);
        localStorage.setItem('istock_token', idToken);
        const r = await api.firebaseSession(idToken);
        setUsuario(r.usuario);
      } catch (err) {
        throw new Error(erroFirebase(err));
      }
      return;
    }
    const r = await api.login(email, senha);
    localStorage.setItem('istock_token', r.token);
    setUsuario(r.usuario);
  };

  const loginGoogle = async () => {
    setErro(null);
    if (!firebaseAtivo) {
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
    if (!firebaseAtivo) {
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
    if (firebaseAtivo) {
      const { idToken } = await firebaseCadastro(email, senha);
      const r = await api.cadastro({ nome, email, senha, papel, idToken });
      localStorage.setItem('istock_token', r.token);
      setUsuario(r.usuario);
      return;
    }
    const r = await api.cadastro({ nome, email, senha, papel });
    localStorage.setItem('istock_token', r.token);
    setUsuario(r.usuario);
  };

  const sair = () => {
    if (firebaseAtivo) firebaseLogout().catch(() => {});
    localStorage.removeItem('istock_token');
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, carregando, erro, firebaseAtivo, login, loginGoogle, redefinirSenha, cadastro, sair, limparErro: () => setErro(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
