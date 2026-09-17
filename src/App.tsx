import React from 'react';
import { ContextoHotelProvider, useHotel } from './contextos/ContextoHotel';
import { PaginaNavegacao } from './tipos';
import { BarraLateral } from './componentes/layout/BarraLateral';
import { BarraSuperior } from './componentes/layout/BarraSuperior';
import { PaginaDashboard } from './paginas/PaginaDashboard';
import { PaginaStatusQuartos } from './paginas/PaginaStatusQuartos';
import { PaginaMapaReservas } from './paginas/PaginaMapaReservas';
import { PaginaCheckin } from './paginas/PaginaCheckin';
import { PaginaCheckout } from './paginas/PaginaCheckout';
import { PaginaHospedes } from './paginas/PaginaHospedes';
import { PaginaFinanceiro } from './paginas/PaginaFinanceiro';
import { PaginaLoja } from './paginas/PaginaLoja';
import { PaginaProdutos } from './paginas/PaginaProdutos';
import { PaginaQuartos } from './paginas/PaginaQuartos';
import { PaginaUsuarios } from './paginas/PaginaUsuarios';
import { PaginaConfiguracoes } from './paginas/PaginaConfiguracoes';
import { PaginaLogin } from './paginas/PaginaLogin';
import { PaginaCadastroFnrh } from './paginas/PaginaCadastroFnrh';
import { PaginaFnrhAdmin } from './paginas/PaginaFnrhAdmin';
import { LoaderCircle } from 'lucide-react';

const obterTokenFnrhDaUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const partes = window.location.pathname.split('/').filter(Boolean);
  return partes[0]?.toLowerCase() === 'fnrh' && partes[1] ? decodeURIComponent(partes[1]) : null;
};

const ConteudoPrincipal: React.FC = () => {
  const { paginaAtual, autenticado, carregando, usuarioAtual, navegarPara } = useHotel();
  const [mobileMenuAberto, setMobileMenuAberto] = React.useState(false);

  if (!autenticado || paginaAtual === 'login') {
    return <PaginaLogin />;
  }

  // Trava de permissão: Perfil RECEPCAO pode acessar exclusivamente Check-in, Check-out, Produto e Quartos
  const paginasPermitidasRecepcao: PaginaNavegacao[] = ['checkin', 'checkout', 'produtos', 'quartos'];
  if (usuarioAtual?.perfil === 'RECEPCAO' && !paginasPermitidasRecepcao.includes(paginaAtual)) {
    navegarPara('checkin');
    return null;
  }

  // Trava de permissão: Perfil diferente de MASTER (Dono) tentando acessar a Gestão de Usuários
  if (paginaAtual === 'usuarios' && usuarioAtual?.perfil !== 'MASTER') {
    const destino = usuarioAtual?.perfil === 'RECEPCAO' ? 'checkin' : 'dashboard';
    navegarPara(destino);
    return null;
  }

  const renderizarPagina = () => {
    switch (paginaAtual) {
      case 'dashboard':
        return <PaginaDashboard />;
      case 'quartos':
        return <PaginaQuartos />;
      case 'status-quartos':
        return <PaginaStatusQuartos />;
      case 'mapa-reservas':
        return <PaginaMapaReservas />;
      case 'checkin':
        return <PaginaCheckin />;
      case 'checkout':
        return <PaginaCheckout />;
      case 'hospedes':
        return <PaginaHospedes />;
      case 'fnrh':
        return <PaginaFnrhAdmin />;
      case 'financeiro':
        return <PaginaFinanceiro />;
      case 'loja':
        return <PaginaLoja />;
      case 'produtos':
        return <PaginaProdutos />;
      case 'usuarios':
        return <PaginaUsuarios />;
      case 'configuracoes':
        return <PaginaConfiguracoes />;
      default:
        return <PaginaDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] text-[#191c1d] font-['Inter'] antialiased">
      {/* Barra Lateral de Navegação */}
      <BarraLateral
        abertoMobile={mobileMenuAberto}
        onFecharMobile={() => setMobileMenuAberto(false)}
      />

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <BarraSuperior onAbrirMobile={() => setMobileMenuAberto(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderizarPagina()}
        </main>
      </div>
      {carregando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-xs" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-[#053d1e] shadow-xl">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando dados...
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const tokenFnrh = obterTokenFnrhDaUrl();

  if (tokenFnrh) {
    return <PaginaCadastroFnrh token={tokenFnrh} />;
  }

  return (
    <ContextoHotelProvider>
      <ConteudoPrincipal />
    </ContextoHotelProvider>
  );
}
