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

// ============================================================
// FINANCEIRO
// ============================================================

// Total de uma dívida = soma dos valores das parcelas.
function totalDivida(d) {
  return (d.parcelas || []).reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
}

// Total pago de uma dívida = soma dos pagamentos VINCULADOS a ela (dividaId
// E parcelaId pertencente à dívida). `pagamentos` é a lista global de pagamentos.
function totalPago(d, pagamentos) {
  const ids = new Set((d.parcelas || []).filter((p) => p.id).map((p) => p.id));
  return (pagamentos || [])
    .filter((p) => p.dividaId === d.id && ids.has(p.parcelaId))
    .reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
}

// Saldo devedor = total − pago (nunca negativo).
function saldoDivida(d, pagamentos) {
  return Math.max(0, totalDivida(d) - totalPago(d, pagamentos));
}

// Total pago em UMA parcela específica da dívida.
function valorPagoParcela(d, parcelaId, pagamentos) {
  if (!parcelaId) return totalPago(d, pagamentos); // caso legado: sem parcela
  return (pagamentos || [])
    .filter((p) => p.dividaId === d.id && p.parcelaId === parcelaId)
    .reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
}

// Recalcula os campos em cache da parcela (valorPago, status) a partir dos
// pagamentos vinculados. É a ÚNICA fonte de verdade para o "pago" da parcela.
// Retorna a parcela atualizada (não muta o chamador, mas atualiza `parc` se passado).
function sincronizarParcela(divida, parcelaId, pagamentos) {
  const parc = (divida.parcelas || []).find((p) => p.id === parcelaId);
  if (!parc) return parc;
  const pagos = (pagamentos || []).filter(
    (p) => p.dividaId === divida.id && p.parcelaId === parcelaId
  );
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

// Resumo de parcelas de uma dívida para exibição.
function resumoParcelas(d, pagamentos) {
  const total = (d.parcelas || []).length;
  const pagamentoParcelas = new Set(
    (pagamentos || [])
      .filter((p) => p.dividaId === d.id && p.parcelaId)
      .map((p) => p.parcelaId)
  );
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
  const parcela = principal * i / (1 - Math.pow(1 + i, -n));
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
  let debs = (dividas || []).map(d => ({
    id: d.id,
    saldo: saldoDivida(d, opts && opts.pagamentos),
    taxa: (Number(d.taxaMensal) || 0) / 100
  })).filter(x => x.saldo > 0.005);
  if (debs.length === 0 || pagamento <= 0) {
    return { meses: 0, totalJuros: 0, totalPago: 0, possivel: false };
  }
  debs.sort((a, b) => estrategia === 'avalanche' ? (b.taxa - a.taxa) : (a.saldo - b.saldo));
  let meses = 0, totalJuros = 0, totalPago = 0;
  const LIMITE = 1200; // teto de 100 anos (segurança contra loop infinito)
  while (debs.some(d => d.saldo > 0.005) && meses < LIMITE) {
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
  const possivel = debs.every(d => d.saldo <= 0.005);
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
// SPRINT 5 — Busca, filtros, ordenação e paginação (funções puras)
// ============================================================

// Normaliza uma string para comparação (minúscula, sem acentos, trim).
function normalizarTexto(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();
}

// Filtra dívidas por texto (descrição/credor/observacao), categoria, status e
// período (mês/ano das parcelas). `filtro` = { texto, categoria, status, periodo }.
// status: '' | 'emDia' | 'atrasado' | 'quitado'. periodo: '' | 'YYYY-MM' | 'YYYY'.
function filtrarDividas(dividas, filtro) {
  const f = filtro || {};
  const texto = normalizarTexto(f.texto);
  const cat = f.categoria || '';
  const status = f.status || '';
  const periodo = f.periodo || ''; // 'YYYY-MM' ou 'YYYY'
  return (dividas || []).filter(d => {
    if (cat && d.categoria !== cat) return false;
    if (texto) {
      const alvo = normalizarTexto([d.descricao, d.credor, d.observacao].join(' '));
      if (!alvo.includes(texto)) return false;
    }
    if (status) {
      const saldo = saldoDivida(d);
      if (status === 'quitado' && saldo > 0) return false;
      if (status === 'emDia' && saldo <= 0) return false;
      if (status === 'atrasado') {
        const temAtraso = (d.parcelas || []).some(p => (p.status || 'pendente') === 'atrasado');
        if (!temAtraso) return false;
      }
    }
    if (periodo) {
      const bate = (d.parcelas || []).some(p => {
        const v = (p.vencimento || '').slice(0, periodo.length);
        return v === periodo;
      });
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
  const periodo = f.periodo || '';
  const porDiv = (id) => (dividas || []).find(d => d.id === id);
  return (pagamentos || []).filter(p => {
    if (dividaId && p.dividaId !== dividaId) return false;
    if (texto) {
      const div = porDiv(p.dividaId);
      const alvo = normalizarTexto([p.nota, div ? div.descricao : ''].join(' '));
      if (!alvo.includes(texto)) return false;
    }
    if (periodo) {
      const v = (p.data || '').slice(0, periodo.length);
      if (v !== periodo) return false;
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
    porPagina: n
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
