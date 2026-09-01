import React from 'react';
import { ContextoHotelProvider, useHotel } from './contextos/ContextoHotel';
import { BarraLateral } from './componentes/layout/BarraLateral';
import { BarraSuperior } from './componentes/layout/BarraSuperior';
import { PaginaDashboard } from './paginas/PaginaDashboard';
import { PaginaQuartos } from './paginas/PaginaQuartos';
import { PaginaReservas } from './paginas/PaginaReservas';
import { PaginaCheckin } from './paginas/PaginaCheckin';
import { PaginaCheckout } from './paginas/PaginaCheckout';
import { PaginaHospedes } from './paginas/PaginaHospedes';
import { PaginaFinanceiro } from './paginas/PaginaFinanceiro';
import { PaginaLoja } from './paginas/PaginaLoja';
import { PaginaRelatorios } from './paginas/PaginaRelatorios';
import { PaginaConfiguracoes } from './paginas/PaginaConfiguracoes';
import { PaginaLogin } from './paginas/PaginaLogin';

const ConteudoPrincipal: React.FC = () => {
  const { paginaAtual, autenticado } = useHotel();
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
      case 'reservas':
      case 'nova-reserva':
        return <PaginaReservas abrirModalNova={paginaAtual === 'nova-reserva'} />;
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
      case 'relatorios':
        return <PaginaRelatorios />;
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
    </div>
  );
};

export default function App() {
  return (
    <ContextoHotelProvider>
      <ConteudoPrincipal />
    </ContextoHotelProvider>
  );
}
