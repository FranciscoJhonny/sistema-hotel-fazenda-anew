import {
  ArrowUpRight,
  Download,
  Receipt,
  TrendingUp,
  AlertCircle,
  Calendar,
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
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Reserva, ConsumoExtra, Pagamento, Hospede } from '../tipos';
import { SupabaseService } from '../servicos/supabase/SupabaseService';
import * as XLSX from 'xlsx-js-style';

type TipoPeriodo = 'HOJE' | 'ESTE_MES' | 'MES_ANTERIOR' | 'ULTIMOS_30_DIAS' | 'PERSONALIZADO';

const calcularIdade = (dataNascStr?: string): number | null => {
  if (!dataNascStr) return null;
  const dataLimpa = String(dataNascStr).split('T')[0].split(' ')[0];
  const partes = dataLimpa.split('-');
  if (partes.length < 3) return null;
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }
  return Math.max(0, idade);
};

export const PaginaDashboardExecutivo: React.FC = () => {
  const { reservas, consumosExtras, pagamentos, quartos, pacotes, hospedes, usuarioAtual, recarregarDados } = useHotel();
  const [carregandoAtualizacao, setCarregandoAtualizacao] = useState<boolean>(false);

  // Estados de dados de acompanhantes e hóspedes para cálculo dinâmico de idades
  const [acompanhantesDb, setAcompanhantesDb] = useState<any[]>([]);
  const [hospedesLive, setHospedesLive] = useState<Hospede[]>([]);

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

  const [dataInicioInput, setDataInicioInput] = useState<string>(datasPadrao.inicio);
  const [dataFimInput, setDataFimInput] = useState<string>(datasPadrao.fim);
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>(datasPadrao.inicio);
  const [dataFimFiltro, setDataFimFiltro] = useState<string>(datasPadrao.fim);

  const [detalhesAnaliticosAbertos, setDetalhesAnaliticosAbertos] = useState<boolean>(false);
  const [buscaTabela, setBuscaTabela] = useState<string>('');

  // Carregar dados de acompanhantes para o cálculo das idades de tarifação
  const carregarAcompanhantesEIdades = useCallback(async () => {
    try {
      const supabase = SupabaseService.getInstance().getClient();
      if (!supabase) return;

      const [resAcomp, resFnrhAcomp, resHosp] = await Promise.all([
        supabase.from('acompanhante').select('*'),
        supabase.from('cadastro_fnrh_acompanhante').select('*'),
        supabase.from('hospede').select('*'),
      ]);

      const mapAcomp = new Map<string, any>();
      (resAcomp.data || []).forEach((item: any) => {
        const chave = `${(item.nomecompleto || '').trim().toLowerCase()}_${item.reservaid || item.cadastroid}`;
        mapAcomp.set(chave, item);
      });
      (resFnrhAcomp.data || []).forEach((item: any) => {
        const chave = `${(item.nomecompleto || '').trim().toLowerCase()}_${item.reservaid || item.cadastroid}`;
        if (!mapAcomp.has(chave)) {
          mapAcomp.set(chave, item);
        }
      });

      setAcompanhantesDb(Array.from(mapAcomp.values()));
      if (resHosp.data) {
        setHospedesLive(resHosp.data as Hospede[]);
      }
    } catch (err) {
      console.warn('[PaginaDashboardExecutivo] Erro ao carregar acompanhantes:', err);
    }
  }, []);

  useEffect(() => {
    carregarAcompanhantesEIdades();
  }, [carregarAcompanhantesEIdades]);

  const handleMudarPeriodo = (novoTipo: TipoPeriodo) => {
    setTipoPeriodo(novoTipo);
    if (novoTipo !== 'PERSONALIZADO') {
      const d = obterDatasPadraoPeriodo(novoTipo);
      setDataInicioInput(d.inicio);
      setDataFimInput(d.fim);
      setDataInicioFiltro(d.inicio);
      setDataFimFiltro(d.fim);
    }
  };

  const handleExecutarBusca = () => {
    setDataInicioFiltro(dataInicioInput);
    setDataFimFiltro(dataFimInput);
  };

  const statusPermitidos = ['RESERVADO', 'HOSPEDADO', 'CONCLUIDA'];

  // 1. FILTRAR RESERVAS NO PERÍODO
  const reservasFiltradas = useMemo(() => {
    return (reservas || []).filter((r: Reserva) => {
      if (!statusPermitidos.includes(r.statusreserva)) return false;

      if (dataInicioFiltro && dataFimFiltro) {
        const inicio = new Date(dataInicioFiltro + 'T00:00:00');
        const fim = new Date(dataFimFiltro + 'T23:59:59');

        const dataRef = r.dataentrada || r.datareserva || r.datainclusao;
        if (!dataRef) return false;

        const dataLimpa = String(dataRef).split('T')[0].split(' ')[0];
        const dataReserva = new Date(dataLimpa + 'T12:00:00');

        return dataReserva >= inicio && dataReserva <= fim;
      }
      return true;
    });
  }, [reservas, dataInicioFiltro, dataFimFiltro]);

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
    const hospedeMap = new Map<number, Hospede>();
    (hospedes || []).forEach(h => hospedeMap.set(Number(h.hospedeid), h));
    (hospedesLive || []).forEach(h => hospedeMap.set(Number(h.hospedeid), { ...hospedeMap.get(Number(h.hospedeid)), ...h }));

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

      const pagamentosCheckout = pagamentosDaReserva.filter(
        p => p.tipolancamento === 'SALDO_RESERVA' || p.tipolancamento === 'CONSUMO_EXTRA'
      );
      const valorCheckoutPago = pagamentosCheckout.reduce((acc, p) => acc + Number(p.valor || 0), 0);

      const titular = hospedeMap.get(Number(reserva.hospedeid));
      const idadeTitular = calcularIdade(titular?.datanascimento);

      const acompsDaReserva = acompanhantesDb.filter(
        a =>
          (a.reservaid && Number(a.reservaid) === Number(reserva.reservaid)) ||
          (a.cadastroid && reserva.cadastroid && Number(a.cadastroid) === Number(reserva.cadastroid))
      );

      let adultosCalculados = 0;
      let criancasMeiaCalculadas = 0;

      if (acompsDaReserva.length > 0 || titular) {
        if (idadeTitular !== null) {
          if (idadeTitular >= 12) adultosCalculados++;
          else if (idadeTitular >= 6) criancasMeiaCalculadas++;
        } else {
          adultosCalculados++;
        }

        acompsDaReserva.forEach(a => {
          const idade = calcularIdade(a.datanascimento);
          if (idade !== null) {
            if (idade >= 12) adultosCalculados++;
            else if (idade >= 6) criancasMeiaCalculadas++;
          } else {
            if (a.menoridade === false) adultosCalculados++;
            else if (a.menoridade === true) criancasMeiaCalculadas++;
            else adultosCalculados++;
          }
        });
      }

      const qtdAdultos = (acompsDaReserva.length > 0 || titular)
        ? Math.max(adultosCalculados, Number(reserva.adultos || 0))
        : Number(reserva.adultos || 1);

      const qtdCriancasMeia = (acompsDaReserva.length > 0)
        ? criancasMeiaCalculadas
        : Number(reserva.criancas || 0);

      let totalHospedagem = Number(reserva.valortotal || 0);

      if (!totalHospedagem || totalHospedagem <= 0) {
        const pacote = pacotes?.find(p => String(p.pacoteid) === String(reserva.pacoteid));
        let valorBasePessoa = pacote ? Number(pacote.valor || 0) : 0;

        if (!valorBasePessoa) {
          const dEntrada = String(reserva.dataentrada).split('T')[0];
          const dSaida = String(reserva.datasaida).split('T')[0];
          if (dEntrada === dSaida) {
            valorBasePessoa = 200;
          } else {
            const noites = Math.max(1, Math.round((new Date(dSaida).getTime() - new Date(dEntrada).getTime()) / (1000 * 60 * 60 * 24)));
            const diasLazer = noites + 1;
            if (diasLazer === 2) valorBasePessoa = 550;
            else if (diasLazer === 3) valorBasePessoa = 750;
            else if (diasLazer >= 4) valorBasePessoa = 950;
          }
        }
        totalHospedagem = (qtdAdultos * valorBasePessoa) + (qtdCriancasMeia * (valorBasePessoa * 0.5));
      }

      // FÓRMULA PADRÃO: Check-out + Bar + Lojinha + Reserva
      const totalGeral = Number((valorCheckoutPago + valorBar + valorLojinha + valorReservaPago).toFixed(2));

      return {
        quarto: quarto?.codigoidentificador || reserva.quartocodigo || reserva.quartonumero || '',
        codigo: reserva.codigo,
        hospede: reserva.hospedenome || titular?.nomecompleto || 'Hóspede',
        adultos: qtdAdultos,
        criancas: qtdCriancasMeia,
        dataEntrada: reserva.dataentrada,
        dataSaida: reserva.datasaida,
        totalHospedagem,
        dataReserva: reserva.datareserva || reserva.datainclusao || reserva.dataentrada,
        valorReserva: valorReservaPago,
        valorLojinha,
        valorBar,
        valorCheckout: valorCheckoutPago,
        total: totalGeral,
        saldoPendente: Number(reserva.saldo !== undefined && reserva.saldo !== null ? reserva.saldo : Math.max(0, totalHospedagem - valorReservaPago)),
        status: reserva.statusreserva,
        observacoes: reserva.observacoes || '',
        observacoes_checkout: reserva.observacoes_checkout || '',
      };
    }).sort((a, b) => String(a.quarto || '').localeCompare(String(b.quarto || ''), undefined, { numeric: true, sensitivity: 'base' }));
  }, [reservasFiltradas, consumosFiltrados, pagamentosFiltrados, quartos, pacotes, hospedes, hospedesLive, acompanhantesDb]);

  // 4. INDICADORES MACRO EXECUTIVOS
  const analyticsExecutivo = useMemo(() => {
    const totalSinalReserva = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorReserva || 0), 0);
    const totalSaldoCheckout = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorCheckout || 0), 0);
    const totalReceitaHospedagem = totalSinalReserva + totalSaldoCheckout;

    const totalLojinha = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorLojinha || 0), 0);
    const totalBar = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.valorBar || 0), 0);

    const totalFrigobarServicos = consumosFiltrados
      .filter(c => c.categoria?.toUpperCase() === 'FRIGOBAR' || c.categoria?.toUpperCase() === 'SERVICOS')
      .reduce((acc, c) => acc + Number(c.valortotal || 0), 0);

    const faturamentoBrutoRealizado = totalReceitaHospedagem + totalLojinha + totalBar + totalFrigobarServicos;

    const receitaPIX = pagamentosFiltrados.filter(p => p.formapagamento === 'PIX').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaCredito = pagamentosFiltrados.filter(p => p.formapagamento === 'CARTAO_CREDITO').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaDebito = pagamentosFiltrados.filter(p => p.formapagamento === 'CARTAO_DEBITO').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaDinheiro = pagamentosFiltrados.filter(p => p.formapagamento === 'DINHEIRO').reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const receitaOutros = pagamentosFiltrados.filter(p => !['PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO'].includes(p.formapagamento)).reduce((acc, p) => acc + Number(p.valor || 0), 0);

    const totalFormasPagamento = receitaPIX + receitaCredito + receitaDebito + receitaDinheiro + receitaOutros || 1;

    const totalSaldosPendentes = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.saldoPendente || 0), 0);

    const totalAdultos = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.adultos || 0), 0);
    const totalCriancas = resumoAnaliticoReservas.reduce((acc, r) => acc + Number(r.criancas || 0), 0);
    const totalHospedesAtendidos = totalAdultos + totalCriancas;

    const totalQuartosFisicos = (quartos || []).filter(q => {
      const cod = String(q.codigoidentificador || '').toUpperCase();
      const num = String(q.numero || '').toUpperCase();
      return cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE';
    }).length || 1;

    const diariasOcupadas = resumoAnaliticoReservas.length;
    const taxaOcupacaoEstimada = Math.min(100, Math.round((diariasOcupadas / totalQuartosFisicos) * 100));

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
  }, [resumoAnaliticoReservas, consumosFiltrados, pagamentosFiltrados, quartos]);

  const tabelaFiltrada = useMemo(() => {
    if (!buscaTabela.trim()) return resumoAnaliticoReservas;
    const termo = buscaTabela.toLowerCase();
    return resumoAnaliticoReservas.filter(r =>
      (r.hospede || '').toLowerCase().includes(termo) ||
      (r.quarto || '').toLowerCase().includes(termo) ||
      (r.codigo || '').toLowerCase().includes(termo)
    );
  }, [resumoAnaliticoReservas, buscaTabela]);

  const totaisGrid = useMemo(() => {
    return tabelaFiltrada.reduce((acc, item) => ({
      adultos: acc.adultos + Number(item.adultos || 0),
      criancas: acc.criancas + Number(item.criancas || 0),
      totalHospedagem: acc.totalHospedagem + Number(item.totalHospedagem || 0),
      valorReserva: acc.valorReserva + Number(item.valorReserva || 0),
      valorBar: acc.valorBar + Number(item.valorBar || 0),
      valorLojinha: acc.valorLojinha + Number(item.valorLojinha || 0),
      valorCheckout: acc.valorCheckout + Number(item.valorCheckout || 0),
      total: acc.total + Number(item.total || 0),
      saldoPendente: acc.saldoPendente + Number(item.saldoPendente || 0)
    }), {
      adultos: 0,
      criancas: 0,
      totalHospedagem: 0,
      valorReserva: 0,
      valorBar: 0,
      valorLojinha: 0,
      valorCheckout: 0,
      total: 0,
      saldoPendente: 0
    });
  }, [tabelaFiltrada]);

  // 5. EXPORTAÇÃO EXCEL (100% NUMÉRICA - SEM COLUNAS DE TEXTO DE PRODUTOS)
  const exportarRelatorioExecutivo = () => {
    if (resumoAnaliticoReservas.length === 0) {
      alert('Não há dados para exportar no período selecionado.');
      return;
    }

    const nomeAutorComentario = (usuarioAtual as any)?.nomecompleto || (usuarioAtual as any)?.nome || 'Sistema';

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    const titulo = 'HOTEL FAZENDA ANEW - GESTÃO DE HOSPEDAGEM E CONSUMO';
    const periodo = (dataInicioFiltro && dataFimFiltro)
      ? `Período: ${formatarData(dataInicioFiltro)} a ${formatarData(dataFimFiltro)}`
      : 'Período: Geral';

    const colunas = [
      'Nº Quarto',                     // A (0)
      'Nome do Hóspede',               // B (1)
      'Adultos',                       // C (2)
      'Crianças',                      // D (3)
      'Data Entrada',                  // E (4)
      'Data Saída',                    // F (5)
      'Total da Hospedagem (R$)',      // G (6)
      'Data Reserva',                  // H (7)
      'Valor Reserva (R$)',            // I (8)
      'Valor Bar (R$)',                // J (9)
      'Valor Loja (R$)',               // K (10)
      'Valor Check-out (R$)',          // L (11)
      'Total Geral (R$)',              // M (12)
      'Saldo Pendente (R$)'            // N (13)
    ];

    wsData.push([titulo]);
    wsData.push([periodo]);
    wsData.push(colunas);

    // Linhas de dados (iniciam na linha 4 do Excel -> índice r = 3)
    resumoAnaliticoReservas.forEach((r) => {
      wsData.push([
        r.quarto,
        r.hospede,
        Number(r.adultos || 0),
        Number(r.criancas || 0),
        formatarData(r.dataEntrada),
        formatarData(r.dataSaida),
        Number(r.totalHospedagem || 0),
        formatarData(r.dataReserva || ''),
        Number(r.valorReserva || 0),
        Number(r.valorBar || 0),
        Number(r.valorLojinha || 0),
        Number(r.valorCheckout || 0),
        Number(r.total || 0),
        Number(r.saldoPendente || 0)
      ]);
    });

    // Linha de Totais (placeholder)
    wsData.push([
      'Total Geral', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const totalRowIndex = wsData.length - 1; // 0-based
    const totalRowExcel = totalRowIndex + 1; // 1-based (Excel)
    const firstDataRow = 4;                 // Linha 4
    const lastDataRow = totalRowIndex;      // Última linha com hóspede

    // 1. FÓRMULA EM CADA LINHA NA COLUNA "TOTAL GERAL (R$)" (COLUNA M - índice 12)
    // Total Geral = Check-out (L) + Loja (K) + Bar (J) + Reserva (I)
    resumoAnaliticoReservas.forEach((r, idx) => {
      const rowExcel = firstDataRow + idx;
      const cellRef = XLSX.utils.encode_cell({ r: 3 + idx, c: 12 });
      ws[cellRef] = {
        t: 'n',
        f: `L${rowExcel}+K${rowExcel}+J${rowExcel}+I${rowExcel}`,
        v: Number(r.total || 0)
      };
    });

    // 2. FÓRMULAS DE SOMA AUTOMÁTICA NAS COLUNAS DE TOTAIS (LINHA FINAL)
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 2 })] = { t: 'n', f: `SUM(C${firstDataRow}:C${lastDataRow})`, v: analyticsExecutivo.totalAdultos };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 3 })] = { t: 'n', f: `SUM(D${firstDataRow}:D${lastDataRow})`, v: analyticsExecutivo.totalCriancas };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 6 })] = { t: 'n', f: `SUM(G${firstDataRow}:G${lastDataRow})`, v: totaisGrid.totalHospedagem };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 8 })] = { t: 'n', f: `SUM(I${firstDataRow}:I${lastDataRow})`, v: analyticsExecutivo.totalSinalReserva };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 9 })] = { t: 'n', f: `SUM(J${firstDataRow}:J${lastDataRow})`, v: analyticsExecutivo.totalBar };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 10 })] = { t: 'n', f: `SUM(K${firstDataRow}:K${lastDataRow})`, v: analyticsExecutivo.totalLojinha };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 11 })] = { t: 'n', f: `SUM(L${firstDataRow}:L${lastDataRow})`, v: analyticsExecutivo.totalSaldoCheckout };

    // Total Geral final = Check-out + Loja + Bar + Reserva
    const totalGeralFinal = analyticsExecutivo.totalSaldoCheckout + analyticsExecutivo.totalBar + analyticsExecutivo.totalLojinha + analyticsExecutivo.totalSinalReserva;
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 12 })] = {
      t: 'n',
      f: `L${totalRowExcel}+K${totalRowExcel}+J${totalRowExcel}+I${totalRowExcel}`,
      v: totalGeralFinal
    };

    // Saldo Pendente Total (Coluna N - índice 13)
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 13 })] = {
      t: 'n',
      f: `SUM(N${firstDataRow}:N${lastDataRow})`,
      v: analyticsExecutivo.totalSaldosPendentes
    };

    // Mesclagens do Cabeçalho
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colunas.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colunas.length - 1 } },
    ];

    const COR_TITULO = '1E4620';
    const COR_PERIODO = '2E5D31';
    const COR_CABECALHO = '3D7241';
    const COR_TOTAL = '1E4620';
    const COR_ZEBRA = 'F9FAF9';
    const BRANCO = 'FFFFFF';
    const PRETO = '000000';

    const borderThinGray = {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } },
    };

    const formatoMoeda = '[$R$-pt-BR] #,##0.00;[$R$-pt-BR] #,##0.00;[$R$-pt-BR] -';

    // Cabeçalhos (Título e Período)
    for (let c = 0; c < colunas.length; c++) {
      const a0 = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[a0]) ws[a0] = { t: 's', v: '' };
      ws[a0].s = { fill: { fgColor: { rgb: COR_TITULO } }, font: { name: 'Arial', sz: 12, bold: true, color: { rgb: BRANCO } }, alignment: { horizontal: 'center', vertical: 'center' } };

      const a1 = XLSX.utils.encode_cell({ r: 1, c });
      if (!ws[a1]) ws[a1] = { t: 's', v: '' };
      ws[a1].s = { fill: { fgColor: { rgb: COR_PERIODO } }, font: { name: 'Arial', sz: 10, bold: true, color: { rgb: BRANCO } }, alignment: { horizontal: 'center', vertical: 'center' } };

      const a2 = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[a2]) {
        ws[a2].s = {
          fill: { fgColor: { rgb: COR_CABECALHO } },
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: BRANCO } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: { top: { style: 'thin', color: { rgb: BRANCO } }, bottom: { style: 'thin', color: { rgb: BRANCO } }, left: { style: 'thin', color: { rgb: BRANCO } }, right: { style: 'thin', color: { rgb: BRANCO } } },
        };
      }
    }

    const colunasMoeda = new Set([6, 8, 9, 10, 11, 12, 13]);
    const colunasCentro = new Set([0, 2, 3, 4, 5, 7]);

    // Formatação de Linhas e Comentários Ocultos
    resumoAnaliticoReservas.forEach((r, idx) => {
      const rowIdx = 3 + idx;
      const corFundo = idx % 2 === 1 ? COR_ZEBRA : BRANCO;

      for (let c = 0; c < colunas.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
        const cell = ws[addr];
        if (!cell) continue;

        let horizontal: 'left' | 'center' | 'right' = 'left';
        if (colunasMoeda.has(c)) horizontal = 'right';
        else if (colunasCentro.has(c)) horizontal = 'center';

        cell.s = {
          fill: { fgColor: { rgb: corFundo } },
          font: { name: 'Arial', sz: 10, color: { rgb: PRETO } },
          alignment: { horizontal, vertical: 'center', wrapText: true },
          border: borderThinGray,
        };

        if (colunasMoeda.has(c)) {
          cell.z = formatoMoeda;
        }
      }

      // Comentário da Reserva com o Usuário Logado (Coluna I - índice 8)
      if (r.observacoes) {
        const refReserva = XLSX.utils.encode_cell({ r: rowIdx, c: 8 });
        const celula = ws[refReserva];
        if (celula) {
          const itemComment: any = {
            a: nomeAutorComentario,
            t: r.observacoes,
            r: `<r><rPr><b/><sz val="9"/></rPr><t>${nomeAutorComentario}:</t></r><r><rPr><sz val="9"/></rPr><t>\n${r.observacoes}</t></r>`,
            T: true,
            hidden: true,
          };
          celula.c = [itemComment];
          (celula.c as any).hidden = true;
        }
      }

      // Comentário do Check-out com o Usuário Logado (Coluna L - índice 11)
      if (r.observacoes_checkout) {
        const refCheckout = XLSX.utils.encode_cell({ r: rowIdx, c: 11 });
        const celula = ws[refCheckout];
        if (celula) {
          const itemComment: any = {
            a: nomeAutorComentario,
            t: r.observacoes_checkout,
            r: `<r><rPr><b/><sz val="9"/></rPr><t>${nomeAutorComentario}:</t></r><r><rPr><sz val="9"/></rPr><t>\n${r.observacoes_checkout}</t></r>`,
            T: true,
            hidden: true,
          };
          celula.c = [itemComment];
          (celula.c as any).hidden = true;
        }
      }
    });

    // Formatação da Linha de Totais
    for (let c = 0; c < colunas.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRowIndex, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      let horizontal: 'left' | 'center' | 'right' = 'center';
      if (colunasMoeda.has(c)) horizontal = 'right';

      ws[addr].s = {
        fill: { fgColor: { rgb: COR_TOTAL } },
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '86EFAC' } },
        alignment: { horizontal, vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '2E5D31' } }, bottom: { style: 'thin', color: { rgb: '2E5D31' } }, left: { style: 'thin', color: { rgb: '2E5D31' } }, right: { style: 'thin', color: { rgb: '2E5D31' } } },
      };

      if (colunasMoeda.has(c)) {
        ws[addr].z = formatoMoeda;
      }
    }

    ws['!cols'] = colunas.map((col, c) => {
      let maxLen = col.length;
      resumoAnaliticoReservas.forEach((r) => {
        let val = '';
        if (c === 0) val = String(r.quarto || '');
        else if (c === 1) val = String(r.hospede || '');
        else if (c === 2) val = String(r.adultos || '');
        else if (c === 3) val = String(r.criancas || '');
        else if (c === 4) val = formatarData(r.dataEntrada);
        else if (c === 5) val = formatarData(r.dataSaida);
        else if (c === 6) val = `R$ ${Number(r.totalHospedagem || 0).toFixed(2)}`;
        else if (c === 7) val = formatarData(r.dataReserva || '');
        else if (c === 8) val = `R$ ${Number(r.valorReserva || 0).toFixed(2)}`;
        else if (c === 9) val = `R$ ${Number(r.valorBar || 0).toFixed(2)}`;
        else if (c === 10) val = `R$ ${Number(r.valorLojinha || 0).toFixed(2)}`;
        else if (c === 11) val = `R$ ${Number(r.valorCheckout || 0).toFixed(2)}`;
        else if (c === 12) val = `R$ ${Number(r.total || 0).toFixed(2)}`;
        else if (c === 13) val = `R$ ${Number(r.saldoPendente || 0).toFixed(2)}`;
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });

    ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 28 }];
    ws['!freeze'] = { xSplit: 0, ySplit: 3 };

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Executivo');

    const formatarDataNomeArquivo = (dataIso: string) => {
      if (!dataIso) return '';
      const [ano, mes, dia] = dataIso.split('-');
      return `${dia}_${mes}_${ano}`;
    };

    const dInicio = formatarDataNomeArquivo(dataInicioFiltro);
    const dFim = formatarDataNomeArquivo(dataFimFiltro);

    const nomeArquivo = dInicio && dFim  
      ? `Relatorio_Executivo_${dInicio}_a_${dFim}.xlsx` 
      : `Relatorio_Executivo_Geral.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);
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
                await Promise.all([
                  recarregarDados(),
                  carregarAcompanhantesEIdades()
                ]);
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

          <button
            onClick={exportarRelatorioExecutivo}
            disabled={resumoAnaliticoReservas.length === 0}
            className="px-4 py-2 text-xs font-bold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório Excel</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE PERÍODO COM BUSCA POR DATA INÍCIO E FIM INLINE + BOTÃO PESQUISAR */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-[#053d1e]" /> Período de Análise Executiva:
            </span>

            <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold text-[#717971] uppercase">De</span>
              <input
                type="date"
                value={dataInicioInput}
                onChange={(e) => {
                  setDataInicioInput(e.target.value);
                  setTipoPeriodo('PERSONALIZADO');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecutarBusca();
                }}
                className="text-xs font-bold text-[#053d1e] bg-transparent focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] font-bold text-[#717971] uppercase ml-1">Até</span>
              <input
                type="date"
                value={dataFimInput}
                onChange={(e) => {
                  setDataFimInput(e.target.value);
                  setTipoPeriodo('PERSONALIZADO');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecutarBusca();
                }}
                className="text-xs font-bold text-[#053d1e] bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleExecutarBusca}
              className="px-4 py-2 bg-[#053d1e] text-white rounded-xl text-xs font-bold hover:bg-[#043017] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Search className="w-4 h-4" /> Pesquisar
            </button>
          </div>

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
      </div>

      {/* BLOCO 1 - VISÃO MACRO (INDICADORES PRINCIPAIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <span>Hóspedes Pagantes:</span>
                <span className="text-[#053d1e]">{analyticsExecutivo.totalHospedesAtendidos}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-[#191c1d]">
                <span>Ocupação Estimada:</span>
                <span className="text-[#053d1e]">{analyticsExecutivo.taxaOcupacaoEstimada}%</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#717971] font-semibold mt-3 pt-2 border-t border-[#f3f4f6]">
            {analyticsExecutivo.totalAdultos} Adultos (≥12a) / {analyticsExecutivo.totalCriancas} Crianças Meia (6-11a)
          </p>
        </div>
      </div>

      {/* BLOCO 2 - DISTRIBUIÇÃO GRÁFICA / BARRAS VISUAIS DE COMPOSIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span className="flex items-center gap-1.5"><Bed className="w-4 h-4 text-[#053d1e]" /> Hospedagem (Diárias/Sinais):</span>
                <span>{formatarMoeda(analyticsExecutivo.totalReceitaHospedagem)} ({analyticsExecutivo.pctHospedagem}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#053d1e] transition-all duration-500" style={{ width: `${analyticsExecutivo.pctHospedagem}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span className="flex items-center gap-1.5"><Receipt className="w-4 h-4 text-amber-700" /> Vendas do Bar:</span>
                <span>{formatarMoeda(analyticsExecutivo.totalBar)} ({analyticsExecutivo.pctBar}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctBar}%` }} />
              </div>
            </div>

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
            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>PIX (Instantâneo):</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaPIX)} ({analyticsExecutivo.pctPIX}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctPIX}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>Cartão de Crédito:</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaCredito)} ({analyticsExecutivo.pctCredito}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctCredito}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-[#191c1d] mb-1">
                <span>Cartão de Débito:</span>
                <span>{formatarMoeda(analyticsExecutivo.receitaDebito)} ({analyticsExecutivo.pctDebito}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${analyticsExecutivo.pctDebito}%` }} />
              </div>
            </div>

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

      {/* BLOCO 3 - VISÃO DE DETALHES ANALÍTICOS (COLAPSÁVEL) */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setDetalhesAnaliticosAbertos(!detalhesAnaliticosAbertos)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer border-b border-[#c1c9bf] rounded-t-2xl"
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
            <div className="p-3 bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl text-xs space-y-1">
              <p className="font-bold text-[#191c1d] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#053d1e]" /> 📋 Resumo das Regras Etárias & Tarifação:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#414941] pt-1">
                <div><strong>Grátis (0 a 5 anos):</strong> 100% isento (não entra na contagem nem no valor).</div>
                <div><strong>Meia-diária (6 a 11 anos):</strong> Paga 50% da diária (contabilizado em Crianças).</div>
                <div><strong>Integral (12 anos ou mais):</strong> Paga 100% da diária (contabilizado em Adultos).</div>
              </div>
            </div>

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

            <div className="w-full overflow-x-auto rounded-xl border border-[#e1e3e4] shadow-xs">
              <table className="w-full min-w-[1150px] text-left text-[11px] leading-tight">
                <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#414941] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="w-16 py-2.5 px-2 text-center">Quarto</th>
                    <th className="min-w-[180px] max-w-[220px] py-2.5 px-2 text-left truncate">Hóspede</th>
                    <th className="w-12 py-2.5 px-1.5 text-center">Ad.</th>
                    <th className="w-12 py-2.5 px-1.5 text-center">Cri.</th>
                    <th className="w-24 py-2.5 px-1.5 text-center">Entrada</th>
                    <th className="w-24 py-2.5 px-1.5 text-center">Saída</th>
                    <th className="min-w-[105px] py-2.5 px-2 text-right whitespace-nowrap">Total Hosp.</th>
                    <th className="w-24 py-2.5 px-1.5 text-center">Data Res.</th>
                    <th className="min-w-[100px] py-2.5 px-2 text-right whitespace-nowrap">Vlr. Res.</th>
                    <th className="min-w-[85px] py-2.5 px-2 text-right whitespace-nowrap">Vlr. Bar</th>
                    <th className="min-w-[85px] py-2.5 px-2 text-right whitespace-nowrap">Vlr. Loj.</th>
                    <th className="min-w-[105px] py-2.5 px-2 text-right whitespace-nowrap">Vlr. Checkout</th>
                    <th className="min-w-[105px] py-2.5 px-2 text-right whitespace-nowrap">Total Geral</th>
                    <th className="min-w-[95px] py-2.5 px-2 text-right whitespace-nowrap">Sal. Pend.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
                  {tabelaFiltrada.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="w-16 py-2 px-2 text-center font-bold text-[#053d1e] truncate">{item.quarto}</td>
                      <td className="min-w-[180px] max-w-[220px] py-2 px-2 font-semibold truncate" title={item.hospede}>
                        {item.hospede}
                      </td>
                      <td className="w-12 py-2 px-1.5 text-center font-bold text-[11px] whitespace-nowrap">{item.adultos}</td>
                      <td className="w-12 py-2 px-1.5 text-center font-bold text-amber-900 text-[11px] whitespace-nowrap">{item.criancas}</td>
                      <td className="w-24 py-2 px-1.5 text-center text-[11px] whitespace-nowrap">{formatarData(item.dataEntrada)}</td>
                      <td className="w-24 py-2 px-1.5 text-center text-[11px] whitespace-nowrap">{formatarData(item.dataSaida)}</td>
                      <td className="min-w-[105px] py-2 px-2 text-right font-bold text-[#053d1e] bg-[#e6f4ea]/20 text-[11px] whitespace-nowrap">
                        {formatarMoeda(item.totalHospedagem)}
                      </td>
                      <td className="w-24 py-2 px-1.5 text-center text-[#717971] text-[11px] whitespace-nowrap">{formatarData(item.dataReserva)}</td>

                      {/* Vlr. da Reserva com Tooltip Seguro */}
                      <td className="min-w-[100px] py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">
                        {item.observacoes ? (
                          <div className="relative group inline-flex items-center gap-1 justify-end cursor-help py-1">
                            <span className="underline decoration-dotted decoration-amber-600 underline-offset-4">
                              {formatarMoeda(item.valorReserva)}
                            </span>
                            <span className="text-[10px] text-amber-600 select-none">💬</span>
                            <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-0.5 w-[380px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-pre-wrap break-words text-left leading-relaxed cursor-default before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-2">
                              <span className="text-[10px] font-bold text-[#86efac] block mb-1 uppercase tracking-wider">
                                Observações da Reserva
                              </span>
                              <span className="text-slate-200 font-normal">{item.observacoes}</span>
                            </div>
                          </div>
                        ) : (
                          formatarMoeda(item.valorReserva)
                        )}
                      </td>

                      <td className="min-w-[85px] py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">{formatarMoeda(item.valorBar)}</td>
                      <td className="min-w-[85px] py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">{formatarMoeda(item.valorLojinha)}</td>

                      {/* Vlr. Checkout com Tooltip Seguro */}
                      <td className="min-w-[105px] py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">
                        {item.observacoes_checkout ? (
                          <div className="relative group inline-flex items-center gap-1 justify-end cursor-help py-1">
                            <span className="underline decoration-dotted decoration-emerald-600 underline-offset-4">
                              {formatarMoeda(item.valorCheckout)}
                            </span>
                            <span className="text-[10px] text-emerald-600 select-none">💬</span>
                            <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-0.5 w-[380px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-pre-wrap break-words text-left leading-relaxed cursor-default before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-2">
                              <span className="text-[10px] font-bold text-[#86efac] block mb-1 uppercase tracking-wider">
                                Observações do Check-out
                              </span>
                              <span className="text-slate-200 font-normal">{item.observacoes_checkout}</span>
                            </div>
                          </div>
                        ) : (
                          formatarMoeda(item.valorCheckout)
                        )}
                      </td>

                      <td className="min-w-[105px] py-2 px-2 text-right font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">{formatarMoeda(item.total)}</td>
                      <td className={`min-w-[95px] py-2 px-2 text-right font-bold text-[11px] whitespace-nowrap ${item.saldoPendente > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}`}>
                        {formatarMoeda(item.saldoPendente)}
                      </td>
                    </tr>
                  ))}
                  {tabelaFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-6 text-center text-[#717971]">
                        Nenhum registro encontrado para o filtro informado.
                      </td>
                    </tr>
                  )}
                </tbody>
                {tabelaFiltrada.length > 0 && (
                  <tfoot className="bg-[#e6f4ea]/40 border-t-2 border-[#053d1e] text-[#191c1d] font-bold text-[11px]">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-2 font-extrabold uppercase text-[#053d1e] tracking-wider text-[11px] truncate">
                        Total Geral ({tabelaFiltrada.length})
                      </td>
                      <td className="w-12 py-2.5 px-1.5 text-center font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">{totaisGrid.adultos}</td>
                      <td className="w-12 py-2.5 px-1.5 text-center font-extrabold text-amber-900 text-[11px] whitespace-nowrap">{totaisGrid.criancas}</td>
                      <td className="w-24 py-2.5 px-1.5 text-center text-[#717971] font-semibold whitespace-nowrap">-</td>
                      <td className="w-24 py-2.5 px-1.5 text-center text-[#717971] font-semibold whitespace-nowrap">-</td>
                      <td className="min-w-[105px] py-2.5 px-2 text-right font-extrabold text-[#053d1e] bg-[#e6f4ea]/30 text-[11px] whitespace-nowrap">
                        {formatarMoeda(totaisGrid.totalHospedagem)}
                      </td>
                      <td className="w-24 py-2.5 px-1.5 text-center text-[#717971] font-semibold whitespace-nowrap">-</td>
                      <td className="min-w-[100px] py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                        {formatarMoeda(totaisGrid.valorReserva)}
                      </td>
                      <td className="min-w-[85px] py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                        {formatarMoeda(totaisGrid.valorBar)}
                      </td>
                      <td className="min-w-[85px] py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                        {formatarMoeda(totaisGrid.valorLojinha)}
                      </td>
                      <td className="min-w-[105px] py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                        {formatarMoeda(totaisGrid.valorCheckout)}
                      </td>
                      <td className="min-w-[105px] py-2.5 px-2 text-right font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">
                        {formatarMoeda(totaisGrid.total)}
                      </td>
                      <td className={`min-w-[95px] py-2.5 px-2 text-right font-extrabold text-[11px] whitespace-nowrap ${totaisGrid.saldoPendente > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}`}>
                        {formatarMoeda(totaisGrid.saldoPendente)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};