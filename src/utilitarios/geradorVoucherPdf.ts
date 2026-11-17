import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTucanoImg from '../imagens/logo-tucano-transparente.png';
import { CadastroFnrh, Reserva, Pacote, Quarto } from '../tipos';
import {
  formatarCpf,
  formatarTelefone,
  formatarData,
  formatarMoeda,
  calcularIdade
} from './formatadores';
import { calcularTarifaHospede } from './geradorPdfFnrh';

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
        console.warn('[geradorVoucherPdf] Falha ao converter logo:', e);
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

export interface DadosVoucherInput {
  cadastro: CadastroFnrh;
  reservaVinculada?: Reserva | null;
  pacotes?: Pacote[];
  quartos?: Quarto[];
  valorTotalOverride?: number;
  valorSinalOverride?: number;
  formaPagamentoOverride?: string;
  pacoteSugerido?: Pacote | null;
  comprovanteObs?: string;
}

/**
 * Gera e realiza o download do Voucher de Confirmação de Reserva / Recibo do Sinal
 * em 1 página A4 oficial do Hotel Fazenda Anew.
 */
export async function exportarVoucherReservaPdf({
  cadastro,
  reservaVinculada,
  pacotes = [],
  quartos = [],
  valorTotalOverride,
  valorSinalOverride,
  formaPagamentoOverride,
  pacoteSugerido,
  comprovanteObs,
}: DadosVoucherInput): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoData = await obterLogoBase64();

  // =========================================================================
  // 1. CABEÇALHO INSTITUCIONAL & IDENTIFICAÇÃO DO VOUCHER
  // =========================================================================
  doc.setFillColor(5, 61, 30); // #053d1e
  doc.rect(10, 8, 190, 26, 'F');

  if (logoData) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, 11, 20, 20, 3, 3, 'F');
      doc.addImage(logoData, 'PNG', 15.5, 12.5, 17, 17);
    } catch (e) {
      console.warn('[exportarVoucherReservaPdf] Erro ao inserir logo:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('HOTEL FAZENDA ANEW', 38, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 240, 225);
  doc.text('Distrito de Fala Verdade • Corguinho - MS • CNPJ: 47.680.087/0001-59', 38, 21);
  doc.text('Recepção & Reservas: (67) 99291-4359 • contato@hotelfazendaanew.io', 38, 25.5);

  const codReservaRaw =
    (reservaVinculada as any)?.codigoreserva ||
    reservaVinculada?.codigo ||
    (cadastro.reservaid ? `RES-${cadastro.reservaid}` : `FNRH-${cadastro.cadastroid}`);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(143, 11.5, 53, 19, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(5, 61, 30);
  doc.text('VOUCHER / RECIBO', 169.5, 16.5, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`#${codReservaRaw}`, 169.5, 22.5, { align: 'center' });

  const agora = new Date();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 100, 90);
  doc.text(`Emitido em ${agora.toLocaleDateString('pt-BR')}`, 169.5, 27.5, { align: 'center' });

  // Faixa de Título Confirmado
  doc.setFillColor(230, 244, 234);
  doc.rect(10, 36, 190, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 61, 30);
  doc.text('COMPROVANTE DE CONFIRMAÇÃO DE RESERVA & SINAL', 105, 41.3, { align: 'center' });

  // =========================================================================
  // 2. DADOS DO HÓSPEDE TITULAR & ACOMODAÇÃO
  // =========================================================================
  const quartoIdAlvo = reservaVinculada?.quartoid || (cadastro as any).quartoid;
  const quartoEncontrado = quartos.find((q) => Number(q.quartoid) === Number(quartoIdAlvo));
  const quartoTexto = quartoEncontrado
    ? `Chalé / Quarto ${quartoEncontrado.codigoidentificador || quartoEncontrado.numero} — ${quartoEncontrado.categoria || 'Standard'}`
    : reservaVinculada
    ? `Quarto #${reservaVinculada.quartoid}`
    : 'A definir no Check-in';

  const nomePacoteFinal =
    pacoteSugerido?.nome ||
    (pacotes.length > 0 && valorTotalOverride
      ? pacotes.find((p) => Number(p.valor) === valorTotalOverride)?.nome
      : '') ||
    'Pacote Hospedagem (Pensão Completa)';

  autoTable(doc, {
    startY: 47,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      lineColor: [193, 201, 191],
      lineWidth: 0.2,
      textColor: [25, 28, 29],
    },
    body: [
      [
        {
          content: '1. DADOS DO HÓSPEDE TITULAR E ESTADIA',
          colSpan: 4,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
      [
        { content: 'Hóspede Titular:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 34 } },
        { content: (cadastro.nomecompleto || '--').toUpperCase(), colSpan: 3, styles: { fontStyle: 'bold', textColor: [5, 61, 30], fontSize: 8.5 } },
      ],
      [
        { content: 'CPF:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.cpf ? formatarCpf(cadastro.cpf) : 'Não informado', styles: { cellWidth: 61 } },
        { content: 'Telefone / WhatsApp:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 36 } },
        { content: cadastro.telefone ? formatarTelefone(cadastro.telefone) : '--', styles: { cellWidth: 59 } },
      ],
      [
        { content: 'Check-in (Entrada):', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: `${formatarData(cadastro.dataentrada || '')} às ${cadastro.horarioprevistochegada || '09:00'}`, styles: { fontStyle: 'bold', textColor: [5, 61, 30] } },
        { content: 'Check-out (Saída):', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: `${formatarData(cadastro.datasaida || '')} até ${cadastro.horarioprevistasaida || '15:00'}`, styles: { fontStyle: 'bold', textColor: [5, 61, 30] } },
      ],
      [
        { content: 'Acomodação:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: quartoTexto, styles: { fontStyle: 'bold' } },
        { content: 'Pacote / Regime:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: nomePacoteFinal, styles: { fontStyle: 'bold' } },
      ],
    ],
  });

  // =========================================================================
  // 3. COMPOSIÇÃO DE HÓSPEDES & VALORES INDIVIDUAIS
  // =========================================================================
  const tarifaTitular = calcularTarifaHospede(
    cadastro.datanascimento,
    false,
    cadastro.dataentrada,
    cadastro.datasaida,
    pacotes
  );

  let somaTotalCalculada = tarifaTitular.valor;
  const linhasHospedes: any[] = [
    [
      { content: 'Titular', styles: { fontStyle: 'bold', halign: 'center', fillColor: [244, 249, 245] } },
      { content: (cadastro.nomecompleto || '').toUpperCase(), styles: { fontStyle: 'bold' } },
      { content: cadastro.datanascimento ? calcularIdade(cadastro.datanascimento) : 'Adulto', styles: { halign: 'center' } },
      { content: tarifaTitular.tipoTexto, styles: { halign: 'center', fontStyle: 'bold', textColor: [5, 61, 30] } },
      { content: formatarMoeda(tarifaTitular.valor), styles: { halign: 'right', fontStyle: 'bold' } },
    ],
  ];

  if (cadastro.acompanhantes && cadastro.acompanhantes.length > 0) {
    cadastro.acompanhantes.forEach((acomp, idx) => {
      const tarifa = calcularTarifaHospede(
        acomp.datanascimento,
        acomp.menoridade,
        cadastro.dataentrada,
        cadastro.datasaida,
        pacotes
      );
      somaTotalCalculada += tarifa.valor;

      const corTarifa: [number, number, number] =
        tarifa.tipo === 'MEIA' ? [180, 83, 9] : tarifa.tipo === 'GRATIS' ? [29, 78, 216] : [5, 61, 30];

      linhasHospedes.push([
        { content: `Acomp. #${idx + 1}`, styles: { halign: 'center', textColor: [100, 110, 100] } },
        { content: (acomp.nomecompleto || '').toUpperCase() },
        { content: acomp.datanascimento ? calcularIdade(acomp.datanascimento) : (acomp.menoridade ? 'Menor' : 'Adulto'), styles: { halign: 'center' } },
        { content: tarifa.tipoTexto, styles: { halign: 'center', fontStyle: 'bold', textColor: corTarifa } },
        { content: formatarMoeda(tarifa.valor), styles: { halign: 'right' } },
      ]);
    });
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    head: [
      [
        {
          content: '2. HÓSPEDES REGISTRADOS NA RESERVA',
          colSpan: 5,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'left' },
        },
      ],
      ['Vínculo', 'Nome Completo', 'Idade', 'Categoria Tarifária', 'Valor'],
    ],
    body: linhasHospedes,
    headStyles: {
      fillColor: [72, 119, 77],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2,
      lineColor: [193, 201, 191],
      lineWidth: 0.2,
      textColor: [25, 28, 29],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 36 },
      4: { cellWidth: 28 },
    },
  });

  // =========================================================================
  // 4. RECIBO FINANCEIRO DO SINAL & SALDO NO CHECK-IN
  // =========================================================================
  const valorTotalFinal =
    valorTotalOverride !== undefined && valorTotalOverride > 0
      ? valorTotalOverride
      : reservaVinculada?.valortotal || cadastro.valor_total || somaTotalCalculada;

  const valorSinalFinal =
    valorSinalOverride !== undefined
      ? valorSinalOverride
      : cadastro.valor_sinal > 0
      ? cadastro.valor_sinal
      : reservaVinculada?.valorpago || 0;

  const saldoRestante = Math.max(0, valorTotalFinal - valorSinalFinal);
  const formaPagFinal = formaPagamentoOverride || cadastro.forma_pagamento || 'PIX';

  const statusReciboTexto =
    valorSinalFinal > 0
      ? `SINAL RECEBIDO (${formatarMoeda(valorSinalFinal)} via ${formaPagFinal}) — VAGA GARANTIDA`
      : 'RESERVA LIBERADA PARA PAGAMENTO INTEGRAL NO CHECK-IN';

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: [193, 201, 191],
      lineWidth: 0.2,
      textColor: [25, 28, 29],
    },
    body: [
      [
        {
          content: '3. RECIBO DO SINAL E RESUMO FINANCEIRO',
          colSpan: 3,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        },
      ],
      [
        {
          content: `VALOR TOTAL DA ESTADIA\n${formatarMoeda(valorTotalFinal)}`,
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 249], cellWidth: 63.3 },
        },
        {
          content: `VALOR PAGO (SINAL)\n${formatarMoeda(valorSinalFinal)}`,
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 244, 234], textColor: [5, 61, 30], cellWidth: 63.3 },
        },
        {
          content: `SALDO A PAGAR NO CHECK-IN\n${formatarMoeda(saldoRestante)}`,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: saldoRestante > 0 ? [254, 243, 199] : [230, 244, 234],
            textColor: saldoRestante > 0 ? [146, 64, 14] : [5, 61, 30],
            cellWidth: 63.4,
          },
        },
      ],
      [
        {
          content: `Situação: ${statusReciboTexto}${comprovanteObs ? ` • Ref: ${comprovanteObs}` : ''}`,
          colSpan: 3,
          styles: { fontSize: 7.5, fontStyle: 'bold', textColor: [5, 61, 30], fillColor: [245, 250, 246] },
        },
      ],
    ],
  });

  // =========================================================================
  // 5. ORIENTAÇÕES IMPORTANTES & POLÍTICAS DO HOTEL FAZENDA
  // =========================================================================
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 2.5,
      lineColor: [193, 201, 191],
      lineWidth: 0.2,
      textColor: [40, 45, 42],
    },
    body: [
      [
        {
          content: '4. INFORMAÇÕES IMPORTANTES PARA SUA ESTADIA',
          styles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        },
      ],
      [
        {
          content:
            '• O que está incluso: Pensão completa (café da manhã, almoço e jantar conforme pacote), acesso às piscinas (07h às 22h) e passeios guiados (cachoeira, cavalgada, pôr do sol e vivência rural).\n\n' +
            '• O que trazer: Trajes de banho (proibido uso de jeans ou roupas que soltem tinta na piscina), protetor solar, repelente, medicamentos de uso contínuo (estamos em área rural a ~40km de centro urbano) e calçado fechado + calça comprida (obrigatórios para cavalgada).\n\n' +
            '• Documentação Obrigatória (ECA - Lei 8.069/90): Apresentação obrigatória de documento original com foto ou certidão de nascimento de todos os hóspedes, inclusive crianças e adolescentes.\n\n' +
            '• Regras de Convivência: Não é permitido fumar no interior dos chalés, entrar com animais de estimação nas dependências do hotel, portar recipientes de vidro nas áreas de lazer/piscina ou acessar o refeitório em trajes de banho/sem camisa.\n\n' +
            '• Política de Remarcação / Cancelamento: Alterações de data devem ser solicitadas com antecedência mínima de 72 horas antes do check-in para manutenção do crédito pago.',
          styles: { fillColor: [250, 251, 250] },
        },
      ],
    ],
  });

  // =========================================================================
  // RODAPÉ & ASSINATURA DIGITAL
  // =========================================================================
  const finalY = Math.min((doc as any).lastAutoTable.finalY + 12, 276);
  doc.setDrawColor(150, 160, 150);
  doc.setLineWidth(0.3);
  doc.line(65, finalY, 145, finalY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 61, 30);
  doc.text('HOTEL FAZENDA ANEW • RECEPÇÃO E RESERVAS', 105, finalY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(113, 121, 113);
  doc.text('Documento válido como comprovante de reserva e recibo do sinal pago.', 105, 290, { align: 'center' });

  const nomeSanitizado = (cadastro.nomecompleto || 'Hospede').trim().replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Voucher_${codReservaRaw}_${nomeSanitizado}.pdf`);
}