import { Venda, ItemVenda } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';
import { ItemVendaService, itemVendaService } from './ItemVendaService';

export interface IVendaService {
  listar(filtros?: any): Promise<ResultadoSupabase<Venda[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Venda>>;
  obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Venda>>;
  listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Venda[]>>;
  criarComItens(venda: Partial<Venda>, itens: Partial<ItemVenda>[]): Promise<ResultadoSupabase<Venda>>;
  criar(venda: Partial<Venda>): Promise<ResultadoSupabase<Venda>>;
  atualizar(id: number | string, venda: Partial<Venda>): Promise<ResultadoSupabase<Venda>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Venda>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class VendaService implements IVendaService {
  private itemVendaService: ItemVendaService;

  constructor() {
    this.itemVendaService = itemVendaService;
  }

  public async listar(filtros?: any): Promise<ResultadoSupabase<Venda[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Venda[]>('/api/venda/get-lista-venda', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Venda>> {
    return await apiCliente.get<Venda>(`/api/venda/get-venda/${id}`);
  }

  public async obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Venda>> {
    return await apiCliente.get<Venda>(`/api/venda/get-venda-por-codigo/${encodeURIComponent(codigo)}`);
  }

  public async listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Venda[]>> {
    return await apiCliente.get<Venda[]>(`/api/venda/listar-por-reserva/${reservaId}`);
  }

  public async criar(venda: Partial<Venda>): Promise<ResultadoSupabase<Venda>> {
    return await apiCliente.post<Venda>('/api/venda/post-venda', venda);
  }

  public async criarComItens(
    venda: Partial<Venda>,
    itens: Partial<ItemVenda>[]
  ): Promise<ResultadoSupabase<Venda>> {
    // Tenta primeiro endpoint especializado da API
    const res = await apiCliente.post<Venda>('/api/venda/post-venda-com-itens', {
      venda,
      itens,
    });
    if (res.sucesso && res.dados) {
      return res;
    }

    // Fallback: cria cabeçalho e depois itens
    const vendaCriadaRes = await this.criar(venda);
    if (!vendaCriadaRes.sucesso || !vendaCriadaRes.dados) {
      return vendaCriadaRes;
    }

    const vendaId = (vendaCriadaRes.dados as any).vendaid || (vendaCriadaRes.dados as any).vendaId;
    if (itens.length > 0 && vendaId) {
      const itensComVendaId = itens.map((item) => ({
        ...item,
        vendaid: vendaId,
        vendaId: vendaId,
      }));
      await this.itemVendaService.criarMultiplos(itensComVendaId);
    }

    return vendaCriadaRes;
  }

  public async atualizar(id: number | string, venda: Partial<Venda>): Promise<ResultadoSupabase<Venda>> {
    const payload = { ...venda, vendaId: Number(id) };
    return await apiCliente.put<Venda>('/api/venda/put-venda', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Venda>> {
    return await apiCliente.delete<Venda>(`/api/venda/desativar-venda/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/venda/delete-venda/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const vendaService = new VendaService();
