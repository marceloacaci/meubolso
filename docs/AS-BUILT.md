# AS-BUILT — MeuBolso v1.0.0 (Beta)

> **As-Built** = documentação do sistema **como ele efetivamente foi construído**,
> não como foi planejado. Todo item abaixo foi verificado no código-fonte em
> `D:\Project` e cita `arquivo:linha`.
>
> Data do levantamento: agosto/2026 · Commit base: `dde72a4`
> Responsável técnico: Marcelo Acácio

### Histórico de correções (changelog deste documento)

| Data | Correção | Refs |
|------|----------|------|
| 05/ago/2026 | **D-01** data local (fim do `toISOString` UTC) em `hoje()` + datas dos formulários | `app.js:17`, `app.js:parcelasParaFormulario` |
| 05/ago/2026 | **D-02** somatórios monetários em centavos (`somaDinheiro`/`numDinheiro`) | `src/dominio.js` (totalDivida, totalPago, saldoDivida, valorPagoParcela, sincronizarParcela); usados por `app.js` via wrappers |
| 05/ago/2026 | **D-03** `nivelDe()` passou a seguir a tabela `NIVEIS`; barra de XP via `progressoNivel()` | `src/dominio.js:nivelDe`, `src/dominio.js:progressoNivel` |
| 05/ago/2026 | **Etapa 1** extração do domínio para `src/dominio.js` + suíte Vitest (58 testes) | `src/dominio.js`, `tests/*.test.js`, `index.html` |
| 05/ago/2026 | **Etapa 2** escrita atômica (`src/persistencia.js`) + CI (`ci.yml`) | `src/persistencia.js`, `.github/workflows/ci.yml` |

| 05/ago/2026 | **Etapa 3** integridade de dados: `schemaVersion` + JSON Schema (ajv) + `migrarSchema` idempotente + recuperação automática de backup (`loadFromDB`) | `src/integridade.js`, `docs/schema/meubolso.schema.json`, `tests/integridade.test.js` |
| 14/ago/2026 | **Sprint 4** recorrentes, juros/CET, metas, simulador e conquistas (S4-1..S4-5) | `src/dominio.js` (`cet`,`calcularJurosDivida`,`simularQuitacao`), `views/{recorrentes,metas,juros,simulador}.js`, `app.js` (handlers CRUD), `index.html` (nav), `src/ui/modais.js` (checkbox), i18n pt/en/es, `tests/sprint4.test.js` |
| 14/ago/2026 | **fix(S4)** validação visual em runtime pegou `estado.recorrentes/metas` undefined no load (DB vazio/legado); corrigido em `carregar()`, estado inicial e `fallbackData()` | `app.js` (carregar + estado), `main.js` (fallbackData); `validate-s4.cjs` (validação funcional Electron) |
| 14/ago/2026 | **Sprint 5** busca/filtros (S5-1), ordenação/paginação (S5-5), atalhos (S5-4), export CSV/PDF (S5-2), notificações de vencimento (S5-3), anexos (S5-6) · **release v1.2.0** | `src/dominio.js` (`filtrarDividas`,`filtrarPagamentos`,`ordenarDividas`,`ordenarPagamentos`,`paginar`), `views/{dividas,pagamentos,relatorio}.js`, `app.js` (handlers + `definirFiltro`/`limparFiltro`/`verificarNotificacoes`/`anexarAnexoPagamento`/`abrirAnexo`/`gerarCSV`/`exportarCSV`/`exportarPDF`/`focarBusca`), `main.js` (IPC `dados:exportar-csv`,`dados:exportar-pdf`,`notificar:vencimento`,`anexo:selecionar`), `preload.js` (`exportarCSV`,`exportarPDF`,`notificarVencimento`,`selecionarAnexo`), i18n pt/en/es, `tests/sprint5.test.js`, `validate-s5.cjs` |

> Status verificado por suíte automatizada: **88/88 testes** Vitest verdes (`npm run test`) em 14/ago/2026. Validação funcional em runtime (`validate-s5.cjs`) PASSOU em **6/6 itens** (S5-4, S5-1, S5-5, S5-2, S5-3, S5-6) com **0 erros de console**. Ajuste de bug em `filtrarDividas`: critério de status passou a considerar o status real das parcelas (quitado = todas pagas; em dia = sem atraso) em vez de saldo.

---

## 1. Identificação

| Item | Valor |
|------|-------|
| Produto | **MeuBolso** |
| Versão | `1.0.0` (Beta) |
| appId | `com.meubolso.app` |
| Tipo | Aplicação desktop *standalone*, offline, mono-usuário |
| Domínio | Finanças pessoais — dívidas, parcelas, pagamentos, carteiras |
| Licença | MIT |
| Repositório | https://github.com/marceloacaci/meubolso |
| Plataformas-alvo | Windows (NSIS + portable x64), Linux (AppImage + deb x64), macOS (dmg x64 + arm64) |

## 2. Stack real (verificada em `package.json`)

| Camada | Tecnologia | Como está no projeto |
|--------|-----------|----------------------|
| Shell desktop | Electron `^43.2.0` | devDependency |
| Empacotador | electron-builder `^25.1.8` | devDependency |
| Auto-update | electron-updater `^6.3.9` | **única** dependency de runtime |
| UI framework | Vue 3 (build `vue.global.prod.js`) | **vendored offline** em `vendor/`, sem bundler |
| CSS framework | Bootstrap 5.3.3 | vendored (`vendor/bootstrap.min.css` + `.bundle.min.js`) |
| Gráficos | Chart.js (UMD) | vendored (`vendor/chart.umd.js`) |
| Persistência | **Arquivo JSON** via `fs.writeFileSync` | `main.js:57-93` |
| Build de front | **Nenhum** (sem webpack/vite/babel/TS) | scripts JS carregados direto pelo `index.html` |
| Testes | **Inexistentes** | ⚠️ lacuna conhecida |

> Nota histórica importante: a persistência passou por `node:sqlite` → `sql.js` (WASM)
> → **JSON puro**. O estado atual é JSON simples e síncrono. Ver ADR sugerido em
> `docs/ARTEFATOS-RECOMENDADOS.md` §3.

## 3. Inventário de código (LOC reais)

| Arquivo | Linhas | Papel |
|---------|-------:|-------|
| `app.js` | 3.519 | **Renderer monolítico**: estado, i18n (PT/EN/ES), regras de negócio, render de todas as views, gamificação, modais |
| `main.js` | 296 | Processo principal: janela, IPC, persistência, backup, auto-update |
| `icons.js` | 149 | Mapa de ícones SVG inline |
| `graficos-chartjs.js` | 143 | Wrappers de Chart.js (pizza/rosca/barras) |
| `relogio.js` | 69 | Relógio/saudação do cabeçalho |
| `preload.js` | 28 | `contextBridge` → `window.api` |
| `views/*.js` | 199 (9 arquivos) | Componentes Vue finos, delegam HTML às funções `renderX()` de `app.js` |
| `styles.css` | ~53 KB | Tema claro/escuro, componentes, animações |
| `index.html` | ~10 KB | Shell, sidebar, CSP |
| **Total JS** | **≈ 4.400** | — |

**Débito estrutural nº 1:** `app.js` concentra ~80% do código. É o principal
impedimento para testabilidade e para onboarding de qualquer segundo desenvolvedor.

## 4. Arquitetura de processos (real)

```
┌───────────────────────────────────────────────────────────┐
│ MAIN PROCESS — main.js                                    │
│  • initPaths()  → userData/{meubolso.json, dados.bak.json,│
│                    dados.json, pontos.bak.json}           │
│  • createWindow() 1024..1366 x 700..800, menu removido,   │
│    contextIsolation: true, nodeIntegration: false         │
│  • 13 handlers ipcMain                                    │
│  • iniciarAutoUpdate() (só se app.isPackaged)             │
└───────────────▲───────────────────────────────────────────┘
                │ ipcRenderer.invoke (structured clone)
┌───────────────┴───────────────────────────────────────────┐
│ PRELOAD — preload.js (contextBridge)                      │
│  window.api = { carregar, salvar, salvarAgora, caminho,   │
│    sistemaInfo, exportar, importar, restaurar,            │
│    fazerBackup, backupInfo, flashFoco, abrirLink }        │
│  paraPlano(): JSON.parse(JSON.stringify(x)) — necessário  │
│  porque o structured clone NÃO serializa Proxy do Vue     │
└───────────────▲───────────────────────────────────────────┘
                │ window.api.*
┌───────────────┴───────────────────────────────────────────┐
│ RENDERER — app.js + views/*.js + vendor/*                 │
│  estado reativo → render() → persistir() → window.api     │
└───────────────────────────────────────────────────────────┘
```

**Postura de segurança verificada:**
- `contextIsolation: true`, `nodeIntegration: false` (`main.js:117-119`) ✅
- CSP restritiva em `index.html:5-6`: `default-src 'self'`. Ressalva: usa
  `'unsafe-eval'` (exigido pelo Vue global build com templates em string) e
  `'unsafe-inline'` para estilos. ⚠️ mitigável migrando para render functions.
- `link:abrir` valida esquema com `/^https?:\/\//i` antes de `shell.openExternal`
  (`main.js:209-215`) ✅ — previne `file://` / `javascript:`.
- `escapeHtml()` aplicado no texto de toasts de XP (`app.js:1210`) ✅.
  ⚠️ Porém boa parte das views monta HTML por concatenação de string; o dado é do
  próprio usuário (risco baixo, self-XSS), mas é um vetor a fechar.

## 5. Modelo de dados persistido (`meubolso.json`)

Contrato implícito, extraído de `normalizar()` (`main.js:44-50`) e do uso em `app.js`:

```jsonc
{
  "dividas": [                       // Array<Divida>
    {
      "id": "string",                // uid(): base36(timestamp) + random
      "descricao": "string",
      "categoria": "emprestimo|cartao|servico|outro",
      "parcelas": [
        { "id": "string", "numero": 1, "valor": 0.0,
          "vencimento": "YYYY-MM-DD",
          "status": "pendente|pago|atrasado|negociado" }
      ]
    }
  ],
  "pagamentos": [                    // Array<Pagamento>
    { "id": "string", "dividaId": "string", "parcelaId": "string",
      "valor": 0.0, "data": "YYYY-MM-DD", "carteiraId": "string|null" }
  ],
  "carteiras": [
    { "id": "string", "nome": "string", "saldo": 0.0 }
  ],
  "gamificacao": {
    "xp": 0, "nivel": 1,
    "historico": [ { "pontos": 10, "motivo": "xp.pagamento",
                     "nivel": 2, "horario": "..." } ]   // máx. 100 registros
  },
  "configuracoes": { "moeda": "BRL" }
}
```

Invariantes garantidas por código:
- `normalizar()` força `dividas`/`pagamentos`/`carteiras` a serem arrays e cria
  `configuracoes` default → nunca há `undefined` no carregamento.
- `historico` é truncado em 100 entradas (`app.js:1194`).
- `sincronizarParcela()` (`app.js:200`) recalcula o status da parcela a partir da
  soma dos pagamentos vinculados — **a fonte da verdade do status é o somatório**,
  não o campo em si.

## 6. Contrato IPC (equivalente à "API" do sistema)

| Canal | Direção | Entrada | Saída | Linha |
|-------|---------|---------|-------|-------|
| `dados:carregar` | R→M | — | objeto estado (ou `fallbackData()`) | `main.js:136` |
| `dados:salvar` | R→M | estado plano | `boolean` | `main.js:143` |
| `dados:salvar-agora` | R→M | estado plano | `boolean` | `main.js:149` |
| `dados:caminho` | R→M | — | caminho do `meubolso.json` | `main.js:156` |
| `sistema:info` | R→M | — | `{appVersion, electron, node, chrome, so, arquitetura, dbType, backup}` | `main.js:158` |
| `dados:fazer-backup` | R→M | — | `{ok, caminho}` | `main.js:169` |
| `dados:backup-info` | R→M | — | `{existe, modificadoEm, tamanho}` | `main.js:174` |
| `dados:restaurar` | R→M | — | `{ok, dados}` ou `{ok:false, erro}` | `main.js:184` |
| `dados:exportar` | R→M | — | `{ok, caminho}` (abre `showSaveDialog`) | `main.js:216` |
| `dados:importar` | R→M | — | `{ok, dados, caminho}` (abre `showOpenDialog`) | `main.js:233` |
| `janela:flash-foco` | R→M | — | `boolean` (workaround de repaint) | `main.js:200` |
| `link:abrir` | R→M | `url:string` | `boolean` (valida http/https) | `main.js:209` |

> `dados:salvar` e `dados:salvar-agora` hoje fazem **exatamente a mesma coisa**
> (`saveToDB` síncrono). Duplicação legada do tempo em que havia debounce.
> Candidato a remoção.

## 7. Estratégia de persistência e resiliência (como está)

1. Renderer altera estado → chama `persistir()` (`app.js:1396`).
2. `preload.paraPlano()` desserializa o Proxy Vue → objeto plano.
3. `main.saveToDB()`:
   a. `fazerBackup()` copia `meubolso.json` → `dados.bak.json` **antes** de sobrescrever
      (não faz backup se o arquivo não existe ou tem 0 bytes);
   b. extrai `gamificacao` e grava cópia separada em `pontos.bak.json`;
   c. `fs.writeFileSync` do JSON completo (síncrono, sem debounce).
4. Na carga: `loadFromDB()` valida `Array.isArray(dividas && pagamentos)`; se falhar,
   devolve `fallbackData()` vazio.

**Riscos identificados:**
- 🔴 `writeFileSync` direto **não é atômico**: queda de energia durante a escrita pode
  deixar o JSON truncado. Mitigação padrão: escrever em `.tmp` + `fs.renameSync`.
- 🟠 Escrita **completa a cada alteração** — O(tamanho do estado) por clique.
  Aceitável hoje; degrada com milhares de pagamentos.
- 🟠 `loadFromDB()` **não** cai automaticamente no `dados.bak.json` quando o principal
  está corrompido — devolve estado vazio e exige restauração manual pelo usuário.
- 🟢 Backup rotativo de 1 geração + backup dedicado de pontuação + export/import manual.

Localização dos dados:
`%APPDATA%\Roaming\meubolso\` (Win) · `~/Library/Application Support/meubolso/` (macOS) · `~/.config/meubolso/` (Linux)

## 8. Regras de negócio implementadas

**Financeiro** (`app.js:129-233`)
- `totalDivida(d)` = Σ valores das parcelas.
- `totalPago(d)` = Σ pagamentos vinculados à dívida.
- `saldoDivida(d)` = total − pago.
- `valorPagoParcela()` / `sincronizarParcela()`: status da parcela derivado do pago
  acumulado (pendente → pago; vencido e não quitado → atrasado).
- Carteiras: pagamento debita a carteira (`aplicarDebitoCarteira`, `app.js:2962`),
  exclusão/edição estorna (`estornarDebitoCarteira`, `app.js:2996`).

**Gamificação** (`src/dominio.js`, extraída de `app.js` na Etapa 1 — S1-2)
- `nivelDe(xp)` segue os **limiares da tabela `NIVEIS`** (não-lineares: 0, 100, 200, 300, 400, 600, 800, 1000, 1300, 1600). ✅ Defeito D-03 corrigido.
- `progressoNivel(xp)` retorna o progresso (0..1) **dentro** do nível atual usando o intervalo real da tabela — a barra de XP zera ao subir de nível.
- `NIVEIS` (10 títulos, Iniciante → Lenda das Finanças) permanece declarada em `app.js` por causa dos rótulos `titulo`, usados por `tituloNivel()`.
- Tabela de pontuação efetiva:

| Ação | XP | Linha |
|------|---:|-------|
| Registrar dívida | +10 | `app.js:1814` |
| Editar dívida | +5 | `app.js:1871` |
| Excluir dívida | −10 | `app.js:1910` |
| Registrar pagamento | +15 | `app.js:1981` |
| Editar pagamento | +8 | `app.js:2078` |
| Quitar dívida integralmente | +50 | `app.js:2227` |
| Gestão de dívida | +5 | `app.js:2228` |
| Excluir pagamento | −5 | `app.js:2337` |
| Criar carteira | +20 | `app.js:3014` |
| Editar carteira | +5 | `app.js:3029` |
| Acesso ao app | +3 | `app.js:3493` |

- Histórico limitado a 100 entradas (`truncarHistorico`); `recalcularHistorico()` faz migração retroativa idempotente (gestão 30→5) e **recalcula o nível de cada entrada**.
- Subida de nível dispara overlay `celebrarNivel()` + confete em canvas, protegido por `try/catch`.

✅ **Inconsistência D-03 RESOLVIDA** (05/ago): `nivelDe()` passou a seguir os limiares da tabela `NIVEIS`; antes usava progressão linear de 100 em 100 (600 XP → função retornava 7, tabela dizia 6). Verificado por teste (`tests/gamificacao.test.js`).

**Cálculo financeiro** (extraído para `src/dominio.js` na Etapa 1 — S1-2; `app.js` mantém wrappers finos que injetam `estado.pagamentos` via `globalThis`)
- `somaDinheiro()` (centavos inteiros) + `numDinheiro()` eliminam erros de float (D-02). ✅ Corrigido.
- `totalDivida`, `totalPago`, `saldoDivida`, `valorPagoParcela`, `sincronizarParcela`, `resumoParcelas` operam sobre os pagamentos da dívida.
- `valorPagoParcela()` / `sincronizarParcela()`: status da parcela derivado do pago acumulado (pendente → parcial → pago; vencido e não quitado → atrasado).
- Carteiras: pagamento debita a carteira (`aplicarDebitoCarteira`, `app.js:2962`), exclusão/edição estorna (`estornarDebitoCarteira`, `app.js:2996`).

## 8.1 Defeitos latentes (CORRIGIDOS em 05/ago/2026)

| ID | Defeito | Evidência | Status | Correção |
|----|---------|-----------|--------|----------|
| D-01 | `hoje()` (`app.js:17`) usava `toISOString()` → data **UTC**, não local | Em 05/08 23:30 BRT retornava `2026-08-06` | ✅ **Corrigido** | `hoje()` agora monta a data com `getFullYear/getMonth/getDate` (fuso local); `parcelasParaFormulario` também corrigido (e evita estouro de mês) |
| D-02 | Somatórios financeiros usavam **float** | `0.1+0.2 = 0.30000000000000004` | ✅ **Corrigido** | Helper `somaDinheiro()` (centavos inteiros) + `numDinheiro()`; todos os `totalDivida/totalPago/valorPagoParcela/sincronizarParcela/calcularMetricas/renderRelatorio/formulários` passam por eles; comparação de quitação por `Math.round(*100)` |
| D-03 | `NIVEIS` × `nivelDe()` divergiam a partir do nível 6 | 600 XP → tabela 6, função 7 | ✅ **Corrigido** | `nivelDe()` passou a usar os limiares da tabela `NIVEIS`; barra de XP usa `progressoNivel()` (intervalo real do nível); const `XP_POR_NIVEL` removida |


## 9. Interface e experiência

- **9 views**: Painel, Dívidas, Pagamentos, Vencimentos, Carteiras, Relatório,
  Gamificação, Configurações, Sobre (`index.html:30-67` + `views/`).
- Navegação por sidebar retrátil com grupos; roteamento por `viewRef`/`setView()`
  (`app.js:263`, `app.js:1417`) — sem router.
- **i18n completo PT/EN/ES** por dicionário chave→string em `app.js` (~380 chaves por
  idioma, linhas ~300-655); aplicação via `data-i18n` + `t()`/`ti()`.
- Tema claro/escuro (`aplicarTema`, `app.js:681`), preferências persistidas.
- ~95 dicas financeiras rotativas trilíngues (`DICAS`, `app.js:29`).
- Acessibilidade: respeita `prefers-reduced-motion`; `aria-label` nos canvases.
- Insights automáticos calculados em `calcularMetricas()`/`gerarInsights()` (`app.js:794-861`).

## 10. Build, release e distribuição

```
npm start                  → electron .
npm run dist:win|linux|mac → electron-builder
```
- Artefatos: `MeuBolso-1.0.0-setup.exe`, `MeuBolso-1.0.0-portable.exe`, `.AppImage`,
  `.deb`, `.dmg` (x64 + arm64) — saída em `dist/`.
- NSIS: não-oneClick, per-user, diretório escolhível, atalho na área de trabalho.
- Publicação: provider `github`, owner `marceloacaci`, repo `meubolso`.
- CI: `.github/workflows/release.yml`.
- Auto-update: `electron-updater` só ativa com `app.isPackaged` — em dev é no-op.
- `sync-portable.bat`: script auxiliar de sincronização da versão portátil.

## 11. Conformidade e privacidade

- **Zero telemetria, zero rede** (exceto a checagem de update no GitHub e links
  abertos explicitamente pelo usuário).
- Todos os dados residem na máquina do usuário, em claro (JSON não criptografado).
- LGPD: como não há tratamento de dados por terceiro nem transferência, o app está
  fora do escopo de controlador/operador. ⚠️ Porém o arquivo em claro é legível por
  qualquer processo do mesmo usuário — considerar criptografia opcional (ver Brainstorm).

## 12. Lacunas conhecidas (resumo executivo)

| # | Lacuna | Severidade | Estado |
|---|--------|-----------|-------|
| L1 | Nenhum teste automatizado em 4.400 LOC de lógica financeira | 🔴 Alta | ✅ **Resolvido** (S1-1..S1-4: 58 testes) |
| L2 | Escrita de arquivo não atômica (risco de corrupção) | 🔴 Alta | ✅ **Resolvido** (S1-5: src/persistencia.js + CI S1-6) |
| **D-01** | **Datas gravadas em UTC, não local (§8.1)** — ✅ corrigido em 05/ago | ~~🔴 Alta~~ Resolvido |
| **D-02** | **Aritmética financeira em float (§8.1)** — ✅ corrigido em 05/ago | ~~🔴 Alta~~ Resolvido |
| L3 | `app.js` monolítico com 3.519 linhas | 🟠 Média | ⬜ |
| L4 | Fallback automático para backup não implementado na carga | 🟠 Média | ✅ **Resolvido** (S2-4: loadFromDB recupera dados.bak.json) |
| L5 | Incoerência entre tabela `NIVEIS` e `nivelDe()` | 🟠 Média | ✅ **Corrigido** (05/ago) |
| L6 | CSP com `unsafe-eval`/`unsafe-inline` | 🟠 Média | ⬜ |
| L7 | Sem CHANGELOG, sem ADRs, sem JSON Schema versionado | 🟡 Baixa | ✅ **Resolvido** (docs/schema/meubolso.schema.json + S2-2) |
| L8 | Handlers IPC duplicados (`dados:salvar` vs `dados:salvar-agora`) | 🟡 Baixa | ⬜ |
| L9 | Sem versionamento/migração de schema dos dados | 🟠 Média | ✅ **Resolvido** (S2-1/S2-3: schemaVersion + migrarSchema idempotente) |
