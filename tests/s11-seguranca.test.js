// Regressão S11 — Segurança de dados (B6 undo + B7b retenção da lixeira).
// Funções puras importadas de src/dominio.js (sem DOM/Electron).
import { test, expect } from 'vitest';
import {
  RETENCAO_DIAS,
  msRetencao,
  purgarLixeiraExpirados,
  contarLixeiraExpirados,
  selecionarUltimaExclusao,
} from '../src/dominio.js';

const DIAS = 24 * 60 * 60 * 1000;
const isoHaDias = (dias) => new Date(Date.now() - dias * DIAS).toISOString();

function lixeiraVazia() {
  return { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] };
}

// ---- Retenção (B7b) ----
test('B7b — RETENCAO_DIAS é 30', () => {
  expect(RETENCAO_DIAS).toBe(30);
  expect(msRetencao()).toBe(30 * DIAS);
});

test('B7b — item com 31 dias é purgado; item com 5 dias permanece', () => {
  const l = lixeiraVazia();
  l.dividas = [
    { id: 'a', descricao: 'antiga', _excluidoEm: isoHaDias(31) },
    { id: 'b', descricao: 'recente', _excluidoEm: isoHaDias(5) },
  ];
  const purgados = purgarLixeiraExpirados(l);
  expect(purgados).toBe(1);
  expect(l.dividas.map((x) => x.id)).toEqual(['b']);
});

test('B7b — contarLixeiraExpirados conta só os vencidos', () => {
  const l = lixeiraVazia();
  l.dividas = [
    { id: 'a', _excluidoEm: isoHaDias(40) },
    { id: 'b', _excluidoEm: isoHaDias(10) },
  ];
  l.metas = [{ id: 'm', _excluidoEm: isoHaDias(31) }];
  expect(contarLixeiraExpirados(l)).toBe(2); // a (40d) + m (31d)
});

test('B7b — item sem _excluidoEm NUNCA expira', () => {
  const l = lixeiraVazia();
  l.dividas = [{ id: 'x', descricao: 'sem data' }];
  const purgados = purgarLixeiraExpirados(l);
  expect(purgados).toBe(0);
  expect(l.dividas.length).toBe(1);
});

test('B7b — exatamente 30 dias NÃO expira (limite inclusivo)', () => {
  const agora = Date.now();
  const l = lixeiraVazia();
  l.dividas = [{ id: 'x', _excluidoEm: new Date(agora - 30 * DIAS).toISOString() }];
  expect(purgarLixeiraExpirados(l, agora)).toBe(0);
  expect(contarLixeiraExpirados(l, agora)).toBe(0);
});

test('B7b — exatamente 31 dias expira', () => {
  const l = lixeiraVazia();
  l.dividas = [{ id: 'x', _excluidoEm: isoHaDias(31) }];
  expect(contarLixeiraExpirados(l)).toBe(1); // conta antes de purgar
  expect(purgarLixeiraExpirados(l)).toBe(1);
});

// ---- Undo (B6) ----
test('B6 — seleciona a exclusão MAIS RECENTE (maior _excluidoEm)', () => {
  const l = lixeiraVazia();
  l.dividas = [{ id: 'antiga', _excluidoEm: isoHaDias(10) }];
  l.carteiras = [{ id: 'nova', _excluidoEm: isoHaDias(2) }];
  const r = selecionarUltimaExclusao(l);
  expect(r.tipo).toBe('carteiras');
  expect(r.item.id).toBe('nova');
});

test('B6 — lixeira vazia retorna null (nada para desfazer)', () => {
  expect(selecionarUltimaExclusao(lixeiraVazia())).toBeNull();
});

test('B6 — ignora pagamentos (restaurados junto da dívida)', () => {
  const l = lixeiraVazia();
  l.pagamentos = [{ id: 'p', _excluidoEm: isoHaDias(1) }];
  l.dividas = [{ id: 'd', _excluidoEm: isoHaDias(5) }];
  const r = selecionarUltimaExclusao(l);
  expect(r.tipo).toBe('dividas'); // pagamento não é selecionado
});

test('B6 — empate de _excluidoEm: escolhe o primeiro (estável)', () => {
  const mesmo = isoHaDias(3);
  const l = lixeiraVazia();
  l.dividas = [{ id: 'd1', _excluidoEm: mesmo }];
  l.metas = [{ id: 'm1', _excluidoEm: mesmo }];
  const r = selecionarUltimaExclusao(l);
  expect(['dividas', 'metas']).toContain(r.tipo);
  expect(r.item._excluidoEm).toBe(mesmo);
});
