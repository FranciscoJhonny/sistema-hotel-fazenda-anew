import { Pagamento } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IPagamentoService {
  listar(filtros?: any): Promise<ResultadoSupabase<Pagamento[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Pagamento>>;
  listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Pagamento[]>>;
  criar(pagamento: Partial<Pagamento>): Promise<ResultadoSupabase<Pagamento>>;
  atualizar(id: number | string, pagamento: Partial<Pagamento>): Promise<ResultadoSupabase<Pagamento>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Pagamento>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class PagamentoService implements IPagamentoService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Pagamento[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Pagamento[]>('/api/pagamento/get-lista-pagamento', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Pagamento>> {
    return await apiCliente.get<Pagamento>(`/api/pagamento/get-pagamento/${id}`);
  }

  public async listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Pagamento[]>> {
    return await apiCliente.get<Pagamento[]>(`/api/pagamento/listar-por-reserva/${reservaId}`);
  }

  public async criar(pagamento: Partial<Pagamento>): Promise<ResultadoSupabase<Pagamento>> {
    return await apiCliente.post<Pagamento>('/api/pagamento/post-pagamento', pagamento);
  }

  public async atualizar(id: number | string, pagamento: Partial<Pagamento>): Promise<ResultadoSupabase<Pagamento>> {
    const payload = { ...pagamento, pagamentoId: Number(id) };
    return await apiCliente.put<Pagamento>('/api/pagamento/put-pagamento', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Pagamento>> {
    return await apiCliente.delete<Pagamento>(`/api/pagamento/desativar-pagamento/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/pagamento/delete-pagamento/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const pagamentoService = new PagamentoService();
