import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CardQuartoGerenciamento } from '../componentes/quartos/CardQuartoGerenciamento';
import { ModalDetalhesQuarto } from '../componentes/quartos/ModalDetalhesQuarto';
import { ModalNovaReserva } from '../componentes/reservas/ModalNovaReserva';
import { Quarto, Reserva } from '../tipos';
import { calcularStatusQuarto } from '../utilitarios/calculoSituacaoQuarto';
import { ReservaService } from '../servicos/supabase/ReservaService';

type QuartoEnriquecido = Quarto & {
  statusCalculado: string;
  reservaAtiva: Reserva | null;
  proximaReserva: Reserva | null;
};

export const PaginaQuartos: React.FC = () => {
  const { quartos, carregando: carregandoQuartos, erro: erroQuartos } = useHotel();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregandoReservas, setCarregandoReservas] = useState<boolean>(true);
  const [erroReservas, setErroReservas] = useState<string | null>(null);

  // Busca as reservas do banco
  useEffect(() => {
    const buscarReservasReais = async () => {
      try {
        const reservaService = new ReservaService();
        const resultado = await reservaService.listar();

        if (resultado.sucesso && resultado.dados) {
          // Filtra canceladas e finalizadas para não poluir o cálculo
          const reservasAtivas = (resultado.dados as any[]).filter(
            (r: any) => r.statusreserva !== 'CANCELADA' && r.statusreserva !== 'FINALIZADA'
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

  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODO');
  const [quartoDetalhes, setQuartoDetalhes] = useState<QuartoEnriquecido | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState<boolean>(false);
  const [modalNovaReservaAberto, setModalNovaReservaAberto] = useState<boolean>(false);
  const [quartoParaReserva, setQuartoParaReserva] = useState<Quarto | null>(null);

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

  // CÁLCULO DINÂMICO
  const quartosEnriquecidos: QuartoEnriquecido[] = useMemo(() => {
    if (!quartos || !reservas) return [];

    return quartos.map((quarto: Quarto) => {
      const idQuarto = String(obterIdQuarto(quarto));
      const reservasDoQuarto = reservas.filter(r => String(r.quartoid) === idQuarto);
      const { status, reservaAtiva, proximaReserva } = calcularStatusQuarto(reservasDoQuarto);

      return {
        ...quarto,
        statusCalculado: status,
        reservaAtiva,
        proximaReserva
      };
    });
  }, [quartos, reservas]);

  // CONTAGENS
  const disponiveis = quartosEnriquecidos.filter((q) => q.statusCalculado === 'DISPONIVEL').length;
  const reservados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'RESERVADO').length;
  const ocupados = quartosEnriquecidos.filter((q) => q.statusCalculado === 'OCUPADO').length;
  const agCheckin = quartosEnriquecidos.filter((q) => q.statusCalculado === 'AGUARDANDO_CHECKIN').length;
  const manutencao = quartosEnriquecidos.filter((q) => q.statusCalculado === 'MANUTENCAO').length;

  // FILTRAGEM
  const quartosFiltrados = quartosEnriquecidos.filter((q) => {
    if (filtroStatus === 'DISPONIVEL' && q.statusCalculado !== 'DISPONIVEL') return false;
    if (filtroStatus === 'RESERVADO' && q.statusCalculado !== 'RESERVADO') return false;
    if (filtroStatus === 'OCUPADO' && q.statusCalculado !== 'OCUPADO') return false;
    if (filtroStatus === 'AG_CHECKIN' && q.statusCalculado !== 'AGUARDANDO_CHECKIN') return false;
    if (filtroStatus === 'MANUTENCAO' && q.statusCalculado !== 'MANUTENCAO') return false;

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const bateNumero = obterNumeroQuarto(q).toLowerCase().includes(termo);
      const bateHospede = obterHospedeAtual(q).toLowerCase().includes(termo);
      const bateCategoria = obterCategoriaQuarto(q).toLowerCase().includes(termo);
      if (!bateNumero && !bateHospede && !bateCategoria) return false;
    }
    return true;
  });

  const handleAbrirDetalhes = (quarto: QuartoEnriquecido) => {
    setQuartoDetalhes(quarto);
    setModalDetalhesAberto(true);
  };

  const handleNovaReserva = (quarto: Quarto) => {
    setQuartoParaReserva(quarto);
    setModalNovaReservaAberto(true);
  };

  if (carregandoQuartos || carregandoReservas) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Carregando dados...</p></div>;
  }

  if (erroQuartos || erroReservas) {
    return <div className="flex flex-col items-center justify-center h-64 text-red-600"><p className="font-semibold">Erro:</p><p className="text-sm">{erroQuartos || erroReservas}</p></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Barra de Filtros e Busca (Mantida igual ao seu código original, apenas ajustada para ficar limpa) */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar hóspede ou quarto..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#245437]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {['TODO', 'DISPONIVEL', 'RESERVADO', 'OCUPADO', 'AG_CHECKIN', 'MANUTENCAO'].map((status) => {
            const labels: Record<string, string> = {
              TODO: 'Todo',
              DISPONIVEL: `Disponível (${disponiveis})`,
              RESERVADO: `Reservado (${reservados})`,
              OCUPADO: `Ocupado (${ocupados})`,
              AG_CHECKIN: `Ag. Check-in (${agCheckin})`,
              MANUTENCAO: `Manutenção (${manutencao})`
            };
            return (
              <button
                key={status}
                type="button"
                onClick={() => setFiltroStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filtroStatus === status ? 'bg-[#193b27] text-white font-semibold' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade de Quartos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quartosFiltrados.map((quarto: QuartoEnriquecido, index: number) => {
          // SOLUÇÃO DO ERRO DE TIPO: Cria um array estritamente do tipo Reserva[]
          const reservasParaCard: Reserva[] = [];
          if (quarto.reservaAtiva) reservasParaCard.push(quarto.reservaAtiva);
          else if (quarto.proximaReserva) reservasParaCard.push(quarto.proximaReserva);

          return (
            <CardQuartoGerenciamento
              key={obterIdQuarto(quarto) || `quarto-${index}`}
              quarto={quarto}
              reservas={reservasParaCard} // Agora o TypeScript aceita perfeitamente!
              aoClicar={() => handleAbrirDetalhes(quarto)}
              aoNovaReserva={() => handleNovaReserva(quarto)}
            />
          );
        })}
        {quartosFiltrados.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            Nenhum quarto encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Modais */}
      <ModalDetalhesQuarto
        quarto={quartoDetalhes as any} // Cast seguro pois o modal pode esperar Quarto base
        aberto={modalDetalhesAberto}
        onFechar={() => { setModalDetalhesAberto(false); setQuartoDetalhes(null); }}
        onNovaReservaParaQuarto={handleNovaReserva}
      />

      <ModalNovaReserva
        aberto={modalNovaReservaAberto}
        onFechar={() => { setModalNovaReservaAberto(false); setQuartoParaReserva(null); }}
        quartoPreSelecionado={quartoParaReserva}
      />
    </div>
  );
};