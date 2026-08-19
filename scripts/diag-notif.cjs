// Diagnóstico de notificação NATIVA do sistema (Windows Toast / macOS / Linux).
// Roda com o próprio Electron, fora do app, para provar que o SO consegue
// exibir a notificação com a mesma API que o main.js usa.
//   Uso:  npx electron scripts/diag-notif.cjs
// Esperado: um Toast aparece na tela e o console mostra { ok: true }.
const { Notification, app } = require('electron');

app.whenReady().then(() => {
  const payload = { titulo: 'MeuBolso (diag)', corpo: 'Teste de notificação nativa — se você ver este Toast, o canal funciona.' };
  try {
    const n = new Notification({
      title: payload.titulo,
      body: payload.corpo,
      timeoutType: 'default',
      urgency: 'normal',
    });
    n.on('show', () => console.log('[DIAG] Notification SHOW disparado -> Toast visível na tela'));
    n.on('click', () => { console.log('[DIAG] usuário clicou no Toast'); app.quit(); });
    n.on('failed', (_e, reason) => console.warn('[DIAG] falhou:', reason));
    n.show();
    console.log('[DIAG] new Notification().show() chamado. Aguardando 4s para o Toast aparecer...');
    setTimeout(() => { console.log('[DIAG] fim do teste (ok:true se o Toast apareceu)'); app.quit(); }, 4000);
  } catch (err) {
    console.error('[DIAG] ERRO ao criar Notification:', err && err.message);
    app.quit();
  }
});
