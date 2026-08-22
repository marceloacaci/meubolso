// Regressão S8 — Confiança & auditoria (B10 hash SHA-256, C10 IPC unificado).
import { test, expect } from 'vitest';
import { sha256Arquivo } from '../src/cripto.js';
import fs from 'node:fs';
import path from 'node:path';

// B10: hash SHA-256 do arquivo de dados para detecção de corrupção.
test('B10 — sha256Arquivo devolve hash hexadecimal de 64 caracteres', () => {
  const h = sha256Arquivo('{"dividas":[]}');
  expect(h).toMatch(/^[0-9a-f]{64}$/);
});

test('B10 — mesmo conteúdo → mesmo hash (determinístico)', () => {
  const a = sha256Arquivo('conteudo-estavel-123');
  const b = sha256Arquivo('conteudo-estavel-123');
  expect(a).toBe(b);
});

test('B10 — corrupção de 1 byte muda o hash (detecção)', () => {
  const original = sha256Arquivo('{"saldo":100.50,"divida":"x"}');
  const corrompido = sha256Arquivo('{"saldo":100.51,"divida":"x"}');
  expect(corrompido).not.toBe(original);
});

test('B10 — tolerante a objetos (coage para string)', () => {
  expect(() => sha256Arquivo({ a: 1 })).not.toThrow();
});

// C10: IPC unificado — só um nome de salvamento exposto (salvarAgora),
// apontando ao handler único 'dados:salvar-agora' no main.
test('C10 — preload expõe salvarAgora e NÃO expõe salvar duplicado', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  const salvarAgoraCount = (src.match(/salvarAgora:\s*\(/g) || []).length;
  const salvarDuplicado = /^\s*salvar:\s*\(/m.test(src); // 'salvar:' no início de linha (não salvarAgora)
  expect(salvarAgoraCount).toBeGreaterThanOrEqual(1);
  expect(salvarDuplicado).toBe(false); // não há mais o 'salvar' redundante
});

test('C10 — salvarAgora invoca o handler único dados:salvar-agora', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  expect(src).toContain("ipcRenderer.invoke('dados:salvar-agora'");
});
