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
  if (!Chart) {
    window.ChartGraficos = { registrar() {}, montar() {}, destruirTodos() {} };
    return;
  }

  const pendentes = {};
  const instancias = new Map();

  // Cores do tema lidas em tempo de montagem (respeita claro/escuro).
  function coresTema() {
    const cs = getComputedStyle(document.documentElement);
    return {
      text: cs.getPropertyValue('--text').trim() || '#1a1a1a',
      muted: cs.getPropertyValue('--text-muted').trim() || '#6b6b6b',
      primary: cs.getPropertyValue('--primary').trim() || '#2d6a4f',
      success: cs.getPropertyValue('--success-claro').trim() || '#52b788',
      border:
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? 'rgba(0,0,0,0.35)'
          : '#ffffff',
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
      const s = o.escala && o.escala > 1 ? o.escala : 1;
      // Tamanho base reduzido; encolhe conforme o nº de casas do valor para
      // não estourar o círculo interior e aproveitar melhor a área.
      const baseValor = 15,
        baseLabel = 12;
      const casas = (o.valor || '').replace(/[^\d]/g, '').length; // dígitos do valor
      const reducao = casas >= 8 ? 0.6 : casas >= 6 ? 0.72 : casas >= 4 ? 0.82 : 1;
      const fv = Math.max(8, Math.round(baseValor * s * reducao));
      const fl = Math.max(7, Math.round(baseLabel * s * (casas >= 6 ? 0.85 : 1)));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (o.label) {
        ctx.fillStyle = t.muted;
        ctx.font = '600 ' + fl + 'px system-ui, sans-serif';
        ctx.fillText(o.label, cx, cy - 10 * s);
      }
      if (o.valor) {
        ctx.fillStyle = t.text;
        ctx.font = '700 ' + fv + 'px system-ui, sans-serif';
        ctx.fillText(o.valor, cx, cy + 8 * s);
      }
      ctx.restore();
    },
  };

  // Plugin: hover por ÁREA TOTAL da fatia/barra (imune ao zoom CSS do #app).
  // Ao maximizar, o #app recebe `zoom: var(--app-width-scale)` e o hit-test
  // NATIVO do Chart.js (getElementsAtEventForMode) dessincroniza: o `ve()` interno
  // usa offsetX/offsetY do evento, que sob `zoom` ficam deslocados em relação ao
  // chartArea, deixando o hover "morto"/na fatia errada. Este plugin NÃO confia
  // em ev.x/ev.y — mapeia a posição do mouse por FRAÇÃO NORMALIZADA (0..1) entre o
  // rect visual do canvas e o chartArea LÓGICO, o que é imune a zoom/dpr/qualquer
  // escala. A geometria (startAngle/endAngle/raio) está sempre em unidades lógicas.
  const hoverPorArea = {
    id: 'hoverPorArea',
    afterEvent(chart, args) {
      const ev = args && args.event;
      if (!ev) return;
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;
      const type = chart.config.type;
      const setCursor = (ativo) => {
        try {
          chart.canvas.style.cursor = ativo ? 'pointer' : 'default';
        } catch (_) {}
      };
      if (ev.type === 'mouseout') {
        chart._hoverIdx = -1;
        chart.setActiveElements([]);
        if (chart.tooltip) chart.tooltip.setActiveElements([]);
        setCursor(false);
        return;
      }
      if (ev.type !== 'mousemove') return;
      const ca = chart.chartArea;
      if (!ca) return;
      // Mapeia a posição real do mouse (clientX/Y) para coordenadas LÓGICAS do
      // chartArea por fração normalizada 0..1 — imune a zoom/dpr. O rect visual
      // (getBoundingClientRect) sempre reflete a área EXIBIDA (incluindo o zoom);
      // ca/geometrias são unidades lógicas do Chart.js.
      const rect =
        chart.canvas && chart.canvas.getBoundingClientRect
          ? chart.canvas.getBoundingClientRect()
          : null;
      if (rect && rect.width && rect.height && ev.native) {
        const relX = (ev.native.clientX - rect.left) / rect.width;
        const relY = (ev.native.clientY - rect.top) / rect.height;
        ev.x = ca.left + relX * (ca.right - ca.left);
        ev.y = ca.top + relY * (ca.bottom - ca.top);
      }
      const cx = (ca.left + ca.right) / 2;
      const cy = (ca.top + ca.bottom) / 2;

      if (type === 'doughnut' || type === 'pie') {
        // Centro e raio REAIS do círculo desenhado (o doughnut do Chart.js é um
        // círculo, não elipse: outerRadius = min(rx,ry)). Usamos o raio do anel
        // real e atan2(dy,dx) — igual ao hit-test nativo — para decidir a fatia.
        const first = meta.data[0];
        const rcx = first.x !== undefined ? first.x : cx;
        const rcy = first.y !== undefined ? first.y : cy;
        const inner = first.innerRadius || 0;
        const outer = first.outerRadius || 1;
        const dx = ev.x - rcx,
          dy = ev.y - rcy;
        const dist = Math.hypot(dx, dy);
        if (dist < inner || dist > outer) {
          if (chart._hoverIdx !== -1) {
            chart._hoverIdx = -1;
            chart.setActiveElements([]);
            if (chart.tooltip) chart.tooltip.setActiveElements([]);
          }
          setCursor(false);
          return;
        }
        let pa = Math.atan2(dy, dx);
        if (pa < -0.5 * Math.PI) pa += 2 * Math.PI;
        pa = ((pa % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        let idx = -1;
        for (let i = 0; i < meta.data.length; i++) {
          const el = meta.data[i];
          let s = ((el.startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          let e = ((el.endAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          const inArc = s <= e ? pa >= s && pa <= e : pa >= s || pa <= e;
          if (inArc) {
            idx = i;
            break;
          }
        }
        if (idx < 0) {
          if (chart._hoverIdx !== -1) {
            chart._hoverIdx = -1;
            chart.setActiveElements([]);
            if (chart.tooltip) chart.tooltip.setActiveElements([]);
          }
          setCursor(false);
          return;
        }
        if (idx === chart._hoverIdx) return;
        chart._hoverIdx = idx;
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
        if (chart.tooltip)
          chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: ev.x, y: ev.y });
        setCursor(true);
      } else if (type === 'bar') {
        // Barras: ativa a coluna sob o ponteiro, só dentro da ÁREA COLORIDA
        // (rótulos do eixo x ficam abaixo do chartArea e NÃO contam).
        if (ev.y < ca.top || ev.y > ca.bottom) {
          if (chart._hoverIdx !== -1) {
            chart._hoverIdx = -1;
            chart.setActiveElements([]);
            if (chart.tooltip) chart.tooltip.setActiveElements([]);
          }
          setCursor(false);
          return;
        }
        const x = ev.x;
        let idx = -1;
        for (let i = 0; i < meta.data.length; i++) {
          const el = meta.data[i];
          const xc = el.x !== undefined ? el.x : el.getCenterPoint ? el.getCenterPoint().x : null;
          const half =
            (el.width !== undefined ? el.width : el.getProps ? el.getProps(['width']).width : 0) /
            2;
          if (xc != null && half && Math.abs(x - xc) <= half) {
            idx = i;
            break;
          }
        }
        if (idx < 0 || idx === chart._hoverIdx) return;
        chart._hoverIdx = idx;
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
        if (chart.tooltip)
          chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: ev.x, y: ev.y });
        setCursor(true);
      }
    },
  };

  function registrar(id, cfg) {
    pendentes[id] = cfg;
  }

  function destruirTodos() {
    for (const ch of instancias.values()) {
      try {
        ch.destroy();
      } catch (_) {}
    }
    instancias.clear();
  }

  function montar() {
    destruirTodos();
    if (!pendentes || !Object.keys(pendentes).length) return;
    // Escala de largura (viewport): amplia as fontes internas/legendas ao
    // maximizar. NÃO inflamos o devicePixelRatio com a escala — o CSS `zoom`
    // do #app já rasteriza o canvas com nitidez; inflar o dpr aqui causaria
    // ESCALONAMENTO DUPLO (canvas físico × escala × dpr) e dessincronizaria o
    // hit-test do hover. O plugin hoverPorArea cuida do hover sob zoom.
    const escala =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--app-width-scale')
      ) || 1;
    const dpr = window.devicePixelRatio || 1;

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
            data: {
              labels: cfg.labels,
              datasets: [
                { data: cfg.valores, backgroundColor: bg, borderRadius: 4, borderSkipped: false },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              devicePixelRatio: dpr,
              // Hit-test NATIVO: intersect:true ativa a barra só quando o ponteiro
              // está sobre ela (rótulos do eixo x ficam fora do chartArea).
              interaction: { mode: 'nearest', intersect: true },
              animation: { duration: 900, easing: 'easeOutQuart' },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: t.muted, font: { size: Math.round(10 * escala) } },
                  border: { display: false },
                },
                y: { display: false, grid: { display: false }, beginAtZero: true },
              },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + cfg.fmt(ctx.parsed.y) } },
                hoverPorArea: {},
              },
            },
            plugins: [hoverPorArea],
          });
        } else {
          // Doughnut (pizza/rosca): inicia no TOPO (0°) e varre como relógio.
          // Chart.js usa radianos: -Math.PI/2 = topo (12h).
          chart = new Chart(el, {
            type: 'doughnut',
            data: {
              labels: cfg.labels,
              datasets: [
                {
                  data: cfg.valores,
                  backgroundColor: cfg.cores,
                  borderColor: t.border,
                  borderWidth: 2,
                  hoverOffset: 12, // fatias se separam no hover (efeito pedido)
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              devicePixelRatio: dpr,
              layout: { padding: 16 }, // folga p/ o hoverOffset (fatias se separam) não estourar o canvas
              // Hit-test NATIVO: intersect:true ativa a fatia só quando o ponteiro
              // está dentro dela (fora do anel / cantos não contam).
              interaction: { mode: 'nearest', intersect: true },
              rotation: -Math.PI / 2, // início no topo (0°), varrendo como relógio
              cutout: '62%',
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1100,
                easing: 'easeOutQuart',
              },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + cfg.fmt(ctx.parsed) } },
                textoCentral: { label: cfg.centroLabel, valor: cfg.centroValor, escala: escala },
                hoverPorArea: {},
              },
            },
            plugins: [textoCentral, hoverPorArea],
          });
        }
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn)
          console.warn('Chart não pôde ser criado:', err && err.message);
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
      } catch (_) {
        /* gráfico pode ter sido destruído */
      }
    }
  }

  window.ChartGraficos = { registrar, montar, destruirTodos, atualizarCores };
})();
