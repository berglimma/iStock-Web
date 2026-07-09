import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/** Carrega dados ao entrar e recarrega periodicamente no modo nuvem. */
export function useSyncRefresh(reload: () => void, intervalMs = 15000) {
  const { usuario, firebaseAtivo } = useAuth();

  useEffect(() => {
    if (!usuario) return;
    reload();
    if (!firebaseAtivo) return;
    const id = window.setInterval(reload, intervalMs);
    return () => window.clearInterval(id);
  }, [usuario, firebaseAtivo, reload, intervalMs]);
}
