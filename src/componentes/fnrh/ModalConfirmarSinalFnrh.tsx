import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Clock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { CadastroFnrh, Pacote } from '../../tipos';
import { FnrhService } from '../../servicos/supabase/FnrhService';
import { useHotel } from '../../contextos/ContextoHotel';
import { formatarMoeda } from '../../utilitarios/formatadores';

interface ModalConfirmarSinalFnrhProps {
  aberto: boolean;
  cadastro: CadastroFnrh | null;
  valorTotalSugerido?: number;
  pacoteSugerido?: Pacote | null;
  onFechar: () => void;
  onSucesso: (mensagem: string) => void;
}

export const ModalConfirmarSinalFnrh: React.FC<ModalConfirmarSinalFnrhProps> = ({
  aberto,
  cadastro,
  valorTotalSugerido,
  pacoteSugerido,
  onFechar,
  onSucesso,
}) => {
  const { usuarioAtual, recarregarDados } = useHotel();

  const [semSinal, setSemSinal] = useState<boolean>(false);
  const [valorSinal, setValorSinal] = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [comprovante, setComprovante] = useState<string>('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const sinalCalculado = useMemo(() => {
    if (valorTotalSugerido && valorTotalSugerido > 0) {
      return valorTotalSugerido * 0.5;
    }
    return 0;
  }, [valorTotalSugerido]);

  useEffect(() => {
    if (cadastro) {
      setSemSinal(false);
      if (cadastro.valor_sinal > 0) {
        setValorSinal(String(cadastro.valor_sinal));
      } else if (sinalCalculado > 0) {
        setValorSinal(sinalCalculado.toFixed(2).replace('.', ','));
      } else {
        setValorSinal('');
      }

      const fp = cadastro.forma_pagamento && cadastro.forma_pagamento !== 'CHECKOUT'
        ? cadastro.forma_pagamento
        : 'PIX';
      setFormaPagamento(fp);
      setComprovante(cadastro.comprovante_url || '');
      setErro(null);
    }
  }, [cadastro, sinalCalculado]);

  if (!aberto || !cadastro) return null;

  const handleToggleSemSinal = (marcado: boolean) => {
    setSemSinal(marcado);
    setErro(null);
    if (marcado) {
      setValorSinal('0,00');
    } else {
      if (cadastro.valor_sinal > 0) {
        setValorSinal(String(cadastro.valor_sinal));
      } else if (sinalCalculado > 0) {
        setValorSinal(sinalCalculado.toFixed(2).replace('.', ','));
      } else {
        setValorSinal('');
      }
    }
  };

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    let valorNumerico = 0;

    if (!semSinal) {
      valorNumerico = parseFloat(valorSinal.replace(',', '.'));
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        setErro('Informe um valor de sinal válido maior que zero ou marque a opção de pagar no check-out.');
        return;
      }
    }

    setCarregando(true);

    const fpEnvio = !formaPagamento || formaPagamento === 'CHECKOUT' ? 'DINHEIRO' : formaPagamento;

    const res = await FnrhService.confirmarSinalFnrh({
      cadastroid: cadastro.cadastroid,
      valorSinal: semSinal ? 0 : valorNumerico,
      formaPagamento: fpEnvio,
      usuarioId: usuarioAtual?.usuarioid,
      comprovanteUrl: semSinal ? 'Sem sinal (pagamento 100% no check-out)' : (comprovante || undefined),
    });

    if (!res.sucesso) {
      setCarregando(false);
      setErro(res.mensagem || 'Não foi possível confirmar a liberação da reserva.');
      return;
    }

    // Vincula o valor total estimado ao cadastro em memória
    if (valorTotalSugerido && valorTotalSugerido > 0) {
      cadastro.valor_total = valorTotalSugerido;
    }

    // Recarrega todos os dados para sincronizar o mapa de reservas
    try {
      await recarregarDados();
    } catch (e) {
      console.warn('Aviso ao recarregar dados do hotel:', e);
    } finally {
      setCarregando(false);
    }

    onSucesso(semSinal ? 'Cadastro liberado sem sinal (pagamento 100% no check-out)!' : res.mensagem);
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
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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

          {/* Resumo de Valores Calculados */}
          {valorTotalSugerido && valorTotalSugerido > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-emerald-800">Total Previsto da Estadia:</span>
                <span className="font-extrabold text-sm text-[#053d1e] font-['Manrope']">
                  {formatarMoeda(valorTotalSugerido)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700">
                <span>Sinal Sugerido (50%):</span>
                <span className="font-bold text-emerald-900">
                  {formatarMoeda(sinalCalculado)}
                </span>
              </div>
              {pacoteSugerido && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Pacote Aplicado:
                  </span>
                  <span className="font-semibold text-emerald-900">{pacoteSugerido.nome}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* CHECKBOX: Pagar tudo no Check-out */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 transition-all">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={semSinal}
                onChange={(e) => handleToggleSemSinal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[#053d1e] focus:ring-[#053d1e] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-950 block">
                  Não cobrar sinal agora (pagar 100% no check-out)
                </span>
                <span className="text-amber-800 text-[11px] block mt-0.5">
                  Marque esta opção se o cliente foi autorizado a pagar o valor total apenas no momento da saída do hotel.
                </span>
              </div>
            </label>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-[#053d1e]" />
              <span>Ao confirmar a liberação:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
              <li>O cadastro será marcado como <strong>Liberado para Reserva</strong>.</li>
              <li>Os dados do titular e acompanhantes serão sincronizados para o hotel.</li>
              <li>A atendente poderá alocar o quarto diretamente no mapa de ocupação.</li>
            </ul>
          </div>

          {/* Valor do Sinal */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Valor do Sinal Recebido (R$) {!semSinal && '*'}
              </label>
              {!semSinal && sinalCalculado > 0 && (
                <button
                  type="button"
                  onClick={() => setValorSinal(sinalCalculado.toFixed(2).replace('.', ','))}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                >
                  Usar 50% ({formatarMoeda(sinalCalculado)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className={`absolute left-3 top-2.5 text-xs font-bold ${semSinal ? 'text-slate-300' : 'text-slate-400'}`}>
                R$
              </span>
              <input
                type="text"
                disabled={semSinal}
                required={!semSinal}
                placeholder="0,00"
                value={valorSinal}
                onChange={(e) => setValorSinal(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-bold outline-none transition-all ${
                  semSinal
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'border-[#c1c9bf] bg-white text-slate-800 focus:border-[#053d1e]'
                }`}
              />
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Forma de Pagamento do Sinal {!semSinal && '*'}
            </label>
            <select
              disabled={semSinal}
              value={formaPagamento === 'CHECKOUT' ? 'DINHEIRO' : formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                semSinal
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border-[#c1c9bf] bg-white font-medium focus:border-[#053d1e]'
              }`}
            >
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="TRANSFERENCIA">Transferência Bancária</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="VOUCHER">Voucher</option>
            </select>
          </div>

          {/* Comprovante / Observação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {semSinal ? 'Observação interna (opcional)' : 'Comprovante / Código da Transação (opcional)'}
            </label>
            <input
              type="text"
              placeholder={semSinal ? 'Ex: Autorizado pelo gerente ou cliente corporativo' : 'Ex: Código PIX E12345678... ou anotação'}
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
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 shadow-xs cursor-pointer ${
                semSinal
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {carregando ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Liberando...
                </>
              ) : semSinal ? (
                <>
                  <Clock className="w-4 h-4" />
                  Liberar sem Sinal (Pagar no Check-out)
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Pagamento do Sinal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};