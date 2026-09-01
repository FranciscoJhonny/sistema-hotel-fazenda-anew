import { BaseService } from './BaseService';
import { Perfil } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IPerfilService {
  listar(filtros?: any): Promise<ResultadoSupabase<Perfil[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Perfil>>;
  criar(perfil: Partial<Perfil>): Promise<ResultadoSupabase<Perfil>>;
  atualizar(id: number | string, perfil: Partial<Perfil>): Promise<ResultadoSupabase<Perfil>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Perfil>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class PerfilService extends BaseService<Perfil> implements IPerfilService {
  constructor() {
    super('Perfil', 'PerfilId');
  }
}
