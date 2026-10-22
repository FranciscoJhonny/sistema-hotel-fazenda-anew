import { Produto } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

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

export class ProdutoService implements IProdutoService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Produto[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Produto[]>('/api/produto/get-lista-produto', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Produto>> {
    return await apiCliente.get<Produto>(`/api/produto/get-produto/${id}`);
  }

  public async listarPorCategoria(categoria: string): Promise<ResultadoSupabase<Produto[]>> {
    return await apiCliente.get<Produto[]>(`/api/produto/listar-por-categoria/${encodeURIComponent(categoria)}`);
  }

  public async atualizarEstoque(
    produtoId: number | string,
    quantidade: number,
    isDelta: boolean = false
  ): Promise<ResultadoSupabase<Produto>> {
    return await apiCliente.patch<Produto>(`/api/produto/atualizar-estoque/${produtoId}`, {
      quantidade,
      isDelta,
    });
  }

  public async criar(produto: Partial<Produto>): Promise<ResultadoSupabase<Produto>> {
    return await apiCliente.post<Produto>('/api/produto/post-produto', produto);
  }

  public async atualizar(id: number | string, produto: Partial<Produto>): Promise<ResultadoSupabase<Produto>> {
    const payload = { ...produto, produtoId: Number(id) };
    return await apiCliente.put<Produto>('/api/produto/put-produto', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Produto>> {
    return await apiCliente.delete<Produto>(`/api/produto/desativar-produto/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/produto/delete-produto/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const produtoService = new ProdutoService();
