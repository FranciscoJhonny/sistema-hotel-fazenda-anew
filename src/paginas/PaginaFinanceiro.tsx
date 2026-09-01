import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  QrCode,
  ArrowUpRight,
  Receipt,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarMoeda, formatarDataHora } from '../utilitarios/formatadores';

export const PaginaFinanceiro: React.FC = () => {
  const { reservas, vendas } = useHotel();

  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');

  // Cálculos financeiros
  const totalRecebidoReservas = reservas.reduce((acc, curr) => acc + curr.ValorPago, 0);
  const totalSaldosPendentes = reservas
    .filter((r) => r.Status !== 'CANCELADA' && r.Status !== 'FINALIZADA')
    .reduce((acc, curr) => acc + curr.Saldo, 0);

  const totalVendasLoja = vendas.reduce((acc, curr) => acc + curr.ValorTotal, 0);
  const receitaTotalBruta = totalRecebidoReservas + totalVendasLoja;

  // Divisão por método de pagamento
  const totalPix =
    reservas.filter((r) => r.FormaPagamento === 'PIX').reduce((acc, r) => acc + r.ValorPago, 0) +
    vendas.filter((v) => v.FormaPagamento === 'PIX').reduce((acc, v) => acc + v.ValorTotal, 0);

  const totalCartao =
    reservas
      .filter((r) => r.FormaPagamento === 'CARTAO_CREDITO' || r.FormaPagamento === 'CARTAO_DEBITO')
      .reduce((acc, r) => acc + r.ValorPago, 0) +
    vendas
      .filter((v) => v.FormaPagamento === 'CARTAO_CREDITO' || v.FormaPagamento === 'CARTAO_DEBITO')
      .reduce((acc, v) => acc + v.ValorTotal, 0);

  const totalDinheiro =
    reservas.filter((r) => r.FormaPagamento === 'DINHEIRO').reduce((acc, r) => acc + r.ValorPago, 0) +
    vendas.filter((v) => v.FormaPagamento === 'DINHEIRO').reduce((acc, v) => acc + v.ValorTotal, 0);

  return (
    <div className="space-y-6">
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
            Receitas de hospedagem nos 13 quartos (B1-B4, C2-C4, D1-D6), vendas da lojinha, Day Use e conciliação.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-xs font-semibold border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Receita Total Realizada
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {formatarMoeda(receitaTotalBruta)}
          </h3>
          <p className="text-[11px] text-[#137333] font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Diárias + Lojinha + Day Use
          </p>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Saldos a Receber no Balcão
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#ba1a1a] mt-1">
            {formatarMoeda(totalSaldosPendentes)}
          </h3>
          <p className="text-[11px] text-[#717971] mt-1">
            Previstos para liquidação no check-in/out
          </p>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Recebido via PIX
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(totalPix)}
          </h3>
          <p className="text-[11px] text-[#717971] mt-1 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-[#053d1e]" /> Compensação instantânea
          </p>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Vendas da Fazenda
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(totalVendasLoja)}
          </h3>
          <p className="text-[11px] text-[#717971] mt-1">
            Doces, Mel, Ovos e Lembranças
          </p>
        </div>
      </div>

      {/* Tabela de Lançamentos Recentes */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#c1c9bf] flex items-center justify-between">
          <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
            Extrato de Recebimentos Recentes
          </h3>
          <span className="text-xs text-[#717971]">
            Últimas transações de diárias e loja
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#c1c9bf] text-[#414941] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Cliente / Hóspede</th>
                <th className="py-3 px-4">Forma Pagamento</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
              {reservas.map((r) => (
                <tr key={`res-${r.ReservaId}`} className="hover:bg-[#f8f9fa]">
                  <td className="py-3 px-4 font-bold text-[#053d1e]">{r.Codigo}</td>
                  <td className="py-3 px-4">
                    Reserva Quarto {r.QuartoNumero} ({r.QuartoCodigo})
                  </td>
                  <td className="py-3 px-4 font-semibold">{r.HospedeNome}</td>
                  <td className="py-3 px-4 font-medium">{r.FormaPagamento}</td>
                  <td className="py-3 px-4 font-bold text-[#053d1e]">{formatarMoeda(r.ValorPago)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e6f4ea] text-[#137333]">
                      Recebido
                    </span>
                  </td>
                </tr>
              ))}

              {vendas.map((v) => (
                <tr key={`vend-${v.VendaId}`} className="hover:bg-[#f8f9fa]">
                  <td className="py-3 px-4 font-bold text-[#1d5fa8]">{v.Codigo}</td>
                  <td className="py-3 px-4">
                    Venda Loja Fazenda Anew ({v.Itens.length} itens)
                  </td>
                  <td className="py-3 px-4 font-semibold">{v.HospedeNome || 'Cliente Balcão'}</td>
                  <td className="py-3 px-4 font-medium">{v.FormaPagamento}</td>
                  <td className="py-3 px-4 font-bold text-[#053d1e]">{formatarMoeda(v.ValorTotal)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e6f4ea] text-[#137333]">
                      Quitado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
