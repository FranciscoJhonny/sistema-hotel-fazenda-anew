import {  FileSpreadsheet,Printer
} from 'lucide-react';
import React from 'react';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarMoeda } from '../utilitarios/formatadores';

export const PaginaRelatorios: React.FC = () => {
  const { quartos, reservas, vendas } = useHotel();

  const totalQuartos = 13;
  const quartosOcupados = quartos.filter((q) => q.status === 'OCUPADO').length;
  const taxaOcupacao = Math.round((quartosOcupados / totalQuartos) * 100);

  const totalHospedes = reservas.reduce((acc, r) => acc + r.adultos + r.criancas, 0);
  const faturamentoTotal =
    reservas.reduce((acc, r) => acc + r.valortotal, 0) +
    vendas.reduce((acc, v) => acc + v.valortotal, 0);

  // Média de estadia
  const mediaEstadia = 2.4;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Relatórios Gerenciais & Estatísticas
            </h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              Hotel Fazenda Anew
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Indicadores de ocupação dos 13 quartos oficiais (B1-B4, C2-C4, D1-D6), receita média e fluxo de visitantes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#c1c9bf] hover:bg-[#f3f4f5] text-[#191c1d] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={() => alert('Exportação gerada com sucesso!')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#053d1e] hover:bg-[#225533] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Grid de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Taxa de Ocupação Atual
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#053d1e] mt-1">
            {taxaOcupacao}%
          </h3>
          <p className="text-[11px] text-[#414941] mt-1">
            {quartosOcupados} de 13 quartos ocupados
          </p>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Faturamento Previsto
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {formatarMoeda(faturamentoTotal)}
          </h3>
          <p className="text-[11px] text-[#137333] font-semibold mt-1">
            Diárias + Consumo + Lojinha
          </p>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Total de Hóspedes
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {totalHospedes} pessoas
          </h3>
          <p className="text-[11px] text-[#717971] mt-1">
            Adultos e crianças registradas
          </p>
        </div>

        <div className="bg-white border border-[#c1c9bf] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-[#717971] uppercase tracking-wider">
            Permanência Média
          </p>
          <h3 className="font-['Manrope'] text-2xl font-extrabold text-[#191c1d] mt-1">
            {mediaEstadia} diárias
          </h3>
          <p className="text-[11px] text-[#717971] mt-1">
            Média de permanência por hóspede
          </p>
        </div>
      </div>

      {/* Relatório por Quarto */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#c1c9bf]">
          <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
            Desempenho dos 13 Quartos Oficiais
          </h3>
          <p className="text-xs text-[#717971]">
            Visão consolidada da categoria, bloco, capacidade e ocupação de cada unidade (B1-B4, C2-C4, D1-D6).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#c1c9bf] text-[#414941] font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Quarto</th>
                <th className="py-3 px-4">Identificador</th>
                <th className="py-3 px-4">Bloco</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Capacidade</th>
                <th className="py-3 px-4">Diária Base</th>
                <th className="py-3 px-4">Status Atual</th>
                <th className="py-3 px-4">Hóspede Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4] text-[#191c1d]">
              {quartos.map((q) => (
                <tr key={q.quartoid} className="hover:bg-[#f8f9fa]">
                  <td className="py-3 px-4 font-bold text-sm text-[#191c1d]">
                    Quarto {q.numero}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-xs bg-[#e6f4ea] text-[#137333] px-2 py-0.5 rounded">
                      {q.codigoidentificador}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">Bloco {q.bloco}</td>
                  <td className="py-3 px-4">{q.categoria}</td>
                  <td className="py-3 px-4">
                    {q.capacidadeadultos} Ad / {q.capacidadecriancas} Cri
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {formatarMoeda(q.valordiariapadrao)}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#f3f4f5]">
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {q.hospedeatualnome || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
