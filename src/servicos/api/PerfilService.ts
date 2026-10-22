import { Perfil } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

export interface IPerfilService {
  listar(filtros?: any): Promise<ResultadoSupabase<Perfil[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Perfil>>;
  criar(perfil: Partial<Perfil>): Promise<ResultadoSupabase<Perfil>>;
  atualizar(id: number | string, perfil: Partial<Perfil>): Promise<ResultadoSupabase<Perfil>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Perfil>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class PerfilService implements IPerfilService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Perfil[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Perfil[]>('/api/perfil/get-lista-perfil', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Perfil>> {
    return await apiCliente.get<Perfil>(`/api/perfil/get-perfil/${id}`);
  }

  public async criar(perfil: Partial<Perfil>): Promise<ResultadoSupabase<Perfil>> {
    return await apiCliente.post<Perfil>('/api/perfil/post-perfil', perfil);
  }

  public async atualizar(id: number | string, perfil: Partial<Perfil>): Promise<ResultadoSupabase<Perfil>> {
    const payload = { ...perfil, perfilId: Number(id) };
    return await apiCliente.put<Perfil>('/api/perfil/put-perfil', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Perfil>> {
    return await apiCliente.delete<Perfil>(`/api/perfil/desativar-perfil/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/perfil/delete-perfil/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const perfilService = new PerfilService();
