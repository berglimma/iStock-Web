import { useCallback, useState, FormEvent } from 'react';
import { api } from '../api/client';
import type { Cliente } from '../types';
import { TituloTela, CartaoVidro, Badge, EstadoVazio } from '../components/UI';
import { useSyncRefresh } from '../hooks/useSyncRefresh';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState(false);

  const reload = useCallback(() => api.clientes.listar().then(setClientes), []);
  useSyncRefresh(reload);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await api.clientes.criar({
      nome, email, telefone, possuiWhatsApp: whatsapp,
      tiposNotificacao: [], ativo: true, data: new Date().toISOString(),
    });
    setNome(''); setEmail(''); setTelefone(''); setWhatsapp(false);
    setMostrarForm(false);
    reload();
  };

  return (
    <div>
      <div className="topbar">
        <TituloTela titulo="Clientes" subtitulo={`${clientes.length} cadastrados`} />
        <button className="btn-primario" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setMostrarForm(true)}>
          + Novo cliente
        </button>
      </div>

      {mostrarForm && (
        <div style={{ marginBottom: 20 }}>
          <CartaoVidro>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="campo-app"><input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
            <div className="form-grid-2">
              <div className="campo-app"><input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="campo-app"><input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
              Possui WhatsApp
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primario" style={{ width: 'auto' }}>Salvar</button>
              <button type="button" className="btn-secundario" onClick={() => setMostrarForm(false)}>Cancelar</button>
            </div>
          </form>
          </CartaoVidro>
        </div>
      )}

      {clientes.length === 0 ? (
        <EstadoVazio icone="👥" titulo="Nenhum cliente" mensagem="Cadastre clientes para vendas e notificações." />
      ) : (
        <div className="grid-clientes">
          {clientes.map((c) => (
            <article key={c.id} className="cliente-card">
              <header className="cliente-card__topo">
                <h4 className="cliente-card__nome">{c.nome}</h4>
                {c.possuiWhatsApp && <Badge texto="WhatsApp" cor="verde" />}
              </header>
              <div className="cliente-card__dados">
                {c.telefone && <p className="cliente-card__telefone">{c.telefone}</p>}
                {c.email && <p className="cliente-card__email">{c.email}</p>}
              </div>
              {c.tiposNotificacao?.length > 0 ? (
                <div className="cliente-card__tags">
                  {c.tiposNotificacao.map((t) => (
                    <span key={t} className="cliente-card__tag">{t}</span>
                  ))}
                </div>
              ) : (
                <p className="cliente-card__vazio">Sem preferências de notificação</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
