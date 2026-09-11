import { Reserva, StatusQuarto } from '../tipos';

export const calcularStatusQuarto = (
  reservas: Reserva[],
  dataReferencia: Date = new Date()
): {
  status: StatusQuarto;
  reservaAtiva: Reserva | null;
  proximaReserva: Reserva | null;
} => {
  const hoje = new Date(dataReferencia);
  hoje.setHours(0, 0, 0, 0);

  // Filtra apenas reservas válidas (não canceladas ou finalizadas)
  const reservasValidas = reservas.filter(r => 
    r.statusreserva !== 'CANCELADA' && r.statusreserva !== 'CONCLUIDA'
  );

  // 1. Verifica se há reserva ATIVA hoje (hóspede hospedado)
  const reservaAtiva = reservasValidas.find(reserva => {
    const checkIn = new Date(reserva.dataentrada);
    const checkOut = new Date(reserva.datasaida);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    
    return hoje >= checkIn && hoje <= checkOut;
  });

  if (reservaAtiva) {
    return { status: 'OCUPADO', reservaAtiva, proximaReserva: null };
  }

  // 2. Verifica se há check-in previsto para HOJE
  const checkInHoje = reservasValidas.find(reserva => {
    const checkIn = new Date(reserva.dataentrada);
    checkIn.setHours(0, 0, 0, 0);
    return checkIn.getTime() === hoje.getTime();
  });

  if (checkInHoje) {
    return { status: 'AGUARDANDO_CHECKIN', reservaAtiva: checkInHoje, proximaReserva: null };
  }

  // 3. Verifica se há reserva FUTURA (a mais próxima)
  const proximaReserva = reservasValidas
    .filter(reserva => {
      const checkIn = new Date(reserva.dataentrada);
      checkIn.setHours(0, 0, 0, 0);
      return checkIn > hoje;
    })
    .sort((a, b) => new Date(a.dataentrada).getTime() - new Date(b.dataentrada).getTime())[0];

  if (proximaReserva) {
    return { status: 'RESERVADO', reservaAtiva: null, proximaReserva };
  }

  // 4. Disponível
  return { status: 'DISPONIVEL', reservaAtiva: null, proximaReserva: null };
};