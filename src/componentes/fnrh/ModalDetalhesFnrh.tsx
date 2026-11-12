import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Edit2,
  FileDown,
  FileText,
  LoaderCircle,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useHotel } from '../../contextos/ContextoHotel';
import { FnrhService, gerarLinkPublicoFnrh } from '../../servicos/api/FnrhService';
import { CadastroFnrh, Pacote, Reserva } from '../../tipos';
import {
  aplicarMascaraCpf,
  aplicarMascaraTelefone,
  calcularIdade,
  formatarCep,
  formatarCpf,
  formatarData,
  formatarMoeda,
  formatarParaInputDate,
  formatarTelefone
} from '../../utilitarios/formatadores';
import {
  calcularTarifaHospede,
  exportarFichaFnrhPdf,
  TarifaIndividual
} from '../../utilitarios/geradorPdfFnrh';
import { Validate } from '../../utilitarios/validate';

export { calcularTarifaHospede };
export type { TarifaIndividual };

interface ModalDetalhesFnrhProps {
  aberto: boolean;
  cadastro: CadastroFnrh | null;
  reservaVinculada?: Reserva | null;
  valorTotalSugerido?: number;
  pacoteSugerido?: Pacote | null;
  onFechar: () => void;
  onConfirmarSinal?: (cadastro: CadastroFnrh) => void;
  onCriarReserva?: (cadastro: CadastroFnrh) => void;
  onAtualizar?: (cadastroAtualizado?: CadastroFnrh) => void;
}

export const ModalDetalhesFnrh: React.FC<ModalDetalhesFnrhProps> = ({
  aberto,
  cadastro,
  reservaVinculada,
  valorTotalSugerido,
  pacoteSugerido,
  onFechar,
  onConfirmarSinal,
  onCriarReserva,
  onAtualizar,
}) => {
  const { usuarioAtual, recarregarDados, pacotes, quartos } = useHotel();
  const [copiado, setCopiado] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [cadastroAtual, setCadastroAtual] = useState<CadastroFnrh | null>(cadastro);
  const [dadosEditados, setDadosEditados] = useState<Partial<CadastroFnrh>>({});
  const [acompanhantesEditados, setAcompanhantesEditados] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [sucessoEdicao, setSucessoEdicao] = useState<string | null>(null);

  useEffect(() => {
    if (cadastro) {
      const dEntrada = (cadastro as any).dataentrada || (cadastro as any).dataEntrada;
      const dSaida = (cadastro as any).datasaida || (cadastro as any).dataSaida;
      const dNasc = (cadastro as any).datanascimento || (cadastro as any).dataNascimento;

      setCadastroAtual(cadastro);
      setDadosEditados({
        ...cadastro,
        nomecompleto: cadastro.nomecompleto ? String(cadastro.nomecompleto).toUpperCase() : '',
        dataentrada: formatarParaInputDate(dEntrada),
        datasaida: formatarParaInputDate(dSaida),
        datanascimento: formatarParaInputDate(dNasc),
      });

      setAcompanhantesEditados(
        cadastro.acompanhantes
          ? cadastro.acompanhantes.map((a: any) => ({
              ...a,
              nomecompleto: a.nomecompleto ? String(a.nomecompleto).toUpperCase() : '',
              datanascimento: formatarParaInputDate(a.datanascimento || a.dataNascimento),
            }))
          : []
      );
      setModoEdicao(false);
      setErroEdicao(null);
      setSucessoEdicao(null);
    }
  }, [cadastro, aberto]);

  const c = cadastroAtual || cadastro;
  if (!aberto || !c) return null;

  const jaPossuiReserva = Boolean(
    c.status === 'RESERVA_CRIADA' ||
    c.reservaid ||
    reservaVinculada
  );

  const codigoOuIdReserva =
    reservaVinculada?.codigo ||
    (c.reservaid ? `#${c.reservaid}` : (reservaVinculada?.reservaid ? `#${reservaVinculada.reservaid}` : ''));

  const link = gerarLinkPublicoFnrh(c.token_acesso || '');
  const estaExpirado = new Date(c.token_expira_em || '').getTime() < Date.now() && c.status === 'AGUARDANDO_PAGAMENTO';
  const preenchido = Boolean((dadosEditados.nomecompleto || c.nomecompleto) && (dadosEditados.cpf || c.cpf) && c.declaracao_aceita);
  const podeEditar = c.status === 'AGUARDANDO_PAGAMENTO';

  // Tarifa individual do Hóspede Titular
  const tarifaTitular = calcularTarifaHospede(
    dadosEditados.datanascimento || c.datanascimento,
    false,
    dadosEditados.dataentrada || c.dataentrada,
    dadosEditados.datasaida || c.datasaida,
    pacotes
  );

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleExportarPdf = async () => {
    if (!c) return;
    setGerandoPdf(true);
    try {
      await exportarFichaFnrhPdf(
        dadosEditados.cadastroid ? (dadosEditados as CadastroFnrh) : c,
        reservaVinculada,
        pacotes,
        quartos,
        valorTotalSugerido,
        pacoteSugerido
      );
    } catch (e) {
      console.error('[ModalDetalhesFnrh] Erro ao exportar PDF da FNRH:', e);
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleWhatsApp = () => {
    const telefone = (dadosEditados.telefone || c.telefone || '').replace(/\D/g, '');
    const saudacao = (dadosEditados.nomecompleto || c.nomecompleto) ? `Olá ${dadosEditados.nomecompleto || c.nomecompleto}!` : 'Olá!';
    const texto = `${saudacao} Tudo bem?

Entramos em contato a respeito da sua reserva no *Hotel Fazenda Anew*.
Para acessar ou revisar sua ficha cadastral (FNRH), segue o link:

${link}

Qualquer dúvida estamos à disposição!`;

    const urlWa = telefone
      ? `https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(urlWa, '_blank');
  };

  const badgeStatus = () => {
    if (c.status === 'CANCELADA') {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Cancelado</span>;
    }
    if (jaPossuiReserva) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          Reserva Concluída {codigoOuIdReserva ? `(${codigoOuIdReserva})` : ''}
        </span>
      );
    }
    if (c.status === 'LIBERADA_PARA_RESERVA') {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">Sinal Confirmado (Liberada)</span>;
    }
    if (estaExpirado) {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-300">Link Expirado</span>;
    }
    if (preenchido) {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Ficha Preenchida • Aguardando Sinal 50%</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Aguardando Preenchimento do Hóspede</span>;
  };

  // Handlers de data integrados com a classe Validate
  const handleAlterarDataEntrada = (novaEntrada: string) => {
    const dataSaidaAtual = formatarParaInputDate(dadosEditados.datasaida || (c as any).datasaida || (c as any).dataSaida);
    const dataSaidaAjustada = Validate.ajustarDataFimSeNecessario(novaEntrada, dataSaidaAtual);

    setDadosEditados({
      ...dadosEditados,
      dataentrada: novaEntrada,
      datasaida: dataSaidaAjustada || dadosEditados.datasaida,
    });
    setErroEdicao(null);
  };

  const handleAlterarDataSaida = (novaSaida: string) => {
    const dataEntradaAtual = formatarParaInputDate(dadosEditados.dataentrada || (c as any).dataentrada || (c as any).dataEntrada);

    setDadosEditados({
      ...dadosEditados,
      datasaida: novaSaida,
    });

    if (dataEntradaAtual && novaSaida) {
      const check = Validate.periodoDatas(dataEntradaAtual, novaSaida, {
        nomeCampoInicio: 'Data de Entrada',
        nomeCampoFim: 'Data de Saída',
      });
      setErroEdicao(check.valido ? null : (check.mensagem || 'Período inválido.'));
    } else {
      setErroEdicao(null);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!c) return;

    const dEntradaValidar = formatarParaInputDate(dadosEditados.dataentrada || (c as any).dataentrada || (c as any).dataEntrada);
    const dSaidaValidar = formatarParaInputDate(dadosEditados.datasaida || (c as any).datasaida || (c as any).dataSaida);

    // 1. Valida o período usando Validate
    const validacaoDatas = Validate.periodoDatas(dEntradaValidar, dSaidaValidar, {
      permitirMesmoDia: true,
      exigirAmbas: false,
      nomeCampoInicio: 'Data de Entrada',
      nomeCampoFim: 'Data de Saída',
    });

    if (!validacaoDatas.valido) {
      setErroEdicao(validacaoDatas.mensagem || 'A Data de Entrada não pode ser maior que a Data de Saída.');
      return;
    }

    // 2. Valida e-mail e telefone se informados
    const validacaoEmail = Validate.email(dadosEditados.email);
    if (!validacaoEmail.valido) {
      setErroEdicao(validacaoEmail.mensagem || 'E-mail inválido.');
      return;
    }

    const validacaoTel = Validate.telefone(dadosEditados.telefone);
    if (!validacaoTel.valido) {
      setErroEdicao(validacaoTel.mensagem || 'Telefone inválido.');
      return;
    }

    setSalvando(true);
    setErroEdicao(null);
    setSucessoEdicao(null);

    const nomeTitularFormatado = dadosEditados.nomecompleto
      ? String(dadosEditados.nomecompleto).trim().toUpperCase()
      : '';

    const dadosParaSalvar: Partial<CadastroFnrh> = {
      ...dadosEditados,
      nomecompleto: nomeTitularFormatado,
    };

    const acompanhantesParaSalvar = acompanhantesEditados.map((a) => ({
      ...a,
      nomecompleto: a.nomecompleto ? String(a.nomecompleto).trim().toUpperCase() : '',
    }));

    const res = await FnrhService.atualizarCadastroFnrh(
      c.cadastroid,
      dadosParaSalvar,
      acompanhantesParaSalvar,
      usuarioAtual?.usuarioid
    );

    setSalvando(false);

    if (!res.sucesso) {
      setErroEdicao(res.mensagem || 'Não foi possível salvar as alterações.');
      return;
    }

    const cadastroAtualizado: CadastroFnrh = {
      ...c,
      ...dadosParaSalvar,
      acompanhantes: acompanhantesParaSalvar,
    } as CadastroFnrh;

    setCadastroAtual(cadastroAtualizado);
    setDadosEditados({ ...cadastroAtualizado });
    setAcompanhantesEditados(acompanhantesParaSalvar.map((a) => ({ ...a })));
    setSucessoEdicao('Ficha FNRH atualizada com sucesso!');
    setModoEdicao(false);

    try {
      if (onAtualizar) {
        onAtualizar(cadastroAtualizado);
      }
      await recarregarDados();
    } catch (e) {
      console.warn('Aviso ao recarregar dados do hotel:', e);
    }

    setTimeout(() => setSucessoEdicao(null), 4000);
  };

  const handleAdicionarAcompanhante = () => {
    setAcompanhantesEditados((lista) => [
      ...lista,
      {
        nomecompleto: '',
        documento: '',
        datanascimento: '',
        cpfresponsavel: '',
        observacoes: '',
      },
    ]);
  };

  const handleRemoverAcompanhante = (index: number) => {
    setAcompanhantesEditados((lista) => lista.filter((_, idx) => idx !== index));
  };

  const handleAtualizarAcompanhante = (index: number, campo: string, valor: any) => {
    const valorTratado = campo === 'nomecompleto' ? String(valor).toUpperCase() : valor;
    setAcompanhantesEditados((lista) =>
      lista.map((item, idx) => (idx === index ? { ...item, [campo]: valorTratado } : item))
    );
  };

  const dataEntradaInput = formatarParaInputDate(dadosEditados.dataentrada || (c as any).dataentrada || (c as any).dataEntrada);
  const dataSaidaInput = formatarParaInputDate(dadosEditados.datasaida || (c as any).datasaida || (c as any).dataSaida);
  const periodoInvalido = Boolean(dataEntradaInput && dataSaidaInput && !Validate.periodoDatas(dataEntradaInput, dataSaidaInput).valido);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Topo do Modal */}
        <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-['Manrope']">
                  Ficha FNRH #{c.cadastroid}
                </h2>
                {badgeStatus()}
              </div>
              <p className="text-xs text-white/80">
                Criado em: {c.datainclusao ? new Date(c.datainclusao).toLocaleString('pt-BR') : '-'} • Expira em: {c.token_expira_em ? new Date(c.token_expira_em).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jaPossuiReserva && (
              <button
                type="button"
                disabled={gerandoPdf}
                onClick={handleExportarPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-700 text-xs font-bold text-white transition-colors cursor-pointer border border-emerald-500/40 disabled:opacity-50 shadow-2xs"
                title="Exportar esta ficha completa em formato PDF oficial"
              >
                {gerandoPdf ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>Exportar PDF</span>
              </button>
            )}
            {podeEditar && !modoEdicao && (
              <button
                type="button"
                onClick={() => setModoEdicao(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-300" />
                Editar Ficha
              </button>
            )}
            <button
              onClick={onFechar}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Link */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 max-w-lg min-w-[280px] flex-1">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Link Público:</span>
            <input
              type="text"
              readOnly
              value={link}
              className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none select-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopiar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              {copiado ? 'Copiado!' : 'Copiar Link'}
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-xs font-bold text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {erroEdicao && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroEdicao}</span>
            </div>
          )}

          {sucessoEdicao && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucessoEdicao}</span>
            </div>
          )}

          {/* Se ainda não foi preenchido */}
          {!preenchido && !modoEdicao && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">O hóspede ainda não concluiu o preenchimento deste formulário.</p>
                <p className="mt-0.5 text-amber-800">
                  Os dados exibidos abaixo são apenas os informados preliminarmente na geração do link. Você pode clicar no botão <strong>Editar Ficha</strong> acima para complementar as informações.
                </p>
              </div>
            </div>
          )}

          {/* Seção 1: Titular */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#053d1e]" />
              Dados do Hóspede Titular
            </h3>

            {modoEdicao ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={dadosEditados.nomecompleto || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, nomecompleto: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 uppercase outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">CPF</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={dadosEditados.cpf || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, cpf: aplicarMascaraCpf(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">RG</label>
                  <input
                    type="text"
                    value={dadosEditados.rg || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, rg: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formatarParaInputDate(dadosEditados.datanascimento || (c as any).datanascimento || (c as any).dataNascimento)}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, datanascimento: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Nacionalidade</label>
                  <input
                    type="text"
                    value={dadosEditados.nacionalidade || 'Brasileira'}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, nacionalidade: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Sexo</label>
                  <select
                    value={dadosEditados.sexo || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, sexo: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e] bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={dadosEditados.telefone || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, telefone: aplicarMascaraTelefone(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={dadosEditados.email || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Profissão</label>
                  <input
                    type="text"
                    value={dadosEditados.profissao || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, profissao: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">CEP</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={dadosEditados.cep || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, cep: formatarCep(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Endereço Residencial</label>
                  <input
                    type="text"
                    value={dadosEditados.endereco || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, endereco: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">N.º / Lote / Apto</label>
                  <input
                    type="text"
                    value={dadosEditados.numero || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, numero: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Cidade / Estado</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={dadosEditados.cidade || ''}
                      onChange={(e) => setDadosEditados({ ...dadosEditados, cidade: e.target.value })}
                      className="w-2/3 px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      maxLength={2}
                      value={dadosEditados.estado || ''}
                      onChange={(e) => setDadosEditados({ ...dadosEditados, estado: e.target.value.toUpperCase() })}
                      className="w-1/3 px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Última Procedência</label>
                  <input
                    type="text"
                    value={dadosEditados.ultimaprocedencia || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, ultimaprocedencia: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Próximo Destino</label>
                  <input
                    type="text"
                    value={dadosEditados.proximodestino || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, proximodestino: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Nome Completo</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.nomecompleto ? String(dadosEditados.nomecompleto).toUpperCase() : (c.nomecompleto ? String(c.nomecompleto).toUpperCase() : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">CPF</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.cpf ? formatarCpf(String(dadosEditados.cpf)) : (c.cpf ? formatarCpf(c.cpf) : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">RG</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.rg || c.rg || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data de Nascimento</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.datanascimento ? formatarData(String(dadosEditados.datanascimento)) : (c.datanascimento ? formatarData(c.datanascimento) : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nacionalidade</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.nacionalidade || c.nacionalidade || 'Brasileira'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sexo</span>
                  <span className="font-semibold text-slate-900">
                    {(dadosEditados.sexo || c.sexo) === 'M' ? 'Masculino' : (dadosEditados.sexo || c.sexo) === 'F' ? 'Feminino' : (dadosEditados.sexo || c.sexo) || '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Telefone</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.telefone ? formatarTelefone(String(dadosEditados.telefone)) : (c.telefone ? formatarTelefone(c.telefone) : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mail</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.email || c.email || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Profissão</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.profissao || c.profissao || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tarifa Individual (Titular)</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${tarifaTitular.badgeClasse}`}>
                      {tarifaTitular.tipoTexto}
                    </span>
                    <span className="font-extrabold text-[#053d1e] font-['Manrope'] text-xs">
                      {formatarMoeda(tarifaTitular.valor)}
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <span className="text-slate-500 block">Endereço Residencial</span>
                  <span className="font-semibold text-slate-900">
                    {(dadosEditados.endereco || c.endereco) ? `${dadosEditados.endereco || c.endereco}${(dadosEditados.numero || c.numero) ? `, Nº ${dadosEditados.numero || c.numero}` : ''}, ${dadosEditados.cidade || c.cidade || ''} - ${dadosEditados.estado || c.estado || ''} ${dadosEditados.cep || c.cep ? `(CEP: ${dadosEditados.cep || c.cep})` : ''}` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Última Procedência / Próximo Destino</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.ultimaprocedencia || c.ultimaprocedencia || '--'} ➔ {dadosEditados.proximodestino || c.proximodestino || '--'}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Seção 2: Hospedagem & Veículo */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-[#053d1e]" />
              Dados da Estadia e Transporte
            </h3>

            {modoEdicao ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Data de Entrada</label>
                  <input
                    type="date"
                    value={dataEntradaInput}
                    onChange={(e) => handleAlterarDataEntrada(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Data de Saída</label>
                  <input
                    type="date"
                    min={dataEntradaInput || undefined}
                    value={dataSaidaInput}
                    onChange={(e) => handleAlterarDataSaida(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-slate-900 outline-none ${
                      periodoInvalido
                        ? 'border-red-400 focus:border-red-600 bg-red-50/40'
                        : 'border-[#c1c9bf] focus:border-[#053d1e]'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Qtd. Adultos</label>
                  <input
                    type="number"
                    min={1}
                    value={dadosEditados.adultos ?? 1}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, adultos: Number(e.target.value), numerohospedes: Number(e.target.value) + Number(dadosEditados.criancas || 0) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Qtd. Crianças</label>
                  <input
                    type="number"
                    min={0}
                    value={dadosEditados.criancas ?? 0}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, criancas: Number(e.target.value), numerohospedes: Number(dadosEditados.adultos || 1) + Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Motivo da Viagem</label>
                  <input
                    type="text"
                    value={dadosEditados.motivoviagem || 'Lazer/Turismo'}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, motivoviagem: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Meio de Transporte</label>
                  <input
                    type="text"
                    value={dadosEditados.transporte || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, transporte: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Placa do Veículo</label>
                  <input
                    type="text"
                    value={dadosEditados.placa || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, placa: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold font-mono text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Modelo e Cor</label>
                  <input
                    type="text"
                    value={dadosEditados.modelocor || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, modelocor: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Data de Entrada</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.dataentrada ? formatarData(String(dadosEditados.dataentrada)) : (c.dataentrada ? formatarData(c.dataentrada) : '--')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data de Saída</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.datasaida ? formatarData(String(dadosEditados.datasaida)) : (c.datasaida ? formatarData(c.datasaida) : '--')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Hóspedes Previstos</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.numerohospedes ?? c.numerohospedes} ({dadosEditados.adultos ?? c.adultos} adulto(s), {dadosEditados.criancas ?? c.criancas} criança(s))
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Motivo da Viagem</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.motivoviagem || c.motivoviagem || 'Lazer/Turismo'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Meio de Transporte</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.transporte || c.transporte || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Placa do Veículo</span>
                  <span className="font-semibold text-slate-900 font-mono">{dadosEditados.placa || c.placa || '--'}</span>
                </div>
                <div className="lg:col-span-2">
                  <span className="text-slate-500 block">Modelo e Cor</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.modelocor || c.modelocor || '--'}</span>
                </div>
              </div>
            )}
          </section>

          {/* Seção 3: Acompanhantes e Tarifas Individuais */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#053d1e]" />
                Acompanhantes & Tarifas ({modoEdicao ? acompanhantesEditados.length : ((c.acompanhantes || acompanhantesEditados)?.length || 0)})
              </span>
              {modoEdicao && (
                <button
                  type="button"
                  onClick={handleAdicionarAcompanhante}
                  className="flex items-center gap-1 text-xs font-bold text-[#053d1e] bg-[#e6f4ea] hover:bg-[#d5ebd9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Acompanhante
                </button>
              )}
            </h3>

            {modoEdicao ? (
              acompanhantesEditados.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nenhum acompanhante cadastrado. Clique no botão acima para adicionar.</p>
              ) : (
                <div className="space-y-3">
                  {acompanhantesEditados.map((acomp, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-700">Acompanhante #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoverAcompanhante(idx)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="text-slate-600 block font-semibold mb-1">Nome Completo *</label>
                          <input
                            type="text"
                            required
                            placeholder="Nome do acompanhante"
                            value={acomp.nomecompleto || ''}
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'nomecompleto', e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold uppercase text-slate-900 outline-none focus:border-[#053d1e]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-600 block font-semibold mb-1">Documento / CPF</label>
                          <input
                            type="text"
                            placeholder="RG ou CPF"
                            value={acomp.documento || ''}
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'documento', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-600 block font-semibold mb-1">Data de Nascimento</label>
                          <input
                            type="date"
                            value={formatarParaInputDate(acomp.datanascimento || acomp.dataNascimento)}
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'datanascimento', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-600 block font-semibold mb-1">Tarifa / Idade Prevista</label>
                          <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#c1c9bf] h-[34px]">
                            <span className="text-[11px] font-bold text-slate-700">
                              {acomp.datanascimento ? calcularIdade(acomp.datanascimento) : '--'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const tarifaEd = calcularTarifaHospede(
                                  acomp.datanascimento,
                                  acomp.menoridade,
                                  dadosEditados.dataentrada || c.dataentrada,
                                  dadosEditados.datasaida || c.datasaida,
                                  pacotes
                                );
                                return (
                                  <>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${tarifaEd.badgeClasse}`}>
                                      {tarifaEd.tipoTexto}
                                    </span>
                                    <span className="font-extrabold text-[#053d1e] text-[11px] font-['Manrope']">
                                      {formatarMoeda(tarifaEd.valor)}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-600 block font-semibold mb-1">CPF Responsável (se menor)</label>
                          <input
                            type="text"
                            maxLength={14}
                            placeholder="000.000.000-00"
                            value={acomp.cpfresponsavel || ''}
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'cpfresponsavel', aplicarMascaraCpf(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-slate-600 block font-semibold mb-1">Observações</label>
                          <input
                            type="text"
                            placeholder="Observações do acompanhante"
                            value={acomp.observacoes || ''}
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'observacoes', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2.5">
                {/* Card do Titular */}
                {(dadosEditados.nomecompleto || c.nomecompleto) && (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#053d1e] text-white">
                          Titular
                        </span>
                        <span className="text-slate-500 text-[11px]">Hóspede Principal</span>
                      </div>
                      <span className="font-bold text-slate-900 block">{String(dadosEditados.nomecompleto || c.nomecompleto || '').toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Documento / Nascimento</span>
                      <span className="font-semibold text-slate-900 block">
                        {(dadosEditados.cpf || c.cpf) ? formatarCpf(String(dadosEditados.cpf || c.cpf)) : 'CPF não informado'} {(dadosEditados.datanascimento || c.datanascimento) ? `• ${formatarData(String(dadosEditados.datanascimento || c.datanascimento))}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Idade</span>
                      <span className="font-semibold text-slate-900 block">
                        {(dadosEditados.datanascimento || c.datanascimento) ? calcularIdade(String(dadosEditados.datanascimento || c.datanascimento)) : 'Adulto'}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-slate-500 block text-[11px] mb-0.5">Tarifa / Valor</span>
                      <div className="flex sm:justify-end items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${tarifaTitular.badgeClasse}`}>
                          {tarifaTitular.tipoTexto}
                        </span>
                        <span className="font-extrabold text-[#053d1e] font-['Manrope'] text-xs">
                          {formatarMoeda(tarifaTitular.valor)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cards dos Acompanhantes */}
                {((c.acompanhantes && c.acompanhantes.length > 0) ? c.acompanhantes : acompanhantesEditados).length > 0 ? (
                  ((c.acompanhantes && c.acompanhantes.length > 0) ? c.acompanhantes : acompanhantesEditados).map((acomp, idx) => {
                    const tarifa = calcularTarifaHospede(
                      acomp.datanascimento,
                      acomp.menoridade,
                      dadosEditados.dataentrada || c.dataentrada,
                      dadosEditados.datasaida || c.datasaida,
                      pacotes
                    );
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                      >
                        <div>
                          <span className="text-slate-500 block text-[11px]">Nome do Acompanhante</span>
                          <span className="font-bold text-slate-900 block">{String(acomp.nomecompleto || '').toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Documento / Nascimento</span>
                          <span className="font-semibold text-slate-900 block">
                            {acomp.documento || 'Sem doc.'} {acomp.datanascimento ? `• ${formatarData(acomp.datanascimento)}` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Idade</span>
                          <span className="font-semibold text-slate-900 block">
                            {acomp.datanascimento ? calcularIdade(acomp.datanascimento) : (acomp.menoridade ? 'Menor' : 'Adulto')}
                          </span>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-slate-500 block text-[11px] mb-0.5">Tarifa / Valor</span>
                          <div className="flex sm:justify-end items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${tarifa.badgeClasse}`}>
                              {tarifa.tipoTexto}
                            </span>
                            <span className="font-extrabold text-[#053d1e] font-['Manrope'] text-xs">
                              {formatarMoeda(tarifa.valor)}
                            </span>
                          </div>
                        </div>
                        {acomp.observacoes && (
                          <div className="sm:col-span-4 text-slate-600 bg-white p-2 rounded border border-slate-200 text-xs">
                            <span className="font-semibold">Obs:</span> {acomp.observacoes}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic mt-2">Nenhum acompanhante cadastrado para esta reserva.</p>
                )}
              </div>
            )}
          </section>

          {/* Seção 4: Restrições & Declaração */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#053d1e]" />
              Observações, Restrições & Declaração Legal
            </h3>
            {modoEdicao ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Alergias / Restrições Alimentares</label>
                  <textarea
                    rows={3}
                    value={dadosEditados.alergias_restricoes || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, alergias_restricoes: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Solicitações Especiais</label>
                  <textarea
                    rows={3}
                    value={dadosEditados.solicitacoes_especiais || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, solicitacoes_especiais: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block font-semibold mb-1">Alergias / Restrições Alimentares:</span>
                  <p className="text-slate-800">{dadosEditados.alergias_restricoes || c.alergias_restricoes || 'Nenhuma informada.'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block font-semibold mb-1">Solicitações Especiais:</span>
                  <p className="text-slate-800">{dadosEditados.solicitacoes_especiais || c.solicitacoes_especiais || 'Nenhuma informada.'}</p>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs">
              {c.declaracao_aceita ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg w-full">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Declaração da FNRH aceita pelo cliente {c.data_declaracao ? `em ${new Date(c.data_declaracao).toLocaleString('pt-BR')}` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg w-full">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Declaração dos termos ainda não confirmada pelo hóspede.</span>
                </div>
              )}
            </div>
          </section>

          {/* Seção 5: Pagamento do Sinal & Valores */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-[#053d1e]" />
              Informações Financeiras da Reserva
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Total Previsto da Estadia</span>
                <span className="font-extrabold text-[#053d1e] text-sm font-['Manrope']">
                  {valorTotalSugerido && valorTotalSugerido > 0
                    ? formatarMoeda(valorTotalSugerido)
                    : (c.valor_total ? formatarMoeda(c.valor_total) : 'A calcular')}
                </span>
                {pacoteSugerido && (
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200 inline-flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    {pacoteSugerido.nome}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Valor do Sinal (50%)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {c.valor_sinal > 0
                    ? formatarMoeda(c.valor_sinal)
                    : (valorTotalSugerido && valorTotalSugerido > 0 ? formatarMoeda(valorTotalSugerido * 0.5) : 'Pendente')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Forma Prevista / Utilizada</span>
                <span className="font-semibold text-slate-900">{c.forma_pagamento || 'A definir (PIX sugerido)'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status do Sinal</span>
                <span className="font-semibold text-slate-900">
                  {c.pagamento_confirmado_em
                    ? `Confirmado em ${new Date(c.pagamento_confirmado_em).toLocaleDateString('pt-BR')}`
                    : 'Pendente de confirmação'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {modoEdicao ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setModoEdicao(false);
                    setErroEdicao(null);
                    setDadosEditados({ ...c });
                    setAcompanhantesEditados(c.acompanhantes ? c.acompanhantes.map((a) => ({ ...a })) : []);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar Edição
                </button>

                <button
                  type="button"
                  disabled={salvando || periodoInvalido}
                  onClick={handleSalvarEdicao}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#053d1e] hover:bg-[#043017] text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50"
                >
                  {salvando ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => setModoEdicao(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-900 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-emerald-700" />
                    Editar Ficha
                  </button>
                )}

                {c.status === 'AGUARDANDO_PAGAMENTO' && onConfirmarSinal && (
                  <button
                    type="button"
                    onClick={() => {
                      onFechar();
                      onConfirmarSinal(c);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-all shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    Confirmar Sinal (50%)
                  </button>
                )}

                {jaPossuiReserva ? (
                  <>
                    <button
                      type="button"
                      disabled
                      title={`Reserva já realizada (${codigoOuIdReserva}). Hóspede já importado.`}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 cursor-not-allowed shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Reserva Criada {codigoOuIdReserva ? `(${codigoOuIdReserva})` : ''}</span>
                    </button>

                    <button
                      type="button"
                      disabled={gerandoPdf}
                      onClick={handleExportarPdf}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#053d1e] bg-[#053d1e] text-white hover:bg-[#043017] text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      title="Exportar esta ficha completa em formato PDF oficial"
                    >
                      {gerandoPdf ? (
                        <>
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          <span>Gerando PDF...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4" />
                          <span>Exportar PDF</span>
                        </>
                      )}
                    </button>
                  </>
                ) : c.status === 'LIBERADA_PARA_RESERVA' && onCriarReserva ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFechar();
                      onCriarReserva(c);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#053d1e] hover:bg-[#043017] text-xs font-bold text-white transition-all shadow-xs"
                  >
                    <Calendar className="w-4 h-4" />
                    Ir para Mapa de Reservas
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};