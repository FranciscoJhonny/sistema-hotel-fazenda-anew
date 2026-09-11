import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Search,
  Wrench,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { ModalReservaRapida } from '../componentes/mapa-reservas/ModalReservaRapida';
import { Quarto, Hospede } from '../tipos';
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

const coresStatusReserva: Record<string, string> = {
  PRE_RESERVA: 'bg-[#F4C542] text-[#424242]',
  RESERVADO: 'bg-[#2196F3] text-white',
  HOSPEDADO: 'bg-[#4CAF50] text-white',
  CONCLUIDA: 'bg-[#BDBDBD] text-[#424242]',
  CANCELADA: 'bg-[#E53935] text-white',
};

const nomesStatusReserva: Record<string, string> = {
  PRE_RESERVA: 'Pré-reserva',
  RESERVADO: 'Reservado',
  HOSPEDADO: 'Hospedado',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const PaginaMapaReservas: React.FC = () => {
  const { quartos, reservas, hospedes } = useHotel();
  const [periodoInicio, setPeriodoInicio] = useState<Date>(periodoInicialPadrao);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'PRE_RESERVA' | 'RESERVADO' | 'HOSPEDADO' | 'CONCLUIDA' | 'CANCELADA' | 'DAY_USE'>('TODOS');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [quartoSelecionado, setQuartoSelecionado] = useState<Quarto | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

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

  // 🔥 DATA ATUAL DO SISTEMA
  const dataAtual = new Date().toISOString().slice(0, 10);

  // 🔥 CALCULAR CHECK-INS DE HOJE (data atual)
  const checkinsHoje = useMemo(() => {
    return reservas.filter((reserva) => {
      // Reservas que têm data de entrada igual à data atual
      return reserva.dataentrada === dataAtual &&
        reserva.statusreserva !== 'CANCELADA' &&
        reserva.statusreserva !== 'CONCLUIDA';
    }).map((reserva) => {
      const hospede = hospedeMap.get(Number(reserva.hospedeid));
      return {
        ...reserva,
        hospedenome: hospede?.nomecompleto || `Hóspede ${reserva.hospedeid}`,
      };
    });
  }, [reservas, dataAtual, hospedeMap]);

  // 🔥 CALCULAR CHECK-OUTS DE HOJE
  const checkoutsHoje = useMemo(() => {
    return reservas.filter((reserva) => {
      // Reservas que têm data de saída igual à data atual E estão hospedados
      return reserva.datasaida === dataAtual &&
        reserva.statusreserva === 'HOSPEDADO';
    }).map((reserva) => {
      const hospede = hospedeMap.get(Number(reserva.hospedeid));
      return {
        ...reserva,
        hospedenome: hospede?.nomecompleto || `Hóspede ${reserva.hospedeid}`,
      };
    });
  }, [reservas, dataAtual, hospedeMap]);

  // 🔥 CALCULAR QUARTOS EM LIMPEZA (OCUPADOS COM CHECK-OUT HOJE)
  const quartosEmLimpeza = useMemo(() => {
    const checkoutsHojeIds = checkoutsHoje.map(r => r.quartoid);
    return quartos.filter(q =>
      checkoutsHojeIds.includes(q.quartoid) &&
      q.status === 'OCUPADO'
    );
  }, [quartos, checkoutsHoje]);

  // 🔥 CALCULAR QUARTOS PRONTOS (DISPONÍVEIS E NÃO EM MANUTENÇÃO)
  const quartosProntos = useMemo(() => {
    return quartos.filter(q =>
      q.status === 'DISPONIVEL' || q.status === 'RESERVADO'
    );
  }, [quartos]);

  // Filtrar e enriquecer reservas
  const reservasVisiveis = useMemo(() => {
    return reservas.filter((reserva) => {
      // Day use não ocupa quarto e não deve aparecer no mapa de hospedagem.
      if (String(reserva.tipoatendimento || '').toUpperCase() === 'DAY_USE') {
        return false;
      }

      const dentroPeriodo = datasSobrepostas(reserva, periodoInicio, addDias(periodoInicio, numeroDias));
      if (!dentroPeriodo) return false;

      if (filtroStatus !== 'TODOS' && filtroStatus !== 'DAY_USE' && reserva.statusreserva !== filtroStatus) return false;
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

  // 🔥 FORMATAR MÊS/ANO DO PERÍODO
  const mesAnoTexto = useMemo(() => {
    const inicio = new Date(periodoInicio);
    const fim = addDias(periodoInicio, numeroDias - 1);
    const mesInicio = inicio.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const mesFim = fim.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const ano = inicio.getFullYear();

    if (mesInicio === mesFim) {
      return `${mesInicio} ${ano}`;
    }
    return `${mesInicio} / ${mesFim} ${ano}`;
  }, [periodoInicio, numeroDias]);

  const renderizarLinhaQuarto = (quarto: Quarto) => {
    const reservasDoQuarto = reservasVisiveis.filter((reserva) =>
      Number(reserva.quartoid) === Number(quarto.quartoid)
    );
    const quartoBloqueado = quarto.status === 'MANUTENCAO';

    return (
      <div key={quarto.quartoid} className="relative col-span-full h-12 border-b border-[#e5e7eb]">
        <div className="grid h-full" style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}>
          <div className="sticky left-0 z-10 flex items-center justify-between gap-2 border-r border-[#e5e7eb] bg-white px-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff69b4]" />
              <span className="text-sm font-bold text-[#191c1d]">{quarto.codigoidentificador || quarto.numero}</span>
            </div>
            <span className={`text-[10px] font-semibold ${quartoBloqueado ? 'text-[#424242]' : 'text-[#717971]'}`}>
              {quartoBloqueado ? 'Bloqueado' : `${quarto.capacidadeadultos} ad + ${quarto.capacidadecriancas} cri`}
            </span>
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
                disabled={quartoBloqueado || Boolean(reservaAtiva) || isDataPassada(dataIso)}
                onClick={() => {
                  if (quartoBloqueado || reservaAtiva) return;
                  if (isDataPassada(dataIso)) return;
                  setQuartoSelecionado(quarto);
                  setDataSelecionada(dataIso);
                  setModalAberto(true);
                }}
                className={`border-r border-[#e5e7eb] bg-[#f8f9fa] transition-colors 
                            ${quartoBloqueado ? 'bg-[#424242]' : reservaAtiva?.statusreserva === 'HOSPEDADO' ? 'bg-[#4CAF50]' : ''}
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
                className={`pointer-events-auto absolute top-1.5 flex h-8 items-center justify-between overflow-hidden rounded-md border border-white/70 px-2 text-[10px] font-semibold shadow-sm disabled:cursor-not-allowed ${coresStatusReserva[reserva.statusreserva] || 'bg-[#9CA3AF] text-white'}`}
                style={{ left: `${startOffset * 80}px`, width: `${Math.max(duration * 80 - 4, 32)}px` }}
              >
                <span className="flex min-w-0 items-center gap-1 truncate">
                  {reserva.statusreserva === 'RESERVADO' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : reserva.statusreserva === 'PRE_RESERVA' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : reserva.statusreserva === 'HOSPEDADO' ? <Clock3 className="h-3.5 w-3.5 shrink-0" /> : <Wrench className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">{reserva.hospedenome}</span>
                </span>
                <span className="ml-1 shrink-0 rounded bg-white/10 px-1 py-0.5 text-[9px]">
                  {nomesStatusReserva[reserva.statusreserva] || 'Status desconhecido'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 rounded-2xl bg-[#f8f9fa]">
      {mensagemSucesso && (
        <div
          role="status"
          className="fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-xl border border-[#86efac] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#166534] shadow-lg"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">Mapa de Reservas</h1>
              <p className="text-xs text-[#717971]">Visão operacional do hotel para o período selecionado</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-[#c1c9bf] bg-[#e6f4ea] px-3 py-1.5 text-sm font-bold text-[#053d1e]">
              Ocupação do período: {ocupacao}%
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] p-1.5">
              <button type="button" onClick={retrocederPeriodo} className="rounded-lg p-2 hover:bg-white">
                <ChevronLeft className="h-4 w-4 text-[#191c1d]" />
              </button>
              <div className="min-w-[240px] text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#717971]">
                  {mesAnoTexto}
                </div>
                <div className="text-sm font-bold text-[#191c1d]">
                  {formatarData(periodoInicio.toISOString().slice(0, 10))} à {formatarData(addDias(periodoInicio, numeroDias - 1).toISOString().slice(0, 10))}
                </div>
              </div>
              <button type="button" onClick={avancarPeriodo} className="rounded-lg p-2 hover:bg-white">
                <ChevronRight className="h-4 w-4 text-[#191c1d]" />
              </button>
            </div>
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
              { label: 'Pré-reserva', value: 'PRE_RESERVA' },
              { label: 'Reservado', value: 'RESERVADO' },
              { label: 'Hospedado', value: 'HOSPEDADO' },
              { label: 'Concluída', value: 'CONCLUIDA' },
              { label: 'Cancelada', value: 'CANCELADA' },
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
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#F4C542]" /> Pré-reserva</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#2196F3]" /> Reservado</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#4CAF50]" /> Hospedado</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#BDBDBD]" /> Concluída</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#E53935]" /> Cancelada</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#424242]" /> Bloqueado</span>
        </div>
      </div>

      {/* 🔥 CARDS DINÂMICOS COM DADOS REAIS */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#053d1e]">
              <CalendarDays className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#191c1d]">Entradas Hoje</span>
            </div>
            <span className="rounded-full bg-[#e6f4ea] px-2 py-1 text-[10px] font-bold text-[#053d1e]">
              {checkinsHoje.length > 0 ? `${checkinsHoje.length} Check-ins` : 'Sem entradas'}
            </span>
          </div>
          <div className="mt-2">
            {checkinsHoje.length > 0 ? (
              <div className="space-y-1">
                {checkinsHoje.slice(0, 3).map((res) => (
                  <div key={res.reservaid} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#191c1d]">{res.hospedenome}</span>
                    <span className="text-[#717971]">Q{res.quartonumero}</span>
                  </div>
                ))}
                {checkinsHoje.length > 3 && (
                  <span className="text-[10px] text-[#717971]">+{checkinsHoje.length - 3} outros</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#717971]">Nenhum check-in agendado para hoje</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#053d1e]">
              <ChevronRight className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#191c1d]">Saídas Previstas</span>
            </div>
            <span className="rounded-full bg-[#dfeeff] px-2 py-1 text-[10px] font-bold text-[#1e3a8a]">
              {checkoutsHoje.length > 0 ? `${checkoutsHoje.length} Saídas` : 'Sem saídas'}
            </span>
          </div>
          <div className="mt-2">
            {checkoutsHoje.length > 0 ? (
              <div className="space-y-1">
                {checkoutsHoje.slice(0, 3).map((res) => (
                  <div key={res.reservaid} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#191c1d]">{res.hospedenome}</span>
                    <span className="text-[#717971]">Q{res.quartonumero}</span>
                  </div>
                ))}
                {checkoutsHoje.length > 3 && (
                  <span className="text-[10px] text-[#717971]">+{checkoutsHoje.length - 3} outros</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#717971]">Nenhum check-out agendado para hoje</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#f472b6]">
              <CircleDashed className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#191c1d]">Governança</span>
            </div>
            <span className="rounded-full bg-[#fff3cd] px-2 py-1 text-[10px] font-bold text-[#7c5400]">
              {checkoutsHoje.length > 0 ? `${quartosEmLimpeza.length} Em limpeza` : 'Limpo'}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#191c1d]">
                <span className="font-bold text-[#053d1e]">{quartosProntos.length}</span> Prontos
              </span>
              <span className="text-xs text-[#191c1d]">
                <span className="font-bold text-[#dc2626]">{quartosEmLimpeza.length}</span> Em limpeza
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[#f3f4f6]">
              <div
                className="h-2 rounded-full bg-[#053d1e] transition-all duration-300"
                style={{ width: `${(quartosProntos.length / Math.max(quartos.length, 1)) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-[#717971]">
              {Math.round((quartosProntos.length / Math.max(quartos.length, 1)) * 100)}% dos quartos disponíveis
            </p>
          </div>
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
        onSucesso={(mensagem) => {
          setMensagemSucesso(mensagem);
          window.setTimeout(() => setMensagemSucesso(null), 4000);
        }}
      />
    </div>
  );
};