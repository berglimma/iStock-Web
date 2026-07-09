import { useState, useEffect, FormEvent } from 'react';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { PAPEIS } from '../types';
import { FundoTecnologico, CartaoVidro } from '../components/UI';
import { MacAppPromo } from '../components/MacAppPromo';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { RedefinirSenhaModal } from '../components/RedefinirSenhaModal';

export default function LoginPage() {
  const { login, loginGoogle, redefinirSenha, cadastro, firebaseAtivo } = useAuth();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [papel, setPapel] = useState('Consultor de vendas');
  const [adminOk, setAdminOk] = useState(true);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarRedefinirSenha, setMostrarRedefinirSenha] = useState(false);

  useEffect(() => {
    if (modoCadastro) api.adminDisponivel().then((r) => setAdminOk(r.disponivel)).catch(() => {});
  }, [modoCadastro]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (modoCadastro && senha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }
    setCarregando(true);
    try {
      if (modoCadastro) await cadastro(nome, email, senha, papel);
      else await login(email, senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao autenticar');
    } finally {
      setCarregando(false);
    }
  };

  const handleGoogle = async () => {
    setErro('');
    setCarregando(true);
    try {
      await loginGoogle();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar com Google');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <FundoTecnologico />
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <img src="/logo.png" alt="iStock" />
            <h1>iStock</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Gestão inteligente de inventário</p>
          </div>

          <CartaoVidro>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
              {modoCadastro ? 'Cadastre-se para acessar o sistema na nuvem' : 'Acesse sua conta na nuvem'}
            </p>

            {firebaseAtivo && !modoCadastro && (
              <>
                <GoogleLoginButton onClick={handleGoogle} disabled={carregando} />
                <div className="login-divisor">
                  <span>ou entre com e-mail</span>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="form-grid">
              {modoCadastro && (
                <div className="campo-app">
                  <User size={18} color="#73b8ff" />
                  <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
              )}
              <div className="campo-app">
                <Mail size={18} color="#73b8ff" />
                <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="campo-app">
                <Lock size={18} color="#73b8ff" />
                <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </div>
              {!modoCadastro && (
                <button
                  type="button"
                  className="login-esqueci-senha"
                  onClick={() => setMostrarRedefinirSenha(true)}
                  disabled={carregando}
                >
                  Esqueci minha senha
                </button>
              )}
              {modoCadastro && (
                <>
                  <div className="campo-app">
                    <Lock size={18} color="#73b8ff" />
                    <input type="password" placeholder="Confirmar senha" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>Perfil de acesso</p>
                    {PAPEIS.map((p) => {
                      const desabilitado = p.valor === 'Administrador' && !adminOk;
                      return (
                        <button
                          key={p.valor}
                          type="button"
                          disabled={desabilitado}
                          onClick={() => setPapel(p.valor)}
                          style={{
                            display: 'flex', width: '100%', gap: 12, padding: 12, marginBottom: 8,
                            background: papel === p.valor ? 'rgba(115,184,255,0.12)' : 'rgba(255,255,255,0.05)',
                            border: papel === p.valor ? '1px solid rgba(115,184,255,0.45)' : '1px solid transparent',
                            borderRadius: 12, cursor: desabilitado ? 'not-allowed' : 'pointer', textAlign: 'left',
                            opacity: desabilitado ? 0.4 : 1, color: 'white',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.rotulo}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{p.descricao}</div>
                          </div>
                        </button>
                      );
                    })}
                    {!adminOk && <p style={{ fontSize: '0.75rem', color: '#ff9500' }}>Limite de 4 administradores atingido.</p>}
                  </div>
                </>
              )}

              {erro && (
                <div className="erro-msg"><AlertCircle size={16} /> {erro}</div>
              )}

              <button type="submit" className="btn-primario" disabled={carregando}>
                {modoCadastro ? 'Criar conta' : 'Entrar'}
              </button>

              <button type="button" className="btn-secundario" onClick={() => { setModoCadastro(!modoCadastro); setErro(''); }}>
                {modoCadastro ? 'Já tenho conta' : 'Criar nova conta'}
              </button>
            </form>
          </CartaoVidro>

          <MacAppPromo />
        </div>
      </div>

      {mostrarRedefinirSenha && (
        <RedefinirSenhaModal
          modoNuvem={firebaseAtivo}
          onClose={() => setMostrarRedefinirSenha(false)}
          onEnviar={redefinirSenha}
        />
      )}
    </>
  );
}
