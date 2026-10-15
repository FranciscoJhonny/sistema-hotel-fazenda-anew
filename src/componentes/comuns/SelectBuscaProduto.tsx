import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Package, X } from 'lucide-react';
import { Produto } from '../../tipos';
import { formatarMoeda } from '../../utilitarios/formatadores';

export interface SelectBuscaProdutoProps {
  produtos: Produto[];
  valorSelecionadoId: string | number;
  onSelecionar: (id: string) => void;
  placeholder?: string;
  desabilitado?: boolean;
}

export const SelectBuscaProduto: React.FC<SelectBuscaProdutoProps> = ({
  produtos,
  valorSelecionadoId,
  onSelecionar,
  placeholder = 'Selecione ou busque o produto...',
  desabilitado = false,
}) => {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Fecha ao clicar fora do componente
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };

    if (aberto) {
      document.addEventListener('mousedown', handleClickFora);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [aberto]);

  // Foca automaticamente no campo de busca ao abrir
  useEffect(() => {
    if (aberto) {
      const timer = setTimeout(() => {
        inputBuscaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setTermoBusca('');
    }
  }, [aberto]);

  // Filtra produtos ativos e com estoque > 0
  const produtosDisponiveis = useMemo(() => {
    return produtos.filter((p) => p.ativo && p.estoque > 0);
  }, [produtos]);

  // Filtra os produtos pelo termo de busca
  const produtosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return produtosDisponiveis;
    const termo = termoBusca.toLowerCase().trim();
    return produtosDisponiveis.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.categoria && String(p.categoria).toLowerCase().includes(termo))
    );
  }, [produtosDisponiveis, termoBusca]);

  // Produto selecionado atualmente
  const produtoSelecionado = useMemo(() => {
    return produtos.find((p) => String(p.produtoid) === String(valorSelecionadoId));
  }, [produtos, valorSelecionadoId]);

  const handleSelecionar = (id: string) => {
    onSelecionar(id);
    setAberto(false);
  };

  const handleLimpar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelecionar('');
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {/* Botão Suspenso com Chevron */}
      <button
        type="button"
        disabled={desabilitado}
        onClick={() => setAberto((prev) => !prev)}
        className={`w-full p-2.5 border rounded-xl bg-[#f8f9fa] flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
          aberto
            ? 'border-[#053d1e] ring-2 ring-[#053d1e]/20 bg-white'
            : 'border-[#c1c9bf] hover:border-[#053d1e]'
        } ${desabilitado ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          <Package className="w-4 h-4 text-[#053d1e] shrink-0" />
          {produtoSelecionado ? (
            <div className="truncate flex items-center gap-2">
              <span className="font-bold text-[#191c1d] truncate">
                {produtoSelecionado.nome}
              </span>
              <span className="font-semibold text-[#053d1e] shrink-0">
                • {formatarMoeda(produtoSelecionado.preco)}
              </span>
              <span className="text-[10px] bg-[#e6f4ea] text-[#053d1e] px-1.5 py-0.5 rounded font-bold shrink-0">
                Estoque: {produtoSelecionado.estoque}
              </span>
            </div>
          ) : (
            <span className="text-[#717971] font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[#717971]">
          {produtoSelecionado && !desabilitado && (
            <span
              onClick={handleLimpar}
              className="p-0.5 hover:text-[#ba1a1a] rounded cursor-pointer transition-colors"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              aberto ? 'rotate-180 text-[#053d1e]' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown com Busca Interna */}
      {aberto && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white border border-[#c1c9bf] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Input com Ícone de Lupa no Topo */}
          <div className="p-2.5 border-b border-[#e1e3e4] bg-[#f8f9fa]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#717971] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputBuscaRef}
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Filtrar produtos..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#c1c9bf] rounded-lg text-xs font-medium text-[#191c1d] placeholder-[#717971] focus:outline-none focus:border-[#053d1e]"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setAberto(false);
                  }
                }}
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#717971] hover:text-[#191c1d] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista com Rolagem */}
          <div className="max-h-52 overflow-y-auto divide-y divide-[#f0f2f0]">
            {produtosFiltrados.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#717971]">
                Nenhum produto disponível encontrado.
              </div>
            ) : (
              produtosFiltrados.map((produto) => {
                const selecionado = String(produto.produtoid) === String(valorSelecionadoId);

                return (
                  <button
                    key={produto.produtoid}
                    type="button"
                    onClick={() => handleSelecionar(String(produto.produtoid))}
                    className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selecionado
                        ? 'bg-[#e6f4ea] text-[#053d1e] font-bold'
                        : 'hover:bg-[#f8f9fa] text-[#191c1d]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-xs truncate">{produto.nome}</div>
                      <div className="text-[11px] text-[#717971] mt-0.5">
                        {produto.categoria && <span>{produto.categoria} • </span>}
                        Estoque: <strong className="text-[#191c1d]">{produto.estoque}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-xs text-[#053d1e]">
                        {formatarMoeda(produto.preco)}
                      </span>
                      {selecionado && <Check className="w-4 h-4 text-[#053d1e]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};