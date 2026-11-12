export interface ResultadoValidacao {
    valido: boolean;
    mensagem?: string;
}

export interface ResultadoValidacaoPeriodo extends ResultadoValidacao {
    diasInclusivos: number;
}

export class Validate {
    /**
     * Converte string YYYY-MM-DD, DD/MM/YYYY ou ISO para objeto Date local zerado (00:00:00)
     * Evita problemas de diferença de fuso horário (UTC vs local).
     */
    public static parseDataLocal(dataStr?: string): Date | null {
        if (!dataStr) return null;
        const limpa = String(dataStr).slice(0, 10).trim();
        if (!limpa) return null;

        if (limpa.includes('/')) {
            const [dia, mes, ano] = limpa.split('/');
            const dt = new Date(Number(ano), Number(mes) - 1, Number(dia));
            return isNaN(dt.getTime()) ? null : dt;
        }

        const [ano, mes, dia] = limpa.split('-');
        const dt = new Date(Number(ano), Number(mes) - 1, Number(dia));
        return isNaN(dt.getTime()) ? null : dt;
    }

    /**
     * Valida intervalo entre Data Início e Data Fim.
     * Regra: A data inicial não pode ser maior que a data final.
     * Calcula automaticamente os dias inclusivos (padrão Hotel Fazenda Anew).
     */
    public static periodoDatas(
        dataInicio?: string,
        dataFim?: string,
        opcoes: {
            permitirMesmoDia?: boolean;
            exigirAmbas?: boolean;
            nomeCampoInicio?: string;
            nomeCampoFim?: string;
        } = {}
    ): ResultadoValidacaoPeriodo {
        const {
            permitirMesmoDia = true,
            exigirAmbas = false,
            nomeCampoInicio = 'Data de Entrada',
            nomeCampoFim = 'Data de Saída',
        } = opcoes;

        const dIni = this.parseDataLocal(dataInicio);
        const dFim = this.parseDataLocal(dataFim);

        if (exigirAmbas && (!dIni || !dFim)) {
            return {
                valido: false,
                mensagem: `Informe a ${nomeCampoInicio} e a ${nomeCampoFim}.`,
                diasInclusivos: 0,
            };
        }

        if (!dIni || !dFim) {
            return {
                valido: true,
                diasInclusivos: dIni || dFim ? 1 : 0,
            };
        }

        if (dIni.getTime() > dFim.getTime()) {
            return {
                valido: false,
                mensagem: `A ${nomeCampoInicio} não pode ser maior que a ${nomeCampoFim}.`,
                diasInclusivos: 0,
            };
        }

        if (!permitirMesmoDia && dIni.getTime() === dFim.getTime()) {
            return {
                valido: false,
                mensagem: `A ${nomeCampoFim} deve ser posterior à ${nomeCampoInicio}.`,
                diasInclusivos: 0,
            };
        }

        const diffMs = dFim.getTime() - dIni.getTime();
        const pernoites = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const diasInclusivos = pernoites + 1;

        return {
            valido: true,
            diasInclusivos,
        };
    }

    /**
     * Ajusta automaticamente a data final caso a nova data inicial seja posterior a ela
     */
    public static ajustarDataFimSeNecessario(novaDataInicio: string, dataFimAtual: string): string {
        if (!novaDataInicio || !dataFimAtual) return dataFimAtual;
        const validacao = this.periodoDatas(novaDataInicio, dataFimAtual);
        return validacao.valido ? dataFimAtual : novaDataInicio;
    }

    /**
     * Valida CPF brasileiro (dígitos verificadores)
     */
    public static cpf(cpfStr?: string): ResultadoValidacao {
        if (!cpfStr) return { valido: false, mensagem: 'CPF não informado.' };
        const cpfLimpo = cpfStr.replace(/\D/g, '');

        if (cpfLimpo.length !== 11 || /^(\d)\1{10}$/.test(cpfLimpo)) {
            return { valido: false, mensagem: 'CPF inválido.' };
        }

        let soma = 0;
        for (let i = 0; i < 9; i++) soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
        let resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpfLimpo.charAt(9))) {
            return { valido: false, mensagem: 'CPF inválido.' };
        }

        soma = 0;
        for (let i = 0; i < 10; i++) soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpfLimpo.charAt(10))) {
            return { valido: false, mensagem: 'CPF inválido.' };
        }

        return { valido: true };
    }

    /**
     * Valida formato básico de e-mail
     */
    public static email(emailStr?: string): ResultadoValidacao {
        if (!emailStr || !emailStr.trim()) return { valido: true }; // Opcional se vazio
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(emailStr.trim())
            ? { valido: true }
            : { valido: false, mensagem: 'Formato de e-mail inválido.' };
    }

    /**
     * Valida telefone com DDD (10 ou 11 dígitos)
     */
    public static telefone(telStr?: string): ResultadoValidacao {
        if (!telStr || !telStr.trim()) return { valido: true }; // Opcional se vazio
        const numeros = telStr.replace(/\D/g, '');
        return numeros.length === 10 || numeros.length === 11
            ? { valido: true }
            : { valido: false, mensagem: 'Telefone deve conter DDD + número (10 ou 11 dígitos).' };
    }
}