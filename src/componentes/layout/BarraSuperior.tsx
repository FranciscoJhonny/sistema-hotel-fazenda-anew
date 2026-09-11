import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  User,
  Shield,
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';

interface BarraSuperiorProps {
  onAbrirMobile: () => void;
}

export const BarraSuperior: React.FC<BarraSuperiorProps> = ({ onAbrirMobile }) => {
  const { paginaAtual, dataSistema, usuarioAtual, reservas, navegarPara, logout } = useHotel();
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'visao-geral' | 'metricas'>('visao-geral');

  const titulos: Record<string, string> = {
    dashboard: 'Dashboard',
    quartos: 'Gerenciamento de Quartos',
    reservas: 'Reservas',
    'nova-reserva': 'Nova Reserva',
    checkin: 'Check-in',
    checkout: 'Check-out',
    hospedes: 'Hóspedes',
    financeiro: 'Financeiro',
    loja: 'Lojinha',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações',
    'status-quartos': 'Status dos Quartos',
    'mapa-reservas': 'Mapa de Reservas',
  };

  // Função para formatar a data atual
  const formatarDataAtual = (): string => {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.toLocaleString('pt-BR', { month: 'long' });
    const ano = hoje.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
  };

  const chegadasHoje = reservas.filter((r) =>
    (r.statusreserva === 'PRE_RESERVA' || r.statusreserva === 'RESERVADO') && r.dataentrada === dataSistema
  );
  const saidasHoje = reservas.filter(
    (r) => r.statusreserva === 'HOSPEDADO' && r.datasaida === dataSistema
  );

  const totalNotificacoes = chegadasHoje.length + saidasHoje.length;

  return (
    <header className="h-16 w-full border-b border-[#e5e7eb] bg-white flex justify-between items-center px-4 md:px-8 sticky top-0 z-30">
      {/* Esquerda: Botão Mobile + Título + Abas (Visão Geral / Métricas) */}
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={onAbrirMobile}
          className="md:hidden p-2 text-[#245437] hover:bg-[#f3f4f6] rounded-lg transition-colors cursor-pointer"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-6">
          <div>
            <h2 className="font-['Manrope'] text-xl font-bold text-[#111827]">
              {titulos[paginaAtual] || 'Dashboard'}
            </h2>            
          </div>

          {paginaAtual === 'dashboard' && (
            <div className="hidden sm:flex items-center gap-5 text-sm font-medium pt-1">
              <button
                onClick={() => setAbaAtiva('visao-geral')}
                className={`pb-4 pt-4 border-b-2 transition-colors cursor-pointer font-semibold ${abaAtiva === 'visao-geral'
                  ? 'border-[#245437] text-[#245437]'
                  : 'border-transparent text-[#6b7280] hover:text-[#111827]'
                  }`}
              >
                Visão Geral
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Data (em outras páginas) + Notificações + Buscar + Avatar */}
      <div className="flex items-center gap-4">        
          <span className="font-['Inter'] text-sm text-[#4b5563] hidden sm:inline font-medium">
            {formatarDataAtual()}
          </span>        

        {/* Notificações com Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
            className="p-1.5 text-[#4b5563] hover:bg-[#f3f4f6] transition-colors rounded-full cursor-pointer relative"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {totalNotificacoes > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#dc2626] rounded-full" />
            )}
          </button>

          {mostrarNotificacoes && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#e5e7eb] rounded-xl shadow-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-[#f3f4f6]">
                <h4 className="font-['Manrope'] text-sm font-bold text-[#111827]">
                  Atividades de Hoje ({totalNotificacoes})
                </h4>
                <button
                  onClick={() => setMostrarNotificacoes(false)}
                  className="text-xs text-[#245437] hover:underline"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {chegadasHoje.length === 0 && saidasHoje.length === 0 ? (
                  <p className="text-xs text-[#6b7280] py-4 text-center">
                    Nenhuma pendência para hoje.
                  </p>
                ) : (
                  <>
                    {chegadasHoje.map((res) => (
                      <div
                        key={res.reservaid}
                        onClick={() => {
                          navegarPara('checkin');
                          setMostrarNotificacoes(false);
                        }}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#f9fafb] cursor-pointer transition-colors border border-transparent hover:border-[#f3f4f6]"
                      >
                        <Clock className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111827]">
                            Check-in previsto: {res.hospedenome}
                          </p>
                          <p className="text-[11px] text-[#4b5563]">
                            Quarto {res.quartonumero} ({res.quartocodigo}) • {res.horarioprevistochegada || '14:00'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {saidasHoje.map((res) => (
                      <div
                        key={res.reservaid}
                        onClick={() => {
                          navegarPara('checkout');
                          setMostrarNotificacoes(false);
                        }}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#f9fafb] cursor-pointer transition-colors border border-transparent hover:border-[#f3f4f6]"
                      >
                        <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111827]">
                            Check-out previsto: {res.hospedenome}
                          </p>
                          <p className="text-[11px] text-[#4b5563]">
                            Quarto {res.quartonumero} ({res.quartocodigo}) • {res.horarioprevistosaida || '12:00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Campo Buscar no Topo */}
        <div className="relative hidden md:block w-44 lg:w-52">
          <Search className="w-4 h-4 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-xs text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#245437]"
          />
        </div>

        {/* Avatar com Menu de Usuário */}
        <div className="relative">
          <button
            onClick={() => setMostrarMenuUsuario(!mostrarMenuUsuario)}
            className="w-8 h-8 rounded-lg bg-[#193b27] hover:bg-[#245437] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs cursor-pointer select-none transition-colors"
            title={usuarioAtual?.nome || 'Usuário'}
            aria-label="Perfil do usuário"
          >
            {usuarioAtual?.nome ? usuarioAtual.nome.substring(0, 2).toUpperCase() : 'MP'}
          </button>

          {mostrarMenuUsuario && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e5e7eb] rounded-xl shadow-lg p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3 pb-3 border-b border-[#f3f4f6]">
                <div className="w-10 h-10 rounded-lg bg-[#e6f4ea] text-[#053d1e] flex items-center justify-center font-bold text-sm border border-[#b8f0c2]">
                  {usuarioAtual?.nome ? usuarioAtual.nome.substring(0, 2).toUpperCase() : 'MP'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#111827] truncate">
                    {usuarioAtual?.nome || 'Administrador'}
                  </p>
                  <p className="text-[11px] text-[#6b7280] font-mono truncate">
                    {usuarioAtual?.email || 'admin@fazendaanew.com.br'}
                  </p>
                  <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-[#e6f4ea] text-[#053d1e] rounded">
                    {usuarioAtual?.perfil || 'ADMIN'}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-1">
                <button
                  onClick={() => {
                    navegarPara('configuracoes');
                    setMostrarMenuUsuario(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-[#4b5563] hover:text-[#111827] hover:bg-[#f9fafb] rounded-lg transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#6b7280]" />
                  <span>Configurações do Sistema</span>
                </button>
                <button
                  onClick={() => {
                    setMostrarMenuUsuario(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};