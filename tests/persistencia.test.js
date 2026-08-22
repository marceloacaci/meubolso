// Testes de persistência atômica (S1-5 / Etapa 2 — defeito L2 do AS-BUILT).
import { test, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  salvarArquivoAtomico,
  limparTemporarios,
  fazerBackupRotativo,
  rotacionarBackups,
  listarBackups,
  restaurarBackup,
  BACKUP_GERACOES,
} from '../src/persistencia.js';

let arquivos = [];
function tmpFile(name) {
  const p = path.join(os.tmpdir(), 'meubolso-test-' + process.pid + '-' + name);
  arquivos.push(p);
  return p;
}

afterEach(() => {
  for (const a of arquivos) {
    for (const suf of ['', '.tmp-' + process.pid + '-' + a.length]) {
      try {
        fs.unlinkSync(a + suf);
      } catch (_) {}
    }
    try {
      fs.unlinkSync(a);
    } catch (_) {}
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
  const resto = fs
    .readdirSync(dir)
    .filter((n) => n.includes('meubolso-test-' + process.pid) && n.includes('.tmp-'));
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
  try {
    fs.unlinkSync(orfao);
  } catch (_) {}
});

// ---------- Backup rotativo (S2-5) ----------

test('fazerBackupRotativo cria geração com timestamp e mantém só as N mais recentes', () => {
  const origem = tmpFile('rot-origem.json');
  const pasta = path.join(os.tmpdir(), 'meubolso-rot-' + process.pid);
  salvarArquivoAtomico(origem, JSON.stringify({ dividas: [], pagamentos: [] }));
  // Gera 10 backups com datas distintas (1s de diferença cada).
  const base = new Date(2026, 0, 1, 0, 0, 0);
  for (let i = 0; i < 10; i++) {
    const d = new Date(base.getTime() + i * 1000);
    fazerBackupRotativo(origem, pasta, d);
  }
  const geracoes = listarBackups(pasta);
  // Só as BACKUP_GERACOES (7) mais recentes devem restar.
  expect(geracoes.length).toBe(BACKUP_GERACOES);
  // Mais recente primeiro.
  expect(geracoes[0].data).toBe('2026-01-01 00:00:09');
  expect(geracoes[geracoes.length - 1].data).toBe('2026-01-01 00:00:03');
  // Cada geração deve ser válida (estrutura mínima).
  expect(geracoes.every((g) => g.valido)).toBe(true);
  try {
    fs.rmSync(pasta, { recursive: true, force: true });
  } catch (_) {}
});

test('listarBackups retorna vazio e sem lançar quando a pasta não existe', () => {
  const pasta = path.join(os.tmpdir(), 'meubolso-inexistente-' + process.pid + '-xyz');
  expect(listarBackups(pasta)).toEqual([]);
});

test('restaurarBackup copia geração para o destino de forma atômica', () => {
  const origem = tmpFile('rest-origem.json');
  const pasta = path.join(os.tmpdir(), 'meubolso-rest-' + process.pid);
  const destino = tmpFile('rest-destino.json');
  salvarArquivoAtomico(origem, JSON.stringify({ dividas: [{ id: 'x' }], pagamentos: [] }));
  const gerado = fazerBackupRotativo(origem, pasta);
  expect(gerado).not.toBeNull();
  const ok = restaurarBackup(gerado, destino);
  expect(ok).toBe(true);
  const lido = JSON.parse(fs.readFileSync(destino, 'utf8'));
  expect(lido.dividas[0].id).toBe('x');
  try {
    fs.rmSync(pasta, { recursive: true, force: true });
  } catch (_) {}
});

test('rotacionarBackups remove apenas os mais antigos acima do limite', () => {
  const pasta = path.join(os.tmpdir(), 'meubolso-rot2-' + process.pid);
  fs.mkdirSync(pasta, { recursive: true });
  const base = new Date(2026, 0, 1, 0, 0, 0);
  for (let i = 0; i < 9; i++) {
    const nome =
      `meubolso-${base.getFullYear()}${String(base.getMonth() + 1).padStart(2, '0')}${String(base.getDate()).padStart(2, '0')}-` +
      `${String(base.getHours()).padStart(2, '0')}${String(base.getMinutes()).padStart(2, '0')}${String(base.getSeconds() + i).padStart(2, '0')}.json`;
    fs.writeFileSync(path.join(pasta, nome), '{}');
  }
  rotacionarBackups(pasta, 7);
  expect(fs.readdirSync(pasta).filter((n) => n.endsWith('.json')).length).toBe(7);
  try {
    fs.rmSync(pasta, { recursive: true, force: true });
  } catch (_) {}
});
