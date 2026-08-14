import { test, expect } from 'vitest';
import cripto from '../src/cripto.js';

test('criptografar round-trip restaura o texto original', () => {
  const texto = JSON.stringify({ dividas: [{ descricao: 'Netflix <b>x</b>', valor: 100 }] });
  const enc = cripto.criptografar('senha123', texto);
  expect(enc.startsWith('MBENC1:')).toBe(true);
  const dec = cripto.descriptografar('senha123', enc);
  expect(dec).toBe(texto);
});

test('senha errada falha (GCM detecta adulteracao)', () => {
  const enc = cripto.criptografar('senha-certa', 'dados secretos');
  expect(() => cripto.descriptografar('senha-errada', enc)).toThrow();
});

test('eArquivoCriptografado reconhece o prefixo', () => {
  const enc = cripto.criptografar('s', 'x');
  expect(cripto.eArquivoCriptografado(enc)).toBe(true);
  expect(cripto.eArquivoCriptografado('{"dividas":[]}')).toBe(false);
});

test('cada criptografia produz ciphertext diferente (salt/iv aleatorios)', () => {
  const a = cripto.criptografar('s', 'mesmo texto');
  const b = cripto.criptografar('s', 'mesmo texto');
  expect(a).not.toBe(b);
  expect(cripto.descriptografar('s', a)).toBe(cripto.descriptografar('s', b));
});

test('descriptografar formato invalido lanca erro', () => {
  expect(() => cripto.descriptografar('s', 'nao-e-cripto')).toThrow();
});
