// Testes de persistência atômica (S1-5 / Etapa 2 — defeito L2 do AS-BUILT).
import { test, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { salvarArquivoAtomico, limparTemporarios } from '../src/persistencia.js';

let arquivos = [];
function tmpFile(name) {
  const p = path.join(os.tmpdir(), 'meubolso-test-' + process.pid + '-' + name);
  arquivos.push(p);
  return p;
}

afterEach(() => {
  for (const a of arquivos) {
    for (const suf of ['', '.tmp-' + process.pid + '-' + a.length]) {
      try { fs.unlinkSync(a + suf); } catch (_) {}
    }
    try { fs.unlinkSync(a); } catch (_) {}
  }
});

test('salvarArquivoAtomico grava JSON íntegro no destino', () => {
  const f = tmpFile('atomico.json');
  const dados = { dividas: [{ id: '1', valor: 123.45 }], pagamentos: [] };
  salvarArquivoAtomico(f, JSON.stringify(dados));
  expect(fs.existsSync(f)).toBe(true);
  const lido = JSON.parse(fs.readFileSync(f, 'utf8'));
  expect(lido.dividas[0].valor).toBe(123.45);
});

test('salvarArquivoAtomico não deixa arquivo .tmp órfão', () => {
  const f = tmpFile('sem-tmp.json');
  salvarArquivoAtomico(f, JSON.stringify({ ok: true }));
  const dir = path.dirname(f);
  const resto = fs.readdirSync(dir).filter((n) => n.includes('meubolso-test-' + process.pid) && n.includes('.tmp-'));
  expect(resto.length).toBe(0);
});

test('salvarArquivoAtomico sobrescreve sem corromper (conteúdo maior)', () => {
  const f = tmpFile('sobrescreve.json');
  salvarArquivoAtomico(f, JSON.stringify({ a: 1 }));
  const grande = { lista: Array.from({ length: 500 }, (_, i) => ({ i, v: 'x'.repeat(50) })) };
  salvarArquivoAtomico(f, JSON.stringify(grande));
  const lido = JSON.parse(fs.readFileSync(f, 'utf8'));
  expect(lido.lista.length).toBe(500);
});

test('limparTemporarios remove apenas os .tmp do prefixo', () => {
  const dir = os.tmpdir();
  const prefixo = 'meubolso-limpar-' + process.pid + '-';
  const orfao = path.join(dir, prefixo + 'meubolso.json.tmp-' + process.pid + '-123');
  const legit = path.join(dir, prefixo + 'meubolso.json');
  fs.writeFileSync(orfao, '{}');
  fs.writeFileSync(legit, '{"keep":1}');
  arquivos.push(legit); // garantir limpeza no afterEach
  const removidos = limparTemporarios(dir, prefixo);
  expect(removidos).toBe(1);
  expect(fs.existsSync(orfao)).toBe(false);
  expect(fs.existsSync(legit)).toBe(true);
  try { fs.unlinkSync(orfao); } catch (_) {}
});
