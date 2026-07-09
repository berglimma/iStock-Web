import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/** Recarrega dados periodicamente quando a sincronização Firebase está ativa. */
export function useSyncRefresh(reload: () => void, intervalMs = 15000) {
  const { firebaseAtivo } = useAuth();

  useEffect(() => {
    if (!firebaseAtivo) return;
    reload();
    const id = window.setInterval(reload, intervalMs);
    return () => window.clearInterval(id);
  }, [firebaseAtivo, reload, intervalMs]);
}
