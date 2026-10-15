import React from 'react';
import { ModalTrocaQuartoEAdicional } from '../mapa-reservas/ModalTrocaQuartoEAdicional';
import { Reserva } from '../../tipos';

interface ModalTrocaQuartoProps {
  aberto: boolean;
  reserva: Reserva | null;
  onFechar: () => void;
  onSucesso?: (mensagem: string) => void;
}

export const ModalTrocaQuarto: React.FC<ModalTrocaQuartoProps> = (props) => {
  return <ModalTrocaQuartoEAdicional {...props} />;
};

export default ModalTrocaQuarto;
