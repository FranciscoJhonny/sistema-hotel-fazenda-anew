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
  pacotes: Pacote[];
  configuracoes: ConfiguracaoSistema;
  pagamentos: Pagamento[];
  usuarioAtual: Usuario;
  usuarios: Usuario[];
  paginaAtual: PaginaNavegacao;
  dataSistema: string;
  online: boolean;
  autenticado: boolean;
  carregando: boolean;
  erro: string | null;

  login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string; usuario?: Usuario }>;
  logout: () => Promise<void>;
  navegarPara: (pagina: PaginaNavegacao) => void;
  trocarUsuario: (usuarioId: number | string) => void;
  atualizarStatusQuarto: (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => Promise<void>;
  criarQuarto: (dados: Omit<Quarto, 'quartoid' | 'valordiariapadrao' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'> & { ativo?: boolean }) => Promise<{ sucesso: boolean; mensagem: string; quarto?: Quarto }>;
  editarQuarto: (id: number | string, dados: Partial<Quarto>) => Promise<{ sucesso: boolean; mensagem: string }>;
  excluirQuarto: (id: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  obterQuartoPorId: (quartoId: number | string) => Quarto | undefined;
  obterQuartoPorNumero: (numero: string) => Quarto | undefined;
  verificarDisponibilidade: (dataEntrada: string, dataSaida: string, reservaIdIgnorar?: number | string) => StatusDisponibilidadeQuarto[];
  criarReserva: (novaReserva: Omit<Reserva, 'reservaid' | 'codigo' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'statusreserva'> & { statusreserva?: StatusReserva; cadastroid?: number }) => Promise<{ sucesso: boolean; mensagem: string; reserva?: Reserva }>;
  atualizarReserva: (id: number | string, dados: Partial<Reserva>) => Promise<{ sucesso: boolean; mensagem: string }>;
  cancelarReserva: (id: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  suspenderReservaComCredito: (id: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  trocarQuartoReserva: (reservaId: number | string, novoQuartoId: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckin: (reservaId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckout: (reservaId: number | string, pagamentos?: Array<Pick<Pagamento, 'valor' | 'formapagamento' | 'tipolancamento'>>) => Promise<{ sucesso: boolean; mensagem: string }>;
  criarConsumoExtra: (consumo: Omit<ConsumoExtra, 'consumoid' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'>) => Promise<{ sucesso: boolean; mensagem: string; consumo?: ConsumoExtra }>;
  excluirConsumoExtra: (consumoId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  cadastrarHospede: (hospede: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>) => Promise<Hospede>;
  editarHospede: (id: number | string, dados: Partial<Hospede>) => Promise<void>;
  excluirHospede: (id: number | string) => Promise<boolean>;
  atualizarEstoqueProduto: (produtoId: number | string, quantidadeDelta: number) => Promise<void>;
  criarProduto: (dados: Omit<Produto, 'produtoid' | 'datainclusao' | 'dataoperacao' | 'ativo'> & { ativo?: boolean }) => Promise<Produto>;
  editarProduto: (id: number | string, dados: Partial<Produto>) => Promise<{ sucesso: boolean; mensagem: string }>;
  excluirProduto: (id: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  registrarVenda: (dados: Partial<Venda> & { itens: Venda['itens'] }) => Promise<Venda>;
  salvarConfiguracoes: (novasConfiguracoes: Partial<ConfiguracaoSistema>) => Promise<void>;
  restaurarDadosPadrao: () => void;
  recarregarDados: () => Promise<void>;
}

const ContextoHotel = createContext<ContextoHotelType | undefined>(undefined);

const normalizarQuartoDoBanco = (quarto: any): Quarto => {
  if (!quarto) return null as any;
  const d = quarto;
  return {
    quartoid: d.quartoid ?? d.QuartoId ?? 0, numero: d.numero ?? d.Numero ?? 'S/N',
    codigoidentificador: d.codigoidentificador ?? d.CodigoIdentificador ?? d.numero ?? 'S/N',
    bloco: d.bloco ?? d.Bloco ?? 'A', categoria: d.categoria ?? d.Categoria ?? 'Standard',
    quantidadecamascasal: Number(d.quantidadecamascasal ?? d.QuantidadeCamasCasal ?? 1),
    quantidadecamassolteiro: Number(d.quantidadecamassolteiro ?? d.QuantidadeCamasSolteiro ?? 0),
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
  if (['PRE_RESERVA', 'RESERVADO', 'HOSPEDADO', 'CONCLUIDA', 'CANCELADA', 'CREDITO'].includes(statusNormalizado)) {
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
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSistema>(configuracaoPadrao);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [usuarioAtual, setUsuarioAtual] = useState<Usuario>(usuarioPadrao);
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<PaginaNavegacao>('login');
  const [dataSistema] = useState<string>(new Date().toISOString().slice(0, 10));
  const [online, setOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregarDados = async () => {
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
        client.from('hospede').select('*').eq('ativo', true).order('nomecompleto', { ascending: true }),
        client.from('produto').select('*').eq('ativo', true),
        client.from('venda').select('*'),
        client.from('pacote').select('*').eq('ativo', true),
        client.from('usuario').select('*').eq('ativo', true),
        client.from('configuracao').select('*').eq('ativo', true),
        client.from('consumo_extra').select('*').eq('ativo', true),
        client.from('pagamento').select('*').eq('ativo', true),
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
      if (!pacotesResult.error && pacotesResult.data) setPacotes(pacotesResult.data as Pacote[]);
      if (!usuariosResult.error && usuariosResult.data) setUsuarios(usuariosResult.data as Usuario[]);
      if (!pagamentosResult.error && pagamentosResult.data) setPagamentos(pagamentosResult.data as Pagamento[]);

      if (!configuracaoResult.error && configuracaoResult.data) {
        const configBanco = configuracaoResult.data.reduce((resultado: any, item: any) => {
          const chave = String(item.chave ?? item.Chave ?? '').toLowerCase();
          if (chave === 'checkintime') resultado.checkintime = item.valor ?? item.Valor;
          if (chave === 'checkouttime') resultado.checkouttime = item.valor ?? item.Valor;
          return resultado;
        }, {});
        setConfiguracoes({ ...configuracaoPadrao, ...configBanco });
      }
    } catch (error: any) {
      setErro(error?.message || 'Erro inesperado ao carregar dados.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      await recarregarDados();
      const usuarioSalvo = authService.getUsuarioLogado();
      if (usuarioSalvo && usuarioSalvo.email) {
        const client = supabaseService.getClient();
        if (client) {
          const { data: usuarioDb } = await client
            .from('usuario')
            .select('usuarioid, email, ativo')
            .ilike('email', usuarioSalvo.email.trim().toLowerCase())
            .eq('ativo', true)
            .maybeSingle();

          if (usuarioDb) {
            setUsuarioAtual(usuarioSalvo);
            setAutenticado(true);
            const paginaPadrao: PaginaNavegacao =
              (usuarioSalvo.perfil === 'DIRETORIA' || usuarioSalvo.perfil === 'EXECUTIVO')
                ? 'dashboard-executivo'
                : usuarioSalvo.perfil === 'RECEPCAO'
                ? 'checkin'
                : 'dashboard';
            setPaginaAtual(paginaPadrao);
            return;
          }
        }
        await authService.logout();
      }
      setAutenticado(false);
      setPaginaAtual('login');
    };
    inicializar();
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

  const login = async (email: string, senha: string): Promise<{ sucesso: boolean; erro?: string; usuario?: Usuario }> => {
    if (!online) return { sucesso: false, erro: '🚫 Sistema offline.' };
    try {
      const resultado = await authService.login(email, senha);
      if (resultado.sucesso && resultado.dados) {
        const usuario = resultado.dados as Usuario;
        setUsuarioAtual(usuario);
        setAutenticado(true);
        const paginaInicial: PaginaNavegacao =
          (usuario.perfil === 'DIRETORIA' || usuario.perfil === 'EXECUTIVO')
            ? 'dashboard-executivo'
            : usuario.perfil === 'RECEPCAO'
            ? 'checkin'
            : 'dashboard';
        setPaginaAtual(paginaInicial);
        return { sucesso: true, usuario };
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
    recarregarDados();
  };

  const trocarUsuario = (usuarioId: number | string) => {
    const usuarioEncontrado = usuarios.find((u) => String(u.usuarioid) === String(usuarioId));
    if (usuarioEncontrado) {
      setUsuarioAtual(usuarioEncontrado);
      authService.salvarSessaoLocal(usuarioEncontrado);
      recarregarDados();
    }
  };

  const atualizarStatusQuarto = async (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => {
    const client = supabaseService.getClient();
    const dadosAtualizacao: any = {
      status: novoStatus,
      dataoperacao: new Date().toISOString(),
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    if (motivoBloqueio && novoStatus === 'MANUTENCAO') {
      dadosAtualizacao.descricao = motivoBloqueio;
    }

    if (client) {
      await client.from('quarto').update(dadosAtualizacao).eq('quartoid', quartoId);
    }
    setQuartos((prev) => prev.map((q) => (String(q.quartoid) === String(quartoId) ? { ...q, ...dadosAtualizacao } : q)));
  };

  const criarQuarto = async (dados: Omit<Quarto, 'quartoid' | 'valordiariapadrao' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'> & { ativo?: boolean }) => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Supabase offline.' };

    const agora = new Date().toISOString();
    const dadosInserir = {
      ...dados,
      status: dados.status || 'DISPONIVEL',
      ativo: dados.ativo ?? true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    const { data, error } = await client.from('quarto').insert(dadosInserir).select().single();
    if (error || !data) return { sucesso: false, mensagem: error?.message || 'Erro ao criar quarto.' };

    const novoQuarto = normalizarQuartoDoBanco(data);
    setQuartos((prev) => [novoQuarto, ...prev]);
    return { sucesso: true, mensagem: `Quarto ${novoQuarto.numero} criado!`, quarto: novoQuarto };
  };

  const editarQuarto = async (id: number | string, dados: Partial<Quarto>) => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Supabase offline.' };

    const agora = new Date().toISOString();
    const dadosAtualizar = {
      ...dados,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    const { error } = await client.from('quarto').update(dadosAtualizar).eq('quartoid', id);
    if (error) return { sucesso: false, mensagem: error.message };

    setQuartos((prev) => prev.map((q) => (String(q.quartoid) === String(id) ? { ...q, ...dadosAtualizar } : q)));
    return { sucesso: true, mensagem: 'Quarto atualizado com sucesso!' };
  };

  const excluirQuarto = async (id: number | string) => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Supabase offline.' };

    const { error } = await client.from('quarto').update({ ativo: false, dataoperacao: new Date().toISOString(), naturezaoperacao: 'DELETE' }).eq('quartoid', id);
    if (error) return { sucesso: false, mensagem: error.message };

    setQuartos((prev) => prev.filter((q) => String(q.quartoid) !== String(id)));
    return { sucesso: true, mensagem: 'Quarto excluído com sucesso!' };
  };

  const obterQuartoPorId = (quartoId: number | string) => quartos.find((q) => String(q.quartoid) === String(quartoId));
  const obterQuartoPorNumero = (numero: string) => quartos.find((q) => q.numero === numero || q.codigoidentificador === numero);

  const verificarDisponibilidade = (dataEntrada: string, dataSaida: string, reservaIdIgnorar?: number | string) => {
    return calcularDisponibilidadeQuartos(quartos, reservas, dataEntrada, dataSaida, reservaIdIgnorar);
  };

  const criarReserva = async (novaReserva: Omit<Reserva, 'reservaid' | 'codigo' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'statusreserva'> & { statusreserva?: StatusReserva; cadastroid?: number }) => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Supabase offline.' };

    const eDayUse = String(novaReserva.tipoatendimento || '').toUpperCase() === 'DAY_USE';
    const quartoDayUse = quartos.find(
      (q) => String(q.codigoidentificador || '').toUpperCase() === 'DAY_USE' || String(q.numero || '').toUpperCase() === 'DU'
    );
    const quartoFisicoFallback = quartos[0];

    const quarto = eDayUse
      ? (quartoDayUse || quartoFisicoFallback)
      : (quartos.find((q) => String(q.quartoid) === String(novaReserva.quartoid)) || quartoFisicoFallback);

    if (!quarto) return { sucesso: false, mensagem: 'Quarto não encontrado para realizar a reserva.' };

    if (!eDayUse) {
      const conflitos = verificarConflitoQuarto(quartos, reservas, quarto.quartoid, novaReserva.dataentrada, novaReserva.datasaida);
      if (conflitos.temConflito) {
        return { sucesso: false, mensagem: `Conflito de datas: O quarto ${quarto.numero} já possui reserva confirmada para o período.` };
      }
    }

    const agora = new Date().toISOString();
    const dataReserva = agora.slice(0, 10);
    const valorPago = Number(novaReserva.valorpago || 0);
    const valorTotal = Number(novaReserva.valortotal || 0);

    let statusInicial: StatusReserva = novaReserva.statusreserva || 'PRE_RESERVA';
    if (!novaReserva.statusreserva) {
      if (valorPago >= valorTotal && valorTotal > 0) statusInicial = 'RESERVADO';
      else if (valorPago > 0) statusInicial = 'PRE_RESERVA';
    }

    const reservaParaInserir = {
      codigo: novaReserva.codigo || `RES-${Date.now().toString().slice(-6)}`,
      hospedeid: novaReserva.hospedeid,
      quartoid: eDayUse ? (quartoDayUse ? quartoDayUse.quartoid : 17) : quarto.quartoid,
      adultos: novaReserva.adultos || 1,
      criancas: novaReserva.criancas || 0,
      dataentrada: novaReserva.dataentrada,
      datasaida: novaReserva.datasaida,
      horarioprevistochegada: novaReserva.horarioprevistochegada || '14:00',
      tipoatendimento: eDayUse ? 'DAY_USE' : (novaReserva.tipoatendimento || 'HOSPEDAGEM'),
      pacoteid: novaReserva.pacoteid || null,
      valortotal: valorTotal,
      valorpago: valorPago,
      saldo: valorTotal - valorPago,
      statuspagamento: valorPago >= valorTotal && valorTotal > 0 ? 'PAGO' : valorPago > 0 ? 'PARCIAL' : 'PENDENTE',
      formapagamento: novaReserva.formapagamento || 'PIX',
      observacoes: novaReserva.observacoes || '',
      quartonumero: eDayUse ? 'DU' : quarto.numero,
      quartocodigo: eDayUse ? 'DAY_USE' : quarto.codigoidentificador,
      quartocategoria: eDayUse ? 'Day Use' : quarto.categoria,
      statusreserva: statusInicial,
      ativo: true,
      datareserva: dataReserva,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    const dadosParaBanco = {
      codigo: reservaParaInserir.codigo,
      hospedeid: reservaParaInserir.hospedeid,
      quartoid: reservaParaInserir.quartoid,
      adultos: reservaParaInserir.adultos,
      criancas: reservaParaInserir.criancas,
      dataentrada: reservaParaInserir.dataentrada,
      datasaida: reservaParaInserir.datasaida,
      horarioprevistochegada: reservaParaInserir.horarioprevistochegada,
      tipoatendimento: reservaParaInserir.tipoatendimento,
      pacoteid: reservaParaInserir.pacoteid,
      statusreserva: reservaParaInserir.statusreserva,
      valortotal: reservaParaInserir.valortotal,
      valorpago: reservaParaInserir.valorpago,
      saldo: reservaParaInserir.saldo,
      statuspagamento: reservaParaInserir.statuspagamento,
      formapagamento: reservaParaInserir.formapagamento,
      observacoes: reservaParaInserir.observacoes,
      ativo: reservaParaInserir.ativo,
      usuarioinclusao: reservaParaInserir.usuarioinclusao,
      datainclusao: reservaParaInserir.datainclusao,
      usuariooperacao: reservaParaInserir.usuariooperacao,
      dataoperacao: reservaParaInserir.dataoperacao,
      naturezaoperacao: reservaParaInserir.naturezaoperacao,
      datareserva: dataReserva,
    };

    const { data, error } = await client.from('reserva').insert(dadosParaBanco).select().single();
    if (error) return { sucesso: false, mensagem: 'Erro ao salvar: ' + error.message };

    if (valorPago > 0) {
      const { data: novoPagamento } = await client.from('pagamento').insert({
        reservaid: data.reservaid,
        valor: valorPago,
        formapagamento: reservaParaInserir.formapagamento || 'PIX',
        status: 'PAGO',
        datapagamento: agora,
        tipolancamento: 'SINAL_RESERVA',
        ativo: true,
        usuarioinclusao: usuarioAtual?.usuarioid,
        datainclusao: agora,
        usuariooperacao: usuarioAtual?.usuarioid,
        dataoperacao: agora,
        naturezaoperacao: 'INSERT',
      }).select().single();

      if (novoPagamento) {
        setPagamentos((prev) => [novoPagamento as Pagamento, ...prev]);
      }
    }

    const idCadastroFnrh = novaReserva.cadastroid ? Number(novaReserva.cadastroid) : null;
    try {
      if (idCadastroFnrh) {
        await client
          .from('cadastro_fnrh')
          .update({
            status: 'RESERVA_CRIADA',
            reservaid: data.reservaid,
            dataoperacao: agora,
            usuariooperacao: usuarioAtual?.usuarioid,
            naturezaoperacao: 'UPDATE',
          })
          .eq('cadastroid', idCadastroFnrh);

        await client
          .from('acompanhante')
          .update({
            reservaid: data.reservaid,
            dataoperacao: agora,
            usuariooperacao: usuarioAtual?.usuarioid,
            naturezaoperacao: 'UPDATE',
          })
          .eq('cadastroid', idCadastroFnrh)
          .is('reservaid', null);

        await client
          .from('cadastro_fnrh_acompanhante')
          .update({ reservaid: data.reservaid })
          .eq('cadastroid', idCadastroFnrh)
          .is('reservaid', null);
      }
    } catch (eFnrh) {
      console.warn('[ContextoHotel] Aviso ao vincular reserva ao cadastro FNRH:', eFnrh);
    }

    const reservaSalva = {
      ...reservaParaInserir,
      ...data,
      quartonumero: quarto.numero,
      quartocodigo: quarto.codigoidentificador,
      quartocategoria: quarto.categoria
    } as Reserva;

    setReservas(prev => [reservaSalva, ...prev]);

    if (!eDayUse) {
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

  const suspenderReservaComCredito = async (id: number | string, motivo?: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const valorCredito = Number(reserva.valorpago || 0);
    const obsAtualizada = motivo
      ? `${reserva.observacoes || ''} [Suspensa com Crédito: ${motivo}]`
      : `${reserva.observacoes || ''} [Suspensa com Crédito de R$ ${valorCredito.toFixed(2)}]`;

    const dadosAtualizados = {
      statusreserva: 'CREDITO' as StatusReserva,
      observacoes: obsAtualizada,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    if (client) await client.from('reserva').update(dadosAtualizados).eq('reservaid', id);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r) as Reserva[]);

    // Desvincula e libera o quarto físico
    if (reserva.quartoid && (reserva.statusreserva === 'RESERVADO' || reserva.statusreserva === 'PRE_RESERVA' || reserva.statusreserva === 'HOSPEDADO')) {
      await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');
    }

    await recarregarDados();

    return {
      sucesso: true,
      mensagem: `Reserva ${reserva.codigo} suspensa com sucesso! Crédito de R$ ${valorCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mantido para o hóspede.`,
    };
  };

  const trocarQuartoReserva = async (
    reservaId: number | string,
    novoQuartoId: number | string,
    motivo?: string
  ): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const novoQuarto = quartos.find((q) => Number(q.quartoid) === Number(novoQuartoId));
    if (!novoQuarto) return { sucesso: false, mensagem: 'Novo quarto selecionado não encontrado.' };

    const quartoAnterior = quartos.find((q) => Number(q.quartoid) === Number(reserva.quartoid));

    const agora = new Date().toISOString();
    const dataHoraStr = new Date().toLocaleString('pt-BR');
    const nomeQuartoAnt = quartoAnterior ? (quartoAnterior.codigoidentificador || quartoAnterior.numero) : 'N/A';
    const nomeQuartoNovo = novoQuarto.codigoidentificador || novoQuarto.numero;

    const obsNova = `${reserva.observacoes || ''} [Troca de Quarto em ${dataHoraStr}: Quarto #${nomeQuartoAnt} -> Quarto #${nomeQuartoNovo}${motivo ? ' (' + motivo + ')' : ''}]`;

    const dadosAtualizacaoReserva = {
      quartoid: novoQuarto.quartoid,
      quartonumero: novoQuarto.numero,
      quartocodigo: novoQuarto.codigoidentificador,
      quartocategoria: novoQuarto.categoria,
      observacoes: obsNova,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    if (client) {
      await client.from('reserva').update(dadosAtualizacaoReserva).eq('reservaid', reservaId);
    }

    setReservas((prev) =>
      prev.map((r) => (String(r.reservaid) === String(reservaId) ? { ...r, ...dadosAtualizacaoReserva } : r))
    );

    const estaHospedado = reserva.statusreserva === 'HOSPEDADO';

    if (estaHospedado) {
      if (quartoAnterior) {
        await atualizarStatusQuarto(quartoAnterior.quartoid, 'A_LIMPAR');
      }
      await atualizarStatusQuarto(novoQuarto.quartoid, 'OCUPADO');
    } else {
      if (quartoAnterior && quartoAnterior.status === 'RESERVADO') {
        await atualizarStatusQuarto(quartoAnterior.quartoid, 'DISPONIVEL');
      }
      if (reserva.statusreserva === 'RESERVADO') {
        await atualizarStatusQuarto(novoQuarto.quartoid, 'RESERVADO');
      }
    }

    await recarregarDados();

    return {
      sucesso: true,
      mensagem: `Troca de quarto realizada com sucesso! Quarto alterado de #${nomeQuartoAnt} para #${nomeQuartoNovo}.`,
    };
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
      const novosPagamentos = pagamentosConfirmados.map((pagamento) => ({
        reservaid: Number(reservaId),
        valor: Number(pagamento.valor),
        formapagamento: pagamento.formapagamento,
        status: 'PAGO' as const,
        datapagamento: agora,
        tipolancamento: pagamento.tipolancamento,
        ativo: true,
        usuarioinclusao: usuarioAtual?.usuarioid,
        datainclusao: agora,
        usuariooperacao: usuarioAtual?.usuarioid,
        dataoperacao: agora,
        naturezaoperacao: 'INSERT',
      }));

      const { data: pagamentosSalvos, error: erroPagamentos } = await client
        .from('pagamento')
        .insert(novosPagamentos)
        .select();

      if (erroPagamentos) {
        return { sucesso: false, mensagem: `Erro ao registrar pagamentos do check-out: ${erroPagamentos.message}` };
      }

      if (pagamentosSalvos) {
        setPagamentos((prev) => [...(pagamentosSalvos as Pagamento[]), ...prev]);
      }
    }

    const totalPagoAteAgora = Number(reserva.valorpago || 0) + pagamentosConfirmados.reduce((acc, p) => acc + Number(p.valor), 0);
    const novoSaldo = Math.max(0, Number(reserva.valortotal || 0) - totalPagoAteAgora);
    const dadosReserva = {
      statusreserva: 'CONCLUIDA' as StatusReserva,
      valorpago: totalPagoAteAgora,
      saldo: novoSaldo,
      statuspagamento: novoSaldo <= 0 ? ('PAGO' as const) : ('PARCIAL' as const),
      checkoutrealizadoem: agora,
      checkoutusuario: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'UPDATE',
    };

    if (client) await client.from('reserva').update(dadosReserva).eq('reservaid', reservaId);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(reservaId) ? { ...r, ...dadosReserva } : r) as Reserva[]);
    await atualizarStatusQuarto(reserva.quartoid, 'A_LIMPAR');
    return { sucesso: true, mensagem: `Check-out de ${reserva.hospedenome} realizado!` };
  };

  const criarConsumoExtra = async (consumo: Omit<ConsumoExtra, 'consumoid' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'>) => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Supabase offline.' };

    const agora = new Date().toISOString();
    const dadosInserir = {
      ...consumo,
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    const { data, error } = await client.from('consumo_extra').insert(dadosInserir).select().single();
    if (error || !data) return { sucesso: false, mensagem: error?.message || 'Erro ao lançar consumo.' };

    setConsumosExtras((prev) => [data as ConsumoExtra, ...prev]);
    return { sucesso: true, mensagem: 'Consumo registrado!', consumo: data as ConsumoExtra };
  };

  const excluirConsumoExtra = async (consumoId: number | string) => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Supabase offline.' };

    const { error } = await client.from('consumo_extra').update({ ativo: false, dataoperacao: new Date().toISOString(), naturezaoperacao: 'DELETE' }).eq('consumoid', consumoId);
    if (error) return { sucesso: false, mensagem: error.message };

    setConsumosExtras((prev) => prev.filter((c) => String(c.consumoid) !== String(consumoId)));
    return { sucesso: true, mensagem: 'Consumo removido!' };
  };

  const cadastrarHospede = async (dados: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>): Promise<Hospede> => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const dadosInserir = {
      ...dados,
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    if (client) {
      const { data } = await client.from('hospede').insert(dadosInserir).select().single();
      if (data) {
        setHospedes((prev) => [data as Hospede, ...prev]);
        return data as Hospede;
      }
    }

    const hospedeMock = { ...dadosInserir, hospedeid: Date.now() } as Hospede;
    setHospedes((prev) => [hospedeMock, ...prev]);
    return hospedeMock;
  };

  const editarHospede = async (id: number | string, dados: Partial<Hospede>) => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const dadosAtualizar = {
      ...dados,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    if (client) await client.from('hospede').update(dadosAtualizar).eq('hospedeid', id);
    setHospedes((prev) => prev.map((h) => (String(h.hospedeid) === String(id) ? { ...h, ...dadosAtualizar } : h)));
  };

  const excluirHospede = async (id: number | string): Promise<boolean> => {
    const client = supabaseService.getClient();
    if (client) {
      const { error } = await client.from('hospede').update({ ativo: false, dataoperacao: new Date().toISOString(), naturezaoperacao: 'DELETE' }).eq('hospedeid', id);
      if (error) return false;
    }
    setHospedes((prev) => prev.filter((h) => String(h.hospedeid) !== String(id)));
    return true;
  };

  const atualizarEstoqueProduto = async (produtoId: number | string, quantidadeDelta: number) => {
    const client = supabaseService.getClient();
    const produto = produtos.find((p) => String(p.produtoid) === String(produtoId));
    if (!produto) return;

    const novoEstoque = Math.max(0, produto.estoqueatual + quantidadeDelta);
    const dadosAtualizar = { estoqueatual: novoEstoque, dataoperacao: new Date().toISOString(), usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };

    if (client) await client.from('produto').update(dadosAtualizar).eq('produtoid', produtoId);
    setProdutos((prev) => prev.map((p) => (String(p.produtoid) === String(produtoId) ? { ...p, ...dadosAtualizar } : p)));
  };

  const criarProduto = async (dados: Omit<Produto, 'produtoid' | 'datainclusao' | 'dataoperacao' | 'ativo'> & { ativo?: boolean }) => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const dadosInserir = {
      ...dados,
      ativo: dados.ativo ?? true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    if (client) {
      const { data } = await client.from('produto').insert(dadosInserir).select().single();
      if (data) {
        setProdutos((prev) => [data as Produto, ...prev]);
        return data as Produto;
      }
    }

    const produtoMock = { ...dadosInserir, produtoid: Date.now() } as Produto;
    setProdutos((prev) => [produtoMock, ...prev]);
    return produtoMock;
  };

  const editarProduto = async (id: number | string, dados: Partial<Produto>) => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const dadosAtualizar = { ...dados, dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };

    if (client) await client.from('produto').update(dadosAtualizar).eq('produtoid', id);
    setProdutos((prev) => prev.map((p) => (String(p.produtoid) === String(id) ? { ...p, ...dadosAtualizar } : p)));
    return { sucesso: true, mensagem: 'Produto atualizado com sucesso!' };
  };

  const excluirProduto = async (id: number | string) => {
    const client = supabaseService.getClient();
    if (client) {
      const { error } = await client.from('produto').update({ ativo: false, dataoperacao: new Date().toISOString(), naturezaoperacao: 'DELETE' }).eq('produtoid', id);
      if (error) return { sucesso: false, mensagem: error.message };
    }
    setProdutos((prev) => prev.filter((p) => String(p.produtoid) !== String(id)));
    return { sucesso: true, mensagem: 'Produto excluído com sucesso!' };
  };

  const registrarVenda = async (dados: Partial<Venda> & { itens: Venda['itens'] }) => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();
    const dadosVenda = {
      ...dados,
      statuspagamento: dados.statuspagamento || 'PAGO',
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    let vendaCriada: Venda;
    if (client) {
      const { data } = await client.from('venda').insert(dadosVenda).select().single();
      vendaCriada = (data as Venda) || ({ ...dadosVenda, vendaid: Date.now() } as Venda);
    } else {
      vendaCriada = { ...dadosVenda, vendaid: Date.now() } as Venda;
    }

    for (const item of dados.itens) {
      await atualizarEstoqueProduto(item.produtoid, -item.quantidade);
    }

    return vendaCriada;
  };

  const salvarConfiguracoes = async (novas: Partial<ConfiguracaoSistema>) => {
    const client = supabaseService.getClient();
    setConfiguracoes((prev) => {
      const atualizado = { ...prev, ...novas };
      if (client) client.from('configuracao').upsert(atualizado);
      return atualizado;
    });
  };

  const restaurarDadosPadrao = () => {
    setQuartos([]); setReservas([]); setHospedes([]); setProdutos([]); setConsumosExtras([]);
    setPacotes([]); setPagamentos([]); setConfiguracoes(configuracaoPadrao);
    setUsuarios([]); setUsuarioAtual(usuarioPadrao); setAutenticado(false); setPaginaAtual('login');
  };

  return (
    <ContextoHotel.Provider value={{
      quartos, reservas, hospedes, produtos, consumosExtras, pacotes, configuracoes, pagamentos,
      usuarioAtual, usuarios, paginaAtual, dataSistema, online, autenticado,
      carregando, erro, login, logout, navegarPara, trocarUsuario,
      atualizarStatusQuarto, obterQuartoPorId, obterQuartoPorNumero,
      criarQuarto, editarQuarto, excluirQuarto,
      verificarDisponibilidade, criarReserva, atualizarReserva, cancelarReserva,
      suspenderReservaComCredito, trocarQuartoReserva,
      realizarCheckin, realizarCheckout, criarConsumoExtra, excluirConsumoExtra,
      cadastrarHospede, editarHospede, excluirHospede, atualizarEstoqueProduto,
      criarProduto, editarProduto, excluirProduto, registrarVenda, salvarConfiguracoes, restaurarDadosPadrao,
      recarregarDados,
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