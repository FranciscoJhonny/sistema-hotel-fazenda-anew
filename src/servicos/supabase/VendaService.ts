import { BaseService } from './BaseService';
import { Venda, ItemVenda } from '../../tipos';
import { ResultadoSupabase } from './types';
import { ItemVendaService } from './ItemVendaService';

export interface IVendaService {
  listar(filtros?: any): Promise<ResultadoSupabase<Venda[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Venda>>;
  obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Venda>>;
  listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Venda[]>>;
  criarComItens(venda: Partial<Venda>, itens: Partial<ItemVenda>[]): Promise<ResultadoSupabase<Venda>>;
  criar(venda: Partial<Venda>): Promise<ResultadoSupabase<Venda>>;
  atualizar(id: number | string, venda: Partial<Venda>): Promise<ResultadoSupabase<Venda>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Venda>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class VendaService extends BaseService<Venda> implements IVendaService {
  private itemVendaService: ItemVendaService;

  constructor() {
    super('venda', 'vendaid');
    this.itemVendaService = new ItemVendaService();
  }

  public async obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Venda>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('venda')
        .select('*')
        .eq('codigo', codigo)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Venda não encontrada com este código.' };

      return { sucesso: true, dados: data as unknown as Venda };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar venda por código' };
    }
  }

  public async listarPorReserva(reservaId: number | string): Promise<ResultadoSupabase<Venda[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('venda')
        .select('*')
        .eq('reservaId', reservaId)
        .eq('ativo', true)
        .order('dataHora', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Venda[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar vendas por reserva' };
    }
  }

  public async criarComItens(
    venda: Partial<Venda>,
    itens: Partial<ItemVenda>[]
  ): Promise<ResultadoSupabase<Venda>> {
    // 1. Criar cabeçalho da venda
    const vendaCriadaRes = await this.criar(venda);
    if (!vendaCriadaRes.sucesso || !vendaCriadaRes.dados) {
      return vendaCriadaRes;
    }

    const vendaId = vendaCriadaRes.dados.vendaid;

    // 2. Criar os itens vinculados
    if (itens.length > 0) {
      const itensComVendaId = itens.map((item) => ({
        ...item,
        vendaid: vendaId,
      }));

      const itensRes = await this.itemVendaService.criarMultiplos(itensComVendaId);
      if (!itensRes.sucesso) {
        console.warn('[VendaService] Venda criada mas houve erro ao salvar itens:', itensRes.erro);
      }
    }

    return vendaCriadaRes;
  }
}
