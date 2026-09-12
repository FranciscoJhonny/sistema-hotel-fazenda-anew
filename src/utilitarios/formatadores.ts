export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
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

export function formatarTelefone(telefone: string): string {
  if (!telefone) return '';
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  } else if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  }
  return telefone;
}

export function formatarCpf(cpf: string): string {
  if (!cpf) return '';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length === 11) {
    return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
  }
  return cpf;
}

export function calcularDiarias(dataEntrada: string, dataSaida: string): number {
  if (!dataEntrada || !dataSaida) return 1;
  const d1 = new Date(dataEntrada + 'T00:00:00');
  const d2 = new Date(dataSaida + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}
