/* Integração dos gráficos (pizza/rosca E barras) com o Chart.js (vendored, offline).
 *
 * Por que Chart.js: o usuário pediu os efeitos nativos da biblioteca —
 * rotação inicial a partir do topo (como um relógio), fade/load suave,
 * hoverOffset (as fatias se "separam" no hover) e tooltips/hover consistentes.
 *
 * Fluxo:
 *  - graficoPizza()/graficoRosca()/graficoBarras*() (em app.js) devolvem um
 *    <canvas> e chamam ChartGraficos.registrar(id, cfg) guardando os dados.
 *  - montar() (via Vue.nextTick após cada render) destrói instâncias anteriores
 *    e cria new Chart() para cada <canvas> presente.
 *  - Instâncias num Map<id, Chart> para destroy() correto (o Vue troca o v-html,
 *    recriar sem destroy daria "Canvas is already in use").
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const Chart = window.Chart;
  if (!Chart) { window.ChartGraficos = { registrar() {}, montar() {}, destruirTodos() {} }; return; }

  const pendentes = {};
  const instancias = new Map();

  // Cores do tema lidas em tempo de montagem (respeita claro/escuro).
  function coresTema() {
    const cs = getComputedStyle(document.documentElement);
    return {
      text: (cs.getPropertyValue('--text').trim() || '#1a1a1a'),
      muted: (cs.getPropertyValue('--text-muted').trim() || '#6b6b6b'),
      primary: (cs.getPropertyValue('--primary').trim() || '#2d6a4f'),
      success: (cs.getPropertyValue('--success-claro').trim() || '#52b788'),
      border: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(0,0,0,0.35)' : '#ffffff'
    };
  }

  // Plugin: desenha o texto central (label pequeno + valor) nos doughnuts.
  const textoCentral = {
    id: 'textoCentral',
    afterDraw(chart, _args, opts) {
      const o = opts || {};
      if (!o.label && !o.valor) return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      const t = coresTema();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (o.label) { ctx.fillStyle = t.muted; ctx.font = '600 12px system-ui, sans-serif'; ctx.fillText(o.label, cx, cy - 10); }
      if (o.valor) { ctx.fillStyle = t.text; ctx.font = '700 15px system-ui, sans-serif'; ctx.fillText(o.valor, cx, cy + 8); }
      ctx.restore();
    }
  };

  function registrar(id, cfg) { pendentes[id] = cfg; }

  function destruirTodos() {
    for (const ch of instancias.values()) { try { ch.destroy(); } catch (_) {} }
    instancias.clear();
  }

  function montar() {
    destruirTodos();
    if (!pendentes || !Object.keys(pendentes).length) return;

    for (const id of Object.keys(pendentes)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const cfg = pendentes[id];
      const t = coresTema();
      let chart;
      try {
        if (cfg.tipo === 'bar') {
          // Gráfico de barras (status de parcelas / XP por motivo).
          const bg = cfg.degrade
            ? (context) => {
                const { chart: c } = context;
                const { ctx, chartArea } = c;
                if (!chartArea) return t.primary;
                const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                g.addColorStop(0, t.primary);
                g.addColorStop(1, t.success);
                return g;
              }
            : cfg.cores;
          chart = new Chart(el, {
            type: 'bar',
            data: { labels: cfg.labels, datasets: [{ data: cfg.valores, backgroundColor: bg, borderRadius: 4, borderSkipped: false }] },
            options: {
              responsive: true, maintainAspectRatio: false,
              animation: { duration: 900, easing: 'easeOutQuart' },
              scales: {
                x: { grid: { display: false }, ticks: { color: t.muted, font: { size: 10 } }, border: { display: false } },
                y: { display: false, grid: { display: false }, beginAtZero: true }
              },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + cfg.fmt(ctx.parsed.y) } }
              }
            }
          });
        } else {
          // Doughnut (pizza/rosca): inicia no TOPO (0°) e varre como relógio.
          // Chart.js usa radianos: -Math.PI/2 = topo (12h).
          chart = new Chart(el, {
            type: 'doughnut',
            data: {
              labels: cfg.labels,
              datasets: [{
                data: cfg.valores,
                backgroundColor: cfg.cores,
                borderColor: t.border,
                borderWidth: 2,
                hoverOffset: 12 // fatias se separam no hover (efeito pedido)
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              rotation: -Math.PI / 2,   // início no topo (0°), varrendo como relógio
              cutout: '62%',
              animation: { animateRotate: true, animateScale: true, duration: 1100, easing: 'easeOutQuart' },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + cfg.fmt(ctx.parsed) } },
                textoCentral: { label: cfg.centroLabel, valor: cfg.centroValor }
              }
            },
            plugins: [textoCentral]
          });
        }
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) console.warn('Chart não pôde ser criado:', err && err.message);
        continue;
      }
      instancias.set(id, chart);
    }
    for (const k of Object.keys(pendentes)) delete pendentes[k];
  }

  window.ChartGraficos = { registrar, montar, destruirTodos };
})();
