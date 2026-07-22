import { useCallback, useState } from 'react';
import { api, brl, dataCurta } from '../api/client';
import { TituloTela, MetricaCard, CartaoVidro, Badge } from '../components/UI';
import { useSyncRefresh } from '../hooks/useSyncRefresh';

type PainelResumo = Awaited<ReturnType<typeof api.painel.resumo>>;

export default function PainelPage() {
  const [lm, setLm] = useState<Record<string, number>>({});
  const [am, setAm] = useState<Record<string, number>>({});
  const [resumo, setResumo] = useState<PainelResumo | null>(null);

  const reload = useCallback(() => {
    Promise.all([api.lancamentos.metricas(), api.avaliacoes.metricas(), api.painel.resumo()])
      .then(([l, a, r]) => { setLm(l); setAm(a); setResumo(r); })
      .catch(() => {});
  }, []);
  useSyncRefresh(reload);

  const categorias = Object.entries(resumo?.estoquePorCategoria || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <TituloTela titulo="Painel" subtitulo="Visão geral do inventário Apple" />

      <h3 style={{ margin: '20px 0 12px', color: 'white' }}>Financeiro</h3>
      <div className="grid-metricas">
        <MetricaCard titulo="Receita em estoque" valor={brl(lm.valorTotalEstoque || 0)} cor="#73b8ff" />
        <MetricaCard titulo="Total vendido" valor={brl(lm.receitaTotalVendida || 0)} cor="#34c759" />
        <MetricaCard titulo="Compras aprovadas" valor={brl(am.totalCompradoAprovado || 0)} cor="#34c759" />
        <MetricaCard titulo="Pagamentos pendentes" valor={brl(am.totalPagamentoPendente || 0)} cor="#ff9500" />
        <MetricaCard titulo="Pagamentos aprovados" valor={brl(am.totalPagamentoAprovado || 0)} cor="#63e6be" />
        <MetricaCard titulo="Custo em estoque" valor={brl(lm.custoTotalEstoque || 0)} cor="#73b8ff" />
      </div>

      <h3 style={{ margin: '24px 0 12px', color: 'white' }}>Inventário</h3>
      <div className="grid-metricas">
        <MetricaCard titulo="Em estoque" valor={String(lm.noEstoque || 0)} cor="#73b8ff" />
        <MetricaCard titulo="Disponíveis" valor={String(lm.disponiveis || 0)} cor="#34c759" />
        <MetricaCard titulo="Reservados" valor={String(lm.reservados || 0)} cor="#ff9500" />
        <MetricaCard titulo="Vendidos no mês" valor={String(lm.vendidosNoMes || 0)} cor="#34c759" />
        <MetricaCard titulo="Receita do mês" valor={brl(lm.receitaMes || 0)} cor="#73b8ff" />
        <MetricaCard titulo="Avaliados (estimativa)" valor={brl(am.totalEstimadoAvaliadas || 0)} cor="#73b8ff" />
        <MetricaCard titulo="Venda real (avaliados)" valor={brl(am.totalVendaRealAvaliadas || 0)} cor="#34c759" />
        <MetricaCard titulo="Parados (+30 dias)" valor={String(lm.parados || 0)} cor="#ff3b30" />
      </div>

      {(am.aprovadasSemPagamento || 0) > 0 && (
        <div style={{ marginTop: 20 }}>
          <CartaoVidro>
            <p style={{ color: '#ff9500' }}>
              {am.aprovadasSemPagamento} avaliação(ões) com pagamento pendente
            </p>
          </CartaoVidro>
        </div>
      )}

      {resumo && resumo.sugestoes.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', color: 'white' }}>Sugestões</h3>
          <div className="lista-sugestoes">
            {resumo.sugestoes.map((s) => (
              <CartaoVidro key={s.id} className="sugestao-card">
                <div className="sugestao-card__topo">
                  <strong className="sugestao-card__titulo">{s.titulo}</strong>
                  <Badge
                    texto={s.prioridade}
                    cor={s.prioridade === 'alta' ? 'vermelho' : s.prioridade === 'media' ? 'laranja' : 'azul'}
                  />
                </div>
                <p className="sugestao-card__msg">{s.mensagem}</p>
              </CartaoVidro>
            ))}
          </div>
        </>
      )}

      {resumo && resumo.avaliados.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', color: 'white' }}>Avaliados — ações rápidas</h3>
          <div className="lista-painel">
            {resumo.avaliados.map((a) => (
              <CartaoVidro key={a.id || a.titulo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{a.titulo}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                      {a.status} · {dataCurta(a.data)}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginTop: 6, color: '#73b8ff' }}>
                      Venda {brl(a.valorEstimado ?? 0)}
                      {a.valorCompraSugerido != null ? ` · Compra ${brl(a.valorCompraSugerido)}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {!a.pagamentoAprovado && a.status === 'Aprovado' && a.id && (
                      <button
                        className="btn-secundario"
                        style={{ width: 'auto', padding: '8px 12px' }}
                        onClick={async () => {
                          await api.avaliacoes.aprovarPagamento(a.id!);
                          reload();
                        }}
                      >
                        Aprovar pgto
                      </button>
                    )}
                    {!a.valorVendaReal && a.valorEstimado && a.id && (
                      <button
                        className="btn-primario"
                        style={{ width: 'auto', padding: '8px 12px' }}
                        onClick={async () => {
                          await api.avaliacoes.registrarValorReal(a.id!, a.valorEstimado!);
                          reload();
                        }}
                      >
                        Confirmar venda sugerida
                      </button>
                    )}
                  </div>
                </div>
              </CartaoVidro>
            ))}
          </div>
        </>
      )}

      {categorias.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', color: 'white' }}>Estoque por categoria</h3>
          <div className="grid-metricas">
            {categorias.map(([tipo, qtd]) => (
              <MetricaCard key={tipo} titulo={tipo} valor={String(qtd)} cor="#73b8ff" />
            ))}
          </div>
        </>
      )}

      {resumo && resumo.vendasMes.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', color: 'white' }}>Últimas vendas do mês</h3>
          <div className="lista-painel">
            {resumo.vendasMes.map((v) => (
              <CartaoVidro key={v.id || `${v.titulo}-${v.data}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <strong>{v.titulo}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                      {v.tipoProduto} · {dataCurta(v.data)}
                    </p>
                  </div>
                  <strong style={{ color: '#34c759' }}>{brl(v.valor)}</strong>
                </div>
              </CartaoVidro>
            ))}
          </div>
        </>
      )}

      {resumo && resumo.atividade.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', color: 'white' }}>Atividade recente</h3>
          <div className="lista-painel">
            {resumo.atividade.map((t) => (
              <CartaoVidro key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <Badge texto={t.tipo} cor="azul" />
                    <p style={{ marginTop: 8, fontWeight: 600 }}>{t.titulo}</p>
                    {t.detalhes && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{t.detalhes}</p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                      {dataCurta(t.data)}{t.usuario ? ` · ${t.usuario}` : ''}
                    </p>
                  </div>
                  {t.valor != null && <strong style={{ color: '#73b8ff' }}>{brl(t.valor)}</strong>}
                </div>
              </CartaoVidro>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
