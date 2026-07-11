import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, Plus, Settings2, Sparkles, ArrowLeft } from 'lucide-react';
import { api, dataCompleta } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ASSISTENTE_MODOS,
  modosAssistenteParaPapel,
  type CriteriosAssistente,
  type MensagemAssistente,
  type ModoAssistente,
  type SessaoAssistente,
} from '../types';
import { TituloTela, CartaoVidro } from '../components/UI';
import { FormatarRespostaIA } from '../components/FormatarRespostaIA';

const SUGESTOES: Record<ModoAssistente, string[]> = {
  negociacao: [
    'Cliente quer pagar R$ 3.900 no iPhone 14 Pro',
    'Troca iPhone 13 por iPhone 15 Pro — quanto cobrar de diferença?',
    'Cliente pediu 10% de desconto à vista',
  ],
  'consultor-vendas': [
    'Cliente busca iPhone com boa câmera até R$ 5.000',
    'O que temos em estoque de MacBook para estudante?',
    'Compare iPhone 14 Pro e 15 Pro para o cliente',
  ],
  'consultor-tecnico': [
    'iPhone 13 aquecendo após atualização',
    'MacBook Pro teclado butterfly travando',
    'AirPods Pro com chiado no ANC — o que verificar?',
  ],
};

function rotuloTom(tom: CriteriosAssistente['tomAtendimento']): string {
  const map = { consultivo: 'Consultivo', assertivo: 'Assertivo', tecnico: 'Técnico' };
  return map[tom];
}

function rotuloFlex(flex: CriteriosAssistente['flexibilidadePreco']): string {
  const map = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  return map[flex];
}

export default function AssistentePage() {
  const { usuario } = useAuth();
  const papel = usuario!.papel;
  const ehCliente = papel === 'Cliente';
  const modosDisponiveis = modosAssistenteParaPapel(papel);

  const [view, setView] = useState<'hub' | 'chat' | 'criterios'>('hub');
  const [modoAtivo, setModoAtivo] = useState<ModoAssistente | null>(null);
  const [sessoes, setSessoes] = useState<SessaoAssistente[]>([]);
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoAssistente | null>(null);
  const [mensagens, setMensagens] = useState<MensagemAssistente[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [criterios, setCriterios] = useState<CriteriosAssistente | null>(null);
  const [salvandoCriterios, setSalvandoCriterios] = useState(false);
  const corpoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ehCliente) return;
    api.assistente.criterios().then((r) => setCriterios(r.criterios)).catch(() => {});
  }, [ehCliente]);

  useEffect(() => {
    corpoRef.current?.scrollTo({ top: corpoRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens, enviando]);

  const carregarSessoes = async (modo: ModoAssistente) => {
    const lista = await api.assistente.sessoes(modo);
    setSessoes(lista);
  };

  const abrirModo = async (modo: ModoAssistente) => {
    if (!modosDisponiveis.includes(modo)) return;
    setModoAtivo(modo);
    setView('chat');
    await carregarSessoes(modo);
    setSessaoAtiva(null);
    setMensagens([]);
  };

  const novaSessao = async () => {
    if (!modoAtivo) return;
    const s = await api.assistente.criarSessao(modoAtivo);
    setSessaoAtiva(s);
    setMensagens(await api.assistente.mensagens(s.id));
    await carregarSessoes(modoAtivo);
  };

  const abrirSessao = async (s: SessaoAssistente) => {
    setSessaoAtiva(s);
    setMensagens(await api.assistente.mensagens(s.id));
  };

  const enviar = async (conteudo?: string) => {
    const msg = (conteudo ?? texto).trim();
    if (!msg || !sessaoAtiva || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const res = await api.assistente.enviar(sessaoAtiva.id, msg);
      setMensagens((prev) => [...prev, res.usuario, res.assistente]);
      if (modoAtivo) await carregarSessoes(modoAtivo);
    } finally {
      setEnviando(false);
    }
  };

  const excluirSessao = async (id: string) => {
    await api.assistente.excluirSessao(id);
    if (sessaoAtiva?.id === id) {
      setSessaoAtiva(null);
      setMensagens([]);
    }
    if (modoAtivo) await carregarSessoes(modoAtivo);
  };

  const salvarCriterios = async () => {
    if (!criterios || ehCliente) return;
    setSalvandoCriterios(true);
    try {
      const res = await api.assistente.salvarCriterios(criterios);
      setCriterios(res.criterios);
      setView('hub');
    } finally {
      setSalvandoCriterios(false);
    }
  };

  if (view === 'criterios' && criterios && !ehCliente) {
    return (
      <div>
        <TituloTela
          titulo="Critérios da loja"
          subtitulo="O assistente usa estas regras em todas as conversas de negociação e consultoria"
        />
        <CartaoVidro className="criterios-form">
          <div className="form-grid-2">
            <label className="campo-label">
              Margem mínima (%)
              <input type="number" min={5} max={50} value={criterios.margemMinimaPercentual}
                onChange={(e) => setCriterios({ ...criterios, margemMinimaPercentual: Number(e.target.value) })} />
            </label>
            <label className="campo-label">
              Desconto máximo (%)
              <input type="number" min={0} max={25} value={criterios.descontoMaximoPercentual}
                onChange={(e) => setCriterios({ ...criterios, descontoMaximoPercentual: Number(e.target.value) })} />
            </label>
            <label className="campo-label">
              Margem mínima em R$
              <input type="number" min={50} step={50} value={criterios.valorMinimoMargem}
                onChange={(e) => setCriterios({ ...criterios, valorMinimoMargem: Number(e.target.value) })} />
            </label>
            <label className="campo-label">
              Tom de atendimento
              <select value={criterios.tomAtendimento}
                onChange={(e) => setCriterios({ ...criterios, tomAtendimento: e.target.value as CriteriosAssistente['tomAtendimento'] })}>
                <option value="consultivo">Consultivo</option>
                <option value="assertivo">Assertivo</option>
                <option value="tecnico">Técnico</option>
              </select>
            </label>
            <label className="campo-label">
              Flexibilidade de preço
              <select value={criterios.flexibilidadePreco}
                onChange={(e) => setCriterios({ ...criterios, flexibilidadePreco: e.target.value as CriteriosAssistente['flexibilidadePreco'] })}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </label>
          </div>
          <label className="campo-label" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={criterios.aceitarTroca}
              onChange={(e) => setCriterios({ ...criterios, aceitarTroca: e.target.checked })} />
            {' '}Aceitar troca / permuta
          </label>
          <label className="campo-label" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={criterios.priorizarLacrado}
              onChange={(e) => setCriterios({ ...criterios, priorizarLacrado: e.target.checked })} />
            {' '}Priorizar produtos lacrados nas sugestões
          </label>
          <label className="campo-label" style={{ marginTop: 12 }}>
            Notas da loja (políticas, garantia, diferenciais)
            <textarea rows={3} value={criterios.notasPersonalizadas}
              onChange={(e) => setCriterios({ ...criterios, notasPersonalizadas: e.target.value })}
              placeholder="Ex.: Garantia de 90 dias, aceitamos PIX com 3% de desconto..." />
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn-primario" style={{ width: 'auto' }} onClick={salvarCriterios} disabled={salvandoCriterios}>
              Salvar critérios
            </button>
            <button className="btn-secundario" style={{ width: 'auto' }} onClick={() => setView('hub')}>Cancelar</button>
          </div>
        </CartaoVidro>
      </div>
    );
  }

  if (view === 'chat' && modoAtivo) {
    const modoInfo = ASSISTENTE_MODOS.find((m) => m.id === modoAtivo)!;
    return (
      <div>
        <div className="assistente-topbar">
          <button className="btn-secundario" style={{ width: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}
            onClick={() => { setView('hub'); setModoAtivo(null); }}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>{modoInfo.titulo}</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{modoInfo.descricao}</p>
          </div>
          <button className="btn-secundario" style={{ width: 'auto' }} onClick={novaSessao}>
            <Plus size={16} /> Nova conversa
          </button>
        </div>

        <div className="chat-layout assistente-layout">
          <div className="chat-lista">
            {sessoes.length === 0 ? (
              <p style={{ padding: 16, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                Nenhuma conversa. Clique em &quot;Nova conversa&quot;.
              </p>
            ) : sessoes.map((s) => (
              <div key={s.id} className={`chat-item ${sessaoAtiva?.id === s.id ? 'active' : ''}`}
                onClick={() => abrirSessao(s)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: '0.85rem' }}>{s.titulo}</strong>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); excluirSessao(s.id); }} title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {dataCompleta(s.atualizadoEm)}
                </p>
              </div>
            ))}
          </div>

          {sessaoAtiva ? (
            <div className="chat-mensagens cartao-vidro" style={{ padding: 0 }}>
              <div className="chat-corpo" ref={corpoRef}>
                {mensagens.map((m) => (
                  <div key={m.id} className={`msg-bubble ${m.papel === 'usuario' ? 'propria' : 'ia'}`}>
                    {m.papel === 'assistente' && (
                      <div className="ia-badge"><Sparkles size={12} /> Assistente iStock</div>
                    )}
                    {m.papel === 'assistente' ? (
                      <FormatarRespostaIA texto={m.conteudo} />
                    ) : (
                      m.conteudo
                    )}
                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: 6 }}>{dataCompleta(m.data)}</div>
                  </div>
                ))}
                {enviando && (
                  <div className="msg-bubble ia ia-pensando">
                    <div className="ia-badge"><Sparkles size={12} /> Assistente iStock</div>
                    <span className="ia-pensando__texto">Assistente pensando…</span>
                  </div>
                )}
              </div>

              <div className="ia-sugestoes">
                {SUGESTOES[modoAtivo].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="ia-chip"
                    disabled={enviando}
                    onClick={() => enviar(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="chat-input-row">
                <input className="campo-app" style={{ flex: 1 }} placeholder="Descreva a situação..."
                  value={texto} onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
                  disabled={enviando} />
                <button className="btn-primario" style={{ width: 'auto', padding: '10px 16px' }}
                  onClick={() => enviar()} disabled={enviando}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="estado-vazio" style={{ alignSelf: 'center' }}>
              <Sparkles size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
              <p>Inicie uma nova conversa para usar o assistente</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const modosHub = ASSISTENTE_MODOS.filter((m) => modosDisponiveis.includes(m.id));
  const subtituloHub = ehCliente
    ? 'Tire dúvidas técnicas sobre produtos Apple'
    : 'Consultor Apple e negociação com critérios da sua loja';

  return (
    <div>
      <div className="assistente-header">
        <div className="assistente-brand">
          <img src="/logo.png" alt="" className="assistente-brand__logo" />
          <div>
            <p className="assistente-brand__nome">iStock</p>
            <TituloTela titulo="Assistente de IA" subtitulo={subtituloHub} />
          </div>
        </div>
        {!ehCliente && (
          <button className="btn-secundario" style={{ width: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}
            onClick={() => setView('criterios')}>
            <Settings2 size={16} /> Critérios da loja
          </button>
        )}
      </div>

      <div className="assistente-grid">
        {modosHub.map((modo) => (
          <button key={modo.id} className="assistente-card" onClick={() => abrirModo(modo.id)}
            style={{ '--cor-modo': modo.cor } as React.CSSProperties}>
            <span className="assistente-card__icone">{modo.icone}</span>
            <h3>{modo.titulo}</h3>
            <p>{modo.descricao}</p>
            <span className="assistente-card__cta">Abrir assistente →</span>
          </button>
        ))}
      </div>

      {!ehCliente && criterios && (
        <CartaoVidro className="assistente-resumo-criterios">
          <strong>Critérios ativos da loja</strong>
          <ul className="assistente-resumo-lista">
            <li>Margem mínima: {criterios.margemMinimaPercentual}% · R$ {criterios.valorMinimoMargem}</li>
            <li>Desconto máximo: {criterios.descontoMaximoPercentual}%</li>
            <li>Tom: {rotuloTom(criterios.tomAtendimento)} · Flexibilidade: {rotuloFlex(criterios.flexibilidadePreco)}</li>
            <li>
              Troca: {criterios.aceitarTroca ? 'sim' : 'não'} · Priorizar lacrado:{' '}
              {criterios.priorizarLacrado ? 'sim' : 'não'}
            </li>
          </ul>
          {criterios.notasPersonalizadas.trim() && (
            <p className="assistente-resumo-notas">{criterios.notasPersonalizadas}</p>
          )}
        </CartaoVidro>
      )}
    </div>
  );
}
