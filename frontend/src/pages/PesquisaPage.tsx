import { useEffect, useState, type ReactNode } from 'react';
import {
  Search, Smartphone, Hash, AlertTriangle,
  Monitor, Watch, Tablet, Laptop, Headphones, Tv, Mouse, Music, Package,
} from 'lucide-react';
import { api } from '../api/client';
import { TIPOS_PRODUTO, type ProblemaModelo, type TipoProduto } from '../types';
import { TituloTela, CartaoVidro, CampoApp, EstadoVazio, Badge } from '../components/UI';

const ICONES_TIPO: Record<TipoProduto, ReactNode> = {
  iPhone: <Smartphone size={14} />,
  iMac: <Monitor size={14} />,
  Watch: <Watch size={14} />,
  iPad: <Tablet size={14} />,
  'Apple Watch': <Watch size={14} />,
  MacBook: <Laptop size={14} />,
  AirPods: <Headphones size={14} />,
  'Apple TV': <Tv size={14} />,
  'Magic Mouse': <Mouse size={14} />,
  iPod: <Music size={14} />,
  Outro: <Package size={14} />,
};

const ICONES_RESULTADO: Record<string, ReactNode> = {
  iPhone: <Smartphone size={22} color="#73b8ff" />,
  iMac: <Monitor size={22} color="#73b8ff" />,
  Watch: <Watch size={22} color="#73b8ff" />,
  iPad: <Tablet size={22} color="#73b8ff" />,
  'Apple Watch': <Watch size={22} color="#73b8ff" />,
  MacBook: <Laptop size={22} color="#73b8ff" />,
  AirPods: <Headphones size={22} color="#73b8ff" />,
  'Apple TV': <Tv size={22} color="#73b8ff" />,
  'Magic Mouse': <Mouse size={22} color="#73b8ff" />,
  iPod: <Music size={22} color="#73b8ff" />,
  Outro: <Package size={22} color="#73b8ff" />,
};

type ResultadoPesquisa = {
  modeloIdentificado: string | null;
  numeracaoIdentificada: string | null;
  tipoProduto: string;
  problemas: ProblemaModelo[];
  encontrouCorrespondencia: boolean;
};

function corGravidade(g: string): 'vermelho' | 'laranja' | 'azul' {
  if (g === 'Alto') return 'vermelho';
  if (g === 'Moderado') return 'laranja';
  return 'azul';
}

function corPonto(g: string) {
  if (g === 'Alto') return '#ff3b30';
  if (g === 'Moderado') return '#ff9500';
  return '#73b8ff';
}

export default function PesquisaPage() {
  const [tipo, setTipo] = useState<TipoProduto | null>(null);
  const [modelo, setModelo] = useState('');
  const [numeracao, setNumeracao] = useState('');
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoPesquisa | null>(null);
  const [pesquisou, setPesquisou] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api.defeitos.sugestoes().then(setSugestoes).catch(() => {});
  }, []);

  const podePesquisar =
    Boolean(modelo.trim()) || Boolean(numeracao.trim());

  const executarPesquisa = async (modeloOverride?: string) => {
    const modeloBusca = modeloOverride ?? modelo;
    if (!modeloBusca.trim() && !numeracao.trim()) return;
    if (modeloOverride) setModelo(modeloOverride);
    setCarregando(true);
    try {
      const r = await api.defeitos.pesquisar(
        tipo ?? undefined,
        modeloBusca,
        numeracao,
      ) as ResultadoPesquisa;
      setResultado(r);
      setPesquisou(true);
    } catch {
      setResultado(null);
      setPesquisou(true);
    } finally {
      setCarregando(false);
    }
  };

  const limpar = () => {
    setModelo('');
    setNumeracao('');
    setTipo(null);
    setResultado(null);
    setPesquisou(false);
  };

  const temResultado = Boolean(
    resultado && (resultado.encontrouCorrespondencia || resultado.problemas.length > 0),
  );

  return (
    <div className="pesquisa-page">
      <TituloTela
        titulo="Pesquisa de defeitos"
        subtitulo="Consulte falhas conhecidas por modelo ou numeração Axxxx"
      />

      <div className="pesquisa-stack">
        <CartaoVidro>
          <div className="form-grid pesquisa-busca">
            <div className="pesquisa-busca__titulo">
              <Search size={18} color="#73b8ff" />
              <h3>Buscar aparelho</h3>
            </div>
            <p className="pesquisa-ajuda">
              Informe o modelo comercial (ex: iPhone 14 Pro) e/ou a numeração do aparelho (ex: A2650),
              encontrada na caixa ou em Ajustes → Geral → Sobre.
            </p>

            <div className="pesquisa-tipo">
              <p className="pesquisa-tipo__label">Tipo de produto</p>
              <div className="pesquisa-tipo__lista">
                <button
                  type="button"
                  className={`pesquisa-tipo__chip ${tipo === null ? 'active' : ''}`}
                  onClick={() => setTipo(null)}
                >
                  Automático
                </button>
                {TIPOS_PRODUTO.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`pesquisa-tipo__chip ${tipo === t ? 'active' : ''}`}
                    onClick={() => setTipo(t)}
                  >
                    {ICONES_TIPO[t]}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <CampoApp
              icone={<Smartphone size={18} color="#73b8ff" />}
              placeholder="Modelo (ex: iPhone 14 Pro Max)"
              value={modelo}
              onChange={setModelo}
            />
            <CampoApp
              icone={<Hash size={18} color="#73b8ff" />}
              placeholder="Numeração / modelo Axxxx (ex: A2650)"
              value={numeracao}
              onChange={setNumeracao}
            />

            <div className="pesquisa-acoes">
              <button type="button" className="btn-secundario" onClick={limpar}>
                Limpar
              </button>
              <button
                type="button"
                className="btn-primario pesquisa-acoes__pesquisar"
                disabled={!podePesquisar || carregando}
                onClick={() => executarPesquisa()}
              >
                {carregando ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </div>
          </div>
        </CartaoVidro>

        {sugestoes.length > 0 && (
          <div className="pesquisa-sugestoes">
            <p className="pesquisa-sugestoes__titulo">Sugestões rápidas</p>
            <div className="pesquisa-sugestoes__lista">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="pesquisa-sugestoes__chip"
                  onClick={() => executarPesquisa(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {pesquisou && temResultado && resultado && (
          <CartaoVidro>
            <div className="pesquisa-resultado">
              <div className="pesquisa-resultado__topo">
                <div className="pesquisa-resultado__info">
                  {ICONES_RESULTADO[resultado.tipoProduto] ?? (
                    <Package size={22} color="#73b8ff" />
                  )}
                  <div>
                    <h3>{resultado.modeloIdentificado ?? 'Modelo não identificado'}</h3>
                    <div className="pesquisa-resultado__meta">
                      {resultado.tipoProduto && <span>{resultado.tipoProduto}</span>}
                      {resultado.numeracaoIdentificada && (
                        <span className="pesquisa-resultado__num">
                          Nº {resultado.numeracaoIdentificada}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  texto={`${resultado.problemas.length} alerta(s)`}
                  cor="laranja"
                />
              </div>

              <hr className="pesquisa-resultado__div" />

              <div className="pesquisa-problemas">
                <div className="pesquisa-problemas__titulo">
                  <AlertTriangle size={18} color="#ff9500" />
                  <h4>Falhas e defeitos conhecidos</h4>
                </div>
                <p className="pesquisa-problemas__ajuda">
                  Com base no modelo informado — verifique estes pontos na inspeção.
                </p>
                <div className="pesquisa-problemas__lista">
                  {resultado.problemas.map((p) => (
                    <div key={p.id} className="pesquisa-problema">
                      <span
                        className="pesquisa-problema__ponto"
                        style={{ background: corPonto(p.gravidade) }}
                      />
                      <div className="pesquisa-problema__corpo">
                        <div className="pesquisa-problema__linha">
                          <strong>{p.titulo}</strong>
                          <Badge texto={p.gravidade} cor={corGravidade(p.gravidade)} />
                        </div>
                        <p>{p.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CartaoVidro>
        )}

        {pesquisou && !temResultado && (
          <CartaoVidro>
            <EstadoVazio
              icone="❓"
              titulo="Nenhum resultado"
              mensagem="Não encontramos defeitos para os dados informados. Tente outro modelo ou a numeração Axxxx do aparelho."
            />
          </CartaoVidro>
        )}
      </div>
    </div>
  );
}
