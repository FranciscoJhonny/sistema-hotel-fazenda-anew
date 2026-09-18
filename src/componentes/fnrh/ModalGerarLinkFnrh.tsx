import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Send,
  Calendar,
  User,
  Phone,
  Mail,
  Users,
  Clock,
  Sparkles,
  LoaderCircle,
  AlertCircle
} from 'lucide-react';
import { FnrhService } from '../../servicos/supabase/FnrhService';
import { CadastroFnrh } from '../../tipos';
import { useHotel } from '../../contextos/ContextoHotel';

interface ModalGerarLinkFnrhProps {
  aberto: boolean;
  onFechar: () => void;
  onLinkCriado: (cadastro: CadastroFnrh) => void;
}

export const ModalGerarLinkFnrh: React.FC<ModalGerarLinkFnrhProps> = ({
  aberto,
  onFechar,
  onLinkCriado,
}) => {
  const { usuarioAtual, dataSistema } = useHotel();

  // Campos do formulário de geração
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataSaida, setDataSaida] = useState('');
  const [adultos, setAdultos] = useState(1);
  const [criancas, setCriancas] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Estados de controle
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!aberto) return null;

  const limparFormulario = () => {
    setNome('');
    setTelefone('');
    setEmail('');
    setDataEntrada('');
    setDataSaida('');
    setAdultos(1);
    setCriancas(0);
    setObservacoes('');
    setErro(null);
    setLinkGerado(null);
    setTokenGerado(null);
    setCopiado(false);
  };

  const fecharEresetar = () => {
    limparFormulario();
    onFechar();
  };

  const handleGerarLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCarregando(true);
    setErro(null);

    const res = await FnrhService.gerarNovoLinkFnrh({
      nomecompleto: nome,
      telefone,
      email,
      dataentrada: dataEntrada || undefined,
      datasaida: dataSaida || undefined,
      adultos: Number(adultos) || 1,
      criancas: Number(criancas) || 0,
      solicitacoes_especiais: observacoes,
      usuarioId: usuarioAtual?.usuarioid,
    });

    setCarregando(false);

    if (!res.sucesso || !res.cadastro || !res.linkPublico) {
      setErro(res.erro || 'Erro ao gerar o link. Tente novamente.');
      return;
    }

    setLinkGerado(res.linkPublico);
    setTokenGerado(res.cadastro.token_acesso);
    onLinkCriado(res.cadastro);
  };

  const handleCopiarLink = async () => {
    if (!linkGerado) return;
    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = linkGerado;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const handleEnviarWhatsApp = () => {
    if (!linkGerado) return;
    const numLimpo = telefone.replace(/\D/g, '');
    const saudacao = nome.trim() ? `Olá ${nome.trim()}!` : 'Olá!';
    const texto = `${saudacao} Tudo bem?

Para agilizarmos seu atendimento e a confirmação da sua reserva no *Hotel Fazenda Anew*, por favor preencha sua *Ficha Nacional de Registro de Hóspedes (FNRH)* através do link seguro abaixo:

${linkPublicoWhatsapp(linkGerado)}

*Atenção:* Este link tem validade de *7 dias*.

Qualquer dúvida, estamos à disposição!`;

    const urlWa = numLimpo
      ? `https://wa.me/55${numLimpo}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(urlWa, '_blank');
  };

  const linkPublicoWhatsapp = (link: string) => link;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-[#053d1e] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <LinkIcon className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Manrope']">
                {linkGerado ? 'Link FNRH Criado com Sucesso!' : 'Gerar Link de Cadastro FNRH'}
              </h2>
              <p className="text-xs text-white/80">
                {linkGerado
                  ? 'Envie o link para o cliente preencher os dados da hospedagem'
                  : 'Gere um link público seguro com validade de 7 dias'}
              </p>
            </div>
          </div>
          <button
            onClick={fecharEresetar}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {erro && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {linkGerado ? (
            /* Tela de Link Criado / Sucesso */
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#053d1e]">
                  <Sparkles className="h-6 w-6 text-emerald-700" />
                </div>
                <h3 className="font-['Manrope'] font-bold text-emerald-950 text-base">
                  Link pronto para envio!
                </h3>
                <p className="mt-1 text-xs text-emerald-800">
                  O cliente poderá abrir em qualquer smartphone ou computador para preencher a ficha.
                </p>
              </div>

              {/* Caixa com a URL Dinâmica */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Link Público (URL Dinâmica)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={linkGerado}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-800 select-all outline-none focus:border-[#053d1e]"
                  />
                  <button
                    type="button"
                    onClick={handleCopiarLink}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      copiado
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#053d1e] text-white hover:bg-[#043017]'
                    }`}
                  >
                    {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Ações de Compartilhamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleEnviarWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Enviar via WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleCopiarLink}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#c1c9bf] bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  {copiado ? 'Link Copiado!' : 'Copiar Apenas o Link'}
                </button>
              </div>

              {/* Informações complementares */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Validade do Link: 7 dias a partir de agora</span>
                </div>
                {nome && <p>• <span className="font-semibold">Hóspede previsto:</span> {nome}</p>}
                {telefone && <p>• <span className="font-semibold">WhatsApp:</span> {telefone}</p>}
                {(dataEntrada || dataSaida) && (
                  <p>
                    • <span className="font-semibold">Período:</span> {dataEntrada || '--'} até {dataSaida || '--'}
                  </p>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="text-xs font-bold text-[#053d1e] hover:underline"
                >
                  + Gerar Outro Link
                </button>
                <button
                  type="button"
                  onClick={fecharEresetar}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            /* Formulário de Criação */
            <form onSubmit={handleGerarLink} className="space-y-4">
              <p className="text-xs text-slate-500">
                Você pode gerar o link rapidamente agora. Os campos abaixo são <strong>opcionais</strong> e servem para identificar o atendimento ou já adiantar dados do cliente:
              </p>

              {/* Dados do Interessado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Cliente (opcional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp (opcional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder="(67) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>
              </div>

              {/* Datas previstas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previsão de Entrada (Check-in)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={dataEntrada}
                      onChange={(e) => setDataEntrada(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previsão de Saída (Check-out)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={dataSaida}
                      onChange={(e) => setDataSaida(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>
              </div>

              {/* Hóspedes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adultos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adultos}
                    onChange={(e) => setAdultos(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Crianças
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={criancas}
                    onChange={(e) => setCriancas(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                  />
                </div>
              </div>

              {/* Observações / Anotações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Internas / Solicitações (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cliente prefere quarto térreo, sinal acordado via PIX de R$ 450..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={fecharEresetar}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#053d1e] text-xs font-bold text-white hover:bg-[#043017] transition-all disabled:opacity-50"
                >
                  {carregando ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Gerando Link...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Gerar Link FNRH
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

