import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SupabaseService,
  AuthService,
  UsuarioService,
  PerfilService,
  QuartoService,
  HospedeService,
  PacoteService,
  ReservaService,
  PagamentoService,
  ProdutoService,
  VendaService,
  ItemVendaService,
  ConfiguracaoService,
  StatusConexaoSupabase,
} from '../servicos/supabase';

export function useSupabase() {
  const supabase = useMemo(() => SupabaseService.getInstance(), []);
  const auth = useMemo(() => new AuthService(), []);
  const usuario = useMemo(() => new UsuarioService(), []);
  const perfil = useMemo(() => new PerfilService(), []);
  const quarto = useMemo(() => new QuartoService(), []);
  const hospede = useMemo(() => new HospedeService(), []);
  const pacote = useMemo(() => new PacoteService(), []);
  const reserva = useMemo(() => new ReservaService(), []);
  const pagamento = useMemo(() => new PagamentoService(), []);
  const produto = useMemo(() => new ProdutoService(), []);
  const venda = useMemo(() => new VendaService(), []);
  const itemVenda = useMemo(() => new ItemVendaService(), []);
  const configuracao = useMemo(() => new ConfiguracaoService(), []);

  const [statusConexao, setStatusConexao] = useState<StatusConexaoSupabase>({
    conectado: supabase.estaConectado(),
    urlConfigurada: Boolean(localStorage.getItem('anew_supabase_url')),
    chaveConfigurada: Boolean(localStorage.getItem('anew_supabase_key')),
    mensagem: 'Verificando conexão...',
  });

  const [verificando, setVerificando] = useState<boolean>(false);

  const testarConexao = useCallback(async () => {
    setVerificando(true);
    try {
      const status = await supabase.testarConexao();
      setStatusConexao(status);
      return status;
    } finally {
      setVerificando(false);
    }
  }, [supabase]);

  const reconfigurar = useCallback(
    (novaUrl: string, novaKey: string) => {
      const res = supabase.reconfigurar(novaUrl, novaKey);
      testarConexao();
      return res;
    },
    [supabase, testarConexao]
  );

  useEffect(() => {
    testarConexao();
  }, [testarConexao]);

  return {
    supabase,
    auth,
    usuario,
    perfil,
    quarto,
    hospede,
    pacote,
    reserva,
    pagamento,
    produto,
    venda,
    itemVenda,
    configuracao,
    statusConexao,
    verificando,
    testarConexao,
    reconfigurar,
    estaConectado: statusConexao.conectado,
  };
}
