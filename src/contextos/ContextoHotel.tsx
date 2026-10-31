import React, { createContext, useContext, useEffect, useState } from 'react';
import { calcularDisponibilidadeQuartos, StatusDisponibilidadeQuarto, verificarConflitoQuarto } from '../servicos/conflitoReservas';
import {
  AuthService,
  authService,
  pacoteService,
  quartoService,
  reservaService,
  hospedeService,
  produtoService,
  vendaService,
  consumoExtraService,
  pagamentoService,
  configuracaoService,
  usuarioService,
  FnrhService,
} from '../servicos/api';
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
  abaDashboard: 'VISAO_GERAL' | 'RELATORIO_FAZENDA';
  setAbaDashboard: (aba: 'VISAO_GERAL' | 'RELATORIO_FAZENDA') => void;
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
  criarReserva: (novaReserva: Omit<Reserva, 'reservaid' | 'codigo' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'statusreserva'> & { statusreserva?: StatusReserva; cadastroid?: number; datareserva?: string }) => Promise<{ sucesso: boolean; mensagem: string; reserva?: Reserva }>;
  atualizarReserva: (id: number | string, dados: Partial<Reserva>) => Promise<{ sucesso: boolean; mensagem: string }>;
  cancelarReserva: (id: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  suspenderReservaComCredito: (id: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  trocarQuartoReserva: (reservaId: number | string, novoQuartoId: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckin: (reservaId: number | string, dadosCheckin?: any) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckout: (reservaId: number | string, pagamentos?: Array<Pick<Pagamento, 'valor' | 'formapagamento' | 'tipolancamento'>>, observacoesCheckout?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  criarConsumoExtra: (consumo: {
    reservaid: number;
    produtoid?: number;
    quantidade: number;
    valorunitario: number;
    valortotal: number;
    categoria: string;
    descricao: string;
    dataconsumo?: string;
    data_consumo?: string;
  }) => Promise<{ sucesso: boolean; mensagem: string; consumo?: ConsumoExtra }>;
  excluirConsumoExtra: (consumoId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  cadastrarHospede: (hospede: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>) => Promise<Hospede>;
  editarHospede: (id: number | string, dados: Partial<Hospede>) => Promise<void>;
  excluirHospede: (id: number | string) => Promise<boolean>;
  atualizarEstoqueProduto: (produtoId: number | string, quantidadeDelta: number) => Promise<void>;
  criarProduto: (dados: Partial<Produto> & { nome: string; categoria?: any; preco?: number; estoque?: number; ativo?: boolean }) => Promise<Produto>;
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
  const [abaDashboard, setAbaDashboard] = useState<'VISAO_GERAL' | 'RELATORIO_FAZENDA'>('VISAO_GERAL');
  const [dataSistema] = useState<string>(new Date().toISOString().slice(0, 10));
  const [online, setOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [
        quartosResult,
        reservasResult,
        hospedesResult,
        produtosResult,
        vendaResult,
        pacotesResult,
        usuariosResult,
        configuracaoResult,
        consumosResult,
        pagamentosResult,
      ] = await Promise.all([
        quartoService.listar({ apenasAtivos: true }),
        reservaService.listar({ apenasAtivos: true }),
        hospedeService.listar({ apenasAtivos: true }),
        produtoService.listar({ apenasAtivos: true }),
        vendaService.listar(),
        pacoteService.listar({ apenasAtivos: true }),
        usuarioService.listarTodos(true),
        configuracaoService.listar({ apenasAtivos: true }),
        consumoExtraService.listar({ apenasAtivos: true }),
        pagamentoService.listar({ apenasAtivos: true }),
      ]);

      const dadosQuartos = (quartosResult as any)?.dados || [];
      if (Array.isArray(dadosQuartos) && dadosQuartos.length > 0) {
        setQuartos(dadosQuartos.map(normalizarQuartoDoBanco));
      } else if ((quartosResult as any)?.erro) {
        setErro(`Erro ao buscar quartos: ${(quartosResult as any).erro}`);
      }

      const dadosHospedes = (hospedesResult as any)?.dados || [];
      if (Array.isArray(dadosHospedes)) {
        setHospedes(dadosHospedes as Hospede[]);
      }

      const dadosReservas = (reservasResult as any)?.dados || [];
      if (Array.isArray(dadosReservas)) {
        const reservasComQuartos = dadosReservas.map((reserva: any) => {
          const quartoRel = reserva.quarto;
          const quarto = quartoRel || dadosQuartos?.find((q: any) => Number(q.quartoid || q.quartoId) === Number(reserva.quartoid || reserva.quartoId));
          const hospede = dadosHospedes?.find((h: any) => Number(h.hospedeid || h.hospedeId) === Number(reserva.hospedeid || reserva.hospedeId));
          return {
            ...reserva,
            statusreserva: normalizarStatusReserva(reserva.statusreserva ?? reserva.status),
            quartonumero: quarto?.numero || quartoRel?.numero || reserva.quartonumero || 'N/A',
            quartocodigo: quarto?.codigoidentificador || quarto?.numero || reserva.quartocodigo || 'N/A',
            quartocategoria: quarto?.categoria || quartoRel?.categoria || reserva.quartocategoria || 'N/A',
            hospedenome: hospede?.nomecompleto || reserva.hospedenome || 'Hóspede não encontrado',
            hospedetelefone: hospede?.telefone || reserva.hospedetelefone || '',
            hospedeemail: hospede?.email || reserva.hospedeemail || '',
          };
        });
        setReservas(reservasComQuartos);
      }

      const dadosProdutos = (produtosResult as any)?.dados || [];
      if (Array.isArray(dadosProdutos)) {
        const prods = dadosProdutos.map((p: any) => ({
          ...p,
          preco: Number(p.preco ?? p.valor ?? 0),
          estoque: Number(p.estoque ?? p.estoqueatual ?? 0),
          valor: Number(p.valor ?? p.preco ?? 0),
          estoqueatual: Number(p.estoqueatual ?? p.estoque ?? 0),
        }));
        setProdutos(prods as Produto[]);
      }

      const dadosConsumos = (consumosResult as any)?.dados || [];
      if (Array.isArray(dadosConsumos)) setConsumosExtras(dadosConsumos as ConsumoExtra[]);

      const dadosPacotes = (pacotesResult as any)?.dados || [];
      if (Array.isArray(dadosPacotes)) setPacotes(dadosPacotes as Pacote[]);

      const dadosUsuarios = (usuariosResult as any)?.dados || [];
      if (Array.isArray(dadosUsuarios)) setUsuarios(dadosUsuarios as Usuario[]);

      const dadosPagamentos = (pagamentosResult as any)?.dados || [];
      if (Array.isArray(dadosPagamentos)) setPagamentos(dadosPagamentos as Pagamento[]);

      const dadosConfiguracao = (configuracaoResult as any)?.dados || [];
      if (Array.isArray(dadosConfiguracao)) {
        const configBanco = dadosConfiguracao.reduce((resultado: any, item: any) => {
          const chave = String(item.chave ?? item.Chave ?? '').toLowerCase();
          if (chave === 'checkintime') resultado.checkintime = item.valor ?? item.Valor;
          if (chave === 'checkouttime') resultado.checkouttime = item.valor ?? item.Valor;
          return resultado;
        }, {});
        setConfiguracoes({ ...configuracaoPadrao, ...configBanco });
      }
    } catch (error: any) {
      setErro(error?.message || 'Erro inesperado ao carregar dados da API.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      await recarregarDados();
      const usuarioSalvo = authService.getUsuarioLogado();
      if (usuarioSalvo && usuarioSalvo.email) {
        try {
          const resUsuario = await usuarioService.obterPorEmail(usuarioSalvo.email);
          if (resUsuario.sucesso && resUsuario.dados && resUsuario.dados.ativo) {
            const u = { ...usuarioSalvo, ...resUsuario.dados };
            setUsuarioAtual(u);
            setAutenticado(true);
            const paginaPadrao: PaginaNavegacao =
              (u.perfil === 'DIRETORIA' || u.perfil === 'EXECUTIVO')
                ? 'dashboard-executivo'
                : u.perfil === 'RECEPCAO'
                ? 'checkin'
                : 'dashboard';
            setPaginaAtual(paginaPadrao);
            return;
          }
        } catch (e) {
          console.warn('[ContextoHotel] Falha ao validar usuário logado:', e);
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
      return { sucesso: false, erro: error?.message || 'Erro ao conectar à API.' };
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
    await quartoService.atualizarStatus(quartoId, novoStatus, motivoBloqueio);
    const dadosAtualizacao: any = {
      status: novoStatus,
      dataoperacao: new Date().toISOString(),
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    if (motivoBloqueio && novoStatus === 'MANUTENCAO') {
      dadosAtualizacao.descricao = motivoBloqueio;
    }

    setQuartos((prev) => prev.map((q) => (String(q.quartoid) === String(quartoId) ? { ...q, ...dadosAtualizacao } : q)));
  };

  const criarQuarto = async (dados: Omit<Quarto, 'quartoid' | 'valordiariapadrao' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'usuarioinclusao' | 'usuariooperacao' | 'naturezaoperacao'> & { ativo?: boolean }) => {
    const res = await quartoService.criar(dados as any);
    if (!res.sucesso || !res.dados) {
      return { sucesso: false, mensagem: res.erro || 'Erro ao criar quarto.' };
    }

    const novoQuarto = normalizarQuartoDoBanco(res.dados);
    setQuartos((prev) => [novoQuarto, ...prev]);
    return { sucesso: true, mensagem: `Quarto ${novoQuarto.numero} criado!`, quarto: novoQuarto };
  };

  const editarQuarto = async (id: number | string, dados: Partial<Quarto>) => {
    const res = await quartoService.atualizar(id, dados);
    if (!res.sucesso) return { sucesso: false, mensagem: res.erro || 'Erro ao atualizar quarto.' };

    setQuartos((prev) => prev.map((q) => (String(q.quartoid) === String(id) ? { ...q, ...dados } : q)));
    return { sucesso: true, mensagem: 'Quarto atualizado com sucesso!' };
  };

  const excluirQuarto = async (id: number | string) => {
    const res = await quartoService.desativar(id);
    if (!res.sucesso) return { sucesso: false, mensagem: res.erro || 'Erro ao excluir quarto.' };

    setQuartos((prev) => prev.filter((q) => String(q.quartoid) !== String(id)));
    return { sucesso: true, mensagem: 'Quarto excluído com sucesso!' };
  };

  const obterQuartoPorId = (quartoId: number | string) => quartos.find((q) => String(q.quartoid) === String(quartoId));
  const obterQuartoPorNumero = (numero: string) => quartos.find((q) => q.numero === numero || q.codigoidentificador === numero);

  const verificarDisponibilidade = (dataEntrada: string, dataSaida: string, reservaIdIgnorar?: number | string) => {
    return calcularDisponibilidadeQuartos(quartos, reservas, dataEntrada, dataSaida, reservaIdIgnorar);
  };

  const criarReserva = async (novaReserva: Omit<Reserva, 'reservaid' | 'codigo' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'statusreserva'> & { statusreserva?: StatusReserva; cadastroid?: number; datareserva?: string }) => {
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
      const conflitos = verificarConflitoQuarto(quarto.quartoid, novaReserva.dataentrada, novaReserva.datasaida, reservas);
      if (conflitos.temConflito) {
        return { sucesso: false, mensagem: `Conflito de datas: O quarto ${quarto.numero} já possui reserva confirmada para o período.` };
      }
    }

    const agora = new Date().toISOString();
    const dataReserva = (novaReserva as any).datareserva || agora.slice(0, 10);
    const valorPago = Number(novaReserva.valorpago || 0);
    const valorTotal = Number(novaReserva.valortotal || 0);

    let statusInicial: StatusReserva = novaReserva.statusreserva || 'PRE_RESERVA';
    if (!novaReserva.statusreserva) {
      if (valorPago >= valorTotal && valorTotal > 0) statusInicial = 'RESERVADO';
      else if (valorPago > 0) statusInicial = 'PRE_RESERVA';
    }

    const reservaParaInserir = {
      codigo: (novaReserva as any).codigo || `RES-${Date.now().toString().slice(-6)}`,
      hospedeid: Number(novaReserva.hospedeid),
      quartoid: Number(eDayUse ? (quartoDayUse ? quartoDayUse.quartoid : 17) : quarto.quartoid),
      adultos: novaReserva.adultos || 1,
      criancas: novaReserva.criancas || 0,
      dataentrada: novaReserva.dataentrada,
      datasaida: novaReserva.datasaida,
      horarioprevistochegada: novaReserva.horarioprevistochegada || '14:00',
      tipoatendimento: eDayUse ? 'DAY_USE' : (novaReserva.tipoatendimento || 'HOSPEDAGEM'),
      pacoteid: novaReserva.pacoteid ? Number(novaReserva.pacoteid) : undefined,
      valortotal: valorTotal,
      valorpago: valorPago,
      saldo: valorTotal - valorPago,
      statuspagamento: valorPago >= valorTotal && valorTotal > 0 ? ('PAGO' as const) : valorPago > 0 ? ('PARCIAL' as const) : ('PENDENTE' as const),
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

    const resCriacao = await reservaService.criar(reservaParaInserir);
    if (!resCriacao.sucesso || !resCriacao.dados) {
      return { sucesso: false, mensagem: resCriacao.erro || 'Erro ao salvar reserva na API.' };
    }

    const data = resCriacao.dados;

    if (valorPago > 0) {
      const resPag = await pagamentoService.criar({
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
      });

      if (resPag.sucesso && resPag.dados) {
        setPagamentos((prev) => [resPag.dados as Pagamento, ...prev]);
      }
    }

    const idCadastroFnrh = novaReserva.cadastroid ? Number(novaReserva.cadastroid) : null;
    if (idCadastroFnrh) {
      try {
        await FnrhService.vincularReservaAoCadastroFnrh({
          cadastroid: idCadastroFnrh,
          reservaid: data.reservaid,
          usuarioId: usuarioAtual?.usuarioid,
        });
      } catch (eFnrh) {
        console.warn('[ContextoHotel] Aviso ao vincular reserva ao cadastro FNRH:', eFnrh);
      }
    }

    const reservaSalva: Reserva = {
      ...reservaParaInserir,
      ...data,
      datareserva: data?.datareserva || dataReserva,
      quartonumero: quarto.numero,
      quartocodigo: quarto.codigoidentificador,
      quartocategoria: quarto.categoria,
    } as Reserva;

    setReservas((prev) => [reservaSalva, ...prev]);

    if (!eDayUse) {
      await atualizarStatusQuarto(quarto.quartoid, statusInicial === 'HOSPEDADO' ? 'OCUPADO' : 'RESERVADO');
    }

    return { sucesso: true, mensagem: `Reserva ${reservaSalva.codigo} criada com sucesso!`, reserva: reservaSalva };
  };

  const atualizarReserva = async (id: number | string, dados: Partial<Reserva>): Promise<{ sucesso: boolean; mensagem: string }> => {
    const reservaExistente = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reservaExistente) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosAtualizados = {
      ...dados,
      saldo: Number(dados.valortotal ?? reservaExistente.valortotal) - Number(dados.valorpago ?? reservaExistente.valorpago),
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    const { quartocategoria, quartonumero, quartocodigo, hospedenome, hospedetelefone, hospedeemail, quarto, ...dadosBanco } = dadosAtualizados as any;

    const resApi = await reservaService.atualizar(id, dadosBanco);
    if (!resApi.sucesso) {
      console.warn('[ContextoHotel] Falha ao atualizar reserva via API:', resApi.erro);
    }

    setReservas((prev) => prev.map((r) => (String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r)) as Reserva[]);
    return { sucesso: true, mensagem: 'Reserva atualizada com sucesso.' };
  };

  const cancelarReserva = async (id: number | string, motivo?: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const reserva = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosAtualizados = {
      statusreserva: 'CANCELADA' as StatusReserva,
      observacoes: motivo ? `${reserva.observacoes || ''} [Cancelada: ${motivo}]` : reserva.observacoes,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    await reservaService.atualizar(id, dadosAtualizados);
    setReservas((prev) => prev.map((r) => (String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r)) as Reserva[]);
    if (reserva.quartoid && (reserva.statusreserva === 'RESERVADO' || reserva.statusreserva === 'PRE_RESERVA')) {
      await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');
    }
    return { sucesso: true, mensagem: `Reserva ${reserva.codigo} cancelada.` };
  };

  const suspenderReservaComCredito = async (id: number | string, motivo?: string): Promise<{ sucesso: boolean; mensagem: string }> => {
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

    await reservaService.atualizar(id, dadosAtualizados);
    setReservas((prev) => prev.map((r) => (String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r)) as Reserva[]);

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

    const dadosAtualizacaoBanco = {
      quartoid: novoQuarto.quartoid,
      observacoes: obsNova,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    await reservaService.atualizar(reservaId, dadosAtualizacaoBanco);

    const dadosAtualizacaoReserva = {
      ...dadosAtualizacaoBanco,
      quartonumero: novoQuarto.numero,
      quartocodigo: novoQuarto.codigoidentificador,
      quartocategoria: novoQuarto.categoria,
    };

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

  const realizarCheckin = async (reservaId: number | string, dadosCheckin?: any) => {
    try {
      const idNum = Number(reservaId);

      const reservaAtual = reservas.find(
        (r: any) => Number(r.reservaid ?? r.reservaId) === idNum
      );

      const r = { ...reservaAtual, ...dadosCheckin };

      const idReserva = Number(r.reservaid ?? r.reservaId ?? idNum);
      const idQuarto = Number(r.quartoid ?? r.quartoId ?? 0);
      const idHospede = Number(r.hospedeid ?? r.hospedeId ?? 0);
      const codigo = String(r.codigo ?? r.Codigo ?? `RES-${idReserva}`).trim();

      if (!idQuarto || idQuarto <= 0) {
        return { sucesso: false, mensagem: 'Identificador do quarto inválido ou não vinculado à reserva.' };
      }
      if (!idHospede || idHospede <= 0) {
        return { sucesso: false, mensagem: 'Identificador do hóspede inválido ou não vinculado à reserva.' };
      }

      const agoraIso = new Date().toISOString();
      const dataHoraCheckin = r.checkinrealizadoem || r.checkinRealizadoEm || agoraIso;

      const payloadPutDto: any = {
        reservaId: idReserva,
        codigo: codigo,
        quartoId: idQuarto,
        hospedeId: idHospede,
        cadastroId: r.cadastroid ?? r.cadastroId ? Number(r.cadastroid ?? r.cadastroId) : null,
        pacoteId: r.pacoteid ?? r.pacoteId ? Number(r.pacoteid ?? r.pacoteId) : null,
        dataEntrada: r.dataentrada ?? r.dataEntrada,
        dataSaida: r.datasaida ?? r.dataSaida,
        dataReserva: r.datareserva ?? r.dataReserva ?? r.dataentrada ?? r.dataEntrada,
        statusReserva: 'HOSPEDADO',
        tipoAtendimento: r.tipoatendimento ?? r.tipoAtendimento ?? 'HOSPEDAGEM',
        adultos: Number(r.adultos ?? 1),
        criancas: Number(r.criancas ?? 0),
        valorDiaria: Number(r.valordiaria ?? r.valorDiaria ?? 0),
        valorTotal: Number(r.valortotal ?? r.valorTotal ?? 0),
        valorPago: Number(r.valorpago ?? r.valorPago ?? 0),
        saldo: Number(r.saldo ?? 0),
        formaPagamento: r.formapagamento ?? r.formaPagamento ?? 'PIX',
        statusPagamento: r.statuspagamento ?? r.statusPagamento ?? 'PAGO',
        observacoes: r.observacoes ?? '',
        observacoesCheckout: r.observacoes_checkout ?? r.observacoesCheckout ?? '',
        horarioPrevistoChegada: r.horarioprevistochegada ?? r.horarioPrevistoChegada ?? null,
        horarioPrevistoSaida: r.horarioprevistosaida ?? r.horarioPrevistoSaida ?? null,
        checkinRealizadoEm: dataHoraCheckin,
        ativo: true,
      };

      const resposta = await reservaService.atualizar(idReserva, payloadPutDto);

      if (!resposta.sucesso) {
        return {
          sucesso: false,
          mensagem: resposta.erro || resposta.mensagem || 'Erro ao atualizar reserva na API.',
        };
      }

      if (idQuarto > 0) {
        await atualizarStatusQuarto(idQuarto, 'OCUPADO');
      }

      await recarregarDados();

      return { sucesso: true, mensagem: `Check-in da reserva ${codigo} concluído com sucesso!` };
    } catch (error: any) {
      return {
        sucesso: false,
        mensagem: error?.message || 'Falha inesperada ao executar o check-in.',
      };
    }
  };

  const realizarCheckout = async (
    reservaId: number | string,
    pagamentosInput: Array<Pick<Pagamento, 'valor' | 'formapagamento' | 'tipolancamento'>> = [],
    observacoesCheckout?: string
  ): Promise<{ sucesso: boolean; mensagem: string }> => {
    const idNum = Number(reservaId);
    const reserva = reservas.find((r) => Number(r.reservaid ?? (r as any).reservaId) === idNum);
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const pagamentosConfirmados = pagamentosInput.filter((pagamento) => Number(pagamento.valor) > 0);

    if (pagamentosConfirmados.length > 0) {
      for (const pagamento of pagamentosConfirmados) {
        const resPag = await pagamentoService.criar({
          reservaid: idNum,
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
        });
        if (resPag.sucesso && resPag.dados) {
          setPagamentos((prev) => [resPag.dados as Pagamento, ...prev]);
        }
      }
    }

    const totalPagoAteAgora = Number(reserva.valorpago || 0) + pagamentosConfirmados.reduce((acc, p) => acc + Number(p.valor), 0);
    const novoSaldo = Math.max(0, Number(reserva.valortotal || 0) - totalPagoAteAgora);
    
    const obsCheckoutFinal = observacoesCheckout !== undefined 
      ? observacoesCheckout 
      : ((reserva as any).observacoes_checkout || (reserva as any).observacoesCheckout || '');

    // Payload DTO completo para passar sem erro 400 no ReservaPutDto
    const payloadPutDto: any = {
      reservaId: idNum,
      codigo: String(reserva.codigo || `RES-${idNum}`),
      quartoId: Number(reserva.quartoid || (reserva as any).quartoId),
      hospedeId: Number(reserva.hospedeid || (reserva as any).hospedeId),
      cadastroId: (reserva as any).cadastroid ?? (reserva as any).cadastroId ? Number((reserva as any).cadastroid ?? (reserva as any).cadastroId) : null,
      pacoteId: reserva.pacoteid ?? (reserva as any).pacoteId ? Number(reserva.pacoteid ?? (reserva as any).pacoteId) : null,
      dataEntrada: reserva.dataentrada || (reserva as any).dataEntrada,
      dataSaida: reserva.datasaida || (reserva as any).dataSaida,
      dataReserva: (reserva as any).datareserva || (reserva as any).dataReserva || reserva.dataentrada || (reserva as any).dataEntrada,
      statusReserva: 'CONCLUIDA',
      tipoAtendimento: (reserva as any).tipoatendimento || (reserva as any).tipoAtendimento || 'HOSPEDAGEM',
      adultos: Number(reserva.adultos || 1),
      criancas: Number(reserva.criancas || 0),
      valorDiaria: Number((reserva as any).valordiaria || (reserva as any).valorDiaria || 0),
      valorTotal: Number(reserva.valortotal || 0),
      valorPago: totalPagoAteAgora,
      saldo: novoSaldo,
      formaPagamento: (reserva as any).formapagamento || (reserva as any).formaPagamento || 'PIX',
      statusPagamento: novoSaldo <= 0 ? 'PAGO' : 'PARCIAL',
      observacoes: reserva.observacoes || '',
      observacoesCheckout: obsCheckoutFinal,
      checkoutRealizadoEm: agora,
      ativo: true,
    };

    const resApi = await reservaService.atualizar(idNum, payloadPutDto);
    if (!resApi.sucesso) {
      return { sucesso: false, mensagem: resApi.erro || 'Erro ao finalizar check-out na API.' };
    }

    setReservas((prev) => prev.map((r) => (Number(r.reservaid ?? (r as any).reservaId) === idNum ? { ...r, ...payloadPutDto } : r)) as Reserva[]);
    
    if (reserva.quartoid) {
      await atualizarStatusQuarto(reserva.quartoid, 'A_LIMPAR');
    }
    
    await recarregarDados();
    return { sucesso: true, mensagem: `Check-out de ${reserva.hospedenome || 'Hóspede'} realizado com sucesso!` };
  };

  const criarConsumoExtra = async (consumo: {
    reservaid: number;
    produtoid?: number;
    quantidade: number;
    valorunitario: number;
    valortotal: number;
    categoria: string;
    descricao: string;
    dataconsumo?: string;
    data_consumo?: string;
  }) => {
    const agora = new Date().toISOString();
    const dadosInserir = {
      reservaid: Number(consumo.reservaid),
      produtoid: consumo.produtoid ? Number(consumo.produtoid) : undefined,
      quantidade: Number(consumo.quantidade),
      valorunitario: Number(consumo.valorunitario),
      valortotal: Number(consumo.valortotal),
      dataconsumo: consumo.dataconsumo || consumo.data_consumo || agora,
      categoria: consumo.categoria || 'OUTROS',
      descricao: consumo.descricao || '',
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid || undefined,
      datainclusao: agora,
    };

    const res = await consumoExtraService.criar(dadosInserir);
    if (!res.sucesso || !res.dados) {
      return { sucesso: false, mensagem: res.erro || 'Erro ao lançar consumo na API.' };
    }

    const data = res.dados as ConsumoExtra;
    setConsumosExtras((prev) => [data, ...prev]);
    return { sucesso: true, mensagem: 'Consumo registrado!', consumo: data };
  };

  const excluirConsumoExtra = async (consumoId: number | string) => {
    const res = await consumoExtraService.desativar(consumoId);
    if (!res.sucesso) return { sucesso: false, mensagem: res.erro || 'Erro ao excluir consumo' };

    setConsumosExtras((prev) => prev.filter((c) => String(c.consumoid) !== String(consumoId)));
    return { sucesso: true, mensagem: 'Consumo removido!' };
  };

  const cadastrarHospede = async (dados: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>): Promise<Hospede> => {
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

    const res = await hospedeService.criar(dadosInserir);
    if (res.sucesso && res.dados) {
      setHospedes((prev) => [res.dados as Hospede, ...prev]);
      return res.dados as Hospede;
    }

    const hospedeMock = { ...dadosInserir, hospedeid: Date.now() } as Hospede;
    setHospedes((prev) => [hospedeMock, ...prev]);
    return hospedeMock;
  };

  const editarHospede = async (id: number | string, dados: Partial<Hospede>) => {
    const agora = new Date().toISOString();
    const dadosAtualizar = {
      ...dados,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    await hospedeService.atualizar(id, dadosAtualizar);
    setHospedes((prev) => prev.map((h) => (String(h.hospedeid) === String(id) ? { ...h, ...dadosAtualizar } : h)));
  };

  const excluirHospede = async (id: number | string): Promise<boolean> => {
    const res = await hospedeService.desativar(id);
    if (!res.sucesso) return false;
    setHospedes((prev) => prev.filter((h) => String(h.hospedeid) !== String(id)));
    return true;
  };

  const atualizarEstoqueProduto = async (produtoId: number | string, quantidadeDelta: number) => {
    const produto = produtos.find((p) => String(p.produtoid) === String(produtoId));
    if (!produto) return;

    const estoqueAtual = Number(produto.estoque ?? produto.estoqueatual ?? 0);
    const novoEstoque = Math.max(0, estoqueAtual + quantidadeDelta);

    await produtoService.atualizarEstoque(produtoId, quantidadeDelta, true);
    setProdutos((prev) => prev.map((p) => (String(p.produtoid) === String(produtoId) ? { ...p, estoque: novoEstoque, estoqueatual: novoEstoque } : p)));
  };

  const criarProduto = async (dados: Partial<Produto> & { nome: string; categoria?: any; preco?: number; estoque?: number; ativo?: boolean }) => {
    const agora = new Date().toISOString();
    const preco = Number(dados.preco ?? dados.valor ?? 0);
    const estoque = Number(dados.estoque ?? dados.estoqueatual ?? 0);
    const dadosInserir = {
      ...dados,
      preco,
      estoque,
      ativo: dados.ativo ?? true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    const res = await produtoService.criar(dadosInserir);
    if (res.sucesso && res.dados) {
      const prodNormalizado = { ...res.dados, preco, estoque, valor: preco, estoqueatual: estoque } as Produto;
      setProdutos((prev) => [prodNormalizado, ...prev]);
      return prodNormalizado;
    }

    const produtoMock = { ...dadosInserir, produtoid: Date.now(), preco, estoque, valor: preco, estoqueatual: estoque } as Produto;
    setProdutos((prev) => [produtoMock, ...prev]);
    return produtoMock;
  };

  const editarProduto = async (id: number | string, dados: Partial<Produto>) => {
    const agora = new Date().toISOString();
    const dadosAtualizar: any = { ...dados, dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };
    if (dados.preco !== undefined) dadosAtualizar.preco = Number(dados.preco);
    if (dados.estoque !== undefined) dadosAtualizar.estoque = Number(dados.estoque);

    const res = await produtoService.atualizar(id, dadosAtualizar);
    if (!res.sucesso) return { sucesso: false, mensagem: res.erro || 'Erro ao atualizar produto.' };
    setProdutos((prev) => prev.map((p) => (String(p.produtoid) === String(id) ? { ...p, ...dadosAtualizar } : p)));
    return { sucesso: true, mensagem: 'Produto atualizado com sucesso!' };
  };

  const excluirProduto = async (id: number | string) => {
    const res = await produtoService.desativar(id);
    if (!res.sucesso) return { sucesso: false, mensagem: res.erro || 'Erro ao desativar produto' };
    setProdutos((prev) => prev.filter((p) => String(p.produtoid) !== String(id)));
    return { sucesso: true, mensagem: 'Produto excluído com sucesso!' };
  };

  const registrarVenda = async (dados: Partial<Venda> & { itens: Venda['itens'] }) => {
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

    const resVenda = await vendaService.criarComItens(dadosVenda, dados.itens || []);
    const vendaCriada: Venda = (resVenda.dados as Venda) || ({ ...dadosVenda, vendaid: Date.now() } as Venda);

    for (const item of dados.itens) {
      await atualizarEstoqueProduto(item.produtoid, -item.quantidade);
    }

    return vendaCriada;
  };

  const salvarConfiguracoes = async (novas: Partial<ConfiguracaoSistema>) => {
    setConfiguracoes((prev) => ({ ...prev, ...novas }));
    try {
      const payloadMultiplo: Record<string, string> = {};
      for (const [chave, valor] of Object.entries(novas)) {
        if (valor !== undefined && valor !== null) {
          payloadMultiplo[chave] = String(valor);
        }
      }
      await configuracaoService.salvarMultiplas(payloadMultiplo);
    } catch (err) {
      console.warn('[ContextoHotel] Falha ao salvar configurações via API:', err);
    }
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
      abaDashboard, setAbaDashboard,
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