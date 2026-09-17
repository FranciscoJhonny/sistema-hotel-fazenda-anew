import { obterClienteSupabase } from '../../lib/supabaseCliente';
import { CadastroFnrh, CadastroFnrhAcompanhante } from '../../tipos';

/**
 * Retorna a origem atual da URL de forma segura (tanto no browser quanto em SSR).
 * Nunca fixa localhost em produção.
 */
export const obterOrigemUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

/**
 * Monta o link público para o cliente preencher a FNRH.
 * Exemplo local: http://localhost:3000/fnrh/<token>
 * Exemplo produção: https://hotelfazendaanew.com.br/fnrh/<token>
 */
export const gerarLinkPublicoFnrh = (token: string): string => {
  const origem = obterOrigemUrl();
  return origem ? `${origem}/fnrh/${token}` : `/fnrh/${token}`;
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
   */
  public static async listarCadastrosFnrh(): Promise<{ sucesso: boolean; dados: CadastroFnrh[]; erro?: string }> {
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) {
        return { sucesso: false, dados: [], erro: 'Cliente Supabase não inicializado.' };
      }

      // 1. Busca cadastros
      const { data: cadastros, error: erroCadastros } = await cliente
        .from('cadastro_fnrh')
        .select('*')
        .order('cadastroid', { ascending: false });

      if (erroCadastros) {
        console.error('[FnrhService] Erro ao buscar cadastros:', erroCadastros);
        return { sucesso: false, dados: [], erro: erroCadastros.message };
      }

      if (!cadastros || cadastros.length === 0) {
        return { sucesso: true, dados: [] };
      }

      // 2. Busca acompanhantes de todos os cadastros carregados
      const idsCadastros = cadastros.map((c: any) => c.cadastroid);
      const { data: acompanhantes, error: erroAcomp } = await cliente
        .from('cadastro_fnrh_acompanhante')
        .select('*')
        .in('cadastroid', idsCadastros)
        .order('acompanhanteid', { ascending: true });

      if (erroAcomp) {
        console.warn('[FnrhService] Aviso ao buscar acompanhantes:', erroAcomp);
      }

      // 3. Agrupa acompanhantes por cadastro
      const acompanhantesPorCadastro = new Map<number, CadastroFnrhAcompanhante[]>();
      (acompanhantes || []).forEach((item: any) => {
        const id = Number(item.cadastroid);
        if (!acompanhantesPorCadastro.has(id)) {
          acompanhantesPorCadastro.set(id, []);
        }
        acompanhantesPorCadastro.get(id)!.push({
          acompanhanteid: Number(item.acompanhanteid),
          cadastroid: id,
          reservaid: item.reservaid ? Number(item.reservaid) : null,
          nomecompleto: item.nomecompleto || '',
          documento: item.documento || '',
          datanascimento: item.datanascimento || '',
          menoridade: Boolean(item.menoridade),
          cpfresponsavel: item.cpfresponsavel || '',
          autorizacao_url: item.autorizacao_url || '',
          autorizacao_validada: Boolean(item.autorizacao_validada),
          observacoes: item.observacoes || '',
          datainclusao: item.datainclusao || '',
        });
      });

      const resultado: CadastroFnrh[] = cadastros.map((c: any) => ({
        cadastroid: Number(c.cadastroid),
        status: c.status,
        token_acesso: c.token_acesso,
        token_expira_em: c.token_expira_em,
        hospedeid: c.hospedeid ? Number(c.hospedeid) : null,
        reservaid: c.reservaid ? Number(c.reservaid) : null,
        nomecompleto: c.nomecompleto || '',
        cpf: c.cpf || '',
        rg: c.rg || '',
        passaporte: c.passaporte || '',
        datanascimento: c.datanascimento || '',
        nacionalidade: c.nacionalidade || 'Brasileira',
        sexo: c.sexo || '',
        telefone: c.telefone || '',
        email: c.email || '',
        endereco: c.endereco || '',
        cidade: c.cidade || '',
        estado: c.estado || '',
        cep: c.cep || '',
        profissao: c.profissao || '',
        proximodestino: c.proximodestino || '',
        ultimaprocedencia: c.ultimaprocedencia || '',
        cpfresponsavelmenor: c.cpfresponsavelmenor || '',
        dataentrada: c.dataentrada || '',
        horarioprevistochegada: c.horarioprevistochegada || '',
        datasaida: c.datasaida || '',
        horarioprevistasaida: c.horarioprevistasaida || '',
        motivoviagem: c.motivoviagem || '',
        transporte: c.transporte || '',
        placa: c.placa || '',
        modelocor: c.modelocor || '',
        numerohospedes: Number(c.numerohospedes || 1),
        adultos: Number(c.adultos || 1),
        criancas: Number(c.criancas || 0),
        forma_pagamento: c.forma_pagamento || '',
        valor_sinal: Number(c.valor_sinal || 0),
        comprovante_url: c.comprovante_url || '',
        pagamento_confirmado_em: c.pagamento_confirmado_em || '',
        pagamento_confirmado_por: c.pagamento_confirmado_por ? Number(c.pagamento_confirmado_por) : null,
        alergias_restricoes: c.alergias_restricoes || '',
        solicitacoes_especiais: c.solicitacoes_especiais || '',
        declaracao_aceita: Boolean(c.declaracao_aceita),
        data_declaracao: c.data_declaracao || '',
        assinatura_url: c.assinatura_url || '',
        datainclusao: c.datainclusao || '',
        dataoperacao: c.dataoperacao || '',
        usuariooperacao: c.usuariooperacao ? Number(c.usuariooperacao) : null,
        naturezaoperacao: c.naturezaoperacao || 'INSERT',
        acompanhantes: acompanhantesPorCadastro.get(Number(c.cadastroid)) || [],
      }));

      return { sucesso: true, dados: resultado };
    } catch (err: any) {
      console.error('[FnrhService] Exceção em listarCadastrosFnrh:', err);
      return { sucesso: false, dados: [], erro: err?.message || 'Erro inesperado ao listar cadastros.' };
    }
  }

  /**
   * Gera um novo link FNRH para envio ao cliente com intenção de reserva.
   * A validade padrão é de 7 dias a partir da criação.
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
      const cliente = obterClienteSupabase();
      if (!cliente) {
        return { sucesso: false, erro: 'Cliente Supabase não conectado.' };
      }

      const token = gerarTokenAleatorio();
      const agora = new Date();
      const expiraEm = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const dadosParaInserir: Record<string, any> = {
        token_acesso: token,
        token_expira_em: expiraEm,
        status: 'AGUARDANDO_PAGAMENTO',
        numerohospedes: Math.max(1, (parametros?.adultos || 1) + (parametros?.criancas || 0)),
        adultos: parametros?.adultos ?? 1,
        criancas: parametros?.criancas ?? 0,
        datainclusao: agora.toISOString(),
        dataoperacao: agora.toISOString(),
        naturezaoperacao: 'INSERT',
      };

      if (parametros?.nomecompleto?.trim()) dadosParaInserir.nomecompleto = parametros.nomecompleto.trim();
      if (parametros?.telefone?.trim()) dadosParaInserir.telefone = parametros.telefone.trim();
      if (parametros?.email?.trim()) dadosParaInserir.email = parametros.email.trim();
      if (parametros?.dataentrada) dadosParaInserir.dataentrada = parametros.dataentrada;
      if (parametros?.datasaida) dadosParaInserir.datasaida = parametros.datasaida;
      if (parametros?.solicitacoes_especiais?.trim()) dadosParaInserir.solicitacoes_especiais = parametros.solicitacoes_especiais.trim();
      if (parametros?.usuarioId) dadosParaInserir.usuariooperacao = Number(parametros.usuarioId);

      const { data, error } = await cliente
        .from('cadastro_fnrh')
        .insert(dadosParaInserir)
        .select()
        .single();

      if (error || !data) {
        console.error('[FnrhService] Erro ao inserir cadastro_fnrh:', error);
        return { sucesso: false, erro: error?.message || 'Não foi possível gerar o link.' };
      }

      const linkPublico = gerarLinkPublicoFnrh(data.token_acesso);
      const cadastroCriado: CadastroFnrh = {
        cadastroid: Number(data.cadastroid),
        status: data.status,
        token_acesso: data.token_acesso,
        token_expira_em: data.token_expira_em,
        nomecompleto: data.nomecompleto || '',
        telefone: data.telefone || '',
        email: data.email || '',
        dataentrada: data.dataentrada || '',
        datasaida: data.datasaida || '',
        numerohospedes: Number(data.numerohospedes || 1),
        adultos: Number(data.adultos || 1),
        criancas: Number(data.criancas || 0),
        valor_sinal: Number(data.valor_sinal || 0),
        declaracao_aceita: Boolean(data.declaracao_aceita),
        datainclusao: data.datainclusao,
        acompanhantes: [],
      };

      return { sucesso: true, cadastro: cadastroCriado, linkPublico };
    } catch (err: any) {
      console.error('[FnrhService] Exceção em gerarNovoLinkFnrh:', err);
      return { sucesso: false, erro: err?.message || 'Erro inesperado ao gerar link.' };
    }
  }

  /**
   * Confirma o recebimento do sinal (50%) pelo administrador/atendente.
   * Executa as regras de negócio:
   * 1. Atualiza status para 'LIBERADA_PARA_RESERVA'
   * 2. Registra data, valor e usuário que confirmou
   * 3. Cria ou atualiza o titular na tabela public.hospede
   * 4. Copia os acompanhantes para public.acompanhante
   */
  public static async confirmarSinalFnrh(parametros: {
    cadastroid: number;
    valorSinal: number;
    formaPagamento: string;
    usuarioId?: number | string;
    comprovanteUrl?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; hospedeId?: number }> {
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) {
        return { sucesso: false, mensagem: 'Cliente Supabase não conectado.' };
      }

      // 1. Busca dados do cadastro
      const { data: cadastro, error: erroCad } = await cliente
        .from('cadastro_fnrh')
        .select('*')
        .eq('cadastroid', parametros.cadastroid)
        .single();

      if (erroCad || !cadastro) {
        return { sucesso: false, mensagem: 'Cadastro FNRH não encontrado.' };
      }

      const agora = new Date().toISOString();
      const usuarioIdNumerico = parametros.usuarioId ? Number(parametros.usuarioId) : null;
      let hospedeCriadoId: number | null = cadastro.hospedeid ? Number(cadastro.hospedeid) : null;

      // 2. Se o titular tiver nome preenchido, sincroniza/cria na tabela public.hospede
      if (cadastro.nomecompleto?.trim()) {
        const dadosHospede = {
          nomecompleto: cadastro.nomecompleto.trim(),
          cpf: cadastro.cpf || '',
          rg: cadastro.rg || null,
          passaporte: cadastro.passaporte || null,
          datanascimento: cadastro.datanascimento || null,
          nacionalidade: cadastro.nacionalidade || 'Brasileira',
          sexo: cadastro.sexo || null,
          telefone: cadastro.telefone || '',
          whatsapp: cadastro.telefone || '',
          email: cadastro.email || null,
          endereco: cadastro.endereco || null,
          cidade: cadastro.cidade || 'Campo Grande',
          estado: cadastro.estado || 'MS',
          cep: cadastro.cep || null,
          profissao: cadastro.profissao || null,
          proximodestino: cadastro.proximodestino || null,
          ultimaprocedencia: cadastro.ultimaprocedencia || null,
          cpfresponsavelmenor: cadastro.cpfresponsavelmenor || null,
          alergias_restricoes: cadastro.alergias_restricoes || null,
          solicitacoes_especiais: cadastro.solicitacoes_especiais || null,
          declaracao_aceita: Boolean(cadastro.declaracao_aceita),
          data_declaracao: cadastro.data_declaracao || agora,
          assinatura_url: cadastro.assinatura_url || null,
          ativo: true,
          dataoperacao: agora,
          usuariooperacao: usuarioIdNumerico,
          naturezaoperacao: hospedeCriadoId ? 'UPDATE' : 'INSERT',
        };

        if (hospedeCriadoId) {
          await cliente.from('hospede').update(dadosHospede).eq('hospedeid', hospedeCriadoId);
        } else {
          // Verifica se já existe por CPF se tiver CPF
          let hospedeExistente = null;
          if (cadastro.cpf?.trim()) {
            const { data: buscaCpf } = await cliente
              .from('hospede')
              .select('hospedeid')
              .eq('cpf', cadastro.cpf.trim())
              .maybeSingle();
            hospedeExistente = buscaCpf;
          }

          if (hospedeExistente) {
            hospedeCriadoId = Number(hospedeExistente.hospedeid);
            await cliente.from('hospede').update(dadosHospede).eq('hospedeid', hospedeCriadoId);
          } else {
            const { data: novoHospede } = await cliente
              .from('hospede')
              .insert({
                ...dadosHospede,
                datainclusao: agora,
                usuarioinclusao: usuarioIdNumerico,
              })
              .select('hospedeid')
              .single();

            if (novoHospede) {
              hospedeCriadoId = Number(novoHospede.hospedeid);
            }
          }
        }
      }

      // 3. Atualiza cadastro_fnrh
      const dadosAtualizacao: Record<string, any> = {
        status: 'LIBERADA_PARA_RESERVA',
        valor_sinal: parametros.valorSinal,
        forma_pagamento: parametros.formaPagamento,
        comprovante_url: parametros.comprovanteUrl || cadastro.comprovante_url,
        pagamento_confirmado_em: agora,
        pagamento_confirmado_por: usuarioIdNumerico,
        dataoperacao: agora,
        usuariooperacao: usuarioIdNumerico,
        naturezaoperacao: 'UPDATE',
      };

      if (hospedeCriadoId) {
        dadosAtualizacao.hospedeid = hospedeCriadoId;
      }

      const { error: erroAtualizacao } = await cliente
        .from('cadastro_fnrh')
        .update(dadosAtualizacao)
        .eq('cadastroid', parametros.cadastroid);

      if (erroAtualizacao) {
        return { sucesso: false, mensagem: erroAtualizacao.message };
      }

      // 4. Copia acompanhantes para a tabela definitiva public.acompanhante (se existir)
      const { data: acompanhantesTemp } = await cliente
        .from('cadastro_fnrh_acompanhante')
        .select('*')
        .eq('cadastroid', parametros.cadastroid);

      if (acompanhantesTemp && acompanhantesTemp.length > 0) {
        for (const item of acompanhantesTemp) {
          try {
            await cliente.from('acompanhante').insert({
              cadastroid: parametros.cadastroid,
              nomecompleto: item.nomecompleto,
              documento: item.documento,
              datanascimento: item.datanascimento,
              menoridade: Boolean(item.menoridade),
              cpfresponsavel: item.cpfresponsavel,
              autorizacao_url: item.autorizacao_url,
              autorizacao_validada: Boolean(item.autorizacao_validada),
              observacoes: item.observacoes,
              ativo: true,
              datainclusao: agora,
              dataoperacao: agora,
              usuariooperacao: usuarioIdNumerico,
              naturezaoperacao: 'INSERT',
            });
          } catch (e) {
            console.warn('[FnrhService] Aviso ao copiar acompanhante:', e);
          }
        }
      }

      return {
        sucesso: true,
        mensagem: 'Sinal confirmado com sucesso! Cadastro liberado para efetivação da reserva.',
        hospedeId: hospedeCriadoId ?? undefined,
      };
    } catch (err: any) {
      console.error('[FnrhService] Erro ao confirmar sinal:', err);
      return { sucesso: false, mensagem: err?.message || 'Erro ao confirmar sinal.' };
    }
  }

  /**
   * Cancela um link/cadastro FNRH
   */
  public static async cancelarCadastroFnrh(cadastroid: number, usuarioId?: number | string): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) return { sucesso: false, mensagem: 'Cliente Supabase não conectado.' };

      const { error } = await cliente
        .from('cadastro_fnrh')
        .update({
          status: 'CANCELADA',
          dataoperacao: new Date().toISOString(),
          usuariooperacao: usuarioId ? Number(usuarioId) : null,
          naturezaoperacao: 'UPDATE',
        })
        .eq('cadastroid', cadastroid);

      if (error) return { sucesso: false, mensagem: error.message };
      return { sucesso: true, mensagem: 'Cadastro cancelado com sucesso.' };
    } catch (err: any) {
      return { sucesso: false, mensagem: err?.message || 'Erro ao cancelar cadastro.' };
    }
  }

  /**
   * Exclui um cadastro FNRH
   */
  public static async excluirCadastroFnrh(cadastroid: number): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) return { sucesso: false, mensagem: 'Cliente Supabase não conectado.' };

      const { error } = await cliente
        .from('cadastro_fnrh')
        .delete()
        .eq('cadastroid', cadastroid);

      if (error) return { sucesso: false, mensagem: error.message };
      return { sucesso: true, mensagem: 'Cadastro excluído com sucesso.' };
    } catch (err: any) {
      return { sucesso: false, mensagem: err?.message || 'Erro ao excluir cadastro.' };
    }
  }

  /**
   * Vincula uma reserva criada ao cadastro FNRH e aos acompanhantes.
   * - Atualiza status para 'RESERVA_CRIADA' e preenche 'reservaid'.
   * - Atualiza 'reservaid' em public.acompanhante e public.cadastro_fnrh_acompanhante.
   */
  public static async vincularReservaAoCadastroFnrh(parametros: {
    cadastroid?: number;
    hospedeid?: number;
    reservaid: number;
    usuarioId?: number | string;
  }): Promise<{ sucesso: boolean; mensagem?: string; cadastroid?: number }> {
    try {
      const cliente = obterClienteSupabase();
      if (!cliente) return { sucesso: false, mensagem: 'Cliente Supabase não conectado.' };

      const agora = new Date().toISOString();
      const usuarioIdNum = parametros.usuarioId ? Number(parametros.usuarioId) : null;
      let idFinalCadastro = parametros.cadastroid ? Number(parametros.cadastroid) : null;

      // Se não temos o cadastroid mas temos hospedeid, busca o cadastro_fnrh mais recente apto
      if (!idFinalCadastro && parametros.hospedeid) {
        const { data: buscaFnrh } = await cliente
          .from('cadastro_fnrh')
          .select('cadastroid')
          .eq('hospedeid', parametros.hospedeid)
          .in('status', ['LIBERADA_PARA_RESERVA', 'AGUARDANDO_PAGAMENTO'])
          .order('cadastroid', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (buscaFnrh?.cadastroid) {
          idFinalCadastro = Number(buscaFnrh.cadastroid);
        }
      }

      if (!idFinalCadastro) {
        return { sucesso: true, mensagem: 'Nenhum cadastro FNRH encontrado para vinculação direta.' };
      }

      // 1. Atualiza cadastro_fnrh com status RESERVA_CRIADA e reservaid
      let { error: erroFnrh } = await cliente
        .from('cadastro_fnrh')
        .update({
          status: 'RESERVA_CRIADA',
          reservaid: parametros.reservaid,
          dataoperacao: agora,
          usuariooperacao: usuarioIdNum,
          naturezaoperacao: 'UPDATE',
        })
        .eq('cadastroid', idFinalCadastro);

      if (erroFnrh) {
        console.warn('[FnrhService] Tentando atualizar reservaid sem alterar status (fallback):', erroFnrh);
        const { error: erroFallback } = await cliente
          .from('cadastro_fnrh')
          .update({
            reservaid: parametros.reservaid,
            dataoperacao: agora,
            usuariooperacao: usuarioIdNum,
            naturezaoperacao: 'UPDATE',
          })
          .eq('cadastroid', idFinalCadastro);

        if (erroFallback) {
          console.error('[FnrhService] Erro ao atualizar cadastro_fnrh com reservaid:', erroFallback);
          return { sucesso: false, mensagem: erroFallback.message };
        }
      }

      // 2. Atualiza acompanhantes definitivos
      try {
        await cliente
          .from('acompanhante')
          .update({
            reservaid: parametros.reservaid,
            dataoperacao: agora,
            usuariooperacao: usuarioIdNum,
            naturezaoperacao: 'UPDATE',
          })
          .eq('cadastroid', idFinalCadastro)
          .is('reservaid', null);
      } catch (e) {
        console.warn('[FnrhService] Aviso ao atualizar acompanhantes definitivos:', e);
      }

      // 3. Atualiza acompanhantes da tabela de pré-cadastro da FNRH
      try {
        await cliente
          .from('cadastro_fnrh_acompanhante')
          .update({
            reservaid: parametros.reservaid,
          })
          .eq('cadastroid', idFinalCadastro)
          .is('reservaid', null);
      } catch (e) {
        console.warn('[FnrhService] Aviso ao atualizar cadastro_fnrh_acompanhante:', e);
      }

      return {
        sucesso: true,
        cadastroid: idFinalCadastro,
        mensagem: `Cadastro FNRH #${idFinalCadastro} vinculado com sucesso à reserva #${parametros.reservaid}!`,
      };
    } catch (err: any) {
      console.error('[FnrhService] Exceção em vincularReservaAoCadastroFnrh:', err);
      return { sucesso: false, mensagem: err?.message || 'Erro ao vincular reserva ao cadastro FNRH.' };
    }
  }
}
