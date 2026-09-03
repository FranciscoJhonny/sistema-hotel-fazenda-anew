import React from 'react';
import { Bed, Wrench, Users, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Quarto } from '../../tipos'; // Ajuste o caminho conforme sua estrutura de pastas

interface CardQuartoGerenciamentoProps {
  quarto: Quarto;
  aoClicar: (quarto: Quarto) => void;
  aoNovaReserva: (quarto: Quarto) => void;
}

export const CardQuartoGerenciamento: React.FC<CardQuartoGerenciamentoProps> = ({
  quarto,
  aoClicar,
  aoNovaReserva,
}) => {
  // Função auxiliar para buscar valores de forma segura (case-insensitive)
  const getValor = (chaves: string[]) => {
    const dados = quarto as Record<string, any>;
    for (const chave of chaves) {
      const valor = dados[chave];
      if (valor !== undefined && valor !== null && valor !== '') return valor;
    }
    return null;
  };

  // Campos do Quarto
  const numero = getValor(['codigoidentificador', 'CodigoIdentificador']) || 'S/N';
  const status = (getValor(['status', 'Status']) || 'DISPONIVEL').toUpperCase();
  const categoria = getValor(['categoria', 'Categoria']);
  
  // Campos do Hóspede / Reserva (podem vir aninhados ou achatados no objeto)
  const hospedeNome = getValor(['hospedeatualnome', 'HospedeAtualNome', 'nome', 'Nome']);
  const dataEntrada = getValor(['dataentrada', 'DataEntrada', 'checkin', 'CheckIn']);
  const dataSaida = getValor(['datasaida', 'DataSaida', 'checkout', 'CheckOut']);
  const horarioPrevisto = getValor(['horarioprevistochegada', 'HorarioPrevistoChegada']);
  const adultos = getValor(['adultos', 'Adultos']);
  const criancas = getValor(['criancas', 'Crianca', 'Criancas']);
  
  // Campo de Manutenção
  const descricaoManutencao = getValor(['descricaomanutencao', 'DescricaoManutencao', 'observacao', 'Observacao']);

  // Formatadores
  const formatarData = (data: any) => {
    if (!data) return '';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatarHorario = (horario: any) => {
    if (!horario) return '';
    if (typeof horario === 'string' && horario.includes(':')) return horario.substring(0, 5);
    const date = new Date(horario);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Configurações visuais por status
  const statusConfig: Record<string, { 
    label: string; 
    bgClass: string; 
    textClass: string; 
    borderClass: string;
  }> = {
    DISPONIVEL: {
      label: 'DISPONÍVEL',
      bgClass: 'bg-green-50',
      textClass: 'text-green-700',
      borderClass: 'border-l-4 border-green-500',
    },
    RESERVADO: {
      label: 'RESERVADO',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-l-4 border-blue-500',
    },
    OCUPADO: {
      label: 'OCUPADO',
      bgClass: 'bg-red-50',
      textClass: 'text-red-700',
      borderClass: 'border-l-4 border-red-500',
    },
    AGUARDANDO_CHECKIN: {
      label: 'AG. CHECK-IN',
      bgClass: 'bg-yellow-50',
      textClass: 'text-yellow-700',
      borderClass: 'border-l-4 border-yellow-500',
    },
    MANUTENCAO: {
      label: 'MANUTENÇÃO',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-600',
      borderClass: 'border-l-4 border-gray-400',
    },
  };

  const config = statusConfig[status] || statusConfig.DISPONIVEL;

  const handleClick = () => {
    aoClicar(quarto);
  };

  const handleNovaReserva = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o modal de detalhes ao clicar no botão
    aoNovaReserva(quarto);
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${config.borderClass}`}
    >
      {/* Cabeçalho: Número do Quarto e Status */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-bold text-gray-900">Quarto {numero}</h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${config.bgClass} ${config.textClass}`}>
          {config.label}
        </span>
      </div>

      {/* Conteúdo Dinâmico baseado no Status */}
      {status === 'DISPONIVEL' && (
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div className="bg-gray-50 p-3 rounded-full">
            <Bed className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 text-center font-medium">Livre para ocupação</p>
          <button
            onClick={handleNovaReserva}
            className="w-full mt-2 px-4 py-2 bg-[#193b27] text-white rounded-lg text-sm font-semibold hover:bg-[#142e1f] transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Nova Reserva
          </button>
        </div>
      )}

      {status === 'RESERVADO' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {hospedeNome || 'Nome do Hóspede'}
            </p>
          </div>
          
          {(dataEntrada || dataSaida) && (
            <div className="flex items-center text-sm text-gray-600 bg-blue-50/50 p-2 rounded-md">
              <Calendar className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Entrada: {formatarData(dataEntrada)}</span>
                <span className="text-xs text-gray-500">Saída: {formatarData(dataSaida)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'OCUPADO' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {hospedeNome || 'Hóspede Atual'}
            </p>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600 bg-red-50/50 p-2 rounded-md">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1.5 text-red-500" />
              <span className="font-medium">{adultos || 0} Adl</span>
              {criancas && criancas > 0 && (
                <span className="ml-2 text-gray-500">+ {criancas} Crn</span>
              )}
            </div>
            <div className="flex items-center text-green-600 text-xs font-semibold">
              <AlertCircle className="w-3 h-3 mr-1" />
              Check-in OK
            </div>
          </div>
        </div>
      )}

      {status === 'AGUARDANDO_CHECKIN' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {hospedeNome || 'Hóspede Previsto'}
            </p>
          </div>
          
          {horarioPrevisto && (
            <div className="flex items-center text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md border border-yellow-100">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="font-medium">Previsto para: {formatarHorario(horarioPrevisto)}</span>
            </div>
          )}
          
          {(dataEntrada) && (
             <div className="text-xs text-gray-500 text-center">
               Chegada prevista para: {formatarData(dataEntrada)}
             </div>
          )}
        </div>
      )}

      {status === 'MANUTENCAO' && (
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div className="bg-gray-100 p-3 rounded-full">
            <Wrench className="w-8 h-8 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">Em Manutenção</p>
            <p className="text-xs text-gray-500 mt-1 italic">
              "{descricaoManutencao || 'Sem descrição'}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};