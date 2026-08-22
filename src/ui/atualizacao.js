// Telas de atualização do sistema (estilo comercial), no mesmo molde visual
// de abrirConfirmacao (reaproveita o overlay #modal + .modal-card do app).
// Script clássico carregado APÓS app.js/modais.js: consome t(), escapeHtml(),
// ICON, window.api e os eventos IPC de atualização.
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const fmtBytes = (n) => {
    n = Number(n) || 0;
    if (n <= 0) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) {
      n /= 1024;
      i++;
    }
    return (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + ' ' + u[i];
  };

  const escapeAttr = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Abre o overlay #modal com conteúdo customizado (igual abrirConfirmacao).
  function abrirModalUpdate(html) {
    const modal = document.getElementById('modal');
    const card = document.querySelector('.modal-card');
    if (!modal || !card) return null;
    card.classList.remove('modal-card--gestao');
    card.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    return { modal, card };
  }
  function fecharModalUpdate() {
    const modal = document.getElementById('modal');
    const card = document.querySelector('.modal-card');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (card) card.classList.remove('modal-card--gestao');
  }

  // ---- 1) Atualização disponível ----
  function mostrarDisponivel(info) {
    const versao = info.version || '?';
    const notas = info.releaseNotes ? String(info.releaseNotes) : '';
    const tamanho = fmtBytes(info.sizeBytes);
    const notasHtml = notas
      ? `<div class="upd-notas">${escapeHtml(notas).replace(/\n/g, '<br>')}</div>`
      : `<p class="upd-notas-vazio">${t('upd.semNotas')}</p>`;
    abrirModalUpdate(`
      <div class="upd-card">
        <div class="upd-ico" aria-hidden="true">${ICON.atualizar || ICON.raio}</div>
        <h2 class="upd-titulo">${t('upd.disponivelTitulo')}</h2>
        <div class="upd-meta">
          <span class="upd-badge">${escapeHtml(versao)}</span>
          <span class="upd-tamanho">${t('upd.tamanho')}: ${tamanho}</span>
        </div>
        <p class="upd-sub">${t('upd.disponivelSub')}</p>
        ${notasHtml}
        <div class="form-actions upd-acoes">
          <button type="button" class="btn btn-ghost" id="upd-depois">${t('upd.lembrarDepois')}</button>
          <button type="button" class="btn btn-primary" id="upd-agora">${ICON.baixar || ''} ${t('upd.atualizarAgora')}</button>
        </div>
      </div>`);
    const btnAgora = document.getElementById('upd-agora');
    const btnDepois = document.getElementById('upd-depois');
    if (btnAgora)
      btnAgora.onclick = () => {
        fecharModalUpdate();
        const url = info.downloadUrl || null;
        window.api.updateBaixar(url).catch(() => {});
        mostrarProgresso();
      };
    if (btnDepois)
      btnDepois.onclick = () => {
        fecharModalUpdate();
        window.api.updateAdiar().catch(() => {});
        if (window.mostrarToast) window.mostrarToast(t('upd.adiado'), 'info');
      };
    if (btnAgora) {
      window.api.flashFoco();
      setTimeout(() => btnAgora.focus(), 60);
    }
  }

  // ---- 2) Progresso do download ----
  function mostrarProgresso() {
    abrirModalUpdate(`
      <div class="upd-card">
        <div class="upd-ico upd-ico--spin" aria-hidden="true">${ICON.atualizar || ICON.raio}</div>
        <h2 class="upd-titulo">${t('upd.baixandoTitulo')}</h2>
        <div class="progress upd-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="progress-bar upd-bar" id="upd-bar" style="width:0%"></div>
        </div>
        <div class="upd-percent" id="upd-percent">0%</div>
        <div class="upd-detalhe" id="upd-detalhe"></div>
        <div class="form-actions upd-acoes">
          <button type="button" class="btn btn-ghost" id="upd-ocultar">${t('upd.ocultar')}</button>
        </div>
      </div>`);
    const ocultar = document.getElementById('upd-ocultar');
    if (ocultar) ocultar.onclick = () => fecharModalUpdate();
  }
  function atualizarProgresso(p) {
    const bar = document.getElementById('upd-bar');
    const pct = document.getElementById('upd-percent');
    const det = document.getElementById('upd-detalhe');
    const percent = Math.max(0, Math.min(100, Number(p.percent) || 0));
    if (bar) bar.style.width = percent + '%';
    if (pct) pct.textContent = percent + '%';
    if (det && p.total) det.textContent = `${fmtBytes(p.transferred)} / ${fmtBytes(p.total)}`;
    // Mantém o progresso visível caso o usuário tenha ocultado.
    const modal = document.getElementById('modal');
    if (modal && modal.classList.contains('hidden')) {
      // reabre sem botões de ação (continua baixando em segundo plano)
      mostrarProgresso();
    }
  }

  // ---- 3) Baixado: reiniciar agora ou depois ----
  function mostrarBaixado() {
    abrirModalUpdate(`
      <div class="upd-card">
        <div class="upd-ico upd-ico--ok" aria-hidden="true">${ICON.check || ICON.raio}</div>
        <h2 class="upd-titulo">${t('upd.prontoTitulo')}</h2>
        <p class="upd-sub">${t('upd.prontoSub')}</p>
        <div class="form-actions upd-acoes">
          <button type="button" class="btn btn-ghost" id="upd-depois2">${t('upd.depois')}</button>
          <button type="button" class="btn btn-primary" id="upd-reiniciar">${t('upd.reiniciarAgora')}</button>
        </div>
      </div>`);
    const dep = document.getElementById('upd-depois2');
    const rein = document.getElementById('upd-reiniciar');
    if (dep)
      dep.onclick = () => {
        fecharModalUpdate();
        if (window.mostrarToast) window.mostrarToast(t('upd.instalaraAoFechar'), 'info');
      };
    if (rein)
      rein.onclick = () => {
        fecharModalUpdate();
        window.api.updateInstalarAgora().catch(() => {});
      };
    if (rein) {
      window.api.flashFoco();
      setTimeout(() => rein.focus(), 60);
    }
  }

  // ---- 4) Erro ----
  function mostrarErro(e) {
    if (window.mostrarToast)
      window.mostrarToast(t('upd.erro') + (e && e.message ? ': ' + e.message : ''), 'erro');
  }

  // ---- Wiring dos eventos do main ----
  function iniciar() {
    if (!window.api || !window.api.onUpdate) return;
    window.api.onUpdate('update:disponivel', mostrarDisponivel);
    window.api.onUpdate('update:progresso', atualizarProgresso);
    window.api.onUpdate('update:baixado', mostrarBaixado);
    window.api.onUpdate('update:erro', mostrarErro);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  window.__mbAtualizacao = {
    mostrarDisponivel,
    mostrarProgresso,
    mostrarBaixado,
    mostrarErro,
    atualizarProgresso,
  };
})();
