// Modais e confirmações (S3-3: extraído de app.js).
// Script clássico carregado APÓS app.js: consome os globais t(), escapeHtml(),
// ICON e window.api (definidos em app.js). Expõe abrirModal/fecharModal/
// abrirConfirmacao/modalFoiAlterado/tentarFecharModal como globais.
function abrirModal(titulo, campos, onSubmit, opcoes) {
  const o = opcoes || {};
  // Constrói HTML como string. Substitui o modal-card inteiro, garantindo
  // que não haja estado residual entre aberturas (handlers, .value, focus).
  const modalCard = document.querySelector('.modal-card');
  modalCard.classList.remove('modal-card--gestao'); // garante modal padrão

  const escapeAttr = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const camposHtml = campos.map(c => {
  let inputHtml;
  if (c.type === 'select') {
    const optionsHtml = c.options.map(opt => {
      const sel = String(opt.value) === String(c.value) ? ' selected' : '';
      return `<option value="${escapeAttr(opt.value)}"${sel}>${escapeHtml(opt.label)}</option>`;
    }).join('');
    inputHtml = `<select class="form-select" name="${escapeAttr(c.name)}"${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''}>${optionsHtml}</select>`;
  } else if (c.type === 'checkbox') {
    inputHtml = `<div class="form-check"><input class="form-check-input" type="checkbox" name="${escapeAttr(c.name)}"${c.value ? ' checked' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''} /></div>`;
  } else if (c.type === 'textarea') {
    inputHtml = `<textarea class="form-control" name="${escapeAttr(c.name)}" rows="3"${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''}>${escapeHtml(c.value || '')}</textarea>`;
  } else if (c.type === 'password') {
    // Campo de senha com opção "Visualizar senha" (checkbox) para o usuário
    // confirmar o que está digitando ao criar/trocar senha.
    inputHtml = `<div class="senha-wrap">
      <input class="form-control" type="password" name="${escapeAttr(c.name)}"${c.value !== undefined && c.value !== null ? ` value="${escapeAttr(c.value)}"` : ''}${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''} />
      <label class="senha-ver"><input type="checkbox" class="senha-ver-check" /> ${escapeHtml(t('cripto.verSenha') || 'Visualizar senha')}</label>
    </div>`;
  } else {
    inputHtml = `<input class="form-control" type="${escapeAttr(c.type || 'text')}" name="${escapeAttr(c.name)}"${c.value !== undefined && c.value !== null ? ` value="${escapeAttr(c.value)}"` : ''}${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.step ? ` step="${escapeAttr(c.step)}"` : ''}${c.inputmode ? ` inputmode="${escapeAttr(c.inputmode)}"` : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''} />`;
  }
  return `<div class="mb-3"><label class="form-label">${escapeHtml(c.label)}</label>${inputHtml}</div>`;
  }).join('');

  const msgHtml = o.mensagem ? `<p class="modal-msg">${escapeHtml(o.mensagem)}</p>` : '';
  const acaoSecHtml = (o.acaoSecundaria && o.acaoSecundaria.texto)
    ? `<button type="button" id="btn-acao-secundaria" class="btn btn-ghost">${escapeHtml(o.acaoSecundaria.texto)}</button>`
    : '';
  const customHtml = o.customHtml ? o.customHtml : '';

  modalCard.innerHTML = `
    <button type="button" class="modal-fechar" data-acao="fechar-modal-x" aria-label="${escapeAttr(t('modal.fechar'))}">×</button>
    <h2 id="modal-titulo">${escapeHtml(titulo)}</h2>
    ${msgHtml}
    <form id="form-modal" novalidate>
      <div id="campos-form">${camposHtml}</div>
      ${customHtml}
      <div id="resumo-parcelas"></div>
      <div class="form-actions">
        <button type="button" id="btn-cancelar" class="btn btn-ghost">${t('acao.cancelar')}</button>
        ${acaoSecHtml}
        <button type="submit" id="btn-salvar" class="btn btn-primary">${t('acao.salvar')}</button>
      </div>
    </form>
  `;

  // Mostra o modal
  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  // Captura o estado inicial dos campos para detectar alterações não salvas.
  modalSnapshotInicial = capturarModalSnapshot();

  // Amarra os handlers no form NOVO
  const form = document.getElementById('form-modal');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Coleta por NAME (não por índice) para não se confundir com inputs
    // auxiliares do modal (ex.: checkbox "Visualizar senha" do campo password).
    const valores = {};
    campos.forEach((c) => {
      const el = form.querySelector(`[name="${c.name}"]`);
      if (!el) { valores[c.name] = ''; return; }
      if (c.type === 'checkbox') valores[c.name] = !!el.checked;
      else valores[c.name] = el.value ?? '';
    });
    // Só fecha o modal se o onSubmit retornar um valor diferente de false.
    // Assim, validações (ex.: senhas não conferem) que retornam false mantêm o
    // modal aberto para o usuário corrigir, em vez de fechar silenciosamente.
    const resultado = await onSubmit(valores);
    if (resultado !== false) fecharModal();
  });

  document.getElementById('btn-cancelar').onclick = tentarFecharModal;
  // Botão de ação secundária (ex.: "Entrar sem senha" no desbloqueio).
  if (o.acaoSecundaria && o.acaoSecundaria.aoClicar) {
    const btnSec = document.getElementById('btn-acao-secundaria');
    if (btnSec) btnSec.onclick = () => { fecharModal(); o.acaoSecundaria.aoClicar(); };
  }
  // Toggle "Visualizar senha": mostra ENQUANTO o check estiver marcado e oculta
  // ao desmarcar (só reaparece se marcar de novo). O seletor pega o input do
  // próprio .senha-wrap independente do type — assim funciona nas duas transições
  // (password->text e text->password); usar input[type="password"] quebra ao
  // desmarcar, pois o campo já virou text e o seletor não o encontra mais.
  modalCard.querySelectorAll('.senha-ver-check').forEach(chk => {
    chk.onclick = () => {
      const inp = chk.closest('.senha-wrap').querySelector('input');
      if (inp) inp.type = chk.checked ? 'text' : 'password';
    };
  });
  // Callback de montagem (ex.: seleção de perfil com lista customizada).
  if (typeof o.aoMontar === 'function') o.aoMontar(modalCard);
  // A janela NÃO fecha ao clicar fora dela (modal-overlay). Assim o usuário
  // não perde os dados digitados se o mouse sair da janela e ele clicar fora.
  // O fechamento ocorre apenas pelos botões da própria janela (Salvar/Cancelar).

  // Foco no primeiro campo.
  // Destrava o foco "preso" do Electron (bug pós-IPC pesado). Equivale a
  // minimizar/maximizar a janela, mas feito via flashFoco() no main process.
  const primeiro = form.querySelector('input, select, textarea');
  if (primeiro) {
    window.api.flashFoco();
    setTimeout(() => {
      primeiro.focus();
      if (primeiro.value && primeiro.select) {
        primeiro.select();
      }
    }, 100);
  }
}

function fecharModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.querySelector('.modal-card')?.classList.remove('modal-card--gestao');
  modalSnapshotInicial = ''; // limpa o rastreamento de alterações ao fechar
}

// ---------- Detecção de alterações não salvas nos modais ----------
// Captura um "snapshot" estável dos valores dos campos do modal atual para
// detectar se o usuário digitou algo diferente desde a abertura.
let modalSnapshotInicial = '';
function capturarModalSnapshot() {
  const modal = document.getElementById('modal');
  if (!modal || modal.classList.contains('hidden')) return '';
  const campos = modal.querySelectorAll('input, select, textarea');
  return Array.from(campos)
    .map(e => `${e.name || e.id || ''}=${e.value || ''}`)
    .sort().join('|');
}
function modalFoiAlterado() {
  if (!modalSnapshotInicial) return false;
  return capturarModalSnapshot() !== modalSnapshotInicial;
}
// Fecha o modal, mas pergunta confirmação se houve alterações não salvas.
function tentarFecharModal() {
  if (!modalFoiAlterado()) { fecharModal(); return; }
  abrirConfirmacao({
    titulo: t('acao.fechar'),
    mensagem: t('msg.confirmFecharSemSalvar'),
    textoConfirmar: t('acao.fecharSemSalvar'),
    textoCancelar: t('acao.continuarEditando'),
    perigo: false,
    aoConfirmar: () => fecharModal()
  });
}

// ---------- Modal de confirmação customizado (visual consistente com o sistema) ----------
// Substitui o `confirm()` nativo (janela do SO) por um modal estilizado igual aos
// demais do app. Reaproveita o overlay #modal e o .modal-card para manter o mesmo
// visual, elementos e botões (Cancelar = btn-ghost, Confirmar = btn-danger/primary).
// opções: { titulo, mensagem, textoConfirmar, textoCancelar, perigo, aoConfirmar, aoCancelar }
// Retorna uma Promise<boolean> que resolve true (confirmou) ou false (cancelou).
function abrirConfirmacao(opts) {
  return new Promise((resolve) => {
    const o = opts || {};
    const modal = document.getElementById('modal');
    const modalCard = document.querySelector('.modal-card');
    if (!modal || !modalCard) { resolve(false); return; }
    modalCard.classList.remove('modal-card--gestao');

    // Preserva o conteúdo do modal "pai" (ex.: formulário em edição) para
    // restaurá-lo caso o usuário CANCELE a confirmação (continuar editando).
    const htmlAnterior = modalCard.innerHTML;

    const escapeAttr = (s) => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const isPerigo = o.perigo !== false; // perigo por padrão (exclusões)
    const clsConfirmar = isPerigo ? 'btn btn-danger' : 'btn btn-primary';
    modalCard.innerHTML = `
      <div class="confirm-card ${isPerigo ? 'confirm-card--perigo' : ''}">
        <div class="confirm-ico" aria-hidden="true">${isPerigo ? ICON.alerta : ICON.info}</div>
        <h2 id="confirm-titulo" class="confirm-titulo">${escapeHtml(o.titulo || t('acao.excluir'))}</h2>
        <p class="confirm-msg">${escapeHtml(o.mensagem || '')}</p>
        <div class="form-actions confirm-acoes">
          <button type="button" class="btn btn-ghost" id="confirm-cancelar">${escapeHtml(o.textoCancelar || t('acao.cancelar'))}</button>
          <button type="button" class="btn ${isPerigo ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${escapeHtml(o.textoConfirmar || t('acao.excluir'))}</button>
        </div>
      </div>`;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    const restaurarAnterior = () => { modalCard.innerHTML = htmlAnterior; };

    const btnCancelar = document.getElementById('confirm-cancelar');
    const btnOk = document.getElementById('confirm-ok');
    // Cancelar = NÃO sair: restaura o formulário e mantém o modal aberto.
    if (btnCancelar) btnCancelar.onclick = () => {
      restaurarAnterior();
      if (typeof o.aoCancelar === 'function') o.aoCancelar();
      resolve(false);
    };
    // Confirmar = executa a ação e fecha o modal.
    if (btnOk) btnOk.onclick = () => {
      if (typeof o.aoConfirmar === 'function') o.aoConfirmar();
      fecharModal();
      resolve(true);
    };
    // Foco no botão de confirmação para navegação por teclado.
    if (btnOk) { window.api.flashFoco(); setTimeout(() => btnOk.focus(), 60); }
  });
}

// Delegação: o botão "X" (fechar) em qualquer modal dispara a tentativa de fechar.
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest('[data-acao="fechar-modal-x"]')) {
    tentarFecharModal();
  }
});

