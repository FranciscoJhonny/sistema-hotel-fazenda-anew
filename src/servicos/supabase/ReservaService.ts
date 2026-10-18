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
    super('reserva', 'reservaid');
  }

  public override async criar(reserva: Partial<Reserva>): Promise<ResultadoSupabase<Reserva>> {
    const { quartocategoria, quartonumero, quartocodigo, hospedenome, hospedetelefone, hospedeemail, quarto, ...dadosLimpos } = reserva as any;
    const dataReserva = dadosLimpos.datareserva || new Date().toISOString().slice(0, 10);
    const dados = {
      ...dadosLimpos,
      datareserva: dataReserva,
    };
    const res = await super.criar(dados);
    if (!res.sucesso && res.erro?.toLowerCase().includes('datareserva')) {
      const { datareserva: _, ...semDataReserva } = dados;
      return super.criar(semDataReserva);
    }
    return res;
  }

  public override async atualizar(id: number | string, reserva: Partial<Reserva>): Promise<ResultadoSupabase<Reserva>> {
    const { quartocategoria, quartonumero, quartocodigo, hospedenome, hospedetelefone, hospedeemail, quarto, ...dadosBanco } = reserva as any;
    return super.atualizar(id, dadosBanco);
  }

  public async obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Reserva>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('reserva')
        .select('*, quarto:quartoid(categoria, numero, codigoidentificador)')
        .eq('codigo', codigo)
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
        .from('reserva')
        .select('*, quarto:quartoid(categoria, numero, codigoidentificador)')
        .eq('quartoid', quartoId)
        .eq('ativo', true)
        .order('dataentrada', { ascending: false });

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
        .from('reserva')
        .select('*, quarto:quartoid(categoria, numero, codigoidentificador)')
        .eq('hospedeid', hospedeId)
        .eq('ativo', true)
        .order('dataentrada', { ascending: false });

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
        .from('reserva')
        .select('*, quarto:quartoid(categoria, numero, codigoidentificador)')
        .eq('ativo', true)
        .gte('datasaida', dataInicio)
        .lte('dataentrada', dataFim)
        .order('dataentrada', { ascending: true });

      if (error) return { sucesso: false, erro: error.message };
      return { sucesso: true, dados: (data as unknown as Reserva[]) || [] };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao listar reservas por período' };
    }
  }

  public async atualizarStatus(id: number | string, status: StatusReserva): Promise<ResultadoSupabase<Reserva>> {
    return this.atualizar(id, { statusreserva: status });
  }

  public async realizarCheckin(id: number | string, usuario: string): Promise<ResultadoSupabase<Reserva>> {
    return this.atualizar(id, {
      statusreserva: 'HOSPEDADO',
      checkoutrealizadoem: new Date().toISOString(),
      checkinusuario: usuario,
    });
  }

  public async realizarCheckout(id: number | string, usuario: string): Promise<ResultadoSupabase<Reserva>> {
    return this.atualizar(id, {
      statusreserva: 'CONCLUIDA',
      checkoutrealizadoem: new Date().toISOString(),
      checkoutusuario: usuario,
    });
  }
}
