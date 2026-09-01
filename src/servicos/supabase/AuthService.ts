// src/servicos/auth/AuthService.ts
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
    console.log('[AuthService] 🔍 Inicializado');
    console.log('[AuthService] 📡 Conectado?', this.supabaseService.estaConectado());
  }

  /**
   * 🔥 Tenta encontrar a tabela de usuários em diferentes nomes
   */
  private async encontrarTabelaUsuario(client: any): Promise<string | null> {
    for (const nomeTabela of this.TABELA_USUARIO_OPCOES) {
      try {
        console.log(`[AuthService] 🔍 Tentando tabela: "${nomeTabela}"`);
        // Tentar fazer uma consulta simples
        const { data, error } = await client
          .from(nomeTabela)
          .select('count', { count: 'exact', head: true })
          .limit(1);
        
        if (!error) {
          console.log(`[AuthService] ✅ Tabela encontrada: "${nomeTabela}"`);
          return nomeTabela;
        }
        console.log(`[AuthService] ⚠️ Tabela "${nomeTabela}" não encontrada:`, error.message);
      } catch (err) {
        console.log(`[AuthService] ⚠️ Erro ao tentar "${nomeTabela}":`, err);
      }
    }
    return null;
  }

  public async login(email: string, senha: string): Promise<ResultadoSupabase<Usuario>> {
    const emailNormalizado = email.trim().toLowerCase();
    console.log('[AuthService] 🔑 Tentando login:', emailNormalizado);
    console.log('[AuthService] 🔑 Senha:', senha);

    try {
      const client = this.supabaseService.getClient();
      console.log('[AuthService] 📡 Cliente:', client ? '✅ OK' : '❌ NULO');

      if (!client) {
        return { 
          sucesso: false, 
          erro: '🚫 Sistema offline. Verifique sua conexão.' 
        };
      }

      // 🔥 ENCONTRAR O NOME CORRETO DA TABELA
      let tabelaNome = await this.encontrarTabelaUsuario(client);
      
      if (!tabelaNome) {
        console.log('[AuthService] ❌ Nenhuma tabela de usuário encontrada!');
        console.log('[AuthService] 🔍 Verifique se a tabela foi criada no Supabase.');
        console.log('[AuthService] 🔍 Execute no SQL Editor: SELECT tablename FROM pg_tables WHERE schemaname = \'public\';');
        return { 
          sucesso: false, 
          erro: 'Tabela de usuários não encontrada no banco de dados. Execute o script SQL.' 
        };
      }

      console.log(`[AuthService] 📡 Usando tabela: "${tabelaNome}"`);
      console.log('[AuthService] 📡 Buscando usuário...');

      // 🔥 CONSULTA COM O NOME ENCONTRADO
      let { data, error } = await client
        .from(tabelaNome)
        .select('*')
        .eq('email', emailNormalizado)
        .maybeSingle();

      console.log('[AuthService] 📊 Resultado da consulta:');
      console.log('   - Dados:', data);
      console.log('   - Erro:', error);

      if (error) {
        console.error('[AuthService] ❌ Erro na consulta:', error);
        return { 
          sucesso: false, 
          erro: 'Erro ao buscar usuário: ' + error.message 
        };
      }

      if (!data) {
        console.log('[AuthService] ❌ Usuário não encontrado com email exato');
        
        // 🔥 TENTATIVA 2: Buscar com ILIKE
        console.log('[AuthService] 🔄 Tentando busca com ILIKE...');
        const { data: data2, error: error2 } = await client
          .from(tabelaNome)
          .select('*')
          .ilike('email', emailNormalizado)
          .maybeSingle();

        console.log('[AuthService] 📊 Resultado ILIKE:');
        console.log('   - Dados:', data2);
        console.log('   - Erro:', error2);

        if (error2 || !data2) {
          console.log('[AuthService] ❌ Usuário não encontrado em nenhuma busca');
          return { 
            sucesso: false, 
            erro: 'Usuário não encontrado. Verifique seu e-mail.' 
          };
        }

        // Usar dados da segunda busca
        data = data2;
      }

      console.log('[AuthService] 👤 Usuário encontrado:');
      console.log('   - Nome:', data.nome || data.Nome || data.nome_completo);
      console.log('   - Email:', data.email || data.Email);
      console.log('   - Senha no banco:', data.senha || data.Senha);
      console.log('   - ID:', data.usuarioid || data.UsuarioId || data.id);

      // Verificar senha (tentar diferentes nomes de campo)
      const senhaBanco = data.senha || data.Senha || data.senha_hash || '';
      console.log('[AuthService] 🔑 Comparando senhas:');
      console.log('   - Fornecida:', senha);
      console.log('   - Banco:', senhaBanco);
      
      if (senhaBanco !== senha) {
        console.log('[AuthService] ❌ Senha incorreta');
        return { 
          sucesso: false, 
          erro: 'Senha incorreta. Tente novamente.' 
        };
      }

      console.log('[AuthService] ✅ Senha correta!');

      // Buscar o perfil
      let perfilDescricao = 'RECEPCAO';
      const perfilId = data.perfilid || data.PerfilId || data.perfil_id || 2;
      
      try {
        console.log('[AuthService] 🔍 Buscando perfil ID:', perfilId);
        const { data: perfilData } = await client
          .from('perfil')
          .select('descricao')
          .eq('perfilid', perfilId)
          .maybeSingle();
        
        if (perfilData) {
          perfilDescricao = perfilData.descricao;
        } else if (perfilId === 1) {
          perfilDescricao = 'ADMIN';
        }
      } catch (err) {
        console.warn('[AuthService] ⚠️ Erro ao buscar perfil:', err);
        if (perfilId === 1) {
          perfilDescricao = 'ADMIN';
        }
      }

      // Mapear usuário
      const usuarioMapeado: Usuario = {
        UsuarioId: data.usuarioid || data.UsuarioId || data.id || Date.now(),
        PerfilId: perfilId,
        Nome: data.nome || data.Nome || data.nome_completo || 'Usuário',
        Email: data.email || data.Email || emailNormalizado,
        Senha: senhaBanco,
        Ativo: data.ativo !== undefined ? data.ativo : (data.Ativo !== undefined ? data.Ativo : true),
        Perfil: perfilDescricao as 'ADMIN' | 'RECEPCAO' | 'VENDAS',
        DataInclusao: data.datainclusao || data.DataInclusao || new Date().toISOString(),
        DataOperacao: data.dataoperacao || data.DataOperacao || new Date().toISOString(),
        NaturezaOperacao: 'INSERT',
      };

      console.log('[AuthService] ✅ Login bem-sucedido!');
      console.log('[AuthService] 📊 Usuário mapeado:', usuarioMapeado);
      
      this.salvarSessaoLocal(usuarioMapeado);
      return { sucesso: true, dados: usuarioMapeado };

    } catch (err: any) {
      console.error('[AuthService] ❌ Erro no login:', err);
      return { 
        sucesso: false, 
        erro: err?.message || 'Erro ao conectar com o servidor.' 
      };
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
      console.log('[AuthService] 🔓 Logout realizado');
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