import { Quarto, Reserva, StatusQuarto } from '../tipos';

/**
 * Verifica se dois intervalos de datas [inicioA, fimA] e [inicioB, fimB] possuem sobreposição.
 * No contexto hoteleiro:
 * Uma reserva de 05/09 a 07/09 tem diárias nos dias 05 e 06, com check-out em 07/09.
 * Portanto:
 * Conflito ocorre quando (inicioA < fimB) && (fimA > inicioB).
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

  // Se data início for maior ou igual ao fim, datas inválidas
  if (dataInicioA >= dataFimA || dataInicioB >= dataFimB) {
    return true; // Bloqueia datas inválidas
  }

  // Sobreposição de período
  return dataInicioA < dataFimB && dataFimA > dataInicioB;
}

export interface ResultadoVerificacaoConflito {
  temConflito: boolean;
  motivo?: string;
  reservaConflitante?: Reserva;
}

/**
 * Valida se um quarto pode receber uma nova reserva no período especificado.
 */
export function verificarConflitoQuarto(
  quartoId: number | string,
  dataEntrada: string,
  dataSaida: string,
  reservasExistentes: Reserva[],
  reservaIdIgnorar?: number | string
): ResultadoVerificacaoConflito {
  if (!dataEntrada || !dataSaida) {
    return {
      temConflito: false,
    };
  }

  const dEntrada = new Date(dataEntrada + 'T00:00:00');
  const dSaida = new Date(dataSaida + 'T00:00:00');

  if (dEntrada >= dSaida) {
    return {
      temConflito: true,
      motivo: 'A data de saída deve ser posterior à data de entrada.',
    };
  }

  // Filtrar reservas ativas para o quarto
  const reservasDoQuarto = reservasExistentes.filter(
    (res) =>
      String(res.QuartoId) === String(quartoId) &&
      res.Status !== 'CANCELADA' &&
      res.Status !== 'FINALIZADA' &&
      String(res.ReservaId) !== String(reservaIdIgnorar)
  );

  for (const reserva of reservasDoQuarto) {
    const sobrepoe = verificarSobreposicaoDatas(
      dataEntrada,
      dataSaida,
      reserva.DataEntrada,
      reserva.DataSaida
    );

    if (sobrepoe) {
      return {
        temConflito: true,
        motivo: `Conflito com a reserva ${reserva.Codigo} (${reserva.HospedeNome}) de ${reserva.DataEntrada} até ${reserva.DataSaida}.`,
        reservaConflitante: reserva,
      };
    }
  }

  return {
    temConflito: false,
  };
}

export interface StatusDisponibilidadeQuarto {
  quarto: Quarto;
  disponivel: boolean;
  motivoIndisponibilidade?: string;
  statusCalculado: StatusQuarto;
  reservaConflitante?: Reserva;
}

/**
 * Calcula a disponibilidade em tempo real dos quartos para um período determinado.
 */
export function calcularDisponibilidadeQuartos(
  quartos: Quarto[],
  reservas: Reserva[],
  dataEntrada?: string,
  dataSaida?: string,
  reservaIdIgnorar?: number | string
): StatusDisponibilidadeQuarto[] {
  return quartos.map((quarto) => {
    // Se o quarto estiver em manutenção física, fica indisponível
    if (quarto.Status === 'MANUTENCAO') {
      return {
        quarto,
        disponivel: false,
        motivoIndisponibilidade: quarto.MotivoBloqueio ? `Quarto em manutenção: ${quarto.MotivoBloqueio}` : 'Quarto em manutenção programada',
        statusCalculado: 'MANUTENCAO',
      };
    }

    if (!dataEntrada || !dataSaida) {
      return {
        quarto,
        disponivel: quarto.Status === 'DISPONIVEL',
        statusCalculado: quarto.Status,
      };
    }

    const resultado = verificarConflitoQuarto(
      quarto.QuartoId,
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
        statusCalculado: 'RESERVADO',
        reservaConflitante: resultado.reservaConflitante,
      };
    }

    return {
      quarto,
      disponivel: true,
      statusCalculado: 'DISPONIVEL',
    };
  });
}
