import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CreditCard, X, Users, Bed } from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Quarto, Pacote, FormaPagamento } from '../../tipos';
import { formatarData, formatarMoeda, sanitizarValorMonetario } from '../../utilitarios/formatadores';

interface ModalReservaRapidaProps {
  aberto: boolean;
  quarto: Quarto | null;
  dataSelecionada: string | null;
  onFechar: () => void;
  onSucesso?: (mensagem: string) => void;
}

const somarDias = (data: string, dias: number): string => {
  const dataObj = new Date(`${data}T00:00:00`);
  dataObj.setDate(dataObj.getDate() + dias);
  return dataObj.toISOString().slice(0, 10);
};

/// ============================================
// CORREÇÃO: Calcular data de saída com base nos dias do pacote
// ============================================
const calcularDataSaida = (dataEntrada: string, quantidadeDias: number): string => {
  // Opção 1: entrada + quantidadeDias (atual)
  // Ex: 10/09 + 2 dias = 12/09
  // return somarDias(dataEntrada, quantidadeDias);

  // Opção 2: entrada + quantidadeDias - 1 (se quiser que saia no dia seguinte)
  // Ex: 10/09 + 2 dias - 1 = 11/09
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

// ============================================
// Cálculo do valor por pessoa com regras de crianças
// ============================================
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

  // Buscar configurações
  const idadeLimiteGratis = Number(configuracao?.CriancaIdadeLimiteGratis ?? 5);
  const idadeLimiteMeia = Number(configuracao?.CriancaIdadeLimiteMeia ?? 11);
  const porcentagemMeia = Number(configuracao?.CriancaPorcentagemMeiaDiaria ?? 50);

  // CORREÇÃO: Nome da chave correto (com P maiúsculo)
  const porcentagemEntrada = Number(configuracao?.PorcentagemEntradaMinima ?? 50);

  // VALOR DO PACOTE É POR PESSOA (adulto)
  const valorPorPessoa = Number(pacote.valor || 0);
  let valorTotal = 0;
  let valorAdultosTotal = 0;
  let valorCriancasTotal = 0;
  let detalhes = [];

  // 1. Calcular valor dos adultos
  if (adultos > 0) {
    valorAdultosTotal = adultos * valorPorPessoa;
    valorTotal += valorAdultosTotal;
    detalhes.push(`${adultos} adulto(s) x ${formatarMoeda(valorPorPessoa)} = ${formatarMoeda(valorAdultosTotal)}`);
  }

  // 2. Calcular valor das crianças com regras
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

  // 3. Calcular entrada (50% do total) - CORRIGIDO
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

// ============================================
// MODAL PRINCIPAL
// ============================================
export const ModalReservaRapida: React.FC<ModalReservaRapidaProps> = ({
  aberto,
  quarto,
  dataSelecionada,
  onFechar,
  onSucesso,
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
  const [adultos, setAdultos] = useState<number>(1);
  const [criancas, setCriancas] = useState<number>(0);
  const [idadesCriancas, setIdadesCriancas] = useState<number[]>([]);
  const [pacoteId, setPacoteId] = useState<string>('');
  const [tipoAtendimento, setTipoAtendimento] = useState<'HOSPEDAGEM' | 'DAY_USE'>('HOSPEDAGEM');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<string>(configuracoes?.formapagamentopadrao || 'PIX');
  const [preReserva, setPreReserva] = useState(false);
  const [valorPago, setValorPago] = useState(0);
  const [valorPagoTexto, setValorPagoTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pacoteSelecionado = useMemo(
    () => pacotes.find((p) => String(p.pacoteid) === pacoteId),
    [pacoteId, pacotes]
  );

  const hospedeSelecionado = hospedes.find((h) => String(h.hospedeid) === hospedeId) || null;
  const pacotesAtivos = pacotes.filter((p) => p.ativo !== false);

  const capacidadeMaxAdultos = Number(quarto?.capacidadeadultos ?? 4);
  const capacidadeMaxCriancas = Number(quarto?.capacidadecriancas ?? 3);

  // ============================================
  // CORREÇÃO: Inicializar quando o modal abrir com data selecionada
  // ============================================
  useEffect(() => {
    if (aberto && dataSelecionada) {
      setDataEntrada(dataSelecionada);

      const pacoteInicial = pacoteId
        ? pacotesAtivos.find(p => String(p.pacoteid) === pacoteId)
        : pacotesAtivos[0];

      if (pacoteInicial) {
        const qtdDias = Number(pacoteInicial.quantidadedias ?? 2);
        const novaSaida = calcularDataSaida(dataSelecionada, qtdDias);
        setDataSaida(novaSaida);

        if (!pacoteId) {
          setPacoteId(String(pacoteInicial.pacoteid));
        }
      }
    }
  }, [aberto, dataSelecionada]);

  // ============================================
  // CORREÇÃO: Quando o pacote mudar, atualizar a data de saída
  // ============================================
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

  // ============================================
  // CORREÇÃO: Quando a data de entrada mudar, recalcular a saída
  // ============================================
  const handleDataEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaEntrada = e.target.value;
    setDataEntrada(novaEntrada);

    // Recalcular a saída com base no pacote atual
    if (pacoteSelecionado) {
      const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
      const novaSaida = calcularDataSaida(novaEntrada, quantidadeDias);
      setDataSaida(novaSaida);
    }
  };

  // ============================================
  // CORREÇÃO: Bloquear alteração manual do check-out
  // ============================================
  const handleDataSaidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Opção 1: Não fazer nada (campo desabilitado)
    // Opção 2: Mostrar erro e corrigir
    const novaSaida = e.target.value;

    // Verifica se a nova data corresponde ao pacote
    if (pacoteSelecionado) {
      const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
      const saidaCorreta = calcularDataSaida(dataEntrada, quantidadeDias);

      if (novaSaida !== saidaCorreta) {
        setErro(`O check-out deve ser em ${formatarData(saidaCorreta)} (${quantidadeDias} dias após o check-in)`);
        // Corrige automaticamente
        setDataSaida(saidaCorreta);
        setTimeout(() => setErro(null), 4000);
      } else {
        setDataSaida(novaSaida);
      }
    }
  };

  // Quando o quarto mudar, ajustar a quantidade de adultos
  useEffect(() => {
    if (quarto) {
      setAdultos(Math.min(Math.max(1, quarto.capacidadeadultos), quarto.capacidadeadultos || 1));
    }
  }, [quarto]);

  // Quando a quantidade de crianças mudar, ajustar o array de idades
  useEffect(() => {
    setIdadesCriancas((prev) => {
      const next = Array.from({ length: criancas }, (_, index) => prev[index] ?? 5);
      return next;
    });
  }, [criancas]);

  // ============================================
  // Cálculo do valor
  // ============================================
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
    if (!preReserva && valorPago === 0) {
      setValorPago(valorMinimoEntrada);
      setValorPagoTexto(valorMinimoEntrada > 0 ? valorMinimoEntrada.toFixed(2).replace('.', ',') : '');
    }
  }, [preReserva, valorMinimoEntrada, valorPago]);

  // ============================================
  // Validações e Salvamento
  // ============================================
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

    // ... (mesmas validações anteriores)

    // ============================================
    // CORREÇÃO: Validar se a data de saída corresponde ao pacote
    // ============================================
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

    if (!preReserva && valorPagamento < valorMinimoEntrada) {
      setErro(`O pagamento mínimo para confirmar a reserva é de ${formatarMoeda(valorMinimoEntrada)} (50% do total).`);
      return;
    }

    setEnviando(true);

    try {
      const resultado = await criarReserva({
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
      });

      if (!resultado.sucesso) {
        setErro(resultado.mensagem || 'Não foi possível salvar a reserva.');
        return;
      }

      onSucesso?.(resultado.mensagem || 'Reserva gravada com sucesso!');
      onFechar();
    } catch (error: any) {
      setErro(error?.message || 'Erro ao salvar a reserva.');
    } finally {
      setEnviando(false);
    }
  };

  if (!aberto || !quarto) return null;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[#c1c9bf] bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#c1c9bf] bg-[#053d1e] px-6 py-4 text-white">
          <div>
            <h3 className="font-['Manrope'] text-xl font-bold">Nova Reserva</h3>
            <p className="text-xs text-white/70">
              Quarto {quarto.numero} • Capacidade {capacidadeMaxAdultos} ad + {capacidadeMaxCriancas} cri
            </p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1.4fr]">
          {/* COLUNA ESQUERDA */}
          <div className="space-y-4 rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-xs">
              <Bed className="h-5 w-5 text-[#053d1e]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#717971]">Quarto selecionado</p>
                <p className="font-bold text-[#191c1d]">{quarto.numero} • {quarto.categoria}</p>
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
                  className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Check-out (15:00)</span>
                {pacoteSelecionado ? (
                  // Opção 1: Campo DESABILITADO (recomendado)
                  <input
                    type="date"
                    value={dataSaida}
                    disabled
                    className="w-full rounded-lg border border-[#c1c9bf] bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed focus:outline-none"
                  />
                ) : (
                  // Se não tiver pacote, permite editar
                  <input
                    type="date"
                    min={dataEntrada}
                    value={dataSaida}
                    onChange={handleDataSaidaChange}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
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
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
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
                disabled={String(pacoteSelecionado?.tipopacote || '').toUpperCase() === 'DAY_USE'}
                onChange={(e) => setTipoAtendimento(e.target.value as 'HOSPEDAGEM' | 'DAY_USE')}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
              >
                <option value="HOSPEDAGEM">Hospedagem</option>
                <option value="DAY_USE">Day use</option>
              </select>
            </label>

            {/* Adultos e Crianças */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Adultos</span>
                <input
                  type="number"
                  min={1}
                  max={capacidadeMaxAdultos}
                  value={adultos}
                  onChange={(e) => setAdultos(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                <span>Crianças</span>
                <input
                  type="number"
                  min={0}
                  max={capacidadeMaxCriancas}
                  value={criancas}
                  onChange={(e) => setCriancas(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
                />
              </label>
            </div>

            {/* Idades das Crianças */}
            {criancas > 0 && (
              <div className="space-y-2 rounded-xl border border-[#c1c9bf] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#717971]">
                  Idade das crianças (0-5: Grátis | 6-11: Meia | 12+: Integral)
                </p>
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
                      className="w-20 rounded-lg border border-[#c1c9bf] px-2 py-1.5 text-right"
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
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
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
                  className="h-4 w-4 accent-[#053d1e]"
                />
                Salvar como pré-reserva (sem pagamento)
              </label>

              {!preReserva && (
                <label className="block space-y-1 text-xs font-semibold text-[#191c1d]">
                  <span>Valor da entrada/pagamento</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#717971]">R$</span>
                    <input
                    type="text"
                    inputMode="decimal"
                    min={valorMinimoEntrada}
                    max={valorCalculado.total}
                    value={valorPagoTexto}
                    placeholder="0,00"
                    onChange={(e) => {
                      const texto = e.target.value;
                      setValorPagoTexto(sanitizarValorMonetario(texto));
                      setValorPago(converterValorMonetario(texto));
                    }}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
                    />
                  </div>
                  <span className="text-[10px] text-[#717971]">
                    Mínimo: {formatarMoeda(valorMinimoEntrada)} • Saldo no hotel: {formatarMoeda(saldoHotel)}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - igual ao anterior */}
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
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
              >
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
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20"
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
                className="rounded-xl border border-[#c1c9bf] bg-white px-4 py-2 text-sm font-semibold text-[#191c1d] hover:bg-[#f3f4f6]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={handleSalvar}
                className="rounded-xl bg-[#053d1e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#225533] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enviando ? 'Salvando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};