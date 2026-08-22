// Testes de notificações nativas (S7): garante o DISPARO do caminho
// renderer -> preload -> main -> Notification nativa do SO.
//   (A) preload: window.api.notificarNativa(payload) => ipcRenderer.invoke('notificar:nativa', payload)
//   (B) main:    criarNotificacaoNativa() cria new Notification(...).show() e retorna { ok: true }
import { test, expect, vi } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { montarNotificacoes } from '../src/notificacoes-montar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireReal = createRequire(import.meta.url);

// ============================ (A) PRELOAD ============================
// O preload usa require('electron'); interceptamos o loader nativo do Node para
// injetar o stub (o Vitest não intercepta require CJS de módulo externo).
test('(A) preload: api.notificarNativa chama ipcRenderer.invoke com o canal correto', async () => {
  const invokeMock = vi.fn(() => Promise.resolve({ ok: true }));
  const electronStub = {
    contextBridge: {
      exposeInMainWorld: (_nome, api) => {
        globalThis.__apiCapturado = api;
      },
    },
    ipcRenderer: { invoke: invokeMock, on: vi.fn(), removeListener: vi.fn() },
  };
  const Module = requireReal('module');
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'electron') return electronStub;
    return originalLoad.apply(this, arguments);
  };
  try {
    // Limpa cache para garantir execução fresca do preload.
    delete requireReal.cache[requireReal.resolve(path.join(__dirname, '..', 'preload.js'))];
    requireReal(path.join(__dirname, '..', 'preload.js'));
  } finally {
    Module._load = originalLoad;
  }

  const api = globalThis.__apiCapturado;
  expect(api).toBeDefined();
  expect(typeof api.notificarNativa).toBe('function');
  const payload = { titulo: 'MeuBolso', corpo: 'Você tem 2 dívidas em atraso.' };
  const res = await api.notificarNativa(payload);
  expect(invokeMock).toHaveBeenCalledTimes(1);
  expect(invokeMock).toHaveBeenCalledWith('notificar:nativa', payload);
  expect(res).toEqual({ ok: true });
});

// ============================ (B) MAIN (handler extraído) ============================
const { criarNotificacaoNativa } = requireReal(
  path.join(__dirname, '..', 'src', 'notificacoes-nativas.js')
);

test('(B) criarNotificacaoNativa: cria Notification nativa e dispara .show()', () => {
  const showMock = vi.fn();
  const NotificationMock = vi.fn();
  // function (não arrow) para que `new` aplique this.show corretamente.
  NotificationMock.mockImplementation(function () {
    this.show = showMock;
  });
  const res = criarNotificacaoNativa(
    { titulo: 'MeuBolso', corpo: 'Lembrete de pontuar!' },
    { Notification: NotificationMock, platform: 'win32' }
  );
  expect(NotificationMock).toHaveBeenCalledTimes(1);
  const cfg = NotificationMock.mock.calls[0][0];
  expect(cfg.title).toBe('MeuBolso');
  expect(cfg.body).toBe('Lembrete de pontuar!');
  expect(showMock).toHaveBeenCalledTimes(1);
  expect(res).toEqual({ ok: true });
});

test('(B) criarNotificacaoNativa: ignora payload sem corpo', () => {
  const showMock = vi.fn();
  const NotificationMock = vi.fn();
  NotificationMock.mockImplementation(function () {
    this.show = showMock;
  });
  const res = criarNotificacaoNativa(
    { titulo: 'X' },
    { Notification: NotificationMock, platform: 'win32' }
  );
  expect(res).toEqual({ ok: false, motivo: 'vazio' });
  expect(NotificationMock).not.toHaveBeenCalled();
});

test('(B) criarNotificacaoNativa: captura erro de criação (SO sem suporte)', () => {
  const NotificationMock = vi.fn();
  NotificationMock.mockImplementation(function () {
    throw new Error('no daemon');
  });
  const res = criarNotificacaoNativa(
    { titulo: 'MeuBolso', corpo: 'oi' },
    { Notification: NotificationMock, platform: 'linux' }
  );
  expect(res.ok).toBe(false);
  expect(res.motivo).toContain('no daemon');
});

test('(B) criarNotificacaoNativa: plataforma não suportada retorna so-nao-suportado', () => {
  const showMock = vi.fn();
  const NotificationMock = vi.fn();
  NotificationMock.mockImplementation(function () {
    this.show = showMock;
  });
  const res = criarNotificacaoNativa(
    { titulo: 'MeuBolso', corpo: 'oi' },
    { Notification: NotificationMock, platform: 'android' }
  );
  expect(res).toEqual({ ok: false, motivo: 'so-nao-suportado' });
  expect(NotificationMock).not.toHaveBeenCalled();
});

// ============================================================
// (C) montarNotificacoes — contagem de dívidas (regressão do bug de
// vencimento em datetime ISO que zerava as atrasadas).
// ============================================================
const T_FAKE = (k) =>
  ({
    'notif.titulo': 'MeuBolso',
    'notif.atrasadas': 'Você tem {n} dívida(s) em atraso.',
    'notif.aVencer': 'Você tem {n} dívida(s) vencendo em até 3 dias.',
    'notif.pontuar': 'Pontue!',
  })[k] || k;

function hojeMais(dias) {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  h.setDate(h.getDate() + dias);
  return h;
}
// Formata uma data como 'AAAA-MM-DD' (mesmo do <input type="date">).
function isoData(d) {
  return d.toISOString().slice(0, 10);
}

test('(C) conta dívida ATRASADA (vencimento data ISO)', () => {
  const msgs = montarNotificacoes({
    dadosCarregados: true,
    dividas: [{ parcelas: [{ status: 'pendente', vencimento: isoData(hojeMais(-5)) }] }],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs.some((m) => m.corpo.includes('1 dívida(s) em atraso'))).toBe(true);
});

test('(C) REGRESSÃO: 1 dívida com 2 parcelas atrasadas conta como 1 (não 2)', () => {
  // Bug reportado: usuário com 1 dívida atrasada (2 parcelas vencidas) via
  // notificação "2 dívidas em atraso". O {n} deve ser nº de DÍVIDAS, não parcelas.
  const msgs = montarNotificacoes({
    dadosCarregados: true,
    dividas: [
      {
        parcelas: [
          { status: 'pendente', vencimento: isoData(hojeMais(-5)) },
          { status: 'pendente', vencimento: isoData(hojeMais(-2)) },
        ],
      },
    ],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs.some((m) => m.corpo.includes('1 dívida(s) em atraso'))).toBe(true);
  expect(msgs.some((m) => m.corpo.includes('2 dívida(s) em atraso'))).toBe(false);
});

test('(C) 2 dívidas distintas atrasadas contam 2', () => {
  const msgs = montarNotificacoes({
    dadosCarregados: true,
    dividas: [
      { parcelas: [{ status: 'pendente', vencimento: isoData(hojeMais(-1)) }] },
      { parcelas: [{ status: 'pendente', vencimento: isoData(hojeMais(-3)) }] },
    ],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs.some((m) => m.corpo.includes('2 dívida(s) em atraso'))).toBe(true);
});
test('(C) REGRESSÃO: dívida atrasada com vencimento DATETIME ISO não zera', () => {
  // Antes o parse fazia new Date('...THH:MM:SS' + 'T00:00:00') -> Invalid Date.
  const vencimentoDt = isoData(hojeMais(-2)) + 'T14:30:00';
  const msgs = montarNotificacoes({
    dadosCarregados: true,
    dividas: [{ parcelas: [{ status: 'pendente', vencimento: vencimentoDt }] }],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs.some((m) => m.corpo.includes('1 dívida(s) em atraso'))).toBe(true);
});

test('(C) conta dívida A VENCER em até 3 dias (data e datetime ISO)', () => {
  const msgs = montarNotificacoes({
    dadosCarregados: true,
    dividas: [
      { parcelas: [{ status: 'pendente', vencimento: isoData(hojeMais(1)) }] },
      { parcelas: [{ status: 'pendente', vencimento: isoData(hojeMais(2)) + 'T09:00:00' }] },
    ],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs.some((m) => m.corpo.includes('2 dívida(s) vencendo'))).toBe(true);
});

test('(C) ignora parcelas pagas', () => {
  const msgs = montarNotificacoes({
    dadosCarregados: true,
    dividas: [{ parcelas: [{ status: 'pago', vencimento: isoData(hojeMais(-10)) }] }],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs.some((m) => m.corpo.includes('em atraso'))).toBe(false);
  expect(msgs.some((m) => m.corpo.includes('vencendo'))).toBe(false);
});

test('(C) retorna [] se dados não carregados', () => {
  const msgs = montarNotificacoes({
    dadosCarregados: false,
    dividas: [{ parcelas: [{ status: 'pendente', vencimento: isoData(hojeMais(-1)) }] }],
    hoje: hojeMais(0),
    em3: hojeMais(3),
    t: T_FAKE,
  });
  expect(msgs).toEqual([]);
});
