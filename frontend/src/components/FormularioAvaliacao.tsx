import { useRef } from 'react';
import {
  TIPOS_PRODUTO, TIPOS_COM_BATERIA, TIPOS_COM_CAPACIDADE,
  type TipoProduto,
} from '../types';

export interface DadosAvaliacaoForm {
  tipoProduto: TipoProduto;
  nome: string;
  modelo: string;
  capacidade: string;
  cor: string;
  telefone: string;
  serial: string;
  lacrado: boolean;
  condicaoPercentual: number;
  observacoes: string;
}

export const dadosAvaliacaoVazio = (): DadosAvaliacaoForm => ({
  tipoProduto: 'iPhone',
  nome: '',
  modelo: '',
  capacidade: '',
  cor: '',
  telefone: '',
  serial: '',
  lacrado: false,
  condicaoPercentual: 85,
  observacoes: '',
});

interface Props {
  dados: DadosAvaliacaoForm;
  onChange: (d: DadosAvaliacaoForm) => void;
  fotos: File[];
  onFotosChange: (f: File[]) => void;
}

export function FormularioAvaliacao({ dados, onChange, fotos, onFotosChange }: Props) {
  const inputFoto = useRef<HTMLInputElement>(null);
  const set = <K extends keyof DadosAvaliacaoForm>(k: K, v: DadosAvaliacaoForm[K]) =>
    onChange({ ...dados, [k]: v });

  const previews = fotos.map((f) => URL.createObjectURL(f));

  const adicionarFotos = (files: FileList | null) => {
    if (!files?.length) return;
    onFotosChange([...fotos, ...Array.from(files)]);
  };

  const removerFoto = (i: number) => {
    onFotosChange(fotos.filter((_, idx) => idx !== i));
  };

  return (
    <div className="form-grid">
      <div className="tipo-produto-grid">
        {TIPOS_PRODUTO.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${dados.tipoProduto === t ? 'active' : ''}`}
            onClick={() => set('tipoProduto', t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="form-grid-2">
        <div className="campo-app">
          <input placeholder="Nome / descrição *" value={dados.nome} onChange={(e) => set('nome', e.target.value)} />
        </div>
        <div className="campo-app">
          <input placeholder="Modelo (ex: iPhone 15 Pro)" value={dados.modelo} onChange={(e) => set('modelo', e.target.value)} />
        </div>
      </div>

      <div className="form-grid-2">
        {TIPOS_COM_CAPACIDADE.includes(dados.tipoProduto) && (
          <div className="campo-app">
            <input placeholder="Capacidade (ex: 256GB)" value={dados.capacidade} onChange={(e) => set('capacidade', e.target.value)} />
          </div>
        )}
        <div className="campo-app">
          <input placeholder="Cor" value={dados.cor} onChange={(e) => set('cor', e.target.value)} />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="campo-app">
          <input placeholder="Contato telefônico *" value={dados.telefone} onChange={(e) => set('telefone', e.target.value)} />
        </div>
        <div className="campo-app">
          <input placeholder="Nº serial / IMEI" value={dados.serial} onChange={(e) => set('serial', e.target.value)} />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={dados.lacrado} onChange={(e) => set('lacrado', e.target.checked)} />
        Lacrado (novo)
      </label>

      {!dados.lacrado && TIPOS_COM_BATERIA.includes(dados.tipoProduto) && (
        <div>
          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
            Saúde da bateria: {dados.condicaoPercentual}%
          </label>
          <input
            type="range" min={1} max={100} value={dados.condicaoPercentual}
            onChange={(e) => set('condicaoPercentual', Number(e.target.value))}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
      )}

      <div className="campo-app">
        <textarea
          placeholder="Observações"
          value={dados.observacoes}
          onChange={(e) => set('observacoes', e.target.value)}
          rows={3}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'white', width: '100%', resize: 'vertical' }}
        />
      </div>

      <div>
        <h4 style={{ marginBottom: 4 }}>Fotos do dispositivo</h4>
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
          Adicione ao menos uma foto do aparelho.
        </p>
        <div className="fotos-grid">
          {previews.map((src, i) => (
            <div key={i} className="foto-thumb">
              <img src={src} alt="" />
              <button type="button" className="foto-remover" onClick={() => removerFoto(i)} aria-label="Remover foto">×</button>
            </div>
          ))}
          <button type="button" className="foto-add" onClick={() => inputFoto.current?.click()}>
            <span>+</span>
            <span>Foto</span>
          </button>
        </div>
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { adicionarFotos(e.target.files); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

export function podeSalvarAvaliacao(dados: DadosAvaliacaoForm, fotos: File[]) {
  return Boolean(dados.nome.trim() && dados.telefone.trim() && fotos.length > 0);
}
