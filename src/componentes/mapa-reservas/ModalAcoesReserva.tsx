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
  Tag
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Reserva, Pacote, StatusPagamento } from '../../tipos';
import { formatarData, formatarMoeda } from '../../utilitarios/formatadores';
import { reservaService } from '../../servicos/api';
import { obterClienteSupabase } from '../../lib/supabaseCliente';

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
      .filter((q) => {
        const cod = String(q.codigoidentificador || '').toUpperCase();
        const num = String(q.numero || '').toUpperCase();
        const cat = String(q.categoria || '').toUpperCase();
        return q.ativo !== false && cod !== 'DAY_USE' && num !== 'DU' && num !== 'DAY USE' && cat !== 'DAY USE';
      })
      .sort((a, b) => {
        const codA = a.codigoidentificador || a.numero || '';
        const codB = b.codigoidentificador || b.numero || '';
        return codA.localeCompare(codB);
      });
  }, [quartos]);

  const pacotesAtivos = useMemo(() => {
    return (pacotes || []).filter((p) => p.ativo !== false);
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
          (p) =>
            String(p.tipopacote || '').toUpperCase() === 'DAY_USE' ||
            Number(p.quantidadedias) === 1 ||
            (p.nome || '').toLowerCase().includes('day use')
        ) || null
      );
    }
    if (dias === 2) {
      return (
        pacotesAtivos.find(
          (p) =>
            Number(p.quantidadedias) === 2 ||
            ((p.nome || '').toLowerCase().includes('final de semana') &&
              !(p.nome || '').toLowerCase().includes('estendido'))
        ) || null
      );
    }
    if (dias === 3) {
      return (
        pacotesAtivos.find(
          (p) =>
            Number(p.quantidadedias) === 3 ||
            (p.nome || '').toLowerCase().includes('estendido')
        ) || null
      );
    }
    if (dias === 4) {
      return (
        pacotesAtivos.find(
          (p) =>
            Number(p.quantidadedias) === 4 ||
            (p.nome || '').toLowerCase().includes('feriado')
        ) || null
      );
    }
    return pacotesAtivos.find((p) => Number(p.quantidadedias) === dias) || null;
  };

  // Obtém o valor base por pessoa e informações do pacote
  const obterValorPorPessoa = (
    pacoteIdAlvo: string,
    dEntrada: string,
    dSaida: string
  ): { pacote: Pacote | null; valorPorPessoa: number; nomePacote: string } => {
    const dias = calcularDias(dEntrada, dSaida);
    let pct: Pacote | null = null;

    if (pacoteIdAlvo) {
      pct = pacotesAtivos.find((p) => String(p.pacoteid) === String(pacoteIdAlvo)) || null;
    }
    if (!pct) {
      pct = sugerirPacotePorDias(dias);
    }

    let val = 0;
    let nome = pct?.nome || '';

    if (pct?.valor && Number(pct.valor) > 0) {
      val = Number(pct.valor);
    } else {
      // Tabela padrão de referência da fazenda
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

  // Calcula o valor total com base nas regras oficiais da fazenda
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
      if (idade <= 5) {
        // 0 a 5 anos: Grátis (0%)
      } else {
        // 6 a 11 anos: Meia (50%)
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

  // Inicialização ao abrir modal ou trocar reserva selecionada
  useEffect(() => {
    if (aberto && reserva) {
      setConfirmandoSuspencao(false);
      setMotivoSuspencao('');
      // setRemarcandoDatas(reserva.statusreserva === 'CREDITO');
      setRemarcandoDatas(false);
      setErro(null);
      setCarregando(false);

      const dEntrada = (reserva.dataentrada || '').split('T')[0];
      const dSaida = (reserva.datasaida || '').split('T')[0];
      setNovaDataEntrada(dEntrada);
      setNovaDataSaida(dSaida);
      setNovoQuartoId(Number(reserva.quartoid || 0));

      const ad = Math.max(1, Number(reserva.adultos || 1));
      const cr = Math.max(0, Number(reserva.criancas || 0));
      setNovoAdultos(ad);
      setNovoCriancas(cr);
      setNovoPacoteId(reserva.pacoteid ? String(reserva.pacoteid) : '');
      setNovoValorTotal(Number(reserva.valortotal || 0));
      setNovoValorTotalCustomizado(false);
      setNovasObservacoes(reserva.observacoes || '');

      const idadesIniciais = Array.from({ length: cr }).map(() => 6);
      setNovasIdadesCriancas(idadesIniciais);
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
        if (!supabase) return;

        // 1. Busca da tabela oficial acompanhante
        let { data: listaAcomp } = await supabase
          .from('acompanhante')
          .select('*')
          .eq('reservaid', reserva.reservaid)
          .eq('ativo', true);

        // 2. Fallback: cadastro_fnrh_acompanhante
        if (!listaAcomp || listaAcomp.length === 0) {
          const { data: acompFnrh } = await supabase
            .from('cadastro_fnrh_acompanhante')
            .select('*')
            .eq('reservaid', reserva.reservaid);
          listaAcomp = acompFnrh || [];
        }

        // 3. Fallback por cadastroid se houver
        if ((!listaAcomp || listaAcomp.length === 0) && (reserva as any).cadastroid) {
          const { data: acompCad } = await supabase
            .from('cadastro_fnrh_acompanhante')
            .select('*')
            .eq('cadastroid', (reserva as any).cadastroid);
          listaAcomp = acompCad || [];
        }

        // 4. Fallback por hospedeid
        if ((!listaAcomp || listaAcomp.length === 0) && reserva.hospedeid) {
          const { data: acompHosp } = await supabase
            .from('acompanhante')
            .select('*')
            .eq('cadastroid', reserva.hospedeid)
            .eq('ativo', true);
          if (acompHosp && acompHosp.length > 0) {
            listaAcomp = acompHosp;
          }
        }

        const validos = listaAcomp || [];
        setAcompanhantes(validos);

        // Extrai idades de crianças dos acompanhantes carregados
        if (validos.length > 0) {
          const idadesCalc: number[] = [];
          const refDate = (reserva.dataentrada || '').split('T')[0];
          validos.forEach((a) => {
            if (a.datanascimento) {
              const dNasc = new Date(
                a.datanascimento.includes('T') ? a.datanascimento : `${a.datanascimento}T12:00:00`
              );
              const dRef = new Date(refDate ? `${refDate}T12:00:00` : new Date());
              let age = dRef.getFullYear() - dNasc.getFullYear();
              const m = dRef.getMonth() - dNasc.getMonth();
              if (m < 0 || (m === 0 && dRef.getDate() < dNasc.getDate())) age--;
              if (age >= 0 && age <= 11) idadesCalc.push(age);
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

  // Manipuladores de alteração de campos
  const handleDataEntradaChange = (val: string) => {
    setNovaDataEntrada(val);
    if (!val) return;

    let saida = novaDataSaida;
    if (!saida || saida <= val) {
      const d = new Date(val.includes('T') ? val : `${val}T12:00:00`);
      d.setDate(d.getDate() + 1);
      saida = d.toISOString().split('T')[0];
      setNovaDataSaida(saida);
    }

    if (!novoValorTotalCustomizado) {
      recalcularTotal(novoAdultos, novoCriancas, novoPacoteId, val, saida, novasIdadesCriancas);
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

  // Informações da tarifa calculada
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

  // Cálculos financeiros de saldo
  const valorPagoNum = Number(reserva?.valorpago || 0);
  const saldoRestante = Number((novoValorTotal - valorPagoNum).toFixed(2));

  if (!aberto || !reserva) return null;

  const estaHospedado = reserva.statusreserva === 'HOSPEDADO';
  const podeCheckin = reserva.statusreserva === 'RESERVADO' || reserva.statusreserva === 'PRE_RESERVA';

  // Executa a remarcação e recálculo financeiro completo no Supabase
  const handleConfirmarRemarcacao = async () => {
    setErro(null);

    if (!novaDataEntrada || !novaDataSaida) {
      setErro('Informe as novas datas de entrada e saída.');
      return;
    }

    if (novaDataEntrada >= novaDataSaida) {
      setErro('A data de saída deve ser posterior à data de entrada.');
      return;
    }

    const quartoDestinoId = novoQuartoId || reserva.quartoid;
    if (!quartoDestinoId) {
      setErro('Selecione uma acomodação para a reserva.');
      return;
    }

    try {
      setCarregando(true);

      // 1. Verifica se o quarto já tem outra reserva ativa no novo período
      const conflito = reservas.find(
        (r) =>
          Number(r.quartoid) === Number(quartoDestinoId) &&
          Number(r.reservaid) !== Number(reserva.reservaid) &&
          ['RESERVADO', 'HOSPEDADO', 'PRE_RESERVA'].includes(r.statusreserva) &&
          r.dataentrada <= novaDataSaida &&
          r.datasaida >= novaDataEntrada
      );

      if (conflito) {
        const qConflito = quartos.find((q) => q.quartoid === quartoDestinoId);
        setErro(
          `O Quarto #${qConflito?.codigoidentificador || qConflito?.numero || quartoDestinoId} já possui outra reserva (${conflito.codigo}) no período selecionado.`
        );
        return;
      }

      const quartoEscolhido = quartos.find((q) => q.quartoid === quartoDestinoId);
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

      const notaAutomatica = `[Remarcação em ${new Date().toLocaleDateString('pt-BR')}: ${novoAdultos} adulto(s)${
        novoCriancas > 0 ? `, ${novoCriancas} criança(s)` : ''
      } no Quarto #${quartoEscolhido?.codigoidentificador || quartoEscolhido?.numero || quartoDestinoId} (${formatarData(
        novaDataEntrada
      )} a ${formatarData(novaDataSaida)}). Pacote: ${infoTarifa.nomePacote || 'Padrão'}. Novo Total: ${formatarMoeda(
        novoValorTotal
      )} | Crédito aproveitado: ${formatarMoeda(valorPagoNum)} | ${resumoSaldoTexto}]`;

      let observacoesFinal = novasObservacoes.trim();
      if (!observacoesFinal.includes(notaAutomatica)) {
        observacoesFinal = observacoesFinal ? `${observacoesFinal}\n${notaAutomatica}` : notaAutomatica;
      }

      // 2. Monta o payload completo de atualização com recálculo financeiro e ocupação
      const updatePayload: any = {
        dataentrada: novaDataEntrada,
        datasaida: novaDataSaida,
        quartoid: quartoDestinoId,
        adultos: Number(novoAdultos),
        criancas: Number(novoCriancas),
        valortotal: Number(novoValorTotal),
        saldo: novoSaldo,
        statuspagamento: novoStatusPagamento,
        observacoes: observacoesFinal,
        dataoperacao: agora,
        usuariooperacao: usuarioAtual?.usuarioid || null,
        naturezaoperacao: 'UPDATE',
      };

      if (novoPacoteId) {
        updatePayload.pacoteid = Number(novoPacoteId);
      }

      // Se a reserva estava em crédito, reativa para RESERVADO
      if (reserva.statusreserva === 'CREDITO') {
        updatePayload.statusreserva = 'RESERVADO';
      }

      const resUpdate = await reservaService.atualizar(reserva.reservaid, updatePayload);

      if (!resUpdate.sucesso) {
        setErro(resUpdate.erro || 'Erro ao atualizar dados da reserva.');
        return;
      }

      // 3. Desvincula acompanhantes que foram explicitamente retirados
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
              console.warn('Aviso ao desvincular acompanhante oficial:', e);
            }
            try {
              await supabase
                .from('cadastro_fnrh_acompanhante')
                .update({ reservaid: null })
                .eq('acompanhanteid', acompId);
            } catch (e) {
              console.warn('Aviso ao desvincular acompanhante FNRH:', e);
            }
          }
        }
      }

      // 4. Atualiza o status do quarto físico
      if (reserva.statusreserva === 'CREDITO' || Number(reserva.quartoid) !== Number(quartoDestinoId)) {
        await atualizarStatusQuarto(quartoDestinoId, 'RESERVADO');
        if (
          reserva.quartoid &&
          Number(reserva.quartoid) !== Number(quartoDestinoId) &&
          reserva.statusreserva !== 'CREDITO'
        ) {
          await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');
        }
      }

      // 5. Recarrega os dados globais do sistema
      await recarregarDados();

      if (onSucesso) {
        const statusMsg = reserva.statusreserva === 'CREDITO' ? ' reativada com status RESERVADO e' : '';
        onSucesso(
          `Reserva ${reserva.codigo}${statusMsg} remarcada com sucesso para ${formatarData(
            novaDataEntrada
          )} até ${formatarData(novaDataSaida)} (${novoAdultos} adulto(s)${
            novoCriancas > 0 ? `, ${novoCriancas} criança(s)` : ''
          }) no Quarto #${quartoEscolhido?.codigoidentificador || quartoEscolhido?.numero || reserva.quartonumero}! Novo Saldo: ${
            novoSaldo >= 0 ? formatarMoeda(novoSaldo) : `Crédito de ${formatarMoeda(Math.abs(novoSaldo))}`
          }.`
        );
      }
      onFechar();
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao remarcar datas.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSuspenderCredito = async () => {
    setErro(null);
    try {
      setCarregando(true);
      const res = await suspenderReservaComCredito(reserva.reservaid, motivoSuspencao.trim());
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
      const res = await realizarCheckin(reserva.reservaid);
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
    if (!window.confirm(`Tem certeza de que deseja cancelar a reserva ${reserva.codigo}?`)) return;
    setErro(null);
    try {
      setCarregando(true);
      const res = await cancelarReserva(reserva.reservaid, 'Cancelada no Mapa de Reservas');
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

  return (
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
                Código {reserva.codigo} • {reserva.hospedenome}
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
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Resumo da Reserva */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-[#053d1e]" />
                {reserva.hospedenome}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  reserva.statusreserva === 'CREDITO'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-[#e6f4ea] text-[#053d1e]'
                }`}
              >
                {reserva.statusreserva === 'CREDITO' ? 'CRÉDITO RETIDO' : reserva.statusreserva}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] pt-2 border-t border-slate-200/70">
              <div>
                <span className="text-slate-400 block">Quarto Anterior:</span>
                <span className="font-bold text-slate-800 text-xs">
                  Quarto #{reserva.quartonumero || 'S/N'} {reserva.quartocategoria ? `(${reserva.quartocategoria})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Hóspedes Registrados:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {reserva.adultos || 1} adulto(s){reserva.criancas ? `, ${reserva.criancas} criança(s)` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Período Contratado:</span>
                <span className="font-bold text-[#053d1e] text-xs">
                  {formatarData(reserva.dataentrada)} até {formatarData(reserva.datasaida)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Total:</span>
                <span className="font-bold text-slate-800">{formatarMoeda(reserva.valortotal)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Já Pago (Crédito):</span>
                <span className="font-bold text-emerald-700">{formatarMoeda(reserva.valorpago)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Saldo Restante:</span>
                <span className={`font-bold ${reserva.saldo > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {formatarMoeda(reserva.saldo)}
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

          {/* ========================================================= */}
          {/* PAINEL 1: REMARCAÇÃO COM RECÁLCULO DE HÓSPEDES & SALDO    */}
          {/* ========================================================= */}
          {remarcandoDatas ? (
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <div className="flex items-center gap-2 text-[#053d1e] font-bold text-xs">
                  <CalendarDays className="w-4 h-4 text-[#053d1e] shrink-0" />
                  <span>
                    {reserva.statusreserva === 'CREDITO'
                      ? 'Remarcar / Reativar Reserva em Crédito'
                      : 'Remarcar Datas da Reserva'}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-[#053d1e] text-white px-2 py-0.5 rounded-full">
                  Crédito Retido: {formatarMoeda(reserva.valorpago)}
                </span>
              </div>

              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Altere datas, acomodação e quantidade de hóspedes. O crédito pago de{' '}
                <strong>{formatarMoeda(reserva.valorpago)}</strong> será mantido e o saldo recalculado automaticamente.
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
                    value={novaDataSaida}
                    onChange={(e) => handleDataSaidaChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-bold text-[#053d1e]"
                  />
                </div>
              </div>

              {/* Linha 2: Acomodação e Pacote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nova Acomodação / Quarto:
                  </label>
                  <select
                    value={novoQuartoId}
                    onChange={(e) => setNovoQuartoId(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e] font-bold text-[#053d1e]"
                  >
                    {quartosFisicos.map((q) => (
                      <option key={q.quartoid} value={q.quartoid}>
                        Quarto #{q.codigoidentificador || q.numero} — {q.categoria}
                      </option>
                    ))}
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
                    {pacotesAtivos.map((p) => (
                      <option key={p.pacoteid} value={p.pacoteid}>
                        {p.nome} ({formatarMoeda(p.valor)}/pessoa • {p.quantidadedias}d)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 3: Gestão de Hóspedes e Acompanhantes */}
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
                  {/* Contador Adultos */}
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
                        title="Diminuir adultos"
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
                        title="Aumentar adultos"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Contador Crianças */}
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
                        title="Diminuir crianças"
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
                        title="Aumentar crianças"
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

                {/* Lista de acompanhantes vinculados com botão de desvincular */}
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

              {/* Linha 4: Valor Total e Recálculo */}
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
                    title="Recalcular valor com a fórmula de pacotes e hóspedes"
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

              {/* Linha 5: Demonstrativo Financeiro Completo com Saldo Dinâmico */}
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
                      {formatarMoeda(reserva.valorpago)}
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

                {saldoRestante > 0 ? (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      O crédito de <strong>{formatarMoeda(reserva.valorpago)}</strong> foi aproveitado. Restará{' '}
                      <strong>{formatarMoeda(saldoRestante)}</strong> para o hóspede quitar no check-in/check-out.
                    </span>
                  </div>
                ) : saldoRestante < 0 ? (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-[11px] text-purple-950 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Crédito excedente de {formatarMoeda(Math.abs(saldoRestante))}:</strong> O novo valor total
                      é menor que o adiantamento já pago. O valor fica retido para consumo no bar/restaurante ou devolução.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Reserva 100% quitada:</strong> O adiantamento de {formatarMoeda(reserva.valorpago)} cobre
                      integralmente a nova estadia. Saldo a acertar: R$ 0,00.
                    </span>
                  </div>
                )}
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
            /* ========================================================= */
            /* PAINEL 2: SUSPENSÃO COM CRÉDITO                           */
            /* ========================================================= */
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Suspender Reserva & Gerar Crédito</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Ao suspender a reserva, o quarto físico será imediatamente liberado para novas reservas. O valor de{' '}
                <strong>{formatarMoeda(reserva.valorpago)}</strong> permanecerá salvo como crédito ativo para o hóspede
                remarcar futuramente.
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
                  <span>Confirmar Crédito ({formatarMoeda(reserva.valorpago)})</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* BOTÕES DE AÇÕES PRINCIPAIS                                */
            /* ========================================================= */
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700 block mb-1">Ações Operacionais Disponíveis:</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Remarcar Datas */}
                <button
                  type="button"
                  onClick={() => setRemarcandoDatas(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <CalendarDays className="w-4 h-4 text-[#053d1e] shrink-0" />
                  <span>
                    {reserva.statusreserva === 'CREDITO' ? '📅 Remarcar / Reativar' : '📅 Remarcar Datas'}
                  </span>
                </button>

                {/* 2. Trocar Quarto */}
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

                {/* 3. Suspender / Gerar Crédito */}
                {reserva.statusreserva !== 'CREDITO' && (
                  <button
                    type="button"
                    onClick={() => setConfirmandoSuspencao(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <PauseCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>⏸️ Suspender (Crédito)</span>
                  </button>
                )}

                {/* 4. Check-in (se aplicável) */}
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

                {/* 5. Check-out (se hospedado) */}
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

                {/* 6. Cancelar Reserva */}
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
  );
};
