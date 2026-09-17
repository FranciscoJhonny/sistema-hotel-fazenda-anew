import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import { Usuario } from '../../tipos';

interface ModalCadastroUsuarioProps {
  aberto: boolean;
  usuarioEdicao: Usuario | null;
  onFechar: () => void;
  onSalvar: (dados: {
    nome: string;
    email: string;
    senha?: string;
    perfilid: number;
    ativo: boolean;
  }) => Promise<void>;
}

export const ModalCadastroUsuario: React.FC<ModalCadastroUsuarioProps> = ({
  aberto,
  usuarioEdicao,
  onFechar,
  onSalvar,
}) => {
  const [nome, setNome] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [perfilid, setPerfilid] = useState<number>(2); // Padrão: 2 (RECEPCAO)
  const [senha, setSenha] = useState<string>('');
  const [confirmarSenha, setConfirmarSenha] = useState<string>('');
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);
  const [ativo, setAtivo] = useState<boolean>(true);

  const [salvando, setSalvando] = useState<boolean>(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    if (usuarioEdicao) {
      setNome(usuarioEdicao.nome || '');
      setEmail(usuarioEdicao.email || '');
      setPerfilid(Number(usuarioEdicao.perfilid || 2));
      setAtivo(usuarioEdicao.ativo !== undefined ? Boolean(usuarioEdicao.ativo) : true);
      setSenha('');
      setConfirmarSenha('');
    } else {
      setNome('');
      setEmail('');
      setPerfilid(2);
      setAtivo(true);
      setSenha('');
      setConfirmarSenha('');
    }
    setErroValidacao(null);
    setMostrarSenha(false);
  }, [usuarioEdicao, aberto]);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    // Validações básicas
    if (!nome.trim()) {
      setErroValidacao('Por favor, informe o nome completo do usuário.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErroValidacao('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    // Se estiver criando ou se preencheu senha na edição
    const ehEdicao = Boolean(usuarioEdicao);

    if (!ehEdicao && !senha.trim()) {
      setErroValidacao('A senha é obrigatória para cadastrar um novo usuário.');
      return;
    }

    if (senha.trim()) {
      if (senha.length < 6) {
        setErroValidacao('A senha deve conter no mínimo 6 caracteres.');
        return;
      }

      if (senha !== confirmarSenha) {
        setErroValidacao('As senhas digitadas não coincidem. Por favor, verifique.');
        return;
      }
    }

    try {
      setSalvando(true);
      await onSalvar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha.trim() || undefined,
        perfilid: Number(perfilid),
        ativo,
      });
    } catch (err: any) {
      setErroValidacao(err?.message || 'Erro ao salvar o usuário. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-[#053d1e] to-[#1b4e2e] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-['Manrope'] text-lg font-bold">
                {usuarioEdicao ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
              </h2>
              <p className="text-xs text-white/80">
                {usuarioEdicao
                  ? `Atualizando dados do usuário #${usuarioEdicao.usuarioid}`
                  : 'Cadastre credenciais e selecione o nível de permissão.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {erroValidacao && (
            <div className="bg-[#ffdad6] text-[#93000a] border border-[#ffb4ab] px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="Ex: João Silva Costa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              E-mail de Acesso <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="exemplo@fazendaanew.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Perfil de Acesso */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              Perfil de Permissão <span className="text-red-500">*</span>
            </label>
            <select
              value={perfilid}
              onChange={(e) => setPerfilid(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors font-medium text-[#191c1d]"
            >
              <option value={1}>👑 MASTER (Dono do Sistema - Acesso Supremo & Usuários)</option>
              <option value={2}>🛡️ Administrador (Gerente da Fazenda / Hotel)</option>
              <option value={3}>🛎️ Recepção (Check-in, Check-out, Quartos e Produtos)</option>
              <option value={5}>💼 Vendas (Day-Use, Almoço, Lojinha e Reservas)</option>
            </select>
          </div>

          {/* Senha e Confirmar Senha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#191c1d] mb-1">
                {usuarioEdicao ? 'Nova Senha (Opcional)' : 'Senha de Acesso'} {!usuarioEdicao && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder={usuarioEdicao ? 'Manter senha atual' : 'Mínimo 6 caracteres'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-2.5 top-2.5 text-[#717971] hover:text-[#191c1d]"
                >
                  {mostrarSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191c1d] mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
          {usuarioEdicao && (
            <p className="text-[11px] text-[#717971] italic">
              💡 Deixe os campos de senha em branco para não alterar a senha atual do usuário.
            </p>
          )}

          {/* Status Ativo */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#191c1d] block">Status da Conta</span>
              <span className="text-[11px] text-[#717971]">
                Usuários inativos são bloqueados de realizar login.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#053d1e]"></div>
            </label>
          </div>
        </form>

        {/* Rodapé de Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
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
                <span>Gravando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{usuarioEdicao ? 'Salvar Alterações' : 'Cadastrar Usuário'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

