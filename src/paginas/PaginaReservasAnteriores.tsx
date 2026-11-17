import {
  AlertCircle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  FileText,
  PauseCircle,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { obterClienteSupabase } from '../lib/supabaseCliente';
import { FnrhService } from '../servicos/api/FnrhService';
import { ConsumoExtra, Hospede, Pagamento, Quarto, Reserva } from '../tipos';
import {
  calcularIdade,
  formatarCpf,
  formatarData,
  formatarMoeda,
  formatarTelefone
} from '../utilitarios/formatadores';
import { Validate } from '../utilitarios/validate';

const ITENS_POR_PAGINA = 15;

// Helper universal para compatibilidade camelCase (.NET) e lowercase (Supabase)
const getVal = (obj: any, campoMin: string, campoCamel: string): any => {
  if (!obj) return undefined;
  return obj[campoMin] !== undefined ? obj[campoMin] : obj[campoCamel];
};

// Cálculo de diárias inclusivas (regime Hotel Fazenda Anew: dia de entrada + dia de saída estendida)
const calcularDiasInclusivos = (dataEntradaStr?: string, dataSaidaStr?: string): number => {
  if (!dataEntradaStr || !dataSaidaStr) return 1;
  const dEnt = String(dataEntradaStr).slice(0, 10).trim();
  const dSai = String(dataSaidaStr).slice(0, 10).trim();
  if (!dEnt || !dSai) return 1;
  if (dEnt === dSai) return 1;

  const [anoE, mesE, diaE] = dEnt.split('-').map(Number);
  const [anoS, mesS, diaS] = dSai.split('-').map(Number);
  const d1 = new Date(anoE, mesE - 1, diaE);
  const d2 = new Date(anoS, mesS - 1, diaS);
  const pernoites = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return pernoites > 0 ? pernoites + 1 : 1;
};

interface ModalDetalhesReservaProps {
  aberto: boolean;
  reserva: Reserva | null;
  quarto: Quarto | null;
  hospede: Hospede | null;
  consumos: ConsumoExtra[];
  pagamentos: Pagamento[];
  onFechar: () => void;
}

const ModalDetalhesReserva: React.FC<ModalDetalhesReservaProps> = ({
  aberto,
  reserva,
  quarto,
  hospede,
  consumos,
  pagamentos,
  onFechar,
}) => {
  const [acompanhantes, setAcompanhantes] = useState<any[]>([]);
  const [carregandoAcomp, setCarregandoAcomp] = useState(false);
  const [tooltipPendenteAberto, setTooltipPendenteAberto] = useState(false);

  // Fecha o tooltip se clicar fora dele
  useEffect(() => {
    const fecharAoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement;
      if (!alvo.closest('[data-tooltip-pendente]')) {
        setTooltipPendenteAberto(false);
      }
    };
    document.addEventListener('click', fecharAoClicarFora);
    return () => document.removeEventListener('click', fecharAoClicarFora);
  }, []);

  useEffect(() => {
    setTooltipPendenteAberto(false);
  }, [aberto, reserva]);

  useEffect(() => {
    if (reserva && aberto) {
      const carregarAcompanhantes = async () => {
        setCarregandoAcomp(true);
        const resId = Number(getVal(reserva, 'reservaid', 'reservaId'));
        const hospId = Number(getVal(reserva, 'hospedeid', 'hospedeId'));
        const cadId = Number(getVal(reserva, 'cadastroid', 'cadastroId') || 0);

        const mapUnico = new Map<string, any>();

        // 0. Verifica se já veio embutido no objeto reserva
        const embutidos = getVal(reserva, 'acompanhantes', 'acompanhantes') || [];
        if (Array.isArray(embutidos)) {
          embutidos.forEach((a: any) => {
            const chave = `${String(a.nomecompleto || '').trim().toLowerCase()}_${a.datanascimento || ''}`;
            mapUnico.set(chave, a);
          });
        }

        try {
          // 1. Tenta buscar via API FNRH (caso exista ficha vinculada)
          const resFnrh = await FnrhService.listarCadastrosFnrh().catch(() => ({ sucesso: false, dados: [] }));
          if (resFnrh && resFnrh.dados && Array.isArray(resFnrh.dados)) {
            const fichaMatch = resFnrh.dados.find(
              (c: any) =>
                Number(getVal(c, 'reservaid', 'reservaId')) === resId ||
                (cadId > 0 && Number(getVal(c, 'cadastroid', 'cadastroId')) === cadId)
            );
            const listaFnrh = fichaMatch ? getVal(fichaMatch, 'acompanhantes', 'acompanhantes') || [] : [];
            listaFnrh.forEach((a: any) => {
              const chave = `${String(a.nomecompleto || '').trim().toLowerCase()}_${a.datanascimento || ''}`;
              if (!mapUnico.has(chave)) mapUnico.set(chave, a);
            });
          }

          // 2. Complementa com consulta direta no Supabase se disponível
          const cliente = obterClienteSupabase();
          if (cliente && mapUnico.size === 0) {
            let { data: acompOficial } = await cliente
              .from('acompanhante')
              .select('*')
              .eq('reservaid', resId);

            if (!acompOficial || acompOficial.length === 0) {
              const { data: acompFnrh } = await cliente
                .from('cadastro_fnrh_acompanhante')
                .select('*')
                .eq('reservaid', resId);
              acompOficial = acompFnrh || [];
            }

            if ((!acompOficial || acompOficial.length === 0) && hospId) {
              const { data: acompHospede } = await cliente
                .from('acompanhante')
                .select('*')
                .eq('cadastroid', hospId);
              if (acompHospede && acompHospede.length > 0) {
                acompOficial = acompHospede;
              }
            }

            (acompOficial || []).forEach((a: any) => {
              const chave = `${String(a.nomecompleto || '').trim().toLowerCase()}_${a.datanascimento || ''}`;
              if (!mapUnico.has(chave)) mapUnico.set(chave, a);
            });
          }

          setAcompanhantes(Array.from(mapUnico.values()));
        } catch (e) {
          console.warn('[ModalReserva] Erro ao carregar acompanhantes:', e);
        } finally {
          setCarregandoAcomp(false);
        }
      };

      carregarAcompanhantes();
    }
  }, [reserva, aberto]);

  if (!aberto || !reserva) return null;

  const resId = getVal(reserva, 'reservaid', 'reservaId');
  const codigoRes = getVal(reserva, 'codigo', 'codigo') || resId;
  const statusRes = String(getVal(reserva, 'statusreserva', 'statusReserva') || '').toUpperCase();
  const dataEntrada = getVal(reserva, 'dataentrada', 'dataEntrada');
  const dataSaida = getVal(reserva, 'datasaida', 'dataSaida');
  const dataReserva = getVal(reserva, 'datareserva', 'dataReserva') || getVal(reserva, 'datainclusao', 'dataInclusao');
  const horarioChegada = getVal(reserva, 'horarioprevistochegada', 'horarioPrevistoChegada') || '09:00';
  const formaPag = getVal(reserva, 'formapagamento', 'formaPagamento') || 'PIX';
  const obsRes = getVal(reserva, 'observacoes', 'observacoes');

  // Filtra pagamentos e consumos
  const consumosReserva = consumos.filter((c: any) => String(getVal(c, 'reservaid', 'reservaId')) === String(resId));
  const pagamentosReserva = pagamentos.filter((p: any) => String(getVal(p, 'reservaid', 'reservaId')) === String(resId));

  // Separa consumos da Lojinha/Consumo extra
  const consumosLojinha = consumosReserva;
  const vlrLojinha = consumosLojinha.reduce((acc, c: any) => acc + Number(getVal(c, 'valortotal', 'valorTotal') || 0), 0);
  const pagLojinha = pagamentosReserva
    .filter((p: any) => getVal(p, 'tipolancamento', 'tipoLancamento') === 'CONSUMO_EXTRA')
    .reduce((acc, p: any) => acc + Number(p.valor || 0), 0);

  // Valores da diária/hospedagem
  const vlrReserva = Number(getVal(reserva, 'valortotal', 'valorTotal') || 0);
  const pagReserva = Number(getVal(reserva, 'valorpago', 'valorPago') || 0);

  // Lançamentos no check-out
  const pagCheckout = pagamentosReserva
    .filter((p: any) => getVal(p, 'tipolancamento', 'tipoLancamento') === 'SALDO_RESERVA')
    .reduce((acc, p: any) => acc + Number(p.valor || 0), 0);
  const vlrCheckout = Math.max(0, (vlrReserva - pagReserva) + (vlrLojinha - pagLojinha));

  const totalGeral = vlrReserva + vlrLojinha;
  const totalPagoGeral = pagReserva + pagLojinha + pagCheckout;
  const saldoFinal = Math.max(0, totalGeral - totalPagoGeral);

  const numDiarias = calcularDiasInclusivos(dataEntrada, dataSaida);
  const dataReservaExibicao = dataReserva ? formatarData(dataReserva) : '--';

  const handleImprimir = () => {
    window.print();
  };

  const ehCredito = statusRes === 'CREDITO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh] my-8 animate-in fade-in zoom-in-95 duration-200">

        {/* Cabeçalho do Comprovante/Conferência */}
        <div className="bg-[#053d1e] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Manrope'] text-lg font-bold">
                  Reserva #{codigoRes}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ehCredito ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-white/20 text-white'
                  }`}>
                  {ehCredito ? 'CRÉDITO' : statusRes}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Quarto: <strong className="text-white">{quarto?.codigoidentificador || quarto?.numero || '--'}</strong> ({quarto?.categoria || 'Standard'}) • Data Reserva: {dataReservaExibicao}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              Imprimir
            </button>
            <button
              onClick={onFechar}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">

          {/* Banner de Crédito Ativo se aplicável */}
          {ehCredito && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs font-medium text-amber-950 flex items-center gap-3">
              <PauseCircle className="w-6 h-6 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold text-sm block">Reserva Suspensa com Crédito Ativo</span>
                <span className="text-amber-900 text-[11px] block mt-0.5">
                  O quarto físico foi desvinculado e o valor já pago de <strong>{formatarMoeda(pagReserva)}</strong> foi mantido como saldo para utilização futura.
                </span>
              </div>
            </div>
          )}

          {/* SEÇÃO 1: Dados da Reserva & Acompanhantes */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#053d1e]" />
              Dados do Hóspede Principal e Acomodação
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Hóspede Titular</span>
                <span className="font-bold text-slate-900 text-sm block">
                  {hospede?.nomecompleto || getVal(reserva, 'hospedeatualnome', 'hospedeAtualNome') || getVal(reserva, 'hospedenome', 'hospedeNome') || 'Nome não informado'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">CPF / Documento</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {hospede?.cpf ? formatarCpf(hospede.cpf) : '--'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Telefone / WhatsApp</span>
                <span className="font-semibold text-slate-900">
                  {hospede?.telefone ? formatarTelefone(hospede.telefone) : '--'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">E-mail</span>
                <span className="font-semibold text-slate-900 truncate block">
                  {hospede?.email || '--'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Check-in Previsto</span>
                <span className="font-bold text-slate-800">
                  {formatarData(dataEntrada)} ({horarioChegada})
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Check-out Previsto</span>
                <span className="font-bold text-slate-800">
                  {formatarData(dataSaida)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Duração / Ocupantes</span>
                <span className="font-bold text-slate-800">
                  {numDiarias} diária(s) • {Number(getVal(reserva, 'adultos', 'adultos') || 1)} adulto(s), {Number(getVal(reserva, 'criancas', 'criancas') || 0)} criança(s)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Forma de Pagamento</span>
                <span className="font-bold text-emerald-800">
                  {formaPag}
                </span>
              </div>
            </div>

            {/* Acompanhantes Vinculados */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#053d1e]" />
                Acompanhantes Vinculados ({acompanhantes.length})
              </h4>

              {carregandoAcomp ? (
                <div className="text-xs text-slate-500 py-2 italic">Carregando acompanhantes...</div>
              ) : acompanhantes.length === 0 ? (
                <div className="text-xs text-slate-400 py-1.5 italic">Nenhum acompanhante cadastrado nesta reserva.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {acompanhantes.map((acomp, index) => {
                    const dtNasc = getVal(acomp, 'datanascimento', 'dataNascimento');
                    return (
                      <div key={index} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800 block">{acomp.nomecompleto}</span>
                          <span className="text-[11px] text-slate-500">
                            {acomp.documento ? `Doc: ${acomp.documento}` : 'Sem documento'} •{' '}
                            {dtNasc ? `Nasc: ${formatarData(dtNasc)}` : 'Idade N/I'}
                          </span>
                        </div>
                        {dtNasc && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
                            {calcularIdade(dtNasc)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* SEÇÃO 2: Detalhamento Financeiro & Consumos */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <DollarSign className="w-4 h-4 text-[#053d1e]" />
              Conferência Financeira & Consumos
            </h3>

            {/* Tabela de Resumo Financeiro */}
            <div className="overflow-visible rounded-xl border border-slate-200 mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#053d1e] text-white font-semibold">
                      <th className="py-2.5 px-3 first:rounded-tl-xl">Vlr. Reserva</th>
                      <th className="py-2.5 px-3">Pag. Reserva</th>
                      <th className="py-2.5 px-3">Produtos Lojinha</th>
                      <th className="py-2.5 px-3">Vlr. Lojinha</th>
                      <th className="py-2.5 px-3">Pag. Lojinha</th>
                      <th className="py-2.5 px-3">Vlr. Check-out</th>
                      <th className="py-2.5 px-3">Pag. Check-out</th>
                      <th className="py-2.5 px-3 font-bold bg-[#043017]">Total Geral</th>
                      <th className="py-2.5 px-3 font-bold bg-[#043017] last:rounded-tr-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-slate-50/50">
                    <tr className="font-semibold text-slate-800">
                      <td className="py-3 px-3">{formatarMoeda(vlrReserva)}</td>
                      <td className="py-3 px-3 text-emerald-700">{formatarMoeda(pagReserva)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                          {consumosLojinha.length}
                        </span>
                      </td>
                      <td className="py-3 px-3">{formatarMoeda(vlrLojinha)}</td>
                      <td className="py-3 px-3 text-emerald-700">{formatarMoeda(pagLojinha)}</td>
                      <td className="py-3 px-3">{formatarMoeda(vlrCheckout)}</td>
                      <td className="py-3 px-3 text-emerald-700">{formatarMoeda(pagCheckout)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 text-sm bg-emerald-50/70 border-l border-emerald-200">
                        {formatarMoeda(totalGeral)}
                      </td>
                      <td className="py-3 px-3 border-l border-emerald-200 whitespace-nowrap">
                        {saldoFinal <= 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            PAGO
                          </span>
                        ) : (
                          <div className="relative inline-flex items-center" data-tooltip-pendente>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTooltipPendenteAberto((prev) => !prev);
                              }}
                              title="Clique para ver o valor pendente"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200/80 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                            >
                              <span className="underline decoration-dotted decoration-amber-700 underline-offset-2">
                                PENDENTE
                              </span>
                              <span className="text-[10px] text-amber-800 select-none">✨</span>
                            </button>

                            {/* Tooltip no padrão escuro do sistema */}
                            {tooltipPendenteAberto && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute z-50 right-0 top-full mt-1.5 w-[240px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 text-left leading-relaxed animate-in fade-in zoom-in-95 duration-150 cursor-default whitespace-normal"
                              >
                                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-700/80">
                                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                                    Saldo Pendente
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setTooltipPendenteAberto(false)}
                                    className="text-slate-400 hover:text-white text-xs px-1 rounded transition-colors cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <span className="text-white font-extrabold block text-sm mb-1.5 font-['Manrope']">
                                  {formatarMoeda(saldoFinal)}
                                </span>

                                <div className="pt-1.5 border-t border-slate-700/60 text-slate-300 text-[11px] space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>Total Geral:</span>
                                    <span className="font-semibold text-white">{formatarMoeda(totalGeral)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Pago:</span>
                                    <span className="font-semibold text-emerald-400">{formatarMoeda(totalPagoGeral)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalhamento de Produtos da Lojinha */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-700" />
                Detalhamento dos Produtos da Lojinha / Consumo Extra ({consumosLojinha.length})
              </h4>

              {consumosLojinha.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhum consumo de lojinha registrado nesta estadia.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse bg-white rounded-lg border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="py-2 px-3">Produto / Consumo</th>
                        <th className="py-2 px-3 text-center">Quantidade</th>
                        <th className="py-2 px-3 text-right">Valor Unitário</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consumosLojinha.map((item: any, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {item.descricao || 'Produto sem nome'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {item.quantidade || 1}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatarMoeda(getVal(item, 'valorunitario', 'valorUnitario') || 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatarMoeda(getVal(item, 'valortotal', 'valorTotal') || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/80 font-bold border-t border-slate-200 text-slate-900">
                        <td colSpan={3} className="py-2 px-3 text-right">Total Lojinha:</td>
                        <td className="py-2 px-3 text-right text-emerald-800 font-bold text-sm">
                          {formatarMoeda(vlrLojinha)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Observações da Reserva */}
            {obsRes && (
              <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-amber-50/50 text-xs text-slate-700">
                <span className="font-bold text-slate-800">Observações da Reserva:</span> {obsRes}
              </div>
            )}
          </section>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fechar Conferência
          </button>
        </div>
      </div>
    </div>
  );
};

export const PaginaReservasAnteriores: React.FC = () => {
  const { reservas, quartos, hospedes, consumosExtras, pagamentos, recarregarDados } = useHotel();

  // Estados dos campos de formulário (antes de clicar em Pesquisar)
  const [buscaInput, setBuscaInput] = useState('');
  const [dataInicioInput, setDataInicioInput] = useState('');
  const [dataFimInput, setDataFimInput] = useState('');
  const [statusFiltroInput, setStatusFiltroInput] = useState('TODOS');
  const [quartoFiltroInput, setQuartoFiltroInput] = useState('TODOS');

  // Estados dos filtros aplicados (disparados ao clicar em Pesquisar ou mudar selects)
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busca: '',
    dataInicio: '',
    dataFim: '',
    status: 'TODOS',
    quarto: 'TODOS',
  });

  const [erroFiltroData, setErroFiltroData] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [carregandoAtualizacao, setCarregandoAtualizacao] = useState(false);

  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);

  const handleRecarregar = async () => {
    setCarregandoAtualizacao(true);
    try {
      await recarregarDados();
    } finally {
      setCarregandoAtualizacao(false);
    }
  };

  const handleAlterarDataInicio = (novaData: string) => {
    setDataInicioInput(novaData);
    setErroFiltroData(null);
    if (novaData && dataFimInput) {
      const fimAjustado = Validate.ajustarDataFimSeNecessario(novaData, dataFimInput);
      if (fimAjustado !== dataFimInput) {
        setDataFimInput(fimAjustado);
      }
    }
  };

  const handleAlterarDataFim = (novaData: string) => {
    setDataFimInput(novaData);
    if (dataInicioInput && novaData) {
      const check = Validate.periodoDatas(dataInicioInput, novaData, {
        nomeCampoInicio: 'Data Inicial',
        nomeCampoFim: 'Data Final',
      });
      setErroFiltroData(check.valido ? null : (check.mensagem || 'Data inicial não pode ser maior que a final.'));
    } else {
      setErroFiltroData(null);
    }
  };

  const handlePesquisar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (dataInicioInput && dataFimInput) {
      const check = Validate.periodoDatas(dataInicioInput, dataFimInput, {
        permitirMesmoDia: true,
        nomeCampoInicio: 'Data Inicial',
        nomeCampoFim: 'Data Final',
      });
      if (!check.valido) {
        setErroFiltroData(check.mensagem || 'Data inicial não pode ser maior que a data final.');
        return;
      }
    }

    setErroFiltroData(null);
    setFiltrosAplicados({
      busca: buscaInput,
      dataInicio: dataInicioInput,
      dataFim: dataFimInput,
      status: statusFiltroInput,
      quarto: quartoFiltroInput,
    });
    setPaginaAtual(1);
  };

  const handleLimparFiltros = () => {
    setBuscaInput('');
    setDataInicioInput('');
    setDataFimInput('');
    setStatusFiltroInput('TODOS');
    setQuartoFiltroInput('TODOS');
    setErroFiltroData(null);
    setFiltrosAplicados({
      busca: '',
      dataInicio: '',
      dataFim: '',
      status: 'TODOS',
      quarto: 'TODOS',
    });
    setPaginaAtual(1);
  };

  const temFiltroAtivo = Boolean(
    filtrosAplicados.busca.trim() ||
    filtrosAplicados.dataInicio ||
    filtrosAplicados.dataFim ||
    filtrosAplicados.status !== 'TODOS' ||
    filtrosAplicados.quarto !== 'TODOS'
  );

  const reservasFiltradas = useMemo(() => {
    return reservas
      .filter((r: any) => {
        const qId = String(getVal(r, 'quartoid', 'quartoId') || '');
        const statusUpper = String(getVal(r, 'statusreserva', 'statusReserva') || '').toUpperCase();
        const dEnt = String(getVal(r, 'dataentrada', 'dataEntrada') || '').slice(0, 10);
        const dSai = String(getVal(r, 'datasaida', 'dataSaida') || '').slice(0, 10);

        if (filtrosAplicados.quarto !== 'TODOS' && qId !== filtrosAplicados.quarto) {
          return false;
        }

        if (filtrosAplicados.status !== 'TODOS' && statusUpper !== filtrosAplicados.status) {
          return false;
        }

        // Filtro por Período (Data Início e Data Fim)
        if (filtrosAplicados.dataInicio && filtrosAplicados.dataFim) {
          if (dEnt && dSai) {
            const foraDoPeriodo = dSai < filtrosAplicados.dataInicio || dEnt > filtrosAplicados.dataFim;
            if (foraDoPeriodo) return false;
          } else if (dEnt) {
            if (dEnt < filtrosAplicados.dataInicio || dEnt > filtrosAplicados.dataFim) return false;
          }
        } else if (filtrosAplicados.dataInicio) {
          if ((dSai || dEnt) < filtrosAplicados.dataInicio) return false;
        } else if (filtrosAplicados.dataFim) {
          if (dEnt > filtrosAplicados.dataFim) return false;
        }

        if (filtrosAplicados.busca.trim()) {
          const termo = filtrosAplicados.busca.toLowerCase().trim();
          const termoNumeros = filtrosAplicados.busca.replace(/\D/g, '');
          const codigo = String(getVal(r, 'codigo', 'codigo') || '').toLowerCase();
          const idReserva = String(getVal(r, 'reservaid', 'reservaId') || '');
          const hId = String(getVal(r, 'hospedeid', 'hospedeId') || '');
          const h = hospedes.find((item: any) => String(getVal(item, 'hospedeid', 'hospedeId')) === hId);
          const nomeHospede = String(h?.nomecompleto || getVal(r, 'hospedeatualnome', 'hospedeAtualNome') || getVal(r, 'hospedenome', 'hospedeNome') || '').toLowerCase();
          const cpfHospede = String(h?.cpf || '').replace(/\D/g, '');
          const q = quartos.find((item: any) => String(getVal(item, 'quartoid', 'quartoId')) === qId);
          const numQuarto = String(q?.numero || q?.codigoidentificador || '').toLowerCase();

          const bateu =
            codigo.includes(termo) ||
            idReserva.includes(termo) ||
            nomeHospede.includes(termo) ||
            (termoNumeros && cpfHospede.includes(termoNumeros)) ||
            numQuarto.includes(termo);

          if (!bateu) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        const dA = String(getVal(a, 'dataentrada', 'dataEntrada') || '');
        const dB = String(getVal(b, 'dataentrada', 'dataEntrada') || '');
        return dB.localeCompare(dA);
      });
  }, [reservas, quartos, hospedes, filtrosAplicados]);

  // Controle de Paginação (Padrão do Sistema)
  const totalPaginas = Math.max(1, Math.ceil(reservasFiltradas.length / ITENS_POR_PAGINA));

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [totalPaginas, paginaAtual]);

  const reservasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return reservasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [reservasFiltradas, paginaAtual]);

  const quartoDaReservaSelecionada = useMemo(() => {
    if (!reservaSelecionada) return null;
    const qId = String(getVal(reservaSelecionada, 'quartoid', 'quartoId') || '');
    return quartos.find((q: any) => String(getVal(q, 'quartoid', 'quartoId')) === qId) || null;
  }, [reservaSelecionada, quartos]);

  const hospedeDaReservaSelecionada = useMemo(() => {
    if (!reservaSelecionada) return null;
    const hId = String(getVal(reservaSelecionada, 'hospedeid', 'hospedeId') || '');
    return hospedes.find((h: any) => String(getVal(h, 'hospedeid', 'hospedeId')) === hId) || null;
  }, [reservaSelecionada, hospedes]);

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case 'PRE_RESERVA':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'RESERVADO':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'HOSPEDADO':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'CREDITO':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'CONCLUIDA':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#e6f4ea] text-[#053d1e] rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">Reservas</h1>
              <p className="text-xs text-[#717971]">
                Visão completa e conferência de todas as reservas do hotel (Pré-reservas, Reservados, Hospedados, Crédito e Concluídas)
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRecarregar}
          disabled={carregandoAtualizacao}
          className="flex items-center gap-2 rounded-xl border border-[#c1c9bf] bg-white px-4 py-2.5 text-xs font-bold text-[#191c1d] hover:bg-[#f0f1f1] transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${carregandoAtualizacao ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <form onSubmit={handlePesquisar} className="space-y-2">
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2.5">
          {/* 1. Campo Buscar Compacto */}
          <div className="relative w-full sm:w-56 lg:w-64 shrink-0">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar nome, código ou CPF..."
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-full border border-[#c1c9bf] bg-white text-xs font-medium text-slate-800 outline-none focus:border-[#053d1e] shadow-2xs"
            />
          </div>

          {/* 2. Pílula de Datas (DE ... ATÉ ...) igual ao padrão */}
          <div
            className={`flex items-center gap-2 rounded-full border bg-white px-3.5 py-1.5 shadow-2xs shrink-0 ${
              erroFiltroData ? 'border-red-400 bg-red-50/30' : 'border-[#c1c9bf]'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">DE</span>
            <input
              type="date"
              value={dataInicioInput}
              onChange={(e) => handleAlterarDataInicio(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">ATÉ</span>
            <input
              type="date"
              min={dataInicioInput || undefined}
              value={dataFimInput}
              onChange={(e) => handleAlterarDataFim(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
            />
          </div>

          {/* 3. Dropdown Status */}
          <div className="w-full sm:w-44 shrink-0">
            <select
              value={statusFiltroInput}
              onChange={(e) => {
                const novoStatus = e.target.value;
                setStatusFiltroInput(novoStatus);
                setFiltrosAplicados((prev) => ({ ...prev, status: novoStatus }));
                setPaginaAtual(1);
              }}
              className="w-full px-3.5 py-2 rounded-full border border-[#c1c9bf] bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#053d1e] shadow-2xs cursor-pointer"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PRE_RESERVA">Pré-reserva</option>
              <option value="RESERVADO">Reservado</option>
              <option value="HOSPEDADO">Hospedado</option>
              <option value="CREDITO">Crédito</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          {/* 4. Dropdown Quartos */}
          <div className="w-full sm:w-48 shrink-0">
            <select
              value={quartoFiltroInput}
              onChange={(e) => {
                const novoQuarto = e.target.value;
                setQuartoFiltroInput(novoQuarto);
                setFiltrosAplicados((prev) => ({ ...prev, quarto: novoQuarto }));
                setPaginaAtual(1);
              }}
              className="w-full px-3.5 py-2 rounded-full border border-[#c1c9bf] bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#053d1e] shadow-2xs cursor-pointer"
            >
              <option value="TODOS">Todos os Quartos</option>
              {quartos.map((q: any) => {
                const qId = getVal(q, 'quartoid', 'quartoId');
                return (
                  <option key={qId} value={qId}>
                    Quarto #{q.codigoidentificador || q.numero} ({q.categoria})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 5. Botão Pesquisar */}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-[#053d1e] hover:bg-[#043017] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Pesquisar</span>
          </button>

          {temFiltroAtivo && (
            <button
              type="button"
              onClick={handleLimparFiltros}
              title="Limpar todos os filtros"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {erroFiltroData && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 pl-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{erroFiltroData}</span>
          </div>
        )}
      </form>

      {/* Tabela de Listagem de Reservas */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        {reservasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 font-['Manrope']">
              Nenhuma reserva encontrada
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nenhum registro corresponde aos filtros selecionados.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Quarto</th>
                    <th className="py-3.5 px-4">Hóspede Titular</th>
                    <th className="py-3.5 px-4">Período da Estadia</th>
                    <th className="py-3.5 px-4">Data Reserva</th>
                    <th className="py-3.5 px-4">Total Gasto</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservasPaginadas.map((r: any) => {
                    const rId = getVal(r, 'reservaid', 'reservaId');
                    const qId = String(getVal(r, 'quartoid', 'quartoId') || '');
                    const hId = String(getVal(r, 'hospedeid', 'hospedeId') || '');
                    const statusUpper = String(getVal(r, 'statusreserva', 'statusReserva') || '').toUpperCase();
                    const dEnt = getVal(r, 'dataentrada', 'dataEntrada');
                    const dSai = getVal(r, 'datasaida', 'dataSaida');
                    const dRes = getVal(r, 'datareserva', 'dataReserva') || getVal(r, 'datainclusao', 'dataInclusao');

                    const q = quartos.find((item: any) => String(getVal(item, 'quartoid', 'quartoId')) === qId);
                    const h = hospedes.find((item: any) => String(getVal(item, 'hospedeid', 'hospedeId')) === hId);
                    const consumosR = consumosExtras.filter((c: any) => String(getVal(c, 'reservaid', 'reservaId')) === String(rId));
                    const totalConsumos = consumosR.reduce((acc, curr: any) => acc + Number(getVal(curr, 'valortotal', 'valorTotal') || 0), 0);
                    const totalGastoCalculado = Number(getVal(r, 'valortotal', 'valorTotal') || 0) + totalConsumos;
                    const numDiarias = calcularDiasInclusivos(dEnt, dSai);
                    const labelStatus = statusUpper === 'CREDITO' ? 'CRÉDITO' : statusUpper;

                    return (
                      <tr key={rId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Quarto */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                              {q?.codigoidentificador || q?.numero || '--'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {q?.categoria || 'Standard'}
                            </span>
                          </div>
                        </td>

                        {/* Hóspede */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {h?.nomecompleto || getVal(r, 'hospedeatualnome', 'hospedeAtualNome') || getVal(r, 'hospedenome', 'hospedeNome') || 'Hóspede não informado'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {h?.cpf ? formatarCpf(h.cpf) : (getVal(r, 'codigo', 'codigo') || `#RES-${rId}`)}
                            </span>
                          </div>
                        </td>

                        {/* Período */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {formatarData(dEnt)} ➔ {formatarData(dSai)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {numDiarias} diária(s) • {Number(getVal(r, 'adultos', 'adultos') || 1) + Number(getVal(r, 'criancas', 'criancas') || 0)} hosp.
                            </span>
                          </div>
                        </td>

                        {/* Data da Reserva */}
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-700">
                            {dRes ? formatarData(dRes) : '--'}
                          </span>
                        </td>

                        {/* Total Gasto */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-emerald-900 text-sm">
                            {formatarMoeda(totalGastoCalculado)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border whitespace-nowrap ${statusBadgeStyle(statusUpper)}`}>
                            {labelStatus}
                          </span>
                        </td>

                        {/* Ação */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReservaSelecionada(r)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#053d1e] hover:bg-[#043017] text-xs font-bold text-white transition-all shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-300" />
                              <span>Conferir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação no Padrão do Sistema */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                Exibindo <strong>{Math.min((paginaAtual - 1) * ITENS_POR_PAGINA + 1, reservasFiltradas.length)}</strong> a{' '}
                <strong>{Math.min(paginaAtual * ITENS_POR_PAGINA, reservasFiltradas.length)}</strong> de{' '}
                <strong>{reservasFiltradas.length}</strong> reservas (Página <strong>{paginaAtual}</strong> de{' '}
                <strong>{totalPaginas}</strong>)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-bold text-slate-800 text-xs">
                  {paginaAtual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Detalhes & Conferência de Reserva */}
      <ModalDetalhesReserva
        aberto={Boolean(reservaSelecionada)}
        reserva={reservaSelecionada}
        quarto={quartoDaReservaSelecionada}
        hospede={hospedeDaReservaSelecionada}
        consumos={consumosExtras}
        pagamentos={pagamentos}
        onFechar={() => setReservaSelecionada(null)}
      />
    </div>
  );
};