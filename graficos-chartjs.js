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
      // Fonte escala com a largura da janela (nitidez ao maximizar).
      const s = (o.escala && o.escala > 1) ? o.escala : 1;
      // Tamanho base reduzido; encolhe conforme o nº de casas do valor para
      // não estourar o círculo interior e aproveitar melhor a área.
      const baseValor = 15, baseLabel = 12;
      const casas = (o.valor || '').replace(/[^\d]/g, '').length; // dígitos do valor
      const reducao = casas >= 8 ? 0.6 : casas >= 6 ? 0.72 : casas >= 4 ? 0.82 : 1;
      const fv = Math.max(8, Math.round(baseValor * s * reducao));
      const fl = Math.max(7, Math.round(baseLabel * s * (casas >= 6 ? 0.85 : 1)));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (o.label) { ctx.fillStyle = t.muted; ctx.font = '600 ' + fl + 'px system-ui, sans-serif'; ctx.fillText(o.label, cx, cy - 10 * s); }
      if (o.valor) { ctx.fillStyle = t.text; ctx.font = '700 ' + fv + 'px system-ui, sans-serif'; ctx.fillText(o.valor, cx, cy + 8 * s); }
      ctx.restore();
    }
  };

  // Plugin: hover por ÁREA TOTAL da fatia/barra (imune ao zoom CSS do #app).
  // O Chart.js nativo às vezes falha ao detectar o hover quando o canvas está
  // ampliado por `zoom` (maximizado): o hit-test usa coordenadas do canvas que
  // não batem com o ponteiro. Este plugin recalcula a fatia ativa a partir das
  // coordenadas lógicas do evento (event.x/event.y já normalizadas pelo Chart)
  // e dos ângulos/raios reais de cada elemento — ativando a fatia em QUALQUER
  // ponto da sua área, não só no centro exato.
  const hoverPorArea = {
    id: 'hoverPorArea',
    afterEvent(chart, args) {
      const ev = args && args.event;
      if (!ev) return;
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;
      const type = chart.config.type;
      if (ev.type === 'mouseout') {
        chart._hoverIdx = -1;
        chart.setActiveElements([]);
        if (chart.tooltip) chart.tooltip.setActiveElements([]);
        return;
      }
      if (ev.type !== 'mousemove') return;
      const ca = chart.chartArea;
      if (!ca) return;
      // Coordenadas CORRETAS considerando zoom CSS do #app (janela maximizada).
      // O Chart.js entrega ev.x/ev.y normalizadas, mas quando o canvas está sob
      // `transform: scale()` (--app-width-scale > 1), essas coordenadas deixam
      // de bater com o chartArea e o hover "quebra" ao maximizar. Recalculamos
      // a partir do MouseEvent nativo e do rect visual do canvas, escalando pela
      // razão entre o tamanho interno do canvas e o tamanho exibido.
      const rect = chart.canvas && chart.canvas.getBoundingClientRect ? chart.canvas.getBoundingClientRect() : null;
      if (rect && rect.width && rect.height && ev.native) {
        const scaleX = chart.width / rect.width;
        const scaleY = chart.height / rect.height;
        ev.x = (ev.native.clientX - rect.left) * scaleX;
        ev.y = (ev.native.clientY - rect.top) * scaleY;
      }
      const cx = (ca.left + ca.right) / 2;
      const cy = (ca.top + ca.bottom) / 2;

      if (type === 'doughnut' || type === 'pie') {
        const rx = (ca.right - ca.left) / 2;
        const ry = (ca.bottom - ca.top) / 2;
        if (!rx || !ry) return;
        const dx = ev.x - cx, dy = ev.y - cy;
        // Normaliza para um círculo unitário (o doughnut pode ser elíptico).
        const nx = dx / rx, ny = dy / ry;
        const r = Math.hypot(nx, ny);
        const cutRaw = chart.options.cutout;
        const cut = (typeof cutRaw === 'string' ? parseFloat(cutRaw) : (cutRaw || 0)) / 100;
        if (r < cut || r > 1.0) { // fora do anel
          if (chart._hoverIdx !== -1) { chart._hoverIdx = -1; chart.setActiveElements([]); if (chart.tooltip) chart.tooltip.setActiveElements([]); }
          return;
        }
        let pa = Math.atan2(dy, dx);
        pa = (pa % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        let idx = -1;
        for (let i = 0; i < meta.data.length; i++) {
          const el = meta.data[i];
          let s = el.startAngle, e = el.endAngle;
          s = (s % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          e = (e % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          const inArc = s <= e ? (pa >= s && pa <= e) : (pa >= s || pa <= e);
          if (inArc) { idx = i; break; }
        }
        if (idx < 0 || idx === chart._hoverIdx) return;
        chart._hoverIdx = idx;
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
        if (chart.tooltip) chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: ev.x, y: ev.y });
        chart.update('none');
      } else if (type === 'bar') {
        // Barras: ativa a barra cuja coluna (x) o ponteiro está em cima — cobre
        // toda a altura do plot, não só a barra em si.
        // IMPORTANTE (item 6): só considera a ÁREA COLORIDA do gráfico. Os
        // rótulos do eixo x ficam ABAIXO do chartArea; se o mouse estiver sobre
        // o texto do label, NÃO devemos ativar a barra (antes contava o label
        // como parte da abrangência). Por isso checamos o Y dentro do chartArea.
        if (ev.y < ca.top || ev.y > ca.bottom) {
          if (chart._hoverIdx !== -1) { chart._hoverIdx = -1; chart.setActiveElements([]); if (chart.tooltip) chart.tooltip.setActiveElements([]); }
          return;
        }
        const x = ev.x;
        let idx = -1;
        for (let i = 0; i < meta.data.length; i++) {
          const el = meta.data[i];
          const xc = (el.x !== undefined) ? el.x : (el.getCenterPoint ? el.getCenterPoint().x : null);
          const half = (el.width !== undefined ? el.width : (el.getProps ? el.getProps(['width']).width : 0)) / 2;
          if (xc != null && half && Math.abs(x - xc) <= half) { idx = i; break; }
        }
        if (idx < 0 || idx === chart._hoverIdx) return;
        chart._hoverIdx = idx;
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
        if (chart.tooltip) chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: ev.x, y: ev.y });
        chart.update('none');
      }
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
    // Escala de largura (viewport): ao maximizar, turbina o devicePixelRatio
    // para nitidez dos gráficos e amplia as fontes internas/legendas.
    const escala = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-width-scale')) || 1;
    const dpr = Math.max(1, (window.devicePixelRatio || 1) * (escala > 1 ? escala : 1));

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
              devicePixelRatio: dpr,
              // Hit-test: só ativa se o ponteiro ESTÁ na barra (intersect), não
              // em ponto próximo (corrige item 6: rótulos do eixo x NÃO contam
              // como área da fatia). O plugin hoverPorArea cuida da ativação por
              // coluna (qualquer altura da barra) e limpa quando o mouse sai da
              // área colorida.
              interaction: { mode: 'nearest', intersect: true },
              animation: { duration: 900, easing: 'easeOutQuart' },
              scales: {
                x: { grid: { display: false }, ticks: { color: t.muted, font: { size: Math.round(10 * escala) } }, border: { display: false } },
                y: { display: false, grid: { display: false }, beginAtZero: true }
              },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + cfg.fmt(ctx.parsed.y) } },
                hoverPorArea: {}
              },
              onHover: (e, els) => {
                try { e.native.target.style.cursor = (els && els.length) ? 'pointer' : 'default'; } catch (_) {}
              }
            },
            plugins: [hoverPorArea]
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
              devicePixelRatio: dpr,
              layout: { padding: 16 }, // folga p/ o hoverOffset (fatias se separam) não estourar o canvas
              // Hit-test: só ativa se o ponteiro ESTÁ na fatia (intersect), não
              // em ponto próximo (corrige item 6: cantos do canvas / fora do
              // anel NÃO contam como área da fatia). O plugin hoverPorArea cuida
              // da ativação por ângulo+raio em QUALQUER ponto da fatia.
              interaction: { mode: 'nearest', intersect: true },
              rotation: -Math.PI / 2,   // início no topo (0°), varrendo como relógio
              cutout: '62%',
              animation: { animateRotate: true, animateScale: true, duration: 1100, easing: 'easeOutQuart' },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + cfg.fmt(ctx.parsed) } },
                textoCentral: { label: cfg.centroLabel, valor: cfg.centroValor, escala: escala },
                hoverPorArea: {}
              },
              onHover: (e, els) => {
                try { e.native.target.style.cursor = (els && els.length) ? 'pointer' : 'default'; } catch (_) {}
              }
            },
            plugins: [textoCentral, hoverPorArea]
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

  // Atualiza as cores dos gráficos já montados quando o tema muda (claro/escuro),
  // sem precisar recriar a view. O plugin textoCentral relê coresTema() a cada
  // redraw, então basta forçar um update; nas barras atualizamos também a cor
  // dos rótulos do eixo x.
  function atualizarCores() {
    if (!instancias.size) return;
    const t = coresTema();
    for (const chart of instancias.values()) {
      try {
        if (chart.config && chart.config.type === 'bar') {
          if (chart.options && chart.options.scales && chart.options.scales.x) {
            chart.options.scales.x.ticks.color = t.muted;
          }
        }
        // 'none' = redesenha sem reanimar; dispara afterDraw (texto central correto).
        chart.update('none');
      } catch (_) { /* gráfico pode ter sido destruído */ }
    }
  }

  window.ChartGraficos = { registrar, montar, destruirTodos, atualizarCores };
})();
