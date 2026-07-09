import { useState, FormEvent } from 'react';
import { api } from '../api/client';
import { TIPOS_PRODUTO } from '../types';
import { TituloTela, CartaoVidro } from '../components/UI';

export default function CadastroPage() {
  const [tipo, setTipo] = useState('iPhone');
  const [nome, setNome] = useState('');
  const [modelo, setModelo] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [cor, setCor] = useState('');
  const [serial, setSerial] = useState('');
  const [lacrado, setLacrado] = useState(false);
  const [condicao, setCondicao] = useState('85');
  const [custo, setCusto] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    try {
      await api.lancamentos.criar({
        nome: nome || modelo || tipo,
        tipoProduto: tipo as import('../types').TipoProduto,
        modelo, capacidade, cor, serial,
        lacrado, condicaoPercentual: lacrado ? undefined : Number(condicao),
        custoCompra: custo ? Number(custo) : undefined,
        valor: Number(valor),
        status: 'Disponível',
        data: new Date().toISOString(),
        observacoes: obs || undefined,
      });
      setSucesso(true);
      setNome(''); setModelo(''); setCapacidade(''); setCor(''); setSerial('');
      setCusto(''); setValor(''); setObs('');
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar');
    }
  };

  return (
    <div>
      <TituloTela titulo="Cadastrar" subtitulo="Adicionar produto ao inventário" />
      <CartaoVidro>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-grid-2">
            <div className="campo-app">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_PRODUTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="campo-app">
              <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="campo-app"><input placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
            <div className="campo-app"><input placeholder="Capacidade" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} /></div>
          </div>
          <div className="form-grid-2">
            <div className="campo-app"><input placeholder="Cor" value={cor} onChange={(e) => setCor(e.target.value)} /></div>
            <div className="campo-app"><input placeholder="Serial" value={serial} onChange={(e) => setSerial(e.target.value)} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={lacrado} onChange={(e) => setLacrado(e.target.checked)} />
            Produto lacrado
          </label>
          {!lacrado && (
            <div className="campo-app">
              <input type="number" min="0" max="100" placeholder="Condição %" value={condicao} onChange={(e) => setCondicao(e.target.value)} />
            </div>
          )}
          <div className="form-grid-2">
            <div className="campo-app"><input type="number" step="0.01" placeholder="Custo compra (R$)" value={custo} onChange={(e) => setCusto(e.target.value)} /></div>
            <div className="campo-app"><input type="number" step="0.01" placeholder="Valor venda (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required /></div>
          </div>
          <div className="campo-app">
            <textarea placeholder="Observações" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', width: '100%', resize: 'vertical' }} />
          </div>
          {erro && <p style={{ color: '#ff3b30', fontSize: '0.85rem' }}>{erro}</p>}
          {sucesso && <p style={{ color: '#34c759', fontSize: '0.85rem' }}>Produto cadastrado com sucesso!</p>}
          <button type="submit" className="btn-primario">Cadastrar produto</button>
        </form>
      </CartaoVidro>
    </div>
  );
}
