import { BaseService } from './BaseService';
import { Pacote } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IPacoteService {
  listar(filtros?: any): Promise<ResultadoSupabase<Pacote[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Pacote>>;
  criar(pacote: Partial<Pacote>): Promise<ResultadoSupabase<Pacote>>;
  atualizar(id: number | string, pacote: Partial<Pacote>): Promise<ResultadoSupabase<Pacote>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Pacote>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class PacoteService extends BaseService<Pacote> implements IPacoteService {
  constructor() {
    super('pacote', 'pacoteid');
  }
}
