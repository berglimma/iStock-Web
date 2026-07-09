import { useEffect, useState } from 'react';
import { api, brl, dataCompleta, dataCurta } from '../api/client';
import type { Avaliacao, ProblemaModelo } from '../types';
import { Badge, CartaoVidro } from './UI';

const gravidadeCor = (g: string) =>
  g === 'Alto' ? 'vermelho' : g === 'Moderado' ? 'laranja' : 'azul';

interface Props {
  avaliacao: Avaliacao;
  onClose: () => void;
  onAtualizado: () => void;
}

export function DetalheAvaliacaoModal({ avaliacao, onClose, onAtualizado }: Props) {
  const [item, setItem] = useState(avaliacao);
  const [valorAjustado, setValorAjustado] = useState(String(avaliacao.valorEstimado ?? ''));
  const [valorReal, setValorReal] = useState(String(avaliacao.valorVendaReal ?? ''));
  const [problemas, setProblemas] = useState<ProblemaModelo[]>(avaliacao.problemasModelo ?? []);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  const [retNome, setRetNome] = useState('');
  const [retDoc, setRetDoc] = useState('');
  const [retObs, setRetObs] = useState('');
  const [retFoto, setRetFoto] = useState<File | null>(null);

  useEffect(() => {
    if (item.problemasModelo?.length) {
      setProblemas(item.problemasModelo);
    } else {
      api.defeitos.pesquisar(item.tipoProduto, item.modelo).then((r) =>
        setProblemas((r as { problemas: ProblemaModelo[] }).problemas),
      );
    }
  }, [item.id, item.tipoProduto, item.modelo, item.problemasModelo]);

  const run = async (fn: () => Promise<void>) => {
    setProcessando(true);
    setErro('');
    try {
      await fn();
      const lista = await api.avaliacoes.listar();
      const atual = lista.find((a) => a.id === item.id);
      if (atual) {
        setItem(atual);
        setValorAjustado(String(atual.valorEstimado ?? ''));
        setValorReal(String(atual.valorVendaReal ?? ''));
      }
      onAtualizado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro na operação');
    } finally {
      setProcessando(false);
    }
  };

  const titulo = item.modelo || item.nome;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-grande modal-scroll" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <h2>{titulo}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{item.tipoProduto}</p>
          </div>
          <Badge texto={item.status} cor={
            item.status === 'Em avaliação' ? 'laranja'
              : item.status === 'Aprovado' ? 'verde'
                : item.status === 'Compra recusada' ? 'vermelho'
                  : item.status === 'No estoque' ? 'mint' : 'azul'
          } />
        </div>

        {item.fotos?.length > 0 && (
          <div className="fotos-grid" style={{ marginBottom: 16 }}>
            {item.fotos.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="foto-thumb">
                <img src={f.url} alt="" />
              </a>
            ))}
          </div>
        )}

        <CartaoVidro className="info-bloco">
          <InfoLinha label="Modelo" valor={item.modelo} />
          <InfoLinha label="Capacidade" valor={item.capacidade} />
          <InfoLinha label="Cor" valor={item.cor} />
          <InfoLinha label="Serial" valor={item.serial} />
          <InfoLinha label="Contato" valor={item.telefone} />
          <InfoLinha label="Condição" valor={item.lacrado ? 'Lacrado' : `${item.condicaoPercentual ?? 0}%`} />
          <InfoLinha label="Cadastro" valor={dataCurta(item.data)} />
          {item.observacoes && (
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {item.observacoes}
            </p>
          )}
        </CartaoVidro>

        {problemas.length > 0 && (
          <CartaoVidro className="info-bloco">
            <h4 style={{ marginBottom: 10 }}>Problemas conhecidos do modelo</h4>
            {problemas.map((p) => (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{p.titulo}</strong>
                  <Badge texto={p.gravidade} cor={gravidadeCor(p.gravidade)} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{p.descricao}</p>
              </div>
            ))}
          </CartaoVidro>
        )}

        {item.status === 'Compra recusada' && item.justificativaRecusa && (
          <CartaoVidro className="info-bloco info-bloco-erro">
            <h4 style={{ color: '#ff6b6b' }}>Compra não aprovada</h4>
            {item.dataRecusa && <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{dataCompleta(item.dataRecusa)}</p>}
            <p style={{ marginTop: 8 }}>{item.justificativaRecusa}</p>
          </CartaoVidro>
        )}

        {item.status !== 'Em avaliação' && item.status !== 'Compra recusada' && (
          <CartaoVidro className="info-bloco">
            <h4 style={{ marginBottom: 12 }}>Prévia de valor</h4>
            <div className="form-grid-2">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Venda sugerida</span>
                {(item.status === 'Avaliado' || item.status === 'Aprovado') ? (
                  <input
                    type="number" step="0.01" className="valor-input"
                    value={valorAjustado}
                    onChange={(e) => setValorAjustado(e.target.value)}
                    onBlur={() => run(async () => {
                      const v = Number(valorAjustado);
                      if (v > 0) await api.avaliacoes.atualizar(item.id!, { ...item, valorEstimado: v });
                    })}
                  />
                ) : (
                  <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#73b8ff' }}>{brl(item.valorEstimado ?? 0)}</p>
                )}
              </div>
              {item.valorCompraSugerido != null && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Compra sugerida</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34c759' }}>{brl(item.valorCompraSugerido)}</p>
                </div>
              )}
            </div>
            {item.dataAvaliacao && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                Avaliado em {dataCurta(item.dataAvaliacao)}
              </p>
            )}
            {item.status === 'Aprovado' && (
              <p style={{ fontSize: '0.8rem', marginTop: 8, color: item.pagamentoAprovado ? '#5eead4' : '#ff9f0a' }}>
                {item.pagamentoAprovado ? `Pagamento aprovado · ${item.dataPagamento ? dataCurta(item.dataPagamento) : ''}` : 'Pagamento pendente'}
              </p>
            )}

            {item.status !== 'No estoque' && (
              <div style={{ marginTop: 16 }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Valor real de venda</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <input
                    type="number" step="0.01" className="valor-input"
                    placeholder="Valor real vendido"
                    value={valorReal}
                    onChange={(e) => setValorReal(e.target.value)}
                  />
                  <button
                    className="btn-secundario"
                    style={{ width: 'auto', padding: '8px 14px' }}
                    disabled={processando || !valorReal}
                    onClick={() => run(async () => {
                      await api.avaliacoes.registrarValorReal(item.id!, Number(valorReal));
                    })}
                  >
                    Salvar valor real
                  </button>
                  {item.valorEstimado && (
                    <button
                      className="btn-secundario"
                      style={{ width: 'auto', padding: '8px 14px' }}
                      disabled={processando}
                      onClick={() => {
                        setValorReal(String(item.valorEstimado));
                        run(async () => {
                          await api.avaliacoes.registrarValorReal(item.id!, item.valorEstimado!);
                        });
                      }}
                    >
                      Confirmar sugerido
                    </button>
                  )}
                </div>
                {item.valorVendaReal && (
                  <p style={{ fontSize: '0.8rem', color: '#34c759', marginTop: 6 }}>
                    Registrado: {brl(item.valorVendaReal)}
                  </p>
                )}
              </div>
            )}
          </CartaoVidro>
        )}

        {item.status === 'Aprovado' && (
          <CartaoVidro className="info-bloco">
            <h4 style={{ marginBottom: 12 }}>Retirada do produto</h4>
            {item.retirada ? (
              <div>
                <p><strong>Recebido por:</strong> {item.retirada.nomeRecebedor}</p>
                {item.retirada.documentoRecebedor && <p><strong>Documento:</strong> {item.retirada.documentoRecebedor}</p>}
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{dataCompleta(item.retirada.data)}</p>
                {item.retirada.foto && (
                  <a href={item.retirada.foto.url} target="_blank" rel="noreferrer" className="foto-thumb" style={{ marginTop: 10, display: 'block', maxWidth: 120 }}>
                    <img src={item.retirada.foto.url} alt="" />
                  </a>
                )}
              </div>
            ) : (
              <div className="form-grid">
                <div className="campo-app">
                  <input placeholder="Nome de quem recebeu *" value={retNome} onChange={(e) => setRetNome(e.target.value)} />
                </div>
                <div className="campo-app">
                  <input placeholder="Documento (opcional)" value={retDoc} onChange={(e) => setRetDoc(e.target.value)} />
                </div>
                <div className="campo-app">
                  <input placeholder="Observações" value={retObs} onChange={(e) => setRetObs(e.target.value)} />
                </div>
                <input type="file" accept="image/*" onChange={(e) => setRetFoto(e.target.files?.[0] ?? null)} />
                <button
                  className="btn-primario"
                  style={{ width: 'auto', padding: '8px 16px' }}
                  disabled={processando || !retNome.trim()}
                  onClick={() => run(async () => {
                    let foto;
                    if (retFoto) {
                      const path = `avaliacoes/${item.id}/retirada/${crypto.randomUUID()}.jpg`;
                      const up = await api.upload(retFoto, path);
                      foto = { id: up.id, url: up.url, path: up.path };
                    }
                    await api.avaliacoes.registrarRetirada(item.id!, {
                      nomeRecebedor: retNome.trim(),
                      documentoRecebedor: retDoc || undefined,
                      observacoes: retObs || undefined,
                      foto,
                      data: new Date().toISOString(),
                    });
                  })}
                >
                  Registrar retirada
                </button>
              </div>
            )}
          </CartaoVidro>
        )}

        {erro && <p style={{ color: '#ff3b30', fontSize: '0.85rem' }}>{erro}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
          {item.status === 'Em avaliação' && (
            <button className="btn-primario" style={{ width: 'auto', padding: '8px 16px' }} disabled={processando}
              onClick={() => run(async () => { await api.avaliacoes.avaliar(item.id!); })}>
              Avaliar preço
            </button>
          )}
          {item.status === 'Avaliado' && (
            <>
              <button className="btn-primario" style={{ width: 'auto', padding: '8px 16px' }} disabled={processando}
                onClick={() => run(async () => { await api.avaliacoes.aprovar(item.id!); })}>
                Aprovar compra
              </button>
              <button className="btn-primario" style={{ width: 'auto', padding: '8px 16px', background: '#ff3b30' }} disabled={processando}
                onClick={() => {
                  const j = prompt('Justificativa da recusa:');
                  if (j?.trim()) run(async () => { await api.avaliacoes.recusar(item.id!, j.trim()); });
                }}>
                Recusar compra
              </button>
            </>
          )}
          {item.status === 'Aprovado' && !item.pagamentoAprovado && (
            <button className="btn-primario" style={{ width: 'auto', padding: '8px 16px' }} disabled={processando}
              onClick={() => run(async () => { await api.avaliacoes.aprovarPagamento(item.id!); })}>
              Aprovar pagamento
            </button>
          )}
          {item.status === 'Aprovado' && item.pagamentoAprovado && item.retirada && (
            <button className="btn-primario" style={{ width: 'auto', padding: '8px 16px' }} disabled={processando}
              onClick={() => run(async () => { await api.avaliacoes.paraEstoque(item.id!); })}>
              Enviar ao estoque
            </button>
          )}
          <button className="btn-secundario" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function InfoLinha({ label, valor }: { label: string; valor?: string }) {
  if (!valor) return null;
  return (
    <p style={{ fontSize: '0.9rem', marginBottom: 6 }}>
      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}: </span>
      {valor}
    </p>
  );
}
