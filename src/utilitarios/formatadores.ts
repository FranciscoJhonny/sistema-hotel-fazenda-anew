export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
}

/**
 * Aplica máscara monetária brasileira (BRL) com preenchimento da direita para a esquerda.
 * Conforme o usuário digita números, o valor avança das casas decimais para as inteiras:
 * Ex: 3 -> R$ 0,03; 310100 -> R$ 3.101,00
 */
export function aplicarMascaraMoeda(valor: string | number): string {
  if (valor === undefined || valor === null || valor === '') return '';

  if (typeof valor === 'number') {
    if (isNaN(valor)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  const apenasDigitos = String(valor).replace(/\D/g, '');
  if (!apenasDigitos) return '';

  const digitosLimpos = apenasDigitos.replace(/^0+/, '');
  if (!digitosLimpos) {
    return '';
  }

  const centavos = parseInt(digitosLimpos, 10);
  const valorDecimal = centavos / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorDecimal);
}

/**
 * Converte a string com máscara monetária de volta para número float para persistência no banco.
 * Ex: "R$ 1.125,00" -> 1125.00
 */
export function desformatarMoeda(valorFormatado: string | number): number {
  if (typeof valorFormatado === 'number') {
    return isNaN(valorFormatado) ? 0 : valorFormatado;
  }
  if (!valorFormatado) return 0;
  const apenasDigitos = String(valorFormatado).replace(/\D/g, '');
  if (!apenasDigitos) return 0;
  const centavos = parseInt(apenasDigitos, 10);
  const numero = centavos / 100;
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

export function sanitizarValorMonetario(valor: string): string {
  const somenteNumeros = valor.replace(/[^\d,]/g, '');
  const [parteInteira, ...partesDecimais] = somenteNumeros.split(',');
  return partesDecimais.length > 0
    ? `${parteInteira},${partesDecimais.join('')}`
    : somenteNumeros;
}

export function converterValorMonetario(valor: string): number {
  const numero = Number(sanitizarValorMonetario(valor).replace(',', '.'));
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

export function formatarData(dataString: string): string {
  if (!dataString) return '--';
  // If format is YYYY-MM-DD
  const partes = dataString.split('T')[0].split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataString;
}

export function formatarDataExtenso(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data + 'T12:00:00') : data;
  if (isNaN(d.getTime())) return '31 de agosto de 2026';

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

export function formatarDataHora(dataString: string): string {
  if (!dataString) return '--';
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return dataString;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
}

/**
 * Converte qualquer formato de data (ISO 8601 com 'T', YYYY-MM-DD ou DD/MM/YYYY) para o formato YYYY-MM-DD,
 * estritamente exigido pelo atributo value do elemento HTML <input type="date">.
 */
export function formatarParaInputDate(data?: string | Date | null): string {
  if (!data) return '';
  if (data instanceof Date) {
    if (isNaN(data.getTime())) return '';
    return data.toISOString().split('T')[0];
  }
  const str = String(data).trim();
  if (!str) return '';
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const partes = str.split('/');
  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    if (ano.length === 4) {
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
  }
  return '';
}

/**
 * Converte qualquer formato de horário para o padrão HH:mm (5 caracteres)
 * exigido pelo elemento HTML <input type="time">.
 */
export function formatarParaInputTime(horario?: string | null, padrao = '07:00'): string {
  if (!horario) return padrao;
  const str = String(horario).trim();
  if (!str) return padrao;
  if (str.length >= 5) {
    return str.slice(0, 5);
  }
  return padrao;
}

export function aplicarMascaraTelefone(valor: string): string {
  if (!valor) return '';
  const apenasDigitos = valor.replace(/\D/g, '').slice(0, 11);
  if (apenasDigitos.length === 0) return '';
  if (apenasDigitos.length <= 2) return `(${apenasDigitos}`;
  if (apenasDigitos.length <= 6) return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2)}`;
  if (apenasDigitos.length <= 10) return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 6)}-${apenasDigitos.slice(6)}`;
  return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 7)}-${apenasDigitos.slice(7)}`;
}

export function formatarTelefone(telefone: string): string {
  return aplicarMascaraTelefone(telefone);
}

export function aplicarMascaraCpf(valor: string): string {
  if (!valor) return '';
  const apenasDigitos = valor.replace(/\D/g, '').slice(0, 11);
  if (apenasDigitos.length <= 3) return apenasDigitos;
  if (apenasDigitos.length <= 6) return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3)}`;
  if (apenasDigitos.length <= 9) return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6)}`;
  return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9)}`;
}

export function formatarCpf(cpf: string): string {
  if (!cpf) return '';
  return aplicarMascaraCpf(cpf);
}

export function formatarCep(cep: string): string {
  if (!cep) return '';
  const apenasDigitos = cep.replace(/\D/g, '').slice(0, 8);
  if (apenasDigitos.length <= 5) return apenasDigitos;
  return `${apenasDigitos.slice(0, 5)}-${apenasDigitos.slice(5)}`;
}

export function calcularDiarias(dataEntrada: string, dataSaida: string): number {
  if (!dataEntrada || !dataSaida) return 1;
  const d1 = new Date(dataEntrada + 'T00:00:00');
  const d2 = new Date(dataSaida + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

/**
 * Converte com segurança strings de datas nos formatos brasileiro (DD/MM/YYYY) ou ISO (YYYY-MM-DD)
 * para objetos Date locais, sem o bug de inversão mês/dia ou problemas de fuso horário UTC.
 */
export function parseDataSegura(str?: string): Date | null {
  if (!str) return null;
  const s = str.trim().slice(0, 10);
  if (s.includes('/')) {
    const partes = s.split('/').map(Number);
    if (partes.length === 3 && !partes.some(isNaN)) {
      if (partes[0] > 1000) {
        return new Date(partes[0], partes[1] - 1, partes[2]);
      }
      const [dia, mes, ano] = partes;
      return new Date(ano, mes - 1, dia);
    }
  }
  if (s.includes('-')) {
    const partes = s.split('-').map(Number);
    if (partes.length === 3 && !partes.some(isNaN)) {
      if (partes[0] > 1000) {
        return new Date(partes[0], partes[1] - 1, partes[2]);
      }
      if (partes[2] > 1000) {
        return new Date(partes[2], partes[1] - 1, partes[0]);
      }
      const [ano, mes, dia] = partes;
      return new Date(ano, mes - 1, dia);
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function calcularIdade(dataNascimentoStr?: string): string {
  const dNasc = parseDataSegura(dataNascimentoStr);
  if (!dNasc) return '--';

  const hoje = new Date();
  let idade = hoje.getFullYear() - dNasc.getFullYear();
  const m = hoje.getMonth() - dNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dNasc.getDate())) {
    idade--;
  }

  if (idade < 0) return '0 anos';
  if (idade === 1) return '1 ano';
  return `${idade} anos`;
}

export function calcularIdadeNumerica(dataNascimentoStr?: string): number {
  const dNasc = parseDataSegura(dataNascimentoStr);
  if (!dNasc) return 0;

  const hoje = new Date();
  let idade = hoje.getFullYear() - dNasc.getFullYear();
  const m = hoje.getMonth() - dNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dNasc.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
}

/**
 * Calcula a idade exata com base em uma data de referência (ex: data de entrada da reserva).
 */
export function calcularIdadeNaData(dataNascimento?: string, dataReferencia?: string): number {
  const dNasc = parseDataSegura(dataNascimento);
  if (!dNasc) return 0;
  const dRef = dataReferencia ? parseDataSegura(dataReferencia) || new Date() : new Date();

  let idade = dRef.getFullYear() - dNasc.getFullYear();
  const m = dRef.getMonth() - dNasc.getMonth();
  if (m < 0 || (m === 0 && dRef.getDate() < dNasc.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
}

/**
 * Converte strings de horário para o formato TimeSpan aceito pela Web API (hh:mm:ss).
 * "09:00" -> "09:00:00"
 */
export const formatarHorarioParaTimeSpan = (horario?: string | null): string | undefined => {
  if (!horario || !horario.trim()) return undefined;

  const limpo = horario.trim();
  if (/^\d{2}:\d{2}$/.test(limpo)) {
    return `${limpo}:00`;
  }

  return limpo;
};

/**
 * Converte horários vindos da API (ex: "09:00:00") para o formato esperado pelo <input type="time" /> (hh:mm).
 */
export const formatarHorarioParaInput = (horario?: string | null): string => {
  if (!horario) return '';
  return String(horario).slice(0, 5); // Pega apenas "HH:mm"
};
