import { Pacote } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IPacoteService {
  listar(filtros?: any): Promise<ResultadoSupabase<Pacote[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Pacote>>;
  criar(pacote: Partial<Pacote>): Promise<ResultadoSupabase<Pacote>>;
  atualizar(id: number | string, pacote: Partial<Pacote>): Promise<ResultadoSupabase<Pacote>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Pacote>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class PacoteService implements IPacoteService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Pacote[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Pacote[]>('/api/pacote/get-lista-pacote', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Pacote>> {
    return await apiCliente.get<Pacote>(`/api/pacote/get-pacote/${id}`);
  }

  public async criar(pacote: Partial<Pacote>): Promise<ResultadoSupabase<Pacote>> {
    return await apiCliente.post<Pacote>('/api/pacote/post-pacote', pacote);
  }

  public async atualizar(id: number | string, pacote: Partial<Pacote>): Promise<ResultadoSupabase<Pacote>> {
    const payload = { ...pacote, pacoteId: Number(id) };
    return await apiCliente.put<Pacote>('/api/pacote/put-pacote', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Pacote>> {
    return await apiCliente.delete<Pacote>(`/api/pacote/desativar-pacote/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/pacote/delete-pacote/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const pacoteService = new PacoteService();
