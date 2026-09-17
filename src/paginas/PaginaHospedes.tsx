import {
  CheckCircle2,
  Edit2,
  Plus,
  Search,
  Trash2,
  Send,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import React, { useState } from 'react';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';
import { ModalCadastroHospede } from '../componentes/hospedes/ModalCadastroHospede';
import { useHotel } from '../contextos/ContextoHotel';
import { Hospede } from '../tipos';
import { formatarCpf, formatarTelefone } from '../utilitarios/formatadores';

const ITENS_POR_PAGINA = 10;

export const PaginaHospedes: React.FC = () => {
  const { hospedes, cadastrarHospede, editarHospede, excluirHospede, reservas } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [modalNovoAberto, setModalNovoAberto] = useState<boolean>(false);
  const [hospedeEdicao, setHospedeEdicao] = useState<Hospede | null>(null);
  const [hospedeExcluir, setHospedeExcluir] = useState<Hospede | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hospedesFiltrados = hospedes.filter((h) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      h.nomecompleto.toLowerCase().includes(termo) ||
      h.cpf.includes(termo) ||
      h.telefone.includes(termo) ||
      (h.cidade && h.cidade.toLowerCase().includes(termo))
    );
  });

  const totalPaginas = Math.ceil(hospedesFiltrados.length / ITENS_POR_PAGINA) || 1;
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const hospedesPaginados = hospedesFiltrados.slice(
    indiceInicial,
    indiceInicial + ITENS_POR_PAGINA
  );

  const handleAbrirWhatsApp = (h: Hospede) => {
    const numLimpo = (h.whatsapp || h.telefone || '').replace(/\D/g, '');
    if (!numLimpo) return;
    const saudacao = `Olá ${h.nomecompleto}! 🌿 Tudo bem? Entramos em contato a respeito do seu cadastro no Hotel Fazenda Anew.`;
    const url = `https://wa.me/55${numLimpo}?text=${encodeURIComponent(saudacao)}`;
    window.open(url, '_blank');
  };

  const handleAbrirCriacao = () => {
    setHospedeEdicao(null);
    setModalNovoAberto(true);
  };

  const handleAbrirEdicao = (h: Hospede) => {
    setHospedeEdicao(h);
    setModalNovoAberto(true);
  };

  const handleSalvarHospede = async (
    dados: Omit<Hospede, 'hospedeid' | 'datainclusao' | 'dataoperacao' | 'ativo'>,
    hospedeId?: number | string
  ) => {
    if (hospedeId) {
      await editarHospede(hospedeId, dados);
      setFeedback(`Cadastro de ${dados.nomecompleto} atualizado com sucesso.`);
    } else {
      await cadastrarHospede(dados);
      setFeedback(`Hóspede ${dados.nomecompleto} cadastrado com sucesso.`);
    }
    setModalNovoAberto(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmarExclusao = async () => {
    if (hospedeExcluir) {
      const ok = await excluirHospede(hospedeExcluir.hospedeid);
      if (ok) {
        setFeedback(`Hóspede removido com sucesso.`);
      } else {
        setFeedback(`Não é possível excluir hóspede com reservas ativas.`);
      }
      setHospedeExcluir(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Cadastro de Hóspedes & Clientes
            </h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              {hospedes.length} Cadastrados
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Histórico de estadias, preferências alimentares e contatos dos visitantes da Fazenda Anew.
          </p>
        </div>

        <button
          onClick={handleAbrirCriacao}
          className="px-4 py-2 text-xs font-bold bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span> Novo Hóspede</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-[#b8f0c2] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#92c89d] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Busca */}
      <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#717971] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, telefone ou cidade..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
          />
        </div>
      </div>

      {/* Tabela de Hóspedes no padrão Data Grid */}
      <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xs overflow-hidden">
        {hospedesFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 font-['Manrope']">
              Nenhum hóspede encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {busca
                ? 'Tente ajustar os termos pesquisados.'
                : 'Clique no botão acima para cadastrar o primeiro hóspede.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Hóspede Titular</th>
                  <th className="py-3 px-4">Contato / WhatsApp</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4">Estadias</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospedesPaginados.map((h) => {
                  const reservasDoHospede = reservas.filter(
                    (r) => String(r.hospedeid) === String(h.hospedeid)
                  );

                  return (
                    <tr
                      key={h.hospedeid}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 font-mono">
                          #{h.hospedeid}
                        </span>
                      </td>

                      {/* Hóspede */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {h.nomecompleto}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {h.cpf ? formatarCpf(h.cpf) : 'CPF não informado'}
                          </span>
                          {h.alergias_restricoes && (
                            <span
                              className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium inline-block mt-1 max-w-xs truncate"
                              title={`Restrições Alimentares: ${h.alergias_restricoes}`}
                            >
                              ⚠️ {h.alergias_restricoes}
                            </span>
                          )}
                          {h.observacoes && (
                            <span
                              className="text-[10px] text-slate-500 italic block mt-0.5 truncate max-w-xs"
                              title={h.observacoes}
                            >
                              Obs: {h.observacoes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="py-3 px-4">
                        {h.telefone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-700">
                              {formatarTelefone(h.telefone)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAbrirWhatsApp(h)}
                              title="Abrir no WhatsApp com mensagem pronta"
                              className="p-1 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                        {h.email && (
                          <span className="text-[11px] text-slate-400 block">{h.email}</span>
                        )}
                      </td>

                      {/* Localização */}
                      <td className="py-3 px-4">
                        {h.cidade ? (
                          <span className="font-medium text-slate-800 block">
                            {h.cidade} - {h.estado || 'MS'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não informada</span>
                        )}
                      </td>

                      {/* Estadias */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#b8f0c2] inline-block">
                          {reservasDoHospede.length} estadia{reservasDoHospede.length !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicao(h)}
                            title="Editar Cadastro"
                            className="p-1.5 text-[#414941] hover:text-[#053d1e] hover:bg-[#e1e3e4] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHospedeExcluir(h)}
                            title="Excluir Cadastro"
                            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {hospedesFiltrados.length > 0 && (
          <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <span>
                Mostrando <strong className="text-slate-800">{indiceInicial + 1}</strong> a{' '}
                <strong className="text-slate-800">
                  {Math.min(indiceInicial + ITENS_POR_PAGINA, hospedesFiltrados.length)}
                </strong>{' '}
                de <strong className="text-slate-800">{hospedesFiltrados.length}</strong> hóspedes
              </span>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                  disabled={paginaAtual === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numPagina) => {
                  if (
                    numPagina === 1 ||
                    numPagina === totalPaginas ||
                    Math.abs(numPagina - paginaAtual) <= 1
                  ) {
                    return (
                      <button
                        key={numPagina}
                        type="button"
                        onClick={() => setPaginaAtual(numPagina)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          paginaAtual === numPagina
                            ? 'bg-[#053d1e] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {numPagina}
                      </button>
                    );
                  }
                  if (
                    numPagina === paginaAtual - 2 ||
                    numPagina === paginaAtual + 2
                  ) {
                    return (
                      <span key={numPagina} className="px-1 text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  type="button"
                  onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Hóspede com Campos Completos FNRH */}
      <ModalCadastroHospede
        aberto={modalNovoAberto}
        hospedeEdicao={hospedeEdicao}
        onFechar={() => setModalNovoAberto(false)}
        onSalvar={handleSalvarHospede}
      />

      {/* Modal Confirmar Exclusão */}
      <ModalConfirmacao
        aberto={!!hospedeExcluir}
        titulo="Excluir Cadastro"
        mensagem={`Tem certeza que deseja remover o cadastro de ${hospedeExcluir?.nomecompleto}?`}
        tipo="perigo"
        textoConfirmar="Sim, Excluir"
        onConfirmar={handleConfirmarExclusao}
        onCancelar={() => setHospedeExcluir(null)}
      />
    </div>
  );
};
