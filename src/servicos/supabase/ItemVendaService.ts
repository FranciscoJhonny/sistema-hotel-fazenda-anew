import { BaseService } from './BaseService';
import { ItemVenda } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IItemVendaService {
  listar(filtros?: any): Promise<ResultadoSupabase<ItemVenda[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<ItemVenda>>;
  listarPorVenda(vendaId: number | string): Promise<ResultadoSupabase<ItemVenda[]>>;
  criar(item: Partial<ItemVenda>): Promise<ResultadoSupabase<ItemVenda>>;
  criarMultiplos(itens: Partial<ItemVenda>[]): Promise<ResultadoSupabase<ItemVenda[]>>;
  atualizar(id: number | string, item: Partial<ItemVenda>): Promise<ResultadoSupabase<ItemVenda>>;
  desativar(id: number | string): Promise<ResultadoSupabase<ItemVenda>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class ItemVendaService extends BaseService<ItemVenda> implements IItemVendaService {
  constructor() {
    super('ItemVenda', 'ItemVendaId');
  }

  public async listarPorVenda(vendaId: number | string): Promise<ResultadoSupabase<ItemVenda[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('ItemVenda')
        .select('*')
        .eq('VendaId', vendaId)
        .eq('Ativo', true);

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as ItemVenda[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar itens da venda' };
    }
  }

  public async criarMultiplos(itens: Partial<ItemVenda>[]): Promise<ResultadoSupabase<ItemVenda[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const itensFormatados = itens.map((item) => ({
        ...item,
        Ativo: (item as any).Ativo ?? true,
        DataInclusao: new Date().toISOString(),
        DataOperacao: new Date().toISOString(),
        NaturezaOperacao: 'INSERT',
      }));

      const { data, error } = await client
        .from('ItemVenda')
        .insert(itensFormatados)
        .select();

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as ItemVenda[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao inserir itens da venda' };
    }
  }
}
