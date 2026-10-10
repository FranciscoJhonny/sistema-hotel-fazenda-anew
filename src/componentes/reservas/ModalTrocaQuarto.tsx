import React, { useState, useMemo } from 'react';
import {
  X,
  RefreshCw,
  DoorOpen,
  Bed,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Info,
  CalendarDays,
  User
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Reserva, Quarto } from '../../tipos';
import { formatarData } from '../../utilitarios/formatadores';

interface ModalTrocaQuartoProps {
  aberto: boolean;
  reserva: Reserva | null;
  onFechar: () => void;
  onSucesso?: (mensagem: string) => void;
}

export const ModalTrocaQuarto: React.FC<ModalTrocaQuartoProps> = ({
  aberto,
  reserva,
  onFechar,
  onSucesso,
}) => {
  const { quartos, trocarQuartoReserva } = useHotel();

  const [novoQuartoId, setNovoQuartoId] = useState<number | string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  React.useEffect(() => {
    if (aberto) {
      setNovoQuartoId('');
      setMotivo('');
      setErro(null);
      setCarregando(false);
    }
  }, [aberto, reserva]);

  if (!aberto || !reserva) return null;

  // Filtrar apenas quartos físicos disponíveis para troca (excluindo Day Use e o quarto atual)
  const quartosDisponiveis = quartos.filter((q) => {
    const cod = String(q.codigoidentificador || '').toUpperCase();
    const num = String(q.numero || '').toUpperCase();
    const cat = String(q.categoria || '').toUpperCase();

    const ehDayUse = cod === 'DAY_USE' || num === 'DU' || num === 'DAY USE' || cat === 'DAY USE';
    const ehQuartoAtual = Number(q.quartoid) === Number(reserva.quartoid);
    const estaAtivo = q.ativo !== false;

    return !ehDayUse && !ehQuartoAtual && estaAtivo;
  });

  const estaHospedado = reserva.statusreserva === 'HOSPEDADO';
  const quartoAtualObj = quartos.find((q) => Number(q.quartoid) === Number(reserva.quartoid));
  const novoQuartoSelecionadoObj = quartos.find((q) => Number(q.quartoid) === Number(novoQuartoId));

  const handleConfirmarTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!novoQuartoId) {
      setErro('Por favor, selecione o novo quarto para onde a reserva será transferida.');
      return;
    }

    try {
      setCarregando(true);
      const res = await trocarQuartoReserva(reserva.reservaid, novoQuartoId, motivo.trim());

      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem || 'Erro ao realizar troca de quarto.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao transferir quarto.');
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
              <RefreshCw className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-['Manrope']">
                Troca / Transferência de Quarto
              </h2>
              <p className="text-xs text-white/80">
                Reserva {reserva.codigo} • {reserva.hospedenome || 'Hóspede'}
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

        {/* Formulário */}
        <form onSubmit={handleConfirmarTroca} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Dados da Reserva Atual */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#053d1e]" />
                {reserva.hospedenome}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                estaHospedado ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {estaHospedado ? 'HOSPEDADO (Estadia em andamento)' : 'RESERVADO (Pré Check-in)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400 block">Quarto Atual:</span>
                <span className="font-bold text-slate-800">
                  Quarto #{reserva.quartonumero || quartoAtualObj?.numero || 'N/A'} ({reserva.quartocategoria || quartoAtualObj?.categoria || 'Standard'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Período:</span>
                <span className="font-bold text-slate-800">
                  {formatarData(reserva.dataentrada)} até {formatarData(reserva.datasaida)}
                </span>
              </div>
            </div>
          </div>

          {/* Seleção do Novo Quarto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Selecione o Novo Quarto <span className="text-red-500">*</span>
            </label>
            <select
              value={novoQuartoId}
              onChange={(e) => setNovoQuartoId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c9bf] bg-white text-xs font-bold text-slate-800 outline-none focus:border-[#053d1e] transition-all"
            >
              <option value="">-- Selecione uma acomodação disponível --</option>
              {quartosDisponiveis.map((q) => (
                <option key={q.quartoid} value={q.quartoid}>
                  Quarto #{q.codigoidentificador || q.numero} — {q.categoria} (Bloco {q.bloco}) — Status: {q.status}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo da Troca */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motivo da Transferência / Observação (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Pedido do hóspede, manutenção no ar-condicionado, migração de bloco..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
            />
          </div>

          {/* Explicação / Cenário */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Regras de Transferência Operacional:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-900/80 text-[11px] leading-relaxed">
              {estaHospedado ? (
                <>
                  <li>O Quarto <strong>#{reserva.quartonumero || 'atual'}</strong> será liberado e alterado para o status <strong>A LIMPAR</strong> (necessita higienização).</li>
                  <li>O novo Quarto <strong>#{novoQuartoSelecionadoObj?.numero || 'selecionado'}</strong> passará imediatamente para <strong>OCUPADO</strong>.</li>
                  <li>Todos os consumos extras vinculados à reserva (Bar, Lojinha) continuam totalmente preservados.</li>
                </>
              ) : (
                <>
                  <li>A reserva será atualizada para o novo quarto no mapa de ocupação.</li>
                  <li>O quarto anterior retornará para o status <strong>DISPONÍVEL</strong>.</li>
                </>
              )}
            </ul>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onFechar}
              disabled={carregando}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando || !novoQuartoId}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#053d1e] hover:bg-[#205435] transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {carregando ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Confirmar Troca de Quarto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
