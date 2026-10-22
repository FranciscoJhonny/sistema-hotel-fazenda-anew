import { Reserva, StatusReserva } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

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

/**
 * Enriquece o objeto de reserva para manter compatibilidade absoluta
 * com componentes que acessam relacionamentos aninhados (quarto/hospede)
 * ou propriedades achatadas (quartocategoria/hospedenome).
 */
function enriquecerReserva(r: any): Reserva {
  if (!r) return r;

  const categoria = r.quartoCategoria || r.quartocategoria || r.quarto?.categoria || '';
  const numero = r.quartoNumero || r.quartonumero || r.quarto?.numero || '';
  const codigoQuarto = r.quartoCodigo || r.quartocodigo || r.quarto?.codigoidentificador || '';
  const nomeHospede = r.hospedeNome || r.hospedenome || r.hospede?.nomecompleto || '';
  const telHospede = r.hospedeTelefone || r.hospedetelefone || r.hospede?.telefone || '';
  const emailHospede = r.hospedeEmail || r.hospedeemail || r.hospede?.email || '';

  return {
    ...r,
    reservaid: Number(r.reservaid || r.reservaId),
    reservaId: Number(r.reservaid || r.reservaId),
    quartoid: Number(r.quartoid || r.quartoId),
    quartoId: Number(r.quartoid || r.quartoId),
    hospedeid: Number(r.hospedeid || r.hospedeId),
    hospedeId: Number(r.hospedeid || r.hospedeId),
    statusreserva: r.statusreserva || r.statusReserva || 'PENDENTE',
    statusReserva: r.statusreserva || r.statusReserva || 'PENDENTE',
    valortotal: Number(r.valortotal !== undefined ? r.valortotal : (r.valorTotal || 0)),
    valorTotal: Number(r.valortotal !== undefined ? r.valortotal : (r.valorTotal || 0)),
    valorpago: Number(r.valorpago !== undefined ? r.valorpago : (r.valorPago || 0)),
    valorPago: Number(r.valorpago !== undefined ? r.valorpago : (r.valorPago || 0)),
    saldo: Number(r.saldo !== undefined ? r.saldo : 0),
    quartocategoria: categoria,
    quartoCategoria: categoria,
    quartonumero: numero,
    quartoNumero: numero,
    quartocodigo: codigoQuarto,
    quartoCodigo: codigoQuarto,
    hospedenome: nomeHospede,
    hospedeNome: nomeHospede,
    hospedetelefone: telHospede,
    hospedeTelefone: telHospede,
    hospedeemail: emailHospede,
    hospedeEmail: emailHospede,
    quarto: {
      categoria,
      numero,
      codigoidentificador: codigoQuarto,
    },
    hospede: {
      nomecompleto: nomeHospede,
      telefone: telHospede,
      email: emailHospede,
    },
  } as unknown as Reserva;
}

export class ReservaService implements IReservaService {
  /**
   * Lista todas as reservas ativas da API REST C# .NET 8 (/api/reserva/get-lista-reserva).
   */
  public async listar(filtros?: any): Promise<ResultadoSupabase<Reserva[]>> {
    const paramsApi: Record<string, any> = {};
    if (filtros?.dataInicio) paramsApi.dataInicio = filtros.dataInicio;
    if (filtros?.dataFim) paramsApi.dataFim = filtros.dataFim;

    const resApi = await apiCliente.get<any[]>('/api/reserva/get-lista-reserva', paramsApi);
    if (resApi.sucesso && Array.isArray(resApi.dados)) {
      return {
        ...resApi,
        dados: resApi.dados.map(enriquecerReserva),
      };
    }
    return {
      sucesso: resApi.sucesso,
      dados: [],
      erro: resApi.erro,
      statusHttp: resApi.statusHttp
    };
  }

  /**
   * Obtém uma reserva específica por ID.
   */
  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Reserva>> {
    const resApi = await apiCliente.get<any>(`/api/reserva/get-reserva/${id}`);
    if (resApi.sucesso && resApi.dados) {
      return {
        ...resApi,
        dados: enriquecerReserva(resApi.dados),
      };
    }
    return resApi;
  }

  /**
   * Obtém uma reserva pelo código identificador (ex: RES-037115).
   */
  public async obterPorCodigo(codigo: string): Promise<ResultadoSupabase<Reserva>> {
    const resApi = await apiCliente.get<any>(`/api/reserva/get-reserva-por-codigo/${encodeURIComponent(codigo)}`);
    if (resApi.sucesso && resApi.dados) {
      return {
        ...resApi,
        dados: enriquecerReserva(resApi.dados),
      };
    }
    return resApi;
  }

  /**
   * Lista reservas ativas de um quarto físico.
   */
  public async listarPorQuarto(quartoId: number | string): Promise<ResultadoSupabase<Reserva[]>> {
    const resApi = await apiCliente.get<any[]>(`/api/reserva/listar-por-quarto/${quartoId}`);
    if (resApi.sucesso && Array.isArray(resApi.dados)) {
      return {
        ...resApi,
        dados: resApi.dados.map(enriquecerReserva),
      };
    }
    return {
      sucesso: resApi.sucesso,
      dados: [],
      erro: resApi.erro,
      statusHttp: resApi.statusHttp
    };
  }

  /**
   * Lista reservas de um hóspede específico.
   */
  public async listarPorHospede(hospedeId: number | string): Promise<ResultadoSupabase<Reserva[]>> {
    const resApi = await apiCliente.get<any[]>(`/api/reserva/listar-por-hospede/${hospedeId}`);
    if (resApi.sucesso && Array.isArray(resApi.dados)) {
      return {
        ...resApi,
        dados: resApi.dados.map(enriquecerReserva),
      };
    }
    return {
      sucesso: resApi.sucesso,
      dados: [],
      erro: resApi.erro,
      statusHttp: resApi.statusHttp
    };
  }

  /**
   * Lista reservas sobrepostas a um determinado intervalo de datas.
   */
  public async listarPorPeriodo(dataInicio: string, dataFim: string): Promise<ResultadoSupabase<Reserva[]>> {
    return this.listar({ dataInicio, dataFim, apenasAtivos: true });
  }

  /**
   * Verifica conflito de agendamento de um quarto no período.
   */
  public async verificarConflito(
    quartoId: number,
    dataEntrada: string,
    dataSaida: string,
    reservaIdIgnorar?: number,
    tipoAtendimento?: string
  ): Promise<ResultadoSupabase<{ temConflito: boolean; motivo?: string; reservaConflitante?: any }>> {
    const payload = {
      quartoId: Number(quartoId),
      dataEntrada,
      dataSaida,
      reservaIdIgnorar: reservaIdIgnorar ? Number(reservaIdIgnorar) : null,
      tipoAtendimento: tipoAtendimento || 'HOSPEDAGEM',
    };
    return await apiCliente.post<any>('/api/reserva/verificar-conflito', payload);
  }

  /**
   * Calcula a disponibilidade de todos os quartos no período.
   */
  public async calcularDisponibilidadeQuartos(
    dataEntrada: string,
    dataSaida: string,
    reservaIdIgnorar?: number
  ): Promise<ResultadoSupabase<any[]>> {
    const params: Record<string, any> = { dataEntrada, dataSaida };
    if (reservaIdIgnorar) params.reservaIdIgnorar = reservaIdIgnorar;
    return await apiCliente.get<any[]>('/api/reserva/calcular-disponibilidade-quartos', params);
  }

  /**
   * Cria uma nova reserva.
   */
  public async criar(reserva: Partial<Reserva>): Promise<ResultadoSupabase<Reserva>> {
    const {
      quartocategoria,
      quartonumero,
      quartocodigo,
      hospedenome,
      hospedetelefone,
      hospedeemail,
      quarto,
      hospede,
      ...dadosLimpos
    } = reserva as any;

    const dataReserva = dadosLimpos.datareserva || dadosLimpos.dataReserva || new Date().toISOString();

    const payloadApi = {
      codigo: dadosLimpos.codigo || null,
      quartoId: Number(dadosLimpos.quartoid || dadosLimpos.quartoId),
      hospedeId: Number(dadosLimpos.hospedeid || dadosLimpos.hospedeId),
      cadastroId: dadosLimpos.cadastroid || dadosLimpos.cadastroId ? Number(dadosLimpos.cadastroid || dadosLimpos.cadastroId) : null,
      pacoteId: dadosLimpos.pacoteid || dadosLimpos.pacoteId ? Number(dadosLimpos.pacoteid || dadosLimpos.pacoteId) : null,
      dataEntrada: dadosLimpos.dataentrada || dadosLimpos.dataEntrada,
      dataSaida: dadosLimpos.datasaida || dadosLimpos.dataSaida,
      dataReserva: dataReserva,
      tipoAtendimento: dadosLimpos.tipoatendimento || dadosLimpos.tipoAtendimento || 'HOSPEDAGEM',
      statusReserva: dadosLimpos.statusreserva || dadosLimpos.statusReserva || 'PENDENTE',
      adultos: Number(dadosLimpos.adultos || 1),
      criancas: Number(dadosLimpos.criancas || 0),
      valorDiaria: Number(dadosLimpos.valordiaria || dadosLimpos.valorDiaria || 0),
      valorTotal: Number(dadosLimpos.valortotal || dadosLimpos.valorTotal || 0),
      valorPago: Number(dadosLimpos.valorpago || dadosLimpos.valorPago || 0),
      saldo: Number(dadosLimpos.saldo !== undefined ? dadosLimpos.saldo : (dadosLimpos.valortotal || dadosLimpos.valorTotal || 0) - (dadosLimpos.valorpago || dadosLimpos.valorPago || 0)),
      formaPagamento: dadosLimpos.formapagamento || dadosLimpos.formaPagamento || 'PIX',
      statusPagamento: dadosLimpos.statuspagamento || dadosLimpos.statusPagamento || 'PENDENTE',
      observacoes: dadosLimpos.observacoes || null,
      horarioPrevistoChegada: dadosLimpos.horarioprevistochegada || dadosLimpos.horarioPrevistoChegada || null,
      horarioPrevistoSaida: dadosLimpos.horarioprevistasaida || dadosLimpos.horarioPrevistoSaida || null,
    };

    const resApi = await apiCliente.post<any>('/api/reserva/post-reserva', payloadApi);
    if (resApi.sucesso && resApi.dados) {
      return {
        ...resApi,
        dados: enriquecerReserva(resApi.dados),
      };
    }
    return resApi;
  }

  /**
   * Atualiza uma reserva existente.
   */
  public async atualizar(id: number | string, reserva: Partial<Reserva>): Promise<ResultadoSupabase<Reserva>> {
    const {
      quartocategoria,
      quartonumero,
      quartocodigo,
      hospedenome,
      hospedetelefone,
      hospedeemail,
      quarto,
      hospede,
      ...dadosBanco
    } = reserva as any;

    const payloadApi: Record<string, any> = {
      reservaId: Number(id),
      ...dadosBanco,
    };
    if (dadosBanco.quartoid !== undefined) payloadApi.quartoId = Number(dadosBanco.quartoid);
    if (dadosBanco.hospedeid !== undefined) payloadApi.hospedeId = Number(dadosBanco.hospedeid);
    if (dadosBanco.cadastroid !== undefined) payloadApi.cadastroId = dadosBanco.cadastroid ? Number(dadosBanco.cadastroid) : null;
    if (dadosBanco.pacoteid !== undefined) payloadApi.pacoteId = dadosBanco.pacoteid ? Number(dadosBanco.pacoteid) : null;
    if (dadosBanco.dataentrada !== undefined) payloadApi.dataEntrada = dadosBanco.dataentrada;
    if (dadosBanco.datasaida !== undefined) payloadApi.dataSaida = dadosBanco.datasaida;
    if (dadosBanco.statusreserva !== undefined) payloadApi.statusReserva = dadosBanco.statusreserva;
    if (dadosBanco.tipoatendimento !== undefined) payloadApi.tipoAtendimento = dadosBanco.tipoatendimento;
    if (dadosBanco.valortotal !== undefined) payloadApi.valorTotal = Number(dadosBanco.valortotal);
    if (dadosBanco.valorpago !== undefined) payloadApi.valorPago = Number(dadosBanco.valorpago);
    if (dadosBanco.formapagamento !== undefined) payloadApi.formaPagamento = dadosBanco.formapagamento;
    if (dadosBanco.statuspagamento !== undefined) payloadApi.statusPagamento = dadosBanco.statuspagamento;
    if (dadosBanco.horarioprevistochegada !== undefined) payloadApi.horarioPrevistoChegada = dadosBanco.horarioprevistochegada;
    if (dadosBanco.horarioprevistasaida !== undefined) payloadApi.horarioPrevistoSaida = dadosBanco.horarioprevistasaida;

    const resApi = await apiCliente.put<any>('/api/reserva/put-reserva', payloadApi);
    if (resApi.sucesso && resApi.dados) {
      return {
        ...resApi,
        dados: enriquecerReserva(resApi.dados),
      };
    }
    return resApi;
  }

  /**
   * Atualiza o status da reserva.
   */
  public async atualizarStatus(id: number | string, status: StatusReserva): Promise<ResultadoSupabase<Reserva>> {
    if (status === 'CANCELADA') {
      const resApi = await apiCliente.patch<any>(`/api/reserva/cancelar-reserva/${id}`);
      if (resApi.sucesso && resApi.dados) {
        return { ...resApi, dados: enriquecerReserva(resApi.dados) };
      }
    }
    return this.atualizar(id, { statusreserva: status });
  }

  /**
   * Realiza o check-in do hóspede na reserva.
   */
  public async realizarCheckin(id: number | string, usuario: string): Promise<ResultadoSupabase<Reserva>> {
    const resApi = await apiCliente.patch<any>(`/api/reserva/checkin/${id}`, { usuario });
    if (resApi.sucesso && resApi.dados) {
      return { ...resApi, dados: enriquecerReserva(resApi.dados) };
    }
    return this.atualizar(id, {
      statusreserva: 'HOSPEDADO',
      checkoutrealizadoem: new Date().toISOString(),
      checkinusuario: usuario,
    });
  }

  /**
   * Realiza o check-out do hóspede na reserva.
   */
  public async realizarCheckout(id: number | string, usuario: string): Promise<ResultadoSupabase<Reserva>> {
    const resApi = await apiCliente.patch<any>(`/api/reserva/checkout/${id}`, { usuario });
    if (resApi.sucesso && resApi.dados) {
      return { ...resApi, dados: enriquecerReserva(resApi.dados) };
    }
    return this.atualizar(id, {
      statusreserva: 'CONCLUIDA',
      checkoutrealizadoem: new Date().toISOString(),
      checkoutusuario: usuario,
    });
  }

  /**
   * Desativa/cancela uma reserva.
   */
  public async desativar(id: number | string): Promise<ResultadoSupabase<Reserva>> {
    const resApi = await apiCliente.patch<any>(`/api/reserva/cancelar-reserva/${id}`);
    if (resApi.sucesso && resApi.dados) {
      return { ...resApi, dados: enriquecerReserva(resApi.dados) };
    }
    return this.atualizar(id, { ativo: false });
  }

  /**
   * Exclui permanentemente uma reserva.
   */
  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/reserva/delete-reserva/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const reservaService = new ReservaService();
