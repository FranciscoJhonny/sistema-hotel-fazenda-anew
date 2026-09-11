import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Bed,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { Quarto, TipoAtendimento, FormaPagamento, StatusPagamento } from '../../tipos';
import {
  formatarMoeda,
  formatarData,
  formatarTelefone,
  formatarCpf,
  calcularDiarias,
} from '../../utilitarios/formatadores';
import { CardQuarto } from '../quartos/CardQuarto';

interface ModalNovaReservaProps {
  aberto: boolean;
  onFechar: () => void;
  quartoPreSelecionado?: Quarto | null;
}

export const ModalNovaReserva: React.FC<ModalNovaReservaProps> = ({
  aberto,
  onFechar,
  quartoPreSelecionado,
}) => {
  const {
    quartos,
    hospedes,
    pacotes,
    dataSistema,
    configuracoes,
    verificarDisponibilidade,
    criarReserva,
    cadastrarHospede,
  } = useHotel();

  // Estados do Formulário
  const [hospedeId, setHospedeId] = useState<number | null>(null);
  const [nomeHospede, setNomeHospede] = useState<string>('');
  const [cpfHospede, setCpfHospede] = useState<string>('');
  const [telefoneHospede, setTelefoneHospede] = useState<string>('');
  const [emailHospede, setEmailHospede] = useState<string>('');
  const [cidadeHospede, setCidadeHospede] = useState<string>('Campo Grande');
  const [estadoHospede, setEstadoHospede] = useState<string>('MS');
  const [modoNovoHospede, setModoNovoHospede] = useState<boolean>(true);

  // Estadia
  const [dataEntrada, setDataEntrada] = useState<string>(dataSistema);
  const [dataSaida, setDataSaida] = useState<string>('2026-09-02');
  const [horarioEntrada, setHorarioEntrada] = useState<string>(configuracoes.checkintime || '09:00');
  const [horarioSaida, setHorarioSaida] = useState<string>(configuracoes.checkouttime || '15:00');
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>('HOSPEDAGEM');
  const [adultos, setAdultos] = useState<number>(2);
  const [criancas, setCriancas] = useState<number>(0);

  // Quarto
  const [quartoSelecionadoId, setQuartoSelecionadoId] = useState<number>(
    quartoPreSelecionado ? Number(quartoPreSelecionado.quartoid) : 1
  );

  // Pacote & Financeiro
  const [pacoteId, setPacoteId] = useState<number | undefined>(undefined);
  const [valorDiaria, setValorDiaria] = useState<number>(450);
  const [valorDesconto, setValorDesconto] = useState<number>(0);
  const [valorPago, setValorPago] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [observacoes, setObservacoes] = useState<string>('');

  // Mensagens de Validação e Feedback
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<boolean>(false);

  // Sincroniza quarto pré-selecionado quando a modal abre
  useEffect(() => {
    if (quartoPreSelecionado) {
      setQuartoSelecionadoId(Number(quartoPreSelecionado.quartoid));
      setValorDiaria(quartoPreSelecionado.valordiariapadrao);
    }
  }, [quartoPreSelecionado]);

  // Atualiza valor diária quando quarto muda
  useEffect(() => {
    const q = quartos.find((item) => Number(item.quartoid) === quartoSelecionadoId);
    if (q) {
      setValorDiaria(q.valordiariapadrao);
    }
  }, [quartoSelecionadoId, quartos]);

  // Se selecionar hóspede existente da lista
  const handleSelecionarHospede = (idStr: string) => {
    const id = idStr ? Number(idStr) : null;
    setHospedeId(id);
    if (id) {
      const h = hospedes.find((item) => Number(item.hospedeid) === id);
      if (h) {
        setNomeHospede(h.nomecompleto);
        setCpfHospede(h.cpf);
        setTelefoneHospede(h.telefone);
        setEmailHospede(h.email || '');
        setCidadeHospede(h.cidade || '');
        setEstadoHospede(h.estado || 'MS');
        setModoNovoHospede(false);
      }
    } else {
      setModoNovoHospede(true);
      setNomeHospede('');
      setCpfHospede('');
      setTelefoneHospede('');
      setEmailHospede('');
    }
  };

  // Cálculo de diárias e valor total
  const numeroDiarias = calcularDiarias(dataEntrada, dataSaida);
  const pacoteSelecionado = pacotes.find((p) => String(p.pacoteid) === String(pacoteId));

  const valorTotalBruto = pacoteSelecionado
    ? pacoteSelecionado.valor
    : valorDiaria * numeroDiarias;

  const valorTotalFinal = Math.max(0, valorTotalBruto - valorDesconto);
  const saldoRestante = Math.max(0, valorTotalFinal - valorPago);

  // Status de disponibilidade em tempo real dos 13 quartos para as datas selecionadas
  const statusDisponibilidade = verificarDisponibilidade(dataEntrada, dataSaida);
  const quartoAtualStatus = statusDisponibilidade.find((s) => s.quarto.QuartoId === quartoSelecionadoId);

  const handleSalvarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    // Validações
    if (!nomeHospede.trim()) {
      setErroValidacao('Por favor, informe o nome completo do hóspede.');
      return;
    }

    if (!telefoneHospede.trim()) {
      setErroValidacao('Por favor, informe o telefone de contato do hóspede.');
      return;
    }

    if (!quartoSelecionadoId) {
      setErroValidacao('Por favor, selecione um dos quartos.');
      return;
    }

    // Validação estrita de conflito
    if (quartoAtualStatus && !quartoAtualStatus.disponivel) {
      setErroValidacao(
        quartoAtualStatus.motivoIndisponibilidade ||
          'O quarto selecionado está indisponível para estas datas. Escolha outro quarto.'
      );
      return;
    }

    setEnviando(true);

    try {
      // 1. Cadastra hóspede se for novo
      let idFinalHospede = hospedeId;
      if (modoNovoHospede || !idFinalHospede) {
        const novo = await cadastrarHospede({
          nomecompleto: nomeHospede,
          cpf: cpfHospede || '000.000.000-00',
          telefone: telefoneHospede,
          email: emailHospede,
          cidade: cidadeHospede,
          estado: estadoHospede,
        });
        idFinalHospede = Number(novo.hospedeid);
      }

      // 2. Status de pagamento
      let statusPag: StatusPagamento = 'PENDENTE';
      if (valorPago >= valorTotalFinal && valorTotalFinal > 0) {
        statusPag = 'PAGO';
      } else if (valorPago > 0) {
        statusPag = 'PARCIAL';
      }

      // 3. Cria a reserva através do serviço com proteção anti-duplicidade
      const resultado = await criarReserva({
        hospedeid: idFinalHospede,
        hospedenome: nomeHospede,
        hospedetelefone: telefoneHospede,
        hospedeemail: emailHospede,
        quartoid: quartoSelecionadoId,
        quartonumero: quartoAtualStatus?.quarto.numero || 'B1',
        quartocodigo: quartoAtualStatus?.quarto.codigoidentificador || 'B1',
        quartocategoria: quartoAtualStatus?.quarto.categoria || 'Standard Duplo',
        adultos,
        criancas,
        dataentrada: dataEntrada,
        datasaida: dataSaida,
        horarioprevistochegada: horarioEntrada,
        horarioprevistosaida: horarioSaida,
        tipoatendimento: tipoAtendimento,
        pacoteid: pacoteId,
        pacotename: pacoteSelecionado?.nome,
        valortotal: valorTotalFinal,
        valorpago: valorPago,
        saldo: saldoRestante,
        statuspagamento: statusPag,
        formapagamento: formaPagamento,
        observacoes,
      });

      if (!resultado.sucesso) {
        setErroValidacao(resultado.mensagem);
        setEnviando(false);
        return;
      }

      setSucessoFeedback(resultado.mensagem);
      setTimeout(() => {
        setSucessoFeedback(null);
        setEnviando(false);
        onFechar();
      }, 1400);
    } catch (err: any) {
      setErroValidacao(err.message || 'Erro inesperado ao salvar reserva.');
      setEnviando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-5xl w-full my-4 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-[#053d1e] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-['Manrope'] text-lg sm:text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Nova Reserva • Hotel Fazenda Anew
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              Sistema com verificação anti-duplicidade em tempo real para os 13 quartos.
            </p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Feedbacks */}
        {erroValidacao && (
          <div className="bg-[#ffdad6] text-[#93000a] px-6 py-3 text-xs font-semibold flex items-center gap-2 border-b border-[#ffb4ab]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{erroValidacao}</span>
          </div>
        )}

        {sucessoFeedback && (
          <div className="bg-[#b8f0c2] text-[#00210d] px-6 py-3 text-xs font-semibold flex items-center gap-2 border-b border-[#92c89d]">
            <CheckCircle2 className="w-4 h-4 text-[#053d1e] shrink-0" />
            <span>{sucessoFeedback}</span>
          </div>
        )}

        {/* Corpo com Grid: 2 Colunas (Formulário + Resumo Sticky) */}
        <form onSubmit={handleSalvarReserva} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal: Formulário Detalhado */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. SELEÇÃO DO HÓSPEDE */}
              <div className="border border-[#c1c9bf] rounded-xl p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e1e3e4]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#053d1e]" />
                    <h3 className="font-['Manrope'] text-sm font-bold text-[#191c1d]">
                      1. Detalhes do Hóspede
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setModoNovoHospede(false);
                        if (hospedes.length > 0) handleSelecionarHospede(String(hospedes[0].hospedeid));
                      }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        !modoNovoHospede
                          ? 'bg-[#053d1e] text-white'
                          : 'bg-[#f3f4f5] text-[#414941] hover:bg-[#e1e3e4]'
                      }`}
                    >
                      Buscar Cadastrado
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelecionarHospede('')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        modoNovoHospede
                          ? 'bg-[#053d1e] text-white'
                          : 'bg-[#f3f4f5] text-[#414941] hover:bg-[#e1e3e4]'
                      }`}
                    >
                      + Novo Hóspede
                    </button>
                  </div>
                </div>

                {!modoNovoHospede && (
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-[#414941] mb-1">
                      Selecione da Lista de Clientes:
                    </label>
                    <select
                      value={hospedeId ? String(hospedeId) : ''}
                      onChange={(e) => handleSelecionarHospede(e.target.value)}
                      className="w-full p-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    >
                      {hospedes.map((h) => (
                        <option key={h.hospedeid} value={String(h.hospedeid)}>
                          {h.nomecompleto} • CPF: {h.cpf} • {h.telefone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Silva"
                      value={nomeHospede}
                      onChange={(e) => setNomeHospede(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpfHospede}
                      onChange={(e) => setCpfHospede(formatarCpf(e.target.value))}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(67) 99999-9999"
                      value={telefoneHospede}
                      onChange={(e) => setTelefoneHospede(formatarTelefone(e.target.value))}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={emailHospede}
                      onChange={(e) => setEmailHospede(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">Cidade</label>
                    <input
                      type="text"
                      value={cidadeHospede}
                      onChange={(e) => setCidadeHospede(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">Estado</label>
                    <input
                      type="text"
                      value={estadoHospede}
                      onChange={(e) => setEstadoHospede(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. DETALHES DA ESTADIA & TIPO */}
              <div className="border border-[#c1c9bf] rounded-xl p-4 bg-white shadow-xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#e1e3e4]">
                  <Calendar className="w-4 h-4 text-[#053d1e]" />
                  <h3 className="font-['Manrope'] text-sm font-bold text-[#191c1d]">
                    2. Período e Tipo de Atendimento
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-3">
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Data de Entrada *
                    </label>
                    <input
                      type="date"
                      required
                      value={dataEntrada}
                      onChange={(e) => setDataEntrada(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e] bg-[#f8f9fa]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Data de Saída *
                    </label>
                    <input
                      type="date"
                      required
                      value={dataSaida}
                      onChange={(e) => setDataSaida(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e] bg-[#f8f9fa]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Check-in Previsto
                    </label>
                    <input
                      type="time"
                      value={horarioEntrada}
                      onChange={(e) => setHorarioEntrada(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Check-out Previsto
                    </label>
                    <input
                      type="time"
                      value={horarioSaida}
                      onChange={(e) => setHorarioSaida(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Tipo de Atendimento
                    </label>
                    <select
                      value={tipoAtendimento}
                      onChange={(e) => setTipoAtendimento(e.target.value as TipoAtendimento)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    >
                      <option value="HOSPEDAGEM">Hospedagem Completa</option>
                      <option value="DAY_USE">Day Use Fazenda</option>
                      <option value="ALMOCO">Almoço Rural</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Quantidade de Adultos
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={adultos}
                      onChange={(e) => setAdultos(Number(e.target.value))}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Quantidade de Crianças
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={criancas}
                      onChange={(e) => setCriancas(Number(e.target.value))}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. SELEÇÃO DO QUARTO (OS 13 QUARTOS OFICIAIS COM STATUS ANTI-CONFLITO) */}
              <div className="border border-[#c1c9bf] rounded-xl p-4 bg-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#e1e3e4]">
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-[#053d1e]" />
                    <h3 className="font-['Manrope'] text-sm font-bold text-[#191c1d]">
                      3. Escolha o Quarto (13 Quartos)
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full">
                    Período: {formatarData(dataEntrada)} até {formatarData(dataSaida)} ({numeroDiarias}{' '}
                    diária{numeroDiarias > 1 ? 's' : ''})
                  </span>
                </div>

                <p className="text-xs text-[#717971] mb-3">
                  Clique no quarto desejado. Quartos com conflito de reservas para as datas
                  escolhidas ficam bloqueados automaticamente.
                </p>

                {/* Grade dos 13 quartos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {statusDisponibilidade.map(({ quarto, disponivel, motivoIndisponibilidade }) => {
                    const estaSelecionado = quartoSelecionadoId === quarto.QuartoId;

                    return (
                      <div
                        key={quarto.QuartoId}
                        onClick={() => {
                          if (disponivel) {
                            setQuartoSelecionadoId(quarto.QuartoId);
                            setValorDiaria(quarto.ValorDiariaPadrao);
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all text-left relative select-none ${
                          !disponivel
                            ? 'bg-[#f3f4f5] border-[#e1e3e4] opacity-50 cursor-not-allowed'
                            : estaSelecionado
                            ? 'bg-[#b8f0c2]/30 border-2 border-[#053d1e] ring-2 ring-[#053d1e]/20 shadow-xs cursor-pointer'
                            : 'bg-white border-[#c1c9bf] hover:border-[#053d1e] hover:bg-[#f8f9fa] cursor-pointer'
                        }`}
                        title={
                          !disponivel
                            ? motivoIndisponibilidade || 'Quarto ocupado ou reservado'
                            : 'Quarto disponível para este período'
                        }
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="font-['Manrope'] text-base font-bold text-[#191c1d]">
                              {quarto.Numero}
                            </span>
                            <span className="text-[10px] font-bold text-[#053d1e] bg-[#e6f4ea] px-1.5 py-0.5 rounded">
                              {quarto.CodigoIdentificador}
                            </span>
                          </div>
                          {!disponivel ? (
                            <Lock className="w-3.5 h-3.5 text-[#ba1a1a]" />
                          ) : estaSelecionado ? (
                            <CheckCircle2 className="w-4 h-4 text-[#053d1e]" />
                          ) : (
                            <span className="text-[10px] text-[#137333] font-bold">Livre</span>
                          )}
                        </div>

                        <p className="font-['Inter'] text-[11px] font-medium text-[#414941] truncate mt-1">
                          {quarto.Categoria}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#e1e3e4] text-[10px]">
                          <span className="text-[#717971]">Bloco {quarto.Bloco}</span>
                          <span className="font-bold text-[#053d1e]">
                            {formatarMoeda(quarto.ValorDiariaPadrao)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. PACOTE, VALORES & FORMA DE PAGAMENTO */}
              <div className="border border-[#c1c9bf] rounded-xl p-4 bg-white shadow-xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#e1e3e4]">
                  <CreditCard className="w-4 h-4 text-[#053d1e]" />
                  <h3 className="font-['Manrope'] text-sm font-bold text-[#191c1d]">
                    4. Pacotes & Pagamento
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Pacote Promocional
                    </label>
                    <select
                      value={pacoteId ? String(pacoteId) : ''}
                      onChange={(e) => setPacoteId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    >
                      <option value="">Nenhum (Diária Normal)</option>
                      {pacotes.map((p) => (
                        <option key={p.pacoteid} value={String(p.pacoteid)}>
                          {p.nome} ({formatarMoeda(p.valor)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Desconto / Cortesia (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={valorDesconto}
                      onChange={(e) => setValorDesconto(Number(e.target.value))}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Valor de Entrada / Sinal (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={valorPago}
                      onChange={(e) => setValorPago(Number(e.target.value))}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    >
                      <option value="PIX">PIX (Chave da Fazenda)</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="DINHEIRO">Dinheiro Espécie</option>
                      <option value="FATURADO">Faturado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#414941] mb-1">
                      Observações & Solicitações Especiais
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Berço no quarto, restrição alimentar..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="w-full p-2 border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Cartão Resumo Sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-2 bg-[#f8f9fa] border border-[#c1c9bf] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] pb-2 border-b border-[#e1e3e4]">
                  Resumo da Reserva
                </h3>

                {/* Validador de Conflito em Destaque */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    quartoAtualStatus?.disponivel
                      ? 'bg-[#e6f4ea] border-[#b8f0c2] text-[#00210d]'
                      : 'bg-[#ffdad6] border-[#ffb4ab] text-[#93000a]'
                  }`}
                >
                  {quartoAtualStatus?.disponivel ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Quarto Disponível</p>
                        <p className="text-[11px] mt-0.5">
                          Nenhum conflito de reservas para as datas selecionadas.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Atenção: Conflito Detectado</p>
                        <p className="text-[11px] mt-0.5">
                          {quartoAtualStatus?.motivoIndisponibilidade ||
                            'O quarto já possui reserva neste período.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Itens do Resumo */}
                <div className="space-y-2.5 text-xs text-[#414941]">
                  <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                    <span>Hóspede:</span>
                    <span className="font-bold text-[#191c1d] text-right truncate max-w-[140px]">
                      {nomeHospede || '--'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                    <span>Quarto Selecionado:</span>
                    <span className="font-bold text-[#053d1e]">
                      Quarto {quartoAtualStatus?.quarto.Numero} ({quartoAtualStatus?.quarto.CodigoIdentificador})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                    <span>Entrada:</span>
                    <span className="font-medium text-[#191c1d]">
                      {formatarData(dataEntrada)} ({horarioEntrada})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                    <span>Saída:</span>
                    <span className="font-medium text-[#191c1d]">
                      {formatarData(dataSaida)} ({horarioSaida})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                    <span>Diárias:</span>
                    <span className="font-bold text-[#191c1d]">
                      {numeroDiarias} noite{numeroDiarias > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                    <span>Ocupantes:</span>
                    <span className="font-medium text-[#191c1d]">
                      {adultos} Adulto{adultos > 1 ? 's' : ''}
                      {criancas > 0 ? `, ${criancas} Cri` : ''}
                    </span>
                  </div>

                  {pacoteSelecionado && (
                    <div className="flex justify-between py-1 border-b border-[#e1e3e4]">
                      <span>Pacote:</span>
                      <span className="font-semibold text-[#053d1e] text-right truncate max-w-[140px]">
                        {pacoteSelecionado.nome}
                      </span>
                    </div>
                  )}

                  {valorDesconto > 0 && (
                    <div className="flex justify-between py-1 border-b border-[#e1e3e4] text-[#ba1a1a]">
                      <span>Desconto:</span>
                      <span className="font-semibold">-{formatarMoeda(valorDesconto)}</span>
                    </div>
                  )}
                </div>

                {/* Totalizador Financeiro */}
                <div className="pt-2 border-t border-[#c1c9bf] space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-[#191c1d] uppercase">Valor Total:</span>
                    <span className="font-['Manrope'] text-xl font-extrabold text-[#053d1e]">
                      {formatarMoeda(valorTotalFinal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-[#414941]">Sinal / Pago:</span>
                    <span className="font-semibold text-[#137333]">
                      {formatarMoeda(valorPago)}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#717971]">Saldo no Check-in:</span>
                    <span
                      className={saldoRestante > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}
                    >
                      {formatarMoeda(saldoRestante)}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={enviando || (quartoAtualStatus && !quartoAtualStatus.disponivel)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                      quartoAtualStatus && !quartoAtualStatus.disponivel
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#053d1e] hover:bg-[#225533] text-white active:scale-98 cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{enviando ? 'Validando e Salvando...' : 'Confirmar e Salvar Reserva'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onFechar}
                    className="w-full py-2 px-3 text-xs font-semibold text-[#414941] hover:bg-[#e1e3e4] rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
