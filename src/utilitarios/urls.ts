/**
 * Utilitários centralizados para manipulação de URLs e Links públicos do sistema.
 * Compatível com execução local (localhost), homologação e produção (Vercel).
 */

export const obterOrigemAplicacao = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
};

export const montarUrlPublicaFnrh = (linkOuToken?: string | null): string => {
  if (!linkOuToken) return '';

  const valor = String(linkOuToken).trim();
  if (valor.startsWith('http://') || valor.startsWith('https://')) {
    return valor;
  }

  const origem = obterOrigemAplicacao();
  const path = valor.startsWith('/') ? valor : `/fnrh/${valor}`;
  return origem ? `${origem}${path}` : path;
};

export const montarMensagemWhatsappFnrh = (
  linkPublico: string,
  nomeHospede?: string
): string => {
  const linkCompleto = montarUrlPublicaFnrh(linkPublico);
  const saudacao = nomeHospede?.trim() ? `Olá ${nomeHospede.trim()}!` : 'Olá!';

  return `${saudacao} Tudo bem?

Para agilizarmos seu atendimento e a confirmação da sua reserva no *Hotel Fazenda Anew*, por favor preencha sua *Ficha Nacional de Registro de Hóspedes (FNRH)* através do link seguro abaixo:

${linkCompleto}

*Atenção:* Este link tem validade de *7 dias*.

Qualquer dúvida, estamos à disposição!`;
};
