import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, Trash2, ShieldCheck, Lock, Phone } from 'lucide-react';
import { obterClienteSupabase } from '../lib/supabaseCliente';
import { LogoHotel } from '../componentes/comuns/LogoHotel';
import { aplicarMascaraCpf, aplicarMascaraTelefone } from '../utilitarios/formatadores';

type Acompanhante = {
  nomecompleto: string;
  documento: string;
  datanascimento: string;
  menoridade: boolean;
  cpfresponsavel: string;
  observacoes: string;
};

type DadosFnrh = Record<string, string | number | boolean>;

const acompanhanteInicial = (): Acompanhante => ({
  nomecompleto: '',
  documento: '',
  datanascimento: '',
  menoridade: false,
  cpfresponsavel: '',
  observacoes: '',
});

export const PaginaCadastroFnrh: React.FC<{ token: string }> = ({ token }) => {
  const [dados, setDados] = useState<DadosFnrh>({
    nomecompleto: '',
    cpf: '',
    rg: '',
    passaporte: '',
    datanascimento: '',
    nacionalidade: 'Brasileira',
    sexo: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    profissao: '',
    proximodestino: '',
    ultimaprocedencia: '',
    cpfresponsavelmenor: '',
    dataentrada: '',
    horarioprevistochegada: '',
    datasaida: '',
    horarioprevistasaida: '',
    motivoviagem: '',
    transporte: '',
    placa: '',
    modelocor: '',
    numerohospedes: 1,
    adultos: 1,
    criancas: 0,
    forma_pagamento: '',
    alergias_restricoes: '',
    solicitacoes_especiais: '',
    declaracao_aceita: false,
  });

  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [jaEnviado, setJaEnviado] = useState(false);
  const [nomeHospedeEnviado, setNomeHospedeEnviado] = useState('');

  useEffect(() => {
    const carregar = async () => {
      const cliente = obterClienteSupabase();
      if (!cliente) {
        setErro('Não foi possível conectar ao sistema.');
        setCarregando(false);
        return;
      }
      const { data, error } = await cliente.rpc('obter_cadastro_fnrh_por_token', { p_token: token });
      if (error || !data) {
        setErro(error?.message || 'Link inválido ou expirado.');
      } else {
        const cadastro = data.cadastro || {};
        
        // Trava LGPD / Link de Uso Único:
        // Se a ficha já foi preenchida/enviada ou o sinal já foi confirmado / reserva criada
        if (
          data.ja_enviado === true ||
          Boolean(cadastro.declaracao_aceita) ||
          cadastro.status === 'LIBERADA_PARA_RESERVA' ||
          cadastro.status === 'RESERVA_CRIADA'
        ) {
          setJaEnviado(true);
          setNomeHospedeEnviado(cadastro.nomecompleto || data.nomecompleto || '');
          setCarregando(false);
          return;
        }

        if (cadastro.cpf) cadastro.cpf = aplicarMascaraCpf(String(cadastro.cpf));
        if (cadastro.cpfresponsavelmenor) cadastro.cpfresponsavelmenor = aplicarMascaraCpf(String(cadastro.cpfresponsavelmenor));
        if (cadastro.telefone) cadastro.telefone = aplicarMascaraTelefone(String(cadastro.telefone));

        setDados((atual) => ({ ...atual, ...cadastro }));
        setAcompanhantes(
          (data.acompanhantes || []).map((item: Acompanhante) => ({
            ...acompanhanteInicial(),
            ...item,
            cpfresponsavel: item.cpfresponsavel ? aplicarMascaraCpf(String(item.cpfresponsavel)) : '',
          }))
        );
      }
      setCarregando(false);
    };
    carregar();
  }, [token]);

  const alterar = (campo: string, valor: string | number | boolean) => {
    let novoValor = valor;
    // Aplica máscara automática de CPF e Telefone enquanto digita
    if (campo === 'cpf' || campo === 'cpfresponsavelmenor') {
      novoValor = aplicarMascaraCpf(String(valor));
    } else if (campo === 'telefone') {
      novoValor = aplicarMascaraTelefone(String(valor));
    }
    setDados((atual) => ({ ...atual, [campo]: novoValor }));
  };

  const alterarAcompanhante = (indice: number, campo: keyof Acompanhante, valor: string | boolean) => {
    let novoValor = valor;
    // Aplica máscara automática de CPF no responsável do acompanhante menor
    if (campo === 'cpfresponsavel') {
      novoValor = aplicarMascaraCpf(String(valor));
    }
    setAcompanhantes((lista) =>
      lista.map((item, posicao) => (posicao === indice ? { ...item, [campo]: novoValor } : item))
    );
  };

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro(null);

    const cpfFormatado = aplicarMascaraCpf(String(dados.cpf || ''));
    if (!dados.nomecompleto || !cpfFormatado || !dados.telefone) {
      setErro('Preencha nome completo, CPF e telefone.');
      return;
    }

    // Valida se o CPF possui 11 dígitos
    const digitosCpf = cpfFormatado.replace(/\D/g, '');
    if (digitosCpf.length !== 11) {
      setErro('O CPF do titular deve conter 11 dígitos.');
      return;
    }

    if (!dados.declaracao_aceita) {
      setErro('É necessário aceitar a declaração da FNRH.');
      return;
    }

    const cliente = obterClienteSupabase();
    if (!cliente) {
      setErro('Não foi possível conectar ao sistema.');
      return;
    }

    // Garante que o CPF e o Telefone sejam salvos formatados com máscara no banco de dados
    const dadosParaSalvar = {
      ...dados,
      cpf: cpfFormatado,
      telefone: dados.telefone ? aplicarMascaraTelefone(String(dados.telefone)) : '',
      cpfresponsavelmenor: dados.cpfresponsavelmenor ? aplicarMascaraCpf(String(dados.cpfresponsavelmenor)) : '',
    };

    const acompanhantesParaSalvar = acompanhantes.map((item) => ({
      ...item,
      cpfresponsavel: item.cpfresponsavel ? aplicarMascaraCpf(String(item.cpfresponsavel)) : '',
    }));

    setSalvando(true);
    const { error } = await cliente.rpc('salvar_cadastro_fnrh_por_token', {
      p_token: token,
      p_dados: dadosParaSalvar,
      p_acompanhantes: acompanhantesParaSalvar,
    });
    setSalvando(false);

    if (error) setErro(error.message);
    else setEnviado(true);
  };

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[#053d1e]">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Carregando formulário...
      </div>
    );
  }

  if (erro && !dados.nomecompleto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4">
        <div className="max-w-md rounded-2xl border border-[#c1c9bf] bg-white p-6 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#ba1a1a]" />
          <h1 className="font-['Manrope'] text-lg font-bold">Não foi possível abrir o cadastro</h1>
          <p className="mt-2 text-sm text-[#717971]">{erro}</p>
        </div>
      </div>
    );
  }

  if (jaEnviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4">
        <div className="w-full max-w-lg rounded-2xl border border-[#c1c9bf] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#053d1e] border border-emerald-200 shadow-2xs">
            <ShieldCheck className="h-9 w-9 text-emerald-700" />
          </div>
          
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
            Ficha Cadastral Já Enviada
          </span>

          <h1 className="mt-3 font-['Manrope'] text-2xl font-bold text-[#191c1d]">
            Link Já Utilizado
          </h1>

          <p className="mt-3 text-sm text-[#414941] leading-relaxed">
            {nomeHospedeEnviado ? (
              <>
                A ficha de registro FNRH do titular <strong>{nomeHospedeEnviado}</strong> já foi preenchida e recebida com sucesso pela equipe do <strong>Hotel Fazenda Anew</strong>.
              </>
            ) : (
              <>
                Os dados desta ficha FNRH já foram preenchidos e enviados com sucesso ao <strong>Hotel Fazenda Anew</strong>.
              </>
            )}
          </p>

          <div className="mt-5 rounded-xl border border-[#e5e7eb] bg-slate-50 p-4 text-left text-xs text-[#555]">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" /> Proteção de Dados (LGPD):
            </p>
            <p className="leading-relaxed">
              Por motivos de segurança e privacidade dos hóspedes, as informações pessoais não são mais exibidas publicamente neste link e o formulário não aceita novas alterações.
            </p>
          </div>

          <div className="mt-6 border-t border-[#e5e7eb] pt-5">
            <p className="text-xs text-[#717971] mb-3">
              Precisa alterar alguma informação ou tirar dúvidas sobre sua estadia?
            </p>
            <a
              href="https://wa.me/5567992914359?text=Ol%C3%A1!%20J%C3%A1%20preenchi%20minha%20ficha%20FNRH%20e%20gostaria%20de%20falar%20com%20a%20recep%C3%A7%C3%A3o%20do%20Hotel%20Fazenda%20Anew."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#053d1e] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#043017] transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              Falar com a Recepção no WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] p-4">
        <div className="w-full max-w-lg rounded-2xl border border-[#92c89d] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#137333] border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="h-10 w-10 text-[#137333]" />
          </div>
          <h1 className="font-['Manrope'] text-2xl font-bold text-[#053d1e]">Cadastro Enviado com Sucesso!</h1>
          <p className="mt-3 text-sm text-[#414941] leading-relaxed">
            Seus dados foram registrados com segurança no sistema do Hotel Fazenda Anew. A confirmação do pagamento do sinal será acompanhada pela nossa equipe.
          </p>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950 text-left">
            <p className="font-semibold flex items-center gap-1.5 mb-1 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> Link de Uso Único Finalizado:
            </p>
            <p className="leading-relaxed text-emerald-800">
              Em conformidade com a LGPD, o preenchimento deste link foi finalizado e seus dados pessoais foram protegidos contra reaberturas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const campo = (
    nome: string,
    rotulo: string,
    tipo = 'text',
    obrigatorio = false,
    placeholder = '',
    maxLength?: number
  ) => (
    <label className="text-xs font-semibold text-[#414941]">
      {rotulo}
      {obrigatorio && ' *'}
      <input
        required={obrigatorio}
        type={tipo}
        placeholder={placeholder}
        maxLength={maxLength}
        value={String(dados[nome] ?? '')}
        onChange={(evento) => alterar(nome, evento.target.value)}
        className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
      />
    </label>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-6 font-['Inter'] text-[#191c1d] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-2xl bg-[#053d1e] p-6 text-white">
          <LogoHotel tamanho="md" />
          <h1 className="mt-4 font-['Manrope'] text-2xl font-bold">Ficha Nacional de Registro de Hóspedes</h1>
          <p className="mt-1 text-sm text-white/80">Hotel Fazenda Anew • Fazenda Córrego dos Garimpos</p>
          <p className="mt-3 text-xs text-white/70">Preencha seus dados para concluir o cadastro da hospedagem.</p>
        </header>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#ffdad6] bg-[#ffdad6] px-4 py-3 text-xs font-semibold text-[#ba1a1a]">
            <AlertCircle className="h-4 w-4" />
            {erro}
          </div>
        )}

        <form onSubmit={salvar} className="space-y-5">
          {/* Titular */}
          <section className="rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs">
            <h2 className="mb-4 font-['Manrope'] text-lg font-bold">Dados do hóspede titular</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {campo('nomecompleto', 'Nome completo', 'text', true, 'Nome e sobrenome')}
              {campo('cpf', 'CPF', 'text', true, '000.000.000-00', 14)}
              {campo('rg', 'RG')}
              {campo('passaporte', 'Passaporte')}
              {campo('datanascimento', 'Data de nascimento', 'date')}
              {campo('nacionalidade', 'Nacionalidade')}
              <label className="text-xs font-semibold text-[#414941]">
                Sexo
                <select
                  value={String(dados.sexo ?? '')}
                  onChange={(evento) => alterar('sexo', evento.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="">Não informado</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </label>
              {campo('telefone', 'Telefone', 'tel', true, '(00) 00000-0000', 15)}
              {campo('email', 'E-mail', 'email', false, 'seuemail@exemplo.com')}
              {campo('endereco', 'Endereço')}
              {campo('cidade', 'Cidade')}
              {campo('estado', 'UF')}
              {campo('cep', 'CEP', 'text', false, '00000-000', 9)}
              {campo('profissao', 'Profissão')}
              {campo('proximodestino', 'Próximo destino')}
              {campo('ultimaprocedencia', 'Última procedência')}
              {campo('cpfresponsavelmenor', 'CPF do responsável, se menor', 'text', false, '000.000.000-00', 14)}
            </div>
          </section>

          {/* Hospedagem */}
          <section className="rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs">
            <h2 className="mb-4 font-['Manrope'] text-lg font-bold">Dados da hospedagem</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {campo('dataentrada', 'Chegada', 'date')}
              {campo('horarioprevistochegada', 'Horário de chegada', 'time')}
              {campo('datasaida', 'Saída', 'date')}
              {campo('horarioprevistasaida', 'Horário de saída', 'time')}
              {campo('numerohospedes', 'Número de hóspedes', 'number')}
              {campo('adultos', 'Adultos', 'number')}
              {campo('criancas', 'Crianças', 'number')}
              {campo('placa', 'Placa do veículo', 'text', false, 'ABC-1234 ou ABC1D23')}
              {campo('modelocor', 'Modelo/Cor')}
              {campo('transporte', 'Transporte')}
              {campo('motivoviagem', 'Motivo da viagem')}
              <label className="text-xs font-semibold text-[#414941]">
                Pagamento
                <select
                  value={String(dados.forma_pagamento ?? '')}
                  onChange={(evento) => alterar('forma_pagamento', evento.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-white px-3 py-2 text-sm font-normal"
                >
                  <option value="">Selecione</option>
                  <option value="PIX">PIX</option>
                  <option value="VOUCHER">Voucher</option>
                </select>
              </label>
            </div>
          </section>

          {/* Acompanhantes */}
          <section className="rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Manrope'] text-lg font-bold">Acompanhantes</h2>
              <button
                type="button"
                onClick={() => setAcompanhantes((lista) => [...lista, acompanhanteInicial()])}
                className="p-1.5 text-[#053d1e] hover:bg-[#e6f4ea] rounded transition-colors text-xs flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
            {acompanhantes.length === 0 && (
              <p className="text-sm text-[#717971]">Nenhum acompanhante informado.</p>
            )}
            {acompanhantes.map((item, indice) => (
              <div key={indice} className="mb-4 grid gap-3 rounded-xl border border-[#e1e3e4] p-4 sm:grid-cols-2">
                <label className="text-xs font-semibold">
                  Nome completo *
                  <input
                    required
                    value={item.nomecompleto}
                    onChange={(evento) => alterarAcompanhante(indice, 'nomecompleto', evento.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Documento
                  <input
                    value={item.documento}
                    onChange={(evento) => alterarAcompanhante(indice, 'documento', evento.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Nascimento
                  <input
                    type="date"
                    value={item.datanascimento}
                    onChange={(evento) => alterarAcompanhante(indice, 'datanascimento', evento.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="text-xs font-semibold">
                  CPF do responsável, se menor
                  <input
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={item.cpfresponsavel}
                    onChange={(evento) => alterarAcompanhante(indice, 'cpfresponsavel', evento.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setAcompanhantes((lista) => lista.filter((_, posicao) => posicao !== indice))}
                  className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer w-fit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            ))}
          </section>

          {/* Observações e declaração */}
          <section className="rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs">
            <h2 className="mb-4 font-['Manrope'] text-lg font-bold">Observações e declaração</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold">
                Alergias/restrições alimentares
                <textarea
                  value={String(dados.alergias_restricoes ?? '')}
                  onChange={(evento) => alterar('alergias_restricoes', evento.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                  rows={3}
                />
              </label>
              <label className="text-xs font-semibold">
                Solicitações especiais
                <textarea
                  value={String(dados.solicitacoes_especiais ?? '')}
                  onChange={(evento) => alterar('solicitacoes_especiais', evento.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                  rows={3}
                />
              </label>
            </div>
            <label className="mt-4 flex items-start gap-2 text-xs text-[#414941]">
              <input
                type="checkbox"
                checked={Boolean(dados.declaracao_aceita)}
                onChange={(evento) => alterar('declaracao_aceita', evento.target.checked)}
                className="mt-0.5"
              />
              Declaro que as informações são verdadeiras, estou ciente das normas internas e autorizo o tratamento dos
              meus dados para registro da hospedagem conforme a legislação aplicável.
            </label>
          </section>

          <div className="flex justify-end pt-2">
            <button
              disabled={salvando}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#053d1e] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#043017] transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {salvando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {salvando ? 'Enviando cadastro...' : 'Enviar Cadastro'}
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-xs text-[#717971]">CNPJ 47.680.087/0001-59 • Hotel Fazenda Anew</p>
      </div>
    </div>
  );
};
