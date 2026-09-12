import React, { createContext, useContext, useEffect, useState } from 'react';
import { calcularDisponibilidadeQuartos, StatusDisponibilidadeQuarto, verificarConflitoQuarto } from '../servicos/conflitoReservas';
import { AuthService } from '../servicos/supabase/AuthService';
import { SupabaseService } from '../servicos/supabase/SupabaseService';
import {
  ConfiguracaoSistema, ConsumoExtra, Hospede, Pagamento, Pacote, PaginaNavegacao, Produto, Quarto, Reserva, StatusQuarto, StatusReserva, Usuario, Venda,
} from '../tipos';

const usuarioPadrao: Usuario = {
  usuarioid: 0, perfilid: 0, nome: '', email: '', senha: '', perfil: 'ADMIN', ativo: true,
  datainclusao: new Date().toISOString(), dataoperacao: new Date().toISOString(), naturezaoperacao: 'INSERT',
};

const configuracaoPadrao: ConfiguracaoSistema = {
  checkintime: '09:00', checkouttime: '15:00', hotelnome: 'Fazenda Anew', hotellocalizacao: '',
  telefonehotel: '', emailhotel: '', taxaservicopercentual: 0, supabaseurl: '', supabaseanonkey: '',
  modoofflineativo: false, criancaidadelimitegratis: 5, criancaidadelimitemeia: 11, criancaidadeintegral: 12,
  criancaporcentagemmeiadiaria: 50, criancaDescontogratuis: 100, capacidademaximaadultosporquarto: 4,
  capacidademaximacriancasporquarto: 3, formapagamentopadrao: 'PIX', porcentagementradaminima: 30,
};

interface ContextoHotelType {
  quartos: Quarto[];
  reservas: Reserva[];
  hospedes: Hospede[];
  produtos: Produto[];
  consumosExtras: ConsumoExtra[];
  vendas: Venda[];
  pacotes: Pacote[];
  configuracoes: ConfiguracaoSistema;
  pagamentos: Pagamento[]; // <-- ADICIONADO
  usuarioAtual: Usuario;
  usuarios: Usuario[];
  paginaAtual: PaginaNavegacao;
  dataSistema: string;
  online: boolean;
  autenticado: boolean;
  carregando: boolean;
  erro: string | null;

  login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => Promise<void>;
  navegarPara: (pagina: PaginaNavegacao) => void;
  trocarUsuario: (usuarioId: number | string) => void;
  atualizarStatusQuarto: (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => Promise<void>;
  obterQuartoPorId: (quartoId: number | string) => Quarto | undefined;
  obterQuartoPorNumero: (numero: string) => Quarto | undefined;
  verificarDisponibilidade: (dataEntrada: string, dataSaida: string, reservaIdIgnorar?: number | string) => StatusDisponibilidadeQuarto[];
  criarReserva: (novaReserva: Omit<Reserva, 'reservaid' | 'codigo' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'statusreserva'> & { statusreserva?: StatusReserva }) => Promise<{ sucesso: boolean; mensagem: string; reserva?: Reserva }>;
  atualizarReserva: (id: number | string, dados: Partial<Reserva>) => Promise<{ sucesso: boolean; mensagem: string }>;
  cancelarReserva: (id: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckin: (reservaId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckout: (reservaId: number | string, pagamentos?: Array<Pick<Pagamento, 'valor' | 'formapagamento' | 'tipolancamento'>>) => Promise<{ sucesso: boolean; mensagem: string }>;
  criarConsumoExtra: (consumo: Omit<ConsumoExtra, 'consumoid' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'>) => Promise<{ sucesso: boolean; mensagem: string; consumo?: ConsumoExtra }>;
  excluirConsumoExtra: (consumoId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  cadastrarHospede: (hospede: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>) => Promise<Hospede>;
  editarHospede: (id: number | string, dados: Partial<Hospede>) => Promise<void>;
  excluirHospede: (id: number | string) => Promise<boolean>;
  registrarVenda: (venda: Omit<Venda, 'vendaid' | 'codigo' | 'datahora' | 'datainclusao' | 'dataoperacao' | 'ativo'>) => Promise<Venda>;
  atualizarEstoqueProduto: (produtoId: number | string, quantidadeDelta: number) => Promise<void>;
  criarProduto: (dados: Omit<Produto, 'produtoid' | 'datainclusao' | 'dataoperacao' | 'ativo'> & { ativo?: boolean }) => Promise<Produto>;
  editarProduto: (id: number | string, dados: Partial<Produto>) => Promise<{ sucesso: boolean; mensagem: string }>;
  excluirProduto: (id: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  salvarConfiguracoes: (novasConfiguracoes: Partial<ConfiguracaoSistema>) => Promise<void>;
  restaurarDadosPadrao: () => void;
}

const ContextoHotel = createContext<ContextoHotelType | undefined>(undefined);

const normalizarQuartoDoBanco = (quarto: any): Quarto => {
  if (!quarto) return null as any;
  const d = quarto;
  return {
    quartoid: d.quartoid ?? d.QuartoId ?? 0, numero: d.numero ?? d.Numero ?? 'S/N',
    codigoidentificador: d.codigoidentificador ?? d.CodigoIdentificador ?? d.numero ?? 'S/N',
    bloco: d.bloco ?? d.Bloco ?? 'A', categoria: d.categoria ?? d.Categoria ?? 'Standard',
    capacidadeadultos: Number(d.capacidadeadultos ?? d.CapacidadeAdultos ?? 2),
    capacidadecriancas: Number(d.capacidadecriancas ?? d.CapacidadeCriancas ?? 0),
    valordiariapadrao: Number(d.valordiariapadrao ?? d.ValorDiariaPadrao ?? 0),
    status: (d.status ?? d.Status ?? 'DISPONIVEL').toUpperCase() as StatusQuarto,
    descricao: d.descricao ?? d.Descricao ?? '', comodidades: d.comodidades ?? d.Comodidades ?? '',
    ativo: d.ativo ?? d.Ativo ?? true, reservaatualid: d.reservaatualid ?? d.ReservaAtualId,
    hospedeatualnome: d.hospedeatualnome ?? d.HospedeAtualNome, dataentradaatual: d.dataentradaatual ?? d.DataEntradaAtual,
    datasaidaatual: d.datasaidaatual ?? d.DataSaidaAtual, adultosatual: Number(d.adultosatual ?? d.AdultosAtual ?? 0),
    criancasatual: Number(d.criancasatual ?? d.CriancasAtual ?? 0), usuarioinclusao: d.usuarioinclusao ?? d.UsuarioInclusao,
    datainclusao: d.datainclusao ?? d.DataInclusao ?? new Date().toISOString(),
    usuariooperacao: d.usuariooperacao ?? d.UsuarioOperacao, dataoperacao: d.dataoperacao ?? d.DataOperacao ?? new Date().toISOString(),
    naturezaoperacao: d.naturezaoperacao ?? d.NaturezaOperacao ?? 'INSERT',
  };
};

const normalizarStatusReserva = (status: unknown): StatusReserva => {
  const statusNormalizado = String(status || '').toUpperCase();
  if (statusNormalizado === 'CONFIRMADA') return 'RESERVADO';
  if (statusNormalizado === 'FINALIZADA') return 'CONCLUIDA';
  if (['PRE_RESERVA', 'RESERVADO', 'HOSPEDADO', 'CONCLUIDA', 'CANCELADA'].includes(statusNormalizado)) {
    return statusNormalizado as StatusReserva;
  }
  return 'PRE_RESERVA';
};

export const ProvedorHotel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authService = new AuthService();
  const supabaseService = SupabaseService.getInstance();

  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [hospedes, setHospedes] = useState<Hospede[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [consumosExtras, setConsumosExtras] = useState<ConsumoExtra[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]); // <-- ADICIONADO
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSistema>(configuracaoPadrao);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [usuarioAtual, setUsuarioAtual] = useState<Usuario>(usuarioPadrao);
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<PaginaNavegacao>('login');
  const [dataSistema] = useState<string>(new Date().toISOString().slice(0, 10));
  const [online, setOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregarDadosDoBanco = async () => {
      const client = supabaseService.getClient();
      if (!client) {
        setCarregando(false);
        setErro('Cliente Supabase não inicializado.');
        return;
      }

      try {
        setCarregando(true);
        setErro(null);

        const [quartosResult, reservasResult, hospedesResult, produtosResult, vendasResult, pacotesResult, usuariosResult, configuracaoResult, consumosResult, pagamentosResult] = await Promise.all([
          client.from('quarto').select('*').eq('ativo', true),
          client.from('reserva').select('*'),
          client.from('hospede').select('*').eq('ativo', true),
          client.from('produto').select('*').eq('ativo', true),
          client.from('venda').select('*'),
          client.from('pacote').select('*').eq('ativo', true),
          client.from('usuario').select('*').eq('ativo', true),
          client.from('configuracao').select('*').eq('ativo', true),
          client.from('consumo_extra').select('*').eq('ativo', true),
          client.from('pagamento').select('*').eq('ativo', true), // <-- ADICIONADO
        ]);

        if (quartosResult.error) setErro(`Erro ao buscar quartos: ${quartosResult.error.message}`);
        else if (quartosResult.data) setQuartos(quartosResult.data.map(normalizarQuartoDoBanco));

        if (!reservasResult.error && reservasResult.data) {
          const reservasComQuartos = reservasResult.data.map((reserva: any) => {
            const quarto = quartosResult.data?.find((q: any) => q.quartoid === reserva.quartoid);
            const hospede = hospedesResult.data?.find((h: any) => Number(h.hospedeid) === Number(reserva.hospedeid));
            return {
              ...reserva,
              statusreserva: normalizarStatusReserva(reserva.statusreserva ?? reserva.status),
              quartonumero: quarto?.numero || 'N/A',
              quartocodigo: quarto?.codigoidentificador || quarto?.numero || 'N/A',
              quartocategoria: quarto?.categoria || 'N/A',
              hospedenome: hospede?.nomecompleto || 'Hóspede não encontrado',
              hospedetelefone: hospede?.telefone || '',
              hospedeemail: hospede?.email || '',
            };
          });
          setReservas(reservasComQuartos);
        }
        
        if (!hospedesResult.error && hospedesResult.data) setHospedes(hospedesResult.data as Hospede[]);
        if (!produtosResult.error && produtosResult.data) setProdutos(produtosResult.data as Produto[]);
        if (!consumosResult.error && consumosResult.data) setConsumosExtras(consumosResult.data as ConsumoExtra[]);
        if (!vendasResult.error && vendasResult.data) setVendas(vendasResult.data as Venda[]);
        if (!pacotesResult.error && pacotesResult.data) setPacotes(pacotesResult.data as Pacote[]);
        if (!usuariosResult.error && usuariosResult.data) setUsuarios(usuariosResult.data as Usuario[]);
        
        // <-- ADICIONADO: Carregar pagamentos
        if (!pagamentosResult.error && pagamentosResult.data) {
          setPagamentos(pagamentosResult.data as Pagamento[]);
        }

        if (!configuracaoResult.error && configuracaoResult.data) {
          const configBanco = configuracaoResult.data.reduce((resultado: any, item: any) => {
            const chave = String(item.chave ?? item.Chave ?? '').toLowerCase();
            if (chave === 'checkintime') resultado.checkintime = item.valor ?? item.Valor;
            if (chave === 'checkouttime') resultado.checkouttime = item.valor ?? item.Valor;
            return resultado;
          }, {});
          setConfiguracoes({ ...configuracaoPadrao, ...configBanco });
        }

        const usuarioSalvo = authService.getUsuarioLogado();
        if (usuarioSalvo) {
          setUsuarioAtual(usuarioSalvo);
          setAutenticado(true);
          setPaginaAtual('dashboard');
        }
      } catch (error: any) {
        setErro(error?.message || 'Erro inesperado ao carregar dados.');
      } finally {
        setCarregando(false);
      }
    };
    carregarDadosDoBanco();
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const login = async (email: string, senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
    if (!online) return { sucesso: false, erro: '🚫 Sistema offline.' };
    try {
      const resultado = await authService.login(email, senha);
      if (resultado.sucesso && resultado.dados) {
        setUsuarioAtual(resultado.dados as Usuario);
        setAutenticado(true);
        setPaginaAtual('dashboard');
        return { sucesso: true };
      }
      return { sucesso: false, erro: resultado.erro || 'E-mail ou senha inválidos.' };
    } catch (error: any) {
      return { sucesso: false, erro: error?.message || 'Erro ao conectar.' };
    }
  };

  const logout = async () => {
    await authService.logout();
    setAutenticado(false);
    setUsuarioAtual(usuarioPadrao);
    setPaginaAtual('login');
  };

  const navegarPara = (pagina: PaginaNavegacao) => {
    setPaginaAtual(pagina);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const trocarUsuario = (usuarioId: number | string) => {
    const usr = usuarios.find((u) => String(u.usuarioid) === String(usuarioId));
    if (usr) setUsuarioAtual(usr);
  };

  const obterQuartoPorId = (quartoId: number | string) => quartos.find((q) => String(q.quartoid) === String(quartoId));
  const obterQuartoPorNumero = (numero: string) => quartos.find((q) => q.numero?.toUpperCase() === numero.toUpperCase());

  const atualizarStatusQuarto = async (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    setQuartos(prev => prev.map(q => String(q.quartoid) === String(quartoId) ? { ...q, status: novoStatus, descricao: motivoBloqueio, dataoperacao: agora, naturezaoperacao: 'UPDATE' } : q) as Quarto[]);
    if (client) {
      await client.from('quarto').update({ status: novoStatus, descricao: motivoBloqueio, dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' }).eq('quartoid', quartoId);
    }
  };

  const verificarDisponibilidade = (dataEntrada: string, dataSaida: string, reservaIdIgnorar?: number | string) => {
    return calcularDisponibilidadeQuartos(quartos, reservas, dataEntrada, dataSaida, reservaIdIgnorar);
  };

  const criarReserva = async (dados: any): Promise<{ sucesso: boolean; mensagem: string; reserva?: Reserva }> => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Sem conexão com o banco.' };

    const conflito = verificarConflitoQuarto(dados.quartoid, dados.dataentrada, dados.datasaida, reservas, undefined, dados.tipoatendimento);
    if (conflito.temConflito) return { sucesso: false, mensagem: conflito.motivo || 'Conflito de datas.' };

    const quarto = obterQuartoPorId(dados.quartoid);
    if (!quarto) return { sucesso: false, mensagem: 'Quarto não encontrado.' };
    if (quarto.status === 'MANUTENCAO') return { sucesso: false, mensagem: `Quarto ${quarto.numero} em manutenção.` };

    const agora = new Date().toISOString();
    const valorTotal = Number(dados.valortotal || 0);
    const valorPago = Number(dados.valorpago || 0);
    const percentualPago = valorTotal > 0 ? (valorPago / valorTotal) * 100 : 0;
    let statusInicial: StatusReserva = percentualPago >= 50 ? 'RESERVADO' : 'PRE_RESERVA';
    if (dados.statusreserva === 'HOSPEDADO' || dados.statusreserva === 'CANCELADA') statusInicial = dados.statusreserva;

    const maiorNumeroCodigo = reservas.reduce((maior, reserva) => {
      const correspondencia = String(reserva.codigo || '').match(/^#RES-(\d+)$/i);
      const numero = correspondencia ? Number(correspondencia[1]) : 0;
      return Number.isFinite(numero) ? Math.max(maior, numero) : maior;
    }, 0);
    const proximoCodigo = `#RES-${String(maiorNumeroCodigo + 1).padStart(3, '0')}`;

    const novaReserva: Reserva = {
      ...dados, reservaid: 0, codigo: proximoCodigo, quartonumero: quarto.numero, quartocodigo: quarto.codigoidentificador,
      quartocategoria: quarto.categoria, statusreserva: statusInicial, ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid, datainclusao: agora, usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora, naturezaoperacao: 'INSERT',
    };

    const dadosParaBanco = {
      codigo: novaReserva.codigo, hospedeid: novaReserva.hospedeid, quartoid: novaReserva.quartoid,
      adultos: novaReserva.adultos, criancas: novaReserva.criancas, dataentrada: novaReserva.dataentrada,
      datasaida: novaReserva.datasaida, horarioprevistochegada: novaReserva.horarioprevistochegada,
      tipoatendimento: novaReserva.tipoatendimento, pacoteid: novaReserva.pacoteid, statusreserva: novaReserva.statusreserva,
      valortotal: novaReserva.valortotal, valorpago: novaReserva.valorpago, saldo: novaReserva.saldo,
      statuspagamento: novaReserva.statuspagamento, formapagamento: novaReserva.formapagamento,
      observacoes: novaReserva.observacoes, ativo: novaReserva.ativo, usuarioinclusao: novaReserva.usuarioinclusao,
      datainclusao: novaReserva.datainclusao, usuariooperacao: novaReserva.usuariooperacao,
      dataoperacao: novaReserva.dataoperacao, naturezaoperacao: novaReserva.naturezaoperacao,
    };

    const { data, error } = await client.from('reserva').insert(dadosParaBanco).select().single();
    if (error) return { sucesso: false, mensagem: 'Erro ao salvar: ' + error.message };

    if (valorPago > 0) {
      await client.from('pagamento').insert({
        reservaid: data.reservaid, valor: valorPago, formapagamento: novaReserva.formapagamento || 'PIX',
        status: 'PAGO', datapagamento: agora, tipolancamento: 'SINAL_RESERVA', ativo: true,
        usuarioinclusao: usuarioAtual?.usuarioid, datainclusao: agora, usuariooperacao: usuarioAtual?.usuarioid,
        dataoperacao: agora, naturezaoperacao: 'INSERT',
      });
    }

    const reservaSalva = { ...novaReserva, ...data, quartonumero: quarto.numero, quartocodigo: quarto.codigoidentificador, quartocategoria: quarto.categoria } as Reserva;
    setReservas(prev => [reservaSalva, ...prev]);
    
    if (String(dados.tipoatendimento || '').toUpperCase() !== 'DAY_USE') {
      await atualizarStatusQuarto(quarto.quartoid, statusInicial === 'HOSPEDADO' ? 'OCUPADO' : 'RESERVADO');
    }

    return { sucesso: true, mensagem: `Reserva ${reservaSalva.codigo} criada com sucesso!`, reserva: reservaSalva };
  };

  const atualizarReserva = async (id: number | string, dados: Partial<Reserva>): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reservaExistente = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reservaExistente) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosAtualizados = {
      ...dados,
      saldo: Number(dados.valortotal ?? reservaExistente.valortotal) - Number(dados.valorpago ?? reservaExistente.valorpago),
      dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE',
    };

    if (client) await client.from('reserva').update(dadosAtualizados).eq('reservaid', id);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r) as Reserva[]);
    return { sucesso: true, mensagem: 'Reserva atualizada com sucesso.' };
  };

  const cancelarReserva = async (id: number | string, motivo?: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosAtualizados = {
      statusreserva: 'CANCELADA' as StatusReserva,
      observacoes: motivo ? `${reserva.observacoes || ''} [Cancelada: ${motivo}]` : reserva.observacoes,
      dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE',
    };

    if (client) await client.from('reserva').update(dadosAtualizados).eq('reservaid', id);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r) as Reserva[]);
    if (reserva.quartoid && (reserva.statusreserva === 'RESERVADO' || reserva.statusreserva === 'PRE_RESERVA')) {
      await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');
    }
    return { sucesso: true, mensagem: `Reserva ${reserva.codigo} cancelada.` };
  };

  const realizarCheckin = async (reservaId: number | string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosReserva = { statusreserva: 'HOSPEDADO' as StatusReserva, checkinrealizadoem: agora, checkinusuario: usuarioAtual?.usuarioid, dataoperacao: agora, naturezaoperacao: 'UPDATE' };

    if (client) await client.from('reserva').update(dadosReserva).eq('reservaid', reservaId);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(reservaId) ? { ...r, ...dadosReserva } : r) as Reserva[]);
    await atualizarStatusQuarto(reserva.quartoid, 'OCUPADO');
    return { sucesso: true, mensagem: `Check-in de ${reserva.hospedenome} realizado!` };
  };

  const realizarCheckout = async (reservaId: number | string, pagamentosInput: Array<Pick<Pagamento, 'valor' | 'formapagamento' | 'tipolancamento'>> = []): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const pagamentosConfirmados = pagamentosInput.filter((pagamento) => Number(pagamento.valor) > 0);
    
    if (client && pagamentosConfirmados.length > 0) {
      const registros = pagamentosConfirmados.map((pagamento) => ({
        ...pagamento, reservaid: reservaId, status: 'PAGO', datapagamento: agora, ativo: true,
        usuarioinclusao: usuarioAtual?.usuarioid, datainclusao: agora, usuariooperacao: usuarioAtual?.usuarioid,
        dataoperacao: agora, naturezaoperacao: 'INSERT',
      }));
      const { error: erroPagamento } = await client.from('pagamento').insert(registros);
      if (erroPagamento) return { sucesso: false, mensagem: `Erro ao registrar pagamento: ${erroPagamento.message}` };
    }

    const totalConsumos = consumosExtras.filter((consumo) => String(consumo.reservaid) === String(reservaId) && consumo.ativo).reduce((total, consumo) => total + Number(consumo.valortotal || 0), 0);
    const valorPagoFinal = reserva.valorpago + pagamentosConfirmados.reduce((total, pagamento) => total + Number(pagamento.valor), 0);
    
    const dadosReserva = {
      statusreserva: 'CONCLUIDA' as StatusReserva, valorpago: valorPagoFinal,
      saldo: Math.max(0, reserva.valortotal + totalConsumos - valorPagoFinal), statuspagamento: 'PAGO' as const,
      checkoutrealizadoem: agora, checkoutusuario: usuarioAtual?.usuarioid, dataoperacao: agora, naturezaoperacao: 'UPDATE'
    };

    if (client) await client.from('reserva').update(dadosReserva).eq('reservaid', reservaId);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(reservaId) ? { ...r, ...dadosReserva } : r) as Reserva[]);
    await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');

    return { sucesso: true, mensagem: `Check-out do Quarto ${reserva.quartonumero} finalizado!` };
  };

  const criarConsumoExtra = async (dados: Omit<ConsumoExtra, 'consumoid' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'>): Promise<{ sucesso: boolean; mensagem: string; consumo?: ConsumoExtra }> => {
    const client = supabaseService.getClient();
    const produto = produtos.find((item) => String(item.produtoid) === String(dados.produtoid));
    if (!produto) return { sucesso: false, mensagem: 'Produto não encontrado.' };
    if (dados.quantidade <= 0) return { sucesso: false, mensagem: 'A quantidade deve ser maior que zero.' };
    if (produto.estoque < dados.quantidade) return { sucesso: false, mensagem: 'Estoque insuficiente.' };

    const agora = new Date().toISOString();
    const consumo: ConsumoExtra = {
      ...dados, consumoid: Date.now(), produtoid: produto.produtoid, produtonome: produto.nome,
      valorunitario: produto.preco, valortotal: Number((dados.quantidade * produto.preco).toFixed(2)),
      ativo: true, datainclusao: agora, dataoperacao: agora, usuarioinclusao: usuarioAtual?.usuarioid,
      usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'INSERT',
    };

    if (client) {
      const { data, error } = await client.from('consumo_extra').insert({
        reservaid: consumo.reservaid, produtoid: consumo.produtoid, quantidade: consumo.quantidade,
        valorunitario: consumo.valorunitario, valortotal: consumo.valortotal, dataconsumo: consumo.dataconsumo,
        categoria: consumo.categoria, descricao: consumo.descricao, ativo: consumo.ativo,
        usuarioinclusao: consumo.usuarioinclusao, datainclusao: consumo.datainclusao,
      }).select().single();
      
      if (error) return { sucesso: false, mensagem: `Erro ao lançar consumo: ${error.message}` };
      if (data) consumo.consumoid = data.consumoid;
      await atualizarEstoqueProduto(produto.produtoid, -dados.quantidade);
    }
    setConsumosExtras((prev) => [consumo, ...prev]);
    return { sucesso: true, mensagem: 'Consumo lançado com sucesso.', consumo };
  };

  const excluirConsumoExtra = async (consumoId: number | string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const consumo = consumosExtras.find((item) => String(item.consumoid) === String(consumoId));
    if (!consumo) return { sucesso: false, mensagem: 'Consumo não encontrado.' };
    const client = supabaseService.getClient();
    if (client) {
      const { error } = await client.from('consumo_extra').update({ ativo: false }).eq('consumoid', consumoId);
      if (error) return { sucesso: false, mensagem: `Erro ao excluir consumo: ${error.message}` };
      if (consumo.produtoid) await atualizarEstoqueProduto(consumo.produtoid, consumo.quantidade);
    }
    setConsumosExtras((prev) => prev.filter((item) => String(item.consumoid) !== String(consumoId)));
    return { sucesso: true, mensagem: 'Consumo excluído com sucesso.' };
  };

  const cadastrarHospede = async (dados: any): Promise<Hospede> => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const novo: Hospede = { ...dados, hospedeid: Date.now(), ativo: true, usuarioinclusao: usuarioAtual?.usuarioid, datainclusao: agora, usuariooperacao: usuarioAtual?.usuarioid, dataoperacao: agora, naturezaoperacao: 'INSERT' };
    if (client) {
      const { data } = await client.from('hospede').insert(novo).select().single();
      if (data) { setHospedes(prev => [data as Hospede, ...prev]); return data as Hospede; }
    }
    setHospedes(prev => [novo, ...prev]);
    return novo;
  };

  const editarHospede = async (id: number | string, dados: Partial<Hospede>): Promise<void> => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const dadosAtualizados = { ...dados, dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };
    if (client) await client.from('hospede').update(dadosAtualizados).eq('hospedeid', id);
    setHospedes(prev => prev.map(h => String(h.hospedeid) === String(id) ? { ...h, ...dadosAtualizados } : h) as Hospede[]);
  };

  const excluirHospede = async (id: number | string): Promise<boolean> => {
    const client = supabaseService.getClient();
    const temReservaAtiva = reservas.some(r => String(r.hospedeid) === String(id) && ['RESERVADO', 'PRE_RESERVA', 'HOSPEDADO'].includes(r.statusreserva));
    if (temReservaAtiva) return false;
    if (client) await client.from('hospede').delete().eq('hospedeid', id);
    setHospedes(prev => prev.filter(h => String(h.hospedeid) !== String(id)));
    return true;
  };

  const registrarVenda = async (dados: any): Promise<Venda> => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const novaVenda: Venda = { ...dados, vendaid: Date.now(), codigo: `VND-${Math.floor(100 + Math.random() * 900)}`, datahora: agora, usuarioresponsavel: usuarioAtual?.usuarioid, ativo: true, usuarioinclusao: usuarioAtual?.usuarioid, datainclusao: agora, usuariooperacao: usuarioAtual?.usuarioid, dataoperacao: agora, naturezaoperacao: 'INSERT' };
    if (client) {
      const { data } = await client.from('venda').insert(novaVenda).select().single();
      if (data) {
        dados.itens.forEach((item: any) => { if (item.produtoid) atualizarEstoqueProduto(item.produtoid, -item.quantidade); });
        setVendas(prev => [data as Venda, ...prev]);
        return data as Venda;
      }
    }
    dados.itens.forEach((item: any) => { if (item.produtoid) atualizarEstoqueProduto(item.produtoid, -item.quantidade); });
    setVendas(prev => [novaVenda, ...prev]);
    return novaVenda;
  };

  const atualizarEstoqueProduto = async (produtoId: number | string, delta: number): Promise<void> => {
    const client = supabaseService.getClient();
    const produto = produtos.find(p => String(p.produtoid) === String(produtoId));
    if (!produto) return;
    const novoEstoque = Math.max(0, Number(produto.estoque) + Number(delta));
    const agora = new Date().toISOString();
    const dadosAtualizados = { estoque: novoEstoque, dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };
    if (client) await client.from('produto').update(dadosAtualizados).eq('produtoid', produtoId);
    setProdutos(prev => prev.map(p => String(p.produtoid) === String(produtoId) ? { ...p, ...dadosAtualizados } : p) as Produto[]);
  };

  const criarProduto = async (dados: Omit<Produto, 'produtoid' | 'datainclusao' | 'dataoperacao' | 'ativo'> & { ativo?: boolean }): Promise<Produto> => {
    const agora = new Date().toISOString();
    const produto: Produto = { ...dados, produtoid: 0, ativo: dados.ativo ?? true, datainclusao: agora, dataoperacao: agora, usuarioinclusao: usuarioAtual?.usuarioid, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'INSERT' };
    const client = supabaseService.getClient();
    if (client) {
      const { produtoid: _produtoid, ...dadosParaBanco } = produto;
      const { data, error } = await client.from('produto').insert(dadosParaBanco).select().single();
      if (error) throw new Error(`Erro ao cadastrar produto: ${error.message}`);
      if (data) Object.assign(produto, data);
    }
    setProdutos((prev) => [produto, ...prev]);
    return produto;
  };

  const editarProduto = async (id: number | string, dados: Partial<Produto>): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const atualizado = { ...dados, dataoperacao: new Date().toISOString(), usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };
    if (client) {
      const { error } = await client.from('produto').update(atualizado).eq('produtoid', id);
      if (error) return { sucesso: false, mensagem: `Erro ao atualizar produto: ${error.message}` };
    }
    setProdutos((prev) => prev.map((produto) => String(produto.produtoid) === String(id) ? { ...produto, ...atualizado } as Produto : produto));
    return { sucesso: true, mensagem: 'Produto atualizado com sucesso.' };
  };

  const excluirProduto = async (id: number | string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    if (client) {
      const { error } = await client.from('produto').update({ ativo: false, dataoperacao: new Date().toISOString(), naturezaoperacao: 'UPDATE' }).eq('produtoid', id);
      if (error) return { sucesso: false, mensagem: `Erro ao inativar produto: ${error.message}` };
    }
    setProdutos((prev) => prev.filter((produto) => String(produto.produtoid) !== String(id)));
    return { sucesso: true, mensagem: 'Produto inativado com sucesso.' };
  };

  const salvarConfiguracoes = async (novas: Partial<ConfiguracaoSistema>): Promise<void> => {
    const client = supabaseService.getClient();
    setConfiguracoes(prev => {
      const atualizado = { ...prev, ...novas };
      if (client) client.from('configuracao').upsert(atualizado);
      return atualizado;
    });
  };

  const restaurarDadosPadrao = () => {
    setQuartos([]); setReservas([]); setHospedes([]); setProdutos([]); setConsumosExtras([]);
    setVendas([]); setPacotes([]); setPagamentos([]); setConfiguracoes(configuracaoPadrao);
    setUsuarios([]); setUsuarioAtual(usuarioPadrao); setAutenticado(false); setPaginaAtual('login');
  };

  return (
    <ContextoHotel.Provider value={{
      quartos, reservas, hospedes, produtos, consumosExtras, vendas, pacotes, configuracoes, pagamentos, // <-- ADICIONADO 'pagamentos'
      usuarioAtual, usuarios, paginaAtual, dataSistema, online, autenticado,
      carregando, erro, login, logout, navegarPara, trocarUsuario,
      atualizarStatusQuarto, obterQuartoPorId, obterQuartoPorNumero,
      verificarDisponibilidade, criarReserva, atualizarReserva, cancelarReserva,
      realizarCheckin, realizarCheckout, criarConsumoExtra, excluirConsumoExtra,
      cadastrarHospede, editarHospede, excluirHospede, registrarVenda, atualizarEstoqueProduto,
      criarProduto, editarProduto, excluirProduto, salvarConfiguracoes, restaurarDadosPadrao,
    }}>
      {children}
    </ContextoHotel.Provider>
  );
};

export const useHotel = () => {
  const contexto = useContext(ContextoHotel);
  if (!contexto) throw new Error('useHotel deve ser utilizado dentro de um ProvedorHotel');
  return contexto;
};

export const ContextoHotelProvider = ProvedorHotel;