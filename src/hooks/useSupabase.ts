import { useState, useEffect, useMemo, useCallback } from 'react';
import {
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
  apiCliente,
} from '../servicos/api';

export function useSupabase() {
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
    conectado: true,
    urlConfigurada: true,
    chaveConfigurada: true,
    mensagem: 'Conectado à API REST C# .NET 8',
  });

  const [verificando, setVerificando] = useState<boolean>(false);

  const testarConexao = useCallback(async () => {
    setVerificando(true);
    try {
      const res = await apiCliente.get('/api/quarto/get-lista-quarto');
      const conectado = res.sucesso;
      const status: StatusConexaoSupabase = {
        conectado,
        urlConfigurada: true,
        chaveConfigurada: true,
        mensagem: conectado ? 'Conectado à API REST C# .NET 8 com sucesso.' : 'Falha na comunicação com a API REST.',
        ultimaVerificacao: new Date().toISOString(),
      };
      setStatusConexao(status);
      return status;
    } catch {
      const status: StatusConexaoSupabase = {
        conectado: false,
        urlConfigurada: true,
        chaveConfigurada: true,
        mensagem: 'Erro ao conectar à API REST.',
        ultimaVerificacao: new Date().toISOString(),
      };
      setStatusConexao(status);
      return status;
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    testarConexao();
  }, [testarConexao]);

  return {
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
    estaConectado: statusConexao.conectado,
  };
}
