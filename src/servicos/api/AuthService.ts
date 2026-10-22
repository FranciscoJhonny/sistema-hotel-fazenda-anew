import { Usuario, PerfilUsuario } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente, salvarTokenApi, limparTokenApi } from './apiCliente';

export interface IAuthService {
  login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>>;
  logout(): Promise<void>;
  getUsuarioLogado(): Usuario | null;
  salvarSessaoLocal(usuario: Usuario): void;
  limparSessaoLocal(): void;
}

export class AuthService implements IAuthService {
  private static readonly STORAGE_KEY = 'anew_usuario_atual_v2';
  private static readonly AUTH_KEY = 'anew_autenticado_v2';

  public async login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado || !senha) {
      return { sucesso: false, erro: 'Informe o e-mail e a senha para acessar.' };
    }

    try {
      const resApi = await apiCliente.post<any>('/api/usuario/auth', {
        email: emailNormalizado,
        senha,
      });

      if (resApi.sucesso && resApi.dados) {
        const payload = resApi.dados;
        const token = payload.token || payload.data?.token;

        if (token) {
          salvarTokenApi(token);
        }

        const usuarioDados = payload.usuario || payload.data?.usuario || payload;
        const usuarioMapeado = this.mapearUsuario(usuarioDados);
        this.salvarSessaoLocal(usuarioMapeado);

        return { sucesso: true, dados: usuarioMapeado };
      }

      return {
        sucesso: false,
        erro: resApi.erro || 'E-mail ou senha incorretos.',
        statusHttp: resApi.statusHttp,
      };
    } catch (err: any) {
      console.error('[AuthService] Erro no login:', err);
      return { sucesso: false, erro: err?.message || 'Erro inesperado ao conectar à API.' };
    }
  }

  private mapearUsuario(data: any): Usuario {
    let perfil: PerfilUsuario = 'RECEPCAO';
    const idPerfil = Number(
      data.perfilid ||
      data.perfilId ||
      data.PerfilId ||
      data.perfil_id ||
      (data.perfil && typeof data.perfil === 'object' ? (data.perfil.perfilid || data.perfil.perfilId) : 0) ||
      0
    );

    const perfilObjeto = typeof data.perfil === 'object' ? data.perfil : {};
    const perfilBruto = (
      perfilObjeto.descricao ||
      perfilObjeto.nome ||
      data.descricaoperfil ||
      data.descricaoPerfil ||
      data.perfil ||
      ''
    ).toString().toUpperCase();

    const email = (data.email || data.Email || '').toString().toLowerCase();
    const nome = (data.nome || data.Nome || '').toString().toLowerCase();

    if (
      email.includes('getulio') ||
      nome.includes('getulio') ||
      nome.includes('getúlio') ||
      perfilBruto.includes('DIRETORIA') ||
      perfilBruto.includes('EXECUTIVO') ||
      idPerfil === 4 ||
      idPerfil === 6
    ) {
      perfil = 'DIRETORIA';
    } else if (perfilBruto.includes('MASTER') || idPerfil === 1) {
      perfil = 'MASTER';
    } else if (perfilBruto.includes('ADMIN') || perfilBruto.includes('ADMINISTRADOR') || idPerfil === 2) {
      perfil = 'ADMIN';
    } else if (perfilBruto.includes('VENDAS') || perfilBruto.includes('VENDEDOR') || idPerfil === 5) {
      perfil = 'VENDAS';
    } else if (perfilBruto.includes('RECEPCAO') || perfilBruto.includes('RECEPÇÃO') || idPerfil === 3) {
      perfil = 'RECEPCAO';
    }

    const finalIdPerfil =
      perfil === 'DIRETORIA'
        ? 4
        : idPerfil || (perfil === 'MASTER' ? 1 : perfil === 'ADMIN' ? 2 : perfil === 'VENDAS' ? 5 : 3);

    return {
      usuarioid: Number(data.usuarioid || data.usuarioId || data.UsuarioId || data.id || 0),
      nome: data.nome || data.Nome || '',
      email: data.email || data.Email || '',
      senha: '',
      ativo: data.ativo !== undefined ? Boolean(data.ativo) : (data.Ativo !== undefined ? Boolean(data.Ativo) : true),
      perfilid: finalIdPerfil,
      perfil: perfil,
      datainclusao: data.datainclusao || data.dataInclusao || new Date().toISOString(),
      dataoperacao: new Date().toISOString(),
      naturezaoperacao: 'INSERT',
    };
  }

  public async logout(): Promise<void> {
    try {
      limparTokenApi();
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
          if (usuario.email.toLowerCase().includes('getulio')) {
            usuario.perfil = 'DIRETORIA';
            usuario.perfilid = 4;
          }
          return usuario;
        }
      } catch (e) { }
    }
    return null;
  }

  public salvarSessaoLocal(usuario: Usuario): void {
    if (usuario.email?.toLowerCase().includes('getulio')) {
      usuario.perfil = 'DIRETORIA';
      usuario.perfilid = 4;
    }
    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(usuario));
    localStorage.setItem(AuthService.AUTH_KEY, 'true');
  }

  public limparSessaoLocal(): void {
    limparTokenApi();
    localStorage.removeItem(AuthService.STORAGE_KEY);
    localStorage.removeItem('anew_usuario_atual_v1');
    localStorage.setItem(AuthService.AUTH_KEY, 'false');
    localStorage.setItem('anew_autenticado_v1', 'false');
  }
}

export const authService = new AuthService();
