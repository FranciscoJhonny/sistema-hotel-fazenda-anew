import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CardQuartoGerenciamento } from '../componentes/quartos/CardQuartoGerenciamento';
import { ModalDetalhesQuarto } from '../componentes/quartos/ModalDetalhesQuarto';
import { ModalNovaReserva } from '../componentes/reservas/ModalNovaReserva';
import { Quarto } from '../tipos';

export const PaginaQuartos: React.FC = () => {
  // Agora o contexto também retorna 'carregando' e 'erro' para tratarmos corretamente
  const { quartos, carregando, erro } = useHotel();

  const getValorQuarto = (quarto: Quarto, chaves: string[]) => {
    const dados = quarto as Record<string, any>;
    for (const chave of chaves) {
      const valor = dados[chave];
      if (valor !== undefined && valor !== null && valor !== '') return String(valor);
    }
    return '';
  };

  const obterStatusQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['status', 'Status']).toUpperCase();
  const obterNumeroQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['numero', 'Numero']);
  const obterHospedeAtual = (quarto: Quarto) => getValorQuarto(quarto, ['hospedeatualnome', 'HospedeAtualNome']);
  const obterCategoriaQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['categoria', 'Categoria']);
  const obterIdQuarto = (quarto: Quarto) => getValorQuarto(quarto, ['quartoid', 'QuartoId']);

  // Estados locais
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODO');
  const [quartoDetalhes, setQuartoDetalhes] = useState<Quarto | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState<boolean>(false);
  const [modalNovaReservaAberto, setModalNovaReservaAberto] = useState<boolean>(false);
  const [quartoParaReserva, setQuartoParaReserva] = useState<Quarto | null>(null);

  // Contagens para os botões de filtro no topo
  const total = quartos.length;
  const disponiveis = quartos.filter((q: Quarto) => obterStatusQuarto(q) === 'DISPONIVEL').length;
  const reservados = quartos.filter((q: Quarto) => obterStatusQuarto(q) === 'RESERVADO').length;
  const ocupados = quartos.filter((q: Quarto) => obterStatusQuarto(q) === 'OCUPADO').length;
  const agCheckin = quartos.filter((q: Quarto) => obterStatusQuarto(q) === 'AGUARDANDO_CHECKIN').length;
  const manutencao = quartos.filter((q: Quarto) => obterStatusQuarto(q) === 'MANUTENCAO').length;

  // Filtragem dos quartos
  const quartosFiltrados = quartos.filter((q: Quarto) => {
    const status = obterStatusQuarto(q);

    // Filtro por status
    if (filtroStatus === 'DISPONIVEL' && status !== 'DISPONIVEL') return false;
    if (filtroStatus === 'RESERVADO' && status !== 'RESERVADO') return false;
    if (filtroStatus === 'OCUPADO' && status !== 'OCUPADO') return false;
    if (filtroStatus === 'AG_CHECKIN' && status !== 'AGUARDANDO_CHECKIN') return false;
    if (filtroStatus === 'MANUTENCAO' && status !== 'MANUTENCAO') return false;

    // Filtro por termo de busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const bateNumero = obterNumeroQuarto(q).toLowerCase().includes(termo);
      const bateHospede = obterHospedeAtual(q).toLowerCase().includes(termo);
      const bateCategoria = obterCategoriaQuarto(q).toLowerCase().includes(termo);
      if (!bateNumero && !bateHospede && !bateCategoria) return false;
    }

    return true;
  });

  const handleAbrirDetalhes = (quarto: Quarto) => {
    setQuartoDetalhes(quarto);
    setModalDetalhesAberto(true);
  };

  const handleNovaReserva = (quarto: Quarto) => {
    setQuartoParaReserva(quarto);
    setModalNovaReservaAberto(true);
  };

  // Tela de carregamento
  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando quartos do sistema...</p>
      </div>
    );
  }

  // Tela de erro
  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600">
        <p className="font-semibold">Erro ao carregar quartos:</p>
        <p className="text-sm">{erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Barra de Filtros e Busca */}
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
          <button type="button" onClick={() => setFiltroStatus('TODO')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex flex-col items-center ${filtroStatus === 'TODO' ? 'bg-[#193b27] text-white' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'}`}>
            <span>Todo</span>
          </button>
          <button type="button" onClick={() => setFiltroStatus('DISPONIVEL')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${filtroStatus === 'DISPONIVEL' ? 'bg-[#193b27] text-white font-semibold' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'}`}>
            <span>Disponíve</span><span className="text-[10px] opacity-80">l ({disponiveis})</span>
          </button>
          <button type="button" onClick={() => setFiltroStatus('RESERVADO')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${filtroStatus === 'RESERVADO' ? 'bg-[#193b27] text-white font-semibold' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'}`}>
            <span>Reservad</span><span className="text-[10px] opacity-80">o ({reservados})</span>
          </button>
          <button type="button" onClick={() => setFiltroStatus('OCUPADO')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${filtroStatus === 'OCUPADO' ? 'bg-[#193b27] text-white font-semibold' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'}`}>
            <span>Ocupad</span><span className="text-[10px] opacity-80">o ({ocupados})</span>
          </button>
          <button type="button" onClick={() => setFiltroStatus('AG_CHECKIN')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${filtroStatus === 'AG_CHECKIN' ? 'bg-[#193b27] text-white font-semibold' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'}`}>
            <span>Ag. Check-</span><span className="text-[10px] opacity-80">in ({agCheckin})</span>
          </button>
          <button type="button" onClick={() => setFiltroStatus('MANUTENCAO')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${filtroStatus === 'MANUTENCAO' ? 'bg-[#193b27] text-white font-semibold' : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'}`}>
            <span>Manutençã</span><span className="text-[10px] opacity-80">o ({manutencao})</span>
          </button>
        </div>
      </div>

      {/* Grade de Quartos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quartosFiltrados.map((quarto: Quarto, index: number) => (
          <CardQuartoGerenciamento
            key={obterIdQuarto(quarto) || `quarto-${index}`}
            quarto={quarto}
            aoClicar={handleAbrirDetalhes}
            aoNovaReserva={handleNovaReserva}
          />
        ))}
        {quartosFiltrados.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500">
            Nenhum quarto encontrado com os filtros atuais.
          </div>
        )}
      </div>

      {/* Modais */}
      <ModalDetalhesQuarto
        quarto={quartoDetalhes}
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