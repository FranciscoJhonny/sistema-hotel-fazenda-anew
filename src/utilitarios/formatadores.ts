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

export function calcularIdade(dataNascimentoStr?: string): string {
  if (!dataNascimentoStr) return '--';
  let dataNasc: Date;
  if (dataNascimentoStr.includes('/')) {
    const partes = dataNascimentoStr.split('/');
    if (partes.length === 3) {
      dataNasc = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    } else {
      dataNasc = new Date(dataNascimentoStr);
    }
  } else {
    dataNasc = new Date(dataNascimentoStr.includes('T') ? dataNascimentoStr : `${dataNascimentoStr}T00:00:00`);
  }

  if (isNaN(dataNasc.getTime())) return '--';

  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNasc.getFullYear();
  const m = hoje.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
    idade--;
  }

  if (idade < 0) return '0 anos';
  if (idade === 1) return '1 ano';
  return `${idade} anos`;
}

export function calcularIdadeNumerica(dataNascimentoStr?: string): number {
  if (!dataNascimentoStr) return 0;
  let dataNasc: Date;
  if (dataNascimentoStr.includes('/')) {
    const partes = dataNascimentoStr.split('/');
    if (partes.length === 3) {
      dataNasc = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    } else {
      dataNasc = new Date(dataNascimentoStr);
    }
  } else {
    dataNasc = new Date(dataNascimentoStr.includes('T') ? dataNascimentoStr : `${dataNascimentoStr}T00:00:00`);
  }

  if (isNaN(dataNasc.getTime())) return 0;

  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNasc.getFullYear();
  const m = hoje.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
}

/**
 * Calcula a idade exata com base em uma data de referência (ex: data de entrada da reserva).
 */
export function calcularIdadeNaData(dataNascimentoStr?: string, dataReferenciaStr?: string): number {
  if (!dataNascimentoStr) return 0;

  let dataNasc: Date;
  const strNasc = dataNascimentoStr.slice(0, 10).trim();
  if (strNasc.includes('/')) {
    const partes = strNasc.split('/');
    if (partes.length === 3) {
      dataNasc = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
    } else {
      dataNasc = new Date(strNasc);
    }
  } else if (strNasc.includes('-')) {
    const partes = strNasc.split('-');
    if (partes.length === 3) {
      dataNasc = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    } else {
      dataNasc = new Date(strNasc);
    }
  } else {
    dataNasc = new Date(strNasc);
  }

  if (isNaN(dataNasc.getTime())) return 0;

  let refDate = new Date();
  if (dataReferenciaStr) {
    const strRef = dataReferenciaStr.slice(0, 10).trim();
    if (strRef.includes('/')) {
      const p = strRef.split('/');
      if (p.length === 3) {
        refDate = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      }
    } else if (strRef.includes('-')) {
      const p = strRef.split('-');
      if (p.length === 3) {
        refDate = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      }
    }
  }

  let idade = refDate.getFullYear() - dataNasc.getFullYear();
  const m = refDate.getMonth() - dataNasc.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < dataNasc.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
}
