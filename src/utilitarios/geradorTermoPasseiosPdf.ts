import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTucanoImg from '../imagens/logo-tucano-transparente.png';
import { Hospede, Reserva } from '../tipos';
import { formatarCpf } from './formatadores';

let logoBase64Promise: Promise<string | null> | null = null;

const obterLogoBase64 = (): Promise<string | null> => {
  if (logoBase64Promise) return logoBase64Promise;
  logoBase64Promise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.warn('[geradorTermoPasseiosPdf] Falha ao converter logo:', e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = logoTucanoImg;
  });
  return logoBase64Promise;
};

if (typeof window !== 'undefined') {
  obterLogoBase64();
}

export interface DadosTermoPasseiosInput {
  reserva: any;
  hospede?: Hospede | any | null;
  acompanhantes?: any[];
}

const getVal = (obj: any, min: string, camel: string): any => {
  if (!obj) return undefined;
  return obj[min] !== undefined ? obj[min] : obj[camel];
};

const formatarDataExtensoLocal = (dataIso?: string): string => {
  const base = dataIso ? new Date(`${String(dataIso).slice(0, 10)}T12:00:00`) : new Date();
  const d = isNaN(base.getTime()) ? new Date() : base;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
};

const desenharCabecalhoInstitucional = (
  doc: jsPDF,
  logoData: string | null,
  tituloDocumento: string,
  codigoReserva: string
) => {
  doc.setFillColor(5, 61, 30); // #053d1e
  doc.rect(12, 10, 186, 24, 'F');

  if (logoData) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 12.5, 19, 19, 2.5, 2.5, 'F');
      doc.addImage(logoData, 'PNG', 16.5, 14, 16, 16);
    } catch (e) {
      console.warn('[geradorTermoPasseiosPdf] Erro ao inserir logo:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('HOTEL FAZENDA ANEW', 38, 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 240, 225);
  doc.text('Distrito de Fala Verdade • Corguinho - MS • CNPJ: 47.680.087/0001-59', 38, 22.5);
  doc.text('Alimentos Naturais do Brasil • Recepção & Hospitalidade Rural', 38, 27);

  if (codigoReserva) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(156, 14, 38, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(5, 61, 30);
    doc.text('RESERVA', 175, 19, { align: 'center' });
    doc.setFontSize(9.5);
    doc.text(`#${codigoReserva}`, 175, 25.5, { align: 'center' });
  }

  // Faixa de Título do Termo
  doc.setFillColor(230, 244, 234);
  doc.rect(12, 36, 186, 8.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 61, 30);
  doc.text(tituloDocumento, 105, 41.5, { align: 'center' });
};

/**
 * Gera o PDF do Termo de Ciência das Regras e Termo de Responsabilidade de Passeios
 * já preenchido com Nome, RG e CPF do hóspede titular para assinatura física no check-in.
 */
export async function exportarTermoPasseiosPdf({
  reserva,
  hospede,
  acompanhantes = [],
}: DadosTermoPasseiosInput): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoData = await obterLogoBase64();

  const nomeTitular = String(
    hospede?.nomecompleto ||
      getVal(hospede, 'nomecompleto', 'nomeCompleto') ||
      getVal(reserva, 'hospedenome', 'hospedeNome') ||
      '____________________________________________________'
  )
    .trim()
    .toUpperCase();

  const rgBruto =
    hospede?.rg ||
    getVal(hospede, 'rg', 'rg') ||
    getVal(reserva, 'hospederg', 'hospedeRg') ||
    '';
  const rgTexto = rgBruto ? String(rgBruto).trim() : '_______________________';

  const cpfBruto =
    hospede?.cpf ||
    getVal(hospede, 'cpf', 'cpf') ||
    getVal(reserva, 'hospedecpf', 'hospedeCpf') ||
    '';
  const cpfTexto = cpfBruto ? formatarCpf(String(cpfBruto)) : '_______________________';

  const codigoReserva = String(
    getVal(reserva, 'codigo', 'codigo') ||
      getVal(reserva, 'reservaid', 'reservaId') ||
      ''
  );

  const quartoLabel = String(
    getVal(reserva, 'quartocodigo', 'quartoCodigo') ||
      getVal(reserva, 'quartonumero', 'quartoNumero') ||
      ''
  );

  const dataCheckinFormatada = formatarDataExtensoLocal(
    getVal(reserva, 'checkinrealizadoem', 'checkinRealizadoEm') ||
      getVal(reserva, 'dataentrada', 'dataEntrada')
  );

  // =========================================================================
  // PÁGINA 1: TERMO DE CIÊNCIA DAS REGRAS DO HOTEL FAZENDA ANEW
  // =========================================================================
  desenharCabecalhoInstitucional(
    doc,
    logoData,
    'TERMO DE CIÊNCIA DAS REGRAS DO HOTEL FAZENDA ANEW',
    codigoReserva
  );

  // Qualificação do Hóspede Titular
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(25, 28, 29);

  const qualificacaoTexto = `EU, ${nomeTitular}, inscrito no RG: ${rgTexto} e no CPF: ${cpfTexto}${
    quartoLabel ? ` (Acomodação: Quarto ${quartoLabel})` : ''
  }, declaro que estou ciente e anuente em cumprir as seguintes regras do Hotel Fazenda Anew:`;

  const linhasQualificacao = doc.splitTextToSize(qualificacaoTexto, 184);
  doc.text(linhasQualificacao, 13, 51);

  const regrasHotel = [
    'É proibido se afastar dos limites da sede do Hotel Fazenda Anew, bem como atravessar a barragem no seu ponto de elevação/represamento, devendo respeitar as placas indicativas existentes.',
    'O horário de utilização da piscina se dará apenas no período das 07h00min às 22h00min.',
    'Crianças, pessoas com limitações, idosas, incapazes parcialmente ou não somente poderão utilizar a piscina de adulto acompanhados dos seus responsáveis.',
    'Não será permitido entrar com bebidas e alimentos na área da piscina, bem como utilizá-la com roupas jeans e coloridas impróprias para banho, creme de cabelo e bronzeadores.',
    'Animais não poderão ingressar nos quartos e ambientes de uso comum como refeitório, piscina e ofurôs.',
    'É proibido entrar no refeitório com traje de banho, sem camiseta/camisa e/ou molhado, bem como consumir qualquer tipo de bebida e comida nos ofurôs e sauna.',
    'A utilização de sauna ou do ofurô aquecido deve ser sempre por mais de uma pessoa.',
    'Não é permitido o consumo de produtos embalados em vasilhames de vidro nas dependências do hotel.',
    'O Hotel Fazenda Anew está localizado num ambiente rural e silvestre pelo que me dou ciente e aceito os riscos inerentes à existência de animais e insetos peçonhentos ou não, devendo permanecer atento no uso das dependências do Hotel.',
    'As pessoas com limitações, idosas, incapazes parcialmente ou não devem ser acompanhadas pelos seus responsáveis, sendo proibido que permaneçam nas dependências do Hotel sozinhos, em especial na área de piscina e terraço.',
    'É proibido durante o deslocamento para passeios que o hóspede fique em pé no trajeto que se utiliza a "carretinha do trator", devendo permanecer sentado conforme instruções da equipe de apoio.',
    'Para o passeio "cavalgada" o hóspede deve estar com roupa apropriada e calçado fechado, estando ciente de que é proibido correr com os cavalos durante o passeio, bem como alterar a rota, devendo sempre permanecer próximo ao instrutor do passeio e obedecendo-o.',
    'Somente será permitido entrar na cachoeira após a autorização do instrutor.',
    'Comprometo-me a informar para a equipe de apoio eventual alergia que possuo, seja ela qual for, estando ciente de que não há hospital num raio de cerca de 40km do Hotel Fazenda Anew, sendo que o Hotel disponibiliza um carro e um motorista para, se necessário for, levar o hóspede até o hospital.',
  ];

  autoTable(doc, {
    startY: 51 + linhasQualificacao.length * 4.5 + 2,
    margin: { left: 12, right: 12 },
    theme: 'plain',
    styles: {
      fontSize: 8.3,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      textColor: [30, 35, 32],
    },
    columnStyles: {
      0: { cellWidth: 6, fontStyle: 'bold', textColor: [5, 61, 30] },
      1: { cellWidth: 180 },
    },
    body: regrasHotel.map((regra, idx) => [`${idx + 1}.`, regra]),
  });

  const yAposRegras = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(25, 28, 29);
  doc.text(
    'Por assim sendo, todas essas instruções foram lidas em voz alta para minha ciência.',
    13,
    yAposRegras
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Distrito de Fala Verdade, Corguinho-MS, Hotel Fazenda Anew, ${dataCheckinFormatada}.`,
    13,
    yAposRegras + 7
  );

  // Linha de Assinatura Página 1
  const yAssinatura1 = Math.min(yAposRegras + 24, 276);
  doc.setDrawColor(60, 70, 60);
  doc.setLineWidth(0.35);
  doc.line(45, yAssinatura1, 165, yAssinatura1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 61, 30);
  doc.text(nomeTitular, 105, yAssinatura1 + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 90);
  doc.text(`Assinatura do Hóspede Titular • CPF: ${cpfTexto}`, 105, yAssinatura1 + 8.5, {
    align: 'center',
  });

  // =========================================================================
  // PÁGINA 2: TERMO DE RESPONSABILIDADE DE PASSEIOS
  // =========================================================================
  doc.addPage();

  desenharCabecalhoInstitucional(
    doc,
    logoData,
    'TERMO DE RESPONSABILIDADE — PASSEIOS E ATIVIDADES',
    codigoReserva
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(25, 28, 29);

  const textoIntroTermo2 = `EU, ${nomeTitular}, inscrito(a) no RG: ${rgTexto} e no CPF: ${cpfTexto}, declaro(amos) que estou(amos) ciente(s) dos riscos dos passeios do Hotel Fazenda Anew e confirmo(amos) que:`;
  const linhasIntro2 = doc.splitTextToSize(textoIntroTermo2, 184);
  doc.text(linhasIntro2, 13, 52);

  let yCursor = 52 + linhasIntro2.length * 4.8 + 4;

  // Se houver acompanhantes cadastrados, exibe a lista para ciência conjunta
  if (acompanhantes && acompanhantes.length > 0) {
    autoTable(doc, {
      startY: yCursor,
      margin: { left: 12, right: 12 },
      theme: 'grid',
      styles: {
        fontSize: 7.8,
        cellPadding: 2,
        lineColor: [193, 201, 191],
        lineWidth: 0.2,
      },
      head: [
        [
          {
            content: 'ACOMPANHANTES / DEPENDENTES VINCULADOS A ESTE TERMO',
            colSpan: 2,
            styles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold' },
          },
        ],
      ],
      body: acompanhantes.map((acomp: any, idx: number) => [
        { content: `${idx + 1}. ${String(acomp.nomecompleto || '').toUpperCase()}`, styles: { fontStyle: 'bold' } },
        { content: acomp.documento ? `Doc: ${acomp.documento}` : 'Dependente vinculado' },
      ]),
    });
    yCursor = (doc as any).lastAutoTable.finalY + 6;
  }

  // Bloco 1: Passeio Cavalgada
  autoTable(doc, {
    startY: yCursor,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    styles: {
      fontSize: 8.8,
      cellPadding: 3,
      lineColor: [193, 201, 191],
      lineWidth: 0.25,
      textColor: [25, 28, 29],
    },
    body: [
      [
        {
          content: 'QUANTO AO PASSEIO CAVALGADA (Marque uma das opções abaixo):',
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
      [
        {
          content:
            '[    ]  Tenho conhecimento e preparo técnico para participar do passeio denominado cavalgada e não desejo ter auxílio dos instrutores, isentando o Hotel Fazenda de qualquer responsabilidade por eventuais danos sofridos durante o passeio.',
          styles: { fillColor: [250, 252, 250] },
        },
      ],
      [
        {
          content:
            '[    ]  Não tenho conhecimento e preparo técnico para participar do passeio denominado cavalgada e desejo ter auxílio dos instrutores.',
          styles: { fillColor: [255, 255, 255] },
        },
      ],
    ],
  });

  // Bloco 2: Passeios Molhados
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    styles: {
      fontSize: 8.8,
      cellPadding: 3,
      lineColor: [193, 201, 191],
      lineWidth: 0.25,
      textColor: [25, 28, 29],
    },
    body: [
      [
        {
          content: 'QUANTO AOS PASSEIOS "MOLHADOS" (Piscina, Ofurô, Rios, Barragem e Cachoeira):',
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
      [
        {
          content:
            '[    ]  Tenho prática da natação e não preciso de guarda-vidas durante meu uso da piscina, ofurô e passeios nos rios, barragem e cachoeira, isentando o Hotel Fazenda de qualquer responsabilidade por eventuais danos sofridos durante o passeio.',
          styles: { fillColor: [250, 252, 250] },
        },
      ],
      [
        {
          content:
            '[    ]  Não tenho prática da natação e preciso de guarda-vidas durante meu uso da piscina, ofurô e passeios nos rios, barragem e cachoeira.',
          styles: { fillColor: [255, 255, 255] },
        },
      ],
    ],
  });

  // Bloco 3: Declaração de Condição Física e Saúde
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    styles: {
      fontSize: 8.8,
      cellPadding: 3,
      lineColor: [193, 201, 191],
      lineWidth: 0.25,
      textColor: [25, 28, 29],
    },
    body: [
      [
        {
          content: 'CONDIÇÕES DE SAÚDE E APTIDÃO FÍSICA:',
          styles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
      [
        {
          content:
            '[    ]  Declaro não ter nenhum problema de saúde incompatível com as atividades desenvolvidas nos passeios.',
          styles: { fillColor: [250, 252, 250], fontStyle: 'bold' },
        },
      ],
    ],
  });

  const yFinalTermo2 = (doc as any).lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(25, 28, 29);
  const textoEncerramento =
    'Por fim, declaro que recebi todas as instruções e regras do Hotel Fazenda Anew, comprometendo-me(nos) a cumpri-las, assinando o presente termo para os fins legais.';
  const linhasEncerramento = doc.splitTextToSize(textoEncerramento, 184);
  doc.text(linhasEncerramento, 13, yFinalTermo2);

  doc.setFont('helvetica', 'bold');
  doc.text(
    `Distrito de Fala Verdade - Corguinho-MS, ${dataCheckinFormatada}.`,
    13,
    yFinalTermo2 + linhasEncerramento.length * 4.5 + 5
  );

  // Linha de Assinatura Página 2
  const yAssinatura2 = Math.min(yFinalTermo2 + linhasEncerramento.length * 4.5 + 24, 276);
  doc.setDrawColor(60, 70, 60);
  doc.setLineWidth(0.35);
  doc.line(45, yAssinatura2, 165, yAssinatura2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 61, 30);
  doc.text(nomeTitular, 105, yAssinatura2 + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 90);
  doc.text(`Assinatura do Hóspede Titular • RG: ${rgTexto} • CPF: ${cpfTexto}`, 105, yAssinatura2 + 8.5, {
    align: 'center',
  });

  const nomeSanitizado = nomeTitular.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Termo_Responsabilidade_${codigoReserva || 'Checkin'}_${nomeSanitizado}.pdf`);
}