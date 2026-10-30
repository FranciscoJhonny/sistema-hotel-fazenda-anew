import React, { useMemo, useState, useEffect } from "react";
import {
  Bed,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { useHotel } from "../contextos/ContextoHotel";
import { BlocoQuarto, CategoriaQuarto, Quarto, StatusQuarto } from "../tipos";
import { ModalConfirmacao } from "../componentes/comuns/ModalConfirmacao";

// Helper universal para compatibilidade camelCase (.NET) e lowercase (PostgreSQL)
const getVal = (obj: any, campoMin: string, campoCamel: string): any => {
  if (!obj) return undefined;
  return obj[campoMin] !== undefined ? obj[campoMin] : obj[campoCamel];
};

const categorias: (CategoriaQuarto | string)[] = [
  "Standard Duplo",
  "Standard Casal",
  "Standard Triplo",
  "Superior Triplo",
  "Luxo Casal",
  "Luxo Duplo",
  "Luxo Quadruplo",
  "Chalé Master",
  "Chalé Família",
  "Vila Premium",
];

const statusSelecionaveis: StatusQuarto[] = [
  "DISPONIVEL",
  "A_LIMPAR",
  "EM_LIMPEZA",
  "MANUTENCAO",
];

const blocos: BlocoQuarto[] = ["B", "C", "D"];

type DadosQuarto = Omit<
  Quarto,
  | "quartoid"
  | "valordiariapadrao"
  | "datainclusao"
  | "dataoperacao"
  | "ativo"
  | "usuarioinclusao"
  | "usuariooperacao"
  | "naturezaoperacao"
> & { ativo?: boolean };

const formularioInicial: DadosQuarto = {
  numero: "",
  codigoidentificador: "",
  bloco: "B",
  categoria: "Standard Duplo",
  quantidadecamascasal: 1,
  quantidadecamassolteiro: 0,
  capacidadeadultos: 2,
  capacidadecriancas: 0,
  status: "DISPONIVEL",
  descricao: "",
  comodidades: "",
  ativo: true,
};

const rotuloStatus: Record<StatusQuarto, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  OCUPADO: "Ocupado",
  AGUARDANDO_CHECKIN: "Aguardando check-in",
  MANUTENCAO: "Manutenção",
  A_LIMPAR: "A limpar",
  EM_LIMPEZA: "Em limpeza",
};

const ITENS_POR_PAGINA = 15;

export const PaginaQuartos: React.FC = () => {
  const { quartos, criarQuarto, editarQuarto, excluirQuarto } = useHotel();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusQuarto>("TODOS");
  const [quartoEditando, setQuartoEditando] = useState<any | null>(null);
  const [formulario, setFormulario] = useState<DadosQuarto>(formularioInicial);
  const [modalAberta, setModalAberta] = useState(false);
  const [quartoParaExcluir, setQuartoParaExcluir] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Estados de feedback visual
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Normalização de quartos garantindo leitura de quartoid
  const quartosNormalizados = useMemo(() => {
    return (quartos || []).map((q: any) => ({
      ...q,
      quartoid: getVal(q, "quartoid", "quartoId"),
      numero: getVal(q, "numero", "numero") || "",
      codigoidentificador:
        getVal(q, "codigoidentificador", "codigoIdentificador") ||
        getVal(q, "numero", "numero") ||
        "",
      bloco: (getVal(q, "bloco", "bloco") as BlocoQuarto) || "B",
      categoria: (getVal(q, "categoria", "categoria") as CategoriaQuarto) || "Standard Duplo",
      quantidadecamascasal: Number(
        getVal(q, "quantidadecamascasal", "quantidadeCamasCasal") ?? 0
      ),
      quantidadecamassolteiro: Number(
        getVal(q, "quantidadecamassolteiro", "quantidadeCamasSolteiro") ?? 0
      ),
      capacidadeadultos: Number(getVal(q, "capacidadeadultos", "capacidadeAdultos") ?? 2),
      capacidadecriancas: Number(getVal(q, "capacidadecriancas", "capacidadeCriancas") ?? 0),
      status: (getVal(q, "status", "status") as StatusQuarto) || "DISPONIVEL",
      descricao: getVal(q, "descricao", "descricao") || "",
      comodidades: getVal(q, "comodidades", "comodidades") || "",
      ativo: getVal(q, "ativo", "ativo") !== false,
    }));
  }, [quartos]);

  const quartosFiltrados = useMemo(
    () =>
      quartosNormalizados
        .filter((quarto) => {
          const cod = String(quarto.codigoidentificador || "").toUpperCase();
          const num = String(quarto.numero || "").toUpperCase();
          const cat = String(quarto.categoria || "").toUpperCase();
          if (cod === "DAY_USE" || num === "DU" || num === "DAY USE" || cat === "DAY USE") {
            return false;
          }

          const termo = busca.trim().toLowerCase();
          const correspondeBusca =
            !termo ||
            [
              String(quarto.quartoid || ""),
              quarto.numero,
              quarto.codigoidentificador,
              quarto.bloco,
              quarto.categoria,
            ].some((valor) => String(valor).toLowerCase().includes(termo));

          return (
            correspondeBusca &&
            (filtroStatus === "TODOS" || quarto.status === filtroStatus)
          );
        })
        .sort((a, b) =>
          String(a.codigoidentificador || a.numero || "").localeCompare(
            String(b.codigoidentificador || b.numero || ""),
            undefined,
            { numeric: true, sensitivity: "base" }
          )
        ),
    [busca, filtroStatus, quartosNormalizados]
  );

  // Reseta para a primeira página ao filtrar
  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroStatus]);

  // Cálculos de paginação
  const totalItens = quartosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / ITENS_POR_PAGINA));
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFim = Math.min(indiceInicio + ITENS_POR_PAGINA, totalItens);
  const quartosPaginados = useMemo(() => {
    return quartosFiltrados.slice(indiceInicio, indiceFim);
  }, [quartosFiltrados, indiceInicio, indiceFim]);

  const exibirSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  const abrirNovo = () => {
    setQuartoEditando(null);
    setFormulario(formularioInicial);
    setErroModal(null);
    setModalAberta(true);
  };

  const abrirEdicao = (quarto: any) => {
    setQuartoEditando(quarto);
    setFormulario({
      numero: getVal(quarto, "numero", "numero") || "",
      codigoidentificador:
        getVal(quarto, "codigoidentificador", "codigoIdentificador") ||
        getVal(quarto, "numero", "numero") ||
        "",
      bloco: (getVal(quarto, "bloco", "bloco") as BlocoQuarto) || "B",
      categoria: (getVal(quarto, "categoria", "categoria") as CategoriaQuarto) || "Standard Duplo",
      quantidadecamascasal: Number(
        getVal(quarto, "quantidadecamascasal", "quantidadeCamasCasal") ?? 1
      ),
      quantidadecamassolteiro: Number(
        getVal(quarto, "quantidadecamassolteiro", "quantidadeCamasSolteiro") ?? 0
      ),
      capacidadeadultos: Number(getVal(quarto, "capacidadeadultos", "capacidadeAdultos") ?? 2),
      capacidadecriancas: Number(getVal(quarto, "capacidadecriancas", "capacidadeCriancas") ?? 0),
      status: (getVal(quarto, "status", "status") as StatusQuarto) || "DISPONIVEL",
      descricao: getVal(quarto, "descricao", "descricao") || "",
      comodidades: getVal(quarto, "comodidades", "comodidades") || "",
      ativo: getVal(quarto, "ativo", "ativo") !== false,
    });
    setErroModal(null);
    setModalAberta(true);
  };

  const atualizarCampo = (campo: keyof DadosQuarto, valor: string | number | boolean) =>
    setFormulario((atual) => ({ ...atual, [campo]: valor }));

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCarregando(true);
    setErroModal(null);

    try {
      const qId = quartoEditando ? getVal(quartoEditando, "quartoid", "quartoId") : null;

      // Proteção de strings para evitar erro com undefined
      const dados: any = {
        ...(qId ? { quartoId: qId } : {}),
        numero: (formulario.numero || "").trim(),
        codigoIdentificador: (formulario.codigoidentificador || formulario.numero || "").trim(),
        bloco: formulario.bloco,
        categoria: formulario.categoria,
        quantidadeCamasCasal: Number(formulario.quantidadecamascasal ?? 0),
        quantidadeCamasSolteiro: Number(formulario.quantidadecamassolteiro ?? 0),
        capacidadeAdultos: Number(formulario.capacidadeadultos ?? 2),
        capacidadeCriancas: Number(formulario.capacidadecriancas ?? 0),
        status: formulario.status,
        descricao: (formulario.descricao || "").trim(),
        comodidades: (formulario.comodidades || "").trim(),
        ativo: formulario.ativo !== false,
      };

      const resultado: any = quartoEditando
        ? await editarQuarto(qId, dados)
        : await criarQuarto(dados);

      if (resultado && resultado.sucesso === false) {
        setErroModal(resultado.mensagem || "Não foi possível salvar o quarto.");
        return;
      }

      setModalAberta(false);
      exibirSucesso(resultado?.mensagem || "Quarto salvo com sucesso.");
    } catch (error: any) {
      setErroModal(error?.message || "Não foi possível salvar o quarto.");
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!quartoParaExcluir) return;
    setCarregando(true);
    try {
      const qId = getVal(quartoParaExcluir, "quartoid", "quartoId");
      const resultado: any = await excluirQuarto(qId);
      setQuartoParaExcluir(null);

      if (resultado && resultado.sucesso === false) {
        setErroModal(resultado.mensagem);
      } else {
        exibirSucesso(resultado?.mensagem || "Quarto excluído com sucesso.");
      }
    } catch (error: any) {
      setErroModal(error?.message || "Não foi possível excluir o quarto.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-[#053d1e]" />
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Gerenciamento de Quartos
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#717971]">
            Cadastre, edite e acompanhe todos os quartos registrados no banco de dados.
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#053d1e] px-4 py-2 text-xs font-bold text-white hover:bg-[#043017] cursor-pointer shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo quarto
        </button>
      </div>

      {/* Banner de Sucesso */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 rounded-xl border border-[#92c89d] bg-[#e6f4ea] px-4 py-3 text-xs font-semibold text-[#053d1e] animate-in fade-in">
          <Check className="h-4 w-4" />
          {mensagemSucesso}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#c1c9bf] bg-white p-4 shadow-xs sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#717971]" />
          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por ID, número, código, bloco ou categoria..."
            className="w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] py-1.5 pl-9 pr-3 text-xs outline-none focus:border-[#053d1e]"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(evento) =>
            setFiltroStatus(evento.target.value as "TODOS" | StatusQuarto)
          }
          className="rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer"
        >
          <option value="TODOS">Todos os status</option>
          {statusSelecionaveis.map((item) => (
            <option key={item} value={item}>
              {rotuloStatus[item]}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela com Coluna ID e Paginação */}
      <div className="overflow-hidden rounded-2xl border border-[#c1c9bf] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#c1c9bf] bg-[#f8f9fa] text-[11px] uppercase text-[#414941]">
              <tr>
                <th className="px-4 py-3 font-bold w-16">ID</th>
                <th className="px-4 py-3 font-bold">Código identificador</th>
                <th className="px-4 py-3 font-bold">Bloco / Categoria</th>
                <th className="px-4 py-3 font-bold">Camas</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4]">
              {quartosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#717971]">
                    Nenhum quarto encontrado.
                  </td>
                </tr>
              ) : (
                quartosPaginados.map((quarto) => (
                  <tr key={String(quarto.quartoid)} className="hover:bg-[#f8f9fa]">
                    {/* Coluna ID */}
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold font-mono text-[11px]">
                        #{quarto.quartoid}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">
                        Quarto - {quarto.codigoidentificador}
                      </p>
                      <p className="text-[10px] text-[#717971]">
                        Número {quarto.numero}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        Bloco {quarto.bloco}
                      </p>
                      <p className="text-[10px] text-[#717971]">
                        {quarto.categoria}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {quarto.quantidadecamascasal ?? 0} casal,{" "}
                      {quarto.quantidadecamassolteiro ?? 0} solteiro
                    </td>
                    <td className="px-4 py-3">
                      {quarto.status === "MANUTENCAO" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[11px] font-bold text-[#374151] border border-[#d1d5db]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4b5563]" />
                          Manutenção
                        </span>
                      ) : quarto.status === "A_LIMPAR" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3dc] px-2.5 py-1 text-[11px] font-bold text-[#b45309] border border-[#fde68a]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#b45309]" />
                          A limpar
                        </span>
                      ) : quarto.status === "EM_LIMPEZA" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0f2fe] px-2.5 py-1 text-[11px] font-bold text-[#0369a1] border border-[#bae6fd]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0369a1]" />
                          Em limpeza
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-semibold text-[#137333] border border-[#b8f0c2]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#137333]" />
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          title="Editar quarto"
                          onClick={() => abrirEdicao(quarto)}
                          className="rounded p-1.5 text-[#414941] hover:bg-[#e6f4ea] hover:text-[#053d1e] cursor-pointer transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          title="Excluir quarto"
                          onClick={() => setQuartoParaExcluir(quarto)}
                          className="rounded p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalItens > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#f8f9fa] border-t border-[#c1c9bf] text-xs text-[#717971]">
            <div>
              Exibindo <span className="font-bold text-slate-800">{indiceInicio + 1}</span> a{" "}
              <span className="font-bold text-slate-800">{indiceFim}</span> de{" "}
              <span className="font-bold text-slate-800">{totalItens}</span> quartos (Página{" "}
              <span className="font-bold text-slate-800">{paginaAtual}</span> de{" "}
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

      {/* Modal Padronizada com Topo Verde */}
      {modalAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Topo Verde */}
            <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Bed className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-['Manrope'] text-white">
                    {quartoEditando ? `Editar Quarto #${getVal(quartoEditando, "quartoid", "quartoId")}` : "Novo Quarto"}
                  </h2>
                  <p className="text-xs text-white/80">
                    {quartoEditando
                      ? `Atualize as configurações do quarto ${formulario.numero || ""}.`
                      : "Cadastre uma nova acomodação para o hotel."}
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

            {/* Conteúdo do Formulário */}
            <form onSubmit={salvar} className="p-6 space-y-4 overflow-y-auto flex-1">
              {erroModal && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-900 animate-in fade-in">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Número *
                  <input
                    required
                    value={formulario.numero}
                    onChange={(evento) =>
                      atualizarCampo("numero", evento.target.value)
                    }
                    placeholder="Ex: 01, 102, etc."
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Código identificador *
                  <input
                    required
                    value={formulario.codigoidentificador}
                    onChange={(evento) =>
                      atualizarCampo("codigoidentificador", evento.target.value)
                    }
                    placeholder="Ex: B1, C2, etc."
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Bloco *
                  <select
                    value={formulario.bloco}
                    onChange={(evento) =>
                      atualizarCampo("bloco", evento.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none cursor-pointer"
                  >
                    {blocos.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Categoria *
                  <select
                    value={formulario.categoria}
                    onChange={(evento) =>
                      atualizarCampo("categoria", evento.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none cursor-pointer"
                  >
                    {categorias.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Camas de Casal *
                  <input
                    type="number"
                    min="0"
                    required
                    value={formulario.quantidadecamascasal ?? 0}
                    onChange={(evento) =>
                      atualizarCampo(
                        "quantidadecamascasal",
                        Number(evento.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Camas de Solteiro *
                  <input
                    type="number"
                    min="0"
                    required
                    value={formulario.quantidadecamassolteiro ?? 0}
                    onChange={(evento) =>
                      atualizarCampo(
                        "quantidadecamassolteiro",
                        Number(evento.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                  Status *
                  <select
                    value={formulario.status}
                    onChange={(evento) =>
                      atualizarCampo("status", evento.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none cursor-pointer"
                  >
                    {statusSelecionaveis.map((item) => (
                      <option key={item} value={item}>
                        {rotuloStatus[item]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                  Descrição
                  <textarea
                    value={formulario.descricao}
                    onChange={(evento) =>
                      atualizarCampo("descricao", evento.target.value)
                    }
                    placeholder="Descrição opcional do quarto..."
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                    rows={2}
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                  Comodidades
                  <textarea
                    value={formulario.comodidades}
                    onChange={(evento) =>
                      atualizarCampo("comodidades", evento.target.value)
                    }
                    placeholder="Ex.: Ar-condicionado, TV, frigobar"
                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                    rows={2}
                  />
                </label>
              </div>

              {/* Rodapé da Modal */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  disabled={carregando}
                  className="rounded-xl border border-[#c1c9bf] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={carregando}
                  className="flex items-center gap-2 rounded-xl bg-[#053d1e] px-5 py-2 text-xs font-semibold text-white hover:bg-[#043017] disabled:opacity-60 cursor-pointer transition-colors shadow-xs"
                >
                  {carregando ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar quarto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      <ModalConfirmacao
        aberto={Boolean(quartoParaExcluir)}
        titulo="Excluir quarto"
        mensagem={`Deseja realmente excluir o quarto ${getVal(
          quartoParaExcluir,
          "numero",
          "numero"
        )}? O registro será inativado no banco de dados.`}
        tipo="perigo"
        textoConfirmar="Sim, excluir"
        onConfirmar={confirmarExclusao}
        onCancelar={() => setQuartoParaExcluir(null)}
      />

      {/* Loader Global */}
      {carregando && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-[#053d1e] shadow-xl">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Processando quarto...
          </div>
        </div>
      )}
    </div>
  );
};