// Teste de integração da migração de dados entre versões (ambiente instalado).
// Usa fs real em um diretório temporário; valida cópia + limpeza segura.
import { test, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
const { executarMigracaoFS } = require('../src/caminhos-dados.js');

function criarTmp() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-migr-'));
  return base;
}

test('migracao copia meubolso.json da versao antiga para a nova', () => {
  const base = criarTmp();
  try {
    fs.mkdirSync(path.join(base, '1.0.0'), { recursive: true });
    fs.writeFileSync(path.join(base, '1.0.0', 'meubolso.json'), JSON.stringify({ dividas: [{ id: 'x' }] }));
    fs.mkdirSync(path.join(base, '1.0.0', 'backups'), { recursive: true });
    fs.writeFileSync(path.join(base, '1.0.0', 'backups', 'b1.json'), '{}');
    fs.mkdirSync(path.join(base, '2.0.0'), { recursive: true });

    const r = executarMigracaoFS({ base, versaoAtual: '2.0.0', fs, path });

    expect(r.copiado).toBe(true);
    expect(r.origem).toBe('1.0.0');
    const dest = path.join(base, '2.0.0', 'meubolso.json');
    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, 'utf8')).toContain('"id":"x"');
    expect(fs.existsSync(path.join(base, '2.0.0', 'backups', 'b1.json'))).toBe(true);
    // A origem NÃO foi apagada (cópia, não move).
    expect(fs.existsSync(path.join(base, '1.0.0', 'meubolso.json'))).toBe(true);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('migracao copia da versao com dados e limpa obsoletas vazias', () => {
  const base = criarTmp();
  try {
    fs.mkdirSync(path.join(base, '2.0.0'), { recursive: true }); // atual, ainda vazia
    fs.mkdirSync(path.join(base, '1.0.0'), { recursive: true });
    fs.writeFileSync(path.join(base, '1.0.0', 'meubolso.json'), '{}');
    fs.mkdirSync(path.join(base, '1.8.0'), { recursive: true }); // obsoleta vazia
    fs.mkdirSync(path.join(base, '1.7.0'), { recursive: true }); // obsoleta vazia

    const r = executarMigracaoFS({ base, versaoAtual: '2.0.0', fs, path });

    // Atual vazia + versão anterior com dados => copia da 1.0.0 para 2.0.0.
    expect(r.copiado).toBe(true);
    expect(r.origem).toBe('1.0.0');
    expect(fs.existsSync(path.join(base, '2.0.0', 'meubolso.json'))).toBe(true);
    // Obrigatórias: obsoletas vazias removidas; origem (com dados) e atual mantidas.
    expect(fs.existsSync(path.join(base, '1.8.0'))).toBe(false);
    expect(fs.existsSync(path.join(base, '1.7.0'))).toBe(false);
    expect(fs.existsSync(path.join(base, '1.0.0'))).toBe(true);
    expect(fs.existsSync(path.join(base, '2.0.0'))).toBe(true);
    expect(r.removidos.sort()).toEqual(['1.7.0', '1.8.0']);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('migracao nao remove pasta que ainda tem meubolso.json (protecao)', () => {
  const base = criarTmp();
  try {
    fs.mkdirSync(path.join(base, '2.0.0'), { recursive: true });
    fs.mkdirSync(path.join(base, '1.0.0'), { recursive: true });
    fs.writeFileSync(path.join(base, '1.0.0', 'meubolso.json'), '{}');

    const r = executarMigracaoFS({ base, versaoAtual: '2.0.0', fs, path });

    expect(fs.existsSync(path.join(base, '1.0.0'))).toBe(true);
    expect(r.removidos).toEqual([]);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
