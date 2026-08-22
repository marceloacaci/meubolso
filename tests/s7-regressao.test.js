// Regressão S7 — Integridade numérica (C11 centavos, C12 fuso BR, E4 níveis).
// Garante que os defeitos D-01/D-02/D-03 do AS-BUILT §8.1 continuam fechados.
import { test, expect, vi } from 'vitest';
import { somaDinheiro, numDinheiro, nivelDe, NIVEIS, hojeLocal } from '../src/dominio.js';

// C11: soma em centavos inteiros (0.1 + 0.2 === 0.3)
test('C11 — 0.1 + 0.2 fecha exatamente em 0.30', () => {
  expect(somaDinheiro(0.1, 0.2)).toBe(0.3);
});

test('C11 — soma de muitos centavos não acumula erro de float', () => {
  const vals = [0.01, 0.02, 0.03, 0.1, 0.2, 0.33, 0.07];
  expect(somaDinheiro(...vals)).toBe(0.76);
});

test('C11 — dívida quitada zera exata (sem sobra de centavo)', () => {
  const total = somaDinheiro(100.0, 50.0);
  const pago = somaDinheiro(100.0, 50.0);
  expect(total - pago).toBe(0);
});

test('C11 — numDinheiro arredonda para 2 casas (centavos)', () => {
  expect(numDinheiro('12.345')).toBe(12.35);
  expect(numDinheiro(7.1)).toBe(7.1);
});

// E4: tabela NÍVEIS não-linear × nivelDe()
test('E4 — 600 XP → nível 6 (tabela não-linear)', () => {
  expect(nivelDe(600)).toBe(6);
});

test('E4 — 1600 XP → nível 10 (teto)', () => {
  expect(nivelDe(1600)).toBe(10);
});

test('E4 — 0 XP → nível 1', () => {
  expect(nivelDe(0)).toBe(1);
});

test('E4 — monótono e respeita limiares da tabela', () => {
  let ant = 0;
  for (const linha of NIVEIS) {
    const n = nivelDe(linha.xp);
    expect(n).toBe(linha.nivel);
    expect(n).toBeGreaterThanOrEqual(ant);
    ant = n;
  }
});

test('E4 — valores entre limiares ficam no nível correto', () => {
  expect(nivelDe(450)).toBe(5); // entre 400 (n5) e 600 (n6)
  expect(nivelDe(700)).toBe(6); // entre 600 (n6) e 800 (n7)
});

// C12: data local sem conversão UTC (D-01)
test('C12 — 23h30 em fuso negativo NÃO salta para o dia seguinte', () => {
  // Instante que é 23:30 em Brasília (UTC−3) = 02:30 UTC do dia SEGUINTE.
  // Se hojeLocal usasse toISOString()/UTC (caminho quebrado D-01), devolveria
  // o dia +1; usando getFullYear/getMonth/getDate (local), devolve o dia corrente.
  const tzOriginal = process.env.TZ;
  try {
    process.env.TZ = 'America/Sao_Paulo';
    // 2026-08-22 02:30:00 UTC  ==  2026-08-21 23:30:00 Brasília
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T02:30:00Z'));
    const got = hojeLocal();
    expect(got).toBe('2026-08-21'); // dia corrente em Brasília (não 2026-08-22 UTC)
    // Prova que o caminho UTC quebrado D-01 realmente divergiria:
    const utcQuebrado = new Date().toISOString().slice(0, 10);
    expect(utcQuebrado).toBe('2026-08-22'); // o bug D-01 daria dia+1
    expect(utcQuebrado).not.toBe(got); // logo hojeLocal (local) está correto
  } finally {
    vi.useRealTimers();
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  }
});
