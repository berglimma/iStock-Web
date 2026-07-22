import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Plus, Search, Send } from 'lucide-react';
import { api, dataCompleta, dataCurta } from '../api/client';
import type { Cliente, Conversa, Mensagem } from '../types';
import { TituloTela, EstadoVazio, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useSyncRefresh } from '../hooks/useSyncRefresh';

type View = 'lista' | 'novo' | 'chat';

export default function MensagensPage() {
  const { usuario } = useAuth();
  const [view, setView] = useState<View>('lista');
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ativa, setAtiva] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [retencaoDias, setRetencaoDias] = useState(30);
  const [texto, setTexto] = useState('');
  const [buscaContato, setBuscaContato] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const corpoRef = useRef<HTMLDivElement>(null);

  const carregarConversas = useCallback(() => {
    api.chat.conversas().then(setConversas).catch(() => setConversas([]));
  }, []);

  useSyncRefresh(carregarConversas);

  useEffect(() => {
    corpoRef.current?.scrollTo({ top: corpoRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens]);

  const abrir = async (c: Conversa) => {
    setErro('');
    setAtiva(c);
    setView('chat');
    const r = await api.chat.mensagens(c.id!);
    setMensagens(r.mensagens);
    setRetencaoDias(r.retencaoDias);
  };

  const voltarLista = () => {
    setView('lista');
    setAtiva(null);
    setMensagens([]);
    setTexto('');
    carregarConversas();
  };

  const abrirNovo = async () => {
    setErro('');
    setBuscaContato('');
    setView('novo');
    try {
      setClientes(await api.clientes.listar());
    } catch {
      setClientes([]);
      setErro('Não foi possível carregar os contatos.');
    }
  };

  const iniciarComContato = async (cliente: Cliente) => {
    if (!cliente.id) return;
    setErro('');
    try {
      const conversa = await api.chat.criarConversa(cliente.id, cliente.nome);
      carregarConversas();
      await abrir(conversa);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível iniciar a conversa.');
    }
  };

  const enviar = async () => {
    if (!ativa?.id || !texto.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      await api.chat.enviar(ativa.id, texto.trim());
      setTexto('');
      const r = await api.chat.mensagens(ativa.id);
      setMensagens(r.mensagens);
      carregarConversas();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const contatosFiltrados = clientes
    .filter((c) => {
      if (!buscaContato.trim()) return true;
      const t = buscaContato.toLowerCase();
      return [c.nome, c.email, c.telefone].some((v) => v?.toLowerCase().includes(t));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (view === 'novo') {
    return (
      <div>
        <div className="mensagens-topbar">
          <button type="button" className="btn-secundario" onClick={voltarLista} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <TituloTela titulo="Nova conversa" subtitulo="Selecione um contato para iniciar" />
        </div>

        <div className="campo-app" style={{ marginBottom: 16 }}>
          <Search size={16} color="#73b8ff" />
          <input
            placeholder="Buscar contato..."
            value={buscaContato}
            onChange={(e) => setBuscaContato(e.target.value)}
            autoFocus
          />
        </div>

        {erro && <p className="erro-msg">{erro}</p>}

        {contatosFiltrados.length === 0 ? (
          <EstadoVazio icone="👥" titulo="Nenhum contato" mensagem="Cadastre clientes na aba Clientes para conversar." />
        ) : (
          <div className="grid-contatos-msg">
            {contatosFiltrados.map((c) => (
              <button key={c.id} type="button" className="contato-msg-card" onClick={() => iniciarComContato(c)}>
                <span className="contato-msg-card__avatar">{iniciais(c.nome)}</span>
                <span className="contato-msg-card__corpo">
                  <strong>{c.nome}</strong>
                  <span className="contato-msg-card__meta">
                    {[c.telefone, c.email].filter(Boolean).join(' · ') || 'Sem telefone/e-mail'}
                  </span>
                </span>
                {c.possuiWhatsApp && <Badge texto="WhatsApp" cor="verde" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'chat' && ativa) {
    return (
      <div className="imessage-dock">
        <div className="imessage-shell">
          <div className="imessage-header">
            <button type="button" className="btn-secundario" onClick={voltarLista} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <ArrowLeft size={16} /> Conversas
            </button>
            <div className="imessage-header__info">
              <strong>{ativa.clienteNome}</strong>
              <span>Histórico guardado por {retencaoDias} dias</span>
            </div>
          </div>

          <div className="imessage-corpo" ref={corpoRef}>
            {mensagens.length === 0 ? (
              <p className="imessage-vazio">Nenhuma mensagem ainda. Digite abaixo para começar.</p>
            ) : (
              mensagens.map((m) => {
                const minha = m.remetenteId === usuario!.id;
                return (
                  <div key={m.id} className={`imessage-bubble ${minha ? 'minha' : 'outra'}`}>
                    {!minha && <span className="imessage-bubble__nome">{m.remetenteNome}</span>}
                    <p>{m.texto || (m.tipo === 'foto' ? '📷 Foto' : m.tipo === 'audio' ? '🎤 Áudio' : '')}</p>
                    <time>{horaMsg(m.data)}</time>
                  </div>
                );
              })
            )}
          </div>

          {erro && <p className="erro-msg" style={{ margin: '0 16px 8px' }}>{erro}</p>}

          <div className="imessage-input">
            <input
              placeholder="iMessage"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
            />
            <button
              type="button"
              className="imessage-send"
              disabled={!texto.trim() || enviando}
              onClick={enviar}
              aria-label="Enviar"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mensagens-topbar">
        <TituloTela
          titulo="Mensagens"
          subtitulo={`${conversas.length} conversa${conversas.length === 1 ? '' : 's'} · histórico ${retencaoDias} dias`}
        />
        <button
          type="button"
          className="btn-primario"
          style={{ width: 'auto', padding: '10px 18px', display: 'inline-flex', gap: 8, alignItems: 'center' }}
          onClick={abrirNovo}
        >
          <Plus size={16} /> Nova conversa
        </button>
      </div>

      {conversas.length === 0 ? (
        <EstadoVazio
          icone="💬"
          titulo="Nenhuma conversa"
          mensagem="Toque em Nova conversa, escolha um contato e comece a falar como no iMessage."
        />
      ) : (
        <div className="grid-conversas-msg">
          {conversas.map((c) => (
            <button key={c.id} type="button" className="conversa-msg-card" onClick={() => abrir(c)}>
              <span className="conversa-msg-card__avatar">{iniciais(c.clienteNome)}</span>
              <span className="conversa-msg-card__corpo">
                <span className="conversa-msg-card__topo">
                  <strong>{c.clienteNome}</strong>
                  {c.ultimaMensagemData && (
                    <time>{dataCurta(c.ultimaMensagemData)}</time>
                  )}
                </span>
                <span className="conversa-msg-card__preview">
                  {c.ultimaMensagem || 'Toque para abrir a conversa'}
                </span>
              </span>
              <MessageCircle size={18} className="conversa-msg-card__icone" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0] ?? ''}${partes[partes.length - 1]![0] ?? ''}`.toUpperCase();
}

function horaMsg(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dataCompleta(iso);
  }
}
