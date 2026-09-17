import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  MapPin,
  FileText,
  Phone,
  AlertCircle,
  Loader2,
  Copy,
  Heart,
  Save,
} from 'lucide-react';
import { Hospede } from '../../tipos';
import {
  formatarCpf,
  formatarTelefone,
  formatarCep,
} from '../../utilitarios/formatadores';

const ESTADOS_BRASIL = [
  'MS', 'MT', 'SP', 'PR', 'RJ', 'MG', 'SC', 'RS', 'GO', 'DF',
  'BA', 'ES', 'PE', 'CE', 'PA', 'AM', 'MA', 'PB', 'RN', 'AL',
  'PI', 'SE', 'RO', 'TO', 'AC', 'AP', 'RR'
];

interface ModalCadastroHospedeProps {
  aberto: boolean;
  hospedeEdicao: Hospede | null;
  onFechar: () => void;
  onSalvar: (dados: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>, hospedeId?: number | string) => Promise<void> | void;
}

export const ModalCadastroHospede: React.FC<ModalCadastroHospedeProps> = ({
  aberto,
  hospedeEdicao,
  onFechar,
  onSalvar,
}) => {
  // 1. Dados Pessoais & Documentos
  const [nomecompleto, setNomecompleto] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [rg, setRg] = useState<string>('');
  const [passaporte, setPassaporte] = useState<string>('');
  const [datanascimento, setDatanascimento] = useState<string>('');
  const [sexo, setSexo] = useState<string>('');
  const [nacionalidade, setNacionalidade] = useState<string>('Brasileira');
  const [profissao, setProfissao] = useState<string>('');

  // 2. Contato & Endereço
  const [telefone, setTelefone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [cep, setCep] = useState<string>('');
  const [endereco, setEndereco] = useState<string>('');
  const [cidade, setCidade] = useState<string>('Campo Grande');
  const [estado, setEstado] = useState<string>('MS');
  const [buscandoCep, setBuscandoCep] = useState<boolean>(false);

  // 3. FNRH & Preferências
  const [ultimaprocedencia, setUltimaprocedencia] = useState<string>('');
  const [proximodestino, setProximodestino] = useState<string>('');
  const [cpfresponsavelmenor, setCpfresponsavelmenor] = useState<string>('');
  const [alergias_restricoes, setAlergiasRestricoes] = useState<string>('');
  const [solicitacoes_especiais, setSolicitacoesEspeciais] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Estado de submissão
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    if (hospedeEdicao) {
      setNomecompleto(hospedeEdicao.nomecompleto || '');
      setCpf(formatarCpf(hospedeEdicao.cpf || ''));
      setRg(hospedeEdicao.rg || '');
      setPassaporte(hospedeEdicao.passaporte || '');
      setDatanascimento(hospedeEdicao.datanascimento || '');
      setSexo(hospedeEdicao.sexo || '');
      setNacionalidade(hospedeEdicao.nacionalidade || 'Brasileira');
      setProfissao(hospedeEdicao.profissao || '');

      setTelefone(formatarTelefone(hospedeEdicao.telefone || ''));
      setWhatsapp(formatarTelefone(hospedeEdicao.whatsapp || hospedeEdicao.telefone || ''));
      setEmail(hospedeEdicao.email || '');
      setCep(formatarCep(hospedeEdicao.cep || ''));
      setEndereco(hospedeEdicao.endereco || '');
      setCidade(hospedeEdicao.cidade || 'Campo Grande');
      setEstado(hospedeEdicao.estado || 'MS');

      setUltimaprocedencia(hospedeEdicao.ultimaprocedencia || '');
      setProximodestino(hospedeEdicao.proximodestino || '');
      setCpfresponsavelmenor(formatarCpf(hospedeEdicao.cpfresponsavelmenor || ''));
      setAlergiasRestricoes(hospedeEdicao.alergias_restricoes || '');
      setSolicitacoesEspeciais(hospedeEdicao.solicitacoes_especiais || '');
      setObservacoes(hospedeEdicao.observacoes || '');
    } else {
      setNomecompleto('');
      setCpf('');
      setRg('');
      setPassaporte('');
      setDatanascimento('');
      setSexo('');
      setNacionalidade('Brasileira');
      setProfissao('');

      setTelefone('');
      setWhatsapp('');
      setEmail('');
      setCep('');
      setEndereco('');
      setCidade('Campo Grande');
      setEstado('MS');

      setUltimaprocedencia('');
      setProximodestino('');
      setCpfresponsavelmenor('');
      setAlergiasRestricoes('');
      setSolicitacoesEspeciais('');
      setObservacoes('');
    }
    setErroValidacao(null);
  }, [hospedeEdicao, aberto]);

  if (!aberto) return null;

  // Busca automática do CEP via ViaCEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = formatarCep(e.target.value);
    setCep(valor);

    const digitos = valor.replace(/\D/g, '');
    if (digitos.length === 8) {
      setBuscandoCep(true);
      try {
        const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
        const data = await resp.json();
        if (!data.erro) {
          if (data.logradouro) {
            setEndereco(`${data.logradouro}${data.bairro ? ` - ${data.bairro}` : ''}`);
          }
          if (data.localidade) setCidade(data.localidade);
          if (data.uf) setEstado(data.uf);
        }
      } catch (err) {
        console.error('Erro ao consultar ViaCEP:', err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const handleCopiarTelefoneParaWhatsapp = () => {
    if (telefone) {
      setWhatsapp(telefone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    if (!nomecompleto.trim()) {
      setErroValidacao('O Nome Completo é obrigatório.');
      return;
    }

    if (!telefone.trim()) {
      setErroValidacao('O Telefone de Contato é obrigatório.');
      return;
    }

    const dadosLimpos = {
      nomecompleto: nomecompleto.trim(),
      cpf: cpf.trim() || '000.000.000-00',
      rg: rg.trim() || null,
      passaporte: passaporte.trim() || null,
      datanascimento: datanascimento || null,
      sexo: sexo || null,
      nacionalidade: nacionalidade.trim() || 'Brasileira',
      profissao: profissao.trim() || null,

      telefone: telefone.trim(),
      whatsapp: whatsapp.trim() || telefone.trim(),
      email: email.trim() || null,
      cep: cep.trim() || null,
      endereco: endereco.trim() || null,
      cidade: cidade.trim() || 'Campo Grande',
      estado: estado.trim() || 'MS',

      ultimaprocedencia: ultimaprocedencia.trim() || null,
      proximodestino: proximodestino.trim() || null,
      cpfresponsavelmenor: cpfresponsavelmenor.trim() || null,
      alergias_restricoes: alergias_restricoes.trim() || null,
      solicitacoes_especiais: solicitacoes_especiais.trim() || null,
      observacoes: observacoes.trim() || null,
    };

    setSalvando(true);
    try {
      await onSalvar(dadosLimpos, hospedeEdicao?.hospedeid);
      onFechar();
    } catch (err: any) {
      setErroValidacao(err?.message || 'Erro ao salvar hóspede. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-[#053d1e] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Manrope'] text-lg font-bold">
                {hospedeEdicao ? `Editar Hóspede #${hospedeEdicao.hospedeid}` : 'Novo Cadastro de Hóspede'}
              </h2>
              <p className="text-xs text-emerald-100">
                {hospedeEdicao
                  ? 'Atualize os dados cadastrais e preferências do hóspede.'
                  : 'Cadastro direto pelo administrador com informações para reserva e FNRH.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Rolagem Interna */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {erroValidacao && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-medium">{erroValidacao}</span>
            </div>
          )}

          {/* SEÇÃO 1: DADOS PESSOAIS & DOCUMENTOS */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-[#053d1e]" />
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                1. Dados Pessoais & Documentação
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              {/* Nome Completo */}
              <div className="sm:col-span-8">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Roberto da Silva"
                  value={nomecompleto}
                  onChange={(e) => setNomecompleto(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e] focus:ring-1 focus:ring-[#053d1e]"
                />
              </div>

              {/* Data de Nascimento */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={datanascimento}
                  onChange={(e) => setDatanascimento(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* CPF */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* RG */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  RG / Órgão Emissor
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1234567 SSP/MS"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Passaporte */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Passaporte (Estrangeiros)
                </label>
                <input
                  type="text"
                  placeholder="Ex: FP123456"
                  value={passaporte}
                  onChange={(e) => setPassaporte(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Sexo */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Sexo / Gênero
                </label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                >
                  <option value="">Não informado</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>

              {/* Nacionalidade */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nacionalidade
                </label>
                <input
                  type="text"
                  placeholder="Brasileira"
                  value={nacionalidade}
                  onChange={(e) => setNacionalidade(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Profissão */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Profissão / Ocupação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Engenheiro, Produtor, etc."
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: CONTATO & ENDEREÇO */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Phone className="w-4 h-4 text-[#053d1e]" />
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                2. Contatos & Endereço
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              {/* Telefone */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Telefone Principal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(67) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* WhatsApp */}
              <div className="sm:col-span-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">WhatsApp</label>
                  {telefone && telefone !== whatsapp && (
                    <button
                      type="button"
                      onClick={handleCopiarTelefoneParaWhatsapp}
                      className="text-[10px] text-[#053d1e] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copiar telefone</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="(67) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatarTelefone(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* E-mail */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="hospede@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* CEP */}
              <div className="sm:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">CEP</label>
                  {buscandoCep && (
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={handleCepChange}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Endereço / Logradouro */}
              <div className="sm:col-span-5">
                <label className="block font-semibold text-slate-700 mb-1">
                  Endereço / Logradouro & Bairro
                </label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Cidade */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Campo Grande"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Estado */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado (UF)
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                >
                  {ESTADOS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: INFORMAÇÕES FNRH & PREFERÊNCIAS */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-[#053d1e]" />
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                3. Informações FNRH & Preferências de Estadia
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              {/* Última Procedência */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Última Procedência (De onde veio)
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - SP"
                  value={ultimaprocedencia}
                  onChange={(e) => setUltimaprocedencia(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Próximo Destino */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Próximo Destino (Para onde vai)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bonito - MS"
                  value={proximodestino}
                  onChange={(e) => setProximodestino(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Responsável Menor */}
              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  CPF Responsável (se menor)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpfresponsavelmenor}
                  onChange={(e) => setCpfresponsavelmenor(formatarCpf(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Alergias / Restrições Alimentares */}
              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Alergias & Restrições Alimentares</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Celíaco (sem glúten), Intolerante a lactose, vegetariano, alergia a amendoim..."
                  value={alergias_restricoes}
                  onChange={(e) => setAlergiasRestricoes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Solicitações Especiais */}
              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">
                  Solicitações Especiais do Hóspede
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Quarto no térreo, berço extra, travesseiros adicionais..."
                  value={solicitacoes_especiais}
                  onChange={(e) => setSolicitacoesEspeciais(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>

              {/* Observações Gerais */}
              <div className="sm:col-span-12">
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações Internas da Administração
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações gerais do hotel sobre este hóspede ou histórico de preferências..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#053d1e]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Rodapé de Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            * Campos marcados são de preenchimento obrigatório.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvando}
              className="px-5 py-2 text-xs font-bold bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{hospedeEdicao ? 'Salvar Alterações' : 'Cadastrar Hóspede'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

