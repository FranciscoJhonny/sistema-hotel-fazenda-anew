import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { CadastroFnrh, Pacote } from '../../tipos';
import { FnrhService } from '../../servicos/supabase/FnrhService';
import { useHotel } from '../../contextos/ContextoHotel';
import {
  formatarMoeda,
  aplicarMascaraMoeda,
  desformatarMoeda,
  calcularIdadeNumerica
} from '../../utilitarios/formatadores';

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

  const valorBasePacote = useMemo(() => {
    if (pacoteSugerido?.valor && Number(pacoteSugerido.valor) > 0) {
      return Number(pacoteSugerido.valor);
    }
    return 750;
  }, [pacoteSugerido]);

  // Classificação dos acompanhantes e tarifas
  const acompanhantesETarifas = useMemo(() => {
    if (!cadastro) return [];
    const dEntrada = (cadastro.dataentrada || '').slice(0, 10).trim();
    const lista: Array<{
      nome: string;
      tipoHospede: string;
      idade: number;
      tarifaTexto: string;
      percentual: number;
      valor: number;
      badgeClasse: string;
    }> = [];

    // Titular
    lista.push({
      nome: cadastro.nomecompleto || 'Titular da Reserva',
      tipoHospede: 'Titular (Adulto)',
      idade: 30,
      tarifaTexto: 'Inteira (100%)',
      percentual: 100,
      valor: valorBasePacote,
      badgeClasse: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    });

    // Acompanhantes
    if (cadastro.acompanhantes && cadastro.acompanhantes.length > 0) {
      cadastro.acompanhantes.forEach((acomp) => {
        let idade = 30;
        if (acomp.datanascimento) {
          idade = calcularIdadeNumerica(acomp.datanascimento);
        } else if (acomp.menoridade) {
          idade = 8;
        }

        const idadeNum = Number(idade);

        if (idadeNum <= 5) {
          lista.push({
            nome: acomp.nomecompleto,
            tipoHospede: 'Criança (Grátis)',
            idade: idadeNum,
            tarifaTexto: 'Grátis (0%)',
            percentual: 0,
            valor: 0,
            badgeClasse: 'bg-blue-50 text-blue-700 border-blue-200',
          });
        } else if (idadeNum <= 11) {
          lista.push({
            nome: acomp.nomecompleto,
            tipoHospede: 'Criança Pagante',
            idade: idadeNum,
            tarifaTexto: 'Meia (50%)',
            percentual: 50,
            valor: valorBasePacote * 0.5,
            badgeClasse: 'bg-amber-50 text-amber-800 border-amber-300',
          });
        } else {
          lista.push({
            nome: acomp.nomecompleto,
            tipoHospede: 'Acompanhante Adulto',
            idade: idadeNum,
            tarifaTexto: 'Inteira (100%)',
            percentual: 100,
            valor: valorBasePacote,
            badgeClasse: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          });
        }
      });
    }

    return lista;
  }, [cadastro, valorBasePacote]);

  // Soma do valor total e do sinal da modal:
  // Total = (Qtd Adultos * ValorPacote) + (Qtd Crianças Meia [6 a 11 anos] * (ValorPacote * 0.5))
  // Sinal = Total / 2
  const { totalCalculado, sinalCalculado } = useMemo(() => {
    if (acompanhantesETarifas.length > 0) {
      const total = acompanhantesETarifas.reduce((acc, h) => acc + h.valor, 0);
      return { totalCalculado: total, sinalCalculado: total * 0.5 };
    }
    const total = valorTotalSugerido || 0;
    return { totalCalculado: total, sinalCalculado: total * 0.5 };
  }, [acompanhantesETarifas, valorTotalSugerido]);

  useEffect(() => {
    if (cadastro) {
      setSemSinal(false);
      if (cadastro.valor_sinal > 0) {
        setValorSinal(aplicarMascaraMoeda(cadastro.valor_sinal));
      } else if (sinalCalculado > 0) {
        setValorSinal(aplicarMascaraMoeda(sinalCalculado));
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
      setValorSinal(aplicarMascaraMoeda(0));
    } else {
      if (cadastro.valor_sinal > 0) {
        setValorSinal(aplicarMascaraMoeda(cadastro.valor_sinal));
      } else if (sinalCalculado > 0) {
        setValorSinal(aplicarMascaraMoeda(sinalCalculado));
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
      valorNumerico = desformatarMoeda(valorSinal);
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
    if (totalCalculado && totalCalculado > 0) {
      cadastro.valor_total = totalCalculado;
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
          {totalCalculado && totalCalculado > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-emerald-800">Total Previsto da Estadia:</span>
                <span className="font-extrabold text-sm text-[#053d1e] font-['Manrope']">
                  {formatarMoeda(totalCalculado)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700">
                <span>Sinal Sugerido (50%):</span>
                <span className="font-bold text-emerald-900">
                  {formatarMoeda(sinalCalculado)}
                </span>
              </div>
              {pacoteSugerido && (
                <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Pacote Aplicado:
                  </span>
                  <span className="font-semibold text-emerald-900">{pacoteSugerido.nome}</span>
                </div>
              )}

              {/* Bloco: Acompanhantes & Tarifas */}
              {acompanhantesETarifas.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-200/80 space-y-1.5">
                  <span className="font-bold text-[11px] text-emerald-950 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#053d1e]" />
                    Acompanhantes & Tarifas ({acompanhantesETarifas.length} pessoas):
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {acompanhantesETarifas.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white/90 border border-emerald-200/80 text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800 block truncate">{h.nome}</span>
                          <span className="text-[10px] text-slate-500">
                            {h.tipoHospede} {h.idade !== undefined ? `• ${h.idade} ${h.idade === 1 ? 'ano' : 'anos'}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${h.badgeClasse}`}>
                            {h.tarifaTexto}
                          </span>
                          <span className="font-extrabold text-[#053d1e] font-['Manrope'] text-xs">
                            {formatarMoeda(h.valor)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  onClick={() => setValorSinal(aplicarMascaraMoeda(sinalCalculado))}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                >
                  Usar 50% ({formatarMoeda(sinalCalculado)})
                </button>
              )}
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                disabled={semSinal}
                required={!semSinal}
                placeholder="R$ 0,00"
                value={valorSinal}
                onChange={(e) => setValorSinal(aplicarMascaraMoeda(e.target.value))}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-bold outline-none transition-all ${
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