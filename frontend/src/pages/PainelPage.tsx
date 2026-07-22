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

      <h3 className="painel-titulo">Financeiro</h3>
      <div className="grid-metricas painel-secao painel-secao--financeiro">
        <MetricaCard titulo="Receita em estoque" valor={brl(lm.valorTotalEstoque || 0)} cor="#73b8ff" />
        <MetricaCard titulo="Total vendido" valor={brl(lm.receitaTotalVendida || 0)} cor="#34c759" />
        <MetricaCard titulo="Compras aprovadas" valor={brl(am.totalCompradoAprovado || 0)} cor="#34c759" />
        <MetricaCard titulo="Pagamentos pendentes" valor={brl(am.totalPagamentoPendente || 0)} cor="#ff9500" />
        <MetricaCard titulo="Pagamentos aprovados" valor={brl(am.totalPagamentoAprovado || 0)} cor="#63e6be" />
        <MetricaCard titulo="Custo em estoque" valor={brl(lm.custoTotalEstoque || 0)} cor="#73b8ff" />
      </div>

      <h3 className="painel-titulo">Inventário</h3>
      <div className="grid-metricas painel-secao painel-secao--inventario">
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
          <h3 className="painel-titulo">Sugestões</h3>
          <div className="lista-sugestoes painel-secao painel-secao--sugestoes">
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
          <h3 className="painel-titulo">Avaliados — ações rápidas</h3>
          <div className="grid-painel-cards painel-secao painel-secao--avaliados">
            {resumo.avaliados.map((a) => (
              <article key={a.id || a.titulo} className="avaliado-card">
                <header className="avaliado-card__topo">
                  <h4 className="avaliado-card__titulo">{a.titulo}</h4>
                  <Badge texto={a.status} cor={a.status === 'Aprovado' ? 'verde' : 'azul'} />
                </header>
                <div className="avaliado-card__dados">
                  <p className="avaliado-card__valor">{brl(a.valorEstimado ?? 0)}</p>
                  <p className="avaliado-card__meta">
                    {a.valorCompraSugerido != null ? `Compra ${brl(a.valorCompraSugerido)} · ` : ''}
                    {dataCurta(a.data)}
                  </p>
                </div>
                <div className="avaliado-card__acoes">
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
              </article>
            ))}
          </div>
        </>
      )}

      {categorias.length > 0 && (
        <>
          <h3 className="painel-titulo">Estoque por categoria</h3>
          <div className="grid-metricas painel-secao painel-secao--estoque">
            {categorias.map(([tipo, qtd]) => (
              <MetricaCard key={tipo} titulo={tipo} valor={String(qtd)} cor="#73b8ff" />
            ))}
          </div>
        </>
      )}

      {resumo && resumo.vendasMes.length > 0 && (
        <>
          <h3 className="painel-titulo">Últimas vendas do mês</h3>
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
          <h3 className="painel-titulo">Atividade recente</h3>
          <div className="grid-painel-cards">
            {resumo.atividade.map((t) => (
              <article key={t.id} className="atividade-card">
                <header className="atividade-card__topo">
                  <h4 className="atividade-card__titulo">{t.titulo}</h4>
                  <Badge texto={t.tipo} cor="azul" />
                </header>
                <div className="atividade-card__dados">
                  {t.valor != null && <p className="atividade-card__valor">{brl(t.valor)}</p>}
                  {t.detalhes && <p className="atividade-card__meta">{t.detalhes}</p>}
                  <p className="atividade-card__meta">
                    {dataCurta(t.data)}{t.usuario ? ` · ${t.usuario}` : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
