import { Hospede } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IHospedeService {
  listar(filtros?: any): Promise<ResultadoSupabase<Hospede[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Hospede>>;
  obterPorCpf(cpf: string): Promise<ResultadoSupabase<Hospede>>;
  buscarPorNome(nome: string): Promise<ResultadoSupabase<Hospede[]>>;
  criar(hospede: Partial<Hospede>): Promise<ResultadoSupabase<Hospede>>;
  atualizar(id: number | string, hospede: Partial<Hospede>): Promise<ResultadoSupabase<Hospede>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Hospede>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class HospedeService implements IHospedeService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Hospede[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Hospede[]>('/api/hospede/get-lista-hospede', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Hospede>> {
    return await apiCliente.get<Hospede>(`/api/hospede/get-hospede/${id}`);
  }

  public async obterPorCpf(cpf: string): Promise<ResultadoSupabase<Hospede>> {
    const cpfLimpo = cpf.replace(/\D/g, '');
    return await apiCliente.get<Hospede>(`/api/hospede/get-hospede-por-cpf/${cpfLimpo}`);
  }

  public async buscarPorNome(termo: string): Promise<ResultadoSupabase<Hospede[]>> {
    return await apiCliente.get<Hospede[]>('/api/hospede/buscar-por-nome', { nome: termo });
  }

  public async criar(hospede: Partial<Hospede>): Promise<ResultadoSupabase<Hospede>> {
    return await apiCliente.post<Hospede>('/api/hospede/post-hospede', hospede);
  }

  public async atualizar(id: number | string, hospede: Partial<Hospede>): Promise<ResultadoSupabase<Hospede>> {
    const payload = {
      ...hospede,
      hospedeId: Number(id),
      hospedeid: Number(id)
    };
    return await apiCliente.put<Hospede>('/api/hospede/put-hospede', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Hospede>> {
    return await apiCliente.patch<Hospede>(`/api/hospede/desativar-hospede/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/hospede/delete-hospede/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const hospedeService = new HospedeService();
