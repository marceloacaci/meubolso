import { test, expect } from 'vitest';
import dominio from '../src/dominio.js';

const divida = (over) => Object.assign({
  id: 'd1', descricao: 'Netflix', credor: 'Netflix', categoria: 'servico',
  parcelas: [{ id: 'p1', numero: 1, valor: 100, vencimento: '2026-09-01', status: 'pendente' }],
  observacao: ''
}, over);

const pg = (over) => Object.assign({ id: 'pg1', dividaId: 'd1', parcelaId: 'p1', valor: 50, data: '2026-08-10', nota: 'pix' }, over);

test('filtrarDividas por texto (case-insensitive, sem acento)', () => {
  const lista = [divida({}), divida({ id: 'd2', descricao: 'Energia', credor: 'Enel' })];
  expect(dominio.filtrarDividas(lista, { texto: 'netflix' }).length).toBe(1);
  expect(dominio.filtrarDividas(lista, { texto: 'ENERG' }).length).toBe(1);
  expect(dominio.filtrarDividas(lista, { texto: 'xpto' }).length).toBe(0);
});

test('filtrarDividas por categoria', () => {
  const lista = [divida({}), divida({ id: 'd2', categoria: 'cartao' })];
  expect(dominio.filtrarDividas(lista, { categoria: 'cartao' }).length).toBe(1);
  expect(dominio.filtrarDividas(lista, { categoria: 'servico' }).length).toBe(1);
});

test('filtrarDividas por status quitado/atrasado', () => {
  const quitada = divida({ parcelas: [{ id: 'p1', numero: 1, valor: 100, vencimento: '2026-01-01', status: 'pago' }] });
  const atrasada = divida({ parcelas: [{ id: 'p1', numero: 1, valor: 100, vencimento: '2026-01-01', status: 'atrasado' }] });
  const lista = [quitada, atrasada];
  expect(dominio.filtrarDividas(lista, { status: 'quitado' }).length).toBe(1);
  expect(dominio.filtrarDividas(lista, { status: 'atrasado' }).length).toBe(1);
});

test('filtrarDividas por período (YYYY-MM)', () => {
  const lista = [divida({ parcelas: [{ id: 'p1', numero: 1, valor: 100, vencimento: '2026-09-15', status: 'pendente' }] })];
  expect(dominio.filtrarDividas(lista, { periodo: '2026-09' }).length).toBe(1);
  expect(dominio.filtrarDividas(lista, { periodo: '2026-08' }).length).toBe(0);
});

test('ordenarDividas por total e saldo', () => {
  const a = divida({ id: 'a', parcelas: [{ id: 'p1', numero: 1, valor: 100, vencimento: '2026-01-01', status: 'pendente' }] });
  const b = divida({ id: 'b', parcelas: [{ id: 'p1', numero: 1, valor: 300, vencimento: '2026-01-01', status: 'pendente' }] });
  const asc = dominio.ordenarDividas([b, a], 'total', true);
  expect(asc[0].id).toBe('a');
  const desc = dominio.ordenarDividas([a, b], 'total', false);
  expect(desc[0].id).toBe('b');
});

test('ordenarPagamentos por data', () => {
  const p1 = pg({ id: '1', data: '2026-01-01' });
  const p2 = pg({ id: '2', data: '2026-03-01' });
  const ord = dominio.ordenarPagamentos([p2, p1], 'data', true);
  expect(ord[0].id).toBe('1');
});

test('paginar respeita porPagina e totalPaginas', () => {
  const lista = Array.from({ length: 25 }, (_, i) => ({ id: i }));
  const r = dominio.paginar(lista, 1, 10);
  expect(r.itens.length).toBe(10);
  expect(r.totalPaginas).toBe(3);
  expect(r.total).toBe(25);
  const r2 = dominio.paginar(lista, 3, 10);
  expect(r2.itens.length).toBe(5);
  expect(r2.pagina).toBe(3);
});

test('filtrarPagamentos por texto e período', () => {
  const dividas = [divida({})];
  const ps = [pg({ nota: 'pix' }), pg({ id: 'pg2', nota: 'ted', data: '2026-02-02' })];
  expect(dominio.filtrarPagamentos(ps, dividas, { texto: 'pix' }).length).toBe(1);
  expect(dominio.filtrarPagamentos(ps, dividas, { periodo: '2026-02' }).length).toBe(1);
});

test('normalizarTexto remove acentos e caixa', () => {
  expect(dominio.normalizarTexto('NetFLIX ÇÃO')).toBe('netflix cao');
});
