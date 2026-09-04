import { BaseService } from './BaseService';
import { Quarto, StatusQuarto } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IQuartoService {
  listar(filtros?: any): Promise<ResultadoSupabase<Quarto[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Quarto>>;
  obterPorNumero(numero: string): Promise<ResultadoSupabase<Quarto>>;
  obterPorCodigo(codigoIdentificador: string): Promise<ResultadoSupabase<Quarto>>;
  atualizarStatus(id: number | string, status: StatusQuarto, motivo?: string): Promise<ResultadoSupabase<Quarto>>;
  criar(quarto: Partial<Quarto>): Promise<ResultadoSupabase<Quarto>>;
  atualizar(id: number | string, quarto: Partial<Quarto>): Promise<ResultadoSupabase<Quarto>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Quarto>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class QuartoService extends BaseService<Quarto> implements IQuartoService {
  constructor() {
    super('quarto', 'quartoid');
  }

  public async obterPorNumero(numero: string): Promise<ResultadoSupabase<Quarto>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('quarto')
        .select('*')
        .eq('numero', numero)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Quarto não encontrado.' };

      return { sucesso: true, dados: data as unknown as Quarto };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar quarto por número' };
    }
  }

  public async obterPorCodigo(codigoIdentificador: string): Promise<ResultadoSupabase<Quarto>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('quarto')
        .select('*')
        .eq('codigoIdentificador', codigoIdentificador)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Quarto não encontrado.' };

      return { sucesso: true, dados: data as unknown as Quarto };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar quarto por código' };
    }
  }

  public async atualizarStatus(
    id: number | string,
    status: StatusQuarto,
    motivo?: string
  ): Promise<ResultadoSupabase<Quarto>> {
    return this.atualizar(id, {
      status: status,
      descricao: motivo || '',
    });
  }
}
