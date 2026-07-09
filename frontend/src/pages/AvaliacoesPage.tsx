import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, brl, dataCurta } from '../api/client';
import type { Avaliacao, StatusAvaliacao } from '../types';
import { STATUS_AVALIACAO } from '../types';
import { TituloTela, Badge, EstadoVazio } from '../components/UI';
import { NovaAvaliacaoModal } from '../components/NovaAvaliacaoModal';
import { DetalheAvaliacaoModal } from '../components/DetalheAvaliacaoModal';
import { useSyncRefresh } from '../hooks/useSyncRefresh';

const statusCor = (s: string) => {
  if (s === 'Em avaliação') return 'laranja';
  if (s === 'Aprovado') return 'verde';
  if (s === 'Compra recusada') return 'vermelho';
  if (s === 'No estoque') return 'mint';
  return 'azul';
};

export default function AvaliacoesPage() {
  const [items, setItems] = useState<Avaliacao[]>([]);
  const [filtro, setFiltro] = useState<StatusAvaliacao | null>(null);
  const [sel, setSel] = useState<Avaliacao | null>(null);
  const [mostrarNova, setMostrarNova] = useState(false);

  const reload = useCallback(() => api.avaliacoes.listar().then(setItems), []);
  useSyncRefresh(reload);

  const lista = useMemo(() => {
    const base = filtro ? items.filter((a) => a.status === filtro) : items;
    return [...base].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [items, filtro]);

  const emAvaliacao = items.filter((a) => a.status === 'Em avaliação').length;
  const aprovadas = items.filter((a) => a.status === 'Aprovado').length;
  const recusadas = items.filter((a) => a.status === 'Compra recusada').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <TituloTela
          titulo="Avaliações"
          subtitulo={`${emAvaliacao} em análise · ${aprovadas} aprovadas · ${recusadas} recusadas`}
        />
        <button className="btn-primario btn-nova" onClick={() => setMostrarNova(true)}>
          <Plus size={18} />
          Nova
        </button>
      </div>

      <div className="filtros-row" style={{ marginBottom: 20 }}>
        <button className={`chip ${filtro === null ? 'active' : ''}`} onClick={() => setFiltro(null)}>Todas</button>
        {STATUS_AVALIACAO.map((s) => (
          <button key={s} className={`chip ${filtro === s ? 'active' : ''}`} onClick={() => setFiltro(s)}>
            {s}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          icone="⏱"
          titulo="Nenhuma avaliação"
          mensagem="Cadastre um dispositivo com fotos para iniciar a avaliação."
        />
      ) : (
        <div className="grid-produtos">
          {lista.map((a) => (
            <div key={a.id} className="produto-card" onClick={() => setSel(a)}>
              {a.fotos?.[0] && (
                <div className="card-foto-preview">
                  <img src={a.fotos[0].url} alt="" />
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <Badge texto={a.status} cor={statusCor(a.status)} />
                {a.status === 'Aprovado' && (
                  <Badge texto={a.pagamentoAprovado ? 'Pago' : 'Pgto pendente'} cor={a.pagamentoAprovado ? 'mint' : 'laranja'} />
                )}
              </div>
              <h4>{a.modelo || a.nome}</h4>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                {[a.tipoProduto, a.capacidade, a.cor].filter(Boolean).join(' · ')}
              </p>
              {a.valorEstimado != null && a.status !== 'Em avaliação' && (
                <p style={{ color: '#73b8ff', fontWeight: 700, marginTop: 8 }}>{brl(a.valorEstimado)}</p>
              )}
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{dataCurta(a.data)}</p>
            </div>
          ))}
        </div>
      )}

      {mostrarNova && (
        <NovaAvaliacaoModal onClose={() => setMostrarNova(false)} onSalvo={reload} />
      )}

      {sel && (
        <DetalheAvaliacaoModal
          avaliacao={sel}
          onClose={() => setSel(null)}
          onAtualizado={reload}
        />
      )}
    </div>
  );
}
