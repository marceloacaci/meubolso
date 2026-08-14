# Changelog

Todas as versões notáveis deste projeto seguem o formato
[Keep a Changelog](https://keepachangelog.com/) e o versionamento
[SemVer](https://semver.org/).

## [2.0.0-rc] — 2026-08-14

Release candidato de saída do Beta. Foco: hardening, acessibilidade e performance.

### Adicionado
- **S6-4 — Auditoria de acessibilidade (WCAG 2.1 AA):**
  - Skip-link "Pular para o conteúdo" (primeiro elemento focável) + `#app` com `tabindex="-1"`.
  - Foco visível global `:focus-visible` (anel `2px solid var(--primary)`).
  - Script de auditoria `scripts/audit-a11y.cjs` (8/8 critérios em Electron headless, 0 erros).
  - Checklist em `docs/auditoria/ACCESSIBILITY-WCAG21-AA.md`.
- **S6-5 — Teste de carga:** `scripts/bench-carga.cjs` (500 dívidas / 5.000 pagamentos).
- **S6-6 — Documentação:** `docs/ADR.md` (6 ADRs), CHANGELOG, As-Built e Cronograma atualizados.

### Alterado
- **S6-5 — Performance:** indexação de pagamentos por `dividaId` (`src/dominio.js`).
  `resumoParcelas` × 500 dívidas caiu de **93 ms → 4,7 ms** (~20×); todas as
  operações de domínio agora < 15 ms (limite do cronograma: 100 ms).
- **UI — Barras de progresso:** removida `transition: width` de
  `.barra-progresso-preenchimento` (a view é reaplicada via `v-html` a cada
  `render()`, o que reiniciava a animação e deixava a barra "nunca fixada").
- **UI — Lista de Dívidas:** cabeçalhos de coluna (Descrição/Total/Saldo) deixaram
  de ser clicáveis (eram links de ordenação).
- **UI — Barra de Pagamentos:** correção de typo de classe (`barra-progreso` →
  `barra-progresso`) que fazia a barra perder o gradiente verde.

### Segurança
- **S6-1 — CSP sem `unsafe-eval`:** Vue 3 runtime-only + render functions
  (`vendor/vue.runtime.global.prod.js`); `script-src 'self'`.
- **S6-2 — Auditoria XSS:** `escapeHtml()`/`escapeAttr()` sistemáticos em
  `views/*.js` e `src/ui/modais.js`; `scripts/audit-xss.cjs` valida (0 vivos).
- **S6-3 — Criptografia opcional AES-256-GCM** (`src/cripto.js`, opt-in):
  PBKDF2 200k iterações + GCM; sem senha = JSON aberto.

---

## [1.2.0] — 2026-08-14 (release estável)

### Adicionado (Sprint 5 — Funcionalidades II e UX)
- Busca e filtros em Dívidas/Pagamentos (texto, categoria, status, período).
- Exportar relatório em PDF e dados em CSV.
- Notificações de vencimento (nativas do SO, 3 dias antes).
- Atalhos de teclado (Ctrl+N, Ctrl+P, Ctrl+F, 1..9).
- Ordenação e paginação das listas.
- Anexos de comprovante (imagem/PDF) por pagamento.

---

## [1.1.0] — 2026-09 (release de refatoração)

### Adicionado (Sprint 3 — Refatoração do monólito)
- Extração de i18n (`src/i18n/{pt,en,es}.js`).
- Extração de gamificação para `src/dominio.js`.
- Extração de modais para `src/ui/modais.js`.
- Cada `renderX()` movido para `views/*.js` (componentes Vue).
- Smoke test de render real (`validate-render.cjs`).

---

## [1.0.0] — Beta (base do cronograma)

### Adicionado (Sprints 1–2 — Fundação e Integridade)
- Suíte Vitest + domínio financeiro extraído (S1).
- Escrita atômica de arquivo + CI (S1-5/S1-6).
- Schema versionado + migrações + validação (S2-1/2/3, depois simplificado).
- Recuperação automática de `dados.bak.json` (S2-4).
- Backup rotativo de 7 gerações (S2-5).
- Correções de correção de dados: D-01 (data local), D-02 (centavos),
  D-03 (tabela de níveis) — confirmadas por execução.
