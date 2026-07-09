import { ReactNode } from 'react';

export function FundoTecnologico() {
  return <div className="fundo-tecnologico" aria-hidden />;
}

export function CartaoVidro({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cartao-vidro ${className}`}>{children}</div>;
}

export function CampoApp({
  icone,
  placeholder,
  value,
  onChange,
  type = 'text',
  as = 'input',
}: {
  icone?: ReactNode;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  as?: 'input' | 'textarea' | 'select';
  children?: ReactNode;
}) {
  return (
    <div className="campo-app">
      {icone}
      {as === 'textarea' ? (
        <textarea placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {placeholder && <option value="">{placeholder}</option>}
        </select>
      ) : (
        <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function Badge({ texto, cor = 'azul' }: { texto: string; cor?: 'azul' | 'verde' | 'laranja' | 'vermelho' | 'mint' }) {
  return <span className={`badge badge-${cor}`}>{texto}</span>;
}

export function EstadoVazio({ icone, titulo, mensagem }: { icone: string; titulo: string; mensagem: string }) {
  return (
    <div className="estado-vazio">
      <div style={{ fontSize: 44, opacity: 0.7 }}>{icone}</div>
      <h3>{titulo}</h3>
      <p>{mensagem}</p>
    </div>
  );
}

export function TituloTela({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="titulo-tela">
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
    </div>
  );
}

export function MetricaCard({ titulo, valor, cor }: { titulo: string; valor: string; cor?: string }) {
  return (
    <div className="metrica-card">
      <div className="label">{titulo}</div>
      <div className="valor" style={{ color: cor }}>{valor}</div>
    </div>
  );
}
