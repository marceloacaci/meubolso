/*
 * DOMÍNIO FINANCEIRO E DE GAMIFICAÇÃO — funções PURAS do MeuBolso.
 *
 * Extraído de app.js (S1-2 do cronograma) para tornar a lógica testável.
 * NENHUM acesso a `estado`, DOM, Electron ou Vue aqui dentro — só matemática
 * e regras sobre os dados recebidos como argumento.
 *
 * Compatibilidade de carregamento (o app roda via <script src> em file://,
 * SEM bundler): este arquivo se anexa a `globalThis` (window no browser) e
 * também exporta via module.exports (para o Vitest em Node). Assim o `app.js`
 * continua chamando as funções pelo nome global, e os testes as importam.
 */

// ---------- Dinheiro (defeito D-02 do AS-BUILT §8.1) ----------
// Somatórios financeiros em ponto flutuante acumulam erro de centavos
// (0.1 + 0.2 === 0.30000000000000004). Toda soma de valores monetários passa
// por `somaDinheiro`, que opera em centavos inteiros e devolve Number arredondado
// a 2 casas — evitando que uma dívida "quitada" nunca zere exato.
function somaDinheiro(...valores) {
  let centavos = 0;
  for (const v of valores) {
    const n = Number(v) || 0;
    centavos += Math.round(n * 100);
  }
  return centavos / 100;
}

// Lê um valor monetário como Number arredondado (centavos), tolerante a string.
function numDinheiro(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

// Data local (fuso do SO) no formato YYYY-MM-DD, SEM conversão UTC.
// Corrige o defeito D-01 (C12): `new Date().toISOString().slice(0,10)` usava
// UTC e, perto da meia-noite no Brasil (UTC−3), apontava o dia SEGUINTE,
// deslocando o cálculo de vencimento/atraso. Aqui usamos getFullYear/getMonth/
// getDate (horário local) — 23h30 em Brasília devolve o dia corrente.
function hojeLocal() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// ============================================================
// FINANCEIRO
// ============================================================

// Total de uma dívida = soma dos valores das parcelas.
function totalDivida(d) {
  return (d.parcelas || []).reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
}

// Índice de pagamentos por dividaId, cacheado por referência do array de
// pagamentos. Reconstroi só quando a referência muda (o app cria um array novo
// a cada mutação em estado.pagamentos). Reduz totalPago/resumoParcelas de
// O(P) para O(pagamentos da dívida) — sem ele, 500 dívidas × 5000 pagamentos
// ultrapassava 100 ms (S6-5).
const _cacheIndice = new Map(); // arrayPagamentos -> Map<dividaId, pagamento[]>
function _indicePorDivida(pagamentos) {
  if (!pagamentos) return new Map();
  const cached = _cacheIndice.get(pagamentos);
  if (cached) return cached;
  const idx = new Map();
  for (const p of pagamentos) {
    if (!p || !p.dividaId) continue;
    if (!idx.has(p.dividaId)) idx.set(p.dividaId, []);
    idx.get(p.dividaId).push(p);
  }
  _cacheIndice.set(pagamentos, idx);
  return idx;
}

// Total pago de uma dívida = soma dos pagamentos VINCULADOS a ela (dividaId
// E parcelaId pertencente à dívida). `pagamentos` é a lista global de pagamentos.
function totalPago(d, pagamentos) {
  const ids = new Set((d.parcelas || []).filter((p) => p.id).map((p) => p.id));
  const daDivida = _indicePorDivida(pagamentos).get(d.id) || [];
  return daDivida
    .filter((p) => ids.has(p.parcelaId))
    .reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
}

// Saldo devedor = total − pago (nunca negativo).
function saldoDivida(d, pagamentos) {
  return Math.max(0, totalDivida(d) - totalPago(d, pagamentos));
}

// Total pago em UMA parcela específica da dívida.
function valorPagoParcela(d, parcelaId, pagamentos) {
  if (!parcelaId) return totalPago(d, pagamentos); // caso legado: sem parcela
  const daDivida = _indicePorDivida(pagamentos).get(d.id) || [];
  return daDivida
    .filter((p) => p.parcelaId === parcelaId)
    .reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
}

// Recalcula os campos em cache da parcela (valorPago, status) a partir dos
// pagamentos vinculados. É a ÚNICA fonte de verdade para o "pago" da parcela.
// Retorna a parcela atualizada (não muta o chamador, mas atualiza `parc` se passado).
function sincronizarParcela(divida, parcelaId, pagamentos) {
  const parc = (divida.parcelas || []).find((p) => p.id === parcelaId);
  if (!parc) return parc;
  const daDivida = _indicePorDivida(pagamentos).get(divida.id) || [];
  const pagos = daDivida.filter((p) => p.parcelaId === parcelaId);
  const valParc = numDinheiro(parc.valor);
  parc.valorPago = pagos.reduce((a, p) => somaDinheiro(a, numDinheiro(p.valor)), 0);
  // Data do pagamento mais recente.
  let dataRecente = '';
  for (const p of pagos) {
    if (!dataRecente || (p.data || '') > dataRecente) dataRecente = p.data || '';
  }
  parc.dataPagamento = dataRecente;
  // Quitação por diferença em centavos (tolerante a arredondamento de float).
  if (valParc > 0 && Math.round(parc.valorPago * 100) >= Math.round(valParc * 100))
    parc.status = 'pago';
  else if (parc.valorPago > 0) parc.status = 'parcial';
  else parc.status = 'pendente';
  return parc;
}

// Reconcilia estado.pagamentos com o valor pago por parcela após EDITAR a dívida.
// A view Pagamentos lê de estado.pagamentos (registro), enquanto o formulário de
// edição grava em d.parcelas[].valorPago (cache). Sem esta reconciliação, ao
// editar uma dívida já paga (aumentar valor + marcar como paga) a página de
// Pagamentos exibia o valor ANTIGO do registro (bug reportado). Regra:
//   - parcela com valorPago > 0 -> upsert do registro (atualiza valor/status ou cria)
//   - parcela pendente (valorPago 0) -> remove registro órfão existente
// Retorna o novo array de pagamentos (não muta o array original; pode, porém,
// alterar os objetos de registro existentes via Object.assign).
function reconciliarPagamentosAposEdicao(divida, pagamentos) {
  const lista = (pagamentos || []).slice();
  for (const parc of divida.parcelas || []) {
    const existente = lista.find((p) => p.dividaId === divida.id && p.parcelaId === parc.id);
    if (parc.valorPago > 0) {
      if (existente) {
        Object.assign(existente, {
          valor: parc.valorPago,
          status: parc.status,
          dataPagamento: parc.dataPagamento,
        });
      } else {
        lista.push({
          id: typeof uid === 'function' ? uid() : 'pg_' + divida.id + '_' + parc.id,
          dividaId: divida.id,
          parcelaId: parc.id,
          valor: parc.valorPago,
          data: parc.dataPagamento || '',
          nota: parc.nota || '',
          carteiraId: null,
        });
      }
    } else if (existente) {
      const idx = lista.indexOf(existente);
      if (idx >= 0) lista.splice(idx, 1);
    }
    if (typeof sincronizarParcela === 'function') sincronizarParcela(divida, parc.id, lista);
  }
  return lista;
}

// Resumo de parcelas de uma dívida para exibição.
function resumoParcelas(d, pagamentos) {
  const total = (d.parcelas || []).length;
  const daDivida = _indicePorDivida(pagamentos).get(d.id) || [];
  const pagamentoParcelas = new Set(daDivida.map((p) => p.parcelaId));
  const pagas = (d.parcelas || []).filter((p) => pagamentoParcelas.has(p.id)).length;
  const restantes = total - pagas;
  const valorTotal = totalDivida(d);
  const valorPago = totalPago(d, pagamentos);
  const valorRestante = saldoDivida(d, pagamentos);
  const percentualPago = valorTotal > 0 ? Math.round((valorPago / valorTotal) * 100) : 0;
  const percentualRestante = valorTotal > 0 ? Math.round((valorRestante / valorTotal) * 100) : 0;
  return {
    total,
    pagas,
    restantes,
    percentualPago,
    percentualRestante,
    valorTotal,
    valorPago,
    valorRestante,
  };
}

// ============================================================
// SPRINT 4 — JUROS, CET e SIMULADOR DE QUITAÇÃO (funções puras)
// ============================================================

// Custo Efetivo Total anualizado (a partir da taxa mensal, em %).
// CET ≈ ((1 + i)^12 − 1) × 100, onde i é a taxa mensal decimal.
function cet(taxaMensalPct) {
  const i = (Number(taxaMensalPct) || 0) / 100;
  if (i <= 0) return 0;
  return (Math.pow(1 + i, 12) - 1) * 100;
}

// Custo de juros de UMA dívida financiada pela Tabela Price: parcela fixa,
// juros = total pago − principal. Retorna { principal, juros, total,
// parcela, cet } (valores em número, centavos via somaDinheiro).
// `opts`: { taxaMensal (%), prazoMeses }.
function calcularJurosDivida(d, opts) {
  const principal = totalDivida(d);
  const i = (Number(opts && opts.taxaMensal) || 0) / 100;
  const n = Math.max(1, Math.round(Number(opts && opts.prazoMeses) || 1));
  if (principal <= 0) return { principal: 0, juros: 0, total: 0, parcela: 0, cet: 0 };
  if (i <= 0) return { principal, juros: 0, total: principal, parcela: principal / n, cet: 0 };
  const parcela = (principal * i) / (1 - Math.pow(1 + i, -n));
  const total = parcela * n;
  const juros = total - principal;
  return { principal, juros, total, parcela, cet: cet(opts.taxaMensal) };
}

// Simula a quitação de várias dívidas com um pagamento mensal fixo, aplicado
// segundo uma estratégia. Modelo: todo mês incide juros sobre os saldos; em
// seguida o orçamento mensal é aplicado às dívidas na ORDEM da estratégia
// (avalanche = maior taxa primeiro; bolaNeve = menor saldo primeiro).
// `dividas` é a lista global; `opts`: { estrategia, pagamentoMensal, pagamentos }.
// Retorna { meses, totalJuros, totalPago, possivel }.
function simularQuitacao(dividas, opts) {
  const estrategia = (opts && opts.estrategia) || 'avalanche';
  const pagamento = Math.max(0, Number(opts && opts.pagamentoMensal) || 0);
  let debs = (dividas || [])
    .map((d) => ({
      id: d.id,
      saldo: saldoDivida(d, opts && opts.pagamentos),
      taxa: (Number(d.taxaMensal) || 0) / 100,
    }))
    .filter((x) => x.saldo > 0.005);
  if (debs.length === 0 || pagamento <= 0) {
    return { meses: 0, totalJuros: 0, totalPago: 0, possivel: false };
  }
  debs.sort((a, b) => (estrategia === 'avalanche' ? b.taxa - a.taxa : a.saldo - b.saldo));
  let meses = 0,
    totalJuros = 0,
    totalPago = 0;
  const LIMITE = 1200; // teto de 100 anos (segurança contra loop infinito)
  while (debs.some((d) => d.saldo > 0.005) && meses < LIMITE) {
    meses++;
    let orcamento = pagamento;
    for (const d of debs) {
      if (d.saldo > 0.005) {
        const j = d.saldo * d.taxa;
        d.saldo += j;
        totalJuros += j;
      }
    }
    for (const d of debs) {
      if (orcamento <= 0) break;
      if (d.saldo > 0.005) {
        const p = Math.min(orcamento, d.saldo);
        d.saldo -= p;
        orcamento -= p;
        totalPago += p;
      }
    }
  }
  const possivel = debs.every((d) => d.saldo <= 0.005);
  return { meses, totalJuros, totalPago, possivel };
}

// ============================================================
// GAMIFICAÇÃO (níveis / XP)
// ============================================================

// Tabela de níveis (limite inferior de XP por nível) — fonte da verdade.
const NIVEIS = [
  { nivel: 1, xp: 0 },
  { nivel: 2, xp: 100 },
  { nivel: 3, xp: 200 },
  { nivel: 4, xp: 300 },
  { nivel: 5, xp: 400 },
  { nivel: 6, xp: 600 },
  { nivel: 7, xp: 800 },
  { nivel: 8, xp: 1000 },
  { nivel: 9, xp: 1300 },
  { nivel: 10, xp: 1600 },
];

// Nível a partir do XP: segue os limiares da tabela NIVEIS (não-lineares).
// (defeito D-03 do AS-BUILT §8.1 — antes usava progressão linear de 100 em 100.)
function nivelDe(xp) {
  const x = xp || 0;
  let n = 1;
  for (const linha of NIVEIS) {
    if (x >= linha.xp) n = linha.nivel;
    else break;
  }
  return n;
}

// Progresso (0..1) DENTRO do nível atual, usando os limiares reais da tabela.
// Base da barra de XP — garante que a barra zere ao subir de nível.
function progressoNivel(xp) {
  const x = xp || 0;
  const atual = NIVEIS.find((l) => l.nivel === nivelDe(x)) || NIVEIS[0];
  const prox = NIVEIS.find((l) => l.nivel === atual.nivel + 1);
  if (!prox) return 1; // nível máximo: barra cheia
  const base = atual.xp;
  const topo = prox.xp;
  if (topo <= base) return 1;
  return Math.min(1, Math.max(0, (x - base) / (topo - base)));
}

// Trunca o histórico de pontos em 100 registros (mais recentes primeiro).
function truncarHistorico(historico, limite = 100) {
  return (historico || []).slice(0, limite);
}

// Reaplica os limiares da tabela NIVEIS a CADA entrada do histórico, acumulando
// XP na ordem cronológica (antiga -> recente). Idempotente. Retorna o histórico
// corrigido e o XP/nível totais recalculados.
// `historico` deve vir mais-recente-primeiro (como o app mantém).
function recalcularHistorico(historico) {
  const hist = (historico || []).slice();
  let acum = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    acum += numDinheiro(h.pontos);
    const nivelCorreto = nivelDe(acum);
    if (h.nivel !== nivelCorreto) h.nivel = nivelCorreto;
  }
  const xp = hist.reduce((a, h) => somaDinheiro(a, numDinheiro(h.pontos)), 0);
  return { historico: hist, xp, nivel: nivelDe(xp) };
}

// ============================================================
// S9 — HÁBITO & RETENÇÃO (streak, XP de consistência, desbloqueios)
// ============================================================

// Formata Date -> YYYY-MM-DD em fuso LOCAL (igual a hojeLocal, sem UTC).
function _dataLocal(d) {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${dia}`;
}

// E2 — Streak de dias SEGUIDOS sem nenhuma dívida em atraso, terminando em
// `hojeStr` (YYYY-MM-DD). `diasComAtraso` = array/Set de 'YYYY-MM-DD' onde
// houve ao menos uma parcela vencida. Se hoje está em atraso, o streak de hoje
// é 0 (a contagem de dias "limpos" recua para ontem). Guarda contra loop infinito.
function streakDiasSemAtraso(diasComAtraso, hojeStr) {
  const set = new Set(diasComAtraso || []);
  const hoje = new Date(`${hojeStr}T00:00:00`);
  if (isNaN(hoje.getTime())) return 0;
  let streak = 0;
  let d = new Date(hoje);
  while (streak <= 3650) {
    if (set.has(_dataLocal(d))) break; // dia com atraso quebra a sequência
    streak++;
    d.setDate(d.getDate() - 1); // recua um dia
  }
  return streak;
}

// E3 — XP de consistência: bónus por manter o streak. Não-linear e com teto
// (30 dias) para não inflar o nível sozinho. Dia 1 = 5 XP, +2 por dia seguinte.
function xpConsistencia(streak) {
  const s = Math.max(0, Math.min(30, Number(streak) || 0));
  if (s <= 0) return 0;
  return 5 + (s - 1) * 2;
}

// B5 — Ações que desbloqueiam painéis de gamificação. Recebe um estado mínimo
// (flags) e devolve a lista de ações com `feito` (bool). Função pura/testável.
function acoesDesbloqueio(estado) {
  const e = estado || {};
  return [
    { id: 'primeira-divida', feito: !!e.temDivida, acao: 'Cadastre sua primeira dívida' },
    { id: 'primeiro-pagamento', feito: !!e.temPagamento, acao: 'Registre um pagamento' },
    { id: 'carteira', feito: !!e.temCarteira, acao: 'Crie uma carteira' },
    { id: 'meta', feito: !!e.temMeta, acao: 'Defina uma meta financeira' },
  ];
}

// B5 — quantas ações de desbloqueio já foram concluídas.
function desbloqueiosConcluidos(acoes) {
  return (acoes || []).filter((a) => a.feito).length;
}

// ============================================================
// SPRINT 5 — Busca, filtros, ordenação e paginação (funções puras)
// ============================================================

// Normaliza uma string para comparação (minúscula, sem acentos, trim).
function normalizarTexto(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Filtra dívidas por texto (descrição/credor/observacao), categoria, status e
// período (mês/ano das parcelas). `filtro` = { texto, categoria, status, periodo }.
// status: '' | 'emDia' | 'atrasado' | 'quitado'. periodo: '' | 'YYYY-MM' | 'YYYY'.
function filtrarDividas(dividas, filtro) {
  const f = filtro || {};
  const texto = normalizarTexto(f.texto);
  const cat = f.categoria || '';
  const status = f.status || '';
  // Período como range: periodoDe/periodoAte podem vir como 'YYYY-MM' (mês) ou
  // 'YYYY-MM-DD' (dia/mês/ano nos novos filtros). Mantém compatível com o
  // campo legado 'periodo' (mês único).
  const deRaw = f.periodoDe || (f.periodo && f.periodo.length >= 7 ? f.periodo : '') || '';
  const ateRaw = f.periodoAte || (f.periodo && f.periodo.length >= 7 ? f.periodo : '') || '';
  // Se vier dia (AAAA-MM-DD), compara a data completa; senão compara só o mês.
  const entre = (venc) => {
    const v = venc || '';
    const vMes = v.slice(0, 7);
    if (deRaw && ateRaw) {
      if (deRaw.length === 7 && ateRaw.length === 7) return vMes >= deRaw && vMes <= ateRaw;
      return v >= deRaw && v <= ateRaw;
    }
    if (deRaw) return deRaw.length === 7 ? vMes >= deRaw : v >= deRaw;
    if (ateRaw) return ateRaw.length === 7 ? vMes <= ateRaw : v <= ateRaw;
    return true;
  };
  return (dividas || []).filter((d) => {
    if (cat && d.categoria !== cat) return false;
    if (texto) {
      const alvo = normalizarTexto([d.descricao, d.credor, d.observacao].join(' '));
      if (!alvo.includes(texto)) return false;
    }
    if (status) {
      const parcelas = d.parcelas || [];
      const todasPagas =
        parcelas.length > 0 && parcelas.every((p) => (p.status || 'pendente') === 'pago');
      const temAtraso = parcelas.some((p) => (p.status || 'pendente') === 'atrasado');
      if (status === 'quitado' && !todasPagas) return false;
      if (status === 'emDia' && (todasPagas || temAtraso)) return false;
      if (status === 'atrasado' && !temAtraso) return false;
    }
    if (deRaw || ateRaw) {
      const bate = (d.parcelas || []).some((p) => entre(p.vencimento || ''));
      if (!bate) return false;
    }
    return true;
  });
}

// Filtra pagamentos por texto (nota/divida), dívida, status de parcela e período.
function filtrarPagamentos(pagamentos, dividas, filtro) {
  const f = filtro || {};
  const texto = normalizarTexto(f.texto);
  const dividaId = f.dividaId || '';
  const cat = f.categoria || '';
  const deRaw = f.periodoDe || (f.periodo && f.periodo.length >= 7 ? f.periodo : '') || '';
  const ateRaw = f.periodoAte || (f.periodo && f.periodo.length >= 7 ? f.periodo : '') || '';
  const porDiv = (id) => (dividas || []).find((d) => d.id === id);
  const catDiv = (id) => {
    const d = porDiv(id);
    return d ? d.categoria : '';
  };
  const entre = (data) => {
    const v = data || '';
    const vMes = v.slice(0, 7);
    if (deRaw && ateRaw) {
      if (deRaw.length === 7 && ateRaw.length === 7) return vMes >= deRaw && vMes <= ateRaw;
      return v >= deRaw && v <= ateRaw;
    }
    if (deRaw) return deRaw.length === 7 ? vMes >= deRaw : v >= deRaw;
    if (ateRaw) return ateRaw.length === 7 ? vMes <= ateRaw : v <= ateRaw;
    return true;
  };
  return (pagamentos || []).filter((p) => {
    if (dividaId && p.dividaId !== dividaId) return false;
    if (cat && catDiv(p.dividaId) !== cat) return false;
    if (texto) {
      const div = porDiv(p.dividaId);
      const alvo = normalizarTexto([p.nota, div ? div.descricao : ''].join(' '));
      if (!alvo.includes(texto)) return false;
    }
    if (deRaw || ateRaw) {
      if (!entre(p.data || '')) return false;
    }
    return true;
  });
}

// Ordena uma lista de dívidas. campo: 'descricao' | 'total' | 'saldo' | 'credor'.
function ordenarDividas(dividas, campo, asc) {
  const dir = asc === false ? -1 : 1;
  const cmp = (a, b) => {
    if (campo === 'total') return (totalDivida(a) - totalDivida(b)) * dir;
    if (campo === 'saldo') return (saldoDivida(a) - saldoDivida(b)) * dir;
    const va = normalizarTexto(campo === 'credor' ? a.credor : a.descricao);
    const vb = normalizarTexto(campo === 'credor' ? b.credor : b.descricao);
    return va.localeCompare(vb) * dir;
  };
  return (dividas || []).slice().sort(cmp);
}

// Ordena pagamentos por data/valor. campo: 'data' | 'valor'.
function ordenarPagamentos(pagamentos, campo, asc) {
  const dir = asc === false ? -1 : 1;
  const cmp = (a, b) => {
    if (campo === 'valor') return (numDinheiro(a.valor) - numDinheiro(b.valor)) * dir;
    return String(a.data || '').localeCompare(String(b.data || '')) * dir;
  };
  return (pagamentos || []).slice().sort(cmp);
}

// Paginação: retorna o subconjunto da página `pagina` (1-based) com `porPagina`.
function paginar(lista, pagina, porPagina) {
  const n = Math.max(1, porPagina || 10);
  const p = Math.max(1, pagina || 1);
  const total = Math.max(0, lista.length);
  const totalPaginas = Math.max(1, Math.ceil(total / n));
  const paginaOk = Math.min(p, totalPaginas);
  const inicio = (paginaOk - 1) * n;
  return {
    itens: lista.slice(inicio, inicio + n),
    pagina: paginaOk,
    totalPaginas,
    total,
    porPagina: n,
  };
}

const API = {
  somaDinheiro,
  numDinheiro,
  totalDivida,
  totalPago,
  saldoDivida,
  valorPagoParcela,
  sincronizarParcela,
  reconciliarPagamentosAposEdicao,
  resumoParcelas,
  cet,
  calcularJurosDivida,
  simularQuitacao,
  NIVEIS,
  nivelDe,
  progressoNivel,
  truncarHistorico,
  recalcularHistorico,
  normalizarTexto,
  filtrarDividas,
  filtrarPagamentos,
  ordenarDividas,
  ordenarPagamentos,
  paginar,
  hojeLocal,
  streakDiasSemAtraso,
  xpConsistencia,
  acoesDesbloqueio,
  desbloqueiosConcluidos,
};

// Anexa ao global (window no browser / globalThis no Node) para app.js continuar
// chamando pelo nome, mesmo sem bundler (carregamento por <script src>).
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, API);
}

// Export para o Vitest (CommonJS).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
