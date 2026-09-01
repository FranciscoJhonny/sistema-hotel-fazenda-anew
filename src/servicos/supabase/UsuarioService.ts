// src/servicos/supabase/UsuarioService.ts
import { BaseService } from './BaseService';
import { Usuario } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IUsuarioService {
  listar(filtros?: any): Promise<ResultadoSupabase<Usuario[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Usuario>>;
  obterPorEmail(email: string): Promise<ResultadoSupabase<Usuario>>;
  autenticar(email: string, senha: string): Promise<ResultadoSupabase<Usuario>>;
  criar(usuario: Partial<Usuario>): Promise<ResultadoSupabase<Usuario>>;
  atualizar(id: number | string, usuario: Partial<Usuario>): Promise<ResultadoSupabase<Usuario>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Usuario>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class UsuarioService extends BaseService<Usuario> implements IUsuarioService {
  constructor() {
    super('Usuario', 'UsuarioId');
  }

  public async obterPorEmail(email: string): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client
        .from('Usuario')
        .select('*, Perfil:PerfilId(Descricao)')
        .eq('Email', email.trim().toLowerCase())
        .eq('Ativo', true)
        .maybeSingle();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado.' };
      }

      return { sucesso: true, dados: data as unknown as Usuario };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar usuário' };
    }
  }

  /**
   * 🔥 AUTENTICAR APENAS NO SUPABASE
   */
  public async autenticar(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: '🚫 Sistema offline. Conecte-se ao Supabase.' };
    }

    try {
      // 🔥 Buscar usuário no Supabase com join no Perfil
      const { data, error } = await client
        .from('Usuario')
        .select(`
          *,
          Perfil:PerfilId (
            Descricao
          )
        `)
        .eq('Email', email.trim().toLowerCase())
        .eq('Ativo', true)
        .maybeSingle();

      if (error) {
        console.error('[UsuarioService] Erro na consulta:', error);
        return { sucesso: false, erro: 'Erro ao buscar usuário no banco de dados.' };
      }

      // Usuário não encontrado
      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }

      // 🔥 Verificar senha
      if (data.Senha !== senha) {
        return { sucesso: false, erro: 'Senha incorreta. Tente novamente.' };
      }

      // Mapear usuário com perfil
      const usuarioMapeado: Usuario = {
        ...data,
        Perfil: (data.Perfil?.Descricao as any) || (data.PerfilId === 1 ? 'ADMIN' : 'RECEPCAO'),
      };

      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[UsuarioService] Erro na autenticação:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao autenticar usuário.' };
    }
  }

  // ... outros métodos (listar, criar, atualizar, etc)
}