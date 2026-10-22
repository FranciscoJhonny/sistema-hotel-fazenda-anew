export interface ResultadoSupabase<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  total?: number;
  statusHttp?: number;
  mensagem?: string;
}

// Alias para nomenclatura semântica com a nova API REST
export type ResultadoApi<T> = ResultadoSupabase<T>;

export interface FiltrosConsulta {
  apenasAtivos?: boolean;
  limite?: number;
  offset?: number;
  ordenarPor?: string;
  ordemAscendente?: boolean;
  busca?: string;
}

export interface StatusConexaoSupabase {
  conectado: boolean;
  mensagem: string;
  urlConfigurada: boolean;
  chaveConfigurada: boolean;
  ultimaVerificacao?: string;
}
