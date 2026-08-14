// Testes de regressão para reconciliarPagamentosAposEdicao (bug: ao editar
// dívida já paga, a página de Pagamentos mostrava o valor ANTIGO).
import { test, expect } from 'vitest';
import {
  reconciliarPagamentosAposEdicao,
  resumoParcelas,
} from '../src/dominio.js';

test('dívida já paga editada (aumentar valor + marcar paga) atualiza o registro de pagamento', () => {
  const divida = {
    id: 'd1',
    parcelas: [{ id: 'p1', numero: 1, valor: 100, status: 'pago', valorPago: 100, dataPagamento: '2030-01-01' }]
  };
  // registro antigo (valor 100)
  const pagamentos = [{ id: 'pg1', dividaId: 'd1', parcelaId: 'p1', valor: 100, data: '2030-01-01', nota: '', carteiraId: null }];

  // usuário edita a dívida: parcela sobe para 200 e segue paga
  divida.parcelas = [{ id: 'p1', numero: 1, valor: 200, status: 'pago', valorPago: 200, dataPagamento: '2030-02-02' }];

  const nova = reconciliarPagamentosAposEdicao(divida, pagamentos);
  const reg = nova.find(p => p.dividaId === 'd1' && p.parcelaId === 'p1');
  expect(reg).toBeDefined();
  expect(reg.valor).toBe(200);
  expect(reg.status).toBe('pago');
  expect(reg.dataPagamento).toBe('2030-02-02');
  // a view Pagamentos lê de estado.pagamentos -> agora reflete 200, não 100
  expect(reg.valor).not.toBe(100);
});

test('parcela que voltou a pendente remove o registro órfão', () => {
  const divida = {
    id: 'd2',
    parcelas: [{ id: 'p9', numero: 1, valor: 150, status: 'pendente', valorPago: 0, dataPagamento: '' }]
  };
  const pagamentos = [{ id: 'pg9', dividaId: 'd2', parcelaId: 'p9', valor: 150, data: '2030-01-01', nota: '', carteiraId: null }];

  const nova = reconciliarPagamentosAposEdicao(divida, pagamentos);
  const reg = nova.find(p => p.dividaId === 'd2' && p.parcelaId === 'p9');
  expect(reg).toBeUndefined();
});

test('parcela paga sem registro prévio cria o registro (upsert)', () => {
  const divida = {
    id: 'd3',
    parcelas: [{ id: 'p3', numero: 1, valor: 80, status: 'pago', valorPago: 80, dataPagamento: '2030-03-03' }]
  };
  const pagamentos = []; // nenhum registro ainda

  const nova = reconciliarPagamentosAposEdicao(divida, pagamentos);
  const reg = nova.find(p => p.dividaId === 'd3' && p.parcelaId === 'p3');
  expect(reg).toBeDefined();
  expect(reg.valor).toBe(80);
  expect(reg.dividaId).toBe('d3');
  expect(reg.parcelaId).toBe('p3');
});

test('não lança e preserva outros registros de outras dívidas', () => {
  const divida = {
    id: 'd4',
    parcelas: [{ id: 'p4', numero: 1, valor: 50, status: 'pago', valorPago: 50, dataPagamento: '2030-04-04' }]
  };
  const pagamentos = [
    { id: 'outro', dividaId: 'd99', parcelaId: 'px', valor: 999, data: '2030-01-01', nota: '', carteiraId: null }
  ];

  const nova = reconciliarPagamentosAposEdicao(divida, pagamentos);
  const outro = nova.find(p => p.dividaId === 'd99');
  expect(outro).toBeDefined();
  expect(outro.valor).toBe(999);
  const reg = nova.find(p => p.dividaId === 'd4');
  expect(reg.valor).toBe(50);
});

test('sincroniza o cache da parcela (resumo reflete o novo valor)', () => {
  const divida = {
    id: 'd5',
    parcelas: [{ id: 'p5', numero: 1, valor: 100, status: 'pago', valorPago: 100, dataPagamento: '2030-01-01' }]
  };
  const pagamentos = [{ id: 'pg5', dividaId: 'd5', parcelaId: 'p5', valor: 100, data: '2030-01-01', nota: '', carteiraId: null }];

  divida.parcelas = [{ id: 'p5', numero: 1, valor: 300, status: 'pago', valorPago: 300, dataPagamento: '2030-05-05' }];
  reconciliarPagamentosAposEdicao(divida, pagamentos);

  const r = resumoParcelas(divida, pagamentos);
  expect(r.valorPago).toBe(300);
  expect(r.percentualPago).toBe(100);
});
