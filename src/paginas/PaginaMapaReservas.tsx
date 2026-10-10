import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  Sun,
  Wrench,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { ModalReservaRapida } from '../componentes/mapa-reservas/ModalReservaRapida';
import { ModalAcoesReserva } from '../componentes/mapa-reservas/ModalAcoesReserva';
import { ModalTrocaQuarto } from '../componentes/reservas/ModalTrocaQuarto';
import { Quarto, Hospede, Reserva } from '../tipos';
import { formatarData } from '../utilitarios/formatadores';

const hoje = new Date();
const periodoInicialPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

const addDias = (data: Date, dias: number) => {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
};

const isDataPassada = (_data: string) => {
  return false;
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
  CREDITO: 'bg-amber-600 text-white',
};

const nomesStatusReserva: Record<string, string> = {
  PRE_RESERVA: 'Pré-reserva',
  RESERVADO: 'Reservado',
  HOSPEDADO: 'Hospedado',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
  CREDITO: 'Crédito',
};

export const PaginaMapaReservas: React.FC = () => {
  const { quartos, reservas, hospedes, recarregarDados } = useHotel();

  const quartosFisicos = useMemo(() => {
    return quartos.filter((q) => {
      const cod = String(q.codigoidentificador || '').toUpperCase();
      const num = String(q.numero || '').toUpperCase();
      const cat = String(q.categoria || '').toUpperCase();
      return cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE' && cat !== 'DAY USE';
    });
  }, [quartos]);

  const [periodoInicio, setPeriodoInicio] = useState<Date>(periodoInicialPadrao);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'PRE_RESERVA' | 'RESERVADO' | 'HOSPEDADO' | 'CONCLUIDA' | 'CANCELADA' | 'DAY_USE' | 'CREDITO'>('TODOS');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [quartoSelecionado, setQuartoSelecionado] = useState<Quarto | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [carregandoReserva, setCarregandoReserva] = useState(false);
  const [carregandoAtualizacao, setCarregandoAtualizacao] = useState(false);
  const [hospedeFnrhAviso, setHospedeFnrhAviso] = useState<{ nome: string; dataentrada?: string } | null>(null);
  const [modoDayUse, setModoDayUse] = useState(false);

  // Modais de Ações de Reserva e Troca de Quarto
  const [modalAcoesAberto, setModalAcoesAberto] = useState(false);
  const [reservaSelecionadaAcoes, setReservaSelecionadaAcoes] = useState<Reserva | null>(null);

  const [modalTrocaQuartoAberto, setModalTrocaQuartoAberto] = useState(false);
  const [reservaTrocaQuarto, setReservaTrocaQuarto] = useState<Reserva | null>(null);

  const handleRecarregar = async () => {
    setCarregandoAtualizacao(true);
    try {
      await recarregarDados();
    } finally {
      setCarregandoAtualizacao(false);
    }
  };

  const handleAbrirDayUse = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('fnrh_reserva_preenchimento');
    }
    setQuartoSelecionado(null);
    setDataSelecionada(new Date().toISOString().slice(0, 10));
    setModoDayUse(true);
    setModalAberto(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('fnrh_reserva_preenchimento');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.nomecompleto) {
            setHospedeFnrhAviso({
              nome: parsed.nomecompleto,
              dataentrada: parsed.dataentrada,
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

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

    quartosFisicos.forEach((quarto) => {
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
  }, [quartosFisicos]);

  // DATA ATUAL DO SISTEMA
  const dataAtual = new Date().toISOString().slice(0, 10);

  // CALCULAR CHECK-INS DE HOJE
  const checkinsHoje = useMemo(() => {
    return reservas.filter((reserva) => {
      return reserva.dataentrada === dataAtual &&
        reserva.statusreserva !== 'CANCELADA' &&
        reserva.statusreserva !== 'CREDITO' &&
        reserva.statusreserva !== 'CONCLUIDA';
    }).map((reserva) => {
      const hospede = hospedeMap.get(Number(reserva.hospedeid));
      return {
        ...reserva,
        hospedenome: hospede?.nomecompleto || `Hóspede ${reserva.hospedeid}`,
      };
    });
  }, [reservas, dataAtual, hospedeMap]);

  // CALCULAR CHECK-OUTS DE HOJE
  const checkoutsHoje = useMemo(() => {
    return reservas.filter((reserva) => {
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

  // CALCULAR QUARTOS EM LIMPEZA
  const quartosEmLimpeza = useMemo(() => {
    const checkoutsHojeIds = checkoutsHoje.map(r => r.quartoid);
    return quartosFisicos.filter(q =>
      checkoutsHojeIds.includes(q.quartoid) &&
      q.status === 'OCUPADO'
    );
  }, [quartosFisicos, checkoutsHoje]);

  // CALCULAR QUARTOS PRONTOS
  const quartosProntos = useMemo(() => {
    return quartosFisicos.filter(q =>
      q.status === 'DISPONIVEL' || q.status === 'RESERVADO'
    );
  }, [quartosFisicos]);

  // Filtrar e enriquecer reservas (desconsidera reservas de Day Use, Canceladas e em Crédito no mapa físico)
  const reservasVisiveis = useMemo(() => {
    return reservas.filter((reserva) => {
      if (
        String(reserva.tipoatendimento || '').toUpperCase() === 'DAY_USE' ||
        reserva.statusreserva === 'CANCELADA' ||
        reserva.statusreserva === 'CREDITO'
      ) {
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
    if (reservasVisiveis.length === 0 || quartosFisicos.length === 0) return 0;
    const totalDias = numeroDias * quartosFisicos.length;
    let diasOcupados = 0;

    reservasVisiveis.forEach((res) => {
      const inicio = new Date(`${res.dataentrada}T00:00:00`);
      const fim = new Date(`${res.datasaida}T00:00:00`);
      const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      diasOcupados += duracao;
    });

    return Math.min(100, Math.round((diasOcupados / totalDias) * 100));
  }, [reservasVisiveis, numeroDias, quartosFisicos.length]);

  const avancarPeriodo = () => setPeriodoInicio((prev) => addDias(prev, 7));
  const retrocederPeriodo = () => setPeriodoInicio((prev) => addDias(prev, -7));

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
      <div key={quarto.quartoid} className={`relative col-span-full h-12 border-b ${quartoBloqueado ? 'border-[#d1d5db] bg-[#f3f4f6]' : 'border-[#e5e7eb] bg-white'}`}>
        <div className="grid h-full" style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}>
          <div className={`sticky left-0 z-10 flex items-center justify-between gap-2 border-r px-3 ${
            quartoBloqueado 
              ? 'border-[#d1d5db] bg-[#f3f4f6] text-[#1f2937] shadow-[2px_0_4px_rgba(0,0,0,0.05)]' 
              : 'border-[#e5e7eb] bg-white'
          }`}>
            <div className="flex items-center gap-2">
              {quartoBloqueado ? (
                <Wrench className="h-3.5 w-3.5 text-[#4b5563] shrink-0" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff69b4]" />
              )}
              <span className={`text-sm font-bold ${quartoBloqueado ? 'text-[#374151]' : 'text-[#191c1d]'}`}>
                {quarto.codigoidentificador || quarto.numero}
              </span>
            </div>
            <span className={`text-[10px] font-semibold ${
              quartoBloqueado 
                ? 'rounded bg-[#e5e7eb] px-1.5 py-0.5 font-bold uppercase tracking-wider text-[#374151] border border-[#d1d5db]' 
                : 'text-[#717971]'
            }`}>
              {quartoBloqueado ? 'Manutenção' : `${quarto.quantidadecamascasal ?? 0} casal, ${quarto.quantidadecamassolteiro ?? 0} solteiro`}
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
                  setModoDayUse(false);
                  setQuartoSelecionado(quarto);
                  setDataSelecionada(dataIso);
                  setModalAberto(true);
                }}
                title={quartoBloqueado ? `Quarto ${quarto.numero || quarto.codigoidentificador} em manutenção` : undefined}
                className={`transition-colors ${
                  quartoBloqueado
                    ? 'border-r border-[#d1d5db] bg-[#e5e7eb]/80 text-[#6b7280] cursor-not-allowed'
                    : isDataPassada(dataIso)
                    ? 'border-r border-[#e5e7eb] bg-[#f8f9fa] opacity-30 cursor-not-allowed hover:bg-[#f8f9fa]'
                    : 'border-r border-[#e5e7eb] bg-[#f8f9fa] hover:bg-[#e6f4ea]'
                }`}
              />
            );
          })}
        </div>

        {/* Blocos de Reservas Ativas no Grid */}
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
                onClick={() => {
                  setReservaSelecionadaAcoes(reserva);
                  setModalAcoesAberto(true);
                }}
                aria-label={`Reserva ${reserva.codigo || ''} ocupando o quarto ${quarto.codigoidentificador || quarto.numero}`}
                className={`pointer-events-auto absolute top-1.5 flex h-8 items-center justify-between overflow-hidden rounded-md border border-white/70 px-2 text-[10px] font-semibold shadow-sm cursor-pointer hover:brightness-105 transition-all ${coresStatusReserva[reserva.statusreserva] || 'bg-[#9CA3AF] text-white'}`}
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

      {/* Banner de Aviso de Hóspede Confirmado pelo FNRH */}
      {hospedeFnrhAviso && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-[#053d1e] shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <p className="font-bold text-sm text-[#053d1e]">
                Pré-cadastro de {hospedeFnrhAviso.nome} pronto para alocação de quarto!
              </p>
              <p className="text-[#205235] font-normal mt-0.5">
                Clique sobre o quarto e data desejados no mapa abaixo para concluir a reserva. Os dados do hóspede serão selecionados automaticamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHospedeFnrhAviso(null)}
            className="text-emerald-800 hover:text-emerald-950 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
          >
            Dispensar
          </button>
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
            <button
              type="button"
              onClick={handleAbrirDayUse}
              title="Criar reserva de Day Use (sem vínculo de quarto)"
              className="flex items-center gap-1.5 rounded-full bg-[#053d1e] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#043017] transition-all cursor-pointer shadow-xs"
            >
              <Sun className="h-4 w-4 text-amber-300" />
              <span>+ Criar Day Use</span>
            </button>

            <button
              type="button"
              onClick={handleRecarregar}
              disabled={carregandoAtualizacao}
              className="flex items-center gap-1.5 rounded-full border border-[#c1c9bf] bg-white px-3 py-1.5 text-xs font-semibold text-[#191c1d] hover:bg-[#f3f4f6] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${carregandoAtualizacao ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <div className="flex items-center rounded-full border border-[#c1c9bf] bg-white p-1">
              <button
                type="button"
                onClick={retrocederPeriodo}
                className="rounded-full p-1 text-[#414941] hover:bg-[#f3f4f6] cursor-pointer"
                title="Período anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-bold text-[#191c1d]">{mesAnoTexto}</span>
              <button
                type="button"
                onClick={avancarPeriodo}
                className="rounded-full p-1 text-[#414941] hover:bg-[#f3f4f6] cursor-pointer"
                title="Próximo período"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#717971]" />
            <input
              type="text"
              placeholder="Buscar por hóspede, quarto ou código da reserva..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] py-2 pl-9 pr-4 text-xs font-medium text-[#191c1d] outline-none focus:border-[#053d1e]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['TODOS', 'PRE_RESERVA', 'RESERVADO', 'HOSPEDADO', 'CREDITO', 'CONCLUIDA', 'CANCELADA'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFiltroStatus(status)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  filtroStatus === status
                    ? 'bg-[#053d1e] text-white'
                    : 'bg-[#f8f9fa] text-[#414941] border border-[#c1c9bf] hover:bg-[#e6f4ea]'
                }`}
              >
                {status === 'TODOS' ? 'Todos' : nomesStatusReserva[status] || status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Principal do Mapa de Reservas */}
      <div className="overflow-x-auto rounded-2xl border border-[#c1c9bf] bg-white shadow-sm">
        <div className="min-w-[1140px]">
          {/* Cabeçalho de Datas */}
          <div className="grid border-b border-[#c1c9bf] bg-[#f8f9fa]" style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}>
            <div className="sticky left-0 z-30 flex items-center justify-between border-r border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 font-bold text-xs text-[#191c1d] shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
              <span>ACOMODAÇÃO</span>
              <span className="text-[10px] text-[#717971]">{quartosFisicos.length} Quartos</span>
            </div>

            {datasVisiveis.map((data) => {
              const iso = data.toISOString().slice(0, 10);
              const ehHoje = iso === dataAtual;

              return (
                <div
                  key={iso}
                  className={`flex flex-col items-center justify-center border-r border-[#e5e7eb] py-2 ${
                    ehHoje ? 'bg-[#e6f4ea] text-[#053d1e] font-extrabold' : 'text-[#414941]'
                  }`}
                >
                  <span className="text-[10px] font-semibold">{formatarDiaSemana(data)}</span>
                  <span className="text-sm font-bold">{data.getDate()}</span>
                  <span className="text-[9px] uppercase tracking-wider">{formatarMesCurto(data)}</span>
                </div>
              );
            })}
          </div>

          {/* Linhas por Bloco */}
          {(['B', 'C', 'D'] as const).map((blocoKey) => {
            const listaQuartosBloco = quartosPorBloco[blocoKey] || [];
            if (listaQuartosBloco.length === 0) return null;

            return (
              <React.Fragment key={blocoKey}>
                <div className="sticky left-0 z-10 border-y border-[#c1c9bf] bg-[#e6f4ea]/80 px-4 py-1.5 font-['Manrope'] text-xs font-bold text-[#053d1e] tracking-wide">
                  BLOCO {blocoKey} — {listaQuartosBloco.length} Acomodações
                </div>
                {listaQuartosBloco.map(renderizarLinhaQuarto)}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Cards com Métricas do Hotel */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#717971]">Ocupação Geral</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">{ocupacao}%</span>
            <span className="text-xs font-semibold text-[#053d1e]">do período</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[#f3f4f6]">
            <div className="h-2 rounded-full bg-[#053d1e] transition-all duration-300" style={{ width: `${ocupacao}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#717971]">Check-ins de Hoje</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">{checkinsHoje.length}</span>
            <span className="text-xs text-[#717971]">previstos</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#717971]">Check-outs de Hoje</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">{checkoutsHoje.length}</span>
            <span className="text-xs text-[#717971]">previstos</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#717971]">Governança & Prontos</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-bold text-[#053d1e]">{quartosProntos.length}</span>
            <span className="text-xs text-[#717971]">de {quartosFisicos.length} quartos</span>
          </div>
        </div>
      </div>

      {/* Modais do Sistema */}
      <ModalReservaRapida
        aberto={modalAberto}
        quarto={quartoSelecionado}
        dataSelecionada={dataSelecionada}
        modoDayUse={modoDayUse}
        onFechar={() => {
          setModalAberto(false);
          setQuartoSelecionado(null);
          setDataSelecionada(null);
          setModoDayUse(false);
        }}
        onSucesso={(mensagem) => {
          setMensagemSucesso(mensagem);
          setHospedeFnrhAviso(null);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('fnrh_reserva_preenchimento');
          }
          setModalAberto(false);
          setQuartoSelecionado(null);
          setDataSelecionada(null);
          setModoDayUse(false);
          window.setTimeout(() => setMensagemSucesso(null), 4000);
        }}
        onCarregandoChange={setCarregandoReserva}
      />

      <ModalAcoesReserva
        aberto={modalAcoesAberto}
        reserva={reservaSelecionadaAcoes}
        onFechar={() => {
          setModalAcoesAberto(false);
          setReservaSelecionadaAcoes(null);
        }}
        onAbrirTrocaQuarto={(res) => {
          setReservaTrocaQuarto(res);
          setModalTrocaQuartoAberto(true);
        }}
        onSucesso={(mensagem) => {
          setMensagemSucesso(mensagem);
          window.setTimeout(() => setMensagemSucesso(null), 4000);
        }}
      />

      <ModalTrocaQuarto
        aberto={modalTrocaQuartoAberto}
        reserva={reservaTrocaQuarto}
        onFechar={() => {
          setModalTrocaQuartoAberto(false);
          setReservaTrocaQuarto(null);
        }}
        onSucesso={(mensagem) => {
          setMensagemSucesso(mensagem);
          window.setTimeout(() => setMensagemSucesso(null), 4000);
        }}
      />

      {carregandoReserva && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs" role="status" aria-live="polite">
          <div className="rounded-xl bg-white px-5 py-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#053d1e]">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Salvando reserva...
          </div>
        </div>
      )}
    </div>
  );
};