import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Plus,
  Search,
  Wrench,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { ModalReservaRapida } from '../componentes/mapa-reservas/ModalReservaRapida';
import { Quarto, Reserva, Hospede } from '../tipos';
import { formatarData } from '../utilitarios/formatadores';

const periodoInicialPadrao = new Date('2026-08-27T00:00:00');

const addDias = (data: Date, dias: number) => {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
};
const isDataPassada = (data: string) => {
  const hoje = new Date().toISOString().slice(0, 10);
  return data < hoje;
};
const formatarDiaSemana = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).toUpperCase();

const formatarMesCurto = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).toUpperCase();

const datasSobrepostas = (reserva: any, inicioPeriodo: Date, fimPeriodo: Date) => {
  const inicioReserva = new Date(`${reserva.dataentrada}T00:00:00`);
  const fimReserva = addDias(new Date(`${reserva.datasaida}T00:00:00`), 1);
  return inicioReserva < fimPeriodo && fimReserva > inicioPeriodo;
};

export const PaginaMapaReservas: React.FC = () => {
  const { quartos, reservas, hospedes, navegarPara } = useHotel();
  const [periodoInicio, setPeriodoInicio] = useState<Date>(periodoInicialPadrao);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'CONFIRMADA' | 'PENDENTES' | 'OCUPADOS' | 'DAY_USE'>('TODOS');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [quartoSelecionado, setQuartoSelecionado] = useState<Quarto | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);

  const numeroDias = 12;
  const datasVisiveis = useMemo(
    () => Array.from({ length: numeroDias }, (_, index) => addDias(periodoInicio, index)),
    [periodoInicio]
  );

  // Criar mapa de hóspedes: ID → nome
  const hospedeMap = useMemo(() => {
    const map = new Map<number, Hospede>();
    hospedes.forEach((h) => {
      map.set(Number(h.hospedeid), h);
    });
    return map;
  }, [hospedes]);

  // AGRUPAR quartos por bloco usando o campo 'bloco' do banco de dados
  const quartosPorBloco = useMemo(() => {
    const blocosMap: Record<string, Quarto[]> = {
      'B': [],
      'C': [],
      'D': [],
    };

    quartos.forEach((quarto) => {
      if (quarto.ativo === false) return;

      const bloco = quarto.bloco || 'B';
      if (blocosMap[bloco]) {
        blocosMap[bloco].push(quarto);
      }
    });

    Object.keys(blocosMap).forEach((bloco) => {
      blocosMap[bloco].sort((a, b) => {
        const codA = a.codigoidentificador || a.numero;
        const codB = b.codigoidentificador || b.numero;
        return codA.localeCompare(codB);
      });
    });

    return blocosMap;
  }, [quartos]);

  // Filtrar e enriquecer reservas
  const reservasVisiveis = useMemo(() => {
    return reservas.filter((reserva) => {
      // Filtrar apenas reservas ativas e não canceladas/finalizadas
      if (reserva.statusreserva === 'CANCELADA' || reserva.statusreserva === 'FINALIZADA') {
        return false;
      }

      const dentroPeriodo = datasSobrepostas(reserva, periodoInicio, addDias(periodoInicio, numeroDias));
      if (!dentroPeriodo) return false;

      if (filtroStatus === 'CONFIRMADA' && reserva.statusreserva !== 'CONFIRMADA') return false;
      if (
        filtroStatus === 'PENDENTES' &&
        reserva.statusreserva !== 'AGUARDANDO_CHECKIN' &&
        reserva.statuspagamento !== 'PENDENTE'
      ) {
        return false;
      }
      if (filtroStatus === 'OCUPADOS' && reserva.statusreserva !== 'HOSPEDADO') return false;
      if (filtroStatus === 'DAY_USE' && reserva.tipoatendimento !== 'DAY_USE') return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const hospede = hospedeMap.get(Number(reserva.hospedeid));
        const quarto = quartos.find(q => Number(q.quartoid) === Number(reserva.quartoid));
        const nomeHospede = hospede?.nomecompleto || '';
        const numeroQuarto = quarto?.codigoidentificador || '';

        return (
          nomeHospede.toLowerCase().includes(termo) ||
          numeroQuarto.toLowerCase().includes(termo) ||
          (reserva.codigo || '').toLowerCase().includes(termo)
        );
      }

      return true;
    }).map((reserva) => {
      const hospede = hospedeMap.get(Number(reserva.hospedeid));
      return {
        ...reserva,
        hospedenome: hospede?.nomecompleto || `Hóspede ${reserva.hospedeid}`,
      };
    });
  }, [reservas, periodoInicio, numeroDias, filtroStatus, busca, hospedeMap, quartos]);

  const ocupacao = useMemo(() => {
    if (reservasVisiveis.length === 0 || quartos.length === 0) return 0;
    const totalDias = numeroDias * quartos.length;
    let diasOcupados = 0;

    reservasVisiveis.forEach((res) => {
      const inicio = new Date(`${res.dataentrada}T00:00:00`);
      const fim = new Date(`${res.datasaida}T00:00:00`);
      const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      diasOcupados += duracao;
    });

    return Math.min(100, Math.round((diasOcupados / totalDias) * 100));
  }, [reservasVisiveis, numeroDias, quartos.length]);

  const avancarPeriodo = () => setPeriodoInicio((prev) => addDias(prev, 7));
  const retrocederPeriodo = () => setPeriodoInicio((prev) => addDias(prev, -7));

  // Debug
  useEffect(() => {
    console.log(' Total quartos:', quartos.length);
    console.log('📊 Quartos:', quartos.map(q => ({ id: q.quartoid, numero: q.numero, codigo: q.codigoidentificador, bloco: q.bloco, ativo: q.ativo })));
    console.log(' Total reservas:', reservas.length);
    console.log('📊 Reservas visíveis:', reservasVisiveis.length);
    console.log('📊 Período:', periodoInicio.toISOString().slice(0, 10), 'a', addDias(periodoInicio, numeroDias).toISOString().slice(0, 10));
    console.log('📊 Reservas visíveis:', reservasVisiveis.map(r => ({
      id: r.reservaid,
      quartoid: r.quartoid,
      hospede: r.hospedenome,
      entrada: r.dataentrada,
      saida: r.datasaida,
      status: r.statusreserva
    })));
  }, [quartos, reservas, reservasVisiveis, periodoInicio, numeroDias]);

  const renderizarLinhaQuarto = (quarto: Quarto) => {
    const reservasDoQuarto = reservasVisiveis.filter((reserva) =>
      Number(reserva.quartoid) === Number(quarto.quartoid)
    );

    return (
      <div key={quarto.quartoid} className="relative col-span-full h-12 border-b border-[#e5e7eb]">
        <div className="grid h-full" style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}>
          <div className="sticky left-0 z-10 flex items-center justify-between gap-2 border-r border-[#e5e7eb] bg-white px-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff69b4]" />
              <span className="text-sm font-bold text-[#191c1d]">{quarto.codigoidentificador || quarto.numero}</span>
            </div>
            <span className="text-[10px] font-semibold text-[#717971]">{quarto.capacidadeadultos} ad + {quarto.capacidadecriancas} cri</span>
          </div>

          {datasVisiveis.map((data) => {
            const dataIso = data.toISOString().slice(0, 10);
            const reservaAtiva = reservasDoQuarto.find((reserva) => (
              dataIso >= reserva.dataentrada && dataIso <= reserva.datasaida
            ));

            return (
              <button
                key={`${quarto.quartoid}-${dataIso}`}
                type="button"
                disabled={Boolean(reservaAtiva) || isDataPassada(dataIso)}
                onClick={() => {
                  if (reservaAtiva) return;
                  if (isDataPassada(dataIso)) return; // Bloqueia data passada
                  setQuartoSelecionado(quarto);
                  setDataSelecionada(dataIso);
                  setModalAberto(true);
                }}
                className={`border-r border-[#e5e7eb] bg-[#f8f9fa] transition-colors 
                            ${reservaAtiva?.statusreserva === 'HOSPEDADO' ? 'bg-[#053d1e]' : ''}
                            ${isDataPassada(dataIso) ? 'opacity-30 cursor-not-allowed hover:bg-[#f8f9fa]' : 'hover:bg-[#e6f4ea]'}
                            `}
              />
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-[180px] right-0 z-20">
          {reservasDoQuarto.map((reserva) => {
            const periodoInicioNormalizado = new Date(
              periodoInicio.getFullYear(),
              periodoInicio.getMonth(),
              periodoInicio.getDate()
            );
            const inicio = new Date(`${reserva.dataentrada}T00:00:00`);
            const fim = addDias(new Date(`${reserva.datasaida}T00:00:00`), 1);
            const inicioVisivel = inicio < periodoInicioNormalizado ? periodoInicioNormalizado : inicio;
            const fimPeriodo = addDias(periodoInicioNormalizado, numeroDias);
            const fimVisivel = fim > fimPeriodo ? fimPeriodo : fim;
            const startOffset = Math.max(0, Math.floor((inicioVisivel.getTime() - periodoInicioNormalizado.getTime()) / (1000 * 60 * 60 * 24)));
            const duration = Math.max(1, Math.ceil((fimVisivel.getTime() - inicioVisivel.getTime()) / (1000 * 60 * 60 * 24)));

            const mappedStatusColor = {
              CONFIRMADA: 'bg-[#00A8E8]',
              AGUARDANDO_CHECKIN: 'bg-[#FF6B6B]',
              HOSPEDADO: 'bg-[#053d1e]',
              FINALIZADA: 'bg-[#d1d5db]',
              CANCELADA: 'bg-[#9ca3af]',
            };

            return (
              <button
                key={String(reserva.reservaid)}
                type="button"
                disabled
                onClick={() => {
                  setQuartoSelecionado(quarto);
                  setDataSelecionada(reserva.dataentrada);
                  setModalAberto(true);
                }}
                aria-label={`Reserva ${reserva.codigo || ''} ocupando o quarto ${quarto.codigoidentificador || quarto.numero}`}
                className={`pointer-events-auto absolute top-1.5 flex h-8 items-center justify-between overflow-hidden rounded-md border border-white/70 px-2 text-[10px] font-semibold text-white shadow-sm disabled:cursor-not-allowed ${mappedStatusColor[reserva.statusreserva] || 'bg-[#00A8E8]'}`}
                style={{ left: `${startOffset * 80}px`, width: `${Math.max(duration * 80 - 4, 32)}px` }}
              >
                <span className="flex min-w-0 items-center gap-1 truncate">
                  {reserva.statusreserva === 'CONFIRMADA' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : reserva.statusreserva === 'AGUARDANDO_CHECKIN' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : reserva.statusreserva === 'HOSPEDADO' ? <Clock3 className="h-3.5 w-3.5 shrink-0" /> : <Wrench className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{reserva.hospedenome}</span>
                </span>
                <span className="ml-1 shrink-0 rounded bg-white/10 px-1 py-0.5 text-[9px]">{reserva.statusreserva === 'HOSPEDADO' ? 'Check-in' : reserva.statusreserva === 'AGUARDANDO_CHECKIN' ? 'Pendente' : `${duration} noites`}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 rounded-2xl bg-[#f8f9fa]">
      {/* ... (mesmo JSX de antes, mantenha igual) ... */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navegarPara('reservas')}
              className="rounded-xl border border-[#c1c9bf] bg-white p-2 text-[#191c1d] hover:bg-[#f3f4f6]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">Mapa de Reservas</h1>
              <p className="text-xs text-[#717971]">Visão operacional do hotel para o período selecionado</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] p-1.5">
              <button type="button" onClick={retrocederPeriodo} className="rounded-lg p-2 hover:bg-white">
                <ChevronLeft className="h-4 w-4 text-[#191c1d]" />
              </button>
              <div className="min-w-[240px] text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#717971]">MÊS DE AGOSTO / SETEMBRO 2026</div>
                <div className="text-sm font-bold text-[#191c1d]">
                  {formatarData(periodoInicio.toISOString().slice(0, 10))} à {formatarData(addDias(periodoInicio, numeroDias - 1).toISOString().slice(0, 10))}
                </div>
              </div>
              <button type="button" onClick={avancarPeriodo} className="rounded-lg p-2 hover:bg-white">
                <ChevronRight className="h-4 w-4 text-[#191c1d]" />
              </button>
            </div>

            <div className="rounded-full border border-[#c1c9bf] bg-[#e6f4ea] px-3 py-1.5 text-sm font-bold text-[#053d1e]">
              Ocupação do período: {ocupacao}%
            </div>

            <button
              type="button"
              onClick={() => {
                setQuartoSelecionado(null);
                setDataSelecionada(periodoInicio.toISOString().slice(0, 10));
                setModalAberto(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#053d1e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#225533]"
            >
              <Plus className="h-4 w-4" />
              Adicionar Reserva
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717971]" />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar reservas, hóspedes, quartos..."
              className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] py-2 pl-9 pr-3 text-sm text-[#191c1d] placeholder:text-[#717971] focus:border-[#053d1e] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Todos', value: 'TODOS' },
              { label: 'Confirmados', value: 'CONFIRMADA' },
              { label: 'Pendentes', value: 'PENDENTES' },
              { label: 'Ocupados', value: 'OCUPADOS' },
              { label: 'Day Use', value: 'DAY_USE' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFiltroStatus(item.value as any)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${filtroStatus === item.value
                  ? 'border-[#053d1e] bg-[#053d1e] text-white shadow-sm'
                  : 'border-[#c1c9bf] bg-white text-[#191c1d] hover:bg-[#f8f9fa]'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#c1c9bf] bg-white shadow-sm">
        <div className="min-w-[1200px]">
          <div className="grid" style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}>
            <div className="flex items-center justify-between border-r border-b border-[#c1c9bf] bg-[#f8f9fa] px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-[#191c1d]">
              <span>ACOMODAÇÃO</span>
              <span className="rounded-full bg-[#e6f4ea] px-1.5 py-0.5 text-[9px] font-bold text-[#053d1e]">{quartos.length} Quartos</span>
            </div>

            {datasVisiveis.map((data) => {
              const fimSemana = [0, 6].includes(data.getDay());
              return (
                <div
                  key={data.toISOString()}
                  className={`border-b border-r border-[#e5e7eb] px-2 py-3 text-center text-[10px] font-bold uppercase ${fimSemana ? 'bg-[#f5f7f6] text-[#053d1e]' : 'bg-white text-[#191c1d]'
                    }`}
                >
                  <div>{formatarDiaSemana(data)}</div>
                  <div className="mt-1 text-base font-black">{data.getDate()}</div>
                  <div className="text-[9px] font-semibold opacity-70">{formatarMesCurto(data)}</div>
                </div>
              );
            })}

            {/* BLOCO B */}
            <div className="col-span-full border-b border-[#e5e7eb] bg-[#FFE4E1] px-3 py-2 text-xs font-bold text-[#191c1d]">
              <span className="uppercase tracking-wide">BLOCO B</span>
              <span className="ml-2 font-medium text-[#717971]">| Suítes Standard Jardim</span>
            </div>
            {quartosPorBloco['B'].map(renderizarLinhaQuarto)}

            {/* BLOCO C */}
            <div className="col-span-full border-b border-[#e5e7eb] bg-[#FFE4E1] px-3 py-2 text-xs font-bold text-[#191c1d]">
              <span className="uppercase tracking-wide">BLOCO C</span>
              <span className="ml-2 font-medium text-[#717971]">| Chalés Rústicos Família</span>
            </div>
            {quartosPorBloco['C'].map(renderizarLinhaQuarto)}

            {/* BLOCO D */}
            <div className="col-span-full border-b border-[#e5e7eb] bg-[#FFE4E1] px-3 py-2 text-xs font-bold text-[#191c1d]">
              <span className="uppercase tracking-wide">BLOCO D</span>
              <span className="ml-2 font-medium text-[#717971]">| Suítes Master Vista Panorâmica</span>
            </div>
            {quartosPorBloco['D'].map(renderizarLinhaQuarto)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#c1c9bf] bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-[#191c1d]">
          <span className="font-bold uppercase text-[#191c1d]">Legenda:</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#00A8E8]" /> Confirmada</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#FF6B6B]" /> Pagamento Pendente</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#FFE66D]" /> Pré-reserva</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#053d1e]" /> Check-in Feito</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#4A5568]" /> Manutenção</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#053d1e]">
              <CalendarDays className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#191c1d]">Entradas Hoje</span>
            </div>
            <span className="rounded-full bg-[#e6f4ea] px-2 py-1 text-[10px] font-bold text-[#053d1e]">100% Pontual</span>
          </div>
          <div className="mt-3 text-2xl font-black text-[#191c1d]">4 Check-ins</div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#053d1e]">
              <ChevronRight className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#191c1d]">Saídas Previstas</span>
            </div>
            <span className="rounded-full bg-[#dfeeff] px-2 py-1 text-[10px] font-bold text-[#1e3a8a]">2 Realizados</span>
          </div>
          <div className="mt-3 text-2xl font-black text-[#191c1d]">3 Check-outs</div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#f472b6]">
              <CircleDashed className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#191c1d]">Governança</span>
            </div>
            <span className="rounded-full bg-[#fff3cd] px-2 py-1 text-[10px] font-bold text-[#7c5400]">Atualizado</span>
          </div>
          <div className="mt-3 text-2xl font-black text-[#191c1d]">11 Prontos / 2 Em Limpeza</div>
        </div>
      </div>      

      <ModalReservaRapida
        aberto={modalAberto}
        quarto={quartoSelecionado}
        dataSelecionada={dataSelecionada}
        onFechar={() => {
          setModalAberto(false);
          setQuartoSelecionado(null);
          setDataSelecionada(null);
        }}
      />
    </div>
  );
};