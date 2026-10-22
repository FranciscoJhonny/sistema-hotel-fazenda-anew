import { Quarto, StatusQuarto } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IQuartoService {
  listar(filtros?: any): Promise<ResultadoSupabase<Quarto[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Quarto>>;
  obterPorNumero(numero: string): Promise<ResultadoSupabase<Quarto>>;
  obterPorCodigo(codigoIdentificador: string): Promise<ResultadoSupabase<Quarto>>;
  atualizarStatus(id: number | string, status: StatusQuarto, motivo?: string): Promise<ResultadoSupabase<Quarto>>;
  criar(quarto: Partial<Quarto>): Promise<ResultadoSupabase<Quarto>>;
  atualizar(id: number | string, quarto: Partial<Quarto>): Promise<ResultadoSupabase<Quarto>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Quarto>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class QuartoService implements IQuartoService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Quarto[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Quarto[]>('/api/quarto/get-lista-quarto', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Quarto>> {
    return await apiCliente.get<Quarto>(`/api/quarto/get-quarto/${id}`);
  }

  public async obterPorNumero(numero: string): Promise<ResultadoSupabase<Quarto>> {
    return await apiCliente.get<Quarto>(`/api/quarto/get-quarto-por-numero/${encodeURIComponent(numero)}`);
  }

  public async obterPorCodigo(codigoIdentificador: string): Promise<ResultadoSupabase<Quarto>> {
    return await apiCliente.get<Quarto>(`/api/quarto/get-quarto-por-codigo/${encodeURIComponent(codigoIdentificador)}`);
  }

  public async criar(quarto: Partial<Quarto>): Promise<ResultadoSupabase<Quarto>> {
    return await apiCliente.post<Quarto>('/api/quarto/post-quarto', quarto);
  }

  public async atualizar(id: number | string, quarto: Partial<Quarto>): Promise<ResultadoSupabase<Quarto>> {
    const payload = {
      ...quarto,
      quartoId: Number(id),
      quartoid: Number(id)
    };
    return await apiCliente.put<Quarto>('/api/quarto/put-quarto', payload);
  }

  public async atualizarStatus(
    id: number | string,
    status: StatusQuarto,
    motivo?: string
  ): Promise<ResultadoSupabase<Quarto>> {
    return await apiCliente.patch<Quarto>(`/api/quarto/atualizar-status/${id}`, {
      status,
      motivo: motivo || ''
    });
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Quarto>> {
    return await apiCliente.delete<Quarto>(`/api/quarto/desativar-quarto/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/quarto/delete-quarto/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const quartoService = new QuartoService();
