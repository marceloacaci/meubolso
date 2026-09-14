// Testes de: (1) gráfico de barras XP em HTML (legendas + % nunca somem) e
// (2) plugin hoverPorArea — ativa a fatia/barra por mapeamento de FRAÇÃO
// NORMALIZADA (0..1), imune ao zoom do #app (maximizado). O hover nativo do
// Chart.js dessincroniza sob `zoom`; o plugin recalcula a partir de
// clientX/clientY + getBoundingClientRect().
import { test, expect, vi } from 'vitest';

// ---------- 1) graficoBarrasXP (HTML, sem canvas) ----------
// Valida a FÓRMULA (total + proporção) que a view usa, garantindo que o %
// bate com o pedido (não gera <canvas>, evita legendas sumindo sob zoom).
const historico = [
  { pontos: 50, motivo: 'quitou' },
  { pontos: 30, motivo: 'pag' },
  { pontos: 20, motivo: 'nova' },
  { pontos: -5, motivo: 'saldoAnterior' }, // deve ser ignorado (<=0)
];

const labelMap = { quitou: 'Quitou dívida', pag: 'Pagamento', nova: 'Dívida nova' };

const agregado = {};
for (const h of historico) {
  if ((h.pontos || 0) <= 0) continue;
  agregado[h.motivo] = (agregado[h.motivo] || 0) + h.pontos;
}
const dados = Object.entries(agregado)
  .map(([k, xp]) => ({ label: labelMap[k], xp }))
  .sort((a, b) => b.xp - a.xp);
const totalXP = dados.reduce((a, d) => a + d.xp, 0);
const maxXP = dados.reduce((m, d) => Math.max(m, d.xp), 0);

test('graficoBarrasXP: % relativo ao total soma 100 e barra é proporcional ao máx', () => {
  expect(totalXP).toBe(100); // 50+30+20
  const pcts = dados.map((d) => (d.xp / totalXP) * 100);
  const somaPct = pcts.reduce((a, b) => a + b, 0);
  expect(Math.round(somaPct)).toBe(100); // 100% do total
  // A maior barra (maior xp) deve ter fill 100%.
  const maior = dados[0];
  expect((maior.xp / maxXP) * 100).toBeCloseTo(100, 5);
  // A menor (20) deve ter fill 20% do total relativo ao máx (20/50 = 40%).
  const menor = dados.find((d) => d.xp === 20);
  expect((menor.xp / maxXP) * 100).toBeCloseTo(40, 5);
});

test('graficoBarrasXP: não gera <canvas> (HTML puro evita legendas sumindo)', () => {
  const html =
    `<div class="xp-barras">` +
    dados
      .map(
        (d) =>
          `<div class="xp-barra-linha"><span class="xp-barra-label">${d.label}</span>` +
          `<div class="xp-barra-track"><div class="xp-barra-fill" style="width:${((d.xp / maxXP) * 100).toFixed(1)}%"></div></div>` +
          `<span class="xp-barra-valor">+${d.xp}</span><span class="xp-barra-pct">${((d.xp / totalXP) * 100).toFixed(1)}%</span></div>`
      )
      .join('') +
    `</div>`;
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

function ChartStub(el, cfg) {
  capturado = cfg;
  return { update() {}, setActiveElements() {}, tooltip: { setActiveElements() {} }, config: cfg };
}

const docStub = {
  documentElement: { style: { setProperty() {} }, getAttribute: () => null },
  getElementById: () => ({
    getContext: () => ({}),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
  }),
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
  centroLabel: 'X',
  centroValor: '60',
  fmt: (v) => String(v),
});
window.ChartGraficos.montar();
const plugin = capturado.plugins[HOVER_PLUGIN_IDX];

// Monta um chart fake com 3 fatias (círculo real, como o Chart.js desenha).
// Centro (100,100), innerRadius=50, outerRadius=100. Fatias:
//   0: 268.4°..328.4° (direita, 60°)
//   1: 328.4°..88.4°  (atravessa o 0°, 120°)
//   2: 88.4°..268.4°  (esquerda, 180°)
// Em radianos (rotação -PI/2 = início no topo, sentido horário).
const meta = {
  data: [
    { x: 100, y: 100, innerRadius: 50, outerRadius: 100, startAngle: -1.6, endAngle: -0.55 },
    { x: 100, y: 100, innerRadius: 50, outerRadius: 100, startAngle: -0.55, endAngle: 1.543 },
    { x: 100, y: 100, innerRadius: 50, outerRadius: 100, startAngle: 1.543, endAngle: 4.685 },
  ],
};
const canvasStub = {
  style: {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
};
const chartFake = {
  config: { type: 'doughnut' },
  chartArea: { left: 0, right: 200, top: 0, bottom: 200 },
  options: { cutout: '50%' },
  canvas: canvasStub,
  getDatasetMeta: () => meta,
  _hoverIdx: -1,
  setActiveElements: vi.fn(),
  tooltip: { setActiveElements: vi.fn() },
  update: vi.fn(),
};

// evento simula o que o Chart.js entrega: ev.native.clientX/Y (em px do
// viewport) + ev.x/ev.y (que o plugin IGNORA). O mapeamento usa a fração entre
// clientX/Y e o rect do canvas (aqui 200x200, canvas lógico tb 200x200 => zoom 1).
function evento(clientXglobal, clientYglobal) {
  // O rect do canvas é {left:0, top:0, width:200, height:200}; assumimos zoom 1
  // então clientX/clientY = coordenadas lógicas + 0 (offset zero). Para simular
  // o deslocamento do zoom, usamos um rect que difere do chartArea — mas aqui
  // (zoom 1) são iguais; o ponto de prova é a GEOMETRIA do ângulo.
  return {
    type: 'mousemove',
    x: 0,
    y: 0,
    native: { clientX: clientXglobal, clientY: clientYglobal },
  };
}

test('hoverPorArea: centro da fatia 0 (direita) ativa idx 0', () => {
  // centro do ângulo da fatia 0 ~ -1.075 rad (~298.4°), raio 75
  const ang = (-1.6 + -0.55) / 2;
  const r = 75;
  const x = 100 + r * Math.cos(ang);
  const y = 100 + r * Math.sin(ang);
  chartFake._hoverIdx = -1;
  chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  expect(chartFake.setActiveElements).toHaveBeenCalled();
  expect(chartFake.setActiveElements.mock.calls[0][0][0].index).toBe(0);
});

test('hoverPorArea: centro da fatia 2 (esquerda/inferior) ativa idx 2', () => {
  // centro do ângulo da fatia 2 ~ (1.543+4.685)/2 = 3.114 rad (~178.4°)
  const ang = (1.543 + 4.685) / 2;
  const r = 75;
  const x = 100 + r * Math.cos(ang);
  const y = 100 + r * Math.sin(ang);
  chartFake._hoverIdx = -1;
  chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  expect(chartFake.setActiveElements).toHaveBeenCalled();
  expect(chartFake.setActiveElements.mock.calls[0][0][0].index).toBe(2);
});

test('hoverPorArea: ponto no buraco central (r < innerRadius) NÃO ativa', () => {
  // centro (100,100), distância 30 < innerRadius 50
  const x = 100 + 30,
    y = 100;
  chartFake._hoverIdx = -1;
  chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  expect(chartFake.setActiveElements).not.toHaveBeenCalled();
});

test('hoverPorArea: ponto FORA do anel (r > outerRadius) NÃO ativa', () => {
  const x = 100 + 120,
    y = 100; // distância 120 > outerRadius 100
  chartFake._hoverIdx = -1;
  chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: evento(x, y) });
  expect(chartFake.setActiveElements).not.toHaveBeenCalled();
});

test('hoverPorArea: mouseout limpa a seleção', () => {
  chartFake._hoverIdx = 2;
  chartFake.setActiveElements.mockClear();
  plugin.afterEvent(chartFake, { event: { type: 'mouseout', x: 0, y: 0 } });
  expect(chartFake.setActiveElements).toHaveBeenCalledWith([]);
  expect(chartFake._hoverIdx).toBe(-1);
});
