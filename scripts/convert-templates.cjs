// S6-1 (Opção B): converte o template constante de cada view em render function
// Vue 3 (usa Vue.h global, pois o render do Vue 3 NAO recebe h por argumento).
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'views');
const OLD = "    template: '<div class=\"view\" v-html=\"html\"></div>'";
const OLD2 = "    render(h) { return h('div', { class: 'view', domProps: { innerHTML: this.html } }); }";
const OLD3 = "    render(h) { return h('div', { class: 'view', innerHTML: this.html }); }";
const NEW = "    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }";
let count = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const p = path.join(dir, f);
  let src = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const o of [OLD, OLD2, OLD3]) { if (src.includes(o)) { src = src.replace(o, NEW); changed = true; } }
  if (changed) { fs.writeFileSync(p, src); count++; console.log('convertido:', f); }
}
console.log('Total convertido:', count);
