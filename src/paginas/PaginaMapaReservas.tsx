import {
  AlertTriangle,
  Bed,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  LogIn,
  LogOut,
  PauseCircle,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  User,
  Wrench,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { ModalAcoesReserva } from '../componentes/mapa-reservas/ModalAcoesReserva';
import { ModalReservaRapida } from '../componentes/mapa-reservas/ModalReservaRapida';
import { ModalTrocaQuartoEAdicional } from '../componentes/mapa-reservas/ModalTrocaQuartoEAdicional';
import { useHotel } from '../contextos/ContextoHotel';
import { Hospede, Quarto, Reserva } from '../tipos';
import { formatarMoeda } from '../utilitarios/formatadores';

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

// Helper para ler campos compatíveis entre camelCase (.NET) e lowercase (PostgreSQL)
const getReservaVal = (reserva: any, campoMin: string, campoCamel: string): any => {
  if (!reserva) return undefined;
  return reserva[campoMin] !== undefined ? reserva[campoMin] : reserva[campoCamel];
};

const extrairDataIso = (valor: any): string => {
  if (!valor) return '';
  return String(valor).slice(0, 10);
};

const datasSobrepostas = (reserva: any, inicioPeriodo: Date, fimPeriodo: Date) => {
  const dEntrada = extrairDataIso(getReservaVal(reserva, 'dataentrada', 'dataEntrada'));
  const dSaida = extrairDataIso(getReservaVal(reserva, 'datasaida', 'dataSaida'));

  if (!dEntrada || !dSaida) return false;

  const inicioReserva = new Date(`${dEntrada}T00:00:00`);
  const fimReserva = addDias(new Date(`${dSaida}T00:00:00`), 1);
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
  const { quartos, reservas, hospedes, recarregarDados, navegarPara } = useHotel();

  const quartosFisicos = useMemo(() => {
    return quartos.filter((q: any) => {
      const cod = String(q.codigoidentificador || q.codigoIdentificador || '').toUpperCase();
      const num = String(q.numero || '').toUpperCase();
      const cat = String(q.categoria || '').toUpperCase();
      return cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE' && cat !== 'DAY USE';
    });
  }, [quartos]);

  const [periodoInicio, setPeriodoInicio] = useState<Date>(periodoInicialPadrao);
  const [filtroStatus, setFiltroStatus] = useState<
    'TODOS' | 'PRE_RESERVA' | 'RESERVADO' | 'HOSPEDADO' | 'CONCLUIDA' | 'CANCELADA' | 'DAY_USE' | 'CREDITO'
  >('TODOS');
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
              dataentrada: parsed.dataentrada || parsed.dataEntrada,
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

  // Criar mapa de hóspedes: ID → Hospede
  const hospedeMap = useMemo(() => {
    const map = new Map<number, Hospede>();
    hospedes.forEach((h: any) => {
      const id = Number(h.hospedeid ?? h.hospedeId);
      if (!isNaN(id)) {
        map.set(id, h);
      }
    });
    return map;
  }, [hospedes]);

  // AGRUPAR quartos por bloco usando o campo 'bloco' do banco de dados
  const quartosPorBloco = useMemo(() => {
    const blocosMap: Record<string, Quarto[]> = {
      B: [],
      C: [],
      D: [],
    };

    quartosFisicos.forEach((quarto) => {
      if (quarto.ativo === false) return;

      const bloco = (quarto.bloco || 'B').toUpperCase();
      if (blocosMap[bloco]) {
        blocosMap[bloco].push(quarto);
      }
    });

    Object.keys(blocosMap).forEach((bloco) => {
      blocosMap[bloco].sort((a: any, b: any) => {
        const codA = a.codigoidentificador || a.codigoIdentificador || a.numero || '';
        const codB = b.codigoidentificador || b.codigoIdentificador || b.numero || '';
        return String(codA).localeCompare(String(codB));
      });
    });

    return blocosMap;
  }, [quartosFisicos]);

  // DATA ATUAL DO SISTEMA
  const dataAtual = new Date().toISOString().slice(0, 10);

  // CALCULAR CHECK-INS (Mesma regra da tela de Recepção: dataentrada <= dataAtual e pendentes de entrada)
  const checkinsHoje = useMemo(() => {
    return reservas
      .filter((reserva: any) => {
        const dEntrada = extrairDataIso(getReservaVal(reserva, 'dataentrada', 'dataEntrada'));
        const status = getReservaVal(reserva, 'statusreserva', 'statusReserva');
        const statusValido = status === 'PRE_RESERVA' || status === 'RESERVADO';
        const dataValida = Boolean(dEntrada && dEntrada <= dataAtual);
        return statusValido && dataValida;
      })
      .map((reserva: any) => {
        const hospedeId = Number(getReservaVal(reserva, 'hospedeid', 'hospedeId'));
        const hospede = hospedeMap.get(hospedeId);
        return {
          ...reserva,
          hospedenome: hospede?.nomecompleto || `Hóspede ${hospedeId}`,
        };
      });
  }, [reservas, dataAtual, hospedeMap]);

  // CALCULAR CHECK-OUTS DE HOJE
  const checkoutsHoje = useMemo(() => {
    return reservas
      .filter((reserva: any) => {
        const dSaida = extrairDataIso(getReservaVal(reserva, 'datasaida', 'dataSaida'));
        const status = getReservaVal(reserva, 'statusreserva', 'statusReserva');
        return dSaida === dataAtual && status === 'HOSPEDADO';
      })
      .map((reserva: any) => {
        const hospedeId = Number(getReservaVal(reserva, 'hospedeid', 'hospedeId'));
        const hospede = hospedeMap.get(hospedeId);
        return {
          ...reserva,
          hospedenome: hospede?.nomecompleto || `Hóspede ${hospedeId}`,
        };
      });
  }, [reservas, dataAtual, hospedeMap]);

  // CALCULAR QUARTOS PRONTOS
  const quartosProntos = useMemo(() => {
    return quartosFisicos.filter((q) => q.status === 'DISPONIVEL' || q.status === 'RESERVADO');
  }, [quartosFisicos]);

  // Filtrar e enriquecer reservas (desconsidera reservas de Day Use, Canceladas e em Crédito no mapa físico)
  const reservasVisiveis = useMemo(() => {
    return reservas
      .filter((reserva: any) => {
        const tipoAtendimento = String(getReservaVal(reserva, 'tipoatendimento', 'tipoAtendimento') || '').toUpperCase();
        const statusReserva = getReservaVal(reserva, 'statusreserva', 'statusReserva');

        if (tipoAtendimento === 'DAY_USE' || statusReserva === 'CANCELADA' || statusReserva === 'CREDITO') {
          return false;
        }

        const dentroPeriodo = datasSobrepostas(reserva, periodoInicio, addDias(periodoInicio, numeroDias));
        if (!dentroPeriodo) return false;

        if (filtroStatus !== 'TODOS' && filtroStatus !== 'DAY_USE' && statusReserva !== filtroStatus) return false;
        if (filtroStatus === 'DAY_USE' && tipoAtendimento !== 'DAY_USE') return false;

        const hospedeId = Number(getReservaVal(reserva, 'hospedeid', 'hospedeId'));
        const quartoId = Number(getReservaVal(reserva, 'quartoid', 'quartoId'));

        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const hospede = hospedeMap.get(hospedeId);
          const quarto = quartos.find((q: any) => Number(q.quartoid ?? q.quartoId) === quartoId);
          const nomeHospede = hospede?.nomecompleto || '';
          const numeroQuarto = (quarto as any)?.codigoidentificador || (quarto as any)?.codigoIdentificador || quarto?.numero || '';

          return (
            nomeHospede.toLowerCase().includes(termo) ||
            String(numeroQuarto).toLowerCase().includes(termo) ||
            String(reserva.codigo || '').toLowerCase().includes(termo)
          );
        }

        return true;
      })
      .map((reserva: any) => {
        const hospedeId = Number(getReservaVal(reserva, 'hospedeid', 'hospedeId'));
        const hospede = hospedeMap.get(hospedeId);
        const quartoId = Number(getReservaVal(reserva, 'quartoid', 'quartoId'));
        const reservaId = Number(getReservaVal(reserva, 'reservaid', 'reservaId'));
        const statusReserva = getReservaVal(reserva, 'statusreserva', 'statusReserva');
        const tipoAtendimento = getReservaVal(reserva, 'tipoatendimento', 'tipoAtendimento');
        const dEntrada = extrairDataIso(getReservaVal(reserva, 'dataentrada', 'dataEntrada'));
        const dSaida = extrairDataIso(getReservaVal(reserva, 'datasaida', 'dataSaida'));

        return {
          ...reserva,
          reservaid: reservaId,
          quartoid: quartoId,
          hospedeid: hospedeId,
          dataentrada: dEntrada,
          datasaida: dSaida,
          statusreserva: statusReserva,
          tipoatendimento: tipoAtendimento,
          hospedenome: hospede?.nomecompleto || `Hóspede ${hospedeId}`,
        };
      });
  }, [reservas, periodoInicio, numeroDias, filtroStatus, busca, hospedeMap, quartos]);

  // Reservas em Crédito (filtradas e enriquecidas para a visão de gestão de créditos)
  const reservasCredito = useMemo(() => {
    return reservas
      .filter((reserva: any) => {
        const status = getReservaVal(reserva, 'statusreserva', 'statusReserva');
        if (status !== 'CREDITO') return false;

        const hospedeId = Number(getReservaVal(reserva, 'hospedeid', 'hospedeId'));
        const quartoId = Number(getReservaVal(reserva, 'quartoid', 'quartoId'));

        if (busca.trim()) {
          const termo = busca.toLowerCase();
          const hospede = hospedeMap.get(hospedeId);
          const quarto = quartos.find((q: any) => Number(q.quartoid ?? q.quartoId) === quartoId);
          const nomeHospede = hospede?.nomecompleto || '';
          const numeroQuarto = (quarto as any)?.codigoidentificador || (quarto as any)?.codigoIdentificador || quarto?.numero || '';

          return (
            nomeHospede.toLowerCase().includes(termo) ||
            String(numeroQuarto).toLowerCase().includes(termo) ||
            String(reserva.codigo || '').toLowerCase().includes(termo) ||
            String(hospede?.telefone || '').toLowerCase().includes(termo)
          );
        }

        return true;
      })
      .map((reserva: any) => {
        const hospedeId = Number(getReservaVal(reserva, 'hospedeid', 'hospedeId'));
        const hospede = hospedeMap.get(hospedeId);
        const quartoId = Number(getReservaVal(reserva, 'quartoid', 'quartoId'));
        const quarto = quartos.find((q: any) => Number(q.quartoid ?? q.quartoId) === quartoId);
        const valorPago = getReservaVal(reserva, 'valorpago', 'valorPago');

        return {
          ...reserva,
          reservaid: Number(getReservaVal(reserva, 'reservaid', 'reservaId')),
          valorpago: valorPago,
          hospedenome: hospede?.nomecompleto || `Hóspede #${hospedeId}`,
          hospedetelefone: hospede?.telefone || hospede?.whatsapp || reserva.hospedetelefone || '',
          quartonumero: (quarto as any)?.codigoidentificador || (quarto as any)?.codigoIdentificador || quarto?.numero || reserva.quartonumero || '',
          quartocategoria: quarto?.categoria || '',
        };
      });
  }, [reservas, busca, hospedeMap, quartos]);

  // Total monetário das reservas suspensas em crédito
  const totalValorCredito = useMemo(() => {
    return reservasCredito.reduce((acc, r: any) => acc + Number(r.valorpago || 0), 0);
  }, [reservasCredito]);

  const ocupacao = useMemo(() => {
    if (reservasVisiveis.length === 0 || quartosFisicos.length === 0) return 0;
    const totalDias = numeroDias * quartosFisicos.length;
    let diasOcupados = 0;

    reservasVisiveis.forEach((res: any) => {
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
    const idAtualQuarto = Number(quarto.quartoid ?? (quarto as any).quartoId);
    const reservasDoQuarto = reservasVisiveis.filter(
      (reserva: any) => Number(reserva.quartoid) === idAtualQuarto
    );
    const quartoBloqueado = quarto.status === 'MANUTENCAO';

    return (
      <div
        key={idAtualQuarto}
        className={`relative col-span-full h-12 border-b ${quartoBloqueado ? 'border-[#d1d5db] bg-[#f3f4f6]' : 'border-[#e5e7eb] bg-white'
          }`}
      >
        <div className="grid h-full" style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}>
          <div
            className={`sticky left-0 z-10 flex items-center justify-between gap-2 border-r px-3 ${quartoBloqueado
              ? 'border-[#d1d5db] bg-[#f3f4f6] text-[#1f2937] shadow-[2px_0_4px_rgba(0,0,0,0.05)]'
              : 'border-[#e5e7eb] bg-white'
              }`}
          >
            <div className="flex items-center gap-2">
              {quartoBloqueado ? (
                <Wrench className="h-3.5 w-3.5 text-[#4b5563] shrink-0" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff69b4]" />
              )}
              <span className={`text-sm font-bold ${quartoBloqueado ? 'text-[#374151]' : 'text-[#191c1d]'}`}>
                {(quarto as any).codigoidentificador || (quarto as any).codigoIdentificador || quarto.numero}
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold ${quartoBloqueado
                ? 'rounded bg-[#e5e7eb] px-1.5 py-0.5 font-bold uppercase tracking-wider text-[#374151] border border-[#d1d5db]'
                : 'text-[#717971]'
                }`}
            >
              {quartoBloqueado
                ? 'Manutenção'
                : `${quarto.quantidadecamascasal ?? (quarto as any).quantidadeCamasCasal ?? 0} casal, ${quarto.quantidadecamassolteiro ?? (quarto as any).quantidadeCamasSolteiro ?? 0
                } solteiro`}
            </span>
          </div>

          {datasVisiveis.map((data) => {
            const dataIso = data.toISOString().slice(0, 10);
            const reservaAtiva = reservasDoQuarto.find(
              (reserva: any) => dataIso >= reserva.dataentrada && dataIso <= reserva.datasaida
            );

            return (
              <button
                key={`${idAtualQuarto}-${dataIso}`}
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
                title={
                  quartoBloqueado
                    ? `Quarto ${quarto.numero || (quarto as any).codigoidentificador} em manutenção`
                    : undefined
                }
                className={`transition-colors ${quartoBloqueado
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
          {reservasDoQuarto.map((reserva: any) => {
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
            const startOffset = Math.max(
              0,
              Math.floor((inicioVisivel.getTime() - periodoInicioNormalizado.getTime()) / (1000 * 60 * 60 * 24))
            );
            const duration = Math.max(
              1,
              Math.ceil((fimVisivel.getTime() - inicioVisivel.getTime()) / (1000 * 60 * 60 * 24))
            );

            return (
              <button
                key={String(reserva.reservaid)}
                type="button"
                onClick={() => {
                  setReservaSelecionadaAcoes(reserva);
                  setModalAcoesAberto(true);
                }}
                aria-label={`Reserva ${reserva.codigo || ''} ocupando o quarto ${(quarto as any).codigoidentificador || (quarto as any).codigoIdentificador || quarto.numero
                  }`}
                className={`pointer-events-auto absolute top-1.5 flex h-8 items-center justify-between overflow-hidden rounded-md border border-white/70 px-2 text-[10px] font-semibold shadow-sm cursor-pointer hover:brightness-105 transition-all ${coresStatusReserva[reserva.statusreserva] || 'bg-[#9CA3AF] text-white'
                  }`}
                style={{
                  left: `${startOffset * 80}px`,
                  width: `${Math.max(duration * 80 - 4, 32)}px`,
                }}
              >
                <span className="flex min-w-0 items-center gap-1 truncate">
                  {reserva.statusreserva === 'RESERVADO' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : reserva.statusreserva === 'PRE_RESERVA' ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ) : reserva.statusreserva === 'HOSPEDADO' ? (
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Wrench className="h-3.5 w-3.5 shrink-0" />
                  )}
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
                Clique sobre o quarto e data desejados no mapa abaixo para concluir a reserva. Os dados do hóspede
                serão selecionados automaticamente.
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
            {(['TODOS', 'PRE_RESERVA', 'RESERVADO', 'HOSPEDADO', 'CREDITO', 'CONCLUIDA', 'CANCELADA'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFiltroStatus(status)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${filtroStatus === status
                    ? 'bg-[#053d1e] text-white shadow-xs'
                    : 'bg-[#f8f9fa] text-[#414941] border border-[#c1c9bf] hover:bg-[#e6f4ea]'
                    }`}
                >
                  {status === 'TODOS'
                    ? 'Todos'
                    : status === 'CREDITO'
                      ? `Crédito (${reservasCredito.length})`
                      : nomesStatusReserva[status] || status}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Grid Principal do Mapa de Reservas OU Painel de Créditos */}
      {filtroStatus === 'CREDITO' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 border border-amber-300 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Manrope'] font-bold text-sm text-amber-950">
                  Reservas Suspensas em Crédito ({reservasCredito.length})
                </h3>
                <p className="text-xs text-amber-900/80">
                  Hóspedes com valores retidos aguardando remarcação de datas e realocação de quarto.
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-semibold text-amber-900 block">Total de Créditos Retidos:</span>
              <span className="font-['Manrope'] text-lg font-extrabold text-amber-950">
                {formatarMoeda(totalValorCredito)}
              </span>
            </div>
          </div>

          {reservasCredito.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#c1c9bf] bg-white p-12 text-center shadow-sm">
              <PauseCircle className="w-10 h-10 text-amber-600/60 mx-auto mb-3" />
              <h4 className="font-bold text-sm text-slate-800">Nenhuma reserva em crédito encontrada</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Não há reservas com status de crédito retido no momento ou correspondentes à busca informada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reservasCredito.map((res: any) => {
                const hospede = hospedeMap.get(Number(res.hospedeid));
                const telefone = res.hospedetelefone || hospede?.telefone || hospede?.whatsapp || 'Não informado';

                return (
                  <div
                    key={res.reservaid}
                    className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <span className="font-['Manrope'] font-extrabold text-sm text-[#053d1e] tracking-tight">
                          {res.codigo}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                          CRÉDITO RETIDO
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 truncate">{res.hospedenome}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-600">{telefone}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-600">
                            Quarto anterior: <strong className="text-slate-800">#{res.quartonumero || 'S/N'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#e6f4ea]/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-900">Valor do Crédito:</span>
                        <span className="font-['Manrope'] font-extrabold text-sm text-emerald-800">
                          {formatarMoeda(res.valorpago)}
                        </span>
                      </div>

                      {res.observacoes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-700 leading-snug">
                          <span className="font-bold text-slate-900 block mb-0.5">Observações:</span>
                          <p className="line-clamp-3">{res.observacoes}</p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReservaSelecionadaAcoes(res);
                        setModalAcoesAberto(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#053d1e] hover:bg-[#043017] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Gerenciar / Remarcar Datas</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#c1c9bf] bg-white shadow-sm">
          <div className="min-w-[1140px]">
            {/* Cabeçalho de Datas */}
            <div
              className="grid border-b border-[#c1c9bf] bg-[#f8f9fa]"
              style={{ gridTemplateColumns: `180px repeat(${datasVisiveis.length}, 80px)` }}
            >
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
                    className={`flex flex-col items-center justify-center border-r border-[#e5e7eb] py-2 ${ehHoje ? 'bg-[#e6f4ea] text-[#053d1e] font-extrabold' : 'text-[#414941]'
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
      )}

      {/* Cards com Métricas do Hotel (5 Indicadores de Ação Rápida com Alertas Coloridos) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Ocupação Geral */}
        <div className="rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-[#717971]">Ocupação Geral</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">{ocupacao}%</span>
              <span className="text-xs font-semibold text-[#053d1e]">do período</span>
            </div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-[#f3f4f6]">
            <div
              className="h-2 rounded-full bg-[#053d1e] transition-all duration-300"
              style={{ width: `${ocupacao}%` }}
            />
          </div>
        </div>

        {/* Card 2: Check-ins de Hoje (Alerta Azul / Clicável para Página Check-in via Contexto) */}
        <div
          onClick={() => (navegarPara as any)('checkin')}
          className="group rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm hover:shadow-md hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer flex flex-col justify-between"
          title="Clique para ir para a página de Check-ins"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Check-ins de Hoje</span>
            <LogIn className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-black text-blue-950">{checkinsHoje.length}</span>
            <span className="text-xs font-semibold text-blue-800">previstos</span>
          </div>
          <span className="text-[10px] font-medium text-blue-700/80 mt-2 block">
            Acessar tela de check-ins &rarr;
          </span>
        </div>

        {/* Card 3: Check-outs de Hoje (Alerta Vermelho/Coral / Clicável para Página Check-out via Contexto) */}
        <div
          onClick={() => (navegarPara as any)('checkout')}
          className="group rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm hover:shadow-md hover:border-rose-400 hover:bg-rose-50/80 transition-all cursor-pointer flex flex-col justify-between"
          title="Clique para ir para a página de Check-outs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900">Check-outs de Hoje</span>
            <LogOut className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-black text-rose-950">{checkoutsHoje.length}</span>
            <span className="text-xs font-semibold text-rose-800">previstos</span>
          </div>
          <span className="text-[10px] font-medium text-rose-700/80 mt-2 block">
            Acessar tela de check-outs &rarr;
          </span>
        </div>

        {/* Card 4: Governança & Prontos */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Governança & Prontos</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-black text-[#053d1e]">{quartosProntos.length}</span>
            <span className="text-xs font-semibold text-emerald-800">de {quartosFisicos.length} quartos</span>
          </div>
          <span className="text-[10px] font-medium text-emerald-700/80 mt-2 block">
            Quartos liberados para uso
          </span>
        </div>

        {/* Card 5: Reservas Suspensas em Crédito (Alerta Âmbar / Filtra na hora) */}
        <div
          onClick={() => setFiltroStatus('CREDITO')}
          className="group rounded-2xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm hover:shadow-md hover:border-amber-500 hover:bg-amber-100/70 transition-all cursor-pointer flex flex-col justify-between"
          title="Clique para abrir e gerenciar os créditos suspensos"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950">Créditos Suspensos</span>
            <PauseCircle className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-['Manrope'] text-2xl font-black text-amber-950">{reservasCredito.length}</span>
            <span className="text-xs font-bold text-amber-800">
              {formatarMoeda(totalValorCredito)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-900 mt-2 block">
            Filtrar e gerenciar créditos &rarr;
          </span>
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

      <ModalTrocaQuartoEAdicional
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
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-xl bg-white px-5 py-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#053d1e]">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Salvando reserva...
          </div>
        </div>
      )}
    </div>
  );
};