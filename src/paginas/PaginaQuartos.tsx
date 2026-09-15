import React, { useMemo, useState } from "react";
import { Bed, Check, Edit3, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import { useHotel } from "../contextos/ContextoHotel";
import { BlocoQuarto, CategoriaQuarto, Quarto, StatusQuarto } from "../tipos";
import { ModalConfirmacao } from "../componentes/comuns/ModalConfirmacao";

const categorias: CategoriaQuarto[] = [
    "Standard Duplo",
    "Standard Casal",
    "Standard Triplo",
    "Luxo Casal",
    "Luxo Duplo",
    "Chalé Master",
    "Chalé Família",
    "Vila Premium",
];
const status: StatusQuarto[] = [
    "DISPONIVEL",
    "RESERVADO",
    "OCUPADO",
    "AGUARDANDO_CHECKIN",
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
};

export const PaginaQuartos: React.FC = () => {
    const { quartos, criarQuarto, editarQuarto, excluirQuarto } = useHotel();
    const [busca, setBusca] = useState("");
    const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusQuarto>(
        "TODOS",
    );
    const [quartoEditando, setQuartoEditando] = useState<Quarto | null>(null);
    const [formulario, setFormulario] =
        useState<DadosQuarto>(formularioInicial);
    const [modalAberta, setModalAberta] = useState(false);
    const [quartoParaExcluir, setQuartoParaExcluir] = useState<Quarto | null>(
        null,
    );
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState<string | null>(null);

    const quartosFiltrados = useMemo(
        () =>
            quartos.filter((quarto) => {
                const termo = busca.trim().toLowerCase();
                const correspondeBusca =
                    !termo ||
                    [
                        quarto.numero,
                        quarto.codigoidentificador,
                        quarto.bloco,
                        quarto.categoria,
                    ].some((valor) =>
                        String(valor).toLowerCase().includes(termo),
                    );
                return (
                    correspondeBusca &&
                    (filtroStatus === "TODOS" || quarto.status === filtroStatus)
                );
            }),
        [busca, filtroStatus, quartos],
    );

    const abrirNovo = () => {
        setQuartoEditando(null);
        setFormulario(formularioInicial);
        setMensagem(null);
        setModalAberta(true);
    };
    const abrirEdicao = (quarto: Quarto) => {
        setQuartoEditando(quarto);
        setFormulario({
            numero: quarto.numero,
            codigoidentificador: quarto.codigoidentificador,
            bloco: quarto.bloco,
            categoria: quarto.categoria,
            capacidadeadultos: quarto.capacidadeadultos,
            capacidadecriancas: quarto.capacidadecriancas,
            status: quarto.status,
            descricao: quarto.descricao || "",
            comodidades: quarto.comodidades || "",
            ativo: quarto.ativo,
        });
        setMensagem(null);
        setModalAberta(true);
    };

    const atualizarCampo = (
        campo: keyof DadosQuarto,
        valor: string | number | boolean,
    ) => setFormulario((atual) => ({ ...atual, [campo]: valor }));

    const salvar = async (evento: React.FormEvent) => {
        evento.preventDefault();
        setCarregando(true);
        setMensagem(null);
        try {
            const dados = {
                ...formulario,
                numero: formulario.numero.trim(),
                codigoidentificador:
                    formulario.codigoidentificador.trim() ||
                    formulario.numero.trim(),
            };
            const resultado = quartoEditando
                ? await editarQuarto(quartoEditando.quartoid, dados)
                : await criarQuarto(dados);
            if (!resultado.sucesso) {
                setMensagem(resultado.mensagem);
                return;
            }
            setModalAberta(false);
            setMensagem(resultado.mensagem);
        } catch (error: any) {
            setMensagem(error?.message || "Não foi possível salvar o quarto.");
        } finally {
            setCarregando(false);
        }
    };

    const confirmarExclusao = async () => {
        if (!quartoParaExcluir) return;
        setCarregando(true);
        try {
            const resultado = await excluirQuarto(quartoParaExcluir.quartoid);
            setQuartoParaExcluir(null);
            setMensagem(resultado.mensagem);
        } catch (error: any) {
            setMensagem(error?.message || "Não foi possível excluir o quarto.");
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-[#c1c9bf] bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-[#053d1e]" />
                        <h1 className="font-['Manrope'] text-xl font-bold">
                            Gerenciamento de Quartos
                        </h1>
                    </div>
                    <p className="mt-1 text-xs text-[#717971]">
                        Cadastre, edite e acompanhe todos os quartos registrados
                        no banco de dados.
                    </p>
                </div>
                <button
                    onClick={abrirNovo}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#053d1e] px-4 py-2 text-xs font-bold text-white hover:bg-[#225533]"
                >
                    <Plus className="h-4 w-4" />
                    Novo quarto
                </button>
            </div>
            {mensagem && (
                <div className="flex items-center gap-2 rounded-xl border border-[#92c89d] bg-[#e6f4ea] px-4 py-3 text-xs font-semibold text-[#053d1e]">
                    <Check className="h-4 w-4" />
                    {mensagem}
                </div>
            )}
            <div className="flex flex-col gap-3 rounded-xl border border-[#c1c9bf] bg-white p-4 shadow-xs sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#717971]" />
                    <input
                        value={busca}
                        onChange={(evento) => setBusca(evento.target.value)}
                        placeholder="Buscar por número, código, bloco ou categoria..."
                        className="w-full rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] py-1.5 pl-9 pr-3 text-xs outline-none focus:border-[#053d1e]"
                    />
                </div>
                <select
                    value={filtroStatus}
                    onChange={(evento) =>
                        setFiltroStatus(
                            evento.target.value as "TODOS" | StatusQuarto,
                        )
                    }
                    className="rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] px-3 py-1.5 text-xs font-semibold outline-none"
                >
                    <option value="TODOS">Todos os status</option>
                    {status.map((item) => (
                        <option key={item} value={item}>
                            {rotuloStatus[item]}
                        </option>
                    ))}
                </select>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#c1c9bf] bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#c1c9bf] bg-[#f8f9fa] text-[11px] uppercase text-[#414941]">
                            <tr>
                                <th className="px-4 py-3">
                                    Código identificador
                                </th>
                                <th className="px-4 py-3">Bloco / Categoria</th>
                                <th className="px-4 py-3">Capacidade</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e1e3e4]">
                            {quartosFiltrados.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-10 text-center text-[#717971]"
                                    >
                                        Nenhum quarto encontrado.
                                    </td>
                                </tr>
                            ) : (
                                quartosFiltrados.map((quarto) => (
                                    <tr key={quarto.quartoid} className="hover:bg-[#f8f9fa]">
                                        <td className="px-4 py-3">
                                            <p className="font-bold">
                                               Quarto - {quarto.codigoidentificador}
                                            </p>
                                            <p className="text-[10px] text-[#717971]">
                                                Número {quarto.numero}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">
                                                Bloco {quarto.bloco}
                                            </p>
                                            <p className="text-[10px] text-[#717971]">
                                                {quarto.categoria}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {quarto.capacidadeadultos} adultos /{" "}
                                            {quarto.capacidadecriancas} crianças
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-[#e6f4ea] px-2 py-1 text-[11px] font-semibold text-[#137333]">
                                                {rotuloStatus[quarto.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    title="Editar quarto"
                                                    onClick={() =>
                                                        abrirEdicao(quarto)
                                                    }
                                                    className="rounded p-1.5 text-[#414941] hover:bg-[#e6f4ea] hover:text-[#053d1e]"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    title="Excluir quarto"
                                                    onClick={() =>
                                                        setQuartoParaExcluir(
                                                            quarto,
                                                        )
                                                    }
                                                    className="rounded p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]"
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
            </div>
            {modalAberta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <form
                        onSubmit={salvar}
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-[#e1e3e4] px-6 py-4">
                            <h2 className="font-['Manrope'] text-lg font-bold">
                                {quartoEditando
                                    ? "Editar quarto"
                                    : "Novo quarto"}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setModalAberta(false)}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                            {(
                                [
                                    ["numero", "Número"],
                                    [
                                        "codigoidentificador",
                                        "Código identificador",
                                    ],
                                ] as const
                            ).map(([campo, rotulo]) => (
                                <label
                                    key={campo}
                                    className="text-xs font-semibold"
                                >
                                    {rotulo}
                                    <input
                                        required
                                        value={formulario[campo]}
                                        onChange={(evento) =>
                                            atualizarCampo(
                                                campo,
                                                evento.target.value,
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal outline-none focus:border-[#053d1e]"
                                    />
                                </label>
                            ))}
                            <label className="text-xs font-semibold">
                                Bloco
                                <select
                                    value={formulario.bloco}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "bloco",
                                            evento.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                >
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </label>
                            <label className="text-xs font-semibold">
                                Categoria
                                <select
                                    value={formulario.categoria}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "categoria",
                                            evento.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                >
                                    {categorias.map((item) => (
                                        <option key={item}>{item}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold">
                                Adultos
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={formulario.capacidadeadultos}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "capacidadeadultos",
                                            Number(evento.target.value),
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                />
                            </label>
                            <label className="text-xs font-semibold">
                                Crianças
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={formulario.capacidadecriancas}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "capacidadecriancas",
                                            Number(evento.target.value),
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                />
                            </label>
                            <label className="text-xs font-semibold">
                                Status
                                <select
                                    value={formulario.status}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "status",
                                            evento.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                >
                                    {status.map((item) => (
                                        <option key={item} value={item}>
                                            {rotuloStatus[item]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold sm:col-span-2">
                                Descrição
                                <textarea
                                    value={formulario.descricao}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "descricao",
                                            evento.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                    rows={2}
                                />
                            </label>
                            <label className="text-xs font-semibold sm:col-span-2">
                                Comodidades
                                <textarea
                                    value={formulario.comodidades}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "comodidades",
                                            evento.target.value,
                                        )
                                    }
                                    placeholder="Ex.: Ar-condicionado, TV, frigobar"
                                    className="mt-1 w-full rounded-lg border border-[#c1c9bf] px-3 py-2 text-sm font-normal"
                                    rows={2}
                                />
                            </label>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-[#e1e3e4] px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setModalAberta(false)}
                                className="rounded-lg border border-[#c1c9bf] px-4 py-2 text-xs font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={carregando}
                                className="rounded-lg bg-[#053d1e] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            >
                                {carregando ? "Salvando..." : "Salvar quarto"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            <ModalConfirmacao
                aberto={Boolean(quartoParaExcluir)}
                titulo="Excluir quarto"
                mensagem={`Deseja realmente excluir o quarto ${quartoParaExcluir?.numero}? O registro será inativado no banco de dados.`}
                tipo="perigo"
                textoConfirmar="Sim, excluir"
                onConfirmar={confirmarExclusao}
                onCancelar={() => setQuartoParaExcluir(null)}
            />
            {carregando && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs" role="status" aria-live="polite">
                    <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-[#053d1e] shadow-xl">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Processando quarto...
                    </div>
                </div>
            )}
        </div>
    );
};
