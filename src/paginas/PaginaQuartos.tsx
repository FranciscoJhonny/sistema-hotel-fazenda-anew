import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CardQuartoGerenciamento } from '../componentes/quartos/CardQuartoGerenciamento';
import { ModalDetalhesQuarto } from '../componentes/quartos/ModalDetalhesQuarto';
import { ModalNovaReserva } from '../componentes/reservas/ModalNovaReserva';
import { Quarto } from '../tipos';

export const PaginaQuartos: React.FC = () => {
  const { quartos } = useHotel();

  // Estados locais
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODO');
  const [quartoDetalhes, setQuartoDetalhes] = useState<Quarto | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState<boolean>(false);
  const [modalNovaReservaAberto, setModalNovaReservaAberto] = useState<boolean>(false);
  const [quartoParaReserva, setQuartoParaReserva] = useState<Quarto | null>(null);

  // Contagens para os botões de filtro no topo
  const total = quartos.length;
  const disponiveis = quartos.filter((q: Quarto) => q.status === 'DISPONIVEL').length;
  const reservados = quartos.filter((q: Quarto) => q.status === 'RESERVADO').length;
  const ocupados = quartos.filter((q: Quarto) => q.status === 'OCUPADO').length;
  const agCheckin = quartos.filter((q: Quarto) => q.status === 'AGUARDANDO_CHECKIN').length;
  const manutencao = quartos.filter((q: Quarto) => q.status === 'MANUTENCAO').length;

  // Filtragem dos quartos
  const quartosFiltrados = quartos.filter((q: Quarto) => {
    // Filtro por status
    if (filtroStatus === 'DISPONIVEL' && q.status !== 'DISPONIVEL') return false;
    if (filtroStatus === 'RESERVADO' && q.status !== 'RESERVADO') return false;
    if (filtroStatus === 'OCUPADO' && q.status !== 'OCUPADO') return false;
    if (filtroStatus === 'AG_CHECKIN' && q.status !== 'AGUARDANDO_CHECKIN') return false;
    if (filtroStatus === 'MANUTENCAO' && q.status !== 'MANUTENCAO') return false;

    // Filtro por termo de busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const bateNumero = q.numero?.toLowerCase().includes(termo);
      const bateHospede = q.hospedeatualnome?.toLowerCase().includes(termo);
      const bateCategoria = q.categoria?.toLowerCase().includes(termo);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Barra de Filtros e Busca Exatamente como na Imagem */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Campo de Busca à esquerda: "Buscar hóspede ou quarto..." */}
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

        {/* Grupo de Filtros com Contadores (Pills verticais conforme imagem) */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* 1. Todo */}
          <button
            type="button"
            onClick={() => setFiltroStatus('TODO')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex flex-col items-center ${
              filtroStatus === 'TODO'
                ? 'bg-[#193b27] text-white'
                : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            <span>Todo</span>
          </button>

          {/* 2. Disponível */}
          <button
            type="button"
            onClick={() => setFiltroStatus('DISPONIVEL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${
              filtroStatus === 'DISPONIVEL'
                ? 'bg-[#193b27] text-white font-semibold'
                : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            <span>Disponíve</span>
            <span className="text-[10px] opacity-80">l ({disponiveis})</span>
          </button>

          {/* 3. Reservado */}
          <button
            type="button"
            onClick={() => setFiltroStatus('RESERVADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${
              filtroStatus === 'RESERVADO'
                ? 'bg-[#193b27] text-white font-semibold'
                : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            <span>Reservad</span>
            <span className="text-[10px] opacity-80">o ({reservados})</span>
          </button>

          {/* 4. Ocupado */}
          <button
            type="button"
            onClick={() => setFiltroStatus('OCUPADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${
              filtroStatus === 'OCUPADO'
                ? 'bg-[#193b27] text-white font-semibold'
                : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            <span>Ocupad</span>
            <span className="text-[10px] opacity-80">o ({ocupados})</span>
          </button>

          {/* 5. Ag. Check-in */}
          <button
            type="button"
            onClick={() => setFiltroStatus('AG_CHECKIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${
              filtroStatus === 'AG_CHECKIN'
                ? 'bg-[#193b27] text-white font-semibold'
                : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            <span>Ag. Check-</span>
            <span className="text-[10px] opacity-80">in ({agCheckin})</span>
          </button>

          {/* 6. Manutenção */}
          <button
            type="button"
            onClick={() => setFiltroStatus('MANUTENCAO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex flex-col items-center leading-tight ${
              filtroStatus === 'MANUTENCAO'
                ? 'bg-[#193b27] text-white font-semibold'
                : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
            }`}
          >
            <span>Manutençã</span>
            <span className="text-[10px] opacity-80">o ({manutencao})</span>
          </button>
        </div>
      </div>

      {/* Grade com 4 Colunas Exatamente igual à imagem:
          Linha 1: B1, B2, B3, B4
          Linha 2: C2, C3, C4, D1
          Linha 3: D2, D3, D4, D5
          Linha 4: D6
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quartosFiltrados.map((quarto: Quarto) => (
          <CardQuartoGerenciamento
            key={quarto.quartoid}
            quarto={quarto}
            aoClicar={handleAbrirDetalhes}
            aoNovaReserva={handleNovaReserva}
          />
        ))}
      </div>

      {/* Modais de Detalhes e Nova Reserva */}
      <ModalDetalhesQuarto
        quarto={quartoDetalhes}
        aberto={modalDetalhesAberto}
        onFechar={() => {
          setModalDetalhesAberto(false);
          setQuartoDetalhes(null);
        }}
        onNovaReservaParaQuarto={handleNovaReserva}
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