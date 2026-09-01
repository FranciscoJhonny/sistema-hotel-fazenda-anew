// src/contextos/ContextoHotel.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../servicos/supabase/AuthService';
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
} from '../tipos';
import {
  QUARTOS_INICIAIS,
  HOSPEDES_INICIAIS,
  RESERVAS_INICIAIS,
  PRODUTOS_INICIAIS,
  PACOTES_INICIAIS,
  VENDAS_INICIAIS,
  CONFIGURACAO_INICIAL,
  USUARIOS_INICIAIS,
} from '../dados/dadosIniciais';
import {
  verificarConflitoQuarto,
  calcularDisponibilidadeQuartos,
  StatusDisponibilidadeQuarto,
} from '../servicos/conflitoReservas';

// ============================================
// TIPOS
// ============================================

interface ContextoHotelType {
  // Estado principal
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

  // Ações de Autenticação & Navegação
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => Promise<void>;
  navegarPara: (pagina: PaginaNavegacao) => void;
  trocarUsuario: (usuarioId: number | string) => void;

  // Operações de Quartos
  atualizarStatusQuarto: (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => void;
  obterQuartoPorId: (quartoId: number | string) => Quarto | undefined;
  obterQuartoPorNumero: (numero: string) => Quarto | undefined;

  // Operações de Reservas
  verificarDisponibilidade: (
    dataEntrada: string,
    dataSaida: string,
    reservaIdIgnorar?: number | string
  ) => StatusDisponibilidadeQuarto[];
  criarReserva: (novaReserva: Omit<Reserva, 'ReservaId' | 'Codigo' | 'DataInclusao' | 'DataOperacao' | 'Ativo' | 'Status'> & { Status?: Reserva['Status'] }) => {
    sucesso: boolean;
    mensagem: string;
    reserva?: Reserva;
  };
  atualizarReserva: (id: number | string, dados: Partial<Reserva>) => {
    sucesso: boolean;
    mensagem: string;
  };
  cancelarReserva: (id: number | string, motivo?: string) => {
    sucesso: boolean;
    mensagem: string;
  };

  // Check-in & Check-out
  realizarCheckin: (reservaId: number | string) => {
    sucesso: boolean;
    mensagem: string;
  };
  realizarCheckout: (reservaId: number | string) => {
    sucesso: boolean;
    mensagem: string;
  };

  // Operações de Hóspedes
  cadastrarHospede: (hospede: Omit<Hospede, 'HospedeId' | 'DataInclusao' | 'DataOperacao' | 'Ativo'>) => Hospede;
  editarHospede: (id: number | string, dados: Partial<Hospede>) => void;
  excluirHospede: (id: number | string) => boolean;

  // Operações de Loja & Financeiro
  registrarVenda: (venda: Omit<Venda, 'VendaId' | 'Codigo' | 'DataHora' | 'DataInclusao' | 'DataOperacao' | 'Ativo'>) => Venda;
  atualizarEstoqueProduto: (produtoId: number | string, quantidadeDelta: number) => void;

  // Configurações & Reset
  salvarConfiguracoes: (novasConfiguracoes: Partial<ConfiguracaoSistema>) => void;
  restaurarDadosPadrao: () => void;
}

// ============================================
// CONTEXT
// ============================================

const ContextoHotel = createContext<ContextoHotelType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export const ProvedorHotel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ============================================
  // INSTANCIAR SERVICOS
  // ============================================
  
  const authService = new AuthService();

  // ============================================
  // ESTADOS
  // ============================================

  const [quartos, setQuartos] = useState<Quarto[]>(() => {
    const salvo = localStorage.getItem('anew_quartos_pascal_v1');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length === 13 && parsed[0]?.Numero === 'B1') {
          return parsed;
        }
      } catch (e) {}
    }
    return QUARTOS_INICIAIS;
  });

  const [reservas, setReservas] = useState<Reserva[]>(() => {
    const salvo = localStorage.getItem('anew_reservas_pascal_v1');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.QuartoCodigo === 'B2') {
          return parsed;
        }
      } catch (e) {}
    }
    return RESERVAS_INICIAIS;
  });

  const [hospedes, setHospedes] = useState<Hospede[]>(() => {
    const salvo = localStorage.getItem('anew_hospedes_pascal_v1');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.NomeCompleto) {
          return parsed;
        }
      } catch (e) {}
    }
    return HOSPEDES_INICIAIS;
  });

  const [produtos, setProdutos] = useState<Produto[]>(() => {
    const salvo = localStorage.getItem('anew_produtos_pascal_v1');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.Nome) {
          return parsed;
        }
      } catch (e) {}
    }
    return PRODUTOS_INICIAIS;
  });

  const [vendas, setVendas] = useState<Venda[]>(() => {
    const salvo = localStorage.getItem('anew_vendas_pascal_v1');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.ValorTotal !== undefined) {
          return parsed;
        }
      } catch (e) {}
    }
    return VENDAS_INICIAIS;
  });

  const [pacotes] = useState<Pacote[]>(PACOTES_INICIAIS);

  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSistema>(() => {
    const salvo = localStorage.getItem('anew_configuracoes_pascal_v1');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (parsed?.HotelNome) return parsed;
      } catch (e) {}
    }
    return CONFIGURACAO_INICIAL;
  });

  const [usuarios] = useState<Usuario[]>(USUARIOS_INICIAIS);

  const [usuarioAtual, setUsuarioAtual] = useState<Usuario>(() => {
    const usuarioLogado = authService.getUsuarioLogado();
    if (usuarioLogado) {
      return usuarioLogado;
    }
    return USUARIOS_INICIAIS[0];
  });

  const [autenticado, setAutenticado] = useState<boolean>(() => {
    return authService.getUsuarioLogado() !== null;
  });

  const [paginaAtual, setPaginaAtual] = useState<PaginaNavegacao>(() => {
    return authService.getUsuarioLogado() !== null ? 'dashboard' : 'login';
  });

  const [dataSistema] = useState<string>('2026-08-31');
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  // ============================================
  // FUNÇÕES DE AUTENTICAÇÃO
  // ============================================

  /**
   * 🔥 LOGIN - APENAS SUPABASE
   */
  const login = async (email: string, senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
    console.log('[ContextoHotel] Tentando login:', email);

    // Verificar se está online
    if (!online) {
      return { sucesso: false, erro: '🚫 Sistema offline. Verifique sua conexão com a internet.' };
    }

    try {
      const resultado = await authService.login(email, senha);
      console.log('[ContextoHotel] Resultado AuthService:', resultado);

      if (resultado.sucesso && resultado.dados) {
        const usuario = resultado.dados as Usuario;
        
        // Verificar se o usuário tem os campos necessários
        if (!usuario || !usuario.Email) {
          console.error('[ContextoHotel] Usuário inválido:', usuario);
          return { sucesso: false, erro: 'Dados do usuário incompletos.' };
        }

        setUsuarioAtual(usuario);
        setAutenticado(true);
        localStorage.setItem('anew_usuario_atual_v1', JSON.stringify(usuario));
        localStorage.setItem('anew_autenticado_v1', 'true');
        setPaginaAtual('dashboard');
        
        console.log('[ContextoHotel] Login bem-sucedido:', usuario.Email);
        return { sucesso: true };
      }

      return { 
        sucesso: false, 
        erro: resultado.erro || 'E-mail ou senha inválidos.' 
      };

    } catch (error: any) {
      console.error('[ContextoHotel] Erro no login:', error);
      return { 
        sucesso: false, 
        erro: error?.message || 'Erro ao conectar com o servidor. Tente novamente.' 
      };
    }
  };

  /**
   * 🔥 LOGOUT
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[ContextoHotel] Erro no logout:', error);
    }
    
    setAutenticado(false);
    setUsuarioAtual(USUARIOS_INICIAIS[0]);
    localStorage.setItem('anew_autenticado_v1', 'false');
    localStorage.removeItem('anew_usuario_atual_v1');
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
    const usr = usuarios.find((u) => String(u.UsuarioId) === String(usuarioId));
    if (usr) {
      setUsuarioAtual(usr);
      localStorage.setItem('anew_usuario_atual_v1', JSON.stringify(usr));
    }
  };

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
  // PERSISTÊNCIA LOCAL
  // ============================================

  useEffect(() => {
    localStorage.setItem('anew_quartos_pascal_v1', JSON.stringify(quartos));
  }, [quartos]);

  useEffect(() => {
    localStorage.setItem('anew_reservas_pascal_v1', JSON.stringify(reservas));
  }, [reservas]);

  useEffect(() => {
    localStorage.setItem('anew_hospedes_pascal_v1', JSON.stringify(hospedes));
  }, [hospedes]);

  useEffect(() => {
    localStorage.setItem('anew_produtos_pascal_v1', JSON.stringify(produtos));
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem('anew_vendas_pascal_v1', JSON.stringify(vendas));
  }, [vendas]);

  useEffect(() => {
    localStorage.setItem('anew_configuracoes_pascal_v1', JSON.stringify(configuracoes));
  }, [configuracoes]);

  // ============================================
  // FUNÇÕES DE QUARTOS
  // ============================================

  const obterQuartoPorId = (quartoId: number | string) => {
    return quartos.find((q) => String(q.QuartoId) === String(quartoId));
  };

  const obterQuartoPorNumero = (numero: string) => {
    return quartos.find((q) => q.Numero.toUpperCase() === numero.toUpperCase());
  };

  const atualizarStatusQuarto = (quartoId: number | string, novoStatus: StatusQuarto, motivoBloqueio?: string) => {
    const agora = new Date().toISOString();
    setQuartos((prev) =>
      prev.map((q) =>
        String(q.QuartoId) === String(quartoId)
          ? {
              ...q,
              Status: novoStatus,
              MotivoBloqueio: motivoBloqueio !== undefined ? motivoBloqueio : q.MotivoBloqueio,
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : q
      )
    );
  };

  // ============================================
  // FUNÇÕES DE RESERVAS
  // ============================================

  const verificarDisponibilidade = (
    dataEntrada: string,
    dataSaida: string,
    reservaIdIgnorar?: number | string
  ): StatusDisponibilidadeQuarto[] => {
    return calcularDisponibilidadeQuartos(quartos, reservas, dataEntrada, dataSaida, reservaIdIgnorar);
  };

  const criarReserva = (
    dados: Omit<Reserva, 'ReservaId' | 'Codigo' | 'DataInclusao' | 'DataOperacao' | 'Ativo' | 'Status'> & { Status?: Reserva['Status'] }
  ): { sucesso: boolean; mensagem: string; reserva?: Reserva } => {
    // Verificar conflito
    const conflito = verificarConflitoQuarto(
      dados.QuartoId,
      dados.DataEntrada,
      dados.DataSaida,
      reservas
    );

    if (conflito.temConflito) {
      return {
        sucesso: false,
        mensagem: conflito.motivo || 'O quarto selecionado possui conflito de datas com outra reserva.',
      };
    }

    const quarto = obterQuartoPorId(dados.QuartoId);
    if (!quarto) {
      return {
        sucesso: false,
        mensagem: 'Quarto selecionado não encontrado.',
      };
    }

    if (quarto.Status === 'MANUTENCAO') {
      return {
        sucesso: false,
        mensagem: `O Quarto ${quarto.Numero} está em manutenção e não pode ser reservado.`,
      };
    }

    // Gerar código único
    const numeroAleatorio = Math.floor(10000 + Math.random() * 90000);
    const codigo = `#${numeroAleatorio}`;
    const reservaId = numeroAleatorio;
    const agora = new Date().toISOString();

    let statusInicial: Reserva['Status'] = dados.Status || 'CONFIRMADA';
    if (dados.DataEntrada === dataSistema && statusInicial !== 'HOSPEDADO') {
      statusInicial = 'AGUARDANDO_CHECKIN';
    }

    const novaReserva: Reserva = {
      ...dados,
      ReservaId: reservaId,
      Codigo: codigo,
      QuartoNumero: quarto.Numero,
      QuartoCodigo: quarto.CodigoIdentificador,
      QuartoCategoria: quarto.Categoria,
      Status: statusInicial,
      Ativo: true,
      UsuarioInclusao: usuarioAtual?.Nome || 'Sistema',
      DataInclusao: agora,
      UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
      DataOperacao: agora,
      NaturezaOperacao: 'INSERT',
    };

    setReservas((prev) => [novaReserva, ...prev]);

    // Atualizar status do quarto
    setQuartos((prev) =>
      prev.map((q) =>
        String(q.QuartoId) === String(quarto.QuartoId)
          ? {
              ...q,
              Status: statusInicial === 'HOSPEDADO' ? 'OCUPADO' : 
                      dados.DataEntrada === dataSistema ? 'AGUARDANDO_CHECKIN' : 'RESERVADO',
              HospedeAtualNome: dados.HospedeNome,
              DataEntradaAtual: dados.DataEntrada,
              DataSaidaAtual: dados.DataSaida,
              AdultosAtual: dados.Adultos,
              CriancasAtual: dados.Criancas,
              ReservaAtualId: reservaId,
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : q
      )
    );

    return {
      sucesso: true,
      mensagem: `Reserva ${codigo} criada com sucesso para ${dados.HospedeNome}!`,
      reserva: novaReserva,
    };
  };

  const atualizarReserva = (id: number | string, dados: Partial<Reserva>) => {
    const reservaExistente = reservas.find((r) => String(r.ReservaId) === String(id));
    if (!reservaExistente) {
      return { sucesso: false, mensagem: 'Reserva não encontrada.' };
    }

    const novoQuartoId = dados.QuartoId || reservaExistente.QuartoId;
    const novaEntrada = dados.DataEntrada || reservaExistente.DataEntrada;
    const novaSaida = dados.DataSaida || reservaExistente.DataSaida;

    if (
      String(novoQuartoId) !== String(reservaExistente.QuartoId) ||
      novaEntrada !== reservaExistente.DataEntrada ||
      novaSaida !== reservaExistente.DataSaida
    ) {
      const conflito = verificarConflitoQuarto(novoQuartoId, novaEntrada, novaSaida, reservas, id);
      if (conflito.temConflito) {
        return {
          sucesso: false,
          mensagem: conflito.motivo || 'Datas conflitam com outra reserva.',
        };
      }
    }

    const agora = new Date().toISOString();
    setReservas((prev) =>
      prev.map((r) =>
        String(r.ReservaId) === String(id)
          ? {
              ...r,
              ...dados,
              Saldo: (dados.ValorTotal ?? r.ValorTotal) - (dados.ValorPago ?? r.ValorPago),
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : r
      )
    );

    return { sucesso: true, mensagem: 'Reserva atualizada com sucesso.' };
  };

  const cancelarReserva = (id: number | string, motivo?: string) => {
    const reserva = reservas.find((r) => String(r.ReservaId) === String(id));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();
    setReservas((prev) =>
      prev.map((r) =>
        String(r.ReservaId) === String(id)
          ? {
              ...r,
              Status: 'CANCELADA',
              Observacoes: motivo ? `${r.Observacoes || ''} [Cancelada: ${motivo}]` : r.Observacoes,
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : r
      )
    );

    setQuartos((prev) =>
      prev.map((q) => {
        if (String(q.QuartoId) === String(reserva.QuartoId) && (q.Status === 'RESERVADO' || q.Status === 'AGUARDANDO_CHECKIN')) {
          return {
            ...q,
            Status: 'DISPONIVEL',
            HospedeAtualNome: undefined,
            DataEntradaAtual: undefined,
            DataSaidaAtual: undefined,
            AdultosAtual: undefined,
            CriancasAtual: undefined,
            ReservaAtualId: undefined,
            DataOperacao: agora,
            UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
            NaturezaOperacao: 'UPDATE',
          };
        }
        return q;
      })
    );

    return { sucesso: true, mensagem: `Reserva ${reserva.Codigo} cancelada.` };
  };

  // ============================================
  // CHECK-IN / CHECK-OUT
  // ============================================

  const realizarCheckin = (reservaId: number | string) => {
    const reserva = reservas.find((r) => String(r.ReservaId) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();

    setReservas((prev) =>
      prev.map((r) =>
        String(r.ReservaId) === String(reservaId)
          ? {
              ...r,
              Status: 'HOSPEDADO',
              CheckinRealizadoEm: agora,
              CheckinUsuario: usuarioAtual?.Nome || 'Sistema',
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : r
      )
    );

    setQuartos((prev) =>
      prev.map((q) =>
        String(q.QuartoId) === String(reserva.QuartoId)
          ? {
              ...q,
              Status: 'OCUPADO',
              HospedeAtualNome: reserva.HospedeNome,
              DataEntradaAtual: reserva.DataEntrada,
              DataSaidaAtual: reserva.DataSaida,
              AdultosAtual: reserva.Adultos,
              CriancasAtual: reserva.Criancas,
              ReservaAtualId: reserva.ReservaId,
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : q
      )
    );

    return {
      sucesso: true,
      mensagem: `Check-in de ${reserva.HospedeNome} (Quarto ${reserva.QuartoNumero}) realizado!`,
    };
  };

  const realizarCheckout = (reservaId: number | string) => {
    const reserva = reservas.find((r) => String(r.ReservaId) === String(reservaId));
    if (!reserva) return { sucesso: false, mensagem: 'Reserva não encontrada.' };

    const agora = new Date().toISOString();

    setReservas((prev) =>
      prev.map((r) =>
        String(r.ReservaId) === String(reservaId)
          ? {
              ...r,
              Status: 'FINALIZADA',
              CheckoutRealizadoEm: agora,
              CheckoutUsuario: usuarioAtual?.Nome || 'Sistema',
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : r
      )
    );

    setQuartos((prev) =>
      prev.map((q) =>
        String(q.QuartoId) === String(reserva.QuartoId)
          ? {
              ...q,
              Status: 'DISPONIVEL',
              HospedeAtualNome: undefined,
              DataEntradaAtual: undefined,
              DataSaidaAtual: undefined,
              AdultosAtual: undefined,
              CriancasAtual: undefined,
              ReservaAtualId: undefined,
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : q
      )
    );

    return {
      sucesso: true,
      mensagem: `Check-out do Quarto ${reserva.QuartoNumero} finalizado!`,
    };
  };

  // ============================================
  // FUNÇÕES DE HÓSPEDES
  // ============================================

  const cadastrarHospede = (dados: Omit<Hospede, 'HospedeId' | 'DataInclusao' | 'DataOperacao' | 'Ativo'>): Hospede => {
    const hospedeId = Date.now();
    const agora = new Date().toISOString();
    const novo: Hospede = {
      ...dados,
      HospedeId: hospedeId,
      Ativo: true,
      UsuarioInclusao: usuarioAtual?.Nome || 'Sistema',
      DataInclusao: agora,
      UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
      DataOperacao: agora,
      NaturezaOperacao: 'INSERT',
    };
    setHospedes((prev) => [novo, ...prev]);
    return novo;
  };

  const editarHospede = (id: number | string, dados: Partial<Hospede>) => {
    const agora = new Date().toISOString();
    setHospedes((prev) =>
      prev.map((h) =>
        String(h.HospedeId) === String(id)
          ? {
              ...h,
              ...dados,
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : h
      )
    );
  };

  const excluirHospede = (id: number | string): boolean => {
    const temReservaAtiva = reservas.some(
      (r) =>
        String(r.HospedeId) === String(id) &&
        (r.Status === 'CONFIRMADA' || r.Status === 'AGUARDANDO_CHECKIN' || r.Status === 'HOSPEDADO')
    );
    if (temReservaAtiva) return false;

    setHospedes((prev) => prev.filter((h) => String(h.HospedeId) !== String(id)));
    return true;
  };

  // ============================================
  // FUNÇÕES DE LOJA
  // ============================================

  const registrarVenda = (dados: Omit<Venda, 'VendaId' | 'Codigo' | 'DataHora' | 'DataInclusao' | 'DataOperacao' | 'Ativo'>): Venda => {
    const num = Math.floor(100 + Math.random() * 900);
    const codigo = `VND-${num}`;
    const agora = new Date().toISOString();
    const novaVenda: Venda = {
      ...dados,
      VendaId: Date.now(),
      Codigo: codigo,
      DataHora: agora,
      UsuarioResponsavel: usuarioAtual?.Nome || 'Sistema',
      Ativo: true,
      UsuarioInclusao: usuarioAtual?.Nome || 'Sistema',
      DataInclusao: agora,
      UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
      DataOperacao: agora,
      NaturezaOperacao: 'INSERT',
    };

    dados.Itens.forEach((item) => {
      if (item.ProdutoId) {
        atualizarEstoqueProduto(item.ProdutoId, -item.Quantidade);
      }
    });

    setVendas((prev) => [novaVenda, ...prev]);
    return novaVenda;
  };

  const atualizarEstoqueProduto = (produtoId: number | string, delta: number) => {
    const agora = new Date().toISOString();
    setProdutos((prev) =>
      prev.map((p) =>
        String(p.ProdutoId) === String(produtoId)
          ? {
              ...p,
              Estoque: Math.max(0, p.Estoque + delta),
              DataOperacao: agora,
              UsuarioOperacao: usuarioAtual?.Nome || 'Sistema',
              NaturezaOperacao: 'UPDATE',
            }
          : p
      )
    );
  };

  // ============================================
  // CONFIGURAÇÕES & RESET
  // ============================================

  const salvarConfiguracoes = (novas: Partial<ConfiguracaoSistema>) => {
    setConfiguracoes((prev) => ({ ...prev, ...novas }));
  };

  const restaurarDadosPadrao = () => {
    localStorage.removeItem('anew_quartos_pascal_v1');
    localStorage.removeItem('anew_reservas_pascal_v1');
    localStorage.removeItem('anew_hospedes_pascal_v1');
    localStorage.removeItem('anew_produtos_pascal_v1');
    localStorage.removeItem('anew_vendas_pascal_v1');
    localStorage.removeItem('anew_configuracoes_pascal_v1');

    setQuartos(QUARTOS_INICIAIS);
    setReservas(RESERVAS_INICIAIS);
    setHospedes(HOSPEDES_INICIAIS);
    setProdutos(PRODUTOS_INICIAIS);
    setVendas(VENDAS_INICIAIS);
    setConfiguracoes(CONFIGURACAO_INICIAL);
  };

  // ============================================
  // PROVIDER
  // ============================================

  return (
    <ContextoHotel.Provider
      value={{
        quartos,
        reservas,
        hospedes,
        produtos,
        vendas,
        pacotes,
        configuracoes,
        usuarioAtual,
        usuarios,
        paginaAtual,
        dataSistema,
        online,
        autenticado,
        login,
        logout,
        navegarPara,
        trocarUsuario,
        atualizarStatusQuarto,
        obterQuartoPorId,
        obterQuartoPorNumero,
        verificarDisponibilidade,
        criarReserva,
        atualizarReserva,
        cancelarReserva,
        realizarCheckin,
        realizarCheckout,
        cadastrarHospede,
        editarHospede,
        excluirHospede,
        registrarVenda,
        atualizarEstoqueProduto,
        salvarConfiguracoes,
        restaurarDadosPadrao,
      }}
    >
      {children}
    </ContextoHotel.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useHotel = () => {
  const contexto = useContext(ContextoHotel);
  if (!contexto) {
    throw new Error('useHotel deve ser utilizado dentro de um ProvedorHotel');
  }
  return contexto;
};

// ============================================
// EXPORT
// ============================================

export const ContextoHotelProvider = ProvedorHotel;