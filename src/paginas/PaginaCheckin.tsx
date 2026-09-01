import React, { useState } from 'react';
import {
  UserCheck,
  Search,
  CheckCircle2,
  CreditCard,
  Bed,
  Clock,
  KeyRound,
  Printer,
  Calendar,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { Reserva } from '../tipos';
import { formatarMoeda, formatarData, formatarTelefone } from '../utilitarios/formatadores';

export const PaginaCheckin: React.FC = () => {
  const { reservas, quartos, dataSistema, realizarCheckin, usuarioAtual } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [comprovanteCheckin, setComprovanteCheckin] = useState<Reserva | null>(null);

  // Reservas aguardando check-in (CORRIGIDO)
  const reservasAguardando = reservas.filter(
    (r) => r.Status === 'AGUARDANDO_CHECKIN' || (r.Status === 'CONFIRMADA' && r.DataEntrada <= dataSistema)
  );

  const reservasFiltradas = reservasAguardando.filter((r) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      r.HospedeNome.toLowerCase().includes(termo) ||
      r.Codigo.toLowerCase().includes(termo) ||
      r.QuartoNumero.includes(termo)
    );
  });

  const handleEfetivarCheckin = (reserva: Reserva) => {
    const res = realizarCheckin(reserva.ReservaId); // ou reserva.id dependendo da sua interface
    if (res.sucesso) {
      setFeedbackSucesso(res.mensagem);
      setComprovanteCheckin(reserva);
      setReservaSelecionada(null);
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
              Recepção • Balcão de Check-in
            </h1>
            <span className="text-xs font-bold text-[#735c00] bg-[#ffe088] px-2.5 py-0.5 rounded-full">
              {reservasAguardando.length} Chegadas Previstas
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Recepção de hóspedes, conferência de documentos, recebimento de saldo e entrega de chaves.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-medium text-[#717971]">Atendente Responsável:</span>
          <p className="text-xs font-bold text-[#053d1e]">{usuarioAtual?.Nome || 'Sistema'}</p>
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
        {/* Coluna 1 & 2: Lista de Check-ins Previstos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por hóspede, quarto ou código da reserva..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {reservasFiltradas.length === 0 ? (
              <div className="bg-white border border-[#c1c9bf] rounded-2xl p-8 text-center text-xs text-[#717971]">
                <UserCheck className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2" />
                <p className="font-semibold text-sm text-[#191c1d]">
                  Nenhum check-in pendente no momento.
                </p>
                <p className="mt-1">
                  Todos os hóspedes com chegada programada já foram acomodados.
                </p>
              </div>
            ) : (
              reservasFiltradas.map((res) => {
                const selecionado = reservaSelecionada?.ReservaId === res.ReservaId;
                return (
                  <div
                    key={res.ReservaId}
                    onClick={() => setReservaSelecionada(res)}
                    className={`bg-white border rounded-2xl p-4 transition-all cursor-pointer ${
                      selecionado
                        ? 'border-2 border-[#053d1e] bg-[#b8f0c2]/10 ring-2 ring-[#053d1e]/20 shadow-md'
                        : 'border-[#c1c9bf] hover:border-[#053d1e] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e1e3e4]">
                      <div className="flex items-center gap-2">
                        <span className="font-['Manrope'] text-base font-bold text-[#191c1d]">
                          {res.HospedeNome}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#e6f4ea] text-[#137333]">
                          {res.Codigo}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#735c00] bg-[#ffe088] px-2 py-0.5 rounded-full inline-block w-fit">
                        Chegada: {res.HorarioPrevistoChegada || '09:00'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-[#414941]">
                      <div>
                        <span className="text-[#717971] text-[10px] block">Acomodação:</span>
                        <span className="font-bold text-[#053d1e]">
                          Quarto {res.QuartoNumero} ({res.QuartoCodigo})
                        </span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Período:</span>
                        <span className="font-medium text-[#191c1d]">
                          {formatarData(res.DataEntrada)} a {formatarData(res.DataSaida)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Ocupantes:</span>
                        <span className="font-medium text-[#191c1d]">
                          {res.Adultos} Ad / {res.Criancas} Cri
                        </span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Saldo a Cobrar:</span>
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

        {/* Coluna 3: Painel de Ação de Check-in */}
        <div className="lg:col-span-1">
          {reservaSelecionada ? (
            <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-md space-y-4 sticky top-20">
              <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] pb-2 border-b border-[#e1e3e4] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#053d1e]" />
                Processar Entrada
              </h3>

              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] space-y-2 text-xs">
                <p className="font-bold text-sm text-[#191c1d]">{reservaSelecionada.HospedeNome}</p>
                <p className="text-[#414941]">Tel: {reservaSelecionada.HospedeTelefone || 'Não informado'}</p>
                <p className="text-[#053d1e] font-semibold">
                  Destinado: Quarto {reservaSelecionada.QuartoNumero} ({reservaSelecionada.QuartoCodigo}) • {reservaSelecionada.QuartoCategoria}
                </p>
              </div>

              {/* Status do Pagamento */}
              <div className="border border-[#c1c9bf] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Valor Total da Estadia:</span>
                  <span>{formatarMoeda(reservaSelecionada.ValorTotal)}</span>
                </div>
                <div className="flex justify-between text-[#137333] font-semibold">
                  <span>Sinal Pago:</span>
                  <span>{formatarMoeda(reservaSelecionada.ValorPago)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#e1e3e4]">
                  <span>Saldo a Receber no Balcão:</span>
                  <span className={reservaSelecionada.Saldo > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}>
                    {formatarMoeda(reservaSelecionada.Saldo)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleEfetivarCheckin(reservaSelecionada)}
                  className="w-full py-3 bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Efetivar Check-in & Entregar Chave
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8f9fa] border border-dashed border-[#c1c9bf] rounded-2xl p-6 text-center text-xs text-[#717971]">
              <KeyRound className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2" />
              <p className="font-semibold text-[#191c1d]">Selecione uma reserva ao lado</p>
              <p className="mt-1">
                Clique em um hóspede da lista para conferir os dados e liberar o acesso ao chalé.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Comprovante de Check-in */}
      {comprovanteCheckin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center pb-3 border-b border-[#e1e3e4]">
              <div className="w-12 h-12 rounded-full bg-[#e6f4ea] text-[#053d1e] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
                Check-in Realizado com Sucesso!
              </h3>
              <p className="text-xs text-[#414941]">Hotel Fazenda Anew • Corguinho/MS</p>
            </div>

            <div className="space-y-2 text-xs p-4 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
              <div className="flex justify-between">
                <span className="text-[#717971]">Hóspede:</span>
                <span className="font-bold text-[#191c1d]">{comprovanteCheckin.HospedeNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Quarto Entregue:</span>
                <span className="font-bold text-[#053d1e]">
                  Quarto {comprovanteCheckin.QuartoNumero} ({comprovanteCheckin.QuartoCodigo})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Período:</span>
                <span className="font-medium text-[#191c1d]">
                  {formatarData(comprovanteCheckin.DataEntrada)} até {formatarData(comprovanteCheckin.DataSaida)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Wi-Fi da Fazenda:</span>
                <span className="font-mono font-bold text-[#191c1d]">FazendaAnew2026</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg border border-[#c1c9bf] hover:bg-[#f3f4f5] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Ficha
              </button>
              <button
                onClick={() => setComprovanteCheckin(null)}
                className="flex-1 py-2 bg-[#053d1e] text-white rounded-lg text-xs font-bold hover:bg-[#225533]"
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