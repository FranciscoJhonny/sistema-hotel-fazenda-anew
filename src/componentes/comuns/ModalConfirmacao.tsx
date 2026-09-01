import React from 'react';
import { AlertTriangle, CheckCircle, X, Info } from 'lucide-react';

interface ModalConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  tipo?: 'perigo' | 'aviso' | 'sucesso' | 'info';
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export const ModalConfirmacao: React.FC<ModalConfirmacaoProps> = ({
  aberto,
  titulo,
  mensagem,
  tipo = 'aviso',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
}) => {
  if (!aberto) return null;

  const icones = {
    perigo: <AlertTriangle className="w-6 h-6 text-[#ba1a1a]" />,
    aviso: <AlertTriangle className="w-6 h-6 text-[#cca830]" />,
    sucesso: <CheckCircle className="w-6 h-6 text-[#053d1e]" />,
    info: <Info className="w-6 h-6 text-[#1d5fa8]" />,
  };

  const coresBotao = {
    perigo: 'bg-[#ba1a1a] hover:bg-[#93000a] text-white',
    aviso: 'bg-[#cca830] hover:bg-[#735c00] text-white',
    sucesso: 'bg-[#053d1e] hover:bg-[#1d502f] text-white',
    info: 'bg-[#1d5fa8] hover:bg-[#004787] text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl border border-[#c1c9bf] shadow-xl max-w-md w-full p-6 relative"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onCancelar}
          className="absolute top-4 right-4 text-[#414941] hover:text-[#191c1d] p-1 rounded-full hover:bg-[#f3f4f5] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-[#f3f4f5] shrink-0">{icones[tipo]}</div>
          <div className="flex-1">
            <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">{titulo}</h3>
            <p className="font-['Inter'] text-sm text-[#414941] mt-1 leading-relaxed">{mensagem}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#e1e3e4]">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-semibold text-[#414941] hover:bg-[#f3f4f5] rounded-lg border border-[#c1c9bf] transition-colors"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-xs ${coresBotao[tipo]}`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
