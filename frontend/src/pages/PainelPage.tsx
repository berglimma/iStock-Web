import { useCallback, useState } from 'react';
import { api, brl } from '../api/client';
import { TituloTela, MetricaCard, CartaoVidro } from '../components/UI';
import { useSyncRefresh } from '../hooks/useSyncRefresh';

export default function PainelPage() {
  const [lm, setLm] = useState<Record<string, number>>({});
  const [am, setAm] = useState<Record<string, number>>({});

  const reload = useCallback(() => {
    Promise.all([api.lancamentos.metricas(), api.avaliacoes.metricas()])
      .then(([l, a]) => { setLm(l); setAm(a); });
  }, []);
  useSyncRefresh(reload);

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
    </div>
  );
}
