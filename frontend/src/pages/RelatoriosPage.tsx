import { useEffect, useState } from 'react';
import { api, brl } from '../api/client';
import { TituloTela, CartaoVidro, MetricaCard } from '../components/UI';

export default function RelatoriosPage() {
  const [lm, setLm] = useState<Record<string, number>>({});
  const [am, setAm] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([api.lancamentos.metricas(), api.avaliacoes.metricas()])
      .then(([l, a]) => { setLm(l); setAm(a); });
  }, []);

  const margem = (lm.valorTotalEstoque || 0) - (lm.custoTotalEstoque || 0);

  return (
    <div className="relatorios-page">
      <TituloTela titulo="Relatórios" subtitulo="Análise financeira e operacional" />

      <CartaoVidro>
        <h3 style={{ marginBottom: 16 }}>Resumo financeiro</h3>
        <div className="grid-metricas">
          <MetricaCard titulo="Receita total vendida" valor={brl(lm.receitaTotalVendida || 0)} cor="#34c759" />
          <MetricaCard titulo="Receita do mês" valor={brl(lm.receitaMes || 0)} cor="#73b8ff" />
          <MetricaCard titulo="Valor em estoque" valor={brl(lm.valorTotalEstoque || 0)} cor="#73b8ff" />
          <MetricaCard titulo="Custo em estoque" valor={brl(lm.custoTotalEstoque || 0)} cor="#ff9500" />
          <MetricaCard titulo="Margem potencial" valor={brl(margem)} cor="#63e6be" />
          <MetricaCard titulo="Compras aprovadas" valor={brl(am.totalCompradoAprovado || 0)} cor="#34c759" />
        </div>
      </CartaoVidro>

      <div style={{ marginTop: 20 }}>
        <CartaoVidro>
          <h3 style={{ marginBottom: 16 }}>Operacional</h3>
        <div className="grid-metricas">
          <MetricaCard titulo="Produtos vendidos" valor={String(lm.vendidos || 0)} />
          <MetricaCard titulo="Vendidos no mês" valor={String(lm.vendidosNoMes || 0)} />
          <MetricaCard titulo="Parados (+30d)" valor={String(lm.parados || 0)} cor="#ff3b30" />
          <MetricaCard titulo="Em avaliação" valor={String(am.emAvaliacao || 0)} cor="#ff9500" />
          <MetricaCard titulo="Pagamentos pendentes" valor={String(am.aprovadasSemPagamento || 0)} cor="#ff9500" />
        </div>
        </CartaoVidro>
      </div>
    </div>
  );
}
