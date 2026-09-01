// src/servicos/supabase/SupabaseService.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResultadoSupabase, StatusConexaoSupabase } from './types';

export class SupabaseService {
  private static instance: SupabaseService | null = null;
  private client: SupabaseClient | null = null;
  private url: string = '';
  private key: string = '';

  private constructor() {
    console.log('[SupabaseService] 🔍 Inicializando...');
    
    // 🔥 CREDENCIAIS DIRETAS (FIXAS PARA TESTE)
    // DEPOIS QUE FUNCIONAR, VOCÊ PODE VOLTAR PARA O .env
    const URL_FIXA = 'https://qfeyaofqkpvdyjswfuiu.supabase.co';
    const KEY_FIXA = 'sb_publishable_eKJFz3tN8eyfSdehGj7Lkg_m0UVvSuV';
    
    // Tentar carregar do localStorage primeiro, depois .env, depois fallback fixo
    this.url = localStorage.getItem('anew_supabase_url') || 
               (import.meta as any)?.env?.VITE_SUPABASE_URL || 
               URL_FIXA;
               
    this.key = localStorage.getItem('anew_supabase_key') || 
               (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || 
               KEY_FIXA;

    console.log('[SupabaseService] 📡 URL:', this.url || '❌ FALTANDO');
    console.log('[SupabaseService] 🔑 KEY:', this.key ? '✅ OK (' + this.key.substring(0, 20) + '...)' : '❌ FALTANDO');

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
        console.log('[SupabaseService] ✅ Cliente inicializado com sucesso!');
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
    // Se não tem cliente, tentar recriar
    if (!this.client) {
      console.log('[SupabaseService] 🔄 Tentando recriar cliente...');
      const URL_FIXA = 'https://qfeyaofqkpvdyjswfuiu.supabase.co';
      const KEY_FIXA = 'sb_publishable_eKJFz3tN8eyfSdehGj7Lkg_m0UVvSuV';
      
      this.url = localStorage.getItem('anew_supabase_url') || URL_FIXA;
      this.key = localStorage.getItem('anew_supabase_key') || KEY_FIXA;
      
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
          console.log('[SupabaseService] ✅ Cliente recriado com sucesso!');
        } catch (err) {
          console.error('[SupabaseService] ❌ Erro ao recriar cliente:', err);
          this.client = null;
        }
      }
    }
    return this.client;
  }

  public estaConectado(): boolean {
    const conectado = this.client !== null;
    console.log('[SupabaseService] 📊 Status:', conectado ? '✅ Conectado' : '❌ Desconectado');
    return conectado;
  }

  public reconfigurar(novaUrl: string, novaKey: string): ResultadoSupabase<boolean> {
    try {
      console.log('[SupabaseService] 🔄 Reconfigurando...');
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

      console.log('[SupabaseService] ✅ Reconfigurado com sucesso!');
      return { sucesso: true, dados: true };
    } catch (err: any) {
      console.error('[SupabaseService] ❌ Erro na reconfiguração:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao inicializar Supabase' };
    }
  }

  public async testarConexao(): Promise<StatusConexaoSupabase> {
    const client = this.getClient();
    console.log('[SupabaseService] 🔍 Testando conexão...');
    console.log('   Cliente:', client ? '✅ OK' : '❌ NULO');

    if (!client) {
      return {
        conectado: false,
        urlConfigurada: Boolean(this.url),
        chaveConfigurada: Boolean(this.key),
        mensagem: 'Cliente Supabase não configurado.',
        ultimaVerificacao: new Date().toISOString(),
      };
    }

    try {
      console.log('[SupabaseService] 📡 Executando consulta de teste...');
      const { error } = await client.from('Configuracao').select('ConfiguracaoId').limit(1);

      if (error) {
        console.log('[SupabaseService] ❌ Erro na consulta:', error.message);
        return {
          conectado: false,
          urlConfigurada: true,
          chaveConfigurada: true,
          mensagem: `Erro: ${error.message}`,
          ultimaVerificacao: new Date().toISOString(),
        };
      }

      console.log('[SupabaseService] ✅ Conexão testada com sucesso!');
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