import { BaseService } from './BaseService';
import { ConsumoExtra } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IConsumoExtraService {
  listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<ConsumoExtra[]>>;
  criar(consumo: Partial<ConsumoExtra>): Promise<ResultadoSupabase<ConsumoExtra>>;
  desativar(id: number | string): Promise<ResultadoSupabase<ConsumoExtra>>;
}

export class ConsumoExtraService extends BaseService<ConsumoExtra> implements IConsumoExtraService {
  constructor() {
    super('consumo_extra', 'consumoid');
  }

  public async listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<ConsumoExtra[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    const { data, error } = await client
      .from(this.nomeTabela)
      .select('*')
      .eq('reservaid', reservaId)
      .eq('ativo', true)
      .order('dataconsumo', { ascending: false });

    if (error) return { sucesso: false, erro: error.message };
    return { sucesso: true, dados: (data || []) as ConsumoExtra[] };
  }
}