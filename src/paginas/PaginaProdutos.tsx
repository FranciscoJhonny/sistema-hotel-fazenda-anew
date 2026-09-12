import React, { useState } from 'react';
import { LoaderCircle, Package, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { CategoriaProduto, Produto } from '../tipos';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';
import { formatarMoeda, sanitizarValorMonetario } from '../utilitarios/formatadores';

const categorias: CategoriaProduto[] = ['FRIGOBAR', 'LOJINHA', 'SERVICOS'];
const produtoInicial = { nome: '', descricao: '', categoria: 'FRIGOBAR' as CategoriaProduto, preco: 0, estoque: 0 };

const converterValorMonetario = (valor: string): number => {
  const normalizado = valor.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\.|,|$))/g, '').replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
};

const formatarCampoMoeda = (valor: number): string => {
  if (!valor) return '';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PaginaProdutos: React.FC = () => {
  const { produtos, criarProduto, editarProduto, excluirProduto } = useHotel();
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('TODAS');
  const [modalAberta, setModalAberta] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);
  const [formulario, setFormulario] = useState(produtoInicial);
  const [precoTexto, setPrecoTexto] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const filtrados = produtos.filter((produto) => (categoria === 'TODAS' || produto.categoria === categoria) && produto.nome.toLowerCase().includes(busca.toLowerCase()));
  const abrirNovo = () => { setProdutoEditando(null); setFormulario(produtoInicial); setPrecoTexto(''); setErro(null); setModalAberta(true); };
  const abrirEdicao = (produto: Produto) => { setProdutoEditando(produto); setFormulario({ nome: produto.nome, descricao: produto.descricao || '', categoria: produto.categoria, preco: produto.preco, estoque: produto.estoque }); setPrecoTexto(formatarCampoMoeda(produto.preco)); setErro(null); setModalAberta(true); };
  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
      <input required inputMode="decimal" type="text" placeholder="0,00" value={precoTexto} onChange={(e) => { const texto = sanitizarValorMonetario(e.target.value); setPrecoTexto(texto); setFormulario({ ...formulario, preco: converterValorMonetario(texto) }); }} onBlur={() => setPrecoTexto(formulario.preco > 0 ? formatarCampoMoeda(formulario.preco) : '')} className="w-full p-2 pl-9 text-xs border border-[#c1c9bf] rounded-lg" />
    setCarregando(true); setErro(null);
    try {
      const resultado = produtoEditando ? await editarProduto(produtoEditando.produtoid, formulario) : await criarProduto(formulario).then(() => ({ sucesso: true, mensagem: '' }));
      if (!resultado.sucesso) throw new Error(resultado.mensagem);
      setModalAberta(false); setProdutoEditando(null); setFormulario(produtoInicial); setPrecoTexto(''); setMensagem('Produto salvo com sucesso.');
      setTimeout(() => setMensagem(null), 3500);
    } catch (error: any) { setErro(error?.message || 'Não foi possível salvar o produto.'); } finally { setCarregando(false); }
  };
  const confirmarExclusao = async () => {
    if (!produtoParaExcluir) return;
    setCarregando(true);
    const resultado = await excluirProduto(produtoParaExcluir.produtoid);
    setCarregando(false); setProdutoParaExcluir(null);
    if (resultado.sucesso) { setMensagem('Produto excluído com sucesso.'); setTimeout(() => setMensagem(null), 3500); }
    else setErro(resultado.mensagem);
  };

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3"><div><h1 className="font-['Manrope'] text-xl font-bold">Cadastro de Produtos</h1><p className="text-xs text-[#717971] mt-1">Frigobar, lojinha e serviços disponíveis para lançamento.</p></div><button onClick={abrirNovo} className="px-4 py-2 bg-[#053d1e] text-white rounded-xl text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Produto</button></div>
    {mensagem && <div className="p-3 rounded-xl bg-[#b8f0c2] text-[#053d1e] text-xs font-bold">{mensagem}</div>}
    {erro && !modalAberta && <div className="p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs font-bold">{erro}</div>}
    <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-[#717971]" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome..." className="w-full pl-9 p-2 text-xs border border-[#c1c9bf] rounded-lg" /></div><select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="p-2 text-xs border border-[#c1c9bf] rounded-lg"><option value="TODAS">Todas as categorias</option>{categorias.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="bg-white border border-[#c1c9bf] rounded-2xl overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#f8f9fa] border-b border-[#c1c9bf]"><tr>{['Nome', 'Categoria', 'Preço', 'Estoque', 'Ações'].map((item) => <th key={item} className="p-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-[#e1e3e4]">{filtrados.map((produto) => <tr key={produto.produtoid}><td className="p-3 font-semibold">{produto.nome}</td><td className="p-3">{produto.categoria}</td><td className="p-3 font-bold">{formatarMoeda(produto.preco)}</td><td className="p-3">{produto.estoque}</td><td className="p-3"><button onClick={() => abrirEdicao(produto)} className="p-1.5 text-[#053d1e]" title="Editar"><Pencil className="w-4 h-4" /></button><button onClick={() => setProdutoParaExcluir(produto)} className="p-1.5 text-[#ba1a1a]" title="Excluir"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody></table></div>
    {modalAberta && <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs" role="dialog" aria-modal="true"><form onSubmit={salvar} className="bg-white border border-[#c1c9bf] rounded-2xl shadow-2xl p-5 space-y-3 w-full max-w-xl"><div className="flex items-center justify-between"><h2 className="font-bold flex items-center gap-2"><Package className="w-4 h-4" />{produtoEditando ? 'Editar produto' : 'Novo produto'}</h2><button type="button" onClick={() => setModalAberta(false)} disabled={carregando} className="p-1 text-[#414941]"><X className="w-5 h-5" /></button></div>{erro && <div className="p-2 rounded-lg bg-[#ffdad6] text-[#93000a] text-xs font-semibold">{erro}</div>}<input required placeholder="Nome" value={formulario.nome} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} className="w-full p-2 text-xs border border-[#c1c9bf] rounded-lg" /><textarea placeholder="Descrição" value={formulario.descricao} onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} className="w-full p-2 text-xs border border-[#c1c9bf] rounded-lg" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><select value={formulario.categoria} onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })} className="p-2 text-xs border border-[#c1c9bf] rounded-lg">{categorias.map((item) => <option key={item}>{item}</option>)}</select><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#717971]">R$</span><input required inputMode="decimal" type="text" placeholder="0,00" value={precoTexto} onChange={(e) => { const texto = e.target.value; setPrecoTexto(texto); setFormulario({ ...formulario, preco: converterValorMonetario(texto) }); }} className="w-full p-2 pl-9 text-xs border border-[#c1c9bf] rounded-lg" /></div><input required min="0" type="number" placeholder="Estoque" value={formulario.estoque} onChange={(e) => setFormulario({ ...formulario, estoque: Number(e.target.value) })} className="p-2 text-xs border border-[#c1c9bf] rounded-lg" /></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalAberta(false)} disabled={carregando} className="px-4 py-2 border border-[#c1c9bf] rounded-lg text-xs font-semibold">Cancelar</button><button disabled={carregando} className="px-4 py-2 bg-[#053d1e] text-white rounded-lg text-xs font-bold">Salvar Produto</button></div></form></div>}
    <ModalConfirmacao aberto={Boolean(produtoParaExcluir)} titulo="Excluir produto" mensagem={`Tem certeza que deseja excluir o produto "${produtoParaExcluir?.nome}"?`} tipo="perigo" textoConfirmar="Sim, excluir" textoCancelar="Cancelar" onConfirmar={confirmarExclusao} onCancelar={() => setProdutoParaExcluir(null)} />
    {carregando && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs" role="status" aria-live="polite"><div className="bg-white rounded-xl px-5 py-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#053d1e]"><LoaderCircle className="w-5 h-5 animate-spin" />Processando...</div></div>}
  </div>;
};