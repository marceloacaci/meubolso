// Teste unitário da separação de ambientes de dados (dev / portatil / instalado).
import { test, expect } from 'vitest';
const { resolverCaminhoDados } = require('../src/caminhos-dados.js');

test('dev: usa userData direto (sem subpasta)', () => {
  const r = resolverCaminhoDados({
    isPackaged: false,
    portableDir: undefined,
    userData: 'C:\\Users\\M\\AppData\\Roaming\\meubolso',
    versao: '2.0.0-rc',
  });
  expect(r.ambiente).toBe('dev');
  expect(r.base).toBe('C:\\Users\\M\\AppData\\Roaming\\meubolso');
});

test('portatil: usa a pasta do proprio executavel', () => {
  const r = resolverCaminhoDados({
    isPackaged: true,
    portableDir: 'D:\\Downloads\\MeuBolsoPortable',
    userData: 'C:\\Users\\M\\AppData\\Roaming\\meubolso',
    versao: '2.0.0-rc',
  });
  expect(r.ambiente).toBe('portatil');
  expect(r.base).toBe('D:\\Downloads\\MeuBolsoPortable');
});

test('instalado: isola por versao do release', () => {
  const r = resolverCaminhoDados({
    isPackaged: true,
    portableDir: undefined,
    userData: 'C:\\Users\\M\\AppData\\Roaming\\meubolso',
    versao: '2.0.0-rc',
  });
  expect(r.ambiente).toBe('instalado');
  expect(r.base).toBe('C:\\Users\\M\\AppData\\Roaming\\meubolso\\2.0.0-rc');
});

test('instalado sem versao cai no fallback 0.0.0', () => {
  const r = resolverCaminhoDados({
    isPackaged: true,
    portableDir: undefined,
    userData: 'X',
    versao: undefined,
  });
  expect(r.ambiente).toBe('instalado');
  expect(r.base).toBe('X\\0.0.0');
});

const { planejarMigracao } = require('../src/caminhos-dados.js');

test('migracao: versao atual ja tem dados -> nao copia, limpa as outras', () => {
  const r = planejarMigracao({
    versaoAtual: '2.0.0',
    versoes: [
      { nome: '2.0.0', temDados: true },
      { nome: '1.9.0', temDados: true },
      { nome: '1.8.0', temDados: false },
    ],
  });
  expect(r.copiado).toBe(false);
  expect(r.origem).toBe(null);
  expect(r.limpar).toEqual(['1.9.0', '1.8.0']);
});

test('migracao: versao atual vazia, existe anterior com dados -> copia da mais recente', () => {
  const r = planejarMigracao({
    versaoAtual: '2.0.0',
    versoes: [
      { nome: '2.0.0', temDados: false },
      { nome: '1.9.0', temDados: true },
      { nome: '1.8.0', temDados: true },
      { nome: '1.7.0', temDados: false },
    ],
  });
  expect(r.copiado).toBe(true);
  expect(r.origem).toBe('1.9.0');
  // Nunca remove a atual nem a origem da cópia.
  expect(r.limpar).toEqual(['1.8.0', '1.7.0']);
});

test('migracao: sem nenhuma versao com dados -> nao copia, limpa tudo menos a atual', () => {
  const r = planejarMigracao({
    versaoAtual: '2.0.0',
    versoes: [
      { nome: '2.0.0', temDados: false },
      { nome: '1.9.0', temDados: false },
    ],
  });
  expect(r.copiado).toBe(false);
  expect(r.origem).toBe(null);
  expect(r.limpar).toEqual(['1.9.0']);
});

// compararVersoes vive em main.js (processo principal); testamos a lógica
// replicada via require indireto não é possível sem Electron. Cobrimos a
// função pura de migração acima, que é o núcleo da segurança dos dados.
