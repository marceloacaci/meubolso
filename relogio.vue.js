/* Relógio de Brasília — componente Vue (isolado) + fallback vanilla.
 *
 * O Vue monta em #relogio-brasilia (elemento FORA do <main>, não tocado
 * pelo app.js). Se o Vue NÃO carregar (ex.: vendor ausente no build, CSP
 * bloqueando o script), há um FALLBACK vanilla que preenche o texto para o
 * relógio NUNCA ficar invisível/vazio.
 */
(function () {
  // ----- formatação (compartilhada entre Vue e fallback) -----
  const fmtDia = {
    pt: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
    en: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
    es: new Intl.DateTimeFormat('es-ES', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  };
  const fmtHora = {
    pt: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    en: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
    es: new Intl.DateTimeFormat('es-ES', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  const FUSO = { pt: 'Brasília', en: 'Brasilia', es: 'Brasil' };

  function lerIdioma() {
    try {
      const v = (window.localStorage && window.localStorage.getItem('appIdioma')) || 'pt';
      return (v === 'en' || v === 'es') ? v : 'pt';
    } catch (e) { return 'pt'; }
  }

  function textoRelogio() {
    const lang = lerIdioma();
    const dia = fmtDia[lang].format(new Date());
    const hora = fmtHora[lang].format(new Date());
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return '🕐 ' + diaCap + ', ' + hora + ' (' + (FUSO[lang] || FUSO.pt) + ')';
  }

  const el = document.getElementById('relogio-brasilia');
  if (!el) return; // elemento-alvo ausente: nada a fazer

  // ----- tenta Vue -----
  if (typeof Vue !== 'undefined') {
    const RelogioBrasilia = {
      data() { return { agora: new Date(), idioma: lerIdioma() }; },
      computed: {
        texto() {
          const lang = (this.idioma === 'en' || this.idioma === 'es') ? this.idioma : 'pt';
          const dia = fmtDia[lang].format(this.agora);
          const hora = fmtHora[lang].format(this.agora);
          const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
          return '🕐 ' + diaCap + ', ' + hora + ' (' + (FUSO[lang] || FUSO.pt) + ')';
        }
      },
      mounted() {
        const self = this;
        const sinc = () => { try { const v = lerIdioma(); if (v !== self.idioma) self.idioma = v; } catch (e) {} };
        sinc();
        // Ouve mudanças de idioma em outra aba/escopo.
        if (typeof window.addEventListener === 'function') {
          window.addEventListener('storage', (e) => { if (e.key === 'appIdioma') sinc(); });
        }
        // Ouve evento customizado disparado pelo app.js ao trocar idioma.
        if (typeof window.addEventListener === 'function') {
          window.addEventListener('idiomaAlterado', sinc);
        }
        this._timer = setInterval(() => { self.agora = new Date(); }, 1000);
      },
      beforeUnmount() { if (this._timer) clearInterval(this._timer); },
      template: '<span :title="texto" aria-hidden="true">{{ texto }}</span>'
    };
    try {
      Vue.createApp(RelogioBrasilia).mount('#relogio-brasilia');
      return; // sucesso: Vue dono do elemento
    } catch (e) {
      console.warn('[relogio.vue] falha ao montar Vue — usando fallback vanilla.', e);
    }
  } else {
    console.warn('[relogio.vue] Vue não carregou — usando fallback vanilla.');
  }

  // ----- fallback vanilla (garante exibição mesmo sem Vue) -----
  function renderFallback() {
    if (typeof Vue !== 'undefined' && document.querySelector('#relogio-brasilia span')) return; // Vue já assumiu
    el.innerHTML = '';
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = textoRelogio();
    span.title = span.textContent;
    el.appendChild(span);
  }
  renderFallback();
  // atualiza a cada segundo
  if (typeof setInterval === 'function') {
    setInterval(renderFallback, 1000);
  }
  // reage a troca de idioma pelo app.js (dispara 'idiomaAlterado')
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('idiomaAlterado', renderFallback);
  }
})();
