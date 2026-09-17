import { BaseService } from './BaseService';
import { Usuario, PerfilUsuario } from '../../tipos';
import { ResultadoSupabase } from './types';
import { verificarSenha, gerarHashSenha } from '../../utilitarios/criptografia';

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

export class UsuarioService extends BaseService<Usuario> implements IUsuarioService {
  constructor() {
    super('usuario', 'usuarioid');
  }

  private formatarPerfil(data: any): { perfil: PerfilUsuario; perfilid: number } {
    const idPerfil = Number(data.perfilid || data.PerfilId || data.perfil_id || 0);
    const perfilDesc = (data.perfil?.descricao || data.Perfil?.descricao || '').toString().toUpperCase();

    let perfil: PerfilUsuario = 'RECEPCAO';
    if (perfilDesc.includes('MASTER') || idPerfil === 1) {
      perfil = 'MASTER';
    } else if (perfilDesc.includes('ADMIN') || perfilDesc.includes('ADMINISTRADOR') || idPerfil === 2) {
      perfil = 'ADMIN';
    } else if (perfilDesc.includes('VENDAS') || perfilDesc.includes('VENDEDOR') || idPerfil === 5) {
      perfil = 'VENDAS';
    } else if (perfilDesc.includes('RECEPCAO') || perfilDesc.includes('RECEPÇÃO') || idPerfil === 3) {
      perfil = 'RECEPCAO';
    }

    const finalId = idPerfil || (perfil === 'MASTER' ? 1 : perfil === 'ADMIN' ? 2 : perfil === 'VENDAS' ? 5 : 3);
    return { perfil, perfilid: finalId };
  }

  public async listarTodos(apenasAtivos: boolean = false): Promise<ResultadoSupabase<Usuario[]>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      let query = client
        .from('usuario')
        .select(`
          *,
          perfil:perfilid (
            descricao
          )
        `)
        .order('usuarioid', { ascending: true });

      if (apenasAtivos) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      const usuariosFormatados: Usuario[] = (data || []).map((u: any) => {
        const { perfil, perfilid } = this.formatarPerfil(u);

        return {
          ...u,
          usuarioid: Number(u.usuarioid || u.UsuarioId || 0),
          perfilid,
          perfil,
          senha: '', // Remover senha por segurança no cliente
        };
      });

      return { sucesso: true, dados: usuariosFormatados };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar usuários' };
    }
  }

  public async obterPorEmail(email: string): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client
        .from('usuario')
        .select('*, perfil:perfilid(descricao)')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado.' };
      }

      const { perfil, perfilid } = this.formatarPerfil(data);

      const usuarioMapeado: Usuario = {
        ...data,
        usuarioid: Number(data.usuarioid || 0),
        perfilid,
        perfil,
        senha: '',
      };

      return { sucesso: true, dados: usuarioMapeado };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar usuário' };
    }
  }

  /**
   * 🔥 AUTENTICAR NO SUPABASE
   */
  public async autenticar(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: '🚫 Sistema offline. Conecte-se ao Supabase.' };
    }

    try {
      const { data, error } = await client
        .from('usuario')
        .select(`
          *,
          perfil:perfilid (
            descricao
          )
        `)
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('[UsuarioService] Erro na consulta:', error);
        return { sucesso: false, erro: 'Erro ao buscar usuário no banco de dados.' };
      }

      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }

      const estaAtivo = data.ativo !== undefined ? Boolean(data.ativo) : true;
      if (!estaAtivo) {
        return { sucesso: false, erro: 'Este usuário está inativo no sistema. Contate o administrador.' };
      }

      const senhaBanco = (data.senha || data.Senha || data.senha_hash || '').toString().trim();
      const senhaValida = await verificarSenha(senha, senhaBanco);

      if (!senhaValida) {
        return { sucesso: false, erro: 'Senha incorreta. Tente novamente.' };
      }

      const { perfil, perfilid } = this.formatarPerfil(data);

      const usuarioMapeado: Usuario = {
        ...data,
        usuarioid: Number(data.usuarioid || data.UsuarioId || 0),
        perfilid,
        perfil,
        senha: '',
      };

      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[UsuarioService] Erro na autenticação:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao autenticar usuário.' };
    }
  }

  /**
   * 🔥 CRIAR NOVO USUÁRIO COM CRIPTOGRAFIA SHA-256
   */
  public async criarUsuario(
    dados: { nome: string; email: string; senha: string; perfilid: number; ativo?: boolean },
    adminId?: number | string
  ): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const emailNormalizado = dados.email.trim().toLowerCase();

      // Validar duplicidade de e-mail
      const { data: usuarioExistente } = await client
        .from('usuario')
        .select('usuarioid')
        .eq('email', emailNormalizado)
        .maybeSingle();

      if (usuarioExistente) {
        return { sucesso: false, erro: 'Já existe um usuário cadastrado com este e-mail.' };
      }

      // Gerar Hash SHA-256 da senha
      const senhaHash = await gerarHashSenha(dados.senha);
      const agora = new Date().toISOString();

      const dadosInserir = {
        nome: dados.nome.trim(),
        email: emailNormalizado,
        senha: senhaHash,
        perfilid: Number(dados.perfilid),
        ativo: dados.ativo ?? true,
        datainclusao: agora,
        dataoperacao: agora,
        usuarioinclusao: adminId ? Number(adminId) : null,
        usuariooperacao: adminId ? Number(adminId) : null,
        naturezaoperacao: 'INSERT',
      };

      const { data, error } = await client
        .from('usuario')
        .insert(dadosInserir)
        .select(`*, perfil:perfilid (descricao)`)
        .single();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      const { perfil, perfilid } = this.formatarPerfil(data);

      const usuarioMapeado: Usuario = {
        ...data,
        usuarioid: Number(data.usuarioid || 0),
        perfilid,
        perfil,
        senha: '',
      };

      return { sucesso: true, dados: usuarioMapeado };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao criar usuário.' };
    }
  }

  /**
   * 🔥 ATUALIZAR USUÁRIO (SENHA OPCIONAL)
   */
  public async atualizarUsuario(
    id: number | string,
    dados: { nome: string; email: string; senha?: string; perfilid: number; ativo?: boolean },
    adminId?: number | string
  ): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const emailNormalizado = dados.email.trim().toLowerCase();

      // Validar duplicidade de e-mail em outro usuário
      const { data: outroUsuario } = await client
        .from('usuario')
        .select('usuarioid')
        .eq('email', emailNormalizado)
        .neq('usuarioid', id)
        .maybeSingle();

      if (outroUsuario) {
        return { sucesso: false, erro: 'Este e-mail já está sendo utilizado por outro usuário.' };
      }

      const agora = new Date().toISOString();
      const dadosAtualizar: any = {
        nome: dados.nome.trim(),
        email: emailNormalizado,
        perfilid: Number(dados.perfilid),
        ativo: dados.ativo ?? true,
        dataoperacao: agora,
        usuariooperacao: adminId ? Number(adminId) : null,
        naturezaoperacao: 'UPDATE',
      };

      // Se a senha foi preenchida, regerar o hash SHA-256
      if (dados.senha && dados.senha.trim().length > 0) {
        dadosAtualizar.senha = await gerarHashSenha(dados.senha.trim());
      }

      const { data, error } = await client
        .from('usuario')
        .update(dadosAtualizar)
        .eq('usuarioid', id)
        .select(`*, perfil:perfilid (descricao)`)
        .single();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      const { perfil, perfilid } = this.formatarPerfil(data);

      const usuarioMapeado: Usuario = {
        ...data,
        usuarioid: Number(data.usuarioid || 0),
        perfilid,
        perfil,
        senha: '',
      };

      return { sucesso: true, dados: usuarioMapeado };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao atualizar usuário.' };
    }
  }

  /**
   * 🔥 ALTERNAR STATUS ATIVO / INATIVO
   */
  public async alternarStatus(
    id: number | string,
    ativo: boolean,
    adminId?: number | string
  ): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const agora = new Date().toISOString();
      const { data, error } = await client
        .from('usuario')
        .update({
          ativo,
          dataoperacao: agora,
          usuariooperacao: adminId ? Number(adminId) : null,
          naturezaoperacao: 'UPDATE',
        })
        .eq('usuarioid', id)
        .select(`*, perfil:perfilid (descricao)`)
        .single();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      const { perfil, perfilid } = this.formatarPerfil(data);

      const usuarioMapeado: Usuario = {
        ...data,
        usuarioid: Number(data.usuarioid || 0),
        perfilid,
        perfil,
        senha: '',
      };

      return { sucesso: true, dados: usuarioMapeado };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao alterar status do usuário.' };
    }
  }

  /**
   * 🔥 ALTERAR SENHA DO USUÁRIO LOGADO
   */
  public async alterarSenha(
    usuarioId: number | string,
    senhaAtual: string,
    novaSenha: string
  ): Promise<ResultadoSupabase<boolean>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      // 1. Buscar usuário no banco para conferir a senha atual
      const { data: usuarioBanco, error: errBusca } = await client
        .from('usuario')
        .select('senha')
        .eq('usuarioid', usuarioId)
        .maybeSingle();

      if (errBusca || !usuarioBanco) {
        return { sucesso: false, erro: 'Usuário não encontrado no banco de dados.' };
      }

      // 2. Validar senha atual
      const senhaCorreta = await verificarSenha(senhaAtual, usuarioBanco.senha || '');
      if (!senhaCorreta) {
        return { sucesso: false, erro: 'A senha atual informada está incorreta.' };
      }

      // 3. Gerar hash SHA-256 da nova senha
      const novaSenhaHash = await gerarHashSenha(novaSenha.trim());
      const agora = new Date().toISOString();

      // 4. Atualizar senha no banco
      const { error: errUpdate } = await client
        .from('usuario')
        .update({
          senha: novaSenhaHash,
          dataoperacao: agora,
          usuariooperacao: Number(usuarioId),
          naturezaoperacao: 'UPDATE',
        })
        .eq('usuarioid', usuarioId);

      if (errUpdate) {
        return { sucesso: false, erro: errUpdate.message };
      }

      return { sucesso: true, dados: true };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao alterar a senha.' };
    }
  }
}