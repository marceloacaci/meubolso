// Auditoria S6-2: encontra interpolacoes de campos do usuario (d.descricao,
// p.credor, etc.) que NAO estao envoltas por escapeHtml(). Heuristica: procura
// por padroes "x.CAMPO" dentro de ${...} e verifica se a expressao contem
// escapeHtml( perto. NAO perfeito, mas sinaliza pontos a revisar.
const fs = require('fs');
const path = require('path');
const campos = ['descricao','credor','observacao','nome','instituicao','titulo','anexo','categoria','valor','data','autor','texto'];
const alvos = [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'src', 'ui'),
  path.join(__dirname, 'app.js'),
  path.join(__dirname, 'modais.js'),
];
const lidos = [];
for (const base of alvos) {
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const f of fs.readdirSync(base)) if (f.endsWith('.js')) lidos.push(path.join(base, f));
  } else if (fs.existsSync(base)) lidos.push(base);
}
let problemas = 0;
for (const p of lidos) {
  const src = fs.readFileSync(p, 'utf8');
  // divide em interpolacoes ${ ... }
  const re = /\$\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const expr = m[1];
    // pula se ja escapado
    if (/escapeHtml\s*\(/.test(expr)) continue;
    // pula se for apenas texto/traducao/calculo sem campo do usuario
    if (/\bt\(/.test(expr)) continue;
    if (/^[\s]*[A-Za-z_]\w*\(/.test(expr)) continue; // chamada de funcao
    for (const c of campos) {
      // procura ".<campo>" ou "['campo']" onde o objeto e d/p/m/etc
      const campoRe = new RegExp('[.]\\[?[\'"]?' + c + '[\'"]?\\]?');
      if (campoRe.test(expr)) {
        // ignora se for comparacao booleana simples de status etc (baixo risco),
        // mas reporta campo textual do usuario
        console.log(`${p.split(path.sep).slice(-2).join('/')}: ${m[0].slice(0,90)}`);
        problemas++;
        break;
      }
    }
  }
}
console.log('\nTotal de interpolacoes de campo do usuario NAO escapadas:', problemas);
