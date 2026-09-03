import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResultadoSupabase, StatusConexaoSupabase } from './types';

export class SupabaseService {
  private static instance: SupabaseService | null = null;
  private client: SupabaseClient | null = null;
  private url: string = '';
  private key: string = '';

  private constructor() {
    // 🔥 CORREÇÃO DO ERRO DE TYPESCRIPT:
    // Usamos 'as any' para o TypeScript entender que 'env' existe no Vite
    const metaEnv = (import.meta as any).env || {};
    const envUrl = metaEnv.VITE_SUPABASE_URL as string;
    const envKey = metaEnv.VITE_SUPABASE_ANON_KEY as string;

    // 1. Tenta pegar do localStorage (configuração dinâmica)
    // 2. Se não tiver, pega do .env
    this.url = localStorage.getItem('anew_supabase_url') || envUrl || '';
    this.key = localStorage.getItem('anew_supabase_key') || envKey || '';

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url, this.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          db: {
            schema: 'public',
          },
        });
      } catch (err) {
        console.warn('[SupabaseService] ❌ Falha ao inicializar client:', err);
        this.client = null;
      }
    } else {
      console.warn('[SupabaseService] ❌ Credenciais não encontradas!');
    }
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      const metaEnv = (import.meta as any).env || {};
      const envUrl = metaEnv.VITE_SUPABASE_URL as string;
      const envKey = metaEnv.VITE_SUPABASE_ANON_KEY as string;
      
      this.url = localStorage.getItem('anew_supabase_url') || envUrl || '';
      this.key = localStorage.getItem('anew_supabase_key') || envKey || '';
      
      if (this.url && this.key) {
        try {
          this.client = createClient(this.url, this.key, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
            db: {
              schema: 'public',
            },
          });
        } catch (err) {
          console.error('[SupabaseService] ❌ Erro ao recriar cliente:', err);
          this.client = null;
        }
      }
    }
    return this.client;
  }

  public estaConectado(): boolean {
    return this.client !== null;
  }

  public reconfigurar(novaUrl: string, novaKey: string): ResultadoSupabase<boolean> {
    try {
      this.url = novaUrl.trim();
      this.key = novaKey.trim();
      localStorage.setItem('anew_supabase_url', this.url);
      localStorage.setItem('anew_supabase_key', this.key);

      if (!this.url || !this.key) {
        this.client = null;
        return { sucesso: true, dados: false, erro: 'Configurações limpas' };
      }

      this.client = createClient(this.url, this.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        db: {
          schema: 'public',
        },
      });

      return { sucesso: true, dados: true };
    } catch (err: any) {
      console.error('[SupabaseService] ❌ Erro na reconfiguração:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao inicializar Supabase' };
    }
  }

  public async testarConexao(): Promise<StatusConexaoSupabase> {
    const client = this.getClient();

    if (!client) {
      return {
        conectado: false,
        urlConfigurada: Boolean(this.url),
        chaveConfigurada: Boolean(this.key),
        mensagem: 'Cliente Supabase não configurado. Verifique o arquivo .env',
        ultimaVerificacao: new Date().toISOString(),
      };
    }

    try {
      const { error } = await client.from('Configuracao').select('ConfiguracaoId').limit(1);

      if (error) {
        return {
          conectado: false,
          urlConfigurada: true,
          chaveConfigurada: true,
          mensagem: `Erro: ${error.message}`,
          ultimaVerificacao: new Date().toISOString(),
        };
      }

      return {
        conectado: true,
        urlConfigurada: true,
        chaveConfigurada: true,
        mensagem: 'Conexão estabelecida com sucesso!',
        ultimaVerificacao: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[SupabaseService] ❌ Erro no teste:', err);
      return {
        conectado: false,
        urlConfigurada: true,
        chaveConfigurada: true,
        mensagem: err?.message || 'Falha de rede ao conectar ao Supabase',
        ultimaVerificacao: new Date().toISOString(),
      };
    }
  }
}