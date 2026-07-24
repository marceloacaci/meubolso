/* Relógio de Brasília — JavaScript puro (sem framework).
 *
 * Por que NÃO usar Vue aqui: sob contextIsolation:true no Electron,
 * a reatividade do Vue 3 (global build) perde o gatilho de
 * recomputo em ALGUNS ambientes — o setInterval empurra o data,
 * mas o computed não reflete e o relógio "congela" (fica na hora
 * inicial). JS puro escrevendo textContent direto no DOM funciona
 * em QUALQUER contexto, sem dependência de reatividade.
 *
 * Cálculo de Brasília (UTC-3 fixo, Brasil sem horário de verão
 * desde 2019): Date.now() é sempre epoch UTC; Brasília = UTC - 3h.
 * Sem Intl.DateTimeFormat(timeZone) — o V8 do Electron pode vir
 * com ICU reduzido e lançar erro silencioso.
 */
(function () {
  const OFFSET_BRA = -3 * 3600 * 1000; // UTC-3 em ms

  const DIA_SEMANA = {
    pt: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  };
  const MESES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const FUSO = { pt: 'Brasília', en: 'Brasilia', es: 'Brasil' };

  function lerIdioma() {
    try {
      const v = (window.localStorage && window.localStorage.getItem('appIdioma')) || 'pt';
      return (v === 'en' || v === 'es') ? v : 'pt';
    } catch (e) { return 'pt'; }
  }

  function texto() {
    const d = new Date(Date.now() + OFFSET_BRA);
    const lang = lerIdioma();
    const dia = (DIA_SEMANA[lang] || DIA_SEMANA.pt)[d.getUTCDay()] || '';
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    const data = diaCap + ', ' + String(d.getUTCDate()).padStart(2, '0') + '/' +
      MESES[d.getUTCMonth()] + '/' + d.getUTCFullYear();
    const hora = String(d.getUTCHours()).padStart(2, '0') + ':' +
      String(d.getUTCMinutes()).padStart(2, '0') + ':' +
      String(d.getUTCSeconds()).padStart(2, '0');
    return '🕐 ' + data + ', ' + hora + ' (' + (FUSO[lang] || FUSO.pt) + ')';
  }

  const el = document.getElementById('relogio-brasilia');
  if (!el) return;

  // Escreve DIRETO no DOM a cada segundo (sem reatividade de framework).
  function render() {
    try {
      el.textContent = texto();
      el.title = el.textContent;
    } catch (e) { /* nunca quebra o app */ }
  }

  render();
  if (typeof setInterval === 'function') {
    setInterval(render, 1000);
  }

  // Reage à troca de idioma feita em outro escopo (app.js).
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => { if (e.key === 'appIdioma') render(); });
    window.addEventListener('idiomaAlterado', render);
  }
})();
