import React from 'react';
import { CalendarCheck2, Clock3, Hotel, UserRoundX, Wrench } from 'lucide-react';
import { Reserva } from '../../tipos';

interface BarraReservaProps {
  reserva: Reserva;
  dataInicioPeriodo: Date;
  totalDiasPeriodo: number;
  onClick?: () => void;
}

export const BarraReserva: React.FC<BarraReservaProps> = ({
  reserva,
  dataInicioPeriodo,
  totalDiasPeriodo,
  onClick,
}) => {
  const inicio = new Date(`${reserva.dataentrada}T00:00:00`);
  const fim = new Date(`${reserva.datasaida}T00:00:00`);
  const diffInicio = Math.max(0, (inicio.getTime() - dataInicioPeriodo.getTime()) / (1000 * 60 * 60 * 24));
  const diffDuracao = Math.max(1, (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

  const left = (diffInicio / totalDiasPeriodo) * 100;
  const width = (diffDuracao / totalDiasPeriodo) * 100;

  const statusClasses: Record<string, string> = {
    RESERVADO: 'bg-[#00A8E8] text-white',
    PRE_RESERVA: 'bg-[#FF6B6B] text-white',
    HOSPEDADO: 'bg-[#053d1e] text-white',
    CONCLUIDA: 'bg-[#d1d5db] text-[#191c1d]',
    CANCELADA: 'bg-[#9ca3af] text-white line-through',
  };

  const statusIcon: Record<string, React.ReactNode> = {
    RESERVADO: <CalendarCheck2 className="w-3.5 h-3.5" />,
    PRE_RESERVA: <Clock3 className="w-3.5 h-3.5" />,
    HOSPEDADO: <Hotel className="w-3.5 h-3.5" />,
    CONCLUIDA: <CalendarCheck2 className="w-3.5 h-3.5" />,
    CANCELADA: <UserRoundX className="w-3.5 h-3.5" />,
  };

  const tipoBadge = reserva.tipoatendimento === 'DAY_USE' ? 'Day Use' : `${Math.max(1, Math.ceil(diffDuracao))} noites`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1.5 h-7 rounded-lg border border-white/60 shadow-sm transition-all duration-150 hover:brightness-105 ${statusClasses[reserva.statusreserva] ?? 'bg-gray-400 text-white'} ${reserva.statusreserva === 'CANCELADA' ? 'opacity-70' : ''}`}
      style={{
        left: `${Math.min(Math.max(left, 0), 98)}%`,
        width: `${Math.max(Math.min(width, 100 - left), 10)}%`,
      }}
      title={`${reserva.hospedenome} • ${reserva.pacotename || reserva.pacoteid || 'Pacote'} • ${reserva.dataentrada} até ${reserva.datasaida}`}
    >
      <div className="flex h-full w-full items-center justify-between gap-1 overflow-hidden px-2 text-[10px] font-semibold">
        <span className="flex items-center gap-1 truncate">
          {statusIcon[reserva.statusreserva] ?? <CalendarCheck2 className="w-3.5 h-3.5" />}
          <span className="truncate">{reserva.hospedenome}</span>
        </span>
        <span className="shrink-0 rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide">
          {tipoBadge}
        </span>
      </div>
    </button>
  );
};
