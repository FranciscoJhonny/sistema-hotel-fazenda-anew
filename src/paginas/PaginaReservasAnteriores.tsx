import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Search,
  Calendar,
  Bed,
  User,
  Users,
  CreditCard,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileText,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  DollarSign,
  Filter,
  PauseCircle
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { Reserva, Quarto, Hospede, ConsumoExtra, Pagamento } from '../tipos';
import {
  calcularDiarias,
  calcularIdade,
  formatarCpf,
  formatarData,
  formatarMoeda,
  formatarTelefone
} from '../utilitarios/formatadores';
import { obterClienteSupabase } from '../lib/supabaseCliente';

interface ModalDetalhesReservaProps {
  aberto: boolean;
  reserva: Reserva | null;
  quarto: Quarto | null;
  hospede: Hospede | null;
  consumos: ConsumoExtra[];
  pagamentos: Pagamento[];
  onFechar: () => void;
  onRemarcar?: (reserva: Reserva) => void;
}

const ModalDetalhesReserva: React.FC<ModalDetalhesReservaProps> = ({
  aberto,
  reserva,
  quarto,
  hospede,
  consumos,
  pagamentos,
  onFechar,
  onRemarcar,
}) => {
  const [acompanhantes, setAcompanhantes] = useState<any[]>([]);
  const [carregandoAcomp, setCarregandoAcomp] = useState(false);

  useEffect(() => {
    if (reserva && aberto) {
      const carregarAcompanhantes = async () => {
        setCarregandoAcomp(true);
        const cliente = obterClienteSupabase();
        if (!cliente) {
          setCarregandoAcomp(false);
          return;
        }

        try {
          // 1. Busca da tabela oficial acompanhante por reservaid
          let { data: acompOficial } = await cliente
            .from('acompanhante')
            .select('*')
            .eq('reservaid', reserva.reservaid);

          // 2. Se não encontrar, busca da tabela cadastro_fnrh_acompanhante
          if (!acompOficial || acompOficial.length === 0) {
            const { data: acompFnrh } = await cliente
              .from('cadastro_fnrh_acompanhante')
              .select('*')
              .eq('reservaid', reserva.reservaid);

            acompOficial = acompFnrh || [];
          }

          // 3. Se ainda não encontrar e o hóspede tiver id, busca por hospedeid
          if ((!acompOficial || acompOficial.length === 0) && reserva.hospedeid) {
            const { data: acompHospede } = await cliente
              .from('acompanhante')
              .select('*')
              .eq('cadastroid', reserva.hospedeid);
            if (acompHospede && acompHospede.length > 0) {
              acompOficial = acompHospede;
            }
          }

          setAcompanhantes(acompOficial || []);
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

  // Filtra pagamentos e consumos
  const consumosReserva = consumos.filter((c) => String(c.reservaid) === String(reserva.reservaid));
  const pagamentosReserva = pagamentos.filter((p) => String(p.reservaid) === String(reserva.reservaid));

  // Separa consumos da Lojinha/Consumo extra
  const consumosLojinha = consumosReserva;
  const vlrLojinha = consumosLojinha.reduce((acc, c) => acc + (c.valortotal || 0), 0);
  const pagLojinha = pagamentosReserva
    .filter((p) => p.tipolancamento === 'CONSUMO_EXTRA')
    .reduce((acc, p) => acc + (p.valor || 0), 0);

  // Valores da diária/hospedagem
  const vlrReserva = Number(reserva.valortotal || 0);
  const pagReserva = Number(reserva.valorpago || 0);

  // Lançamentos no check-out
  const pagCheckout = pagamentosReserva
    .filter((p) => p.tipolancamento === 'SALDO_RESERVA')
    .reduce((acc, p) => acc + (p.valor || 0), 0);
  const vlrCheckout = Math.max(0, (vlrReserva - pagReserva) + (vlrLojinha - pagLojinha));

  const totalGeral = vlrReserva + vlrLojinha;
  const totalPagoGeral = pagReserva + pagLojinha + pagCheckout;
  const saldoFinal = Math.max(0, totalGeral - totalPagoGeral);

  const numDiarias = calcularDiarias(reserva.dataentrada, reserva.datasaida);
  const dataReservaExibicao = reserva.datareserva
    ? formatarData(reserva.datareserva)
    : (reserva.datainclusao ? formatarData(reserva.datainclusao) : '--');

  const handleImprimir = () => {
    window.print();
  };

  const ehCredito = reserva.statusreserva === 'CREDITO';

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
                  Reserva #{reserva.codigo || reserva.reservaid}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  ehCredito ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-white/20 text-white'
                }`}>
                  {ehCredito ? '⏸️ CRÉDITO ATIVO' : reserva.statusreserva}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Quarto: <strong className="text-white">{quarto?.codigoidentificador || quarto?.numero || '--'}</strong> ({quarto?.categoria || 'Standard'}) • Data Reserva: {dataReservaExibicao}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ehCredito && onRemarcar && (
              <button
                type="button"
                onClick={() => {
                  onFechar();
                  onRemarcar(reserva);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Remarcar Reserva</span>
              </button>
            )}
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
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs font-medium text-amber-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PauseCircle className="w-6 h-6 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Reserva Suspensa com Crédito Ativo</span>
                  <span className="text-amber-900 text-[11px] block mt-0.5">
                    O quarto físico foi desvinculado e o valor já pago de <strong>{formatarMoeda(reserva.valorpago)}</strong> foi mantido como saldo para remarcação.
                  </span>
                </div>
              </div>
              {onRemarcar && (
                <button
                  type="button"
                  onClick={() => {
                    onFechar();
                    onRemarcar(reserva);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#053d1e] hover:bg-[#1d502f] text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  Remarcar Agora
                </button>
              )}
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
                  {hospede?.nomecompleto || reserva.hospedeatualnome || 'Nome não informado'}
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
                  {formatarData(reserva.dataentrada)} ({reserva.horarioprevistochegada || '14:00'})
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Check-out Previsto</span>
                <span className="font-bold text-slate-800">
                  {formatarData(reserva.datasaida)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Duração / Ocupantes</span>
                <span className="font-bold text-slate-800">
                  {numDiarias} diária(s) • {reserva.adultos} adulto(s), {reserva.criancas} criança(s)
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block">Forma de Pagamento</span>
                <span className="font-bold text-emerald-800">
                  {reserva.formapagamento || 'PIX'}
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
                  {acompanhantes.map((acomp, index) => (
                    <div key={index} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-800 block">{acomp.nomecompleto}</span>
                      <span className="text-[11px] text-slate-500">
                        {acomp.documento ? `Doc: ${acomp.documento}` : 'Sem documento'} •{' '}
                        {acomp.datanascimento ? `Nasc: ${formatarData(acomp.datanascimento)}` : 'Idade N/I'}
                      </span>
                    </div>
                  ))}
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
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#053d1e] text-white font-semibold">
                    <th className="py-2.5 px-3">Vlr. Reserva</th>
                    <th className="py-2.5 px-3">Pag. Reserva</th>
                    <th className="py-2.5 px-3">Produtos Lojinha</th>
                    <th className="py-2.5 px-3">Vlr. Lojinha</th>
                    <th className="py-2.5 px-3">Pag. Lojinha</th>
                    <th className="py-2.5 px-3">Vlr. Check-out</th>
                    <th className="py-2.5 px-3">Pag. Check-out</th>
                    <th className="py-2.5 px-3 font-bold bg-[#043017]">Total Geral</th>
                    <th className="py-2.5 px-3 font-bold bg-[#043017]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-slate-50/50">
                  <tr className="font-semibold text-slate-800">
                    <td className="py-3 px-3">{formatarMoeda(vlrReserva)}</td>
                    <td className="py-3 px-3 text-emerald-700">{formatarMoeda(pagReserva)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
                        {consumosLojinha.length} item(ns)
                      </span>
                    </td>
                    <td className="py-3 px-3">{formatarMoeda(vlrLojinha)}</td>
                    <td className="py-3 px-3 text-emerald-700">{formatarMoeda(pagLojinha)}</td>
                    <td className="py-3 px-3">{formatarMoeda(vlrCheckout)}</td>
                    <td className="py-3 px-3 text-emerald-700">{formatarMoeda(pagCheckout)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 text-sm bg-emerald-50/70 border-l border-emerald-200">
                      {formatarMoeda(totalGeral)}
                    </td>
                    <td className="py-3 px-3 border-l border-emerald-200">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          saldoFinal <= 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {saldoFinal <= 0 ? 'PAGO' : `PEND: ${formatarMoeda(saldoFinal)}`}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
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
                      {consumosLojinha.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {item.descricao || 'Produto sem nome'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {item.quantidade || 1}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatarMoeda(item.valorunitario || 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatarMoeda(item.valortotal || 0)}
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
            {reserva.observacoes && (
              <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-amber-50/50 text-xs text-slate-700">
                <span className="font-bold text-slate-800">Observações da Reserva:</span> {reserva.observacoes}
              </div>
            )}
          </section>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fechar Conferência
          </button>

          <div className="flex items-center gap-2">
            {ehCredito && onRemarcar && (
              <button
                type="button"
                onClick={() => {
                  onFechar();
                  onRemarcar(reserva);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Remarcar Reserva</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PaginaReservasAnteriores: React.FC = () => {
  const { reservas, quartos, hospedes, consumosExtras, pagamentos, recarregarDados, navegarPara } = useHotel();

  const [busca, setBusca] = useState('');
  const [quartoFiltro, setQuartoFiltro] = useState('TODOS');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
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

  const handleRemarcar = (reservaCredito: Reserva) => {
    const hospede = hospedes.find((h) => String(h.hospedeid) === String(reservaCredito.hospedeid));
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fnrh_reserva_preenchimento', JSON.stringify({
        nomecompleto: hospede?.nomecompleto || reservaCredito.hospedenome || 'Hóspede',
        hospedeid: reservaCredito.hospedeid,
        valorpago: Number(reservaCredito.valorpago || 0),
      }));
    }
    navegarPara('mapa-reservas');
  };

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      if (quartoFiltro !== 'TODOS' && String(r.quartoid) !== quartoFiltro) {
        return false;
      }

      if (statusFiltro !== 'TODOS' && r.statusreserva !== statusFiltro) {
        return false;
      }

      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const codigo = (r.codigo || '').toLowerCase();
        const idReserva = String(r.reservaid);
        const h = hospedes.find((item) => String(item.hospedeid) === String(r.hospedeid));
        const nomeHospede = (h?.nomecompleto || r.hospedeatualnome || '').toLowerCase();
        const cpfHospede = (h?.cpf || '').replace(/\D/g, '');
        const q = quartos.find((item) => String(item.quartoid) === String(r.quartoid));
        const numQuarto = (q?.numero || q?.codigoidentificador || '').toLowerCase();

        const bateu =
          codigo.includes(termo) ||
          idReserva.includes(termo) ||
          nomeHospede.includes(termo) ||
          cpfHospede.includes(termo) ||
          numQuarto.includes(termo);

        if (!bateu) return false;
      }

      return true;
    }).sort((a, b) => b.dataentrada.localeCompare(a.dataentrada));
  }, [reservas, quartos, hospedes, busca, quartoFiltro, statusFiltro]);

  const quartoDaReservaSelecionada = useMemo(() => {
    if (!reservaSelecionada) return null;
    return quartos.find((q) => String(q.quartoid) === String(reservaSelecionada.quartoid)) || null;
  }, [reservaSelecionada, quartos]);

  const hospedeDaReservaSelecionada = useMemo(() => {
    if (!reservaSelecionada) return null;
    return hospedes.find((h) => String(h.hospedeid) === String(reservaSelecionada.hospedeid)) || null;
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
        return 'bg-amber-200 text-amber-950 border-amber-400 font-extrabold';
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do hóspede, código (#RES-001), quarto ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#c1c9bf] bg-white text-xs font-medium text-slate-800 outline-none focus:border-[#053d1e] shadow-xs"
          />
        </div>

        <div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c9bf] bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#053d1e] shadow-xs font-medium"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="PRE_RESERVA">Pré-reserva</option>
            <option value="RESERVADO">Reservado</option>
            <option value="HOSPEDADO">Hospedado</option>
            <option value="CREDITO">⏸️ Suspensas (Crédito)</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div>
          <select
            value={quartoFiltro}
            onChange={(e) => setQuartoFiltro(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#c1c9bf] bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#053d1e] shadow-xs font-medium"
          >
            <option value="TODOS">Todos os Quartos</option>
            {quartos.map((q) => (
              <option key={q.quartoid} value={q.quartoid}>
                Quarto #{q.codigoidentificador || q.numero} ({q.categoria})
              </option>
            ))}
          </select>
        </div>
      </div>

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
                {reservasFiltradas.map((r) => {
                  const q = quartos.find((item) => String(item.quartoid) === String(r.quartoid));
                  const h = hospedes.find((item) => String(item.hospedeid) === String(r.hospedeid));
                  const consumosR = consumosExtras.filter((c) => String(c.reservaid) === String(r.reservaid));
                  const totalConsumos = consumosR.reduce((acc, curr) => acc + (curr.valortotal || 0), 0);
                  const totalGastoCalculado = (r.valortotal || 0) + totalConsumos;
                  const numDiarias = calcularDiarias(r.dataentrada, r.datasaida);
                  const ehCredito = r.statusreserva === 'CREDITO';

                  return (
                    <tr key={r.reservaid} className="hover:bg-slate-50/80 transition-colors">
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
                            {h?.nomecompleto || r.hospedeatualnome || 'Hóspede não informado'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {h?.cpf ? formatarCpf(h.cpf) : (r.codigo || `#RES-${r.reservaid}`)}
                          </span>
                        </div>
                      </td>

                      {/* Período */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {formatarData(r.dataentrada)} ➔ {formatarData(r.datasaida)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {numDiarias} diária(s) • {Number(r.adultos || 1) + Number(r.criancas || 0)} hosp.
                          </span>
                        </div>
                      </td>

                      {/* Data da Reserva */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700">
                          {r.datareserva ? formatarData(r.datareserva) : (r.datainclusao ? formatarData(r.datainclusao) : '--')}
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
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${statusBadgeStyle(r.statusreserva)}`}>
                          {ehCredito ? `⏸️ Crédito (${formatarMoeda(r.valorpago)})` : r.statusreserva}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ehCredito && (
                            <button
                              type="button"
                              onClick={() => handleRemarcar(r)}
                              title="Remarcar esta reserva utilizando o crédito já pago"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs transition-all cursor-pointer shadow-2xs"
                            >
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>Remarcar</span>
                            </button>
                          )}
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
        onRemarcar={handleRemarcar}
      />
    </div>
  );
};
