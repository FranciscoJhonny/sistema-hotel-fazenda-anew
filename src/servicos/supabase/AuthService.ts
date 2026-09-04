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
  
  // 🔥 LISTA DE NOMES DE TABELA PARA TENTAR
  private readonly TABELA_USUARIO_OPCOES = ['usuario', 'Usuario', 'usuarios', 'Usuarios', 'user', 'User'];

  constructor() {
    this.supabaseService = SupabaseService.getInstance();
  }

  /**
   * Tenta encontrar a tabela de usuários em diferentes nomes
   */
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

      const { data: debugData, error: debugError } = await client
        .from(tabelaNome)
        .select('*')
        .limit(5);

      if (debugError) {
        console.error('[AuthService] ❌ Erro ao buscar dados gerais:', debugError);
        return { sucesso: false, erro: 'Erro de permissão ou conexão: ' + debugError.message };
      }

      if (!debugData || debugData.length === 0) {
        return { 
          sucesso: false, 
          erro: 'A tabela está vazia ou o RLS (Segurança de Nível de Linha) está bloqueando a leitura. Verifique as Policies no Supabase.' 
        };
      }

      // Se chegou aqui, a tabela tem dados e o RLS permite leitura.
      // Agora vamos tentar com o email exato
      let { data, error } = await client
        .from(tabelaNome)
        .select('*')
        .eq('email', emailNormalizado)
        .maybeSingle();

      // Se falhar, tentamos ILIKE (insensível a maiúsculas/minúsculas)
      if (!data) {
        const { data: data2, error: error2 } = await client
          .from(tabelaNome)
          .select('*')
          .ilike('email', emailNormalizado)
          .maybeSingle();
        data = data2;
        error = error2;
      }

      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }

      // ... (O restante do seu código de verificação de senha e mapeamento continua aqui) ...
      const senhaBanco = data.senha || data.Senha || data.senha_hash || '';
      
      if (senhaBanco !== senha) {
        return { sucesso: false, erro: 'Senha incorreta.' };
      }

      // Mapeamento (mantenha o seu código original de mapeamento aqui)
      const usuarioMapeado: Usuario = {
        usuarioid: data.usuarioid || data.UsuarioId || data.id || Date.now(),
        perfilid: data.perfilid || data.PerfilId || data.perfil_id || 2,
        nome: data.nome || data.Nome || data.nome_completo || 'Usuário',
        email: data.email || data.Email || emailNormalizado,
        senha: senhaBanco,
        ativo: data.ativo !== undefined ? data.ativo : (data.ativo !== undefined ? data.ativo : true),
        perfil: (data.perfil_descricao || 'RECEPCAO') as 'ADMIN' | 'RECEPCAO' | 'VENDAS',
        datainclusao: data.datainclusao || new Date().toISOString(),
        dataoperacao: new Date().toISOString(),
        naturezaoperacao: 'INSERT',
      };

      this.salvarSessaoLocal(usuarioMapeado);
      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[AuthService] ❌ Erro no login:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao conectar.' };
    }
  }

  public async logout(): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      if (client) {
        await client.auth.signOut().catch(() => {});
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
        if (usuario && usuario.Email) {
          return usuario;
        }
      } catch (e) {}
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