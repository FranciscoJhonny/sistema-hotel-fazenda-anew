import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { useSupabase } from '../../hooks/useSupabase';

interface ModalAlterarSenhaProps {
  aberto: boolean;
  onFechar: () => void;
}

export const ModalAlterarSenha: React.FC<ModalAlterarSenhaProps> = ({
  aberto,
  onFechar,
}) => {
  const { usuarioAtual } = useHotel();
  const { usuario: usuarioService } = useSupabase();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setErro(null);
      setSucesso(null);
      setMostrarSenhaAtual(false);
      setMostrarNovaSenha(false);
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!usuarioAtual?.usuarioid) {
      setErro('Sessão inválida. Faça login novamente.');
      return;
    }

    if (!senhaAtual.trim()) {
      setErro('Por favor, digite sua senha atual.');
      return;
    }

    if (!novaSenha.trim()) {
      setErro('Por favor, digite a nova senha.');
      return;
    }

    if (novaSenha.length < 6) {
      setErro('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('A confirmação da nova senha não confere.');
      return;
    }

    if (senhaAtual.trim() === novaSenha.trim()) {
      setErro('A nova senha precisa ser diferente da senha atual.');
      return;
    }

    try {
      setCarregando(true);
      const res = await usuarioService.alterarSenha(
        usuarioAtual.usuarioid,
        senhaAtual.trim(),
        novaSenha.trim()
      );

      if (res.sucesso) {
        setSucesso('Sua senha foi alterada com sucesso!');
        setTimeout(() => {
          onFechar();
        }, 2000);
      } else {
        setErro(res.erro || 'Não foi possível alterar a senha.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao alterar a senha. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-[#053d1e] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-['Manrope'] text-lg font-bold">Alterar Minha Senha</h2>
              <p className="text-xs text-white/80">
                {usuarioAtual?.email || 'Defina uma senha forte para sua segurança'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="bg-[#ffdad6] text-[#93000a] border border-[#ffb4ab] px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {sucesso && (
            <div className="bg-[#b8f0c2] text-[#00210d] border border-[#92c89d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}

          {/* Senha Atual */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              Senha Atual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type={mostrarSenhaAtual ? 'text' : 'password'}
                required
                placeholder="Digite a senha atual da sua conta"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                className="absolute right-2.5 top-2.5 text-[#717971] hover:text-[#191c1d]"
              >
                {mostrarSenhaAtual ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              Nova Senha Forte <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type={mostrarNovaSenha ? 'text' : 'password'}
                required
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                className="absolute right-2.5 top-2.5 text-[#717971] hover:text-[#191c1d]"
              >
                {mostrarNovaSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              Confirmar Nova Senha <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type={mostrarNovaSenha ? 'text' : 'password'}
                required
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:bg-white transition-colors"
              />
            </div>
          </div>
        </form>

        {/* Rodapé de Ações */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={carregando}
            className="px-5 py-2 text-xs font-bold bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {carregando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Atualizar Senha</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

