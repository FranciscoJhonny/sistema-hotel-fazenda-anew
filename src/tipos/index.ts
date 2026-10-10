// src/tipos/index.ts

export type StatusQuarto = 'DISPONIVEL' | 'RESERVADO' | 'OCUPADO' | 'AGUARDANDO_CHECKIN' | 'MANUTENCAO' | 'A_LIMPAR' | 'EM_LIMPEZA';

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
  | 'PRE_RESERVA'
  | 'RESERVADO'
  | 'HOSPEDADO' 
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'CREDITO';

export type TipoAtendimento = 'HOSPEDAGEM' | 'DAY_USE' | 'ALMOCO';

export type FormaPagamento = 
  | 'PIX' 
  | 'CARTAO_CREDITO' 
  | 'CARTAO_DEBITO' 
  | 'DINHEIRO' 
  | 'TRANSFERENCIA' 
  | 'OUTRO';

export type StatusPagamento = 'PAGO' | 'PENDENTE' | 'PARCIAL';

export type TipoLancamentoPagamento =
  | 'SINAL_RESERVA'
  | 'SALDO_RESERVA'
  | 'CONSUMO_EXTRA';

export type PerfilUsuario = 'MASTER' | 'ADMIN' | 'RECEPCAO' | 'VENDAS' | 'DIRETORIA' | 'EXECUTIVO';

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
  perfilid: number;
  nome: string;
  descricao: string;
}

// =============================================================================
// 2. Usuário
// =============================================================================
export interface Usuario extends EntidadeAuditavel {
  usuarioid: number;
  perfilid: number;
  nome: string;
  email: string;
  senha?: string;
  perfil?: PerfilUsuario;
}

// =============================================================================
// 3. Quarto
// =============================================================================
export interface Quarto extends EntidadeAuditavel {
  quartoid: number;
  numero: string;
  codigoidentificador: string;
  bloco: string;
  categoria: string;
  quantidadecamascasal: number;
  quantidadecamassolteiro: number;
  capacidadeadultos: number;
  capacidadecriancas: number;
  valordiariapadrao: number;
  status: StatusQuarto;
  descricao?: string;
  comodidades?: string;
  
  // Relações em memória / ViewModel para telas
  reservaatualid?: number;
  hospedeatualnome?: string;
  dataentradaatual?: string;
  datasaidaatual?: string;
  adultosatual?: number;
  criancasatual?: number;
}

// =============================================================================
// 4. Hóspede
// =============================================================================
export interface Hospede extends EntidadeAuditavel {
  hospedeid: number;
  nomecompleto: string;
  cpf: string;
  rg?: string;
  passaporte?: string;
  datanascimento?: string;
  nacionalidade?: string;
  sexo?: string;
  telefone: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  profissao?: string;
  proximodestino?: string;
  ultimaprocedencia?: string;
  cpfresponsavelmenor?: string;
  alergias_restricoes?: string;
  solicitacoes_especiais?: string;
  declaracao_aceita?: boolean;
  data_declaracao?: string;
  assinatura_url?: string;
}

// =============================================================================
// 5. Acompanhante
// =============================================================================
export interface Acompanhante extends EntidadeAuditavel {
  acompanhanteid: number;
  hospedeid: number;
  reservaid?: number;
  cadastroid?: number;
  nomecompleto: string;
  documento?: string;
  datanascimento?: string;
  menoridade: boolean;
  cpfresponsavel?: string;
  autorizacao_url?: string;
  autorizacao_validada?: boolean;
  observacoes?: string;
}

// =============================================================================
// 6. Cadastro FNRH (Pré-cadastro do Cliente)
// =============================================================================
export interface CadastroFnrh extends EntidadeAuditavel {
  cadastroid: number;
  status: 'PENDENTE' | 'AGUARDANDO_PAGAMENTO' | 'LIBERADA_PARA_RESERVA' | 'RESERVA_CRIADA' | 'CANCELADA';
  token_acesso?: string;
  token_expira_em?: string;
  hospedeid?: number | null;
  reservaid?: number | null;
  nomecompleto: string;
  cpf?: string;
  rg?: string;
  passaporte?: string;
  datanascimento?: string;
  nacionalidade?: string;
  sexo?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  profissao?: string;
  proximodestino?: string;
  ultimaprocedencia?: string;
  cpfresponsavelmenor?: string;
  dataentrada?: string;
  horarioprevistochegada?: string;
  datasaida?: string;
  horarioprevistasaida?: string;
  motivoviagem?: string;
  transporte?: string;
  placa?: string;
  modelocor?: string;
  numerohospedes: number;
  adultos: number;
  criancas: number;
  forma_pagamento?: string;
  valor_sinal: number;
  comprovante_url?: string;
  pagamento_confirmado_em?: string;
  pagamento_confirmado_por?: number | null;
  alergias_restricoes?: string;
  solicitacoes_especiais?: string;
  declaracao_aceita: boolean;
  data_declaracao?: string;
  assinatura_url?: string;

  // Lista de acompanhantes vinculados
  acompanhantes?: CadastroFnrhAcompanhante[];
}

export interface CadastroFnrhAcompanhante {
  acompanhanteid: number;
  cadastroid: number;
  reservaid?: number | null;
  nomecompleto: string;
  documento?: string;
  datanascimento?: string;
  menoridade: boolean;
  cpfresponsavel?: string;
  autorizacao_url?: string;
  autorizacao_validada?: boolean;
  observacoes?: string;
  datainclusao?: string;
}

// =============================================================================
// 7. Pacote Promocional / Feriado
// =============================================================================
export interface Pacote extends EntidadeAuditavel {
  pacoteid: number;
  nome: string;
  descricao?: string;
  datainicio?: string;
  datafim?: string;
  valor: number;
  adultosinclusos: number;
  criancasinclusas: number;
  quantidadedias: number;
  incluialmoco?: boolean;
  incluijantar?: boolean;
  incluicafemanha?: boolean;
  incluipasseios?: boolean;
  tipopacote?: 'HOSPEDAGEM' | 'FERIADO' | 'DAY_USE' | 'EVENTO';
}

// =============================================================================
// 8. Reserva
// =============================================================================
export interface Reserva extends EntidadeAuditavel {
  reservaid: number;
  codigo: string;
  hospedeid: number;
  quartoid: number;
  datareserva?: string;
  dataentrada: string;
  datasaida: string;
  horarioprevistochegada?: string;
  tipoatendimento?: TipoAtendimento;
  pacoteid?: number;
  statusreserva: StatusReserva;
  adultos: number;
  criancas: number;
  valortotal: number;
  valorpago: number;
  saldo: number;
  statuspagamento: StatusPagamento;
  formapagamento?: FormaPagamento;
  observacoes?: string;

  // Campos ViewModel / Joins
  quartonumero?: string;
  quartocodigo?: string;
  quartocategoria?: string;
  hospedenome?: string;
  hospedetelefone?: string;
  hospedeemail?: string;
  checkinrealizadoem?: string;
  checkinusuario?: number | string;
  checkoutrealizadoem?: string;
  checkoutusuario?: number | string;
}

// =============================================================================
// 9. Produto (Bar / Lojinha / Consumo)
// =============================================================================
export interface Produto extends EntidadeAuditavel {
  produtoid: number;
  nome: string;
  categoria: 'LOJINHA' | 'BAR' | 'RESTAURANTE' | 'SERVICO';
  valor: number;
  estoqueatual: number;
  estoqueminimo?: number;
  codigo_barras?: string;
  imagem_url?: string;
  descricao?: string;
}

// =============================================================================
// 10. Consumo Extra
// =============================================================================
export interface ConsumoExtra extends EntidadeAuditavel {
  consumoid: number;
  reservaid: number;
  produtoid?: number;
  descricao: string;
  quantidade: number;
  valorunitario: number;
  valortotal: number;
  categoria: string;
  data_consumo?: string;
}

// =============================================================================
// 11. Venda Direta
// =============================================================================
export interface VendaItem {
  produtoid: number;
  nome: string;
  quantidade: number;
  valorunitario: number;
  valortotal: number;
}

export interface Venda extends EntidadeAuditavel {
  vendaid: number;
  tipovenda: TipoVenda;
  hospedeid?: number;
  reservaid?: number;
  valortotal: number;
  formapagamento: FormaPagamento;
  statuspagamento: StatusPagamento;
  observacoes?: string;
  itens: VendaItem[];
}

// =============================================================================
// 12. Pagamento
// =============================================================================
export interface Pagamento extends EntidadeAuditavel {
  pagamentoid: number;
  reservaid: number;
  valor: number;
  datapagamento: string;
  formapagamento: FormaPagamento;
  status: StatusPagamento;
  comprovanteurl?: string;
  tipolancamento?: TipoLancamentoPagamento;
}

// =============================================================================
// 13. Configuração do Sistema
// =============================================================================
export interface ConfiguracaoSistema {
  checkintime: string;
  checkouttime: string;
  hotelnome: string;
  hotellocalizacao: string;
  telefonehotel: string;
  emailhotel: string;
  taxaservicopercentual: number;
  supabaseurl: string;
  supabaseanonkey: string;
  modoofflineativo: boolean;
  criancaidadelimitegratis: number;
  criancaidadelimitemeia: number;
  criancaidadeintegral: number;
  criancaporcentagemmeiadiaria: number;
  criancaDescontogratuis: number;
  capacidademaximaadultosporquarto: number;
  capacidademaximacriancasporquarto: number;
  formapagamentopadrao: FormaPagamento;
  porcentagementradaminima: number;
}

// =============================================================================
// 14. Navegação Principal
// =============================================================================
export type PaginaNavegacao = 
  | 'login'
  | 'dashboard'
  | 'dashboard-executivo'
  | 'quartos'
  | 'status-quartos'
  | 'mapa-reservas'
  | 'checkin'
  | 'checkout'
  | 'hospedes'
  | 'fnrh'
  | 'reservas-anteriores'
  | 'financeiro'
  | 'loja'
  | 'produtos'
  | 'pacotes'
  | 'usuarios'
  | 'configuracoes';