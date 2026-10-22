import { Configuracao } from '../../tipos';
import { ResultadoSupabase } from './types';
import { apiCliente } from './apiCliente';

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

export class ConfiguracaoService implements IConfiguracaoService {
  public async listar(filtros?: any): Promise<ResultadoSupabase<Configuracao[]>> {
    const apenasAtivos = filtros?.apenasAtivos !== false;
    return await apiCliente.get<Configuracao[]>('/api/configuracao/get-lista-configuracao', { apenasAtivos });
  }

  public async obterPorId(id: number | string): Promise<ResultadoSupabase<Configuracao>> {
    return await apiCliente.get<Configuracao>(`/api/configuracao/get-configuracao/${id}`);
  }

  public async obterPorChave(chave: string): Promise<ResultadoSupabase<Configuracao>> {
    return await apiCliente.get<Configuracao>(`/api/configuracao/get-por-chave/${encodeURIComponent(chave)}`);
  }

  public async obterTodasComoObjeto(): Promise<ResultadoSupabase<Record<string, string>>> {
    const res = await apiCliente.get<Record<string, string>>('/api/configuracao/get-todas-como-objeto');
    if (res.sucesso && res.dados) {
      return res;
    }

    const listRes = await this.listar({ apenasAtivos: true });
    if (listRes.sucesso && listRes.dados) {
      const mapa: Record<string, string> = {};
      for (const item of listRes.dados) {
        if (item.chave) mapa[item.chave] = item.valor;
      }
      return { sucesso: true, dados: mapa };
    }
    return { sucesso: false, erro: listRes.erro || 'Falha ao buscar configurações' };
  }

  public async salvarConfiguracao(
    chave: string,
    valor: string,
    descricao?: string
  ): Promise<ResultadoSupabase<Configuracao>> {
    const payload = {
      chave,
      valor,
      descricao: descricao || ''
    };
    return await apiCliente.post<Configuracao>('/api/configuracao/salvar-configuracao', payload);
  }

  public async salvarMultiplas(configuracoes: Record<string, string>): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.post<any>('/api/configuracao/salvar-multiplas', configuracoes);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }

  public async criar(config: Partial<Configuracao>): Promise<ResultadoSupabase<Configuracao>> {
    return await apiCliente.post<Configuracao>('/api/configuracao/post-configuracao', config);
  }

  public async atualizar(id: number | string, config: Partial<Configuracao>): Promise<ResultadoSupabase<Configuracao>> {
    const payload = { ...config, configuracaoId: Number(id) };
    return await apiCliente.put<Configuracao>('/api/configuracao/put-configuracao', payload);
  }

  public async desativar(id: number | string): Promise<ResultadoSupabase<Configuracao>> {
    return await apiCliente.delete<Configuracao>(`/api/configuracao/desativar-configuracao/${id}`);
  }

  public async excluir(id: number | string): Promise<ResultadoSupabase<boolean>> {
    const res = await apiCliente.delete<any>(`/api/configuracao/delete-configuracao/${id}`);
    return {
      sucesso: res.sucesso,
      dados: res.sucesso,
      erro: res.erro,
      statusHttp: res.statusHttp
    };
  }
}

export const configuracaoService = new ConfiguracaoService();
