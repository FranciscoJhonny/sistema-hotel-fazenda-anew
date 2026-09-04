import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  QrCode,
  Package,
  Search,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { Produto, FormaPagamento } from '../tipos';
import { formatarMoeda } from '../utilitarios/formatadores';

export const PaginaLoja: React.FC = () => {
  const { produtos, registrarVenda } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [carrinho, setCarrinho] = useState<{ produto: Produto; quantidade: number }[]>([]);
  const [nomeCliente, setNomeCliente] = useState<string>('Visitante Balcão');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  const produtosFiltrados = produtos.filter((p) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo);
  });

  const adicionarAoCarrinho = (produto: Produto) => {
    if (produto.estoque <= 0) return;

    setCarrinho((prev) => {
      const existente = prev.find((item) => String(item.produto.produtoid) === String(produto.produtoid));
      if (existente) {
        if (existente.quantidade >= produto.estoque) return prev;
        return prev.map((item) =>
          String(item.produto.produtoid) === String(produto.produtoid)
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const alterarQuantidade = (produtoId: number | string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (String(item.produto.produtoid) === String(produtoId)) {
            const novaQtd = item.quantidade + delta;
            if (novaQtd <= 0) return null;
            if (novaQtd > item.produto.estoque) return item;
            return { ...item, quantidade: novaQtd };
          }
          return item;
        })
        .filter(Boolean) as { produto: Produto; quantidade: number }[]
    );
  };

  const removerDoCarrinho = (produtoId: number | string) => {
    setCarrinho((prev) => prev.filter((item) => String(item.produto.produtoid) !== String(produtoId)));
  };

  const totalCarrinho = carrinho.reduce(
    (acc, curr) => acc + curr.produto.preco * curr.quantidade,
    0
  );

  const handleFinalizarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrinho.length === 0) return;

    const nova = await registrarVenda({
      tipo: 'LOJA',
      hospedenome: nomeCliente,
      itens: carrinho.map((item) => ({
        produtoid: item.produto.produtoid,
        produtonome: item.produto.nome,
        quantidade: item.quantidade,
        precounitario: item.produto.preco,
        subtotal: item.produto.preco * item.quantidade,
      })),
      valortotal: totalCarrinho,
      formapagamento: formaPagamento,
      statuspagamento: 'PAGO',
    });

    setFeedbackSucesso(`Venda ${nova.codigo} registrada com sucesso!`);
    setCarrinho([]);
    setNomeCliente('Visitante Balcão');
    setTimeout(() => setFeedbackSucesso(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Lojinha & Produtos da Fazenda Anew
            </h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              Ponto de Venda (PDV)
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Venda direta de produtos artesanais, doces regionais, mel, suvenires e ingressos day use.
          </p>
        </div>
      </div>

      {feedbackSucesso && (
        <div className="bg-[#b8f0c2] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#92c89d] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedbackSucesso}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Catálogo de Produtos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar produto por nome ou categoria..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {produtosFiltrados.map((prod) => (
              <div
                key={prod.produtoid}
                className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs hover:border-[#053d1e] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-semibold text-[#053d1e] bg-[#e6f4ea] px-1.5 py-0.5 rounded">
                      {prod.categoria}
                    </span>
                    <span className="text-[10px] text-[#717971]">
                      Estoque: <strong className="text-[#191c1d]">{prod.estoque}</strong>
                    </span>
                  </div>
                  <h3 className="font-['Manrope'] font-bold text-xs text-[#191c1d] mt-1">
                    {prod.nome}
                  </h3>
                  <p className="text-[11px] text-[#717971] mt-1 line-clamp-2">
                    {prod.descricao}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#e1e3e4]">
                  <span className="font-bold text-sm text-[#053d1e]">
                    {formatarMoeda(prod.preco)}
                  </span>
                  <button
                    onClick={() => adicionarAoCarrinho(prod)}
                    disabled={prod.estoque <= 0}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${
                      prod.estoque <= 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#053d1e] hover:bg-[#225533] text-white shadow-xs cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 3: Carrinho e PDV */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleFinalizarVenda}
            className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-sm space-y-4 sticky top-20"
          >
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d] pb-2 border-b border-[#e1e3e4] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#053d1e]" />
              Caixa do PDV ({carrinho.reduce((acc, c) => acc + c.quantidade, 0)} itens)
            </h3>

            {/* Lista do Carrinho */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {carrinho.length === 0 ? (
                <p className="text-xs text-[#717971] text-center py-6">
                  Carrinho vazio. Clique em + Adicionar nos produtos ao lado.
                </p>
              ) : (
                carrinho.map((item) => (
                  <div
                    key={item.produto.produtoid}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#f8f9fa] border border-[#e1e3e4] text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-[#191c1d] truncate">{item.produto.nome}</p>
                      <p className="text-[10px] text-[#717971]">
                        {item.quantidade}x {formatarMoeda(item.produto.preco)} ={' '}
                        <strong className="text-[#053d1e]">
                          {formatarMoeda(item.produto.preco * item.quantidade)}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.produto.produtoid, -1)}
                        className="p-1 rounded bg-white border border-[#c1c9bf] text-[#414941] hover:bg-[#e1e3e4] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold">{item.quantidade}</span>
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.produto.produtoid, 1)}
                        className="p-1 rounded bg-white border border-[#c1c9bf] text-[#414941] hover:bg-[#e1e3e4] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerDoCarrinho(item.produto.produtoid)}
                        className="p-1 rounded text-[#ba1a1a] hover:bg-[#ffdad6] ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Identificação do Cliente */}
            <div className="space-y-2 text-xs pt-2 border-t border-[#e1e3e4]">
              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  Hóspede ou Cliente Balcão:
                </label>
                <input
                  type="text"
                  required
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full p-2 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa]"
                  placeholder="Nome do cliente ou Quarto..."
                />
              </div>

              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  Forma de Pagamento:
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                  className="w-full p-2 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-semibold"
                >
                  <option value="PIX">PIX Fazenda Anew</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="DINHEIRO">Dinheiro Espécie</option>
                </select>
              </div>
            </div>

            {/* Total */}
            <div className="pt-2 border-t border-[#c1c9bf] flex justify-between items-baseline">
              <span className="text-xs font-bold text-[#191c1d] uppercase">Total da Venda:</span>
              <span className="font-['Manrope'] text-xl font-extrabold text-[#053d1e]">
                {formatarMoeda(totalCarrinho)}
              </span>
            </div>

            <button
              type="submit"
              disabled={carrinho.length === 0}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all ${
                carrinho.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#053d1e] hover:bg-[#225533] text-white cursor-pointer active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar Venda & Emitir Recibo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
