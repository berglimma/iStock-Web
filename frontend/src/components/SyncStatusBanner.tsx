import { useEffect, useState } from 'react';
import { Cloud } from 'lucide-react';
import { api } from '../api/client';

type SyncStatus = {
  ativo: boolean;
  modo?: string;
  mensagem: string;
  erro?: string;
};

export function SyncStatusBanner() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let cancel = false;
    const carregar = () => {
      api.syncStatus()
        .then((s) => { if (!cancel) setStatus(s); })
        .catch(() => {
          if (!cancel) {
            setStatus({ ativo: false, mensagem: 'Sincronização indisponível' });
          }
        });
    };
    carregar();
    const id = window.setInterval(carregar, 30000);
    return () => { cancel = true; window.clearInterval(id); };
  }, []);

  if (!status) return null;

  const ok = status.ativo && status.modo === 'firestore';
  const titulo = ok ? 'Conectado com a cloud' : 'Desconectado';

  return (
    <button
      type="button"
      className={`sync-icon ${ok ? 'sync-ok' : 'sync-erro'}`}
      title={titulo}
      aria-label={titulo}
      onClick={() => api.syncStatus().then(setStatus).catch(() => {})}
    >
      <Cloud size={18} />
    </button>
  );
}
