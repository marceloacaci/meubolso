// S6-5 — Teste de carga: 500 dívidas / 5.000 pagamentos.
// Mede o tempo das operações críticas de domínio e da montagem da view Dívidas.
// Não toca Electron/userData: roda em Node puro importando src/dominio.js.
const path = require('path');
const dominio = require(path.join(__dirname, '..', 'src', 'dominio.js'));
const { filtrarDividas, ordenarDividas, paginar, resumoParcelas, totalPago, saldoDivida, totalDivida } = dominio;

function gerarDados(nDividas, nPagamentos) {
  const dividas = [];
  const pagamentos = [];
  for (let i = 0; i < nDividas; i++) {
    const nP = 3 + (i % 12); // 3..14 parcelas
    const parcelas = [];
    for (let p = 0; p < nP; p++) {
      parcelas.push({ id: `d${i}p${p}`, numero: p + 1, valor: 100 + (i % 5) * 50, vencimento: '2030-01-01', status: 'pendente' });
    }
    dividas.push({ id: `d${i}`, descricao: `Dívida ${i}`, credor: `Credor ${i}`, categoria: 'cartao', parcelas });
  }
  // distribui pagamentos entre as dívidas
  for (let i = 0; i < nPagamentos; i++) {
    const dIdx = i % nDividas;
    const d = dividas[dIdx];
    const pIdx = i % d.parcelas.length;
    pagamentos.push({ id: `pg${i}`, dividaId: d.id, parcelaId: d.parcelas[pIdx].id, valor: 50, data: '2030-01-01', carteiraId: null });
  }
  return { dividas, pagamentos };
}

function medir(nome, fn) {
  const t0 = process.hrtime.bigint();
  const r = fn();
  const t1 = process.hrtime.bigint();
  const ms = Number(t1 - t0) / 1e6;
  console.log(`  ${nome.padEnd(48)} ${ms.toFixed(2).padStart(10)} ms`);
  return { nome, ms, r };
}

const N_D = 500, N_P = 5000;
console.log(`\n=== S6-5 TESTE DE CARGA (${N_D} dívidas / ${N_P} pagamentos) ===\n`);

const { dividas, pagamentos } = gerarDados(N_D, N_P);
console.log('Dados gerados:', dividas.length, 'dívidas,', pagamentos.length, 'pagamentos\n');

console.log('Operações de domínio (por chamada):');
medir('totalDivida (1 dívida)', () => dividas.map(d => totalDivida(d)).reduce((a, b) => a + b, 0));
medir('totalPago (1 dívida, varre 5000 pg)', () => dividas.map(d => totalPago(d, pagamentos)).reduce((a, b) => a + b, 0));
medir('saldoDivida (1 dívida)', () => dividas.map(d => saldoDivida(d, pagamentos)).reduce((a, b) => a + b, 0));
medir('resumoParcelas (TODAS 500 dívidas)', () => dividas.map(d => resumoParcelas(d, pagamentos)).length);

console.log('\nMontagem da view Dívidas (filtro + ordenação + paginação):');
const filtro = { texto: '', categoria: '', status: '', periodo: '', ordenar: 'descricao', asc: true, pagina: 1, porPagina: 12 };
medir('filtrarDividas + ordenarDividas + paginar', () => {
  const f = filtrarDividas(dividas, filtro);
  const o = ordenarDividas(f, filtro.ordenar, filtro.asc);
  return paginar(o, filtro.pagina, filtro.porPagina);
});

console.log('\nRender das 12 linhas da página 1 (resumoParcelas por linha):');
const pg = paginar(ordenarDividas(filtrarDividas(dividas, filtro), 'descricao', true), 1, 12);
medir('resumoParcelas nas 12 linhas paginadas', () => pg.itens.map(d => resumoParcelas(d, pagamentos)).length);

console.log('\nLimite do cronograma: 100 ms por operação.\n');
