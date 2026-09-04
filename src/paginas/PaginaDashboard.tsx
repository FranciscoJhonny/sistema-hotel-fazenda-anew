import {
  ArrowRight,
  Bed,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  PlusCircle,
  Search
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CardQuarto } from '../componentes/quartos/CardQuarto';
import { ModalDetalhesQuarto } from '../componentes/quartos/ModalDetalhesQuarto';
import { ModalNovaReserva } from '../componentes/reservas/ModalNovaReserva';
import { useHotel } from '../contextos/ContextoHotel';
import { Quarto, Reserva } from '../tipos';
import { calcularStatusQuarto } from '../utilitarios/calculoSituacaoQuarto';

type QuartoEnriquecido = Quarto & {
  statusCalculado: string;
  reservaAtiva: Reserva | null;
  proximaReserva: Reserva | null;
};

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

  // Campo de data para consulta
  const [dataConsulta, setDataConsulta] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });

  // CÁLCULO DINÂMICO DOS QUARTOS BASEADO NAS RESERVAS E DATA
  const quartosEnriquecidos: QuartoEnriquecido[] = useMemo(() => {
    if (!quartos || !reservas) return [];

    return quartos.map((quarto: Quarto) => {
      const reservasDoQuarto = reservas.filter(r =>
        String(r.quartoid) === String(quarto.quartoid) &&
        r.statusreserva !== 'CANCELADA' &&
        r.statusreserva !== 'FINALIZADA'
      );

      // ✅ AQUI USA A DATA CONSULTA PARA CALCULAR O STATUS
      const { status, reservaAtiva, proximaReserva } = calcularStatusQuarto(
        reservasDoQuarto,
        new Date(dataConsulta) // ← Data selecionada pelo usuário
      );

      return { ...quarto, statusCalculado: status, reservaAtiva, proximaReserva };
    });
  }, [quartos, reservas, dataConsulta]);

  // Métricas baseadas no status CALCULADO
  const totalQuartos = quartosEnriquecidos.length || 0;
  const quartosOcupados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'OCUPADO').length;
  const quartosReservados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'RESERVADO').length;
  const quartosAguardando = quartosEnriquecidos.filter((q) => q.statusCalculado === 'AGUARDANDO_CHECKIN').length;
  const quartosDisponiveis = quartosEnriquecidos.filter((q) => q.statusCalculado === 'DISPONIVEL').length;
  const quartosManutencao = quartosEnriquecidos.filter((q) => q.statusCalculado === 'MANUTENCAO').length;

  const taxaOcupacao = totalQuartos > 0 ? Math.round((quartosOcupados / totalQuartos) * 100) : 0;
  const taxaDisponiveis = totalQuartos > 0 ? Math.round((quartosDisponiveis / totalQuartos) * 100) : 0;

  // Reservas de hoje (baseado na dataConsulta)
  const checkinsHoje = reservas.filter((r) => {
    const dataEntrada = new Date(r.dataentrada).toISOString().split('T')[0];
    return r.statusreserva === 'AGUARDANDO_CHECKIN' && dataEntrada === dataConsulta;
  });

  const checkoutsHoje = reservas.filter((r) => {
    const dataSaida = new Date(r.datasaida).toISOString().split('T')[0];
    return r.statusreserva === 'HOSPEDADO' && dataSaida === dataConsulta;
  });

  // Total de hóspedes no local
  const hospedesPresentes = reservas
    .filter((r) => r.statusreserva === 'HOSPEDADO')
    .reduce((acc, curr) => acc + (curr.adultos || 0) + (curr.criancas || 0), 0);

  // Filtragem dos quartos baseada no status CALCULADO
  const quartosFiltrados = quartosEnriquecidos.filter((q) => {
    if (filtroStatus === 'TODOS') return true;
    return q.statusCalculado === filtroStatus;
  });

  // ✅ CORREÇÃO AQUI: Mudado de 'QuartoEnriquecido' para 'Quarto'
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


  const formatarDataParaInput = (data: string) => {
    if (!data) return '';
    // A data vem no formato "YYYY-MM-DD" do input
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  // Adicione no topo do arquivo ou em um utilitário
  const formatarDataSemFuso = (data: string): string => {
    if (!data) return '';
    // Se já está no formato brasileiro (contém /)
    if (data.includes('/')) return data;
    // Se está no formato ISO (YYYY-MM-DD)
    const [ano, mes, dia] = data.split('-');
    if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
    return data;
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">


      {/* 1. SEÇÃO DE CARDS DE MÉTRICAS OPERACIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ocupação Atual */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">Ocupação</p>
              <span className="p-1.5 bg-[#f0fdf4] text-[#166534] rounded-lg">
                <Bed className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">{taxaOcupacao}%</h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">{quartosOcupados} de {totalQuartos} Ocupados</p>
          </div>
          <div className="mt-4">
            <div className="w-full bg-[#f3f4f6] h-2 rounded-full overflow-hidden">
              <div className="bg-[#245437] h-full rounded-full transition-all duration-500" style={{ width: `${taxaOcupacao}%` }} />
            </div>
          </div>
        </div>

        {/* Card 2: Check-ins */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">Check-ins</p>
              <span className="p-1.5 bg-[#fef3c7] text-[#92400e] rounded-lg">
                <CalendarCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">{checkinsHoje.length}</h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">Previstos</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f3f4f6]">
            <button onClick={() => navegarPara('checkin')} className="text-xs font-semibold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer">
              Ver <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Check-outs */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">Check-outs</p>
              <span className="p-1.5 bg-[#fee2e2] text-[#991b1b] rounded-lg">
                <CalendarX className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">{checkoutsHoje.length}</h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">Previstos</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f3f4f6]">
            <button onClick={() => navegarPara('checkout')} className="text-xs font-semibold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer">
              Ver <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Disponíveis */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="font-['Inter'] text-xs font-semibold text-[#6b7280]">Disponíveis</p>
              <span className="p-1.5 bg-[#f0fdf4] text-[#166534] rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#111827]">{quartosDisponiveis}</h3>
            </div>
            <p className="text-xs text-[#6b7280] mt-1 font-medium">Livres</p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f3f4f6] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-full">
              {taxaDisponiveis}%
            </span>
            <span className="text-xs text-[#6b7280]">{hospedesPresentes} hóspedes</span>
          </div>
        </div>
      </div>
      {/* ✅ CAMPO DE DATA VISÍVEL AQUI */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#245437]" />
            <label className="text-sm font-semibold text-gray-700">
              Consultar disponibilidade para:
            </label>
          </div>
          <div className="relative flex-1 max-w-xs">
            <input
              type="date"
              value={dataConsulta}
              onChange={(e) => setDataConsulta(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:border-[#245437]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="text-xs text-gray-500">
            Data selecionada: <span className="font-semibold text-[#245437]">
              {formatarDataSemFuso(dataConsulta)}
            </span>
          </div>
        </div>
      </div>
      {/* 2. MAPA OPERACIONAL DOS QUARTOS */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#f3f4f6]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-['Manrope'] text-xl font-bold text-[#111827]">Status dos Quartos</h2>
              <span className="text-xs font-bold text-[#245437] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full border border-[#bbf7d0]">
                {totalQuartos} Quartos
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-1">
              Consulta: {formatarDataParaInput(dataConsulta)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button onClick={() => setFiltroStatus('TODOS')} className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'TODOS' ? 'bg-[#245437] text-white shadow-xs' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}>
                Todos ({totalQuartos})
              </button>
              <button onClick={() => setFiltroStatus('DISPONIVEL')} className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'DISPONIVEL' ? 'bg-[#166534] text-white shadow-xs' : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'}`}>
                Disponíveis ({quartosDisponiveis})
              </button>
              <button onClick={() => setFiltroStatus('OCUPADO')} className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'OCUPADO' ? 'bg-[#dc2626] text-white shadow-xs' : 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'}`}>
                Ocupados ({quartosOcupados})
              </button>
              <button onClick={() => setFiltroStatus('AGUARDANDO_CHECKIN')} className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'AGUARDANDO_CHECKIN' ? 'bg-[#d97706] text-white shadow-xs' : 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'}`}>
                Aguardando ({quartosAguardando})
              </button>
              {quartosReservados > 0 && (
                <button onClick={() => setFiltroStatus('RESERVADO')} className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'RESERVADO' ? 'bg-[#2563eb] text-white shadow-xs' : 'bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe]'}`}>
                  Reservados ({quartosReservados})
                </button>
              )}
            </div>

            <button onClick={() => { setQuartoParaReserva(null); setModalNovaReservaAberto(true); }} className="flex items-center gap-1.5 bg-[#245437] hover:bg-[#1b432b] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ml-auto sm:ml-2">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova Reserva</span>
            </button>
          </div>
        </div>

        {/* Grade de Quartos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quartosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Bed className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum quarto encontrado com este filtro.</p>
            </div>
          ) : (
            quartosFiltrados.map((quarto) => (
              <CardQuarto
                key={quarto.quartoid}
                quarto={quarto}
                aoClicar={handleAbrirDetalhesQuarto}
              />
            ))
          )}
        </div>
      </div>

      {/* 3. ATIVIDADES DO DIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Chegadas */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#d97706]" />
              <h3 className="font-['Manrope'] text-base font-bold text-[#111827]">Check-ins ({checkinsHoje.length})</h3>
            </div>
            <button onClick={() => navegarPara('checkin')} className="text-xs font-bold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-80">
            {checkinsHoje.length === 0 ? (
              <p className="text-xs text-[#6b7280] text-center py-6">Nenhum check-in para esta data.</p>
            ) : (
              checkinsHoje.map((res) => (
                <div key={res.reservaid} className="p-3.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#245437] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Manrope'] font-bold text-sm text-[#111827]">{res.hospedenome}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534]">{res.codigo}</span>
                    </div>
                    <p className="text-xs text-[#4b5563] mt-0.5">Quarto {res.quartonumero} • {res.adultos} Ad / {res.criancas} Cri</p>
                  </div>
                  <button onClick={() => handleCheckinRapido(res.reservaid)} className="shrink-0 px-3 py-1.5 text-xs font-bold bg-[#245437] hover:bg-[#1b432b] text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Check-in
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel de Saídas */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-[#dc2626]" />
              <h3 className="font-['Manrope'] text-base font-bold text-[#111827]">Check-outs ({checkoutsHoje.length})</h3>
            </div>
            <button onClick={() => navegarPara('checkout')} className="text-xs font-bold text-[#245437] hover:underline flex items-center gap-1 cursor-pointer">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-80">
            {checkoutsHoje.length === 0 ? (
              <p className="text-xs text-[#6b7280] text-center py-6">Nenhum check-out para esta data.</p>
            ) : (
              checkoutsHoje.map((res) => (
                <div key={res.reservaid} className="p-3.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#dc2626] transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Manrope'] font-bold text-sm text-[#111827]">{res.hospedenome}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#991b1b]">{res.codigo}</span>
                    </div>
                    <p className="text-xs text-[#4b5563] mt-0.5">Quarto {res.quartonumero}</p>
                  </div>
                  <button onClick={() => handleCheckoutRapido(res.reservaid)} className="shrink-0 px-3 py-1.5 text-xs font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Check-out
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalDetalhesQuarto
        quarto={quartoSelecionado}
        aberto={modalDetalhesAberto}
        onFechar={() => { setModalDetalhesAberto(false); setQuartoSelecionado(null); }}
        onNovaReservaParaQuarto={handleNovaReservaParaQuarto}
      />

      <ModalNovaReserva
        aberto={modalNovaReservaAberto}
        onFechar={() => { setModalNovaReservaAberto(false); setQuartoParaReserva(null); }}
        quartoPreSelecionado={quartoParaReserva}
      />
    </div>
  );
};