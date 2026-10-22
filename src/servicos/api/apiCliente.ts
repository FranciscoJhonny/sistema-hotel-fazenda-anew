import { ResultadoSupabase } from './types';

/**
 * Chaves de armazenamento do token JWT de autenticação da API .NET 8.
 */
const TOKEN_STORAGE_KEY = 'anew_jwt_token_v1';

/**
 * Retorna o token JWT atual armazenado no localStorage ou sessionStorage.
 */
export const obterTokenApi = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

/**
 * Salva o token JWT obtido no login.
 */
export const salvarTokenApi = (token: string, persistir: boolean = true): void => {
  if (typeof window === 'undefined') return;
  try {
    if (persistir) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch (e) {
    console.warn('[apiCliente] Erro ao salvar token JWT:', e);
  }
};

/**
 * Limpa o token JWT (ao realizar logout ou receber 401).
 */
export const limparTokenApi = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    console.warn('[apiCliente] Erro ao limpar token JWT:', e);
  }
};

/**
 * Normaliza os dados retornados pela API C# .NET.
 * O .NET serializa as propriedades em camelCase (ex: quartoId, nomeCompleto, valorTotal).
 * O front-end React espera compatibilidade tanto com camelCase quanto com lowercase/snake_case
 * herdado das tabelas do Supabase (ex: quartoid, nomecompleto, valortotal).
 * Esta função duplica recursivamente as chaves em minúsculas para garantir 100% de retrocompatibilidade.
 */
export function normalizarDadosApi<T = any>(dado: any): T {
  if (dado === null || dado === undefined) return dado;

  if (Array.isArray(dado)) {
    return dado.map((item) => normalizarDadosApi(item)) as unknown as T;
  }

  if (typeof dado === 'object' && !(dado instanceof Date)) {
    const normalizado: Record<string, any> = {};

    for (const [chave, valor] of Object.entries(dado)) {
      const valorNormalizado = normalizarDadosApi(valor);
      normalizado[chave] = valorNormalizado;

      // 1. Minúsculas diretas (ex: quartoId -> quartoid, nomeCompleto -> nomecompleto)
      const chaveLower = chave.toLowerCase();
      if (chaveLower !== chave && normalizado[chaveLower] === undefined) {
        normalizado[chaveLower] = valorNormalizado;
      }

      // 2. Snake case para compatibilidade com colunas do banco (ex: tokenAcesso -> token_acesso, valorSinal -> valor_sinal)
      const chaveSnake = chave.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toLowerCase();
      if (chaveSnake !== chave && normalizado[chaveSnake] === undefined) {
        normalizado[chaveSnake] = valorNormalizado;
      }
    }

    return normalizado as T;
  }

  return dado as T;
}

/**
 * Obtém a URL base da API .NET 8 a partir das variáveis de ambiente ou fallback de produção.
 */
export const obterApiBaseUrl = (): string => {
  let url = 'https://api-hotelfazendaanew.onrender.com';
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    url = (import.meta as any).env.VITE_API_URL;
  } else if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    url = process.env.VITE_API_URL;
  }
  return url.replace(/\/+$/, '');
};

/**
 * Cliente HTTP tipado centralizado para a API REST C# .NET 8.
 * Mantém o formato padrão { sucesso, dados, erro, mensagem, statusHttp }
 * compatível com ResultadoSupabase<T> para não quebrar componentes existentes.
 */
class ApiCliente {
  private getBaseUrl(): string {
    return obterApiBaseUrl();
  }

  private montarUrl(endpoint: string, params?: Record<string, any>): string {
    const baseUrl = this.getBaseUrl();
    const endpointNormalizado = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${baseUrl}${endpointNormalizado}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    return url;
  }

  private criarHeaders(customHeaders?: HeadersInit): Headers {
    const headers = new Headers(customHeaders);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const token = obterTokenApi();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private async processarResposta<T>(res: Response): Promise<ResultadoSupabase<T>> {
    const statusHttp = res.status;

    // Tratar 401 Unauthorized
    if (statusHttp === 401) {
      console.warn('[apiCliente] 401 Não autorizado — token expirado ou inválido.');
      limparTokenApi();
    }

    let corpoJson: any = null;
    const texto = await res.text();
    if (texto) {
      try {
        corpoJson = JSON.parse(texto);
      } catch {
        corpoJson = { message: texto };
      }
    }

    // Se o backend retornou o padrão ApiResponse { success, data, message, errors }
    if (corpoJson && typeof corpoJson === 'object' && ('success' in corpoJson || 'data' in corpoJson)) {
      const sucesso = Boolean(corpoJson.success ?? res.ok);
      const erroMensagem =
        (Array.isArray(corpoJson.errors) && corpoJson.errors.length > 0)
          ? corpoJson.errors.join('; ')
          : corpoJson.message || (!sucesso ? `Erro HTTP ${statusHttp}` : undefined);

      const dadosExtraidos = corpoJson.data !== undefined ? corpoJson.data : (sucesso ? corpoJson : undefined);
      const dadosNormalizados = normalizarDadosApi<T>(dadosExtraidos);

      return {
        sucesso,
        dados: dadosNormalizados,
        erro: sucesso ? undefined : erroMensagem,
        mensagem: corpoJson.message,
        statusHttp,
        total: Array.isArray(dadosNormalizados) ? dadosNormalizados.length : undefined
      };
    }

    // Resposta padrão sem invólucro ApiResponse
    if (!res.ok) {
      const msgErro = corpoJson?.message || corpoJson?.erro || corpoJson?.error || `Erro HTTP ${statusHttp}: ${res.statusText}`;
      return {
        sucesso: false,
        erro: msgErro,
        statusHttp
      };
    }

    const dados = normalizarDadosApi<T>(corpoJson);
    return {
      sucesso: true,
      dados,
      statusHttp,
      total: Array.isArray(dados) ? dados.length : undefined
    };
  }

  public async get<T = any>(endpoint: string, params?: Record<string, any>, customHeaders?: HeadersInit): Promise<ResultadoSupabase<T>> {
    try {
      const url = this.montarUrl(endpoint, params);
      const res = await fetch(url, {
        method: 'GET',
        headers: this.criarHeaders(customHeaders)
      });
      return await this.processarResposta<T>(res);
    } catch (err: any) {
      return {
        sucesso: false,
        erro: err?.message || 'Falha na conexão com o servidor.',
        statusHttp: 0
      };
    }
  }

  public async post<T = any>(endpoint: string, body?: any, customHeaders?: HeadersInit): Promise<ResultadoSupabase<T>> {
    try {
      const url = this.montarUrl(endpoint);
      const res = await fetch(url, {
        method: 'POST',
        headers: this.criarHeaders(customHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      return await this.processarResposta<T>(res);
    } catch (err: any) {
      return {
        sucesso: false,
        erro: err?.message || 'Falha na conexão com o servidor.',
        statusHttp: 0
      };
    }
  }

  public async put<T = any>(endpoint: string, body?: any, customHeaders?: HeadersInit): Promise<ResultadoSupabase<T>> {
    try {
      const url = this.montarUrl(endpoint);
      const res = await fetch(url, {
        method: 'PUT',
        headers: this.criarHeaders(customHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      return await this.processarResposta<T>(res);
    } catch (err: any) {
      return {
        sucesso: false,
        erro: err?.message || 'Falha na conexão com o servidor.',
        statusHttp: 0
      };
    }
  }

  public async patch<T = any>(endpoint: string, body?: any, customHeaders?: HeadersInit): Promise<ResultadoSupabase<T>> {
    try {
      const url = this.montarUrl(endpoint);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: this.criarHeaders(customHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      return await this.processarResposta<T>(res);
    } catch (err: any) {
      return {
        sucesso: false,
        erro: err?.message || 'Falha na conexão com o servidor.',
        statusHttp: 0
      };
    }
  }

  public async delete<T = any>(endpoint: string, customHeaders?: HeadersInit): Promise<ResultadoSupabase<T>> {
    try {
      const url = this.montarUrl(endpoint);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.criarHeaders(customHeaders)
      });
      return await this.processarResposta<T>(res);
    } catch (err: any) {
      return {
        sucesso: false,
        erro: err?.message || 'Falha na conexão com o servidor.',
        statusHttp: 0
      };
    }
  }
}

export const apiCliente = new ApiCliente();
