import React from 'react';

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
  // URL da Logo Oficial com Tucano e faixa azul "anew"
  const urlLogoOficial =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAAJie2IPADb0DuldLFiN-Dy3X7tC_vW0hZ3IQCaNAbNUNmiBNsSzuytZnifhGuIOhJ6wGf7fRKnXI9gZjtP4ZP1UU3QSPP7LYIqnmYxCjWeKJNDZ_TIuDYmdV1ho9MUKcvfwjb9Y8_cMbtE5S19K-YFOCRKD9JX44qaZVqn5I_vq-zXUCgS7S4vgm3Unip4SqMTrsNDPPPC-dfpBKZxDDkyCWURCXq23LoA2pY0l2PrrPWFrGRNpnbwwpSEJEZ-3CN3A';

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
          src={urlLogoOficial}
          alt="Hotel Fazenda Anew - Logo Oficial com Tucano"
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-200"
          onError={(e) => {
            // Fallback caso a URL externa falhe
            const target = e.currentTarget;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=200&auto=format&fit=crop&q=80';
          }}
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
