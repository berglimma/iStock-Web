import { FormEvent, useState } from 'react';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CartaoVidro } from './UI';

interface Props {
  onClose: () => void;
  onEnviar: (email: string) => Promise<void>;
  modoNuvem: boolean;
}

export function RedefinirSenhaModal({ onClose, onEnviar, modoNuvem }: Props) {
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (!email.trim().includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setCarregando(true);
    try {
      await onEnviar(email.trim());
      setSucesso(`Enviamos um link de redefinição para ${email.trim().toLowerCase()}. Verifique sua caixa de entrada.`);
      setTimeout(onClose, 2500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar o link.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <CartaoVidro>
          <h2 style={{ marginBottom: 8 }}>Redefinir senha</h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>
            {modoNuvem
              ? 'Enviaremos um link para o seu e-mail (mesmo fluxo do app iOS).'
              : 'Redefinição disponível apenas no modo nuvem (Firebase).'}
          </p>

          {modoNuvem ? (
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="campo-app">
                <Mail size={18} color="#73b8ff" />
                <input
                  type="email"
                  placeholder="E-mail da conta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {erro && (
                <div className="erro-msg"><AlertCircle size={16} /> {erro}</div>
              )}
              {sucesso && (
                <div className="sucesso-msg"><CheckCircle2 size={16} /> {sucesso}</div>
              )}

              <button type="submit" className="btn-primario" disabled={carregando}>
                {carregando ? 'Enviando...' : 'Enviar link'}
              </button>
              <button type="button" className="btn-secundario" onClick={onClose} disabled={carregando}>
                Cancelar
              </button>
            </form>
          ) : (
            <button type="button" className="btn-secundario" onClick={onClose}>
              Fechar
            </button>
          )}
        </CartaoVidro>
      </div>
    </div>
  );
}
