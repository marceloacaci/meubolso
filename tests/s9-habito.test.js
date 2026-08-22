// Regressão S9 — Hábito & retenção (E2 streak, E3 XP consistência, B5 desbloqueios).
import { test, expect } from 'vitest';
import {
  streakDiasSemAtraso,
  xpConsistencia,
  acoesDesbloqueio,
  desbloqueiosConcluidos,
} from '../src/dominio.js';

// E2: streak de dias sem atraso.
test('E2 — sem nenhum dia de atraso → streak atinge o teto (guarda 3650)', () => {
  // Sem histórico de atraso, o streak é "ilimitado" — a função conta até ao
  // guarda de segurança (3650 dias ≈ 10 anos) e para. Valida que NÃO entra em
  // loop infinito e que dias limpos incrementam.
  expect(streakDiasSemAtraso([], '2026-08-22')).toBeGreaterThanOrEqual(3650);
});

test('E2 — hoje com atraso → streak 0 (recua para ontem)', () => {
  expect(streakDiasSemAtraso(['2026-08-22'], '2026-08-22')).toBe(0);
});

test('E2 — 3 dias limpos seguidos', () => {
  // hoje 22 limpo, 21 limpo, 20 limpo, 19 com atraso → streak 3
  expect(streakDiasSemAtraso(['2026-08-19'], '2026-08-22')).toBe(3);
});

test('E2 — streak longo de 10 dias', () => {
  const atrasos = ['2026-08-12']; // só dia 12 teve atraso
  expect(streakDiasSemAtraso(atrasos, '2026-08-22')).toBe(10);
});

test('E2 — data inválida → 0 (não quebra)', () => {
  expect(streakDiasSemAtraso([], 'data-ruim')).toBe(0);
});

test('E2 — Set ou array servem como entrada', () => {
  const set = new Set(['2026-08-19']);
  expect(streakDiasSemAtraso(set, '2026-08-22')).toBe(3);
});

// E3: XP de consistência (bónus por streak).
test('E3 — streak 0 → 0 XP', () => {
  expect(xpConsistencia(0)).toBe(0);
});

test('E3 — dia 1 = 5 XP', () => {
  expect(xpConsistencia(1)).toBe(5);
});

test('E3 — dia 2 = 7 XP (5 + 2)', () => {
  expect(xpConsistencia(2)).toBe(7);
});

test('E3 — dia 5 = 13 XP (5 + 4*2)', () => {
  expect(xpConsistencia(5)).toBe(13);
});

test('E3 — teto em 30 dias (não infla nível sozinho)', () => {
  expect(xpConsistencia(100)).toBe(xpConsistencia(30));
  expect(xpConsistencia(30)).toBe(5 + 29 * 2); // 63
});

test('E3 — negativo → 0', () => {
  expect(xpConsistencia(-3)).toBe(0);
});

// B5: ações que desbloqueiam gamificação.
test('B5 — estado vazio → 4 ações pendentes', () => {
  const acoes = acoesDesbloqueio({});
  expect(acoes).toHaveLength(4);
  expect(desbloqueiosConcluidos(acoes)).toBe(0);
});

test('B5 — estado completo → 4 ações concluídas', () => {
  const acoes = acoesDesbloqueio({
    temDivida: true,
    temPagamento: true,
    temCarteira: true,
    temMeta: true,
  });
  expect(desbloqueiosConcluidos(acoes)).toBe(4);
});

test('B5 — ação parcial (só dívida + pagamento)', () => {
  const acoes = acoesDesbloqueio({ temDivida: true, temPagamento: true });
  expect(desbloqueiosConcluidos(acoes)).toBe(2);
  const divida = acoes.find((a) => a.id === 'primeira-divida');
  expect(divida.feito).toBe(true);
  const meta = acoes.find((a) => a.id === 'meta');
  expect(meta.feito).toBe(false);
});

test('B5 — cada ação tem id e descrição', () => {
  const acoes = acoesDesbloqueio({});
  for (const a of acoes) {
    expect(typeof a.id).toBe('string');
    expect(typeof a.acao).toBe('string');
    expect(a.acao.length).toBeGreaterThan(0);
  }
});
