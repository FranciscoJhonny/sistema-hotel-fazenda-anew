import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  Printer,
  Calendar,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  Utensils,
  Bed,
  Info,
  CalendarDays,
  FileSpreadsheet,
  Download,
  BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoTucanoImg from '../imagens/logo-tucano-transparente.png';
import { useHotel } from '../contextos/ContextoHotel';
import { formatarMoeda, formatarData } from '../utilitarios/formatadores';
import { SupabaseService } from '../servicos/supabase/SupabaseService';
import { Hospede } from '../tipos';

type AbaRelatorio = 'QUARTOS' | 'REFEITORIO' | 'FINANCEIRO';

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
        console.warn('[PaginaRelatorioFazenda] Falha ao converter imagem para canvas:', e);
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

export const exportarManualOperacionalPdf = async () => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoData = await obterLogoBase64();

  doc.setFillColor(30, 70, 32);
  doc.rect(0, 0, 210, 24, 'F');

  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', 10, 3, 18, 18);
    } catch (e) {
      console.warn('[exportarManualOperacionalPdf] Erro ao adicionar logo:', e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HOTEL FAZENDA ANEW — MANUAL OPERACIONAL', 105, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Guia Oficial de Fluxos: Reservas, Ocupação, Refeitório e Financeiro', 105, 18, { align: 'center' });

  doc.setTextColor(30, 70, 32);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Fluxo de Entrada e Confirmação de Sinal', 14, 32);

  autoTable(doc, {
    startY: 35,
    head: [['Etapa', 'Ação no Sistema', 'Procedimento Operacional']],
    body: [
      ['1. Pré-Cadastro', 'Registro FNRH', 'O cliente preenche o formulário online ou a recepção faz o lançamento inicial.'],
      ['2. Sinal (50%)', 'Confirmar Sinal', 'Registrar o valor e a forma de pagamento (PIX, Cartão ou Dinheiro).'],
      ['3. Sem Sinal', 'Opção Check-out', 'Caso autorizado pelo gerente, assinalar para quitação total na saída.'],
      ['4. Alocação', 'Mapa de Quartos', 'O quarto físico é alocado no calendário sem sobreposições.']
    ],
    theme: 'grid',
    headStyles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 40, fontStyle: 'bold' },
      2: { cellWidth: 'auto' }
    }
  });

  const yRegras = (doc as any).lastAutoTable.finalY + 8;
  doc.setTextColor(30, 70, 32);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Regras Oficiais de Tarifação e Idades', 14, yRegras);

  autoTable(doc, {
    startY: yRegras + 3,
    head: [['Faixa Etária', 'Classificação', 'Impacto na Diária', 'Contabilização na Grid']],
    body: [
      ['A partir de 12 anos', 'Adulto Integral', 'Paga 100% da diária', 'Soma na coluna "Adultos"'],
      ['6 a 11 anos', 'Criança Meia', 'Paga 50% da diária', 'Soma na coluna "Crianças"'],
      ['0 a 5 anos', 'Criança Grátis', 'Isento (100% gratuito)', 'Ignorado na contagem de pagantes']
    ],
    theme: 'grid',
    headStyles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 45 },
      3: { cellWidth: 'auto', fontStyle: 'bold' }
    }
  });

  const yAcoes = (doc as any).lastAutoTable.finalY + 8;
  doc.setTextColor(30, 70, 32);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Operações no Mapa de Quartos', 14, yAcoes);

  autoTable(doc, {
    startY: yAcoes + 3,
    head: [['Botão de Ação', 'Quando Utilizar', 'Resultado no Sistema']],
    body: [
      ['Trocar Quarto', 'Transferência de acomodação física', 'Altera o quarto mantendo os valores e as datas inalterados.'],
      ['Remarcar Datas', 'O cliente já sabe o novo período', 'Atualiza a estadia com validação de conflito e preserva o sinal.'],
      ['Suspender (Crédito)', 'Cancelamento com retenção de valor', 'Libera o quarto e guarda o pagamento como crédito para reagendamento.'],
      ['Realizar Check-in', 'Entrada dos hóspedes no hotel', 'Muda o status para HOSPEDADO e ativa o consumo.'],
      ['Ir para Check-out', 'Saída e fechamento de contas', 'Calcula diárias restantes + bar + loja e finaliza a fatura.'],
      ['Cancelar Reserva', 'Desistência sem crédito futuro', 'Cancela o registro e desocupa o quarto em definitivo.']
    ],
    theme: 'grid',
    headStyles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 'auto' }
    }
  });

  const yFolha = (doc as any).lastAutoTable.finalY + 8;
  doc.setTextColor(30, 70, 32);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Folha de Campo e Relatórios para a Fazenda', 14, yFolha);

  autoTable(doc, {
    startY: yFolha + 3,
    head: [['Relatório', 'Destinatário', 'Finalidade Operacional']],
    body: [
      ['Ocupação por Quarto', 'Recepção e Governança', 'Divisão por blocos (B, C, D) com indicação de todos os ocupantes.'],
      ['Relação do Refeitório', 'Cozinha e Eventos', 'Contagem diária exata de refeições (Adultos, Meias e Isentos).'],
      ['Valores a Receber', 'Caixa e Administração', 'Listagem de contatos e saldos pendentes a liquidar no check-out.'],
      ['WhatsApp e PDF', 'Equipe de Operações', 'Envio automático do resumo em texto e exportação direta da folha A4.']
    ],
    theme: 'grid',
    headStyles: { fillColor: [72, 119, 77], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 'auto' }
    }
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`Hotel Fazenda Anew • Procedimento Operacional Padrão • Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save('Hotel_Fazenda_Anew_Manual_Operacional.pdf');
};

const calcularIdade = (dataNascStr?: string): number | null => {
  if (!dataNascStr) return null;
  const dataLimpa = String(dataNascStr).split('T')[0].split(' ')[0];
  const partes = dataLimpa.split('-');
  if (partes.length < 3) return null;
  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const m = hoje.getMonth() - mes;
  if (m < 0 || (m === 0 && hoje.getDate() < dia)) {
    idade--;
  }
  return Math.max(0, idade);
};

export const PaginaRelatorioFazenda: React.FC = () => {
  const { reservas, quartos, hospedes } = useHotel();
  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>('QUARTOS');
  const [acompanhantesDb, setAcompanhantesDb] = useState<any[]>([]);
  const [hospedesLive, setHospedesLive] = useState<Hospede[]>([]);
  const [copiadoWhatsApp, setCopiadoWhatsApp] = useState<boolean>(false);

  // Define padrão do final de semana atual/próximo
  const obterFimDeSemanaPadrao = () => {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = Domingo, 5 = Sexta, 6 = Sábado
    const diffParaSexta = (5 - diaSemana + 7) % 7;
    const sexta = new Date(hoje);
    sexta.setDate(hoje.getDate() + (diaSemana === 0 ? -2 : diaSemana === 6 ? -1 : diffParaSexta));
    const domingo = new Date(sexta);
    domingo.setDate(sexta.getDate() + 2);

    return {
      inicio: sexta.toISOString().split('T')[0],
      fim: domingo.toISOString().split('T')[0],
    };
  };

  const fdsPadrao = useMemo(() => obterFimDeSemanaPadrao(), []);
  const [dataInicio, setDataInicio] = useState<string>(fdsPadrao.inicio);
  const [dataFim, setDataFim] = useState<string>(fdsPadrao.fim);

  // Carrega acompanhantes do banco de dados (Supabase)
  const carregarAcompanhantes = useCallback(async () => {
    try {
      const supabase = SupabaseService.getInstance().getClient();
      if (!supabase) return;

      const [resAcomp, resFnrhAcomp, resHosp] = await Promise.all([
        supabase.from('acompanhante').select('*'),
        supabase.from('cadastro_fnrh_acompanhante').select('*'),
        supabase.from('hospede').select('*'),
      ]);

      const mapAcomp = new Map<string, any>();
      (resAcomp.data || []).forEach((item: any) => {
        const chave = `${(item.nomecompleto || '').trim().toLowerCase()}_${item.reservaid || item.cadastroid}`;
        mapAcomp.set(chave, item);
      });
      (resFnrhAcomp.data || []).forEach((item: any) => {
        const chave = `${(item.nomecompleto || '').trim().toLowerCase()}_${item.reservaid || item.cadastroid}`;
        if (!mapAcomp.has(chave)) {
          mapAcomp.set(chave, item);
        }
      });

      setAcompanhantesDb(Array.from(mapAcomp.values()));
      if (resHosp.data) {
        setHospedesLive(resHosp.data as Hospede[]);
      }
    } catch (err) {
      console.warn('[PaginaRelatorioFazenda] Erro ao carregar acompanhantes:', err);
    }
  }, []);

  useEffect(() => {
    carregarAcompanhantes();
  }, [carregarAcompanhantes]);

  // Mapa consolidado de hóspedes
  const mapaHospedes = useMemo(() => {
    const mapa = new Map<number, Hospede>();
    (hospedes || []).forEach(h => mapa.set(Number(h.hospedeid), h));
    (hospedesLive || []).forEach(h => mapa.set(Number(h.hospedeid), { ...mapa.get(Number(h.hospedeid)), ...h }));
    return mapa;
  }, [hospedes, hospedesLive]);

  // Filtra as reservas ativas dentro do período informado
  const reservasDoPeriodo = useMemo(() => {
    const statusValidos = ['RESERVADO', 'HOSPEDADO', 'CONCLUIDA', 'PRE_RESERVA'];
    return (reservas || []).filter(r => {
      if (!statusValidos.includes(r.statusreserva)) return false;
      const entrada = (r.dataentrada || '').split('T')[0];
      const saida = (r.datasaida || '').split('T')[0];
      return entrada <= dataFim && saida >= dataInicio;
    });
  }, [reservas, dataInicio, dataFim]);

  // Enriquece as reservas com os acompanhantes e contagens etárias exatas
  const reservasEnriquecidas = useMemo(() => {
    return reservasDoPeriodo.map(reserva => {
      const quarto = quartos?.find(q => String(q.quartoid) === String(reserva.quartoid));
      const titular = mapaHospedes.get(Number(reserva.hospedeid));
      const idadeTitular = calcularIdade(titular?.datanascimento);

      const acompsDaReserva = acompanhantesDb.filter(
        a =>
          (a.reservaid && Number(a.reservaid) === Number(reserva.reservaid)) ||
          (a.cadastroid && reserva.cadastroid && Number(a.cadastroid) === Number(reserva.cadastroid))
      );

      let adultosCalc = 0;
      let criancasMeiaCalc = 0;
      let criancasGratisCalc = 0;

      // Titular
      if (idadeTitular !== null) {
        if (idadeTitular >= 12) adultosCalc++;
        else if (idadeTitular >= 6) criancasMeiaCalc++;
        else criancasGratisCalc++;
      } else {
        adultosCalc++;
      }

      // Acompanhantes
      acompsDaReserva.forEach(a => {
        const idade = calcularIdade(a.datanascimento);
        if (idade !== null) {
          if (idade >= 12) adultosCalc++;
          else if (idade >= 6) criancasMeiaCalc++;
          else criancasGratisCalc++;
        } else {
          if (a.menoridade === false) adultosCalc++;
          else if (a.menoridade === true) criancasMeiaCalc++;
          else adultosCalc++;
        }
      });

      const qtdAdultos = (acompsDaReserva.length > 0 || titular)
        ? Math.max(adultosCalc, Number(reserva.adultos || 0))
        : Number(reserva.adultos || 1);

      const qtdCriancasMeia = (acompsDaReserva.length > 0)
        ? criancasMeiaCalc
        : Number(reserva.criancas || 0);

      const qtdCriancasGratis = criancasGratisCalc;

      const valorTotal = Number(reserva.valortotal || 0);
      const valorPago = Number(reserva.valorpago || 0);
      const saldoPendente = Number(reserva.saldo !== undefined ? reserva.saldo : Math.max(0, valorTotal - valorPago));

      return {
        ...reserva,
        quartoCodigo: quarto?.codigoidentificador || reserva.quartocodigo || reserva.quartonumero || 'S/N',
        quartoCategoria: quarto?.categoria || 'Standard',
        titularNome: reserva.hospedenome || titular?.nomecompleto || 'Hóspede',
        titularTelefone: reserva.hospedetelefone || titular?.telefone || titular?.whatsapp || '',
        acompanhantes: acompsDaReserva,
        qtdAdultos,
        qtdCriancasMeia,
        qtdCriancasGratis,
        totalPessoas: qtdAdultos + qtdCriancasMeia + qtdCriancasGratis,
        valorTotal,
        valorPago,
        saldoPendente,
      };
    }).sort((a, b) => (a.quartoCodigo || '').localeCompare(b.quartoCodigo || ''));
  }, [reservasDoPeriodo, quartos, mapaHospedes, acompanhantesDb]);

  // Agrupamento por Bloco (Bloco B, Bloco C, Bloco D e Chalés/Outros) para a Aba 1
  const quartosPorBloco = useMemo(() => {
    const blocos: Record<string, any[]> = {
      'Bloco B': [],
      'Bloco C': [],
      'Bloco D': [],
      'Chalés & Outros': []
    };

    // Ordena os quartos fisicamente
    const quartosOrdenados = [...(quartos || [])]
      .filter(q => {
        const cod = String(q.codigoidentificador || q.numero || '').toUpperCase();
        return cod !== 'DAY_USE' && cod !== 'DU';
      })
      .sort((a, b) => String(a.codigoidentificador || a.numero).localeCompare(String(b.codigoidentificador || b.numero)));

    quartosOrdenados.forEach(q => {
      const cod = String(q.codigoidentificador || q.numero || '').toUpperCase();
      let nomeBloco = 'Chalés & Outros';
      if (cod.startsWith('B')) nomeBloco = 'Bloco B';
      else if (cod.startsWith('C')) nomeBloco = 'Bloco C';
      else if (cod.startsWith('D')) nomeBloco = 'Bloco D';

      const reservaAtiva = reservasEnriquecidas.find(r => String(r.quartoid) === String(q.quartoid));

      blocos[nomeBloco].push({
        quarto: q,
        codigo: cod,
        categoria: q.categoria || 'Standard',
        reserva: reservaAtiva,
        ocupado: Boolean(reservaAtiva),
      });
    });

    return blocos;
  }, [quartos, reservasEnriquecidas]);

  // Totais consolidados para a linha de fechamento do refeitório e financeiro
  const totaisGerais = useMemo(() => {
    return reservasEnriquecidas.reduce((acc, r) => ({
      adultos: acc.adultos + r.qtdAdultos,
      criancasMeia: acc.criancasMeia + r.qtdCriancasMeia,
      criancasGratis: acc.criancasGratis + r.qtdCriancasGratis,
      totalPessoas: acc.totalPessoas + r.totalPessoas,
      valorTotal: acc.valorTotal + r.valorTotal,
      valorPago: acc.valorPago + r.valorPago,
      saldoPendente: acc.saldoPendente + r.saldoPendente,
    }), {
      adultos: 0,
      criancasMeia: 0,
      criancasGratis: 0,
      totalPessoas: 0,
      valorTotal: 0,
      valorPago: 0,
      saldoPendente: 0,
    });
  }, [reservasEnriquecidas]);

  // Copia o relatório de ocupação estruturado para o WhatsApp
  const handleCopiarWhatsApp = () => {
    let texto = `🌾 *HOTEL FAZENDA ANEW — FOLHA DE CAMPO*\n`;
    texto += `📅 *Período:* ${formatarData(dataInicio)} à ${formatarData(dataFim)}\n\n`;

    Object.entries(quartosPorBloco).forEach(([bloco, lista]) => {
      if (lista.length === 0) return;
      texto += `🏨 *${bloco.toUpperCase()}*\n`;

      lista.forEach(item => {
        if (item.reserva) {
          const r = item.reserva;
          let acompsStr = '';
          if (r.acompanhantes && r.acompanhantes.length > 0) {
            acompsStr = ' + ' + r.acompanhantes.map((a: any) => {
              const idade = calcularIdade(a.datanascimento);
              const idadeStr = idade !== null ? ` (${idade}a)` : '';
              return `${a.nomecompleto || a.nome}${idadeStr}`;
            }).join(', ');
          }
          texto += `• *${item.codigo}:* ${r.titularNome}${acompsStr}\n`;
        } else {
          texto += `• *${item.codigo}:* _LIVRE / DISPONÍVEL_\n`;
        }
      });
      texto += `\n`;
    });

    texto += `📊 *RESUMO OPERACIONAL:*\n`;
    texto += `• *Total de Reservas:* ${reservasEnriquecidas.length}\n`;
    texto += `• *Adultos:* ${totaisGerais.adultos}\n`;
    texto += `• *Crianças (6 a 11a):* ${totaisGerais.criancasMeia}\n`;
    texto += `• *Crianças (0 a 5a isentas):* ${totaisGerais.criancasGratis}\n`;
    texto += `• *Total de Pessoas:* ${totaisGerais.totalPessoas}\n\n`;
    texto += `_Relatório gerado automaticamente pelo Sistema Hotel Fazenda Anew_`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoWhatsApp(true);
      setTimeout(() => setCopiadoWhatsApp(false), 3500);
    });
  };

  // Exportação nativa direta em PDF com jsPDF + autotable
  const exportarPdfDireto = async () => {
    const nomeAba = abaAtiva === 'QUARTOS' 
      ? 'Ocupacao_Quartos' 
      : abaAtiva === 'REFEITORIO' 
      ? 'Relacao_Refeitorio' 
      : 'Valores_a_Receber';

    const tituloAba = abaAtiva === 'QUARTOS'
      ? '1. Ocupação por Quarto (Blocos)'
      : abaAtiva === 'REFEITORIO'
      ? '2. Relação Geral / Refeitório'
      : '3. Valores a Receber (Recepção)';

    const nomeArquivo = `Hotel_Fazenda_Anew_${nomeAba}_${dataInicio}_a_${dataFim}.pdf`;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const logoData = await obterLogoBase64();
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', 10, 5, 18, 18);
      } catch (e) {
        console.warn('[exportarPdfDireto] Erro ao adicionar logo:', e);
      }
    }

    // Cabeçalho Institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 70, 32); // #1E4620
    doc.text('HOTEL FAZENDA ANEW — FOLHA DE CAMPO', 105, 13, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(65, 73, 65); // #414941
    doc.text(`Período: ${formatarData(dataInicio)} à ${formatarData(dataFim)}`, 105, 18.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 121, 113); // #717971
    doc.text(`${tituloAba} • ${reservasEnriquecidas.length} Reservas Ativas no Período`, 105, 23.5, { align: 'center' });

    if (abaAtiva === 'QUARTOS') {
      const colunas = ['Quarto', 'Status / Categoria', 'Hóspedes / Acompanhantes', 'Período'];
      const body: any[] = [];

      Object.entries(quartosPorBloco).forEach(([bloco, lista]) => {
        // Linha de Cabeçalho do Bloco
        body.push([
          {
            content: `${bloco} (${lista.filter(i => i.ocupado).length} Ocupados / ${lista.length} Total)`,
            colSpan: 4,
            styles: {
              fillColor: [30, 70, 32],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8,
              halign: 'left'
            }
          }
        ]);

        lista.forEach(item => {
          if (item.ocupado && item.reserva) {
            const r = item.reserva;
            let acompsTexto = `${r.titularNome} (Titular)`;
            if (r.acompanhantes && r.acompanhantes.length > 0) {
              acompsTexto += '\nAcompanhantes:\n' + r.acompanhantes.map((a: any) => {
                const idade = calcularIdade(a.datanascimento);
                const idadeStr = idade !== null ? ` (${idade}a)` : '';
                const parentescoStr = a.parentesco ? ` - ${a.parentesco}` : '';
                return `• ${a.nomecompleto || a.nome}${idadeStr}${parentescoStr}`;
              }).join('\n');
            }

            body.push([
              { content: item.codigo, styles: { fontStyle: 'bold', halign: 'center', textColor: [5, 61, 30] } },
              { content: `OCUPADO\n${item.categoria || 'Standard'}`, styles: { halign: 'center', fontSize: 7 } },
              { content: acompsTexto, styles: { halign: 'left' } },
              { content: `${formatarData(r.dataentrada)}\na\n${formatarData(r.datasaida)}`, styles: { halign: 'center' } },
            ]);
          } else {
            body.push([
              { content: item.codigo, styles: { fontStyle: 'bold', halign: 'center', textColor: [120, 120, 120] } },
              { content: `DISPONÍVEL\n${item.categoria || 'Standard'}`, styles: { halign: 'center', textColor: [120, 120, 120], fontSize: 7 } },
              { content: 'LIVRE / DISPONÍVEL', styles: { halign: 'left', fontStyle: 'italic', textColor: [130, 130, 130] } },
              { content: '-', styles: { halign: 'center', textColor: [130, 130, 130] } },
            ]);
          }
        });
      });

      autoTable(doc, {
        startY: 27,
        head: [colunas],
        body: body,
        theme: 'grid',
        headStyles: {
          fillColor: [72, 119, 77],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [209, 213, 219],
          lineWidth: 0.15,
          textColor: [25, 28, 29]
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 32 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 28 }
        },
        margin: { top: 10, bottom: 12, left: 8, right: 8 }
      });
    } else if (abaAtiva === 'REFEITORIO') {
      const colunas = ['Quarto', 'Período', 'Hóspedes no Quarto', 'Adultos (>=12a)', 'Crianças (6-11a)', 'Grátis (0-5a)', 'Total Pessoas'];
      const body: any[] = [];

      reservasEnriquecidas.forEach(r => {
        let hospedesTexto = `${r.titularNome} (Titular)`;
        if (r.acompanhantes && r.acompanhantes.length > 0) {
          hospedesTexto += '\n' + r.acompanhantes.map((a: any) => {
            const idade = calcularIdade(a.datanascimento);
            const idadeStr = idade !== null ? ` (${idade}a)` : '';
            return `• ${a.nomecompleto || a.nome}${idadeStr}`;
          }).join('\n');
        }

        body.push([
          { content: r.quartoCodigo, styles: { fontStyle: 'bold', halign: 'center', textColor: [5, 61, 30] } },
          { content: `${formatarData(r.dataentrada)}\na\n${formatarData(r.datasaida)}`, styles: { halign: 'center' } },
          { content: hospedesTexto, styles: { halign: 'left' } },
          { content: String(r.qtdAdultos), styles: { halign: 'center', fontStyle: 'bold' } },
          { content: String(r.qtdCriancasMeia), styles: { halign: 'center', fontStyle: 'bold' } },
          { content: String(r.qtdCriancasGratis), styles: { halign: 'center' } },
          { content: String(r.totalPessoas), styles: { halign: 'center', fontStyle: 'bold', textColor: [5, 61, 30] } }
        ]);
      });

      autoTable(doc, {
        startY: 27,
        head: [colunas],
        body: body,
        foot: [
          [
            { content: 'TOTAIS DE REFEIÇÃO / CONSUMO:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } },
            { content: String(totaisGerais.adultos), styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } },
            { content: String(totaisGerais.criancasMeia), styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } },
            { content: String(totaisGerais.criancasGratis), styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } },
            { content: String(totaisGerais.totalPessoas), styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } }
          ]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [72, 119, 77],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [209, 213, 219],
          lineWidth: 0.15,
          textColor: [25, 28, 29]
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 26 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 22 },
          4: { cellWidth: 24 },
          5: { cellWidth: 22 },
          6: { cellWidth: 22 }
        },
        margin: { top: 10, bottom: 12, left: 8, right: 8 }
      });
    } else {
      // FINANCEIRO
      const colunas = ['Quarto', 'Hóspede Titular', 'Telefone', 'Total Reserva', 'Já Pago / Sinal', 'Saldo Pendente', 'Status'];
      const body: any[] = [];

      reservasEnriquecidas.forEach(r => {
        const pagoIntegral = r.valorPago >= r.valorTotal && r.valorTotal > 0;
        const pagoParcial = r.valorPago > 0 && r.valorPago < r.valorTotal;
        const statusTexto = pagoIntegral ? 'PAGO' : pagoParcial ? '50% SINAL' : 'PENDENTE';

        body.push([
          { content: r.quartoCodigo, styles: { fontStyle: 'bold', halign: 'center', textColor: [5, 61, 30] } },
          { content: r.titularNome, styles: { fontStyle: 'bold', halign: 'left' } },
          { content: r.titularTelefone || '-', styles: { halign: 'center' } },
          { content: formatarMoeda(r.valorTotal), styles: { halign: 'right' } },
          { content: formatarMoeda(r.valorPago), styles: { halign: 'right', textColor: [4, 120, 87] } },
          { content: formatarMoeda(r.saldoPendente), styles: { halign: 'right', fontStyle: 'bold', textColor: r.saldoPendente > 0 ? [186, 26, 26] : [6, 95, 70] } },
          { content: statusTexto, styles: { halign: 'center', fontStyle: 'bold' } }
        ]);
      });

      autoTable(doc, {
        startY: 27,
        head: [colunas],
        body: body,
        foot: [
          [
            { content: 'TOTAIS FINANCEIROS CONSOLIDADOS:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } },
            { content: formatarMoeda(totaisGerais.valorTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } },
            { content: formatarMoeda(totaisGerais.valorPago), styles: { halign: 'right', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [134, 239, 172] } },
            { content: formatarMoeda(totaisGerais.saldoPendente), styles: { halign: 'right', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [254, 205, 211] } },
            { content: totaisGerais.saldoPendente > 0 ? 'A RECEBER' : 'QUITADO', styles: { halign: 'center', fontStyle: 'bold', fillColor: [30, 70, 32], textColor: [255, 255, 255] } }
          ]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [72, 119, 77],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [209, 213, 219],
          lineWidth: 0.15,
          textColor: [25, 28, 29]
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 32 },
          3: { cellWidth: 28 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: 24 }
        },
        margin: { top: 10, bottom: 12, left: 8, right: 8 }
      });
    }

    // Paginação no rodapé de todas as páginas geradas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(`Hotel Fazenda Anew • Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(nomeArquivo);
  };

  return (
    <div className="area-impressao-fazenda space-y-6 max-w-7xl mx-auto p-2 sm:p-4 print:p-0 font-['Inter']">
      {/* BLOCO DEDICADO DE ESTILOS DE IMPRESSÃO (PDF / A4) */}
      <style>{`
        @media print {
          /* Esconder toda a barra lateral, menus de navegação, cabeçalhos do sistema e rodapés */
          aside, 
          nav, 
          header, 
          .sidebar, 
          button, 
          input, 
          .print\\:hidden {
            display: none !important;
          }

          /* Reset de margens e largura para ocupar 100% da folha A4 */
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }

          body, html, #root, main {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          [class*="md:pl-64"] {
            padding-left: 0 !important;
          }

          /* Container exclusivo da folha de campo */
          .area-impressao-fazenda {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Manter fundos coloridos e bordas nas tabelas */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* BARRA DE FILTRO DE DATA E BOTÕES DE AÇÃO (OCULTA NA IMPRESSÃO) */}
      <div className="bg-white border border-[#c1c9bf] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        {/* Filtro de Período */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#053d1e]" /> Período da Folha:
          </span>

          <div className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-bold text-[#717971] uppercase">De</span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="text-xs font-bold text-[#053d1e] bg-transparent focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-[#717971] uppercase ml-1">Até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="text-xs font-bold text-[#053d1e] bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Atalho Fim de Semana */}
          <button
            type="button"
            onClick={() => {
              const fds = obterFimDeSemanaPadrao();
              setDataInicio(fds.inicio);
              setDataFim(fds.fim);
            }}
            className="px-3 py-1.5 text-xs font-bold border border-[#c1c9bf] rounded-xl hover:bg-[#f3f4f5] text-[#191c1d] transition-colors cursor-pointer"
          >
            Fim de Semana
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Copiar WhatsApp */}
          <button
            type="button"
            onClick={handleCopiarWhatsApp}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              copiadoWhatsApp
                ? 'bg-emerald-700 text-white'
                : 'bg-[#25D366] text-white hover:bg-[#20ba59]'
            }`}
          >
            {copiadoWhatsApp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiadoWhatsApp ? 'Copiado para WhatsApp!' : 'Copiar Resumo WhatsApp'}</span>
          </button>

          {/* Botão Manual Operacional */}
          <button
            type="button"
            onClick={exportarManualOperacionalPdf}
            className="px-3 py-2 border border-[#053d1e] bg-white text-[#053d1e] hover:bg-[#e6f4ea] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            title="Baixar Manual de Instruções em PDF"
          >
            <BookOpen className="w-4 h-4 text-[#053d1e]" />
            <span>Manual Operacional</span>
          </button>

          {/* Botão Principal: Exportar PDF */}
          <button
            type="button"
            onClick={exportarPdfDireto}
            className="px-4 py-2 bg-[#053d1e] text-white rounded-xl text-xs font-bold hover:bg-[#043017] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>

          {/* Botão Imprimir na Folha */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 border border-[#c1c9bf] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir na Folha</span>
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE AS 3 ABAS OPERACIONAIS (OCULTA NA IMPRESSÃO) */}
      <div className="flex border-b border-[#c1c9bf] gap-3 print:hidden overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('QUARTOS')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'QUARTOS'
              ? 'border-[#053d1e] text-[#053d1e]'
              : 'border-transparent text-[#717971] hover:text-[#191c1d]'
          }`}
        >
          <Building2 className="w-4 h-4" /> 1. Ocupação por Quarto (Blocos)
        </button>

        <button
          onClick={() => setAbaAtiva('REFEITORIO')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'REFEITORIO'
              ? 'border-[#053d1e] text-[#053d1e]'
              : 'border-transparent text-[#717971] hover:text-[#191c1d]'
          }`}
        >
          <Utensils className="w-4 h-4" /> 2. Relação Geral / Refeitório
        </button>

        <button
          onClick={() => setAbaAtiva('FINANCEIRO')}
          className={`pb-3 px-2 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            abaAtiva === 'FINANCEIRO'
              ? 'border-[#053d1e] text-[#053d1e]'
              : 'border-transparent text-[#717971] hover:text-[#191c1d]'
          }`}
        >
          <DollarSign className="w-4 h-4" /> 3. Valores a Receber (Recepção)
        </button>
      </div>

      {/* ÁREA DE RELATÓRIO OPERACIONAL / FOLHA DE CAMPO (FOCADA NA IMPRESSÃO) */}
      <div
        id="area-relatorio-fazenda"
        className="area-impressao-fazenda bg-white border border-[#c1c9bf] rounded-2xl p-6 shadow-xs print:border-none print:p-0 print:shadow-none"
      >
        {/* Cabeçalho da Folha de Campo */}
        <div className="relative text-center pb-4 mb-4 border-b border-[#e1e3e4]">
          {/* <div className="absolute left-2 top-0 h-14 w-14 hidden sm:block print:block">
            <img src={logoTucanoImg} alt="Hotel Fazenda Anew" className="h-full w-full object-contain" />
          </div> */}
          <h1 className="font-['Manrope'] text-lg font-extrabold uppercase text-[#1E4620] tracking-wide">
            HOTEL FAZENDA ANEW — FOLHA DE CAMPO
          </h1>
          <p className="text-xs font-bold text-[#414941] mt-0.5">
            Período: {formatarData(dataInicio)} à {formatarData(dataFim)}
          </p>
          <p className="text-[10px] text-[#717971] mt-0.5">
            Relatório Operacional • {reservasEnriquecidas.length} Reservas Ativas no Período
          </p>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: OCUPAÇÃO POR QUARTO (MODELO IMAGEM 1 - BLOCOS B, C, D)             */}
        {/* ========================================================================= */}
        {abaAtiva === 'QUARTOS' && (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#48774D] text-white font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3 border border-slate-300 w-24 text-center">Quarto</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-36 text-center">Status / Categoria</th>
                    <th className="py-2.5 px-3 border border-slate-300 text-left">Hóspedes / Acompanhantes</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-32 text-center">Período</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(quartosPorBloco).map(([bloco, lista]) => (
                    <React.Fragment key={bloco}>
                      {/* Barra de Título do Bloco */}
                      <tr className="bg-[#1E4620] text-white font-extrabold uppercase text-xs tracking-wider">
                        <td colSpan={4} className="py-2 px-3">
                          {bloco} ({lista.filter(i => i.ocupado).length} Ocupados / {lista.length} Total)
                        </td>
                      </tr>

                      {/* Lista de Quartos do Bloco */}
                      {lista.map((item, qIdx) => {
                        const r = item.reserva;
                        return (
                          <tr
                            key={qIdx}
                            className={`border-b border-slate-200 transition-colors ${
                              item.ocupado ? 'hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'
                            }`}
                          >
                            {/* Quarto */}
                            <td className="py-2.5 px-3 font-extrabold text-center border-r border-slate-200 text-[#053d1e] text-sm bg-[#e6f4ea]/20">
                              {item.codigo}
                            </td>

                            {/* Categoria & Status */}
                            <td className="py-2.5 px-3 text-center border-r border-slate-200">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                item.ocupado ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {item.ocupado ? 'Ocupado' : 'Livre'}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{item.categoria}</div>
                            </td>

                            {/* Hóspedes / Acompanhantes */}
                            <td className="py-2.5 px-3 border-r border-slate-200">
                              {r ? (
                                <div className="space-y-1">
                                  <div className="font-bold text-[#191c1d] text-xs flex items-center gap-2">
                                    <span>{r.titularNome}</span>
                                    <span className="text-[10px] font-semibold text-[#053d1e] bg-[#e6f4ea] px-1.5 py-0.2 rounded-md">
                                      {r.qtdAdultos} Ad. {r.qtdCriancasMeia > 0 ? `/ ${r.qtdCriancasMeia} Cri.` : ''}
                                    </span>
                                  </div>

                                  {/* Lista de Acompanhantes */}
                                  {r.acompanhantes && r.acompanhantes.length > 0 && (
                                    <div className="text-[11px] text-slate-600 pl-2 border-l-2 border-[#c1c9bf] space-y-0.5">
                                      {r.acompanhantes.map((a: any, aIdx: number) => {
                                        const idade = calcularIdade(a.datanascimento);
                                        const parentesco = a.parentesco || a.grauparentesco || a.relacao || '';
                                        return (
                                          <div key={aIdx} className="flex items-center gap-1.5">
                                            <span className="font-medium text-slate-800">• {a.nomecompleto || a.nome}</span>
                                            {parentesco && (
                                              <span className="text-[10px] text-slate-500 capitalize">({parentesco})</span>
                                            )}
                                            {idade !== null && (
                                              <span className="text-[10px] text-slate-500 font-semibold">— {idade} anos</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium italic">LIVRE / DISPONÍVEL</span>
                              )}
                            </td>

                            {/* Período */}
                            <td className="py-2.5 px-3 text-center text-xs text-slate-700">
                              {r ? (
                                <div>
                                  <span className="font-semibold">{formatarData(r.dataentrada)}</span>
                                  <span className="text-[10px] text-slate-500 block">à {formatarData(r.datasaida)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: RELAÇÃO GERAL / REFEITÓRIO (MODELO IMAGEM 2)                       */}
        {/* ========================================================================= */}
        {abaAtiva === 'REFEITORIO' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#f8f9fa] border border-[#c1c9bf] rounded-xl text-xs space-y-1 print:hidden">
              <p className="font-bold text-[#191c1d] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#053d1e]" /> Regras de Ocupação do Refeitório:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[#414941] text-[11px]">
                <div>• <strong>Adultos (≥ 12 anos):</strong> Refeição integral (100%).</div>
                <div>• <strong>Crianças (6 a 11 anos):</strong> Meia refeição (50%).</div>
                <div>• <strong>Crianças (0 a 5 anos):</strong> Isentas / Grátis.</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#48774D] text-white font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3 border border-slate-300 w-20 text-center">Quarto</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-36 text-center">Entrada / Saída</th>
                    <th className="py-2.5 px-3 border border-slate-300 text-left">Hóspede Titular & Acompanhantes</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-20 text-center">Adulto</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-24 text-center">Criança (6-11)</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-20 text-center">Grátis (0-5)</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-24 text-center">Total Pessoas</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasEnriquecidas.map((r, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      {/* Quarto */}
                      <td className="py-2 px-3 text-center font-extrabold text-[#053d1e] border-r border-slate-200">
                        {r.quartoCodigo}
                      </td>

                      {/* Período */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 text-[11px] whitespace-nowrap">
                        {formatarData(r.dataentrada)} à {formatarData(r.datasaida)}
                      </td>

                      {/* Nome do Hóspede & Acompanhantes */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        <div className="font-bold text-[#191c1d]">{r.titularNome}</div>
                        {r.acompanhantes && r.acompanhantes.length > 0 && (
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {r.acompanhantes.map((a: any) => {
                              const idade = calcularIdade(a.datanascimento);
                              const idadeStr = idade !== null ? ` (${idade}a)` : '';
                              return `${a.nomecompleto || a.nome}${idadeStr}`;
                            }).join(', ')}
                          </div>
                        )}
                        
                      </td>

                      {/* Adultos */}
                      <td className="py-2 px-3 text-center font-bold text-[#191c1d] border-r border-slate-200 text-sm">
                        {r.qtdAdultos}
                      </td>

                      {/* Crianças Meia */}
                      <td className="py-2 px-3 text-center font-bold text-amber-900 border-r border-slate-200 text-sm">
                        {r.qtdCriancasMeia}
                      </td>

                      {/* Grátis */}
                      <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-200 text-sm">
                        {r.qtdCriancasGratis}
                      </td>

                      {/* Total Pessoas */}
                      <td className="py-2 px-3 text-center font-extrabold text-[#053d1e] text-sm bg-[#e6f4ea]/30">
                        {r.totalPessoas}
                      </td>
                    </tr>
                  ))}

                  {reservasEnriquecidas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhuma reserva ativa encontrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Linha Final de Totalização do Refeitório */}
                {reservasEnriquecidas.length > 0 && (
                  <tfoot className="bg-[#1E4620] text-white font-extrabold text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-right">
                        TOTAL GERAL PARA O REFEITÓRIO:
                      </td>
                      <td className="py-3 px-3 text-center text-sm text-[#86efac]">
                        {totaisGerais.adultos}
                      </td>
                      <td className="py-3 px-3 text-center text-sm text-amber-300">
                        {totaisGerais.criancasMeia}
                      </td>
                      <td className="py-3 px-3 text-center text-sm text-slate-300">
                        {totaisGerais.criancasGratis}
                      </td>
                      <td className="py-3 px-3 text-center text-base text-white bg-[#053d1e]">
                        {totaisGerais.totalPessoas}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: VALORES A RECEBER (MODELO IMAGEM 3)                                */}
        {/* ========================================================================= */}
        {abaAtiva === 'FINANCEIRO' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#48774D] text-white font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3 border border-slate-300 w-20 text-center">Quarto</th>
                    <th className="py-2.5 px-3 border border-slate-300 text-left">Hóspede Titular</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-40 text-center">Telefone de Contato</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-28 text-right">Total Hosp.</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-28 text-right">Sinal / Pago</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-28 text-right">Saldo Pendente</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasEnriquecidas.map((r, idx) => {
                    const pagoIntegral = r.saldoPendente <= 0;
                    const pagoParcial = r.valorPago > 0 && r.saldoPendente > 0;
                    const foneLimpo = (r.titularTelefone || '').replace(/\D/g, '');

                    return (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        {/* Quarto */}
                        <td className="py-2 px-3 text-center font-extrabold text-[#053d1e] border-r border-slate-200">
                          {r.quartoCodigo}
                        </td>

                        {/* Hóspede */}
                        <td className="py-2 px-3 font-bold text-[#191c1d] border-r border-slate-200">
                          {r.titularNome}
                        </td>

                        {/* Contato com link WhatsApp */}
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          {r.titularTelefone ? (
                            <a
                              href={`https://wa.me/55${foneLimpo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-700 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 print:hidden" />
                              <span>{r.titularTelefone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>

                        {/* Total Hospedagem */}
                        <td className="py-2 px-3 text-right font-medium border-r border-slate-200">
                          {formatarMoeda(r.valorTotal)}
                        </td>

                        {/* Já Pago / Sinal */}
                        <td className="py-2 px-3 text-right font-medium text-emerald-700 border-r border-slate-200">
                          {formatarMoeda(r.valorPago)}
                        </td>

                        {/* Saldo Pendente */}
                        <td className={`py-2 px-3 text-right font-bold border-r border-slate-200 ${
                          r.saldoPendente > 0 ? 'text-[#ba1a1a]' : 'text-emerald-800'
                        }`}>
                          {formatarMoeda(r.saldoPendente)}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            pagoIntegral
                              ? 'bg-emerald-100 text-emerald-800'
                              : pagoParcial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {pagoIntegral ? 'PAGO' : pagoParcial ? '50% SINAL' : 'PENDENTE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {reservasEnriquecidas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum registro financeiro encontrado no período informado.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Linha Final de Totalização Financeira */}
                {reservasEnriquecidas.length > 0 && (
                  <tfoot className="bg-[#1E4620] text-white font-extrabold text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-right">
                        TOTAIS FINANCEIROS CONSOLIDADOS:
                      </td>
                      <td className="py-3 px-3 text-right text-sm">
                        {formatarMoeda(totaisGerais.valorTotal)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-[#86efac]">
                        {formatarMoeda(totaisGerais.valorPago)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-rose-300">
                        {formatarMoeda(totaisGerais.saldoPendente)}
                      </td>
                      <td className="py-3 px-3 text-center text-[10px] text-slate-300">
                        {totaisGerais.saldoPendente > 0 ? 'A RECEBER' : 'QUITADO'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};