import { BaseService } from './BaseService';
import { Hospede } from '../../tipos';
import { ResultadoSupabase } from './types';

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

export class HospedeService extends BaseService<Hospede> implements IHospedeService {
  constructor() {
    super('Hospede', 'HospedeId');
  }

  public async obterPorCpf(cpf: string): Promise<ResultadoSupabase<Hospede>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const { data, error } = await client
        .from('Hospede')
        .select('*')
        .eq('Cpf', cpfLimpo)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Hóspede não encontrado para este CPF.' };

      return { sucesso: true, dados: data as unknown as Hospede };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar hóspede por CPF' };
    }
  }

  public async buscarPorNome(termo: string): Promise<ResultadoSupabase<Hospede[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Hospede')
        .select('*')
        .ilike('NomeCompleto', `%${termo}%`)
        .eq('Ativo', true)
        .order('NomeCompleto', { ascending: true })
        .limit(20);

      if (error) return { sucesso: false, erro: error.message };

      return { sucesso: true, dados: (data as unknown as Hospede[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar hóspedes por nome' };
    }
  }
}
