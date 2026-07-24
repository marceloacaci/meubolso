/* Relógio de Brasília — componente Vue (isolado) + fallback vanilla.
 *
 * SEM Intl.DateTimeFormat(timeZone): o V8 do Electron pode vir com ICU
 * reduzido (sem dados de fuso), o que lançava erro silencioso no
 * mounted() e impedia o setInterval de registrar -> relógio PARADO.
 * Agora calculamos o horário de Brasília (UTC-3 fixo, o Brasil não usa
 * mais horário de verão desde 2019) manualmente, sem Intl.
 *
 * O Vue monta em #relogio-brasilia (elemento FORA do <main>, não tocado
 * pelo app.js). Se o Vue NÃO carregar, há fallback vanilla.
 */
(function () {
  // Deslocamento de Brasília em ms (UTC-3). Fixo e correto pós-2019.
  const OFFSET_BRA = -3 * 3600 * 1000;

  // Nomes por idioma (arrays evitam Intl com timeZone).
  const DIA_SEMANA = {
    pt: ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'],
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    es: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  };
  const MES = {
    pt: ['01','02','03','04','05','06','07','08','09','10','11','12'],
    en: ['01','02','03','04','05','06','07','08','09','10','11','12'],
    es: ['01','02','03','04','05','06','07','08','09','10','11','12']
  };
  const FUSO = { pt: 'Brasília', en: 'Brasilia', es: 'Brasil' };

  function lerIdioma() {
    try {
      const v = (window.localStorage && window.localStorage.getItem('appIdioma')) || 'pt';
      return (v === 'en' || v === 'es') ? v : 'pt';
    } catch (e) { return 'pt'; }
  }

  // Retorna { diaSemana, dia, mes, ano, hora, min, seg } em Brasília (UTC-3).
  // Date.now() é sempre UTC (epoch); Brasília = UTC - 3h.
  function partesBrasilia(ts) {
    const utc = (ts == null ? Date.now() : ts);
    const agora = new Date(utc + OFFSET_BRA);
    return {
      diaSemana: agora.getUTCDay(),
      dia: String(agora.getUTCDate()).padStart(2, '0'),
      mes: String(agora.getUTCMonth() + 1).padStart(2, '0'),
      ano: agora.getUTCFullYear(),
      hora: String(agora.getUTCHours()).padStart(2, '0'),
      min: String(agora.getUTCMinutes()).padStart(2, '0'),
      seg: String(agora.getUTCSeconds()).padStart(2, '0')
    };
  }

  function textoRelogio() {
    const lang = lerIdioma();
    const p = partesBrasilia();
    const dia = (DIA_SEMANA[lang] || DIA_SEMANA.pt)[p.diaSemana];
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    const data = diaCap + ', ' + p.dia + '/' + p.mes + '/' + p.ano;
    const hora = p.hora + ':' + p.min + ':' + p.seg;
    return '🕐 ' + data + ', ' + hora + ' (' + (FUSO[lang] || FUSO.pt) + ')';
  }

  const el = document.getElementById('relogio-brasilia');
  if (!el) return;

  // ----- tenta Vue -----
  if (typeof Vue !== 'undefined') {
    const RelogioBrasilia = {
      data() { return { agora: Date.now() }; },
      computed: {
        texto() {
          const lang = (window.localStorage && window.localStorage.getItem('appIdioma')) || 'pt';
          const l = (lang === 'en' || lang === 'es') ? lang : 'pt';
          const p = partesBrasilia(this.agora);
          const dia = (DIA_SEMANA[l] || DIA_SEMANA.pt)[p.diaSemana];
          const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
          return '🕐 ' + diaCap + ', ' + p.dia + '/' + p.mes + '/' + p.ano + ', ' + p.hora + ':' + p.min + ':' + p.seg + ' (' + (FUSO[l] || FUSO.pt) + ')';
        }
      },
      mounted() {
        const self = this;
        const sinc = () => { try { const v = lerIdioma(); if (v !== self._lang) self._lang = v; } catch (e) {} };
        if (typeof window.addEventListener === 'function') {
          window.addEventListener('storage', (e) => { if (e.key === 'appIdioma') self.agora = Date.now(); });
          window.addEventListener('idiomaAlterado', () => { self.agora = Date.now(); });
        }
        // Garante que o interval registra mesmo se algo falhar depois.
        this._timer = setInterval(() => { self.agora = Date.now(); }, 1000);
      },
      beforeUnmount() { if (this._timer) clearInterval(this._timer); },
      template: '<span :title="texto" aria-hidden="true">{{ texto }}</span>'
    };
    try {
      Vue.createApp(RelogioBrasilia).mount('#relogio-brasilia');
      return;
    } catch (e) {
      console.warn('[relogio.vue] falha ao montar Vue — fallback vanilla.', e);
    }
  } else {
    console.warn('[relogio.vue] Vue não carregou — fallback vanilla.');
  }

  // ----- fallback vanilla -----
  function renderFallback() {
    if (typeof Vue !== 'undefined' && document.querySelector('#relogio-brasilia span')) return;
    el.innerHTML = '';
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = textoRelogio();
    span.title = span.textContent;
    el.appendChild(span);
  }
  renderFallback();
  if (typeof setInterval === 'function') setInterval(renderFallback, 1000);
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('idiomaAlterado', renderFallback);
    window.addEventListener('storage', (e) => { if (e.key === 'appIdioma') renderFallback(); });
  }
})();
