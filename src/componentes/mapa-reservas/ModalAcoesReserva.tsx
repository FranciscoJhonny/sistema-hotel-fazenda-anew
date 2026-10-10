import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  PauseCircle,
  LogIn,
  LogOut,
  Ban,
  User,
  Calendar,
  Bed,
  CreditCard,
  AlertTriangle,
  LoaderCircle,
  CheckCircle2
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Reserva } from '../../tipos';
import { formatarData, formatarMoeda } from '../../utilitarios/formatadores';

interface ModalAcoesReservaProps {
  aberto: boolean;
  reserva: Reserva | null;
  onFechar: () => void;
  onAbrirTrocaQuarto: (reserva: Reserva) => void;
  onSucesso?: (mensagem: string) => void;
}

export const ModalAcoesReserva: React.FC<ModalAcoesReservaProps> = ({
  aberto,
  reserva,
  onFechar,
  onAbrirTrocaQuarto,
  onSucesso,
}) => {
  const {
    suspenderReservaComCredito,
    cancelarReserva,
    realizarCheckin,
    navegarPara
  } = useHotel();

  const [carregando, setCarregando] = useState(false);
  const [confirmandoSuspencao, setConfirmandoSuspencao] = useState(false);
  const [motivoSuspencao, setMotivoSuspencao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  React.useEffect(() => {
    if (aberto) {
      setConfirmandoSuspencao(false);
      setMotivoSuspencao('');
      setErro(null);
      setCarregando(false);
    }
  }, [aberto, reserva]);

  if (!aberto || !reserva) return null;

  const estaHospedado = reserva.statusreserva === 'HOSPEDADO';
  const podeCheckin = reserva.statusreserva === 'RESERVADO' || reserva.statusreserva === 'PRE_RESERVA';

  const handleSuspenderCredito = async () => {
    setErro(null);
    try {
      setCarregando(true);
      const res = await suspenderReservaComCredito(reserva.reservaid, motivoSuspencao.trim());
      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem || 'Não foi possível suspender a reserva.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCheckin = async () => {
    setErro(null);
    try {
      setCarregando(true);
      const res = await realizarCheckin(reserva.reservaid);
      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem);
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao realizar check-in.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCheckout = () => {
    onFechar();
    navegarPara('checkout');
  };

  const handleCancelar = async () => {
    if (!window.confirm(`Tem certeza de que deseja cancelar a reserva ${reserva.codigo}?`)) return;
    setErro(null);
    try {
      setCarregando(true);
      const res = await cancelarReserva(reserva.reservaid, 'Cancelada no Mapa de Reservas');
      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem);
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao cancelar reserva.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Bed className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-['Manrope']">
                Detalhes & Ações da Reserva
              </h2>
              <p className="text-xs text-white/80">
                Código {reserva.codigo} • {reserva.hospedenome}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Resumo da Reserva */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-[#053d1e]" />
                {reserva.hospedenome}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f4ea] text-[#053d1e]">
                {reserva.statusreserva}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] pt-2 border-t border-slate-200/70">
              <div>
                <span className="text-slate-400 block">Quarto Alocado:</span>
                <span className="font-bold text-slate-800 text-xs">
                  Quarto #{reserva.quartonumero} ({reserva.quartocategoria})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Período de Hospedagem:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {formatarData(reserva.dataentrada)} até {formatarData(reserva.datasaida)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Total:</span>
                <span className="font-bold text-slate-800">{formatarMoeda(reserva.valortotal)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Já Pago:</span>
                <span className="font-bold text-emerald-700">{formatarMoeda(reserva.valorpago)}</span>
              </div>
            </div>
          </div>

          {/* Modo de Confirmação de Suspensão com Crédito */}
          {confirmandoSuspencao ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Suspender Reserva & Gerar Crédito</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Ao suspender a reserva, o quarto físico será imediatamente liberado para novas reservas. O valor de{' '}
                <strong>{formatarMoeda(reserva.valorpago)}</strong> permanecerá salvo como crédito ativo para o hóspede remarcar futuramente.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Motivo da Suspensão / Observação (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Imprevisto pessoal do cliente / solicitação de adiamento"
                  value={motivoSuspencao}
                  onChange={(e) => setMotivoSuspencao(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmandoSuspencao(false)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={carregando}
                  onClick={handleSuspenderCredito}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {carregando ? (
                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PauseCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar Crédito (R$ {reserva.valorpago.toFixed(2)})</span>
                </button>
              </div>
            </div>
          ) : (
            /* Botões de Ações Principais */
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700 block mb-1">Ações Operacionais Disponíveis:</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Trocar Quarto */}
                <button
                  type="button"
                  onClick={() => {
                    onFechar();
                    onAbrirTrocaQuarto(reserva);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-4 h-4 text-[#053d1e] shrink-0" />
                  <span>🔄 Trocar Quarto</span>
                </button>

                {/* 2. Suspender / Gerar Crédito */}
                <button
                  type="button"
                  onClick={() => setConfirmandoSuspencao(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>⏸️ Suspender (Crédito)</span>
                </button>

                {/* 3. Check-in (se aplicável) */}
                {podeCheckin && (
                  <button
                    type="button"
                    disabled={carregando}
                    onClick={handleCheckin}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <LogIn className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Realizar Check-in</span>
                  </button>
                )}

                {/* 4. Check-out (se hospedado) */}
                {estaHospedado && (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <LogOut className="w-4 h-4 text-white shrink-0" />
                    <span>Ir para Check-out</span>
                  </button>
                )}

                {/* 5. Cancelar Reserva */}
                <button
                  type="button"
                  disabled={carregando}
                  onClick={handleCancelar}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Ban className="w-4 h-4 text-red-700 shrink-0" />
                  <span>Cancelar Reserva</span>
                </button>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
