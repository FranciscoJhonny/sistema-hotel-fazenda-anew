import React from 'react';
import { Calendar, User, Users, Clock, CheckCircle2, Wrench } from 'lucide-react';
import { Quarto, StatusQuarto } from '../../tipos';

interface CardQuartoGerenciamentoProps {
  quarto: Quarto;
  aoClicar?: (quarto: Quarto) => void;
  aoNovaReserva?: (quarto: Quarto) => void;
}

export const CardQuartoGerenciamento: React.FC<CardQuartoGerenciamentoProps> = ({
  quarto,
  aoClicar,
  aoNovaReserva,
}) => {
  // Configuração visual de status fiel à imagem de referência
  const obterBadgeStatus = (status: StatusQuarto) => {
    switch (status) {
      case 'DISPONIVEL':
        return {
          label: 'DISPONÍVEL',
          badgeClasse: 'bg-[#eefbf3] text-[#16a34a] border border-[#bbf7d0]',
          bordaDestaque: '',
        };
      case 'RESERVADO':
        return {
          label: 'RESERVADO',
          badgeClasse: 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]',
          bordaDestaque: '',
        };
      case 'OCUPADO':
        return {
          label: 'OCUPADO',
          badgeClasse: 'bg-[#fef2f2] text-[#ef4444] border border-[#fecaca]',
          // Faixa vermelha à esquerda conforme a imagem
          bordaDestaque: 'border-l-4 border-l-[#ef4444]',
        };
      case 'AGUARDANDO_CHECKIN':
        return {
          label: 'AG. CHECK-IN',
          badgeClasse: 'bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a]',
          bordaDestaque: '',
        };
      case 'MANUTENCAO':
        return {
          label: 'MANUTENÇÃO',
          badgeClasse: 'bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]',
          bordaDestaque: '',
        };
      default:
        return {
          label: status,
          badgeClasse: 'bg-gray-100 text-gray-700',
          bordaDestaque: '',
        };
    }
  };

  const badge = obterBadgeStatus(quarto.Status);

  const renderConteudo = () => {
    // 1. Quarto em Manutenção (ex: D5)
    if (quarto.Status === 'MANUTENCAO') {
      return (
        <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
          <div className="text-[#9ca3af] mb-3">
            <Wrench className="w-8 h-8 stroke-[1.5]" />
          </div>
          <span className="text-xs text-[#9ca3af] font-normal">
            {quarto.MotivoBloqueio || 'Ar condicionado'}
          </span>
        </div>
      );
    }

    // 2. Quarto Disponível (ex: B1, B4, C4, D3, D6)
    if (quarto.Status === 'DISPONIVEL') {
      return (
        <div className="flex flex-col items-center justify-between flex-1 pt-4 pb-1">
          <div className="flex flex-col items-center justify-center py-5 text-center">
            {/* Ícone de cama estilizado minimalista conforme imagem */}
            <div className="text-[#9ca3af] mb-3 flex items-center justify-center">
              <svg
                className="w-10 h-10 stroke-current text-[#9ca3af]"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4v16" />
                <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                <path d="M2 17h20" />
                <path d="M6 8v9" />
              </svg>
            </div>
            <p className="text-xs text-[#9ca3af] font-normal">
              Livre para ocupação
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (aoNovaReserva) aoNovaReserva(quarto);
            }}
            className="w-full mt-3 py-2 px-3 border border-[#245437] text-[#245437] hover:bg-[#f0fdf4] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
          >
            Nova Reserva
          </button>
        </div>
      );
    }

    // 3. Quarto com Ocupação / Reserva / Ag. Check-in
    let linhaDetalhe = null;

    if (quarto.Numero === 'B2') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>05/09 → 06/09</span>
        </div>
      );
    } else if (quarto.Numero === 'B3') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>2 Ad, 2 Cr</span>
        </div>
      );
    } else if (quarto.Numero === 'C2') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#16a34a]" />
          <span>Check-in ok</span>
        </div>
      );
    } else if (quarto.Numero === 'C3') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#d97706]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Previsto: 14:00</span>
        </div>
      );
    } else if (quarto.Numero === 'D1') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Próxima semana</span>
        </div>
      );
    } else if (quarto.Numero === 'D2') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Atrasado</span>
        </div>
      );
    } else if (quarto.Numero === 'D4') {
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Última noite</span>
        </div>
      );
    } else {
      // Fallback dinâmico para qualquer outro quarto que receba dados dinâmicos
      linhaDetalhe = (
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
          <User className="w-3.5 h-3.5 shrink-0" />
          <span>{quarto.AdultosAtual || 2} Ad</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col justify-start flex-1 pt-5">
        <h4 className="font-['Manrope'] text-sm font-bold text-[#111827] mb-1 truncate">
          {quarto.HospedeAtualNome || 'Hóspede'}
        </h4>
        {linhaDetalhe}
      </div>
    );
  };

  return (
    <div
      onClick={() => aoClicar && aoClicar(quarto)}
      className={`bg-white border border-[#e5e7eb] rounded-xl p-4 transition-all duration-150 relative cursor-pointer hover:shadow-sm min-h-[175px] flex flex-col justify-between ${badge.bordaDestaque}`}
    >
      {/* Topo do card: Número Grande (ex: B1, B2) e Badge de Status à direita */}
      <div className="flex items-start justify-between">
        <span className="font-['Manrope'] text-2xl font-extrabold text-[#111827] tracking-tight">
          {quarto.Numero}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badge.badgeClasse}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Conteúdo central do card */}
      {renderConteudo()}
    </div>
  );
};
