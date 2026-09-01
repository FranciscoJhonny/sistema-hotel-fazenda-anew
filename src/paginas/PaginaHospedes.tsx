import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  User,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { Hospede } from '../tipos';
import { formatarCpf, formatarTelefone } from '../utilitarios/formatadores';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';

export const PaginaHospedes: React.FC = () => {
  const { hospedes, cadastrarHospede, editarHospede, excluirHospede, reservas } = useHotel();

  const [busca, setBusca] = useState<string>('');
  const [modalNovoAberto, setModalNovoAberto] = useState<boolean>(false);
  const [hospedeEdicao, setHospedeEdicao] = useState<Hospede | null>(null);
  const [hospedeExcluir, setHospedeExcluir] = useState<Hospede | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Campos do formulário
  const [nome, setNome] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [cidade, setCidade] = useState<string>('Campo Grande');
  const [estado, setEstado] = useState<string>('MS');
  const [observacoes, setObservacoes] = useState<string>('');

  const hospedesFiltrados = hospedes.filter((h) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      h.NomeCompleto.toLowerCase().includes(termo) ||
      h.Cpf.includes(termo) ||
      h.Telefone.includes(termo) ||
      (h.Cidade && h.Cidade.toLowerCase().includes(termo))
    );
  });

  const handleAbrirCriacao = () => {
    setHospedeEdicao(null);
    setNome('');
    setCpf('');
    setTelefone('');
    setWhatsapp('');
    setEmail('');
    setCidade('Campo Grande');
    setEstado('MS');
    setObservacoes('');
    setModalNovoAberto(true);
  };

  const handleAbrirEdicao = (h: Hospede) => {
    setHospedeEdicao(h);
    setNome(h.NomeCompleto);
    setCpf(h.Cpf);
    setTelefone(h.Telefone);
    setWhatsapp(h.WhatsApp || h.Telefone);
    setEmail(h.Email || '');
    setCidade(h.Cidade || '');
    setEstado(h.Estado || 'MS');
    setObservacoes(h.Observacoes || '');
    setModalNovoAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) return;

    if (hospedeEdicao) {
      editarHospede(hospedeEdicao.HospedeId, {
        NomeCompleto: nome,
        Cpf: cpf || hospedeEdicao.Cpf,
        Telefone: telefone,
        WhatsApp: whatsapp,
        Email: email,
        Cidade: cidade,
        Estado: estado,
        Observacoes: observacoes,
      });
      setFeedback(`Cadastro de ${nome} atualizado com sucesso.`);
    } else {
      cadastrarHospede({
        NomeCompleto: nome,
        Cpf: cpf || '000.000.000-00',
        Telefone: telefone,
        WhatsApp: whatsapp,
        Email: email,
        Cidade: cidade,
        Estado: estado,
        Observacoes: observacoes,
      });
      setFeedback(`Hóspede ${nome} cadastrado com sucesso.`);
    }

    setModalNovoAberto(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmarExclusao = () => {
    if (hospedeExcluir) {
      const ok = excluirHospede(hospedeExcluir.HospedeId);
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
          <span>+ Novo Hóspede</span>
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
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f8f9fa] border border-[#c1c9bf] rounded-lg focus:outline-none focus:border-[#053d1e]"
          />
        </div>
      </div>

      {/* Grid de Hóspedes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hospedesFiltrados.map((h) => {
          const reservasDoHospede = reservas.filter((r) => String(r.HospedeId) === String(h.HospedeId));

          return (
            <div
              key={h.HospedeId}
              className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between pb-2 border-b border-[#e1e3e4]">
                  <div>
                    <h3 className="font-['Manrope'] font-bold text-sm text-[#191c1d]">
                      {h.NomeCompleto}
                    </h3>
                    <p className="text-[11px] text-[#717971]">CPF: {formatarCpf(h.Cpf)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333]">
                    {reservasDoHospede.length} estadia{reservasDoHospede.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1.5 mt-3 text-xs text-[#414941]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#053d1e]" />
                    <span>{formatarTelefone(h.Telefone)}</span>
                  </div>
                  {h.Email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#053d1e]" />
                      <span className="truncate">{h.Email}</span>
                    </div>
                  )}
                  {h.Cidade && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#053d1e]" />
                      <span>{h.Cidade} - {h.Estado || 'MS'}</span>
                    </div>
                  )}
                  {h.Observacoes && (
                    <div className="p-2 bg-[#f8f9fa] rounded-lg text-[11px] text-[#414941] mt-2">
                      <span className="font-semibold text-[#191c1d]">Obs: </span>
                      {h.Observacoes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-[#e1e3e4]">
                <button
                  onClick={() => handleAbrirEdicao(h)}
                  className="p-1.5 text-[#414941] hover:text-[#053d1e] hover:bg-[#e1e3e4] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => setHospedeExcluir(h)}
                  className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar Hóspede */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#c1c9bf] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e1e3e4]">
              <h3 className="font-['Manrope'] text-lg font-bold text-[#191c1d]">
                {hospedeEdicao ? 'Editar Hóspede' : 'Novo Cadastro de Hóspede'}
              </h3>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="text-[#717971] hover:text-[#191c1d] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#414941] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                  placeholder="Ex: Carlos Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#414941] mb-1">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))}
                    className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#414941] mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                    placeholder="(67) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#414941] mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#414941] mb-1">Cidade</label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#414941] mb-1">Estado</label>
                  <input
                    type="text"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#414941] mb-1">Observações / Restrições</label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full p-2 border border-[#c1c9bf] rounded-lg"
                  placeholder="Ex: Alergias, preferência por andar térreo, aniversário..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e1e3e4]">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 border border-[#c1c9bf] text-[#414941] rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#053d1e] hover:bg-[#225533] text-white rounded-lg font-bold cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      <ModalConfirmacao
        aberto={!!hospedeExcluir}
        titulo="Excluir Cadastro"
        mensagem={`Tem certeza que deseja remover o cadastro de ${hospedeExcluir?.NomeCompleto}?`}
        tipo="perigo"
        textoConfirmar="Sim, Excluir"
        onConfirmar={handleConfirmarExclusao}
        onCancelar={() => setHospedeExcluir(null)}
      />
    </div>
  );
};
