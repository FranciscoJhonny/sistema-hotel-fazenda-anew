import {
  ArrowUpRight,
  Download,
  TrendingUp,
  AlertCircle,
  Calendar,
  LoaderCircle,
  RefreshCw,
  Users
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Pagamento, Reserva, ConsumoExtra } from '../tipos';
import * as XLSX from 'xlsx-js-style';

const formatarNomePagamento = (forma: string, parcelas?: number) => {
  const parcelaTexto = parcelas && Number(parcelas) > 1 ? ` (${parcelas}x)` : '';
  switch (forma) {
    case 'PIX': return 'PIX';
    case 'CARTAO_CREDITO': return `Crédito${parcelaTexto}`;
    case 'CARTAO_DEBITO': return 'Débito';
    case 'DINHEIRO': return 'Dinheiro';
    case 'TRANSFERENCIA': return 'Transferência';
    default: return forma ? `${forma}${parcelaTexto}` : 'Não informado';
  }
};

const formatarDiscriminacaoPagamentos = (lista: Pagamento[]) => {
  if (!lista || lista.length === 0) return '';
  return lista
    .map((p) => {
      const nome = formatarNomePagamento(p.formapagamento, (p as any).parcelas);
      return `${nome}: ${formatarMoeda(Number(p.valor || 0))}`;
    })
    .join(' | ');
};

export const PaginaFinanceiro: React.FC = () => {
  const { reservas, consumosExtras, pagamentos, quartos, recarregarDados } = useHotel();
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
    const idsReservasPeriodo = new Set(reservasDoPeriodo.map((r) => String(r.reservaid)));
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
    const idsReservasPeriodo = new Set(reservasDoPeriodo.map((r) => String(r.reservaid)));
    return consumosExtras.filter((c: ConsumoExtra) => {
      return idsReservasPeriodo.has(String(c.reservaid)) && c.ativo;
    });
  }, [consumosExtras, reservasDoPeriodo, usarFiltroData, dataInicioFiltro, dataFimFiltro]);

  // 3. RESUMO CONSOLIDADO DISCRIMINADO POR RESERVA
  const resumoReservas = useMemo(() => {
    return reservasDoPeriodo.map((reserva) => {
      const quarto = quartos?.find((q) => String(q.quartoid) === String(reserva.quartoid));

      // Consumos da Lojinha
      const consumosLojinha = consumosDessasReservas.filter(
        (c) => String(c.reservaid) === String(reserva.reservaid) && c.categoria?.toUpperCase() === 'LOJINHA'
      );
      const valorLojinha = consumosLojinha.reduce((acc, c) => acc + Number(c.valortotal || 0), 0);
      const produtosLojinhaConcat = consumosLojinha.length > 0
        ? consumosLojinha.map((c) => `${c.quantidade}x ${c.descricao || c.categoria}`).join(', ')
        : '';

      // Consumos do Bar
      const consumosBar = consumosDessasReservas.filter(
        (c) => String(c.reservaid) === String(reserva.reservaid) && c.categoria?.toUpperCase() === 'BAR'
      );
      const valorBar = consumosBar.reduce((acc, c) => acc + Number(c.valortotal || 0), 0);
      const produtosBarConcat = consumosBar.length > 0
        ? consumosBar.map((c) => `${c.quantidade}x ${c.descricao || c.categoria}`).join(', ')
        : '';

      // Todos os pagamentos desta reserva
      const pagamentosDaReserva = pagamentosDoPeriodo.filter(
        (p) => String(p.reservaid) === String(reserva.reservaid)
      );

      // Pagamentos de Sinal da Reserva
      const pagamentosSinal = pagamentosDaReserva.filter(
        (p) => p.tipolancamento === 'SINAL_RESERVA' || !p.tipolancamento
      );
      const somaPagosSinal = pagamentosSinal.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const valorReservaPago = somaPagosSinal > 0 ? somaPagosSinal : Number(reserva.valorpago || 0);

      const pagtoReservaDetalhado = pagamentosSinal.length > 0
        ? formatarDiscriminacaoPagamentos(pagamentosSinal)
        : formatarNomePagamento(reserva.formapagamento || 'PIX');

      // Pagamentos executados no Checkout (Saldo Restante e Consumos)
      const pagamentosCheckout = pagamentosDaReserva.filter(
        (p) => p.tipolancamento === 'SALDO_RESERVA' || p.tipolancamento === 'CONSUMO_EXTRA'
      );
      const valorCheckoutPago = pagamentosCheckout.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const pagtoCheckoutDetalhado = formatarDiscriminacaoPagamentos(pagamentosCheckout);

      const pagamentosExtras = pagamentosDaReserva.filter((p) => p.tipolancamento === 'CONSUMO_EXTRA');
      const pagtoExtrasSeparado = formatarDiscriminacaoPagamentos(pagamentosExtras);

      const pagtoLojinha = valorLojinha > 0
        ? (pagtoExtrasSeparado || (reserva.statusreserva === 'CONCLUIDA' ? (pagtoCheckoutDetalhado || 'Liquidado no Checkout') : 'Pendente'))
        : '';

      const pagtoBar = valorBar > 0
        ? (pagtoExtrasSeparado || (reserva.statusreserva === 'CONCLUIDA' ? (pagtoCheckoutDetalhado || 'Liquidado no Checkout') : 'Pendente'))
        : '';

      const totalHospedagem = Number(reserva.valortotal || 0);
      const totalGeral = valorReservaPago + valorCheckoutPago;
      const saldoPendente = Number(reserva.saldo !== undefined ? reserva.saldo : Math.max(0, totalHospedagem - valorReservaPago));

      let status = 'PENDENTE';
      if (reserva.statusreserva === 'CONCLUIDA' && saldoPendente <= 0.01) {
        status = 'PAGO';
      } else if (Number(reserva.valorpago || 0) > 0 || valorCheckoutPago > 0) {
        status = 'PARCIAL';
      }

      const adultosReserva = Number(reserva.adultos || 0);
      const criancasReserva = Number(reserva.criancas || 0);
      const totalHospedesReserva = Math.max(adultosReserva + criancasReserva, 1);

      return {
        quarto: quarto?.codigoidentificador || reserva.quartocodigo || reserva.quartonumero || '',
        codigo: reserva.codigo,
        hospede: reserva.hospedenome || 'Hóspede',
        adultos: adultosReserva,
        criancas: criancasReserva,
        dataEntrada: reserva.dataentrada,
        dataSaida: reserva.datasaida,
        totalHospedagem: totalHospedagem,
        dataReserva: reserva.datareserva || reserva.datainclusao || reserva.dataentrada,
        valorReserva: valorReservaPago,
        pagtoReserva: pagtoReservaDetalhado,
        valorBar: valorBar,
        pagtoBar: pagtoBar,
        produtosBar: produtosBarConcat,
        valorLojinha: valorLojinha,
        pagtoLojinha: pagtoLojinha,
        produtosLojinha: produtosLojinhaConcat,
        valorCheckout: valorCheckoutPago,
        pagtoCheckout: pagtoCheckoutDetalhado,
        total: totalGeral,
        saldoPendente: saldoPendente,
        totalHospedes: totalHospedesReserva,
        status: status,
        observacoes: reserva.observacoes || '',
        observacoes_checkout: reserva.observacoes_checkout || '',
      };
    }).sort((a, b) => String(a.quarto || '').localeCompare(String(b.quarto || ''), undefined, { numeric: true, sensitivity: 'base' }));
  }, [reservasDoPeriodo, consumosDessasReservas, pagamentosDoPeriodo, quartos]);

  // 4. CÁLCULOS FINANCEIROS GERAIS
  const analytics = useMemo(() => {
    const totalConsumosFrigobar = consumosDessasReservas
      .filter((c) => c.categoria?.toUpperCase() === 'FRIGOBAR' || c.categoria?.toUpperCase() === 'SERVICOS')
      .reduce((acc, c) => acc + Number(c.valortotal || 0), 0);

    const totalVendasLoja = resumoReservas.reduce((acc, r) => acc + Number(r.valorLojinha || 0), 0);
    const totalVendasBar = resumoReservas.reduce((acc, r) => acc + Number(r.valorBar || 0), 0);
    const totalSinalReserva = resumoReservas.reduce((acc, r) => acc + Number(r.valorReserva || 0), 0);
    const totalSaldoReserva = resumoReservas.reduce((acc, r) => acc + Number(r.valorCheckout || 0), 0);
    const totalHospedagem = resumoReservas.reduce((acc, r) => acc + Number(r.totalHospedagem || 0), 0);
    const totalHospedes = resumoReservas.reduce((acc, r) => acc + Number(r.totalHospedes || 0), 0);
    const totalAdultos = resumoReservas.reduce((acc, r) => acc + Number(r.adultos || 0), 0);
    const totalCriancas = resumoReservas.reduce((acc, r) => acc + Number(r.criancas || 0), 0);

    const receitaTotalRealizada = totalSinalReserva + totalSaldoReserva;

    const totalSaldosPendentes = resumoReservas.reduce((acc, r) => acc + Number(r.saldoPendente || 0), 0);

    return {
      receitaTotalRealizada,
      totalSinalReserva,
      totalSaldoReserva,
      totalHospedagem,
      totalVendasLoja,
      totalVendasBar,
      totalConsumosFrigobar,
      totalSaldosPendentes,
      totalHospedes,
      totalAdultos,
      totalCriancas,
    };
  }, [consumosDessasReservas, resumoReservas]);

  // 5. EXPORTAÇÃO EXCEL
  const exportarParaExcel = () => {
    if (resumoReservas.length === 0) {
      alert('Não há dados para exportar. Aplique um filtro primeiro.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    const titulo = 'HOTEL FAZENDA ANEW - GESTÃO DE HOSPEDAGEM E CONSUMO';
    const periodo = `Período: ${formatarData(dataInicioFiltro || '')} a ${formatarData(dataFimFiltro || '')}`;

    const colunas = [
      'Nº Quarto',
      'Nome do Hóspede',
      'Adultos',
      'Crianças',
      'Data Entrada',
      'Data Saída',
      'Total da Hospedagem (R$)',
      'Data Reserva',
      'Valor Reserva (R$)',
      'Pag. Reserva',
      'Valor Bar (R$)',
      'Produtos (Bar)',
      'Pag. Bar',
      'Valor Loja (R$)',
      'Produtos (Loja)',
      'Pag. Loja',
      'Valor Check-out (R$)',
      'Pag. Check-out',
      'Total Geral (R$)',
      'Saldo Pendente (R$)',
      'Status'
    ];

    wsData.push([titulo]);
    wsData.push([periodo]);
    wsData.push(colunas);

    resumoReservas.forEach((r) => {
      wsData.push([
        r.quarto,
        r.hospede,
        r.adultos,
        r.criancas,
        formatarData(r.dataEntrada),
        formatarData(r.dataSaida),
        Number(r.totalHospedagem || 0),
        formatarData(r.dataReserva || ''),
        Number(r.valorReserva || 0),
        r.pagtoReserva || '',
        Number(r.valorBar || 0),
        r.produtosBar || '',
        r.pagtoBar || '',
        Number(r.valorLojinha || 0),
        r.produtosLojinha || '',
        r.pagtoLojinha || '',
        Number(r.valorCheckout || 0),
        r.pagtoCheckout || '',
        Number(r.total || 0),
        Number(r.saldoPendente || 0),
        r.status
      ]);
    });

    const totalRowIdx = wsData.length;
    wsData.push([
      'Total Geral',
      '',
      analytics.totalAdultos,
      analytics.totalCriancas,
      '',
      '',
      analytics.totalHospedagem,
      '',
      analytics.totalSinalReserva,
      '',
      analytics.totalVendasBar,
      '',
      '',
      analytics.totalVendasLoja,
      '',
      '',
      analytics.totalSaldoReserva,
      '',
      analytics.receitaTotalRealizada,
      analytics.totalSaldosPendentes,
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

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

    // Linha 1 (Título)
    for (let c = 0; c < colunas.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill: { fgColor: { rgb: COR_TITULO } },
        font: { name: 'Arial', sz: 12, bold: true, color: { rgb: BRANCO } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Linha 2 (Período)
    for (let c = 0; c < colunas.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill: { fgColor: { rgb: COR_PERIODO } },
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: BRANCO } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Linha 3 (Cabeçalhos)
    for (let c = 0; c < colunas.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[addr]) {
        ws[addr].s = {
          fill: { fgColor: { rgb: COR_CABECALHO } },
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: BRANCO } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: { top: { style: 'thin', color: { rgb: BRANCO } }, bottom: { style: 'thin', color: { rgb: BRANCO } }, left: { style: 'thin', color: { rgb: BRANCO } }, right: { style: 'thin', color: { rgb: BRANCO } } },
        };
      }
    }

    const colunasMoeda = new Set([6, 8, 10, 13, 16, 18, 19]);
    const colunasCentro = new Set([0, 2, 3, 4, 5, 7, 20]);

    // Dados das linhas
    resumoReservas.forEach((r, idx) => {
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

      if (r.observacoes) {
        const refReserva = XLSX.utils.encode_cell({ r: rowIdx, c: 8 });
        const celula = ws[refReserva];
        if (celula) {
          celula.c = [{
            a: 'Kevin Jhonny Prestes Maia',
            t: r.observacoes,
            r: `<r><rPr><b/><sz val="9"/></rPr><t>Kevin Jhonny Prestes Maia:</t></r><r><rPr><sz val="9"/></rPr><t>\n${r.observacoes}</t></r>`,
            T: true,
            hidden: true,
          }];
        }
      }

      if (r.observacoes_checkout) {
        const refCheckout = XLSX.utils.encode_cell({ r: rowIdx, c: 16 });
        const celula = ws[refCheckout];
        if (celula) {
          celula.c = [{
            a: 'Kevin Jhonny Prestes Maia',
            t: r.observacoes_checkout,
            r: `<r><rPr><b/><sz val="9"/></rPr><t>Kevin Jhonny Prestes Maia:</t></r><r><rPr><sz val="9"/></rPr><t>\n${r.observacoes_checkout}</t></r>`,
            T: true,
            hidden: true,
          }];
        }
      }
    });

    // Linha Final de Totais
    for (let c = 0; c < colunas.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
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
      resumoReservas.forEach((r) => {
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
        else if (c === 9) val = String(r.pagtoReserva || '');
        else if (c === 10) val = `R$ ${Number(r.valorBar || 0).toFixed(2)}`;
        else if (c === 11) val = String(r.produtosBar || '');
        else if (c === 12) val = String(r.pagtoBar || '');
        else if (c === 13) val = `R$ ${Number(r.valorLojinha || 0).toFixed(2)}`;
        else if (c === 14) val = String(r.produtosLojinha || '');
        else if (c === 15) val = String(r.pagtoLojinha || '');
        else if (c === 16) val = `R$ ${Number(r.valorCheckout || 0).toFixed(2)}`;
        else if (c === 17) val = String(r.pagtoCheckout || '');
        else if (c === 18) val = `R$ ${Number(r.total || 0).toFixed(2)}`;
        else if (c === 19) val = `R$ ${Number(r.saldoPendente || 0).toFixed(2)}`;
        else if (c === 20) val = String(r.status || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });

    ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 28 }];
    ws['!freeze'] = { xSplit: 0, ySplit: 3 };

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Financeiro');
    const nomeArquivo = `Relatorio_Financeiro_${(dataInicioFiltro || 'Geral').replace(/-/g, '')}_a_${(dataFimFiltro || '').replace(/-/g, '')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const limparFiltroData = () => {
    setCarregando(true);
    setDataInicioInput('');
    setDataFimInput('');
    setDataInicioFiltro('');
    setDataFimFiltro('');
    setUsarFiltroData(false);
    setTimeout(() => setCarregando(false), 300);
  };

  const aplicarFiltroData = () => {
    if (dataInicioInput && dataFimInput) {
      setCarregando(true);
      setDataInicioFiltro(dataInicioInput);
      setDataFimFiltro(dataFimInput);
      setUsarFiltroData(true);
      setTimeout(() => setCarregando(false), 400);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Controle Financeiro & Fluxo de Caixa
            </h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              Hotel Fazenda Anew
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Gestão consolidada de diárias, adiantamentos, consumos de Bar/Lojinha e liquidações discriminadas do check-out.
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
            <Download className="w-4 h-4" />
            <span>Exportar Relatório Excel</span>
          </button>
        </div>
      </div>

      {/* Filtro de Data */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#414941] mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Data Inicial
            </label>
            <input
              type="date"
              value={dataInicioInput}
              onChange={(e) => setDataInicioInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#414941] mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Data Final
            </label>
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
              className="px-4 py-2 text-xs font-semibold bg-[#053d1e] text-white rounded-xl hover:bg-[#0a4f2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
            >
              {carregando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
              Pesquisar
            </button>
            <button
              onClick={limparFiltroData}
              disabled={carregando}
              className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#414941] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
        {usarFiltroData && dataInicioFiltro && dataFimFiltro && (
          <div className="mt-3 px-3 py-2 bg-[#e6f4ea] border border-[#b8f0c2] rounded-lg text-xs text-[#053d1e] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Período filtrado: <strong>{formatarData(dataInicioFiltro)}</strong> até <strong>{formatarData(dataFimFiltro)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Receita Realizada</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {formatarMoeda(analytics.receitaTotalRealizada)}
          </h3>
          <p className="text-[11px] text-[#137333] font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Entradas em Caixa
          </p>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Sinal de Reserva</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {formatarMoeda(analytics.totalSinalReserva)}
          </h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Pago no Check-out</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(analytics.totalSaldoReserva)}
          </h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Consumos Lojinha</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(analytics.totalVendasLoja)}
          </h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Consumos Bar</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(analytics.totalVendasBar)}
          </h3>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Total Hóspedes</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {analytics.totalHospedes}
          </h3>
          <p className="text-[11px] text-[#717971] font-semibold mt-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#053d1e]" /> {analytics.totalAdultos} Adultos / {analytics.totalCriancas} Crianças
          </p>
        </div>
      </div>

      {/* Grid: Tabela com ordenação idêntica ao Macro Financeiro + colunas detalhadas */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c1c9bf] flex items-center justify-between">
          <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
            Resumo Financeiro por Reserva
          </h3>
          <span className="text-xs text-[#717971]">
            Exibindo <strong>{resumoReservas.length}</strong> reservas
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* Container com moldura idêntica à Imagem 1 */}
          <div className="w-full overflow-x-auto rounded-xl border border-[#e1e3e4] shadow-2xs">
            <table className="w-full min-w-[1350px] text-left text-[11px] leading-tight">
              <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#414941] font-bold uppercase text-[10px]">
                <tr>
                  {/* 1. QUARTO NA PRIMEIRA COLUNA */}
                  <th className="py-2.5 px-2 text-center whitespace-nowrap w-16">Quarto</th>
                  <th className="py-2.5 px-2 text-left whitespace-nowrap min-w-[180px]">Hóspede</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-12">Ad.</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-12">Cri.</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-24">Entrada</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-24">Saída</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[105px]">Total Hosp.</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-24">Data Res.</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[100px]">Vlr. Res.</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[85px]">Vlr. Bar</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[85px]">Vlr. Loj.</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[105px]">Vlr. Checkout</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[105px]">Total Geral</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[95px]">Sal. Pend.</th>

                  {/* Colunas complementares */}
                  <th className="py-2.5 px-2 whitespace-nowrap min-w-[120px]">Pag. Reserva</th>
                  <th className="py-2.5 px-2 whitespace-nowrap min-w-[130px]">Produtos Lojinha</th>
                  <th className="py-2.5 px-2 whitespace-nowrap min-w-[110px]">Pag. Lojinha</th>
                  <th className="py-2.5 px-2 whitespace-nowrap min-w-[130px]">Produtos Bar</th>
                  <th className="py-2.5 px-2 whitespace-nowrap min-w-[110px]">Pag. Bar</th>
                  <th className="py-2.5 px-2 whitespace-nowrap min-w-[180px]">Pag. Check-out (Detalhes)</th>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
                {resumoReservas.map((r, indice) => (
                  <tr key={indice} className="hover:bg-[#f8f9fa] transition-colors">
                    {/* Célula do Quarto na 1ª posição */}
                    <td className="py-2 px-2 text-center font-bold text-[#053d1e]">{r.quarto || '-'}</td>
                    <td className="py-2 px-2 font-semibold truncate max-w-[220px]" title={r.hospede}>{r.hospede}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-[11px] whitespace-nowrap">{r.adultos}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-amber-900 text-[11px] whitespace-nowrap">{r.criancas}</td>
                    <td className="py-2 px-1.5 text-center text-[11px] whitespace-nowrap">{formatarData(r.dataEntrada)}</td>
                    <td className="py-2 px-1.5 text-center text-[11px] whitespace-nowrap">{formatarData(r.dataSaida)}</td>
                    <td className="py-2 px-2 text-right font-bold text-[#053d1e] bg-[#e6f4ea]/20 text-[11px] whitespace-nowrap">
                      {formatarMoeda(r.totalHospedagem)}
                    </td>
                    <td className="py-2 px-1.5 text-center text-[#717971] text-[11px] whitespace-nowrap">{formatarData(r.dataReserva || '')}</td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">
                      {r.observacoes ? (
                        <div className="relative group inline-flex items-center gap-1 justify-end cursor-help py-1">
                          <span className="underline decoration-dotted decoration-amber-600 underline-offset-4">
                            {formatarMoeda(r.valorReserva)}
                          </span>
                          <span className="text-[10px] text-amber-600 select-none">💬</span>
                          <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-0.5 w-[360px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-pre-wrap break-words text-left leading-relaxed cursor-default before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-2">
                            <span className="text-[10px] font-bold text-[#86efac] block mb-1 uppercase tracking-wider">
                              Observações da Reserva
                            </span>
                            <span className="text-slate-200 font-normal">{r.observacoes}</span>
                          </div>
                        </div>
                      ) : (
                        formatarMoeda(r.valorReserva)
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">{formatarMoeda(r.valorBar)}</td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">{formatarMoeda(r.valorLojinha)}</td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">
                      {r.observacoes_checkout ? (
                        <div className="relative group inline-flex items-center gap-1 justify-end cursor-help py-1">
                          <span className="underline decoration-dotted decoration-emerald-600 underline-offset-4">
                            {formatarMoeda(r.valorCheckout)}
                          </span>
                          <span className="text-[10px] text-emerald-600 select-none">💬</span>
                          <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-0.5 w-[360px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-pre-wrap break-words text-left leading-relaxed cursor-default before:content-[''] before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-2">
                            <span className="text-[10px] font-bold text-[#86efac] block mb-1 uppercase tracking-wider">
                              Observações do Check-out
                            </span>
                            <span className="text-slate-200 font-normal">{r.observacoes_checkout}</span>
                          </div>
                        </div>
                      ) : (
                        formatarMoeda(r.valorCheckout)
                      )}
                    </td>
                    <td className="py-2 px-2 text-right font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">{formatarMoeda(r.total)}</td>
                    <td className={`py-2 px-2 text-right font-bold text-[11px] whitespace-nowrap ${r.saldoPendente > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}`}>
                      {formatarMoeda(r.saldoPendente)}
                    </td>

                    {/* Restante das colunas complementares */}
                    <td className="py-2 px-2 text-slate-700">{r.pagtoReserva || '-'}</td>
                    <td className="py-2 px-2 max-w-[160px] truncate text-slate-600" title={r.produtosLojinha}>{r.produtosLojinha || '-'}</td>
                    <td className="py-2 px-2 text-slate-700">{r.pagtoLojinha || '-'}</td>
                    <td className="py-2 px-2 max-w-[160px] truncate text-slate-600" title={r.produtosBar}>{r.produtosBar || '-'}</td>
                    <td className="py-2 px-2 text-slate-700">{r.pagtoBar || '-'}</td>
                    <td className="py-2 px-2 font-medium">
                      {r.pagtoCheckout ? (
                        <div className="flex flex-col gap-0.5">
                          {r.pagtoCheckout.split(' | ').map((item, idx) => (
                            <span key={idx} className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'PAGO' ? 'bg-[#e6f4ea] text-[#137333] border border-[#b8f0c2]' :
                        r.status === 'PARCIAL' ? 'bg-[#fff8e1] text-[#b58900] border border-[#ffe088]' :
                        'bg-[#ffdad6] text-[#93000a] border border-[#f1a9a3]'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {resumoReservas.length === 0 && (
                  <tr>
                    <td colSpan={21} className="py-12 text-center text-[#717971]">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm text-[#191c1d]">Nenhuma reserva encontrada</p>
                      <p className="text-xs mt-1">Nenhum registro para os critérios informados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {resumoReservas.length > 0 && (
                <tfoot className="bg-[#e6f4ea]/40 border-t-2 border-[#053d1e] text-[#191c1d] font-bold text-[11px]">
                  <tr>
                    <td className="py-2.5 px-2 text-center font-extrabold text-[#053d1e]">-</td>
                    <td className="py-2.5 px-2 font-extrabold uppercase text-[#053d1e] tracking-wider text-[11px] truncate">
                      Total ({resumoReservas.length})
                    </td>
                    <td className="py-2.5 px-1.5 text-center font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">{analytics.totalAdultos}</td>
                    <td className="py-2.5 px-1.5 text-center font-extrabold text-amber-900 text-[11px] whitespace-nowrap">{analytics.totalCriancas}</td>
                    <td className="py-2.5 px-1.5 text-center text-[#717971] font-semibold">-</td>
                    <td className="py-2.5 px-1.5 text-center text-[#717971] font-semibold">-</td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-[#053d1e] bg-[#e6f4ea]/30 text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalHospedagem)}
                    </td>
                    <td className="py-2.5 px-1.5 text-center text-[#717971] font-semibold">-</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalSinalReserva)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalVendasBar)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalVendasLoja)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#191c1d] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalSaldoReserva)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.receitaTotalRealizada)}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-extrabold text-[11px] whitespace-nowrap ${analytics.totalSaldosPendentes > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}`}>
                      {formatarMoeda(analytics.totalSaldosPendentes)}
                    </td>
                    <td colSpan={7} className="py-2.5 px-2 text-center text-[#717971] font-semibold">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Demonstrativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#e6f4ea] border border-[#b8f0c2] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#053d1e]" />
            <h4 className="font-['Manrope'] text-sm font-bold text-[#053d1e]">Composição da Receita Total</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#414941]">1. Valor de Reserva (Sinal Inicial):</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalSinalReserva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#414941]">2. Valor Pago no Check-out (Saldo + Extras):</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalSaldoReserva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#414941]">3. Vendas Consumidas na Lojinha:</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalVendasLoja)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#414941]">4. Vendas Consumidas no Bar:</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalVendasBar)}</span>
            </div>
            <div className="border-t border-[#b8f0c2] pt-2 mt-2 flex justify-between">
              <span className="font-bold text-[#053d1e]">RECEITA REALIZADA EM CAIXA:</span>
              <span className="font-extrabold text-lg text-[#053d1e]">{formatarMoeda(analytics.receitaTotalRealizada)}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#fff8e1] border border-[#ffe088] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#b58900]" />
            <h4 className="font-['Manrope'] text-sm font-bold text-[#b58900]">Controle de Pendências</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#414941]">Saldos em Aberto (A Receber):</span>
              <span className="font-bold text-[#ba1a1a]">{formatarMoeda(analytics.totalSaldosPendentes)}</span>
            </div>
            <div className="border-t border-[#ffe088] pt-2 mt-2">
              <p className="text-[#717971]">
                <strong>Nota:</strong> Reservas com saldo em aberto representam estadias em andamento ou acertos parciais pendentes de quitação final.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
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