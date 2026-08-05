// Testes de gamificação (S1-4 do cronograma) — API nativa do Vitest.
// Cobrem: nivelDe (tabela NIVEIS, D-03), progressoNivel, truncarHistorico,
// recalcularHistorico (migração retroativa idempotente).
import { test, expect } from 'vitest';
import {
  NIVEIS,
  nivelDe,
  progressoNivel,
  truncarHistorico,
  recalcularHistorico,
} from '../src/dominio.js';

// ---- nivelDe (D-03 — coerente com a tabela NIVEIS) ----
const casos = [
  [0, 1], [50, 1], [100, 2], [199, 2], [200, 3], [300, 4], [400, 5],
  [599, 5], [600, 6], [799, 6], [800, 7], [1000, 8], [1300, 9],
  [1599, 9], [1600, 10], [5000, 10],
];
for (const [xp, nv] of casos) {
  test('nivelDe(' + xp + ') = ' + nv, () => {
    expect(nivelDe(xp)).toBe(nv);
  });
}

test('nivelDe(600) respeita a tabela NIVEIS (era o ponto de divergência D-03)', () => {
  // Antes da correção, nivelDe usava progressão linear e retornava 7.
  expect(nivelDe(600)).toBe(6);
});
test('nivelDe(1600) é o nível máximo 10', () => {
  expect(nivelDe(1600)).toBe(10);
});

// ---- progressoNivel (barra de XP) ----
test('progresso no meio do nível 1', () => {
  expect(+progressoNivel(50).toFixed(2)).toBe(0.5);
});
test('progresso no meio do nível 2', () => {
  expect(+progressoNivel(150).toFixed(2)).toBe(0.5);
});
test('progresso zera ao entrar no nível 6 (limiar 600)', () => {
  expect(+progressoNivel(600).toFixed(2)).toBe(0.0);
});
test('progresso na metade do nível 6', () => {
  expect(+progressoNivel(700).toFixed(2)).toBe(0.5);
});
test('progresso no nível máximo é 1', () => {
  expect(+progressoNivel(5000).toFixed(2)).toBe(1.0);
});

// ---- truncarHistorico ----
test('trunca histórico em 100 registros', () => {
  const h = Array.from({ length: 120 }, () => ({ pontos: 1 }));
  expect(truncarHistorico(h).length).toBe(100);
});
test('truncar mantém a ordem (mais recente primeiro)', () => {
  const h = Array.from({ length: 120 }, (_, i) => ({ pontos: i }));
  expect(truncarHistorico(h)[0].pontos).toBe(0);
});
test('truncar lista vazia', () => {
  expect(truncarHistorico([]).length).toBe(0);
});

// ---- recalcularHistorico (migração retroativa) ----
test('recalcula xp e nível de histórico mais-recente-primeiro', () => {
  const h = [{ pontos: 10, nivel: 99 }, { pontos: 10, nivel: 1 }];
  const { historico, xp, nivel } = recalcularHistorico(h);
  expect(xp).toBe(20);
  expect(nivel).toBe(1);
  // entrada mais antiga (índice 1): acum 10 -> nível 1
  expect(historico[1].nivel).toBe(1);
  // entrada mais nova (índice 0): acum 20 -> nível 1
  expect(historico[0].nivel).toBe(1);
});
test('recalcularHistorico é idempotente', () => {
  const h = [{ pontos: 100, nivel: 1 }, { pontos: 100, nivel: 1 }];
  const r1 = recalcularHistorico(h);
  const r2 = recalcularHistorico(r1.historico);
  expect(r1.xp).toBe(r2.xp);
  expect(r1.nivel).toBe(r2.nivel);
});
test('corrige nível antigo errado (ex.: migração gestão 30->5)', () => {
  const h = [{ pontos: 5, nivel: 99 }, { pontos: 5, nivel: 99 }];
  const { historico, xp } = recalcularHistorico(h);
  expect(historico[1].nivel).toBe(1);
  expect(xp).toBe(10);
});
test('xp usa somaDinheiro (centavos) em vez de +', () => {
  const h = [{ pontos: 0.1 }, { pontos: 0.2 }];
  const { xp } = recalcularHistorico(h);
  expect(xp).toBe(0.3);
});

// ---- NIVEIS íntegra ----
test('tabela NIVEIS tem 10 níveis', () => {
  expect(NIVEIS.length).toBe(10);
});
test('NIVEIS começa em 0 e termina em 1600', () => {
  expect(NIVEIS[0].xp).toBe(0);
  expect(NIVEIS[9].xp).toBe(1600);
});
