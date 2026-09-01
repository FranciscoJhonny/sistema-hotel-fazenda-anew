export interface ResultadoSupabase<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  total?: number;
  statusHttp?: number;
}

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
