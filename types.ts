// src/servicos/supabase/types.ts
export interface ResultadoSupabase<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
}

export interface StatusConexaoSupabase {
  conectado: boolean;
  urlConfigurada: boolean;
  chaveConfigurada: boolean;
  mensagem: string;
  ultimaVerificacao: string;
}