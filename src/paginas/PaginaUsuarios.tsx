import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
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
  Shield,
  Key,
  Crown,
  Briefcase,
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

  // Validação de permissão restrita para ADMIN e MASTER
  const temPermissaoAdmin = usuarioAtual?.perfil === 'MASTER' || usuarioAtual?.perfil === 'ADMIN';

  // Carregar lista de usuários
  const carregarUsuarios = async () => {
    if (!temPermissaoAdmin) return;
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
  }, [temPermissaoAdmin]);

  // Se não possuir permissão, bloqueia a renderização com mensagem amigável de Acesso Restrito
  if (!temPermissaoAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-200">
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-8 max-w-md w-full shadow-lg space-y-4">
          <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto text-[#ba1a1a]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
              Acesso Restrito
            </h2>
            <p className="text-xs text-[#717971] mt-1.5 leading-relaxed font-medium">
              Permissão concedida apenas para administradores.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block text-[11px] font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              💡 Seu perfil ({usuarioAtual?.perfil || 'Sem perfil'}) não possui autorização para gerenciar credenciais.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Filtros aplicados
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      // 1. Busca por texto
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

  // Contadores por perfil
  const totalMasters = usuarios.filter((u) => u.perfil === 'MASTER').length;
  const totalDiretoria = usuarios.filter((u) => u.perfil === 'DIRETORIA').length;
  const totalAdmins = usuarios.filter((u) => u.perfil === 'ADMIN').length;
  const totalRecepcao = usuarios.filter((u) => u.perfil === 'RECEPCAO').length;
  const totalVendas = usuarios.filter((u) => u.perfil === 'VENDAS').length;

  // Ações de criação / edição
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
    if (usuarioEdicao) {
      // Edição
      const res = await usuarioService.atualizarUsuario(
        usuarioEdicao.usuarioid,
        dados,
        usuarioAtual?.usuarioid
      );
      if (res.sucesso) {
        setFeedback(`Usuário "${dados.nome}" atualizado com sucesso.`);
        carregarUsuarios();
        setModalNovoAberto(false);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        throw new Error(res.erro || 'Não foi possível atualizar o usuário.');
      }
    } else {
      // Criação
      const res = await usuarioService.criarUsuario(
        {
          nome: dados.nome,
          email: dados.email,
          senha: dados.senha || '123456',
          perfilid: dados.perfilid,
          ativo: dados.ativo,
        },
        usuarioAtual?.usuarioid
      );
      if (res.sucesso) {
        setFeedback(`Novo usuário "${dados.nome}" cadastrado com sucesso.`);
        carregarUsuarios();
        setModalNovoAberto(false);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        throw new Error(res.erro || 'Não foi possível criar o usuário.');
      }
    }
  };

  // Ação de ativar/inativar rápido
  const handleAlternarStatus = async (u: Usuario) => {
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

  const obterIniciais = (nome: string) => {
    if (!nome) return 'US';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
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
            Controle de acessos, senhas e perfis administrativos, executivos (Diretoria) e operacionais.
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

      {/* Cards de Resumo por Perfil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-[#717971] block">Master (Dono)</span>
            <span className="font-['Manrope'] text-lg font-extrabold text-amber-900">{totalMasters}</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700">
            <Crown className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-[#717971] block">Diretoria (Getúlio)</span>
            <span className="font-['Manrope'] text-lg font-extrabold text-indigo-900">{totalDiretoria}</span>
          </div>
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-700">
            <Briefcase className="w-4 h-4" />
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

      {/* Alertas */}
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
            <option value="DIRETORIA">👔 DIRETORIA (Executivo / Getúlio)</option>
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
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        {carregando ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle className="w-8 h-8 animate-spin text-[#053d1e]" />
            <span className="text-xs font-semibold">Carregando usuários do sistema...</span>
          </div>
        ) : usuariosPaginados.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Nenhum usuário encontrado</p>
            <p className="text-xs mt-1 text-slate-400">
              {busca || filtroPerfil !== 'TODOS' || filtroStatus !== 'TODOS'
                ? 'Tente ajustar os filtros ou termos de busca.'
                : 'Clique no botão "+ Novo Usuário" para cadastrar a primeira conta.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#c1c9bf] text-[11px] uppercase tracking-wider font-bold text-[#717971]">
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e3e1] text-xs font-medium text-[#191c1d]">
                {usuariosPaginados.map((u) => {
                  const ehMaster = u.perfil === 'MASTER';
                  const ehDiretoria = u.perfil === 'DIRETORIA';
                  const ehAdmin = u.perfil === 'ADMIN';
                  const ehVendas = u.perfil === 'VENDAS';

                  return (
                    <tr key={u.usuarioid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              ehMaster
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : ehDiretoria
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                : ehAdmin
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : ehVendas
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {obterIniciais(u.nome)}
                          </div>
                          <div>
                            <span className="font-bold block text-slate-800">{u.nome}</span>
                            <span className="text-[10px] text-slate-400">ID #{u.usuarioid}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {u.email}
                      </td>

                      <td className="py-3 px-4">
                        {ehMaster ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            <Crown className="w-3 h-3 text-amber-700" />
                            MASTER (Dono)
                          </span>
                        ) : ehDiretoria ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                            <Briefcase className="w-3 h-3 text-indigo-700" />
                            DIRETORIA (Executivo)
                          </span>
                        ) : ehAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3 text-emerald-700" />
                            Administrador
                          </span>
                        ) : ehVendas ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                            <Key className="w-3 h-3 text-purple-700" />
                            Vendas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3 text-blue-700" />
                            Recepção
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleAlternarStatus(u)}
                          disabled={ehMaster}
                          title={ehMaster ? 'Perfil MASTER não pode ser desativado.' : 'Clique para alterar status'}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                            u.ativo !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          } ${ehMaster ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{u.ativo !== false ? 'ATIVO' : 'INATIVO'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicao(u)}
                            className="p-1.5 text-slate-600 hover:text-[#053d1e] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {!ehMaster && (
                            <button
                              type="button"
                              onClick={() => setUsuarioExcluir(u)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Rodapé com Paginação */}
        {totalPaginas > 1 && (
          <div className="bg-[#f8f9fa] border-t border-[#c1c9bf] px-4 py-3 flex items-center justify-between text-xs text-[#717971]">
            <span>
              Mostrando página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-1.5 rounded-lg border border-[#c1c9bf] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="p-1.5 rounded-lg border border-[#c1c9bf] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      <ModalCadastroUsuario
        aberto={modalNovoAberto}
        usuarioEdicao={usuarioEdicao}
        onFechar={() => setModalNovoAberto(false)}
        onSalvar={handleSalvarUsuario}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirmacao
        aberto={Boolean(usuarioExcluir)}
        titulo="Excluir Usuário"
        mensagem={`Tem certeza de que deseja remover a conta de "${usuarioExcluir?.nome}" (${usuarioExcluir?.email})? Esta ação não poderá ser desfeita.`}
        tipo="perigo"
        textoConfirmar="Sim, Excluir"
        onCancelar={() => setUsuarioExcluir(null)}
        onConfirmar={handleConfirmarExclusao}
      />
    </div>
  );
};