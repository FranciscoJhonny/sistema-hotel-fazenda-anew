import React, { useState } from 'react';
import {
  Bed,
  CalendarCheck,
  CalendarX,
  Users,
  PlusCircle,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Lock,
  Calendar,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CardQuarto } from '../componentes/quartos/CardQuarto';
import { ModalDetalhesQuarto } from '../componentes/quartos/ModalDetalhesQuarto';
import { ModalNovaReserva } from '../componentes/reservas/ModalNovaReserva';
import { Quarto, StatusQuarto } from '../tipos';
import { formatarMoeda, formatarData } from '../utilitarios/formatadores';

export const PaginaDashboard: React.FC = () => {
  const {
    quartos,
    reservas,
    dataSistema,
    navegarPara,
    realizarCheckin,
    realizarCheckout,
  } = useHotel();

  // Estados locais
  const [quartoSelecionado, setQuartoSelecionado] = useState<Quarto | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalNovaReservaAberto, setModalNovaReservaAberto] = useState(false);
  const [quartoParaReserva, setQuartoParaReserva] = useState<Quarto | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [feedbackAcao, setFeedbackAcao] = useState<string | null>(null);

  // Métricas para os 13 Quartos
  const totalQuartos = quartos.length || 13;
  const quartosOcupados = quartos.filter((q) => q.status === 'OCUPADO').length;
  const quartosReservados = quartos.filter((q) => q.status === 'RESERVADO').length;
  const quartosAguardando = quartos.filter((q) => q.status === 'AGUARDANDO_CHECKIN').length;
  const quartosDisponiveis = quartos.filter((q) => q.status === 'DISPONIVEL').length;
  const quartosManutencao = quartos.filter((q) => q.status === 'MANUTENCAO').length;

  const taxaOcupacao = Math.round((quartosOcupados / totalQuartos) * 100);
  const taxaDisponiveis = Math.round((quartosDisponiveis / totalQuartos) * 100);

  // Reservas de hoje
  const checkinsHoje = reservas.filter((r) => r.statusreserva === 'AGUARDANDO_CHECKIN');
  const checkoutsHoje = reservas.filter(
    (r) => r.statusreserva === 'HOSPEDADO' && r.datasaida === dataSistema
  );

  // Total de hóspedes no local
  const hospedesPresentes = reservas
    .filter((r) => r.statusreserva === 'HOSPEDADO')
    .reduce((acc, curr) => acc + (curr.adultos || 0) + (curr.criancas || 0), 0);

  // Filtragem dos quartos
  const quartosFiltrados = quartos.filter((q) => {
    if (filtroStatus === 'TODOS') return true;
    return q.status === filtroStatus;
  });

  const handleAbrirDetalhesQuarto = (quarto: Quarto) => {
    setQuartoSelecionado(quarto);
    setModalDetalhesAberto(true);
  };

  const handleNovaReservaParaQuarto = (quarto: Quarto) => {
    setQuartoParaReserva(quarto);
    setModalNovaReservaAberto(true);
  };

  const handleCheckinRapido = async (reservaId: number) => {
    const res = await realizarCheckin(reservaId);
    setFeedbackAcao(res.mensagem);
    setTimeout(() => setFeedbackAcao(null), 3000);
  };

  const handleCheckoutRapido = async (reservaId: number) => {
    const res = await realizarCheckout(reservaId);
    setFeedbackAcao(res.mensagem);
    setTimeout(() => setFeedbackAcao(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Feedback Rápido */}
      {feedbackAcao && (
        <div className="bg-[#dcfce7] text-[#166534] px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 border border-[#bbf7d0] shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0" />
          <span>{feedbackAcao}</span>
        </div>
      )}

      {/* 1. SEÇÃO DE CARDS DE MÉTRICAS OPERACIONAIS (IGUAL LAYOUT DO HOTEL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ocupação Atual com Barra de Progresso */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">
                Ocupação Atual
              </p>
              <span className="p-1.5 bg-[#f0fdf4] text-[#166534] rounded-lg">
                <Bed className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">
                {taxaOcupacao}%
              </h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">
              {quartosOcupados} de {totalQuartos} Quartos Ocupados
            </p>
          </div>

          <div className="mt-4">
            <div className="w-full bg-[#f3f4f6] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#245437] h-full rounded-full transition-all duration-500"
                style={{ width: `${taxaOcupacao}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Check-ins Hoje */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">
                Check-ins Hoje
              </p>
              <span className="p-1.5 bg-[#fef3c7] text-[#92400e] rounded-lg">
                <CalendarCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">
                {checkinsHoje.length}
              </h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">
              Previstos para hoje
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f3f4f6]">
            <button
              onClick={() => navegarPara('checkin')}
              className="text-xs font-semibold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver Detalhes <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Check-outs Hoje */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">
                Check-outs Hoje
              </p>
              <span className="p-1.5 bg-[#fee2e2] text-[#991b1b] rounded-lg">
                <CalendarX className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">
                {checkoutsHoje.length}
              </h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">
              Previstos para hoje
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f3f4f6]">
            <button
              onClick={() => navegarPara('checkout')}
              className="text-xs font-semibold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver Detalhes <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Quartos Disponíveis */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">
                Disponíveis
              </p>
              <span className="p-1.5 bg-[#f0fdf4] text-[#166534] rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">
                {quartosDisponiveis}
              </h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">
              Prontos para reserva
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f3f4f6] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-full">
              {taxaDisponiveis}% do total
            </span>
            <span className="text-xs text-[#6b7280]">
              {hospedesPresentes} hóspedes no hotel
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAPA OPERACIONAL DOS 13 QUARTOS (B1 a D6) */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6 shadow-xs">
        {/* Cabeçalho da Seção de Quartos */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#f3f4f6]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-['Manrope'] text-xl font-bold text-[#111827]">
                Status dos Quartos
              </h2>
              <span className="text-xs font-bold text-[#245437] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full border border-[#bbf7d0]">
                {totalQuartos} Quartos
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-1">
              Blocos B (B1 a B4), C (C2 a C4) e D (D1 a D6)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtros de Status */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setFiltroStatus('TODOS')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'TODOS'
                    ? 'bg-[#245437] text-white shadow-xs'
                    : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'
                }`}
              >
                Todos ({totalQuartos})
              </button>
              <button
                onClick={() => setFiltroStatus('DISPONIVEL')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'DISPONIVEL'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                }`}
              >
                Disponíveis ({quartosDisponiveis})
              </button>
              <button
                onClick={() => setFiltroStatus('OCUPADO')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'OCUPADO'
                    ? 'bg-[#dc2626] text-white shadow-xs'
                    : 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'
                }`}
              >
                Ocupados ({quartosOcupados})
              </button>
              <button
                onClick={() => setFiltroStatus('AGUARDANDO_CHECKIN')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'AGUARDANDO_CHECKIN'
                    ? 'bg-[#d97706] text-white shadow-xs'
                    : 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'
                }`}
              >
                Aguardando ({quartosAguardando})
              </button>
              {quartosReservados > 0 && (
                <button
                  onClick={() => setFiltroStatus('RESERVADO')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    filtroStatus === 'RESERVADO'
                      ? 'bg-[#2563eb] text-white shadow-xs'
                      : 'bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe]'
                  }`}
                >
                  Reservados ({quartosReservados})
                </button>
              )}
            </div>

            {/* Botão Ação Nova Reserva */}
            <button
              onClick={() => {
                setQuartoParaReserva(null);
                setModalNovaReservaAberto(true);
              }}
              className="flex items-center gap-1.5 bg-[#245437] hover:bg-[#1b432b] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ml-auto sm:ml-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova Reserva</span>
            </button>
          </div>
        </div>

        {/* Grade Responsiva para os 13 Quartos: B1, B2, B3, B4 - C2, C3, C4 - D1, D2, D3, D4, D5, D6 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quartosFiltrados.map((quarto) => (
            <CardQuarto
              key={quarto.quartoid}
              quarto={quarto}
              aoClicar={handleAbrirDetalhesQuarto}
            />
          ))}
        </div>
      </div>

      {/* 3. ATIVIDADES DO DIA: CHECK-INS E CHECK-OUTS EM ANDAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Chegadas Previstas */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#d97706]" />
              <h3 className="font-['Manrope'] text-base font-bold text-[#111827]">
                Check-ins do Dia ({checkinsHoje.length})
              </h3>
            </div>
            <button
              onClick={() => navegarPara('checkin')}
              className="text-xs font-bold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-80">
            {checkinsHoje.length === 0 ? (
              <p className="text-xs text-[#6b7280] text-center py-6">
                Nenhum check-in pendente para hoje.
              </p>
            ) : (
              checkinsHoje.map((res) => (
                <div
                  key={res.reservaid}
                  className="p-3.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#245437] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Manrope'] font-bold text-sm text-[#111827]">
                        {res.hospedenome}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534]">
                        {res.codigo}
                      </span>
                    </div>
                    <p className="text-xs text-[#4b5563] mt-0.5">
                      Quarto {res.quartonumero} • {res.adultos} Ad / {res.criancas} Cri
                    </p>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                      Chegada prevista: {res.horarioprevistochegada || '14:00'} • Saldo:{' '}
                      <span className={res.saldo > 0 ? 'text-[#dc2626] font-bold' : 'text-[#166534] font-bold'}>
                        {formatarMoeda(res.saldo)}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleCheckinRapido(res.reservaid)}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold bg-[#245437] hover:bg-[#1b432b] text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Realizar Check-in
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel de Saídas Previstas */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-[#dc2626]" />
              <h3 className="font-['Manrope'] text-base font-bold text-[#111827]">
                Check-outs do Dia ({checkoutsHoje.length})
              </h3>
            </div>
            <button
              onClick={() => navegarPara('checkout')}
              className="text-xs font-bold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-80">
            {checkoutsHoje.length === 0 ? (
              <p className="text-xs text-[#6b7280] text-center py-6">
                Nenhum check-out pendente para hoje.
              </p>
            ) : (
              checkoutsHoje.map((res) => (
                <div
                  key={res.reservaid}
                  className="p-3.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#dc2626] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Manrope'] font-bold text-sm text-[#111827]">
                        {res.hospedenome}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#991b1b]">
                        {res.codigo}
                      </span>
                    </div>
                    <p className="text-xs text-[#4b5563] mt-0.5">
                      Quarto {res.quartonumero} • {res.quartocategoria}
                    </p>
                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                      Horário limite: {res.horarioprevistosaida || '12:00'} • Saldo Pendente:{' '}
                      <span className={res.saldo > 0 ? 'text-[#dc2626] font-bold' : 'text-[#166534] font-bold'}>
                        {formatarMoeda(res.saldo)}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleCheckoutRapido(res.reservaid)}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Finalizar Check-out
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modais Integrados */}
      <ModalDetalhesQuarto
        quarto={quartoSelecionado}
        aberto={modalDetalhesAberto}
        onFechar={() => {
          setModalDetalhesAberto(false);
          setQuartoSelecionado(null);
        }}
        onNovaReservaParaQuarto={handleNovaReservaParaQuarto}
      />

      <ModalNovaReserva
        aberto={modalNovaReservaAberto}
        onFechar={() => {
          setModalNovaReservaAberto(false);
          setQuartoParaReserva(null);
        }}
        quartoPreSelecionado={quartoParaReserva}
      />
    </div>
  );
};
