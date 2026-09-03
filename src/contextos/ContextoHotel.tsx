// src/contextos/ContextoHotel.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../servicos/supabase/AuthService';
import { SupabaseService } from '../servicos/supabase/SupabaseService';
import {
  Quarto,
  Reserva,
  Hospede,
  Produto,
  Venda,
  Pacote,
  ConfiguracaoSistema,
  Usuario,
  PaginaNavegacao,
  StatusQuarto,
  StatusReserva,
} from '../tipos';
import {
  verificarConflitoQuarto,
  calcularDisponibilidadeQuartos,
  StatusDisponibilidadeQuarto,
} from '../servicos/conflitoReservas';

const usuarioPadrao: Usuario = {
  usuarioid: 0,
  perfilid: 0,
  nome: '',
  email: '',
  senha: '',
  perfil: 'ADMIN',
  ativo: true,
  datainclusao: new Date().toISOString(),
  dataoperacao: new Date().toISOString(),
  naturezaoperacao: 'INSERT',
};

const configuracaoPadrao: ConfiguracaoSistema = {
  checkintime: '09:00',
  checkouttime: '12:00',
  hotelnome: '',
  hotellocalizacao: '',
  telefonehotel: '',
  emailhotel: '',
  taxaservicopercentual: 0,
  supabaseurl: '',
  supabaseanonkey: '',
  modoofflineativo: false,
  criancaidadelimitegratis: 5,
  criancaidadelimitemeia: 11,
  criancaidadeintegral: 12,
  criancaporcentagemmeiadiaria: 50,
  criancaDescontogratuis: 100,
  capacidademaximaadultosporquarto: 4,
  capacidademaximacriancasporquarto: 3,
  formapagamentopadrao: 'PIX',
  porcentagementradaminima: 30,
};

// ============================================
// TIPOS
// ============================================

interface ContextoHotelType {
  quartos: Quarto[];
  reservas: Reserva[];
  hospedes: Hospede[];
  produtos: Produto[];
  vendas: Venda[];
  pacotes: Pacote[];
  configuracoes: ConfiguracaoSistema;
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
  criarReserva: (novaReserva: Omit<Reserva, 'reservaid' | 'codigo' | 'datainclusao' | 'dataoperacao' | 'ativo' | 'status'> & { status?: StatusReserva }) => Promise<{ sucesso: boolean; mensagem: string; reserva?: Reserva }>;
  atualizarReserva: (id: number | string, dados: Partial<Reserva>) => Promise<{ sucesso: boolean; mensagem: string }>;
  cancelarReserva: (id: number | string, motivo?: string) => Promise<{ sucesso: boolean; mensagem: string }>;

  realizarCheckin: (reservaId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;
  realizarCheckout: (reservaId: number | string) => Promise<{ sucesso: boolean; mensagem: string }>;

  cadastrarHospede: (hospede: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>) => Promise<Hospede>;
  editarHospede: (id: number | string, dados: Partial<Hospede>) => Promise<void>;
  excluirHospede: (id: number | string) => Promise<boolean>;

  registrarVenda: (venda: Omit<Venda, 'vendaid' | 'codigo' | 'datahora' | 'datainclusao' | 'dataoperacao' | 'ativo'>) => Promise<Venda>;
  atualizarEstoqueProduto: (produtoId: number | string, quantidadeDelta: number) => Promise<void>;

  salvarConfiguracoes: (novasConfiguracoes: Partial<ConfiguracaoSistema>) => Promise<void>;
  restaurarDadosPadrao: () => void;
}

// ============================================
// CONTEXT
// ============================================

const ContextoHotel = createContext<ContextoHotelType | undefined>(undefined);

const normalizarQuartoDoBanco = (quarto: any): Quarto => {
  if (!quarto) return quarto;
  const dados = { ...quarto } as Record<string, any>;

  return {
    ...quarto,
    quartoid: dados.quartoid ?? dados.QuartoId,
    numero: dados.numero ?? dados.Numero,
    codigoidentificador: dados.codigoidentificador ?? dados.CodigoIdentificador,
    bloco: dados.bloco ?? dados.Bloco,
    categoria: dados.categoria ?? dados.Categoria,
    capacidadeadultos: dados.capacidadeadultos ?? dados.CapacidadeAdultos,
    capacidadecriancas: dados.capacidadecriancas ?? dados.CapacidadeCriancas,
    valordiariapadrao: dados.valordiariapadrao ?? dados.ValorDiariaPadrao,
    status: dados.status ?? dados.Status,
    descricao: dados.descricao ?? dados.Descricao,
    comodidades: dados.comodidades ?? dados.Comodidades,
    ativo: dados.ativo ?? dados.Ativo,
    reservaatualid: dados.reservaatualid ?? dados.ReservaAtualId,
    hospedeatualnome: dados.hospedeatualnome ?? dados.HospedeAtualNome,
    dataentradaatual: dados.dataentradaatual ?? dados.DataEntradaAtual,
    datasaidaatual: dados.datasaidaatual ?? dados.DataSaidaAtual,
    adultosatual: dados.adultosatual ?? dados.AdultosAtual,
    criancasatual: dados.criancasatual ?? dados.CriancasAtual,
    usuarioinclusao: dados.usuarioinclusao ?? dados.UsuarioInclusao,
    datainclusao: dados.datainclusao ?? dados.DataInclusao,
    usuariooperacao: dados.usuariooperacao ?? dados.UsuarioOperacao,
    dataoperacao: dados.dataoperacao ?? dados.DataOperacao,
    naturezaoperacao: dados.naturezaoperacao ?? dados.NaturezaOperacao,
  };
};

// ============================================
// PROVIDER
// ============================================

export const ProvedorHotel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authService = new AuthService();
  const supabaseService = SupabaseService.getInstance();

  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [hospedes, setHospedes] = useState<Hospede[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSistema>(configuracaoPadrao);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [usuarioAtual, setUsuarioAtual] = useState<Usuario>(usuarioPadrao);
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [paginaAtual, setPaginaAtual] = useState<PaginaNavegacao>('login');

  const [dataSistema] = useState<string>(new Date().toISOString().slice(0, 10));
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // ============================================
  // CARREGAR DADOS DO SUPABASE AO INICIAR
  // ============================================
  useEffect(() => {
    const carregarDadosDoBanco = async () => {
      const client = supabaseService.getClient();
      if (!client) {
        console.warn('[ContextoHotel] Cliente Supabase não inicializado.');
        setCarregando(false);
        setErro('Cliente Supabase não inicializado.');
        return;
      }

      try {
        setCarregando(true);
        setErro(null);
        console.log('[ContextoHotel] 🔄 Iniciando carregamento dos dados do Supabase...');

        // CORREÇÃO: Todos os nomes de tabelas agora estão em MINÚSCULO, conforme o padrão do PostgreSQL/Supabase
        const [quartosResult, reservasResult, hospedesResult, produtosResult, vendasResult, pacotesResult, usuariosResult, configuracaoResult] = await Promise.all([
          client.from('quarto').select('*'),
          client.from('reserva').select('*'),
          client.from('hospede').select('*'),
          client.from('produto').select('*'),
          client.from('venda').select('*'),
          client.from('pacote').select('*'),
          client.from('usuario').select('*'),
          client.from('configuracao').select('*').limit(1).maybeSingle(),
        ]);

        if (quartosResult.error) {
          console.error('[ContextoHotel] ❌ ERRO ao buscar Quartos:', quartosResult.error);
          setErro(`Erro ao buscar quartos: ${quartosResult.error.message}`);
        } else if (quartosResult.data) {
          console.log(`[ContextoHotel] ✅ ${quartosResult.data.length} quartos encontrados no banco.`);
          setQuartos((quartosResult.data as any[]).map(normalizarQuartoDoBanco));
        } else {
          console.warn('[ContextoHotel] ⚠️ Nenhum dado de quartos retornado.');
        }

        if (reservasResult.error) console.error('[ContextoHotel] ❌ ERRO Reservas:', reservasResult.error);
        else if (reservasResult.data) setReservas(reservasResult.data as Reserva[]);

        if (hospedesResult.error) console.error('[ContextoHotel] ❌ ERRO Hóspedes:', hospedesResult.error);
        else if (hospedesResult.data) setHospedes(hospedesResult.data as Hospede[]);

        if (produtosResult.error) console.error('[ContextoHotel] ❌ ERRO Produtos:', produtosResult.error);
        else if (produtosResult.data) setProdutos(produtosResult.data as Produto[]);

        if (vendasResult.error) console.error('[ContextoHotel] ❌ ERRO Vendas:', vendasResult.error);
        else if (vendasResult.data) setVendas(vendasResult.data as Venda[]);

        if (pacotesResult.error) console.error('[ContextoHotel] ❌ ERRO Pacotes:', pacotesResult.error);
        else if (pacotesResult.data) setPacotes(pacotesResult.data as Pacote[]);

        if (usuariosResult.error) console.error('[ContextoHotel] ❌ ERRO Usuários:', usuariosResult.error);
        else if (usuariosResult.data) setUsuarios(usuariosResult.data as Usuario[]);

        if (configuracaoResult.error) console.error('[ContextoHotel] ❌ ERRO Configuração:', configuracaoResult.error);
        else if (configuracaoResult.data) setConfiguracoes(configuracaoResult.data as ConfiguracaoSistema);

        const usuarioSalvo = authService.getUsuarioLogado();
        if (usuarioSalvo) {
          setUsuarioAtual(usuarioSalvo);
          setAutenticado(true);
          setPaginaAtual('dashboard');
        }
      } catch (error: any) {
        console.error('[ContextoHotel] ❌ Exceção fatal ao carregar dados do Supabase:', error);
        setErro(error?.message || 'Erro inesperado ao carregar dados.');
      } finally {
        setCarregando(false);
        console.log('[ContextoHotel] 🏁 Carregamento finalizado.');
      }
    };

    carregarDadosDoBanco();
  }, []);

  // ============================================
  // MONITORAR CONECTIVIDADE
  // ============================================
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // FUNÇÕES DE AUTENTICAÇÃO
  // ============================================
  const login = async (email: string, senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
    if (!online) return { sucesso: false, erro: '🚫 Sistema offline.' };

    try {
      const resultado = await authService.login(email, senha);
      if (resultado.sucesso && resultado.dados) {
        const usuario = resultado.dados as Usuario;
        setUsuarioAtual(usuario);
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

  // ============================================
  // NAVEGAÇÃO
  // ============================================
  const navegarPara = (pagina: PaginaNavegacao) => {
    setPaginaAtual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const trocarUsuario = (usuarioId: number | string) => {
    const usr = usuarios.find((u) => String(u.usuarioid) === String(usuarioId));
    if (usr) setUsuarioAtual(usr);
  };

  // ============================================
  // FUNÇÕES DE QUARTOS
  // ============================================
  const obterQuartoPorId = (quartoId: number | string) => quartos.find((q) => String(q.quartoid) === String(quartoId));
  const obterQuartoPorNumero = (numero: string) => quartos.find((q) => q.numero?.toUpperCase() === numero.toUpperCase());

  const atualizarStatusQuarto = async (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => {
    const client = supabaseService.getClient();
    const agora = new Date().toISOString();

    setQuartos(prev => prev.map(q => String(q.quartoid) === String(quartoId) ? {
      ...q,
      status: novoStatus,
      descricao: motivoBloqueio,
      dataoperacao: agora,
      naturezaoperacao: 'UPDATE' as const
    } : q) as Quarto[]);

    if (client) {
      // CORREÇÃO: 'quarto' e 'quartoid' em minúsculo
      const { error } = await client.from('quarto').update({
        status: novoStatus,
        descricao: motivoBloqueio,
        dataoperacao: agora,
        usuariooperacao: usuarioAtual?.usuarioid,
        naturezaoperacao: 'UPDATE'
      }).eq('quartoid', quartoId);
      
      if (error) console.error('[ContextoHotel] Erro ao atualizar status do quarto:', error);
    }
  };

  // ============================================
  // FUNÇÕES DE RESERVAS
  // ============================================
  const verificarDisponibilidade = (dataEntrada: string, dataSaida: string, reservaIdIgnorar?: number | string) => {
    return calcularDisponibilidadeQuartos(quartos, reservas, dataEntrada, dataSaida, reservaIdIgnorar);
  };

  const criarReserva = async (dados: any): Promise<{ sucesso: boolean; mensagem: string; reserva?: Reserva }> => {
    const client = supabaseService.getClient();
    if (!client) return { sucesso: false, mensagem: 'Sem conexão com o banco.' };

    const conflito = verificarConflitoQuarto(dados.quartoid, dados.dataentrada, dados.datasaida, reservas);
    if (conflito.temConflito) return { sucesso: false, mensagem: conflito.motivo || 'Conflito de datas.' };

    const quarto = obterQuartoPorId(dados.quartoid);
    if (!quarto) return { sucesso: false, mensagem: 'Quarto não encontrado.' };
    if (quarto.status === 'MANUTENCAO') return { sucesso: false, mensagem: `Quarto ${quarto.numero} em manutenção.` };

    const numeroAleatorio = Math.floor(10000 + Math.random() * 90000);
    const agora = new Date().toISOString();
    let statusInicial: StatusReserva = dados.status || 'CONFIRMADA';
    if (dados.dataentrada === dataSistema && statusInicial !== 'HOSPEDADO') statusInicial = 'AGUARDANDO_CHECKIN';

    const novaReserva: Reserva = {
      ...dados,
      reservaid: numeroAleatorio,
      codigo: `#${numeroAleatorio}`,
      quartonumero: quarto.numero,
      quartocodigo: quarto.codigoidentificador,
      quartocategoria: quarto.categoria,
      status: statusInicial,
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT',
    };

    // CORREÇÃO: 'reserva' em minúsculo
    const { data, error } = await client.from('reserva').insert(novaReserva).select().single();
    if (error) return { sucesso: false, mensagem: 'Erro ao salvar: ' + error.message };

    setReservas(prev => [data as Reserva, ...prev]);

    await atualizarStatusQuarto(quarto.quartoid, statusInicial === 'HOSPEDADO' ? 'OCUPADO' : (dados.dataentrada === dataSistema ? 'AGUARDANDO_CHECKIN' : 'RESERVADO'));

    return { sucesso: true, mensagem: `Reserva ${data.codigo} criada com sucesso!`, reserva: data as Reserva };
  };

  const atualizarReserva = async (id: number | string, dados: Partial<Reserva>): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reservaExistente = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reservaExistente) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const novoQuartoId = dados.quartoid || reservaExistente.quartoid;
    const novaEntrada = dados.dataentrada || reservaExistente.dataentrada;
    const novaSaida = dados.datasaida || reservaExistente.datasaida;

    if (String(novoQuartoId) !== String(reservaExistente.quartoid) || novaEntrada !== reservaExistente.dataentrada || novaSaida !== reservaExistente.datasaida) {
      const conflito = verificarConflitoQuarto(novoQuartoId, novaEntrada, novaSaida, reservas, id);
      if (conflito.temConflito) return { sucesso: false, mensagem: conflito.motivo || 'Datas conflitam.' };
    }

    const agora = new Date().toISOString();
    const dadosAtualizados = {
      ...dados,
      saldo: (dados.valortotal ?? reservaExistente.valortotal) - (dados.valorpago ?? reservaExistente.valorpago),
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };

    if (client) {
      // CORREÇÃO: 'reserva' e 'reservaid' em minúsculo
      const { error } = await client.from('reserva').update(dadosAtualizados).eq('reservaid', id);
      if (error) return { sucesso: false, mensagem: 'Erro ao atualizar: ' + error.message };
    }

    setReservas(prev => prev.map(r => String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r) as Reserva[]);
    return { sucesso: true, mensagem: 'Reserva atualizada com sucesso.' };
  };

  const cancelarReserva = async (id: number | string, motivo?: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(id));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };
    const agora = new Date().toISOString();
    const dadosAtualizados = {
      status: 'CANCELADA' as StatusReserva,
      observacoes: motivo ? `${reserva.observacoes || ''} [Cancelada: ${motivo}]` : reserva.observacoes,
      dataoperacao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      naturezaoperacao: 'UPDATE',
    };
    if (client) {
      await client.from('reserva').update(dadosAtualizados).eq('reservaid', id);
    }
    setReservas(prev => prev.map(r => String(r.reservaid) === String(id) ? { ...r, ...dadosAtualizados } : r) as Reserva[]);
    if (reserva.quartoid && (reserva.status === 'CONFIRMADA' || reserva.status === 'AGUARDANDO_CHECKIN')) {
      await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');
    }

    return { sucesso: true, mensagem: `Reserva ${reserva.codigo} cancelada.` };
  };

  // ============================================
  // CHECK-IN / CHECK-OUT
  // ============================================
  const realizarCheckin = async (reservaId: number | string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosReserva = {
      status: 'HOSPEDADO' as StatusReserva,
      checkinrealizadoem: agora,
      checkinusuario: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'UPDATE'
    };

    if (client) await client.from('reserva').update(dadosReserva).eq('reservaid', reservaId);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(reservaId) ? { ...r, ...dadosReserva } : r) as Reserva[]);

    await atualizarStatusQuarto(reserva.quartoid, 'OCUPADO');

    return { sucesso: true, mensagem: `Check-in de ${reserva.hospedenome} realizado!` };
  };

  const realizarCheckout = async (reservaId: number | string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const client = supabaseService.getClient();
    const reserva = reservas.find((r) => String(r.reservaid) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    const dadosReserva = {
      status: 'FINALIZADA' as StatusReserva,
      checkoutrealizadoem: agora,
      checkoutusuario: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'UPDATE'
    };

    if (client) await client.from('reserva').update(dadosReserva).eq('reservaid', reservaId);
    setReservas(prev => prev.map(r => String(r.reservaid) === String(reservaId) ? { ...r, ...dadosReserva } : r) as Reserva[]);

    await atualizarStatusQuarto(reserva.quartoid, 'DISPONIVEL');

    return { sucesso: true, mensagem: `Check-out do Quarto ${reserva.quartonumero} finalizado!` };
  };

  // ============================================
  // FUNÇÕES DE HÓSPEDES
  // ============================================
  const cadastrarHospede = async (dados: any): Promise<Hospede> => {
    const client = supabaseService.getClient();
    const hospedeId = Date.now();
    const agora = new Date().toISOString();
    const novo: Hospede = {
      ...dados,
      hospedeid: hospedeId,
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT'
    };

    if (client) {
      // CORREÇÃO: 'hospede' em minúsculo
      const { data } = await client.from('hospede').insert(novo).select().single();
      if (data) {
        setHospedes(prev => [data as Hospede, ...prev]);
        return data as Hospede;
      }
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
    const temReservaAtiva = reservas.some(r =>
      String(r.hospedeid) === String(id) &&
      (r.status === 'CONFIRMADA' || r.status === 'AGUARDANDO_CHECKIN' || r.status === 'HOSPEDADO')
    );
    if (temReservaAtiva) return false;

    if (client) await client.from('hospede').delete().eq('hospedeid', id);
    setHospedes(prev => prev.filter(h => String(h.hospedeid) !== String(id)));
    return true;
  };

  // ============================================
  // FUNÇÕES DE LOJA
  // ============================================
  const registrarVenda = async (dados: any): Promise<Venda> => {
    const client = supabaseService.getClient();
    const num = Math.floor(100 + Math.random() * 900);
    const agora = new Date().toISOString();
    const novaVenda: Venda = {
      ...dados,
      vendaid: Date.now(),
      codigo: `VND-${num}`,
      datahora: agora,
      usuarioresponsavel: usuarioAtual?.usuarioid,
      ativo: true,
      usuarioinclusao: usuarioAtual?.usuarioid,
      datainclusao: agora,
      usuariooperacao: usuarioAtual?.usuarioid,
      dataoperacao: agora,
      naturezaoperacao: 'INSERT'
    };

    if (client) {
      // CORREÇÃO: 'venda' em minúsculo
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

    const novoEstoque = Math.max(0, produto.estoque + delta);
    const agora = new Date().toISOString();
    const dadosAtualizados = { estoque: novoEstoque, dataoperacao: agora, usuariooperacao: usuarioAtual?.usuarioid, naturezaoperacao: 'UPDATE' };

    if (client) await client.from('produto').update(dadosAtualizados).eq('produtoid', produtoId);
    setProdutos(prev => prev.map(p => String(p.produtoid) === String(produtoId) ? { ...p, ...dadosAtualizados } : p) as Produto[]);
  };

  // ============================================
  // CONFIGURAÇÕES & RESET
  // ============================================
  const salvarConfiguracoes = async (novas: Partial<ConfiguracaoSistema>): Promise<void> => {
    const client = supabaseService.getClient();
    setConfiguracoes(prev => {
      const atualizado = { ...prev, ...novas };
      if (client) {
        client.from('configuracao').upsert(atualizado);
      }
      return atualizado;
    });
  };

  const restaurarDadosPadrao = () => {
    setQuartos([]);
    setReservas([]);
    setHospedes([]);
    setProdutos([]);
    setVendas([]);
    setPacotes([]);
    setConfiguracoes(configuracaoPadrao);
    setUsuarios([]);
    setUsuarioAtual(usuarioPadrao);
    setAutenticado(false);
    setPaginaAtual('login');
  };

  // ============================================
  // PROVIDER
  // ============================================
  return (
    <ContextoHotel.Provider value={{
      quartos, reservas, hospedes, produtos, vendas, pacotes, configuracoes,
      usuarioAtual, usuarios, paginaAtual, dataSistema, online, autenticado, 
      carregando,
      erro,
      login, logout, navegarPara, trocarUsuario,
      atualizarStatusQuarto, obterQuartoPorId, obterQuartoPorNumero,
      verificarDisponibilidade, criarReserva, atualizarReserva, cancelarReserva,
      realizarCheckin, realizarCheckout,
      cadastrarHospede, editarHospede, excluirHospede,
      registrarVenda, atualizarEstoqueProduto,
      salvarConfiguracoes, restaurarDadosPadrao,
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