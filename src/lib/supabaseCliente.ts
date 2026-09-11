// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ========================================
// CARREGAR VARIÁVEIS DE AMBIENTE
// ========================================

// Suporte para Next.js (NEXT_PUBLIC_) e Vite (VITE_)
const isBrowser = typeof window !== 'undefined';

const getEnvVar = (key: string) => {
  // Next.js
  if (typeof process !== 'undefined' && process.env?.[`NEXT_PUBLIC_${key}`]) {
    return process.env[`NEXT_PUBLIC_${key}`] as string;
  }
  // Vite
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[`VITE_${key}`]) {
    return (import.meta as any).env[`VITE_${key}`] as string;
  }
  return '';
};

const SUPABASE_URL = getEnvVar('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = typeof process !== 'undefined' 
  ? (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SECRET_KEY || '')
  : '';

// ========================================
// CLIENTE SINGLETON
// ========================================

let supabaseInstancia: SupabaseClient | null = null;

export function obterClienteSupabase(
  urlCustomizada?: string,
  keyCustomizada?: string
): SupabaseClient | null {
  const url = urlCustomizada || 
    (isBrowser ? localStorage.getItem('anew_supabase_url') : null) || 
    SUPABASE_URL;

  const key = keyCustomizada || 
    (isBrowser ? localStorage.getItem('anew_supabase_key') : null) || 
    SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (isBrowser) {
      console.warn('⚠️ Supabase credentials not found. Check your .env.local file.');
      console.warn('   URL:', url || '❌ NOT SET');
      console.warn('   KEY:', key ? '✅ SET' : '❌ NOT SET');
    }
    return null;
  }

  try {
    if (!supabaseInstancia) {
      supabaseInstancia = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application-name': 'hotel-fazenda-anew',
          },
        },
      });
    }
    return supabaseInstancia;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return null;
  }
}

/**
 * Obtém o cliente Supabase com a Service Role Key
 * ⚠️ APENAS PARA SERVER-SIDE (migrações, operações administrativas)
 */
export function obterClienteAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(' Service Role Key not configured.');
    return null;
  }

  try {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  } catch (error) {
    console.error('❌ Failed to create admin client:', error);
    return null;
  }
}

export function resetarClienteSupabase(
  novaUrl: string,
  novaKey: string
): SupabaseClient | null {
  if (isBrowser) {
    localStorage.setItem('anew_supabase_url', novaUrl);
    localStorage.setItem('anew_supabase_key', novaKey);
  }
  supabaseInstancia = null;
  return obterClienteSupabase(novaUrl, novaKey);
}

export function isSupabaseConectado(): boolean {
  return supabaseInstancia !== null;
}

// ========================================
// SCRIPT SQL COMPLETO - SUPABASE (POSTGRESQL)
// ========================================

export const SCRIPT_SQL_SCHEMA_SUPABASE = `
-- =============================================================================
-- HOTEL FAZENDA ANEW - SCHEMA SUPABASE (POSTGRESQL)
-- Corguinho - Mato Grosso do Sul - Brasil
-- PADRÃO: PascalCase em Português com SERIAL (auto incremento)
-- =============================================================================

-- Habilitar extensão UUID (opcional, mas útil)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABELA: Perfil
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Perfil (
  PerfilId SERIAL PRIMARY KEY,
  Descricao VARCHAR(50) NOT NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT'
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Perfil_Descricao ON public.Perfil (Descricao);

-- =============================================================================
-- 2. TABELA: Usuario
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Usuario (
  UsuarioId SERIAL PRIMARY KEY,
  PerfilId INTEGER NOT NULL,
  Nome VARCHAR(100) NOT NULL,
  Email VARCHAR(100) NOT NULL,
  Senha VARCHAR(255) NOT NULL,
  TokenRecuperacaoSenha VARCHAR(500) NULL,
  DataRecuperacaoSenha TIMESTAMP NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario - auto referência)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Usuario_Perfil FOREIGN KEY (PerfilId) REFERENCES public.Perfil(PerfilId),
  CONSTRAINT FK_Usuario_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Usuario_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Usuario_Email ON public.Usuario (Email);
CREATE INDEX IF NOT EXISTS IX_Usuario_TokenRecuperacao ON public.Usuario (TokenRecuperacaoSenha);

-- =============================================================================
-- 3. TABELA: Quarto
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Quarto (
  QuartoId SERIAL PRIMARY KEY,
  Numero VARCHAR(10) NOT NULL,
  CodigoIdentificador VARCHAR(10) NOT NULL,
  Bloco VARCHAR(5) NOT NULL CHECK (Bloco IN ('B', 'C', 'D')),
  Categoria VARCHAR(100) NOT NULL,
  CapacidadeAdultos INTEGER NOT NULL DEFAULT 2,
  CapacidadeCriancas INTEGER NOT NULL DEFAULT 0,
  ValorDiariaPadrao NUMERIC(10, 2) NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'DISPONIVEL' CHECK (Status IN ('DISPONIVEL', 'RESERVADO', 'OCUPADO', 'AGUARDANDO_CHECKIN', 'MANUTENCAO')),
  Descricao TEXT NULL,
  Comodidades TEXT NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Quarto_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Quarto_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Quarto_Numero ON public.Quarto (Numero);

-- =============================================================================
-- 4. TABELA: Hospede
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Hospede (
  HospedeId SERIAL PRIMARY KEY,
  NomeCompleto VARCHAR(255) NOT NULL,
  Cpf VARCHAR(20) NOT NULL,
  DataNascimento DATE NULL,
  Telefone VARCHAR(50) NOT NULL,
  WhatsApp VARCHAR(50) NULL,
  Email VARCHAR(255) NULL,
  Cidade VARCHAR(100) NULL,
  Estado VARCHAR(50) NULL,
  Observacoes TEXT NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Hospede_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Hospede_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Hospede_Cpf ON public.Hospede (Cpf);
CREATE INDEX IF NOT EXISTS IX_Hospede_Nome ON public.Hospede (NomeCompleto);

-- =============================================================================
-- 5. TABELA: Pacote
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Pacote (
  PacoteId SERIAL PRIMARY KEY,
  Nome VARCHAR(255) NOT NULL,
  Descricao TEXT NULL,
  DataInicio DATE NULL,
  DataFim DATE NULL,
  Valor NUMERIC(10, 2) NOT NULL,
  AdultosInclusos INTEGER NOT NULL DEFAULT 2,
  CriancasInclusas INTEGER NOT NULL DEFAULT 0,
  QuantidadeDias INTEGER NOT NULL DEFAULT 1,
  IncluiAlmoco BOOLEAN NOT NULL DEFAULT TRUE,
  IncluiJantar BOOLEAN NOT NULL DEFAULT TRUE,
  IncluiCafeManha BOOLEAN NOT NULL DEFAULT TRUE,
  IncluiPasseios BOOLEAN NOT NULL DEFAULT TRUE,
  TipoPacote VARCHAR(50) NOT NULL DEFAULT 'HOSPEDAGEM' CHECK (TipoPacote IN ('HOSPEDAGEM', 'DAY_USE', 'FERIADO')),
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Pacote_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Pacote_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE INDEX IF NOT EXISTS IX_Pacote_Tipo ON public.Pacote (TipoPacote);

-- =============================================================================
-- 6. TABELA: Reserva
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Reserva (
  ReservaId SERIAL PRIMARY KEY,
  Codigo VARCHAR(50) NOT NULL,
  HospedeId INTEGER NOT NULL,
  QuartoId INTEGER NOT NULL,
  Adultos INTEGER NOT NULL DEFAULT 1,
  Criancas INTEGER NOT NULL DEFAULT 0,
  DataEntrada DATE NOT NULL,
  DataSaida DATE NOT NULL,
  HorarioPrevistoChegada TIME DEFAULT '09:00',
  HorarioPrevistoSaida TIME DEFAULT '15:00',
  TipoAtendimento VARCHAR(50) NOT NULL DEFAULT 'HOSPEDAGEM' CHECK (TipoAtendimento IN ('HOSPEDAGEM', 'DAY_USE', 'ALMOCO')),
  PacoteId INTEGER NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'PRE_RESERVA' CHECK (Status IN ('PRE_RESERVA', 'RESERVADO', 'HOSPEDADO', 'CONCLUIDA', 'CANCELADA')),
  ValorTotal NUMERIC(10, 2) NOT NULL,
  ValorPago NUMERIC(10, 2) NOT NULL DEFAULT 0,
  Saldo NUMERIC(10, 2) NOT NULL DEFAULT 0,
  StatusPagamento VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' CHECK (StatusPagamento IN ('PAGO', 'PENDENTE', 'PARCIAL')),
  FormaPagamento VARCHAR(50) NOT NULL DEFAULT 'PIX',
  Observacoes TEXT NULL,
  CheckinRealizadoEm TIMESTAMP NULL,
  CheckinUsuario INTEGER NULL,
  CheckoutRealizadoEm TIMESTAMP NULL,
  CheckoutUsuario INTEGER NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Reserva_Hospede FOREIGN KEY (HospedeId) REFERENCES public.Hospede(HospedeId),
  CONSTRAINT FK_Reserva_Quarto FOREIGN KEY (QuartoId) REFERENCES public.Quarto(QuartoId),
  CONSTRAINT FK_Reserva_Pacote FOREIGN KEY (PacoteId) REFERENCES public.Pacote(PacoteId),
  CONSTRAINT FK_Reserva_CheckinUsuario FOREIGN KEY (CheckinUsuario) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Reserva_CheckoutUsuario FOREIGN KEY (CheckoutUsuario) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Reserva_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Reserva_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Reserva_Codigo ON public.Reserva (Codigo);
CREATE INDEX IF NOT EXISTS IX_Reserva_Quarto_Datas ON public.Reserva (QuartoId, DataEntrada, DataSaida, Status);
CREATE INDEX IF NOT EXISTS IX_Reserva_Datas ON public.Reserva (DataEntrada, DataSaida);

-- =============================================================================
-- 7. TABELA: Pagamento
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Pagamento (
  PagamentoId SERIAL PRIMARY KEY,
  ReservaId INTEGER NOT NULL,
  Valor NUMERIC(10, 2) NOT NULL,
  FormaPagamento VARCHAR(50) NOT NULL,
  Status VARCHAR(50) NOT NULL DEFAULT 'PAGO',
  DataPagamento TIMESTAMP NOT NULL DEFAULT NOW(),
  ComprovanteUrl TEXT NULL,
  Observacoes TEXT NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Pagamento_Reserva FOREIGN KEY (ReservaId) REFERENCES public.Reserva(ReservaId),
  CONSTRAINT FK_Pagamento_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Pagamento_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE INDEX IF NOT EXISTS IX_Pagamento_ReservaId ON public.Pagamento (ReservaId);

-- =============================================================================
-- 8. TABELA: Produto
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Produto (
  ProdutoId SERIAL PRIMARY KEY,
  Nome VARCHAR(255) NOT NULL,
  Descricao TEXT NULL,
  Categoria VARCHAR(100) NOT NULL,
  Preco NUMERIC(10, 2) NOT NULL,
  Estoque INTEGER NOT NULL DEFAULT 0,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Produto_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Produto_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

-- =============================================================================
-- 9. TABELA: Venda
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Venda (
  VendaId SERIAL PRIMARY KEY,
  Codigo VARCHAR(50) NOT NULL,
  Tipo VARCHAR(50) NOT NULL DEFAULT 'LOJA' CHECK (Tipo IN ('LOJA', 'ALMOCO', 'DAY_USE', 'CONSUMO_QUARTO')),
  ReservaId INTEGER NULL,
  QuartoNumero VARCHAR(10) NULL,
  HospedeNome VARCHAR(255) NULL,
  ValorTotal NUMERIC(10, 2) NOT NULL,
  FormaPagamento VARCHAR(50) NOT NULL DEFAULT 'PIX',
  StatusPagamento VARCHAR(50) NOT NULL DEFAULT 'PAGO',
  UsuarioResponsavel INTEGER NULL,
  DataHora TIMESTAMP NOT NULL DEFAULT NOW(),
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Venda_Reserva FOREIGN KEY (ReservaId) REFERENCES public.Reserva(ReservaId),
  CONSTRAINT FK_Venda_UsuarioResponsavel FOREIGN KEY (UsuarioResponsavel) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Venda_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Venda_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Venda_Codigo ON public.Venda (Codigo);
CREATE INDEX IF NOT EXISTS IX_Venda_ReservaId ON public.Venda (ReservaId);

-- =============================================================================
-- 10. TABELA: ItemVenda
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ItemVenda (
  ItemVendaId SERIAL PRIMARY KEY,
  VendaId INTEGER NOT NULL,
  ProdutoId INTEGER NULL,
  ProdutoNome VARCHAR(255) NOT NULL,
  Quantidade INTEGER NOT NULL DEFAULT 1,
  PrecoUnitario NUMERIC(10, 2) NOT NULL,
  Subtotal NUMERIC(10, 2) NOT NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_ItemVenda_Venda FOREIGN KEY (VendaId) REFERENCES public.Venda(VendaId),
  CONSTRAINT FK_ItemVenda_Produto FOREIGN KEY (ProdutoId) REFERENCES public.Produto(ProdutoId),
  CONSTRAINT FK_ItemVenda_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_ItemVenda_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE INDEX IF NOT EXISTS IX_ItemVenda_VendaId ON public.ItemVenda (VendaId);
CREATE INDEX IF NOT EXISTS IX_ItemVenda_ProdutoId ON public.ItemVenda (ProdutoId);

-- =============================================================================
-- 11. TABELA: Configuracao
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.Configuracao (
  ConfiguracaoId SERIAL PRIMARY KEY,
  Chave VARCHAR(100) NOT NULL,
  Valor TEXT NOT NULL,
  Descricao TEXT NULL,
  Ativo BOOLEAN NOT NULL DEFAULT TRUE,
  -- Campos de Auditoria (FK para Usuario)
  UsuarioInclusao INTEGER NULL,
  DataInclusao TIMESTAMP NOT NULL DEFAULT NOW(),
  UsuarioOperacao INTEGER NULL,
  DataOperacao TIMESTAMP NOT NULL DEFAULT NOW(),
  NaturezaOperacao VARCHAR(20) NULL DEFAULT 'INSERT',
  
  CONSTRAINT FK_Configuracao_UsuarioInclusao FOREIGN KEY (UsuarioInclusao) REFERENCES public.Usuario(UsuarioId),
  CONSTRAINT FK_Configuracao_UsuarioOperacao FOREIGN KEY (UsuarioOperacao) REFERENCES public.Usuario(UsuarioId)
);

CREATE UNIQUE INDEX IF NOT EXISTS IX_Configuracao_Chave ON public.Configuracao (Chave);

-- =============================================================================
-- =============================================================================
-- INSERTS - DADOS INICIAIS
-- =============================================================================
-- =============================================================================

-- =============================================================================
-- INSERTS - PERFIS PADRÃO
-- =============================================================================
INSERT INTO public.Perfil (Descricao, UsuarioInclusao) VALUES
  ('ADMIN', NULL),
  ('RECEPCAO', NULL),
  ('VENDAS', NULL);

-- =============================================================================
-- INSERTS - USUÁRIO ADMIN (CRIADO PRIMEIRO)
-- =============================================================================
INSERT INTO public.Usuario (
  PerfilId,
  Nome,
  Email,
  Senha,
  Ativo,
  UsuarioInclusao
) VALUES (
  1, -- ADMIN
  'Francisco Jhonny',
  'francisco.jhonny@hotmail.com',
  '123456',
  TRUE,
  NULL -- Criado pelo sistema
);

-- =============================================================================
-- INSERTS - USUÁRIO RECEPCAO (CRIADO PELO ADMIN)
-- =============================================================================
INSERT INTO public.Usuario (
  PerfilId,
  Nome,
  Email,
  Senha,
  Ativo,
  UsuarioInclusao
) VALUES (
  2, -- RECEPCAO
  'João da Silva',
  'joao@email.com',
  '123456',
  TRUE,
  1 -- Criado pelo ADMIN (UsuarioId = 1)
);

-- =============================================================================
-- INSERTS - PACOTES DO HOTEL FAZENDA ANEW
-- =============================================================================
INSERT INTO public.Pacote (
  Nome, 
  Descricao, 
  Valor, 
  AdultosInclusos, 
  CriancasInclusas,
  QuantidadeDias,
  IncluiAlmoco,
  IncluiJantar,
  IncluiCafeManha,
  IncluiPasseios,
  TipoPacote,
  UsuarioInclusao
) VALUES 
  (
    'Final de Semana', 
    'Opção 1 - 2 dias (Sábado e Domingo). Inclui: acomodação, almoço e jantar no dia da chegada; café da manhã e almoço no dia seguinte.',
    550.00,
    2,
    0,
    2,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'HOSPEDAGEM',
    1
  ),
  (
    'Final de Semana Estendido', 
    'Opção 2 - 3 dias (Sexta a Domingo). Inclui: almoço e jantar no dia da chegada; café da manhã, almoço e jantar no segundo dia; café da manhã e almoço no terceiro dia.',
    750.00,
    2,
    0,
    3,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'HOSPEDAGEM',
    1
  ),
  (
    'Feriado Prolongado', 
    'Opção 3 - 4 dias. Inclui: almoço e jantar no dia da chegada; café da manhã, almoço e jantar no segundo e terceiro dia; café da manhã e almoço no quarto dia.',
    950.00,
    2,
    0,
    4,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'FERIADO',
    1
  ),
  (
    'Day Use', 
    '☀️ Day Use: Inclui entrada, almoço e passeio do dia. Não inclui café da manhã. Refeição extra: R$ 50,00.',
    200.00,
    1,
    0,
    1,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    'DAY_USE',
    1
  );

-- =============================================================================
-- INSERTS - QUARTOS PADRÃO (13 QUARTOS - B1 a D6)
-- =============================================================================
INSERT INTO public.Quarto (
  Numero,
  CodigoIdentificador,
  Bloco,
  Categoria,
  CapacidadeAdultos,
  CapacidadeCriancas,
  ValorDiariaPadrao,
  Status,
  Descricao,
  Comodidades,
  UsuarioInclusao
) VALUES
  -- Bloco B (B1 a B4)
  ('01', 'B1', 'B', 'Standard Duplo', 2, 1, 450.00, 'DISPONIVEL', 'Quarto com vista para o jardim', 'Ar Condicionado, TV, WiFi, Frigobar', 1),
  ('02', 'B2', 'B', 'Standard Duplo', 2, 1, 450.00, 'DISPONIVEL', 'Quarto próximo à piscina', 'Ar Condicionado, TV, WiFi, Frigobar', 1),
  ('03', 'B3', 'B', 'Standard Duplo', 2, 1, 450.00, 'DISPONIVEL', 'Quarto com varanda', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda', 1),
  ('04', 'B4', 'B', 'Standard Duplo', 2, 1, 480.00, 'DISPONIVEL', 'Quarto superior com vista panorâmica', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda, Hidromassagem', 1),
  
  -- Bloco C (C2 a C4)
  ('05', 'C2', 'C', 'Superior Triplo', 3, 2, 520.00, 'DISPONIVEL', 'Quarto espaçoso para família', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda', 1),
  ('06', 'C3', 'C', 'Superior Triplo', 3, 2, 520.00, 'DISPONIVEL', 'Quarto com vista para a cachoeira', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda', 1),
  ('07', 'C4', 'C', 'Luxo Quadruplo', 4, 2, 650.00, 'DISPONIVEL', 'Suíte familiar com sala de estar', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda, Sala de Estar', 1),
  
  -- Bloco D (D1 a D6)
  ('08', 'D1', 'D', 'Standard Duplo', 2, 1, 450.00, 'DISPONIVEL', 'Quarto aconchegante', 'Ar Condicionado, TV, WiFi, Frigobar', 1),
  ('09', 'D2', 'D', 'Standard Duplo', 2, 1, 450.00, 'DISPONIVEL', 'Quarto com vista para o lago', 'Ar Condicionado, TV, WiFi, Frigobar', 1),
  ('10', 'D3', 'D', 'Superior Triplo', 3, 2, 520.00, 'DISPONIVEL', 'Quarto familiar próximo ao restaurante', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda', 1),
  ('11', 'D4', 'D', 'Superior Triplo', 3, 2, 520.00, 'DISPONIVEL', 'Quarto com vista para o pôr do sol', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda', 1),
  ('12', 'D5', 'D', 'Luxo Quadruplo', 4, 2, 650.00, 'DISPONIVEL', 'Suíte master com hidromassagem', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda, Hidromassagem', 1),
  ('13', 'D6', 'D', 'Luxo Quadruplo', 4, 2, 750.00, 'DISPONIVEL', 'Suíte presidencial com sala e vista 360°', 'Ar Condicionado, TV, WiFi, Frigobar, Varanda, Hidromassagem, Sala de Estar', 1);

-- =============================================================================
-- INSERTS - CONFIGURAÇÕES PADRÃO
-- =============================================================================
INSERT INTO public.Configuracao (Chave, Valor, Descricao, UsuarioInclusao) VALUES
  -- Configurações Gerais
  ('CheckInTime', '09:00', 'Horário padrão de check-in (entrada às 09h)', 1),
  ('CheckOutTime', '15:00', 'Horário padrão de check-out (saída às 15h)', 1),
  ('HotelNome', 'Hotel Fazenda Anew', 'Nome da propriedade', 1),
  ('HotelLocalizacao', 'Corguinho - Mato Grosso do Sul - Brasil', 'Localização oficial', 1),
  ('TelefoneHotel', '(67) 3251-1234', 'Telefone de contato da fazenda', 1),
  ('EmailHotel', 'contato@fazendaanew.com.br', 'E-mail de contato da fazenda', 1),
  
  -- Regras de Desconto para Crianças
  ('CriancaIdadeLimiteGratis', '5', 'Idade máxima para crianças grátis (0 a 5 anos)', 1),
  ('CriancaIdadeLimiteMeia', '11', 'Idade máxima para crianças com meia-diária (6 a 11 anos)', 1),
  ('CriancaIdadeIntegral', '12', 'Idade a partir da qual paga valor integral (12 anos ou mais)', 1),
  ('CriancaPorcentagemMeiaDiaria', '50', 'Porcentagem do valor da diária para crianças de 6 a 11 anos (50% = meia)', 1),
  ('CriancaDescontoGratis', '100', 'Desconto total para crianças de 0 a 5 anos (100% = grátis)', 1),
  
  -- Configurações de Capacidade
  ('CapacidadeMaximaAdultosPorQuarto', '4', 'Número máximo de adultos por quarto', 1),
  ('CapacidadeMaximaCriancasPorQuarto', '3', 'Número máximo de crianças por quarto', 1),
  
  -- Configurações de Pagamento
  ('FormaPagamentoPadrao', 'PIX', 'Forma de pagamento padrão do sistema', 1),
  ('PorcentagemEntradaMinima', '50', 'Porcentagem mínima de entrada para reservas (50% no ato da reserva)', 1);

-- =============================================================================
-- =============================================================================
-- TRIGGERS PARA ATUALIZAR DataOperacao E NaturezaOperacao
-- =============================================================================
-- =============================================================================

-- Trigger para Perfil
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_perfil()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Perfil_Update ON public.Perfil;
CREATE TRIGGER TRG_Perfil_Update
  BEFORE UPDATE ON public.Perfil
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_perfil();

-- Trigger para Usuario
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_usuario()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Usuario_Update ON public.Usuario;
CREATE TRIGGER TRG_Usuario_Update
  BEFORE UPDATE ON public.Usuario
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_usuario();

-- Trigger para Quarto
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_quarto()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Quarto_Update ON public.Quarto;
CREATE TRIGGER TRG_Quarto_Update
  BEFORE UPDATE ON public.Quarto
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_quarto();

-- Trigger para Hospede
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_hospede()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Hospede_Update ON public.Hospede;
CREATE TRIGGER TRG_Hospede_Update
  BEFORE UPDATE ON public.Hospede
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_hospede();

-- Trigger para Pacote
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_pacote()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Pacote_Update ON public.Pacote;
CREATE TRIGGER TRG_Pacote_Update
  BEFORE UPDATE ON public.Pacote
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_pacote();

-- Trigger para Reserva
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_reserva()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Reserva_Update ON public.Reserva;
CREATE TRIGGER TRG_Reserva_Update
  BEFORE UPDATE ON public.Reserva
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_reserva();

-- Trigger para Pagamento
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_pagamento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Pagamento_Update ON public.Pagamento;
CREATE TRIGGER TRG_Pagamento_Update
  BEFORE UPDATE ON public.Pagamento
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_pagamento();

-- Trigger para Produto
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_produto()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Produto_Update ON public.Produto;
CREATE TRIGGER TRG_Produto_Update
  BEFORE UPDATE ON public.Produto
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_produto();

-- Trigger para Venda
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_venda()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Venda_Update ON public.Venda;
CREATE TRIGGER TRG_Venda_Update
  BEFORE UPDATE ON public.Venda
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_venda();

-- Trigger para ItemVenda
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_itemvenda()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_ItemVenda_Update ON public.ItemVenda;
CREATE TRIGGER TRG_ItemVenda_Update
  BEFORE UPDATE ON public.ItemVenda
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_itemvenda();

-- Trigger para Configuracao
CREATE OR REPLACE FUNCTION public.atualizar_auditoria_configuracao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.DataOperacao = NOW();
  NEW.NaturezaOperacao = 'UPDATE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS TRG_Configuracao_Update ON public.Configuracao;
CREATE TRIGGER TRG_Configuracao_Update
  BEFORE UPDATE ON public.Configuracao
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_auditoria_configuracao();

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================
`;

// ========================================
// EXPORTAR TIPOS
// ========================================

export type { SupabaseClient };