import React, { useState } from 'react';
import {
  X,
  Bed,
  User,
  Calendar,
  DollarSign,
  Lock,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Quarto, Reserva } from '../../tipos';
import { formatarMoeda, formatarData } from '../../utilitarios/formatadores';
import { useHotel } from '../../contextos/ContextoHotel';

interface ModalDetalhesQuartoProps {
  quarto: Quarto | null;
  aberto: boolean;
  onFechar: () => void;
  onNovaReservaParaQuarto?: (quarto: Quarto) => void;
}

export const ModalDetalhesQuarto: React.FC<ModalDetalhesQuartoProps> = ({
  quarto,
  aberto,
  onFechar,
  onNovaReservaParaQuarto,
}) => {
  const {
    reservas,
    atualizarStatusQuarto,
    realizarCheckin,
    realizarCheckout,
    navegarPara,
  } = useHotel();

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!aberto || !quarto) return null;

  // Busca a reserva atual ou futura associada
  const reservaAtual = reservas.find(
    (r) =>
      r.QuartoId === quarto.QuartoId &&
      (r.Status === 'HOSPEDADO' ||
        r.Status === 'AGUARDANDO_CHECKIN' ||
        r.Status === 'CONFIRMADA')
  );

  const handleCheckin = () => {
    if (reservaAtual) {
      const res = realizarCheckin(reservaAtual.ReservaId);
      setFeedback(res.mensagem);
      setTimeout(() => {
        setFeedback(null);
        onFechar();
      }, 1500);
    }
  };

  const handleCheckout = () => {
    if (reservaAtual) {
      const res = realizarCheckout(reservaAtual.ReservaId);
      setFeedback(res.mensagem);
      setTimeout(() => {
        setFeedback(null);
        onFechar();
      }, 1500);
    }
  };

  const handleAlternarBloqueio = () => {
    if (quarto.Status === 'MANUTENCAO') {
      atualizarStatusQuarto(quarto.QuartoId, 'DISPONIVEL');
      setFeedback(`Quarto ${quarto.Numero} liberado para reservas.`);
    } else {
      atualizarStatusQuarto(quarto.QuartoId, 'MANUTENCAO');
      setFeedback(`Quarto ${quarto.Numero} bloqueado em manutenção.`);
    }
    setTimeout(() => {
      setFeedback(null);
      onFechar();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-[#053d1e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-['Manrope'] text-xl font-bold">
              {quarto.Numero}
            </div>
            <div>
              <h3 className="font-['Manrope'] text-lg font-bold">
                Quarto {quarto.Numero} • {quarto.CodigoIdentificador} ({quarto.Categoria})
              </h3>
              <p className="text-xs text-white/80">
                Bloco {quarto.Bloco} • Diária Padrão: {formatarMoeda(quarto.ValorDiariaPadrao)}
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {feedback && (
          <div className="bg-[#b8f0c2] text-[#00210d] px-6 py-3 text-sm font-semibold flex items-center gap-2 border-b border-[#92c89d]">
            <CheckCircle2 className="w-5 h-5 text-[#053d1e]" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Geral */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4]">
            <div>
              <p className="text-xs text-[#717971] uppercase font-semibold">Status Operacional</p>
              <p className="text-base font-bold text-[#191c1d] mt-0.5">{quarto.Status}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#717971] uppercase font-semibold">Capacidade</p>
              <p className="text-sm font-semibold text-[#191c1d]">
                {quarto.CapacidadeAdultos} Adultos • {quarto.CapacidadeCriancas} Crianças
              </p>
            </div>
          </div>

          {/* Dados da Reserva Ativa (se houver) */}
          {reservaAtual ? (
            <div className="border border-[#c1c9bf] rounded-xl p-4 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-[#e1e3e4] pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#053d1e]" />
                  <span className="font-['Manrope'] font-bold text-sm text-[#191c1d]">
                    Hóspede: {reservaAtual.HospedeNome}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#e6f4ea] text-[#137333]">
                  {reservaAtual.Codigo}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[#717971]">Telefone</p>
                  <p className="font-semibold text-[#191c1d] mt-0.5">
                    {reservaAtual.HospedeTelefone}
                  </p>
                </div>
                <div>
                  <p className="text-[#717971]">Entrada</p>
                  <p className="font-semibold text-[#191c1d] mt-0.5">
                    {formatarData(reservaAtual.DataEntrada)}
                  </p>
                </div>
                <div>
                  <p className="text-[#717971]">Saída</p>
                  <p className="font-semibold text-[#191c1d] mt-0.5">
                    {formatarData(reservaAtual.DataSaida)}
                  </p>
                </div>
                <div>
                  <p className="text-[#717971]">Ocupantes</p>
                  <p className="font-semibold text-[#191c1d] mt-0.5">
                    {reservaAtual.Adultos} Adultos, {reservaAtual.Criancas} Cri
                  </p>
                </div>
                <div>
                  <p className="text-[#717971]">Valor Total</p>
                  <p className="font-bold text-[#053d1e] mt-0.5">
                    {formatarMoeda(reservaAtual.ValorTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[#717971]">Saldo Pendente</p>
                  <p
                    className={`font-bold mt-0.5 ${
                      reservaAtual.Saldo > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'
                    }`}
                  >
                    {formatarMoeda(reservaAtual.Saldo)}
                  </p>
                </div>
              </div>

              {reservaAtual.Observacoes && (
                <div className="p-2.5 bg-[#f8f9fa] rounded-lg text-xs text-[#414941]">
                  <span className="font-semibold">Obs: </span>
                  {reservaAtual.Observacoes}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-[#c1c9bf] rounded-xl bg-[#f8f9fa]">
              <Bed className="w-8 h-8 text-[#717971] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[#191c1d]">
                Quarto sem ocupação no momento
              </p>
              <p className="text-xs text-[#717971] mt-1">
                Disponível para novas reservas e check-ins imediatos.
              </p>
              {onNovaReservaParaQuarto && (
                <button
                  onClick={() => {
                    onFechar();
                    onNovaReservaParaQuarto(quarto);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 bg-[#053d1e] hover:bg-[#225533] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar Reserva para este Quarto
                </button>
              )}
            </div>
          )}

          {/* Comodidades */}
          {quarto.Comodidades && quarto.Comodidades.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider mb-2">
                Comodidades do Quarto
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quarto.Comodidades.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#f3f4f5] text-[#414941] px-2.5 py-1 rounded-md border border-[#e1e3e4]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e1e3e4] flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleAlternarBloqueio}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#c1c9bf] hover:bg-[#e1e3e4] text-[#414941] transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            {quarto.Status === 'MANUTENCAO' ? 'Liberar Quarto' : 'Bloquear Manutenção'}
          </button>

          <div className="flex items-center gap-2">
            {reservaAtual?.Status === 'AGUARDANDO_CHECKIN' && (
              <button
                onClick={handleCheckin}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#053d1e] hover:bg-[#225533] text-white transition-colors shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Realizar Check-in
              </button>
            )}

            {reservaAtual?.Status === 'HOSPEDADO' && (
              <button
                onClick={handleCheckout}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white transition-colors shadow-xs cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                Realizar Check-out
              </button>
            )}

            <button
              onClick={onFechar}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-[#414941] hover:bg-[#e1e3e4] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
