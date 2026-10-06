import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  LoaderCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Coffee,
  Utensils,
  Moon,
  Compass,
  Calendar,
  Users,
  Check,
  Package,
  Sun,
  ShieldAlert,
  Info
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { Pacote } from '../tipos';
import { obterClienteSupabase } from '../lib/supabaseCliente';

interface FormularioPacoteState {
  nome: string;
  descricao: string;
  tipopacote: 'HOSPEDAGEM' | 'FERIADO' | 'DAY_USE' | 'EVENTO';
  valor: number | string;
  quantidadedias: number;
  adultosinclusos: number;
  criancasinclusas: number;
  datainicio: string;
  datafim: string;
  incluicafemanha: boolean;
  incluialmoco: boolean;
  incluijantar: boolean;
  incluipasseios: boolean;
  ativo: boolean;
}

const estadoInicialFormulario: FormularioPacoteState = {
  nome: '',
  descricao: '',
  tipopacote: 'HOSPEDAGEM',
  valor: '',
  quantidadedias: 1,
  adultosinclusos: 2,
  criancasinclusas: 0,
  datainicio: '',
  datafim: '',
  incluicafemanha: true,
  incluialmoco: true,
  incluijantar: true,
  incluipasseios: false,
  ativo: true,
};

const obterBadgeTipoPacote = (tipo?: string) => {
  const t = String(tipo || 'HOSPEDAGEM').toUpperCase();
  switch (t) {
    case 'DAY_USE':
      return { label: 'Day Use', classe: 'bg-amber-100 text-amber-900 border-amber-300' };
    case 'FERIADO':
      return { label: 'Feriado', classe: 'bg-blue-100 text-blue-900 border-blue-300' };
    case 'EVENTO':
      return { label: 'Evento', classe: 'bg-purple-100 text-purple-900 border-purple-300' };
    case 'HOSPEDAGEM':
    default:
      return { label: 'Hospedagem', classe: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
  }
};

export const PaginaPacotes: React.FC = () => {
  const { reservas, recarregarDados } = useHotel();

  // Lista local de pacotes (ativos e inativos)
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [carregandoListagem, setCarregandoListagem] = useState<boolean>(true);

  // Estados de Filtro
  const [busca, setBusca] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Estados do Modal de Cadastro / Edição
  const [modalAberta, setModalAberta] = useState<boolean>(false);
  const [pacoteEditando, setPacoteEditando] = useState<Pacote | null>(null);
  const [formulario, setFormulario] = useState<FormularioPacoteState>(estadoInicialFormulario);

  // Estados de Exclusão / Desativação
  const [modalExclusaoAberta, setModalExclusaoAberta] = useState<boolean>(false);
  const [pacoteParaExcluir, setPacoteParaExcluir] = useState<Pacote | null>(null);
  const [qtdReservasVinculadas, setQtdReservasVinculadas] = useState<number>(0);

  // Status de Processamento e Banners
  const [carregandoAcao, setCarregandoAcao] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Buscar lista completa de pacotes diretamente do Supabase
  const carregarPacotes = async () => {
    setCarregandoListagem(true);
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) {
        setMensagemErro('Cliente Supabase não está configurado.');
        return;
      }
      const { data, error } = await cliente
        .from('pacote')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        setMensagemErro(`Erro ao carregar pacotes: ${error.message}`);
      } else if (data) {
        setPacotes(data as Pacote[]);
      }
    } catch (err: any) {
      setMensagemErro(`Falha de conexão: ${err.message}`);
    } finally {
      setCarregandoListagem(false);
    }
  };

  useEffect(() => {
    carregarPacotes();
  }, []);

  // Exibir avisos temporários
  const exibirSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setMensagemErro(null);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  const exibirErro = (msg: string) => {
    setMensagemErro(msg);
    setTimeout(() => setMensagemErro(null), 5000);
  };

  // Filtragem dos pacotes
  const pacotesFiltrados = useMemo(() => {
    return pacotes.filter((pacote) => {
      // Filtro de Busca Por Nome ou Descrição
      const termo = busca.trim().toLowerCase();
      const correspondeBusca =
        !termo ||
        (pacote.nome || '').toLowerCase().includes(termo) ||
        (pacote.descricao || '').toLowerCase().includes(termo);

      // Filtro por Tipo de Pacote
      const tipo = String(pacote.tipopacote || 'HOSPEDAGEM').toUpperCase();
      const correspondeTipo = filtroTipo === 'TODOS' || tipo === filtroTipo;

      // Filtro por Status (Ativo / Inativo)
      const correspondeStatus =
        filtroStatus === 'TODOS' ||
        (filtroStatus === 'ATIVOS' && pacote.ativo !== false) ||
        (filtroStatus === 'INATIVOS' && pacote.ativo === false);

      return correspondeBusca && correspondeTipo && correspondeStatus;
    });
  }, [pacotes, busca, filtroTipo, filtroStatus]);

  // Abertura do Modal de Novo Pacote
  const handleAbrirNovo = () => {
    setPacoteEditando(null);
    setFormulario(estadoInicialFormulario);
    setMensagemErro(null);
    setModalAberta(true);
  };

  // Abertura do Modal de Edição
  const handleAbrirEdicao = (pacote: Pacote) => {
    setPacoteEditando(pacote);
    setFormulario({
      nome: pacote.nome || '',
      descricao: pacote.descricao || '',
      tipopacote: (pacote.tipopacote as any) || 'HOSPEDAGEM',
      valor: pacote.valor || 0,
      quantidadedias: pacote.quantidadedias || 1,
      adultosinclusos: pacote.adultosinclusos || 1,
      criancasinclusas: pacote.criancasinclusas || 0,
      datainicio: pacote.datainicio ? String(pacote.datainicio).slice(0, 10) : '',
      datafim: pacote.datafim ? String(pacote.datafim).slice(0, 10) : '',
      incluicafemanha: pacote.incluicafemanha !== false,
      incluialmoco: pacote.incluialmoco !== false,
      incluijantar: pacote.incluijantar !== false,
      incluipasseios: Boolean(pacote.incluipasseios),
      ativo: pacote.ativo !== false,
    });
    setMensagemErro(null);
    setModalAberta(true);
  };

  // Alteração dinâmica do tipo de pacote no formulário
  const handleMudarTipoPacote = (novoTipo: 'HOSPEDAGEM' | 'FERIADO' | 'DAY_USE' | 'EVENTO') => {
    setFormulario((prev) => {
      const eDayUse = novoTipo === 'DAY_USE';
      return {
        ...prev,
        tipopacote: novoTipo,
        quantidadedias: eDayUse ? 1 : prev.quantidadedias || 1,
        incluijantar: eDayUse ? false : prev.incluijantar,
        adultosinclusos: eDayUse ? 1 : prev.adultosinclusos || 1,
        criancasinclusas: eDayUse ? 0 : prev.criancasinclusas || 0,
      };
    });
  };

  // Salvar (Inserir / Atualizar) Pacote no Supabase
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    // Validações
    if (!formulario.nome.trim() || formulario.nome.trim().length < 3) {
      exibirErro('O nome do pacote deve conter pelo menos 3 caracteres.');
      return;
    }

    const valorNum = Number(formulario.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      exibirErro('Informe um valor válido maior que zero (R$).');
      return;
    }

    if (Number(formulario.quantidadedias) < 1) {
      exibirErro('A quantidade de dias deve ser no mínimo 1.');
      return;
    }

    if (Number(formulario.adultosinclusos) < 1) {
      exibirErro('A quantidade de adultos inclusos deve ser no mínimo 1.');
      return;
    }

    if (formulario.datainicio && formulario.datafim && formulario.datafim < formulario.datainicio) {
      exibirErro('A data final não pode ser anterior à data inicial.');
      return;
    }

    setCarregandoAcao(true);
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) {
        exibirErro('Cliente Supabase não está configurado.');
        return;
      }

      const eDayUse = formulario.tipopacote === 'DAY_USE';
      const payload: Partial<Pacote> = {
        nome: formulario.nome.trim(),
        descricao: formulario.descricao.trim(),
        tipopacote: formulario.tipopacote,
        valor: valorNum,
        quantidadedias: eDayUse ? 1 : Number(formulario.quantidadedias),
        adultosinclusos: Number(formulario.adultosinclusos),
        criancasinclusas: Number(formulario.criancasinclusas),
        datainicio: formulario.datainicio || null,
        datafim: formulario.datafim || null,
        incluicafemanha: Boolean(formulario.incluicafemanha),
        incluialmoco: Boolean(formulario.incluialmoco),
        incluijantar: eDayUse ? false : Boolean(formulario.incluijantar),
        incluipasseios: Boolean(formulario.incluipasseios),
        ativo: Boolean(formulario.ativo),
      };

      if (pacoteEditando) {
        // Atualização
        const { error } = await cliente
          .from('pacote')
          .update(payload)
          .eq('pacoteid', pacoteEditando.pacoteid);

        if (error) {
          exibirErro(`Erro ao atualizar pacote: ${error.message}`);
        } else {
          exibirSucesso(`Pacote "${payload.nome}" atualizado com sucesso!`);
          setModalAberta(false);
          await carregarPacotes();
          await recarregarDados();
        }
      } else {
        // Criação
        const { error } = await cliente
          .from('pacote')
          .insert([payload]);

        if (error) {
          exibirErro(`Erro ao cadastrar pacote: ${error.message}`);
        } else {
          exibirSucesso(`Pacote "${payload.nome}" criado com sucesso!`);
          setModalAberta(false);
          await carregarPacotes();
          await recarregarDados();
        }
      }
    } catch (err: any) {
      exibirErro(`Erro inesperado ao salvar: ${err.message}`);
    } finally {
      setCarregandoAcao(false);
    }
  };

  // Abrir confirmação de exclusão/desativação segura
  const handleAbrirConfirmacaoExclusao = (pacote: Pacote) => {
    setPacoteParaExcluir(pacote);

    // Contar quantas reservas estão vinculadas a este pacote
    const vinculadas = (reservas || []).filter((r) => String(r.pacoteid) === String(pacote.pacoteid)).length;
    setQtdReservasVinculadas(vinculadas);

    setModalExclusaoAberta(true);
  };

  // Confirmar exclusão ou soft delete
  const handleConfirmarExclusao = async () => {
    if (!pacoteParaExcluir) return;

    setCarregandoAcao(true);
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) {
        exibirErro('Cliente Supabase não está configurado.');
        return;
      }

      if (qtdReservasVinculadas > 0) {
        // Soft delete: Desativar pacote
        const { error } = await cliente
          .from('pacote')
          .update({ ativo: false })
          .eq('pacoteid', pacoteParaExcluir.pacoteid);

        if (error) {
          exibirErro(`Erro ao desativar pacote: ${error.message}`);
        } else {
          exibirSucesso(`Pacote "${pacoteParaExcluir.nome}" foi desativado com sucesso (possuía reservas vinculadas).`);
          setModalExclusaoAberta(false);
          setPacoteParaExcluir(null);
          await carregarPacotes();
          await recarregarDados();
        }
      } else {
        // Tentativa de Hard delete (Exclusão física)
        const { error } = await cliente
          .from('pacote')
          .delete()
          .eq('pacoteid', pacoteParaExcluir.pacoteid);

        if (error) {
          // Se falhar devido à restrição FK, faz fallback para soft delete
          const { error: softErr } = await cliente
            .from('pacote')
            .update({ ativo: false })
            .eq('pacoteid', pacoteParaExcluir.pacoteid);

          if (softErr) {
            exibirErro(`Erro ao excluir pacote: ${error.message}`);
          } else {
            exibirSucesso(`Pacote "${pacoteParaExcluir.nome}" foi desativado com sucesso.`);
            setModalExclusaoAberta(false);
            setPacoteParaExcluir(null);
            await carregarPacotes();
            await recarregarDados();
          }
        } else {
          exibirSucesso(`Pacote "${pacoteParaExcluir.nome}" excluído com sucesso!`);
          setModalExclusaoAberta(false);
          setPacoteParaExcluir(null);
          await carregarPacotes();
          await recarregarDados();
        }
      }
    } catch (err: any) {
      exibirErro(`Falha ao processar exclusão: ${err.message}`);
    } finally {
      setCarregandoAcao(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner de Mensagem de Sucesso */}
      {mensagemSucesso && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-[#053d1e] shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Banner de Mensagem de Erro */}
      {mensagemErro && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3.5 text-sm font-semibold text-rose-900 shadow-sm animate-in fade-in">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* CABEÇALHO PADRONIZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#053d1e]" />
            <h1 className="font-['Manrope'] text-2xl font-bold text-[#191c1d]">
              Gestão de Pacotes Promocionais
            </h1>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Cadastre, edite e gerencie os pacotes de hospedagem, feriados e Day Use oferecidos no hotel.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirNovo}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#053d1e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#043017] transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Pacote</span>
        </button>
      </div>

      {/* BARRA DE AÇÕES E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#c1c9bf] bg-white p-4 shadow-xs">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717971]" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pacotes por nome ou descrição..."
            className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] py-2 pl-9 pr-3 text-xs text-[#191c1d] placeholder:text-[#717971] focus:border-[#053d1e] focus:outline-none"
          />
        </div>

        {/* Filtros de Tipo e Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dropdown de Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="HOSPEDAGEM">Hospedagem</option>
            <option value="FERIADO">Feriados</option>
            <option value="DAY_USE">Day Use</option>
            <option value="EVENTO">Eventos</option>
          </select>

          {/* Filtro por Status */}
          <div className="flex items-center rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] p-1">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ATIVOS', label: 'Ativos' },
              { id: 'INATIVOS', label: 'Inativos' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFiltroStatus(st.id as any)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  filtroStatus === st.id
                    ? 'bg-[#053d1e] text-white shadow-xs'
                    : 'text-[#414941] hover:bg-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID DE CARDS DE PACOTES */}
      {carregandoListagem ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#c1c9bf] rounded-2xl shadow-xs">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#053d1e] mb-2" />
          <p className="text-xs font-semibold text-[#717971]">Carregando pacotes cadastrados...</p>
        </div>
      ) : pacotesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#c1c9bf] rounded-2xl shadow-xs text-center px-4">
          <Package className="h-12 w-12 text-[#717971] opacity-30 mb-3" />
          <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">Nenhum pacote encontrado</h3>
          <p className="text-xs text-[#717971] mt-1 max-w-sm">
            Nenhum pacote atende aos critérios de busca ou filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pacotesFiltrados.map((pacote) => {
            const badge = obterBadgeTipoPacote(pacote.tipopacote);
            const eAtivo = pacote.ativo !== false;

            return (
              <div
                key={String(pacote.pacoteid)}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                  eAtivo ? 'border-[#c1c9bf]' : 'border-slate-300 bg-slate-50/70 opacity-80'
                }`}
              >
                <div>
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.classe}`}>
                          {badge.label}
                        </span>
                        {!eAtivo && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            Inativo
                          </span>
                        )}
                      </div>
                      <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d] truncate" title={pacote.nome}>
                        {pacote.nome}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-['Manrope'] text-xl font-extrabold text-[#053d1e]">
                        {formatarMoeda(pacote.valor || 0)}
                      </div>
                      <div className="text-[10px] font-semibold text-[#717971]">
                        {pacote.quantidadedias === 1 ? '1 dia' : `${pacote.quantidadedias} diárias`}
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  {pacote.descricao && (
                    <p className="text-xs text-[#414941] mb-4 line-clamp-2" title={pacote.descricao}>
                      {pacote.descricao}
                    </p>
                  )}

                  {/* Composição e Período */}
                  <div className="space-y-2 border-t border-b border-[#f3f4f6] py-3 my-3 text-xs text-[#414941]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-[#717971]">
                        <Users className="h-3.5 w-3.5 text-[#053d1e]" /> Hóspedes Inclusos:
                      </span>
                      <span className="font-bold text-[#191c1d]">
                        {pacote.adultosinclusos} Adulto(s){pacote.criancasinclusas > 0 ? ` + ${pacote.criancasinclusas} Criança(s)` : ''}
                      </span>
                    </div>

                    {(pacote.datainicio || pacote.datafim) ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-[#717971]">
                          <Calendar className="h-3.5 w-3.5 text-[#053d1e]" /> Validade:
                        </span>
                        <span className="font-semibold text-[#191c1d]">
                          {pacote.datainicio ? formatarData(pacote.datainicio) : 'Início livre'}
                          {' até '}
                          {pacote.datafim ? formatarData(pacote.datafim) : 'Sem fim'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[#717971]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-[#053d1e]" /> Validade:
                        </span>
                        <span className="font-medium italic">Período Indeterminado</span>
                      </div>
                    )}
                  </div>

                  {/* Inclusões (Café, Almoço, Jantar, Passeios) */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#717971] block mb-2">
                      Inclusões do Pacote:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        pacote.incluicafemanha !== false
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      }`}>
                        <Coffee className="h-3.5 w-3.5" /> Café da Manhã
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        pacote.incluialmoco !== false
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      }`}>
                        <Utensils className="h-3.5 w-3.5" /> Almoço
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        pacote.incluijantar !== false
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      }`}>
                        <Moon className="h-3.5 w-3.5" /> Jantar
                      </span>

                      {pacote.incluipasseios && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-purple-50 text-purple-900 border-purple-200">
                          <Compass className="h-3.5 w-3.5" /> Passeios
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé de Ações do Card */}
                <div className="flex items-center justify-end gap-2 border-t border-[#f3f4f6] pt-3">
                  <button
                    type="button"
                    onClick={() => handleAbrirEdicao(pacote)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c1c9bf] bg-white text-xs font-bold text-[#191c1d] hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAbrirConfirmacaoExclusao(pacote)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Excluir ou Desativar Pacote"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE FORMULÁRIO (CRIAÇÃO E EDIÇÃO) */}
      {modalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-5 border border-[#c1c9bf]">
            {/* Cabecalho da Modal */}
            <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-4">
              <div>
                <h2 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
                  {pacoteEditando ? `Editar Pacote: ${pacoteEditando.nome}` : 'Cadastrar Novo Pacote'}
                </h2>
                <p className="text-xs text-[#717971] mt-0.5">
                  Preencha os detalhes e inclusões do pacote promocional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvar} className="space-y-4">
              {/* Nome e Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Nome do Pacote <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formulario.nome}
                    onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                    placeholder="Ex: Pacote Fim de Semana Família"
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Tipo de Pacote <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formulario.tipopacote}
                    onChange={(e) => handleMudarTipoPacote(e.target.value as any)}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  >
                    <option value="HOSPEDAGEM">Hospedagem</option>
                    <option value="FERIADO">Feriado Especial</option>
                    <option value="DAY_USE">Day Use</option>
                    <option value="EVENTO">Evento</option>
                  </select>
                </div>
              </div>

              {/* Valor, Dias, Adultos e Crianças */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Valor do Pacote (R$) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formulario.valor}
                    onChange={(e) => setFormulario({ ...formulario, valor: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Qtd. de Dias <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={formulario.tipopacote === 'DAY_USE'}
                    value={formulario.quantidadedias}
                    onChange={(e) => setFormulario({ ...formulario, quantidadedias: Number(e.target.value) || 1 })}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none disabled:bg-slate-200 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Adultos Inclusos <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formulario.adultosinclusos}
                    onChange={(e) => setFormulario({ ...formulario, adultosinclusos: Number(e.target.value) || 1 })}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Crianças Inclusas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formulario.criancasinclusas}
                    onChange={(e) => setFormulario({ ...formulario, criancasinclusas: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  />
                </div>
              </div>

              {/* Datas de Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Data Inicial de Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formulario.datainicio}
                    onChange={(e) => setFormulario({ ...formulario, datainicio: e.target.value })}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#191c1d] mb-1">
                    Data Final de Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formulario.datafim}
                    onChange={(e) => setFormulario({ ...formulario, datafim: e.target.value })}
                    className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] px-3.5 py-2 text-xs font-semibold text-[#191c1d] focus:border-[#053d1e] focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label className="block text-xs font-bold text-[#191c1d] mb-1">
                  Descrição Detalhada do Pacote
                </label>
                <textarea
                  rows={3}
                  value={formulario.descricao}
                  onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
                  placeholder="Informe observações, regras de cancelamento ou detalhes do pacote..."
                  className="w-full rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] p-3 text-xs font-medium text-[#191c1d] placeholder:text-[#717971] focus:border-[#053d1e] focus:outline-none"
                />
              </div>

              {/* Checkboxes de Inclusões */}
              <div>
                <label className="block text-xs font-bold text-[#191c1d] mb-2">
                  Inclusões e Benefícios do Pacote:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    formulario.incluicafemanha ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formulario.incluicafemanha}
                      onChange={(e) => setFormulario({ ...formulario, incluicafemanha: e.target.checked })}
                      className="rounded text-[#053d1e] focus:ring-[#053d1e]"
                    />
                    <Coffee className="h-4 w-4" />
                    <span className="text-xs">Café da Manhã</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    formulario.incluialmoco ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formulario.incluialmoco}
                      onChange={(e) => setFormulario({ ...formulario, incluialmoco: e.target.checked })}
                      className="rounded text-[#053d1e] focus:ring-[#053d1e]"
                    />
                    <Utensils className="h-4 w-4" />
                    <span className="text-xs">Almoço</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                    formulario.tipopacote === 'DAY_USE'
                      ? 'border-gray-200 bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                      : formulario.incluijantar
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold cursor-pointer'
                      : 'border-gray-200 bg-gray-50 text-gray-600 cursor-pointer'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={formulario.tipopacote === 'DAY_USE'}
                      checked={formulario.incluijantar}
                      onChange={(e) => setFormulario({ ...formulario, incluijantar: e.target.checked })}
                      className="rounded text-[#053d1e] focus:ring-[#053d1e]"
                    />
                    <Moon className="h-4 w-4" />
                    <span className="text-xs">Jantar</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    formulario.incluipasseios ? 'border-purple-500 bg-purple-50 text-purple-950 font-bold' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formulario.incluipasseios}
                      onChange={(e) => setFormulario({ ...formulario, incluipasseios: e.target.checked })}
                      className="rounded text-purple-700 focus:ring-purple-700"
                    />
                    <Compass className="h-4 w-4" />
                    <span className="text-xs">Passeios</span>
                  </label>
                </div>
              </div>

              {/* Status Ativo / Inativo */}
              <div className="flex items-center justify-between rounded-xl border border-[#c1c9bf] bg-[#f8f9fa] p-3.5">
                <div>
                  <span className="text-xs font-bold text-[#191c1d] block">
                    Status do Pacote
                  </span>
                  <span className="text-[11px] text-[#717971]">
                    Pacotes inativos ficam indisponíveis para novas reservas.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formulario.ativo}
                    onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#053d1e]" />
                </label>
              </div>

              {/* Botões do Rodapé da Modal */}
              <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] pt-4">
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  disabled={carregandoAcao}
                  className="rounded-xl border border-[#c1c9bf] px-4 py-2 text-xs font-bold text-[#414941] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregandoAcao}
                  className="flex items-center gap-2 rounded-xl bg-[#053d1e] px-5 py-2 text-xs font-bold text-white hover:bg-[#043017] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {carregandoAcao ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{pacoteEditando ? 'Salvar Alterações' : 'Cadastrar Pacote'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO / DESATIVAÇÃO */}
      {modalExclusaoAberta && pacoteParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-[#c1c9bf]">
            <div className="flex items-center gap-3 text-rose-700">
              <ShieldAlert className="h-7 w-7 shrink-0" />
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
                Confirmar Ação
              </h3>
            </div>

            {qtdReservasVinculadas > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-semibold">
                  <Info className="h-4 w-4 inline mr-1 text-amber-700" />
                  Este pacote possui <strong>{qtdReservasVinculadas} reserva(s)</strong> vinculada(s) no sistema.
                </div>
                <p className="text-xs text-[#414941]">
                  Para preservar o histórico operacional e financeiro, o pacote <strong>"{pacoteParaExcluir.nome}"</strong> será <strong>desativado</strong> em vez de excluído permanentemente.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#414941]">
                Tem certeza que deseja excluir permanentemente o pacote <strong>"{pacoteParaExcluir.nome}"</strong>? Esta ação não poderá ser desfeita.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] pt-4">
              <button
                type="button"
                onClick={() => {
                  setModalExclusaoAberta(false);
                  setPacoteParaExcluir(null);
                }}
                disabled={carregandoAcao}
                className="rounded-xl border border-[#c1c9bf] px-4 py-2 text-xs font-bold text-[#414941] hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={carregandoAcao}
                className="flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2 text-xs font-bold text-white hover:bg-rose-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {carregandoAcao ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>{qtdReservasVinculadas > 0 ? 'Desativar Pacote' : 'Excluir Pacote'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
