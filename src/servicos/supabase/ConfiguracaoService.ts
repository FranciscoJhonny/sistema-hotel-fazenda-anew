import { BaseService } from './BaseService';
import { Configuracao, ConfiguracaoSistema } from '../../tipos';
import { ResultadoSupabase } from './types';

export interface IConfiguracaoService {
  listar(filtros?: any): Promise<ResultadoSupabase<Configuracao[]>>;
  obterPorId(id: number | string): Promise<ResultadoSupabase<Configuracao>>;
  obterPorChave(chave: string): Promise<ResultadoSupabase<Configuracao>>;
  obterTodasComoObjeto(): Promise<ResultadoSupabase<Record<string, string>>>;
  salvarConfiguracao(chave: string, valor: string, descricao?: string): Promise<ResultadoSupabase<Configuracao>>;
  salvarMultiplas(configuracoes: Record<string, string>): Promise<ResultadoSupabase<boolean>>;
  criar(config: Partial<Configuracao>): Promise<ResultadoSupabase<Configuracao>>;
  atualizar(id: number | string, config: Partial<Configuracao>): Promise<ResultadoSupabase<Configuracao>>;
  desativar(id: number | string): Promise<ResultadoSupabase<Configuracao>>;
  excluir(id: number | string): Promise<ResultadoSupabase<boolean>>;
}

export class ConfiguracaoService extends BaseService<Configuracao> implements IConfiguracaoService {
  constructor() {
    super('configuracao', 'configuracaoid');
  }

  public async obterPorChave(chave: string): Promise<ResultadoSupabase<Configuracao>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const { data, error } = await client
        .from('configuracao')
        .select('*')
        .eq('chave', chave)
        .maybeSingle();

      if (error) return { sucesso: false, erro: error.message };
      if (!data) return { sucesso: false, erro: 'Configuração não encontrada.' };

      return { sucesso: true, dados: data as unknown as Configuracao };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao buscar configuração' };
    }
  }

  public async obterTodasComoObjeto(): Promise<ResultadoSupabase<Record<string, string>>> {
    const res = await this.listar({ apenasAtivos: true });
    if (!res.sucesso || !res.dados) {
      return { sucesso: false, erro: res.erro || 'Falha ao listar configurações' };
    }

    const mapa: Record<string, string> = {};
    for (const item of res.dados) {
      if (item.chave) {
        mapa[item.chave] = item.valor;
      }
    }

    return { sucesso: true, dados: mapa };
  }

  public async salvarConfiguracao(
    chave: string,
    valor: string,
    descricao?: string
  ): Promise<ResultadoSupabase<Configuracao>> {
    const client = this.getClient();
    if (!client) return { sucesso: false, erro: 'Supabase não conectado.' };

    try {
      const existente = await this.obterPorChave(chave);

      if (existente.sucesso && existente.dados) {
        return this.atualizar(existente.dados.configuracaoid, {
          valor: valor,
          descricao: descricao ?? existente.dados.descricao,
        });
      } else {
        return this.criar({
          chave: chave,
          valor: valor,
          descricao: descricao || '',
          ativo: true,
        });
      }
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao salvar configuração' };
    }
  }

  public async salvarMultiplas(configuracoes: Record<string, string>): Promise<ResultadoSupabase<boolean>> {
    try {
      const promises = Object.entries(configuracoes).map(([chave, valor]) =>
        this.salvarConfiguracao(chave, valor)
      );
      await Promise.all(promises);
      return { sucesso: true, dados: true };
    } catch (err: any) {
      return { sucesso: false, erro: err?.message || 'Erro ao salvar múltiplas configurações' };
    }
  }
}
