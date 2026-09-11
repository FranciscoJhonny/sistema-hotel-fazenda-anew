import React from 'react';
import logoTucano from '../../imagens/logo-tucano-transparente.png';

interface LogoHotelProps {
  tamanho?: 'sm' | 'md' | 'lg' | 'xl';
  mostrarTexto?: boolean;
  classeExtra?: string;
}

export const LogoHotel: React.FC<LogoHotelProps> = ({
  tamanho = 'md',
  mostrarTexto = false,
  classeExtra = '',
}) => {
  const dimensoes = {
    sm: 'h-10 w-10',
    md: 'h-20 w-20',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  }[tamanho];

  return (
    <div className={`flex flex-col items-center select-none ${classeExtra}`}>
      <div className={`${dimensoes} relative flex items-center justify-center`}>
        <img
          src={logoTucano}
          alt="Hotel Fazenda Anew - Logo Oficial com Tucano"
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-200"
        />
      </div>

      {mostrarTexto && (
        <div className="text-center mt-2">
          <h1 className="font-['Manrope'] text-lg font-bold text-[#053d1e] tracking-tight leading-tight">
            Hotel Fazenda Anew
          </h1>
          <p className="font-['Inter'] text-[11px] text-[#414941] uppercase tracking-widest font-semibold mt-0.5">
            Administração
          </p>
        </div>
      )}
    </div>
  );
};
