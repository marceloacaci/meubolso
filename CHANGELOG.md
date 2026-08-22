# Changelog

Todas as versões notáveis deste projeto seguem o formato
[Keep a Changelog](https://keepachangelog.com/) e o versionamento
[SemVer](https://semver.org/).

## [2.1.0] — 2026-08-19

Release estável (antes `v2.0.0-rc`). Foco: hardening, acessibilidade, performance e
melhorias de tema/UI (relevo raised, contraste absoluto, cabeçalho com relevo).

### Adicionado

- **S6-7 — Multiperfis:** seleção/troca de perfil, criptografia por perfil, tag "Ativo"
  no perfil efetivamente logado, card de usuário (busto SVG) na sidebar; Configurações
  Rápidas com barra minimalista de **Dados** (ícones Backup/Exportar/Importar/Restaurar)
  e card **Perfis de dados**. Suíte Vitest 108/108.
- **UI/Theme pass 2:** relevo raised (50/50) em scrollbar (thumb com linha cortante,
  track neutro, estados hover/active; hex fixos por tema para contornar `color-mix` em
  `::-webkit-scrollbar-thumb`), `.btn-ghost` (Cancelar/Voltar/ação secundária) com raised;
  contraste absoluto (preto/branco) em títulos/textos/labels via `--text`/`--text-muted`
  (venceu `!important` do Bootstrap em `.text-secondary`); cards de filtros isolados via
  `:has([data-filtro])`; `.page-header` com raised + sombra e título/botão centralizados
  na linha do relevo (padding simétrico); correção de cantos quadrados (variável
  `--radius` restaurada); card de Insights com fundo consistente; seção "Novidades" no
  Sobre. Suíte Vitest **126/126**.
- **S6-4 — Auditoria de acessibilidade (WCAG 2.1 AA):**
  - Skip-link "Pular para o conteúdo" (primeiro elemento focável) + `#app` com `tabindex="-1"`.
  - Foco visível global `:focus-visible` (anel `2px solid var(--primary)`).
  - Script de auditoria `scripts/audit-a11y.cjs` (8/8 critérios em Electron headless, 0 erros).
  - Checklist em `docs/auditoria/ACCESSIBILITY-WCAG21-AA.md`.
- **S6-5 — Teste de carga:** `scripts/bench-carga.cjs` (500 dívidas / 5.000 pagamentos).
- **S6-6 — Documentação:** `docs/ADR.md` (6 ADRs), CHANGELOG, As-Built e Cronograma atualizados.
- **Lixeira (trash) durável (B6/B7):** exclusão passa a ser _soft-delete_ para
  dívidas (com pagamentos vinculados), carteiras, recorrentes e metas. Itens vão
  para `estado.lixeira` (persistido) e podem ser **restaurados** ou **excluídos
  definitivamente** (por item ou "Esvaziar tudo"). Botão "Lixeira" no grupo
  Sistema da navegação + badge de contagem. View com 4 seções (Dívidas,
  Carteiras, Recorrentes, Metas) e rótulos pt/en/es.
  - _Regra de integridade:_ nenhum dado é perdido na exclusão; o metadado
    interno `_excluidoEm` não vaza para o estado ativo após restaurar.
- **Separação de ambientes de dados (dev / portátil / instalado):** `initPaths()`
  em `main.js` agora grava em pastas distintas conforme o ambiente — desenvolvimento
  em `%APPDATA%/meubolso/`, portátil na **própria pasta do executável**, e instalado
  em `%APPDATA%/meubolso/<versão>/` (isolado por versão do release). Lógica em
  `src/caminhos-dados.js` (função pura, testada) + 4 testes em
  `tests/caminhos-dados.test.js`. Página **Sobre** exibe o ambiente ativo e o
  caminho exato do arquivo de dados (pt/en/es).
- **Sistema de atualização estilo comercial (B8):** ao detectar nova versão, o app
  exibe (1) modal **"Atualização disponível"** com versão, relatório de fix/atualizações
  (release notes), tamanho e botões _Atualizar agora_ / _Lembrar depois_; (2) modal de
  **progresso** com barra e percentual; (3) ao baixar, modal **"Reiniciar agora ou depois"**.
  - _Instalado (NSIS):_ usa `electron-updater` (auto-download desligado; o usuário decide);
    instala ao reiniciar. O `latest.yml` da release é requerido para o auto-update.
  - _Portátil:_ mecanismo próprio — baixa o asset `*-portable.exe` da última release
    do GitHub e, ao reiniciar, um `.bat` auxiliar troca o executável e relança (sem
    download manual). Reaproveita os mesmos modais.
  - _Migração de dados entre versões (instalado):_ ao abrir versão nova, os dados da
    pasta da versão anterior são **copiados** para a atual (nunca movidos/apagados antes
    da cópia); pastas de versões obsoletas sem dados são removidas. Lógica em
    `src/caminhos-dados.js` (`executarMigracaoFS`, pura e testada) + 3 testes em
    `tests/migracao-dados.test.js`. UI em `src/ui/atualizacao.js` (estilo `abrirConfirmacao`);
    i18n pt/en/es (`upd.*`) e CSS em `styles.css`.

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
