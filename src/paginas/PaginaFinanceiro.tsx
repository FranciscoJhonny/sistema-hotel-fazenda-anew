import {
  ArrowUpRight,
  Download,
  QrCode,
  CreditCard,
  Banknote,
  Receipt,
  TrendingUp,
  AlertCircle,
  Calendar
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Pagamento, Reserva, ConsumoExtra, Venda } from '../tipos';

export const PaginaFinanceiro: React.FC = () => {
  const { reservas, vendas, consumosExtras, pagamentos } = useHotel();
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  
  // NOVOS ESTADOS PARA FILTRO DE DATA PERSONALIZADO
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [usarFiltroData, setUsarFiltroData] = useState<boolean>(false);

  const reservasConcluidas = useMemo(() => {
    return (reservas || []).filter((r: Reserva) => r.statusreserva === 'CONCLUIDA');
  }, [reservas]);

  // Função para verificar se data está no período
  const filtrarPorPeriodo = (data: string) => {
    if (!data) return false;
    const dataLancamento = new Date(data);
    
    // Se estiver usando filtro personalizado de data
    if (usarFiltroData) {
      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio + 'T00:00:00');
        const fim = new Date(dataFim + 'T23:59:59');
        return dataLancamento >= inicio && dataLancamento <= fim;
      }
      return false;
    }
    
    // Filtros rápidos
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((hoje.getTime() - dataLancamento.getTime()) / (1000 * 60 * 60 * 24));

    switch (filtroTipo) {
      case 'HOJE':
        return dataLancamento.toDateString() === hoje.toDateString();
      case 'SEMANA':
        return diffDias <= 7;
      case 'MES':
        return dataLancamento.getMonth() === hoje.getMonth() && 
               dataLancamento.getFullYear() === hoje.getFullYear();
      case 'TODOS':
      default:
        return true;
    }
  };

  const analytics = useMemo(() => {
    const pagamentosDoPeriodo = (pagamentos || []).filter((p: Pagamento) => {
      if (p.status !== 'CONFIRMADO' && p.status !== 'PAGO') return false;
      
      const reserva = reservasConcluidas.find((r: Reserva) => 
        String(r.reservaid) === String(p.reservaid)
      );
      
      if (!reserva) return false;
      
      return filtrarPorPeriodo(p.datapagamento);
    });

    const totalDiarias = pagamentosDoPeriodo
      .filter((p: Pagamento) => 
        p.tipolancamento === 'SINAL_RESERVA' || 
        p.tipolancamento === 'SALDO_DIARIAS' || 
        p.tipolancamento === 'FECHAMENTO_GERAL'
      )
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalConsumosFrigobar = pagamentosDoPeriodo
      .filter((p: Pagamento) => {
        if (p.tipolancamento !== 'CONSUMO_EXTRA') return false;
        
        const consumo = (consumosExtras || []).find((c: ConsumoExtra) => 
          String(c.reservaid) === String(p.reservaid) &&
          Math.abs(Number(c.valortotal || 0) - Number(p.valor || 0)) < 0.01
        );
        
        return consumo && (
          consumo.categoria?.toUpperCase() === 'FRIGOBAR' || 
          consumo.categoria?.toUpperCase() === 'SERVICOS'
        );
      })
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalVendasLojinhaConsumos = pagamentosDoPeriodo
      .filter((p: Pagamento) => {
        if (p.tipolancamento !== 'CONSUMO_EXTRA') return false;
        
        const consumo = (consumosExtras || []).find((c: ConsumoExtra) => 
          String(c.reservaid) === String(p.reservaid) &&
          Math.abs(Number(c.valortotal || 0) - Number(p.valor || 0)) < 0.01
        );
        
        return consumo && consumo.categoria?.toUpperCase() === 'LOJINHA';
      })
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalVendasLojaVendas = (vendas || [])
      .filter((v: Venda) => filtrarPorPeriodo(v.datahora))
      .reduce((acc: number, v: Venda) => acc + Number(v.valortotal || 0), 0) || 0;

    const totalVendasLoja = totalVendasLojinhaConsumos + totalVendasLojaVendas;

    const totalPix = pagamentosDoPeriodo
      .filter((p: Pagamento) => p.formapagamento === 'PIX')
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalCartaoCredito = pagamentosDoPeriodo
      .filter((p: Pagamento) => p.formapagamento === 'CARTAO_CREDITO')
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalCartaoDebito = pagamentosDoPeriodo
      .filter((p: Pagamento) => p.formapagamento === 'CARTAO_DEBITO')
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalDinheiro = pagamentosDoPeriodo
      .filter((p: Pagamento) => p.formapagamento === 'DINHEIRO')
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalTransferencia = pagamentosDoPeriodo
      .filter((p: Pagamento) => p.formapagamento === 'TRANSFERENCIA')
      .reduce((acc: number, p: Pagamento) => acc + Number(p.valor || 0), 0);

    const totalSaldosPendentes = reservasConcluidas
      .filter((r: Reserva) => r.saldo > 0)
      .reduce((acc: number, r: Reserva) => acc + Number(r.saldo || 0), 0);

    const totalConsumosNaoPagos = (consumosExtras || [])
      .filter((c: ConsumoExtra) => {
        if (!c.ativo) return false;
        if (c.categoria?.toUpperCase() === 'LOJINHA') return false;
        
        const reserva = reservasConcluidas.find((r: Reserva) => 
          String(r.reservaid) === String(c.reservaid)
        );
        
        if (!reserva) return false;
        
        const pagamentoConsumo = (pagamentos || []).find((p: Pagamento) =>
          String(p.reservaid) === String(c.reservaid) &&
          p.tipolancamento === 'CONSUMO_EXTRA' &&
          (p.status === 'CONFIRMADO' || p.status === 'PAGO') &&
          Math.abs(Number(p.valor || 0) - Number(c.valortotal || 0)) < 0.01
        );
        
        const pagamentoGeral = (pagamentos || []).find((p: Pagamento) =>
          String(p.reservaid) === String(c.reservaid) &&
          p.tipolancamento === 'FECHAMENTO_GERAL' &&
          (p.status === 'CONFIRMADO' || p.status === 'PAGO')
        );
        
        if (pagamentoConsumo || pagamentoGeral) return false;
        
        return true;
      })
      .reduce((acc: number, c: ConsumoExtra) => acc + Number(c.valortotal || 0), 0);

    const receitaTotalRealizada = totalDiarias + totalConsumosFrigobar + totalVendasLojinhaConsumos;

    return {
      totalDiarias, 
      totalConsumos: totalConsumosFrigobar,
      totalPix, 
      totalCartaoCredito, 
      totalCartaoDebito,
      totalDinheiro, 
      totalTransferencia, 
      totalSaldosPendentes, 
      totalConsumosNaoPagos,
      receitaTotalRealizada, 
      totalVendasLoja,
      totalPagamentos: pagamentosDoPeriodo.length
    };
  }, [pagamentos, reservasConcluidas, consumosExtras, vendas, filtroTipo, dataInicio, dataFim, usarFiltroData]);

  const extratoLancamentos = useMemo(() => {
    const lancamentos: Array<{
      tipo: 'PAGAMENTO' | 'CONSUMO';
      codigo: string;
      descricao: string;
      hospede: string;
      formaPagamento: string;
      valor: number;
      data: string;
      status: string;
      tipolancamento?: string;
    }> = [];

    if (pagamentos) {
      (pagamentos as Pagamento[]).forEach((pagamento: Pagamento) => {
        const reserva = reservasConcluidas.find((r: Reserva) => 
          String(r.reservaid) === String(pagamento.reservaid)
        );
        
        if (!reserva || !filtrarPorPeriodo(pagamento.datapagamento)) return;
        
        lancamentos.push({
          tipo: 'PAGAMENTO',
          codigo: reserva.codigo || `PAG-${pagamento.pagamentoid}`,
          descricao: (() => {
            if (pagamento.tipolancamento === 'SINAL_RESERVA') return 'Sinal de Reserva';
            if (pagamento.tipolancamento === 'SALDO_DIARIAS') return 'Saldo de Diárias';
            if (pagamento.tipolancamento === 'CONSUMO_EXTRA') {
              const consumo = (consumosExtras || []).find((c: ConsumoExtra) => 
                String(c.reservaid) === String(pagamento.reservaid) &&
                Math.abs(Number(c.valortotal || 0) - Number(pagamento.valor || 0)) < 0.01
              );
              
              if (consumo?.categoria?.toUpperCase() === 'LOJINHA') {
                return 'Venda Lojinha';
              }
              return 'Consumo Extra (Frigobar/Lojinha)';
            }
            if (pagamento.tipolancamento === 'FECHAMENTO_GERAL') return 'Check-out (Pagamento Total)';
            return 'Pagamento';
          })(),
          hospede: reserva.hospedenome || 'N/A',
          formaPagamento: pagamento.formapagamento,
          valor: Number(pagamento.valor || 0),
          data: pagamento.datapagamento,
          status: pagamento.status,
          tipolancamento: pagamento.tipolancamento
        });
      });
    }

    if (consumosExtras) {
      (consumosExtras as ConsumoExtra[]).forEach((consumo: ConsumoExtra) => {
        const reserva = reservasConcluidas.find((r: Reserva) => 
          String(r.reservaid) === String(consumo.reservaid)
        );
        
        if (!reserva) return;
        
        if (consumo.categoria?.toUpperCase() === 'LOJINHA') return;
        
        let statusConsumo = 'PENDENTE';
        const pagamentoConsumo = (pagamentos || []).find((p: Pagamento) =>
          String(p.reservaid) === String(consumo.reservaid) &&
          p.tipolancamento === 'CONSUMO_EXTRA' && (p.status === 'CONFIRMADO' || p.status === 'PAGO')
        );
        const pagamentoGeral = (pagamentos || []).find((p: Pagamento) =>
          String(p.reservaid) === String(consumo.reservaid) &&
          p.tipolancamento === 'FECHAMENTO_GERAL' && (p.status === 'CONFIRMADO' || p.status === 'PAGO')
        );
        if (pagamentoConsumo || pagamentoGeral) statusConsumo = 'PAGO';
        
        lancamentos.push({
          tipo: 'CONSUMO',
          codigo: `CONS-${consumo.consumoid}`,
          descricao: `${consumo.quantidade}x ${consumo.descricao || consumo.categoria}`,
          hospede: reserva.hospedenome || 'N/A',
          formaPagamento: statusConsumo,
          valor: Number(consumo.valortotal || 0),
          data: consumo.dataconsumo,
          status: statusConsumo,
          tipolancamento: 'CONSUMO_EXTRA'
        });
      });
    }

    return lancamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [pagamentos, consumosExtras, reservasConcluidas, filtroTipo, dataInicio, dataFim, usarFiltroData]);

  const getIconeFormaPagamento = (forma: string) => {
    switch (forma) {
      case 'PIX': return <QrCode className="w-4 h-4 text-[#053d1e]" />;
      case 'CARTAO_CREDITO': return <CreditCard className="w-4 h-4 text-[#1d5fa8]" />;
      case 'CARTAO_DEBITO': return <CreditCard className="w-4 h-4 text-[#137333]" />;
      case 'DINHEIRO': return <Banknote className="w-4 h-4 text-[#ba1a1a]" />;
      default: return <Receipt className="w-4 h-4 text-[#717971]" />;
    }
  };

  const getCorStatus = (status: string) => {
    if (status === 'CONFIRMADO' || status === 'PAGO') return 'bg-[#e6f4ea] text-[#137333]';
    if (status === 'PENDENTE') return 'bg-[#fff8e1] text-[#b58900]';
    if (status === 'CANCELADO') return 'bg-[#ffdad6] text-[#93000a]';
    return 'bg-[#f3f4f5] text-[#414941]';
  };

  const limparFiltroData = () => {
    setDataInicio('');
    setDataFim('');
    setUsarFiltroData(false);
  };

  const aplicarFiltroData = () => {
    if (dataInicio && dataFim) {
      setUsarFiltroData(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">Controle Financeiro & Fluxo de Caixa</h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">Hotel Fazenda Anew</span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Faturamento de reservas CONCLUÍDAS no período selecionado.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /><span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* FILTRO DE DATA PERSONALIZADO */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#414941] mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
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
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={aplicarFiltroData}
              disabled={!dataInicio || !dataFim}
              className="px-4 py-2 text-xs font-semibold bg-[#053d1e] text-white rounded-xl hover:bg-[#0a4f2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Filtrar
            </button>
            <button
              onClick={limparFiltroData}
              className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#414941] rounded-xl transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
        
        {usarFiltroData && dataInicio && dataFim && (
          <div className="mt-3 px-3 py-2 bg-[#e6f4ea] border border-[#b8f0c2] rounded-lg text-xs text-[#053d1e] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Período: <strong>{formatarData(dataInicio)}</strong> até <strong>{formatarData(dataFim)}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Receita Total Realizada</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {formatarMoeda(analytics.receitaTotalRealizada)}
          </h3>
          <p className="text-[11px] text-[#137333] font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Diárias + Consumos
          </p>
          <div className="mt-2 pt-2 border-t border-[#e1e3e4] text-[10px] text-[#717971]">
            <div>Diárias: {formatarMoeda(analytics.totalDiarias)}</div>
            <div>Consumos: {formatarMoeda(analytics.totalConsumos)}</div>
          </div>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Saldos Pendentes (Concluídas)</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#ba1a1a] mt-1">
            {formatarMoeda(analytics.totalSaldosPendentes)}
          </h3>
          <p className="text-[11px] text-[#717971] mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Reservas concluídas com saldo
          </p>
          <div className="mt-2 pt-2 border-t border-[#e1e3e4] text-[10px] text-[#717971]">
            <div>Consumos não pagos: {formatarMoeda(analytics.totalConsumosNaoPagos)}</div>
          </div>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Recebido via PIX</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(analytics.totalPix)}
          </h3>
          <p className="text-[11px] text-[#717971] mt-1 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-[#053d1e]" /> Compensação instantânea
          </p>
          <div className="mt-2 pt-2 border-t border-[#e1e3e4] text-[10px] text-[#717971]">
            <div>{analytics.totalPagamentos} transações</div>
          </div>
        </div>
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">Vendas da Loja</p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(analytics.totalVendasLoja)}
          </h3>
          <p className="text-[11px] text-[#717971] mt-1">Doces, Mel, Ovos e Lembranças</p>
        </div>
      </div>

      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs">
        <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] mb-4">Resumo por Forma de Pagamento</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-3 rounded-xl bg-[#e6f4ea] border border-[#b8f0c2]">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="w-4 h-4 text-[#053d1e]" />
              <span className="text-xs font-semibold text-[#053d1e]">PIX</span>
            </div>
            <p className="text-lg font-bold text-[#053d1e]">{formatarMoeda(analytics.totalPix)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#e3f2fd] border border-[#90caf9]">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-[#1d5fa8]" />
              <span className="text-xs font-semibold text-[#1d5fa8]">Cartão Crédito</span>
            </div>
            <p className="text-lg font-bold text-[#1d5fa8]">{formatarMoeda(analytics.totalCartaoCredito)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#e8f5e9] border border-[#a5d6a7]">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-[#137333]" />
              <span className="text-xs font-semibold text-[#137333]">Cartão Débito</span>
            </div>
            <p className="text-lg font-bold text-[#137333]">{formatarMoeda(analytics.totalCartaoDebito)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#ffebee] border border-[#ef9a9a]">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-[#ba1a1a]" />
              <span className="text-xs font-semibold text-[#ba1a1a]">Dinheiro</span>
            </div>
            <p className="text-lg font-bold text-[#ba1a1a]">{formatarMoeda(analytics.totalDinheiro)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#f3f4f5] border border-[#c1c9bf]">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-[#414941]" />
              <span className="text-xs font-semibold text-[#414941]">Transferência</span>
            </div>
            <p className="text-lg font-bold text-[#414941]">{formatarMoeda(analytics.totalTransferencia)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#c1c9bf] flex items-center justify-between">
          <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">Extrato de Lançamentos (Reservas Concluídas)</h3>
          <div className="flex gap-2">
            <select 
              value={filtroTipo} 
              onChange={(e) => {
                setFiltroTipo(e.target.value);
                setUsarFiltroData(false);
              }}
              disabled={usarFiltroData}
              className="px-3 py-1.5 text-xs font-semibold border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e] disabled:opacity-50"
            >
              <option value="TODOS">Todos os Lançamentos</option>
              <option value="PAGAMENTO">Apenas Pagamentos</option>
              <option value="CONSUMO">Apenas Consumos</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#c1c9bf] text-[#414941] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Hóspede</th>
                <th className="py-3 px-4">Forma Pagamento</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
              {extratoLancamentos
                .filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo)
                .slice(0, 50)
                .map((lancamento, indice) => (
                <tr key={`${lancamento.tipo}-${indice}`} className="hover:bg-[#f8f9fa]">
                  <td className="py-3 px-4 font-bold text-[#053d1e]">{lancamento.codigo}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{lancamento.descricao}</span>
                      <span className="text-[10px] text-[#717971]">
                        {lancamento.tipo === 'PAGAMENTO' ? (
                          lancamento.tipolancamento === 'SINAL_RESERVA' ? 'Sinal' : 
                          lancamento.tipolancamento === 'SALDO_DIARIAS' ? 'Saldo Diárias' :
                          lancamento.tipolancamento === 'CONSUMO_EXTRA' ? 'Consumo Extra' : 'Geral'
                        ) : 'Consumo Extra'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{lancamento.hospede}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {getIconeFormaPagamento(lancamento.formaPagamento)}
                      <span className="font-medium">
                        {lancamento.formaPagamento === 'CARTAO_CREDITO' ? 'Crédito' :
                         lancamento.formaPagamento === 'CARTAO_DEBITO' ? 'Débito' :
                         lancamento.formaPagamento}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#717971]">{formatarData(lancamento.data)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${
                    lancamento.tipo === 'CONSUMO' && lancamento.status === 'PENDENTE' 
                      ? 'text-[#b58900]' 
                      : 'text-[#053d1e]'
                  }`}>
                    {formatarMoeda(lancamento.valor)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getCorStatus(lancamento.status)}`}>
                      {lancamento.status}
                    </span>
                  </td>
                </tr>
              ))}
              
              {extratoLancamentos.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#717971]">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum lançamento encontrado no período selecionado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#c1c9bf] bg-[#f8f9fa] text-xs text-[#717971]">
          Mostrando {extratoLancamentos.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).slice(0, 50).length} de {extratoLancamentos.filter(l => filtroTipo === 'TODOS' || l.tipo === filtroTipo).length} lançamentos
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#e6f4ea] border border-[#b8f0c2] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#053d1e]" />
            <h4 className="font-['Manrope'] text-sm font-bold text-[#053d1e]">Resumo do Período</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#414941]">Total em Diárias:</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalDiarias)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#414941]">Total em Consumos:</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalConsumos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#414941]">Vendas Loja:</span>
              <span className="font-bold text-[#053d1e]">{formatarMoeda(analytics.totalVendasLoja)}</span>
            </div>
            <div className="border-t border-[#b8f0c2] pt-2 mt-2 flex justify-between">
              <span className="font-bold text-[#053d1e]">Receita Total:</span>
              <span className="font-extrabold text-lg text-[#053d1e]">
                {formatarMoeda(analytics.receitaTotalRealizada + analytics.totalVendasLoja)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#fff8e1] border border-[#ffe088] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#b58900]" />
            <h4 className="font-['Manrope'] text-sm font-bold text-[#b58900]">Pendências e Atenção</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#414941]">Saldos Pendentes (Concluídas):</span>
              <span className="font-bold text-[#ba1a1a]">{formatarMoeda(analytics.totalSaldosPendentes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#414941]">Consumos não Pagos:</span>
              <span className="font-bold text-[#ba1a1a]">{formatarMoeda(analytics.totalConsumosNaoPagos)}</span>
            </div>
            <div className="border-t border-[#ffe088] pt-2 mt-2">
              <p className="text-[#717971]">
                <strong>Atenção:</strong> Verifique reservas concluídas com saldo pendente ou consumos extras não liquidados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};