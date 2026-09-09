import {
  BadgePercent,
  BarChart3,
  Bed,
  CalendarDays,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  Users
} from 'lucide-react';
import React from 'react';
import { useHotel } from '../../contextos/ContextoHotel';
import { PaginaNavegacao } from '../../tipos';
import { LogoHotel } from '../comuns/LogoHotel';

interface BarraLateralProps {
  abertoMobile?: boolean;
  onFecharMobile?: () => void;
}

export const BarraLateral: React.FC<BarraLateralProps> = ({
  abertoMobile = false,
  onFecharMobile,
}) => {
  const {
    paginaAtual,
    navegarPara,
    logout,
    usuarioAtual,
    usuarios,
    trocarUsuario,
    online,
    reservas,
    quartos,
    dataSistema,
  } = useHotel();

  // Contadores para badges
  const checkinsHoje = reservas.filter(
    (r) => r.statusreserva === 'AGUARDANDO_CHECKIN'
  ).length;
  const checkoutsHoje = reservas.filter(
    (r) => r.statusreserva === 'HOSPEDADO' && r.datasaida === dataSistema
  ).length;

  const quartosOcupados = quartos.filter((q) => q.status === 'OCUPADO').length;

  const itensMenu: {
    id: PaginaNavegacao;
    label: string;
    icone: React.ReactNode;
    contador?: number;
  }[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icone: <LayoutDashboard className="w-5 h-5" />,
      },
      {
        id: 'status-quartos',
        label: 'Status dos Quartos',
        icone: <Bed className="w-5 h-5" />,
      },
      {
        id: 'reservas',
        label: 'Reservas',
        icone: <CalendarDays className="w-5 h-5" />,
      },
      {
        id: 'mapa-reservas',
        label: 'Mapa de Reservas',
        icone: <CalendarDays className="w-5 h-5" />,
      },
      {
        id: 'checkin',
        label: 'Check-in',
        icone: <LogIn className="w-5 h-5" />,
        contador: checkinsHoje,
      },
      {
        id: 'checkout',
        label: 'Check-out',
        icone: <LogOut className="w-5 h-5" />,
        contador: checkoutsHoje,
      },
      {
        id: 'hospedes',
        label: 'Hóspedes',
        icone: <Users className="w-5 h-5" />,
      },
      {
        id: 'financeiro',
        label: 'Financeiro',
        icone: <BadgePercent className="w-5 h-5" />,
      },
      {
        id: 'relatorios',
        label: 'Relatórios',
        icone: <BarChart3 className="w-5 h-5" />,
      },
      {
        id: 'configuracoes',
        label: 'Configurações',
        icone: <Settings className="w-5 h-5" />,
      },
    ];

  const handleNavegar = (pagina: PaginaNavegacao) => {
    navegarPara(pagina);
    if (onFecharMobile) onFecharMobile();
  };

  return (
    <>
      {/* Overlay mobile */}
      {abertoMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onFecharMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 border-r border-[#c1c9bf] bg-white flex flex-col z-40 transition-transform duration-200 ease-in-out py-4 ${abertoMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        id="sidenav"
      >
        {/* Topo com Logo Oficial */}
        <div className="px-4 mb-4 flex flex-col items-center">
          <div className="h-20 w-auto mb-1 p-1 flex items-center justify-center">
            <LogoHotel tamanho="md" />
          </div>
          <h1 className="font-['Manrope'] text-base font-bold text-[#191c1d] text-center leading-tight">
            Hotel Fazenda Anew
          </h1>
          <p className="font-['Inter'] text-[11px] text-[#717971] uppercase tracking-wider font-semibold mt-0.5">
            Administração
          </p>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1.5">
          {itensMenu.map((item) => {
            const ativo = paginaAtual === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavegar(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${ativo
                  ? 'bg-[#245437] text-white font-semibold shadow-xs'
                  : 'text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827]'
                  }`}
              >
                <span className={ativo ? 'text-white' : 'text-[#6b7280]'}>
                  {item.icone}
                </span>
                <span>{item.label}</span>
                {item.contador !== undefined && item.contador > 0 && (
                  <span
                    className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${ativo
                      ? 'bg-white/20 text-white'
                      : 'bg-[#e6f4ea] text-[#245437]'
                      }`}
                  >
                    {item.contador}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé do Sidebar */}
        <div className="px-4 mt-auto pt-4 border-t border-[#f3f4f6] space-y-1">
          <button
            onClick={() => handleNavegar('configuracoes')}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#4b5563] hover:text-[#111827] hover:bg-[#f3f4f6] rounded-xl transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-[#6b7280]" />
            <span>Suporte</span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#ba1a1a] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-[#ba1a1a]" />
            <span className="font-semibold">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};
