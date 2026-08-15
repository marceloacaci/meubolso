// Teste unitário da separação de ambientes de dados (dev / portatil / instalado).
import { test, expect } from 'vitest';
const { resolverCaminhoDados } = require('../src/caminhos-dados.js');

test('dev: usa userData direto (sem subpasta)', () => {
  const r = resolverCaminhoDados({
    isPackaged: false, portableDir: undefined,
    userData: 'C:\\Users\\M\\AppData\\Roaming\\meubolso', versao: '2.0.0-rc'
  });
  expect(r.ambiente).toBe('dev');
  expect(r.base).toBe('C:\\Users\\M\\AppData\\Roaming\\meubolso');
});

test('portatil: usa a pasta do proprio executavel', () => {
  const r = resolverCaminhoDados({
    isPackaged: true, portableDir: 'D:\\Downloads\\MeuBolsoPortable',
    userData: 'C:\\Users\\M\\AppData\\Roaming\\meubolso', versao: '2.0.0-rc'
  });
  expect(r.ambiente).toBe('portatil');
  expect(r.base).toBe('D:\\Downloads\\MeuBolsoPortable');
});

test('instalado: isola por versao do release', () => {
  const r = resolverCaminhoDados({
    isPackaged: true, portableDir: undefined,
    userData: 'C:\\Users\\M\\AppData\\Roaming\\meubolso', versao: '2.0.0-rc'
  });
  expect(r.ambiente).toBe('instalado');
  expect(r.base).toBe('C:\\Users\\M\\AppData\\Roaming\\meubolso\\2.0.0-rc');
});

test('instalado sem versao cai no fallback 0.0.0', () => {
  const r = resolverCaminhoDados({
    isPackaged: true, portableDir: undefined,
    userData: 'X', versao: undefined
  });
  expect(r.ambiente).toBe('instalado');
  expect(r.base).toBe('X\\0.0.0');
});
