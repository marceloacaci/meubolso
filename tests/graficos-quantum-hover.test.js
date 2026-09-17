import { test, expect, vi } from 'vitest';

let capturado = null;
let ultimoMeta = null;
function ChartStub(el, cfg) {
  capturado = cfg;
  const meta = {
    data: [
      {
        options: {
          offset: 0,
          backgroundColor: '#ff0000',
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        getCenterPoint: () => ({ x: 50, y: 50 }),
      },
      {
        options: {
          offset: 0,
          backgroundColor: '#00ff00',
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        getCenterPoint: () => ({ x: 150, y: 150 }),
      },
    ],
  };
  ultimoMeta = meta;
  const chartInstance = {
    canvas: el,
    config: cfg,
    data: cfg.data || { datasets: [{}] },
    options: cfg.options || {},
    getDatasetMeta: () => meta,
    setActiveElements: vi.fn(),
    tooltip: { setActiveElements: vi.fn() },
    update: vi.fn(),
  };
  return chartInstance;
}

const docStub = {
  documentElement: {
    style: { setProperty() {} },
    getAttribute: (attr) => (attr === 'data-theme' ? 'dark' : null),
  },
  getElementById: (id) => ({
    id,
    getContext: () => ({}),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    style: {},
  }),
};

global.window = global;
global.Chart = ChartStub;
global.document = docStub;
global.getComputedStyle = () => ({ getPropertyValue: () => '#2d6a4f' });

vi.resetModules();
await import('../graficos-chartjs.js');

test('ChartGraficos: registra e monta doughnut com itens e metadados quânticos', () => {
  window.ChartGraficos.registrar('quantum-doughnut', {
    tipo: 'doughnut',
    labels: ['Alimentação', 'Transporte'],
    valores: [300, 100],
    cores: ['#ff0000', '#00ff00'],
    centroLabel: 'Total',
    centroValor: 'R$ 400,00',
    fmt: (v) => 'R$ ' + v,
    items: [
      { label: 'Alimentação', valor: 300, valorFmt: 'R$ 300,00', pct: '75.0%', cor: '#ff0000' },
      { label: 'Transporte', valor: 100, valorFmt: 'R$ 100,00', pct: '25.0%', cor: '#00ff00' },
    ],
  });

  window.ChartGraficos.montar();
  expect(capturado).toBeTruthy();
  expect(capturado.type).toBe('doughnut');
  expect(capturado.options.cutout).toBe('62%');
  expect(capturado.options.plugins.tooltip.enabled).toBe(false);
  expect(capturado.data.datasets[0].hoverOffset).toBe(0);
});

test('ChartGraficos.ativarHover e desativarHover: ativa fatia com destacamento suave (7.5px), spotlight e sem popup no doughnut', () => {
  window.ChartGraficos.registrar('test-hover-action', {
    tipo: 'doughnut',
    labels: ['Cartão', 'Empréstimo'],
    valores: [500, 200],
    cores: ['#3b82f6', '#ef4444'],
    centroLabel: 'Total',
    centroValor: 'R$ 700,00',
    fmt: (v) => 'R$ ' + v,
  });
  window.ChartGraficos.montar();

  // Ativa hover no índice 0 em doughnut: fatia 0 deve se destacar suavemente com 7.5px
  window.ChartGraficos.ativarHover('test-hover-action', 0);
  expect(ultimoMeta.data[0].options.offset).toBe(7.5);
  expect(ultimoMeta.data[1].options.offset).toBe(0);

  // Desativa hover: todas as fatias voltam para offset = 0
  window.ChartGraficos.desativarHover('test-hover-action');
  expect(ultimoMeta.data[0].options.offset).toBe(0);
  expect(ultimoMeta.data[1].options.offset).toBe(0);
});

test('ChartGraficos: registra gráfico de barras com suporte a hover rico e tooltip habilitado', () => {
  window.ChartGraficos.registrar('quantum-bar', {
    tipo: 'bar',
    labels: ['Pendente', 'Pago'],
    valores: [5, 10],
    cores: ['#f59e0b', '#10b981'],
    fmt: (v) => v + ' parcelas',
  });

  window.ChartGraficos.montar();
  expect(capturado.type).toBe('bar');
  expect(capturado.options.plugins.tooltip.enabled).toBe(true);
});
