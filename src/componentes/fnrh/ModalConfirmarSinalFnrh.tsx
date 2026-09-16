import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  DollarSign
} from 'lucide-react';
import { CadastroFnrh } from '../../tipos';
import { FnrhService } from '../../servicos/supabase/FnrhService';
import { useHotel } from '../../contextos/ContextoHotel';

interface ModalConfirmarSinalFnrhProps {
  aberto: boolean;
  cadastro: CadastroFnrh | null;
  onFechar: () => void;
  onSucesso: (mensagem: string) => void;
}

export const ModalConfirmarSinalFnrh: React.FC<ModalConfirmarSinalFnrhProps> = ({
  aberto,
  cadastro,
  onFechar,
  onSucesso,
}) => {
  const { usuarioAtual, recarregarDados } = useHotel();

  const [valorSinal, setValorSinal] = useState<string>(
    cadastro?.valor_sinal ? String(cadastro.valor_sinal) : ''
  );
  const [formaPagamento, setFormaPagamento] = useState<string>(
    cadastro?.forma_pagamento || 'PIX'
  );
  const [comprovante, setComprovante] = useState<string>('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  React.useEffect(() => {
    if (cadastro) {
      setValorSinal(cadastro.valor_sinal > 0 ? String(cadastro.valor_sinal) : '');
      setFormaPagamento(cadastro.forma_pagamento || 'PIX');
      setComprovante(cadastro.comprovante_url || '');
      setErro(null);
    }
  }, [cadastro]);

  if (!aberto || !cadastro) return null;

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const valorNumerico = parseFloat(valorSinal.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor de sinal válido maior que zero.');
      return;
    }

    setCarregando(true);

    const res = await FnrhService.confirmarSinalFnrh({
      cadastroid: cadastro.cadastroid,
      valorSinal: valorNumerico,
      formaPagamento,
      usuarioId: usuarioAtual?.usuarioid,
      comprovanteUrl: comprovante || undefined,
    });

    if (!res.sucesso) {
      setCarregando(false);
      setErro(res.mensagem || 'Não foi possível confirmar o sinal.');
      return;
    }

    // Recarrega todos os hóspedes e dados para que o hóspede recém-confirmado apareça no mapa de reservas
    try {
      await recarregarDados();
    } catch (e) {
      console.warn('Aviso ao recarregar dados do hotel:', e);
    } finally {
      setCarregando(false);
    }

    onSucesso(res.mensagem);
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <CreditCard className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-['Manrope']">
                Confirmar Sinal da Reserva (50%)
              </h2>
              <p className="text-xs text-white/80">
                Cadastro #{cadastro.cadastroid} • {cadastro.nomecompleto || 'Cliente sem nome'}
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleConfirmar} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
            <p className="font-semibold">Ao confirmar o sinal:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-emerald-800">
              <li>O cadastro será marcado como <strong>Liberado para Reserva</strong>.</li>
              <li>Os dados do titular e acompanhantes serão sincronizados para a base definitiva do hotel.</li>
              <li>A atendente poderá criar a reserva oficial no mapa de ocupação.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor do Sinal Recebido (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="text"
                required
                placeholder="0,00"
                value={valorSinal}
                onChange={(e) => setValorSinal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#c1c9bf] text-sm font-bold text-slate-800 outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Forma de Pagamento do Sinal *
            </label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e] bg-white font-medium"
            >
              <option value="PIX">PIX</option>
              <option value="VOUCHER">Voucher</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="TRANSFERENCIA">Transferência Bancária</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comprovante / Código da Transação (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Código PIX E12345678... ou anotação"
              value={comprovante}
              onChange={(e) => setComprovante(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 transition-all disabled:opacity-50 shadow-xs"
            >
              {carregando ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Pagamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

