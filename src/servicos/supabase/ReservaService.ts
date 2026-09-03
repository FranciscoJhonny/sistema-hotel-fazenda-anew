import { BaseService } from './BaseService';
import { Reserva, StatusReserva } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IReservaService {
  listar(filtros?: any): Promise<ResultadoSupabase<Reserva[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Reserva>>;
  obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Reserva>>;
  listarPorQuarto(quartoId: number | string): Promise<ResultadoSupabase<Reserva[]>>;
  listarPorHospede(hospedeId: number | string): Promise<ResultadoSupabase<Reserva[]>>;
  listarPorPeriodo(dataInicio: string, dataFim: string): Promise<ResultadoSupabase<Reserva[]>>;
  atualizarStatus(id: number | string, status: StatusReserva): Promise<ResultadoSupabase<Reserva>>;
  realizarCheckin(id: number | string, usuarioNomeOuId: string): Promise<ResultadoSupabase<Reserva>>;
  realizarCheckout(id: number | string, usuarioNomeOuId: string): Promise<ResultadoSupabase<Reserva>>;
  criar(reserva: Partial<Reserva>): Promise<ResultadoSupabase<Reserva>>;
  atualizar(id: number | string, reserva: Partial<Reserva>): Promise<ResultadoSupabase<Reserva>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Reserva>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class ReservaService extends BaseService<Reserva> implements IReservaService {
  constructor() {
    super('Reserva', 'ReservaId');
  }

  public async obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Reserva>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Reserva')
        .select('*')
        .eq('Codigo', codigo)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Reserva não encontrada com este código.' };

      return { sucesso: true, dados: data as unknown as Reserva };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar reserva por código' };
    }
  }

  public async listarPorQuarto(quartoId: number | string): Promise<ResultadoSupabase<Reserva[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Reserva')
        .select('*')
        .eq('QuartoId', quartoId)
        .eq('Ativo', true)
        .order('DataEntrada', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Reserva[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar reservas por quarto' };
    }
  }

  public async listarPorHospede(hospedeId: number | string): Promise<ResultadoSupabase<Reserva[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Reserva')
        .select('*')
        .eq('HospedeId', hospedeId)
        .eq('Ativo', true)
        .order('DataEntrada', { ascending: false });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Reserva[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar reservas por hóspede' };
    }
  }

  public async listarPorPeriodo(dataInicio: string, dataFim: string): Promise<ResultadoSupabase<Reserva[]>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('Reserva')
        .select('*')
        .eq('Ativo', true)
        .gte('DataSaida', dataInicio)
        .lte('DataEntrada', dataFim)
        .order('DataEntrada', { ascending: true });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Reserva[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar reservas por período' };
    }
  }

  public async atualizarStatus(id: number | string, status: StatusReserva): Promise<ResultadoSupabase<Reserva>> {
    return this.atualizar(id, { status: status });
  }

  public async realizarCheckin(id: number | string, usuario: string): Promise<ResultadoSupabase<Reserva>> {
    return this.atualizar(id, {
      status: 'HOSPEDADO',
      checkoutrealizadoem: new Date().toISOString(),
      checkinusuario: usuario,
    });
  }

  public async realizarCheckout(id: number | string, usuario: string): Promise<ResultadoSupabase<Reserva>> {
    return this.atualizar(id, {
      status: 'FINALIZADA',
      checkoutrealizadoem: new Date().toISOString(),
      checkoutusuario: usuario,
    });
  }
}
