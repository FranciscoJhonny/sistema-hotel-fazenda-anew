import { BaseService } from './BaseService';
import { Pagamento } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IPagamentoService {
  listar(filtros?: any): Promise<ResultadoSupabase<Pagamento[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Pagamento>>;
  listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Pagamento[]>>;
  criar(pagamento: Partial<Pagamento>): Promise<ResultadoSupabase<Pagamento>>;
  atualizar(id: number | string, pagamento: Partial<Pagamento>): Promise<ResultadoSupabase<Pagamento>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Pagamento>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class PagamentoService extends BaseService<Pagamento> implements IPagamentoService {
  constructor() {
    super('Pagamento', 'PagamentoId');
  }

  public async listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Pagamento[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Pagamento')
        .select('*')
        .eq('ReservaId', reservaId)
        .eq('Ativo', true)
        .order('DataPagamento', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Pagamento[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar pagamentos por reserva' };
    }
  }
}
