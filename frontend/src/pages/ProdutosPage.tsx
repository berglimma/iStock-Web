import { useCallback, useState } from 'react';
import { api, brl, dataCurta } from '../api/client';
import type { Lancamento } from '../types';
import { TituloTela, Badge, EstadoVazio } from '../components/UI';
import { useSyncRefresh } from '../hooks/useSyncRefresh';
import { AlertCircle } from 'lucide-react';

type Filtro = 'todos' | 'Disponível' | 'Reservado' | 'Vendido' | 'parados';

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Lancamento[]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [selecionado, setSelecionado] = useState<Lancamento | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState('');

  const reload = useCallback(() => api.lancamentos.listar()
    .then((data) => { setProdutos(data); setErroCarregamento(''); })
    .catch((err) => setErroCarregamento(err instanceof Error ? err.message : 'Falha ao carregar produtos')),
  []);
  useSyncRefresh(reload);

  const filtrados = produtos
    .filter((p) => {
      if (filtro === 'parados') return p.estaHaMuitoTempoNoEstoque;
      if (filtro !== 'todos') return p.status === filtro;
      return true;
    })
    .filter((p) => {
      if (!busca) return true;
      const t = busca.toLowerCase();
      return [p.nome, p.modelo, p.serial, p.cor, p.tipoProduto].some((v) => v?.toLowerCase().includes(t));
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const statusCor = (s: string) => s === 'Disponível' ? 'verde' : s === 'Reservado' ? 'laranja' : 'azul';

  return (
    <div>
      <TituloTela
        titulo="Produtos"
        subtitulo={`${produtos.filter((p) => p.status !== 'Vendido').length} em estoque · ${produtos.filter((p) => p.status === 'Vendido').length} vendidos`}
      />

      {erroCarregamento && (
        <div className="erro-msg" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {erroCarregamento}
        </div>
      )}

      <div className="campo-app" style={{ marginBottom: 16 }}>
        <input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="filtros-row">
        {(['todos', 'Disponível', 'Reservado', 'Vendido', 'parados'] as Filtro[]).map((f) => (
          <button key={f} className={`chip ${filtro === f ? 'active' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'parados' ? 'Parados' : f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio icone="📦" titulo="Nenhum produto" mensagem="Cadastre seu primeiro produto na aba Cadastrar." />
      ) : (
        <div className="grid-produtos">
          {filtrados.map((p) => (
            <div key={p.id} className="produto-card" onClick={() => setSelecionado(p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Badge texto={p.tipoProduto} />
                <Badge texto={p.status} cor={statusCor(p.status)} />
              </div>
              <h4>{p.modelo || p.nome}</h4>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '4px 0' }}>
                {[p.capacidade, p.cor].filter(Boolean).join(' · ')}
              </p>
              <p style={{ fontWeight: 700, color: '#73b8ff', marginTop: 8 }}>{brl(p.valor)}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{dataCurta(p.data)}</p>
              {p.estaHaMuitoTempoNoEstoque && <Badge texto={`${p.diasNoEstoque}d parado`} cor="vermelho" />}
            </div>
          ))}
        </div>
      )}

      {selecionado && (
        <div className="modal-overlay" onClick={() => setSelecionado(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16 }}>{selecionado.modelo || selecionado.nome}</h2>
            <p><strong>Tipo:</strong> {selecionado.tipoProduto}</p>
            <p><strong>Valor:</strong> {brl(selecionado.valor)}</p>
            <p><strong>Status:</strong> {selecionado.status}</p>
            {selecionado.serial && <p><strong>Serial:</strong> {selecionado.serial}</p>}
            {selecionado.custoCompra && <p><strong>Custo:</strong> {brl(selecionado.custoCompra)}</p>}
            {selecionado.observacoes && <p><strong>Obs:</strong> {selecionado.observacoes}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {selecionado.status !== 'Vendido' && (
                <>
                  <button className="btn-primario" style={{ width: 'auto', padding: '10px 20px' }}
                    onClick={async () => {
                      await api.lancamentos.atualizar(selecionado.id!, { ...selecionado, status: 'Reservado' });
                      setProdutos(await api.lancamentos.listar());
                      setSelecionado(null);
                    }}>Reservar</button>
                  <button className="btn-primario" style={{ width: 'auto', padding: '10px 20px', background: '#34c759' }}
                    onClick={async () => {
                      await api.lancamentos.atualizar(selecionado.id!, {
                        ...selecionado, status: 'Vendido', dataVenda: new Date().toISOString(),
                      });
                      setProdutos(await api.lancamentos.listar());
                      setSelecionado(null);
                    }}>Vender</button>
                </>
              )}
              <button className="btn-secundario" onClick={() => setSelecionado(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
