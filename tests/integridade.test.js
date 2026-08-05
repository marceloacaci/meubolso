// Testes de integridade de dados (Sprint 2 / Etapa 3 — lacunas L4, L7, L9).
import { test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CURRENT_SCHEMA_VERSION,
  migrarSchema,
  definirSchemaVersion,
  validarEstrutura,
  arquivoEhValido,
  carregarComRecuperacao
} from '../src/integridade.js';

let arquivos = [];
function tmp(name) {
  const p = path.join(os.tmpdir(), 'meubolso-int-' + process.pid + '-' + name);
  arquivos.push(p);
  return p;
}
beforeEach(() => { arquivos = []; });
afterEach(() => {
  for (const a of arquivos) {
    for (const s of ['', '.tmp-' + process.pid + '-1', '.tmp-' + process.pid + '-2']) {
      try { fs.unlinkSync(a + s); } catch (_) {}
    }
    try { fs.unlinkSync(a); } catch (_) {}
  }
});

const dadosOk = () => ({
  dividas: [{ id: 'd1', descricao: 'Teste', valor: 100, parcelas: [{ id: 'p1', numero: 1, valor: 100, vencimento: '2026-09-01', status: 'pendente' }], status: 'ativa' }],
  pagamentos: [{ id: 'pg1', dividaId: 'd1', parcelaId: 'p1', valor: 100, data: '2026-09-01' }],
  carteiras: [{ id: 'c1', nome: 'Banco', saldo: 500 }],
  configuracoes: { moeda: 'BRL' }
});

test('definirSchemaVersion marca a versão atual quando ausente', () => {
  const d = definirSchemaVersion({});
  expect(d.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
});

test('migrarSchema é idempotente (não altera dado já na versão atual)', () => {
  const d = definirSchemaVersion(dadosOk());
  const antes = JSON.stringify(d);
  migrarSchema(d);
  expect(JSON.stringify(d)).toBe(antes);
});

test('migrarSchema traz dado legado (sem schemaVersion) para a versão atual', () => {
  const d = dadosOk();
  delete d.schemaVersion;
  // dado legado com parcela sem valorPago/status
  d.dividas[0].parcelas[0].valorPago = undefined;
  d.dividas[0].parcelas[0].status = undefined;
  migrarSchema(d);
  expect(d.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(typeof d.dividas[0].parcelas[0].valorPago).toBe('number');
  expect(typeof d.dividas[0].parcelas[0].status).toBe('string');
});

test('validarEstrutura aprova dado bem formado', () => {
  const r = validarEstrutura(dadosOk());
  expect(r.ok).toBe(true);
  expect(r.erros.length).toBe(0);
});

test('validarEstrutura rejeita dado sem campos obrigatórios', () => {
  const r = validarEstrutura({ foo: 1 });
  expect(r.ok).toBe(false);
  expect(r.erros.length).toBeGreaterThan(0);
});

test('arquivoEhValido detecta JSON corrompido', () => {
  const f = tmp('corrompido.json');
  fs.writeFileSync(f, '{ "dividas": [ <<< ] }');
  const r = arquivoEhValido(f);
  expect(r.ok).toBe(false);
  expect(r.motivo).toMatch(/JSON ilegível/);
});

test('arquivoEhValido detecta arquivo vazio', () => {
  const f = tmp('vazio.json');
  fs.writeFileSync(f, '');
  const r = arquivoEhValido(f);
  expect(r.ok).toBe(false);
  expect(r.motivo).toMatch(/vazio/);
});

test('arquivoEhValido aprova arquivo válido e retorna obj', () => {
  const f = tmp('ok.json');
  fs.writeFileSync(f, JSON.stringify(dadosOk()));
  const r = arquivoEhValido(f);
  expect(r.ok).toBe(true);
  expect(r.obj.dividas.length).toBe(1);
});

test('carregarComRecuperacao usa o principal quando íntegro', () => {
  const principal = tmp('principal.json');
  const backup = tmp('backup.json');
  fs.writeFileSync(principal, JSON.stringify(dadosOk()));
  fs.writeFileSync(backup, JSON.stringify(dadosOk()));
  const r = carregarComRecuperacao({ principal, backup, normalizar: (x) => x });
  expect(r.origem).toBe('principal');
  expect(r.dados.dividas.length).toBe(1);
});

test('carregarComRecuperacao cai no backup quando o principal está corrompido (L4)', () => {
  const principal = tmp('principal.json');
  const backup = tmp('backup.json');
  fs.writeFileSync(principal, '{ quebrado');
  fs.writeFileSync(backup, JSON.stringify(dadosOk()));
  const r = carregarComRecuperacao({ principal, backup, normalizar: (x) => x });
  expect(r.origem).toBe('backup');
  expect(r.dados.dividas.length).toBe(1);
});

test('carregarComRecuperacao retorna origem null quando ambos inválidos', () => {
  const principal = tmp('principal.json');
  const backup = tmp('backup.json');
  fs.writeFileSync(principal, '{ quebrado');
  fs.writeFileSync(backup, '{ tambem quebrado');
  const r = carregarComRecuperacao({ principal, backup, normalizar: (x) => x });
  expect(r.origem).toBe(null);
  expect(r.dados).toBe(null);
});

test('saveToDB grava schemaVersion (integração via src/persistencia + integridade)', () => {
  // Simula o fluxo de saveToDB: normalizar (define versão) + escrita atômica.
  const { salvarArquivoAtomico } = require('../src/persistencia.js');
  const { definirSchemaVersion, migrarSchema } = require('../src/integridade.js');
  const f = tmp('save.json');
  const d = dadosOk();
  definirSchemaVersion(d);
  migrarSchema(d);
  salvarArquivoAtomico(f, JSON.stringify(d));
  const lido = JSON.parse(fs.readFileSync(f, 'utf8'));
  expect(lido.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
});
