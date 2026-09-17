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
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-theme') === 'dark';
    const cs =
      typeof window !== 'undefined' && typeof getComputedStyle === 'function'
        ? getComputedStyle(document.documentElement)
        : null;
    return {
      isDark,
      text: (cs && cs.getPropertyValue('--text').trim()) || (isDark ? '#f8fafc' : '#1a1a1a'),
      muted: (cs && cs.getPropertyValue('--text-muted').trim()) || (isDark ? '#94a3b8' : '#6b6b6b'),
      primary: (cs && cs.getPropertyValue('--primary').trim()) || '#2d6a4f',
      success: (cs && cs.getPropertyValue('--success-claro').trim()) || '#52b788',
      border: isDark ? 'rgba(0,0,0,0.35)' : '#ffffff',
      borderHighlight: isDark ? 'rgba(255, 255, 255, 0.95)' : '#ffffff',
      borderDimmed: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.55)',
    };
  }

  // Helper: adiciona canal alfa a cores hex ou rgb para efeito spotlight / atenuação
  function comOpacidade(cor, opacidade) {
    if (!cor) return `rgba(128, 128, 128, ${opacidade})`;
    const s = String(cor).trim();
    if (s.startsWith('#')) {
      let hex = s.slice(1);
      if (hex.length === 3)
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('');
      if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16) || 0;
        const g = parseInt(hex.slice(2, 4), 16) || 0;
        const b = parseInt(hex.slice(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${opacidade})`;
      }
    }
    if (s.startsWith('rgb')) {
      const match = s.match(/\d+(\.\d+)?/g);
      if (match && match.length >= 3) {
        return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacidade})`;
      }
    }
    return s;
  }

  // Sincroniza a legenda externa no DOM dentro do mesmo card (efeito bidirecional)
  function sincronizarLegenda(canvas, idx) {
    if (!canvas || typeof canvas.closest !== 'function') return;
    try {
      const card =
        canvas.closest('.chart-card-body') || canvas.closest('.card-body') || canvas.parentElement;
      if (!card) return;
      const legend = card.querySelector('.legend');
      if (!legend) return;
      const items = legend.querySelectorAll('.legend-item');
      if (!items || !items.length) return;

      if (idx >= 0) {
        legend.classList.add('has-active');
        items.forEach((it, i) => {
          const itemIdx =
            it.getAttribute('data-idx') !== null ? parseInt(it.getAttribute('data-idx'), 10) : i;
          if (itemIdx === idx) {
            it.classList.add('legend-item-active');
          } else {
            it.classList.remove('legend-item-active');
          }
        });
      } else {
        legend.classList.remove('has-active');
        items.forEach((it) => it.classList.remove('legend-item-active'));
      }
    } catch (_) {}
  }

  // Garante que cada elemento de fatia possua o hook de translação radial suave,
  // mantendo tamanho, raio e proporções idênticos em todas as fatias.
  function garantirHookSeparacao(chart) {
    const meta = chart.getDatasetMeta && chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;
    const type = chart.config && chart.config.type;
    if (type !== 'doughnut' && type !== 'pie') return;
    const total = meta.data.length;
    if (!chart._sliceSeparation || chart._sliceSeparation.current.length !== total) {
      chart._sliceSeparation = {
        current: new Array(total).fill(0),
        target: new Array(total).fill(0),
        animId: null,
      };
    }
    meta.data.forEach((el, i) => {
      if (!el._origDraw && typeof el.draw === 'function') {
        el._origDraw = el.draw;
        el.draw = function (ctx) {
          const sep = (chart._sliceSeparation && chart._sliceSeparation.current[i]) || 0;
          if (sep > 0.02) {
            const a = (this.startAngle + this.endAngle) / 2;
            ctx.save();
            ctx.translate(Math.cos(a) * sep, Math.sin(a) * sep);
            // Garante que o Chart.js nativo não deforme outerRadius, innerRadius nem ângulos:
            const savedOffset = this.options ? this.options.offset : 0;
            if (this.options) this.options.offset = 0;
            this._origDraw(ctx);
            if (this.options) this.options.offset = savedOffset;
            ctx.restore();
          } else {
            this._origDraw(ctx);
          }
        };
      }
    });
  }

  // Animação suave com interpolação ease-out para o destacamento da fatia ativa
  function animarSeparacaoFatias(chart, idx) {
    garantirHookSeparacao(chart);
    const sepState = chart._sliceSeparation;
    if (!sepState) return;
    const meta = chart.getDatasetMeta && chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    const total = meta.data.length;
    if (total <= 1) return;

    const targetDist = 7.5; // Separação sutil, elegante e fluida (7.5px)
    sepState.target = meta.data.map((_, i) => (i === idx ? targetDist : 0));

    if (sepState.animId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(sepState.animId);
      }
      sepState.animId = null;
    }

    function passo() {
      let mudou = false;
      for (let i = 0; i < total; i++) {
        const cur = sepState.current[i] || 0;
        const tgt = sepState.target[i] || 0;
        const diff = tgt - cur;
        if (Math.abs(diff) > 0.08) {
          sepState.current[i] = cur + diff * 0.25; // Interpolação suave a 60fps
          mudou = true;
        } else {
          sepState.current[i] = tgt;
        }
      }
      if (typeof chart.draw === 'function') {
        chart.draw();
      } else if (typeof chart.update === 'function') {
        chart.update('none');
      }
      if (mudou && typeof requestAnimationFrame === 'function') {
        sepState.animId = requestAnimationFrame(passo);
      } else {
        sepState.animId = null;
      }
    }
    passo();
  }

  // Aplica estilos visuais de hover: spotlight, destacamento suave e dimming
  function aplicarEstiloHover(chart, idx) {
    const meta = chart.getDatasetMeta && chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    const cfg = chart._cfg || {};
    const t = coresTema();
    const type = chart.config && chart.config.type;
    const total = meta.data.length;
    const cores = cfg.cores || [];
    const ds = chart.data && chart.data.datasets && chart.data.datasets[0];

    if (type === 'doughnut' || type === 'pie') {
      const hasMultiple = total > 1;
      const bgs = [];
      const borders = [];
      const widths = [];

      for (let i = 0; i < total; i++) {
        const el = meta.data[i];
        const corOriginal = cores[i] || t.primary;

        if (idx >= 0) {
          if (i === idx) {
            bgs.push(corOriginal);
            borders.push(t.borderHighlight);
            widths.push(3);
            if (el && el.options) {
              el.options.offset = hasMultiple ? 7.5 : 0;
              el.options.backgroundColor = corOriginal;
              el.options.borderColor = t.borderHighlight;
              el.options.borderWidth = 3;
            }
          } else {
            bgs.push(comOpacidade(corOriginal, 0.32));
            borders.push(t.borderDimmed);
            widths.push(1);
            if (el && el.options) {
              el.options.offset = 0;
              el.options.backgroundColor = comOpacidade(corOriginal, 0.32);
              el.options.borderColor = t.borderDimmed;
              el.options.borderWidth = 1;
            }
          }
        } else {
          bgs.push(corOriginal);
          borders.push(t.border);
          widths.push(2);
          if (el && el.options) {
            el.options.offset = 0;
            el.options.backgroundColor = corOriginal;
            el.options.borderColor = t.border;
            el.options.borderWidth = 2;
          }
        }
      }

      if (ds) {
        ds.offset = 0; // Mantém offset base zero no dataset para não deformar raio/proporções
        ds.backgroundColor = bgs;
        ds.borderColor = borders;
        ds.borderWidth = widths;
      }

      // Executa o destacamento radial suavemente animado
      animarSeparacaoFatias(chart, idx);
    } else if (type === 'bar') {
      const bgs = [];
      const borders = [];
      const widths = [];
      const radiuses = [];

      for (let i = 0; i < total; i++) {
        const el = meta.data[i];
        const corOriginal = cores[i] || t.primary;

        if (idx >= 0) {
          if (i === idx) {
            bgs.push(corOriginal);
            borders.push('transparent');
            widths.push(0);
            radiuses.push(4);
            if (el && el.options) {
              el.options.backgroundColor = corOriginal;
              el.options.borderColor = 'transparent';
              el.options.borderWidth = 0;
              el.options.borderRadius = 4;
            }
          } else {
            bgs.push(comOpacidade(corOriginal, 0.28));
            borders.push('transparent');
            widths.push(0);
            radiuses.push(4);
            if (el && el.options) {
              el.options.backgroundColor = comOpacidade(corOriginal, 0.28);
              el.options.borderColor = 'transparent';
              el.options.borderWidth = 0;
              el.options.borderRadius = 4;
            }
          }
        } else {
          bgs.push(corOriginal);
          borders.push('transparent');
          widths.push(0);
          radiuses.push(4);
          if (el && el.options) {
            el.options.backgroundColor = corOriginal;
            el.options.borderColor = 'transparent';
            el.options.borderWidth = 0;
            el.options.borderRadius = 4;
          }
        }
      }

      if (ds) {
        ds.backgroundColor = bgs;
        ds.borderColor = 'transparent';
        ds.borderWidth = 0;
        ds.hoverBorderColor = 'transparent';
        ds.hoverBorderWidth = 0;
        ds.borderRadius = radiuses;
      }
    }

    sincronizarLegenda(chart.canvas, idx);
  }

  // Helper que calcula o maior tamanho de fonte que cabe exatamente na largura
  // disponível sem estourar, aproveitando ao máximo o centro do gráfico.
  function calcularFonteMax(ctx, texto, peso, familia, maxDesejado, minPermitido, larguraMax) {
    if (!texto || larguraMax <= 0) return minPermitido;
    if (!ctx || typeof ctx.measureText !== 'function') {
      const medEstimada = texto.length * maxDesejado * 0.55;
      if (medEstimada <= larguraMax) return maxDesejado;
      return Math.max(minPermitido, Math.min(maxDesejado, Math.floor(maxDesejado * (larguraMax / medEstimada))));
    }
    ctx.font = `${peso} ${maxDesejado}px ${familia}`;
    const med = ctx.measureText(texto).width;
    if (med <= larguraMax) return maxDesejado;
    const proporcao = larguraMax / med;
    let ideal = Math.max(minPermitido, Math.min(maxDesejado, Math.floor(maxDesejado * proporcao)));
    ctx.font = `${peso} ${ideal}px ${familia}`;
    while (ideal > minPermitido && ctx.measureText(texto).width > larguraMax) {
      ideal--;
      ctx.font = `${peso} ${ideal}px ${familia}`;
    }
    return ideal;
  }

  function truncarParaCaber(ctx, texto, larguraMax) {
    if (!texto || larguraMax <= 0) return '';
    if (!ctx || typeof ctx.measureText !== 'function') {
      const maxChars = Math.max(3, Math.floor(larguraMax / 8));
      return texto.length > maxChars ? texto.slice(0, maxChars - 1) + '…' : texto;
    }
    if (ctx.measureText(texto).width <= larguraMax) return texto;
    let t = texto;
    while (t.length > 2 && ctx.measureText(t + '…').width > larguraMax) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

  // Plugin: desenha o texto central nos doughnuts maximizando o espaço útil
  // responsivamente ao tamanho do saldo e à escala/janela do sistema.
  const textoCentral = {
    id: 'textoCentral',
    afterDraw(chart, _args, opts) {
      const o = opts || {};
      const { ctx, chartArea } = chart;
      if (!chartArea || !ctx || typeof ctx.save !== 'function') return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      const t = coresTema();
      const s = o.escala && o.escala > 1 ? Math.sqrt(o.escala) : 1;
      const cfg = chart._cfg || {};

      // Obtém o raio interno real da rosca do primeiro elemento (ou estimativa pelo chartArea)
      const meta = chart.getDatasetMeta && chart.getDatasetMeta(0);
      const firstArc = meta && meta.data && meta.data[0];
      const diametroEst = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      const innerRadius =
        firstArc && firstArc.innerRadius > 0
          ? firstArc.innerRadius
          : (diametroEst / 2) * 0.62;

      // Raio seguro com 10% de margem contra a borda interna da rosca
      const safeR = Math.max(12, innerRadius * 0.9);

      // Função que calcula a corda horizontal disponível a uma distância dy do centro
      const larguraNaAltura = (dy) => {
        const absDy = Math.abs(dy);
        if (absDy >= safeR) return 0;
        return 2 * Math.sqrt(safeR * safeR - absDy * absDy);
      };

      const fam = 'system-ui, -apple-system, sans-serif';

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // ---------------------------------------------------------
      // MODO HOVER (Fatia ativa: Categoria + Saldo/Valor + %)
      // ---------------------------------------------------------
      if (
        chart._hoverIdx !== undefined &&
        chart._hoverIdx >= 0 &&
        cfg.items &&
        cfg.items[chart._hoverIdx]
      ) {
        const item = cfg.items[chart._hoverIdx];
        const label = item.label || '';
        const valor = item.valorFmt || '';
        const pct = item.pct || '';

        const maxFv = Math.round(safeR * 0.44 * s);
        const maxFl = Math.round(safeR * 0.24 * s);
        const maxFp = Math.round(safeR * 0.2 * s);
        const gap = Math.max(2, Math.round(2.5 * s));

        // Estimativa inicial das alturas para medir cordas horizontais
        const estDyLabel = Math.round(maxFv * 0.48 + gap + maxFl * 0.45);
        const estDyPct = Math.round(maxFv * 0.48 + gap + maxFp * 0.45);

        const wLabel = larguraNaAltura(estDyLabel);
        const wValor = larguraNaAltura(0); // centro horizontal exato (maior largura do círculo)
        const wPct = larguraNaAltura(estDyPct);

        // 1. Valor hero (saldo da fatia)
        const fv = calcularFonteMax(ctx, valor, '700', fam, maxFv, 9, wValor);

        // 2. Rótulo da categoria (com truncamento suave se necessário)
        const fl = calcularFonteMax(ctx, label, '600', fam, maxFl, 8, wLabel);
        ctx.font = `600 ${fl}px ${fam}`;
        const labelExib = truncarParaCaber(ctx, label, wLabel);

        // 3. Percentual proporcional (com fallback "XX.X%" se "XX.X% do total" não couber)
        let textoPct = pct ? `${pct} do total` : '';
        let fp = calcularFonteMax(ctx, textoPct, '600', fam, maxFp, 7, wPct);
        ctx.font = `600 ${fp}px ${fam}`;
        if (textoPct && ctx.measureText && ctx.measureText(textoPct).width > wPct) {
          textoPct = pct;
          fp = calcularFonteMax(ctx, textoPct, '600', fam, maxFp, 8, wPct);
        }

        // Posicionamento vertical dinâmico exato baseado nos tamanhos finais
        const dyLabel = Math.round(fv * 0.5 + gap + fl * 0.45);
        const dyPct = Math.round(fv * 0.5 + gap + fp * 0.45);
        const yLabel = cy - dyLabel;
        const yValor = cy;
        const yPct = cy + dyPct;

        // Desenha categoria
        ctx.fillStyle = item.cor || t.primary;
        ctx.font = `600 ${fl}px ${fam}`;
        ctx.fillText(labelExib, cx, yLabel);

        // Desenha valor em destaque máximo
        ctx.fillStyle = t.text;
        ctx.font = `700 ${fv}px ${fam}`;
        ctx.fillText(valor, cx, yValor);

        // Desenha percentual
        if (textoPct) {
          ctx.fillStyle = t.muted;
          ctx.font = `600 ${fp}px ${fam}`;
          ctx.fillText(textoPct, cx, yPct);
        }
      } else {
        // ---------------------------------------------------------
        // MODO REPOUSO (Total Geral / % Quitado: Label + Saldo/Valor)
        // ---------------------------------------------------------
        if (!o.label && !o.valor) {
          ctx.restore();
          return;
        }

        const temLabel = !!o.label;
        const temValor = !!o.valor;

        if (temLabel && temValor) {
          // Layout equilibrado de 2 linhas aproveitando todo o diâmetro
          const maxFv = Math.round(safeR * 0.52 * s);
          const maxFl = Math.round(safeR * 0.25 * s);
          const gap = Math.max(2, Math.round(3 * s));

          const estDyLabel = Math.round(maxFv * 0.4 + gap * 0.5);
          const estDyValor = Math.round(maxFl * 0.45 + gap * 0.5);

          const wLabel = larguraNaAltura(estDyLabel);
          const wValor = larguraNaAltura(estDyValor);

          const fv = calcularFonteMax(ctx, o.valor, '700', fam, maxFv, 9, wValor);
          const fl = calcularFonteMax(ctx, o.label, '600', fam, maxFl, 8, wLabel);

          ctx.font = `600 ${fl}px ${fam}`;
          const labelExib = truncarParaCaber(ctx, o.label, wLabel);

          const dyLabel = Math.round(fv * 0.42 + gap * 0.6);
          const dyValor = Math.round(fl * 0.46 + gap * 0.6);

          ctx.fillStyle = t.muted;
          ctx.font = `600 ${fl}px ${fam}`;
          ctx.fillText(labelExib, cx, cy - dyLabel);

          ctx.fillStyle = t.text;
          ctx.font = `700 ${fv}px ${fam}`;
          ctx.fillText(o.valor, cx, cy + dyValor);
        } else {
          // Apenas 1 linha (valor puro ou label puro no centro absoluto)
          const texto = o.valor || o.label;
          const maxF = Math.round(safeR * 0.58 * s);
          const f = calcularFonteMax(ctx, texto, '700', fam, maxF, 10, larguraNaAltura(0));
          ctx.fillStyle = temValor ? t.text : t.muted;
          ctx.font = `700 ${f}px ${fam}`;
          ctx.fillText(texto, cx, cy);
        }
      }
      ctx.restore();
    },
  };

  // Configura tooltips com estética moderna e dados ricos
  function criarConfigTooltip(t, cfg) {
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-theme') === 'dark';

    return {
      enabled: true,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
      titleColor: isDark ? '#f8fafc' : '#0f172a',
      titleFont: { size: 12, weight: '600', family: 'system-ui, -apple-system, sans-serif' },
      bodyColor: isDark ? '#cbd5e1' : '#334155',
      bodyFont: { size: 12, weight: '500', family: 'system-ui, -apple-system, sans-serif' },
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: { top: 8, bottom: 8, left: 12, right: 12 },
      boxPadding: 6,
      usePointStyle: true,
      pointStyle: 'circle',
      boxWidth: 8,
      boxHeight: 8,
      caretSize: 5,
      caretPadding: 8,
      animation: { duration: 120 },
      callbacks: {
        title(items) {
          if (!items || !items.length) return '';
          return items[0].label || '';
        },
        label(ctx) {
          const idx = ctx.dataIndex;
          if (cfg.items && cfg.items[idx]) {
            const item = cfg.items[idx];
            return ' ' + item.valorFmt + (item.pct ? ` (${item.pct})` : '');
          }
          const val = ctx.parsed && ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
          return ' ' + (cfg.fmt ? cfg.fmt(val) : val);
        },
        labelColor(ctx) {
          const idx = ctx.dataIndex;
          const cor = (cfg.cores && cfg.cores[idx]) || t.primary;
          return {
            borderColor: cor,
            backgroundColor: cor,
            borderWidth: 1,
            borderRadius: 2,
          };
        },
        afterLabel(ctx) {
          if (cfg.tipo === 'bar' && cfg.total) {
            const idx = ctx.dataIndex;
            if (cfg.items && cfg.items[idx] && cfg.items[idx].pct) {
              return `${cfg.items[idx].pct} de todas as parcelas`;
            }
          }
          return '';
        },
      },
    };
  }

  // Plugin: hover por ÁREA TOTAL da fatia/barra (imune ao zoom CSS do #app).
  // Ao maximizar, o #app recebe `zoom: var(--app-width-scale)`. O canvas físico
  // é renderizado pelo browser sob zoom, fazendo getBoundingClientRect() retornar
  // a largura/altura visuais escaladas. Este plugin mapeia a posição do cursor
  // com a fração visual (fracX = (clientX - rect.left) / rect.width) multiplicada
  // diretamente pela largura/altura lógicas do Chart.js (chart.width e chart.height),
  // garantindo precisão milimétrica absoluta (1:1) mesmo na tela maximizada.
  const hoverPorArea = {
    id: 'hoverPorArea',
    beforeDraw(chart) {
      garantirHookSeparacao(chart);
    },
    afterEvent(chart, args) {
      const ev = args && args.event;
      if (!ev) return;
      const meta = chart.getDatasetMeta && chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;
      const type = chart.config && chart.config.type;
      const setCursor = (ativo) => {
        try {
          chart.canvas.style.cursor = ativo ? 'pointer' : 'default';
        } catch (_) {}
      };
      if (ev.type === 'mouseout') {
        chart._hoverIdx = -1;
        chart.setActiveElements([]);
        if (chart.tooltip) chart.tooltip.setActiveElements([]);
        aplicarEstiloHover(chart, -1);
        chart.update('none');
        setCursor(false);
        return;
      }
      if (ev.type !== 'mousemove') return;
      const ca = chart.chartArea;
      if (!ca) return;

      const canvas = chart.canvas;
      const rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      if (!rect || !rect.width || !rect.height) return;

      const clientX = ev.native ? ev.native.clientX : ev.clientX;
      const clientY = ev.native ? ev.native.clientY : ev.clientY;
      const fracX = (clientX - rect.left) / rect.width;
      const fracY = (clientY - rect.top) / rect.height;

      // Mouse fora dos limites visuais do canvas
      if (fracX < 0 || fracX > 1 || fracY < 0 || fracY > 1) {
        if (chart._hoverIdx !== -1) {
          chart._hoverIdx = -1;
          chart.setActiveElements([]);
          if (chart.tooltip) chart.tooltip.setActiveElements([]);
          aplicarEstiloHover(chart, -1);
          chart.update('none');
        }
        setCursor(false);
        return;
      }

      // Largura e altura lógicas da área de renderização do Chart.js
      const chartW = chart.width || (ca ? ca.right : (rect ? rect.width : 1));
      const chartH = chart.height || (ca ? ca.bottom : (rect ? rect.height : 1));

      // Coordenadas lógicas precisas 1:1 no espaço do canvas do Chart.js
      const logicalX = fracX * chartW;
      const logicalY = fracY * chartH;
      ev.x = logicalX;
      ev.y = logicalY;

      if (type === 'doughnut' || type === 'pie') {
        const first = meta.data[0];
        const rcx = first && first.x !== undefined ? first.x : (ca.left + ca.right) / 2;
        const rcy = first && first.y !== undefined ? first.y : (ca.top + ca.bottom) / 2;
        const inner = (first && first.innerRadius) || 0;
        // Tolerância externa adaptativa para acomodar o destacamento radial da fatia ativa
        const outerBase = (first && first.outerRadius) || 1;
        const outer = outerBase + (chart._hoverIdx >= 0 ? 14 : 6);
        const dx = logicalX - rcx;
        const dy = logicalY - rcy;
        const dist = Math.hypot(dx, dy);

        if (dist < Math.max(0, inner - 3) || dist > outer) {
          if (chart._hoverIdx !== -1) {
            chart._hoverIdx = -1;
            chart.setActiveElements([]);
            aplicarEstiloHover(chart, -1);
            chart.update('none');
          }
          setCursor(false);
          return false;
        }

        // Se só há 1 fatia (100%), ativa direto
        if (meta.data.length === 1) {
          if (chart._hoverIdx === 0) {
            setCursor(true);
            return false;
          }
          chart._hoverIdx = 0;
          chart.setActiveElements([{ datasetIndex: 0, index: 0 }]);
          aplicarEstiloHover(chart, 0);
          chart.update('none');
          setCursor(true);
          return false;
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
            aplicarEstiloHover(chart, -1);
            chart.update('none');
          }
          setCursor(false);
          return false;
        }
        if (idx === chart._hoverIdx) {
          setCursor(true);
          return false;
        }
        chart._hoverIdx = idx;
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
        aplicarEstiloHover(chart, idx);
        chart.update('none');
        setCursor(true);
        return false;
      } else if (type === 'bar') {
        // Barras: só ativa dentro da área vertical das colunas (ca.top <= logicalY <= ca.bottom)
        if (logicalY < ca.top - 6 || logicalY > ca.bottom + 6) {
          if (chart._hoverIdx !== -1) {
            chart._hoverIdx = -1;
            chart.setActiveElements([]);
            if (chart.tooltip) chart.tooltip.setActiveElements([]);
            aplicarEstiloHover(chart, -1);
            chart.update('none');
          }
          setCursor(false);
          return;
        }

        // Identifica a coluna da barra com cálculo contínuo de proximidade
        let idx = -1;
        let menorDist = Infinity;
        for (let i = 0; i < meta.data.length; i++) {
          const el = meta.data[i];
          const xc = el.x !== undefined ? el.x : (el.getCenterPoint ? el.getCenterPoint().x : null);
          if (xc == null) continue;
          const half = (el.width !== undefined ? el.width : (el.getProps ? el.getProps(['width']).width : 0)) / 2;
          const tolerance = Math.max(half, 14);
          const d = Math.abs(logicalX - xc);
          if (d <= tolerance && d < menorDist) {
            menorDist = d;
            idx = i;
          }
        }
        if (idx < 0) {
          if (chart._hoverIdx !== -1) {
            chart._hoverIdx = -1;
            chart.setActiveElements([]);
            if (chart.tooltip) chart.tooltip.setActiveElements([]);
            aplicarEstiloHover(chart, -1);
            chart.update('none');
          }
          setCursor(false);
          return;
        }
        if (idx === chart._hoverIdx) return;
        chart._hoverIdx = idx;
        chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
        if (chart.tooltip)
          chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], { x: logicalX, y: logicalY });
        aplicarEstiloHover(chart, idx);
        chart.update('none');
        setCursor(true);
      }
    },
  };

  function registrar(id, cfg) {
    // Sintetiza cfg.items caso não tenha sido passado pelo chamador
    if (!cfg.items && cfg.labels) {
      const tot = (cfg.valores || []).reduce((a, b) => a + b, 0);
      cfg.items = cfg.labels.map((l, i) => {
        const val = cfg.valores ? cfg.valores[i] : 0;
        return {
          label: l,
          valor: val,
          valorFmt: cfg.fmt ? cfg.fmt(val) : String(val),
          pct: tot > 0 ? ((val / tot) * 100).toFixed(1) + '%' : '',
          cor: cfg.cores ? cfg.cores[i] : '',
        };
      });
      cfg.total = cfg.total || tot;
    }
    pendentes[id] = cfg;
  }

  function destruirTodos() {
    for (const ch of instancias.values()) {
      try {
        if (ch._sliceSeparation && ch._sliceSeparation.animId) {
          cancelAnimationFrame(ch._sliceSeparation.animId);
          ch._sliceSeparation.animId = null;
        }
        ch.destroy();
      } catch (_) {}
    }
    instancias.clear();
  }

  // Ativação de hover programática para sincronização com elementos DOM (ex: legendas)
  function ativarHover(chartId, idx) {
    const chart = instancias.get(chartId);
    if (!chart) return;
    const meta = chart.getDatasetMeta && chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data[idx]) return;
    const el = meta.data[idx];
    chart._hoverIdx = idx;
    chart.setActiveElements([{ datasetIndex: 0, index: idx }]);

    if (chart.tooltip && chart.config && chart.config.type === 'bar') {
      let pt = null;
      if (typeof el.getCenterPoint === 'function') {
        pt = el.getCenterPoint();
      } else if (el.x !== undefined && el.y !== undefined) {
        pt = { x: el.x, y: el.y };
      }
      if (pt) {
        chart.tooltip.setActiveElements([{ datasetIndex: 0, index: idx }], pt);
      }
    }

    aplicarEstiloHover(chart, idx);
    try {
      chart.canvas.style.cursor = 'pointer';
    } catch (_) {}
    chart.update('none');
  }

  function desativarHover(chartId) {
    const chart = instancias.get(chartId);
    if (!chart) return;
    chart._hoverIdx = -1;
    chart.setActiveElements([]);
    if (chart.tooltip) chart.tooltip.setActiveElements([]);
    aplicarEstiloHover(chart, -1);
    try {
      chart.canvas.style.cursor = 'default';
    } catch (_) {}
    chart.update('none');
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
                {
                  data: cfg.valores,
                  backgroundColor: bg,
                  borderRadius: 4,
                  borderSkipped: false,
                  borderColor: 'transparent',
                  borderWidth: 0,
                  hoverBorderColor: 'transparent',
                  hoverBorderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              devicePixelRatio: dpr,
              interaction: { mode: 'nearest', intersect: true },
              elements: {
                bar: {
                  borderWidth: 0,
                  borderColor: 'transparent',
                  hoverBorderWidth: 0,
                  hoverBorderColor: 'transparent',
                },
              },
              animation: { duration: 900, easing: 'easeOutQuart' },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: t.muted, font: { size: Math.round(10 * Math.sqrt(escala)) } },
                  border: { display: false },
                },
                y: { display: false, grid: { display: false }, beginAtZero: true },
              },
              plugins: {
                legend: { display: false },
                tooltip: criarConfigTooltip(t, cfg),
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
                  hoverOffset: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              devicePixelRatio: dpr,
              layout: { padding: 16 },
              interaction: { mode: 'nearest', intersect: true },
              rotation: -Math.PI / 2,
              cutout: '62%',
              hover: { mode: null },
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1100,
                easing: 'easeOutQuart',
              },
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                textoCentral: { label: cfg.centroLabel, valor: cfg.centroValor, escala: escala },
                hoverPorArea: {},
              },
            },
            plugins: [textoCentral, hoverPorArea],
          });
        }
        chart._cfg = cfg;
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

  window.ChartGraficos = {
    registrar,
    montar,
    destruirTodos,
    atualizarCores,
    ativarHover,
    desativarHover,
  };
})();
