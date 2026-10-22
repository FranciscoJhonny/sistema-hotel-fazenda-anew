import { ItemVenda } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IItemVendaService {
  listar(filtros?: any): Promise<ResultadoSupabase<ItemVenda[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<ItemVenda>>;
  listarPorVenda(vendaId: number | string): Promise<ResultadoSupabase<ItemVenda[]>>;
  criar(item: Partial<ItemVenda>): Promise<ResultadoSupabase<ItemVenda>>;
  criarMultiplos(itens: Partial<ItemVenda>[]): Promise<ResultadoSupabase<ItemVenda[]>>;
  atualizar(id: number | string, item: Partial<ItemVenda>): Promise<ResultadoSupabase<ItemVenda>>;
  desativar(id: number | string): Promise<ResultadoSupabase<ItemVenda>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class ItemVendaService implements IItemVendaService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<ItemVenda[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<ItemVenda[]>('/api/item-venda/get-lista-item-venda', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<ItemVenda>> {
    return await apiCliente.get<ItemVenda>(`/api/item-venda/get-item-venda/${id}`);
  }

  public async listarPorVenda(vendaId: number | string): Promise<ResultadoSupabase<ItemVenda[]>> {
    return await apiCliente.get<ItemVenda[]>(`/api/item-venda/listar-por-venda/${vendaId}`);
  }

  public async criar(item: Partial<ItemVenda>): Promise<ResultadoSupabase<ItemVenda>> {
    return await apiCliente.post<ItemVenda>('/api/item-venda/post-item-venda', item);
  }

  public async criarMultiplos(itens: Partial<ItemVenda>[]): Promise<ResultadoSupabase<ItemVenda[]>> {
    return await apiCliente.post<ItemVenda[]>('/api/item-venda/post-multiplos-itens', itens);
  }

  public async atualizar(id: number | string, item: Partial<ItemVenda>): Promise<ResultadoSupabase<ItemVenda>> {
    const payload = { ...item, itemVendaId: Number(id) };
    return await apiCliente.put<ItemVenda>('/api/item-venda/put-item-venda', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<ItemVenda>> {
    return await apiCliente.delete<ItemVenda>(`/api/item-venda/desativar-item-venda/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/item-venda/delete-item-venda/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const itemVendaService = new ItemVendaService();
