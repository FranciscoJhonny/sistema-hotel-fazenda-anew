import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Power,
  LoaderCircle,
  UserCheck,
  UserX,
  Shield,
  Key,
  Crown,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { useSupabase } from '../hooks/useSupabase';
import { Usuario } from '../tipos';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';
import { ModalCadastroUsuario } from '../componentes/usuarios/ModalCadastroUsuario';

const ITENS_POR_PAGINA = 10;

export const PaginaUsuarios: React.FC = () => {
  const { usuarioAtual } = useHotel();
  const { usuario: usuarioService } = useSupabase();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [busca, setBusca] = useState<string>('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  const [modalNovoAberto, setModalNovoAberto] = useState<boolean>(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState<Usuario | null>(null);
  const [usuarioExcluir, setUsuarioExcluir] = useState<Usuario | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar lista de usuários
  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      setErro(null);
      const res = await usuarioService.listarTodos(false);
      if (res.sucesso && res.dados) {
        setUsuarios(res.dados);
      } else {
        setErro(res.erro || 'Erro ao carregar usuários do Supabase.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro de conexão com o banco de dados.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // Filtros aplicados
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      // 1. Busca por texto (nome ou email)
      const termo = busca.toLowerCase().trim();
      const bateuBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo);

      // 2. Filtro por perfil
      const bateuPerfil =
        filtroPerfil === 'TODOS' || u.perfil === filtroPerfil;

      // 3. Filtro por status
      const estaAtivo = u.ativo !== undefined ? Boolean(u.ativo) : true;
      const bateuStatus =
        filtroStatus === 'TODOS' ||
        (filtroStatus === 'ATIVO' && estaAtivo) ||
        (filtroStatus === 'INATIVO' && !estaAtivo);

      return bateuBusca && bateuPerfil && bateuStatus;
    });
  }, [usuarios, busca, filtroPerfil, filtroStatus]);

  // Paginação
  const totalPaginas = Math.ceil(usuariosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const usuariosPaginados = usuariosFiltrados.slice(
    indiceInicial,
    indiceInicial + ITENS_POR_PAGINA
  );

  // Métricas
  const totalMaster = usuarios.filter((u) => u.perfil === 'MASTER').length;
  const totalAdmins = usuarios.filter((u) => u.perfil === 'ADMIN').length;
  const totalRecepcao = usuarios.filter((u) => u.perfil === 'RECEPCAO').length;
  const totalVendas = usuarios.filter((u) => u.perfil === 'VENDAS').length;

  const handleAbrirCriacao = () => {
    setUsuarioEdicao(null);
    setModalNovoAberto(true);
  };

  const handleAbrirEdicao = (u: Usuario) => {
    setUsuarioEdicao(u);
    setModalNovoAberto(true);
  };

  const handleSalvarUsuario = async (dados: {
    nome: string;
    email: string;
    senha?: string;
    perfilid: number;
    ativo: boolean;
  }) => {
    setErro(null);
    if (usuarioEdicao) {
      const res = await usuarioService.atualizarUsuario(
        usuarioEdicao.usuarioid,
        dados,
        usuarioAtual?.usuarioid
      );
      if (res.sucesso) {
        setFeedback(`Usuário "${dados.nome}" atualizado com sucesso.`);
        setModalNovoAberto(false);
        carregarUsuarios();
      } else {
        throw new Error(res.erro || 'Falha ao atualizar usuário.');
      }
    } else {
      const res = await usuarioService.criarUsuario(
        { ...dados, senha: dados.senha || '' },
        usuarioAtual?.usuarioid
      );
      if (res.sucesso) {
        setFeedback(`Novo usuário "${dados.nome}" cadastrado com sucesso.`);
        setModalNovoAberto(false);
        carregarUsuarios();
      } else {
        throw new Error(res.erro || 'Falha ao cadastrar novo usuário.');
      }
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAlternarStatus = async (u: Usuario) => {
    // Impedir inativar a si mesmo ou conta MASTER por outro usuário
    if (String(u.usuarioid) === String(usuarioAtual?.usuarioid)) {
      setErro('Você não pode inativar sua própria conta durante esta sessão.');
      setTimeout(() => setErro(null), 4000);
      return;
    }

    if (u.perfil === 'MASTER' && usuarioAtual?.perfil !== 'MASTER') {
      setErro('Apenas a conta MASTER pode inativar um usuário MASTER.');
      setTimeout(() => setErro(null), 4000);
      return;
    }

    const novoStatus = !u.ativo;
    const res = await usuarioService.alternarStatus(
      u.usuarioid,
      novoStatus,
      usuarioAtual?.usuarioid
    );

    if (res.sucesso) {
      setFeedback(
        `Usuário "${u.nome}" ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`
      );
      carregarUsuarios();
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setErro(res.erro || 'Erro ao alterar status do usuário.');
      setTimeout(() => setErro(null), 4000);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!usuarioExcluir) return;

    if (String(usuarioExcluir.usuarioid) === String(usuarioAtual?.usuarioid)) {
      setErro('Você não pode excluir sua própria conta.');
      setUsuarioExcluir(null);
      setTimeout(() => setErro(null), 4000);
      return;
    }

    if (usuarioExcluir.perfil === 'MASTER') {
      setErro('Contas com perfil MASTER do Dono não podem ser excluídas.');
      setUsuarioExcluir(null);
      setTimeout(() => setErro(null), 4000);
      return;
    }

    const res = await usuarioService.excluir(usuarioExcluir.usuarioid);
    if (res.sucesso) {
      setFeedback(`Usuário "${usuarioExcluir.nome}" removido do sistema.`);
      carregarUsuarios();
    } else {
      setErro(res.erro || 'Não foi possível excluir o usuário.');
    }
    setUsuarioExcluir(null);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Auxiliar para Iniciais
  const obterIniciais = (nome: string) => {
    if (!nome) return 'US';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Usuários */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Gestão de Usuários & Credenciais
            </h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              {usuarios.length} Cadastrados
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Painel exclusivo do Dono do Sistema (`MASTER`). Controle logins, altere senhas e defina permissões.
          </p>
        </div>

        <button
          onClick={handleAbrirCriacao}
          className="px-4 py-2 text-xs font-bold bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-[#717971] block">Dono (MASTER)</span>
            <span className="font-['Manrope'] text-lg font-extrabold text-amber-800">{totalMaster}</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700">
            <Crown className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-[#717971] block">Administradores</span>
            <span className="font-['Manrope'] text-lg font-extrabold text-emerald-800">{totalAdmins}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-[#717971] block">Recepção</span>
            <span className="font-['Manrope'] text-lg font-extrabold text-blue-800">{totalRecepcao}</span>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-700">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-[#717971] block">Vendas</span>
            <span className="font-['Manrope'] text-lg font-extrabold text-purple-800">{totalVendas}</span>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-700">
            <Key className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Alertas de Feedback */}
      {feedback && (
        <div className="bg-[#b8f0c2] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#92c89d] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {erro && (
        <div className="bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#ffb4ab] shadow-xs">
          <AlertTriangle className="w-5 h-5 text-[#ba1a1a] shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Busca e Filtros */}
      <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
          />
        </div>

        <div>
          <select
            value={filtroPerfil}
            onChange={(e) => {
              setFiltroPerfil(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e] font-medium"
          >
            <option value="TODOS">Todos os Perfis</option>
            <option value="MASTER">👑 MASTER (Dono)</option>
            <option value="ADMIN">🛡️ Administrador (Gerente)</option>
            <option value="RECEPCAO">🛎️ Recepção</option>
            <option value="VENDAS">💼 Vendas</option>
          </select>
        </div>

        <div>
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e] font-medium"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Apenas Ativos</option>
            <option value="INATIVO">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela Data Grid */}
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xs overflow-hidden">
        {carregando ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <LoaderCircle className="w-8 h-8 text-[#053d1e] animate-spin mb-3" />
            <span className="text-xs font-bold text-slate-600">Carregando usuários do sistema...</span>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 font-['Manrope']">
              Nenhum usuário encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {busca || filtroPerfil !== 'TODOS' || filtroStatus !== 'TODOS'
                ? 'Ajuste os filtros de pesquisa acima.'
                : 'Clique no botão "+ Novo Usuário" para cadastrar o primeiro acesso.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data Inclusão</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosPaginados.map((u) => {
                  const ehVoce = String(u.usuarioid) === String(usuarioAtual?.usuarioid);
                  const ehMaster = u.perfil === 'MASTER';
                  const estaAtivo = u.ativo !== undefined ? Boolean(u.ativo) : true;

                  return (
                    <tr
                      key={u.usuarioid}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        #{u.usuarioid}
                      </td>

                      {/* Usuário */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center border shrink-0 ${
                            ehMaster
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-[#053d1e]/10 text-[#053d1e] border-[#053d1e]/20'
                          }`}>
                            {obterIniciais(u.nome)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 block">
                                {u.nome}
                              </span>
                              {ehVoce && (
                                <span className="text-[10px] font-bold text-[#053d1e] bg-[#e6f4ea] px-1.5 py-0.2 rounded border border-[#b8f0c2]">
                                  (Você)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Perfil Badge */}
                      <td className="py-3 px-4">
                        {u.perfil === 'MASTER' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Crown className="w-3 h-3 text-amber-700" />
                            👑 MASTER (Dono)
                          </span>
                        ) : u.perfil === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            Administrador
                          </span>
                        ) : u.perfil === 'VENDAS' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                            <Key className="w-3 h-3" />
                            Vendas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" />
                            Recepção
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {estaAtivo ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            ● Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
                            ○ Inativo
                          </span>
                        )}
                      </td>

                      {/* Data Inclusão */}
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {u.datainclusao
                          ? new Date(u.datainclusao).toLocaleDateString('pt-BR')
                          : '-'}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicao(u)}
                            className="p-1.5 text-slate-600 hover:text-[#053d1e] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={ehVoce || (ehMaster && usuarioAtual?.perfil !== 'MASTER')}
                            onClick={() => handleAlternarStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              ehVoce || (ehMaster && usuarioAtual?.perfil !== 'MASTER')
                                ? 'text-slate-300 cursor-not-allowed'
                                : estaAtivo
                                ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title={
                              ehVoce
                                ? 'Você não pode inativar sua própria conta'
                                : ehMaster
                                ? 'Conta de Dono/MASTER protegida'
                                : estaAtivo
                                ? 'Inativar Usuário'
                                : 'Ativar Usuário'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={ehVoce || ehMaster}
                            onClick={() => setUsuarioExcluir(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              ehVoce || ehMaster
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                            }`}
                            title={
                              ehVoce
                                ? 'Você não pode excluir sua própria conta'
                                : ehMaster
                                ? 'Conta MASTER do Dono não pode ser excluída'
                                : 'Excluir Usuário'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé / Paginação */}
        {usuariosFiltrados.length > 0 && !carregando && (
          <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              Exibindo <strong>{usuariosPaginados.length}</strong> de{' '}
              <strong>{usuariosFiltrados.length}</strong> usuários
            </span>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                  disabled={paginaAtual === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <span className="px-3 text-xs font-bold text-slate-700">
                  Página {paginaAtual} de {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Usuário */}
      <ModalCadastroUsuario
        aberto={modalNovoAberto}
        usuarioEdicao={usuarioEdicao}
        onFechar={() => setModalNovoAberto(false)}
        onSalvar={handleSalvarUsuario}
      />

      {/* Modal Confirmar Exclusão */}
      <ModalConfirmacao
        aberto={!!usuarioExcluir}
        titulo="Excluir Usuário"
        mensagem={`Tem certeza que deseja excluir o acesso de "${usuarioExcluir?.nome}" (${usuarioExcluir?.email})?`}
        tipo="perigo"
        textoConfirmar="Sim, Excluir"
        onConfirmar={handleConfirmarExclusao}
        onCancelar={() => setUsuarioExcluir(null)}
      />
    </div>
  );
};
