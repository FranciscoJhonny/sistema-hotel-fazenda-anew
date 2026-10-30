import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CategoriaProduto, Produto } from '../tipos';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';
import {
  formatarMoeda,
  aplicarMascaraMoeda,
  desformatarMoeda,
} from '../utilitarios/formatadores';

// Helper universal para compatibilidade camelCase (.NET) e lowercase (PostgreSQL)
const getVal = (obj: any, campoMin: string, campoCamel: string): any => {
  if (!obj) return undefined;
  return obj[campoMin] !== undefined ? obj[campoMin] : obj[campoCamel];
};

const categorias: { id: CategoriaProduto; label: string }[] = [
  { id: 'LOJINHA', label: 'Lojinha' },
  { id: 'BAR', label: 'Bar' },
];

const produtoInicial = {
  nome: '',
  descricao: '',
  categoria: 'LOJINHA' as CategoriaProduto,
  preco: 0,
  estoque: 0,
};

const ITENS_POR_PAGINA = 10;

export const PaginaProdutos: React.FC = () => {
  const { produtos, criarProduto, editarProduto, excluirProduto } = useHotel();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('TODAS');
  const [modalAberta, setModalAberta] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<any | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<any | null>(null);
  const [formulario, setFormulario] = useState(produtoInicial);
  const [precoTexto, setPrecoTexto] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Estado da paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Normalização da lista de produtos para suportar ambos os formatos (.NET e PostgreSQL)
  const produtosNormalizados = useMemo(() => {
    return (produtos || []).map((p: any) => ({
      ...p,
      produtoid: getVal(p, 'produtoid', 'produtoId'),
      nome: getVal(p, 'nome', 'nome') || '',
      descricao: getVal(p, 'descricao', 'descricao') || '',
      categoria: (getVal(p, 'categoria', 'categoria') as CategoriaProduto) || 'LOJINHA',
      preco: Number(getVal(p, 'preco', 'preco') || 0),
      estoque: Number(getVal(p, 'estoque', 'estoque') || 0),
    }));
  }, [produtos]);

  const filtrados = useMemo(() => {
    return produtosNormalizados.filter(
      (produto) =>
        (categoria === 'TODAS' || produto.categoria === categoria) &&
        produto.nome.toLowerCase().includes(busca.toLowerCase())
    );
  }, [produtosNormalizados, categoria, busca]);

  // Reseta para a página 1 ao filtrar ou buscar
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, categoria]);

  // Cálculos de paginação
  const totalItens = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / ITENS_POR_PAGINA));
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFim = Math.min(indiceInicio + ITENS_POR_PAGINA, totalItens);
  const produtosPaginados = useMemo(() => {
    return filtrados.slice(indiceInicio, indiceFim);
  }, [filtrados, indiceInicio, indiceFim]);

  const abrirNovo = () => {
    setProdutoEditando(null);
    setFormulario(produtoInicial);
    setPrecoTexto('');
    setErro(null);
    setModalAberta(true);
  };

  const abrirEdicao = (produto: any) => {
    setProdutoEditando(produto);
    const preco = Number(getVal(produto, 'preco', 'preco') || 0);
    setFormulario({
      nome: getVal(produto, 'nome', 'nome') || '',
      descricao: getVal(produto, 'descricao', 'descricao') || '',
      categoria: (getVal(produto, 'categoria', 'categoria') as CategoriaProduto) || 'LOJINHA',
      preco: preco,
      estoque: Number(getVal(produto, 'estoque', 'estoque') || 0),
    });
    setPrecoTexto(preco > 0 ? aplicarMascaraMoeda(preco) : '');
    setErro(null);
    setModalAberta(true);
  };

  const handleAlterarPreco = (textoDigitado: string) => {
    const formatado = aplicarMascaraMoeda(textoDigitado);
    const numero = desformatarMoeda(formatado);
    setPrecoTexto(formatado);
    setFormulario((prev) => ({
      ...prev,
      preco: numero,
    }));
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const pId = produtoEditando ? getVal(produtoEditando, 'produtoid', 'produtoId') : null;

      const payload = {
        nome: formulario.nome.trim(),
        descricao: formulario.descricao.trim(),
        categoria: formulario.categoria,
        preco: Number(formulario.preco),
        estoque: Number(formulario.estoque),
      };

      const resultado: any = produtoEditando
        ? await editarProduto(pId, payload)
        : await criarProduto(payload).then(() => ({ sucesso: true, mensagem: '' }));

      if (resultado && resultado.sucesso === false) {
        throw new Error(resultado.mensagem || 'Erro ao salvar produto.');
      }

      setModalAberta(false);
      setProdutoEditando(null);
      setFormulario(produtoInicial);
      setPrecoTexto('');
      setMensagem('Produto salvo com sucesso.');
      setTimeout(() => setMensagem(null), 3500);
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível salvar o produto.');
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!produtoParaExcluir) return;
    setCarregando(true);
    const pId = getVal(produtoParaExcluir, 'produtoid', 'produtoId');
    const resultado: any = await excluirProduto(pId);
    setCarregando(false);
    setProdutoParaExcluir(null);

    if (resultado?.sucesso !== false) {
      setMensagem('Produto excluído com sucesso.');
      setTimeout(() => setMensagem(null), 3500);
    } else {
      setErro(resultado?.mensagem || 'Erro ao excluir produto.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-['Manrope'] text-xl font-bold">Cadastro de Produtos</h1>
          <p className="text-xs text-[#717971] mt-1">Lojinha e Bar disponíveis para cadastro e lançamento.</p>
        </div>
        <button
          onClick={abrirNovo}
          className="px-4 py-2 bg-[#053d1e] hover:bg-[#043017] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {mensagem && (
        <div className="p-3 rounded-xl bg-[#b8f0c2] text-[#053d1e] text-xs font-bold">
          {mensagem}
        </div>
      )}
      {erro && !modalAberta && (
        <div className="p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs font-bold">
          {erro}
        </div>
      )}

      <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#717971]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 p-2 text-xs border border-[#c1c9bf] rounded-lg outline-none focus:border-[#053d1e]"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="p-2 text-xs border border-[#c1c9bf] rounded-lg bg-white font-medium outline-none cursor-pointer"
        >
          <option value="TODAS">Todas as categorias</option>
          {categorias.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[#c1c9bf] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#c1c9bf]">
              <tr>
                {['Nome', 'Categoria', 'Preço', 'Estoque', 'Ações'].map((item) => (
                  <th key={item} className="p-3 font-bold text-slate-700">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4]">
              {produtosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                produtosPaginados.map((produto) => (
                  <tr key={String(produto.produtoid)} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800">{produto.nome}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          produto.categoria === 'LOJINHA'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : produto.categoria === 'BAR'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {produto.categoria === 'LOJINHA'
                          ? 'Lojinha'
                          : produto.categoria === 'BAR'
                          ? 'Bar'
                          : produto.categoria}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{formatarMoeda(produto.preco)}</td>
                    <td className="p-3 font-semibold text-slate-700">{produto.estoque}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEdicao(produto)}
                          className="p-1.5 text-[#053d1e] hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setProdutoParaExcluir(produto)}
                          className="p-1.5 text-[#ba1a1a] hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginação */}
        {totalItens > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#f8f9fa] border-t border-[#c1c9bf] text-xs text-[#717971]">
            <div>
              Exibindo <span className="font-bold text-slate-800">{indiceInicio + 1}</span> a{' '}
              <span className="font-bold text-slate-800">{indiceFim}</span> de{' '}
              <span className="font-bold text-slate-800">{totalItens}</span> produtos (Página{' '}
              <span className="font-bold text-slate-800">{paginaAtual}</span> de{' '}
              <span className="font-bold text-slate-800">{totalPaginas}</span>)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                disabled={paginaAtual === 1}
                className="p-1.5 rounded-lg border border-[#c1c9bf] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-bold bg-[#053d1e] text-white rounded-lg shadow-xs">
                {paginaAtual} / {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                disabled={paginaAtual >= totalPaginas}
                className="p-1.5 rounded-lg border border-[#c1c9bf] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição com Topo Verde Escuro Padronizado */}
      {modalAberta && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Topo no padrão verde escuro (#053d1e) */}
            <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Package className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-['Manrope'] text-white">
                    {produtoEditando ? 'Editar Produto' : 'Novo Produto'}
                  </h2>
                  <p className="text-xs text-white/80">
                    {produtoEditando
                      ? `Atualize as informações do item "${formulario.nome || ''}".`
                      : 'Cadastre um novo item para lançamento na Lojinha ou Bar.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                disabled={carregando}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Scroll interno */}
            <form onSubmit={salvar} className="p-6 space-y-4 overflow-y-auto flex-1">
              {erro && (
                <div className="p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs font-semibold">
                  {erro}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  required
                  placeholder="Ex: Água Mineral 500ml, Sucos, Camiseta, etc."
                  value={formulario.nome}
                  onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                  className="w-full p-2.5 text-xs border border-[#c1c9bf] bg-[#f8f9fa] rounded-lg font-semibold outline-none focus:border-[#053d1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea
                  placeholder="Descrição opcional do item"
                  rows={2}
                  value={formulario.descricao}
                  onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
                  className="w-full p-2.5 text-xs border border-[#c1c9bf] bg-[#f8f9fa] rounded-lg outline-none focus:border-[#053d1e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
                  <select
                    value={formulario.categoria}
                    onChange={(e) =>
                      setFormulario({ ...formulario, categoria: e.target.value as CategoriaProduto })
                    }
                    className="w-full p-2.5 text-xs border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    {categorias.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preço com Máscara Monetária */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preço (R$) *</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={precoTexto}
                    onChange={(e) => handleAlterarPreco(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#c1c9bf] bg-[#f8f9fa] rounded-lg font-bold text-[#053d1e] outline-none focus:border-[#053d1e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estoque *</label>
                  <input
                    required
                    min="0"
                    type="number"
                    placeholder="Estoque"
                    value={formulario.estoque}
                    onChange={(e) =>
                      setFormulario({ ...formulario, estoque: Number(e.target.value) })
                    }
                    className="w-full p-2.5 text-xs border border-[#c1c9bf] bg-[#f8f9fa] rounded-lg font-bold text-slate-800 outline-none focus:border-[#053d1e]"
                  />
                </div>
              </div>

              {/* Rodapé da Modal */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  disabled={carregando}
                  className="px-4 py-2 border border-[#c1c9bf] rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={carregando}
                  className="px-5 py-2 bg-[#053d1e] hover:bg-[#043017] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60 transition-colors"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ModalConfirmacao
        aberto={Boolean(produtoParaExcluir)}
        titulo="Excluir produto"
        mensagem={`Tem certeza que deseja excluir o produto "${getVal(
          produtoParaExcluir,
          'nome',
          'nome'
        )}"?`}
        tipo="perigo"
        textoConfirmar="Sim, excluir"
        textoCancelar="Cancelar"
        onConfirmar={confirmarExclusao}
        onCancelar={() => setProdutoParaExcluir(null)}
      />

      {carregando && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs"
          role="status"
          aria-live="polite"
        >
          <div className="bg-white rounded-xl px-5 py-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#053d1e]">
            <LoaderCircle className="w-5 h-5 animate-spin" />
            Processando...
          </div>
        </div>
      )}
    </div>
  );
};