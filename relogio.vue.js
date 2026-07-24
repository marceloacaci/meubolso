/* Relógio de Brasília — componente Vue (isolado) + fallback vanilla.
 *
 * Estratégia à prova de falhas (o ambiente Electron do usuário trava
 * com o Vue montando no load):
 *  - NÃO monta no load: registra um listener de DOMContentLoaded e só
 *    então tenta o Vue (garante que DOM + Vue já estão prontos).
 *  - Todo o código de atualização vive DENTRO de try/catch.
 *  - Se o Vue faltar OU o mount falhar, o fallback vanilla assume e
 *    o relógio NUNCA fica parado/vazio.
 *  - O fallback usa setInterval próprio, independente do Vue.
 *
 * Sem Intl.DateTimeFormat(timeZone): o V8 do Electron pode vir com ICU
 * reduzido (sem dados de fuso) e lançar erro. Calculamos Brasília
 * (UTC-3 fixo, Brasil sem horário de verão desde 2019) manualmente.
 */
(function () {
  const OFFSET_BRA = -3 * 3600 * 1000; // UTC-3 em ms

  const DIA_SEMANA = {
    pt: ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'],
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    es: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  };
  const MES = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const FUSO = { pt: 'Brasília', en: 'Brasilia', es: 'Brasil' };

  function lerIdioma() {
    try {
      const v = (window.localStorage && window.localStorage.getItem('appIdioma')) || 'pt';
      return (v === 'en' || v === 'es') ? v : 'pt';
    } catch (e) { return 'pt'; }
  }

  // Date.now() é sempre epoch UTC; Brasília = UTC - 3h.
  function partesBrasilia(ts) {
    const d = new Date((ts == null ? Date.now() : ts) + OFFSET_BRA);
    return {
      diaSemana: d.getUTCDay(),
      dia: String(d.getUTCDate()).padStart(2, '0'),
      mes: MES[(d.getUTCMonth() || 0)],
      ano: d.getUTCFullYear(),
      hora: String(d.getUTCHours()).padStart(2, '0'),
      min: String(d.getUTCMinutes()).padStart(2, '0'),
      seg: String(d.getUTCSeconds()).padStart(2, '0')
    };
  }

  function textoRelogio() {
    const lang = lerIdioma();
    const p = partesBrasilia();
    const dia = (DIA_SEMANA[lang] || DIA_SEMANA.pt)[p.diaSemana] || '';
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return '🕐 ' + diaCap + ', ' + p.dia + '/' + p.mes + '/' + p.ano + ', ' +
           p.hora + ':' + p.min + ':' + p.seg + ' (' + (FUSO[lang] || FUSO.pt) + ')';
  }

  const el = document.getElementById('relogio-brasilia');
  if (!el) return;

  // Fallback vanilla (sempre disponível, independente do Vue).
  let fallbackTimer = null;
  function pararFallback() { if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; } }
  function renderFallback() {
    try {
      if (typeof Vue !== 'undefined' && document.querySelector('#relogio-brasilia span')) return;
      el.innerHTML = '';
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = textoRelogio();
      span.title = span.textContent;
      el.appendChild(span);
    } catch (e) { /* nunca quebra o app */ }
  }

  function iniciarFallback() {
    pararFallback();
    renderFallback();
    if (typeof setInterval === 'function') {
      fallbackTimer = setInterval(renderFallback, 1000);
    }
  }

  function iniciar() {
    // 1) Tenta Vue (se disponível).
    if (typeof Vue !== 'undefined') {
      try {
        const RelogioBrasilia = {
          data() { return { agora: Date.now() }; },
          computed: {
            texto() {
              const lang = lerIdioma();
              const p = partesBrasilia(this.agora);
              const dia = (DIA_SEMANA[lang] || DIA_SEMANA.pt)[p.diaSemana] || '';
              const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
              return '🕐 ' + diaCap + ', ' + p.dia + '/' + p.mes + '/' + p.ano + ', ' +
                     p.hora + ':' + p.min + ':' + p.seg + ' (' + (FUSO[lang] || FUSO.pt) + ')';
            }
          },
          mounted() {
            const self = this;
            const sinc = () => { try { self.agora = Date.now(); } catch (e) {} };
            if (typeof window.addEventListener === 'function') {
              window.addEventListener('storage', (e) => { if (e.key === 'appIdioma') sinc(); });
              window.addEventListener('idiomaAlterado', sinc);
            }
            this._timer = setInterval(sinc, 1000);
          },
          beforeUnmount() { if (this._timer) clearInterval(this._timer); },
          template: '<span :title="texto" aria-hidden="true">{{ texto }}</span>'
        };
        Vue.createApp(RelogioBrasilia).mount('#relogio-brasilia');
        return; // Vue assumiu
      } catch (e) {
        console.warn('[relogio.vue] Vue falhou — fallback vanilla.', e);
      }
    }
    // 2) Fallback vanilla.
    iniciarFallback();
  }

  // Garante que roda APÓS o DOM estar pronto (igual ao app.js),
  // evitando montar antes do Vue carregar no Electron.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  // Permite ao app.js forçar re-render (ex.: troca de idioma).
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('idiomaAlterado', () => {
      if (typeof Vue === 'undefined' || !document.querySelector('#relogio-brasilia span')) {
        renderFallback();
      }
    });
  }
})();
