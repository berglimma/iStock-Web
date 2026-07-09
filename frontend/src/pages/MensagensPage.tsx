import { useEffect, useState } from 'react';
import { api, dataCompleta } from '../api/client';
import type { Conversa, Mensagem } from '../types';
import { TituloTela, EstadoVazio } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function MensagensPage() {
  const { usuario } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [ativa, setAtiva] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');

  useEffect(() => { api.chat.conversas().then(setConversas); }, []);

  const abrir = async (c: Conversa) => {
    setAtiva(c);
    setMensagens(await api.chat.mensagens(c.id!));
  };

  const enviar = async () => {
    if (!ativa || !texto.trim()) return;
    await api.chat.enviar(ativa.id!, texto);
    setTexto('');
    setMensagens(await api.chat.mensagens(ativa.id!));
  };

  return (
    <div>
      <TituloTela titulo="Mensagens" subtitulo="Conversas com clientes" />
      <div className="chat-layout">
        <div className="chat-lista">
          {conversas.length === 0 ? (
            <EstadoVazio icone="💬" titulo="Sem conversas" mensagem="Inicie uma conversa a partir de um cliente." />
          ) : conversas.map((c) => (
            <div key={c.id} className={`chat-item ${ativa?.id === c.id ? 'active' : ''}`} onClick={() => abrir(c)}>
              <strong>{c.clienteNome}</strong>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {c.ultimaMensagem || 'Sem mensagens'}
              </p>
            </div>
          ))}
        </div>

        {ativa ? (
          <div className="chat-mensagens cartao-vidro" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <strong>{ativa.clienteNome}</strong>
            </div>
            <div className="chat-corpo">
              {mensagens.map((m) => (
                <div key={m.id} className={`msg-bubble ${m.remetenteId === usuario!.id ? 'propria' : 'outra'}`}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: 4 }}>{m.remetenteNome}</div>
                  {m.texto}
                  <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: 4 }}>{dataCompleta(m.data)}</div>
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input className="campo-app" style={{ flex: 1 }} placeholder="Digite uma mensagem..."
                value={texto} onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()} />
              <button className="btn-primario" style={{ width: 'auto', padding: '10px 20px' }} onClick={enviar}>Enviar</button>
            </div>
          </div>
        ) : (
          <div className="estado-vazio" style={{ alignSelf: 'center' }}>
            <p>Selecione uma conversa</p>
          </div>
        )}
      </div>
    </div>
  );
}
