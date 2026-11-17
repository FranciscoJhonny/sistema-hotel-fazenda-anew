import React, { useState, useEffect, useMemo } from 'react';
import { CalendarCheck, Search, Sparkles, CheckCircle2, Play } from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CardQuarto } from '../componentes/quartos/CardQuarto';
import { Quarto, Reserva, StatusQuarto } from '../tipos';
import { calcularStatusQuarto } from '../utilitarios/calculoSituacaoQuarto';
import { ReservaService } from '../servicos/api/ReservaService';

type QuartoEnriquecido = Quarto & {
  statusCalculado: string;
  reservaAtiva: Reserva | null;
  proximaReserva: Reserva | null;
};

// Helper universal para compatibilidade camelCase (.NET) e lowercase (Supabase)
const getVal = (obj: any, campoMin: string, campoCamel: string): any => {
  if (!obj) return undefined;
  return obj[campoMin] !== undefined ? obj[campoMin] : obj[campoCamel];
};

// Converte string YYYY-MM-DD para Date local às 12:00 (evita recuo de dia por fuso UTC)
const parseDataLocalMeioDia = (dataStr: string): Date => {
  if (!dataStr) return new Date();
  const limpa = String(dataStr).slice(0, 10);
  const [ano, mes, dia] = limpa.split('-').map(Number);
  if (!ano || !mes || !dia) return new Date();
  return new Date(ano, mes - 1, dia, 12, 0, 0);
};

export const PaginaStatusQuartos: React.FC = () => {
  const { quartos, atualizarStatusQuarto, carregando: carregandoQuartos, erro: erroQuartos } = useHotel();

  const quartosFisicos = useMemo(() => {
    return (quartos || []).filter((q: any) => {
      const cod = String(getVal(q, 'codigoidentificador', 'codigoIdentificador') || '').toUpperCase();
      const num = String(getVal(q, 'numero', 'numero') || '').toUpperCase();
      const cat = String(getVal(q, 'categoria', 'categoria') || '').toUpperCase();
      const ativo = getVal(q, 'ativo', 'ativo') !== false;
      return ativo && cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE' && cat !== 'DAY USE';
    });
  }, [quartos]);

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregandoReservas, setCarregandoReservas] = useState<boolean>(true);
  const [erroReservas, setErroReservas] = useState<string | null>(null);

  // Estados locais
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Campo de data para consulta (padrão: hoje local)
  const [dataConsulta, setDataConsulta] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });

  const obterIdQuarto = (quarto: any) => String(getVal(quarto, 'quartoid', 'quartoId') || quarto?.id || '');

  // Formatação de data (igual ao Dashboard)
  const formatarDataSemFuso = (data: string): string => {
    if (!data) return '';
    if (data.includes('/')) return data;
    const [ano, mes, dia] = data.slice(0, 10).split('-');
    if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
    return data;
  };

  // Busca as reservas do banco (excluindo CANCELADA, CONCLUIDA, CREDITO e DAY_USE)
  useEffect(() => {
    const buscarReservasReais = async () => {
      try {
        const reservaService = new ReservaService();
        const resultado = await reservaService.listar();

        if (resultado.sucesso && resultado.dados) {
          const reservasAtivas = (resultado.dados as any[]).filter((r: any) => {
            const st = String(getVal(r, 'statusreserva', 'statusReserva') || '').toUpperCase().trim();
            const tipo = String(getVal(r, 'tipoatendimento', 'tipoAtendimento') || '').toUpperCase().trim();
            const ativo = getVal(r, 'ativo', 'ativo') !== false;

            // Reservas em CREDITO já liberaram o quarto físico e não ocupam acomodação
            return (
              ativo &&
              st !== 'CANCELADA' &&
              st !== 'CONCLUIDA' &&
              st !== 'CREDITO' &&
              tipo !== 'DAY_USE'
            );
          }) as Reserva[];

          setReservas(reservasAtivas);
        } else {
          setErroReservas(resultado.erro || 'Erro ao buscar reservas');
        }
      } catch (error: any) {
        setErroReservas(error.message || 'Falha na conexão');
      } finally {
        setCarregandoReservas(false);
      }
    };

    buscarReservasReais();
  }, []);

  // CÁLCULO DINÂMICO USANDO A DATA CONSULTA
  const quartosEnriquecidos: QuartoEnriquecido[] = useMemo(() => {
    if (!quartosFisicos || !reservas) return [];

    const dataRef = parseDataLocalMeioDia(dataConsulta);

    return quartosFisicos.map((quarto: any) => {
      const qStatus = String(getVal(quarto, 'status', 'status') || '').toUpperCase().trim();

      if (qStatus === 'MANUTENCAO') {
        return {
          ...quarto,
          status: 'MANUTENCAO' as StatusQuarto,
          statusCalculado: 'MANUTENCAO' as StatusQuarto,
          reservaAtiva: null,
          proximaReserva: null,
        };
      }

      const idQuarto = obterIdQuarto(quarto);
      const reservasDoQuarto = reservas.filter((r: any) => {
        const st = String(getVal(r, 'statusreserva', 'statusReserva') || '').toUpperCase().trim();
        if (st === 'CREDITO' || st === 'CANCELADA' || st === 'CONCLUIDA') return false;
        return String(getVal(r, 'quartoid', 'quartoId')) === idQuarto;
      });

      const { status, reservaAtiva, proximaReserva } = calcularStatusQuarto(
        reservasDoQuarto,
        dataRef,
        qStatus as StatusQuarto
      );

      // Se o cálculo para a data selecionada não encontrou reserva ativa (ex: reserva suspensa em CREDITO),
      // limpa os dados residuais de ocupação para o CardQuarto exibir corretamente como DISPONÍVEL
      const temOcupacaoValida = Boolean(reservaAtiva || proximaReserva);
      const reservaExibicao = reservaAtiva || proximaReserva;

      const hospedeNomeCalculado = temOcupacaoValida
        ? (getVal(reservaExibicao, 'hospedenome', 'hospedeNome') ||
           getVal(reservaExibicao, 'hospedeatualnome', 'hospedeAtualNome') ||
           getVal(quarto, 'hospedeatualnome', 'hospedeAtualNome') ||
           '')
        : '';

      return {
        ...quarto,
        status: status as StatusQuarto,
        statusCalculado: status,
        reservaAtiva,
        proximaReserva,
        hospedeatualnome: hospedeNomeCalculado,
        hospedeAtualNome: hospedeNomeCalculado,
        reservaatualid: temOcupacaoValida ? getVal(reservaExibicao, 'reservaid', 'reservaId') : null,
        reservaAtualId: temOcupacaoValida ? getVal(reservaExibicao, 'reservaid', 'reservaId') : null,
      };
    });
  }, [quartosFisicos, reservas, dataConsulta]);

  // CONTAGENS
  const totalQuartos = quartosEnriquecidos.length || 0;
  const disponiveis = quartosEnriquecidos.filter((q) => q.statusCalculado === 'DISPONIVEL').length;
  const aLimpar = quartosEnriquecidos.filter((q) => q.statusCalculado === 'A_LIMPAR').length;
  const emLimpeza = quartosEnriquecidos.filter((q) => q.statusCalculado === 'EM_LIMPEZA').length;
  const reservados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'RESERVADO').length;
  const ocupados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'OCUPADO').length;
  const agCheckin = quartosEnriquecidos.filter((q) => q.statusCalculado === 'AGUARDANDO_CHECKIN').length;
  const manutencao = quartosEnriquecidos.filter((q) => q.statusCalculado === 'MANUTENCAO').length;

  // FILTRAGEM E ORDENAÇÃO
  const quartosFiltrados = quartosEnriquecidos
    .filter((q) => {
      if (filtroStatus === 'TODOS') return true;
      return q.statusCalculado === filtroStatus;
    })
    .sort((quartoA, quartoB) => {
      const prioridade = (status: string) => {
        if (status === 'A_LIMPAR') return 3;
        if (status === 'EM_LIMPEZA') return 2;
        if (status === 'OCUPADO') return 1;
        return 0;
      };
      return prioridade(quartoB.statusCalculado) - prioridade(quartoA.statusCalculado);
    });

  if (carregandoQuartos || carregandoReservas) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando dados...</p>
      </div>
    );
  }

  if (erroQuartos || erroReservas) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <p className="font-semibold">Erro:</p>
        <p className="text-sm">{erroQuartos || erroReservas}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">

      {/* 1. CONSULTA DE DISPONIBILIDADE POR DATA */}
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
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="text-xs text-gray-500">
            Data selecionada:{' '}
            <span className="font-semibold text-[#245437]">
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
              <h2 className="font-['Manrope'] text-xl font-bold text-[#111827]">
                Status dos Quartos & Limpeza
              </h2>
              <span className="text-xs font-bold text-[#245437] bg-[#f0fdf4] px-2.5 py-0.5 rounded-full border border-[#bbf7d0]">
                {totalQuartos} Quartos
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-1">
              Gerencie a higienização e ocupação dos quartos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => setFiltroStatus('A_LIMPAR')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'A_LIMPAR'
                    ? 'bg-[#d97706] text-white shadow-xs'
                    : 'bg-[#fff3dc] text-[#b45309] hover:bg-[#fde68a]'
                }`}
              >
                A Limpar ({aLimpar})
              </button>
              <button
                onClick={() => setFiltroStatus('EM_LIMPEZA')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'EM_LIMPEZA'
                    ? 'bg-[#0284c7] text-white shadow-xs'
                    : 'bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd]'
                }`}
              >
                Em Limpeza ({emLimpeza})
              </button>
              <button
                onClick={() => setFiltroStatus('DISPONIVEL')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'DISPONIVEL'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                }`}
              >
                Disponíveis ({disponiveis})
              </button>
              <button
                onClick={() => setFiltroStatus('OCUPADO')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'OCUPADO'
                    ? 'bg-[#dc2626] text-white shadow-xs'
                    : 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'
                }`}
              >
                Ocupados ({ocupados})
              </button>
              <button
                onClick={() => setFiltroStatus('AGUARDANDO_CHECKIN')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'AGUARDANDO_CHECKIN'
                    ? 'bg-[#d97706] text-white shadow-xs'
                    : 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'
                }`}
              >
                Aguardando ({agCheckin})
              </button>
              <button
                onClick={() => setFiltroStatus('RESERVADO')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'RESERVADO'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe]'
                }`}
              >
                Reservados ({reservados})
              </button>
              <button
                onClick={() => setFiltroStatus('MANUTENCAO')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  filtroStatus === 'MANUTENCAO'
                    ? 'bg-[#4b5563] text-white shadow-xs'
                    : 'bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]'
                }`}
              >
                Manutenção ({manutencao})
              </button>
            </div>
          </div>
        </div>

        {/* Grade de Quartos com Ações Rápidas de Limpeza */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quartosFiltrados.map((quarto: QuartoEnriquecido, index: number) => {
            const qId = Number(getVal(quarto, 'quartoid', 'quartoId'));
            const st = quarto.statusCalculado;

            return (
              <div
                key={obterIdQuarto(quarto) || `quarto-${index}`}
                className="flex flex-col h-full bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all"
              >
                <div className="flex-1">
                  <CardQuarto quarto={quarto} />
                </div>

                {/* Painel de Controle de Limpeza / Status */}
                <div className="p-2 bg-[#f9fafb] border-t border-[#e5e7eb] flex items-center justify-between gap-1 text-xs">
                  {st === 'A_LIMPAR' && (
                    <>
                      <button
                        onClick={() => atualizarStatusQuarto(qId, 'EM_LIMPEZA')}
                        className="flex-1 py-1.5 px-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Começar a limpar este quarto"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Iniciar Limpeza</span>
                      </button>
                      <button
                        onClick={() => atualizarStatusQuarto(qId, 'DISPONIVEL')}
                        className="py-1.5 px-2 bg-[#166534] hover:bg-[#14532d] text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Marcar como limpo e disponível"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                    </>
                  )}

                  {st === 'EM_LIMPEZA' && (
                    <>
                      <button
                        onClick={() => atualizarStatusQuarto(qId, 'DISPONIVEL')}
                        className="flex-1 py-1.5 px-2 bg-[#166534] hover:bg-[#14532d] text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Limpeza concluída! Liberar quarto como disponível"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir Limpeza</span>
                      </button>
                      <button
                        onClick={() => atualizarStatusQuarto(qId, 'A_LIMPAR')}
                        className="py-1.5 px-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#4b5563] rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#d1d5db]"
                        title="Voltar para A Limpar"
                      >
                        <span>Voltar</span>
                      </button>
                    </>
                  )}

                  {st === 'DISPONIVEL' && (
                    <button
                      onClick={() => atualizarStatusQuarto(qId, 'A_LIMPAR')}
                      className="w-full py-1.5 px-2 bg-[#f3f4f6] hover:bg-[#fff3dc] text-[#b45309] rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#fde68a]"
                      title="Marcar quarto para limpeza"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Marcar P/ Limpar</span>
                    </button>
                  )}

                  {st !== 'A_LIMPAR' && st !== 'EM_LIMPEZA' && st !== 'DISPONIVEL' && (
                    <div className="w-full py-1 text-center text-[11px] text-[#6b7280] font-medium">
                      Status: <span className="font-bold">{st}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {quartosFiltrados.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              Nenhum quarto encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};