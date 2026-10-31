import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, X, Users, Bed, LoaderCircle, Sun, Calendar, Coffee } from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Quarto, Pacote, FormaPagamento } from '../../tipos';
import {
  formatarData,
  formatarMoeda,
  calcularIdadeNumerica,
  aplicarMascaraMoeda,
  desformatarMoeda,
  formatarHorarioParaTimeSpan,
} from '../../utilitarios/formatadores';
import { FnrhService } from '../../servicos/api/FnrhService';
import { obterClienteSupabase } from '../../lib/supabaseCliente';

interface ModalReservaRapidaProps {
  aberto: boolean;
  quarto: Quarto | null;
  dataSelecionada: string | null;
  modoDayUse?: boolean;
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

const calcularValorReserva = (
  pacote: Pacote | undefined,
  adultos: number,
  criancas: number,
  idadesCriancas: number[],
  incluirCafeManha: boolean = false
) => {
  if (!pacote) {
    return {
      total: 0,
      detalhe: 'Selecione um pacote',
      entrada: 0,
      valorBase: 0,
      valorAdultos: 0,
      valorCriancas: 0,
      qtdCriancasMeia: 0,
      qtdCriancasGratis: 0,
      detalhesCriancas: [] as { index: number; idade: number; tipo: string; valor: number }[],
    };
  }

  const valorPorPessoa = Number(pacote.valor || 0);
  let valorAdultosTotal = 0;
  let valorCriancasTotal = 0;
  let qtdCriancasMeia = 0;
  let qtdCriancasGratis = 0;
  const detalhes: string[] = [];
  const detalhesCriancas: { index: number; idade: number; tipo: string; valor: number }[] = [];

  if (adultos > 0) {
    valorAdultosTotal = adultos * valorPorPessoa;
    detalhes.push(`${adultos} adulto(s) x ${formatarMoeda(valorPorPessoa)} = ${formatarMoeda(valorAdultosTotal)}`);
  }

  if (criancas > 0) {
    for (let i = 0; i < criancas; i++) {
      const idade = Math.min(11, Math.max(0, idadesCriancas[i] ?? 0));
      let valorCrianca = 0;
      let tipoStr = '';

      if (idade <= 5) {
        valorCrianca = 0;
        qtdCriancasGratis++;
        tipoStr = 'Grátis (0%)';
        detalhes.push(`Criança ${i + 1} (${idade} anos): GRÁTIS`);
      } else {
        valorCrianca = valorPorPessoa * 0.5;
        valorCriancasTotal += valorCrianca;
        qtdCriancasMeia++;
        tipoStr = 'Meia (50%)';
        detalhes.push(`Criança ${i + 1} (${idade} anos): MEIA (${formatarMoeda(valorCrianca)})`);
      }

      detalhesCriancas.push({
        index: i + 1,
        idade,
        tipo: tipoStr,
        valor: valorCrianca,
      });
    }
  }

  const valorCafeManha = incluirCafeManha ? 50 : 0;
  if (valorCafeManha > 0) {
    detalhes.push(`Café da manhã: ${formatarMoeda(valorCafeManha)}`);
  }

  const valorTotal = valorAdultosTotal + valorCriancasTotal + valorCafeManha;
  const entrada = valorTotal * 0.5;

  return {
    total: valorTotal,
    entrada: entrada,
    valorBase: valorPorPessoa,
    valorAdultos: valorAdultosTotal,
    valorCriancas: valorCriancasTotal,
    valorCafeManha,
    qtdCriancasMeia,
    qtdCriancasGratis,
    detalhesCriancas,
    detalhe: detalhes.join(' | ') || 'Nenhum hóspede selecionado',
  };
};

export const ModalReservaRapida: React.FC<ModalReservaRapidaProps> = ({
  aberto,
  quarto,
  dataSelecionada,
  modoDayUse = false,
  onFechar,
  onSucesso,
  onCarregandoChange,
}) => {
  const {
    quartos,
    hospedes,
    pacotes,
    configuracoes,
    criarReserva,
  } = useHotel();

  const hoje = new Date().toISOString().slice(0, 10);
  const [dataReserva, setDataReserva] = useState<string>(dataSelecionada || hoje);
  const [dataEntrada, setDataEntrada] = useState<string>(dataSelecionada || hoje);
  const [dataSaida, setDataSaida] = useState<string>(somarDias(dataSelecionada || hoje, 2));
  const [hospedeId, setHospedeId] = useState<string>('');
  const [cadastroidFnrh, setCadastroidFnrh] = useState<number | null>(null);

  const [adultos, setAdultos] = useState<number>(modoDayUse ? 1 : 2);
  const [criancas, setCriancas] = useState<number>(0);

  const [idadesCriancas, setIdadesCriancas] = useState<number[]>([]);
  const [pacoteId, setPacoteId] = useState<string>('');
  const [tipoAtendimento, setTipoAtendimento] = useState<'HOSPEDAGEM' | 'DAY_USE'>(modoDayUse ? 'DAY_USE' : 'HOSPEDAGEM');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<string>(configuracoes?.formapagamentopadrao || 'PIX');
  const [preReserva, setPreReserva] = useState<boolean>(false);
  const [valorPago, setValorPago] = useState<number>(0);
  const [valorPagoTexto, setValorPagoTexto] = useState<string>('');
  const [autorizarExcecaoSinal, setAutorizarExcecaoSinal] = useState<boolean>(false);
  const [incluirCafeManha, setIncluirCafeManha] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pacoteSelecionado = useMemo(
    () => pacotes.find((p) => String(p.pacoteid) === pacoteId),
    [pacoteId, pacotes]
  );

  const eDayUse = useMemo(() => {
    return (
      Boolean(modoDayUse) ||
      tipoAtendimento === 'DAY_USE' ||
      String(pacoteSelecionado?.tipopacote || '').toUpperCase() === 'DAY_USE' ||
      (pacoteSelecionado?.nome || '').toLowerCase().includes('day use')
    );
  }, [modoDayUse, tipoAtendimento, pacoteSelecionado]);

  useEffect(() => {
    if (!eDayUse && incluirCafeManha) {
      setIncluirCafeManha(false);
    }
  }, [eDayUse, incluirCafeManha]);

  const hospedesOrdenados = useMemo(() => {
    return [...hospedes].sort((a, b) => (a.nomecompleto || '').localeCompare(b.nomecompleto || ''));
  }, [hospedes]);

  const hospedeSelecionado = hospedes.find((h) => String(h.hospedeid) === hospedeId) || null;
  const pacotesAtivos = pacotes.filter((p) => p.ativo !== false);

  const capacidadeMaxCriancas = 10;

  useEffect(() => {
    if (!erro) return;
    const timer = setTimeout(() => {
      setErro(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [erro]);

  useEffect(() => {
    if (aberto && (dataSelecionada || modoDayUse)) {
      let hospedePre = '';
      let cadastroidPre: number | null = null;
      let adultosPre = modoDayUse ? 1 : 2;
      let criancasPre = 0;
      let dataReservaPre = dataSelecionada || hoje;
      let entradaPre = dataSelecionada || hoje;
      let saidaPre: string | null = null;
      let pacotePre: string | null = null;
      let valorPagoPre = 0;
      let valorPagoTextoPre = '';
      let autorizarExcecaoPre = false;
      let idadesCriancasPre: number[] = [];

      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('fnrh_reserva_preenchimento');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.cadastroid) cadastroidPre = Number(parsed.cadastroid);
            if (parsed.hospedeid) hospedePre = String(parsed.hospedeid);
            if (parsed.datareserva) dataReservaPre = parsed.datareserva;
            if (!modoDayUse) {
              if (parsed.adultos) adultosPre = Number(parsed.adultos);
              if (parsed.criancas !== undefined) criancasPre = Number(parsed.criancas);
              if (parsed.idades_criancas && Array.isArray(parsed.idades_criancas)) {
                idadesCriancasPre = parsed.idades_criancas
                  .map(Number)
                  .filter((id: number) => id >= 0 && id <= 11);
              }
            }
            if (parsed.dataentrada) entradaPre = parsed.dataentrada;
            if (parsed.datasaida) saidaPre = parsed.datasaida;
            if (parsed.pacoteid) pacotePre = String(parsed.pacoteid);
            if (parsed.valor_sinal && Number(parsed.valor_sinal) > 0) {
              valorPagoPre = Number(parsed.valor_sinal);
              valorPagoTextoPre = aplicarMascaraMoeda(Number(parsed.valor_sinal));
            } else if (parsed.valor_sinal === 0) {
              autorizarExcecaoPre = true;
            }
            sessionStorage.removeItem('fnrh_reserva_preenchimento');
          } catch (e) {
            console.warn('Erro ao ler fnrh_reserva_preenchimento:', e);
            sessionStorage.removeItem('fnrh_reserva_preenchimento');
          }
        }
      }

      setCadastroidFnrh(cadastroidPre);
      setHospedeId(hospedePre);
      setDataReserva(dataReservaPre);
      setAdultos(modoDayUse ? 1 : adultosPre);
      setCriancas(modoDayUse ? 0 : (idadesCriancasPre.length > 0 ? idadesCriancasPre.length : criancasPre));
      setIdadesCriancas(modoDayUse ? [] : idadesCriancasPre);
      setObservacoes('');
      setPreReserva(false);
      setValorPago(valorPagoPre);
      setValorPagoTexto(valorPagoTextoPre);
      setAutorizarExcecaoSinal(autorizarExcecaoPre);
      setIncluirCafeManha(false);
      setErro(null);
      setFormaPagamento(configuracoes?.formapagamentopadrao || 'PIX');

      setDataEntrada(entradaPre);

      if (modoDayUse) {
        setTipoAtendimento('DAY_USE');
        setDataSaida(entradaPre);
        const pDayUse = pacotesAtivos.find(
          (p) => String(p.tipopacote || '').toUpperCase() === 'DAY_USE' || (p.nome || '').toLowerCase().includes('day use')
        );
        if (pDayUse) {
          setPacoteId(String(pDayUse.pacoteid));
        }
      } else {
        const pacoteInicial = pacotePre
          ? pacotesAtivos.find(p => String(p.pacoteid) === pacotePre)
          : (pacoteId
            ? pacotesAtivos.find(p => String(p.pacoteid) === pacoteId)
            : pacotesAtivos[0]);

        if (pacoteInicial) {
          const qtdDias = Number(pacoteInicial.quantidadedias ?? 2);
          const novaSaida = saidaPre || calcularDataSaida(entradaPre, qtdDias);
          setDataSaida(novaSaida);
          setPacoteId(String(pacoteInicial.pacoteid));
        } else {
          if (saidaPre) {
            setDataSaida(saidaPre);
          }
          setPacoteId('');
        }
      }
    }
  }, [aberto, dataSelecionada, modoDayUse]);

  useEffect(() => {
    if (modoDayUse && pacotesAtivos.length > 0) {
      const pDayUse = pacotesAtivos.find(
        (p) => String(p.tipopacote || '').toUpperCase() === 'DAY_USE' || (p.nome || '').toLowerCase().includes('day use')
      );
      if (pDayUse && pacoteId !== String(pDayUse.pacoteid)) {
        setPacoteId(String(pDayUse.pacoteid));
      }
    }
  }, [modoDayUse, pacotesAtivos, pacoteId]);

  useEffect(() => {
    const carregarOcupantesDoBanco = async () => {
      if (!aberto || (!hospedeId && !cadastroidFnrh)) return;
      if (modoDayUse) {
        setAdultos(1);
        setCriancas(0);
        setIdadesCriancas([]);
        return;
      }
      const cliente = obterClienteSupabase();
      if (!cliente) return;

      try {
        let qtdAdultosAcomps = 0;
        let idadesCriancasCalc: number[] = [];

        if (cadastroidFnrh) {
          const { data: acompsFnrh } = await cliente
            .from('cadastro_fnrh_acompanhante')
            .select('datanascimento')
            .eq('cadastroid', cadastroidFnrh);

          if (acompsFnrh && acompsFnrh.length > 0) {
            acompsFnrh.forEach((a: any) => {
              if (a.datanascimento) {
                const age = calcularIdadeNumerica(a.datanascimento);
                if (age >= 12) {
                  qtdAdultosAcomps++;
                } else if (age >= 0 && age <= 11) {
                  idadesCriancasCalc.push(age);
                }
              } else {
                qtdAdultosAcomps++;
              }
            });
          }
        } else if (hospedeId) {
          const { data: acompsOficial } = await cliente
            .from('acompanhante')
            .select('datanascimento')
            .eq('hospedeid', Number(hospedeId));

          if (acompsOficial && acompsOficial.length > 0) {
            acompsOficial.forEach((a: any) => {
              if (a.datanascimento) {
                const age = calcularIdadeNumerica(a.datanascimento);
                if (age >= 12) {
                  qtdAdultosAcomps++;
                } else if (age >= 0 && age <= 11) {
                  idadesCriancasCalc.push(age);
                }
              } else {
                qtdAdultosAcomps++;
              }
            });
          }
        }

        if (cadastroidFnrh || (hospedeId && (qtdAdultosAcomps > 0 || idadesCriancasCalc.length > 0))) {
          const totalAdultos = Math.max(1, 1 + qtdAdultosAcomps);
          setAdultos(totalAdultos);
          setCriancas(idadesCriancasCalc.length);
          setIdadesCriancas(idadesCriancasCalc);
        } else if (hospedeId && adultos < 1) {
          setAdultos(1);
        }
      } catch (e) {
        console.warn('Aviso ao carregar ocupantes:', e);
      }
    };

    carregarOcupantesDoBanco();
  }, [aberto, hospedeId, cadastroidFnrh, dataEntrada, modoDayUse]);

  useEffect(() => {
    if (!pacoteSelecionado || !dataEntrada) return;

    const tipoPacote = String(pacoteSelecionado.tipopacote || '').toUpperCase();
    const eDayUse = modoDayUse || tipoPacote === 'DAY_USE';
    setTipoAtendimento(eDayUse ? 'DAY_USE' : 'HOSPEDAGEM');

    const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
    const novaDataSaida = eDayUse
      ? dataEntrada
      : calcularDataSaida(dataEntrada, quantidadeDias);

    if (novaDataSaida !== dataSaida) {
      setDataSaida(novaDataSaida);
    }
  }, [pacoteSelecionado, dataEntrada, modoDayUse]);

  const handleDataEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaEntrada = e.target.value;
    setDataEntrada(novaEntrada);

    if (modoDayUse || String(pacoteSelecionado?.tipopacote || '').toUpperCase() === 'DAY_USE') {
      setDataSaida(novaEntrada);
    } else if (pacoteSelecionado) {
      const quantidadeDias = Number(pacoteSelecionado.quantidadedias ?? 2);
      const novaSaida = calcularDataSaida(novaEntrada, quantidadeDias);
      setDataSaida(novaSaida);
    }
  };

  const handleDataSaidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaSaida = e.target.value;

    if (pacoteSelecionado && !modoDayUse) {
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
      const next = Array.from({ length: criancas }, (_, index) => {
        const val = prev[index] ?? 5;
        return Math.min(11, Math.max(0, val));
      });
      return next;
    });
  }, [criancas]);

  const valorCalculado = useMemo(
    () => calcularValorReserva(
      pacoteSelecionado,
      adultos,
      criancas,
      idadesCriancas,
      eDayUse && incluirCafeManha
    ),
    [pacoteSelecionado, adultos, criancas, idadesCriancas, eDayUse, incluirCafeManha]
  );

  const valorMinimoEntrada = valorCalculado.entrada;
  const valorPagamento = preReserva ? 0 : valorPago;
  const saldoHotel = Math.max(0, valorCalculado.total - valorPagamento);
  const statusPagamento = valorPagamento === 0 ? 'PENDENTE' : saldoHotel === 0 ? 'PAGO' : 'PARCIAL';

  useEffect(() => {
    if (!preReserva) {
      setValorPago(valorMinimoEntrada);
      setValorPagoTexto(aplicarMascaraMoeda(valorMinimoEntrada));
    } else {
      setValorPago(0);
      setValorPagoTexto('');
    }
  }, [valorMinimoEntrada, preReserva]);

  const handleTogglePreReserva = (marcado: boolean) => {
    setPreReserva(marcado);
    if (marcado) {
      setValorPago(0);
      setValorPagoTexto('');
    } else {
      setValorPago(valorMinimoEntrada);
      setValorPagoTexto(aplicarMascaraMoeda(valorMinimoEntrada));
    }
  };

  const handleValorPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const textoMascarado = aplicarMascaraMoeda(e.target.value);
    setValorPagoTexto(textoMascarado);
    setValorPago(desformatarMoeda(textoMascarado));
  };

  const handleSalvar = async () => {
    setErro(null);

    if (!quarto && !modoDayUse) {
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

    if (!modoDayUse && adultos < 1) {
      setErro('Selecione pelo menos 1 adulto para realizar a reserva.');
      return;
    }

    if (!modoDayUse && adultos > 10) {
      setErro('A quantidade de adultos não pode ultrapassar 10.');
      return;
    }

    if (!modoDayUse && criancas > capacidadeMaxCriancas) {
      setErro(`A quantidade de crianças não pode ultrapassar ${capacidadeMaxCriancas}.`);
      return;
    }

    if (pacoteSelecionado && !modoDayUse) {
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

    setEnviando(true);
    onCarregandoChange?.(true);

    try {
      const quartoDayUse = modoDayUse
        ? quartos.find((q) => q.codigoidentificador === 'DAY_USE' || q.numero === 'DU' || String(q.quartoid) === '17')
        : null;

      const quartoEfetivo = modoDayUse
        ? quartoDayUse
        : (quarto || quartos[0]);

      const idQuartoFinal = modoDayUse
        ? (quartoDayUse ? quartoDayUse.quartoid : 17)
        : (quartoEfetivo ? quartoEfetivo.quartoid : 0);

      const resultado = await criarReserva({
        cadastroid: cadastroidFnrh || undefined,
        datareserva: dataReserva,
        hospedeid: Number(hospedeId),
        hospedenome: hospedeSelecionado?.nomecompleto || '',
        hospedetelefone: hospedeSelecionado?.telefone || '',
        hospedeemail: hospedeSelecionado?.email || '',
        quartoid: idQuartoFinal,
        quartonumero: modoDayUse ? 'DU' : (quartoEfetivo?.numero || 'DU'),
        quartocodigo: modoDayUse ? 'DAY_USE' : (quartoEfetivo?.codigoidentificador || 'DAY_USE'),
        quartocategoria: modoDayUse ? 'Day Use' : (quartoEfetivo?.categoria || 'Day Use'),
        adultos: modoDayUse ? 1 : adultos,
        criancas: modoDayUse ? 0 : criancas,
        dataentrada: dataEntrada,
        datasaida: modoDayUse ? dataEntrada : dataSaida,
        // Aplicação do formatador para compatibilidade com System.TimeSpan do C#
        horarioprevistochegada: formatarHorarioParaTimeSpan(configuracoes.checkintime || '09:00'),
        horarioprevistosaida: formatarHorarioParaTimeSpan(modoDayUse ? '17:00' : (configuracoes.checkouttime || '12:00')),
        tipoatendimento: modoDayUse ? 'DAY_USE' : tipoAtendimento,
        pacoteid: pacoteSelecionado.pacoteid,
        valortotal: valorCalculado.total,
        valorpago: valorPagamento,
        saldo: saldoHotel,
        statuspagamento: statusPagamento,
        formapagamento: formaPagamento as FormaPagamento,
        observacoes: (() => {
          let obs = observacoes.trim();
          if (eDayUse && incluirCafeManha) {
            const tagCafe = '[Day Use com Café da Manhã (+R$ 50,00)]';
            if (!obs.includes(tagCafe)) {
              obs = obs ? `${obs}\n${tagCafe}` : tagCafe;
            }
          }
          return obs;
        })(),
        statusreserva: preReserva ? 'PRE_RESERVA' : 'RESERVADO',
      });

      if (!resultado.sucesso) {
        setErro(resultado.mensagem || 'Não foi possível salvar a reserva.');
        return;
      }

      if (resultado.reserva?.reservaid) {
        await FnrhService.vincularReservaAoCadastroFnrh({
          cadastroid: cadastroidFnrh || undefined,
          hospedeid: Number(hospedeId),
          reservaid: resultado.reserva.reservaid,
        });
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fnrh_reserva_preenchimento');
      }
      setCadastroidFnrh(null);
      setHospedeId('');
      setAdultos(2);
      setCriancas(0);
      setIdadesCriancas([]);
      setObservacoes('');
      setValorPago(0);
      setValorPagoTexto('');
      setPreReserva(false);
      setAutorizarExcecaoSinal(false);
      setIncluirCafeManha(false);
      onSucesso?.(resultado.mensagem || 'Reserva gravada com sucesso!');
      onFechar();
    } catch (error: any) {
      setErro(error?.message || 'Erro ao salvar a reserva.');
    } finally {
      setEnviando(false);
      onCarregandoChange?.(false);
    }
  };

  if (!aberto || (!quarto && !modoDayUse)) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[#c1c9bf] bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#c1c9bf] bg-[#053d1e] px-6 py-4 text-white">
          <div>
            <h3 className="font-['Manrope'] text-xl font-bold flex items-center gap-2">
              {modoDayUse && <Sun className="h-5 w-5 text-amber-300 inline" />}
              {modoDayUse ? 'Nova Reserva - Day Use' : 'Nova Reserva'}
            </h3>
            <p className="text-xs text-white/70">
              {modoDayUse
                ? 'Reserva individual de Day Use (sem hospedagem)'
                : quarto
                ? `Quarto ${quarto.numero} - ${quarto.quantidadecamascasal ?? 0} Cama(s) Casal, ${quarto.quantidadecamassolteiro ?? 0} Cama(s) Solteiro`
                : ''}
            </p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-50 cursor-pointer" disabled={enviando}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1.4fr]">
          {/* COLUNA ESQUERDA */}
          <div className="space-y-4 rounded-2xl border border-[#c1c9bf] bg-[#f8f9fa] p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-xs">
              {modoDayUse ? (
                <Sun className="h-5 w-5 text-amber-600 shrink-0" />
              ) : (
                <Bed className="h-5 w-5 text-[#053d1e] shrink-0" />
              )}
              <div>
                <p className="font-bold text-[#191c1d]">
                  {modoDayUse
                    ? 'Day Use (Sem hospedagem em quarto)'
                    : `Quarto selecionado - ${quarto?.codigoidentificador}`}
                </p>
              </div>
            </div>

            {/* Data da Reserva */}
            <div>
              <label className="block space-y-1 text-xs font-semibold text-[#191c1d]">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-[#053d1e]" />
                  Data da Reserva
                </span>
                <input
                  type="date"
                  value={dataReserva}
                  onChange={(e) => setDataReserva(e.target.value)}
                  disabled={enviando}
                  className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-xs font-semibold text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </label>
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
                {pacoteSelecionado || modoDayUse ? (
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
                    {modoDayUse ? 'Validade: mesmo dia' : `Definido pelo pacote: ${pacoteSelecionado.quantidadedias} dia(s)`}
                  </span>
                )}
              </label>
            </div>

            {/* Pacote */}
            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Pacote</span>
              <select
                value={pacoteId}
                onChange={(e) => {
                  setPacoteId(e.target.value);
                  if (e.target.value) setErro(null);
                }}
                disabled={enviando || modoDayUse}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {!pacoteId && <option value="">Selecione</option>}
                {pacotesAtivos.map((pacote) => (
                  <option key={String(pacote.pacoteid)} value={String(pacote.pacoteid)}>
                    {pacote.nome} - {formatarMoeda(Number(pacote.valor || 0))}/pessoa • {pacote.quantidadedias} dia(s)
                  </option>
                ))}
              </select>
              {modoDayUse && (
                <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">
                  🔒 Pacote pré-selecionado e travado para Day Use
                </span>
              )}
            </label>

            <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
              <span>Tipo de atendimento</span>
              <select
                value={tipoAtendimento}
                disabled={modoDayUse || String(pacoteSelecionado?.tipopacote || '').toUpperCase() === 'DAY_USE' || enviando}
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
                {modoDayUse && <span className="text-[10px] text-amber-800 font-bold lowercase">(estritamente 1 adulto)</span>}
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                  <span>Ad. (a part. de 12 anos)</span>
                  <select
                    value={adultos}
                    onChange={(e) => {
                      if (modoDayUse) return;
                      const val = Number(e.target.value);
                      setAdultos(val);
                      if (val >= 1) {
                        setErro(null);
                      }
                    }}
                    disabled={enviando || modoDayUse}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 font-bold text-[#191c1d] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {modoDayUse ? (
                      <option value={1}>1 (Individual - Day Use)</option>
                    ) : (
                      Array.from({ length: 11 }, (_, i) => i).map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))
                    )}
                  </select>
                </label>

                <label className="space-y-1 text-xs font-semibold text-[#191c1d]">
                  <span>Cri. (0 a 11 anos)</span>
                  <select
                    value={criancas}
                    onChange={(e) => {
                      if (modoDayUse) return;
                      const val = Number(e.target.value);
                      setCriancas(val);
                      setErro(null);
                    }}
                    disabled={enviando || modoDayUse}
                    className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 font-bold text-[#191c1d] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {modoDayUse ? (
                      <option value={0}>0 (Não permitido)</option>
                    ) : (
                      Array.from({ length: 11 }, (_, i) => i).map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            </div>

            {/* Opção Adicional: Café da Manhã (Exclusivo para Day Use) */}
            {eDayUse && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={incluirCafeManha}
                    onChange={(e) => setIncluirCafeManha(e.target.checked)}
                    disabled={enviando}
                    className="mt-0.5 h-4 w-4 rounded accent-[#053d1e] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-amber-700 shrink-0" />
                      Incluir Café da Manhã (+ R$ 50,00)
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5 leading-tight">
                      Opção disponível exclusivamente para Day Use. Acrescenta R$ 50,00 ao valor total da reserva.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Idades das Crianças (0 a 11 anos) */}
            {criancas > 0 && !modoDayUse && (
              <div className="space-y-2 rounded-xl border border-[#c1c9bf] bg-white p-3">
                <p className="text-[11px] font-bold text-[#414941] mb-1">
                  Idade de cada criança (0 a 11 anos):
                </p>
                {Array.from({ length: criancas }).map((_, index) => {
                  const idade = Math.min(11, Math.max(0, idadesCriancas[index] ?? 5));
                  const eGratis = idade <= 5;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 text-xs text-[#191c1d] bg-[#f8f9fa] p-2 rounded-lg border border-[#e5e7eb]"
                    >
                      <span className="font-semibold text-slate-700">Criança {index + 1}:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={11}
                          value={idade}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const valClamped = Math.min(11, Math.max(0, isNaN(val) ? 0 : val));
                            const proximo = [...idadesCriancas];
                            proximo[index] = valClamped;
                            setIdadesCriancas(proximo);
                          }}
                          disabled={enviando}
                          className="w-16 rounded-lg border border-[#c1c9bf] bg-white px-2 py-1 text-center font-bold text-slate-800 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <span className="text-[11px] text-[#717971]">anos</span>
                        {eGratis ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            Grátis (0%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            Meia (50%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <label className="flex items-center gap-2 text-xs font-semibold text-[#191c1d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={preReserva}
                  onChange={(e) => handleTogglePreReserva(e.target.checked)}
                  disabled={enviando}
                  className="h-4 w-4 accent-[#053d1e] disabled:cursor-not-allowed cursor-pointer"
                />
                Salvar como pré-reserva (sem pagamento)
              </label>

              {!preReserva && (
                <div className="space-y-2">
                  <label className="block space-y-1 text-xs font-semibold text-[#191c1d]">
                    <span>Valor da entrada/pagamento</span>
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={valorPagoTexto}
                        placeholder="R$ 0,00"
                        onChange={handleValorPagoChange}
                        disabled={enviando}
                        className="w-full rounded-lg border border-[#c1c9bf] bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold text-[#053d1e]"
                      />
                    </div>
                    <span className="text-[10px] text-[#717971] block">
                      Padrão (50%): {formatarMoeda(valorMinimoEntrada)} | Saldo no hotel: {formatarMoeda(saldoHotel)}
                    </span>
                  </label>

                  {valorPagamento < valorMinimoEntrada && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 flex items-start gap-2.5">
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
                onChange={(e) => {
                  const val = e.target.value;
                  setHospedeId(val);
                  if (val && adultos < 1 && !modoDayUse) setAdultos(1);
                }}
                disabled={enviando}
                className="w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#053d1e]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Selecione um hóspede</option>
                {hospedesOrdenados.map((hospede) => (
                  <option key={String(hospede.hospedeid)} value={String(hospede.hospedeid)}>
                    {hospede.nomecompleto} - {hospede.telefone}
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
                  <span>Data da Reserva:</span>
                  <strong>{formatarData(dataReserva)}</strong>
                </div>
                <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1">
                  <span>Pacote:</span>
                  <strong>{pacoteSelecionado?.nome || 'Não selecionado'}</strong>
                </div>
                <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1">
                  <span>Adultos:</span>
                  <strong>
                    {adultos} x {formatarMoeda(valorCalculado.valorBase)} = {formatarMoeda(valorCalculado.valorAdultos)}
                  </strong>
                </div>
                {criancas > 0 && (
                  <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1">
                    <span>Crianças (Meia):</span>
                    <strong>
                      {valorCalculado.qtdCriancasMeia > 0
                        ? `${valorCalculado.qtdCriancasMeia} x ${formatarMoeda(valorCalculado.valorBase * 0.5)} = ${formatarMoeda(valorCalculado.valorCriancas)}`
                        : `${formatarMoeda(0)} (Isento)`}
                    </strong>
                  </div>
                )}
                {eDayUse && incluirCafeManha && (
                  <div className="flex justify-between gap-2 border-b border-[#e5e7eb] pb-1 text-xs text-amber-900 bg-amber-50/80 px-2 py-1 rounded">
                    <span className="font-semibold flex items-center gap-1">
                      <Coffee className="w-3.5 h-3.5 text-amber-700" />
                      Café da manhã (Day Use):
                    </span>
                    <strong>+ {formatarMoeda(50)}</strong>
                  </div>
                )}
                <div className="flex justify-between gap-2 text-base font-bold pt-1">
                  <span>Valor total:</span>
                  <span className="text-[#053d1e]">{formatarMoeda(valorCalculado.total)}</span>
                </div>
                <div className="flex justify-between gap-2 text-sm font-semibold pt-1 border-t border-[#e5e7eb]">
                  <span>Entrada (50%):</span>
                  <span className="text-[#735c00]">
                    {formatarMoeda(preReserva ? 0 : valorMinimoEntrada)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-sm font-semibold">
                  <span>Saldo no hotel:</span>
                  <span className={saldoHotel === 0 ? 'text-[#166534]' : 'text-[#ba1a1a]'}>
                    {formatarMoeda(saldoHotel)} ({statusPagamento})
                  </span>
                </div>
                <div className="rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-[10px] text-[#717971] mt-2">
                  <p className="font-semibold text-[#191c1d]">📋 Detalhamento:</p>
                  <p className="mt-0.5 leading-relaxed">{valorCalculado.detalhe}</p>
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
                className="rounded-xl border border-[#c1c9bf] bg-white px-4 py-2 text-sm font-semibold text-[#191c1d] hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={handleSalvar}
                className="rounded-xl bg-[#053d1e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#225533] disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-2 cursor-pointer shadow-xs"
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