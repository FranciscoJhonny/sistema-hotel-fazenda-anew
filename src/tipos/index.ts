export type StatusQuarto = 'DISPONIVEL' | 'RESERVADO' | 'OCUPADO' | 'AGUARDANDO_CHECKIN' | 'MANUTENCAO';

export type CategoriaQuarto = 
  | 'Standard Duplo'
  | 'Standard Casal'
  | 'Standard Triplo'
  | 'Luxo Casal'
  | 'Luxo Duplo'
  | 'Chalé Master'
  | 'Chalé Família'
  | 'Vila Premium';

export type BlocoQuarto = 'B' | 'C' | 'D';

export type StatusReserva = 
  | 'CONFIRMADA' 
  | 'AGUARDANDO_CHECKIN' 
  | 'HOSPEDADO' 
  | 'FINALIZADA' 
  | 'CANCELADA';

export type TipoAtendimento = 'HOSPEDAGEM' | 'DAY_USE' | 'ALMOCO';

export type FormaPagamento = 
  | 'PIX' 
  | 'CARTAO_CREDITO' 
  | 'CARTAO_DEBITO' 
  | 'DINHEIRO' 
  | 'TRANSFERENCIA' 
  | 'OUTRO';

export type StatusPagamento = 'PAGO' | 'PENDENTE' | 'PARCIAL';

export type PerfilUsuario = 'ADMIN' | 'RECEPCAO' | 'VENDAS';

export type TipoVenda = 'LOJA' | 'ALMOCO' | 'DAY_USE' | 'CONSUMO_QUARTO';

// =============================================================================
// INTERFACES AUDITORIA
// =============================================================================
export interface EntidadeAuditavel {
  Ativo: boolean;
  UsuarioInclusao?: string;
  DataInclusao: string;
  UsuarioOperacao?: string;
  DataOperacao: string;
  NaturezaOperacao?: string;
}

// =============================================================================
// 1. Perfil
// =============================================================================
export interface Perfil extends EntidadeAuditavel {
  PerfilId: number | string;
  Descricao: string;
}

// =============================================================================
// 2. Usuario
// =============================================================================
export interface Usuario extends EntidadeAuditavel {
  UsuarioId: number | string;
  PerfilId: number | string;
  Nome: string;
  Email: string;
  Senha?: string;
  TokenRecuperacaoSenha?: string;
  DataRecuperacaoSenha?: string;
  Perfil?: PerfilUsuario;
  AvatarUrl?: string;
}

// =============================================================================
// 3. Quarto
// =============================================================================
export interface Quarto extends EntidadeAuditavel {
  QuartoId: number | string;
  Numero: string; // "B1", "B2", "C4", "D3", etc.
  CodigoIdentificador: string; // "B1", "B2", etc.
  Bloco: BlocoQuarto;
  Categoria: CategoriaQuarto;
  CapacidadeAdultos: number;
  CapacidadeCriancas: number;
  ValorDiariaPadrao: number;
  Status: StatusQuarto;
  MotivoBloqueio?: string;
  Descricao?: string;
  Comodidades?: string[];
  ReservaAtualId?: number | string;
  HospedeAtualNome?: string;
  DataEntradaAtual?: string;
  DataSaidaAtual?: string;
  AdultosAtual?: number;
  CriancasAtual?: number;
}

// =============================================================================
// 4. Hospede
// =============================================================================
export interface Hospede extends EntidadeAuditavel {
  HospedeId: number | string;
  NomeCompleto: string;
  Cpf: string;
  DataNascimento?: string;
  Telefone: string;
  WhatsApp?: string;
  Email?: string;
  Cidade?: string;
  Estado?: string;
  Observacoes?: string;
}

// =============================================================================
// 5. Pacote
// =============================================================================
export interface Pacote extends EntidadeAuditavel {
  PacoteId: number | string;
  Nome: string;
  Descricao?: string;
  DataInicio?: string;
  DataFim?: string;
  Valor: number;
  AdultosInclusos: number;
  CriancasInclusas: number;
}

// =============================================================================
// 6. Reserva
// =============================================================================
export interface Reserva extends EntidadeAuditavel {
  ReservaId: number | string;
  Codigo: string; // ex: "#49281"
  HospedeId: number | string;
  HospedeNome: string;
  HospedeTelefone?: string;
  HospedeEmail?: string;
  QuartoId: number | string;
  QuartoNumero: string;
  QuartoCodigo: string; // ex: "B1", "C4"
  QuartoCategoria?: string;
  Adultos: number;
  Criancas: number;
  DataEntrada: string; // YYYY-MM-DD
  DataSaida: string; // YYYY-MM-DD
  HorarioPrevistoChegada?: string; // ex: "14:00"
  HorarioPrevistoSaida?: string; // ex: "12:00"
  TipoAtendimento: TipoAtendimento;
  PacoteId?: number | string;
  PacoteNome?: string;
  Status: StatusReserva;
  ValorTotal: number;
  ValorPago: number;
  Saldo: number;
  StatusPagamento: StatusPagamento;
  FormaPagamento: FormaPagamento;
  Observacoes?: string;
  CheckinRealizadoEm?: string;
  CheckinUsuario?: string;
  CheckoutRealizadoEm?: string;
  CheckoutUsuario?: string;
}

// =============================================================================
// 7. Pagamento
// =============================================================================
export interface Pagamento extends EntidadeAuditavel {
  PagamentoId: number | string;
  ReservaId: number | string;
  Valor: number;
  FormaPagamento: FormaPagamento;
  Status: string;
  DataPagamento: string;
  ComprovanteUrl?: string;
  Observacoes?: string;
}

// =============================================================================
// 8. Produto
// =============================================================================
export interface Produto extends EntidadeAuditavel {
  ProdutoId: number | string;
  Nome: string;
  Descricao?: string;
  Categoria: string;
  Preco: number;
  Estoque: number;
}

// =============================================================================
// 9. Venda
// =============================================================================
export interface Venda extends EntidadeAuditavel {
  VendaId: number | string;
  Codigo: string;
  Tipo: TipoVenda;
  ReservaId?: number | string;
  QuartoNumero?: string;
  HospedeNome?: string;
  ValorTotal: number;
  FormaPagamento: FormaPagamento;
  StatusPagamento: StatusPagamento;
  UsuarioResponsavel?: string;
  DataHora: string;
  Itens: ItemVenda[];
}

// =============================================================================
// 10. ItemVenda
// =============================================================================
export interface ItemVenda extends Partial<EntidadeAuditavel> {
  ItemVendaId?: number | string;
  VendaId?: number | string;
  ProdutoId?: number | string;
  ProdutoNome: string;
  Quantidade: number;
  PrecoUnitario: number;
  Subtotal: number;
}

// =============================================================================
// 11. Configuracao
// =============================================================================
export interface Configuracao extends EntidadeAuditavel {
  ConfiguracaoId: number | string;
  Chave: string;
  Valor: string;
  Descricao?: string;
}

// Configurações do Sistema em Memória / App
export interface ConfiguracaoSistema {
  CheckInTime: string; // "09:00"
  CheckOutTime: string; // "15:00"
  HotelNome: string;
  HotelLocalizacao: string;
  TelefoneHotel: string;
  EmailHotel: string;
  TaxaServicoPercentual: number;
  SupabaseUrl?: string;
  SupabaseAnonKey?: string;
  ModoOfflineAtivo: boolean;
  // Regras de Desconto para Crianças
  CriancaIdadeLimiteGratis?: number; // 5
  CriancaIdadeLimiteMeia?: number; // 11
  CriancaIdadeIntegral?: number; // 12
  CriancaPorcentagemMeiaDiaria?: number; // 50
  CriancaDescontoGratis?: number; // 100
  CapacidadeMaximaAdultosPorQuarto?: number; // 4
  CapacidadeMaximaCriancasPorQuarto?: number; // 3
  FormaPagamentoPadrao?: string; // 'PIX'
  PorcentagemEntradaMinima?: number; // 30
}

export type PaginaNavegacao = 
  | 'login'
  | 'dashboard'
  | 'quartos'
  | 'reservas'
  | 'nova-reserva'
  | 'checkin'
  | 'checkout'
  | 'hospedes'
  | 'financeiro'
  | 'loja'
  | 'relatorios'
  | 'configuracoes';
