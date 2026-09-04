import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CreditCard, X, Users, Bed } from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Quarto, Pacote, Reserva, FormaPagamento, StatusPagamento } from '../../tipos';
import { formatarData, formatarMoeda } from '../../utilitarios/formatadores';
import { verificarConflitoQuarto } from '../../servicos/conflitoReservas';

interface ModalReservaRapidaProps {
  aberto: boolean;
  quarto: Quarto | null;
  dataSelecionada: string | null;
  onFechar: () => void;
}

const somarDias = (data: string, dias: number): string => {
  const dataObj = new Date(`${data}T00:00:00`);
  dataObj.setDate(dataObj.getDate() + dias);
  return dataObj.toISOString().slice(0, 10);
};

const calcularValorPacote = (pacote: Pacote | undefined, adultos: number, criancas: number, idadesCriancas: number[]) => {
  if (!pacote) return { total: 0, detalhe: 'Selecione um pacote', entrada: 0 };

  const valorBase = Number(pacote.valor || 0);
  const adultosInclusos = Number((pacote as any).adultosinclusos ?? pacote.adultosinclusos ?? 1);
  const criancasInclusas = Number((pacote as any).criancasinclusas ?? 0);

  let valorAdultosExtras = 0;
  if (adultos > adultosInclusos) {
    const extra = adultos - adultosInclusos;
    const valorPorAdulto = valorBase / Math.max(adultosInclusos, 1);
    valorAdultosExtras = valorPorAdulto * extra;
  }

  let valorCriancas = 0;
  for (const idade of idadesCriancas) {
    if (idade <= 5) continue;
    if (idade <= 11) {
      valorCriancas += (valorBase * 0.5) / Math.max(criancasInclusas || 1, 1);
    } else {
      valorCriancas += valorBase / Math.max(adultosInclusos || 1, 1);
    }
  }

  const total = valorBase + valorAdultosExtras + valorCriancas;
  return {
    total,
    detalhe: `${pacote.nome}: ${formatarMoeda(valorBase)} + ${formatarMoeda(valorAdultosExtras)} em adultos extras + ${formatarMoeda(valorCriancas)} em crianças = Total ${formatarMoeda(total)}`,
    entrada: total * 0.5,
  };
};

export const ModalReservaRapida: React.FC<ModalReservaRapidaProps> = ({
  aberto,
  quarto,
  dataSelecionada,
  onFechar,
}) => {
  const {
    hospedes,
    pacotes,
    configuracoes,
    criarReserva,
    verificarDisponibilidade,
  } = useHotel();

  const hoje = new Date().toISOString().slice(0, 10);
  const [dataEntrada, setDataEntrada] = useState<string>(dataSelecionada || hoje);
  const [dataSaida, setDataSaida] = useState<string>(somarDias(dataSelecionada || hoje, 2));
  const [hospedeId, setHospedeId] = useState<string>('');
  const [adultos, setAdultos] = useState<number>(1);
  const [criancas, setCriancas] = useState<number>(0);
  const [idadesCriancas, setIdadesCriancas] = useState<number[]>([]);
  const [pacoteId, setPacoteId] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<string>(configuracoes?.formapagamentopadrao || 'PIX');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pacoteSelecionado = useMemo(
    () => pacotes.find((p) => String(p.pacoteid) === pacoteId),
    [pacoteId, pacotes]
  );

  const hospedeSelecionado = hospedes.find((h) => String(h.hospedeid) === hospedeId) || null;
  const pacotesAtivos = pacotes.filter((p) => p.ativo !== false);
  const capacidadeMaxAdultos = Number(configuracoes?.capacidademaximaadultosporquarto ?? quarto?.capacidadeadultos ?? 4);
  const capacidadeMaxCriancas = Number(configuracoes?.capacidademaximacriancasporquarto ?? quarto?.capacidadecriancas ?? 3);

  useEffect(() => {
    if (dataSelecionada) {
      setDataEntrada(dataSelecionada);
      const pacotePadrao = pacotesAtivos[0];
      if (pacotePadrao) {
        const qtdDias = Number((pacotePadrao as any).quantidadedias ?? 2);
        setDataSaida(somarDias(dataSelecionada, Math.max(1, qtdDias)));
        setPacoteId(String(pacotePadrao.pacoteid));
      }
    }
  }, [dataSelecionada, pacotesAtivos]);

  useEffect(() => {
    if (quarto) {
      setAdultos(Math.min(Math.max(1, quarto.capacidadeadultos), quarto.capacidadeadultos || 1));
    }
  }, [quarto]);

  useEffect(() => {
    setIdadesCriancas((prev) => {
      const next = Array.from({ length: criancas }, (_, index) => prev[index] ?? 5);
      return next;
    });
  }, [criancas]);

  useEffect(() => {
    if (!pacoteSelecionado) return;
    const quantidadeDias = Number((pacoteSelecionado as any).quantidadedias ?? 2);
    const novaDataSaida = somarDias(dataEntrada, Math.max(1, quantidadeDias));
    setDataSaida(novaDataSaida);
  }, [pacoteSelecionado, dataEntrada]);

  const valorCalculado = useMemo(
    () => calcularValorPacote(pacoteSelecionado, adultos, criancas, idadesCriancas),
    [pacoteSelecionado, adultos, criancas, idadesCriancas]
  );

  const disponibilidade = verificarDisponibilidade(dataEntrada, dataSaida);
  const quartoIndisponivel = quarto ? disponibilidade.find((item) => String((item.quarto as any)?.quartoid ?? (item.quarto as any)?.QuartoId) === String(quarto.quartoid)) : null;

  const handleSalvar = async () => {
    setErro(null);

    if (!quarto) {
      setErro('Selecione um quarto para a reserva.');
      return;
    }

    if (!hospedeSelecionado) {
      setErro('Selecione o hóspede principal.');
      return;
    }

    if (!pacoteSelecionado) {
      setErro('Selecione um pacote.');
      return;
    }

    if (!dataEntrada || !dataSaida || new Date(dataEntrada) >= new Date(dataSaida)) {
      setErro('A data de saída deve ser posterior à data de entrada.');
      return;
    }

    if (new Date(dataEntrada) < new Date(hoje)) {
      setErro('Não é permitido reservar em data passada.');
      return;
    }

    if (adultos + criancas > (Number(quarto.capacidadeadultos || 0) + Number(quarto.capacidadecriancas || 0))) {
      setErro('A capacidade do quarto foi excedida.');
      return;
    }

    if (adultos > Math.min(quarto.capacidadeadultos, capacidadeMaxAdultos)) {
      setErro('Adultos acima da capacidade permitida do quarto.');
      return;
    }

    if (criancas > Math.min(quarto.capacidadecriancas, capacidadeMaxCriancas)) {
      setErro('Crianças acima da capacidade permitida do quarto.');
      return;
    }

    const conflito = verificarConflitoQuarto(quarto.quartoid, dataEntrada, dataSaida, [] as any[]);
    if (conflito.temConflito) {
      setErro(`Quarto ocupado no período por ${conflito.motivo || 'outro hóspede'}.`);
      return;
    }

    if (quartoIndisponivel && !quartoIndisponivel.disponivel) {
      setErro(`Quarto ocupado no período por ${quartoIndisponivel.motivoIndisponibilidade || 'outra reserva'}.`);
      return;
    }

    setEnviando(true);

    const payload = {
      quartoid: quarto.quartoid,
      quartonumero: quarto.numero,
      quartocodigo: quarto.codigoidentificador,
      quartocategoria: quarto.categoria,
      hospedeid: hospedeSelecionado.hospedeid,
      hospedenome: hospedeSelecionado.nomecompleto,
      hospedetelefone: hospedeSelecionado.telefone,
      hospedeemail: hospedeSelecionado.email,
      dataentrada: dataEntrada,
      datasaida: dataSaida,
      adultos,
      criancas,
      tipoatendimento: ((pacoteSelecionado?.nome || '').toLowerCase().includes('day') ? 'DAY_USE' : 'HOSPEDAGEM') as any,
      pacoteid: pacoteSelecionado?.pacoteid,
      pacotename: pacoteSelecionado?.nome,
      statusreserva: 'CONFIRMADA' as any,
      statuspagamento: 'PENDENTE' as StatusPagamento,
      formapagamento: formaPagamento as FormaPagamento,
      valorpago: valorCalculado.entrada,
      valorTotal: valorCalculado.total,
      valortotal: valorCalculado.total,
      saldo: Math.max(0, valorCalculado.total - valorCalculado.entrada),
      observacoes,
      horarioprevistochegada: configuracoes.checkintime || '09:00',
      horarioprevistosaida: configuracoes.checkouttime || '15:00',
    } as unknown as Reserva;

    const resultado = await criarReserva(payload as any);
    if (!resultado.sucesso) {
      setErro(resultado.mensagem);
      setEnviando(false);
      return;
    }

    onFechar();
  };

  if (!aberto || !quarto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[#c1c9bf] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#c1c9bf] bg-[#053d1e] px-6 py-4 text-white">
          <div>
            <h3 className="font-['Manrope'] text-xl font-bold">Nova Reserva Rápida</h3>
            <p className="text-xs text-white/70">Quarto {quarto.numero} • Capacidade {quarto.capacidadeadultos} ad + {quarto.capacidadecriancas} cri</p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="space-y-4 rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-xs">
              <Bed className="h-5 w-5 text-[#053d1e]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#717971]">Quarto selecionado</p>
                <p className="font-bold text-[#191c1d]">{quarto.numero} • {quarto.categoria}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Check-in</span>
                <input type="date" min={hoje} value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20" />
              </label>

              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Check-out</span>
                <input type="date" min={dataEntrada} value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20" />
              </label>
            </div>

            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Pacote</span>
              <select value={pacoteId} onChange={(e) => setPacoteId(e.target.value)} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20">
                <option value="">Selecione</option>
                {pacotesAtivos.map((pacote) => (
                  <option key={String(pacote.pacoteid)} value={String(pacote.pacoteid)}>
                    {pacote.nome} • {formatarMoeda(Number(pacote.valor || 0))}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Adultos</span>
                <input type="number" min={1} max={quarto.capacidadeadultos} value={adultos} onChange={(e) => setAdultos(Number(e.target.value) || 1)} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20" />
              </label>

              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Crianças</span>
                <input type="number" min={0} max={quarto.capacidadecriancas} value={criancas} onChange={(e) => setCriancas(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20" />
              </label>
            </div>

            {criancas > 0 && (
              <div className="space-y-2 rounded-xl border border-[#c1c9bf] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#717971]">Idade das crianças</p>
                {Array.from({ length: criancas }).map((_, index) => (
                  <label key={index} className="flex items-center justify-between gap-3 text-xs text-[#191c1d]">
                    <span>Criança {index + 1}</span>
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={idadesCriancas[index] ?? 5}
                      onChange={(e) => {
                        const proximo = [...idadesCriancas];
                        proximo[index] = Number(e.target.value) || 0;
                        setIdadesCriancas(proximo);
                      }}
                      className="w-20 rounded-lg border border-[#c1c9bf] px-2 py-1.5 text-right"
                    />
                  </label>
                ))}
              </div>
            )}

            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Forma de pagamento</span>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20">
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="TRANSFERENCIA">Transferência</option>
              </select>
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#191c1d]">
                <Users className="h-4 w-4 text-[#053d1e]" />
                Hóspede principal
              </div>

              <select value={hospedeId} onChange={(e) => setHospedeId(e.target.value)} className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20">
                <option value="">Selecione um hóspede</option>
                {hospedes.map((hospede) => (
                  <option key={String(hospede.hospedeid)} value={String(hospede.hospedeid)}>
                    {hospede.nomecompleto} • {hospede.telefone}
                  </option>
                ))}
              </select>

              <div className="mt-3 rounded-xl border border-dashed border-[#c1c9bf] bg-white p-3 text-xs text-[#191c1d]">
                {hospedeSelecionado ? (
                  <div>
                    <p className="font-bold">{hospedeSelecionado.nomecompleto}</p>
                    <p>{hospedeSelecionado.telefone}</p>
                  </div>
                ) : (
                  <p className="text-[#717971]">Nenhum hóspede selecionado.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#191c1d]">
                <CreditCard className="h-4 w-4 text-[#053d1e]" />
                Resumo financeiro
              </div>

              <div className="space-y-2 text-sm text-[#191c1d]">
                <div className="flex justify-between gap-2">
                  <span>Pacote:</span>
                  <strong>{pacoteSelecionado?.nome || 'Não selecionado'}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Período:</span>
                  <strong>{formatarData(dataEntrada)} a {formatarData(dataSaida)}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Valor total:</span>
                  <strong>{formatarMoeda(valorCalculado.total)}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Entrada mínima:</span>
                  <strong>{formatarMoeda(valorCalculado.entrada)}</strong>
                </div>
                <p className="rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-[11px] text-[#191c1d]">
                  {valorCalculado.detalhe}
                </p>
              </div>
            </div>

            <label className="block space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Observações</span>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} placeholder="Observações da reserva" className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20" />
            </label>

            {erro && (
              <div className="rounded-lg border border-[#f5c2c7] bg-[#ffdad6] px-3 py-2 text-xs font-semibold text-[#7a0a0a]">
                {erro}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onFechar} className="rounded-xl border border-[#c1c9bf] bg-white px-4 py-2 text-sm font-semibold text-[#191c1d]">
                Cancelar
              </button>
              <button type="button" disabled={enviando} onClick={handleSalvar} className="rounded-xl bg-[#053d1e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#225533] disabled:cursor-not-allowed disabled:opacity-70">
                {enviando ? 'Salvando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
