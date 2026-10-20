import {
  ArrowUpRight,
  Download,
  TrendingUp,
  AlertCircle,
  Calendar,
  LoaderCircle,
  RefreshCw,
  Users,
  Search
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Pagamento, Reserva, ConsumoExtra } from '../tipos';
import * as XLSX from 'xlsx-js-style';

export const PaginaFinanceiro: React.FC = () => {
  const { reservas, consumosExtras, pagamentos, quartos, usuarioAtual, recarregarDados } = useHotel();
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

      // Pagamentos desta reserva
      const pagamentosDaReserva = pagamentosDoPeriodo.filter(
        (p) => String(p.reservaid) === String(reserva.reservaid)
      );

      const pagamentosSinal = pagamentosDaReserva.filter(
        (p) => p.tipolancamento === 'SINAL_RESERVA' || !p.tipolancamento
      );
      const somaPagosSinal = pagamentosSinal.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const valorReservaPago = somaPagosSinal > 0 ? somaPagosSinal : Number(reserva.valorpago || 0);

      const pagamentosCheckout = pagamentosDaReserva.filter(
        (p) => p.tipolancamento === 'SALDO_RESERVA' || p.tipolancamento === 'CONSUMO_EXTRA'
      );
      const valorCheckoutPago = pagamentosCheckout.reduce((acc, p) => acc + Number(p.valor || 0), 0);

      const totalHospedagem = Number(reserva.valortotal || 0);

      // FÓRMULA CORRIGIDA: Check-out + Bar + Loja + Reserva (Sinal)
      const totalGeralCalculado = valorCheckoutPago + valorBar + valorLojinha + valorReservaPago;

      const saldoPendente = Number(
        reserva.saldo !== undefined && reserva.saldo !== null
          ? reserva.saldo
          : Math.max(0, totalHospedagem - valorReservaPago)
      );

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
        produtosLojinha: produtosLojinhaConcat,
        valorLojinha: valorLojinha,
        produtosBar: produtosBarConcat,
        valorBar: valorBar,
        valorCheckout: valorCheckoutPago,
        total: totalGeralCalculado,
        saldoPendente: saldoPendente,
        totalHospedes: totalHospedesReserva,
        status: status,
        observacoes: reserva.observacoes || '',
        observacoes_checkout: reserva.observacoes_checkout || '',
      };
    }).sort((a, b) => String(a.quarto || '').localeCompare(String(b.quarto || ''), undefined, { numeric: true, sensitivity: 'base' }));
  }, [reservasDoPeriodo, consumosDessasReservas, pagamentosDoPeriodo, quartos]);

  // 4. CÁLCULOS GERAIS
  const analytics = useMemo(() => {
    const totalVendasLoja = resumoReservas.reduce((acc, r) => acc + Number(r.valorLojinha || 0), 0);
    const totalVendasBar = resumoReservas.reduce((acc, r) => acc + Number(r.valorBar || 0), 0);
    const totalSinalReserva = resumoReservas.reduce((acc, r) => acc + Number(r.valorReserva || 0), 0);
    const totalSaldoReserva = resumoReservas.reduce((acc, r) => acc + Number(r.valorCheckout || 0), 0);
    const totalHospedagem = resumoReservas.reduce((acc, r) => acc + Number(r.totalHospedagem || 0), 0);
    const totalHospedes = resumoReservas.reduce((acc, r) => acc + Number(r.totalHospedes || 0), 0);
    const totalAdultos = resumoReservas.reduce((acc, r) => acc + Number(r.adultos || 0), 0);
    const totalCriancas = resumoReservas.reduce((acc, r) => acc + Number(r.criancas || 0), 0);

    // FÓRMULA FINAL: Check-out + Bar + Loja + Reserva (Sinal)
    const totalGeralFinal = totalSaldoReserva + totalVendasBar + totalVendasLoja + totalSinalReserva;

    const totalSaldosPendentes = resumoReservas.reduce((acc, r) => acc + Number(r.saldoPendente || 0), 0);

    return {
      totalGeralFinal,
      totalSinalReserva,
      totalSaldoReserva,
      totalHospedagem,
      totalVendasLoja,
      totalVendasBar,
      totalSaldosPendentes,
      totalHospedes,
      totalAdultos,
      totalCriancas,
    };
  }, [resumoReservas]);

  // 5. EXPORTAÇÃO EXCEL (100% ORIGINAL - COM NOME DO USUÁRIO LOGADO)
  const exportarParaExcel = () => {
    if (resumoReservas.length === 0) {
      alert('Não há dados para exportar. Aplique um filtro primeiro.');
      return;
    }

    const nomeAutorComentario = (usuarioAtual as any)?.nomecompleto || (usuarioAtual as any)?.nome || 'Sistema';

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    const titulo = 'HOTEL FAZENDA ANEW - GESTÃO DE HOSPEDAGEM E CONSUMO';
    const periodo = `Período: ${formatarData(dataInicioFiltro || '')} a ${formatarData(dataFimFiltro || '')}`;

    const colunas = [
      'Nº Quarto',                     // A (0)
      'Nome do Hóspede',               // B (1)
      'Adultos',                       // C (2)
      'Crianças pag. 06 á 11',         // D (3)
      'Data Entrada',                  // E (4)
      'Data Saída',                    // F (5)
      'Valor da Hospedagem',           // G (6)
      'Data Reserva',                  // H (7)
      'Valor Reserva (R$)',            // I (8)
      'Produtos (Loja)',               // J (9)
      'Valor Loja (R$)',               // K (10)
      'Produtos (Bar)',                // L (11)
      'Valor Bar (R$)',                // M (12)
      'Valor Check-out (R$)',          // N (13)
      'Total Geral (R$)'               // O (14)
    ];

    wsData.push([titulo]);
    wsData.push([periodo]);
    wsData.push(colunas);

    // Linhas de dados (iniciam na linha 4 do Excel -> índice r = 3)
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
        r.produtosLojinha || '',
        Number(r.valorLojinha || 0),
        r.produtosBar || '',
        Number(r.valorBar || 0),
        Number(r.valorCheckout || 0),
        Number(r.total || 0)
      ]);
    });

    // Linha de Totais (placeholder)
    wsData.push([
      'Total Geral', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const totalRowIndex = wsData.length - 1; // 0-based
    const totalRowExcel = totalRowIndex + 1; // 1-based (Excel)
    const firstDataRow = 4;                 // Linha 4
    const lastDataRow = totalRowIndex;      // Última linha com hóspede

    // 1. FÓRMULA EM CADA LINHA NA COLUNA "TOTAL GERAL (R$)" (COLUNA O)
    resumoReservas.forEach((r, idx) => {
      const rowExcel = firstDataRow + idx;
      const cellRef = XLSX.utils.encode_cell({ r: 3 + idx, c: 14 });
      ws[cellRef] = {
        t: 'n',
        f: `N${rowExcel}+M${rowExcel}+K${rowExcel}+I${rowExcel}`,
        v: Number(r.total || 0)
      };
    });

    // 2. FÓRMULAS DE SOMA AUTOMÁTICA NAS COLUNAS DE TOTAIS (LINHA FINAL)
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 2 })] = { t: 'n', f: `SUM(C${firstDataRow}:C${lastDataRow})`, v: analytics.totalAdultos };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 3 })] = { t: 'n', f: `SUM(D${firstDataRow}:D${lastDataRow})`, v: analytics.totalCriancas };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 6 })] = { t: 'n', f: `SUM(G${firstDataRow}:G${lastDataRow})`, v: analytics.totalHospedagem };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 8 })] = { t: 'n', f: `SUM(I${firstDataRow}:I${lastDataRow})`, v: analytics.totalSinalReserva };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 10 })] = { t: 'n', f: `SUM(K${firstDataRow}:K${lastDataRow})`, v: analytics.totalVendasLoja };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 12 })] = { t: 'n', f: `SUM(M${firstDataRow}:M${lastDataRow})`, v: analytics.totalVendasBar };
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 13 })] = { t: 'n', f: `SUM(N${firstDataRow}:N${lastDataRow})`, v: analytics.totalSaldoReserva };

    // Total Geral final = Total Check-out + Total Bar + Total Loja + Total Reserva
    ws[XLSX.utils.encode_cell({ r: totalRowIndex, c: 14 })] = {
      t: 'n',
      f: `N${totalRowExcel}+M${totalRowExcel}+K${totalRowExcel}+I${totalRowExcel}`,
      v: analytics.totalGeralFinal
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

    const colunasMoeda = new Set([6, 8, 10, 12, 13, 14]);
    const colunasCentro = new Set([0, 2, 3, 4, 5, 7]);

    // Formatação de Linhas e Comentários Ocultos
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

      // Comentário da Reserva com o Usuário Logado
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

      // Comentário do Check-out com o Usuário Logado
      if (r.observacoes_checkout) {
        const refCheckout = XLSX.utils.encode_cell({ r: rowIdx, c: 13 });
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
        else if (c === 9) val = String(r.produtosLojinha || '');
        else if (c === 10) val = `R$ ${Number(r.valorLojinha || 0).toFixed(2)}`;
        else if (c === 11) val = String(r.produtosBar || '');
        else if (c === 12) val = `R$ ${Number(r.valorBar || 0).toFixed(2)}`;
        else if (c === 13) val = `R$ ${Number(r.valorCheckout || 0).toFixed(2)}`;
        else if (c === 14) val = `R$ ${Number(r.total || 0).toFixed(2)}`;
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });

    ws['!rows'] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 28 }];
    ws['!freeze'] = { xSplit: 0, ySplit: 3 };

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Financeiro');
    const formatarDataNomeArquivo = (dataIso: string) => {
      if (!dataIso) return '';
      const [ano, mes, dia] = dataIso.split('-');
      return `${dia}_${mes}_${ano}`;
    };

    const dInicio = formatarDataNomeArquivo(dataInicioFiltro);
    const dFim = formatarDataNomeArquivo(dataFimFiltro);

    const nomeArquivo = dInicio && dFim  
      ? `Relatorio_Financeiro_${dInicio}_a_${dFim}.xlsx` 
      : `Relatorio_Financeiro_Geral.xlsx`;
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
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Título inline com ícone */}
          <div className="flex items-center gap-2 text-xs font-bold text-[#053d1e] whitespace-nowrap">
            <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-[#053d1e]" /> Período Vigente:
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-bold text-[#717971] uppercase">De</span>
            <input
              type="date"
              value={dataInicioInput}
              onChange={(e) => setDataInicioInput(e.target.value)}
              className="text-xs font-bold text-[#053d1e] bg-transparent focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-[#717971] uppercase ml-1">Até</span>
            <input
              type="date"
              value={dataFimInput}
              onChange={(e) => setDataFimInput(e.target.value)}
              className="text-xs font-bold text-[#053d1e] bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Botões Pesquisar e Limpar agrupados */}
          <div className="flex items-center gap-2">
            <button
              onClick={aplicarFiltroData}
              disabled={!dataInicioInput || !dataFimInput || carregando}
              className="px-4 py-2 bg-[#053d1e] text-white rounded-xl text-xs font-bold hover:bg-[#043017] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              {carregando ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Pesquisar</span>
            </button>

            <button
              onClick={limparFiltroData}
              disabled={carregando}              
              className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Mensagem de Período Filtrado */}
        {usarFiltroData && dataInicioFiltro && dataFimFiltro && (
          <div className="px-3.5 py-2 bg-[#e6f4ea] border border-[#b8f0c2] rounded-xl text-xs text-[#053d1e] flex items-center gap-2 animate-in fade-in">
            <Calendar className="w-4 h-4 text-[#053d1e] shrink-0" />
            <span>
              Período filtrado: <strong>{formatarData(dataInicioFiltro)}</strong> até <strong>{formatarData(dataFimFiltro)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
        {/* 1. Total Geral */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-[#717971] uppercase tracking-wider truncate">Total Geral Final</p>
          <div className="my-1.5">
            <h3 
              title={formatarMoeda(analytics.totalGeralFinal)}
              className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-[#053d1e] tracking-tight tabular-nums truncate"
            >
              {formatarMoeda(analytics.totalGeralFinal)}
            </h3>
          </div>
          <p className="text-[10px] text-[#137333] font-semibold flex items-center gap-1 truncate">
            <ArrowUpRight className="w-3 h-3 shrink-0" /> Total Faturado
          </p>
        </div>

        {/* 2. Sinal de Reserva */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-[#717971] uppercase tracking-wider truncate">Sinal de Reserva</p>
          <div className="my-1.5">
            <h3 
              title={formatarMoeda(analytics.totalSinalReserva)}
              className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-[#053d1e] tracking-tight tabular-nums truncate"
            >
              {formatarMoeda(analytics.totalSinalReserva)}
            </h3>
          </div>
          <p className="text-[10px] text-[#717971] font-semibold truncate">
            Adiantamentos
          </p>
        </div>

        {/* 3. Check-out */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-[#717971] uppercase tracking-wider truncate">Pago Check-out</p>
          <div className="my-1.5">
            <h3 
              title={formatarMoeda(analytics.totalSaldoReserva)}
              className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-[#191c1d] tracking-tight tabular-nums truncate"
            >
              {formatarMoeda(analytics.totalSaldoReserva)}
            </h3>
          </div>
          <p className="text-[10px] text-[#717971] font-semibold truncate">
            Acerto na Saída
          </p>
        </div>

        {/* 4. Consumo Lojinha */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-[#717971] uppercase tracking-wider truncate">Consumos Lojinha</p>
          <div className="my-1.5">
            <h3 
              title={formatarMoeda(analytics.totalVendasLoja)}
              className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-[#191c1d] tracking-tight tabular-nums truncate"
            >
              {formatarMoeda(analytics.totalVendasLoja)}
            </h3>
          </div>
          <p className="text-[10px] text-[#717971] font-semibold truncate">
            Produtos extras
          </p>
        </div>

        {/* 5. Consumo Bar */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-bold text-[#717971] uppercase tracking-wider truncate">Consumos Bar</p>
          <div className="my-1.5">
            <h3 
              title={formatarMoeda(analytics.totalVendasBar)}
              className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-[#191c1d] tracking-tight tabular-nums truncate"
            >
              {formatarMoeda(analytics.totalVendasBar)}
            </h3>
          </div>
          <p className="text-[10px] text-[#717971] font-semibold truncate">
            Bebidas e porções
          </p>
        </div>

        {/* 6. Sal. Pendente */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
          <p className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider truncate">Sal. Pendente</p>
          <div className="my-1.5">
            <h3 
              title={formatarMoeda(analytics.totalSaldosPendentes)}
              className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-amber-700 tracking-tight tabular-nums truncate"
            >
              {formatarMoeda(analytics.totalSaldosPendentes)}
            </h3>
          </div>
          <p className="text-[10px] text-amber-800 font-semibold truncate">
            A Receber
          </p>
        </div>

        {/* 7. Total Hóspedes */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-[#717971] uppercase tracking-wider truncate">Total Hóspedes</p>
          <div className="my-1.5">
            <h3 className="font-['Manrope'] text-lg sm:text-xl font-extrabold text-[#053d1e] tracking-tight tabular-nums truncate">
              {analytics.totalHospedes}
            </h3>
          </div>
          <p className="text-[10px] text-[#717971] font-semibold flex items-center gap-1 truncate">
            <Users className="w-3 h-3 text-[#053d1e] shrink-0" /> {analytics.totalAdultos} Ad. / {analytics.totalCriancas} Cr.
          </p>
        </div>
      </div>

      {/* Grid View: Tabela Operacional */}
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
          <div className="w-full overflow-x-auto rounded-xl border border-[#e1e3e4] shadow-2xs">
            <table className="w-full min-w-[1380px] text-left text-[11px] leading-tight">
              <thead className="bg-[#3D7241] border-b border-[#2E5D31] text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-2 text-center whitespace-nowrap w-16">QUARTO</th>
                  <th className="py-2.5 px-2 text-left whitespace-nowrap min-w-[180px]">HÓSPEDE</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-12">AD.</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-14">CRI.</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-20">ENTRADA</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-20">SAÍDA</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[100px]">TOTAL HOSP.</th>
                  <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-20">DATA RES.</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[95px]">VLR. RES.</th>
                  <th className="py-2.5 px-2 text-left whitespace-nowrap min-w-[130px]">PROD. LOJA</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[80px]">VLR. LOJ.</th>
                  <th className="py-2.5 px-2 text-left whitespace-nowrap min-w-[130px]">PROD. BAR</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[80px]">VLR. BAR</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[100px]">VLR. CHECKOUT</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[100px] bg-[#2E5D31]/30">SAL. PEND.</th>
                  <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[100px]">TOTAL GERAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
                {resumoReservas.map((r, indice) => (
                  <tr key={indice} className="hover:bg-[#f8f9fa] transition-colors">
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
                          <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-0.5 w-[360px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-pre-wrap break-words text-left leading-relaxed cursor-default">
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
                    <td className="py-2 px-2 max-w-[160px] truncate text-slate-600" title={r.produtosLojinha}>{r.produtosLojinha || '-'}</td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">{formatarMoeda(r.valorLojinha)}</td>
                    <td className="py-2 px-2 max-w-[160px] truncate text-slate-600" title={r.produtosBar}>{r.produtosBar || '-'}</td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">{formatarMoeda(r.valorBar)}</td>
                    <td className="py-2 px-2 text-right font-medium text-[11px] whitespace-nowrap">
                      {r.observacoes_checkout ? (
                        <div className="relative group inline-flex items-center gap-1 justify-end cursor-help py-1">
                          <span className="underline decoration-dotted decoration-emerald-600 underline-offset-4">
                            {formatarMoeda(r.valorCheckout)}
                          </span>
                          <span className="text-[10px] text-emerald-600 select-none">💬</span>
                          <div className="hidden group-hover:block absolute z-50 right-0 top-full mt-0.5 w-[360px] p-3.5 bg-[#191c1d] text-white text-xs rounded-xl shadow-2xl border border-slate-700 whitespace-pre-wrap break-words text-left leading-relaxed cursor-default">
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
                    {/* Coluna Sal. Pend. (R$): Verde quando zero, Vermelho quando dívida */}
                    <td className={`py-2 px-2 text-right font-bold text-[11px] whitespace-nowrap ${
                      r.saldoPendente > 0 ? 'text-[#b91c1c]' : 'text-[#053d1e]'
                    }`}>
                      {formatarMoeda(r.saldoPendente)}
                    </td>
                    <td className="py-2 px-2 text-right font-extrabold text-[#053d1e] text-[11px] whitespace-nowrap">
                      {formatarMoeda(r.total)}
                    </td>
                  </tr>
                ))}
                {resumoReservas.length === 0 && (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-[#717971]">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm text-[#191c1d]">Nenhuma reserva encontrada</p>
                      <p className="text-xs mt-1">Nenhum registro para os critérios informados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {resumoReservas.length > 0 && (
                <tfoot className="bg-[#1E4620] text-white font-bold text-[11px]">
                  <tr>
                    <td className="py-2.5 px-2 text-center text-[#86efac] font-extrabold">-</td>
                    <td className="py-2.5 px-2 font-extrabold uppercase text-[#86efac] tracking-wider text-[11px] truncate">
                      TOTAL ({resumoReservas.length})
                    </td>
                    <td className="py-2.5 px-1.5 text-center text-[#86efac] font-extrabold text-[11px] whitespace-nowrap">{analytics.totalAdultos}</td>
                    <td className="py-2.5 px-1.5 text-center text-[#86efac] font-extrabold text-[11px] whitespace-nowrap">{analytics.totalCriancas}</td>
                    <td className="py-2.5 px-1.5 text-center text-slate-300 font-semibold">-</td>
                    <td className="py-2.5 px-1.5 text-center text-slate-300 font-semibold">-</td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-[#86efac] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalHospedagem)}
                    </td>
                    <td className="py-2.5 px-1.5 text-center text-slate-300 font-semibold">-</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#86efac] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalSinalReserva)}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 font-semibold text-center">-</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#86efac] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalVendasLoja)}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 font-semibold text-center">-</td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#86efac] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalVendasBar)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#86efac] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalSaldoReserva)}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-extrabold text-[11px] whitespace-nowrap ${
                      analytics.totalSaldosPendentes > 0 ? 'text-[#fca5a5]' : 'text-[#86efac]'
                    }`}>
                      {formatarMoeda(analytics.totalSaldosPendentes)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-[#86efac] text-[11px] whitespace-nowrap">
                      {formatarMoeda(analytics.totalGeralFinal)}
                    </td>
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
              <span className="font-bold text-[#053d1e]">TOTAL GERAL FINAL (FATURADO):</span>
              <span className="font-extrabold text-lg text-[#053d1e]">{formatarMoeda(analytics.totalGeralFinal)}</span>
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
                <strong>Nota:</strong> Reservas com saldo em aberto representam estadias em andamento ou acertos parciais pendentes de quitação final no check-out.
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