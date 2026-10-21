import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTucanoImg from '../imagens/logo-tucano-transparente.png';
import { CadastroFnrh, Reserva, Pacote, Quarto } from '../tipos';
import {
  formatarCpf,
  formatarTelefone,
  formatarData,
  formatarDataHora,
  formatarCep,
  formatarMoeda,
  calcularIdade,
  calcularIdadeNumerica
} from './formatadores';

export interface TarifaIndividual {
  tipo: 'INTEIRA' | 'MEIA' | 'GRATIS';
  tipoTexto: string;
  valor: number;
  idade: number;
  badgeClasse: string;
}

/**
 * Calcula a tarifa individual com base na idade atual da pessoa e na tabela oficial:
 * - 0 a 5 anos: Grátis (0%)
 * - 6 a 11 anos: Meia (50%)
 * - 12 anos ou mais: Inteira (100%)
 */
export const calcularTarifaHospede = (
  dataNascimento?: string,
  menoridade?: boolean,
  dataEntradaStr?: string,
  dataSaidaStr?: string,
  pacotesLista: Pacote[] = []
): TarifaIndividual => {
  const dEntrada = (dataEntradaStr || '').slice(0, 10).trim();
  const dSaida = (dataSaidaStr || '').slice(0, 10).trim();

  let dias = 2; // Padrão se não informado: 2 dias (Final de Semana)
  if (dEntrada && dSaida) {
    if (dEntrada === dSaida) {
      dias = 1; // Day Use
    } else {
      let d1: Date;
      let d2: Date;
      if (dEntrada.includes('/')) {
        const p1 = dEntrada.split('/');
        d1 = new Date(Number(p1[2]), Number(p1[1]) - 1, Number(p1[0]));
      } else {
        const p1 = dEntrada.split('-');
        d1 = new Date(Number(p1[0]), Number(p1[1]) - 1, Number(p1[2]));
      }
      if (dSaida.includes('/')) {
        const p2 = dSaida.split('/');
        d2 = new Date(Number(p2[2]), Number(p2[1]) - 1, Number(p2[0]));
      } else {
        const p2 = dSaida.split('-');
        d2 = new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]));
      }
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      dias = diff > 0 ? diff + 1 : 1;
    }
  }

  // Preço oficial do pacote por pessoa/adulto
  let valorBasePorPessoa = 550;
  if (dias === 1) {
    valorBasePorPessoa = 200;
  } else if (dias === 2) {
    valorBasePorPessoa = 550;
  } else if (dias === 3) {
    valorBasePorPessoa = 750;
  } else if (dias === 4) {
    valorBasePorPessoa = 950;
  } else {
    const pEncontrado = pacotesLista.find((p) => Number(p.quantidadedias) === dias);
    if (pEncontrado?.valor) {
      valorBasePorPessoa = Number(pEncontrado.valor);
    } else {
      valorBasePorPessoa = 950 + (dias - 4) * 200;
    }
  }

  // Se houver pacote correspondente cadastrado no banco com valor ativo
  const pacoteMatch = pacotesLista.find((p) => Number(p.quantidadedias) === dias);
  if (pacoteMatch?.valor && Number(pacoteMatch.valor) > 0) {
    valorBasePorPessoa = Number(pacoteMatch.valor);
  }

  // Idade calculada com base na data de nascimento
  let idade = 30; // Padrão adulto se não informada e não menor
  if (dataNascimento) {
    idade = calcularIdadeNumerica(dataNascimento);
  } else if (menoridade) {
    idade = 8;
  }

  if (dataNascimento) {
    const idadeNum = Number(idade);
    if (idadeNum <= 5) {
      return {
        tipo: 'GRATIS',
        tipoTexto: 'Grátis (0%)',
        valor: 0,
        idade: idadeNum,
        badgeClasse: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    } else if (idadeNum <= 11) {
      return {
        tipo: 'MEIA',
        tipoTexto: 'Meia (50%)',
        valor: valorBasePorPessoa * 0.5,
        idade: idadeNum,
        badgeClasse: 'bg-amber-50 text-amber-800 border-amber-300',
      };
    } else {
      return {
        tipo: 'INTEIRA',
        tipoTexto: 'Inteira (100%)',
        valor: valorBasePorPessoa,
        idade: idadeNum,
        badgeClasse: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      };
    }
  }

  if (menoridade) {
    return {
      tipo: 'MEIA',
      tipoTexto: 'Meia (50%)',
      valor: valorBasePorPessoa * 0.5,
      idade: 8,
      badgeClasse: 'bg-amber-50 text-amber-800 border-amber-300',
    };
  }

  return {
    tipo: 'INTEIRA',
    tipoTexto: 'Inteira (100%)',
    valor: valorBasePorPessoa,
    idade,
    badgeClasse: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  };
};

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
        console.warn('[geradorPdfFnrh] Falha ao converter imagem para canvas:', e);
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

/**
 * Gera e realiza o download do documento PDF oficial da Ficha FNRH do Hóspede
 * seguindo a identidade visual e o padrão da Folha de Estadia do Hotel Fazenda Anew.
 */
export async function exportarFichaFnrhPdf(
  cadastro: CadastroFnrh,
  reservaVinculada?: Reserva | null,
  pacotes: Pacote[] = [],
  quartos: Quarto[] = [],
  valorTotalSugerido?: number,
  pacoteSugerido?: Pacote | null
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoData = await obterLogoBase64();
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 10, 6, 17, 17);
    } catch (e) {
      console.warn('[exportarFichaFnrhPdf] Erro ao adicionar logo:', e);
    }
  }

  // =========================================================================
  // CABEÇALHO INSTITUCIONAL
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 70, 32); // #1E4620 (Verde Fazenda Oficial)
  doc.text('HOTEL FAZENDA ANEW', 105, 11, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 61, 30);
  doc.text('FICHA NACIONAL DE REGISTRO DE HÓSPEDES — FNRH', 105, 16.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 121, 113);

  const codReservaRaw = (reservaVinculada as any)?.codigoreserva || reservaVinculada?.codigo;
  const codReservaStr = codReservaRaw
    ? `Reserva: ${codReservaRaw}`
    : cadastro.reservaid
    ? `Reserva: RES-${cadastro.reservaid}`
    : 'Reserva em Processamento';

  const agora = new Date();
  const carimboEmissao = `Emissão: ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`Ficha #${cadastro.cadastroid} • ${codReservaStr} • ${carimboEmissao}`, 105, 21.5, { align: 'center' });

  // Linha divisória horizontal
  doc.setDrawColor(193, 201, 191);
  doc.setLineWidth(0.3);
  doc.line(10, 25, 200, 25);

  // =========================================================================
  // BLOCO 1: DADOS DO HÓSPEDE TITULAR
  // =========================================================================
  const enderecoCompleto = [
    cadastro.endereco,
    cadastro.numero ? `Nº ${cadastro.numero}` : '',
    cadastro.cidade,
    cadastro.estado,
    cadastro.cep ? `CEP: ${formatarCep(cadastro.cep)}` : ''
  ].filter(Boolean).join(', ') || 'Não informado';

  autoTable(doc, {
    startY: 28,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      lineColor: [193, 201, 191],
      lineWidth: 0.15,
      textColor: [25, 28, 29]
    },
    body: [
      [
        {
          content: '1. DADOS DO HÓSPEDE TITULAR',
          colSpan: 4,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 }
        }
      ],
      [
        { content: 'Nome Completo:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 32 } },
        { content: cadastro.nomecompleto || '--', colSpan: 3, styles: { fontStyle: 'bold', textColor: [5, 61, 30] } }
      ],
      [
        { content: 'CPF:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 32 } },
        { content: cadastro.cpf ? formatarCpf(cadastro.cpf) : 'Não informado', styles: { cellWidth: 63 } },
        { content: 'RG / Passaporte:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 28 } },
        { content: cadastro.rg || cadastro.passaporte || 'Não informado', styles: { cellWidth: 67 } }
      ],
      [
        { content: 'Nascimento / Idade:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: `${cadastro.datanascimento ? formatarData(cadastro.datanascimento) : '--'} (${calcularIdade(cadastro.datanascimento)})` },
        { content: 'Nacionalidade / Sexo:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: `${cadastro.nacionalidade || 'Brasileira'} • ${cadastro.sexo || '--'}` }
      ],
      [
        { content: 'Telefone / WhatsApp:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.telefone ? formatarTelefone(cadastro.telefone) : '--' },
        { content: 'E-mail:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.email || '--' }
      ],
      [
        { content: 'Profissão:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.profissao || 'Não informada' },
        { content: 'Procedência / Destino:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: `De: ${cadastro.ultimaprocedencia || '--'}  ➔  Para: ${cadastro.proximodestino || '--'}` }
      ],
      [
        { content: 'Endereço Residencial:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: enderecoCompleto, colSpan: 3 }
      ]
    ]
  });

  // =========================================================================
  // BLOCO 2: DADOS DA ESTADIA E TRANSPORTE
  // =========================================================================
  const quartoIdAlvo = reservaVinculada?.quartoid || (cadastro as any).quartoid;
  const quartoEncontrado = quartos.find((q) => q.quartoid === quartoIdAlvo);
  const quartoIdentificador = quartoEncontrado?.numero
    ? `Quarto ${quartoEncontrado.numero}`
    : quartoEncontrado?.codigoidentificador || '';
  const quartoTexto = quartoEncontrado
    ? `${quartoIdentificador} - ${quartoEncontrado.categoria || 'Standard'}${quartoEncontrado.bloco ? ` (${quartoEncontrado.bloco})` : ''}`
    : reservaVinculada
    ? `Quarto #${reservaVinculada.quartoid}`
    : 'A definir no Check-in';

  const totalAdultos = Math.max(1, Number(cadastro.adultos || 1));
  const totalCriancas = Number(cadastro.criancas || (cadastro.acompanhantes ? cadastro.acompanhantes.filter(a => a.menoridade).length : 0));
  const totalHospedes = Number(cadastro.numerohospedes) || (1 + (cadastro.acompanhantes?.length || 0));

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      lineColor: [193, 201, 191],
      lineWidth: 0.15,
      textColor: [25, 28, 29]
    },
    body: [
      [
        {
          content: '2. DADOS DA ESTADIA E TRANSPORTE',
          colSpan: 4,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 }
        }
      ],
      [
        { content: 'Data de Entrada:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 32 } },
        { content: `${formatarData(cadastro.dataentrada || '')} ${cadastro.horarioprevistochegada ? `(Prev: ${cadastro.horarioprevistochegada})` : ''}`, styles: { cellWidth: 63 } },
        { content: 'Data de Saída:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 28 } },
        { content: `${formatarData(cadastro.datasaida || '')} ${cadastro.horarioprevistasaida ? `(Prev: ${cadastro.horarioprevistasaida})` : ''}`, styles: { cellWidth: 67 } }
      ],
      [
        { content: 'Quarto / Acomodação:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: quartoTexto, styles: { fontStyle: 'bold', textColor: [5, 61, 30] } },
        { content: 'Hóspedes Previstos:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: `${totalHospedes} pessoas (${totalAdultos} Adulto(s) e ${totalCriancas} Criança(s))` }
      ],
      [
        { content: 'Motivo da Viagem:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.motivoviagem || 'Lazer / Descanso' },
        { content: 'Meio de Transporte:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.transporte || 'Veículo Próprio' }
      ],
      [
        { content: 'Veículo / Modelo / Cor:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.modelocor || 'Não informado' },
        { content: 'Placa do Veículo:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.placa ? cadastro.placa.toUpperCase() : 'Sem veículo informado', styles: { fontStyle: 'bold' } }
      ]
    ]
  });

  // =========================================================================
  // BLOCO 3: ACOMPANHANTES & TARIFAS (Tabela Estruturada)
  // =========================================================================
  const tarifaTitular = calcularTarifaHospede(
    cadastro.datanascimento,
    false,
    cadastro.dataentrada,
    cadastro.datasaida,
    pacotes
  );

  let somaTotalTarifas = tarifaTitular.valor;

  const colunasAcomps = ['Tipo', 'Nome Completo', 'Documento', 'Data Nasc.', 'Idade', 'Tarifa Aplicada', 'Valor'];
  const bodyAcomps: any[] = [];

  // Linha de Titular
  bodyAcomps.push([
    { content: 'Titular', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 248, 242] } },
    { content: cadastro.nomecompleto, styles: { fontStyle: 'bold' } },
    { content: cadastro.cpf ? formatarCpf(cadastro.cpf) : 'Não informado', styles: { halign: 'center' } },
    { content: cadastro.datanascimento ? formatarData(cadastro.datanascimento) : '--', styles: { halign: 'center' } },
    { content: calcularIdade(cadastro.datanascimento), styles: { halign: 'center' } },
    { content: tarifaTitular.tipoTexto, styles: { halign: 'center', fontStyle: 'bold', textColor: [5, 61, 30] } },
    { content: formatarMoeda(tarifaTitular.valor), styles: { halign: 'right', fontStyle: 'bold' } }
  ]);

  // Linhas de Acompanhantes
  if (cadastro.acompanhantes && cadastro.acompanhantes.length > 0) {
    cadastro.acompanhantes.forEach((acomp, idx) => {
      const tarifa = calcularTarifaHospede(
        acomp.datanascimento,
        acomp.menoridade,
        cadastro.dataentrada,
        cadastro.datasaida,
        pacotes
      );
      somaTotalTarifas += tarifa.valor;

      const corTarifa: [number, number, number] =
        tarifa.tipo === 'MEIA'
          ? [180, 83, 9] // Âmbar
          : tarifa.tipo === 'GRATIS'
          ? [29, 78, 216] // Azul
          : [5, 61, 30]; // Verde

      bodyAcomps.push([
        { content: `Acomp. #${idx + 1}`, styles: { halign: 'center', textColor: [113, 121, 113] } },
        { content: acomp.nomecompleto },
        { content: acomp.documento || 'Sem doc.', styles: { halign: 'center' } },
        { content: acomp.datanascimento ? formatarData(acomp.datanascimento) : '--', styles: { halign: 'center' } },
        { content: acomp.datanascimento ? calcularIdade(acomp.datanascimento) : (acomp.menoridade ? 'Menor' : 'Adulto'), styles: { halign: 'center' } },
        { content: tarifa.tipoTexto, styles: { halign: 'center', fontStyle: 'bold', textColor: corTarifa } },
        { content: formatarMoeda(tarifa.valor), styles: { halign: 'right' } }
      ]);
    });
  }

  // Linha de Subtotal
  bodyAcomps.push([
    {
      content: 'SUBTOTAL ESTIMADO DAS TARIFAS:',
      colSpan: 6,
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 248, 242], textColor: [5, 61, 30] }
    },
    {
      content: formatarMoeda(somaTotalTarifas),
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 248, 242], textColor: [5, 61, 30] }
    }
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    head: [
      [
        {
          content: '3. ACOMPANHANTES & TARIFAS (Composição por Hóspede)',
          colSpan: 7,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' }
        }
      ],
      colunasAcomps
    ],
    body: bodyAcomps,
    headStyles: {
      fillColor: [72, 119, 77],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      lineColor: [193, 201, 191],
      lineWidth: 0.15,
      textColor: [25, 28, 29]
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 28 },
      6: { cellWidth: 24 }
    }
  });

  // =========================================================================
  // BLOCO 4: OBSERVAÇÕES, RESTRIÇÕES & DECLARAÇÃO LEGAL
  // =========================================================================
  const dataDeclaracaoStr = cadastro.data_declaracao
    ? formatarDataHora(cadastro.data_declaracao)
    : cadastro.datainclusao
    ? formatarDataHora(cadastro.datainclusao)
    : `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR')}`;

  const statusAceiteTexto = cadastro.declaracao_aceita
    ? `✔ DECLARAÇÃO DA FNRH ACEITA PELO CLIENTE em ${dataDeclaracaoStr}`
    : `Declaração da FNRH registrada no sistema em ${dataDeclaracaoStr}`;

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      lineColor: [193, 201, 191],
      lineWidth: 0.15,
      textColor: [25, 28, 29]
    },
    body: [
      [
        {
          content: '4. OBSERVAÇÕES, RESTRIÇÕES & DECLARAÇÃO LEGAL',
          colSpan: 2,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 }
        }
      ],
      [
        { content: 'Alergias / Restrições Alimentares:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 50 } },
        { content: cadastro.alergias_restricoes || 'Nenhuma alergia ou restrição alimentar informada.' }
      ],
      [
        { content: 'Solicitações Especiais:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 50 } },
        { content: cadastro.solicitacoes_especiais || 'Nenhuma solicitação especial registrada.' }
      ],
      [
        {
          content: `TERMO DE DECLARAÇÃO E RESPONSABILIDADE:\n"Declaro sob as penas da lei que todas as informações prestadas nesta Ficha Nacional de Registro de Hóspedes (FNRH) são verdadeiras e autênticas. Estou ciente e de pleno acordo com as normas de hospedagem do Hotel Fazenda Anew."\n\n${statusAceiteTexto}`,
          colSpan: 2,
          styles: { fillColor: [248, 249, 250], fontSize: 6.8, textColor: [40, 50, 40], fontStyle: 'italic' }
        }
      ]
    ]
  });

  // =========================================================================
  // BLOCO 5: INFORMAÇÕES FINANCEIRAS DA RESERVA
  // =========================================================================
  const valorTotalFinal =
    reservaVinculada?.valortotal ||
    cadastro.valor_total ||
    valorTotalSugerido ||
    somaTotalTarifas;

  const valorSinalFinal =
    cadastro.valor_sinal > 0
      ? cadastro.valor_sinal
      : (reservaVinculada?.valorpago && reservaVinculada.valorpago > 0)
      ? reservaVinculada.valorpago
      : valorTotalFinal * 0.5;

  const nomePacoteFinal =
    pacoteSugerido?.nome ||
    (pacotes.length > 0
      ? pacotes.find((p) => Number(p.valor) === valorTotalFinal)?.nome || 'Pacote Padrão'
      : 'Pacote Estadia');

  const statusPagamentoTexto = cadastro.pagamento_confirmado_em
    ? `Sinal Confirmado em ${formatarDataHora(cadastro.pagamento_confirmado_em)}`
    : (reservaVinculada && (reservaVinculada.valorpago || 0) > 0)
    ? `Sinal registrado na Reserva (${formatarMoeda(reservaVinculada.valorpago || 0)})`
    : 'Pendente de confirmação do sinal';

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      lineColor: [193, 201, 191],
      lineWidth: 0.15,
      textColor: [25, 28, 29]
    },
    body: [
      [
        {
          content: '5. INFORMAÇÕES FINANCEIRAS DA RESERVA',
          colSpan: 4,
          styles: { fillColor: [30, 70, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 }
        }
      ],
      [
        { content: 'Total Previsto da Estadia:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 42 } },
        { content: formatarMoeda(valorTotalFinal), styles: { fontStyle: 'bold', fontSize: 8.5, textColor: [5, 61, 30], cellWidth: 53 } },
        { content: 'Pacote Aplicado:', styles: { fontStyle: 'bold', textColor: [65, 73, 65], cellWidth: 38 } },
        { content: nomePacoteFinal, styles: { fontStyle: 'bold', cellWidth: 57 } }
      ],
      [
        { content: 'Valor do Sinal (50%):', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: formatarMoeda(valorSinalFinal), styles: { fontStyle: 'bold', textColor: [5, 61, 30] } },
        { content: 'Forma de Pagamento:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        { content: cadastro.forma_pagamento || 'PIX' }
      ],
      [
        { content: 'Status do Pagamento:', styles: { fontStyle: 'bold', textColor: [65, 73, 65] } },
        {
          content: statusPagamentoTexto,
          colSpan: 3,
          styles: {
            fontStyle: 'bold',
            textColor: (cadastro.pagamento_confirmado_em || (reservaVinculada && (reservaVinculada.valorpago || 0) > 0))
              ? [5, 61, 30]
              : [180, 83, 9]
          }
        }
      ]
    ]
  });

  // =========================================================================
  // NUMERAÇÃO DE PÁGINAS E RODAPÉ INSTITUCIONAL
  // =========================================================================
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(113, 121, 113);
    doc.setFont('helvetica', 'normal');
    doc.text('Hotel Fazenda Anew • Ficha Nacional de Registro de Hóspedes (FNRH) Oficial', 10, 292);
    doc.text(`Página ${i} de ${totalPaginas}`, 200, 292, { align: 'right' });
  }

  // Nome do arquivo padronizado
  const codIdentificador = codReservaRaw || `FNRH-${cadastro.cadastroid}`;
  const nomeSanitizado = (cadastro.nomecompleto || 'Hospede').trim().replace(/[^a-zA-Z0-9]/g, '_');
  const nomeArquivo = `FNRH_${cadastro.cadastroid}_${codIdentificador}_${nomeSanitizado}.pdf`;

  doc.save(nomeArquivo);
}
