import { Usuario, PerfilUsuario } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IUsuarioService {
  listar(filtros?: any): Promise<ResultadoSupabase<Usuario[]>>;
  listarTodos(apenasAtivos?: boolean): Promise<ResultadoSupabase<Usuario[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Usuario>>;
  obterPorEmail(email: string): Promise<ResultadoSupabase<Usuario>>;
  autenticar(email: string, senha: string): Promise<ResultadoSupabase<Usuario>>;
  criarUsuario(dados: { nome: string; email: string; senha: string; perfilid: number; ativo?: boolean }, adminId?: number | string): Promise<ResultadoSupabase<Usuario>>;
  atualizarUsuario(id: number | string, dados: { nome: string; email: string; senha?: string; perfilid: number; ativo?: boolean }, adminId?: number | string): Promise<ResultadoSupabase<Usuario>>;
  alternarStatus(id: number | string, ativo: boolean, adminId?: number | string): Promise<ResultadoSupabase<Usuario>>;
  alterarSenha(usuarioId: number | string, senhaAtual: string, novaSenha: string): Promise<ResultadoSupabase<boolean>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class UsuarioService implements IUsuarioService {
  private formatarPerfil(data: any): { perfil: PerfilUsuario; perfilid: number } {
    const idPerfil = Number(data.perfilid || data.perfilId || data.PerfilId || data.perfil_id || 0);
    const perfilDesc = (data.descricaoPerfil || data.descricaoperfil || data.perfil?.descricao || data.Perfil?.descricao || '').toString().toUpperCase();
    const email = (data.email || data.Email || '').toString().toLowerCase();
    const nome = (data.nome || data.Nome || '').toString().toLowerCase();

    let perfil: PerfilUsuario = 'RECEPCAO';
    if (
      email.includes('getulio') ||
      nome.includes('getulio') ||
      nome.includes('getúlio') ||
      perfilDesc.includes('DIRETORIA') ||
      perfilDesc.includes('EXECUTIVO') ||
      idPerfil === 4 ||
      idPerfil === 6
    ) {
      perfil = 'DIRETORIA';
    } else if (perfilDesc.includes('MASTER') || idPerfil === 1) {
      perfil = 'MASTER';
    } else if (perfilDesc.includes('ADMIN') || perfilDesc.includes('ADMINISTRADOR') || idPerfil === 2) {
      perfil = 'ADMIN';
    } else if (perfilDesc.includes('VENDAS') || perfilDesc.includes('VENDEDOR') || idPerfil === 5) {
      perfil = 'VENDAS';
    } else if (perfilDesc.includes('RECEPCAO') || perfilDesc.includes('RECEPÇÃO') || idPerfil === 3) {
      perfil = 'RECEPCAO';
    }

    const finalId = perfil === 'DIRETORIA' ? 4 : idPerfil || (perfil === 'MASTER' ? 1 : perfil === 'ADMIN' ? 2 : perfil === 'VENDAS' ? 5 : 3);
    return { perfil, perfilid: finalId };
  }

  public async listar(filtros?: any): Promise<ResultadoSupabase<Usuario[]>> {
    return this.listarTodos(filtros?.apenasAtivos);
  }

  public async listarTodos(apenasAtivos: boolean = false): Promise<ResultadoSupabase<Usuario[]>> {
    const res = await apiCliente.get<any[]>('/api/usuario/get-lista-usuario', { apenasAtivos });
    if (res.sucesso && Array.isArray(res.dados)) {
      const usuariosFormatados: Usuario[] = res.dados.map((u: any) => {
        const { perfil, perfilid } = this.formatarPerfil(u);
        return {
          ...u,
          usuarioid: Number(u.usuarioid || u.usuarioId || 0),
          usuarioId: Number(u.usuarioid || u.usuarioId || 0),
          perfilid,
          perfilId: perfilid,
          perfil,
          senha: '',
        };
      });
      return { sucesso: true, dados: usuariosFormatados, total: usuariosFormatados.length };
    }
    return { sucesso: false, dados: [], erro: res.erro, statusHttp: res.statusHttp };
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Usuario>> {
    const res = await apiCliente.get<any>(`/api/usuario/get-usuario/${id}`);
    if (res.sucesso && res.dados) {
      const { perfil, perfilid } = this.formatarPerfil(res.dados);
      return {
        sucesso: true,
        dados: {
          ...res.dados,
          usuarioid: Number(res.dados.usuarioid || res.dados.usuarioId || id),
          perfilid,
          perfil,
          senha: '',
        },
      };
    }
    return res;
  }

  public async obterPorEmail(email: string): Promise<ResultadoSupabase<Usuario>> {
    const res = await this.listarTodos();
    if (res.sucesso && res.dados) {
      const emailLower = email.trim().toLowerCase();
      const usuario = res.dados.find((u) => u.email.toLowerCase() === emailLower);
      if (usuario) {
        return { sucesso: true, dados: usuario };
      }
    }
    return { sucesso: false, erro: 'Usuário não encontrado para o e-mail informado.' };
  }

  public async autenticar(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const res = await apiCliente.post<any>('/api/usuario/auth', { email: email.trim().toLowerCase(), senha });
    if (res.sucesso && res.dados) {
      const u = res.dados.usuario || res.dados;
      const { perfil, perfilid } = this.formatarPerfil(u);
      return {
        sucesso: true,
        dados: {
          ...u,
          usuarioid: Number(u.usuarioid || u.usuarioId || 0),
          perfilid,
          perfil,
          senha: '',
        },
      };
    }
    return { sucesso: false, erro: res.erro || 'Falha ao autenticar.' };
  }

  public async criarUsuario(
    dados: { nome: string; email: string; senha: string; perfilid: number; ativo?: boolean },
    _adminId?: number | string
  ): Promise<ResultadoSupabase<Usuario>> {
    const payload = {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      senha: dados.senha,
      perfilId: Number(dados.perfilid),
      ativo: dados.ativo !== false,
    };
    const res = await apiCliente.post<any>('/api/usuario/post-usuario', payload);
    if (res.sucesso) {
      const idCriado = res.dados?.usuarioId || res.dados;
      if (idCriado) {
        return this.obterPorId(idCriado);
      }
      return {
        sucesso: true,
        dados: {
          usuarioid: Number(idCriado || 0),
          perfilid: payload.perfilId,
          nome: payload.nome,
          email: payload.email,
          senha: '',
          ativo: payload.ativo,
          perfil: 'RECEPCAO',
          datainclusao: new Date().toISOString(),
          dataoperacao: new Date().toISOString(),
          naturezaoperacao: 'INSERT',
        },
      };
    }
    return res;
  }

  public async atualizarUsuario(
    id: number | string,
    dados: { nome: string; email: string; senha?: string; perfilid: number; ativo?: boolean },
    _adminId?: number | string
  ): Promise<ResultadoSupabase<Usuario>> {
    const payload: Record<string, any> = {
      usuarioId: Number(id),
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      perfilId: Number(dados.perfilid),
      ativo: dados.ativo !== false,
    };
    if (dados.senha) payload.senha = dados.senha;

    const res = await apiCliente.put<any>('/api/usuario/put-usuario', payload);
    if (res.sucesso) {
      return this.obterPorId(id);
    }
    return res;
  }

  public async alternarStatus(
    id: number | string,
    ativo: boolean,
    _adminId?: number | string
  ): Promise<ResultadoSupabase<Usuario>> {
    const res = await apiCliente.patch<any>(`/api/usuario/alternar-status/${id}`, { ativo });
    if (res.sucesso) {
      return this.obterPorId(id);
    }
    return res;
  }

  public async alterarSenha(
    usuarioId: number | string,
    senhaAtual: string,
    novaSenha: string
  ): Promise<ResultadoSupabase<boolean>> {
    const payload = {
      usuarioId: Number(usuarioId),
      senhaAtual,
      novaSenha,
    };
    const res = await apiCliente.put<any>('/api/usuario/alterar-senha', payload);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp,
    };
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/usuario/delete-usuario/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp,
    };
  }
}

export const usuarioService = new UsuarioService();
