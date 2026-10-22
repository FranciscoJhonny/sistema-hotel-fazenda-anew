// Cliente HTTP Principal
export { apiCliente, obterTokenApi, salvarTokenApi, limparTokenApi, normalizarDadosApi, obterApiBaseUrl } from './apiCliente';

// Classes e Instâncias dos Serviços REST
export { AuthService, authService } from './AuthService';
export { ConfiguracaoService, configuracaoService } from './ConfiguracaoService';
export { ConsumoExtraService, consumoExtraService } from './ConsumoExtraService';
export { FnrhService, fnrhService, gerarLinkPublicoFnrh, gerarTokenAleatorio } from './FnrhService';
export { HospedeService, hospedeService } from './HospedeService';
export { ItemVendaService, itemVendaService } from './ItemVendaService';
export { PacoteService, pacoteService } from './PacoteService';
export { PagamentoService, pagamentoService } from './PagamentoService';
export { PerfilService, perfilService } from './PerfilService';
export { ProdutoService, produtoService } from './ProdutoService';
export { QuartoService, quartoService } from './QuartoService';
export { ReservaService, reservaService } from './ReservaService';
export { UsuarioService, usuarioService } from './UsuarioService';
export { VendaService, vendaService } from './VendaService';

// Tipos e Interfaces
export type {
  ResultadoSupabase,
  ResultadoApi,
  FiltrosConsulta,
  StatusConexaoSupabase,
} from './types';

export type { IAuthService } from './AuthService';
export type { IConfiguracaoService } from './ConfiguracaoService';
export type { IConsumoExtraService } from './ConsumoExtraService';
export type { IFnrhService } from './FnrhService';
export type { IHospedeService } from './HospedeService';
export type { IItemVendaService } from './ItemVendaService';
export type { IPacoteService } from './PacoteService';
export type { IPagamentoService } from './PagamentoService';
export type { IPerfilService } from './PerfilService';
export type { IProdutoService } from './ProdutoService';
export type { IQuartoService } from './QuartoService';
export type { IReservaService } from './ReservaService';
export type { IUsuarioService } from './UsuarioService';
export type { IVendaService } from './VendaService';
