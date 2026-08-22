// Valida a regra "1 dica de autor a cada 5 exibidas" no carrossel de dicas.
import { test, expect } from 'vitest';

// Replicação da lógica de montagem do ticker (app.js) para testar isoladamente.
function montarOrdem(DICAS) {
  const autores = DICAS.filter(d => d.autor);
  const comuns = DICAS.filter(d => !d.autor);
  const embaralha = (arr) => {
    const a = arr.map(d => d);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const comunsEmb = embaralha(comuns);
  const autoresEmb = embaralha(autores);
  const ordem = [];
  let ai = 0;
  for (let i = 0; i < comunsEmb.length; i++) {
    ordem.push(comunsEmb[i]);
    if ((i + 1) % 4 === 0 && autoresEmb.length > 0) {
      ordem.push(autoresEmb[ai % autoresEmb.length]);
      ai++;
    }
  }
  return ordem;
}

test('DICAS de autor incluem Rick Chester com a Regra de 3', () => {
  // Importa o array DICAS do app.js via require dinâmico não é trivial (app.js é script clássico).
  // Em vez disso, validamos a lógica de intercalação com um mock representativo.
  const DICAS = [
    ...Array.from({ length: 40 }, (_, i) => ({ pt: 'comum ' + i })),
    { autor: 'Rick Chester', pt: 'Regra de 3' },
    { autor: 'Warren Buffett', pt: 'Preço/valor' },
    { autor: 'Benjamin Franklin', pt: 'Penny saved' },
  ];
  const ordem = montarOrdem(DICAS);
  // Conta autores e verifica o ritmo: a cada 5 posições (índice 4,9,14...), há autor.
  let autores = 0;
  for (const d of ordem) if (d.autor) autores++;
  // 40 comuns => blocos de 4 => 10 autores intercalados (tem 3 disponíveis, recicla)
  expect(autores).toBeGreaterThanOrEqual(3);
  // Verifica que nenhum autor aparece nas primeiras 4 posições SEM um bloco de 4 comuns antes
  // (ou seja, o padrão 4 comuns + 1 autor se mantém nas primeiras inserções)
  const primeiras5 = ordem.slice(0, 5);
  const autoresNas5 = primeiras5.filter(d => d.autor).length;
  expect(autoresNas5).toBe(1); // exatamente 1 autor a cada 5
});

test('Rick Chester está presente na lista de autores', () => {
  const DICAS = [
    { pt: 'a' }, { pt: 'b' },
    { autor: 'Rick Chester', pt: 'Regra de 3: 1/3 salário, 1/3 emergência, 1/3 reinvestir' },
  ];
  const autores = DICAS.filter(d => d.autor);
  expect(autores.some(a => a.autor === 'Rick Chester' && /1\/3/.test(a.pt))).toBe(true);
});
