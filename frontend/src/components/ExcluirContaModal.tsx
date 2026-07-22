import { FormEvent, useState } from 'react';
import { AlertCircle, Lock, Trash2 } from 'lucide-react';
import { CartaoVidro } from './UI';

interface Props {
  onClose: () => void;
  onConfirmar: (senha: string) => Promise<void>;
  exigeSenha?: boolean;
}

export function ExcluirContaModal({ onClose, onConfirmar, exigeSenha = true }: Props) {
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (exigeSenha && !senha.trim()) {
      setErro('Informe sua senha para confirmar.');
      return;
    }
    setCarregando(true);
    try {
      await onConfirmar(senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir a conta.');
      setCarregando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <CartaoVidro>
          <h2 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={20} color="#ff3b30" /> Excluir conta
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}>
            Esta ação é permanente. Seu perfil será removido da nuvem (Firebase Auth + Firestore) e não poderá ser desfeita.
          </p>
          <p style={{ fontSize: '0.8rem', color: '#ff9500', marginBottom: 20 }}>
            Confirme sua senha para sincronizar a exclusão com a nuvem.
          </p>

          <form onSubmit={handleSubmit} className="form-grid">
            {exigeSenha && (
              <div className="campo-app">
                <Lock size={18} color="#73b8ff" />
                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {erro && (
              <div className="erro-msg"><AlertCircle size={16} /> {erro}</div>
            )}

            <button
              type="submit"
              className="btn-primario"
              style={{ background: '#ff3b30' }}
              disabled={carregando || (exigeSenha && !senha.trim())}
            >
              {carregando ? 'Excluindo...' : 'Excluir permanentemente'}
            </button>
            <button type="button" className="btn-secundario" onClick={onClose} disabled={carregando}>
              Cancelar
            </button>
          </form>
        </CartaoVidro>
      </div>
    </div>
  );
}
