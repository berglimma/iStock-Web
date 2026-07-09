import { useState } from 'react';
import { api } from '../api/client';
import { TIPOS_PRODUTO, type ProblemaModelo } from '../types';
import { TituloTela, CartaoVidro, Badge } from '../components/UI';

export default function PesquisaPage() {
  const [tipo, setTipo] = useState('iPhone');
  const [modelo, setModelo] = useState('');
  const [numeracao, setNumeracao] = useState('');
  const [resultado, setResultado] = useState<{
    modeloIdentificado: string | null;
    numeracaoIdentificada: string | null;
    tipoProduto: string;
    problemas: ProblemaModelo[];
    encontrouCorrespondencia: boolean;
  } | null>(null);

  const pesquisar = async () => {
    const r = await api.defeitos.pesquisar(tipo, modelo, numeracao);
    setResultado(r as typeof resultado);
  };

  const gravidadeCor = (g: string) => g === 'Alto' ? 'vermelho' : g === 'Moderado' ? 'laranja' : 'azul';

  return (
    <div>
      <TituloTela titulo="Pesquisa" subtitulo="Defeitos conhecidos por modelo Apple" />
      <CartaoVidro>
        <div className="form-grid">
          <div className="form-grid-2">
            <div className="campo-app">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_PRODUTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="campo-app">
              <input placeholder="Modelo (ex: iPhone 15 Pro)" value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
          </div>
          <div className="campo-app">
            <input placeholder="Numeração (ex: A2848)" value={numeracao} onChange={(e) => setNumeracao(e.target.value)} />
          </div>
          <button className="btn-primario" onClick={pesquisar}>Pesquisar defeitos</button>
        </div>
      </CartaoVidro>

      {resultado && (
        <div style={{ marginTop: 20 }}>
          {resultado.modeloIdentificado && (
            <p style={{ marginBottom: 8 }}>Modelo: <strong>{resultado.modeloIdentificado}</strong></p>
          )}
          {resultado.numeracaoIdentificada && (
            <p style={{ marginBottom: 16 }}>Numeração: <strong>{resultado.numeracaoIdentificada}</strong></p>
          )}
          <div className="form-grid">
            {resultado.problemas.map((p) => (
              <div key={p.id} className="item-vidro">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{p.titulo}</strong>
                  <Badge texto={p.gravidade} cor={gravidadeCor(p.gravidade)} />
                </div>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>{p.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
