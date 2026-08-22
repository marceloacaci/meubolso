// Regressão S10 — Multiperfis 2.0 (sync de pasta + modo família).
// Usa fs real em diretório temporário; valida cópia fiel e marcação de família.
import { test, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
const perfis = require('../src/perfis.js');

function criarTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mb-s10-'));
}

test('S10 — criar perfil e sincronizar para pasta externa (espelho fiel)', () => {
  const base = criarTmp();
  try {
    const r = perfis.criarPerfil(base, 'Marcelo');
    expect(r.ok).toBe(true);
    // cria um 2º perfil para validar cópia de múltiplos arquivos
    const r2 = perfis.criarPerfil(base, 'Família');
    expect(r2.ok).toBe(true);

    const destino = path.join(base, 'sync-nuvem');
    const s = perfis.sincronizarPasta(base, destino);
    expect(s.ok).toBe(true);
    expect(s.copiados).toBeGreaterThanOrEqual(3); // perfis.json + 2 arquivos de perfil

    // o espelho deve conter o índice e os 2 perfis
    expect(fs.existsSync(path.join(destino, 'perfis.json'))).toBe(true);
    expect(fs.existsSync(path.join(destino, 'perfis', `perfil-${r.id}.json`))).toBe(true);
    expect(fs.existsSync(path.join(destino, 'perfis', `perfil-${r2.id}.json`))).toBe(true);

    // o conteúdo copiado bate com o original
    const orig = JSON.parse(
      fs.readFileSync(path.join(base, 'perfis', `perfil-${r.id}.json`), 'utf8')
    );
    const cop = JSON.parse(
      fs.readFileSync(path.join(destino, 'perfis', `perfil-${r.id}.json`), 'utf8')
    );
    expect(cop).toEqual(orig);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('S10 — sincronizarPasta com destino vazio retorna erro', () => {
  const base = criarTmp();
  try {
    const s = perfis.sincronizarPasta(base, '');
    expect(s.ok).toBe(false);
    expect(s.erro).toBeTruthy();
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('S10 — modo família: marcar perfil e listar familiares', () => {
  const base = criarTmp();
  try {
    const r = perfis.criarPerfil(base, 'Marcelo');
    const r2 = perfis.criarPerfil(base, 'Família');
    expect(perfis.perfisFamiliares(base)).toHaveLength(0);

    const d = perfis.definirFamiliar(base, r2.id, true);
    expect(d.ok).toBe(true);
    const fam = perfis.perfisFamiliares(base);
    expect(fam).toHaveLength(1);
    expect(fam[0].id).toBe(r2.id);

    // desmarcar
    perfis.definirFamiliar(base, r2.id, false);
    expect(perfis.perfisFamiliares(base)).toHaveLength(0);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('S10 — modo família: perfil inexistente retorna erro', () => {
  const base = criarTmp();
  try {
    const d = perfis.definirFamiliar(base, 'id-falso', true);
    expect(d.ok).toBe(false);
    expect(d.erro).toBe('perfil inexistente');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('S10 — sync preserva conteúdo ao re-sincronizar (idempotente)', () => {
  const base = criarTmp();
  try {
    perfis.criarPerfil(base, 'Marcelo');
    const destino = path.join(base, 'sync');
    const s1 = perfis.sincronizarPasta(base, destino);
    const s2 = perfis.sincronizarPasta(base, destino);
    expect(s1.ok).toBe(true);
    expect(s2.ok).toBe(true);
    expect(s2.copiados).toBe(s1.copiados);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
