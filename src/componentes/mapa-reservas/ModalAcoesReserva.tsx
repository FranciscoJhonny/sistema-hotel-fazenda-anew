import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RefreshCw,
  PauseCircle,
  LogIn,
  LogOut,
  Ban,
  User,
  Calendar,
  Bed,
  CreditCard,
  AlertTriangle,
  LoaderCircle,
  CheckCircle2,
  CalendarDays,
  Users,
  Plus,
  Minus,
  Trash2,
  Coins,
  Info,
  Calculator,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Reserva, Pacote, StatusPagamento } from '../../tipos';
import { formatarData, formatarMoeda, calcularIdadeNumerica } from '../../utilitarios/formatadores';
import { reservaService } from '../../servicos/api';
import { obterClienteSupabase } from '../../lib/supabaseCliente';

// Helper universal para compatibilidade camelCase (.NET) e lowercase
const getVal = (obj: any, campoMin: string, campoCamel: string): any => {
  if (!obj) return undefined;
  return obj[campoMin] !== undefined ? obj[campoMin] : obj[campoCamel];
};

const formatarDataParaApi = (dataStr: string): string => {
  if (!dataStr) return '';
  const limpa = String(dataStr).slice(0, 10);
  return `${limpa}T12:00:00Z`;
};

// Extrai idades mencionadas no texto de observações caso os acompanhantes venham de lá
const extrairIdadesDasObservacoes = (obs: string, qtdCriancas: number): number[] => {
  if (!obs || qtdCriancas <= 0) return [];
  const regex = /(\d+)\s*anos?/gi;
  const idadesEncontradas: number[] = [];
  let match;

  while ((match = regex.exec(obs)) !== null) {
    const idade = parseInt(match[1], 10);
    if (idade >= 0 && idade <= 11) {
      idadesEncontradas.push(idade);
    }
  }

  return idadesEncontradas.slice(0, qtdCriancas);
};

interface ModalAcoesReservaProps {
  aberto: boolean;
  reserva: Reserva | null;
  onFechar: () => void;
  onAbrirTrocaQuarto: (reserva: Reserva) => void;
  onSucesso?: (mensagem: string) => void;
}

export const ModalAcoesReserva: React.FC<ModalAcoesReservaProps> = ({
  aberto,
  reserva,
  onFechar,
  onAbrirTrocaQuarto,
  onSucesso,
}) => {
  const {
    suspenderReservaComCredito,
    cancelarReserva,
    realizarCheckin,
    navegarPara,
    recarregarDados,
    atualizarStatusQuarto,
    quartos,
    reservas,
    pacotes,
    usuarioAtual,
  } = useHotel();

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhesErroModal, setDetalhesErroModal] = useState<string | null>(null);
  const [erroCopiado, setErroCopiado] = useState(false);

  // Estados para Suspensão com Crédito
  const [confirmandoSuspencao, setConfirmandoSuspencao] = useState(false);
  const [motivoSuspencao, setMotivoSuspencao] = useState('');

  // Estados para Remarcação de Datas, Quarto e Hóspedes
  const [remarcandoDatas, setRemarcandoDatas] = useState(false);
  const [novaDataEntrada, setNovaDataEntrada] = useState('');
  const [novaDataSaida, setNovaDataSaida] = useState('');
  const [novoQuartoId, setNovoQuartoId] = useState<number>(0);
  const [novoAdultos, setNovoAdultos] = useState<number>(1);
  const [novoCriancas, setNovoCriancas] = useState<number>(0);
  const [novasIdadesCriancas, setNovasIdadesCriancas] = useState<number[]>([]);
  const [novoPacoteId, setNovoPacoteId] = useState<string>('');
  const [novoValorTotal, setNovoValorTotal] = useState<number>(0);
  const [novoValorTotalCustomizado, setNovoValorTotalCustomizado] = useState<boolean>(false);
  const [novasObservacoes, setNovasObservacoes] = useState<string>('');

  // Acompanhantes carregados do banco de dados
  const [acompanhantes, setAcompanhantes] = useState<any[]>([]);
  const [carregandoAcomp, setCarregandoAcomp] = useState(false);
  const [acompanhantesRemovidosIds, setAcompanhantesRemovidosIds] = useState<number[]>([]);

  const quartosFisicos = useMemo(() => {
    return (quartos || [])
      .filter((q: any) => {
        const cod = String(getVal(q, 'codigoidentificador', 'codigoIdentificador') || '').toUpperCase();
        const num = String(getVal(q, 'numero', 'numero') || '').toUpperCase();
        const cat = String(getVal(q, 'categoria', 'categoria') || '').toUpperCase();
        const ativo = getVal(q, 'ativo', 'ativo') !== false;
        return ativo && cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE' && cat !== 'DAY USE';
      })
      .sort((a: any, b: any) => {
        const codA = String(getVal(a, 'codigoidentificador', 'codigoIdentificador') || getVal(a, 'numero', 'numero') || '');
        const codB = String(getVal(b, 'codigoidentificador', 'codigoIdentificador') || getVal(b, 'numero', 'numero') || '');
        return codA.localeCompare(codB);
      });
  }, [quartos]);

  // FILTRAR APENAS QUARTOS DISPONÍVEIS NAS NOVAS DATAS ESCOLHIDAS
  const quartosDisponiveis = useMemo(() => {
    if (!novaDataEntrada || !novaDataSaida) {
      return quartosFisicos;
    }

    const resAtualId = Number(getVal(reserva, 'reservaid', 'reservaId'));

    return quartosFisicos.filter((quarto: any) => {
      const qId = Number(getVal(quarto, 'quartoid', 'quartoId'));

      // Verifica se existe alguma outra reserva ativa ocupando este quarto no período
      const temConflito = (reservas || []).some((r: any) => {
        const rId = Number(getVal(r, 'reservaid', 'reservaId'));
        if (rId === resAtualId) return false; // Ignora a própria reserva

        const rStatus = String(getVal(r, 'statusreserva', 'statusReserva') || '').toUpperCase();
        if (rStatus === 'CANCELADA' || rStatus === 'CREDITO') return false;

        const rQuarto = Number(getVal(r, 'quartoid', 'quartoId'));
        if (rQuarto !== qId) return false;

        const rEntrada = String(getVal(r, 'dataentrada', 'dataEntrada') || '').slice(0, 10);
        const rSaida = String(getVal(r, 'datasaida', 'dataSaida') || '').slice(0, 10);
        if (!rEntrada || !rSaida) return false;

        // Regra de colisão de datas: rEntrada < novaSaida && rSaida > novaEntrada
        return rEntrada < novaDataSaida && rSaida > novaDataEntrada;
      });

      return !temConflito;
    });
  }, [quartosFisicos, reservas, novaDataEntrada, novaDataSaida, reserva]);

  // Ajusta o quarto selecionado caso ele fique indisponível após mudar as datas
  useEffect(() => {
    if (remarcandoDatas && novoQuartoId && quartosDisponiveis.length > 0) {
      const continuaDisponivel = quartosDisponiveis.some(
        (q: any) => Number(getVal(q, 'quartoid', 'quartoId')) === novoQuartoId
      );
      if (!continuaDisponivel) {
        setNovoQuartoId(0);
      }
    }
  }, [quartosDisponiveis, novoQuartoId, remarcandoDatas]);

  const pacotesAtivos = useMemo(() => {
    return (pacotes || []).filter((p: any) => getVal(p, 'ativo', 'ativo') !== false);
  }, [pacotes]);

  // Função para calcular dias de estadia
  const calcularDias = (dIni: string, dFim: string): number => {
    if (!dIni || !dFim) return 2;
    if (dIni === dFim) return 1;
    const d1 = new Date(dIni.includes('T') ? dIni : `${dIni}T12:00:00`);
    const d2 = new Date(dFim.includes('T') ? dFim : `${dFim}T12:00:00`);
    const diffTime = d2.getTime() - d1.getTime();
    const pernoites = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return pernoites > 0 ? pernoites + 1 : 1;
  };

  // Sugere o pacote de acordo com a quantidade de dias
  const sugerirPacotePorDias = (dias: number): Pacote | null => {
    if (dias === 1) {
      return (
        pacotesAtivos.find(
          (p: any) =>
            String(getVal(p, 'tipopacote', 'tipoPacote') || '').toUpperCase() === 'DAY_USE' ||
            Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 1 ||
            (p.nome || '').toLowerCase().includes('day use')
        ) || null
      );
    }
    if (dias === 2) {
      return (
        pacotesAtivos.find(
          (p: any) =>
            Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 2 ||
            ((p.nome || '').toLowerCase().includes('final de semana') &&
              !(p.nome || '').toLowerCase().includes('estendido'))
        ) || null
      );
    }
    if (dias === 3) {
      return (
        pacotesAtivos.find(
          (p: any) =>
            Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 3 ||
            (p.nome || '').toLowerCase().includes('estendido')
        ) || null
      );
    }
    if (dias === 4) {
      return (
        pacotesAtivos.find(
          (p: any) =>
            Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 4 ||
            (p.nome || '').toLowerCase().includes('feriado')
        ) || null
      );
    }
    return pacotesAtivos.find((p: any) => Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === dias) || null;
  };

  const obterValorPorPessoa = (
    pacoteIdAlvo: string,
    dEntrada: string,
    dSaida: string
  ): { pacote: Pacote | null; valorPorPessoa: number; nomePacote: string } => {
    const dias = calcularDias(dEntrada, dSaida);
    let pct: Pacote | null = null;

    if (pacoteIdAlvo) {
      pct = pacotesAtivos.find((p: any) => String(getVal(p, 'pacoteid', 'pacoteId')) === String(pacoteIdAlvo)) || null;
    }
    if (!pct) {
      pct = sugerirPacotePorDias(dias);
    }

    let val = 0;
    let nome = pct?.nome || '';

    if (pct?.valor && Number(pct.valor) > 0) {
      val = Number(pct.valor);
    } else {
      if (dias === 1) {
        val = 200;
        nome = nome || 'Day Use (1 dia)';
      } else if (dias === 2) {
        val = 550;
        nome = nome || 'Final de Semana (2 dias)';
      } else if (dias === 3) {
        val = 750;
        nome = nome || 'Final de Semana Estendido (3 dias)';
      } else if (dias === 4) {
        val = 950;
        nome = nome || 'Feriado Prolongado (4 dias)';
      } else {
        val = 950 + (dias - 4) * 200;
        nome = nome || `${dias} Dias`;
      }
    }

    return { pacote: pct, valorPorPessoa: val, nomePacote: nome };
  };

  const calcularTotalFormula = (
    adultos: number,
    criancas: number,
    valorBase: number,
    idades: number[] = []
  ): number => {
    const valAdultos = adultos * valorBase;
    let valCriancas = 0;
    for (let i = 0; i < criancas; i++) {
      const idade = idades[i] ?? 6;
      if (idade > 5) {
        valCriancas += valorBase * 0.5;
      }
    }
    return valAdultos + valCriancas;
  };

  const recalcularTotal = (
    ad: number,
    cr: number,
    pctId: string,
    dEntrada: string,
    dSaida: string,
    idades: number[]
  ) => {
    const { valorPorPessoa } = obterValorPorPessoa(pctId, dEntrada, dSaida);
    const total = calcularTotalFormula(ad, cr, valorPorPessoa, idades);
    setNovoValorTotal(total);
    setNovoValorTotalCustomizado(false);
  };

  useEffect(() => {
    if (aberto && reserva) {
      setConfirmandoSuspencao(false);
      setMotivoSuspencao('');
      setRemarcandoDatas(false);
      setErro(null);
      setDetalhesErroModal(null);
      setCarregando(false);

      const dEntrada = String(getVal(reserva, 'dataentrada', 'dataEntrada') || '').slice(0, 10);
      const dSaida = String(getVal(reserva, 'datasaida', 'dataSaida') || '').slice(0, 10);
      setNovaDataEntrada(dEntrada);
      setNovaDataSaida(dSaida);
      setNovoQuartoId(Number(getVal(reserva, 'quartoid', 'quartoId') || 0));

      const ad = Math.max(1, Number(getVal(reserva, 'adultos', 'adultos') || 1));
      const cr = Math.max(0, Number(getVal(reserva, 'criancas', 'criancas') || 0));
      setNovoAdultos(ad);
      setNovoCriancas(cr);
      setNovoPacoteId(String(getVal(reserva, 'pacoteid', 'pacoteId') || ''));
      setNovoValorTotal(Number(getVal(reserva, 'valortotal', 'valorTotal') || 0));
      setNovoValorTotalCustomizado(false);
      setNovasObservacoes(getVal(reserva, 'observacoes', 'observacoes') || '');

      const obsTexto = getVal(reserva, 'observacoes', 'observacoes') || '';
      const idadesExtraidas = extrairIdadesDasObservacoes(obsTexto, cr);

      if (idadesExtraidas.length > 0) {
        while (idadesExtraidas.length < cr) {
          idadesExtraidas.push(6);
        }
        setNovasIdadesCriancas(idadesExtraidas);
      } else {
        const idadesIniciais = Array.from({ length: cr }).map(() => 6);
        setNovasIdadesCriancas(idadesIniciais);
      }

      setAcompanhantesRemovidosIds([]);
    }
  }, [aberto, reserva]);

  // Carrega acompanhantes vinculados da reserva
  useEffect(() => {
    const carregarAcompanhantesDaReserva = async () => {
      if (!aberto || !reserva) {
        setAcompanhantes([]);
        setAcompanhantesRemovidosIds([]);
        return;
      }

      setCarregandoAcomp(true);
      try {
        const supabase = obterClienteSupabase();
        let validos: any[] = [];

        if (supabase) {
          const resId = getVal(reserva, 'reservaid', 'reservaId');
          const hospId = getVal(reserva, 'hospedeid', 'hospedeId');
          const cadId = getVal(reserva, 'cadastroid', 'cadastroId');

          let { data: listaAcomp } = await supabase
            .from('acompanhante')
            .select('*')
            .eq('reservaid', resId)
            .eq('ativo', true);

          if (!listaAcomp || listaAcomp.length === 0) {
            const { data: acompFnrh } = await supabase
              .from('cadastro_fnrh_acompanhante')
              .select('*')
              .eq('reservaid', resId);
            listaAcomp = acompFnrh || [];
          }

          if ((!listaAcomp || listaAcomp.length === 0) && cadId) {
            const { data: acompCad } = await supabase
              .from('cadastro_fnrh_acompanhante')
              .select('*')
              .eq('cadastroid', cadId);
            listaAcomp = acompCad || [];
          }

          if ((!listaAcomp || listaAcomp.length === 0) && hospId) {
            const { data: acompHosp } = await supabase
              .from('acompanhante')
              .select('*')
              .eq('cadastroid', hospId)
              .eq('ativo', true);
            if (acompHosp && acompHosp.length > 0) {
              listaAcomp = acompHosp;
            }
          }

          validos = listaAcomp || [];
          setAcompanhantes(validos);
        }

        if (validos.length > 0) {
          const idadesCalc: number[] = [];
          validos.forEach((a) => {
            const dtNasc = getVal(a, 'datanascimento', 'dataNascimento');
            if (dtNasc) {
              const age = calcularIdadeNumerica(dtNasc);
              if (age >= 0 && age <= 11) {
                idadesCalc.push(age);
              }
            } else if (getVal(a, 'menoridade', 'menoridade')) {
              idadesCalc.push(6);
            }
          });

          if (idadesCalc.length > 0) {
            setNovasIdadesCriancas(idadesCalc);
          }
        }
      } catch (e) {
        console.warn('Aviso ao carregar acompanhantes:', e);
      } finally {
        setCarregandoAcomp(false);
      }
    };

    carregarAcompanhantesDaReserva();
  }, [aberto, reserva]);

  const handleDataEntradaChange = (val: string) => {
    setNovaDataEntrada(val);
    if (!val) return;

    const dEntrada = new Date(val.includes('T') ? val : `${val}T12:00:00`);
    dEntrada.setDate(dEntrada.getDate() + 1);
    const saidaCalculada = dEntrada.toISOString().split('T')[0];
    setNovaDataSaida(saidaCalculada);

    if (!novoValorTotalCustomizado) {
      recalcularTotal(novoAdultos, novoCriancas, novoPacoteId, val, saidaCalculada, novasIdadesCriancas);
    }
  };

  const handleDataSaidaChange = (val: string) => {
    setNovaDataSaida(val);
    if (!val || !novaDataEntrada) return;

    if (!novoValorTotalCustomizado) {
      recalcularTotal(novoAdultos, novoCriancas, novoPacoteId, novaDataEntrada, val, novasIdadesCriancas);
    }
  };

  const handlePacoteChange = (pctId: string) => {
    setNovoPacoteId(pctId);
    recalcularTotal(novoAdultos, novoCriancas, pctId, novaDataEntrada, novaDataSaida, novasIdadesCriancas);
  };

  const handleAlterarAdultos = (qtd: number) => {
    const valClamped = Math.max(1, qtd);
    setNovoAdultos(valClamped);
    recalcularTotal(valClamped, novoCriancas, novoPacoteId, novaDataEntrada, novaDataSaida, novasIdadesCriancas);
  };

  const handleAlterarCriancas = (qtd: number) => {
    const valClamped = Math.max(0, qtd);
    setNovoCriancas(valClamped);
    let idades = [...novasIdadesCriancas];
    if (valClamped > idades.length) {
      while (idades.length < valClamped) idades.push(6);
    } else {
      idades = idades.slice(0, valClamped);
    }
    setNovasIdadesCriancas(idades);
    recalcularTotal(novoAdultos, valClamped, novoPacoteId, novaDataEntrada, novaDataSaida, idades);
  };

  const handleAlterarIdadeCrianca = (index: number, novaIdade: number) => {
    const idades = [...novasIdadesCriancas];
    idades[index] = novaIdade;
    setNovasIdadesCriancas(idades);
    recalcularTotal(novoAdultos, novoCriancas, novoPacoteId, novaDataEntrada, novaDataSaida, idades);
  };

  const handleRemoverAcompanhante = (acomp: any) => {
    const id = Number(acomp.acompanhanteid || acomp.id);
    setAcompanhantesRemovidosIds((prev) => [...prev, id]);
    setAcompanhantes((prev) => prev.filter((a) => Number(a.acompanhanteid || a.id) !== id));

    if (acomp.menoridade && novoCriancas > 0) {
      const proximoCriancas = Math.max(0, novoCriancas - 1);
      setNovoCriancas(proximoCriancas);
      recalcularTotal(
        novoAdultos,
        proximoCriancas,
        novoPacoteId,
        novaDataEntrada,
        novaDataSaida,
        novasIdadesCriancas.slice(0, proximoCriancas)
      );
    } else if (novoAdultos > 1) {
      const proximoAdultos = Math.max(1, novoAdultos - 1);
      setNovoAdultos(proximoAdultos);
      recalcularTotal(
        proximoAdultos,
        novoCriancas,
        novoPacoteId,
        novaDataEntrada,
        novaDataSaida,
        novasIdadesCriancas
      );
    }
  };

  const infoTarifa = useMemo(() => {
    return obterValorPorPessoa(novoPacoteId, novaDataEntrada, novaDataSaida);
  }, [novoPacoteId, novaDataEntrada, novaDataSaida, pacotesAtivos]);

  const detalhamentoCalculo = useMemo(() => {
    const { valorPorPessoa, nomePacote } = infoTarifa;
    const dias = calcularDias(novaDataEntrada, novaDataSaida);
    const partes: string[] = [];

    partes.push(`${novoAdultos} adulto(s) x ${formatarMoeda(valorPorPessoa)}`);

    if (novoCriancas > 0) {
      let gratiss = 0;
      let meias = 0;
      for (let i = 0; i < novoCriancas; i++) {
        const id = novasIdadesCriancas[i] ?? 6;
        if (id <= 5) gratiss++;
        else meias++;
      }
      if (gratiss > 0) partes.push(`${gratiss} criança(s) grátis (0%)`);
      if (meias > 0) partes.push(`${meias} criança(s) meia (${formatarMoeda(valorPorPessoa * 0.5)})`);
    }

    return `${nomePacote ? `Pacote: ${nomePacote} (${dias} dias) • ` : ''}${partes.join(' + ')}`;
  }, [infoTarifa, novoAdultos, novoCriancas, novasIdadesCriancas, novaDataEntrada, novaDataSaida]);

  const valorPagoNum = Number(getVal(reserva, 'valorpago', 'valorPago') || 0);
  const saldoRestante = Number((novoValorTotal - valorPagoNum).toFixed(2));

  if (!aberto || !reserva) return null;

  const statusAtual = String(getVal(reserva, 'statusreserva', 'statusReserva') || '').toUpperCase();
  const estaHospedado = statusAtual === 'HOSPEDADO';
  const podeCheckin = statusAtual === 'RESERVADO' || statusAtual === 'PRE_RESERVA';
  const resId = Number(getVal(reserva, 'reservaid', 'reservaId'));
  const hospedeNome = getVal(reserva, 'hospedenome', 'hospedeNome') || 'Hóspede';
  const codigoReserva = getVal(reserva, 'codigo', 'codigo') || '';

  const handleConfirmarRemarcacao = async () => {
    setErro(null);
    setDetalhesErroModal(null);

    if (!novaDataEntrada || !novaDataSaida) {
      setErro('Informe as novas datas de entrada e saída.');
      return;
    }

    if (novaDataEntrada >= novaDataSaida) {
      setErro('A data de saída deve ser posterior à data de entrada.');
      return;
    }

    const quartoDestinoId = novoQuartoId || Number(getVal(reserva, 'quartoid', 'quartoId'));
    if (!quartoDestinoId) {
      setErro('Selecione uma acomodação disponível para a reserva.');
      return;
    }

    try {
      setCarregando(true);

      const conflito = (reservas || []).find((r: any) => {
        const rQuarto = Number(getVal(r, 'quartoid', 'quartoId'));
        const rId = Number(getVal(r, 'reservaid', 'reservaId'));
        const rStatus = String(getVal(r, 'statusreserva', 'statusReserva') || '').toUpperCase();
        const rEntrada = String(getVal(r, 'dataentrada', 'dataEntrada') || '').slice(0, 10);
        const rSaida = String(getVal(r, 'datasaida', 'dataSaida') || '').slice(0, 10);

        return (
          rQuarto === Number(quartoDestinoId) &&
          rId !== resId &&
          ['RESERVADO', 'HOSPEDADO', 'PRE_RESERVA'].includes(rStatus) &&
          rEntrada < novaDataSaida &&
          rSaida > novaDataEntrada
        );
      });

      if (conflito) {
        const qConflito: any = (quartos || []).find((q: any) => Number(getVal(q, 'quartoid', 'quartoId')) === quartoDestinoId);
        const codQuarto = getVal(qConflito, 'codigoidentificador', 'codigoIdentificador') || getVal(qConflito, 'numero', 'numero') || quartoDestinoId;
        const codConflito = getVal(conflito, 'codigo', 'codigo');
        setErro(`O Quarto #${codQuarto} já possui outra reserva (${codConflito}) no período selecionado.`);
        return;
      }

      const quartoEscolhido: any = (quartos || []).find((q: any) => Number(getVal(q, 'quartoid', 'quartoId')) === quartoDestinoId);
      const agora = new Date().toISOString();
      const novoSaldo = Number((novoValorTotal - valorPagoNum).toFixed(2));
      const novoStatusPagamento: StatusPagamento =
        novoSaldo <= 0 ? 'PAGO' : valorPagoNum > 0 ? 'PARCIAL' : 'PENDENTE';

      const resumoSaldoTexto =
        novoSaldo > 0
          ? `Saldo a pagar: ${formatarMoeda(novoSaldo)}`
          : novoSaldo < 0
          ? `Crédito excedente para consumo ou devolução: ${formatarMoeda(Math.abs(novoSaldo))}`
          : 'Reserva 100% quitada com crédito';

      const codQuartoEscolhido = getVal(quartoEscolhido, 'codigoidentificador', 'codigoIdentificador') || getVal(quartoEscolhido, 'numero', 'numero') || quartoDestinoId;

      const notaAutomatica = `[Remarcação em ${new Date().toLocaleDateString('pt-BR')}: ${novoAdultos} adulto(s)${
        novoCriancas > 0 ? `, ${novoCriancas} criança(s)` : ''
      } no Quarto #${codQuartoEscolhido} (${formatarData(
        novaDataEntrada
      )} a ${formatarData(novaDataSaida)}). Pacote: ${infoTarifa.nomePacote || 'Padrão'}. Novo Total: ${formatarMoeda(
        novoValorTotal
      )} | Crédito aproveitado: ${formatarMoeda(valorPagoNum)} | ${resumoSaldoTexto}]`;

      let observacoesFinal = novasObservacoes.trim();
      if (!observacoesFinal.includes(notaAutomatica)) {
        observacoesFinal = observacoesFinal ? `${observacoesFinal}\n${notaAutomatica}` : notaAutomatica;
      }

      const statusFinal = statusAtual === 'CREDITO' ? 'RESERVADO' : (statusAtual || 'RESERVADO');
      const hospedeId = Number(getVal(reserva, 'hospedeid', 'hospedeId'));
      const cadastroId = getVal(reserva, 'cadastroid', 'cadastroId');
      const diasCalculados = Math.max(1, calcularDias(novaDataEntrada, novaDataSaida));
      const valorDiariaCalculado = Number((novoValorTotal / diasCalculados).toFixed(2));

      const updatePayload: any = {
        reservaId: resId,
        codigo: codigoReserva,
        quartoId: Number(quartoDestinoId),
        hospedeId: hospedeId,
        cadastroId: cadastroId ? Number(cadastroId) : null,
        pacoteId: novoPacoteId ? Number(novoPacoteId) : null,
        dataEntrada: formatarDataParaApi(novaDataEntrada),
        dataSaida: formatarDataParaApi(novaDataSaida),
        dataReserva: formatarDataParaApi(String(getVal(reserva, 'datareserva', 'dataReserva') || novaDataEntrada).slice(0, 10)),
        statusReserva: statusFinal,
        tipoAtendimento: getVal(reserva, 'tipoatendimento', 'tipoAtendimento') || 'HOSPEDAGEM',
        adultos: Number(novoAdultos),
        criancas: Number(novoCriancas),
        valorDiaria: valorDiariaCalculado,
        valorTotal: Number(novoValorTotal),
        valorPago: valorPagoNum,
        saldo: novoSaldo,
        formaPagamento: getVal(reserva, 'formapagamento', 'formaPagamento') || 'PIX',
        statusPagamento: novoStatusPagamento,
        observacoes: observacoesFinal.slice(0, 1000),
        observacoesCheckout: (getVal(reserva, 'observacoes_checkout', 'observacoesCheckout') || '').slice(0, 1000),
        ativo: true,
      };

      const resUpdate = await reservaService.atualizar(resId, updatePayload);

      if (!resUpdate.sucesso) {
        const respAny = resUpdate as any;
        let mensagemErroFormatada = resUpdate.erro || 'Erro ao atualizar dados da reserva.';

        const errosObj = respAny?.detalhes?.errors || respAny?.dados?.errors || respAny?.errors;
        if (errosObj && typeof errosObj === 'object') {
          const listaErros = Object.entries(errosObj)
            .map(([campo, msgs]: [string, any]) => `• ${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          mensagemErroFormatada = `Falha na validação do servidor:\n${listaErros}`;
        }

        setErro(mensagemErroFormatada);
        setDetalhesErroModal(JSON.stringify(resUpdate, null, 2));
        return;
      }

      if (acompanhantesRemovidosIds.length > 0) {
        const supabase = obterClienteSupabase();
        if (supabase) {
          for (const acompId of acompanhantesRemovidosIds) {
            try {
              await supabase
                .from('acompanhante')
                .update({ ativo: false, reservaid: null, dataoperacao: agora })
                .eq('acompanhanteid', acompId);
            } catch (e) {
              console.warn('Aviso ao desvincular acompanhante:', e);
            }
          }
        }
      }

      const quartoAntigoId = Number(getVal(reserva, 'quartoid', 'quartoId'));
      if (statusAtual === 'CREDITO' || quartoAntigoId !== Number(quartoDestinoId)) {
        await atualizarStatusQuarto(quartoDestinoId, 'RESERVADO');
        if (quartoAntigoId && quartoAntigoId !== Number(quartoDestinoId) && statusAtual !== 'CREDITO') {
          await atualizarStatusQuarto(quartoAntigoId, 'DISPONIVEL');
        }
      }

      await recarregarDados();

      if (onSucesso) {
        const statusMsg = statusAtual === 'CREDITO' ? ' reativada com status RESERVADO e' : '';
        onSucesso(
          `Reserva ${codigoReserva}${statusMsg} remarcada com sucesso para ${formatarData(
            novaDataEntrada
          )} até ${formatarData(novaDataSaida)} (${novoAdultos} adulto(s)${
            novoCriancas > 0 ? `, ${novoCriancas} criança(s)` : ''
          }) no Quarto #${codQuartoEscolhido}! Novo Saldo: ${
            novoSaldo >= 0 ? formatarMoeda(novoSaldo) : `Crédito de ${formatarMoeda(Math.abs(novoSaldo))}`
          }.`
        );
      }
      onFechar();
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao remarcar datas.');
      setDetalhesErroModal(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } finally {
      setCarregando(false);
    }
  };

  const handleSuspenderCredito = async () => {
    setErro(null);
    try {
      setCarregando(true);
      const res = await suspenderReservaComCredito(resId, motivoSuspencao.trim());
      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem || 'Não foi possível suspender a reserva.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCheckin = async () => {
    setErro(null);
    try {
      setCarregando(true);
      const res = await realizarCheckin(resId);
      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem);
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao realizar check-in.');
    } finally {
      setCarregando(false);
    }
  };

  const handleCheckout = () => {
    onFechar();
    navegarPara('checkout');
  };

  const handleCancelar = async () => {
    if (!window.confirm(`Tem certeza de que deseja cancelar a reserva ${codigoReserva}?`)) return;
    setErro(null);
    try {
      setCarregando(true);
      const res = await cancelarReserva(resId, 'Cancelada no Mapa de Reservas');
      if (res.sucesso) {
        if (onSucesso) onSucesso(res.mensagem);
        onFechar();
      } else {
        setErro(res.mensagem);
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao cancelar reserva.');
    } finally {
      setCarregando(false);
    }
  };

  const copiarErroParaClipboard = () => {
    const texto = `${erro}\n\nDetalhes Técnicos:\n${detalhesErroModal}`;
    navigator.clipboard.writeText(texto);
    setErroCopiado(true);
    setTimeout(() => setErroCopiado(false), 3000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Cabeçalho */}
          <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bed className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-base font-bold font-['Manrope']">
                  Detalhes & Ações da Reserva
                </h2>
                <p className="text-xs text-white/80">
                  Código {codigoReserva} • {hospedeNome}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo com Scroll */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {erro && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 font-bold text-red-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span className="whitespace-pre-line">{erro}</span>
                  </div>
                  {detalhesErroModal && (
                    <button
                      type="button"
                      onClick={copiarErroParaClipboard}
                      className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                      title="Copiar erro completo para depuração"
                    >
                      {erroCopiado ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      <span>{erroCopiado ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Resumo da Reserva */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#053d1e]" />
                  {hospedeNome}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    statusAtual === 'CREDITO'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-[#e6f4ea] text-[#053d1e]'
                  }`}
                >
                  {statusAtual === 'CREDITO' ? 'CRÉDITO RETIDO' : statusAtual}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] pt-2 border-t border-slate-200/70">
                <div>
                  <span className="text-slate-400 block">Quarto Anterior:</span>
                  <span className="font-bold text-slate-800 text-xs">
                    Quarto #{getVal(reserva, 'quartonumero', 'quartoNumero') || 'S/N'}{' '}
                    {getVal(reserva, 'quartocategoria', 'quartoCategoria') ? `(${getVal(reserva, 'quartocategoria', 'quartoCategoria')})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hóspedes Registrados:</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {getVal(reserva, 'adultos', 'adultos') || 1} adulto(s)
                    {getVal(reserva, 'criancas', 'criancas') ? `, ${getVal(reserva, 'criancas', 'criancas')} criança(s)` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Período Contratado:</span>
                  <span className="font-bold text-[#053d1e] text-xs">
                    {formatarData(getVal(reserva, 'dataentrada', 'dataEntrada'))} até{' '}
                    {formatarData(getVal(reserva, 'datasaida', 'dataSaida'))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Valor Total:</span>
                  <span className="font-bold text-slate-800">{formatarMoeda(getVal(reserva, 'valortotal', 'valorTotal'))}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Valor Já Pago (Crédito):</span>
                  <span className="font-bold text-emerald-700">{formatarMoeda(valorPagoNum)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Saldo Restante:</span>
                  <span
                    className={`font-bold ${
                      Number(getVal(reserva, 'saldo', 'saldo') || 0) > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatarMoeda(getVal(reserva, 'saldo', 'saldo'))}
                  </span>
                </div>
              </div>

              {reserva.observacoes && (
                <div className="p-2.5 bg-slate-100/70 rounded-lg text-[11px] text-slate-700 border border-slate-200">
                  <span className="font-bold text-slate-900">Observações: </span>
                  {reserva.observacoes}
                </div>
              )}
            </div>

            {/* PAINEL 1: REMARCAÇÃO COM RECÁLCULO */}
            {remarcandoDatas ? (
              <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-2 text-[#053d1e] font-bold text-xs">
                    <CalendarDays className="w-4 h-4 text-[#053d1e] shrink-0" />
                    <span>
                      {statusAtual === 'CREDITO'
                        ? 'Remarcar / Reativar Reserva em Crédito'
                        : 'Remarcar Datas da Reserva'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#053d1e] text-white px-2 py-0.5 rounded-full">
                    Crédito Retido: {formatarMoeda(valorPagoNum)}
                  </span>
                </div>

                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Altere datas, acomodação e quantidade de hóspedes. O crédito pago de{' '}
                  <strong>{formatarMoeda(valorPagoNum)}</strong> será mantido e o saldo recalculado automaticamente.
                </p>

                {/* Linha 1: Datas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nova Data de Entrada:
                    </label>
                    <input
                      type="date"
                      value={novaDataEntrada}
                      onChange={(e) => handleDataEntradaChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-bold text-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nova Data de Saída:
                    </label>
                    <input
                      type="date"
                      min={novaDataEntrada}
                      value={novaDataSaida}
                      onChange={(e) => handleDataSaidaChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-bold text-[#053d1e]"
                    />
                  </div>
                </div>

                {/* Linha 2: Acomodação (com filtro de disponibilidade) e Pacote */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Nova Acomodação / Quarto:
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700">
                        ({quartosDisponiveis.length} disponíveis)
                      </span>
                    </div>
                    <select
                      value={novoQuartoId}
                      onChange={(e) => setNovoQuartoId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-bold text-[#053d1e]"
                    >
                      <option value={0}>Selecione uma acomodação livre...</option>
                      {quartosDisponiveis.map((q: any) => {
                        const qId = Number(getVal(q, 'quartoid', 'quartoId'));
                        const cod = getVal(q, 'codigoidentificador', 'codigoIdentificador') || getVal(q, 'numero', 'numero');
                        const cat = getVal(q, 'categoria', 'categoria');
                        return (
                          <option key={qId} value={qId}>
                            Quarto #{cod} — {cat}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pacote Promocional / Tarifa:
                    </label>
                    <select
                      value={novoPacoteId}
                      onChange={(e) => handlePacoteChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-bold text-[#053d1e]"
                    >
                      <option value="">Detectar automático pelos dias...</option>
                      {pacotesAtivos.map((p: any) => {
                        const pId = String(getVal(p, 'pacoteid', 'pacoteId'));
                        const pNome = getVal(p, 'nome', 'nome');
                        const pValor = Number(getVal(p, 'valor', 'valor') || 0);
                        const pDias = getVal(p, 'quantidadedias', 'quantidadeDias');
                        return (
                          <option key={pId} value={pId}>
                            {pNome} ({formatarMoeda(pValor)}/pessoa • {pDias}d)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Linha 3: Composição de Hóspedes */}
                <div className="bg-white rounded-xl border border-[#c1c9bf] p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#053d1e]" />
                      Composição de Hóspedes ({novoAdultos + novoCriancas} pessoas)
                    </span>
                    <span className="text-[11px] text-slate-600 font-semibold">
                      Tarifa: <strong>{formatarMoeda(infoTarifa.valorPorPessoa)}</strong> / adulto
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Adultos</span>
                        <span className="block text-[10px] text-slate-500">12+ anos (Integral)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAlterarAdultos(novoAdultos - 1)}
                          disabled={novoAdultos <= 1}
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-extrabold text-xs text-slate-900 w-5 text-center">
                          {novoAdultos}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAlterarAdultos(novoAdultos + 1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Crianças</span>
                        <span className="block text-[10px] text-slate-500">0 a 11 anos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAlterarCriancas(novoCriancas - 1)}
                          disabled={novoCriancas <= 0}
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-extrabold text-xs text-slate-900 w-5 text-center">
                          {novoCriancas}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAlterarCriancas(novoCriancas + 1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Idades individuais das crianças */}
                  {novoCriancas > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-600 block">
                        Idade de cada criança (0 a 5 anos = Grátis • 6 a 11 anos = Meia):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: novoCriancas }).map((_, idx) => {
                          const idade = novasIdadesCriancas[idx] ?? 6;
                          const eGratis = idade <= 5;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 text-xs"
                            >
                              <span className="text-[10px] text-slate-500 font-semibold">Criança {idx + 1}:</span>
                              <select
                                value={idade}
                                onChange={(e) => handleAlterarIdadeCrianca(idx, Number(e.target.value))}
                                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold"
                              >
                                {Array.from({ length: 12 }).map((_, a) => (
                                  <option key={a} value={a}>
                                    {a} {a === 1 ? 'ano' : 'anos'} {a <= 5 ? '(Grátis)' : '(Meia)'}
                                  </option>
                                ))}
                              </select>
                              <span
                                className={`text-[10px] font-bold ${
                                  eGratis ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {eGratis ? 'Grátis' : 'Meia (50%)'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Acompanhantes vinculados */}
                  {acompanhantes.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600">
                          Acompanhantes vinculados no sistema ({acompanhantes.length}):
                        </span>
                        <span className="text-[10px] text-slate-400">Clique para retirar da reserva</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {acompanhantes.map((acomp) => (
                          <div
                            key={acomp.acompanhanteid || acomp.id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-800 truncate">
                                {acomp.nomecompleto}
                              </span>
                              {acomp.menoridade && (
                                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 rounded shrink-0">
                                  Menor
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoverAcompanhante(acomp)}
                              title="Retirar este acompanhante da reserva remarcada"
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Retirar</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Linha 4: Valor Total */}
                <div className="bg-white rounded-xl border border-[#c1c9bf] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-800">
                      Valor Total da Hospedagem (R$):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        recalcularTotal(
                          novoAdultos,
                          novoCriancas,
                          novoPacoteId,
                          novaDataEntrada,
                          novaDataSaida,
                          novasIdadesCriancas
                        )
                      }
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Recalcular pelo Pacote</span>
                    </button>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    value={novoValorTotal}
                    onChange={(e) => {
                      setNovoValorTotal(Number(e.target.value) || 0);
                      setNovoValorTotalCustomizado(true);
                    }}
                    className="w-full px-3 py-1.5 text-base bg-slate-50 border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-extrabold text-[#053d1e]"
                  />
                  <p className="text-[10px] text-slate-500">{detalhamentoCalculo}</p>
                </div>

                {/* Linha 5: Demonstrativo Financeiro */}
                <div className="rounded-xl border border-emerald-200 bg-white p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-700" />
                      Balanço Financeiro da Remarcação
                    </span>
                    {novoValorTotalCustomizado && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Valor Editado Manualmente
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Novo Total</span>
                      <span className="font-['Manrope'] font-extrabold text-xs text-slate-900 block mt-0.5">
                        {formatarMoeda(novoValorTotal)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 block">Crédito Retido</span>
                      <span className="font-['Manrope'] font-extrabold text-xs text-emerald-800 block mt-0.5">
                        {formatarMoeda(valorPagoNum)}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        saldoRestante > 0
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : saldoRestante < 0
                          ? 'bg-purple-50 border-purple-300 text-purple-900'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      }`}
                    >
                      <span className="text-[10px] block font-semibold">
                        {saldoRestante > 0
                          ? 'Saldo a Pagar'
                          : saldoRestante < 0
                          ? 'Crédito Excedente'
                          : 'Saldo Restante'}
                      </span>
                      <span className="font-['Manrope'] font-extrabold text-xs block mt-0.5">
                        {saldoRestante > 0
                          ? formatarMoeda(saldoRestante)
                          : saldoRestante < 0
                          ? formatarMoeda(Math.abs(saldoRestante))
                          : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha 6: Observações */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Observações da Reserva:
                  </label>
                  <textarea
                    rows={2}
                    value={novasObservacoes}
                    onChange={(e) => setNovasObservacoes(e.target.value)}
                    placeholder="Informações adicionais da remarcação..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] text-slate-800"
                  />
                </div>

                {/* Botões do Formulário de Remarcação */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => setRemarcandoDatas(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={carregando}
                    onClick={handleConfirmarRemarcacao}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#053d1e] hover:bg-[#043017] cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                  >
                    {carregando ? (
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Salvar Novo Período & Recalcular Saldo</span>
                  </button>
                </div>
              </div>
            ) : confirmandoSuspencao ? (
              /* PAINEL 2: SUSPENSÃO COM CRÉDITO */
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                  <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Suspender Reserva & Gerar Crédito</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Ao suspender a reserva, o quarto físico será imediatamente liberado. O valor de{' '}
                  <strong>{formatarMoeda(valorPagoNum)}</strong> permanecerá salvo como crédito ativo para o hóspede.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Motivo da Suspensão / Observação (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Imprevisto pessoal do cliente / solicitação de adiamento"
                    value={motivoSuspencao}
                    onChange={(e) => setMotivoSuspencao(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmandoSuspencao(false)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={carregando}
                    onClick={handleSuspenderCredito}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {carregando ? (
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PauseCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Confirmar Crédito ({formatarMoeda(valorPagoNum)})</span>
                  </button>
                </div>
              </div>
            ) : (
              /* BOTÕES DE AÇÕES PRINCIPAIS */
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-700 block mb-1">Ações Operacionais Disponíveis:</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRemarcandoDatas(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <CalendarDays className="w-4 h-4 text-[#053d1e] shrink-0" />
                    <span>
                      {statusAtual === 'CREDITO' ? '📅 Remarcar / Reativar' : '📅 Remarcar Datas'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onFechar();
                      onAbrirTrocaQuarto(reserva);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-4 h-4 text-[#053d1e] shrink-0" />
                    <span>🔄 Trocar Quarto</span>
                  </button>

                  {statusAtual !== 'CREDITO' && (
                    <button
                      type="button"
                      onClick={() => setConfirmandoSuspencao(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>⏸️ Suspender (Crédito)</span>
                    </button>
                  )}

                  {podeCheckin && (
                    <button
                      type="button"
                      disabled={carregando}
                      onClick={handleCheckin}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <LogIn className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Realizar Check-in</span>
                    </button>
                  )}

                  {estaHospedado && (
                    <button
                      type="button"
                      onClick={handleCheckout}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <LogOut className="w-4 h-4 text-white shrink-0" />
                      <span>Ir para Check-out</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={carregando}
                    onClick={handleCancelar}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Ban className="w-4 h-4 text-red-700 shrink-0" />
                    <span>Cancelar Reserva</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETALHADO DE ERRO HTTP 400 / BACKEND */}
      {detalhesErroModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-rose-300 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-100 pb-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Erro de Validação da API (.NET 8)</span>
              </div>
              <button
                type="button"
                onClick={() => setDetalhesErroModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              O backend rejeitou a requisição. Os campos com erro foram:
            </p>

            <div className="max-h-60 overflow-y-auto bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {detalhesErroModal}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={copiarErroParaClipboard}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {erroCopiado ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{erroCopiado ? 'Copiado para Clipboard!' : 'Copiar JSON do Erro'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDetalhesErroModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#053d1e] text-white text-xs font-bold hover:bg-[#043017] cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};