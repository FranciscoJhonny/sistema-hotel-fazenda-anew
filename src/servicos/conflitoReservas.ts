import { Quarto, Reserva, StatusQuarto } from '../tipos';

/**
 * Helper para normalizar os dados da reserva, 
 * evitando erros de Case Sensitivity (maiúsculas/minúsculas) vindos do banco.
 */
const normalizarReserva = (res: any) => ({
  quartoid: res.quartoid ?? res.QuartoId ?? res.QUARTOID,
  statusreserva: (res.statusreserva ?? res.status ?? res.Status ?? res.STATUS ?? '').toUpperCase(),
  reservaid: res.reservaid ?? res.ReservaId ?? res.RESERVAID,
  codigo: res.codigo ?? res.Codigo ?? res.CODIGO,
  hospedenome: res.hospedenome ?? res.HospedeNome ?? res.HOSPEDENOME,
  dataentrada: res.dataentrada ?? res.DataEntrada ?? res.DATAENTRADA,
  datasaida: res.datasaida ?? res.DataSaida ?? res.DATASAIDA,
});

/**
 * Verifica se dois intervalos de datas possuem sobreposição.
 */
export function verificarSobreposicaoDatas(
  inicioA: string,
  fimA: string,
  inicioB: string,
  fimB: string
): boolean {
  if (!inicioA || !fimA || !inicioB || !fimB) return false;

  const dataInicioA = new Date(inicioA + 'T00:00:00').getTime();
  const dataFimA = new Date(fimA + 'T00:00:00').getTime();
  const dataInicioB = new Date(inicioB + 'T00:00:00').getTime();
  const dataFimB = new Date(fimB + 'T00:00:00').getTime();

  if (dataInicioA >= dataFimA || dataInicioB >= dataFimB) {
    return true; // Bloqueia datas inválidas
  }

  return dataInicioA < dataFimB && dataFimA > dataInicioB;
}

export interface ResultadoVerificacaoConflito {
  temConflito: boolean;
  motivo?: string;
  reservaConflitante?: any;
}

/**
 * Valida se um quarto pode receber uma nova reserva no período especificado.
 */
export function verificarConflitoQuarto(
  quartoId: number | string,
  dataEntrada: string,
  dataSaida: string,
  reservasExistentes: any[],
  reservaIdIgnorar?: number | string
): ResultadoVerificacaoConflito {
  if (!dataEntrada || !dataSaida) {
    return { temConflito: false };
  }

  const dEntrada = new Date(dataEntrada + 'T00:00:00');
  const dSaida = new Date(dataSaida + 'T00:00:00');

  if (dEntrada >= dSaida) {
    return {
      temConflito: true,
      motivo: 'A data de saída deve ser posterior à data de entrada.',
    };
  }

  const reservasDoQuarto = reservasExistentes.filter((res: any) => {
    const r = normalizarReserva(res);
    return (
      String(r.quartoid) === String(quartoId) &&
      r.statusreserva !== 'CANCELADA' &&
      r.statusreserva !== 'FINALIZADA' &&
      String(r.reservaid) !== String(reservaIdIgnorar)
    );
  });

  for (const res of reservasDoQuarto) {
    const r = normalizarReserva(res);
    
    const sobrepoe = verificarSobreposicaoDatas(
      dataEntrada,
      dataSaida,
      r.dataentrada,
      r.datasaida
    );

    if (sobrepoe) {
      return {
        temConflito: true,
        motivo: `Conflito com a reserva ${r.codigo} (${r.hospedenome}) de ${r.dataentrada} até ${r.datasaida}.`,
        reservaConflitante: res,
      };
    }
  }

  return { temConflito: false };
}

export interface StatusDisponibilidadeQuarto {
  quarto: any;
  disponivel: boolean;
  motivoIndisponibilidade?: string;
  statusCalculado: StatusQuarto;
  reservaConflitante?: any;
}

/**
 * Calcula a disponibilidade em tempo real dos quartos para um período determinado.
 * ⚠️ ESTA É A FUNÇÃO QUE ESTAVA DANDO ERRO DE EXPORTAÇÃO.
 */
export function calcularDisponibilidadeQuartos(
  quartos: any[],
  reservas: any[],
  dataEntrada?: string,
  dataSaida?: string,
  reservaIdIgnorar?: number | string
): StatusDisponibilidadeQuarto[] {
  return quartos.map((quarto: any) => {
    const qId = quarto.quartoid ?? quarto.QuartoId ?? quarto.QUARTOID;
    const qStatus = (quarto.status ?? quarto.Status ?? quarto.STATUS ?? '').toUpperCase();
    const qMotivo = quarto.motivobloqueio ?? quarto.MotivoBloqueio ?? quarto.MOTIVOBLOQUEIO;

    if (qStatus === 'MANUTENCAO') {
      return {
        quarto,
        disponivel: false,
        motivoIndisponibilidade: qMotivo ? `Quarto em manutenção: ${qMotivo}` : 'Quarto em manutenção programada',
        statusCalculado: 'MANUTENCAO' as StatusQuarto,
      };
    }

    if (!dataEntrada || !dataSaida) {
      return {
        quarto,
        disponivel: qStatus === 'DISPONIVEL',
        statusCalculado: qStatus as StatusQuarto,
      };
    }

    const resultado = verificarConflitoQuarto(
      qId,
      dataEntrada,
      dataSaida,
      reservas,
      reservaIdIgnorar
    );

    if (resultado.temConflito) {
      return {
        quarto,
        disponivel: false,
        motivoIndisponibilidade: resultado.motivo,
        statusCalculado: 'RESERVADO' as StatusQuarto,
        reservaConflitante: resultado.reservaConflitante,
      };
    }

    return {
      quarto,
      disponivel: true,
      statusCalculado: 'DISPONIVEL' as StatusQuarto,
    };
  });
}