// src/tipos/index.ts

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
  ativo: boolean;
  usuarioinclusao?: number | string;
  datainclusao: string;
  usuariooperacao?: number | string;
  dataoperacao: string;
  naturezaoperacao?: string;
}

// =============================================================================
// 1. Perfil
// =============================================================================
export interface Perfil extends EntidadeAuditavel {
  perfilid: number | string;
  descricao: string;
}

// =============================================================================
// 2. Usuario
// =============================================================================
export interface Usuario extends EntidadeAuditavel {
  usuarioid: number | string;
  perfilid: number | string;
  nome: string;
  email: string;
  senha?: string;
  tokenrecuperacaosenha?: string;
  datarecuperacaosenha?: string;
  perfil?: PerfilUsuario;
  avatarurl?: string;
}

// =============================================================================
// 3. Quarto
// =============================================================================
export interface Quarto extends EntidadeAuditavel {
  quartoid: number | string;
  numero: string; // "B1", "B2", "C4", "D3", etc.
  codigoidentificador: string; // "B1", "B2", etc.
  bloco: BlocoQuarto;
  categoria: CategoriaQuarto;
  capacidadeadultos: number;
  capacidadecriancas: number;
  valordiariapadrao: number;
  status: StatusQuarto;
  descricao?: string; // MotivoBloqueio agora é descricao
  comodidades?: string; // text no banco, não array
  ativo: boolean;
  reservaatualid?: number | string;
  hospedeatualnome?: string;
  dataentradaatual?: string;
  datasaidaatual?: string;
  adultosatual?: number;
  criancasatual?: number;
}

// =============================================================================
// 4. Hospede
// =============================================================================
export interface Hospede extends EntidadeAuditavel {
  hospedeid: number | string;
  nomecompleto: string;
  cpf: string;
  datanascimento?: string;
  telefone: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
}

// =============================================================================
// 5. Pacote
// =============================================================================
export interface Pacote extends EntidadeAuditavel {
  pacoteid: number | string;
  nome: string;
  descricao?: string;
  datainicio?: string;
  datafim?: string;
  valor: number;
  adultosinclusos: number;
  criancasinclusas: number;
}

// =============================================================================
// 6. Reserva
// =============================================================================
export interface Reserva extends EntidadeAuditavel {
  reservaid: number;
  codigo: string; // ex: "#49281"
  hospedeid: number | string;
  hospedenome: string;
  hospedetelefone?: string;
  hospedeemail?: string;
  quartoid: number | string;
  quartonumero: string;
  quartocodigo: string; // ex: "B1", "C4"
  quartocategoria?: string;
  adultos: number;
  criancas: number;
  dataentrada: string; // YYYY-MM-DD
  datasaida: string ; // YYYY-MM-DD
  horarioprevistochegada?: string; // ex: "14:00"
  horarioprevistosaida?: string; // ex: "12:00"
  tipoatendimento: TipoAtendimento;
  pacoteid?: number | string;
  pacotename?: string;
  statusreserva: StatusReserva;
  valortotal: number;
  valorpago: number;
  saldo: number;
  statuspagamento: StatusPagamento;
  formapagamento: FormaPagamento;
  observacoes?: string;
  checkinrealizadoem?: string;
  checkinusuario?: number | string;
  checkoutrealizadoem?: string;
  checkoutusuario?: number | string;
}

// =============================================================================
// 7. Pagamento
// =============================================================================
export interface Pagamento extends EntidadeAuditavel {
  pagamentoid: number | string;
  reservaid: number | string;
  valor: number;
  formapagamento: FormaPagamento;
  status: string;
  datapagamento: string;
  comprovanteurl?: string;
  observacoes?: string;
}

// =============================================================================
// 8. Produto
// =============================================================================
export interface Produto extends EntidadeAuditavel {
  produtoid: number | string;
  nome: string;
  descricao?: string;
  categoria: string;
  preco: number;
  estoque: number;
}

// =============================================================================
// 9. Venda
// =============================================================================
export interface Venda extends EntidadeAuditavel {
  vendaid: number | string;
  codigo: string;
  tipo: TipoVenda;
  reservaid?: number | string;
  quartonumero?: string;
  hospedenome?: string;
  valortotal: number;
  formapagamento: FormaPagamento;
  statuspagamento: StatusPagamento;
  usuarioresponsavel?: number | string;
  datahora: string;
  itens: ItemVenda[];
}

// =============================================================================
// 10. ItemVenda
// =============================================================================
export interface ItemVenda extends Partial<EntidadeAuditavel> {
  itemvendaid?: number | string;
  vendaid?: number | string;
  produtoid?: number | string;
  produtonome: string;
  quantidade: number;
  precounitario: number;
  subtotal: number;
}

// =============================================================================
// 11. Configuracao
// =============================================================================
export interface Configuracao extends EntidadeAuditavel {
  configuracaoid: number | string;
  chave: string;
  valor: string;
  descricao?: string;
}

// Configurações do Sistema em Memória / App
export interface ConfiguracaoSistema {
  checkintime: string; // "09:00"
  checkouttime: string; // "15:00"
  hotelnome: string;
  hotellocalizacao: string;
  telefonehotel: string;
  emailhotel: string;
  taxaservicopercentual: number;
  supabaseurl?: string;
  supabaseanonkey?: string;
  modoofflineativo: boolean;
  criancaidadelimitegratis?: number; // 5
  criancaidadelimitemeia?: number; // 11
  criancaidadeintegral?: number; // 12
  criancaporcentagemmeiadiaria?: number; // 50
  criancaDescontogratuis?: number; // 100
  capacidademaximaadultosporquarto?: number; // 4
  capacidademaximacriancasporquarto?: number; // 3
  formapagamentopadrao?: string; // 'PIX'
  porcentagementradaminima?: number; // 30
}

export type PaginaNavegacao = 
  | 'login'
  | 'dashboard'
  | 'quartos'
  | 'reservas'
  | 'mapa-reservas'
  | 'nova-reserva'
  | 'checkin'
  | 'checkout'
  | 'hospedes'
  | 'financeiro'
  | 'loja'
  | 'relatorios'
  | 'configuracoes';