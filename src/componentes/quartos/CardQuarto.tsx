import React from 'react';
import { Bed, User, Users, Calendar, Wrench, Lock, CheckCircle2 } from 'lucide-react';
import { Quarto, StatusQuarto, Reserva } from '../../tipos';
import { formatarData } from '../../utilitarios/formatadores';

// Tipo que aceita tanto Quarto simples quanto QuartoEnriquecido
type QuartoComReservas = Quarto & {
  statusCalculado?: string;
  reservaAtiva?: Reserva | null;
  proximaReserva?: Reserva | null;
};

interface CardQuartoProps {
  quarto: QuartoComReservas;
  aoClicar?: (quarto: Quarto) => void;
  selecionado?: boolean;
  modoSelecao?: boolean;
  desabilitado?: boolean;
  motivoDesabilitado?: string;
}

export const CardQuarto: React.FC<CardQuartoProps> = ({
  quarto,
  aoClicar,
  selecionado = false,
  modoSelecao = false,
  desabilitado = false,
  motivoDesabilitado,
}) => {
  // 1. Define o status para exibição (calculado ou estático)
  const statusParaExibicao = quarto.statusCalculado || quarto.status;

  // 2. Tenta extrair dados da reserva (prioridade) ou dos campos do quarto
  const reservaExibicao = quarto.reservaAtiva || quarto.proximaReserva;
  
  // 3. Extrai dados com fallback em cascata
  const nomeHospede = 
    reservaExibicao?.hospedenome || 
    quarto.hospedeatualnome || 
    '';
    
  const dataEntrada = 
    reservaExibicao?.dataentrada || 
    quarto.dataentradaatual;
    
  const dataSaida = 
    reservaExibicao?.datasaida || 
    quarto.datasaidaatual;
    
  const adultos = 
    reservaExibicao?.adultos ?? 
    quarto.adultosatual ?? 
    quarto.capacidadeadultos;
    
  const criancas = 
    reservaExibicao?.criancas ?? 
    quarto.criancasatual ?? 
    0;

  const obterBadgeStatus = (status: StatusQuarto | string) => {
    switch (status) {
      case 'DISPONIVEL':
        return {
          label: 'Disponível',
          classePill: 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]',
          corIcone: 'text-[#166534]',
          icone: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case 'RESERVADO':
        return {
          label: 'Reservado',
          classePill: 'bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]',
          corIcone: 'text-[#2563eb]',
          icone: <Calendar className="w-3.5 h-3.5" />,
        };
      case 'OCUPADO':
        return {
          label: 'Ocupado',
          classePill: 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]',
          corIcone: 'text-[#dc2626]',
          icone: <Lock className="w-3.5 h-3.5" />,
        };
      case 'AGUARDANDO_CHECKIN':
        return {
          label: 'Aguardando Check-in',
          classePill: 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]',
          corIcone: 'text-[#d97706]',
          icone: <User className="w-3.5 h-3.5" />,
        };
      case 'MANUTENCAO':
        return {
          label: 'Manutenção',
          classePill: 'bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]',
          corIcone: 'text-[#6b7280]',
          icone: <Wrench className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: String(status),
          classePill: 'bg-gray-100 text-gray-700',
          corIcone: 'text-gray-500',
          icone: <Bed className="w-3.5 h-3.5" />,
        };
    }
  };

  const badge = obterBadgeStatus(statusParaExibicao);

  if (desabilitado) {
    return (
      <div
        className="border border-[#e5e7eb] rounded-2xl p-4 bg-[#f9fafb] opacity-60 cursor-not-allowed relative select-none"
        title={motivoDesabilitado || 'Quarto indisponível'}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="font-['Manrope'] text-lg font-bold text-[#6b7280]">
              Quarto {quarto.numero}
            </span>
            <span className="text-xs font-semibold text-[#6b7280] bg-white px-2 py-0.5 rounded-md border border-[#e5e7eb]">
              Bloco {quarto.bloco}
            </span>
          </div>
          <Lock className="w-4 h-4 text-[#991b1b]" />
        </div>
        <p className="font-['Inter'] text-xs font-medium text-[#6b7280] truncate mb-2">
          {quarto.categoria}
        </p>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#fee2e2] text-[#991b1b]">
          Indisponível
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => aoClicar && aoClicar(quarto as Quarto)}
      className={`border rounded-2xl p-4.5 bg-white transition-all duration-200 relative group shadow-xs flex flex-col justify-between ${
        aoClicar ? 'cursor-pointer hover:shadow-md hover:border-[#245437]' : ''
      } ${
        selecionado
          ? 'border-2 border-[#245437] bg-[#f0fdf4] ring-2 ring-[#245437]/20 shadow-md scale-[1.01]'
          : 'border-[#e5e7eb]'
      }`}
    >
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-['Manrope'] text-lg font-extrabold text-[#111827]">
              Quarto {quarto.codigoidentificador}
            </h3>
            <span className="text-[11px] font-semibold text-[#4b5563] bg-[#f3f4f6] px-2 py-0.5 rounded-md">
              Bloco {quarto.bloco}
            </span>
          </div>
          <div className={`p-1.5 rounded-lg bg-[#f9fafb] ${badge.corIcone}`}>
            <Bed className="w-4 h-4" />
          </div>
        </div>

        {/* Categoria */}
        <p className="font-['Inter'] text-xs text-[#6b7280] font-medium mb-3">
          {quarto.categoria}
        </p>

        {/* Badge de Status */}
        <div className="mb-3.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.classePill}`}
          >
            {badge.icone}
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Detalhe Dinâmico - Mostra dados da reserva OU status do quarto */}
        {nomeHospede || (dataEntrada && dataSaida) ? (
          <div className="pt-2.5 mb-3 border-t border-[#f3f4f6] space-y-1.5 text-xs">
            {nomeHospede && (
              <div className="flex items-center gap-1.5 font-semibold text-[#111827] truncate">
                <User className="w-3.5 h-3.5 text-[#245437] shrink-0" />
                <span className="truncate">{nomeHospede}</span>
              </div>
            )}

            <div className="flex flex-col gap-1 text-[11px] text-[#6b7280]">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{adultos} Ad • {criancas} Cri</span>
              </div>
              
              {dataEntrada && dataSaida ? (
                <div className="flex items-center gap-1 font-medium text-[#4b5563]">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {formatarData(dataEntrada)} até {formatarData(dataSaida)}
                  </span>
                </div>
              ) : dataEntrada ? (
                <div className="flex items-center gap-1 font-medium text-[#4b5563]">
                  <Calendar className="w-3 h-3" />
                  <span>Entrada: {formatarData(dataEntrada)}</span>
                </div>
              ) : dataSaida ? (
                <div className="flex items-center gap-1 font-medium text-[#4b5563]">
                  <Calendar className="w-3 h-3" />
                  <span>Saída: {formatarData(dataSaida)}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          // Fallback: Quando não há dados de hóspede ou reserva
          <div className="pt-2.5 mb-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px] text-[#6b7280]">
            <span>Capacidade: {quarto.capacidadeadultos + quarto.capacidadecriancas} pessoas</span>
            <span className="font-semibold text-[#166534]">Livre</span>
          </div>
        )}
      </div>

      {/* Rodapé do Card */}
      <div className="pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#6b7280] font-medium flex items-center gap-1">
          <Users className="w-3 h-3" />
          Até {quarto.capacidadeadultos + quarto.capacidadecriancas} pessoas
        </span>
      </div>
    </div>
  );
};