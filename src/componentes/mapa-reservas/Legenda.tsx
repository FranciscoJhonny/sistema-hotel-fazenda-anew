import React from 'react';
import { CalendarRange, Clock3, ShieldCheck, ShieldAlert, Wrench, XCircle } from 'lucide-react';

export const Legenda: React.FC = () => {
  const itens = [
    { label: 'Reservado', cor: 'bg-[#00A8E8]', icone: <ShieldCheck className="w-3.5 h-3.5" /> },
    { label: 'Pagamento Pendente', cor: 'bg-[#FF6B6B]', icone: <Clock3 className="w-3.5 h-3.5" /> },
    { label: 'Hospedado', cor: 'bg-[#053d1e]', icone: <CalendarRange className="w-3.5 h-3.5" /> },
    { label: 'Concluída', cor: 'bg-[#d1d5db]', icone: <ShieldCheck className="w-3.5 h-3.5" /> },
    { label: 'Manutenção', cor: 'bg-[#4b5563] bg-[repeating-linear-gradient(135deg,#4b5563_0,#4b5563_8px,#6b7280_8px,#6b7280_16px)]', icone: <Wrench className="w-3.5 h-3.5" /> },
    { label: 'Cancelada', cor: 'bg-[#9ca3af] line-through', icone: <XCircle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-[#c1c9bf] bg-white px-4 py-3 shadow-xs">
      {itens.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-[11px] font-semibold text-[#191c1d]">
          <span className={`flex h-4 w-4 items-center justify-center rounded-sm text-white ${item.cor}`}>
            {item.icone}
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};
