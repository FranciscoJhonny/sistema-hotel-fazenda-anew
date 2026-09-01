import React, { useState } from 'react';
import {
  LogOut,
  Search,
  CheckCircle2,
  Receipt,
  Bed,
  Coffee,
  DollarSign,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { Reserva, FormaPagamento } from '../tipos';
import { formatarMoeda, formatarData } from '../utilitarios/formatadores';

export const PaginaCheckout: React.FC = () => {
  const { reservas, dataSistema, realizarCheckout, usuarioAtual } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);
  const [consumoExtra, setConsumoExtra] = useState<number>(0);
  const [formaPagamentoFinal, setFormaPagamentoFinal] = useState<FormaPagamento>('PIX');
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [comprovanteCheckout, setComprovanteCheckout] = useState<{
    reserva: Reserva;
    consumoExtra: number;
    totalPago: number;
  } | null>(null);

  // Hóspedes com estadia ativa
  const reservasHospedadas = reservas.filter((r) => r.Status === 'HOSPEDADO');

  const reservasFiltradas = reservasHospedadas.filter((r) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      r.HospedeNome.toLowerCase().includes(termo) ||
      r.Codigo.toLowerCase().includes(termo) ||
      r.QuartoNumero.includes(termo)
    );
  });

  const totalAcobrar = reservaSelecionada
    ? reservaSelecionada.Saldo + consumoExtra
    : 0;

  const handleEfetivarCheckout = (reserva: Reserva) => {
    const res = realizarCheckout(reserva.ReservaId);
    if (res.sucesso) {
      setFeedbackSucesso(res.mensagem);
      setComprovanteCheckout({
        reserva,
        consumoExtra,
        totalPago: totalAcobrar,
      });
      setReservaSelecionada(null);
      setConsumoExtra(0);
      setTimeout(() => setFeedbackSucesso(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Balcão de Check-out & Acerto de Contas
            </h1>
            <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2.5 py-0.5 rounded-full">
              {reservasHospedadas.length} Hóspedes Presentes
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Conferência de frigobar, liquidação de débitos e liberação imediata do quarto no mapa.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-medium text-[#717971]">Operador:</span>
          <p className="text-xs font-bold text-[#053d1e]">{usuarioAtual?.Nome || 'Operador'}</p>
        </div>
      </div>

      {feedbackSucesso && (
        <div className="bg-[#b8f0c2] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#92c89d] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedbackSucesso}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Lista de Quartos Ocupados / Saídas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por hóspede, número do quarto ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {reservasFiltradas.length === 0 ? (
              <div className="bg-white border border-[#c1c9bf] rounded-2xl p-8 text-center text-xs text-[#717971]">
                <LogOut className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2" />
                <p className="font-semibold text-sm text-[#191c1d]">
                  Nenhum quarto ocupado no momento.
                </p>
                <p className="mt-1">
                  Todos os quartos estão disponíveis ou aguardando novos check-ins.
                </p>
              </div>
            ) : (
              reservasFiltradas.map((res) => {
                const ehHoje = res.DataSaida === dataSistema;
                const selecionado = reservaSelecionada?.ReservaId === res.ReservaId;

                return (
                  <div
                    key={res.ReservaId}
                    onClick={() => {
                      setReservaSelecionada(res);
                      setConsumoExtra(0);
                    }}
                    className={`bg-white border rounded-2xl p-4 transition-all cursor-pointer ${
                      selecionado
                        ? 'border-2 border-[#ba1a1a] bg-[#ffdad6]/20 ring-2 ring-[#ba1a1a]/20 shadow-md'
                        : 'border-[#c1c9bf] hover:border-[#ba1a1a] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e1e3e4]">
                      <div className="flex items-center gap-2">
                        <span className="font-['Manrope'] text-base font-bold text-[#191c1d]">
                          {res.HospedeNome}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#ffdad6] text-[#93000a]">
                          {res.Codigo}
                        </span>
                      </div>
                      {ehHoje ? (
                        <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full w-fit">
                          Saída Prevista para Hoje (15:00)
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[#414941] bg-[#f3f4f5] px-2 py-0.5 rounded-full w-fit">
                          Saída em {formatarData(res.DataSaida)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-[#414941]">
                      <div>
                        <span className="text-[#717971] text-[10px] block">Acomodação:</span>
                        <span className="font-bold text-[#053d1e]">
                          Quarto {res.QuartoNumero} ({res.QuartoCodigo})
                        </span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Entrada / Saída:</span>
                        <span className="font-medium text-[#191c1d]">
                          {formatarData(res.DataEntrada)} a {formatarData(res.DataSaida)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Diárias Totais:</span>
                        <span className="font-medium text-[#191c1d]">
                          {formatarMoeda(res.ValorTotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Saldo Pendente:</span>
                        <span
                          className={`font-bold ${
                            res.Saldo > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'
                          }`}
                        >
                          {formatarMoeda(res.Saldo)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna 3: Painel de Liquidação e Check-out */}
        <div className="lg:col-span-1">
          {reservaSelecionada ? (
            <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-md space-y-4 sticky top-20">
              <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] pb-2 border-b border-[#e1e3e4] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#ba1a1a]" />
                Fechamento de Conta
              </h3>

              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] space-y-1.5 text-xs">
                <p className="font-bold text-sm text-[#191c1d]">{reservaSelecionada.HospedeNome}</p>
                <p className="text-[#053d1e] font-semibold">
                  Quarto {reservaSelecionada.QuartoNumero} ({reservaSelecionada.QuartoCodigo}) • {reservaSelecionada.QuartoCategoria}
                </p>
                <p className="text-[#717971]">
                  Estadia: {formatarData(reservaSelecionada.DataEntrada)} a {formatarData(reservaSelecionada.DataSaida)}
                </p>
              </div>

              {/* Lançamento de Consumo Extra / Frigobar */}
              <div className="border border-[#c1c9bf] rounded-xl p-3 space-y-2 text-xs">
                <label className="block font-semibold text-[#414941]">
                  Consumo Extra / Frigobar / Restaurante (R$):
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={consumoExtra}
                  onChange={(e) => setConsumoExtra(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 border border-[#c1c9bf] rounded-lg text-xs bg-[#f8f9fa] font-bold"
                  placeholder="0.00"
                />
              </div>

              {/* Demonstrativo Financeiro */}
              <div className="border border-[#c1c9bf] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Saldo da Hospedagem:</span>
                  <span className="font-semibold">{formatarMoeda(reservaSelecionada.Saldo)}</span>
                </div>
                {consumoExtra > 0 && (
                  <div className="flex justify-between text-[#053d1e]">
                    <span>Consumo Frigobar/Loja:</span>
                    <span className="font-semibold">+{formatarMoeda(consumoExtra)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#e1e3e4]">
                  <span>Total Final a Cobrar:</span>
                  <span className={totalAcobrar > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}>
                    {formatarMoeda(totalAcobrar)}
                  </span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              {totalAcobrar > 0 && (
                <div className="text-xs space-y-1">
                  <label className="block font-semibold text-[#414941]">
                    Forma de Quitação:
                  </label>
                  <select
                    value={formaPagamentoFinal}
                    onChange={(e) => setFormaPagamentoFinal(e.target.value as FormaPagamento)}
                    className="w-full p-2 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] text-xs font-semibold"
                  >
                    <option value="PIX">PIX Fazenda Anew</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                  </select>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleEfetivarCheckout(reservaSelecionada)}
                  className="w-full py-3 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Liquidar Conta & Liberar Quarto
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8f9fa] border border-dashed border-[#c1c9bf] rounded-2xl p-6 text-center text-xs text-[#717971]">
              <Receipt className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2" />
              <p className="font-semibold text-[#191c1d]">Selecione um quarto ocupado</p>
              <p className="mt-1">
                Clique no card do hóspede para somar eventuais consumos e fechar a conta.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Comprovante de Check-out */}
      {comprovanteCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center pb-3 border-b border-[#e1e3e4]">
              <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
                Check-out Finalizado!
              </h3>
              <p className="text-xs text-[#414941]">Hotel Fazenda Anew • Corguinho/MS</p>
            </div>

            <div className="space-y-2 text-xs p-4 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
              <div className="flex justify-between">
                <span className="text-[#717971]">Hóspede:</span>
                <span className="font-bold text-[#191c1d]">{comprovanteCheckout.reserva.HospedeNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Quarto Desocupado:</span>
                <span className="font-bold text-[#053d1e]">
                  Quarto {comprovanteCheckout.reserva.QuartoNumero} ({comprovanteCheckout.reserva.QuartoCodigo})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Total Quitado:</span>
                <span className="font-bold text-[#137333]">
                  {formatarMoeda(comprovanteCheckout.totalPago)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Status do Quarto:</span>
                <span className="font-bold text-[#137333]">LIBERADO PARA DISPONÍVEL</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg border border-[#c1c9bf] hover:bg-[#f3f4f5] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Recibo
              </button>
              <button
                onClick={() => setComprovanteCheckout(null)}
                className="flex-1 py-2 bg-[#053d1e] text-white rounded-lg text-xs font-bold hover:bg-[#225533] cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
