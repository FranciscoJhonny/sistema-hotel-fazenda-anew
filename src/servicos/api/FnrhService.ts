import { apiCliente } from './apiCliente';
import { CadastroFnrh, CadastroFnrhAcompanhante } from '../../tipos';
import { calcularIdadeNumerica } from '../../utilitarios/formatadores';
import { ResultadoSupabase } from './types';
import { montarUrlPublicaFnrh, obterOrigemAplicacao } from '../../utilitarios/urls';

export interface IFnrhService {
  listarCadastrosFnrh(): Promise<ResultadoSupabase<CadastroFnrh[]>>;
  obterPorToken(token: string): Promise<ResultadoSupabase<CadastroFnrh>>;
  preencherFnrhPublica(token: string, dados: any): Promise<ResultadoSupabase<any>>;
  gerarNovoLinkFnrh(parametros?: any): Promise<any>;
  confirmarSinalFnrh(parametros: any): Promise<any>;
  cancelarCadastroFnrh(cadastroid: number, usuarioId?: number | string): Promise<any>;
  excluirCadastroFnrh(cadastroid: number): Promise<any>;
  vincularReservaAoCadastroFnrh(parametros: any): Promise<any>;
  atualizarCadastroFnrh(
    cadastroid: number,
    dados: Partial<CadastroFnrh>,
    acompanhantes?: any[],
    usuarioId?: number | string
  ): Promise<any>;
}

/**
 * Retorna a origem atual da URL de forma segura (tanto no browser quanto em SSR).
 * Compatível com execução local (localhost), homologação e produção (Vercel).
 */
export const obterOrigemUrl = obterOrigemAplicacao;

/**
 * Monta o link público absoluto para o cliente preencher a FNRH.
 * Exemplo local: http://localhost:3000/fnrh/<token>
 * Exemplo produção: https://hotelfazendaanew.com.br/fnrh/<token>
 */
export const gerarLinkPublicoFnrh = (tokenOuLink?: string | null): string => {
  return montarUrlPublicaFnrh(tokenOuLink);
};

/**
 * Gera um token hexadecimal aleatório de 32 caracteres (equivalente a MD5).
 */
export const gerarTokenAleatorio = (): string => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  ).substring(0, 32);
};

export class FnrhService {
  /**
   * Lista todos os registros de cadastro FNRH ordenados do mais recente para o mais antigo.
   * Já carrega os acompanhantes vinculados a cada cadastro.
   * Consome exclusivamente a API REST C# .NET 8 (/api/fnrh/get-lista-fnrh).
   */
  public static async listarCadastrosFnrh(): Promise<{ sucesso: boolean; dados: CadastroFnrh[]; erro?: string }> {
    try {
      const resApi = await apiCliente.get<any[]>('/api/fnrh/get-lista-fnrh');
      if (resApi.sucesso && Array.isArray(resApi.dados)) {
        const resultado: CadastroFnrh[] = resApi.dados.map((c: any) => ({
          cadastroid: Number(c.cadastroid || c.cadastroId),
          status: c.status,
          token_acesso: c.token_acesso || c.tokenAcesso || '',
          token_expira_em: c.token_expira_em || c.tokenExpiraEm || '',
          hospedeid: (c.hospedeid || c.hospedeId) ? Number(c.hospedeid || c.hospedeId) : null,
          reservaid: (c.reservaid || c.reservaId) ? Number(c.reservaid || c.reservaId) : null,
          nomecompleto: c.nomecompleto || c.nomeCompleto || '',
          cpf: c.cpf || '',
          rg: c.rg || '',
          passaporte: c.passaporte || '',
          datanascimento: c.datanascimento || c.dataNascimento || '',
          nacionalidade: c.nacionalidade || 'Brasileira',
          sexo: c.sexo || '',
          telefone: c.telefone || '',
          email: c.email || '',
          endereco: c.endereco || '',
          numero: c.numero || '',
          cidade: c.cidade || '',
          estado: c.estado || '',
          cep: c.cep || '',
          profissao: c.profissao || '',
          proximodestino: c.proximodestino || c.proximoDestino || '',
          ultimaprocedencia: c.ultimaprocedencia || c.ultimaProcedencia || '',
          cpfresponsavelmenor: c.cpfresponsavelmenor || c.cpfResponsavelMenor || '',
          dataentrada: c.dataentrada || c.dataEntrada || '',
          horarioprevistochegada: c.horarioprevistochegada || c.horarioPrevistoChegada || '',
          datasaida: c.datasaida || c.dataSaida || '',
          horarioprevistasaida: c.horarioprevistasaida || c.horarioPrevistoSaida || '',
          motivoviagem: c.motivoviagem || c.motivoViagem || '',
          transporte: c.transporte || '',
          placa: c.placa || '',
          modelocor: c.modelocor || c.modeloCor || '',
          numerohospedes: Number(c.numerohospedes || c.numeroHospedes || 1),
          adultos: Number(c.adultos || 1),
          criancas: Number(c.criancas || 0),
          forma_pagamento: c.forma_pagamento || c.formaPagamento || '',
          valor_sinal: Number(c.valor_sinal || c.valorSinal || 0),
          comprovante_url: c.comprovante_url || c.comprovanteUrl || '',
          pagamento_confirmado_em: c.pagamento_confirmado_em || c.pagamentoConfirmadoEm || '',
          pagamento_confirmado_por: (c.pagamento_confirmado_por || c.pagamentoConfirmadoPor)
            ? Number(c.pagamento_confirmado_por || c.pagamentoConfirmadoPor)
            : null,
          alergias_restricoes: c.alergias_restricoes || c.alergiasRestricoes || '',
          solicitacoes_especiais: c.solicitacoes_especiais || c.solicitacoesEspeciais || '',
          declaracao_aceita: Boolean(c.declaracao_aceita !== undefined ? c.declaracao_aceita : c.declaracaoAceita),
          data_declaracao: c.data_declaracao || c.dataDeclaracao || '',
          assinatura_url: c.assinatura_url || c.assinaturaUrl || '',
          datainclusao: c.datainclusao || c.dataInclusao || '',
          dataoperacao: c.dataoperacao || c.dataOperacao || '',
          usuariooperacao: (c.usuariooperacao || c.usuarioOperacao) ? Number(c.usuariooperacao || c.usuarioOperacao) : undefined,
          naturezaoperacao: c.naturezaoperacao || c.naturezaOperacao || 'INSERT',
          acompanhantes: Array.isArray(c.acompanhantes)
            ? c.acompanhantes.map((a: any) => ({
                acompanhanteid: Number(a.acompanhanteid || a.acompanhanteId),
                cadastroid: Number(a.cadastroid || a.cadastroId),
                reservaid: (a.reservaid || a.reservaId) ? Number(a.reservaid || a.reservaId) : null,
                nomecompleto: a.nomecompleto || a.nomeCompleto || '',
                documento: a.documento || '',
                datanascimento: a.datanascimento || a.dataNascimento || '',
                menoridade: Boolean(a.menoridade),
                cpfresponsavel: a.cpfresponsavel || a.cpfResponsavel || '',
                autorizacao_url: a.autorizacao_url || a.autorizacaoUrl || '',
                autorizacao_validada: Boolean(a.autorizacao_validada !== undefined ? a.autorizacao_validada : a.autorizacaoValidada),
                observacoes: a.observacoes || '',
                datainclusao: a.datainclusao || a.dataInclusao || '',
              }))
            : [],
        }));

        return { sucesso: true, dados: resultado };
      }

      return {
        sucesso: false,
        dados: [],
        erro: resApi.erro || 'Falha ao buscar cadastros FNRH na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao listar cadastros FNRH:', errApi);
      return {
        sucesso: false,
        dados: [],
        erro: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  /**
   * Obtém os dados de um cadastro FNRH pelo seu token público de acesso.
   */
  public static async obterPorToken(token: string): Promise<ResultadoSupabase<CadastroFnrh>> {
    try {
      const resApi = await apiCliente.get<any>(`/api/fnrh/get-fnrh-por-token/${encodeURIComponent(token)}`);
      if (resApi.sucesso && resApi.dados) {
        const c = resApi.dados;
        const cadastroMapeado: CadastroFnrh = {
          ...c,
          cadastroid: Number(c.cadastroid || c.cadastroId),
          status: c.status,
          token_acesso: c.token_acesso || c.tokenAcesso || token,
          token_expira_em: c.token_expira_em || c.tokenExpiraEm,
          hospedeid: (c.hospedeid || c.hospedeId) ? Number(c.hospedeid || c.hospedeId) : null,
          reservaid: (c.reservaid || c.reservaId) ? Number(c.reservaid || c.reservaId) : null,
          nomecompleto: c.nomecompleto || c.nomeCompleto || '',
          cpf: c.cpf || '',
          rg: c.rg || '',
          passaporte: c.passaporte || '',
          datanascimento: c.datanascimento || c.dataNascimento || '',
          nacionalidade: c.nacionalidade || 'Brasileira',
          sexo: c.sexo || '',
          telefone: c.telefone || '',
          email: c.email || '',
          endereco: c.endereco || '',
          numero: c.numero || '',
          cidade: c.cidade || '',
          estado: c.estado || '',
          cep: c.cep || '',
          profissao: c.profissao || '',
          proximodestino: c.proximodestino || c.proximoDestino || '',
          ultimaprocedencia: c.ultimaprocedencia || c.ultimaProcedencia || '',
          cpfresponsavelmenor: c.cpfresponsavelmenor || c.cpfResponsavelMenor || '',
          dataentrada: c.dataentrada || c.dataEntrada || '',
          horarioprevistochegada: c.horarioprevistochegada || c.horarioPrevistoChegada || '',
          datasaida: c.datasaida || c.dataSaida || '',
          horarioprevistasaida: c.horarioprevistasaida || c.horarioPrevistoSaida || '',
          motivoviagem: c.motivoviagem || c.motivoViagem || '',
          transporte: c.transporte || '',
          placa: c.placa || '',
          modelocor: c.modelocor || c.modeloCor || '',
          numerohospedes: Number(c.numerohospedes || c.numeroHospedes || 1),
          adultos: Number(c.adultos || 1),
          criancas: Number(c.criancas || 0),
          forma_pagamento: c.forma_pagamento || c.formaPagamento || '',
          valor_sinal: Number(c.valor_sinal || c.valorSinal || 0),
          comprovante_url: c.comprovante_url || c.comprovanteUrl || '',
          pagamento_confirmado_em: c.pagamento_confirmado_em || c.pagamentoConfirmadoEm || '',
          alergias_restricoes: c.alergias_restricoes || c.alergiasRestricoes || '',
          solicitacoes_especiais: c.solicitacoes_especiais || c.solicitacoesEspeciais || '',
          declaracao_aceita: Boolean(c.declaracao_aceita !== undefined ? c.declaracao_aceita : (c.declaracaoAceita !== undefined ? c.declaracaoAceita : c.declaracaoaceita)),
          data_declaracao: c.data_declaracao || c.dataDeclaracao || '',
          assinatura_url: c.assinatura_url || c.assinaturaUrl || '',
          acompanhantes: Array.isArray(c.acompanhantes)
            ? c.acompanhantes.map((a: any) => ({
                acompanhanteid: Number(a.acompanhanteid || a.acompanhanteId),
                cadastroid: Number(a.cadastroid || a.cadastroId),
                reservaid: (a.reservaid || a.reservaId) ? Number(a.reservaid || a.reservaId) : null,
                nomecompleto: a.nomecompleto || a.nomeCompleto || '',
                documento: a.documento || '',
                datanascimento: a.datanascimento || a.dataNascimento || '',
                menoridade: Boolean(a.menoridade),
                cpfresponsavel: a.cpfresponsavel || a.cpfResponsavel || '',
                autorizacao_url: a.autorizacao_url || a.autorizacaoUrl || '',
                autorizacao_validada: Boolean(a.autorizacao_validada !== undefined ? a.autorizacao_validada : a.autorizacaoValidada),
                observacoes: a.observacoes || '',
                datainclusao: a.datainclusao || a.dataInclusao || '',
              }))
            : [],
        };
        return { sucesso: true, dados: cadastroMapeado };
      }

      return {
        sucesso: false,
        erro: resApi.erro || 'Cadastro FNRH não encontrado na API .NET.',
      };
    } catch (e: any) {
      console.error('[FnrhService] Erro ao buscar FNRH por token:', e);
      return { sucesso: false, erro: e?.message || 'Erro inesperado ao consultar FNRH na API.' };
    }
  }

  /**
   * Salva o preenchimento público da ficha FNRH realizado pelo hóspede via link único.
   */
  public static async preencherFnrhPublica(token: string, dados: any): Promise<ResultadoSupabase<any>> {
    try {
      const fonte = (dados?.p_dados || dados?.dados || dados) || {};
      const acompanhantesFonte = dados?.p_acompanhantes || dados?.acompanhantes || fonte.acompanhantes || [];

      const payloadApi: Record<string, any> = {
        nomeCompleto: fonte.nomecompleto !== undefined ? String(fonte.nomecompleto).trim() : (fonte.nomeCompleto || null),
        cpf: fonte.cpf !== undefined ? String(fonte.cpf).trim() : null,
        rg: fonte.rg !== undefined ? String(fonte.rg).trim() : null,
        passaporte: fonte.passaporte !== undefined ? String(fonte.passaporte).trim() : null,
        dataNascimento: fonte.datanascimento || fonte.dataNascimento || null,
        nacionalidade: fonte.nacionalidade || 'Brasileira',
        sexo: fonte.sexo || null,
        telefone: fonte.telefone !== undefined ? String(fonte.telefone).trim() : null,
        email: fonte.email !== undefined ? String(fonte.email).trim() : null,
        endereco: fonte.endereco !== undefined ? String(fonte.endereco).trim() : null,
        numero: fonte.numero !== undefined ? String(fonte.numero).trim() : null,
        cidade: fonte.cidade !== undefined ? String(fonte.cidade).trim() : null,
        estado: fonte.estado !== undefined ? String(fonte.estado).trim() : null,
        cep: fonte.cep !== undefined ? String(fonte.cep).trim() : null,
        profissao: fonte.profissao !== undefined ? String(fonte.profissao).trim() : null,
        proximoDestino: fonte.proximodestino !== undefined ? String(fonte.proximodestino).trim() : (fonte.proximoDestino || null),
        ultimaProcedencia: fonte.ultimaprocedencia !== undefined ? String(fonte.ultimaprocedencia).trim() : (fonte.ultimaProcedencia || null),
        cpfResponsavelMenor: fonte.cpfresponsavelmenor !== undefined ? String(fonte.cpfresponsavelmenor).trim() : (fonte.cpfResponsavelMenor || null),
        dataEntrada: fonte.dataentrada || fonte.dataEntrada || null,
        horarioPrevistoChegada: fonte.horarioprevistochegada || fonte.horarioPrevistoChegada || null,
        dataSaida: fonte.datasaida || fonte.dataSaida || null,
        horarioPrevistoSaida: fonte.horarioprevistasaida || fonte.horarioPrevistoSaida || null,
        motivoViagem: fonte.motivoviagem || fonte.motivoViagem || null,
        transporte: fonte.transporte || null,
        placa: fonte.placa !== undefined ? String(fonte.placa).trim() : null,
        modeloCor: fonte.modelocor !== undefined ? String(fonte.modelocor).trim() : (fonte.modeloCor || null),
        numeroHospedes: Number(fonte.numerohospedes || fonte.numeroHospedes || 1),
        adultos: Number(fonte.adultos || 1),
        criancas: Number(fonte.criancas || 0),
        formaPagamento: fonte.forma_pagamento || fonte.formaPagamento || null,
        valorSinal: Number(fonte.valor_sinal || fonte.valorSinal || 0),
        comprovanteUrl: fonte.comprovante_url || fonte.comprovanteUrl || null,
        alergiasRestricoes: fonte.alergias_restricoes !== undefined ? String(fonte.alergias_restricoes).trim() : (fonte.alergiasRestricoes || null),
        solicitacoesEspeciais: fonte.solicitacoes_especiais !== undefined ? String(fonte.solicitacoes_especiais).trim() : (fonte.solicitacoesEspeciais || null),
        declaracaoAceita: Boolean(fonte.declaracao_aceita !== undefined ? fonte.declaracao_aceita : fonte.declaracaoAceita),
        dataDeclaracao: fonte.data_declaracao || fonte.dataDeclaracao || new Date().toISOString(),
        assinaturaUrl: fonte.assinatura_url || fonte.assinaturaUrl || null,
        acompanhantes: Array.isArray(acompanhantesFonte)
          ? acompanhantesFonte.map((a: any) => {
              let menoridade = Boolean(a.menoridade);
              const dtNasc = a.datanascimento || a.dataNascimento;
              if (dtNasc) {
                menoridade = calcularIdadeNumerica(dtNasc) < 18;
              }
              return {
                nomeCompleto: a.nomecompleto?.trim() || a.nomeCompleto?.trim() || '',
                documento: a.documento?.trim() || null,
                dataNascimento: dtNasc || null,
                menoridade,
                cpfResponsavel: a.cpfresponsavel?.trim() || a.cpfResponsavel?.trim() || null,
                autorizacaoUrl: a.autorizacao_url || a.autorizacaoUrl || null,
                autorizacaoValidada: Boolean(a.autorizacao_validada !== undefined ? a.autorizacao_validada : a.autorizacaoValidada),
                observacoes: a.observacoes?.trim() || null,
              };
            })
          : [],
      };

      return await apiCliente.put<any>(`/api/fnrh/preencher-publico/${encodeURIComponent(token)}`, payloadApi);
    } catch (e: any) {
      console.error('[FnrhService] Erro ao preencher FNRH pública:', e);
      return { sucesso: false, erro: e?.message || 'Erro inesperado ao enviar FNRH para a API.' };
    }
  }

  /**
   * Gera um novo link FNRH para envio ao cliente com intenção de reserva.
   */
  public static async gerarNovoLinkFnrh(parametros?: {
    nomecompleto?: string;
    telefone?: string;
    email?: string;
    dataentrada?: string;
    datasaida?: string;
    adultos?: number;
    criancas?: number;
    solicitacoes_especiais?: string;
    usuarioId?: number | string;
  }): Promise<{ sucesso: boolean; cadastro?: CadastroFnrh; linkPublico?: string; erro?: string }> {
    try {
      const payloadApi = {
        nomeCompleto: parametros?.nomecompleto?.trim() ? String(parametros.nomecompleto).trim().toUpperCase() : null,
        telefone: parametros?.telefone?.trim() || null,
        email: parametros?.email?.trim() || null,
        dataEntrada: parametros?.dataentrada || null,
        dataSaida: parametros?.datasaida || null,
        adultos: parametros?.adultos ?? 1,
        criancas: parametros?.criancas ?? 0,
        solicitacoesEspeciais: parametros?.solicitacoes_especiais?.trim() || null,
        usuarioId: parametros?.usuarioId ? Number(parametros.usuarioId) : null,
      };

      const resApi = await apiCliente.post<any>('/api/fnrh/gerar-novo-link', payloadApi);
      if (resApi.sucesso && resApi.dados) {
        const payload = resApi.dados;
        const c = payload.cadastro || payload;
        const token = c.token_acesso || c.tokenAcesso;
        const linkBruto = payload.linkPublico || payload.link_publico || `/fnrh/${token}`;
        const linkPublico = montarUrlPublicaFnrh(linkBruto);
        const cadastroCriado: CadastroFnrh = {
          ...c,
          cadastroid: Number(c.cadastroid || c.cadastroId),
          token_acesso: token,
          token_expira_em: c.token_expira_em || c.tokenExpiraEm,
          acompanhantes: c.acompanhantes || [],
        };
        return { sucesso: true, cadastro: cadastroCriado, linkPublico };
      }

      return {
        sucesso: false,
        erro: resApi.erro || 'Falha ao gerar link público na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao gerar link FNRH:', errApi);
      return {
        sucesso: false,
        erro: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  /**
   * Confirma o recebimento do sinal (50%) pelo administrador/atendente.
   */
  public static async confirmarSinalFnrh(parametros: {
    cadastroid: number;
    valorSinal: number;
    formaPagamento: string;
    usuarioId?: number | string;
    comprovanteUrl?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; hospedeId?: number }> {
    try {
      const payloadApi = {
        cadastroId: Number(parametros.cadastroid),
        valorSinal: Number(parametros.valorSinal),
        formaPagamento: parametros.formaPagamento,
        comprovanteUrl: parametros.comprovanteUrl || null,
        usuarioId: parametros.usuarioId ? Number(parametros.usuarioId) : null,
      };

      const resApi = await apiCliente.put<any>('/api/fnrh/confirmar-sinal', payloadApi);
      if (resApi.sucesso) {
        return {
          sucesso: true,
          mensagem: resApi.mensagem || 'Sinal confirmado com sucesso! Cadastro liberado para efetivação da reserva.',
          hospedeId: (resApi.dados?.hospedeid || resApi.dados?.hospedeId) ? Number(resApi.dados.hospedeid || resApi.dados.hospedeId) : undefined,
        };
      }

      return {
        sucesso: false,
        mensagem: resApi.erro || 'Erro ao confirmar sinal na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao confirmar sinal:', errApi);
      return {
        sucesso: false,
        mensagem: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  /**
   * Cancela um link/cadastro FNRH
   */
  public static async cancelarCadastroFnrh(cadastroid: number, usuarioId?: number | string): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      const params = usuarioId ? { usuarioId } : undefined;
      const resApi = await apiCliente.patch(`/api/fnrh/cancelar-fnrh/${cadastroid}`, params);
      if (resApi.sucesso) {
        return { sucesso: true, mensagem: resApi.mensagem || 'Cadastro cancelado com sucesso.' };
      }

      return {
        sucesso: false,
        mensagem: resApi.erro || 'Erro ao cancelar cadastro na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao cancelar FNRH:', errApi);
      return {
        sucesso: false,
        mensagem: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  /**
   * Exclui um cadastro FNRH
   */
  public static async excluirCadastroFnrh(cadastroid: number): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      const resApi = await apiCliente.delete(`/api/fnrh/delete-fnrh/${cadastroid}`);
      if (resApi.sucesso) {
        return { sucesso: true, mensagem: resApi.mensagem || 'Cadastro excluído com sucesso.' };
      }

      return {
        sucesso: false,
        mensagem: resApi.erro || 'Erro ao excluir cadastro na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao excluir FNRH:', errApi);
      return {
        sucesso: false,
        mensagem: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  /**
   * Vincula uma reserva criada ao cadastro FNRH e aos acompanhantes.
   */
  public static async vincularReservaAoCadastroFnrh(parametros: {
    cadastroid?: number;
    hospedeid?: number;
    reservaid: number;
    usuarioId?: number | string;
  }): Promise<{ sucesso: boolean; mensagem?: string; cadastroid?: number }> {
    try {
      const payloadApi = {
        cadastroId: parametros.cadastroid ? Number(parametros.cadastroid) : null,
        hospedeId: parametros.hospedeid ? Number(parametros.hospedeid) : null,
        reservaId: Number(parametros.reservaid),
        usuarioId: parametros.usuarioId ? Number(parametros.usuarioId) : null,
      };

      const resApi = await apiCliente.put<any>('/api/fnrh/vincular-reserva', payloadApi);
      if (resApi.sucesso) {
        const idRetornado = resApi.dados?.cadastroId || resApi.dados?.cadastroid || parametros.cadastroid;
        return {
          sucesso: true,
          cadastroid: idRetornado ? Number(idRetornado) : undefined,
          mensagem: resApi.mensagem || `Cadastro FNRH vinculado à reserva #${parametros.reservaid}!`,
        };
      }

      return {
        sucesso: false,
        mensagem: resApi.erro || 'Erro ao vincular reserva ao cadastro FNRH na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao vincular reserva à FNRH:', errApi);
      return {
        sucesso: false,
        mensagem: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  /**
   * Atualiza os dados de uma Ficha FNRH e seus acompanhantes (edição por atendente/administrador).
   */
  public static async atualizarCadastroFnrh(
    cadastroid: number,
    dados: Partial<CadastroFnrh>,
    acompanhantes?: any[],
    usuarioId?: number | string
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      const payloadApi: Record<string, any> = {
        cadastroId: Number(cadastroid),
        nomeCompleto: dados.nomecompleto !== undefined ? String(dados.nomecompleto).trim() : null,
        cpf: dados.cpf !== undefined ? String(dados.cpf).trim() : null,
        rg: dados.rg !== undefined ? String(dados.rg).trim() : null,
        passaporte: dados.passaporte !== undefined ? String(dados.passaporte).trim() : null,
        dataNascimento: dados.datanascimento || null,
        nacionalidade: dados.nacionalidade || 'Brasileira',
        sexo: dados.sexo || null,
        telefone: dados.telefone !== undefined ? String(dados.telefone).trim() : null,
        email: dados.email !== undefined ? String(dados.email).trim() : null,
        endereco: dados.endereco !== undefined ? String(dados.endereco).trim() : null,
        numero: dados.numero !== undefined ? String(dados.numero).trim() : null,
        cidade: dados.cidade !== undefined ? String(dados.cidade).trim() : null,
        estado: dados.estado !== undefined ? String(dados.estado).trim() : null,
        cep: dados.cep !== undefined ? String(dados.cep).trim() : null,
        profissao: dados.profissao !== undefined ? String(dados.profissao).trim() : null,
        proximoDestino: dados.proximodestino !== undefined ? String(dados.proximodestino).trim() : null,
        ultimaProcedencia: dados.ultimaprocedencia !== undefined ? String(dados.ultimaprocedencia).trim() : null,
        cpfResponsavelMenor: dados.cpfresponsavelmenor !== undefined ? String(dados.cpfresponsavelmenor).trim() : null,
        dataEntrada: dados.dataentrada || null,
        horarioPrevistoChegada: dados.horarioprevistochegada || null,
        dataSaida: dados.datasaida || null,
        horarioPrevistoSaida: dados.horarioprevistasaida || null,
        motivoViagem: dados.motivoviagem || null,
        transporte: dados.transporte || null,
        placa: dados.placa !== undefined ? String(dados.placa).trim() : null,
        modeloCor: dados.modelocor !== undefined ? String(dados.modelocor).trim() : null,
        numeroHospedes: Number(dados.numerohospedes || 1),
        adultos: Number(dados.adultos || 1),
        criancas: Number(dados.criancas || 0),
        formaPagamento: dados.forma_pagamento || null,
        valorSinal: Number(dados.valor_sinal || 0),
        comprovanteUrl: dados.comprovante_url || null,
        alergiasRestricoes: dados.alergias_restricoes !== undefined ? String(dados.alergias_restricoes).trim() : null,
        solicitacoesEspeciais: dados.solicitacoes_especiais !== undefined ? String(dados.solicitacoes_especiais).trim() : null,
        declaracaoAceita: Boolean(dados.declaracao_aceita),
        dataDeclaracao: dados.data_declaracao || null,
        assinaturaUrl: dados.assinatura_url || null,
        usuarioId: usuarioId ? Number(usuarioId) : null,
      };

      if (acompanhantes) {
        payloadApi.acompanhantes = acompanhantes.map((a) => {
          let menoridade = Boolean(a.menoridade);
          if (a.datanascimento) {
            menoridade = calcularIdadeNumerica(a.datanascimento) < 18;
          }
          return {
            cadastroId: Number(cadastroid),
            reservaId: a.reservaid ? Number(a.reservaid) : null,
            nomeCompleto: a.nomecompleto?.trim() || '',
            documento: a.documento?.trim() || null,
            dataNascimento: a.datanascimento || null,
            menoridade,
            cpfResponsavel: a.cpfresponsavel?.trim() || null,
            autorizacaoUrl: a.autorizacao_url || null,
            autorizacaoValidada: Boolean(a.autorizacao_validada),
            observacoes: a.observacoes?.trim() || null,
          };
        });
      }

      const resApi = await apiCliente.put(`/api/fnrh/atualizar-fnrh/${cadastroid}`, payloadApi);
      if (resApi.sucesso) {
        return { sucesso: true, mensagem: resApi.mensagem || 'Ficha FNRH atualizada com sucesso!' };
      }

      return {
        sucesso: false,
        mensagem: resApi.erro || 'Erro ao atualizar cadastro na API .NET.',
      };
    } catch (errApi: any) {
      console.error('[FnrhService] Erro ao atualizar FNRH:', errApi);
      return {
        sucesso: false,
        mensagem: errApi?.message || 'Erro inesperado na chamada da API.',
      };
    }
  }

  // =========================================================================
  // Métodos de Instância (IFnrhService)
  // =========================================================================

  public async listarCadastrosFnrh(): Promise<ResultadoSupabase<CadastroFnrh[]>> {
    return FnrhService.listarCadastrosFnrh();
  }

  public async obterPorToken(token: string): Promise<ResultadoSupabase<CadastroFnrh>> {
    return FnrhService.obterPorToken(token);
  }

  public async preencherFnrhPublica(token: string, dados: any): Promise<ResultadoSupabase<any>> {
    return FnrhService.preencherFnrhPublica(token, dados);
  }

  public async gerarNovoLinkFnrh(parametros?: any): Promise<any> {
    return FnrhService.gerarNovoLinkFnrh(parametros);
  }

  public async confirmarSinalFnrh(parametros: any): Promise<any> {
    return FnrhService.confirmarSinalFnrh(parametros);
  }

  public async cancelarCadastroFnrh(cadastroid: number, usuarioId?: number | string): Promise<any> {
    return FnrhService.cancelarCadastroFnrh(cadastroid, usuarioId);
  }

  public async excluirCadastroFnrh(cadastroid: number): Promise<any> {
    return FnrhService.excluirCadastroFnrh(cadastroid);
  }

  public async vincularReservaAoCadastroFnrh(parametros: any): Promise<any> {
    return FnrhService.vincularReservaAoCadastroFnrh(parametros);
  }

  public async atualizarCadastroFnrh(
    cadastroid: number,
    dados: Partial<CadastroFnrh>,
    acompanhantes?: any[],
    usuarioId?: number | string
  ): Promise<any> {
    return FnrhService.atualizarCadastroFnrh(cadastroid, dados, acompanhantes, usuarioId);
  }
}

/**
 * Instância singleton do serviço FNRH.
 */
export const fnrhService = new FnrhService();
