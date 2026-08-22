// Lógica pura de notificação nativa do sistema operacional (Windows Toast /
// macOS / Linux). Extraída de main.js para ser testável sem o runtime do
// Electron: recebe o payload e as dependências (Notification + plataforma) e
// devolve { ok, motivo? }. O main.js apenas delega para cá.
'use strict';

function criarNotificacaoNativa(payload, deps) {
  deps = deps || {};
  const Notification =
    deps.Notification || (typeof globalThis !== 'undefined' ? globalThis.Notification : undefined);
  const platform =
    deps.platform != null ? deps.platform : typeof process !== 'undefined' ? process.platform : '';

  const titulo = (payload && payload.titulo) || 'MeuBolso';
  const corpo = (payload && payload.corpo) || '';
  if (!corpo) return { ok: false, motivo: 'vazio' };

  // Em ambientes sem suporte (algumas distros Linux sem daemon de notificação),
  // a criação pode lançar — tratamos para não quebrar o app.
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') {
    try {
      const n = new Notification({
        title: titulo,
        body: corpo,
        timeoutType: 'default',
        urgency: 'normal',
      });
      n.show();
      return { ok: true };
    } catch (err) {
      return { ok: false, motivo: String(err && err.message) };
    }
  }
  return { ok: false, motivo: 'so-nao-suportado' };
}

module.exports = { criarNotificacaoNativa };
