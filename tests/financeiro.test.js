// Testes do domínio financeiro (S1-3 do cronograma) — API nativa do Vitest.
// Cobrem: total, pago, saldo, parcela, sincronização de status, resumo,
// arredondamento de centavos (D-02) e pagamento parcial/excedente.
import { test, expect } from 'vitest';
import {
  somaDinheiro,
  numDinheiro,
  totalDivida,
  totalPago,
  saldoDivida,
  valorPagoParcela,
  sincronizarParcela,
  resumoParcelas,
} from '../src/dominio.js';

// ---- somaDinheiro / numDinheiro (D-02) ----
test('soma 0.1+0.2 fecha em 0.3 (sem erro de float)', () => {
  expect(somaDinheiro(0.1, 0.2)).toBe(0.3);
});
test('soma de tres valores fecha em 100 exato', () => {
  expect(somaDinheiro(33.33, 33.33, 33.34)).toBe(100);
});
test('soma vazia e com zero', () => {
  expect(somaDinheiro()).toBe(0);
  expect(somaDinheiro(50, 0)).toBe(50);
});
test('soma aceita string e negativo', () => {
  expect(somaDinheiro('10.50', '9.50')).toBe(20);
  expect(somaDinheiro(100, -30)).toBe(70);
});
test('numDinheiro arredonda centavos e aceita string pt-BR', () => {
  expect(numDinheiro(10.005)).toBe(10.01);
  expect(numDinheiro('7,50'.replace(',', '.'))).toBe(7.5);
});

// ---- fixtures ----
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

// ---- totalDivida ----
test('totalDivida soma parcelas', () => {
  expect(totalDivida(divida())).toBe(300);
});
test('totalDivida de dívida vazia', () => {
  expect(totalDivida({ id: 'x' })).toBe(0);
});
test('totalDivida com valores em float fecha exato', () => {
  expect(totalDivida({ parcelas: [{ valor: 33.33 }, { valor: 33.33 }, { valor: 33.34 }] })).toBe(
    100
  );
});

// ---- totalPago ----
test('totalPago filtra por dívida', () => {
  expect(totalPago(divida(), [pg(50), pg(50, 'd2', 'p1')])).toBe(50);
});
test('totalPago soma todas as parcelas da dívida', () => {
  expect(totalPago(divida(), [pg(30, 'd1', 'p1'), pg(70, 'd1', 'p2')])).toBe(100);
});
test('totalPago ignora parcela de outra dívida', () => {
  expect(totalPago(divida(), [pg(10, 'd1', 'pX')])).toBe(0);
});
test('totalPago sem pagamentos', () => {
  expect(totalPago(divida(), [])).toBe(0);
});

// ---- saldoDivida ----
test('saldo integral quando não há pagamento', () => {
  expect(saldoDivida(divida(), [])).toBe(300);
});
test('saldo parcial', () => {
  expect(saldoDivida(divida(), [pg(100, 'd1', 'p1')])).toBe(200);
});
test('saldo nunca fica negativo (excedente)', () => {
  expect(saldoDivida(divida(), [pg(500, 'd1', 'p1')])).toBe(0);
});

// ---- valorPagoParcela ----
test('valorPagoParcela de uma parcela', () => {
  expect(valorPagoParcela(divida(), 'p1', [pg(40, 'd1', 'p1')])).toBe(40);
});
test('valorPagoParcela soma vários pagamentos da mesma parcela', () => {
  expect(valorPagoParcela(divida(), 'p1', [pg(40, 'd1', 'p1'), pg(10, 'd1', 'p1')])).toBe(50);
});
test('valorPagoParcela sem id delega ao total da dívida', () => {
  expect(valorPagoParcela(divida(), null, [pg(40, 'd1', 'p1')])).toBe(40);
});

// ---- sincronizarParcela (status) ----
test('sincroniza parcela como pago quando quitada', () => {
  const d = divida();
  const r = sincronizarParcela(d, 'p1', [pg(100, 'd1', 'p1')]);
  expect(r.status).toBe('pago');
  expect(r.valorPago).toBe(100);
});
test('sincroniza parcela como parcial', () => {
  const d = divida();
  const r = sincronizarParcela(d, 'p1', [pg(40, 'd1', 'p1')]);
  expect(r.status).toBe('parcial');
});
test('sincroniza parcela como pendente sem pagamento', () => {
  const d = divida();
  const r = sincronizarParcela(d, 'p1', []);
  expect(r.status).toBe('pendente');
});
test('quitacao exata com float marca como pago (D-02)', () => {
  const d = { id: 'd', parcelas: [{ id: 'p', valor: 100, status: 'pendente' }] };
  const r = sincronizarParcela(d, 'p', [
    pg(33.33, 'd', 'p'),
    pg(33.33, 'd', 'p'),
    pg(33.34, 'd', 'p'),
  ]);
  expect(r.status).toBe('pago');
});
test('excedente ainda é pago', () => {
  const d = divida();
  const r = sincronizarParcela(d, 'p1', [pg(150, 'd1', 'p1')]);
  expect(r.status).toBe('pago');
});
test('dataPagamento é a mais recente', () => {
  const d = divida();
  const r = sincronizarParcela(d, 'p1', [
    pg(10, 'd1', 'p1', { data: '2026-01-01' }),
    pg(10, 'd1', 'p1', { data: '2026-08-05' }),
  ]);
  expect(r.dataPagamento).toBe('2026-08-05');
});

// ---- resumoParcelas ----
test('resumo reflete pagamento de 1 parcela', () => {
  const d = divida();
  const res = resumoParcelas(d, [pg(100, 'd1', 'p1')]);
  expect(res.total).toBe(2);
  expect(res.pagas).toBe(1);
  expect(res.restantes).toBe(1);
  expect(res.valorPago).toBe(100);
  expect(res.valorRestante).toBe(200);
  expect(res.percentualPago).toBe(33);
});
test('resumo sem pagamento tem 0% pago', () => {
  const d = divida();
  const res = resumoParcelas(d, []);
  expect(res.percentualPago).toBe(0);
  expect(res.valorRestante).toBe(300);
});
