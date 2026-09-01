import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './SupabaseService';
import { ResultadoSupabase, FiltrosConsulta } from './types';

export abstract class BaseService<T, ID = number | string> {
  protected nomeTabela: string;
  protected campoChavePrimaria: string;
  protected supabaseService: SupabaseService;

  constructor(nomeTabela: string, campoChavePrimaria: string = `${nomeTabela}Id`) {
    this.nomeTabela = nomeTabela;
    this.campoChavePrimaria = campoChavePrimaria;
    this.supabaseService = SupabaseService.getInstance();
  }

  protected getClient(): SupabaseClient | null {
    return this.supabaseService.getClient();
  }

  public async listar(filtros?: FiltrosConsulta): Promise<ResultadoSupabase<T[]>> {
    const client = this.getClient();
    if (!client) {
      return {
        sucesso: false,
        erro: 'Supabase não conectado. Configure a URL e Anon Key nas configurações.',
      };
    }

    try {
      let query = client.from(this.nomeTabela).select('*', { count: 'exact' });

      if (filtros?.apenasAtivos !== false) {
        query = query.eq('Ativo', true);
      }

      if (filtros?.ordenarPor) {
        query = query.order(filtros.ordenarPor, {
          ascending: filtros.ordemAscendente ?? true,
        });
      } else {
        query = query.order(this.campoChavePrimaria, { ascending: true });
      }

      if (filtros?.limite) {
        query = query.limit(filtros.limite);
      }

      if (filtros?.offset) {
        query = query.range(
          filtros.offset,
          filtros.offset + (filtros.limite || 10) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      return {
        sucesso: true,
        dados: (data as unknown as T[]) || [],
        total: count ?? (data?.length || 0),
      };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro inesperado na listagem' };
    }
  }

  public async obterPorId(id: ID): Promise<ResultadoSupabase<T>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const { data, error } = await client
        .from(this.nomeTabela)
        .select('*')
        .eq(this.campoChavePrimaria, id)
        .single();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      return { sucesso: true, dados: data as unknown as T };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar registro' };
    }
  }

  public async criar(item: Partial<T>): Promise<ResultadoSupabase<T>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const dadosParaInserir = {
        ...item,
        Ativo: (item as any).Ativo ?? true,
        DataInclusao: new Date().toISOString(),
        DataOperacao: new Date().toISOString(),
        NaturezaOperacao: 'INSERT',
      };

      const { data, error } = await client
        .from(this.nomeTabela)
        .insert(dadosParaInserir)
        .select()
        .single();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      return { sucesso: true, dados: data as unknown as T };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao criar registro' };
    }
  }

  public async atualizar(id: ID, item: Partial<T>): Promise<ResultadoSupabase<T>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const dadosParaAtualizar = {
        ...item,
        DataOperacao: new Date().toISOString(),
        NaturezaOperacao: 'UPDATE',
      };

      const { data, error } = await client
        .from(this.nomeTabela)
        .update(dadosParaAtualizar)
        .eq(this.campoChavePrimaria, id)
        .select()
        .single();

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      return { sucesso: true, dados: data as unknown as T };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao atualizar registro' };
    }
  }

  public async excluir(id: ID): Promise<ResultadoSupabase<boolean>> {
    const client = this.getClient();
    if (!client) {
      return { sucesso: false, erro: 'Supabase não conectado.' };
    }

    try {
      const { error } = await client
        .from(this.nomeTabela)
        .delete()
        .eq(this.campoChavePrimaria, id);

      if (error) {
        return { sucesso: false, erro: error.message };
      }

      return { sucesso: true, dados: true };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao excluir registro' };
    }
  }

  public async desativar(id: ID): Promise<ResultadoSupabase<T>> {
    return this.atualizar(id, {
      Ativo: false,
      NaturezaOperacao: 'DELETE',
    } as unknown as Partial<T>);
  }
}
