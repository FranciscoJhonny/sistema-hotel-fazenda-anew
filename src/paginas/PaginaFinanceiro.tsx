import {
  ArrowUpRight,
  Download,
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  TrendingUp,
  AlertCircle,
  Calendar,
  LoaderCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Users
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Pagamento, Reserva, ConsumoExtra } from '../tipos';
import * as XLSX from 'xlsx-js-style';

// Função auxiliar para formatar o nome do pagamento de forma legível
const formatarNomePagamento = (forma: string) => {
  switch (forma) {
    case 'PIX': return 'PIX';
    case 'CARTAO_CREDITO': return 'Crédito';
    case 'CARTAO_DEBITO': return 'Débito';
    case 'DINHEIRO': return 'Dinheiro';
    case 'TRANSFERENCIA': return 'Transferência';
    default: return forma || 'Não informado';
  }
};

export const PaginaFinanceiro: React.FC = () => {
  const { reservas, consumosExtras, pagamentos, quartos, recarregarDados } = useHotel();
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [carregandoAtualizacao, setCarregandoAtualizacao] = useState<boolean>(false);

  const [dataInicioInput, setDataInicioInput] = useState<string>('');
  const [dataFimInput, setDataFimInput] = useState<string>('');
  const [dataInicioFiltro, setDataInicioFiltro] = useState<string>('');
  const [dataFimFiltro, setDataFimFiltro] = useState<string>('');
  const [usarFiltroData, setUsarFiltroData] = useState<boolean>(false);
  const [carregando, setCarregando] = useState<boolean>(false);

  const statusPermitidos = ['RESERVADO', 'HOSPEDADO', 'CONCLUIDA'];

  // 1. FILTRAR RESERVAS
  const reservasDoPeriodo = useMemo(() => {
    return (reservas || []).filter((r: Reserva) => {
      if (!statusPermitidos.includes(r.statusreserva)) return false;

      if (usarFiltroData && dataInicioFiltro && dataFimFiltro) {
        const inicio = new Date(dataInicioFiltro + 'T00:00:00');
        const fim = new Date(dataFimFiltro + 'T23:59:59');

        const dataReferencia = r.dataentrada || r.datareserva || r.datainclusao;
        if (!dataReferencia) return false;

        const dataLimpa = String(dataReferencia).split('T')[0].split(' ')[0];
        const dataReserva = new Date(dataLimpa + 'T12:00:00');

        return dataReserva >= inicio && dataReserva <= fim;
      }

      return true;
    });
  }, [reservas, dataInicioFiltro, dataFimFiltro, usarFiltroData]);

  // 2. PAGAMENTOS E CONSUMOS VINCULADOS
  const pagamentosDoPeriodo = useMemo(() => {
    if (!pagamentos || pagamentos.length === 0) return [];
    if (!usarFiltroData || !dataInicioFiltro || !dataFimFiltro) {
      return pagamentos.filter((p: Pagamento) => p.status === 'CONFIRMADO' || p.status === 'PAGO');
    }
    const idsReservasPeriodo = new Set(reservasDoPeriodo.map(r => String(r.reservaid)));
    return pagamentos.filter((p: Pagamento) => {
      if (p.status !== 'CONFIRMADO' && p.status !== 'PAGO') return false;
      return idsReservasPeriodo.has(String(p.reservaid));
    });
  }, [pagamentos, reservasDoPeriodo, usarFiltroData, dataInicioFiltro, dataFimFiltro]);

  const consumosDessasReservas = useMemo(() => {
    if (!consumosExtras || consumosExtras.length === 0) return [];
    if (!usarFiltroData || !dataInicioFiltro || !dataFimFiltro) {
      return consumosExtras.filter((c: ConsumoExtra) => c.ativo);
    }
    const idsReservasPeriodo = new Set(reservasDoPeriodo.map(r => String(r.reservaid)));
    return consumosExtras.filter((c: ConsumoExtra) => {
      return idsReservasPeriodo.has(String(c.reservaid)) && c.ativo;
    });
  }, [consumosExtras, reservasDoPeriodo, usarFiltroData, dataInicioFiltro, dataFimFiltro]);

  // 3. NOVA GRID VIEW: RESUMO POR RESERVA (CORRIGIDO)
  const resumoReservas = useMemo(() => {
    return reservasDoPeriodo.map(reserva => {
      // Encontrar o quarto
      const quarto = quartos?.find(q => String(q.quartoid) === String(reserva.quartoid));

      // Consumos de Lojinha desta reserva
      const consumosLojinha = consumosDessasReservas.filter(
        c => String(c.reservaid) === String(reserva.reservaid) && c.categoria?.toUpperCase() === 'LOJINHA'
      );
      const valorLojinha = consumosLojinha.reduce((acc, c) => acc + Number(c.valortotal || 0), 0);
      const produtosLojinhaConcat = consumosLojinha.length > 0
        ? consumosLojinha.map(c => `${c.quantidade}x ${c.descricao || c.categoria}`).join(', ')
        : '';

      // Pagamentos desta reserva
      const pagamentosDaReserva = pagamentosDoPeriodo.filter(p => String(p.reservaid) === String(reserva.reservaid));

      // CORREÇÃO: Valor da Reserva = Soma dos pagamentos com tipolancamento === 'SINAL_RESERVA' ou fallback para reserva.valorpago
      const pagamentosSinal = pagamentosDaReserva.filter(p => p.tipolancamento === 'SINAL_RESERVA' || !p.tipolancamento);
      const somaPagosSinal = pagamentosSinal.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const valorReservaPago = somaPagosSinal > 0 ? somaPagosSinal : Number(reserva.valorpago || 0);

      const metodosSinalUnicos = [...new Set(pagamentosSinal.map(p => formatarNomePagamento(p.formapagamento)))].filter(Boolean);
      const metodosSinal = metodosSinalUnicos.length > 0
        ? metodosSinalUnicos.join('/')
        : formatarNomePagamento(reserva.formapagamento || 'PIX');

      // CORREÇÃO: Valor do Checkout = Soma dos pagamentos com tipolancamento === 'SALDO_RESERVA'
      const pagamentosCheckout = pagamentosDaReserva.filter(p => p.tipolancamento === 'SALDO_RESERVA');
      const valorCheckoutPago = pagamentosCheckout.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const metodosCheckout = [...new Set(pagamentosCheckout.map(p => formatarNomePagamento(p.formapagamento)))].filter(Boolean).join('/') || '';

      // Pagamento específico da lojinha (se houver)
      const pagtoLojinhaEspecifico = pagamentosDaReserva.find(p =>
        p.tipolancamento === 'CONSUMO_EXTRA' && Math.abs(Number(p.valor || 0) - valorLojinha) < 0.01
      );

      let metodoPagamentoLojinha = '';
      if (pagtoLojinhaEspecifico) {
        metodoPagamentoLojinha = formatarNomePagamento(pagtoLojinhaEspecifico.formapagamento);
      }

      // CORREÇÃO: Total Geral = Sinal + Checkout + Lojinha
      const totalGeral = valorReservaPago + valorCheckoutPago + valorLojinha;

      // STATUS: Só é "PAGO" se estiver CONCLUIDA (fez check-out) e o saldo for zerado
      let status = 'PENDENTE';
      if (reserva.statusreserva === 'CONCLUIDA' && Number(reserva.saldo || 0) <= 0.01) {
        status = 'PAGO';
      } else if (Number(reserva.valorpago || 0) > 0 && Number(reserva.saldo || 0) > 0) {
        status = 'PARCIAL';
      }

      const adultosReserva = Number(reserva.adultos || 0);
      const criancasReserva = Number(reserva.criancas || 0);
      const somaAdultosCriancas = adultosReserva + criancasReserva;
      const qtdDeclarada = Number(reserva.numerohospedes || 0);
      const totalHospedesReserva = Math.max(somaAdultosCriancas, qtdDeclarada, 1);

      return {
        quarto: quarto?.codigoidentificador || reserva.quartonumero || '',
        codigo: reserva.codigo,
        hospede: reserva.hospedenome,
        adultos: adultosReserva,
        criancas: criancasReserva,
        dataReserva: reserva.datareserva,
        dataEntrada: reserva.dataentrada,
        dataSaida: reserva.datasaida,
        valorReserva: valorReservaPago,
        produtosLojinha: produtosLojinhaConcat,
        valorLojinha: valorLojinha,
        pagtoLojinha: metodoPagamentoLojinha,
        pagtoReserva: metodosSinal,
        valorCheckout: valorCheckoutPago,
        pagtoCheckout: metodosCheckout,
        total: totalGeral,
        totalHospedes: totalHospedesReserva,
        status: status
      };
    }).sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());
  }, [reservasDoPeriodo, consumosDessasReservas, pagamentosDoPeriodo, quartos]);

  // 4. CÁLCULOS FINANCEIROS GERAIS
  const analytics = useMemo(() => {
    const totalConsumosFrigobar = consumosDessasReservas
      .filter(c => c.categoria?.toUpperCase() === 'FRIGOBAR' || c.categoria?.toUpperCase() === 'SERVICOS')
      .reduce((acc, c) => acc + Number(c.valortotal || 0), 0);

    const totalVendasLoja = resumoReservas.reduce((acc, r) => acc + Number(r.valorLojinha || 0), 0);
    const totalSinalReserva = resumoReservas.reduce((acc, r) => acc + Number(r.valorReserva || 0), 0);
    const totalSaldoReserva = resumoReservas.reduce((acc, r) => acc + Number(r.valorCheckout || 0), 0);
    const totalHospedes = resumoReservas.reduce((acc, r) => acc + Number(r.totalHospedes || 0), 0);
    const totalAdultos = resumoReservas.reduce((acc, r) => acc + Number(r.adultos || 0), 0);
    const totalCriancas = resumoReservas.reduce((acc, r) => acc + Number(r.criancas || 0), 0);

    const receitaTotalRealizada = totalSinalReserva + totalSaldoReserva + totalVendasLoja + totalConsumosFrigobar;

    const totalSaldosPendentes = reservasDoPeriodo
      .filter(r => Number(r.saldo || 0) > 0)
      .reduce((acc, r) => acc + Number(r.saldo || 0), 0);

    return {
      receitaTotalRealizada,
      totalSinalReserva,
      totalSaldoReserva,
      totalVendasLoja,
      totalConsumosFrigobar,
      totalSaldosPendentes,
      totalHospedes,
      totalAdultos,
      totalCriancas,
    };
  }, [pagamentosDoPeriodo, consumosDessasReservas, reservasDoPeriodo, resumoReservas]);

  // FUNÇÃO DE EXPORTAÇÃO PARA EXCEL (Mantida exatamente como você ajustou)
  const exportarParaExcel = () => {
    if (resumoReservas.length === 0) {
      alert('Não há dados para exportar. Aplique um filtro primeiro.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    const titulo = 'HOTEL FAZENDA ANEW - GESTÃO DE HOSPEDAGEM E CONSUMO';
    const periodo = `Período: ${formatarData(dataInicioFiltro)} a ${formatarData(dataFimFiltro)}`;

    // ORDEM CORRIGIDA DAS COLUNAS
    wsData.push([titulo]);
    wsData.push([periodo]);
    wsData.push([
      'Nº Quarto',
      'Nome do Hóspede',
      'Adultos',
      'Crianças',
      'Data Entrada',
      'Data Saída',
      'Data Reserva',
      'Valor Reserva (R$)',
      'Pagamento Reserva',
      'Produtos (Loja)',
      'Valor Loja (R$)',
      'Pagamento Loja',
      'Valor Checkout',
      'Pagamento Checkout',
      'Total Geral (R$)'
    ]);

    let totalValorReserva = 0;
    let totalValorLoja = 0;
    let totalValorCheckout = 0;
    let totalGeral = 0;
    let totalAdultosExcel = 0;
    let totalCriancasExcel = 0;

    resumoReservas.forEach((resumo) => {
      // ORDEM CORRIGIDA DOS DADOS
      wsData.push([
        resumo.quarto,
        resumo.hospede,
        resumo.adultos,
        resumo.criancas,
        formatarData(resumo.dataEntrada),
        formatarData(resumo.dataSaida),
        formatarData(resumo.dataReserva),
        Number(resumo.valorReserva || 0),
        resumo.pagtoReserva || '',
        resumo.produtosLojinha || '',
        Number(resumo.valorLojinha || 0),
        resumo.pagtoLojinha || '',
        Number(resumo.valorCheckout || 0),
        resumo.pagtoCheckout || '',
        Number(resumo.total || 0)
      ]);

      totalAdultosExcel += Number(resumo.adultos || 0);
      totalCriancasExcel += Number(resumo.criancas || 0);
      totalValorReserva += Number(resumo.valorReserva || 0);
      totalValorLoja += Number(resumo.valorLojinha || 0);
      totalValorCheckout += Number(resumo.valorCheckout || 0);
      totalGeral += Number(resumo.total || 0);
    });

    // ORDEM CORRIGIDA DO TOTAL
    const linhaTotalIndex = wsData.length;
    wsData.push([
      'Total Geral',        // Coluna A (0)
      '',                   // Coluna B (1)
      totalAdultosExcel,    // Coluna C (2) - Adultos
      totalCriancasExcel,   // Coluna D (3) - Crianças
      '', '', '',           // Colunas E, F, G (4, 5, 6)
      totalValorReserva,    // Coluna H (7) - Valor Reserva
      '',                   // Coluna I (8) - Pagamento Reserva
      '',                   // Coluna J (9) - Produtos Loja
      totalValorLoja,       // Coluna K (10) - Valor Loja
      '',                   // Coluna L (11) - Pagamento Loja
      totalValorCheckout,   // Coluna M (12) - Valor Checkout
      '',                   // Coluna N (13) - Pagamento Checkout
      totalGeral            // Coluna O (14) - Total Geral
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // LARGURAS ATUALIZADAS (15 colunas)
    ws['!cols'] = [
      { wch: 10 },  // A Nº Quarto
      { wch: 29 },  // B Nome
      { wch: 10 },  // C Adultos
      { wch: 10 },  // D Crianças
      { wch: 11 },  // E Data Entrada
      { wch: 10 },  // F Data Saída
      { wch: 11 },  // G Data Reserva
      { wch: 19 },  // H Valor Reserva
      { wch: 16 },  // I Pagamento Reserva
      { wch: 45 },  // J Produtos Loja
      { wch: 16 },  // K Valor Loja
      { wch: 14 },  // L Pagamento Loja
      { wch: 16 },  // M Valor Checkout
      { wch: 16 },  // N Pagamento Checkout
      { wch: 19 }   // O Total Geral
    ];

    // Mesclagens para 15 colunas (A-O, 0-14)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }
    ];

    const COR_TITULO = '2E5A27';
    const COR_CABECALHO = '4A7C59';
    const COR_DESTAQUE = '92D050';
    const COR_ZEBRA = 'F2F6F0';
    const COR_BORDA = '6B8066';
    const COR_TOTAL = '375623';
    const BRANCO = 'FFFFFF';
    const PRETO = '000000';

    const bordaFina = {
      top: { style: 'thin', color: { rgb: COR_BORDA } },
      bottom: { style: 'thin', color: { rgb: COR_BORDA } },
      left: { style: 'thin', color: { rgb: COR_BORDA } },
      right: { style: 'thin', color: { rgb: COR_BORDA } }
    };

    const fonteBase = {
      name: 'Calibri',
      sz: 11,
      color: { rgb: PRETO }
    };

    const formatoMoeda = '[$R$-pt-BR] #,##0.00;[$R$-pt-BR] #,##0.00;[$R$-pt-BR] -';

    // Título - A1:O1
    for (let c = 0; c < 15; c++) {
      const addr = XLSX.utils.encode_col(c) + '1';
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill: { fgColor: { rgb: COR_TITULO } },
        font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: BRANCO } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Período - A2:O2
    for (let c = 0; c < 15; c++) {
      const addr = XLSX.utils.encode_col(c) + '2';
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill: { fgColor: { rgb: COR_CABECALHO } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: BRANCO } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Cabeçalho - A3:O3
    for (let c = 0; c < 15; c++) {
      const addr = XLSX.utils.encode_col(c) + '3';
      ws[addr].s = {
        fill: { fgColor: { rgb: COR_CABECALHO } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: BRANCO } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: bordaFina
      };
    }

    // Dados - A4:O...
    const primeiraLinhaDadosExcel = 4;
    const ultimaLinhaDadosExcel = linhaTotalIndex;

    for (let excelRow = primeiraLinhaDadosExcel; excelRow <= ultimaLinhaDadosExcel; excelRow++) {
      const arrayRow = excelRow - 1;
      const dados = wsData[arrayRow];
      if (!dados || dados.length === 0) continue;

      const corFundo = (excelRow - primeiraLinhaDadosExcel) % 2 === 0 ? BRANCO : COR_ZEBRA;

      for (let c = 0; c < 15; c++) {
        const addr = XLSX.utils.encode_col(c) + excelRow;
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };

        let horizontal: 'left' | 'center' | 'right' = 'center';
        if (c === 1 || c === 9) horizontal = 'left';  // Nome (1) e Produtos (9)
        if (c === 7 || c === 10 || c === 12 || c === 14) horizontal = 'right';  // Valores (7, 10, 12, 14)

        ws[addr].s = {
          fill: { fgColor: { rgb: corFundo } },
          font: fonteBase,
          alignment: { horizontal, vertical: 'center', wrapText: false },
          border: bordaFina
        };

        // Formatação de moeda nas colunas H, K, M, O (índices 7, 10, 12, 14)
        if (c === 7 || c === 10 || c === 12 || c === 14) {
          ws[addr].z = formatoMoeda;
        }
      }
    }

    // Total Geral - linha final
    const totalExcelRow = linhaTotalIndex + 1;
    for (let c = 0; c < 15; c++) {
      const addr = XLSX.utils.encode_col(c) + totalExcelRow;
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };

      ws[addr].s = {
        fill: { fgColor: { rgb: COR_TOTAL } },
        font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: BRANCO } },
        alignment: {
          horizontal: c === 0 || c === 2 || c === 3 || c === 8 || c === 9 || c === 11 || c === 13 ? 'center' : 'right',
          vertical: 'center',
          wrapText: false
        },
        border: {
          top: { style: 'medium', color: { rgb: PRETO } },
          bottom: { style: 'medium', color: { rgb: PRETO } },
          left: { style: 'thin', color: { rgb: PRETO } },
          right: { style: 'thin', color: { rgb: PRETO } }
        }
      };

      if (c === 7 || c === 10 || c === 12 || c === 14) {
        ws[addr].z = formatoMoeda;
      }
    }

    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 27 };
    ws['!rows'][1] = { hpt: 22 };
    ws['!rows'][2] = { hpt: 40 };

    for (let r = 3; r < totalExcelRow - 1; r++) {
      ws['!rows'][r] = { hpt: 20 };
    }
    ws['!rows'][totalExcelRow - 1] = { hpt: 28 };

    ws['!freeze'] = { xSplit: 0, ySplit: 3 };

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Financeiro');

    const nomeArquivo = `Relatorio_Financeiro_${dataInicioFiltro.replace(/-/g, '')}_a_${dataFimFiltro.replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const limparFiltroData = () => {
    setCarregando(true);
    setDataInicioInput('');
    setDataFimInput('');
    setDataInicioFiltro('');
    setDataFimFiltro('');
    setUsarFiltroData(false);
    setTimeout(() => setCarregando(false), 400);
  };

  const aplicarFiltroData = () => {
    if (dataInicioInput && dataFimInput) {
      setCarregando(true);
      setDataInicioFiltro(dataInicioInput);
      setDataFimFiltro(dataFimInput);
      setUsarFiltroData(true);
      setTimeout(() => setCarregando(false), 600);
    }
  };

  const getCorStatus = (status: string) => {
    if (status === 'PAGO') return 'bg-[#e6f4ea] text-[#137333]';
    if (status === 'PARCIAL') return 'bg-[#fff8e1] text-[#b58900]';
    return 'bg-[#ffdad6] text-[#93000a]';
  };

  const getIconeStatus = (status: string) => {
    if (status === 'PAGO') return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (status === 'PARCIAL') return <Clock className="w-3.5 h-3.5" />;
    return <AlertCircle className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">Controle Financeiro & Fluxo de Caixa</h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">Hotel Fazenda Anew</span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Selecione o período de <strong>Data Inicio e Data Final</strong> e clique em "Pesquisar" para processar os dados.
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
            title="Recarregar dados do banco de dados"
            className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${carregandoAtualizacao ? 'animate-spin' : ''}`} />
            <span>{carregandoAtualizacao ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={exportarParaExcel}
            disabled={resumoReservas.length === 0}
            className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /><span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Filtro de Data */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#414941] mb-1.5"><Calendar className="w-3.5 h-3.5 inline mr-1" />Data Inicial</label>
            <input
              type="date"
              value={dataInicioInput}
              onChange={(e) => setDataInicioInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#414941] mb-1.5"><Calendar className="w-3.5 h-3.5 inline mr-1" />Data Final</label>
            <input
              type="date"
              value={dataFimInput}
              onChange={(e) => setDataFimInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={aplicarFiltroData}
              disabled={!dataInicioInput || !dataFimInput || carregando}
              className="px-4 py-2 text-xs font-semibold bg-[#053d1e] text-white rounded-xl hover:bg-[#0a4f2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {carregando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
              Pesquisar
            </button>
            <button
              onClick={limparFiltroData}
              disabled={carregando}
              className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#414941] rounded-xl transition-colors disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        </div>
        {usarFiltroData && dataInicioFiltro && dataFimFiltro && (
          <div className="mt-3 px-3 py-2 bg-[#e6f4ea] border border-[#b8f0c2] rounded-lg text-xs text-[#053d1e] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Período filtrado: <strong>{formatarData(dataInicioFiltro)}</strong> até <strong>{formatarData(dataFimFiltro)}</strong></span>
          </div>
        )}
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Receita Total Realizada</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {formatarMoeda(analytics.receitaTotalRealizada)}
          </h3>
          <p className="text-[11px] text-[#137333] font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Soma exata dos 4 pilares
          </p>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Valor de Reserva</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">{formatarMoeda(analytics.totalSinalReserva)}</h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Valor do Check-out</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">{formatarMoeda(analytics.totalSaldoReserva)}</h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Consumos Lojinha</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">{formatarMoeda(analytics.totalVendasLoja)}</h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Total de Hóspedes</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">{analytics.totalHospedes}</h3>
          <p className="text-[11px] text-[#717971] font-semibold mt-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#053d1e]" /> {analytics.totalAdultos} Adultos / {analytics.totalCriancas} Crianças
          </p>
        </div>
      </div>

      {/* GRID VIEW: RESUMO DETALHADO POR RESERVA */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#c1c9bf] flex items-center justify-between">
          <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">Resumo Financeiro por Reserva</h3>
        </div>

        {resumoReservas.length === 0 ? (
          <div className="p-12 text-center text-[#717971]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm text-[#191c1d]">Nenhuma reserva encontrada</p>
            <p className="text-xs mt-1">Nenhuma reserva confirmada para os critérios informados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9fa] border-b border-[#c1c9bf] text-[#414941] font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 whitespace-nowrap">Quarto</th>
                  <th className="py-3 px-3 whitespace-nowrap">Hóspede</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Adultos</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Crianças</th>
                  <th className="py-3 px-3 whitespace-nowrap">Entrada</th>
                  <th className="py-3 px-3 whitespace-nowrap">Saída</th>
                  <th className="py-3 px-3 whitespace-nowrap">Reserva</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Vlr. Reserva</th>
                  <th className="py-3 px-3 whitespace-nowrap">Pag. Reserva</th> 
                  <th className="py-3 px-3 whitespace-nowrap">Produtos Lojinha</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Vlr. Lojinha</th>
                  <th className="py-3 px-3 whitespace-nowrap">Pag. Lojinha</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Vlr. Check-out</th>
                  <th className="py-3 px-3 whitespace-nowrap">Pag. Check-out</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Total</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
                {resumoReservas.map((resumo, indice) => (
                  <tr key={indice} className={`hover:bg-[#f8f9fa] transition-colors ${resumo.valorCheckout > 0 ? 'bg-[#e6f4ea]/30' : ''}`}>
                    <td className="py-3 px-3 font-bold text-[#053d1e]">{resumo.quarto}</td>
                    <td className="py-3 px-3 font-medium">{resumo.hospede}</td>
                    <td className="py-3 px-3 text-center font-semibold">{resumo.adultos}</td>
                    <td className="py-3 px-3 text-center font-semibold">{resumo.criancas}</td>
                    <td className="py-3 px-3">{formatarData(resumo.dataEntrada)}</td>
                    <td className="py-3 px-3">{formatarData(resumo.dataSaida)}</td>
                    <td className="py-3 px-3">{formatarData(resumo.dataReserva)}</td>
                    <td className="py-3 px-3 text-right font-semibold">{formatarMoeda(resumo.valorReserva)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${resumo.pagtoReserva ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#f3f4f5] text-[#717971]'}`}>
                        {resumo.pagtoReserva || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[200px] truncate" title={resumo.produtosLojinha}>
                      {resumo.produtosLojinha || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">{formatarMoeda(resumo.valorLojinha)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${resumo.pagtoLojinha ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#f3f4f5] text-[#717971]'}`}>
                        {resumo.pagtoLojinha || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">{formatarMoeda(resumo.valorCheckout)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${resumo.pagtoCheckout ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#f3f4f5] text-[#717971]'}`}>
                        {resumo.pagtoCheckout || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-[#053d1e]">{formatarMoeda(resumo.total)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${getCorStatus(resumo.status)}`}>
                        {getIconeStatus(resumo.status)}
                        {resumo.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {resumoReservas.length === 0 && (
                  <tr>
                    <td colSpan={16} className="py-8 text-center text-[#717971]">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma reserva encontrada para o período selecionado.</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {resumoReservas.length > 0 && (
                <tfoot className="bg-[#f8f9fa] font-bold text-[#053d1e]">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-right">Total do Período:</td>
                    <td className="py-3 px-3 text-center">{analytics.totalAdultos}</td>
                    <td className="py-3 px-3 text-center">{analytics.totalCriancas}</td>
                    <td colSpan={3}></td>
                    <td className="py-3 px-3 text-right">{formatarMoeda(resumoReservas.reduce((acc, r) => acc + r.valorReserva, 0))}</td>
                    <td></td>
                    <td></td>
                    <td className="py-3 px-3 text-right">{formatarMoeda(resumoReservas.reduce((acc, r) => acc + r.valorLojinha, 0))}</td>
                    <td></td>
                    <td className="py-3 px-3 text-right">{formatarMoeda(resumoReservas.reduce((acc, r) => acc + r.valorCheckout, 0))}</td>
                    <td></td>
                    <td className="py-3 px-3 text-right">{formatarMoeda(resumoReservas.reduce((acc, r) => acc + r.total, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Rodapé: Composição da Receita Total e Pendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#e6f4ea] border border-[#b8f0c2] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#053d1e]" />
            <h4 className="font-['Manrope'] text-sm font-bold text-[#053d1e]">Composição da Receita Total</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#414941]">1. Valor de Reserva (Sinal):</span><span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalSinalReserva)}</span></div>
            <div className="flex justify-between"><span className="text-[#414941]">2. Valor do Check-out (Saldo):</span><span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalSaldoReserva)}</span></div>
            <div className="flex justify-between"><span className="text-[#414941]">3. Consumos Lojinha:</span><span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalVendasLoja)}</span></div>
            {/* <div className="flex justify-between"><span className="text-[#414941]">4. Consumos Frigobar/Serviços:</span><span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalConsumosFrigobar)}</span></div> */}
            <div className="border-t border-[#b8f0c2] pt-2 mt-2 flex justify-between">
              <span className="font-bold text-[#053d1e]">SOMA TOTAL:</span>
              <span className="font-extrabold text-lg text-[#053d1e]">{formatarMoeda(analytics.receitaTotalRealizada)}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#fff8e1] border border-[#ffe088] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#b58900]" />
            <h4 className="font-['Manrope'] text-sm font-bold text-[#b58900]">Pendências e Atenção</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#414941]">Saldos Check-out Pendentes:</span><span className="font-bold text-[#ba1a1a]">{formatarMoeda(analytics.totalSaldosPendentes)}</span></div>
            <div className="border-t border-[#ffe088] pt-2 mt-2">
              <p className="text-[#717971]">
                <strong>Atenção:</strong> Falta check-outs a serem realizados. Existe hóspede que não fez o check-out ou saiu com saldo em aberto.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay de Carregamento (Loading) */}
      {carregando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs" role="status" aria-live="polite">
          <div className="bg-white rounded-xl px-5 py-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#053d1e]">
            <LoaderCircle className="w-5 h-5 animate-spin" /> Processando dados financeiros...
          </div>
        </div>
      )}
    </div>
  );
};