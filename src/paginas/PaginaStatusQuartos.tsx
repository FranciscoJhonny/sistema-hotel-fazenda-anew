import React, { useState, useEffect, useMemo } from 'react';
import { CalendarCheck, Search } from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CardQuarto } from '../componentes/quartos/CardQuarto';
import { ModalReservaRapida } from '../componentes/mapa-reservas/ModalReservaRapida';
import { Quarto, Reserva } from '../tipos';
import { calcularStatusQuarto } from '../utilitarios/calculoSituacaoQuarto';
import { ReservaService } from '../servicos/supabase/ReservaService';

type QuartoEnriquecido = Quarto & {
  statusCalculado: string;
  reservaAtiva: Reserva | null;
  proximaReserva: Reserva | null;
};

export const PaginaStatusQuartos: React.FC = () => {
  const { quartos, carregando: carregandoQuartos, erro: erroQuartos } = useHotel();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregandoReservas, setCarregandoReservas] = useState<boolean>(true);
  const [erroReservas, setErroReservas] = useState<string | null>(null);

  // Estados locais
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [quartoSelecionado, setQuartoSelecionado] = useState<Quarto | null>(null);
  const [modalReservaAberto, setModalReservaAberto] = useState(false);

  // Campo de data para consulta (igual ao Dashboard)
  const [dataConsulta, setDataConsulta] = useState<string>(() => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  });

  // Função auxiliar para obter valores de forma segura
  const getValorQuarto = (quarto: Quarto, chaves: string[]) => {
    const dados = quarto as Record<string, any>;
    for (const chave of chaves) {
      const valor = dados[chave];
      if (valor !== undefined && valor !== null && valor !== '') return String(valor);
    }
    return '';
  };

  const obterNumeroQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['numero', 'codigoidentificador']);
  const obterHospedeAtual = (quarto: Quarto) => getValorQuarto(quarto, ['hospedeatualnome', 'hospedenome']);
  const obterCategoriaQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['categoria']);
  const obterIdQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['quartoid', 'id']);

  // Formatação de data (igual ao Dashboard)
  const formatarDataSemFuso = (data: string): string => {
    if (!data) return '';
    if (data.includes('/')) return data;
    const [ano, mes, dia] = data.split('-');
    if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
    return data;
  };

  // Busca as reservas do banco
  useEffect(() => {
    const buscarReservasReais = async () => {
      try {
        const reservaService = new ReservaService();
        const resultado = await reservaService.listar();

        if (resultado.sucesso && resultado.dados) {
          const reservasAtivas = (resultado.dados as any[]).filter(
            (r: any) => r.statusreserva !== 'CANCELADA' &&
              r.statusreserva !== 'FINALIZADA' &&
              String(r.tipoatendimento || '').toUpperCase() !== 'DAY_USE'
          ) as Reserva[];
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
    if (!quartos || !reservas) return [];

    return quartos.map((quarto: Quarto) => {
      const idQuarto = String(obterIdQuarto(quarto));
      const reservasDoQuarto = reservas.filter(r => String(r.quartoid) === idQuarto);
      
      // ✅ AQUI USA A DATA CONSULTA (igual ao Dashboard)
      const { status, reservaAtiva, proximaReserva } = calcularStatusQuarto(
        reservasDoQuarto,
        new Date(dataConsulta)
      );

      return {
        ...quarto,
        statusCalculado: status,
        reservaAtiva,
        proximaReserva
      };
    });
  }, [quartos, reservas, dataConsulta]);

  // CONTAGENS
  const totalQuartos = quartosEnriquecidos.length || 0;
  const disponiveis = quartosEnriquecidos.filter((q) => q.statusCalculado === 'DISPONIVEL').length;
  const reservados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'RESERVADO').length;
  const ocupados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'OCUPADO').length;
  const agCheckin = quartosEnriquecidos.filter((q) => q.statusCalculado === 'AGUARDANDO_CHECKIN').length;
  const manutencao = quartosEnriquecidos.filter((q) => q.statusCalculado === 'MANUTENCAO').length;

  // FILTRAGEM
  const quartosFiltrados = quartosEnriquecidos
    .filter((q) => {
      if (filtroStatus === 'TODOS') return true;
      return q.statusCalculado === filtroStatus;
    })
    .sort((quartoA, quartoB) => {
      const ocupadoA = quartoA.statusCalculado === 'OCUPADO' ? 1 : 0;
      const ocupadoB = quartoB.statusCalculado === 'OCUPADO' ? 1 : 0;
      return ocupadoB - ocupadoA;
    });

  const handleAbrirDetalhesQuarto = (quarto: Quarto) => {
    setQuartoSelecionado(quarto);
    setModalReservaAberto(true);
  };

  if (carregandoQuartos || carregandoReservas) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Carregando dados...</p></div>;
  }

  if (erroQuartos || erroReservas) {
    return <div className="flex flex-col items-center justify-center h-64 text-red-600"><p className="font-semibold">Erro:</p><p className="text-sm">{erroQuartos || erroReservas}</p></div>;
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">

      {/* ✅ CAMPO DE DATA VISÍVEL AQUI (Igual ao Dashboard) */}
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

      {/* 2. MAPA OPERACIONAL DOS QUARTOS (Igual ao Dashboard) */}
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
              Consulta: {formatarDataSemFuso(dataConsulta)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button 
                onClick={() => setFiltroStatus('TODOS')} 
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'TODOS' ? 'bg-[#245437] text-white shadow-xs' : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'}`}
              >
                Todos ({totalQuartos})
              </button>
              <button 
                onClick={() => setFiltroStatus('DISPONIVEL')} 
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'DISPONIVEL' ? 'bg-[#166534] text-white shadow-xs' : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'}`}
              >
                Disponíveis ({disponiveis})
              </button>
              <button 
                onClick={() => setFiltroStatus('OCUPADO')} 
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'OCUPADO' ? 'bg-[#dc2626] text-white shadow-xs' : 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'}`}
              >
                Ocupados ({ocupados})
              </button>
              <button 
                onClick={() => setFiltroStatus('AGUARDANDO_CHECKIN')} 
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'AGUARDANDO_CHECKIN' ? 'bg-[#d97706] text-white shadow-xs' : 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'}`}
              >
                Aguardando ({agCheckin})
              </button>
              <button 
                onClick={() => setFiltroStatus('RESERVADO')} 
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'RESERVADO' ? 'bg-[#2563eb] text-white shadow-xs' : 'bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe]'}`}
              >
                Reservados ({reservados})
              </button>
              <button 
                onClick={() => setFiltroStatus('MANUTENCAO')} 
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${filtroStatus === 'MANUTENCAO' ? 'bg-[#6b7280] text-white shadow-xs' : 'bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]'}`}
              >
                Manutenção ({manutencao})
              </button>
            </div>

          </div>
        </div>

        {/* Grade de Quartos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quartosFiltrados.map((quarto: QuartoEnriquecido, index: number) => {
            // Corrige o tipo para o card
            const reservasParaCard: Reserva[] = [];
            if (quarto.reservaAtiva) reservasParaCard.push(quarto.reservaAtiva);
            else if (quarto.proximaReserva) reservasParaCard.push(quarto.proximaReserva);

            return (
              <CardQuarto
                key={obterIdQuarto(quarto) || `quarto-${index}`}
                quarto={quarto}
                aoClicar={handleAbrirDetalhesQuarto}
                //reservas={reservasParaCard}
              />
            );
          })}
          {quartosFiltrados.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              Nenhum quarto encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </div>

      <ModalReservaRapida
        quarto={quartoSelecionado}
        aberto={modalReservaAberto}
        dataSelecionada={dataConsulta}
        onFechar={() => {
          setModalReservaAberto(false);
          setQuartoSelecionado(null);
        }}
      />

    </div>
  );
};