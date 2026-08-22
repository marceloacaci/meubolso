// Reprodução + validação dos bugs reportados (FCS).
import { test, expect } from 'vitest';
import {
  totalDivida,
  totalPago,
  saldoDivida,
  valorPagoParcela,
  sincronizarParcela,
  resumoParcelas,
} from '../src/dominio.js';

const divida = (opts = {}) => ({
  id: opts.id || 'd1',
  parcelas: opts.parcelas || [
    { id: 'p1', valor: 100, status: 'pendente' },
    { id: 'p2', valor: 200, status: 'pendente' },
  ],
});
const pg = (valor, dividaId = 'd1', parcelaId = 'p1', extra = {}) =>
  Object.assign(
    { id: 'pg' + Math.random(), dividaId, parcelaId, valor, data: '2026-08-05' },
    extra
  );

// ---------- BUG 2 ----------
test('BUG2: após registrar pagamento de 100, resumoParcelas mostra valorPago=100', () => {
  const d = divida();
  const pagamentos = [pg(100, d.id, 'p1')];
  sincronizarParcela(d, 'p1', pagamentos); // CORRIGIDO: passa pagamentos
  const r = resumoParcelas(d, pagamentos);
  expect(r.valorPago).toBe(100);
  expect(r.percentualPago).toBe(33);
  expect(r.valorRestante).toBe(200);
});

test('BUG2-fix: sincronizarParcela COM pagamentos atualiza cache da parcela (nao zera)', () => {
  const d = divida();
  const pagamentos = [pg(100, d.id, 'p1')];
  sincronizarParcela(d, 'p1', pagamentos); // app.js linha 2438 AGORA passa pagamentos
  expect(d.parcelas[0].valorPago).toBe(100);
  expect(d.parcelas[0].status).toBe('pago');
});

test('BUG2-parcela-parcial: pagamento parcial mantem status parcial e saldo', () => {
  const d = divida();
  const pagamentos = [pg(50, d.id, 'p1')];
  sincronizarParcela(d, 'p1', pagamentos);
  expect(d.parcelas[0].valorPago).toBe(50);
  expect(d.parcelas[0].status).toBe('parcial');
  const r = resumoParcelas(d, pagamentos);
  expect(r.valorRestante).toBe(250);
});

// ---------- BUG 1 (corrigido: conta DÍVIDAS, nao parcelas) ----------
function calcularResumoAtrasadasCorrigido(dividas, hoje = new Date()) {
  const todosStatus = { pendente: 0, pago: 0, atrasado: 0, negociado: 0 };
  const atrasadasDividas = new Set();
  for (const d of dividas) {
    let dividaAtrasada = false;
    for (const p of d.parcelas || []) {
      const s = p.status || 'pendente';
      todosStatus[s] = (todosStatus[s] || 0) + 1;
      if (s === 'pendente' && p.vencimento && new Date(p.vencimento) < hoje) {
        todosStatus.pendente--;
        todosStatus.atrasado++;
        dividaAtrasada = true;
      }
    }
    if (dividaAtrasada) atrasadasDividas.add(d.id);
  }
  return { todosStatus, atrasadasDividas: atrasadasDividas.size };
}

test('BUG1-fix: 1 dívida com 2 parcelas vencidas => 1 DÍVIDA atrasada (nao 2)', () => {
  const dividas = [
    {
      id: 'd1',
      parcelas: [
        { id: 'p1', valor: 100, status: 'pendente', vencimento: '2026-01-01' },
        { id: 'p2', valor: 200, status: 'pendente', vencimento: '2026-01-01' },
      ],
    },
  ];
  const r = calcularResumoAtrasadasCorrigido(dividas, new Date('2026-08-22'));
  expect(r.atrasadasDividas).toBe(1); // CORRIGIDO: 1 dívida, nao 2 parcelas
});

test('BUG1-fix: 2 dívidas cada uma com 1 parcela vencida => 2 DÍVIDAS atrasadas', () => {
  const dividas = [
    {
      id: 'd1',
      parcelas: [{ id: 'p1', valor: 100, status: 'pendente', vencimento: '2026-01-01' }],
    },
    { id: 'd2', parcelas: [{ id: 'p1', valor: 50, status: 'pendente', vencimento: '2026-01-01' }] },
  ];
  const r = calcularResumoAtrasadasCorrigido(dividas, new Date('2026-08-22'));
  expect(r.atrasadasDividas).toBe(2);
});

test('BUG1-fix: dívida quitada (parcela paga) nao conta como atrasada mesmo vencida', () => {
  const dividas = [
    {
      id: 'd1',
      parcelas: [{ id: 'p1', valor: 100, status: 'pago', vencimento: '2026-01-01' }],
    },
  ];
  const r = calcularResumoAtrasadasCorrigido(dividas, new Date('2026-08-22'));
  expect(r.atrasadasDividas).toBe(0);
});
