import { BaseService } from './BaseService';
import { Usuario } from '../../tipos';
import { ResultadoSupabase } from './types';
import { verificarSenha } from '../../utilitarios/criptografia';

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
    super('usuario', 'usuarioid');
  }

  public async obterPorEmail(email: string): Promise<ResultadoSupabase<Usuario>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client
        .from('usuario')
        .select('*, Perfil:PerfilId(descricao)')
        .eq('email', email.trim().toLowerCase())
        .eq('ativo', true)
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
        .from('usuario')
        .select(`
          *,
          Perfil:perfilid (
            descricao
          )
        `)
        .eq('email', email.trim().toLowerCase())
        .eq('ativo', true)
        .maybeSingle();

      if (error) {
        console.error('[UsuarioService] Erro na consulta:', error);
        return { sucesso: false, erro: 'Erro ao buscar usuário no banco de dados.' };
      }

      // Usuário não encontrado
      if (!data) {
        return { sucesso: false, erro: 'Usuário não encontrado. Verifique seu e-mail.' };
      }

      // Verificar se o usuário está ativo
      const estaAtivo = data.ativo !== undefined ? Boolean(data.ativo) : true;
      if (!estaAtivo) {
        return { sucesso: false, erro: 'Este usuário está inativo no sistema. Contate o administrador.' };
      }

      // Validar senha (compatível com SHA-256 e texto plano)
      const senhaBanco = (data.senha || data.Senha || data.senha_hash || '').toString().trim();
      const senhaValida = await verificarSenha(senha, senhaBanco);

      if (!senhaValida) {
        return { sucesso: false, erro: 'Senha incorreta. Tente novamente.' };
      }

      // Mapear usuário com perfil
      const perfilDesc = (data.perfil?.descricao || data.Perfil?.descricao || (data.perfilid === 1 ? 'ADMIN' : 'RECEPCAO')).toString().toUpperCase();
      const perfilFormatado = perfilDesc.includes('ADMIN') ? 'ADMIN' : (perfilDesc.includes('VENDAS') ? 'VENDAS' : 'RECEPCAO');

      const usuarioMapeado: Usuario = {
        ...data,
        usuarioid: Number(data.usuarioid || data.UsuarioId || 0),
        perfilid: Number(data.perfilid || data.PerfilId || 2),
        perfil: perfilFormatado,
        senha: '',
      };

      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[UsuarioService] Erro na autenticação:', err);
      return { sucesso: false, erro: err?.message || 'Erro ao autenticar usuário.' };
    }
  }

  // ... outros métodos (listar, criar, atualizar, etc)
}