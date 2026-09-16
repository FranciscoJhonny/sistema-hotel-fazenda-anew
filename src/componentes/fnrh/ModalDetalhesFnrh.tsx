import React from 'react';
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
  Clock
} from 'lucide-react';
import { CadastroFnrh } from '../../tipos';
import { gerarLinkPublicoFnrh } from '../../servicos/supabase/FnrhService';
import { formatarCpf, formatarData, formatarMoeda, formatarTelefone } from '../../utilitarios/formatadores';

interface ModalDetalhesFnrhProps {
  aberto: boolean;
  cadastro: CadastroFnrh | null;
  onFechar: () => void;
  onConfirmarSinal?: (cadastro: CadastroFnrh) => void;
  onCriarReserva?: (cadastro: CadastroFnrh) => void;
}

export const ModalDetalhesFnrh: React.FC<ModalDetalhesFnrhProps> = ({
  aberto,
  cadastro,
  onFechar,
  onConfirmarSinal,
  onCriarReserva,
}) => {
  const [copiado, setCopiado] = React.useState(false);

  if (!aberto || !cadastro) return null;

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
    const telefone = cadastro.telefone || '';
    const numLimpo = telefone.replace(/\D/g, '');
    const saudacao = cadastro.nomecompleto ? `Olá ${cadastro.nomecompleto}! 🌿` : 'Olá! 🌿';
    const texto = `${saudacao} Tudo bem?

Entramos em contato a respeito da sua reserva no *Hotel Fazenda Anew*.
Para acessar ou revisar sua ficha cadastral (FNRH), segue o link:

🔗 ${link}

Qualquer dúvida estamos à disposição!`;

    const urlWa = numLimpo
      ? `https://wa.me/55${numLimpo}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(urlWa, '_blank');
  };

  const badgeStatus = () => {
    if (cadastro.status === 'CANCELADA') {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Cancelado</span>;
    }
    if (cadastro.status === 'RESERVA_CRIADA') {
      return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Reserva Concluída</span>;
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
          <button
            onClick={onFechar}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
          
          {/* Se ainda não foi preenchido */}
          {!preenchido && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">O hóspede ainda não concluiu o preenchimento deste formulário.</p>
                <p className="mt-0.5 text-amber-800">
                  Os dados exibidos abaixo são apenas os informados preliminarmente na geração do link. Assim que o cliente preencher a ficha pelo link seguro, as informações serão atualizadas automaticamente aqui.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Nome Completo</span>
                <span className="font-semibold text-slate-900">{cadastro.nomecompleto || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CPF</span>
                <span className="font-semibold text-slate-900">{cadastro.cpf ? formatarCpf(cadastro.cpf) : '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">RG</span>
                <span className="font-semibold text-slate-900">{cadastro.rg || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Data de Nascimento</span>
                <span className="font-semibold text-slate-900">{cadastro.datanascimento ? formatarData(cadastro.datanascimento) : '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Nacionalidade</span>
                <span className="font-semibold text-slate-900">{cadastro.nacionalidade || 'Brasileira'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sexo</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.sexo === 'M' ? 'Masculino' : cadastro.sexo === 'F' ? 'Feminino' : cadastro.sexo || '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Telefone</span>
                <span className="font-semibold text-slate-900">{cadastro.telefone ? formatarTelefone(cadastro.telefone) : '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">E-mail</span>
                <span className="font-semibold text-slate-900">{cadastro.email || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Profissão</span>
                <span className="font-semibold text-slate-900">{cadastro.profissao || '--'}</span>
              </div>
              <div className="lg:col-span-2">
                <span className="text-slate-500 block">Endereço Residencial</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.endereco ? `${cadastro.endereco}, ${cadastro.cidade || ''} - ${cadastro.estado || ''} ${cadastro.cep ? `(CEP: ${cadastro.cep})` : ''}` : '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Última Procedência / Próximo Destino</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.ultimaprocedencia || '--'} ➔ {cadastro.proximodestino || '--'}
                </span>
              </div>
            </div>
          </section>

          {/* Seção 2: Hospedagem & Veículo */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-[#053d1e]" />
              Dados da Estadia e Transporte
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Data de Entrada</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.dataentrada ? formatarData(cadastro.dataentrada) : '--'} {cadastro.horarioprevistochegada ? `às ${cadastro.horarioprevistochegada}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Data de Saída</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.datasaida ? formatarData(cadastro.datasaida) : '--'} {cadastro.horarioprevistasaida ? `às ${cadastro.horarioprevistasaida}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Hóspedes Previstos</span>
                <span className="font-semibold text-slate-900">
                  {cadastro.numerohospedes} ({cadastro.adultos} adulto(s), {cadastro.criancas} criança(s))
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Motivo da Viagem</span>
                <span className="font-semibold text-slate-900">{cadastro.motivoviagem || 'Lazer/Turismo'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Meio de Transporte</span>
                <span className="font-semibold text-slate-900">{cadastro.transporte || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Placa do Veículo</span>
                <span className="font-semibold text-slate-900 font-mono">{cadastro.placa || '--'}</span>
              </div>
              <div className="lg:col-span-2">
                <span className="text-slate-500 block">Modelo e Cor</span>
                <span className="font-semibold text-slate-900">{cadastro.modelocor || '--'}</span>
              </div>
            </div>
          </section>

          {/* Seção 3: Acompanhantes */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold font-['Manrope'] text-[#053d1e] mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#053d1e]" />
                Acompanhantes Cadastrados ({cadastro.acompanhantes?.length || 0})
              </span>
            </h3>

            {!cadastro.acompanhantes || cadastro.acompanhantes.length === 0 ? (
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
                      <span className="text-slate-500 block">Menor de Idade?</span>
                      <span className="font-semibold text-slate-900">
                        {acomp.menoridade ? `Sim (Resp: ${acomp.cpfresponsavel || 'Não informado'})` : 'Não'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block font-semibold mb-1">Alergias / Restrições Alimentares:</span>
                <p className="text-slate-800">{cadastro.alergias_restricoes || 'Nenhuma informada.'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block font-semibold mb-1">Solicitações Especiais:</span>
                <p className="text-slate-800">{cadastro.solicitacoes_especiais || 'Nenhuma informada.'}</p>
              </div>
            </div>

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

          {/* Seção 5: Pagamento do Sinal */}
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

            {cadastro.status === 'LIBERADA_PARA_RESERVA' && onCriarReserva && (
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
            )}

            {cadastro.status === 'RESERVA_CRIADA' && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Reserva Criada {cadastro.reservaid ? `#${cadastro.reservaid}` : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

