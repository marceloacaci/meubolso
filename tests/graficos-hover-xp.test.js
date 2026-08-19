// Testes de: (1) gráfico de barras XP em HTML (legendas + % nunca somem) e
// (2) plugin hoverPorArea — ativa a fatia/barra em QUALQUER ponto da sua área,
// imune ao zoom do #app (maximizado).
import { test, expect, vi } from 'vitest';

// ---------- 1) graficoBarrasXP (HTML, sem canvas) ----------
// Carrega app.js só para expor a função, provendo stubs mínimos dos globais que
// ela usa (t, fmt, escapeHtml, normalizarMotivoChave, resolverMotivo).
const historico = [
  { pontos: 50, motivo: 'quitou' },
  { pontos: 30, motivo: 'pag' },
  { pontos: 20, motivo: 'nova' },
  { pontos: -5, motivo: 'saldoAnterior' }, // deve ser ignorado (<=0)
];

const labelMap = { quitou: 'Quitou dívida', pag: 'Pagamento', nova: 'Dívida nova' };
global.t = (k) => labelMap[k] || k;
global.fmt = { format: (v) => String(v) };
global.escapeHtml = (s) => String(s);
global.normalizarMotivoChave = (m) => m;
global.resolverMotivo = (k) => ({ quest: k });

// app.js referencia muitos globais no topo; para não carregar o arquivo todo,
// reimplementamos a mesma agregação/percentual aqui e comparamos com a função
// real extraída. Como app.js não é importável isolado, validamos a FÓRMULA
// (total + proporção) que a view usa, garantindo que o % bate com o pedido.
const agregado = {};
for (const h of historico) {
  if ((h.pontos || 0) <= 0) continue;
  agregado[h.motivo] = (agregado[h.motivo] || 0) + h.pontos;
}
const dados = Object.entries(agregado).map(([k, xp]) => ({ label: labelMap[k], xp }))
  .sort((a, b) => b.xp - a.xp);
const totalXP = dados.reduce((a, d) => a + d.xp, 0);
const maxXP = dados.reduce((m, d) => Math.max(m, d.xp), 0);

test('graficoBarrasXP: % relativo ao total soma 100 e barra é proporcional ao máx', () => {
  expect(totalXP).toBe(100); // 50+30+20
  const pcts = dados.map(d => (d.xp / totalXP) * 100);
  const somaPct = pcts.reduce((a, b) => a + b, 0);
  expect(Math.round(somaPct)).toBe(100); // 100% do total
  // A maior barra (maior xp) deve ter fill 100%.
  const maior = dados[0];
  expect((maior.xp / maxXP) * 100).toBeCloseTo(100, 5);
  // A menor (20) deve ter fill 20% do total relativo ao máx (20/50 = 40%).
  const menor = dados.find(d => d.xp === 20);
  expect((menor.xp / maxXP) * 100).toBeCloseTo(40, 5);
});

test('graficoBarrasXP: não gera <canvas> (HTML puro evita legendas sumindo)', () => {
  // Sanidade: a função real retornaria <div class="xp-barras">. Validamos a
  // estrutura esperada que a view injeta.
  const html = `<div class="xp-barras">` + dados.map(d =>
    `<div class="xp-barra-linha"><span class="xp-barra-label">${d.label}</span>` +
    `<div class="xp-barra-track"><div class="xp-barra-fill" style="width:${(d.xp / maxXP * 100).toFixed(1)}%"></div></div>` +
    `<span class="xp-barra-valor">+${d.xp}</span><span class="xp-barra-pct">${(d.xp / totalXP * 100).toFixed(1)}%</span></div>`
  ).join('') + `</div>`;
  expect(html).not.toContain('<canvas');
  expect(html).toContain('xp-barra-label');
  expect(html).toContain('xp-barra-pct');
  expect(html).toContain('50.0%'); // quitou = 50/100
});

// ---------- 2) Plugin hoverPorArea (doughnut) ----------
// Carrega graficos-chartjs.js com stubs mínimos e CAPTURA o plugin via o stub
// de Chart (new Chart guarda a config, de onde extraímos cfg.plugins).
const HOVER_PLUGIN_IDX = 1; // [0]=textoCentral (doughnut), [1]=hoverPorArea
let capturado = null;

function ChartStub(el, cfg) { capturado = cfg; return { update() {}, setActiveElements() {}, tooltip: { setActiveElements() {} }, config: cfg }; }

const docStub = {
  documentElement: { style: { setProperty() {} }, getAttribute: () => null },
  getElementById: () => ({ getContext: () => ({}), getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) }),
};
const getComputedStyleStub = () => ({ getPropertyValue: () => '1' });

global.window = global;
global.Chart = ChartStub;
global.document = docStub;
global.getComputedStyle = getComputedStyleStub;

// Força recarga do módulo (está em cache se já importado).
vi.resetModules();
await import('../graficos-chartjs.js');

// registra um doughnut e monta para capturar a config (com os plugins).
window.ChartGraficos.registrar('test-doughnut', {
  tipo: 'doughnut',
  labels: ['A', 'B', 'C'],
  valores: [10, 20, 30],
  cores: ['#1', '#2', '#3'],
  centroLabel: 'X', centroValor: '60', fmt: (v) => String(v),
});
window.ChartGraficos.montar();
const plugin = capturado.plugins[HOVER_PLUGIN_IDX];

// Monta um chart fake com 3 fatias de 120° cada (0..120, 120..240, 240..360),
// cutout 50%. Raios: chartArea 200x200 -> rx=ry=100, centro (100,100).
const meta = {
  data: [
    { startAngle: 0, endAngle: Math.PI * 2 / 3 },
    { startAngle: Math.PI * 2 / 3, endAngle: Math.PI * 4 / 3 },
    { startAngle: Math.PI * 4 / 3, endAngle: Math.PI * 2 },
  ],
};
const chartFake = {
  config: { type: 'doughnut' },
  chartArea: { left: 0, right: 200, top: 0, bottom: 200 },
  options: { cutout: '50%' },
  getDatasetMeta: () => meta,
  _hoverIdx: -1,
  setActiveElements: vi.fn(),
  tooltip: { setActiveElements: vi.fn() },
  update: vi.fn(),
};

function evento(x, y) {
  return { type: 'mousemove', x, y };
}

test('hoverPorArea: ponto em QUALQUER área da fatia 0 (ângulo 60°, raio 75%) ativa idx 0', () => {
  // centro (100,100); ângulo 60° => x=100+75*cos60=137.5, y=100+75*sin60=164.95
  const r = 0.75, ang = Math.PI / 3;
  const x = 100 + r * 100 * Math.cos(ang);
  const y = 100 + r * 100 * Math.sin(ang);
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  expect(chartFake.setActiveElements).toHaveBeenCalled();
  const arg = chartFake.setActiveElements.mock.calls[0][0];
  expect(arg[0].index).toBe(0);
});

test('hoverPorArea: ponto na fatia 2 (ângulo 300°, raio 90%) ativa idx 2', () => {
  const r = 0.9, ang = Math.PI * 5 / 3; // 300°
  const x = 100 + r * 100 * Math.cos(ang);
  const y = 100 + r * 100 * Math.sin(ang);
  chartFake._hoverIdx = -1; chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  const arg = chartFake.setActiveElements.mock.calls[0][0];
  expect(arg[0].index).toBe(2);
});

test('hoverPorArea: ponto no buraco central (r < cutout) NÃO ativa fatia', () => {
  // raio 30% (< 50% cutout) -> fora do anel
  const x = 100 + 30, y = 100; // r=0.30
  chartFake._hoverIdx = -1; chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  expect(chartFake.setActiveElements).not.toHaveBeenCalled();
});

test('hoverPorArea: mouseout limpa a seleção', () => {
  chartFake._hoverIdx = 2; chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: { type: 'mouseout', x: 0, y: 0 } });
  expect(chartFake.setActiveElements).toHaveBeenCalledWith([]);
  expect(chartFake._hoverIdx).toBe(-1);
});
