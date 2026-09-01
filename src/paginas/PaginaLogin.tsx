// src/paginas/PaginaLogin.tsx
import React, { useState } from 'react';
import {
  Mail,
  Lock,
  LogIn,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { LogoHotel } from '../componentes/comuns/LogoHotel';

export const PaginaLogin: React.FC = () => {
  const { login, navegarPara, online } = useHotel();

  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<boolean>(false);

  // 🔥 Contas demo APENAS PARA PREENCHIMENTO (não para login)
  const contasDemo = [
    { nome: 'Administrador', email: 'francisco.jhonny@hotmail.com', senha: '123456' },
    { nome: 'Recepção', email: 'joao@email.com', senha: '123456' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const emailLimpo = email.trim().toLowerCase();

    // Verificar conexão
    if (!online) {
      setErro('🚫 Sem conexão com a internet. Verifique sua rede.');
      setCarregando(false);
      return;
    }

    try {
      // 🔥 CHAMAR LOGIN - APENAS SUPABASE
      const resultado = await login(emailLimpo, senha);

      if (resultado.sucesso) {
        setFeedbackSucesso(true);
        setTimeout(() => {
          navegarPara('dashboard');
        }, 600);
      } else {
        setErro(resultado.erro || 'E-mail ou senha inválidos.');
      }
    } catch (error: any) {
      setErro('Erro ao conectar com o servidor. Tente novamente.');
      console.error('[PaginaLogin] Erro:', error);
    } finally {
      setCarregando(false);
    }
  };

  const preencherCredenciais = (emailDemo: string, senhaDemo: string) => {
    setEmail(emailDemo);
    setSenha(senhaDemo);
    setErro(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 sm:p-6 font-['Inter'] antialiased">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-sm p-6 sm:p-8 space-y-6">
          {/* Status de Conexão */}
          <div className="flex items-center justify-end gap-2 text-[10px]">
            {online ? (
              <span className="flex items-center gap-1 text-[#137333]">
                <Wifi className="w-3 h-3" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#ba1a1a]">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>

          {/* Logo */}
          <div className="px-4 flex flex-col items-center text-center">
            <div className="h-20 w-auto mb-1 p-1 flex items-center justify-center">
              <LogoHotel tamanho="md" />
            </div>
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d] text-center leading-tight">
              Hotel Fazenda Anew
            </h1>
            <p className="font-['Inter'] text-[11px] text-[#717971] uppercase tracking-wider font-semibold mt-0.5">
              Administração
            </p>
            <p className="text-xs text-[#717971] flex items-center justify-center gap-1 mt-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#053d1e]" />
              Corguinho - Mato Grosso do Sul - Brasil
            </p>
          </div>

          {/* Feedback Sucesso */}
          {feedbackSucesso && (
            <div className="bg-[#e6f4ea] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#b8f0c2]">
              <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
              <span>Login realizado com sucesso! Acessando painel...</span>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="bg-[#ffdad6] text-[#ba1a1a] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#ffdad6]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#414941] mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#717971] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:ring-1 focus:ring-[#053d1e] text-[#191c1d] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#414941]">
                  Senha
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#717971] absolute left-3 top-3 pointer-events-none" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e] focus:ring-1 focus:ring-[#053d1e] text-[#191c1d] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-2.5 p-1 text-[#717971] hover:text-[#191c1d] transition-colors cursor-pointer"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando || !email || !senha || !online}
              className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                carregando || !email || !senha || !online
                  ? 'bg-[#c1c9bf] text-[#717971] cursor-not-allowed'
                  : 'bg-[#053d1e] hover:bg-[#225533] text-white'
              }`}
            >
              {carregando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando credenciais...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Contas Demo - APENAS PARA PREENCHIMENTO */}
          <div className="pt-4 border-t border-[#e1e3e4] space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[#e1e3e4]" />
              <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider">
                Credenciais de Teste
              </span>
              <div className="flex-1 h-px bg-[#e1e3e4]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contasDemo.map((conta) => (
                <button
                  key={conta.email}
                  type="button"
                  onClick={() => preencherCredenciais(conta.email, conta.senha)}
                  className="p-3 bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl text-left hover:border-[#053d1e] hover:bg-[#e6f4ea] transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-[#191c1d]">{conta.nome}</p>
                  <p className="text-[10px] text-[#717971] font-mono truncate mt-0.5">{conta.email}</p>
                  <div className="mt-1.5 pt-1.5 border-t border-[#e1e3e4]/60 flex items-center justify-between text-[10px] text-[#717971]">
                    <span>Senha:</span>
                    <span className="font-mono font-bold text-[#053d1e]">{conta.senha}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-[#717971] text-center italic">
              ⚡ Clique em uma conta para preencher os campos. O login é validado no Supabase.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#717971] mt-6">
          Hotel Fazenda Anew © {new Date().getFullYear()} • Corguinho - MS
        </p>
      </div>
    </div>
  );
};