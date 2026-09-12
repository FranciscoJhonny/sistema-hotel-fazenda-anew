import { CheckCircle2, Coffee, LoaderCircle, LogOut, Plus, Printer, Receipt, Search, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { FormaPagamento, Reserva } from '../tipos';
import { formatarData, formatarMoeda, sanitizarValorMonetario, converterValorMonetario } from '../utilitarios/formatadores';

type PagamentoCheckout = {
  valor: string;
  formaPagamento: FormaPagamento;
  tipoLancamento: 'SALDO_DIARIAS' | 'CONSUMO_EXTRA';
};

type ConsumoPendente = {
  produtoId: string;
  quantidade: number;
};

export const PaginaCheckout: React.FC = () => {
  const { reservas, produtos, consumosExtras, criarConsumoExtra, dataSistema, realizarCheckout, usuarioAtual } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);
  const [feedbackErro, setFeedbackErro] = useState<string | null>(null);
  const [modalConsumoAberta, setModalConsumoAberta] = useState(false);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadeConsumo, setQuantidadeConsumo] = useState(1);
  const [salvandoConsumo, setSalvandoConsumo] = useState(false);
  const [consumosPendentes, setConsumosPendentes] = useState<ConsumoPendente[]>([]);
  const [modoPagamento, setModoPagamento] = useState<'junto' | 'separado'>('junto');

  const [pagamentosSeparados, setPagamentosSeparados] = useState<PagamentoCheckout[]>([]);
  const [formaPagamentoFinal, setFormaPagamentoFinal] = useState<FormaPagamento>('PIX');
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [comprovanteCheckout, setComprovanteCheckout] = useState<{
    reserva: Reserva;
    consumoExtra: number;
    totalPago: number;
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
    ? consumosExtras.filter((consumo) => String(consumo.reservaid) === String(reservaSelecionada.reservaid))
    : [];

  const totalConsumos = consumosDaReserva.reduce((total, consumo) => total + Number(consumo.valortotal || 0), 0);
  const totalConsumosPendentes = consumosPendentes.reduce((total, consumo) => {
    const produto = produtos.find((item) => String(item.produtoid) === consumo.produtoId);
    return total + (produto?.preco || 0) * consumo.quantidade;
  }, 0);

  const totalAcobrar = reservaSelecionada
    ? reservaSelecionada.saldo + totalConsumos + totalConsumosPendentes
    : 0;

  const totalConsumosDaConta = totalConsumos + totalConsumosPendentes;

  // Efeito para inicializar os pagamentos separados com os valores EXATOS quando a reserva muda
  useEffect(() => {
    if (reservaSelecionada && modoPagamento === 'separado') {
      const pagamentosIniciais: PagamentoCheckout[] = [
        {
          valor: formatarMoeda(reservaSelecionada.saldo),
          formaPagamento: 'PIX',
          tipoLancamento: 'SALDO_DIARIAS'
        }
      ];

      if (totalConsumosDaConta > 0) {
        pagamentosIniciais.push({
          valor: formatarMoeda(totalConsumosDaConta),
          formaPagamento: 'PIX',
          tipoLancamento: 'CONSUMO_EXTRA'
        });
      }
      setPagamentosSeparados(pagamentosIniciais);
    }
  }, [reservaSelecionada, modoPagamento, totalConsumosDaConta]);

  const handleEfetivarCheckout = async (reserva: Reserva) => {
    const pagamentos = modoPagamento === 'junto'
      ? [{ valor: totalAcobrar, formapagamento: formaPagamentoFinal, tipolancamento: 'FECHAMENTO_GERAL' as const }]
      : pagamentosSeparados
        .map((pagamento) => ({
          valor: converterValorMonetario(pagamento.valor),
          formapagamento: pagamento.formaPagamento,
          tipolancamento: pagamento.tipoLancamento,
        }))
        .filter((pagamento) => pagamento.valor > 0);

    const totalInformado = pagamentos.reduce((total, pagamento) => total + pagamento.valor, 0);

    if (modoPagamento === 'separado') {
      const totalDiarias = pagamentos
        .filter((pagamento) => pagamento.tipolancamento === 'SALDO_DIARIAS')
        .reduce((total, pagamento) => total + pagamento.valor, 0);
      const totalExtras = pagamentos
        .filter((pagamento) => pagamento.tipolancamento === 'CONSUMO_EXTRA')
        .reduce((total, pagamento) => total + pagamento.valor, 0);

      // Validação com tolerância de 1 centavo para evitar erros de ponto flutuante do JS
      const diffTotal = Math.abs(totalInformado - totalAcobrar);
      const diffDiarias = Math.abs(totalDiarias - Number(reserva.saldo));
      const diffExtras = Math.abs(totalExtras - totalConsumosDaConta);

      if (diffTotal > 0.01 || diffDiarias > 0.01 || diffExtras > 0.01) {
        setFeedbackErro(`Valores não conferem. Diárias: ${formatarMoeda(reserva.saldo)}, Consumos: ${formatarMoeda(totalConsumosDaConta)}. Total informado: ${formatarMoeda(totalInformado)}`);
        return;
      }
    }

    if (modoPagamento === 'separado' && totalInformado === 0) {
      setFeedbackErro('Informe os valores dos pagamentos separados.');
      return;
    }

    if (consumosPendentes.length > 0) {
      setSalvandoConsumo(true);
      const resultadoConsumos = await salvarConsumosPendentes(reserva);
      setSalvandoConsumo(false);
      if (!resultadoConsumos.sucesso) {
        setFeedbackErro(resultadoConsumos.mensagem);
        return;
      }
    }

    const res = await realizarCheckout(
      reserva.reservaid,
      totalAcobrar > 0 ? pagamentos : []
    );

    if (res.sucesso) {
      setFeedbackSucesso(res.mensagem);
      setComprovanteCheckout({
        reserva,
        consumoExtra: totalConsumosDaConta,
        totalPago: totalAcobrar,
      });
      setReservaSelecionada(null);
      setTimeout(() => setFeedbackSucesso(null), 4000);
      setTimeout(() => setFeedbackErro(null), 5000);
    } else {
      setFeedbackErro(res.mensagem);
      setTimeout(() => setFeedbackErro(null), 5000);
    }
  };

  const atualizarPagamentoSeparado = (indice: number, dados: Partial<PagamentoCheckout>) => {
    setPagamentosSeparados((atuais) =>
      atuais.map((pagamento, posicao) => posicao === indice ? { ...pagamento, ...dados } : pagamento)
    );
  };

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
    if (!produtoSelecionado.preco || produtoSelecionado.preco <= 0) {
      setFeedbackErro(`Produto "${produtoSelecionado.nome}" possui preço inválido.`);
      return;
    }

    setConsumosPendentes((atuais) => [...atuais, {
      produtoId: String(produtoSelecionado.produtoid),
      quantidade: quantidadeConsumo
    }]);
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

        if (valorUnitario <= 0 || quantidade <= 0 || valorTotal <= 0) {
          mensagemErro = `Valores inválidos para "${produto.nome}".`;
          break;
        }

        const resultado = await criarConsumoExtra({
          reservaid: reserva.reservaid,
          produtoid: produto.produtoid,
          quantidade: quantidade,
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
      console.error('Erro detalhado ao salvar consumos:', error);
      mensagemErro = error?.message || 'Não foi possível salvar os consumos.';
    }

    if (mensagemErro) {
      return { sucesso: false, mensagem: mensagemErro };
    }

    setConsumosPendentes([]);
    return { sucesso: true, mensagem: `${consumosPendentes.length} consumo(s) salvo(s) com sucesso.` };
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Balcão de Check-out & Acerto de Contas
            </h1>
            <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2.5 py-0.5 rounded-full">
              {reservasHospedadas.length} Hóspedes Presentes
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Conferência de frigobar, liquidação de débitos e liberação imediata do quarto no mapa.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-[#717971]">Operador:</span>
          <p className="text-xs font-bold text-[#053d1e]">{usuarioAtual?.nome || 'Operador'}</p>
        </div>
      </div>

      {feedbackSucesso && (
        <div className="bg-[#b8f0c2] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#92c89d] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedbackSucesso}</span>
        </div>
      )}
      {feedbackErro && (
        <div className="bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#f1a9a3] shadow-xs">
          <X className="w-5 h-5 shrink-0" />
          <span>{feedbackErro}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Lista de Quartos Ocupados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por hóspede, número do quarto ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {reservasFiltradas.length === 0 ? (
              <div className="bg-white border border-[#c1c9bf] rounded-2xl p-8 text-center text-xs text-[#717971]">
                <LogOut className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2" />
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
                      setModoPagamento('junto'); // Reseta para junto ao trocar de reserva
                    }}
                    className={`bg-white border rounded-2xl p-4 transition-all cursor-pointer ${selecionado
                        ? 'border-2 border-[#ba1a1a] bg-[#ffdad6]/20 ring-2 ring-[#ba1a1a]/20 shadow-md'
                        : 'border-[#c1c9bf] hover:border-[#ba1a1a] hover:shadow-xs'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e1e3e4]">
                      <div className="flex items-center gap-2">
                        <span className="font-['Manrope'] text-base font-bold text-[#191c1d]">{res.hospedenome}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#ffdad6] text-[#93000a]">{res.codigo}</span>
                      </div>
                      {ehHoje ? (
                        <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full w-fit">Saída Prevista para Hoje</span>
                      ) : (
                        <span className="text-xs font-medium text-[#414941] bg-[#f3f4f5] px-2 py-0.5 rounded-full w-fit">Saída em {formatarData(res.datasaida)}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-[#414941]">
                      <div>
                        <span className="text-[#717971] text-[10px] block">Acomodação:</span>
                        <span className="font-bold text-[#053d1e]">Quarto {res.quartonumero}</span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Entrada / Saída:</span>
                        <span className="font-medium text-[#191c1d]">{formatarData(res.dataentrada)} a {formatarData(res.datasaida)}</span>
                      </div>
                      <div>
                        <span className="text-[#717971] text-[10px] block">Diárias Totais:</span>
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

        {/* Coluna 3: Painel de Liquidação e Check-out */}
        <div className="lg:col-span-1">
          {reservaSelecionada ? (
            <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-md space-y-4 sticky top-20">
              <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] pb-2 border-b border-[#e1e3e4] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#ba1a1a]" />
                Fechamento de Conta
              </h3>

              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] space-y-1.5 text-xs">
                <p className="font-bold text-sm text-[#191c1d]">{reservaSelecionada.hospedenome}</p>
                <p className="text-[#053d1e] font-semibold">Quarto {reservaSelecionada.quartonumero} • {reservaSelecionada.quartocategoria}</p>
              </div>

              <button
                type="button"
                onClick={abrirModalConsumo}
                className="w-full py-2.5 border border-[#053d1e] text-[#053d1e] hover:bg-[#e6f4ea] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar Consumo Extra
              </button>

              {(consumosDaReserva.length > 0 || consumosPendentes.length > 0) && (
                <div className="border border-[#c1c9bf] rounded-xl p-3 space-y-2 text-xs">
                  {consumosDaReserva.map((consumo) => (
                    <div key={`salvo-${consumo.consumoid}`} className="flex justify-between gap-2 p-2 rounded-lg bg-[#f8f9fa]">
                      <span>{consumo.quantidade}x {consumo.produtonome || produtos.find((p) => String(p.produtoid) === String(consumo.produtoid))?.nome || consumo.descricao}</span>
                      <span className="font-semibold">{formatarMoeda(consumo.valortotal)}</span>
                    </div>
                  ))}
                  {consumosPendentes.map((consumo, indice) => {
                    const produto = produtos.find((item) => String(item.produtoid) === consumo.produtoId);
                    return (
                      <div key={`pendente-${consumo.produtoId}-${indice}`} className="flex justify-between gap-2 p-2 rounded-lg bg-[#fff8e1] border border-[#ffe088]">
                        <span>{consumo.quantidade}x {produto?.nome} <small>(pendente)</small></span>
                        <span className="flex items-center gap-2 font-semibold">
                          {formatarMoeda((produto?.preco || 0) * consumo.quantidade)}
                          <button type="button" onClick={() => removerConsumoPendente(indice)} className="text-[#ba1a1a] cursor-pointer" title="Remover">
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

              {/* Demonstrativo Financeiro */}
              <div className="border border-[#c1c9bf] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Saldo da Hospedagem:</span>
                  <span className="font-semibold">{formatarMoeda(reservaSelecionada.saldo)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#e1e3e4]">
                  <span>Total Final a Cobrar:</span>
                  <span className={totalAcobrar > 0 ? 'text-[#ba1a1a]' : 'text-[#137333]'}>
                    {formatarMoeda(totalAcobrar)}
                  </span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              {totalAcobrar > 0 && (
                <div className="text-xs space-y-3">
                  <span className="block font-semibold text-[#414941]">Forma de pagamento:</span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModoPagamento('junto')}
                      className={`p-2 rounded-lg border font-semibold transition-colors ${modoPagamento === 'junto' ? 'bg-[#053d1e] text-white border-[#053d1e]' : 'border-[#c1c9bf] hover:bg-[#f8f9fa]'}`}
                    >
                      Pagar tudo junto
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoPagamento('separado')}
                      className={`p-2 rounded-lg border font-semibold transition-colors ${modoPagamento === 'separado' ? 'bg-[#053d1e] text-white border-[#053d1e]' : 'border-[#c1c9bf] hover:bg-[#f8f9fa]'}`}
                    >
                      Pagar separado
                    </button>
                  </div>

                  {modoPagamento === 'junto' ? (
                    <select
                      value={formaPagamentoFinal}
                      onChange={(e) => setFormaPagamentoFinal(e.target.value as FormaPagamento)}
                      className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-semibold"
                    >
                      <option value="PIX">PIX Fazenda Anew</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="DINHEIRO">Dinheiro em Espécie</option>
                    </select>
                  ) : (
                    <div className="space-y-3">
                      {/* Renderização dos blocos de pagamento separado com valores TRAVADOS */}
                      {pagamentosSeparados.map((pagamento, indice) => {
                        const isDiaria = pagamento.tipoLancamento === 'SALDO_DIARIAS';
                        const valorEsperado = isDiaria ? reservaSelecionada.saldo : totalConsumosDaConta;

                        return (
                          <div key={indice} className="p-3 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-[#414941]">
                                {isDiaria ? 'Saldo da Hospedagem' : 'Consumos no Hotel'}
                              </span>
                              <span className="text-sm font-bold text-[#053d1e]">
                                {formatarMoeda(valorEsperado)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {/* Valor travado (somente leitura) para evitar erro de digitação */}
                              <input
                                type="text"
                                readOnly
                                value={formatarMoeda(valorEsperado)}
                                className="w-full p-2 border border-[#e1e3e4] rounded-lg bg-[#e6f4ea] text-xs font-bold text-[#053d1e] cursor-not-allowed"
                              />
                              <select
                                value={pagamento.formaPagamento}
                                onChange={(e) => atualizarPagamentoSeparado(indice, {
                                  formaPagamento: e.target.value as FormaPagamento,
                                  valor: formatarMoeda(valorEsperado) // Garante que o valor continue exato
                                })}
                                className="w-full p-2 border border-[#c1c9bf] rounded-lg bg-white text-xs font-semibold"
                              >
                                <option value="PIX">PIX</option>
                                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                <option value="DINHEIRO">Dinheiro</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      <p className="text-[10px] text-[#717971] text-center">
                        Os valores são calculados automaticamente para evitar divergências no caixa.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleEfetivarCheckout(reservaSelecionada)}
                  className="w-full py-3 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Liquidar Conta & Liberar Quarto
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8f9fa] border border-dashed border-[#c1c9bf] rounded-2xl p-6 text-center text-xs text-[#717971]">
              <Receipt className="w-8 h-8 mx-auto text-[#c1c9bf] mb-2" />
              <p className="font-semibold text-[#191c1d]">Selecione um quarto ocupado</p>
              <p className="mt-1">Clique no card do hóspede para somar eventuais consumos e fechar a conta.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Consumo (Mantida igual, com os botões de Fechar e Adicionar corrigidos) */}
      {modalConsumoAberta && reservaSelecionada && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" role="dialog" aria-modal="true">
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
                className="w-full p-2 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-semibold"
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
                className="w-full p-2 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-bold"
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
              <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">Check-out Finalizado!</h3>
              <p className="text-xs text-[#414941]">Hotel Fazenda Anew • Corguinho/MS</p>
            </div>

            <div className="space-y-2 text-xs p-4 bg-[#f8f9fa] rounded-xl border border-[#e1e3e4]">
              <div className="flex justify-between">
                <span className="text-[#717971]">Hóspede:</span>
                <span className="font-bold text-[#191c1d]">{comprovanteCheckout.reserva.hospedenome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Quarto Desocupado:</span>
                <span className="font-bold text-[#053d1e]">Quarto {comprovanteCheckout.reserva.quartonumero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717971]">Total Quitado:</span>
                <span className="font-bold text-[#137333]">{formatarMoeda(comprovanteCheckout.totalPago)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => window.print()} className="flex-1 py-2 rounded-lg border border-[#c1c9bf] hover:bg-[#f3f4f5] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> Imprimir Recibo
              </button>
              <button onClick={() => setComprovanteCheckout(null)} className="flex-1 py-2 bg-[#053d1e] text-white rounded-lg text-xs font-bold hover:bg-[#225533] cursor-pointer">
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};