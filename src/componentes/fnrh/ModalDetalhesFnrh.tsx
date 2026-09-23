import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Car,
  Users,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  FileText,
  Copy,
  Send,
  CheckCircle2,
  Clock,
  Edit2,
  Save,
  Plus,
  Trash2,
  LoaderCircle,
  AlertCircle
} from 'lucide-react';
import { CadastroFnrh, Reserva } from '../../tipos';
import { FnrhService, gerarLinkPublicoFnrh } from '../../servicos/supabase/FnrhService';
import {
  aplicarMascaraCpf,
  aplicarMascaraTelefone,
  calcularIdade,
  formatarCep,
  formatarCpf,
  formatarData,
  formatarMoeda,
  formatarTelefone
} from '../../utilitarios/formatadores';
import { useHotel } from '../../contextos/ContextoHotel';

interface ModalDetalhesFnrhProps {
  aberto: boolean;
  cadastro: CadastroFnrh | null;
  reservaVinculada?: Reserva | null;
  onFechar: () => void;
  onConfirmarSinal?: (cadastro: CadastroFnrh) => void;
  onCriarReserva?: (cadastro: CadastroFnrh) => void;
  onAtualizar?: () => void;
}

export const ModalDetalhesFnrh: React.FC<ModalDetalhesFnrhProps> = ({
  aberto,
  cadastro,
  reservaVinculada,
  onFechar,
  onConfirmarSinal,
  onCriarReserva,
  onAtualizar,
}) => {
  const { usuarioAtual, recarregarDados } = useHotel();
  const [copiado, setCopiado] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dadosEditados, setDadosEditados] = useState<Partial<CadastroFnrh>>({});
  const [acompanhantesEditados, setAcompanhantesEditados] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [sucessoEdicao, setSucessoEdicao] = useState<string | null>(null);

  useEffect(() => {
    if (cadastro) {
      setDadosEditados({ ...cadastro });
      setAcompanhantesEditados(cadastro.acompanhantes ? cadastro.acompanhantes.map((a) => ({ ...a })) : []);
      setModoEdicao(false);
      setErroEdicao(null);
      setSucessoEdicao(null);
    }
  }, [cadastro, aberto]);

  if (!aberto || !cadastro) return null;

  const jaPossuiReserva = Boolean(
    cadastro.status === 'RESERVA_CRIADA' ||
    cadastro.reservaid ||
    reservaVinculada
  );

  const codigoOuIdReserva =
    reservaVinculada?.codigo ||
    (cadastro.reservaid ? `#${cadastro.reservaid}` : (reservaVinculada?.reservaid ? `#${reservaVinculada.reservaid}` : ''));

  const link = gerarLinkPublicoFnrh(cadastro.token_acesso);
  const estaExpirado = new Date(cadastro.token_expira_em) < new Date() && cadastro.status === 'AGUARDANDO_PAGAMENTO';
  const preenchido = Boolean(cadastro.nomecompleto && cadastro.cpf && cadastro.declaracao_aceita);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleWhatsApp = () => {
    const telefone = (dadosEditados.telefone || cadastro.telefone || '').replace(/\D/g, '');
    const saudacao = (dadosEditados.nomecompleto || cadastro.nomecompleto) ? `Olá ${dadosEditados.nomecompleto || cadastro.nomecompleto}!` : 'Olá!';
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
    if (cadastro.status === 'CANCELADA') {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Cancelado</span>;
    }
    if (jaPossuiReserva) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          Reserva Concluída {codigoOuIdReserva ? `(${codigoOuIdReserva})` : ''}
        </span>
      );
    }
    if (cadastro.status === 'LIBERADA_PARA_RESERVA') {
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

  const handleSalvarEdicao = async () => {
    setSalvando(true);
    setErroEdicao(null);
    setSucessoEdicao(null);

    const res = await FnrhService.atualizarCadastroFnrh(
      cadastro.cadastroid,
      dadosEditados,
      acompanhantesEditados,
      usuarioAtual?.usuarioid
    );

    setSalvando(false);

    if (!res.sucesso) {
      setErroEdicao(res.mensagem || 'Não foi possível salvar as alterações.');
      return;
    }

    setSucessoEdicao('Ficha FNRH atualizada com sucesso!');
    setModoEdicao(false);

    try {
      await recarregarDados();
      if (onAtualizar) onAtualizar();
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
    setAcompanhantesEditados((lista) =>
      lista.map((item, idx) => (idx === index ? { ...item, [campo]: valor } : item))
    );
  };

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
                  Ficha FNRH #{cadastro.cadastroid}
                </h2>
                {badgeStatus()}
              </div>
              <p className="text-xs text-white/80">
                Criado em: {new Date(cadastro.datainclusao).toLocaleString('pt-BR')} • Expira em: {new Date(cadastro.token_expira_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!modoEdicao && (
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 flex items-center gap-2">
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
                    onChange={(e) => setDadosEditados({ ...dadosEditados, nomecompleto: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
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
                    value={dadosEditados.datanascimento || ''}
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
                  <span className="font-semibold text-slate-900">{dadosEditados.nomecompleto || cadastro.nomecompleto || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">CPF</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.cpf ? formatarCpf(String(dadosEditados.cpf)) : (cadastro.cpf ? formatarCpf(cadastro.cpf) : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">RG</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.rg || cadastro.rg || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data de Nascimento</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.datanascimento ? formatarData(String(dadosEditados.datanascimento)) : (cadastro.datanascimento ? formatarData(cadastro.datanascimento) : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nacionalidade</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.nacionalidade || cadastro.nacionalidade || 'Brasileira'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sexo</span>
                  <span className="font-semibold text-slate-900">
                    {(dadosEditados.sexo || cadastro.sexo) === 'M' ? 'Masculino' : (dadosEditados.sexo || cadastro.sexo) === 'F' ? 'Feminino' : (dadosEditados.sexo || cadastro.sexo) || '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Telefone</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.telefone ? formatarTelefone(String(dadosEditados.telefone)) : (cadastro.telefone ? formatarTelefone(cadastro.telefone) : '--')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mail</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.email || cadastro.email || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Profissão</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.profissao || cadastro.profissao || '--'}</span>
                </div>
                <div className="lg:col-span-2">
                  <span className="text-slate-500 block">Endereço Residencial</span>
                  <span className="font-semibold text-slate-900">
                    {(dadosEditados.endereco || cadastro.endereco) ? `${dadosEditados.endereco || cadastro.endereco}, ${dadosEditados.cidade || cadastro.cidade || ''} - ${dadosEditados.estado || cadastro.estado || ''} ${dadosEditados.cep || cadastro.cep ? `(CEP: ${dadosEditados.cep || cadastro.cep})` : ''}` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Última Procedência / Próximo Destino</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.ultimaprocedencia || cadastro.ultimaprocedencia || '--'} ➔ {dadosEditados.proximodestino || cadastro.proximodestino || '--'}
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
                    value={dadosEditados.dataentrada || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, dataentrada: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block font-semibold mb-1">Data de Saída</label>
                  <input
                    type="date"
                    value={dadosEditados.datasaida || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, datasaida: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
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
                    {dadosEditados.dataentrada ? formatarData(String(dadosEditados.dataentrada)) : (cadastro.dataentrada ? formatarData(cadastro.dataentrada) : '--')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data de Saída</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.datasaida ? formatarData(String(dadosEditados.datasaida)) : (cadastro.datasaida ? formatarData(cadastro.datasaida) : '--')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Hóspedes Previstos</span>
                  <span className="font-semibold text-slate-900">
                    {dadosEditados.numerohospedes ?? cadastro.numerohospedes} ({dadosEditados.adultos ?? cadastro.adultos} adulto(s), {dadosEditados.criancas ?? cadastro.criancas} criança(s))
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Motivo da Viagem</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.motivoviagem || cadastro.motivoviagem || 'Lazer/Turismo'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Meio de Transporte</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.transporte || cadastro.transporte || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Placa do Veículo</span>
                  <span className="font-semibold text-slate-900 font-mono">{dadosEditados.placa || cadastro.placa || '--'}</span>
                </div>
                <div className="lg:col-span-2">
                  <span className="text-slate-500 block">Modelo e Cor</span>
                  <span className="font-semibold text-slate-900">{dadosEditados.modelocor || cadastro.modelocor || '--'}</span>
                </div>
              </div>
            )}
          </section>

          {/* Seção 3: Acompanhantes */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#053d1e]" />
                Acompanhantes Cadastrados ({modoEdicao ? acompanhantesEditados.length : (cadastro.acompanhantes?.length || 0)})
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
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'nomecompleto', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
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
                            value={acomp.datanascimento || ''}
                            onChange={(e) => handleAtualizarAcompanhante(idx, 'datanascimento', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#c1c9bf] text-xs font-semibold text-slate-900 outline-none focus:border-[#053d1e]"
                          />
                        </div>

                        <div>
                          <label className="text-slate-600 block font-semibold mb-1">Idade (Calculada)</label>
                          <div className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center h-[32px]">
                            {calcularIdade(acomp.datanascimento)}
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
            ) : !cadastro.acompanhantes || cadastro.acompanhantes.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum acompanhante cadastrado.</p>
            ) : (
              <div className="space-y-2.5">
                {cadastro.acompanhantes.map((acomp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2"
                  >
                    <div>
                      <span className="text-slate-500 block">Nome do Acompanhante</span>
                      <span className="font-semibold text-slate-900">{acomp.nomecompleto}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Documento / Nascimento</span>
                      <span className="font-semibold text-slate-900">
                        {acomp.documento || 'Sem doc.'} {acomp.datanascimento ? `• Nasc: ${formatarData(acomp.datanascimento)}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Idade</span>
                      <span className="font-semibold text-slate-900">
                        {calcularIdade(acomp.datanascimento)}
                      </span>
                    </div>
                    {acomp.observacoes && (
                      <div className="sm:col-span-3 text-slate-600 bg-white p-2 rounded border border-slate-200">
                        <span className="font-semibold">Obs:</span> {acomp.observacoes}
                      </div>
                    )}
                  </div>
                ))}
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
                  <p className="text-slate-800">{dadosEditados.alergias_restricoes || cadastro.alergias_restricoes || 'Nenhuma informada.'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block font-semibold mb-1">Solicitações Especiais:</span>
                  <p className="text-slate-800">{dadosEditados.solicitacoes_especiais || cadastro.solicitacoes_especiais || 'Nenhuma informada.'}</p>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs">
              {cadastro.declaracao_aceita ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg w-full">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Declaração da FNRH aceita pelo cliente {cadastro.data_declaracao ? `em ${new Date(cadastro.data_declaracao).toLocaleString('pt-BR')}` : ''}
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

          {/* Seção 5: Pagamento do Sinal (LEITURA APENAS) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-[#053d1e]" />
              Informações do Sinal da Reserva (50%)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Forma Prevista / Utilizada</span>
                <span className="font-semibold text-slate-900">{cadastro.forma_pagamento || 'A definir (PIX sugerido)'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Valor do Sinal Registrado</span>
                <span className="font-bold text-slate-900 text-sm">
                  {cadastro.valor_sinal > 0 ? formatarMoeda(cadastro.valor_sinal) : 'R$ 0,00'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Status do Sinal</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.pagamento_confirmado_em
                    ? `Confirmado em ${new Date(cadastro.pagamento_confirmado_em).toLocaleDateString('pt-BR')}`
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
                    setDadosEditados({ ...cadastro });
                    setAcompanhantesEditados(cadastro.acompanhantes ? cadastro.acompanhantes.map((a) => ({ ...a })) : []);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar Edição
                </button>

                <button
                  type="button"
                  disabled={salvando}
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
                <button
                  type="button"
                  onClick={() => setModoEdicao(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-900 transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-emerald-700" />
                  Editar Ficha
                </button>

                {cadastro.status === 'AGUARDANDO_PAGAMENTO' && onConfirmarSinal && (
                  <button
                    type="button"
                    onClick={() => {
                      onFechar();
                      onConfirmarSinal(cadastro);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-all shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    Confirmar Sinal (50%)
                  </button>
                )}

                {jaPossuiReserva ? (
                  <button
                    type="button"
                    disabled
                    title={`Reserva já realizada (${codigoOuIdReserva}). Hóspede já importado.`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 cursor-not-allowed shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Reserva Criada {codigoOuIdReserva ? `(${codigoOuIdReserva})` : ''}</span>
                  </button>
                ) : cadastro.status === 'LIBERADA_PARA_RESERVA' && onCriarReserva ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFechar();
                      onCriarReserva(cadastro);
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
