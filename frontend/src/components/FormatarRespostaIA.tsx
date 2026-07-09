function formatarLinha(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

export function FormatarRespostaIA({ texto }: { texto: string }) {
  return (
    <div className="ia-texto">
      {texto.split('\n').map((linha, i) => {
        if (!linha.trim()) return <br key={i} />;
        if (linha.startsWith('### ')) {
          return <h4 key={i} className="ia-titulo">{linha.slice(4)}</h4>;
        }
        if (linha.startsWith('• ')) {
          return <p key={i} className="ia-item">{formatarLinha(linha)}</p>;
        }
        return <p key={i}>{formatarLinha(linha)}</p>;
      })}
    </div>
  );
}
