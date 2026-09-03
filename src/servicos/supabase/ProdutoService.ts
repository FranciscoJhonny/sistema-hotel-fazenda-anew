import { BaseService } from './BaseService';
import { Produto } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IProdutoService {
  listar(filtros?: any): Promise<ResultadoSupabase<Produto[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Produto>>;
  listarPorCategoria(categoria: string): Promise<ResultadoSupabase<Produto[]>>;
  atualizarEstoque(produtoId: number | string, deltaOuNovoValor: number, isDelta?: boolean): Promise<ResultadoSupabase<Produto>>;
  criar(produto: Partial<Produto>): Promise<ResultadoSupabase<Produto>>;
  atualizar(id: number | string, produto: Partial<Produto>): Promise<ResultadoSupabase<Produto>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Produto>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class ProdutoService extends BaseService<Produto> implements IProdutoService {
  constructor() {
    super('Produto', 'ProdutoId');
  }

  public async listarPorCategoria(categoria: string): Promise<ResultadoSupabase<Produto[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Produto')
        .select('*')
        .eq('Categoria', categoria)
        .eq('Ativo', true)
        .order('Nome', { ascending: true });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Produto[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar produtos por categoria' };
    }
  }

  public async atualizarEstoque(
    produtoId: number | string,
    quantidade: number,
    isDelta: boolean = false
  ): Promise<ResultadoSupabase<Produto>> {
    if (!isDelta) {
      return this.atualizar(produtoId, { estoque: quantidade });
    }

    const produtoRes = await this.obterPorId(produtoId);
    if (!produtoRes.sucesso || !produtoRes.dados) {
      return { sucesso: false, erro: produtoRes.erro || 'Produto não encontrado' };
    }

    const novoEstoque = Math.max(0, (produtoRes.dados.estoque || 0) + quantidade);
    return this.atualizar(produtoId, { estoque: novoEstoque });
  }
}
