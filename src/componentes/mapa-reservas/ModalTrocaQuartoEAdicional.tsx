import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Bed,
  Calendar,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  LoaderCircle,
  Plus,
  Minus,
  Info,
  CreditCard,
  ArrowLeftRight,
  RotateCcw,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useHotel } from '../../contextos/ContextoHotel';
import { reservaService, hospedeService } from '../../servicos/api';
import { FnrhService } from '../../servicos/api/FnrhService';
import { obterClienteSupabase } from '../../lib/supabaseCliente';
import { Reserva, Quarto, Pacote, Hospede } from '../../tipos';
import { verificarSobreposicaoDatas } from '../../servicos/conflitoReservas';
import {
  formatarData,
  formatarMoeda,
  aplicarMascaraMoeda,
  desformatarMoeda,
} from '../../utilitarios/formatadores';

interface ModalTrocaQuartoEAdicionalProps {
  aberto: boolean;
  reserva: Reserva | null;
  onFechar: () => void;
  onSucesso?: (mensagem: string) => void;
}

export interface HospedeCandidato {
  id: string;
  nome: string;
  cpf?: string;
  datanascimento?: string;
  idade: number | null;
  categoria: 'ADULTO' | 'CRIANCA_MEIA' | 'CRIANCA_GRATIS';
  tipo: 'TITULAR' | 'ACOMPANHANTE';
  quartoNumero: string;
  quartoId: number;
  reservaId: number;
  labelFormatado: string;
}

export interface HospedeTransferidoItem {
  id: string;
  nome: string;
  tipo: 'TITULAR' | 'ACOMPANHANTE';
  idade: number | null;
  categoria: 'ADULTO' | 'CRIANCA_MEIA' | 'CRIANCA_GRATIS';
  quartoNumero: string;
  quartoId?: number;
  reservaOrigemId?: number;
  valorPagoAnterior: number;
  valorAdicional: number;
  editadoManualmente?: boolean;
}

const getProp = (obj: any, min: string, camel: string): any => {
  if (!obj) return undefined;
  return obj[min] !== undefined ? obj[min] : obj[camel];
};

const limparDataPacote = (val: any): string => {
  if (!val) return '';
  const s = String(val).trim();
  if (s === '' || s.includes('infinity') || s.toLowerCase().includes('null')) return '';
  return s.slice(0, 10);
};

const calcularIdade = (dataNascStr?: string): number | null => {
  if (!dataNascStr) return null;
  const limpa = String(dataNascStr).slice(0, 10);
  const nasc = new Date(limpa + 'T12:00:00');
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return Math.max(0, idade);
};

const classificarFaixaEtaria = (idade: number | null): 'ADULTO' | 'CRIANCA_MEIA' | 'CRIANCA_GRATIS' => {
  if (idade === null) return 'ADULTO';
  if (idade <= 5) return 'CRIANCA_GRATIS';
  if (idade <= 11) return 'CRIANCA_MEIA';
  return 'ADULTO';
};

export const ModalTrocaQuartoEAdicional: React.FC<ModalTrocaQuartoEAdicionalProps> = ({
  aberto,
  reserva,
  onFechar,
  onSucesso,
}) => {
  const { quartos, reservas, pacotes, hospedes, atualizarStatusQuarto, recarregarDados } = useHotel();

  const [novoQuartoId, setNovoQuartoId] = useState<string | number>('');
  const [novaDataSaida, setNovaDataSaida] = useState<string>('');

  // Ocupantes originais do quarto
  const [adultosOriginais, setAdultosOriginais] = useState<number>(1);
  const [criancasMeiaOriginais, setCriancasMeiaOriginais] = useState<number>(0);
  const [criancasGratisOriginais, setCriancasGratisOriginais] = useState<number>(0);

  // Transferência de hóspedes de outro quarto (Upgrade de pacote)
  const [habilitarTransferencia, setHabilitarTransferencia] = useState<boolean>(false);
  const [hospedesTransferidos, setHospedesTransferidos] = useState<HospedeTransferidoItem[]>([]);
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<string>('');

  // Dados carregados diretamente do banco/API
  const [reservasLive, setReservasLive] = useState<any[]>([]);
  const [hospedesLive, setHospedesLive] = useState<any[]>([]);
  const [acompanhantesDb, setAcompanhantesDb] = useState<any[]>([]);
  const [carregandoDadosLive, setCarregandoDadosLive] = useState<boolean>(false);

  // Adição manual de hóspede transferido
  const [mostrarAdicaoManual, setMostrarAdicaoManual] = useState<boolean>(false);
  const [manualNome, setManualNome] = useState<string>('');
  const [manualQuartoOrigem, setManualQuartoOrigem] = useState<string>('');
  const [manualCategoria, setManualCategoria] = useState<'ADULTO' | 'CRIANCA_MEIA' | 'CRIANCA_GRATIS'>('ADULTO');
  const [manualValorAdicional, setManualValorAdicional] = useState<number>(200);

  // Estados de controle
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Calcula quantas crianças são Meia vs Grátis baseado no valorTotal original da reserva ou nos acompanhantes
  const deduzirComposicaoCriancas = useCallback(
    (resObj: any, listaAcomps: any[] = []) => {
      const ad = Math.max(1, Number(getProp(resObj, 'adultos', 'adultos') || 1));
      const totalCr = Math.max(0, Number(getProp(resObj, 'criancas', 'criancas') || 0));

      if (totalCr === 0) {
        return { meia: 0, gratis: 0 };
      }

      // 1. Tenta contar pelas datas de nascimento dos acompanhantes se existirem
      if (listaAcomps && listaAcomps.length > 0) {
        let countMeia = 0;
        let countGratis = 0;
        listaAcomps.forEach((a: any) => {
          const dtNasc = getProp(a, 'datanascimento', 'dataNascimento');
          const idade = calcularIdade(dtNasc);
          if (idade !== null) {
            if (idade <= 5) countGratis++;
            else if (idade <= 11) countMeia++;
          } else if (a.menoridade) {
            countMeia++;
          }
        });

        if (countMeia + countGratis === totalCr) {
          return { meia: countMeia, gratis: countGratis };
        }
      }

      // 2. Dedução matemática exata pelo valorTotal original da reserva (ex: 1375 - (2 * 550) = 275 -> 1 meia e 1 grátis)
      const valorTotalOrig = Number(getProp(resObj, 'valortotal', 'valorTotal') || 0);
      const dEnt = limparDataPacote(getProp(resObj, 'dataentrada', 'dataEntrada'));
      const dSai = limparDataPacote(getProp(resObj, 'datasaida', 'dataSaida'));

      let diasOrig = 2;
      if (dEnt && dSai) {
        if (dEnt === dSai) diasOrig = 1;
        else {
          const [aE, mE, diaE] = dEnt.split('-').map(Number);
          const [aS, mS, diaS] = dSai.split('-').map(Number);
          const diff = Math.round((new Date(aS, mS - 1, diaS).getTime() - new Date(aE, mE - 1, diaE).getTime()) / (1000 * 60 * 60 * 24));
          diasOrig = Math.max(1, diff + 1);
        }
      }

      // Descobre o valor unitário do adulto na reserva original
      let valorAdultoOrig = diasOrig === 1 ? 200 : diasOrig === 2 ? 550 : diasOrig === 3 ? 750 : diasOrig === 4 ? 950 : 950 + (diasOrig - 4) * 200;
      const pctIdOrig = getProp(resObj, 'pacoteid', 'pacoteId');
      if (pctIdOrig && pacotes.length > 0) {
        const pctFound = pacotes.find((p: any) => Number(getProp(p, 'pacoteid', 'pacoteId')) === Number(pctIdOrig));
        if (pctFound && Number(getProp(pctFound, 'valor', 'valor')) > 0) {
          valorAdultoOrig = Number(getProp(pctFound, 'valor', 'valor'));
        }
      }

      if (valorTotalOrig > 0 && valorAdultoOrig > 0) {
        const valorAdultos = ad * valorAdultoOrig;
        const sobraCriancas = Math.max(0, valorTotalOrig - valorAdultos);
        const valorMeiaUnitario = valorAdultoOrig * 0.5;

        if (valorMeiaUnitario > 0) {
          const qtdMeiaCalculada = Math.min(totalCr, Math.round(sobraCriancas / valorMeiaUnitario));
          const qtdGratisCalculada = Math.max(0, totalCr - qtdMeiaCalculada);
          return { meia: qtdMeiaCalculada, gratis: qtdGratisCalculada };
        }
      }

      return { meia: totalCr, gratis: 0 };
    },
    [pacotes]
  );

  // Inicializar dados quando o modal abre
  useEffect(() => {
    if (aberto && reserva) {
      setNovoQuartoId(reserva.quartoid ?? (reserva as any).quartoId ?? '');
      const saidaInicial = reserva.datasaida || (reserva as any).dataSaida || '';
      setNovaDataSaida(saidaInicial ? String(saidaInicial).slice(0, 10) : '');

      const ad = Math.max(1, Number(getProp(reserva, 'adultos', 'adultos') || 1));
      setAdultosOriginais(ad);

      const acompsEmbutidos = getProp(reserva, 'acompanhantes', 'acompanhantes') || [];
      const { meia, gratis } = deduzirComposicaoCriancas(reserva, acompsEmbutidos);
      setCriancasMeiaOriginais(meia);
      setCriancasGratisOriginais(gratis);

      setHabilitarTransferencia(false);
      setHospedesTransferidos([]);
      setCandidatoSelecionadoId('');
      setMostrarAdicaoManual(false);
      setManualNome('');
      setManualQuartoOrigem('');
      setManualCategoria('ADULTO');
      setManualValorAdicional(200);

      setMotivoAjuste('');
      setErro(null);
      setCarregando(false);
    }
  }, [aberto, reserva, deduzirComposicaoCriancas]);

  // Carregar dados de reservas, acompanhantes e hóspedes via API e Supabase
  const carregarDadosCompletosLive = useCallback(async () => {
    setCarregandoDadosLive(true);
    try {
      const supabase = obterClienteSupabase();
      const [resRes, resHosp, resFnrh] = await Promise.all([
        reservaService.listar({ apenasAtivos: true }),
        hospedeService.listar({ apenasAtivos: true }),
        FnrhService.listarCadastrosFnrh().catch(() => ({ sucesso: false, dados: [] })),
      ]);

      if (resRes.dados) setReservasLive(resRes.dados);
      if (resHosp.dados) setHospedesLive(resHosp.dados);

      const mapAcomp = new Map<string, any>();

      // 1. Extrai acompanhantes vindos das fichas FNRH via API .NET
      if (resFnrh && resFnrh.dados && Array.isArray(resFnrh.dados)) {
        resFnrh.dados.forEach((cad: any) => {
          const cId = getProp(cad, 'cadastroid', 'cadastroId');
          const rId = getProp(cad, 'reservaid', 'reservaId');
          const lista = getProp(cad, 'acompanhantes', 'acompanhantes') || [];
          lista.forEach((a: any) => {
            const chave = `${(a.nomecompleto || '').trim().toLowerCase()}_${rId || cId}`;
            mapAcomp.set(chave, { ...a, reservaid: rId, cadastroid: cId });
          });
        });
      }

      // 2. Complementa com Supabase caso configurado
      if (supabase) {
        const [resAcomp, resFnrhAcomp] = await Promise.all([
          supabase.from('acompanhante').select('*'),
          supabase.from('cadastro_fnrh_acompanhante').select('*'),
        ]);
        ((resAcomp as any).data || []).forEach((item: any) => {
          const chave = `${(item.nomecompleto || '').trim().toLowerCase()}_${item.reservaid || item.cadastroid}`;
          if (!mapAcomp.has(chave)) mapAcomp.set(chave, item);
        });
        ((resFnrhAcomp as any).data || []).forEach((item: any) => {
          const chave = `${(item.nomecompleto || '').trim().toLowerCase()}_${item.reservaid || item.cadastroid}`;
          if (!mapAcomp.has(chave)) mapAcomp.set(chave, item);
        });
      }

      const listaConsolidada = Array.from(mapAcomp.values());
      setAcompanhantesDb(listaConsolidada);

      // Revalida a composição exata das crianças da reserva atual caso novos acompanhantes tenham sido carregados
      if (reserva) {
        const resId = Number(getProp(reserva, 'reservaid', 'reservaId'));
        const cadId = Number(getProp(reserva, 'cadastroid', 'cadastroId') || 0);
        const acompsDaReserva = listaConsolidada.filter(
          (a) =>
            (a.reservaid && Number(a.reservaid) === resId) ||
            (cadId > 0 && a.cadastroid && Number(a.cadastroid) === cadId)
        );
        if (acompsDaReserva.length > 0) {
          const { meia, gratis } = deduzirComposicaoCriancas(reserva, acompsDaReserva);
          setCriancasMeiaOriginais(meia);
          setCriancasGratisOriginais(gratis);
        }
      }
    } catch (e) {
      console.warn('[ModalTrocaQuartoEAdicional] Erro ao carregar dados live:', e);
    } finally {
      setCarregandoDadosLive(false);
    }
  }, [reserva, deduzirComposicaoCriancas]);

  useEffect(() => {
    if (aberto) {
      carregarDadosCompletosLive();
    }
  }, [aberto, carregarDadosCompletosLive]);

  // Quartos físicos avaliados por disponibilidade e colisão de datas no período da estadia
  const quartosDisponibilidade = useMemo(() => {
    if (!reserva) return [];

    const dataEntrada = String(reserva.dataentrada || (reserva as any).dataEntrada || '').slice(0, 10);
    const dataSaida = String(novaDataSaida || reserva.datasaida || (reserva as any).dataSaida || '').slice(0, 10);
    const listaReservas = reservasLive && reservasLive.length > 0 ? reservasLive : reservas;

    return quartos
      .filter((q) => {
        const cod = String(q.codigoidentificador || '').toUpperCase();
        const num = String(q.numero || '').toUpperCase();
        const cat = String(q.categoria || '').toUpperCase();
        const ehDayUse = cod === 'DAY_USE' || num === 'DU' || num === 'DAY USE' || cat === 'DAY USE';
        return !ehDayUse && q.ativo !== false;
      })
      .map((q) => {
        const emManutencao = String(q.status || '').toUpperCase() === 'MANUTENCAO';

        const reservaConflitante = listaReservas.find((r) => {
          if (Number(r.quartoid) !== Number(q.quartoid)) return false;
          if (String(r.reservaid) === String(reserva.reservaid)) return false;

          const st = String(r.statusreserva || r.status || '').toUpperCase();
          if (st === 'CANCELADA' || st === 'CREDITO' || !st) return false;

          const rEntrada = String(r.dataentrada || r.dataEntrada || '').slice(0, 10);
          const rSaida = String(r.datasaida || r.dataSaida || '').slice(0, 10);
          if (!rEntrada || !rSaida) return false;

          return verificarSobreposicaoDatas(dataEntrada, dataSaida, rEntrada, rSaida);
        });

        const temConflito = !!reservaConflitante;
        const disponivel = !emManutencao && !temConflito;

        let motivoBloqueio = '';
        if (emManutencao) {
          motivoBloqueio = 'Em Manutenção';
        } else if (temConflito) {
          motivoBloqueio = `Ocupado (${reservaConflitante.codigo || 'Reserva'})`;
        }

        return {
          ...q,
          disponivelNoPeriodo: disponivel,
          motivoBloqueio,
          reservaConflitante,
        };
      });
  }, [quartos, reserva, novaDataSaida, reservasLive, reservas]);

  const quartoAtualObj = useMemo(() => {
    if (!reserva) return undefined;
    return quartos.find((q) => Number(q.quartoid) === Number(reserva.quartoid ?? (reserva as any).quartoId));
  }, [quartos, reserva]);

  const novoQuartoObj = useMemo(() => {
    if (!novoQuartoId) return quartoAtualObj;
    return quartos.find((q) => Number(q.quartoid) === Number(novoQuartoId));
  }, [quartos, novoQuartoId, quartoAtualObj]);

  const dataEntradaIso = useMemo(() => {
    const raw = reserva?.dataentrada || (reserva as any)?.dataEntrada || '';
    return raw ? String(raw).slice(0, 10) : '';
  }, [reserva]);

  const dataSaidaIso = useMemo(() => {
    const raw = novaDataSaida || reserva?.datasaida || (reserva as any)?.dataSaida || '';
    return raw ? String(raw).slice(0, 10) : '';
  }, [novaDataSaida, reserva]);

  const qtdDias = useMemo(() => {
    if (!dataEntradaIso || !dataSaidaIso) return 1;
    if (dataEntradaIso === dataSaidaIso) return 1;

    const [anoE, mesE, diaE] = dataEntradaIso.split('-').map(Number);
    const [anoS, mesS, diaS] = dataSaidaIso.split('-').map(Number);
    const dE = new Date(anoE, mesE - 1, diaE);
    const dS = new Date(anoS, mesS - 1, diaS);
    const diffTime = dS.getTime() - dE.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }, [dataEntradaIso, dataSaidaIso]);

  const infoPacote = useMemo(() => {
    let nomePadrao = 'Final de Semana';
    let valorPadrao = 550;

    if (qtdDias === 1) {
      nomePadrao = 'Day Use';
      valorPadrao = 200;
    } else if (qtdDias === 2) {
      nomePadrao = 'Final de Semana';
      valorPadrao = 550;
    } else if (qtdDias === 3) {
      nomePadrao = 'Final de Semana Estendido';
      valorPadrao = 750;
    } else if (qtdDias === 4) {
      nomePadrao = 'Feriado Prolongado';
      valorPadrao = 950;
    } else {
      nomePadrao = `Estadia Estendida (${qtdDias} dias)`;
      valorPadrao = 950 + (qtdDias - 4) * 200;
    }

    const pacotesAtivos = (pacotes || []).filter((p: any) => getProp(p, 'ativo', 'ativo') !== false);
    let pacoteDb: any = null;

    if (dataEntradaIso && dataSaidaIso) {
      pacoteDb = pacotesAtivos.find((p: any) => {
        const dtIni = limparDataPacote(getProp(p, 'datainicio', 'dataInicio'));
        const dtFim = limparDataPacote(getProp(p, 'datafim', 'dataFim'));
        const pDias = Number(getProp(p, 'quantidadedias', 'quantidadeDias') || 0);

        if (dtIni && dtFim) {
          const bateDataExata = dataEntradaIso === dtIni && dataSaidaIso === dtFim;
          const estaNoPeriodo = dataEntradaIso >= dtIni && dataSaidaIso <= dtFim;
          const bateDias = pDias === 0 || pDias === qtdDias;
          return (bateDataExata || estaNoPeriodo) && bateDias;
        }
        return false;
      }) || null;
    }

    if (!pacoteDb) {
      pacoteDb = pacotesAtivos.find((p: any) => {
        const tipo = String(getProp(p, 'tipopacote', 'tipoPacote') || '').toUpperCase().trim();
        const dtIni = limparDataPacote(getProp(p, 'datainicio', 'dataInicio'));
        const dtFim = limparDataPacote(getProp(p, 'datafim', 'dataFim'));
        const pDias = Number(getProp(p, 'quantidadedias', 'quantidadeDias') || 0);
        const nomeLower = String(getProp(p, 'nome', 'nome') || '').toLowerCase();

        if (dtIni || dtFim) return false;
        if (tipo === 'FERIADO' && pDias !== 4) return false;

        if (qtdDias === 1 && (tipo === 'DAY_USE' || pDias === 1 || nomeLower.includes('day use'))) return true;
        if (qtdDias === 2 && (pDias === 2 || (nomeLower.includes('final de semana') && !nomeLower.includes('estendido')))) return true;
        if (qtdDias === 3 && (pDias === 3 || nomeLower.includes('estendido'))) return true;
        if (qtdDias === 4 && (pDias === 4 || nomeLower.includes('feriado prolongado'))) return true;
        if (pDias === qtdDias) return true;
        return false;
      }) || null;
    }

    const pId = getProp(pacoteDb, 'pacoteid', 'pacoteId');
    const pNome = getProp(pacoteDb, 'nome', 'nome');
    const pValor = getProp(pacoteDb, 'valor', 'valor');

    return {
      nome: pNome || nomePadrao,
      valorPessoa: pValor && Number(pValor) > 0 ? Number(pValor) : valorPadrao,
      pacoteId: pId,
    };
  }, [qtdDias, pacotes, dataEntradaIso, dataSaidaIso]);

  const candidatosTransferencia = useMemo(() => {
    if (!reserva) return [];

    const mapaRes = new Map<number, any>();
    reservas.forEach((r) => mapaRes.set(Number(r.reservaid), r));
    reservasLive.forEach((r) => mapaRes.set(Number(r.reservaid), { ...mapaRes.get(Number(r.reservaid)), ...r }));

    const todasReservas = Array.from(mapaRes.values());

    const elegiveis = todasReservas.filter((r) => {
      if (String(r.reservaid) === String(reserva.reservaid)) return false;
      const st = String(r.statusreserva || r.status || '').toUpperCase();
      return st === 'HOSPEDADO' || st === 'RESERVADO' || st === 'CONCLUIDA';
    });

    const quartoMap = new Map<number, Quarto>();
    quartos.forEach((q) => quartoMap.set(Number(q.quartoid), q));

    const hospedeMap = new Map<number, Hospede>();
    hospedes.forEach((h) => hospedeMap.set(Number(h.hospedeid), h));
    hospedesLive.forEach((h) => hospedeMap.set(Number(h.hospedeid), { ...hospedeMap.get(Number(h.hospedeid)), ...h }));

    const candidatos: HospedeCandidato[] = [];
    const nomesVistos = new Set<string>();

    elegiveis.forEach((r) => {
      const quarto = quartoMap.get(Number(r.quartoid));
      const hospede = hospedeMap.get(Number(r.hospedeid));

      const quartoNum =
        quarto?.codigoidentificador ||
        (r.quartonumero && r.quartonumero !== 'N/A' && isNaN(Number(r.quartonumero)) ? r.quartonumero : null) ||
        quarto?.numero ||
        'S/N';

      const nomeTitular = (hospede?.nomecompleto || r.hospedenome || 'Hóspede').trim();
      const idadeTitular = calcularIdade(hospede?.datanascimento);
      const catTitular = classificarFaixaEtaria(idadeTitular);
      const chaveTitular = `${nomeTitular.toLowerCase()}_${quartoNum}`;

      if (!nomesVistos.has(chaveTitular)) {
        nomesVistos.add(chaveTitular);
        candidatos.push({
          id: `titular-${r.reservaid}`,
          nome: nomeTitular,
          cpf: hospede?.cpf || '',
          datanascimento: hospede?.datanascimento,
          idade: idadeTitular,
          categoria: catTitular,
          tipo: 'TITULAR',
          quartoNumero: quartoNum,
          quartoId: Number(r.quartoid),
          reservaId: r.reservaid,
          labelFormatado: `${nomeTitular} (Titular • Quarto ${quartoNum})`,
        });
      }

      const acompsDestaReserva = acompanhantesDb.filter(
        (a) =>
          (a.reservaid && Number(a.reservaid) === Number(r.reservaid)) ||
          (a.cadastroid && r.cadastroid && Number(a.cadastroid) === Number(r.cadastroid))
      );

      acompsDestaReserva.forEach((a) => {
        const nomeAcomp = (a.nomecompleto || '').trim();
        if (!nomeAcomp) return;

        const chaveAcomp = `${nomeAcomp.toLowerCase()}_${quartoNum}`;
        if (nomesVistos.has(chaveAcomp)) return;
        nomesVistos.add(chaveAcomp);

        const idadeAcomp = calcularIdade(a.datanascimento);
        const catAcomp = classificarFaixaEtaria(idadeAcomp);
        const labelIdade = idadeAcomp !== null ? ` ${idadeAcomp} anos` : '';

        candidatos.push({
          id: `acomp-${a.acompanhanteid || Math.random()}`,
          nome: nomeAcomp,
          cpf: a.documento || '',
          datanascimento: a.datanascimento,
          idade: idadeAcomp,
          categoria: catAcomp,
          tipo: 'ACOMPANHANTE',
          quartoNumero: quartoNum,
          quartoId: Number(r.quartoid),
          reservaId: r.reservaid,
          labelFormatado: `${nomeAcomp} (Acompanhante${labelIdade} • Quarto ${quartoNum})`,
        });
      });
    });

    return candidatos;
  }, [reservas, reservasLive, hospedes, hospedesLive, acompanhantesDb, quartos, reserva]);

  const gruposCandidatos = useMemo(() => {
    const grupos: Record<string, HospedeCandidato[]> = {};
    candidatosTransferencia.forEach((c) => {
      const chave = `Quarto ${c.quartoNumero}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(c);
    });
    return grupos;
  }, [candidatosTransferencia]);

  useEffect(() => {
    setHospedesTransferidos((prev) =>
      prev.map((h) => {
        if (h.editadoManualmente) return h;
        let valorNovo = infoPacote.valorPessoa;
        if (h.categoria === 'CRIANCA_MEIA') valorNovo *= 0.5;
        else if (h.categoria === 'CRIANCA_GRATIS') valorNovo = 0;
        return {
          ...h,
          valorAdicional: Math.max(0, valorNovo - h.valorPagoAnterior),
        };
      })
    );
  }, [infoPacote.valorPessoa]);

  const handleAdicionarCandidato = (candidatoId: string) => {
    if (!candidatoId) return;
    const cand = candidatosTransferencia.find((c) => c.id === candidatoId);
    if (!cand) return;

    if (hospedesTransferidos.some((h) => h.id === cand.id)) {
      setErro(`${cand.nome} já foi adicionado aos transferidos.`);
      return;
    }

    let valorAnterior = 550;
    let valorNovo = infoPacote.valorPessoa;

    if (cand.categoria === 'CRIANCA_MEIA') {
      valorAnterior = 275;
      valorNovo = infoPacote.valorPessoa * 0.5;
    } else if (cand.categoria === 'CRIANCA_GRATIS') {
      valorAnterior = 0;
      valorNovo = 0;
    }

    const adicionalSugerido = Math.max(0, valorNovo - valorAnterior);

    const novoItem: HospedeTransferidoItem = {
      id: cand.id,
      nome: cand.nome,
      tipo: cand.tipo,
      idade: cand.idade,
      categoria: cand.categoria,
      quartoNumero: cand.quartoNumero,
      quartoId: cand.quartoId,
      reservaOrigemId: cand.reservaId,
      valorPagoAnterior: valorAnterior,
      valorAdicional: adicionalSugerido,
    };

    setHospedesTransferidos((prev) => [...prev, novoItem]);
    setCandidatoSelecionadoId('');
    setErro(null);
  };

  const handleRemoverTransferido = (id: string) => {
    setHospedesTransferidos((prev) => prev.filter((h) => h.id !== id));
  };

  const handleAlterarValorAdicional = (id: string, novoValor: number) => {
    setHospedesTransferidos((prev) =>
      prev.map((h) => (h.id === id ? { ...h, valorAdicional: novoValor, editadoManualmente: true } : h))
    );
  };

  const handleRestaurarCalculoAutomatico = (id: string) => {
    setHospedesTransferidos((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        let valorNovo = infoPacote.valorPessoa;
        if (h.categoria === 'CRIANCA_MEIA') valorNovo *= 0.5;
        else if (h.categoria === 'CRIANCA_GRATIS') valorNovo = 0;
        return {
          ...h,
          valorAdicional: Math.max(0, valorNovo - h.valorPagoAnterior),
          editadoManualmente: false,
        };
      })
    );
  };

  const handleConfirmarAdicaoManual = () => {
    if (!manualNome.trim()) {
      setErro('Informe o nome do hóspede para adicionar manualmente.');
      return;
    }

    let valorAnterior = 550;
    if (manualCategoria === 'CRIANCA_MEIA') valorAnterior = 275;
    else if (manualCategoria === 'CRIANCA_GRATIS') valorAnterior = 0;

    const novoItem: HospedeTransferidoItem = {
      id: `manual-${Date.now()}`,
      nome: manualNome.trim(),
      tipo: 'TITULAR',
      idade: null,
      categoria: manualCategoria,
      quartoNumero: manualQuartoOrigem.trim() || 'Externo',
      valorPagoAnterior: valorAnterior,
      valorAdicional: manualValorAdicional,
      editadoManualmente: true,
    };

    setHospedesTransferidos((prev) => [...prev, novoItem]);
    setManualNome('');
    setManualQuartoOrigem('');
    setMostrarAdicaoManual(false);
    setErro(null);
  };

  const {
    subtotalOriginais,
    totalAdultosOriginais,
    totalMeiaOriginais,
    totalGratisOriginais,
    totalAdicionalTransferidos,
    novoTotal,
    saldoDevedorRestante,
    diferencaTotal,
    variacaoTitular,
  } = useMemo(() => {
    if (!reserva) {
      return {
        subtotalOriginais: 0,
        totalAdultosOriginais: 0,
        totalMeiaOriginais: 0,
        totalGratisOriginais: 0,
        totalAdicionalTransferidos: 0,
        novoTotal: 0,
        saldoDevedorRestante: 0,
        diferencaTotal: 0,
        variacaoTitular: 0,
      };
    }

    const valorBase = infoPacote.valorPessoa;

    const calcAdultos = adultosOriginais * valorBase;
    const calcMeia = criancasMeiaOriginais * (valorBase * 0.5);
    const calcGratis = 0;
    const calcSubtotalOriginais = calcAdultos + calcMeia + calcGratis;

    const calcAdicionalTransferidos = habilitarTransferencia
      ? hospedesTransferidos.reduce((acc, h) => acc + Number(h.valorAdicional || 0), 0)
      : 0;

    const totalCalculado = calcSubtotalOriginais + calcAdicionalTransferidos;

    const valorPagoOriginal = Number(reserva.valorpago || 0);
    const saldoRestante = totalCalculado - valorPagoOriginal;
    const difTotal = totalCalculado - Number(reserva.valortotal || 0);
    const varTitular = calcSubtotalOriginais - Number(reserva.valortotal || 0);

    return {
      subtotalOriginais: calcSubtotalOriginais,
      totalAdultosOriginais: calcAdultos,
      totalMeiaOriginais: calcMeia,
      totalGratisOriginais: calcGratis,
      totalAdicionalTransferidos: calcAdicionalTransferidos,
      novoTotal: totalCalculado,
      saldoDevedorRestante: saldoRestante,
      diferencaTotal: difTotal,
      variacaoTitular: varTitular,
    };
  }, [
    reserva,
    infoPacote.valorPessoa,
    adultosOriginais,
    criancasMeiaOriginais,
    criancasGratisOriginais,
    habilitarTransferencia,
    hospedesTransferidos,
  ]);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserva) return;

    setCarregando(true);
    setErro(null);

    try {
      const quartoMudou = Number(novoQuartoId) !== Number(reserva.quartoid);

      if (quartoMudou && novoQuartoObj) {
        const quartoAlvo = quartosDisponibilidade.find((q) => Number(q.quartoid) === Number(novoQuartoId));
        if (quartoAlvo && !quartoAlvo.disponivelNoPeriodo) {
          setErro(`Não é possível alocar o Quarto #${quartoAlvo.codigoidentificador || quartoAlvo.numero}: ${quartoAlvo.motivoBloqueio}.`);
          setCarregando(false);
          return;
        }
      }

      const transferidosAdultos = habilitarTransferencia
        ? hospedesTransferidos.filter((h) => h.categoria === 'ADULTO').length
        : 0;
      const transferidosCriancas = habilitarTransferencia
        ? hospedesTransferidos.filter((h) => h.categoria === 'CRIANCA_MEIA' || h.categoria === 'CRIANCA_GRATIS').length
        : 0;

      const adultosFinal = adultosOriginais + transferidosAdultos;
      const criancasFinal = criancasMeiaOriginais + criancasGratisOriginais + transferidosCriancas;

      const valorPagoOriginal = Number(reserva.valorpago || 0);
      const novoSaldo = Math.max(0, novoTotal - valorPagoOriginal);
      const novoStatusPagamento = novoSaldo <= 0 ? 'QUITADO' : valorPagoOriginal > 0 ? 'PARCIAL' : 'PENDENTE';

      const dataHojeFormatada = new Date().toLocaleDateString('pt-BR');
      const detalhesAjuste: string[] = [];

      if (novaDataSaida !== reserva.datasaida) {
        detalhesAjuste.push(
          `Saída de ${formatarData(reserva.datasaida)} para ${formatarData(novaDataSaida)} (${qtdDias} dias - ${infoPacote.nome})`
        );
      }
      if (quartoMudou && novoQuartoObj) {
        detalhesAjuste.push(
          `Quarto #${reserva.quartonumero || quartoAtualObj?.numero || 'atual'} -> Quarto #${novoQuartoObj.numero}`
        );
      }
      detalhesAjuste.push(
        `Ocupantes originais: ${adultosOriginais} adulto(s), ${criancasMeiaOriginais} meia${criancasGratisOriginais > 0 ? `, ${criancasGratisOriginais} grátis` : ''} (Subtotal: ${formatarMoeda(
          subtotalOriginais
        )})`
      );

      if (habilitarTransferencia && hospedesTransferidos.length > 0) {
        const nomesTransferidos = hospedesTransferidos
          .map((h) => `${h.nome} (Quarto ${h.quartoNumero}, upgrade ${formatarMoeda(h.valorAdicional)})`)
          .join(', ');
        detalhesAjuste.push(`Hóspede(s) transferido(s): ${nomesTransferidos}`);
      }

      if (motivoAjuste.trim()) {
        detalhesAjuste.push(`Obs: ${motivoAjuste.trim()}`);
      }

      const notaAjuste = `[Ajuste de Estadia]: ${detalhesAjuste.join('; ')} em ${dataHojeFormatada}. Novo total: ${formatarMoeda(
        novoTotal
      )}.`;
      const observacoesAtualizadas = reserva.observacoes ? `${reserva.observacoes} | ${notaAjuste}` : notaAjuste;

      const resId = Number(getProp(reserva, 'reservaid', 'reservaId'));
      const codigoReserva = String(getProp(reserva, 'codigo', 'codigo') || '');
      const quartoDestinoId = quartoMudou && novoQuartoObj
        ? Number(novoQuartoObj.quartoid)
        : Number(getProp(reserva, 'quartoid', 'quartoId'));
      const hospedeFinalId = Number(getProp(reserva, 'hospedeid', 'hospedeId'));
      const cadastroFinalId = getProp(reserva, 'cadastroid', 'cadastroId')
        ? Number(getProp(reserva, 'cadastroid', 'cadastroId'))
        : null;
      const pacoteFinalId = infoPacote.pacoteId
        ? Number(infoPacote.pacoteId)
        : (getProp(reserva, 'pacoteid', 'pacoteId') ? Number(getProp(reserva, 'pacoteid', 'pacoteId')) : null);

      const dataEntradaRaw = String(getProp(reserva, 'dataentrada', 'dataEntrada') || '').slice(0, 10);
      const dataSaidaRaw = String(novaDataSaida || getProp(reserva, 'datasaida', 'dataSaida') || '').slice(0, 10);
      const dataReservaRaw = String(getProp(reserva, 'datareserva', 'dataReserva') || dataEntradaRaw).slice(0, 10);

      const statusReservaFinal = getProp(reserva, 'statusreserva', 'statusReserva') || 'RESERVADO';
      const tipoAtendimentoFinal = getProp(reserva, 'tipoatendimento', 'tipoAtendimento') || 'HOSPEDAGEM';
      const valorDiariaCalculado = qtdDias > 0 ? Number((novoTotal / qtdDias).toFixed(2)) : Number(getProp(reserva, 'valordiaria', 'valorDiaria') || 0);

      const formatarHorarioTimeSpan = (h?: string | null): string | null => {
        if (!h) return null;
        const limpo = String(h).trim();
        if (limpo.length === 5 && limpo.includes(':')) return `${limpo}:00`;
        return limpo;
      };

      const payloadBanco: any = {
        reservaId: resId,
        codigo: codigoReserva,
        quartoId: quartoDestinoId,
        quartoid: quartoDestinoId,
        hospedeId: hospedeFinalId,
        hospedeid: hospedeFinalId,
        cadastroId: cadastroFinalId,
        cadastroid: cadastroFinalId,
        pacoteId: pacoteFinalId,
        pacoteid: pacoteFinalId,
        dataEntrada: dataEntradaRaw ? `${dataEntradaRaw}T12:00:00Z` : '',
        dataentrada: dataEntradaRaw,
        dataReserva: dataReservaRaw ? `${dataReservaRaw}T12:00:00Z` : (dataEntradaRaw ? `${dataEntradaRaw}T12:00:00Z` : ''),
        datareserva: dataReservaRaw,
        statusReserva: statusReservaFinal,
        statusreserva: statusReservaFinal,
        tipoAtendimento: tipoAtendimentoFinal,
        tipoatendimento: tipoAtendimentoFinal,
        valorDiaria: valorDiariaCalculado,
        valordiaria: valorDiariaCalculado,
        valorPago: valorPagoOriginal,
        valorpago: valorPagoOriginal,
        formaPagamento: getProp(reserva, 'formapagamento', 'formaPagamento') || 'PIX',
        formapagamento: getProp(reserva, 'formapagamento', 'formaPagamento') || 'PIX',
        observacoesCheckout: (getProp(reserva, 'observacoes_checkout', 'observacoesCheckout') || '').slice(0, 1000),
        horarioPrevistoChegada: formatarHorarioTimeSpan(getProp(reserva, 'horarioprevistochegada', 'horarioPrevistoChegada')),
        horarioPrevistoSaida: formatarHorarioTimeSpan(getProp(reserva, 'horarioprevistosaida', 'horarioPrevistoSaida')),
        checkinRealizadoEm: getProp(reserva, 'checkinrealizadoem', 'checkinRealizadoEm') || null,
        checkinUsuarioId: getProp(reserva, 'checkinusuarioid', 'checkinUsuarioId') || null,
        checkoutRealizadoEm: getProp(reserva, 'checkoutrealizadoem', 'checkoutRealizadoEm') || null,
        checkoutUsuarioId: getProp(reserva, 'checkoutusuarioid', 'checkoutUsuarioId') || null,
        ativo: true,
        datasaida: dataSaidaRaw,
        dataSaida: dataSaidaRaw ? `${dataSaidaRaw}T12:00:00Z` : '',
        adultos: adultosFinal,
        criancas: criancasFinal,
        valortotal: novoTotal,
        saldo: novoSaldo,
        statuspagamento: novoStatusPagamento,
        observacoes: observacoesAtualizadas.slice(0, 1000),
        dataoperacao: new Date().toISOString(),
        naturezaoperacao: 'UPDATE',
      };

      if (infoPacote.pacoteId) {
        payloadBanco.pacoteid = infoPacote.pacoteId;
      }

      if (quartoMudou && novoQuartoObj) {
        payloadBanco.quartoid = novoQuartoObj.quartoid;
      }

      const resUpdate = await reservaService.atualizar(reserva.reservaid, payloadBanco);
      if (!resUpdate.sucesso) {
        throw new Error(resUpdate.erro || 'Falha ao gravar na API.');
      }

      if (quartoMudou && novoQuartoObj) {
        const estaHospedado = reserva.statusreserva === 'HOSPEDADO';
        const hojeStr = new Date().toISOString().slice(0, 10);
        const ehEstadiaAtual = estaHospedado || (reserva.dataentrada <= hojeStr && reserva.datasaida >= hojeStr);

        if (ehEstadiaAtual) {
          if (quartoAtualObj && quartoAtualObj.status !== 'OCUPADO') {
            await atualizarStatusQuarto(quartoAtualObj.quartoid, estaHospedado ? 'A_LIMPAR' : 'DISPONIVEL');
          }
          if (novoQuartoObj.status !== 'OCUPADO') {
            await atualizarStatusQuarto(novoQuartoObj.quartoid, estaHospedado ? 'OCUPADO' : 'RESERVADO');
          }
        }
      }

      await recarregarDados();

      if (onSucesso) {
        onSucesso(`Reserva ${reserva.codigo} atualizada com sucesso! Novo total: ${formatarMoeda(novoTotal)}.`);
      }
      onFechar();
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao salvar alterações.');
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto || !reserva) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-[#c1c9bf] overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-[#053d1e] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <RefreshCw className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold font-['Manrope']">
                Remanejamento & Alteração de Estadia
              </h2>
              <p className="text-xs text-white/80">
                {reserva.hospedenome || 'Hóspede'} • Quarto Atual #{reserva.quartonumero || quartoAtualObj?.numero || 'N/A'} • Reserva #{reserva.codigo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleConfirmar} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Grid de Quarto e Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Quarto Alocado
              </label>
              <select
                value={novoQuartoId}
                onChange={(e) => setNovoQuartoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#053d1e] focus:ring-1 focus:ring-[#053d1e]"
              >
                <option value={reserva.quartoid}>
                  Manter quarto atual (#{quartoAtualObj?.codigoidentificador || quartoAtualObj?.numero || reserva.quartonumero} - {quartoAtualObj?.categoria || reserva.quartocategoria})
                </option>
                {quartosDisponibilidade
                  .filter((q) => Number(q.quartoid) !== Number(reserva.quartoid))
                  .map((q) => (
                    <option
                      key={q.quartoid}
                      value={q.quartoid}
                      disabled={!q.disponivelNoPeriodo}
                      className={!q.disponivelNoPeriodo ? 'text-slate-400 bg-slate-50' : 'text-slate-900'}
                    >
                      Quarto #{q.codigoidentificador || q.numero} — {q.categoria} (Bloco {q.bloco}) — {q.disponivelNoPeriodo ? 'Disponível no período' : `[Bloqueado: ${q.motivoBloqueio}]`}
                    </option>
                  ))}
              </select>
              <span className="text-[11px] text-slate-500 block">
                {Number(novoQuartoId) !== Number(reserva.quartoid)
                  ? 'Quarto será remanejado automaticamente.'
                  : 'Permanecerá no mesmo quarto físico.'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nova Data de Saída (Check-out)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={novaDataSaida}
                  min={dataEntradaIso}
                  onChange={(e) => setNovaDataSaida(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#053d1e] focus:ring-1 focus:ring-[#053d1e]"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Entrada: <strong>{formatarData(dataEntradaIso)}</strong></span>
                <span className="font-bold text-[#053d1e] bg-emerald-50 px-2 py-0.5 rounded-md">
                  {qtdDias} {qtdDias === 1 ? 'dia' : 'dias'} ({infoPacote.nome})
                </span>
              </div>
            </div>
          </div>

          {/* Ocupantes Originais da Reserva */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#053d1e]" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Ocupantes Originais da Acomodação
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Tarifa completa do novo pacote ({infoPacote.nome} • {formatarMoeda(infoPacote.valorPessoa)}/pessoa)
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#053d1e] bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                Subtotal: {formatarMoeda(subtotalOriginais)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Adultos Originais */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Adultos</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#053d1e]">
                    Inteira (100%)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={adultosOriginais <= 1}
                      onClick={() => setAdultosOriginais((prev) => Math.max(1, prev - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {adultosOriginais}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdultosOriginais((prev) => prev + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">
                    {formatarMoeda(totalAdultosOriginais)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">A partir de 12 anos</span>
              </div>

              {/* Crianças Meia Originais */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Crianças Meia</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Meia (50%)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={criancasMeiaOriginais <= 0}
                      onClick={() => setCriancasMeiaOriginais((prev) => Math.max(0, prev - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {criancasMeiaOriginais}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCriancasMeiaOriginais((prev) => prev + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">
                    {formatarMoeda(totalMeiaOriginais)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">6 a 11 anos</span>
              </div>

              {/* Crianças Grátis Originais */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Crianças Grátis</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    Isento (0%)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={criancasGratisOriginais <= 0}
                      onClick={() => setCriancasGratisOriginais((prev) => Math.max(0, prev - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {criancasGratisOriginais}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCriancasGratisOriginais((prev) => prev + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    R$ 0,00
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block">0 a 5 anos</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO: Hóspedes Transferidos de Outro Quarto (Upgrade de Pacote) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={habilitarTransferencia}
                  onChange={(e) => setHabilitarTransferencia(e.target.checked)}
                  className="rounded text-[#053d1e] focus:ring-[#053d1e] h-4 w-4"
                />
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-blue-700" />
                  Incluir hóspede transferido de outro quarto (Upgrade de Pacote)
                </span>
              </label>
              {habilitarTransferencia && hospedesTransferidos.length > 0 && (
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  +{formatarMoeda(totalAdicionalTransferidos)} ({hospedesTransferidos.length}{' '}
                  {hospedesTransferidos.length === 1 ? 'hóspede' : 'hóspedes'})
                </span>
              )}
            </div>

            {habilitarTransferencia && (
              <div className="space-y-3.5 pt-2 border-t border-blue-200/60 animate-in fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-blue-950">
                      Selecionar Hóspede ou Acompanhante Elegível
                    </label>
                    {carregandoDadosLive && (
                      <span className="text-[10px] text-blue-600 flex items-center gap-1">
                        <LoaderCircle className="w-3 h-3 animate-spin" /> Carregando hóspedes e acompanhantes...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={candidatoSelecionadoId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCandidatoSelecionadoId(val);
                        if (val) handleAdicionarCandidato(val);
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-xl outline-none focus:border-blue-600 font-semibold text-slate-800 shadow-2xs"
                    >
                      <option value="">-- Clique para escolher um hóspede da lista --</option>
                      {Object.entries(gruposCandidatos).map(([quartoLabel, lista]) => (
                        <optgroup key={quartoLabel} label={quartoLabel}>
                          {lista.map((c) => {
                            const jaAdicionado = hospedesTransferidos.some((h) => h.id === c.id);
                            return (
                              <option key={c.id} value={c.id} disabled={jaAdicionado}>
                                {jaAdicionado ? `✓ ${c.labelFormatado} (Já adicionado)` : c.labelFormatado}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setMostrarAdicaoManual(!mostrarAdicaoManual)}
                      className="px-3 py-2 text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                    >
                      {mostrarAdicaoManual ? 'Fechar Manual' : '+ Manual'}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Lista inclui titulares e acompanhantes de quartos ativos e check-outs realizados hoje.
                  </span>
                </div>

                {mostrarAdicaoManual && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2.5 animate-in fade-in">
                    <span className="text-xs font-bold text-blue-950 block">
                      Adicionar Hóspede Transferido Manualmente
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nome Completo</label>
                        <input
                          type="text"
                          placeholder="Ex: Euladia Oviedo Maciel"
                          value={manualNome}
                          onChange={(e) => setManualNome(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quarto de Origem (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: D6"
                          value={manualQuartoOrigem}
                          onChange={(e) => setManualQuartoOrigem(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[11px] font-bold text-slate-700">Faixa:</span>
                        <label className="inline-flex items-center gap-1 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="manual-faixa"
                            checked={manualCategoria === 'ADULTO'}
                            onChange={() => {
                              setManualCategoria('ADULTO');
                              setManualValorAdicional(Math.max(0, infoPacote.valorPessoa - 550));
                            }}
                          />
                          Adulto
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="manual-faixa"
                            checked={manualCategoria === 'CRIANCA_MEIA'}
                            onChange={() => {
                              setManualCategoria('CRIANCA_MEIA');
                              setManualValorAdicional(Math.max(0, infoPacote.valorPessoa * 0.5 - 275));
                            }}
                          />
                          Meia
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer text-[11px]">
                          <input
                            type="radio"
                            name="manual-faixa"
                            checked={manualCategoria === 'CRIANCA_GRATIS'}
                            onChange={() => {
                              setManualCategoria('CRIANCA_GRATIS');
                              setManualValorAdicional(0);
                            }}
                          />
                          Grátis
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={aplicarMascaraMoeda(manualValorAdicional)}
                          onChange={(e) => setManualValorAdicional(desformatarMoeda(e.target.value))}
                          className="w-24 px-2 py-1 text-xs border border-blue-300 rounded-lg text-right font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmarAdicaoManual}
                          className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {hospedesTransferidos.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-blue-950 block">
                      Hóspedes Adicionados à Transferência ({hospedesTransferidos.length}):
                    </span>

                    <div className="space-y-2">
                      {hospedesTransferidos.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-blue-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {item.nome}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                Quarto #{item.quartoNumero}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.categoria === 'ADULTO'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.categoria === 'CRIANCA_MEIA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.categoria === 'ADULTO'
                                  ? 'Adulto (≥ 12 anos)'
                                  : item.categoria === 'CRIANCA_MEIA'
                                  ? `Meia (${item.idade ?? 11} anos)`
                                  : 'Grátis (0 a 5 anos)'}
                              </span>
                            </div>

                            <div className="text-[11px] text-blue-900/80 flex items-center gap-2">
                              <span>
                                Upgrade: {formatarMoeda(item.categoria === 'CRIANCA_MEIA' ? infoPacote.valorPessoa * 0.5 : item.categoria === 'CRIANCA_GRATIS' ? 0 : infoPacote.valorPessoa)} (Novo) - {formatarMoeda(item.valorPagoAnterior)} (Pago)
                              </span>
                              {item.editadoManualmente && (
                                <button
                                  type="button"
                                  onClick={() => handleRestaurarCalculoAutomatico(item.id)}
                                  className="text-[10px] text-blue-700 hover:underline font-bold flex items-center gap-0.5"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" /> Auto
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-600">Adicional:</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={aplicarMascaraMoeda(item.valorAdicional)}
                                onChange={(e) =>
                                  handleAlterarValorAdicional(item.id, desformatarMoeda(e.target.value))
                                }
                                className="w-28 px-2 py-1 text-xs font-extrabold text-blue-950 bg-blue-50/60 border border-blue-300 rounded-lg text-right outline-none focus:border-blue-600"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoverTransferido(item.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover hóspede transferido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/60 border border-blue-200/60 rounded-xl text-center text-xs text-blue-900/70">
                    Nenhum hóspede transferido selecionado. Escolha uma pessoa no dropdown acima para aplicar o upgrade.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CAIXA DE COMPARAÇÃO FINANCEIRA */}
          <div className="rounded-2xl border-2 border-emerald-800/20 bg-[#f7faf8] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#053d1e] uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#053d1e]" />
                Comparativo Financeiro da Estadia
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                {infoPacote.nome}
              </span>
            </div>

            {habilitarTransferencia && hospedesTransferidos.length > 0 && (
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-700">
                  <span>
                    Subtotal Ocupantes Originais ({adultosOriginais} adulto{adultosOriginais > 1 ? 's' : ''}
                    {criancasMeiaOriginais > 0 ? ` + ${criancasMeiaOriginais} meia` : ''}
                    {criancasGratisOriginais > 0 ? ` + ${criancasGratisOriginais} grátis` : ''}):
                  </span>
                  <span className="font-bold text-slate-800">{formatarMoeda(subtotalOriginais)}</span>
                </div>
                <div className="flex items-center justify-between text-blue-900 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-blue-700" />
                    Adicional Hóspedes Transferidos ({hospedesTransferidos.map((h) => h.nome.split(' ')[0]).join(', ')}):
                  </span>
                  <span className="font-bold text-blue-900">+{formatarMoeda(totalAdicionalTransferidos)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block">Total Original</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {formatarMoeda(reserva.valortotal)}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block">Já Pago (Sinal)</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-700">
                  {formatarMoeda(reserva.valorpago)}
                </span>
              </div>

              <div className="bg-white border-2 border-[#053d1e] rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] text-[#053d1e] font-bold block">Novo Total</span>
                <span className="text-xs sm:text-sm font-extrabold text-[#053d1e]">
                  {formatarMoeda(novoTotal)}
                </span>
              </div>

              <div className={`rounded-xl p-3 border ${
                saldoDevedorRestante > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <span className="text-[11px] font-bold block text-slate-700">
                  {saldoDevedorRestante > 0 ? 'Diferença Check-out' : 'Saldo Restante'}
                </span>
                <span className={`text-xs sm:text-sm font-extrabold ${
                  saldoDevedorRestante > 0 ? 'text-amber-900' : 'text-emerald-700'
                }`}>
                  {formatarMoeda(Math.max(0, saldoDevedorRestante))}
                </span>
              </div>
            </div>

            {diferencaTotal !== 0 && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-600">
                <span>Variação de tarifa da reserva:</span>
                <span className={`font-bold ${diferencaTotal > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {diferencaTotal > 0 ? `+${formatarMoeda(diferencaTotal)}` : formatarMoeda(diferencaTotal)}
                  {habilitarTransferencia && hospedesTransferidos.length > 0 && (
                    <span className="font-normal text-slate-500 ml-1.5">
                      ({variacaoTitular >= 0 ? `+${formatarMoeda(variacaoTitular)}` : formatarMoeda(variacaoTitular)} do pacote {reserva.hospedenome?.split(' ')[0] || 'titular'} + {formatarMoeda(totalAdicionalTransferidos)} transferido)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Motivo ou Nota Opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observação / Justificativa Adicional (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Hóspede optou por estender o domingo e adicionou familiar no quarto"
              value={motivoAjuste}
              onChange={(e) => setMotivoAjuste(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#c1c9bf] text-xs outline-none focus:border-[#053d1e]"
            />
          </div>

          {/* Rodapé com Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onFechar}
              disabled={carregando}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#053d1e] hover:bg-[#205435] transition-all disabled:opacity-50 shadow-md cursor-pointer"
            >
              {carregando ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Salvando Alterações...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Confirmar & Atualizar Estadia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};