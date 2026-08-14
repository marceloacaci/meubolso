# ADRs — MeuBolso

> Architecture Decision Records. Cada decisão de arquitetura do projeto, com
> contexto, decisão e consequências. Mantido em sincronia com o `AS-BUILT.md`.
> Convenção: `ADR-NNN — Título (status: aceito|obsoleto)`.

---

## ADR-001 — Persistência em arquivo JSON simples (status: aceito)

**Contexto:** O app é desktop, offline, mono-usuário. A camada de integridade
(ajv/schema/migração, `src/integridade.js`) foi REMOVIDA numa refatoração
em andamento para simplificar o runtime. O histórico mostra idas e voltas
(node:sqlite → sql.js/WASM → JSON). O usuário precisa de ZERO risco de perda
dos dados já inseridos.

**Decisão:** Persistir em `meubolso.json` (JSON puro) via `fs` síncrono, com
escrita atômica (`src/persistencia.js`: grava em `.tmp-<pid>-<ts>` + `renameSync`)
e backup automático para `dados.bak.json` + `pontos.bak.json` a cada salvamento,
mais backup rotativo de 7 gerações em `backups/`. Sem schema versionado nem
migrações no momento (foi removido conscientemente).

**Consequências:**
- ✅ Leitura/escrita trivial; sem dependência de banco.
- ✅ Recuperação de `dados.bak.json` quando o principal está corrompido/inválido.
- ⚠️ Sem migração automática de schema — dados antigos sem uma chave nova
  dependem de `normalizar()`/`fallbackData()` para não quebrar. Aceitável para
  v1 (público pequeno, 1 desenvolvedor).
- ⚠️ Sem criptografia por padrão (há opção AES-256-GCM opt-in, ADR-005).

---

## ADR-002 — Vue 3 sem bundler (runtime global + render functions) (status: aceito)

**Contexto:** O app carrega scripts por `<script src>` no `index.html` (sem
webpack/vite). O Vue original era o build "global" (com compiler), o que
exigia `'unsafe-eval'` na CSP. S6-1 removeu o `unsafe-eval`.

**Decisão:** Usar `vendor/vue.runtime.global.prod.js` (runtime-only, sem
compiler) + views como componentes Vue cujos templates são **render functions**
(`Vue.h(...)`), não strings. Sem toolchain de build.

**Consequências:**
- ✅ CSP sem `unsafe-eval` (S6-1 cumprido); app funcional.
- ✅ Zero dependência de bundler; `index.html` carrega tudo por CDN local.
- ⚠️ Cada view precisa de render function manual (mais verboso que SFC).
- ⚠️ Globais compartilhados entre `<script>` (cuidado com colisão de
  identificador e TDZ — ver `AS-BUILT.md` §8.1 e a skill `meubolso-app-dev`).

---

## ADR-003 — Extração de domínio para funções puras testáveis (status: aceito)

**Contexto:** O `app.js` chegou a 3.519 LOC concentrando regras de negócio,
i18n e render. Impossível testar cálculo financeiro sem o renderer.

**Decisão:** Extrair funções PURAS (cálculo de juros/CET, quitação, filtros,
ordenação, paginação, gamificação) para `src/dominio.js`, expostas via
`globalThis` (browser) e `module.exports` (Node/Vitest). Funções que dependem
de estado recebem o estado como argumento; o `app.js` mantém wrappers finos
que injetam `estado.pagamentos`.

**Consequências:**
- ✅ Suíte Vitest cobre o domínio financeiro (93 testes hoje).
- ✅ `app.js` reduzido de 3.519 → 2.613 LOC.
- ⚠️ Wrapper global/função pura: o teste em Node não resolve `totalPago`
  solto (usa `globalThis`); usar `vm` para simular o escopo de script.

---

## ADR-004 — Escrita atômica + recuperação de backup (status: aceito)

**Contexto:** Risco de corrupção de `meubolso.json` em queda de energia durante
a escrita (S1-5 / L2 do As-Built).

**Decisão:** `src/persistencia.js: salvarArquivoAtomico()` grava em arquivo
temporário e renomeia atomicamente. `main.js:loadFromDB()` valida o formato e,
se inválido, recorre a `dados.bak.json` (re-salvando a versão recuperada).

**Consequências:**
- ✅ Sem JSON truncado; recuperação automática de backup corrompido.
- ⚠️ Escrita completa do estado a cada alteração (O(tamanho)); aceitável até
  milhares de pagamentos (S6-5 confirmou < 15 ms em 500 dívidas / 5.000 pagamentos).

---

## ADR-005 — Criptografia opcional AES-256-GCM (status: aceito)

**Contexto:** Dados financeiros em claro no disco são legíveis por qualquer
processo do mesmo usuário (L11 do As-Built).

**Decisão:** `src/cripto.js` com AES-256-GCM via `node:crypto` (PBKDF2
200k iterações, salt+iv+tag em prefixo `MBENC1:`). Ativação opt-in por
`configuracoes.criptografia.ativa`; senha em sessão (`senhaSessao`). Sem senha
= comportamento atual (JSON aberto).

**Consequências:**
- ✅ Dados em repouso protegidos quando o usuário opta.
- ⚠️ Opt-in: quem não ativa fica em claro (decisão deliberada de não impor
  atrito ao usuário).
- ⚠️ Travamento de senha na sessão; sem ela o arquivo cifrado não abre.

---

## ADR-006 — Otimização de leitura de pagamentos por índice (status: aceito)

**Contexto:** S6-5 (teste de carga) mostrou `resumoParcelas`/`totalPago`
varrendo os 5.000 pagamentos para CADA dívida (O(P) por dívida) → 93 ms com
500 dívidas, passando do limite de 100 ms.

**Decisão:** `_indicePorDivida(pagamentos)` indexa pagamentos por `dividaId`
em um `Map`, cacheado por **referência do array** (o app cria array novo a cada
mutação em `estado.pagamentos`, invalidando o cache). `totalPago`, `saldoDivida`,
`valorPagoParcela`, `sincronizarParcela` e `resumoParcelas` usam o índice.

**Consequências:**
- ✅ `resumoParcelas` × 500 dívidas caiu de 93 ms → 4,7 ms (~20×).
- ✅ Invalidação automática por troca de referência do array (sem stale cache).
- ⚠️ Pequeno overhead de reconstruir o Map uma vez por array de pagamentos
  (O(P), amortizado); irrelevante frente ao ganho.
