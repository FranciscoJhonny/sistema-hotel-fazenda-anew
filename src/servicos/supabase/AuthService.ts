import { SupabaseService } from '../supabase/SupabaseService';
import { Usuario } from '../../tipos';
import { ResultadoSupabase } from '../supabase/types';
import { verificarSenha } from '../../utilitarios/criptografia';

export interface IAuthService {
  login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>>;
  logout(): Promise<void>;
  getUsuarioLogado(): Usuario | null;
  salvarSessaoLocal(usuario: Usuario): void;
  limparSessaoLocal(): void;
}

export class AuthService implements IAuthService {
  private supabaseService: SupabaseService;
  private static readonly STORAGE_KEY = 'anew_usuario_atual_v2';
  private static readonly AUTH_KEY = 'anew_autenticado_v2';

  private readonly TABELA_USUARIO_OPCOES = ['usuario', 'Usuario', 'usuarios', 'Usuarios'];

  constructor() {
    this.supabaseService = SupabaseService.getInstance();
  }

  private async encontrarTabelaUsuario(client: any): Promise<string | null> {
    for (const nomeTabela of this.TABELA_USUARIO_OPCOES) {
      try {
        const { error } = await client
          .from(nomeTabela)
          .select('usuarioid', { count: 'exact', head: true })
          .limit(1);

        if (!error) {
          return nomeTabela;
        }
      } catch (err) {
        // Ignorar nome de tabela incompatível e tentar o próximo.
      }
    }
    return 'usuario';
  }

  public async login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado || !senha) {
      return { sucesso: false, erro: 'Informe o e-mail e a senha para acessar.' };
    }

    try {
      const client = this.supabaseService.getClient();
      if (!client) return { sucesso: false, erro: '🚫 Sistema offline. Conecte-se ao Supabase.' };

      const tabelaNome = await this.encontrarTabelaUsuario(client);

      // Buscar o usuário no banco de dados com JOIN em perfil
      const { data, error } = await client
        .from(tabelaNome)
        .select(`*, perfil:perfilid (*)`)
        .ilike('email', emailNormalizado)
        .maybeSingle();

      if (error) {
        console.error('[AuthService] ❌ Erro ao consultar banco:', error);
        return { sucesso: false, erro: 'Erro ao consultar banco de dados. Tente novamente.' };
      }

      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }

      // Verificar se o usuário está ativo
      const estaAtivo = data.ativo !== undefined ? Boolean(data.ativo) : (data.Ativo !== undefined ? Boolean(data.Ativo) : true);
      if (!estaAtivo) {
        return { sucesso: false, erro: 'Este usuário está inativo no sistema. Contate a administração.' };
      }

      // Obter a senha armazenada no banco
      const senhaBanco = (data.senha || data.Senha || data.senha_hash || '').toString().trim();

      // Validar senha (suporta SHA-256 criptografado e texto plano)
      const senhaValida = await verificarSenha(senha, senhaBanco);

      if (!senhaValida) {
        return { sucesso: false, erro: 'Senha incorreta. Tente novamente.' };
      }

      // Mapear o usuário com perfil
      const usuarioMapeado = this.mapearUsuario(data);
      this.salvarSessaoLocal(usuarioMapeado);
      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[AuthService] ❌ Erro no login:', err);
      return { sucesso: false, erro: err?.message || 'Erro inesperado ao conectar.' };
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
      senha: '',
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
    localStorage.removeItem('anew_usuario_atual_v1');
    localStorage.setItem(AuthService.AUTH_KEY, 'false');
    localStorage.setItem('anew_autenticado_v1', 'false');
  }
}