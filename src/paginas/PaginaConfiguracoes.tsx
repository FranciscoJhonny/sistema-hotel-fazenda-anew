import React, { useState } from 'react';
import {
  Settings,
  Database,
  Clock,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  Copy,
  RotateCcw,
  ShieldCheck,
  Baby,
  Users,
  CreditCard,
  Percent,
} from 'lucide-react';
import { useHotel } from '../contextos/ContextoHotel';
import { SCRIPT_SQL_SCHEMA_SUPABASE, resetarClienteSupabase } from '../lib/supabaseCliente';
import { ModalConfirmacao } from '../componentes/comuns/ModalConfirmacao';

export const PaginaConfiguracoes: React.FC = () => {
  const { configuracoes, salvarConfiguracoes, restaurarDadosPadrao } = useHotel();

  // Estados locais do formulário - Identificação do Hotel
  const [nomeHotel, setNomeHotel] = useState<string>(configuracoes?.HotelNome || 'Hotel Fazenda Anew');
  const [localizacao, setLocalizacao] = useState<string>(
    configuracoes?.HotelLocalizacao || 'Corguinho - Mato Grosso do Sul - Brasil'
  );
  const [telefoneHotel, setTelefoneHotel] = useState<string>(
    configuracoes?.TelefoneHotel || '(67) 3251-1234'
  );
  const [emailHotel, setEmailHotel] = useState<string>(
    configuracoes?.EmailHotel || 'contato@fazendaanew.com.br'
  );

  // Estados locais - Horários Padrão
  const [checkinHora, setCheckinHora] = useState<string>(configuracoes?.CheckInTime || '09:00');
  const [checkoutHora, setCheckoutHora] = useState<string>(configuracoes?.CheckOutTime || '15:00');

  // Estados locais - Regras de Desconto para Crianças
  const [criancaLimiteGratis, setCriancaLimiteGratis] = useState<number>(
    Number(configuracoes?.CriancaIdadeLimiteGratis) || 5
  );
  const [criancaLimiteMeia, setCriancaLimiteMeia] = useState<number>(
    Number(configuracoes?.CriancaIdadeLimiteMeia) || 11
  );
  const [criancaLimiteIntegral, setCriancaLimiteIntegral] = useState<number>(
    Number(configuracoes?.CriancaIdadeIntegral) || 12
  );
  const [criancaPorcentagemMeia, setCriancaPorcentagemMeia] = useState<number>(
    Number(configuracoes?.CriancaPorcentagemMeiaDiaria) || 50
  );
  const [criancaDescontoGratis, setCriancaDescontoGratis] = useState<number>(
    Number(configuracoes?.CriancaDescontoGratis) || 100
  );

  // Estados locais - Capacidade dos Quartos
  const [capacidadeMaxAdultos, setCapacidadeMaxAdultos] = useState<number>(
    Number(configuracoes?.CapacidadeMaximaAdultosPorQuarto) || 4
  );
  const [capacidadeMaxCriancas, setCapacidadeMaxCriancas] = useState<number>(
    Number(configuracoes?.CapacidadeMaximaCriancasPorQuarto) || 3
  );

  // Estados locais - Configurações de Pagamento
  const [formaPagamentoPadrao, setFormaPagamentoPadrao] = useState<string>(
    configuracoes?.FormaPagamentoPadrao || 'PIX'
  );
  const [porcentagemEntradaMinima, setPorcentagemEntradaMinima] = useState<number>(
    Number(configuracoes?.PorcentagemEntradaMinima) || 30
  );

  // Supabase
  const [supabaseUrl, setSupabaseUrl] = useState<string>(
    localStorage.getItem('anew_supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState<string>(
    localStorage.getItem('anew_supabase_key') || ''
  );

  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [modalResetAberto, setModalResetAberto] = useState<boolean>(false);

  const handleSalvarConfiguracoes = (e: React.FormEvent) => {
    e.preventDefault();

    salvarConfiguracoes({
      // Identificação
      HotelNome: nomeHotel,
      HotelLocalizacao: localizacao,
      TelefoneHotel: telefoneHotel,
      EmailHotel: emailHotel,

      // Horários
      CheckInTime: checkinHora,
      CheckOutTime: checkoutHora,

      // Regras de Desconto para Crianças
      CriancaIdadeLimiteGratis: criancaLimiteGratis,
      CriancaIdadeLimiteMeia: criancaLimiteMeia,
      CriancaIdadeIntegral: criancaLimiteIntegral,
      CriancaPorcentagemMeiaDiaria: criancaPorcentagemMeia,
      CriancaDescontoGratis: criancaDescontoGratis,

      // Capacidade dos Quartos
      CapacidadeMaximaAdultosPorQuarto: capacidadeMaxAdultos,
      CapacidadeMaximaCriancasPorQuarto: capacidadeMaxCriancas,

      // Configurações de Pagamento
      FormaPagamentoPadrao: formaPagamentoPadrao,
      PorcentagemEntradaMinima: porcentagemEntradaMinima,
    });

    if (supabaseUrl && supabaseKey) {
      resetarClienteSupabase(supabaseUrl, supabaseKey);
    }

    setFeedback('Todas as configurações foram salvas com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(SCRIPT_SQL_SCHEMA_SUPABASE);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleConfirmarReset = () => {
    restaurarDadosPadrao();
    setModalResetAberto(false);
    setFeedback('Dados operacionais padrão restaurados com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabeçalho */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-['Manrope'] text-xl font-bold text-[#191c1d]">
              Configurações do Sistema
            </h1>
            <span className="text-xs font-bold text-[#053d1e] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#b8f0c2]">
              Administração
            </span>
          </div>
          <p className="text-xs text-[#717971] mt-1">
            Parâmetros de horários, regras para crianças, capacidade dos quartos e integração com banco de dados.
          </p>
        </div>

        <button
          onClick={() => setModalResetAberto(true)}
          className="px-3.5 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6] border border-[#ffdad6] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Dados Padrão</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-[#b8f0c2] text-[#00210d] px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-[#92c89d] shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-[#053d1e] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Formulário Principal de Configurações */}
      <form onSubmit={handleSalvarConfiguracoes} className="space-y-6">
        {/* 2. IDENTIFICAÇÃO & LOCALIZAÇÃO OFICIAL (com Telefone e Email) */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e1e3e4]">
            <Building2 className="w-5 h-5 text-[#053d1e]" />
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
              Identificação & Localização Oficial
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Nome da Propriedade
              </label>
              <input
                type="text"
                required
                value={nomeHotel}
                onChange={(e) => setNomeHotel(e.target.value)}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-bold text-[#191c1d]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Localização (Município / Estado / País)
              </label>
              <input
                type="text"
                required
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1 text-[#717971]" />
                Telefone da Fazenda
              </label>
              <input
                type="text"
                value={telefoneHotel}
                onChange={(e) => setTelefoneHotel(e.target.value)}
                placeholder="(67) 3251-1234"
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                <Mail className="w-3.5 h-3.5 inline mr-1 text-[#717971]" />
                E-mail de Contato
              </label>
              <input
                type="email"
                value={emailHotel}
                onChange={(e) => setEmailHotel(e.target.value)}
                placeholder="contato@fazendaanew.com.br"
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa]"
              />
            </div>
          </div>
        </div>

        {/* 3. HORÁRIOS PADRÃO */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e1e3e4]">
            <Clock className="w-5 h-5 text-[#053d1e]" />
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
              Regras de Horários Oficiais
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Horário Padrão de Check-in (Entrada)
              </label>
              <input
                type="time"
                value={checkinHora}
                onChange={(e) => setCheckinHora(e.target.value)}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-bold"
              />
              <p className="text-[11px] text-[#717971] mt-1">
                Horário padrão sugerido ao criar novas reservas (padrão: 09:00).
              </p>
            </div>
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Horário Padrão de Check-out (Saída)
              </label>
              <input
                type="time"
                value={checkoutHora}
                onChange={(e) => setCheckoutHora(e.target.value)}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa] font-bold"
              />
              <p className="text-[11px] text-[#717971] mt-1">
                Horário limite para liberação e desocupação do quarto (padrão: 15:00).
              </p>
            </div>
          </div>
        </div>

        {/* 4. REGRAS DE DESCONTO PARA CRIANÇAS */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e1e3e4]">
            <Baby className="w-5 h-5 text-[#053d1e]" />
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
              Regras de Desconto para Crianças
            </h3>
            <span className="text-[10px] font-bold text-[#735c00] bg-[#ffe088] px-2 py-0.5 rounded-full ml-auto">
              Política de Preços
            </span>
          </div>

          <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  <span className="text-[#137333]">🟢</span> Idade Máxima para Grátis
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="17"
                    value={criancaLimiteGratis}
                    onChange={(e) => setCriancaLimiteGratis(Number(e.target.value))}
                    className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
                  />
                  <span className="text-[#717971] whitespace-nowrap">anos</span>
                </div>
                <p className="text-[11px] text-[#717971] mt-1">
                  Crianças de 0 a {criancaLimiteGratis} anos não pagam
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  <span className="text-[#eaa300]">🟡</span> Idade Máxima para Meia
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="17"
                    value={criancaLimiteMeia}
                    onChange={(e) => setCriancaLimiteMeia(Number(e.target.value))}
                    className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
                  />
                  <span className="text-[#717971] whitespace-nowrap">anos</span>
                </div>
                <p className="text-[11px] text-[#717971] mt-1">
                  Crianças de {criancaLimiteGratis + 1} a {criancaLimiteMeia} anos pagam meia
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  <span className="text-[#ba1a1a]">🔴</span> Idade Integral (Adulto)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="17"
                    value={criancaLimiteIntegral}
                    onChange={(e) => setCriancaLimiteIntegral(Number(e.target.value))}
                    className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
                  />
                  <span className="text-[#717971] whitespace-nowrap">anos</span>
                </div>
                <p className="text-[11px] text-[#717971] mt-1">
                  A partir de {criancaLimiteIntegral} anos paga valor integral
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-[#e1e3e4]">
              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  <Percent className="w-3.5 h-3.5 inline text-[#eaa300]" /> Porcentagem da Meia-diária
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={criancaPorcentagemMeia}
                    onChange={(e) => setCriancaPorcentagemMeia(Number(e.target.value))}
                    className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
                  />
                  <span className="text-[#717971]">%</span>
                </div>
                <p className="text-[11px] text-[#717971] mt-1">
                  Crianças na faixa de meia pagam {criancaPorcentagemMeia}% do valor da diária
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#414941] mb-1">
                  <Percent className="w-3.5 h-3.5 inline text-[#137333]" /> Desconto para Grátis
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={criancaDescontoGratis}
                    disabled
                    className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f3f4f5] font-bold text-[#137333]"
                  />
                  <span className="text-[#717971]">%</span>
                </div>
                <p className="text-[11px] text-[#717971] mt-1">
                  Desconto fixo de {criancaDescontoGratis}% para crianças grátis
                </p>
              </div>
            </div>

            {/* Resumo das Regras */}
            <div className="bg-[#e6f4ea] border border-[#b8f0c2] rounded-lg p-3 text-xs">
              <p className="font-bold text-[#053d1e]">📋 Resumo das Regras:</p>
              <ul className="list-disc list-inside text-[#414941] mt-1 space-y-0.5">
                <li>
                  <span className="text-[#137333] font-bold">Grátis:</span> 0 a {criancaLimiteGratis} anos{' '}
                  <span className="text-[#717971] ml-1">(desconto de {criancaDescontoGratis}%)</span>
                </li>
                <li>
                  <span className="text-[#eaa300] font-bold">Meia-diária:</span> {criancaLimiteGratis + 1} a {criancaLimiteMeia} anos{' '}
                  <span className="text-[#717971] ml-1">({criancaPorcentagemMeia}% do valor)</span>
                </li>
                <li>
                  <span className="text-[#ba1a1a] font-bold">Integral:</span> A partir de {criancaLimiteIntegral} anos{' '}
                  <span className="text-[#717971] ml-1">(100% do valor da diária)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 5. CAPACIDADE DOS QUARTOS */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e1e3e4]">
            <Users className="w-5 h-5 text-[#053d1e]" />
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
              Capacidade Máxima dos Quartos
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Máximo de Adultos por Quarto
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={capacidadeMaxAdultos}
                onChange={(e) => setCapacidadeMaxAdultos(Number(e.target.value))}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
              />
              <p className="text-[11px] text-[#717971] mt-1">
                Quantos adultos podem ficar em um único quarto
              </p>
            </div>
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Máximo de Crianças por Quarto
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={capacidadeMaxCriancas}
                onChange={(e) => setCapacidadeMaxCriancas(Number(e.target.value))}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
              />
              <p className="text-[11px] text-[#717971] mt-1">
                Quantas crianças podem ficar em um único quarto
              </p>
            </div>
          </div>
        </div>

        {/* 6. CONFIGURAÇÕES DE PAGAMENTO */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e1e3e4]">
            <CreditCard className="w-5 h-5 text-[#053d1e]" />
            <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
              Configurações de Pagamento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Forma de Pagamento Padrão
              </label>
              <select
                value={formaPagamentoPadrao}
                onChange={(e) => setFormaPagamentoPadrao(e.target.value)}
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
              >
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="TRANSFERENCIA">Transferência Bancária</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Porcentagem Mínima de Entrada
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={porcentagemEntradaMinima}
                  onChange={(e) => setPorcentagemEntradaMinima(Number(e.target.value))}
                  className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-white font-bold"
                />
                <span className="text-[#717971]">%</span>
              </div>
              <p className="text-[11px] text-[#717971] mt-1">
                Percentual mínimo a ser pago no momento da reserva
              </p>
            </div>
          </div>
        </div>

        {/* 7. INTEGRAÇÃO SUPABASE / SQL SERVER */}
        <div className="bg-white border border-[#c1c9bf] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e1e3e4]">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#053d1e]" />
              <h3 className="font-['Manrope'] text-base font-bold text-[#191c1d]">
                Conexão com Banco de Dados Supabase (PostgreSQL) / SQL Server
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> PascalCase Ativo
            </span>
          </div>

          <p className="text-xs text-[#717971]">
            O sistema armazena todos os 13 quartos (B1-B4, C2-C4, D1-D6), hóspedes e reservas localmente com persistência automática e permite sincronização direta com o seu banco SQL.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Supabase URL do Projeto:
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://exemplo.supabase.co"
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#414941] mb-1">
                Supabase Anon Public API Key:
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-2.5 border border-[#c1c9bf] rounded-lg bg-[#f8f9fa]"
              />
            </div>
          </div>

          {/* Script SQL para Deploy no Supabase */}
          <div className="mt-4 pt-4 border-t border-[#e1e3e4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#191c1d]">
                Script SQL Completo para o Supabase SQL Editor / SQL Server:
              </span>
              <button
                type="button"
                onClick={handleCopiarSql}
                className="px-3 py-1.5 rounded-lg border border-[#c1c9bf] bg-[#f8f9fa] hover:bg-[#e1e3e4] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiado ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
                    <span className="text-[#137333]">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-[#191c1d] text-[#e1e3e4] p-3 rounded-xl text-[11px] font-mono max-h-44 overflow-y-auto overflow-x-auto">
                {SCRIPT_SQL_SCHEMA_SUPABASE}
              </pre>
            </div>
          </div>
        </div>

        {/* 8. BOTÃO DE SALVAR */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-[#053d1e] hover:bg-[#225533] text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            Salvar Todas as Configurações
          </button>
        </div>
      </form>

      {/* Modal de Reset */}
      <ModalConfirmacao
        aberto={modalResetAberto}
        titulo="Restaurar Dados Padrão"
        mensagem="Deseja resetar todas as alterações e recarregar os 13 quartos originais (B1-B4, C2-C4, D1-D6), reservas e hóspedes de teste do Hotel Fazenda Anew?"
        tipo="aviso"
        textoConfirmar="Sim, Restaurar"
        onConfirmar={handleConfirmarReset}
        onCancelar={() => setModalResetAberto(false)}
      />
    </div>
  );
};
