import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CalendarDays, CreditCard, X, Users, Bed, LoaderCircle } from 'lucide-react'; // ✅ Adicionado LoaderCircle
import { useHotel } from '../../contextos/ContextoHotel';
import { Quarto, Pacote, FormaPagamento } from '../../tipos';
import { formatarData, formatarMoeda, sanitizarValorMonetario } from '../../utilitarios/formatadores';
import { FnrhService } from '../../servicos/supabase/FnrhService';

interface ModalReservaRapidaProps {
  aberto: boolean;
  quarto: Quarto | null;
  dataSelecionada: string | null;
  onFechar: () => void;
  onSucesso?: (mensagem: string) => void;
  onCarregandoChange?: (carregando: boolean) => void;
}

const somarDias = (data: string, dias: number): string => {
  const dataObj = new Date(`${data}T00:00:00`);
  dataObj.setDate(dataObj.getDate() + dias);
  return dataObj.toISOString().slice(0, 10);
};

const calcularDataSaida = (dataEntrada: string, quantidadeDias: number): string => {
  return somarDias(dataEntrada, quantidadeDias - 1);
};

const converterValorMonetario = (valor: string): number => {
  const normalizado = valor
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\.|,|$))/g, '')
    .replace(',', '.');

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
};

const calcularValorReserva = (
  pacote: Pacote | undefined,
  adultos: number,
  criancas: number,
  idadesCriancas: number[],
  configuracao: any
) => {
  if (!pacote) {
    return {
      total: 0,
      detalhe: 'Selecione um pacote',
      entrada: 0,
      valorBase: 0,
      adultosExtras: 0,
      valorCriancas: 0,
      valorAdultos: 0
    };
  }

  const idadeLimiteGratis = Number(configuracao?.CriancaIdadeLimiteGratis ?? 5);
  const idadeLimiteMeia = Number(configuracao?.CriancaIdadeLimiteMeia ?? 11);
  const porcentagemMeia = Number(configuracao?.CriancaPorcentagemMeiaDiaria ?? 50);
  const porcentagemEntrada = Number(configuracao?.PorcentagemEntradaMinima ?? 50);

  const valorPorPessoa = Number(pacote.valor || 0);
  let valorTotal = 0;
  let valorAdultosTotal = 0;
  let valorCriancasTotal = 0;
  let detalhes: string[] = [];

  if (adultos > 0) {
    valorAdultosTotal = adultos * valorPorPessoa;
    valorTotal += valorAdultosTotal;
    detalhes.push(`${adultos} adulto(s) x ${formatarMoeda(valorPorPessoa)} = ${formatarMoeda(valorAdultosTotal)}`);
  }

  if (criancas > 0 && idadesCriancas.length > 0) {
    for (let i = 0; i < criancas; i++) {
      const idade = idadesCriancas[i] || 0;
      let valorCrianca = 0;

      if (idade <= idadeLimiteGratis) {
        valorCrianca = 0;
        detalhes.push(`Criança ${i + 1} (${idade} anos): GRÁTIS`);
      } else if (idade <= idadeLimiteMeia) {
        valorCrianca = (valorPorPessoa * porcentagemMeia) / 100;
        valorCriancasTotal += valorCrianca;
        detalhes.push(`Criança ${i + 1} (${idade} anos): MEIA ${formatarMoeda(valorCrianca)}`);
      } else {
        valorCrianca = valorPorPessoa;
        valorCriancasTotal += valorCrianca;
        detalhes.push(`Criança ${i + 1} (${idade} anos): INTEGRAL ${formatarMoeda(valorCrianca)}`);
      }
    }
    valorTotal += valorCriancasTotal;
  }

  const entrada = valorTotal * (porcentagemEntrada / 100);

  return {
    total: valorTotal,
    entrada: entrada,
    valorBase: valorPorPessoa,
    valorAdultos: valorAdultosTotal,
    valorCriancas: valorCriancasTotal,
    detalhe: detalhes.join(' | ') || 'Nenhum hóspede selecionado',
  };
};

export const ModalReservaRapida: React.FC<ModalReservaRapidaProps> = ({
  aberto,
  quarto,
  dataSelecionada,
  onFechar,
  onSucesso,
  onCarregandoChange,
}) => {
  const {
    hospedes,
    pacotes,
    configuracoes,
    criarReserva,
  } = useHotel();

  const hoje = new Date().toISOString().slice(0, 10);
  const [dataEntrada, setDataEntrada] = useState<string>(dataSelecionada || hoje);
  const [dataSaida, setDataSaida] = useState<string>(somarDias(dataSelecionada || hoje, 2));
  const [hospedeId, setHospedeId] = useState<string>('');
  const [cadastroidFnrh, setCadastroidFnrh] = useState<number | null>(null);
  
  const [adultos, setAdultos] = useState<number>(0);
  const [criancas, setCriancas] = useState<number>(0);
  
  const [idadesCriancas, setIdadesCriancas] = useState<number[]>([]);
  const [pacoteId, setPacoteId] = useState<string>('');
  const [tipoAtendimento, setTipoAtendimento] = useState<'HOSPEDAGEM' | 'DAY_USE'>('HOSPEDAGEM');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<string>(configuracoes?.formapagamentopadrao || 'PIX');
  const [preReserva, setPreReserva] = useState<boolean>(false);
  const [valorPago, setValorPago] = useState<number>(0);
  const [valorPagoTexto, setValorPagoTexto] = useState<string>('');
  const [autorizarExcecaoSinal, setAutorizarExcecaoSinal] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const valorMinimoAnteriorRef = useRef(0);

  const pacoteSelecionado = useMemo(
    () => pacotes.find((p) => String(p.pacoteid) === pacoteId),
    [pacoteId, pacotes]
  );

  const hospedesOrdenados = useMemo(() => {
    return [...hospedes].sort((a, b) => (a.nomecompleto || '').localeCompare(b.nomecompleto || ''));
  }, [hospedes]);

  const hospedeSelecionado = hospedes.find((h) => String(h.hospedeid) === hospedeId) || null;
  const pacotesAtivos = pacotes.filter((p) => p.ativo !== false);

  const capacidadeMaxAdultos = Number(quarto?.capacidadeadultos ?? 4);
  const capacidadeMaxCriancas = Number(quarto?.capacidadecriancas ?? 3);

  useEffect(() => {
    if (aberto && dataSelecionada) {
      let hospedePre = '';
      let cadastroidPre: number | null = null;
      let adultosPre = 0;
      let criancasPre = 0;
      let entradaPre = dataSelecionada;
      let valorPagoPre = 0;
      let valorPagoTextoPre = '';

      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('fnrh_reserva_preenchimento');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.cadastroid) cadastroidPre = Number(parsed.cadastroid);
            if (parsed.hospedeid) hospedePre = String(parsed.hospedeid);
            if (parsed.adultos) adultosPre = Number(parsed.adultos);
            if (parsed.criancas) criancasPre = Number(parsed.criancas);
            if (parsed.dataentrada) entradaPre = parsed.dataentrada;
            if (parsed.valor_sinal && Number(parsed.valor_sinal) > 0) {
              valorPagoPre = Number(parsed.valor_sinal);
              valorPagoTextoPre = Number(parsed.valor_sinal).toFixed(2).replace('.', ',');
            }
          } catch (e) {
            console.warn('Erro ao ler fnrh_reserva_preenchimento:', e);
          }
        }
      }

      setCadastroidFnrh(cadastroidPre);
      setHospedeId(hospedePre);
      setAdultos(adultosPre);
      setCriancas(criancasPre);
      setIdadesCriancas([]);
      setObservacoes('');
      setPreReserva(false);
      setValorPago(valorPagoPre);
      setValorPagoTexto(valorPagoTextoPre);
      setAutorizarExcecaoSinal(false);
      setErro(null);
      setFormaPagamento(configuracoes?.formapagamentopadrao || 'PIX');
      valorMinimoAnteriorRef.current = 0;

      setDataEntrada(entradaPre);

      const pacoteInicial = pacoteId
        ? pacotesAtivos.find(p => String(p.pacoteid) === pacoteId)
        : pacotesAtivos[0];

      if (pacoteInicial) {
        const qtdDias = Number(pacoteInicial.quantidadedias ?? 2);
        const novaSaida = calcularDataSaida(entradaPre, qtdDias);
        setDataSaida(novaSaida);

        if (!pacoteId) {
          setPacoteId(String(pacoteInicial.pacoteid));
        }
      } else {
        setPacoteId('');
      }
    }
  }, [aberto, dataSelecionada]);

  useEffect(() => {
    if (!pacoteSelecionado || !dataEntrada) return;

    const tipoPacote = String(pacoteSelecionado.tipopacote || '').toUpperCase();
    const eDayUse = tipoPacote === 'DAY_USE';
    setTipoAtendimento(eDayUse ? 'DAY_USE' : 'HOSPEDAGEM');

    const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
    const novaDataSaida = eDayUse
      ? dataEntrada
      : calcularDataSaida(dataEntrada, quantidadeDias);

    if (novaDataSaida !== dataSaida) {
      setDataSaida(novaDataSaida);
    }
  }, [pacoteSelecionado, dataEntrada]);

  const handleDataEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaEntrada = e.target.value;
    setDataEntrada(novaEntrada);

    if (pacoteSelecionado) {
      const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
      const novaSaida = calcularDataSaida(novaEntrada, quantidadeDias);
      setDataSaida(novaSaida);
    }
  };

  const handleDataSaidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaSaida = e.target.value;

    if (pacoteSelecionado) {
      const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
      const saidaCorreta = calcularDataSaida(dataEntrada, quantidadeDias);

      if (novaSaida !== saidaCorreta) {
        setErro(`O check-out deve ser em ${formatarData(saidaCorreta)} (${quantidadeDias} dias após o check-in)`);
        setDataSaida(saidaCorreta);
        setTimeout(() => setErro(null), 4000);
      } else {
        setDataSaida(novaSaida);
      }
    }
  };

  useEffect(() => {
    setIdadesCriancas((prev) => {
      const next = Array.from({ length: criancas }, (_, index) => prev[index] ?? 5);
      return next;
    });
  }, [criancas]);

  const valorCalculado = useMemo(
    () => calcularValorReserva(
      pacoteSelecionado,
      adultos,
      criancas,
      idadesCriancas,
      configuracoes
    ),
    [pacoteSelecionado, adultos, criancas, idadesCriancas, configuracoes]
  );

  const valorMinimoEntrada = valorCalculado.total * 0.5;
  const valorPagamento = preReserva ? 0 : valorPago;
  const saldoHotel = Math.max(0, valorCalculado.total - valorPagamento);
  const statusPagamento = valorPagamento === 0 ? 'PENDENTE' : saldoHotel === 0 ? 'PAGO' : 'PARCIAL';

  useEffect(() => {
    if (!preReserva) {
      const diff = Math.abs(valorPago - valorMinimoAnteriorRef.current);
      if (diff < 0.01 || valorPago === 0) {
        setValorPago(valorMinimoEntrada);
        setValorPagoTexto(valorMinimoEntrada > 0 ? valorMinimoEntrada.toFixed(2).replace('.', ',') : '');
      }
      valorMinimoAnteriorRef.current = valorMinimoEntrada;
    } else {
      setValorPago(0);
      setValorPagoTexto('');
      valorMinimoAnteriorRef.current = 0;
    }
  }, [valorMinimoEntrada, preReserva]);

  const handleSalvar = async () => {
    setErro(null);

    if (!quarto) {
      setErro('Selecione um quarto para continuar.');
      return;
    }

    if (!hospedeId) {
      setErro('Selecione o hóspede principal.');
      return;
    }

    if (!pacoteSelecionado) {
      setErro('Selecione um pacote.');
      return;
    }

    if (adultos < 1 || adultos > capacidadeMaxAdultos) {
      setErro(`A quantidade de adultos deve estar entre 1 e ${capacidadeMaxAdultos}.`);
      return;
    }

    if (criancas > capacidadeMaxCriancas) {
      setErro(`A quantidade de crianças não pode ultrapassar ${capacidadeMaxCriancas}.`);
      return;
    }

    if (pacoteSelecionado) {
      const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
      const saidaCorreta = calcularDataSaida(dataEntrada, quantidadeDias);

      if (dataSaida !== saidaCorreta && tipoAtendimento !== 'DAY_USE') {
        setErro(`O check-out deve ser em ${formatarData(saidaCorreta)} (${quantidadeDias} dias após o check-in). O pacote selecionado é "${pacoteSelecionado.nome}".`);
        return;
      }
    }

    if (valorPagamento > valorCalculado.total) {
      setErro('O valor pago não pode ser maior que o valor total da reserva.');
      return;
    }

    if (!preReserva && valorPagamento < valorMinimoEntrada && !autorizarExcecaoSinal) {
      setErro(`O sinal informado (${formatarMoeda(valorPagamento)}) é menor que 50% (${formatarMoeda(valorMinimoEntrada)}). Marque a caixa 'Autorizar exceção (sinal menor que 50%)' para confirmar.`);
      return;
    }

    setEnviando(true); // ✅ Ativa o loading
    onCarregandoChange?.(true);

    try {
      const resultado = await criarReserva({
        cadastroid: cadastroidFnrh || undefined,
        hospedeid: Number(hospedeId),
        hospedenome: hospedeSelecionado?.nomecompleto || '',
        hospedetelefone: hospedeSelecionado?.telefone || '',
        hospedeemail: hospedeSelecionado?.email || '',
        quartoid: quarto.quartoid,
        quartonumero: quarto.numero,
        quartocodigo: quarto.codigoidentificador,
        quartocategoria: quarto.categoria,
        adultos,
        criancas,
        dataentrada: dataEntrada,
        datasaida: dataSaida,
        horarioprevistochegada: configuracoes.checkintime || '09:00',
        horarioprevistosaida: configuracoes.checkouttime || '12:00',
        tipoatendimento: tipoAtendimento,
        pacoteid: pacoteSelecionado.pacoteid,
        valortotal: valorCalculado.total,
        valorpago: valorPagamento,
        saldo: saldoHotel,
        statuspagamento: statusPagamento,
        formapagamento: formaPagamento as FormaPagamento,
        observacoes,
        statusreserva: preReserva ? 'PRE_RESERVA' : 'RESERVADO',
      });

      if (!resultado.sucesso) {
        setErro(resultado.mensagem || 'Não foi possível salvar a reserva.');
        return;
      }

      // Garante a vinculação da FNRH caso haja reservaId gerado
      if (resultado.reserva?.reservaid) {
        await FnrhService.vincularReservaAoCadastroFnrh({
          cadastroid: cadastroidFnrh || undefined,
          hospedeid: Number(hospedeId),
          reservaid: resultado.reserva.reservaid,
        });
      }

      // Limpa os dados temporários de pré-preenchimento FNRH
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fnrh_reserva_preenchimento');
      }
      setCadastroidFnrh(null);

      onSucesso?.(resultado.mensagem || 'Reserva gravada com sucesso!');
      onFechar();
    } catch (error: any) {
      setErro(error?.message || 'Erro ao salvar a reserva.');
    } finally {
      setEnviando(false); // ✅ Desativa o loading
      onCarregandoChange?.(false);
    }
  };

  if (!aberto || !quarto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      {/* ✅ Adicionado 'relative' aqui para o overlay funcionar corretamente */}
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#c1c9bf] bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-[#c1c9bf] bg-[#053d1e] px-6 py-4 text-white">
          <div>
            <h3 className="font-['Manrope'] text-xl font-bold">Nova Reserva</h3>
            <p className="text-xs text-white/70">
              Quarto {quarto.numero} • Capacidade {capacidadeMaxAdultos} ad + {capacidadeMaxCriancas} cri
            </p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-50" disabled={enviando}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1.4fr]">
          {/* COLUNA ESQUERDA */}
          <div className="space-y-4 rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-xs">
              <Bed className="h-5 w-5 text-[#053d1e]" />
              <div>
                {/* <p className="text-[11px] font-semibold uppercase tracking-wide text-[#717971]">Quarto selecionado </p> */}
                <p className="font-bold text-[#191c1d]">Quarto selecionado - {quarto.codigoidentificador}</p>
              </div>
            </div>

            {/* Datas */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Check-in (09:00)</span>
                <input
                  type="date"
                  min={hoje}
                  value={dataEntrada}
                  onChange={handleDataEntradaChange}
                  disabled={enviando}
                  className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Check-out (15:00)</span>
                {pacoteSelecionado ? (
                  <input
                    type="date"
                    value={dataSaida}
                    disabled
                    className="w-full rounded-lg border border-[#c1c9bf] bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                ) : (
                  <input
                    type="date"
                    min={dataEntrada}
                    value={dataSaida}
                    onChange={handleDataSaidaChange}
                    disabled={enviando}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                )}
                {pacoteSelecionado && (
                  <span className="text-[10px] text-[#717971] block mt-1">
                    Definido pelo pacote: {pacoteSelecionado.quantidadedias} dia(s)
                  </span>
                )}
              </label>
            </div>

            {/* Pacote */}
            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Pacote</span>
              <select
                value={pacoteId}
                onChange={(e) => setPacoteId(e.target.value)}
                disabled={enviando}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Selecione</option>
                {pacotesAtivos.map((pacote) => (
                  <option key={String(pacote.pacoteid)} value={String(pacote.pacoteid)}>
                    {pacote.nome} • {formatarMoeda(Number(pacote.valor || 0))}/pessoa • {pacote.quantidadedias} dia(s)
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Tipo de atendimento</span>
              <select
                value={tipoAtendimento}
                disabled={String(pacoteSelecionado?.tipopacote || '').toUpperCase() === 'DAY_USE' || enviando}
                onChange={(e) => setTipoAtendimento(e.target.value as 'HOSPEDAGEM' | 'DAY_USE')}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="HOSPEDAGEM">Hospedagem</option>
                <option value="DAY_USE">Day use</option>
              </select>
            </label>

            {/* Ocupantes */}
            <div className="mt-4 pt-4 border-t border-[#e5e7eb]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#717971] mb-3 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Ocupantes
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                  <span>Adultos</span>
                  <select
                    value={adultos}
                    onChange={(e) => setAdultos(Number(e.target.value))}
                    disabled={enviando}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 font-bold text-[#191c1d] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {Array.from({ length: capacidadeMaxAdultos + 1 }).map((_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                  <span>Crianças</span>
                  <select
                    value={criancas}
                    onChange={(e) => setCriancas(Number(e.target.value))}
                    disabled={enviando}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 font-bold text-[#191c1d] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {Array.from({ length: capacidadeMaxCriancas + 1 }).map((_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Idades das Crianças */}
            {criancas > 0 && (
              <div className="space-y-2 rounded-xl border border-[#c1c9bf] bg-white p-3">               
                {Array.from({ length: criancas }).map((_, index) => (
                  <label key={index} className="flex items-center justify-between gap-3 text-xs text-[#191c1d]">
                    <span>Criança {index + 1}</span>
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={idadesCriancas[index] ?? 0}
                      onChange={(e) => {
                        const proximo = [...idadesCriancas];
                        proximo[index] = Number(e.target.value) || 0;
                        setIdadesCriancas(proximo);
                      }}
                      disabled={enviando}
                      className="w-20 rounded-lg border border-[#c1c9bf] px-2 py-1.5 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <span className="text-[10px] text-[#717971]">
                      {idadesCriancas[index] <= 5 ? 'Grátis' :
                        idadesCriancas[index] <= 11 ? 'Meia' : 'Integral'}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Forma de Pagamento */}
            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Forma de pagamento</span>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                disabled={enviando}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="TRANSFERENCIA">Transferência</option>
              </select>
            </label>

            <div className="mt-4 space-y-3 rounded-xl border border-[#c1c9bf] bg-white p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#191c1d]">
                <input
                  type="checkbox"
                  checked={preReserva}
                  onChange={(e) => {
                    const marcado = e.target.checked;
                    setPreReserva(marcado);
                    if (marcado) {
                      setValorPago(0);
                      setValorPagoTexto('');
                    } else if (valorPago === 0) {
                      setValorPago(valorMinimoEntrada);
                      setValorPagoTexto(valorMinimoEntrada.toFixed(2).replace('.', ','));
                    }
                  }}
                  disabled={enviando}
                  className="h-4 w-4 accent-[#053d1e] disabled:cursor-not-allowed"
                />
                Salvar como pré-reserva (sem pagamento)
              </label>

              {!preReserva && (
                <div className="space-y-2">
                  <label className="block space-y-1 text-xs font-semibold text-[#191c1d]">
                    <span>Valor da entrada/pagamento</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#717971]">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        max={valorCalculado.total}
                        value={valorPagoTexto}
                        placeholder="0,00"
                        onChange={(e) => {
                          const texto = e.target.value;
                          setValorPagoTexto(sanitizarValorMonetario(texto));
                          setValorPago(converterValorMonetario(texto));
                        }}
                        disabled={enviando}
                        className="w-full rounded-lg border border-[#c1c9bf] bg-white py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold text-[#053d1e]"
                      />
                    </div>
                    <span className="text-[10px] text-[#717971] block">
                      Padrão (50%): {formatarMoeda(valorMinimoEntrada)} • Saldo no hotel: {formatarMoeda(saldoHotel)}
                    </span>
                  </label>

                  {valorPagamento < valorMinimoEntrada && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 flex items-start gap-2.5 animate-in fade-in">
                      <input
                        type="checkbox"
                        id="chkExcecaoSinalRapida"
                        checked={autorizarExcecaoSinal}
                        onChange={(e) => setAutorizarExcecaoSinal(e.target.checked)}
                        disabled={enviando}
                        className="mt-0.5 h-4 w-4 rounded accent-[#053d1e] cursor-pointer"
                      />
                      <label htmlFor="chkExcecaoSinalRapida" className="cursor-pointer font-semibold leading-tight">
                        <span className="text-amber-950 font-bold block">⚠️ Autorizar exceção (Sinal menor que 50%)</span>
                        <span className="text-[11px] font-normal text-amber-800 block mt-0.5">
                          O valor pago ({formatarMoeda(valorPagamento)}) é menor que 50% ({formatarMoeda(valorMinimoEntrada)}). Marque esta opção para permitir a criação da reserva.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="space-y-4">
            {/* Hóspede */}
            <div className="rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#191c1d]">
                <Users className="h-4 w-4 text-[#053d1e]" />
                Hóspede principal
              </div>

              <select
                value={hospedeId}
                onChange={(e) => setHospedeId(e.target.value)}
                disabled={enviando}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Selecione um hóspede</option>
                {hospedesOrdenados.map((hospede) => (
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
                    {hospedeSelecionado.email && <p>{hospedeSelecionado.email}</p>}
                  </div>
                ) : (
                  <p className="text-[#717971]">Nenhum hóspede selecionado.</p>
                )}
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#191c1d]">
                <CreditCard className="h-4 w-4 text-[#053d1e]" />
                Resumo financeiro
              </div>

              <div className="space-y-2 text-sm text-[#191c1d]">
                <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1">
                  <span>Pacote:</span>
                  <strong>{pacoteSelecionado?.nome || 'Não selecionado'}</strong>
                </div>
                <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1">
                  <span>Adultos:</span>
                  <strong>{adultos} x {formatarMoeda(valorCalculado.valorBase)} = {formatarMoeda(valorCalculado.valorAdultos)}</strong>
                </div>
                {criancas > 0 && (
                  <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1">
                    <span>Crianças:</span>
                    <strong>{formatarMoeda(valorCalculado.valorCriancas)}</strong>
                  </div>
                )}
                <div className="flex justify-between gap-2 text-base font-bold pt-1">
                  <span>Valor total:</span>
                  <span className="text-[#053d1e]">{formatarMoeda(valorCalculado.total)}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm font-semibold pt-1 border-t border-[#e5e7eb]">
                  <span>Entrada (50%):</span>
                  <span className="text-[#735c00]">{formatarMoeda(valorPagamento)}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm font-semibold">
                  <span>Saldo no hotel:</span>
                  <span className={saldoHotel === 0 ? 'text-[#166534]' : 'text-[#ba1a1a]'}>
                    {formatarMoeda(saldoHotel)} ({statusPagamento})
                  </span>
                </div>
                <div className="rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-[10px] text-[#717971] mt-2">
                  <p className="font-semibold text-[#191c1d]">📋 Detalhamento:</p>
                  <p>{valorCalculado.detalhe}</p>
                </div>
              </div>
            </div>

            {/* Observações */}
            <label className="block space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Observações</span>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Observações da reserva"
                disabled={enviando}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </label>

            {/* Erro */}
            {erro && (
              <div className="rounded-lg border border-[#f5c2c7] bg-[#ffdad6] px-3 py-2 text-xs font-semibold text-[#7a0a0a]">
                {erro}
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onFechar}
                disabled={enviando}
                className="rounded-xl border border-[#c1c9bf] bg-white px-4 py-2 text-sm font-semibold text-[#191c1d] hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={handleSalvar}
                className="rounded-xl bg-[#053d1e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#225533] disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-2"
              >
                {enviando ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Confirmar Reserva'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};