import { ConsumoExtra } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IConsumoExtraService {
  listar(filtros?: any): Promise<ResultadoSupabase<ConsumoExtra[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<ConsumoExtra>>;
  listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<ConsumoExtra[]>>;
  criar(consumo: Partial<ConsumoExtra>): Promise<ResultadoSupabase<ConsumoExtra>>;
  atualizar(id: number | string, consumo: Partial<ConsumoExtra>): Promise<ResultadoSupabase<ConsumoExtra>>;
  desativar(id: number | string): Promise<ResultadoSupabase<ConsumoExtra>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class ConsumoExtraService implements IConsumoExtraService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<ConsumoExtra[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<ConsumoExtra[]>('/api/consumo-extra/get-lista-consumo-extra', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<ConsumoExtra>> {
    return await apiCliente.get<ConsumoExtra>(`/api/consumo-extra/get-consumo-extra/${id}`);
  }

  public async listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<ConsumoExtra[]>> {
    return await apiCliente.get<ConsumoExtra[]>(`/api/consumo-extra/listar-por-reserva/${reservaId}`);
  }

  public async criar(consumo: Partial<ConsumoExtra>): Promise<ResultadoSupabase<ConsumoExtra>> {
    return await apiCliente.post<ConsumoExtra>('/api/consumo-extra/post-consumo-extra', consumo);
  }

  public async atualizar(id: number | string, consumo: Partial<ConsumoExtra>): Promise<ResultadoSupabase<ConsumoExtra>> {
    const payload = { ...consumo, consumoId: Number(id) };
    return await apiCliente.put<ConsumoExtra>('/api/consumo-extra/put-consumo-extra', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<ConsumoExtra>> {
    return await apiCliente.delete<ConsumoExtra>(`/api/consumo-extra/desativar-consumo-extra/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/consumo-extra/delete-consumo-extra/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const consumoExtraService = new ConsumoExtraService();
