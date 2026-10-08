import {
  CheckCircle2,
  Coffee,
  LoaderCircle,
  LogOut,
  Plus,
  Printer,
  Receipt,
  Search,
  X,
  Trash2,
  CreditCard,
  Split,
  DollarSign,
  AlertCircle,
  Clock,
  Users,
  Layers
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { FormaPagamento, Reserva } from '../tipos';
import { formatarData, formatarMoeda } from '../utilitarios/formatadores';
import { obterClienteSupabase } from '../lib/supabaseCliente';

export type LinhaPagamento = {
  id: string;
  descricao: string;
  valor: number;
  formaPagamento: FormaPagamento;
  parcelas: number; // 1, 2 ou 3 (apenas se CARTAO_CREDITO)
  tipoLancamento: 'SALDO_RESERVA' | 'CONSUMO_EXTRA';
};

type ConsumoPendente = {
  produtoId: string;
  quantidade: number;
};

export const PaginaCheckout: React.FC = () => {
  const {
    reservas,
    produtos,
    consumosExtras,
    criarConsumoExtra,
    dataSistema,
    realizarCheckout,
    recarregarDados,
    usuarioAtual
  } = useHotel();

  // Estados principais
  const [busca, setBusca] = useState<string>('');
  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);
  const [feedbackErro, setFeedbackErro] = useState<string | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Estados do modal de consumos extras
  const [modalConsumoAberta, setModalConsumoAberta] = useState(false);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadeConsumo, setQuantidadeConsumo] = useState(1);
  const [salvandoConsumo, setSalvandoConsumo] = useState(false);
  const [consumosPendentes, setConsumosPendentes] = useState<ConsumoPendente[]>([]);

  // Linhas dinâmicas de pagamento
  const [linhasPagamento, setLinhasPagamento] = useState<LinhaPagamento[]>([]);

  // Modal de Divisão em Pessoas (Flexível)
  const [modalDividirAberta, setModalDividirAberta] = useState(false);
  const [tipoAlvoDivisao, setTipoAlvoDivisao] = useState<'TUDO' | 'HOSPEDAGEM' | 'CONSUMOS'>('TUDO');
  const [qtdPessoasDivisao, setQtdPessoasDivisao] = useState(2);

  // Estado de Processamento e Comprovante
  const [processandoCheckout, setProcessandoCheckout] = useState(false);
  const [comprovanteCheckout, setComprovanteCheckout] = useState<{
    reserva: Reserva;
    consumoExtra: number;
    totalPago: number;
    pagamentoParcial?: boolean;
    saldoRestante?: number;
  } | null>(null);

  // Hóspedes com estadia ativa
  const reservasHospedadas = reservas.filter((r) => r.statusreserva === 'HOSPEDADO');

  const reservasFiltradas = reservasHospedadas.filter((r) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      r.hospedenome.toLowerCase().includes(termo) ||
      r.codigo.toLowerCase().includes(termo) ||
      r.quartonumero.includes(termo)
    );
  });

  const consumosDaReserva = reservaSelecionada
    ? consumosExtras.filter((consumo) => String(consumo.reservaid) === String(reservaSelecionada.reservaid) && consumo.ativo)
    : [];

  const totalConsumosJaSalvos = consumosDaReserva.reduce((total, consumo) => total + Number(consumo.valortotal || 0), 0);
  const totalConsumosPendentes = consumosPendentes.reduce((total, consumo) => {
    const produto = produtos.find((item) => String(item.produtoid) === consumo.produtoId);
    return total + (produto?.preco || 0) * consumo.quantidade;
  }, 0);

  const totalConsumosDaConta = totalConsumosJaSalvos + totalConsumosPendentes;
  const saldoHospedagem = reservaSelecionada ? Number(reservaSelecionada.saldo || 0) : 0;

  const totalAcobrar = reservaSelecionada
    ? Number((saldoHospedagem + totalConsumosDaConta).toFixed(2))
    : 0;

  // Soma dos valores informados nas linhas de pagamento
  const totalInformado = useMemo(() => {
    return Number(linhasPagamento.reduce((acc, l) => acc + (Number(l.valor) || 0), 0).toFixed(2));
  }, [linhasPagamento]);

  // Saldo restante devido
  const saldoRestante = useMemo(() => {
    return Number((totalAcobrar - totalInformado).toFixed(2));
  }, [totalAcobrar, totalInformado]);

  // Ao selecionar uma reserva, inicializa com o cenário 1 (Juntar tudo para facilitar)
  useEffect(() => {
    if (reservaSelecionada) {
      cenarioJuntarTudo(reservaSelecionada, totalConsumosDaConta);
    } else {
      setLinhasPagamento([]);
    }
  }, [reservaSelecionada?.reservaid]);

  // ================= CENÁRIOS RÁPIDOS ================= //

  // CENÁRIO 1: Juntar saldo da hospedagem e consumos em uma única cobrança
  const cenarioJuntarTudo = (reserva: Reserva, consumos: number) => {
    const total = Number((Number(reserva.saldo || 0) + consumos).toFixed(2));
    setLinhasPagamento([
      {
        id: `pag-total-${Date.now()}`,
        descricao: 'Conta Total (Hospedagem + Consumos)',
        valor: total,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'SALDO_RESERVA',
      },
    ]);
  };

  // CENÁRIO 2: Separar Hospedagem de um lado e Consumos do outro
  const cenarioSepararConta = () => {
    if (!reservaSelecionada) return;
    const novasLinhas: LinhaPagamento[] = [];

    if (saldoHospedagem > 0) {
      novasLinhas.push({
        id: `pag-hosp-${Date.now()}-1`,
        descricao: 'Saldo Restante da Hospedagem',
        valor: saldoHospedagem,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'SALDO_RESERVA',
      });
    }

    if (totalConsumosDaConta > 0) {
      novasLinhas.push({
        id: `pag-cons-${Date.now()}-2`,
        descricao: 'Consumos do Bar e Lojinha',
        valor: totalConsumosDaConta,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'CONSUMO_EXTRA',
      });
    }

    if (novasLinhas.length === 0) {
      novasLinhas.push({
        id: `pag-vazio-${Date.now()}`,
        descricao: 'Quitação da Conta',
        valor: 0,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'SALDO_RESERVA',
      });
    }

    setLinhasPagamento(novasLinhas);
  };

  // CENÁRIO 3: Divisão entre hóspedes por valor específico ou total
  const handleAplicarDivisao = () => {
    if (!reservaSelecionada || qtdPessoasDivisao < 1) return;

    let valorTotal = 0;
    let descPrefixo = '';
    let tipoLanc: 'SALDO_RESERVA' | 'CONSUMO_EXTRA' = 'SALDO_RESERVA';

    if (tipoAlvoDivisao === 'TUDO') {
      valorTotal = totalAcobrar;
      descPrefixo = 'Hóspede';
      tipoLanc = 'SALDO_RESERVA';
    } else if (tipoAlvoDivisao === 'HOSPEDAGEM') {
      valorTotal = saldoHospedagem;
      descPrefixo = 'Hospedagem - Hóspede';
      tipoLanc = 'SALDO_RESERVA';
    } else {
      valorTotal = totalConsumosDaConta;
      descPrefixo = 'Bar/Lojinha - Hóspede';
      tipoLanc = 'CONSUMO_EXTRA';
    }

    if (valorTotal <= 0) {
      setFeedbackErro('Não há valor a ser dividido para a opção escolhida.');
      setModalDividirAberta(false);
      return;
    }

    const valorBase = Math.floor((valorTotal / qtdPessoasDivisao) * 100) / 100;
    const resto = Number((valorTotal - valorBase * qtdPessoasDivisao).toFixed(2));

    const linhasGeradas: LinhaPagamento[] = [];
    for (let i = 1; i <= qtdPessoasDivisao; i++) {
      const valorLinha = i === qtdPessoasDivisao ? Number((valorBase + resto).toFixed(2)) : valorBase;
      linhasGeradas.push({
        id: `pag-div-${Date.now()}-${i}`,
        descricao: `${descPrefixo} ${i}`,
        valor: valorLinha,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: tipoLanc,
      });
    }

    // Se dividiu apenas uma parte, mantém a outra parte intacta para não sumir do total
    if (tipoAlvoDivisao === 'HOSPEDAGEM' && totalConsumosDaConta > 0) {
      linhasGeradas.push({
        id: `pag-cons-restante-${Date.now()}`,
        descricao: 'Consumos Bar/Lojinha (Total)',
        valor: totalConsumosDaConta,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'CONSUMO_EXTRA',
      });
    } else if (tipoAlvoDivisao === 'CONSUMOS' && saldoHospedagem > 0) {
      linhasGeradas.unshift({
        id: `pag-hosp-restante-${Date.now()}`,
        descricao: 'Saldo Hospedagem (Total)',
        valor: saldoHospedagem,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'SALDO_RESERVA',
      });
    }

    setLinhasPagamento(linhasGeradas);
    setModalDividirAberta(false);
  };

  // ================= MANIPULAÇÃO DE LINHAS ================= //

  const handleAdicionarLinha = () => {
    const restante = Math.max(0, saldoRestante);
    setLinhasPagamento((prev) => [
      ...prev,
      {
        id: `pag-add-${Date.now()}`,
        descricao: `Pagador ${prev.length + 1}`,
        valor: restante,
        formaPagamento: 'PIX',
        parcelas: 1,
        tipoLancamento: 'SALDO_RESERVA',
      },
    ]);
  };

  const handleRemoverLinha = (id: string) => {
    if (linhasPagamento.length <= 1) {
      setFeedbackErro('Mantenha ao menos uma forma de pagamento.');
      setTimeout(() => setFeedbackErro(null), 3000);
      return;
    }
    setLinhasPagamento((prev) => prev.filter((l) => l.id !== id));
  };

  const handleAtualizarLinha = (id: string, campo: keyof LinhaPagamento, valor: any) => {
    setLinhasPagamento((prev) =>
      prev.map((linha) => {
        if (linha.id !== id) return linha;
        const atualizada = { ...linha, [campo]: valor };
        if (campo === 'formaPagamento' && valor !== 'CARTAO_CREDITO') {
          atualizada.parcelas = 1;
        }
        return atualizada;
      })
    );
  };

  // ================= EFETIVAÇÃO DO CHECKOUT ================= //

  const handleProcessarCheckout = async (eLiquidacaoTotal: boolean) => {
    if (!reservaSelecionada) return;
    setFeedbackErro(null);

    if (linhasPagamento.length === 0) {
      setFeedbackErro('Adicione ao menos uma forma de pagamento.');
      return;
    }

    const existeInvalido = linhasPagamento.some((l) => Number(l.valor) <= 0);
    if (existeInvalido) {
      setFeedbackErro('Todos os lançamentos devem ter valor superior a R$ 0,00.');
      return;
    }

    if (totalInformado > totalAcobrar + 0.01) {
      setFeedbackErro(
        `O total informado (${formatarMoeda(totalInformado)}) ultrapassa o valor da conta (${formatarMoeda(totalAcobrar)}).`
      );
      return;
    }

    if (eLiquidacaoTotal && Math.abs(saldoRestante) > 0.01) {
      setFeedbackErro(
        `Para finalizar o check-out e liberar o quarto, o valor total deve bater exatamente com a conta. Faltam ${formatarMoeda(saldoRestante)}.`
      );
      return;
    }

    setProcessandoCheckout(true);

    try {
      // 1. Salva consumos novos no banco se houver
      if (consumosPendentes.length > 0) {
        setSalvandoConsumo(true);
        const resConsumos = await salvarConsumosPendentes(reservaSelecionada);
        setSalvandoConsumo(false);
        if (!resConsumos.sucesso) {
          setFeedbackErro(resConsumos.mensagem);
          setProcessandoCheckout(false);
          return;
        }
      }

      const cliente = obterClienteSupabase();
      const agora = new Date().toISOString();

      if (eLiquidacaoTotal) {
        // LIQUIDAÇÃO TOTAL: Libera quarto e marca CONCLUIDA
        const pagamentosParaSalvar = linhasPagamento.map((l) => ({
          valor: Number(l.valor),
          formapagamento: l.formaPagamento,
          tipolancamento: l.tipoLancamento,
        }));

        const res = await realizarCheckout(reservaSelecionada.reservaid, pagamentosParaSalvar);

        if (res.sucesso) {
          setFeedbackSucesso(res.mensagem);
          setComprovanteCheckout({
            reserva: reservaSelecionada,
            consumoExtra: totalConsumosDaConta,
            totalPago: totalAcobrar,
            pagamentoParcial: false,
          });
          setReservaSelecionada(null);
          setLinhasPagamento([]);
          setConsumosPendentes([]);
          setTimeout(() => setFeedbackSucesso(null), 4000);
        } else {
          setFeedbackErro(res.mensagem);
        }
      } else {
        // PAGAMENTO PARCIAL: Abate saldo mas mantém o quarto ocupado
        if (!cliente) {
          setFeedbackErro('Supabase não conectado.');
          setProcessandoCheckout(false);
          return;
        }

        const registrosPagamento = linhasPagamento.map((l) => ({
          reservaid: reservaSelecionada.reservaid,
          valor: Number(l.valor),
          formapagamento: l.formaPagamento,
          tipolancamento: l.tipoLancamento,
          status: 'PAGO',
          datapagamento: agora,
          ativo: true,
          usuarioinclusao: usuarioAtual?.usuarioid,
          datainclusao: agora,
          usuariooperacao: usuarioAtual?.usuarioid,
          dataoperacao: agora,
          naturezaoperacao: 'INSERT',
        }));

        const { error: erroInsert } = await cliente.from('pagamento').insert(registrosPagamento);
        if (erroInsert) {
          setFeedbackErro(`Erro ao gravar pagamentos: ${erroInsert.message}`);
          setProcessandoCheckout(false);
          return;
        }

        const novoValorPago = Number((Number(reservaSelecionada.valorpago || 0) + totalInformado).toFixed(2));
        const novoSaldo = Number(Math.max(0, Number(reservaSelecionada.saldo || 0) - totalInformado).toFixed(2));

        const { error: erroUpdate } = await cliente
          .from('reserva')
          .update({
            valorpago: novoValorPago,
            saldo: novoSaldo,
            statuspagamento: 'PARCIAL',
            dataoperacao: agora,
            naturezaoperacao: 'UPDATE',
          })
          .eq('reservaid', reservaSelecionada.reservaid);

        if (erroUpdate) {
          setFeedbackErro(`Erro ao atualizar saldo: ${erroUpdate.message}`);
        } else {
          setFeedbackSucesso(`Pagamento de ${formatarMoeda(totalInformado)} registrado! Saldo restante: ${formatarMoeda(novoSaldo)}`);
          await recarregarDados();

          const reservaAtualizada = {
            ...reservaSelecionada,
            valorpago: novoValorPago,
            saldo: novoSaldo,
            statuspagamento: 'PARCIAL' as const,
          };
          setReservaSelecionada(reservaAtualizada);
          cenarioJuntarTudo(reservaAtualizada, totalConsumosDaConta);

          setTimeout(() => setFeedbackSucesso(null), 4000);
        }
      }
    } catch (err: any) {
      setFeedbackErro(`Erro ao processar: ${err.message}`);
    } finally {
      setProcessandoCheckout(false);
    }
  };

  // ================= MODAL DE CONSUMOS EXTRAS ================= //

  const produtoSelecionado = produtos.find((produto) => String(produto.produtoid) === produtoSelecionadoId);

  const abrirModalConsumo = () => {
    setProdutoSelecionadoId('');
    setQuantidadeConsumo(1);
    setModalConsumoAberta(true);
  };

  const adicionarConsumoPendente = () => {
    const quantidadePendente = consumosPendentes
      .filter((consumo) => consumo.produtoId === String(produtoSelecionado?.produtoid))
      .reduce((total, consumo) => total + consumo.quantidade, 0);

    if (!produtoSelecionado) {
      setFeedbackErro('Selecione um produto válido.');
      return;
    }
    if (quantidadeConsumo <= 0) {
      setFeedbackErro('A quantidade deve ser maior que zero.');
      return;
    }
    if (quantidadePendente + quantidadeConsumo > produtoSelecionado.estoque) {
      setFeedbackErro(`Estoque insuficiente. Disponível: ${produtoSelecionado.estoque}`);
      return;
    }

    setConsumosPendentes((atuais) => [
      ...atuais,
      {
        produtoId: String(produtoSelecionado.produtoid),
        quantidade: quantidadeConsumo,
      },
    ]);
    setProdutoSelecionadoId('');
    setQuantidadeConsumo(1);
    setFeedbackErro(null);
  };

  const removerConsumoPendente = (indice: number) => {
    setConsumosPendentes((atuais) => atuais.filter((_, posicao) => posicao !== indice));
  };

  const salvarConsumosPendentes = async (reserva: Reserva): Promise<{ sucesso: boolean; mensagem: string }> => {
    let mensagemErro = '';
    try {
      for (const consumo of consumosPendentes) {
        const produto = produtos.find((item) => String(item.produtoid) === consumo.produtoId);
        if (!produto) {
          mensagemErro = `Produto não encontrado: ${consumo.produtoId}`;
          break;
        }

        const valorUnitario = Number(produto.preco) || 0;
        const quantidade = Number(consumo.quantidade) || 0;
        const valorTotal = valorUnitario * quantidade;

        const resultado = await criarConsumoExtra({
          reservaid: reserva.reservaid,
          produtoid: produto.produtoid,
          quantidade,
          valorunitario: valorUnitario,
          valortotal: valorTotal,
          dataconsumo: new Date().toISOString(),
          categoria: produto.categoria,
          descricao: produto.nome,
        });

        if (!resultado.sucesso) {
          mensagemErro = `Erro ao salvar "${produto.nome}": ${resultado.mensagem}`;
          break;
        }
      }
    } catch (error: any) {
      mensagemErro = error?.message || 'Falha ao gravar consumos.';
    }

    if (mensagemErro) return { sucesso: false, mensagem: mensagemErro };
    setConsumosPendentes([]);
    return { sucesso: true, mensagem: 'Consumos adicionados com sucesso.' };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Balcão de Check-out & Acerto de Contas
            </h1>
            <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2.5 py-0.5 rounded-full border border-[#f1a9a3]">
              {reservasHospedadas.length} Hóspedes Presentes
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Conferência de consumos (Bar e Lojinha), divisão flexível de pagamentos e liberação imediata de quartos.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-[#717971]">Operador:</span>
          <p className="text-xs font-bold text-[#053d1e]">{usuarioAtual?.nome || 'Operador'}</p>
        </div>
      </div>

      {feedbackSucesso && (
        <div role="status" className="bg-[#e6f4ea] text-[#053d1e] px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border border-[#b8f0c2] shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedbackSucesso}</span>
        </div>
      )}

      {feedbackErro && (
        <div role="alert" className="bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border border-[#f1a9a3] shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{feedbackErro}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Lista de Quartos Ocupados */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#717971] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por hóspede, número do quarto ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl focus:outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {reservasFiltradas.length === 0 ? (
              <div className="bg-white border border-[#c1c9bf] rounded-2xl p-8 text-center text-xs text-[#717971]">
                <LogOut className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2 opacity-40" />
                <p className="font-semibold text-sm text-[#191c1d]">Nenhum quarto ocupado no momento.</p>
              </div>
            ) : (
              reservasFiltradas.map((res) => {
                const ehHoje = res.datasaida === dataSistema;
                const selecionado = reservaSelecionada?.reservaid === res.reservaid;

                return (
                  <div
                    key={res.reservaid}
                    onClick={() => {
                      setReservaSelecionada(res);
                      setConsumosPendentes([]);
                      setFeedbackErro(null);
                    }}
                    className={`bg-white border rounded-2xl p-4 transition-all cursor-pointer ${
                      selecionado
                        ? 'border-2 border-[#053d1e] bg-[#e6f4ea]/30 ring-2 ring-[#053d1e]/20 shadow-md'
                        : 'border-[#c1c9bf] hover:border-[#053d1e] hover:shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e1e3e4]">
                      <div className="flex items-center gap-2">
                        <span className="font-['Manrope'] text-base font-bold text-[#191c1d]">{res.hospedenome}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#e6f4ea] text-[#053d1e] border border-[#b8f0c2]">
                          {res.codigo}
                        </span>
                      </div>
                      {ehHoje ? (
                        <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2.5 py-0.5 rounded-full border border-[#f1a9a3] w-fit">
                          Saída Prevista para Hoje
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[#414941] bg-[#f3f4f5] px-2.5 py-0.5 rounded-full w-fit">
                          Saída em {formatarData(res.datasaida)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-[#414941]">
                      <div>
                        <span className="text-[#717971] text-[10px] block">Acomodação:</span>
                        <span className="font-bold text-[#053d1e]">Quarto {res.quartocodigo}</span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Período:</span>
                        <span className="font-medium text-[#191c1d]">{formatarData(res.dataentrada)} à {formatarData(res.datasaida)}</span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Total Diárias:</span>
                        <span className="font-medium text-[#191c1d]">{formatarMoeda(res.valortotal)}</span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Saldo Pendente:</span>
                        <span className={`font-bold ${res.saldo > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}`}>
                          {formatarMoeda(res.saldo)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Painel Interativo de Liquidação e Divisão */}
        <div className="lg:col-span-5">
          {reservaSelecionada ? (
            <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-md space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-[#e1e3e4]">
                <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#053d1e]" />
                  Fechamento de Conta
                </h3>
                <span className="text-xs font-extrabold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
                  Q{reservaSelecionada.quartonumero}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] space-y-1 text-xs">
                <p className="font-bold text-sm text-[#191c1d]">{reservaSelecionada.hospedenome}</p>
                <p className="text-[#053d1e] font-semibold">Acomodação {reservaSelecionada.quartonumero} • {reservaSelecionada.quartocategoria}</p>
              </div>

              {/* Botão para lançar consumos extras */}
              <button
                type="button"
                onClick={abrirModalConsumo}
                className="w-full py-2 border border-[#053d1e] text-[#053d1e] hover:bg-[#e6f4ea] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Consumo Extra (Bar / Lojinha)
              </button>

              {/* Lista dos consumos da conta */}
              {(consumosDaReserva.length > 0 || consumosPendentes.length > 0) && (
                <div className="border border-[#c1c9bf] rounded-xl p-3 space-y-2 text-xs bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717971] block">
                    Consumos da Conta:
                  </span>
                  {consumosDaReserva.map((consumo) => (
                    <div key={`salvo-${consumo.consumoid}`} className="flex justify-between gap-2 p-2 rounded-lg bg-[#f8f9fa]">
                      <span className="truncate">{consumo.quantidade}x {consumo.produtonome || produtos.find((p) => String(p.produtoid) === String(consumo.produtoid))?.nome || consumo.descricao}</span>
                      <span className="font-semibold shrink-0">{formatarMoeda(consumo.valortotal)}</span>
                    </div>
                  ))}
                  {consumosPendentes.map((consumo, indice) => {
                    const produto = produtos.find((item) => String(item.produtoid) === consumo.produtoId);
                    return (
                      <div key={`pendente-${consumo.produtoId}-${indice}`} className="flex justify-between gap-2 p-2 rounded-lg bg-[#fff8e1] border border-[#ffe088]">
                        <span className="truncate">{consumo.quantidade}x {produto?.nome} <small className="text-amber-800 font-semibold">(novo)</small></span>
                        <span className="flex items-center gap-2 font-semibold shrink-0">
                          {formatarMoeda((produto?.preco || 0) * consumo.quantidade)}
                          <button type="button" onClick={() => removerConsumoPendente(indice)} className="text-[#ba1a1a] hover:text-rose-900 cursor-pointer" title="Remover">
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between font-bold text-[#191c1d] pt-2 border-t border-[#e1e3e4]">
                    <span>Total de Consumos:</span>
                    <span>{formatarMoeda(totalConsumosDaConta)}</span>
                  </div>
                </div>
              )}

              {/* Demonstrativo Resumido */}
              <div className="border border-[#c1c9bf] rounded-xl p-3.5 space-y-2 text-xs bg-[#f8f9fa]">
                <div className="flex justify-between text-[#414941]">
                  <span>Saldo da Hospedagem (50% ou restante):</span>
                  <span className="font-semibold">{formatarMoeda(saldoHospedagem)}</span>
                </div>
                {totalConsumosDaConta > 0 && (
                  <div className="flex justify-between text-[#414941]">
                    <span>Consumos Extras (Bar e Lojinha):</span>
                    <span className="font-semibold">{formatarMoeda(totalConsumosDaConta)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold pt-2 border-t border-[#c1c9bf]">
                  <span className="text-[#191c1d]">Total a Pagar:</span>
                  <span className="text-[#053d1e]">{formatarMoeda(totalAcobrar)}</span>
                </div>
              </div>

              {/* SELETORES DE CENÁRIO PRONTO */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
                  <Split className="w-4 h-4 text-[#053d1e]" /> Como o cliente vai pagar?
                </span>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Cenário 1 */}
                  <button
                    type="button"
                    onClick={() => cenarioJuntarTudo(reservaSelecionada, totalConsumosDaConta)}
                    className="p-2 rounded-xl border border-[#c1c9bf] bg-white text-[11px] font-bold text-[#191c1d] hover:bg-[#e6f4ea] hover:border-[#053d1e] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center"
                    title="Junta hospedagem e bar/lojinha para pagar tudo de uma vez ou em até 3x no cartão"
                  >
                    <DollarSign className="w-4 h-4 text-[#053d1e]" />
                    <span>Juntar Tudo</span>
                  </button>

                  {/* Cenário 2 */}
                  <button
                    type="button"
                    onClick={cenarioSepararConta}
                    className="p-2 rounded-xl border border-[#c1c9bf] bg-white text-[11px] font-bold text-[#191c1d] hover:bg-[#e6f4ea] hover:border-[#053d1e] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center"
                    title="Separa o saldo da hospedagem do valor do bar/lojinha para pagar de formas diferentes"
                  >
                    <Layers className="w-4 h-4 text-[#053d1e]" />
                    <span>Pagar Separado</span>
                  </button>

                  {/* Cenário 3 */}
                  <button
                    type="button"
                    onClick={() => setModalDividirAberta(true)}
                    className="p-2 rounded-xl border border-[#c1c9bf] bg-white text-[11px] font-bold text-[#191c1d] hover:bg-[#e6f4ea] hover:border-[#053d1e] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center"
                    title="Divide a conta entre 2, 3 ou mais hóspedes"
                  >
                    <Users className="w-4 h-4 text-[#053d1e]" />
                    <span>Dividir Hóspedes</span>
                  </button>
                </div>
              </div>

              {/* LISTA DINÂMICA DE PAGAMENTOS COM PARCELAMENTO EM ATÉ 3X */}
              <div className="space-y-3 border-t border-[#e1e3e4] pt-3">
                {linhasPagamento.map((linha, index) => {
                  const valorLinha = Number(linha.valor) || 0;
                  const eCredito = linha.formaPagamento === 'CARTAO_CREDITO';
                  const valorParcela = eCredito && linha.parcelas > 1 ? valorLinha / linha.parcelas : valorLinha;

                  return (
                    <div key={linha.id} className="p-3.5 border border-[#c1c9bf] rounded-xl bg-white space-y-2.5 shadow-xs relative">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={linha.descricao}
                          onChange={(e) => handleAtualizarLinha(linha.id, 'descricao', e.target.value)}
                          placeholder={`Descrição (ex: Hóspede ${index + 1})`}
                          className="font-bold text-xs text-[#191c1d] bg-transparent border-b border-transparent hover:border-[#c1c9bf] focus:border-[#053d1e] focus:outline-none flex-1"
                        />

                        {linhasPagamento.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverLinha(linha.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            title="Remover pagamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Campo de Valor */}
                        <div>
                          <label className="block text-[10px] font-bold text-[#717971] mb-1">
                            Valor a Pagar (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={linha.valor || ''}
                            onChange={(e) => handleAtualizarLinha(linha.id, 'valor', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 border border-[#c1c9bf] rounded-lg text-xs font-bold text-[#053d1e] bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
                          />
                        </div>

                        {/* Forma de Pagamento */}
                        <div>
                          <label className="block text-[10px] font-bold text-[#717971] mb-1">
                            Forma de Pagamento
                          </label>
                          <select
                            value={linha.formaPagamento}
                            onChange={(e) => handleAtualizarLinha(linha.id, 'formaPagamento', e.target.value as FormaPagamento)}
                            className="w-full px-2.5 py-1.5 border border-[#c1c9bf] rounded-lg text-xs font-semibold bg-[#f8f9fa] focus:outline-none focus:border-[#053d1e]"
                          >
                            <option value="PIX">PIX</option>
                            <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                            <option value="CARTAO_DEBITO">Cartão de Débito</option>
                            <option value="DINHEIRO">Dinheiro em Espécie</option>
                            <option value="TRANSFERENCIA">Transferência / TED</option>
                          </select>
                        </div>
                      </div>

                      {/* Seletor de Parcelas em até 3x no Cartão de Crédito */}
                      {eCredito && (
                        <div className="flex items-center justify-between pt-1 text-xs bg-emerald-50/50 p-2 rounded-lg border border-emerald-200">
                          <span className="font-semibold text-emerald-900 flex items-center gap-1 text-[11px]">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-700" /> Parcelas do Cartão:
                          </span>
                          <select
                            value={linha.parcelas || 1}
                            onChange={(e) => handleAtualizarLinha(linha.id, 'parcelas', Number(e.target.value))}
                            className="px-2 py-1 border border-emerald-300 rounded text-xs font-bold text-[#053d1e] bg-white"
                          >
                            <option value={1}>1x de {formatarMoeda(valorLinha)} (à vista)</option>
                            <option value={2}>2x de {formatarMoeda(valorParcela)}</option>
                            <option value={3}>3x de {formatarMoeda(valorParcela)}</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAdicionarLinha}
                  className="w-full py-2 border border-dashed border-[#053d1e] text-[#053d1e] hover:bg-[#e6f4ea] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  + Adicionar Outro Pagamento Manual
                </button>
              </div>

              {/* DEMONSTRATIVO EM TEMPO REAL: TOTAL VS PAGO VS RESTANTE */}
              <div className="p-3.5 rounded-xl border bg-[#f8f9fa] space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#414941]">
                  <span>Total da Conta:</span>
                  <span className="font-bold text-[#191c1d]">{formatarMoeda(totalAcobrar)}</span>
                </div>
                <div className="flex justify-between items-center text-[#414941]">
                  <span>Total Informado nos Pagamentos:</span>
                  <span className="font-bold text-[#053d1e]">{formatarMoeda(totalInformado)}</span>
                </div>

                <div className="pt-2 border-t border-[#c1c9bf] flex justify-between items-center text-sm font-extrabold">
                  {saldoRestante > 0.01 ? (
                    <>
                      <span className="text-amber-800">Saldo Restante a Pagar:</span>
                      <span className="text-amber-800">{formatarMoeda(saldoRestante)}</span>
                    </>
                  ) : saldoRestante < -0.01 ? (
                    <>
                      <span className="text-rose-700">Troco / Valor a Maior:</span>
                      <span className="text-rose-700">{formatarMoeda(Math.abs(saldoRestante))}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-800">Conta Equilibrada!</span>
                      <span className="text-emerald-800">R$ 0,00</span>
                    </>
                  )}
                </div>
              </div>

              {/* AÇÃO FINAL: QUITAR OU PARCIAL */}
              <div className="space-y-2 pt-2">
                {Math.abs(saldoRestante) <= 0.01 ? (
                  <button
                    type="button"
                    onClick={() => handleProcessarCheckout(true)}
                    disabled={processandoCheckout}
                    className="w-full py-3.5 bg-[#166534] hover:bg-[#14532d] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {processandoCheckout ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    <span>Liquidar Conta & Liberar Quarto</span>
                  </button>
                ) : totalInformado > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleProcessarCheckout(false)}
                    disabled={processandoCheckout || saldoRestante < -0.01}
                    className="w-full py-3.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {processandoCheckout ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Clock className="w-5 h-5" />}
                    <span>Registrar Pagamento Parcial ({formatarMoeda(totalInformado)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 bg-slate-200 text-slate-500 rounded-xl font-bold text-xs cursor-not-allowed"
                  >
                    Informe os Valores para Continuar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#f8f9fa] border border-dashed border-[#c1c9bf] rounded-2xl p-8 text-center text-xs text-[#717971]">
              <Receipt className="w-10 h-10 mx-auto text-[#c1c9bf] mb-2 opacity-40" />
              <p className="font-semibold text-sm text-[#191c1d]">Selecione um quarto ocupado</p>
              <p className="mt-1">Clique no card do hóspede na lista ao lado para iniciar o acerto de contas.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL INTELIGENTE DE DIVISÃO ENTRE HÓSPEDES */}
      {modalDividirAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e1e3e4] pb-3">
              <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#053d1e]" />
                Dividir Conta em Hóspedes
              </h3>
              <button type="button" onClick={() => setModalDividirAberta(false)} className="p-1 text-[#414941] hover:bg-[#f3f4f5] rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#414941]">O que deseja dividir?</label>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTipoAlvoDivisao('TUDO')}
                  className={`p-2 rounded-lg font-bold border transition-colors ${
                    tipoAlvoDivisao === 'TUDO' ? 'bg-[#053d1e] text-white border-[#053d1e]' : 'border-[#c1c9bf] bg-[#f8f9fa] text-[#191c1d]'
                  }`}
                >
                  Tudo Junto
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAlvoDivisao('HOSPEDAGEM')}
                  className={`p-2 rounded-lg font-bold border transition-colors ${
                    tipoAlvoDivisao === 'HOSPEDAGEM' ? 'bg-[#053d1e] text-white border-[#053d1e]' : 'border-[#c1c9bf] bg-[#f8f9fa] text-[#191c1d]'
                  }`}
                >
                  Só Diárias
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAlvoDivisao('CONSUMOS')}
                  className={`p-2 rounded-lg font-bold border transition-colors ${
                    tipoAlvoDivisao === 'CONSUMOS' ? 'bg-[#053d1e] text-white border-[#053d1e]' : 'border-[#c1c9bf] bg-[#f8f9fa] text-[#191c1d]'
                  }`}
                >
                  Só Bar/Loja
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#414941]">Quantidade de pessoas:</label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQtdPessoasDivisao(num)}
                    className={`py-2.5 rounded-xl font-extrabold text-xs border transition-colors ${
                      qtdPessoasDivisao === num
                        ? 'bg-[#053d1e] text-white border-[#053d1e]'
                        : 'border-[#c1c9bf] bg-[#f8f9fa] text-[#191c1d] hover:bg-[#e6f4ea]'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4] text-xs space-y-1">
              <div className="flex justify-between">
                <span>Valor por pessoa:</span>
                <strong className="text-[#053d1e]">
                  {formatarMoeda(
                    (tipoAlvoDivisao === 'TUDO'
                      ? totalAcobrar
                      : tipoAlvoDivisao === 'HOSPEDAGEM'
                      ? saldoHospedagem
                      : totalConsumosDaConta) / qtdPessoasDivisao
                  )}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e1e3e4] pt-3">
              <button
                type="button"
                onClick={() => setModalDividirAberta(false)}
                className="px-4 py-2 border border-[#c1c9bf] text-[#414941] hover:bg-[#f3f4f5] rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAplicarDivisao}
                className="px-4 py-2 bg-[#053d1e] text-white hover:bg-[#043017] rounded-xl text-xs font-bold cursor-pointer"
              >
                Aplicar Divisão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consumo Extra */}
      {modalConsumoAberta && reservaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <form onSubmit={(event) => { event.preventDefault(); adicionarConsumoPendente(); }} className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e1e3e4] pb-3">
              <div>
                <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-[#053d1e]" />
                  Adicionar Consumo Extra
                </h3>
                <p className="text-xs text-[#717971] mt-1">{reservaSelecionada.hospedenome} • Quarto {reservaSelecionada.quartonumero}</p>
              </div>
              <button type="button" onClick={() => setModalConsumoAberta(false)} disabled={salvandoConsumo} className="p-1 text-[#414941] hover:bg-[#f3f4f5] rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label htmlFor="produto-consumo" className="block font-semibold text-[#414941]">Produto</label>
              <select
                id="produto-consumo"
                required
                value={produtoSelecionadoId}
                onChange={(event) => setProdutoSelecionadoId(event.target.value)}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] font-semibold text-xs focus:outline-none focus:border-[#053d1e]"
              >
                <option value="">Selecione um produto</option>
                {produtos.filter((produto) => produto.ativo && produto.estoque > 0).map((produto) => (
                  <option key={produto.produtoid} value={String(produto.produtoid)}>
                    {produto.nome} • {formatarMoeda(produto.preco)} • Estoque: {produto.estoque}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label htmlFor="quantidade-consumo" className="block font-semibold text-[#414941]">Quantidade</label>
              <input
                id="quantidade-consumo"
                required
                min={1}
                max={produtoSelecionado?.estoque}
                type="number"
                value={quantidadeConsumo}
                onChange={(event) => setQuantidadeConsumo(Math.max(1, Number(event.target.value)))}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-xl bg-[#f8f9fa] font-bold text-xs focus:outline-none focus:border-[#053d1e]"
              />
            </div>

            {produtoSelecionado && (
              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] text-xs space-y-1">
                <div className="flex justify-between"><span>Valor unitário:</span><strong>{formatarMoeda(produtoSelecionado.preco)}</strong></div>
                <div className="flex justify-between text-[#053d1e]"><span>Total do consumo:</span><strong>{formatarMoeda(produtoSelecionado.preco * quantidadeConsumo)}</strong></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalConsumoAberta(false)}
                disabled={salvandoConsumo}
                className="py-2.5 border border-[#c1c9bf] text-[#414941] hover:bg-[#f3f4f5] disabled:opacity-60 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={adicionarConsumoPendente}
                disabled={salvandoConsumo || !produtoSelecionado}
                className="py-2.5 border border-[#053d1e] text-[#053d1e] hover:bg-[#e6f4ea] disabled:opacity-60 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="border-t border-[#e1e3e4] pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#191c1d]">
                <span>Produtos nesta conta ({consumosPendentes.length})</span>
                <span>{formatarMoeda(totalConsumosPendentes)}</span>
              </div>
              {consumosPendentes.length === 0 ? (
                <p className="text-xs text-[#717971]">Selecione um produto para adicionar à conta.</p>
              ) : (
                consumosPendentes.map((consumo, indice) => {
                  const produto = produtos.find((item) => String(item.produtoid) === consumo.produtoId);
                  return (
                    <div key={`${consumo.produtoId}-${indice}`} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#f8f9fa] text-xs">
                      <span>{consumo.quantidade}x {produto?.nome}</span>
                      <span className="flex items-center gap-2 font-semibold">
                        {formatarMoeda((produto?.preco || 0) * consumo.quantidade)}
                        <button type="button" onClick={() => removerConsumoPendente(indice)} className="text-[#ba1a1a] cursor-pointer" title="Remover produto">
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </form>
        </div>
      )}

      {salvandoConsumo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs" role="status" aria-live="polite">
          <div className="bg-white rounded-xl px-5 py-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#053d1e]">
            <LoaderCircle className="w-5 h-5 animate-spin" /> Salvando consumo...
          </div>
        </div>
      )}

      {/* Modal de Comprovante de Check-out */}
      {comprovanteCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center pb-3 border-b border-[#e1e3e4]">
              <div className="w-12 h-12 rounded-full bg-[#e6f4ea] text-[#053d1e] flex items-center justify-center mx-auto mb-2 border border-[#b8f0c2]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
                {comprovanteCheckout.pagamentoParcial ? 'Pagamento Parcial Registrado!' : 'Check-out Finalizado!'}
              </h3>
              <p className="text-xs text-[#414941]">Hotel Fazenda Anew • Corguinho/MS</p>
            </div>

            <div className="space-y-2 text-xs p-4 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
              <div className="flex justify-between">
                <span className="text-[#717971]">Hóspede:</span>
                <span className="font-bold text-[#191c1d]">{comprovanteCheckout.reserva.hospedenome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Acomodação:</span>
                <span className="font-bold text-[#053d1e]">Quarto {comprovanteCheckout.reserva.quartonumero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Total Pago:</span>
                <span className="font-bold text-[#137333]">{formatarMoeda(comprovanteCheckout.totalPago)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-[#c1c9bf] hover:bg-[#f3f4f5] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Recibo
              </button>
              <button
                type="button"
                onClick={() => setComprovanteCheckout(null)}
                className="flex-1 py-2.5 bg-[#053d1e] text-white rounded-xl text-xs font-bold hover:bg-[#043017] cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};