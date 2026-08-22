// Testes da Sprint 4 — Juros/CET (S4-2) e Simulador de quitação (S4-4).
// Funções puras importadas de src/dominio.js (idênticas às usadas em runtime).
import { test, expect } from 'vitest';
const { cet, calcularJurosDivida, simularQuitacao } = require('../src/dominio.js');

// Helper: monta uma dívida no formato do app (parcelas com valor/vencimento).
function divida(id, valorTotal, taxaMensal, prazoMeses) {
  const parcelas = [];
  const n = Math.max(1, prazoMeses || 1);
  const porParcela = valorTotal / n;
  for (let i = 1; i <= n; i++) {
    parcelas.push({
      id: id + '-p' + i,
      numero: i,
      valor: porParcela,
      vencimento: '2026-0' + ((i % 9) + 1) + '-15',
      status: 'pendente',
      valorPago: 0,
      dataPagamento: '',
    });
  }
  return { id, descricao: 'D' + id, categoria: 'outro', taxaMensal, prazoMeses: n, parcelas };
}

// ---- S4-2: CET ----
test('CET: taxa zero retorna CET zero', () => {
  expect(cet(0)).toBe(0);
});
test('CET: taxa 1% a.m. ~ 12,68% a.a.', () => {
  expect(cet(1)).toBeCloseTo(12.6825, 3);
});
test('CET: taxa 5% a.m. ~ 79,59% a.a.', () => {
  expect(cet(5)).toBeCloseTo(79.59, 2);
});
test('CET: valor negativo/inválido não quebra', () => {
  expect(cet(-2)).toBe(0);
  expect(cet('abc')).toBe(0);
});

// ---- S4-2: calcularJurosDivida (Tabela Price) ----
test('Juros: dívida zerada retorna tudo zero', () => {
  const r = calcularJurosDivida(divida('x', 0, 5, 12), { taxaMensal: 5, prazoMeses: 12 });
  expect(r.principal).toBe(0);
  expect(r.juros).toBe(0);
  expect(r.total).toBe(0);
});
test('Juros: sem juros (taxa 0) total = principal', () => {
  const r = calcularJurosDivida(divida('a', 1200, 0, 12), { taxaMensal: 0, prazoMeses: 12 });
  expect(r.juros).toBe(0);
  expect(r.total).toBeCloseTo(1200, 2);
  expect(r.parcela).toBeCloseTo(100, 2);
  expect(r.cet).toBe(0);
});
test('Juros: 2% a.m. em 12 meses gera parcela e juros corretos', () => {
  const r = calcularJurosDivida(divida('b', 1000, 2, 12), { taxaMensal: 2, prazoMeses: 12 });
  // parcela = P.i / (1 - (1+i)^-n)
  expect(r.parcela).toBeCloseTo(94.56, 1);
  expect(r.total).toBeCloseTo(r.parcela * 12, 1);
  expect(r.juros).toBeCloseTo(r.total - 1000, 1);
  expect(r.juros).toBeGreaterThan(100);
});
test('Juros: total - principal = juros', () => {
  const r = calcularJurosDivida(divida('c', 5000, 3, 24), { taxaMensal: 3, prazoMeses: 24 });
  expect(r.total - r.principal).toBeCloseTo(r.juros, 4);
});

// ---- S4-4: simularQuitacao ----
test('Simulador: sem dívidas com saldo é impossível', () => {
  const r = simularQuitacao([], { estrategia: 'avalanche', pagamentoMensal: 500, pagamentos: [] });
  expect(r.possivel).toBe(false);
  expect(r.meses).toBe(0);
});
test('Simulador: pagamento zero é impossível', () => {
  const dividas = [divida('d', 1000, 0, 12)];
  const r = simularQuitacao(dividas, {
    estrategia: 'avalanche',
    pagamentoMensal: 0,
    pagamentos: [],
  });
  expect(r.possivel).toBe(false);
});
test('Simulador: dívida sem juros -> tempo = principal / pagamento', () => {
  const dividas = [divida('e', 1000, 0, 12)];
  const r = simularQuitacao(dividas, {
    estrategia: 'avalanche',
    pagamentoMensal: 100,
    pagamentos: [],
  });
  expect(r.possivel).toBe(true);
  expect(r.meses).toBe(10);
  expect(r.totalJuros).toBeCloseTo(0, 4);
  // totalPago tolera o centavo de arredondamento das parcelas (saldo residual quitado).
  expect(r.totalPago).toBeCloseTo(1000, 1);
});
test('Simulador: avalanche gera juros <= bola de neve (taxas assimétricas)', () => {
  const dividas = [divida('alta', 2000, 8, 24), divida('baixa', 5000, 1, 60)];
  const av = simularQuitacao(dividas, {
    estrategia: 'avalanche',
    pagamentoMensal: 800,
    pagamentos: [],
  });
  const bn = simularQuitacao(dividas, {
    estrategia: 'bolaNeve',
    pagamentoMensal: 800,
    pagamentos: [],
  });
  expect(av.possivel).toBe(true);
  expect(bn.possivel).toBe(true);
  // Avalanche (maior juros primeiro) deve custar menos juros.
  expect(av.totalJuros).toBeLessThanOrEqual(bn.totalJuros);
});
test('Simulador: pagamento alto quita rápido e com juros finito', () => {
  const dividas = [divida('f', 3000, 4, 36)];
  const r = simularQuitacao(dividas, {
    estrategia: 'avalanche',
    pagamentoMensal: 1000,
    pagamentos: [],
  });
  expect(r.possivel).toBe(true);
  expect(r.meses).toBeGreaterThan(0);
  expect(r.meses).toBeLessThan(36);
  expect(Number.isFinite(r.totalJuros)).toBe(true);
});
