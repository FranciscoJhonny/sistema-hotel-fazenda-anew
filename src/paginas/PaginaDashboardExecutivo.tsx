import {
  ArrowUpRight,
  Download,
  Receipt,
  TrendingUp,
  AlertCircle,
  Calendar,
  LoaderCircle,
  RefreshCw,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  PieChart,
  CreditCard,
  Building2,
  Bed,
  CheckCircle2
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Reserva, ConsumoExtra, Pagamento } from '../tipos';
import * as XLSX from 'xlsx-js-style';

type TipoPeriodo = 'HOJE' | 'ESTE_MES' | 'MES_ANTERIOR' | 'ULTIMOS_30_DIAS' | 'PERSONALIZADO';

export const PaginaDashboardExecutivo: React.FC = () => {
  const { reservas, consumosExtras, pagamentos, quartos, recarregarDados, usuarioAtual } = useHotel();
  const [carregandoAtualizacao, setCarregandoAtualizacao] = useState<boolean>(false);

  // Estados de Filtro de Período
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('ESTE_MES');

  const obterDatasPadraoPeriodo = (tipo: TipoPeriodo) => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    if (tipo === 'HOJE') {
      const dataStr = hoje.toISOString().split('T')[0];
      return { inicio: dataStr, fim: dataStr };
    }
    if (tipo === 'ESTE_MES') {
      const primeiroDia = new Date(ano, mes, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, mes + 1, 0).toISOString().split('T')[0];
      return { inicio: primeiroDia, fim: ultimoDia };
    }
    if (tipo === 'MES_ANTERIOR') {
      const primeiroDia = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];
      return { inicio: primeiroDia, fim: ultimoDia };
    }
    if (tipo === 'ULTIMOS_30_DIAS') {
      const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fim = hoje.toISOString().split('T')[0];
      return { inicio, fim };
    }
    return { inicio: '', fim: '' };
  };

  const datasPadrao = useMemo(() => obterDatasPadraoPeriodo(tipoPeriodo), [tipoPeriodo]);

  const [dataInicio, setDataInicio] = useState<string>(datasPadrao.inicio);
  const [dataFim, setDataFim] = useState<string>(datasPadrao.fim);
  const [detalhesAnaliticosAbertos, setDetalhesAnaliticosAbertos] = useState<boolean>(false);
  const [buscaTabela, setBuscaTabela] = useState<string>('');

  // Atualiza datas quando o botão de atalho do período muda
  const handleMudarPeriodo = (novoTipo: TipoPeriodo) => {
    setTipoPeriodo(novoTipo);
    if (novoTipo !== 'PERSONALIZADO') {
      const d = obterDatasPadraoPeriodo(novoTipo);
      setDataInicio(d.inicio);
      setDataFim(d.fim);
    }
  };

  const statusPermitidos = ['RESERVADO', 'HOSPEDADO', 'CONCLUIDA'];

  // 1. FILTRAR RESERVAS NO PERÍODO
  const reservasFiltradas = useMemo(() => {
    return (reservas || []).filter((r: Reserva) => {
      if (!statusPermitidos.includes(r.statusreserva)) return false;

      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio + 'T00:00:00');
        const fim = new Date(dataFim + 'T23:59:59');

        const dataRef = r.dataentrada || r.datareserva || r.datainclusao;
        if (!dataRef) return false;

        const dataLimpa = String(dataRef).split('T')[0].split(' ')[0];
        const dataReserva = new Date(dataLimpa + 'T12:00:00');

        return dataReserva >= inicio && dataReserva <= fim;
      }
      return true;
    });
  }, [reservas, dataInicio, dataFim]);

  // 2. FILTRAR CONSUMOS E PAGAMENTOS
  const idsReservasPeriodo = useMemo(() => new Set(reservasFiltradas.map(r => String(r.reservaid))), [reservasFiltradas]);

  const consumosFiltrados = useMemo(() => {
    return (consumosExtras || []).filter((c: ConsumoExtra) => c.ativo && idsReservasPeriodo.has(String(c.reservaid)));
  }, [consumosExtras, idsReservasPeriodo]);

  const pagamentosFiltrados = useMemo(() => {
    return (pagamentos || []).filter((p: Pagamento) =>
      (p.status === 'CONFIRMADO' || p.status === 'PAGO') && idsReservasPeriodo.has(String(p.reservaid))
    );
  }, [pagamentos, idsReservasPeriodo]);

  // 3. DETALHAMENTO ANALÍTICO POR RESERVA
  const resumoAnaliticoReservas = useMemo(() => {
    return reservasFiltradas.map(reserva => {
      const quarto = quartos?.find(q => String(q.quartoid) === String(reserva.quartoid));

      const consumosLojinha = consumosFiltrados.filter(
        c => String(c.reservaid) === String(reserva.reservaid) && c.categoria?.toUpperCase() === 'LOJINHA'
      );
      const valorLojinha = consumosLojinha.reduce((acc, c) => acc + Number(c.valortotal || 0), 0);

      const consumosBar = consumosFiltrados.filter(
        c => String(c.reservaid) === String(reserva.reservaid) && c.categoria?.toUpperCase() === 'BAR'
      );
      const valorBar = consumosBar.reduce((acc, c) => acc + Number(c.valortotal || 0), 0);

      const pagamentosDaReserva = pagamentosFiltrados.filter(p => String(p.reservaid) === String(reserva.reservaid));

      const pagamentosSinal = pagamentosDaReserva.filter(p => p.tipolancamento === 'SINAL_RESERVA' || !p.tipolancamento);
      const somaPagosSinal = pagamentosSinal.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const valorReservaPago = somaPagosSinal > 0 ? somaPagosSinal : Number(reserva.valorpago || 0);

      const pagamentosCheckout = pagamentosDaReserva.filter(p => p.tipolancamento === 'SALDO_RESERVA');
      const valorCheckoutPago = pagamentosCheckout.reduce((acc, p) => acc + Number(p.valor || 0), 0);

      const totalGeral = valorReservaPago + valorCheckoutPago + valorLojinha + valorBar;

      return {
        quarto: quarto?.codigoidentificador || reserva.quartonumero || '',
        codigo: reserva.codigo,
        hospede: reserva.hospedenome,
        adultos: Number(reserva.adultos || 0),
        criancas: Number(reserva.criancas || 0),
        dataEntrada: reserva.dataentrada,
        dataSaida: reserva.datasaida,
        valorReserva: valorReservaPago,
        valorLojinha,
        valorBar,
        valorCheckout: valorCheckoutPago,
        total: totalGeral,
        saldoPendente: Number(reserva.saldo || 0),
        status: reserva.statusreserva,
      };
    }).sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());
  }, [reservasFiltradas, consumosFiltrados, pagamentosFiltrados, quartos]);

  // 4. INDICADORES MACRO EXECUTIVOS
  const analyticsExecutivo = useMemo(() => {
    // Receitas por Pilar
    const totalSinalReserva = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorReserva || 0), 0);
    const totalSaldoCheckout = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorCheckout || 0), 0);
    const totalReceitaHospedagem = totalSinalReserva + totalSaldoCheckout;

    const totalLojinha = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorLojinha || 0), 0);
    const totalBar = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorBar || 0), 0);

    const totalFrigobarServicos = consumosFiltrados
      .filter(c => c.categoria?.toUpperCase() === 'FRIGOBAR' || c.categoria?.toUpperCase() === 'SERVICOS')
      .reduce((acc, c) => acc + Number(c.valortotal || 0), 0);

    const faturamentoBrutoRealizado = totalReceitaHospedagem + totalLojinha + totalBar + totalFrigobarServicos;

    // Entradas por Meio de Pagamento
    const receitaPIX = pagamentosFiltrados.filter(p => p.formapagamento === 'PIX').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaCredito = pagamentosFiltrados.filter(p => p.formapagamento === 'CARTAO_CREDITO').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaDebito = pagamentosFiltrados.filter(p => p.formapagamento === 'CARTAO_DEBITO').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaDinheiro = pagamentosFiltrados.filter(p => p.formapagamento === 'DINHEIRO').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaOutros = pagamentosFiltrados.filter(p => !['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'].includes(p.formapagamento)).reduce((acc, p) => acc + Number(p.valor || 0), 0);

    const totalFormasPagamento = receitaPIX + receitaCredito + receitaDebito + receitaDinheiro + receitaOutros || 1;

    // Pendências a Receber
    const totalSaldosPendentes = reservasFiltradas
      .filter(r => Number(r.saldo || 0) > 0)
      .reduce((acc, r) => acc + Number(r.saldo || 0), 0);

    // Indicadores Operacionais
    const totalAdultos = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.adultos || 0), 0);
    const totalCriancas = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.criancas || 0), 0);
    const totalHospedesAtendidos = totalAdultos + totalCriancas;

    // Taxa Média de Ocupação
    const totalQuartosFisicos = (quartos || []).filter(q => {
      const cod = String(q.codigoidentificador || '').toUpperCase();
      const num = String(q.numero || '').toUpperCase();
      return cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE';
    }).length || 1;

    const diariasOcupadas = resumoAnaliticoReservas.length;
    const taxaOcupacaoEstimada = Math.min(100, Math.round((diariasOcupadas / totalQuartosFisicos) * 100));

    // Percentuais de Composição
    const pctHospedagem = faturamentoBrutoRealizado > 0 ? Math.round((totalReceitaHospedagem / faturamentoBrutoRealizado) * 100) : 0;
    const pctBar = faturamentoBrutoRealizado > 0 ? Math.round((totalBar / faturamentoBrutoRealizado) * 100) : 0;
    const pctLojinha = faturamentoBrutoRealizado > 0 ? Math.round((totalLojinha / faturamentoBrutoRealizado) * 100) : 0;
    const pctOutros = faturamentoBrutoRealizado > 0 ? Math.max(0, 100 - (pctHospedagem + pctBar + pctLojinha)) : 0;

    return {
      faturamentoBrutoRealizado,
      totalReceitaHospedagem,
      totalSinalReserva,
      totalSaldoCheckout,
      totalLojinha,
      totalBar,
      totalFrigobarServicos,
      receitaPIX,
      receitaCredito,
      receitaDebito,
      receitaDinheiro,
      receitaOutros,
      totalSaldosPendentes,
      totalHospedesAtendidos,
      totalAdultos,
      totalCriancas,
      totalQuartosFisicos,
      taxaOcupacaoEstimada,
      pctHospedagem,
      pctBar,
      pctLojinha,
      pctOutros,
      pctPIX: Math.round((receitaPIX / totalFormasPagamento) * 100),
      pctCredito: Math.round((receitaCredito / totalFormasPagamento) * 100),
      pctDebito: Math.round((receitaDebito / totalFormasPagamento) * 100),
      pctDinheiro: Math.round((receitaDinheiro / totalFormasPagamento) * 100),
    };
  }, [resumoAnaliticoReservas, consumosFiltrados, pagamentosFiltrados, reservasFiltradas, quartos]);

  // Tabela analítica filtrada por busca
  const tabelaFiltrada = useMemo(() => {
    if (!buscaTabela.trim()) return resumoAnaliticoReservas;
    const termo = buscaTabela.toLowerCase();
    return resumoAnaliticoReservas.filter(r =>
      r.hospede.toLowerCase().includes(termo) ||
      r.quarto.toLowerCase().includes(termo) ||
      r.codigo.toLowerCase().includes(termo)
    );
  }, [resumoAnaliticoReservas, buscaTabela]);

  // Exportar dados para Excel
  const exportarRelatorioExecutivo = () => {
    if (resumoAnaliticoReservas.length === 0) {
      alert('Não há dados para exportar no período selecionado.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    wsData.push(['HOTEL FAZENDA ANEW - PAINEL FINANCEIRO EXECUTIVO']);
    wsData.push([`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`]);
    wsData.push([]);
    wsData.push(['Resumo Consolidado']);
    wsData.push(['Faturamento Bruto Realizado', analyticsExecutivo.faturamentoBrutoRealizado]);
    wsData.push(['Receita de Hospedagem (Diárias/Sinais)', analyticsExecutivo.totalReceitaHospedagem]);
    wsData.push(['Vendas Bar', analyticsExecutivo.totalBar]);
    wsData.push(['Vendas Lojinha', analyticsExecutivo.totalLojinha]);
    wsData.push(['Pendências a Receber', analyticsExecutivo.totalSaldosPendentes]);
    wsData.push([]);

    wsData.push([
      'Quarto', 'Hóspede', 'Adultos', 'Crianças', 'Entrada', 'Saída',
      'Vlr. Hospedagem (R$)', 'Vlr. Bar (R$)', 'Vlr. Lojinha (R$)', 'Total Geral (R$)', 'Saldo Pendente'
    ]);

    resumoAnaliticoReservas.forEach(r => {
      wsData.push([
        r.quarto,
        r.hospede,
        r.adultos,
        r.criancas,
        formatarData(r.dataEntrada),
        formatarData(r.dataSaida),
        r.valorReserva + r.valorCheckout,
        r.valorBar,
        r.valorLojinha,
        r.total,
        r.saldoPendente
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Painel Executivo');
    XLSX.writeFile(wb, `Relatorio_Executivo_${dataInicio}_a_${dataFim}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">Painel Financeiro Executivo</h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              Diretoria & Propriedade
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Visão macro consolidada de faturamento bruto, canais de receita, meios de pagamento e ocupação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setCarregandoAtualizacao(true);
              try {
                await recarregarDados();
              } finally {
                setCarregandoAtualizacao(false);
              }
            }}
            disabled={carregandoAtualizacao}
            className="px-4 py-2 text-xs font-bold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${carregandoAtualizacao ? 'animate-spin' : ''}`} />
            <span>{carregandoAtualizacao ? 'Atualizando...' : 'Atualizar Dados'}</span>
          </button>
        </div>
      </div>

      {/* SELETOR RÁPIDO DE PERÍODO */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#053d1e]" /> Período de Análise Executiva:
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'HOJE', label: 'Hoje' },
              { id: 'ESTE_MES', label: 'Este Mês' },
              { id: 'MES_ANTERIOR', label: 'Mês Anterior' },
              { id: 'ULTIMOS_30_DIAS', label: 'Últimos 30 Dias' },
              { id: 'PERSONALIZADO', label: 'Personalizado' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleMudarPeriodo(p.id as TipoPeriodo)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tipoPeriodo === p.id
                    ? 'bg-[#053d1e] text-white shadow-xs'
                    : 'bg-[#f8f9fa] text-[#414941] hover:bg-[#e6f4ea] border border-[#c1c9bf]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Data quando Personalizado */}
        {tipoPeriodo === 'PERSONALIZADO' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-[#f3f4f6]">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-[#717971] mb-1">Data Inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-[#717971] mb-1">Data Final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 1 - VISÃO MACRO (INDICADORES PRINCIPAIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Bruto Realizado */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#717971]">Faturamento Bruto</span>
              <span className="p-1.5 rounded-xl bg-[#e6f4ea] text-[#053d1e]">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#053d1e] mt-2">
              {formatarMoeda(analyticsExecutivo.faturamentoBrutoRealizado)}
            </h3>
          </div>
          <p className="text-[11px] text-[#137333] font-semibold mt-3 pt-2 border-t border-[#f3f4f6] flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Total Realizado (Hospedagem + Bar + Loja)
          </p>
        </div>

        {/* Card 2: Consumos Bar vs. Lojinha */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#717971]">Consumos Extras</span>
              <span className="p-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                <PieChart className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-sm font-bold text-[#191c1d]">
                <span>Bar:</span>
                <span className="text-[#053d1e]">{formatarMoeda(analyticsExecutivo.totalBar)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-[#191c1d]">
                <span>Lojinha:</span>
                <span className="text-[#053d1e]">{formatarMoeda(analyticsExecutivo.totalLojinha)}</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#717971] font-semibold mt-3 pt-2 border-t border-[#f3f4f6]">
            Total Consumos Extras: <strong className="text-[#191c1d]">{formatarMoeda(analyticsExecutivo.totalBar + analyticsExecutivo.totalLojinha)}</strong>
          </div>
        </div>

        {/* Card 3: Pendências a Receber */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#717971]">Saldos a Receber</span>
              <span className="p-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </span>
            </div>
            <h3 className="font-['Manrope'] text-3xl font-extrabold text-[#ba1a1a] mt-2">
              {formatarMoeda(analyticsExecutivo.totalSaldosPendentes)}
            </h3>
          </div>
          <p className="text-[11px] text-rose-800 font-semibold mt-3 pt-2 border-t border-[#f3f4f6]">
            Débitos pendentes de acerto em reservas
          </p>
        </div>

        {/* Card 4: Operacional / Hóspedes e Ocupação */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#717971]">Hóspedes & Ocupação</span>
              <span className="p-1.5 rounded-xl bg-[#e6f4ea] text-[#053d1e]">
                <Users className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-sm font-bold text-[#191c1d]">
                <span>Hóspedes Atendidos:</span>
                <span className="text-[#053d1e]">{analyticsExecutivo.totalHospedesAtendidos}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-[#191c1d]">
                <span>Ocupação Estimada:</span>
                <span className="text-[#053d1e]">{analyticsExecutivo.taxaOcupacaoEstimada}%</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#717971] font-semibold mt-3 pt-2 border-t border-[#f3f4f6]">
            {analyticsExecutivo.totalAdultos} Adultos / {analyticsExecutivo.totalCriancas} Crianças
          </p>
        </div>
      </div>

      {/* BLOCO 2 - DISTRIBUIÇÃO GRÁFICA / BARRAS VISUAIS DE COMPOSIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composição da Receita */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3">
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#053d1e]" /> Composição do Faturamento (% Pilar)
            </h3>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full">
              100% Receita
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Hospedagem */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span className="flex items-center gap-1.5"><Bed className="w-4 h-4 text-[#053d1e]" /> Hospedagem (Diárias/Sinais):</span>
                <span>{formatarMoeda(analyticsExecutivo.totalReceitaHospedagem)} ({analyticsExecutivo.pctHospedagem}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#053d1e] transition-all duration-500" style={{ width: `${analyticsExecutivo.pctHospedagem}%` }} />
              </div>
            </div>

            {/* Consumos Bar */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span className="flex items-center gap-1.5"><Receipt className="w-4 h-4 text-amber-700" /> Vendas do Bar:</span>
                <span>{formatarMoeda(analyticsExecutivo.totalBar)} ({analyticsExecutivo.pctBar}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctBar}%` }} />
              </div>
            </div>

            {/* Consumos Lojinha */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-emerald-600" /> Vendas da Lojinha:</span>
                <span>{formatarMoeda(analyticsExecutivo.totalLojinha)} ({analyticsExecutivo.pctLojinha}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctLojinha}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Meios de Pagamento Mais Utilizados */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3">
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#053d1e]" /> Entradas por Meio de Pagamento
            </h3>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full">
              Fluxo Recebido
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* PIX */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>PIX (Instantâneo):</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaPIX)} ({analyticsExecutivo.pctPIX}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctPIX}%` }} />
              </div>
            </div>

            {/* Cartão de Crédito */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>Cartão de Crédito:</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaCredito)} ({analyticsExecutivo.pctCredito}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctCredito}%` }} />
              </div>
            </div>

            {/* Cartão de Débito */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>Cartão de Débito:</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaDebito)} ({analyticsExecutivo.pctDebito}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctDebito}%` }} />
              </div>
            </div>

            {/* Dinheiro */}
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>Dinheiro em Espécie:</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaDinheiro)} ({analyticsExecutivo.pctDinheiro}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctDinheiro}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 3 - VISÃO DE DETALHES SOB DEMANDA (COLAPSÁVEL) */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setDetalhesAnaliticosAbertos(!detalhesAnaliticosAbertos)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer border-b border-[#c1c9bf]"
        >
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#053d1e]" />
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
              Detalhamento Analítico por Reserva / Hóspede
            </h3>
            <span className="text-xs font-semibold text-[#717971] bg-slate-100 px-2.5 py-0.5 rounded-full">
              {resumoAnaliticoReservas.length} registros
            </span>
          </div>

          <div className="flex items-center gap-2 font-bold text-xs text-[#053d1e]">
            <span>{detalhesAnaliticosAbertos ? 'Ocultar Detalhes' : '🔍 Ver Detalhes por Reserva'}</span>
            {detalhesAnaliticosAbertos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {detalhesAnaliticosAbertos && (
          <div className="p-5 space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#717971] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar hóspede, quarto ou código de reserva..."
                  value={buscaTabela}
                  onChange={(e) => setBuscaTabela(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              <button
                type="button"
                onClick={exportarRelatorioExecutivo}
                className="px-4 py-2 text-xs font-bold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> <span>Exportar para Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#e1e3e4]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#414941] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Quarto</th>
                    <th className="py-3 px-3">Hóspede</th>
                    <th className="py-3 px-3 text-center">Adultos</th>
                    <th className="py-3 px-3 text-center">Crianças</th>
                    <th className="py-3 px-3">Entrada</th>
                    <th className="py-3 px-3">Saída</th>
                    <th className="py-3 px-3 text-right">Vlr. Hospedagem</th>
                    <th className="py-3 px-3 text-right">Vlr. Bar</th>
                    <th className="py-3 px-3 text-right">Vlr. Lojinha</th>
                    <th className="py-3 px-3 text-right">Total Geral</th>
                    <th className="py-3 px-3 text-right">Saldo Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
                  {tabelaFiltrada.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#053d1e]">{item.quarto}</td>
                      <td className="py-2.5 px-3 font-semibold">{item.hospede}</td>
                      <td className="py-2.5 px-3 text-center">{item.adultos}</td>
                      <td className="py-2.5 px-3 text-center">{item.criancas}</td>
                      <td className="py-2.5 px-3">{formatarData(item.dataEntrada)}</td>
                      <td className="py-2.5 px-3">{formatarData(item.dataSaida)}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatarMoeda(item.valorReserva + item.valorCheckout)}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatarMoeda(item.valorBar)}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatarMoeda(item.valorLojinha)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-[#053d1e]">{formatarMoeda(item.total)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${item.saldoPendente > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}`}>
                        {formatarMoeda(item.saldoPendente)}
                      </td>
                    </tr>
                  ))}
                  {tabelaFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-6 text-center text-[#717971]">
                        Nenhum registro encontrado para o filtro informado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
