import React, { useEffect, useMemo, useState } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Search,
  Copy,
  Check,
  Send,
  Eye,
  CreditCard,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Edit2,
  XCircle,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CadastroFnrh, Reserva, Pacote, Quarto } from '../tipos';
import { FnrhService, gerarLinkPublicoFnrh } from '../servicos/api/FnrhService';
import { ModalGerarLinkFnrh } from '../componentes/fnrh/ModalGerarLinkFnrh';
import { ModalDetalhesFnrh } from '../componentes/fnrh/ModalDetalhesFnrh';
import { ModalConfirmarSinalFnrh } from '../componentes/fnrh/ModalConfirmarSinalFnrh';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';
import { useHotel } from '../contextos/ContextoHotel';
import {
  formatarCpf,
  formatarData,
  formatarMoeda,
  formatarTelefone,
  calcularIdadeNumerica,
} from '../utilitarios/formatadores';

// Helper universal para compatibilidade camelCase (.NET) e lowercase (Supabase)
const getVal = (obj: any, campoMin: string, campoCamel: string): any => {
  if (!obj) return undefined;
  return obj[campoMin] !== undefined ? obj[campoMin] : obj[campoCamel];
};

const extrairDataIso = (valor: any): string => {
  if (!valor) return '';
  return String(valor).slice(0, 10);
};

export interface ValoresCalculadosReserva {
  valorTotal: number;
  valorSinal: number;
  dias: number;
  pacote: Pacote | null;
  nomePacote: string;
  detalhe: string;
  qtdAdultos: number;
  qtdCriancasMeia: number;
  qtdCriancasGratis: number;
  totalHospedesFisicos: number;
}

export const calcularValoresReserva = (
  cadastro: any,
  pacotes: Pacote[] = [],
  _quartos: Quarto[] = [],
  _configuracoes?: any
): ValoresCalculadosReserva => {
  const dEntrada = getVal(cadastro, 'dataentrada', 'dataEntrada');
  const dSaida = getVal(cadastro, 'datasaida', 'dataSaida');
  const dataEntradaStr = extrairDataIso(dEntrada).trim();
  const dataSaidaStr = extrairDataIso(dSaida).trim();

  let dias = 2; // Padrão se não informado: 2 dias (Final de Semana)

  if (dataEntradaStr && dataSaidaStr) {
    if (dataEntradaStr === dataSaidaStr) {
      dias = 1; // Day Use (1 dia, sem pernoite)
    } else {
      let d1: Date;
      let d2: Date;
      if (dataEntradaStr.includes('/')) {
        const p1 = dataEntradaStr.split('/');
        d1 = new Date(Number(p1[2]), Number(p1[1]) - 1, Number(p1[0]));
      } else {
        const p1 = dataEntradaStr.split('-');
        d1 = new Date(Number(p1[0]), Number(p1[1]) - 1, Number(p1[2]));
      }
      if (dataSaidaStr.includes('/')) {
        const p2 = dataSaidaStr.split('/');
        d2 = new Date(Number(p2[2]), Number(p2[1]) - 1, Number(p2[0]));
      } else {
        const p2 = dataSaidaStr.split('-');
        d2 = new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]));
      }
      const diffTime = d2.getTime() - d1.getTime();
      const pernoites = Math.round(diffTime / (1000 * 60 * 60 * 24));
      dias = pernoites > 0 ? pernoites + 1 : 1;
    }
  }

  // Identificação do pacote e preço oficial por pessoa (adulto)
  let nomePacote = '';
  let valorPorPessoa = 0;
  let pacoteObjeto: Pacote | null = null;

  if (dias === 1) {
    nomePacote = 'Day Use';
    valorPorPessoa = 200;
    pacoteObjeto =
      pacotes.find(
        (p: any) =>
          String(getVal(p, 'tipopacote', 'tipoPacote') || '').toUpperCase() === 'DAY_USE' ||
          Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 1 ||
          (p.nome || '').toLowerCase().includes('day use')
      ) || null;
    if (pacoteObjeto?.valor) valorPorPessoa = Number(pacoteObjeto.valor);
  } else if (dias === 2) {
    nomePacote = 'Final de Semana';
    valorPorPessoa = 550;
    pacoteObjeto =
      pacotes.find(
        (p: any) =>
          Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 2 ||
          (p.nome || '').toLowerCase().includes('final de semana')
      ) || null;
    if (pacoteObjeto?.valor) valorPorPessoa = Number(pacoteObjeto.valor);
  } else if (dias === 3) {
    nomePacote = 'Final de Semana Estendido';
    valorPorPessoa = 750;
    pacoteObjeto =
      pacotes.find(
        (p: any) =>
          Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 3 ||
          (p.nome || '').toLowerCase().includes('estendido')
      ) || null;
    if (pacoteObjeto?.valor) valorPorPessoa = Number(pacoteObjeto.valor);
  } else if (dias === 4) {
    nomePacote = 'Feriado Prolongado';
    valorPorPessoa = 950;
    pacoteObjeto =
      pacotes.find(
        (p: any) =>
          Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === 4 ||
          (p.nome || '').toLowerCase().includes('feriado')
      ) || null;
    if (pacoteObjeto?.valor) valorPorPessoa = Number(pacoteObjeto.valor);
  } else {
    pacoteObjeto =
      pacotes.find((p: any) => Number(getVal(p, 'quantidadedias', 'quantidadeDias')) === dias) || null;
    if (pacoteObjeto?.valor) {
      valorPorPessoa = Number(pacoteObjeto.valor);
      nomePacote = pacoteObjeto.nome;
    } else {
      nomePacote = `${dias} Dias`;
      valorPorPessoa = 950 + (dias - 4) * 200;
    }
  }

  const idadeLimiteGratis = 5;
  const idadeLimiteMeia = 11;
  const porcentagemMeia = 50;

  let acompAdultos = 0;
  let criancasGratis = 0;
  let criancasMeia = 0;

  const listaAcomp = getVal(cadastro, 'acompanhantes', 'acompanhantes') || [];

  if (listaAcomp && listaAcomp.length > 0) {
    listaAcomp.forEach((a: any) => {
      const dtNasc = getVal(a, 'datanascimento', 'dataNascimento');
      if (dtNasc) {
        const idadeNum = Number(calcularIdadeNumerica(dtNasc));
        if (idadeNum <= idadeLimiteGratis) {
          criancasGratis++;
        } else if (idadeNum <= idadeLimiteMeia) {
          criancasMeia++;
        } else {
          acompAdultos++;
        }
      } else if (getVal(a, 'menoridade', 'menoridade')) {
        criancasMeia++;
      } else {
        acompAdultos++;
      }
    });
  }

  let qtdAdultos = 1 + acompAdultos;
  let qtdCriancasMeia = criancasMeia;
  let qtdCriancasGratis = criancasGratis;

  if (!listaAcomp || listaAcomp.length === 0) {
    qtdAdultos = Math.max(1, Number(getVal(cadastro, 'adultos', 'adultos') || 1));
    qtdCriancasMeia = Number(getVal(cadastro, 'criancas', 'criancas') || 0);
    qtdCriancasGratis = 0;
  }

  const totalHospedesFisicos = qtdAdultos + qtdCriancasMeia + qtdCriancasGratis;

  const valorAdultos = qtdAdultos * valorPorPessoa;
  const valorCriancas = criancasMeia * ((valorPorPessoa * porcentagemMeia) / 100);

  const valorTotal = valorAdultos + valorCriancas;
  const valorSinal = valorTotal / 2;

  const detalheTexto = `${nomePacote}: ${qtdAdultos} ad x ${formatarMoeda(valorPorPessoa)}${
    valorCriancas > 0
      ? ` + ${criancasMeia} cr x ${formatarMoeda((valorPorPessoa * porcentagemMeia) / 100)}`
      : ''
  }`;

  return {
    valorTotal,
    valorSinal,
    dias,
    pacote: pacoteObjeto,
    nomePacote,
    detalhe: detalheTexto,
    qtdAdultos,
    qtdCriancasMeia: criancasMeia,
    qtdCriancasGratis: criancasGratis,
    totalHospedesFisicos,
  };
};

const ITENS_POR_PAGINA = 15;

export const PaginaFnrhAdmin: React.FC = () => {
  const {
    usuarioAtual,
    navegarPara,
    recarregarDados,
    reservas,
    hospedes,
    pacotes,
    quartos,
    configuracoes,
  } = useHotel();

  // Estados de dados
  const [cadastros, setCadastros] = useState<CadastroFnrh[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados de filtros e paginação
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Estados de Modais
  const [modalGerarAberto, setModalGerarAberto] = useState<boolean>(false);
  const [cadastroDetalhes, setCadastroDetalhes] = useState<CadastroFnrh | null>(null);
  const [cadastroSinal, setCadastroSinal] = useState<CadastroFnrh | null>(null);
  const [cadastroCancelar, setCadastroCancelar] = useState<CadastroFnrh | null>(null);

  // Controle de carregamento e redirecionamento para o mapa de reservas
  const [redirecionandoReservaId, setRedirecionandoReservaId] = useState<number | null>(null);

  // Controle de cópia rápida
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  // Localiza a reserva vinculada por reservaid, hospedeid ou CPF do titular
  const obterReservaDoCadastro = (item: any): Reserva | null => {
    const itemReservaId = getVal(item, 'reservaid', 'reservaId');
    if (itemReservaId) {
      const r = reservas.find((res: any) => Number(getVal(res, 'reservaid', 'reservaId')) === Number(itemReservaId));
      if (r) return r;
    }

    const itemHospedeId = getVal(item, 'hospedeid', 'hospedeId');
    if (itemHospedeId) {
      const r = reservas.find((res: any) => {
        const rHospId = Number(getVal(res, 'hospedeid', 'hospedeId'));
        const rStatus = getVal(res, 'statusreserva', 'statusReserva');
        return rHospId === Number(itemHospedeId) && rStatus !== 'CANCELADA';
      });
      if (r) return r;
    }

    const itemCpf = getVal(item, 'cpf', 'cpf');
    if (itemCpf) {
      const cpfLimpo = String(itemCpf).replace(/\D/g, '');
      if (cpfLimpo.length === 11) {
        const hEncontrado = hospedes.find((h: any) => {
          const hCpf = getVal(h, 'cpf', 'cpf');
          return hCpf && String(hCpf).replace(/\D/g, '') === cpfLimpo;
        });
        if (hEncontrado) {
          const hId = Number(getVal(hEncontrado, 'hospedeid', 'hospedeId'));
          const r = reservas.find((res: any) => {
            const rHospId = Number(getVal(res, 'hospedeid', 'hospedeId'));
            const rStatus = getVal(res, 'statusreserva', 'statusReserva');
            return rHospId === hId && rStatus !== 'CANCELADA';
          });
          if (r) return r;
        }
      }
    }
    return null;
  };

  const handleIrParaReserva = async (cadastro: any) => {
    const cId = Number(getVal(cadastro, 'cadastroid', 'cadastroId'));
    setRedirecionandoReservaId(cId);
    try {
      const idadesCriancasCalculadas: number[] = [];
      const listaAcomp = getVal(cadastro, 'acompanhantes', 'acompanhantes') || [];

      if (listaAcomp && listaAcomp.length > 0) {
        listaAcomp.forEach((a: any) => {
          const dtNasc = getVal(a, 'datanascimento', 'dataNascimento');
          if (dtNasc) {
            const age = calcularIdadeNumerica(dtNasc);
            if (age >= 0 && age <= 11) {
              idadesCriancasCalculadas.push(age);
            }
          }
        });
      }

      const valoresCalculados = calcularValoresReserva(cadastro, pacotes, quartos, configuracoes);
      const dataCriacaoFnrh =
        extrairDataIso(
          getVal(cadastro, 'datainclusao', 'dataInclusao') ||
            (cadastro as any).created_at ||
            (cadastro as any).criado_em ||
            getVal(cadastro, 'data_declaracao', 'dataDeclaracao')
        ) || new Date().toISOString().slice(0, 10);

      const vSinal = Number(getVal(cadastro, 'valor_sinal', 'valorSinal') || 0);
      const formaPag = getVal(cadastro, 'forma_pagamento', 'formaPagamento');

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'fnrh_reserva_preenchimento',
          JSON.stringify({
            cadastroid: cId,
            hospedeid: getVal(cadastro, 'hospedeid', 'hospedeId'),
            nomecompleto: getVal(cadastro, 'nomecompleto', 'nomeCompleto'),
            telefone: getVal(cadastro, 'telefone', 'telefone'),
            cpf: getVal(cadastro, 'cpf', 'cpf'),
            datareserva: dataCriacaoFnrh,
            dataentrada: extrairDataIso(getVal(cadastro, 'dataentrada', 'dataEntrada')),
            datasaida: extrairDataIso(getVal(cadastro, 'datasaida', 'dataSaida')),
            adultos: valoresCalculados.qtdAdultos,
            criancas: idadesCriancasCalculadas.length,
            criancas_gratis: valoresCalculados.qtdCriancasGratis,
            idades_criancas: idadesCriancasCalculadas,
            valor_sinal: vSinal > 0 ? vSinal : formaPag === 'CHECKOUT' ? 0 : valoresCalculados.valorSinal,
            valortotal: valoresCalculados.valorTotal,
            pacoteid: getVal(valoresCalculados.pacote, 'pacoteid', 'pacoteId'),
          })
        );
      }

      await recarregarDados();
      navegarPara('mapa-reservas');
    } catch (e) {
      console.warn('Erro ao sincronizar dados antes de ir ao mapa:', e);
      navegarPara('mapa-reservas');
    } finally {
      setRedirecionandoReservaId(null);
    }
  };

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    const res = await FnrhService.listarCadastrosFnrh();
    setCarregando(false);
    if (!res.sucesso) {
      setErro(res.erro || 'Não foi possível carregar a lista de links FNRH.');
    } else {
      setCadastros(res.dados);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const exibirFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopiarLink = async (cadastro: any) => {
    const token = getVal(cadastro, 'token_acesso', 'tokenAcesso') || '';
    const link = gerarLinkPublicoFnrh(token);
    const cId = Number(getVal(cadastro, 'cadastroid', 'cadastroId'));
    try {
      await navigator.clipboard.writeText(link);
      setCopiadoId(cId);
      setTimeout(() => setCopiadoId(null), 2500);
      exibirFeedback(`Link do cadastro #${cId} copiado!`);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiadoId(cId);
      setTimeout(() => setCopiadoId(null), 2500);
    }
  };

  const handleEnviarWhatsApp = (cadastro: any) => {
    const token = getVal(cadastro, 'token_acesso', 'tokenAcesso') || '';
    const link = gerarLinkPublicoFnrh(token);
    const tel = getVal(cadastro, 'telefone', 'telefone') || '';
    const numLimpo = String(tel).replace(/\D/g, '');
    const nome = getVal(cadastro, 'nomecompleto', 'nomeCompleto');
    const saudacao = nome ? `Olá ${nome}!` : 'Olá!';
    const texto = `${saudacao} Tudo bem?

Para agilizarmos seu atendimento e a confirmação da sua reserva no *Hotel Fazenda Anew*, por favor preencha sua *Ficha Nacional de Registro de Hóspedes (FNRH)* através deste link seguro:

${link}

*Atenção:* Este link é válido por *7 dias*.

Qualquer dúvida, estamos à disposição!`;

    const urlWa = numLimpo
      ? `https://wa.me/55${numLimpo}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(urlWa, '_blank');
  };

  const handleConfirmarCancelamento = async () => {
    if (!cadastroCancelar) return;
    const cId = Number(getVal(cadastroCancelar, 'cadastroid', 'cadastroId'));
    const res = await FnrhService.excluirCadastroFnrh(cId);
    if (res.sucesso) {
      exibirFeedback('Link/Cadastro excluído com sucesso.');
      setCadastroCancelar(null);
      carregarDados();
    } else {
      setErro(res.mensagem);
    }
  };

  // Sincroniza em background o status no banco caso a reserva já exista no sistema
  useEffect(() => {
    if (!cadastros.length || !reservas.length) return;

    cadastros.forEach(async (c: any) => {
      const r: any = obterReservaDoCadastro(c);
      const cStatus = getVal(c, 'status', 'status');
      const cResId = getVal(c, 'reservaid', 'reservaId');

      if (r && (cStatus !== 'RESERVA_CRIADA' || !cResId)) {
        await FnrhService.vincularReservaAoCadastroFnrh({
          cadastroid: Number(getVal(c, 'cadastroid', 'cadastroId')),
          hospedeid: Number(getVal(c, 'hospedeid', 'hospedeId') || getVal(r, 'hospedeid', 'hospedeId')),
          reservaid: Number(getVal(r, 'reservaid', 'reservaId')),
          usuarioId: usuarioAtual?.usuarioid,
        });
      }
    });
  }, [cadastros, reservas]);

  // Contadores para os Cards de Métricas
  const contadores = useMemo(() => {
    let total = cadastros.length;
    let aguardandoPreenchimento = 0;
    let preenchidoAguardandoSinal = 0;
    let liberadas = 0;
    let reservasCriadas = 0;

    cadastros.forEach((c: any) => {
      const r = obterReservaDoCadastro(c);
      const statusUpper = String(getVal(c, 'status', 'status') || '').toUpperCase();
      const resId = getVal(c, 'reservaid', 'reservaId');
      const jaReserva = statusUpper === 'RESERVA_CRIADA' || Boolean(resId) || Boolean(r);
      const expiraEm = getVal(c, 'token_expira_em', 'tokenExpiraEm');
      const expirado = Boolean(expiraEm && new Date(expiraEm) < new Date());
      const nome = getVal(c, 'nomecompleto', 'nomeCompleto');
      const cpf = getVal(c, 'cpf', 'cpf');
      const decl = getVal(c, 'declaracao_aceita', 'declaracaoAceita');
      const temDados = Boolean(nome && cpf && decl);

      if (jaReserva) {
        reservasCriadas++;
      } else if (statusUpper === 'LIBERADA_PARA_RESERVA') {
        liberadas++;
      } else if (statusUpper === 'AGUARDANDO_PAGAMENTO') {
        if (temDados) {
          preenchidoAguardandoSinal++;
        } else if (!expirado) {
          aguardandoPreenchimento++;
        }
      }
    });

    return { total, aguardandoPreenchimento, preenchidoAguardandoSinal, liberadas, reservasCriadas };
  }, [cadastros, reservas, hospedes]);

  const obterPrioridadeStatus = (c: any): number => {
    const statusUpper = String(getVal(c, 'status', 'status') || '').toUpperCase();
    const r = obterReservaDoCadastro(c);
    const resId = getVal(c, 'reservaid', 'reservaId');
    const jaReserva =
      statusUpper === 'RESERVA_CRIADA' ||
      statusUpper === 'CONCLUIDO' ||
      statusUpper === 'CONCLUIDA' ||
      statusUpper === 'RESERVADO' ||
      Boolean(resId) ||
      Boolean(r);

    const nome = getVal(c, 'nomecompleto', 'nomeCompleto');
    const cpf = getVal(c, 'cpf', 'cpf');
    const decl = getVal(c, 'declaracao_aceita', 'declaracaoAceita');
    const temDados = Boolean(nome && cpf && decl);

    // 1º: Aguardando Preenchimento
    if (
      statusUpper === 'PENDENTE' ||
      statusUpper === 'AGUARDANDO_PREENCHIMENTO' ||
      (statusUpper === 'AGUARDANDO_PAGAMENTO' && !temDados && !jaReserva)
    ) {
      return 1;
    }

    // 2º: Ficha Preenchida / Aguardando Sinal
    if (
      (statusUpper === 'AGUARDANDO_PAGAMENTO' && temDados && !jaReserva) ||
      statusUpper === 'LIBERADA_PARA_RESERVA' ||
      statusUpper === 'PREENCHIDO_AGUARDANDO_SINAL'
    ) {
      return 2;
    }

    // 3º: Reservas Concluídas
    if (
      jaReserva ||
      statusUpper === 'CONCLUIDO' ||
      statusUpper === 'CONCLUIDA' ||
      statusUpper === 'RESERVADO' ||
      statusUpper === 'RESERVA_CRIADA'
    ) {
      return 3;
    }

    return 4;
  };

  const compararPorPrioridade = (a: any, b: any): number => {
    const prioA = obterPrioridadeStatus(a);
    const prioB = obterPrioridadeStatus(b);

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    const idA = Number(getVal(a, 'cadastroid', 'cadastroId') || 0);
    const idB = Number(getVal(b, 'cadastroid', 'cadastroId') || 0);
    return idB - idA;
  };

  const cadastrosFiltrados = useMemo(() => {
    const filtrados = cadastros.filter((c: any) => {
      const nome = getVal(c, 'nomecompleto', 'nomeCompleto');
      const cpf = getVal(c, 'cpf', 'cpf');
      const tel = getVal(c, 'telefone', 'telefone');
      const token = getVal(c, 'token_acesso', 'tokenAcesso');
      const cId = String(getVal(c, 'cadastroid', 'cadastroId') || '');

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const termoNumeros = busca.replace(/\D/g, '');
        const coincideNome = nome?.toLowerCase().includes(termo);
        const coincideCpf = Boolean(
          cpf?.toLowerCase().includes(termo) ||
            (termoNumeros && cpf?.replace(/\D/g, '').includes(termoNumeros))
        );
        const coincideTel = Boolean(
          tel?.includes(termo) ||
            (termoNumeros && tel?.replace(/\D/g, '').includes(termoNumeros))
        );
        const coincideToken = token?.toLowerCase().includes(termo);
        const coincideId = cId === termo;
        if (!coincideNome && !coincideCpf && !coincideTel && !coincideToken && !coincideId) {
          return false;
        }
      }

      const expiraEm = getVal(c, 'token_expira_em', 'tokenExpiraEm');
      const expirado = Boolean(expiraEm && new Date(expiraEm) < new Date());
      const decl = getVal(c, 'declaracao_aceita', 'declaracaoAceita');
      const temDados = Boolean(nome && cpf && decl);
      const r = obterReservaDoCadastro(c);
      const resId = getVal(c, 'reservaid', 'reservaId');
      const statusUpper = String(getVal(c, 'status', 'status') || '').toUpperCase();
      const jaReserva = statusUpper === 'RESERVA_CRIADA' || Boolean(resId) || Boolean(r);

      if (filtroStatus === 'AGUARDANDO_PREENCHIMENTO') {
        return statusUpper === 'AGUARDANDO_PAGAMENTO' && !temDados && !expirado && !jaReserva;
      }
      if (filtroStatus === 'PREENCHIDO_AGUARDANDO_SINAL') {
        return statusUpper === 'AGUARDANDO_PAGAMENTO' && temDados && !jaReserva;
      }
      if (filtroStatus === 'LIBERADA_PARA_RESERVA') {
        return statusUpper === 'LIBERADA_PARA_RESERVA' && !jaReserva;
      }
      if (filtroStatus === 'RESERVA_CRIADA') {
        return jaReserva;
      }
      if (filtroStatus === 'CANCELADA_EXPIRADA') {
        return (statusUpper === 'CANCELADA' || (expirado && statusUpper === 'AGUARDANDO_PAGAMENTO')) && !jaReserva;
      }

      return true;
    });

    return filtrados.sort(compararPorPrioridade);
  }, [cadastros, busca, filtroStatus, reservas, hospedes]);

  const totalPaginas = Math.max(1, Math.ceil(cadastrosFiltrados.length / ITENS_POR_PAGINA));

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroStatus]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [totalPaginas, paginaAtual]);

  const cadastrosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return cadastrosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [cadastrosFiltrados, paginaAtual]);

  const renderizarStatusBadge = (c: any) => {
    const expiraEm = getVal(c, 'token_expira_em', 'tokenExpiraEm');
    const statusUpper = String(getVal(c, 'status', 'status') || '').toUpperCase();
    const expirado = Boolean(expiraEm && new Date(expiraEm) < new Date() && statusUpper === 'AGUARDANDO_PAGAMENTO');
    const nome = getVal(c, 'nomecompleto', 'nomeCompleto');
    const cpf = getVal(c, 'cpf', 'cpf');
    const decl = getVal(c, 'declaracao_aceita', 'declaracaoAceita');
    const preenchido = Boolean(nome && cpf && decl);
    const r: any = obterReservaDoCadastro(c);
    const resId = getVal(c, 'reservaid', 'reservaId');
    const jaReserva = statusUpper === 'RESERVA_CRIADA' || Boolean(resId) || Boolean(r);
    const numReserva =
      getVal(r, 'codigo', 'codigo') ||
      (resId ? `#${resId}` : getVal(r, 'reservaid', 'reservaId') ? `#${getVal(r, 'reservaid', 'reservaId')}` : '');

    if (statusUpper === 'CANCELADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3" />
          Cancelado
        </span>
      );
    }
    if (jaReserva) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          Reserva Criada {numReserva ? `${numReserva}` : ''}
        </span>
      );
    }
    if (statusUpper === 'LIBERADA_PARA_RESERVA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
          <CheckCircle2 className="w-3 h-3" />
          Sinal Confirmado • Liberada
        </span>
      );
    }
    if (expirado) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-300">
          <Clock className="w-3 h-3" />
          Expirado (7 dias)
        </span>
      );
    }
    if (preenchido) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          Ficha Preenchida • Aguardando Sinal (50%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
        <Clock className="w-3 h-3" />
        Aguardando Preenchimento
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast de Feedback */}
      {feedback && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in slide-in-from-top-5">
          <CheckCircle2 className="h-4 w-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Manrope'] text-[#053d1e] tracking-tight">
            Links FNRH & Pré-Cadastros
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Gere links seguros para o cliente preencher a FNRH online, acompanhe o total previsto por pacote/diária e confirme o sinal de 50%.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={carregarDados}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#c1c9bf] bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Recarregar lista"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setModalGerarAberto(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#053d1e] hover:bg-[#043017] text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Gerar Novo Link FNRH
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#c1c9bf] shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total de Links Criados</span>
          <span className="text-2xl font-bold font-['Manrope'] text-slate-900 mt-1 block">
            {contadores.total}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-2xs">
          <span className="text-xs font-semibold text-orange-700 block">Aguardando Preenchimento</span>
          <span className="text-2xl font-bold font-['Manrope'] text-orange-700 mt-1 block">
            {contadores.aguardandoPreenchimento}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-xs font-semibold text-amber-800 block">Ficha Preenchida (Aguardando Sinal)</span>
          <span className="text-2xl font-bold font-['Manrope'] text-amber-800 mt-1 block">
            {contadores.preenchidoAguardandoSinal}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-800 block">Reservas Concluídas</span>
          <span className="text-2xl font-bold font-['Manrope'] text-[#053d1e] mt-1 block">
            {contadores.reservasCriadas}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-[#c1c9bf] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, telefone ou token..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#053d1e]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0">
            <button
              onClick={() => setFiltroStatus('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                filtroStatus === 'TODOS'
                  ? 'bg-[#053d1e] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({cadastros.length})
            </button>
            <button
              onClick={() => setFiltroStatus('AGUARDANDO_PREENCHIMENTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                filtroStatus === 'AGUARDANDO_PREENCHIMENTO'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aguardando Preenchimento ({contadores.aguardandoPreenchimento})
            </button>
            <button
              onClick={() => setFiltroStatus('PREENCHIDO_AGUARDANDO_SINAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                filtroStatus === 'PREENCHIDO_AGUARDANDO_SINAL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aguardando Sinal ({contadores.preenchidoAguardandoSinal})
            </button>
            <button
              onClick={() => setFiltroStatus('LIBERADA_PARA_RESERVA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                filtroStatus === 'LIBERADA_PARA_RESERVA'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Liberadas ({contadores.liberadas})
            </button>
            <button
              onClick={() => setFiltroStatus('RESERVA_CRIADA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                filtroStatus === 'RESERVA_CRIADA'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Reserva Criada ({contadores.reservasCriadas})
            </button>
          </div>
        </div>
      </div>

      {/* Lista / Tabela */}
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xs overflow-hidden">
        {cadastrosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <LinkIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 font-['Manrope']">
              Nenhum link ou cadastro FNRH encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {busca || filtroStatus !== 'TODOS'
                ? 'Tente ajustar os filtros ou os termos pesquisados.'
                : 'Clique no botão acima para gerar o primeiro link de FNRH para envio.'}
            </p>
            {!busca && filtroStatus === 'TODOS' && (
              <button
                onClick={() => setModalGerarAberto(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#053d1e] text-xs font-bold text-white hover:bg-[#043017] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Gerar Primeiro Link FNRH
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Cadastro / Link</th>
                    <th className="py-3 px-4">Hóspede Titular</th>
                    <th className="py-3 px-4">Contato / WhatsApp</th>
                    <th className="py-3 px-4">Estadia Prevista</th>
                    <th className="py-3 px-4 font-bold text-[#053d1e]">Total Previsto</th>
                    <th className="py-3 px-4 font-bold text-[#053d1e]">Sinal (50%)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cadastrosPaginados.map((item: any) => {
                    const cId = Number(getVal(item, 'cadastroid', 'cadastroId'));
                    const expiraEm = getVal(item, 'token_expira_em', 'tokenExpiraEm');
                    const diasRestantes = expiraEm
                      ? Math.ceil((new Date(expiraEm).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 0;

                    const reservaVinculada: any = obterReservaDoCadastro(item);
                    const statusUpper = String(getVal(item, 'status', 'status') || '').toUpperCase();
                    const itemResId = getVal(item, 'reservaid', 'reservaId');
                    const jaPossuiReserva = Boolean(
                      statusUpper === 'RESERVA_CRIADA' ||
                        itemResId ||
                        reservaVinculada
                    );

                    const codigoOuIdReserva =
                      getVal(reservaVinculada, 'codigo', 'codigo') ||
                      (itemResId ? `#${itemResId}` : getVal(reservaVinculada, 'reservaid', 'reservaId') ? `#${getVal(reservaVinculada, 'reservaid', 'reservaId')}` : '');

                    const valoresCalculados = calcularValoresReserva(item, pacotes, quartos, configuracoes);
                    const dEntrada = getVal(item, 'dataentrada', 'dataEntrada');
                    const dSaida = getVal(item, 'datasaida', 'dataSaida');
                    const listaAcomp = getVal(item, 'acompanhantes', 'acompanhantes') || [];

                    const nomeTitular = getVal(item, 'nomecompleto', 'nomeCompleto');
                    const cpfTitular = getVal(item, 'cpf', 'cpf');
                    const telTitular = getVal(item, 'telefone', 'telefone');
                    const emailTitular = getVal(item, 'email', 'email');
                    const dataInclusao = getVal(item, 'datainclusao', 'dataInclusao');

                    return (
                      <tr
                        key={cId}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* ID e Link */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-mono">#{cId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopiarLink(item)}
                              title="Copiar Link Seguro"
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                copiadoId === cId
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {copiadoId === cId ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Criado: {dataInclusao ? new Date(dataInclusao).toLocaleDateString('pt-BR') : '-'}
                            {diasRestantes > 0 ? ` • ${diasRestantes}d restantes` : ' • Expirado'}
                          </span>
                        </td>

                        {/* Hóspede */}
                        <td className="py-3 px-4">
                          {nomeTitular ? (
                            <div>
                              <span className="font-bold text-slate-900 block">{nomeTitular}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {cpfTitular ? formatarCpf(cpfTitular) : 'CPF não informado'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Aguardando cliente preencher...</span>
                          )}
                        </td>

                        {/* Contato */}
                        <td className="py-3 px-4">
                          {telTitular ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-700">
                                {formatarTelefone(telTitular)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEnviarWhatsApp(item)}
                                title="Abrir no WhatsApp com mensagem pronta"
                                className="p-1 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                          {emailTitular && (
                            <span className="text-[11px] text-slate-400 block">{emailTitular}</span>
                          )}
                        </td>

                        {/* Estadia Prevista */}
                        <td className="py-3 px-4">
                          {dEntrada || dSaida ? (
                            <div>
                              <span className="font-medium text-slate-800 block">
                                {dEntrada ? formatarData(dEntrada) : '--'} ➔{' '}
                                {dSaida ? formatarData(dSaida) : '--'}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {valoresCalculados.qtdAdultos} ad, {valoresCalculados.qtdCriancasMeia} cr
                                </span>
                                {valoresCalculados.qtdCriancasGratis > 0 && (
                                  <span className="ml-1 text-slate-400">
                                    (+{valoresCalculados.qtdCriancasGratis} grátis)
                                  </span>
                                )}
                                {listaAcomp && listaAcomp.length > 0 && (
                                  <span className="ml-1 text-emerald-700 font-semibold">
                                    ({listaAcomp.length} acomp.)
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">A definir</span>
                          )}
                        </td>

                        {/* Total Previsto */}
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-[#053d1e] block font-['Manrope'] text-sm tracking-tight">
                            {formatarMoeda(valoresCalculados.valorTotal)}
                          </span>
                        </td>

                        {/* Sinal 50% */}
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-800 block font-['Manrope'] text-sm tracking-tight">
                            {formatarMoeda(valoresCalculados.valorSinal)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">{renderizarStatusBadge(item)}</td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Editar / Ver Ficha */}
                            <button
                              type="button"
                              onClick={() => setCadastroDetalhes(item)}
                              title={
                                statusUpper === 'AGUARDANDO_PAGAMENTO'
                                  ? 'Visualizar e Editar Ficha Completa'
                                  : 'Visualizar Ficha Completa'
                              }
                              className="p-1.5 text-[#414941] hover:text-[#053d1e] hover:bg-[#e1e3e4] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                            >
                              {statusUpper === 'AGUARDANDO_PAGAMENTO' ? (
                                <>
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver Ficha</span>
                                </>
                              )}
                            </button>

                            {/* Confirmar Sinal */}
                            {statusUpper === 'AGUARDANDO_PAGAMENTO' && (
                              <button
                                type="button"
                                onClick={() => setCadastroSinal(item)}
                                title="Confirmar Recebimento do Sinal (50%)"
                                className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors text-xs flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Sinal 50%</span>
                              </button>
                            )}

                            {/* Botão Criar Reserva */}
                            {jaPossuiReserva ? (
                              <button
                                type="button"
                                disabled
                                title={`Reserva já realizada (${codigoOuIdReserva}). Hóspede já importado.`}
                                className="p-1.5 text-slate-400 bg-slate-100/90 rounded transition-colors text-xs flex items-center gap-1 font-semibold cursor-not-allowed border border-slate-200"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Reserva Criada {codigoOuIdReserva ? `(${codigoOuIdReserva})` : ''}</span>
                              </button>
                            ) : statusUpper === 'LIBERADA_PARA_RESERVA' ? (
                              <button
                                type="button"
                                onClick={() => handleIrParaReserva(item)}
                                disabled={redirecionandoReservaId === cId}
                                title="Efetivar Reserva no Mapa de Reservas"
                                className="p-1.5 text-[#053d1e] hover:bg-[#e6f4ea] rounded transition-colors text-xs flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
                              >
                                {redirecionandoReservaId === cId ? (
                                  <>
                                    <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                    <span>Carregando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Criar Reserva</span>
                                  </>
                                )}
                              </button>
                            ) : null}

                            {/* Excluir / Cancelar Link */}
                            {statusUpper !== 'CANCELADA' && !jaPossuiReserva && (
                              <button
                                type="button"
                                onClick={() => setCadastroCancelar(item)}
                                title="Cancelar este link"
                                className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                Exibindo <strong>{Math.min((paginaAtual - 1) * ITENS_POR_PAGINA + 1, cadastrosFiltrados.length)}</strong> a{' '}
                <strong>{Math.min(paginaAtual * ITENS_POR_PAGINA, cadastrosFiltrados.length)}</strong> de{' '}
                <strong>{cadastrosFiltrados.length}</strong> cadastros (Página <strong>{paginaAtual}</strong> de{' '}
                <strong>{totalPaginas}</strong>)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-bold text-slate-800 text-xs">
                  {paginaAtual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Geração de Novo Link */}
      <ModalGerarLinkFnrh
        aberto={modalGerarAberto}
        onFechar={() => setModalGerarAberto(false)}
        onLinkCriado={(novo) => {
          const novoId = getVal(novo, 'cadastroid', 'cadastroId');
          exibirFeedback(`Link gerado com sucesso para o cadastro #${novoId}!`);
          carregarDados();
        }}
      />

      {/* Modal de Detalhes da Ficha */}
      <ModalDetalhesFnrh
        aberto={Boolean(cadastroDetalhes)}
        cadastro={cadastroDetalhes}
        reservaVinculada={cadastroDetalhes ? obterReservaDoCadastro(cadastroDetalhes) : null}
        valorTotalSugerido={
          cadastroDetalhes
            ? calcularValoresReserva(cadastroDetalhes, pacotes, quartos, configuracoes).valorTotal
            : undefined
        }
        pacoteSugerido={
          cadastroDetalhes
            ? calcularValoresReserva(cadastroDetalhes, pacotes, quartos, configuracoes).pacote
            : null
        }
        onFechar={() => setCadastroDetalhes(null)}
        onConfirmarSinal={(c) => {
          setCadastroDetalhes(null);
          setCadastroSinal(c);
        }}
        onCriarReserva={(c) => {
          setCadastroDetalhes(null);
          handleIrParaReserva(c);
        }}
        onAtualizar={carregarDados}
      />

      {/* Modal de Confirmação do Sinal (50%) */}
      <ModalConfirmarSinalFnrh
        aberto={Boolean(cadastroSinal)}
        cadastro={cadastroSinal}
        valorTotalSugerido={
          cadastroSinal
            ? calcularValoresReserva(cadastroSinal, pacotes, quartos, configuracoes).valorTotal
            : undefined
        }
        pacoteSugerido={
          cadastroSinal
            ? calcularValoresReserva(cadastroSinal, pacotes, quartos, configuracoes).pacote
            : null
        }
        onFechar={() => setCadastroSinal(null)}
        onSucesso={(msg) => {
          exibirFeedback(msg);
          carregarDados();
        }}
      />

      {/* Modal de Confirmação de Cancelamento */}
      <ModalConfirmacao
        aberto={Boolean(cadastroCancelar)}
        titulo="Excluir Link FNRH"
        mensagem={`Tem certeza que deseja excluir o link do cadastro #${getVal(
          cadastroCancelar,
          'cadastroid',
          'cadastroId'
        )}${
          getVal(cadastroCancelar, 'nomecompleto', 'nomeCompleto')
            ? ` (${getVal(cadastroCancelar, 'nomecompleto', 'nomeCompleto')})`
            : ''
        }? O cliente não poderá mais enviar dados através deste link.`}
        tipo="perigo"
        textoConfirmar="Sim, Excluir Link"
        textoCancelar="Voltar"
        onConfirmar={handleConfirmarCancelamento}
        onCancelar={() => setCadastroCancelar(null)}
      />
    </div>
  );
};