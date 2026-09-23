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
  Users,
  FileText,
  Trash2,
  Edit2,
  XCircle,
  ExternalLink,
  ChevronRight,
  LoaderCircle
} from 'lucide-react';
import { CadastroFnrh, Reserva } from '../tipos';
import { FnrhService, gerarLinkPublicoFnrh } from '../servicos/supabase/FnrhService';
import { ModalGerarLinkFnrh } from '../componentes/fnrh/ModalGerarLinkFnrh';
import { ModalDetalhesFnrh } from '../componentes/fnrh/ModalDetalhesFnrh';
import { ModalConfirmarSinalFnrh } from '../componentes/fnrh/ModalConfirmarSinalFnrh';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarCpf, formatarData, formatarMoeda, formatarTelefone } from '../utilitarios/formatadores';

export const PaginaFnrhAdmin: React.FC = () => {
  const { usuarioAtual, navegarPara, recarregarDados, reservas, hospedes } = useHotel();

  // Estados de dados
  const [cadastros, setCadastros] = useState<CadastroFnrh[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados de filtros
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Estados de Modais
  const [modalGerarAberto, setModalGerarAberto] = useState<boolean>(false);
  const [cadastroDetalhes, setCadastroDetalhes] = useState<CadastroFnrh | null>(null);
  const [cadastroSinal, setCadastroSinal] = useState<CadastroFnrh | null>(null);
  const [cadastroCancelar, setCadastroCancelar] = useState<CadastroFnrh | null>(null);

  // Controle de carregamento e redirecionamento para o mapa de reservas
  const [redirecionandoReservaId, setRedirecionandoReservaId] = useState<number | null>(null);

  // Controle de cópia rápida
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  const handleIrParaReserva = async (cadastro: CadastroFnrh) => {
    setRedirecionandoReservaId(cadastro.cadastroid);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'fnrh_reserva_preenchimento',
          JSON.stringify({
            cadastroid: cadastro.cadastroid,
            hospedeid: cadastro.hospedeid,
            nomecompleto: cadastro.nomecompleto,
            telefone: cadastro.telefone,
            cpf: cadastro.cpf,
            dataentrada: cadastro.dataentrada,
            datasaida: cadastro.datasaida,
            adultos: cadastro.adultos,
            criancas: cadastro.criancas,
            valor_sinal: cadastro.valor_sinal,
          })
        );
      }

      // Recarrega todos os hóspedes e reservas antes de abrir a tela do mapa
      await recarregarDados();
      navegarPara('mapa-reservas');
    } catch (e) {
      console.warn('Erro ao sincronizar dados antes de ir ao mapa:', e);
      navegarPara('mapa-reservas');
    } finally {
      setRedirecionandoReservaId(null);
    }
  };

  // Carrega a lista de cadastros
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

  const handleCopiarLink = async (cadastro: CadastroFnrh) => {
    const link = gerarLinkPublicoFnrh(cadastro.token_acesso);
    try {
      await navigator.clipboard.writeText(link);
      setCopiadoId(cadastro.cadastroid);
      setTimeout(() => setCopiadoId(null), 2500);
      exibirFeedback(`Link do cadastro #${cadastro.cadastroid} copiado!`);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiadoId(cadastro.cadastroid);
      setTimeout(() => setCopiadoId(null), 2500);
    }
  };

  const handleEnviarWhatsApp = (cadastro: CadastroFnrh) => {
    const link = gerarLinkPublicoFnrh(cadastro.token_acesso);
    const numLimpo = (cadastro.telefone || '').replace(/\D/g, '');
    const saudacao = cadastro.nomecompleto ? `Olá ${cadastro.nomecompleto}!` : 'Olá!';
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
    const res = await FnrhService.cancelarCadastroFnrh(cadastroCancelar.cadastroid, usuarioAtual?.usuarioid);
    if (res.sucesso) {
      exibirFeedback('Link/Cadastro cancelado com sucesso.');
      setCadastroCancelar(null);
      carregarDados();
    } else {
      setErro(res.mensagem);
    }
  };

  // Localiza a reserva vinculada por reservaid, hospedeid ou CPF do titular
  const obterReservaDoCadastro = (item: CadastroFnrh): Reserva | null => {
    // 1. Pelo reservaid registrado diretamente no cadastro
    if (item.reservaid) {
      const r = reservas.find((res) => Number(res.reservaid) === Number(item.reservaid));
      if (r) return r;
    }
    // 2. Pelo hospedeid vinculado na tabela public.hospede
    if (item.hospedeid) {
      const r = reservas.find(
        (res) => Number(res.hospedeid) === Number(item.hospedeid) && res.statusreserva !== 'CANCELADA'
      );
      if (r) return r;
    }
    // 3. Pelo CPF do titular cadastrado
    if (item.cpf) {
      const cpfLimpo = item.cpf.replace(/\D/g, '');
      if (cpfLimpo.length === 11) {
        const hEncontrado = hospedes.find(
          (h) => h.cpf && h.cpf.replace(/\D/g, '') === cpfLimpo
        );
        if (hEncontrado) {
          const r = reservas.find(
            (res) => Number(res.hospedeid) === Number(hEncontrado.hospedeid) && res.statusreserva !== 'CANCELADA'
          );
          if (r) return r;
        }
      }
    }
    return null;
  };

  // Sincroniza em background o status no banco caso a reserva já exista no sistema
  useEffect(() => {
    if (!cadastros.length || !reservas.length) return;

    cadastros.forEach(async (c) => {
      const r = obterReservaDoCadastro(c);
      if (r && (c.status !== 'RESERVA_CRIADA' || !c.reservaid)) {
        await FnrhService.vincularReservaAoCadastroFnrh({
          cadastroid: c.cadastroid,
          hospedeid: Number(c.hospedeid || r.hospedeid),
          reservaid: Number(r.reservaid),
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

    cadastros.forEach((c) => {
      const r = obterReservaDoCadastro(c);
      const jaReserva = c.status === 'RESERVA_CRIADA' || Boolean(c.reservaid) || Boolean(r);
      const expirado = new Date(c.token_expira_em) < new Date();
      const temDados = Boolean(c.nomecompleto && c.cpf && c.declaracao_aceita);

      if (jaReserva) {
        reservasCriadas++;
      } else if (c.status === 'LIBERADA_PARA_RESERVA') {
        liberadas++;
      } else if (c.status === 'AGUARDANDO_PAGAMENTO') {
        if (temDados) {
          preenchidoAguardandoSinal++;
        } else if (!expirado) {
          aguardandoPreenchimento++;
        }
      }
    });

    return { total, aguardandoPreenchimento, preenchidoAguardandoSinal, liberadas, reservasCriadas };
  }, [cadastros, reservas, hospedes]);

  // Lista Filtrada
  const cadastrosFiltrados = useMemo(() => {
    return cadastros.filter((c) => {
      // Filtro de busca
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const termoNumeros = busca.replace(/\D/g, '');
        const coincideNome = c.nomecompleto?.toLowerCase().includes(termo);
        const coincideCpf = Boolean(
          c.cpf?.toLowerCase().includes(termo) ||
          (termoNumeros && c.cpf?.replace(/\D/g, '').includes(termoNumeros))
        );
        const coincideTel = Boolean(
          c.telefone?.includes(termo) ||
          (termoNumeros && c.telefone?.replace(/\D/g, '').includes(termoNumeros))
        );
        const coincideToken = c.token_acesso?.toLowerCase().includes(termo);
        const coincideId = String(c.cadastroid) === termo;
        if (!coincideNome && !coincideCpf && !coincideTel && !coincideToken && !coincideId) {
          return false;
        }
      }

      const expirado = new Date(c.token_expira_em) < new Date();
      const temDados = Boolean(c.nomecompleto && c.cpf && c.declaracao_aceita);
      const r = obterReservaDoCadastro(c);
      const jaReserva = c.status === 'RESERVA_CRIADA' || Boolean(c.reservaid) || Boolean(r);

      // Filtro de status
      if (filtroStatus === 'AGUARDANDO_PREENCHIMENTO') {
        return c.status === 'AGUARDANDO_PAGAMENTO' && !temDados && !expirado && !jaReserva;
      }
      if (filtroStatus === 'PREENCHIDO_AGUARDANDO_SINAL') {
        return c.status === 'AGUARDANDO_PAGAMENTO' && temDados && !jaReserva;
      }
      if (filtroStatus === 'LIBERADA_PARA_RESERVA') {
        return c.status === 'LIBERADA_PARA_RESERVA' && !jaReserva;
      }
      if (filtroStatus === 'RESERVA_CRIADA') {
        return jaReserva;
      }
      if (filtroStatus === 'CANCELADA_EXPIRADA') {
        return (c.status === 'CANCELADA' || (expirado && c.status === 'AGUARDANDO_PAGAMENTO')) && !jaReserva;
      }

      return true;
    });
  }, [cadastros, busca, filtroStatus, reservas, hospedes]);

  // Renderiza a tag de status visual
  const renderizarStatusBadge = (c: CadastroFnrh) => {
    const expirado = new Date(c.token_expira_em) < new Date() && c.status === 'AGUARDANDO_PAGAMENTO';
    const preenchido = Boolean(c.nomecompleto && c.cpf && c.declaracao_aceita);
    const r = obterReservaDoCadastro(c);
    const jaReserva = c.status === 'RESERVA_CRIADA' || Boolean(c.reservaid) || Boolean(r);
    const numReserva = r?.codigo || (c.reservaid ? `#${c.reservaid}` : (r?.reservaid ? `#${r.reservaid}` : ''));

    if (c.status === 'CANCELADA') {
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
    if (c.status === 'LIBERADA_PARA_RESERVA') {
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
            Gere links seguros para o cliente preencher a FNRH online, confirme o sinal de 50% e transforme em reserva.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={carregarDados}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#c1c9bf] bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Recarregar lista"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setModalGerarAberto(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#053d1e] hover:bg-[#043017] text-xs font-bold text-white transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Gerar Novo Link FNRH
          </button>
        </div>
      </div>

      {/* Mensagem de Erro Geral */}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                filtroStatus === 'TODOS'
                  ? 'bg-[#053d1e] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({cadastros.length})
            </button>
            <button
              onClick={() => setFiltroStatus('AGUARDANDO_PREENCHIMENTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                filtroStatus === 'AGUARDANDO_PREENCHIMENTO'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aguardando Preenchimento ({contadores.aguardandoPreenchimento})
            </button>
            <button
              onClick={() => setFiltroStatus('PREENCHIDO_AGUARDANDO_SINAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                filtroStatus === 'PREENCHIDO_AGUARDANDO_SINAL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aguardando Sinal ({contadores.preenchidoAguardandoSinal})
            </button>
            <button
              onClick={() => setFiltroStatus('LIBERADA_PARA_RESERVA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                filtroStatus === 'LIBERADA_PARA_RESERVA'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Liberadas ({contadores.liberadas})
            </button>
            <button
              onClick={() => setFiltroStatus('RESERVA_CRIADA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
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
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#053d1e] text-xs font-bold text-white hover:bg-[#043017]"
              >
                <Plus className="w-4 h-4" />
                Gerar Primeiro Link FNRH
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Cadastro / Link</th>
                  <th className="py-3 px-4">Hóspede Titular</th>
                  <th className="py-3 px-4">Contato / WhatsApp</th>
                  <th className="py-3 px-4">Estadia Prevista</th>
                  <th className="py-3 px-4">Sinal (50%)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cadastrosFiltrados.map((item) => {
                  const preenchido = Boolean(item.nomecompleto && item.cpf && item.declaracao_aceita);
                  const diasRestantes = Math.ceil(
                    (new Date(item.token_expira_em).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const reservaVinculada = obterReservaDoCadastro(item);
                  const jaPossuiReserva = Boolean(
                    item.status === 'RESERVA_CRIADA' ||
                    item.reservaid ||
                    reservaVinculada
                  );
                  const codigoOuIdReserva =
                    reservaVinculada?.codigo ||
                    (item.reservaid ? `#${item.reservaid}` : (reservaVinculada?.reservaid ? `#${reservaVinculada.reservaid}` : ''));

                  return (
                    <tr
                      key={item.cadastroid}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* ID e Link */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 font-mono">#{item.cadastroid}</span>
                          <button
                            type="button"
                            onClick={() => handleCopiarLink(item)}
                            title="Copiar Link Seguro"
                            className={`p-1.5 rounded-lg border transition-colors ${
                              copiadoId === item.cadastroid
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {copiadoId === item.cadastroid ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Criado: {new Date(item.datainclusao).toLocaleDateString('pt-BR')}
                          {diasRestantes > 0
                            ? ` • ${diasRestantes}d restantes`
                            : ' • Expirado'}
                        </span>
                      </td>

                      {/* Hóspede */}
                      <td className="py-3 px-4">
                        {item.nomecompleto ? (
                          <div>
                            <span className="font-bold text-slate-900 block">{item.nomecompleto}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.cpf ? formatarCpf(item.cpf) : 'CPF não informado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Aguardando cliente preencher...</span>
                        )}
                      </td>

                      {/* Contato */}
                      <td className="py-3 px-4">
                        {item.telefone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-700">
                              {formatarTelefone(item.telefone)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEnviarWhatsApp(item)}
                              title="Abrir no WhatsApp com mensagem pronta"
                              className="p-1 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                        {item.email && (
                          <span className="text-[11px] text-slate-400 block">{item.email}</span>
                        )}
                      </td>

                      {/* Estadia Prevista */}
                      <td className="py-3 px-4">
                        {(item.dataentrada || item.datasaida) ? (
                          <div>
                            <span className="font-medium text-slate-800 block">
                              {item.dataentrada ? formatarData(item.dataentrada) : '--'} ➔{' '}
                              {item.datasaida ? formatarData(item.datasaida) : '--'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {item.adultos} ad, {item.criancas} cr
                              {item.acompanhantes && item.acompanhantes.length > 0 && (
                                <span className="ml-1 text-emerald-700 font-semibold">
                                  ({item.acompanhantes.length} acomp.)
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">A definir</span>
                        )}
                      </td>

                      {/* Sinal (50%) */}
                      <td className="py-3 px-4">
                        {item.valor_sinal > 0 ? (
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {formatarMoeda(item.valor_sinal)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {item.forma_pagamento || 'PIX'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Pendente</span>
                        )}
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
                            title="Visualizar / Editar Ficha Completa"
                            className="p-1.5 text-[#414941] hover:text-[#053d1e] hover:bg-[#e1e3e4] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Confirmar Sinal */}
                          {item.status === 'AGUARDANDO_PAGAMENTO' && (
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

                          {/* Botão Criar Reserva: Desabilitado se a reserva já foi realizada ou hóspede já importado */}
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
                          ) : item.status === 'LIBERADA_PARA_RESERVA' ? (
                            <button
                              type="button"
                              onClick={() => handleIrParaReserva(item)}
                              disabled={redirecionandoReservaId === item.cadastroid}
                              title="Efetivar Reserva no Mapa de Reservas"
                              className="p-1.5 text-[#053d1e] hover:bg-[#e6f4ea] rounded transition-colors text-xs flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
                            >
                              {redirecionandoReservaId === item.cadastroid ? (
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
                          {item.status !== 'CANCELADA' && !jaPossuiReserva && (
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
        )}
      </div>

      {/* Modal de Geração de Novo Link */}
      <ModalGerarLinkFnrh
        aberto={modalGerarAberto}
        onFechar={() => setModalGerarAberto(false)}
        onLinkCriado={(novo) => {
          exibirFeedback(`Link gerado com sucesso para o cadastro #${novo.cadastroid}!`);
          carregarDados();
        }}
      />

      {/* Modal de Detalhes da Ficha */}
      <ModalDetalhesFnrh
        aberto={Boolean(cadastroDetalhes)}
        cadastro={cadastroDetalhes}
        reservaVinculada={cadastroDetalhes ? obterReservaDoCadastro(cadastroDetalhes) : null}
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
        onFechar={() => setCadastroSinal(null)}
        onSucesso={(msg) => {
          exibirFeedback(msg);
          carregarDados();
        }}
      />

      {/* Modal de Confirmação de Cancelamento */}
      <ModalConfirmacao
        aberto={Boolean(cadastroCancelar)}
        titulo="Cancelar Link FNRH"
        mensagem={`Tem certeza que deseja cancelar o link do cadastro #${cadastroCancelar?.cadastroid}${
          cadastroCancelar?.nomecompleto ? ` (${cadastroCancelar.nomecompleto})` : ''
        }? O cliente não poderá mais enviar dados através deste link.`}
        tipo="perigo"
        textoConfirmar="Sim, Cancelar Link"
        textoCancelar="Voltar"
        onConfirmar={handleConfirmarCancelamento}
        onCancelar={() => setCadastroCancelar(null)}
      />
    </div>
  );
};
