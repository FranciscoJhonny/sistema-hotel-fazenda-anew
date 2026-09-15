import React from 'react';
import { ContextoHotelProvider, useHotel } from './contextos/ContextoHotel';
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
import { PaginaConfiguracoes } from './paginas/PaginaConfiguracoes';
import { PaginaLogin } from './paginas/PaginaLogin';
import { PaginaCadastroFnrh } from './paginas/PaginaCadastroFnrh';
import { LoaderCircle } from 'lucide-react';

const obterTokenFnrhDaUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const partes = window.location.pathname.split('/').filter(Boolean);
  return partes[0]?.toLowerCase() === 'fnrh' && partes[1] ? decodeURIComponent(partes[1]) : null;
};

const ConteudoPrincipal: React.FC = () => {
  const { paginaAtual, autenticado, carregando } = useHotel();
  const [mobileMenuAberto, setMobileMenuAberto] = React.useState(false);

  if (!autenticado || paginaAtual === 'login') {
    return <PaginaLogin />;
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
      case 'financeiro':
        return <PaginaFinanceiro />;
      case 'loja':
        return <PaginaLoja />;
      case 'produtos':
        return <PaginaProdutos />;
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
