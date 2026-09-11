// src/servicos/supabase/AuthService.ts
import { SupabaseService } from '../supabase/SupabaseService';
import { Usuario } from '../../tipos';
import { ResultadoSupabase } from '../supabase/types';

export interface IAuthService {
  login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>>;
  logout(): Promise<void>;
  getUsuarioLogado(): Usuario | null;
  salvarSessaoLocal(usuario: Usuario): void;
  limparSessaoLocal(): void;
}

export class AuthService implements IAuthService {
  private supabaseService: SupabaseService;
  private static readonly STORAGE_KEY = 'anew_usuario_atual_v1';
  private static readonly AUTH_KEY = 'anew_autenticado_v1';

  private readonly TABELA_USUARIO_OPCOES = ['usuario', 'Usuario', 'usuarios', 'Usuarios', 'user', 'User'];

  constructor() {
    this.supabaseService = SupabaseService.getInstance();
  }

  private async encontrarTabelaUsuario(client: any): Promise<string | null> {
    for (const nomeTabela of this.TABELA_USUARIO_OPCOES) {
      try {
        const { data, error } = await client
          .from(nomeTabela)
          .select('count', { count: 'exact', head: true })
          .limit(1);

        if (!error) {
          return nomeTabela;
        }
      } catch (err) {
        // Ignorar nome de tabela incompatível e tentar o próximo.
      }
    }
    return null;
  }

  public async login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const emailNormalizado = email.trim().toLowerCase();

    try {
      const client = this.supabaseService.getClient();
      if (!client) return { sucesso: false, erro: 'Sistema offline.' };

      let tabelaNome = await this.encontrarTabelaUsuario(client);
      if (!tabelaNome) return { sucesso: false, erro: 'Tabela não encontrada.' };

      // Buscar o usuário com JOIN na tabela de perfil
      const { data, error } = await client
        .from(tabelaNome)
        .select(`*,perfil:perfilid (*)`)
        .eq('email', emailNormalizado)
        .maybeSingle();

      // Se não encontrar com eq, tenta com ilike
      if (!data) {
        const { data: data2, error: error2 } = await client
          .from(tabelaNome)
          .select(`*,perfil:perfilid (*)`)
          .ilike('email', emailNormalizado)
          .maybeSingle();
        
        if (data2) {
          const usuarioMapeado = this.mapearUsuario(data2);
          this.salvarSessaoLocal(usuarioMapeado);
          return { sucesso: true, dados: usuarioMapeado };
        }
        
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }

      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }
      
      const senhaBanco = data.senha || data.Senha || data.senha_hash || '';    
      
      if (senhaBanco !== senha) {
        return { sucesso: false, erro: 'Senha incorreta.' };
      }
      // Mapear o usuário com perfil
      const usuarioMapeado = this.mapearUsuario(data);
      
      this.salvarSessaoLocal(usuarioMapeado);
      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[AuthService] ❌ Erro no login:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao conectar.' };
    }
  }

  // 🔥 NOVO MÉTODO PARA MAPEAR USUÁRIO COM PERFIL
  private mapearUsuario(data: any): Usuario {
    // Mapear o perfil
    let perfil = 'RECEPCAO' as 'ADMIN' | 'RECEPCAO' | 'VENDAS';
    
    // Verificar se veio o perfil do JOIN
    if (data.perfil) {
      const descricaoPerfil = (data.perfil.descricao || '').toUpperCase();
      if (descricaoPerfil.includes('ADMIN') || descricaoPerfil.includes('ADMINISTRADOR')) {
        perfil = 'ADMIN';
      } else if (descricaoPerfil.includes('VENDAS') || descricaoPerfil.includes('VENDEDOR')) {
        perfil = 'VENDAS';
      } else {
        perfil = 'RECEPCAO';
      }
    } else {
      // Fallback: verificar campos diretos
      const perfilCampo = (data.perfil_descricao || data.perfil || data.Perfil || '').toString().toUpperCase();
      if (perfilCampo.includes('ADMIN') || perfilCampo.includes('ADMINISTRADOR')) {
        perfil = 'ADMIN';
      } else if (perfilCampo.includes('VENDAS') || perfilCampo.includes('VENDEDOR')) {
        perfil = 'VENDAS';
      } else {
        perfil = 'RECEPCAO';
      }
    }

    return {
      usuarioid: data.usuarioid || data.UsuarioId || data.id || Date.now(),
      perfilid: data.perfilid || data.PerfilId || data.perfil_id || 2,
      nome: data.nome || data.Nome || data.nome_completo || 'Usuário',
      email: data.email || data.Email || '',
      senha: data.senha || data.Senha || data.senha_hash || '',
      ativo: data.ativo !== undefined ? data.ativo : (data.Ativo !== undefined ? data.Ativo : true),
      perfil: perfil,
      datainclusao: data.datainclusao || new Date().toISOString(),
      dataoperacao: new Date().toISOString(),
      naturezaoperacao: 'INSERT',
    };
  }

  public async logout(): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      if (client) {
        await client.auth.signOut().catch(() => { });
      }
    } finally {
      this.limparSessaoLocal();
    }
  }

  public getUsuarioLogado(): Usuario | null {
    const salvo = localStorage.getItem(AuthService.STORAGE_KEY);
    if (salvo) {
      try {
        const usuario = JSON.parse(salvo);
        if (usuario && usuario.email) {
          return usuario;
        }
      } catch (e) { }
    }
    return null;
  }

  public salvarSessaoLocal(usuario: Usuario): void {
    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(usuario));
    localStorage.setItem(AuthService.AUTH_KEY, 'true');
  }

  public limparSessaoLocal(): void {
    localStorage.removeItem(AuthService.STORAGE_KEY);
    localStorage.setItem(AuthService.AUTH_KEY, 'false');
  }
}