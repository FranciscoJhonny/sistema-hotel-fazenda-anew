import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Trash2,
  Eye,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { Reserva, StatusReserva } from '../tipos';
import { formatarMoeda, formatarData } from '../utilitarios/formatadores';
import { ModalNovaReserva } from '../componentes/reservas/ModalNovaReserva';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';

interface PaginaReservasProps {
  abrirModalNova?: boolean;
}

export const PaginaReservas: React.FC<PaginaReservasProps> = ({ abrirModalNova = false }) => {
  const {
    reservas,
    cancelarReserva,
    realizarCheckin,
    realizarCheckout,
    navegarPara,
  } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [modalNovaReservaAberto, setModalNovaReservaAberto] = useState<boolean>(abrirModalNova);
  const [reservaParaCancelar, setReservaParaCancelar] = useState<Reserva | null>(null);
  const [modalCancelarAberto, setModalCancelarAberto] = useState<boolean>(false);
  const [reservaSelecionadaVer, setReservaSelecionadaVer] = useState<Reserva | null>(null);

  // Filtragem
  const reservasFiltradas = reservas.filter((res) => {
    if (filtroStatus !== 'TODAS' && res.statusreserva !== filtroStatus) return false;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const matchNome = (res.hospedenome || '').toLowerCase().includes(termo);
      const matchCodigo = (res.codigo || '').toLowerCase().includes(termo);
      const matchQuarto = (res.quartonumero || '').toLowerCase().includes(termo) || (res.quartocodigo || '').toLowerCase().includes(termo);
      return matchNome || matchCodigo || matchQuarto;
    }
    return true;
  });

  const handleConfirmarCancelamento = () => {
    if (reservaParaCancelar) {
      cancelarReserva(reservaParaCancelar.reservaid, 'Cancelamento solicitado pelo operador');
      setModalCancelarAberto(false);
      setReservaParaCancelar(null);
    }
  };

  const getStatusBadge = (status: StatusReserva) => {
    switch (status) {
      case 'RESERVADO':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#d5e3ff] text-[#00417e]">Reservado</span>;
      case 'PRE_RESERVA':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#ffe088] text-[#4f3e00]">Pré-reserva</span>;
      case 'HOSPEDADO':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#ffdad6] text-[#93000a]">Hospedado</span>;
      case 'CONCLUIDA':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#e6f4ea] text-[#137333]">Concluída</span>;
      case 'CANCELADA':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#e1e3e4] text-[#414941]">Cancelada</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
            Central de Reservas
          </h1>
          <p className="text-xs text-[#717971] mt-1">
            Gerenciamento completo das reservas de hospedagem, day use e eventos do Hotel Fazenda Anew.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalNovaReservaAberto(true)}
            className="px-4 py-2 text-xs font-bold bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Reserva</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por hóspede, código (#49281) ou quarto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end">
          <span className="text-[#717971] font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="p-1.5 bg-[#f8f9fa] border border-[#c1c9bf] rounded-md font-semibold text-xs focus:outline-none"
          >
            <option value="TODAS">Todas as Reservas</option>
            <option value="PRE_RESERVA">Pré-reserva</option>
            <option value="HOSPEDADO">Hospedado</option>
            <option value="RESERVADO">Reservado</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabela de Reservas */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#c1c9bf] text-[#414941] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Hóspede</th>
                <th className="py-3 px-4">Quarto</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Ocupantes</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Saldo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
              {reservasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[#717971]">
                    Nenhuma reserva encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                reservasFiltradas.map((res) => (
                  <tr key={res.reservaid} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#053d1e]">
                      {res.codigo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#191c1d]">{res.hospedenome}</div>
                      <div className="text-[10px] text-[#717971]">{res.hospedetelefone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#191c1d]">Quarto {res.quartonumero}</span>{' '}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#e6f4ea] text-[#137333]">
                        {res.quartocodigo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{formatarData(res.dataentrada)} a {formatarData(res.datasaida)}</div>
                      <div className="text-[10px] text-[#717971]">
                        Check-in: {res.horarioprevistochegada || '09:00'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {res.adultos} Ad {res.criancas > 0 ? `, ${res.criancas} Cri` : ''}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {formatarMoeda(res.valortotal)}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span className={res.saldo > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}>
                        {formatarMoeda(res.saldo)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(res.statusreserva)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setReservaSelecionadaVer(res)}
                          className="p-1.5 text-[#414941] hover:text-[#053d1e] hover:bg-[#e1e3e4] rounded transition-colors cursor-pointer"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(res.statusreserva === 'PRE_RESERVA' || res.statusreserva === 'RESERVADO') && (
                          <button
                            onClick={() => realizarCheckin(res.reservaid)}
                            className="px-2.5 py-1 bg-[#053d1e] hover:bg-[#225533] text-white rounded font-semibold text-[11px] shadow-xs cursor-pointer"
                          >
                            Check-in
                          </button>
                        )}

                        {res.statusreserva === 'HOSPEDADO' && (
                          <button
                            onClick={() => realizarCheckout(res.reservaid)}
                            className="px-2.5 py-1 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded font-semibold text-[11px] shadow-xs cursor-pointer"
                          >
                            Check-out
                          </button>
                        )}

                        {res.statusreserva !== 'CANCELADA' && res.statusreserva !== 'CONCLUIDA' && (
                          <button
                            onClick={() => {
                              setReservaParaCancelar(res);
                              setModalCancelarAberto(true);
                            }}
                            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors cursor-pointer"
                            title="Cancelar reserva"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Reserva */}
      <ModalNovaReserva
        aberto={modalNovaReservaAberto}
        onFechar={() => setModalNovaReservaAberto(false)}
      />

      {/* Modal Cancelar Reserva */}
      <ModalConfirmacao
        aberto={modalCancelarAberto}
        titulo="Confirmar Cancelamento"
        mensagem={`Deseja realmente cancelar a reserva ${reservaParaCancelar?.codigo} de ${reservaParaCancelar?.hospedenome}? O quarto será liberado.`}
        tipo="perigo"
        textoConfirmar="Sim, Cancelar Reserva"
        textoCancelar="Voltar"
        onConfirmar={handleConfirmarCancelamento}
        onCancelar={() => {
          setModalCancelarAberto(false);
          setReservaParaCancelar(null);
        }}
      />

      {/* Modal Ver Detalhes da Reserva */}
      {reservaSelecionadaVer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e1e3e4]">
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
                Detalhes da Reserva {reservaSelecionadaVer.codigo}
              </h3>
              <button
                onClick={() => setReservaSelecionadaVer(null)}
                className="text-[#717971] hover:text-[#191c1d] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#717971]">Hóspede:</p>
                <p className="font-bold text-[#191c1d]">{reservaSelecionadaVer.hospedenome}</p>
              </div>
              <div>
                <p className="text-[#717971]">Telefone:</p>
                <p className="font-semibold text-[#191c1d]">{reservaSelecionadaVer.hospedetelefone}</p>
              </div>
              <div>
                <p className="text-[#717971]">Quarto:</p>
                <p className="font-bold text-[#053d1e]">
                  Quarto {reservaSelecionadaVer.quartonumero} ({reservaSelecionadaVer.quartocodigo})
                </p>
              </div>
              <div>
                <p className="text-[#717971]">Categoria:</p>
                <p className="font-medium text-[#191c1d]">{reservaSelecionadaVer.quartocategoria}</p>
              </div>
              <div>
                <p className="text-[#717971]">Entrada:</p>
                <p className="font-semibold text-[#191c1d]">
                  {formatarData(reservaSelecionadaVer.dataentrada)} às {reservaSelecionadaVer.horarioprevistochegada || '09:00'}
                </p>
              </div>
              <div>
                <p className="text-[#717971]">Saída:</p>
                <p className="font-semibold text-[#191c1d]">
                  {formatarData(reservaSelecionadaVer.datasaida)} às {reservaSelecionadaVer.horarioprevistosaida || '15:00'}
                </p>
              </div>
              <div>
                <p className="text-[#717971]">Valor Total:</p>
                <p className="font-bold text-[#053d1e] text-sm">
                  {formatarMoeda(reservaSelecionadaVer.valortotal)}
                </p>
              </div>
              <div>
                <p className="text-[#717971]">Saldo Pendente:</p>
                <p className="font-bold text-[#ba1a1a] text-sm">
                  {formatarMoeda(reservaSelecionadaVer.saldo)}
                </p>
              </div>
            </div>

            {reservaSelecionadaVer.observacoes && (
              <div className="p-3 rounded-lg bg-[#f8f9fa] text-xs text-[#414941]">
                <span className="font-semibold">Observações: </span>
                {reservaSelecionadaVer.observacoes}
              </div>
            )}

            <div className="pt-3 border-t border-[#e1e3e4] flex justify-end">
              <button
                onClick={() => setReservaSelecionadaVer(null)}
                className="px-4 py-2 bg-[#053d1e] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};