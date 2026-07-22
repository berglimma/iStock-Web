import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Clock, Search, PlusSquare, Package,
  Users, MessageCircle, LogOut, Bell, AlertCircle, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { abasParaPapel, SIDEBAR_LABELS, SidebarItem } from '../types';
import { FundoTecnologico, Badge } from '../components/UI';
import { MacAppPromo } from '../components/MacAppPromo';
import { SyncStatusBanner } from '../components/SyncStatusBanner';
import PainelPage from './PainelPage';
import ProdutosPage from './ProdutosPage';
import CadastroPage from './CadastroPage';
import AvaliacoesPage from './AvaliacoesPage';
import ClientesPage from './ClientesPage';
import PesquisaPage from './PesquisaPage';
import MensagensPage from './MensagensPage';
import AssistentePage from './AssistentePage';
import RelatoriosPage from './RelatoriosPage';

const ICONS: Record<SidebarItem, typeof LayoutDashboard> = {
  painel: LayoutDashboard,
  relatorios: FileText,
  avaliacoes: Clock,
  pesquisa: Search,
  cadastro: PlusSquare,
  produtos: Package,
  clientes: Users,
  mensagens: MessageCircle,
  assistente: Sparkles,
};

export default function MainLayout() {
  const { usuario, sair } = useAuth();
  const abas = abasParaPapel(usuario!.papel);
  const [aba, setAba] = useState<SidebarItem>(abas[0]);

  useEffect(() => {
    if (!abas.includes(aba)) setAba(abas[0]);
  }, [usuario, abas, aba]);

  const papelCor = usuario!.papel === 'Administrador' ? 'mint' : usuario!.papel === 'Cliente' ? 'laranja' : 'azul';

  return (
    <>
      <FundoTecnologico />
      <div className="layout-app">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="iStock" />
            <span>iStock</span>
          </div>
          <nav className="sidebar-nav">
            {abas.map((item) => {
              const Icon = ICONS[item];
              return (
                <button key={item} className={`sidebar-item ${aba === item ? 'active' : ''}`} onClick={() => setAba(item)}>
                  <span className="left"><Icon size={18} /> {SIDEBAR_LABELS[item]}</span>
                  {item === 'produtos' && <AlertCircle size={14} color="#ff3b30" style={{ opacity: 0.6 }} />}
                </button>
              );
            })}
          </nav>
          <MacAppPromo compact />
        </aside>

        <main className="main-content">
          <div className="topbar">
            <div />
            <div className="topbar-actions">
              <SyncStatusBanner />
              <Badge texto={usuario!.papel === 'Administrador' ? 'Administrador' : usuario!.papel === 'Consultor de vendas' ? 'Consultor' : 'Cliente'} cor={papelCor} />
              <button className="btn-secundario" onClick={sair} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>

          {aba === 'painel' && <PainelPage />}
          {aba === 'relatorios' && <RelatoriosPage />}
          {aba === 'avaliacoes' && <AvaliacoesPage />}
          {aba === 'pesquisa' && <PesquisaPage />}
          {aba === 'cadastro' && <CadastroPage />}
          {aba === 'produtos' && <ProdutosPage />}
          {aba === 'clientes' && <ClientesPage />}
          {aba === 'mensagens' && <MensagensPage />}
          {aba === 'assistente' && <AssistentePage />}
        </main>
      </div>
    </>
  );
}
