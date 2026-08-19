# Cronograma de Desenvolvimento — 3 meses

**Projeto:** MeuBolso · **Base:** v1.0.0 Beta (commit `dde72a4`)
**Período:** Agosto → Outubro/2026 · **Equipe:** 1 desenvolvedor (part-time)
**Método:** Sprints de 2 semanas · 6 sprints

---

## Premissas e capacidade

- Capacidade assumida: **~12 h/semana** ⇒ **~24 h por sprint** ⇒ ~144 h no trimestre.
- Estimativas em **pontos**, sendo 1 ponto ≈ 2 h efetivas. Capacidade ≈ **12 pts/sprint**.
- Toda sprint termina com: código na `master`, testes verdes, CHANGELOG atualizado.
- Releases: **v1.1.0** (fim do mês 1), **v1.2.0** (fim do mês 2), **v2.1.0** (fim do mês 3, pós-multiperfis) |

## Objetivos do trimestre (OKR)

| Objetivo | Resultado-chave | Meta |
|----------|-----------------|------|
| **O1 — Confiabilidade** | Cobertura de testes na lógica financeira | ≥ 70% |
| | Incidentes de perda/corrupção de dados | 0 |
| **O2 — Manutenibilidade** | Maior arquivo do projeto | < 800 LOC |
| | Decisões arquiteturais registradas em ADR | 100% |
| **O3 — Valor ao usuário** | Sair do Beta para **1.0 estável** | v2.1.0 pronta |
| | 3 funcionalidades novas de alto impacto entregues | 3/3 |

---

## Visão geral

| Sprint | Período | Tema | Entrega |
|--------|---------|------|---------|
| S1 | 05–18/ago | **Fundação de qualidade** | Testes + CI + escrita atômica |
| S2 | 19/ago–01/set | **Integridade de dados** | Schema versionado + migrações + recuperação |
| S3 | 02–15/set | **Refatoração do monólito** | `app.js` quebrado em módulos · **v1.1.0** |
| S4 | 16–29/set | **Funcionalidades I** | Recorrências, juros, metas |
| S5 | 30/set–13/out | **Funcionalidades II + UX** | Filtros, busca, PDF/CSV · **v1.2.0** |
| S6 | 14–27/out | **Hardening e saída do Beta** | Segurança, a11y, performance, docs, **multiperfis** · **v2.1.0** |

---

## Sprint 1 — Fundação de qualidade (05–18/ago) · 12 pts

> Sem isto nada mais é seguro de mudar. Prioridade absoluta.

| ID | Tarefa | Pts | Critério de aceite | Status |
|----|--------|----:|--------------------|--------|
| S1-1 | Configurar **Vitest** + estrutura `tests/` | 2 | `npm test` roda e passa | ✅ **FEITO** |
| S1-2 | Extrair funções puras de cálculo para `src/dominio.js` | 3 | App funciona idêntico; funções importáveis | ✅ **FEITO** |
| S1-3 | Testes unitários do domínio financeiro | 3 | 26 casos verdes | ✅ **FEITO** |
| S1-4 | Testes de gamificação | 2 | 32 casos verdes | ✅ **FEITO** |
| S1-5 | **Escrita atômica**: `writeFileSync(tmp)` + `renameSync` em `saveToDB()` | 1 | Kill do processo durante escrita não corrompe o JSON | ✅ **FEITO** |
| S1-6 | GitHub Action de CI: lint + test em push/PR | 1 | Badge verde no README | ✅ **FEITO** |
| **S1-7** | **Corrigir D-01**: `hoje()` deve usar data **local**, não `toISOString()` (UTC) | 1 | Teste com fuso UTC−3 às 23h30 retorna o dia corrente | ✅ **FEITO** |
| **S1-8** | **Corrigir D-02**: arredondar somatórios a 2 casas / migrar para centavos inteiros | 2 | Soma de 0,1 + 0,2 fecha em 0,30; dívida quitada zera exatamente | ✅ **FEITO** |

> ⚠️ S1-7 e S1-8 tratam de defeitos **confirmados por execução** — ver
> `docs/AS-BUILT.md` §8.1. São correções de dado errado, não melhorias.
> Total real da sprint: 15 pts — sobrecarga de 3 pts assumida conscientemente, com
> S1-4 como candidata a deslizar para a S2 se necessário.

**Riscos:** extrair funções de um arquivo de 3.519 linhas pode quebrar referências
implícitas via `window.MeuBolso`. Mitigação: extrair **só funções puras** nesta sprint.

---

## Sprint 2 — Integridade de dados (19/ago–01/set) · 12 pts · ✅ **FEITO**

| ID | Tarefa | Pts | Critério de aceite | Status |
|----|--------|----:|--------------------|--------|
| S2-1 | `schemaVersion` no arquivo de dados + `docs/schema/meubolso.schema.json` | 2 | Arquivos antigos recebem `schemaVersion: 1` ao carregar | ✅ **FEITO** |
| S2-2 | Motor de **migrações** idempotentes (`migrarSchema` encadeado) | 3 | Migração idempotente e testada | ✅ **FEITO** |
| S2-3 | **Validação** contra o JSON Schema (ajv) na carga/importação | 2 | Arquivo inválido é recusado com erro legível | ✅ **FEITO** |
| S2-4 | **Recuperação automática**: se `meubolso.json` estiver corrompido, tentar `dados.bak.json` | 2 | Teste com JSON truncado recupera os dados | ✅ **FEITO** |
| S2-5 | **Backup rotativo de N gerações** (7 diários) em vez de 1 | 2 | Pasta `backups/` com rotação, tela de restauração lista as datas | ✅ **FEITO** |
| S2-6 | Remover handler IPC duplicado `dados:salvar` | 1 | Nenhuma referência remanescente | ✅ **FEITO** |

**Marco:** ✅ risco 🔴 L2 e 🟠 L4/L9 do As-Built eliminados.

---

## Sprint 3 — Refatoração do monólito (02–15/set) · 12 pts · **release v1.1.0** · ✅ **FEITO**

| ID | Tarefa | Pts | Critério de aceite | Status |
|----|--------|----:|--------------------|--------|
| S3-1 | Extrair **i18n** (~1.100 linhas de dicionários) para `src/i18n/{pt,en,es}.js` | 2 | `app.js` reduz ~30%; troca de idioma inalterada | ✅ **FEITO** |
| S3-2 | Extrair **gamificação** para `src/dominio.js` | 2 | Testes da S1-4 continuam verdes | ✅ **FEITO** (Etapa 1 / S1-2) |
| S3-3 | Extrair **modais/confirmação** para `src/ui/modais.js` | 2 | Fluxos de dívida/pagamento inalterados | ✅ **FEITO** |
| S3-4 | Extrair cada `renderX()` para o `views/*.js` correspondente | 3 | `app.js` < 800 LOC | ✅ **FEITO** |
| S3-5 | Script de verificação por render real no Electron (canvas pixel count) como *smoke test* | 2 | Detecta gráfico em branco | ✅ **FEITO** (`validate-render.cjs`) |
| S3-6 | Corrigir a incoerência **`NIVEIS` × `nivelDe()`** (limiares não lineares vs. 100 em 100) | 1 | Decisão registrada em ADR + teste | ✅ **FEITO** (D-03 / Etapa 1) |

**Release v1.1.0** — sem feature nova visível; nota de release honesta:
"estabilidade, integridade de dados e base de testes".

---

## Sprint 4 — Funcionalidades I (16–29/set) · 12 pts · **release v1.1.x** · ✅ **FEITO**

| ID | Tarefa | Pts | Valor | Status |
|----|--------|----:|-------|--------|
| S4-1 | **Despesas recorrentes / assinaturas** (mensal, sem fim definido) | 3 | Cobre o caso de uso hoje ausente | ✅ **FEITO** |
| S4-2 | **Cálculo de juros e CET** por dívida (taxa mensal, total a pagar, custo real) | 3 | Transforma o app de registro em análise | ✅ **FEITO** |
| S4-3 | **Metas financeiras** ("quitar o cartão até dez/2026") com barra de progresso | 2 | Engajamento | ✅ **FEITO** |
| S4-4 | **Simulador de quitação**: avalanche × bola de neve, com economia estimada | 3 | Diferencial competitivo real | ✅ **FEITO** |
| S4-5 | Novas conquistas atreladas às metas | 1 | Gamificação com propósito | ✅ **FEITO** |

> Status da Sprint 4: concluída em 14/ago/2026 (adiantada). Funções puras em
> `src/dominio.js` (`cet`, `calcularJurosDivida`, `simularQuitacao`), views em
> `views/{recorrentes,metas,juros,simulador}.js`, nav no `index.html`, handlers em
> `app.js`. 13 testes novos (`tests/sprint4.test.js`) — somando **108 no total**, todos verdes.
> Validação funcional em runtime (`validate-s4.cjs`): 4/4 views passaram, 0 erros.

---

## Sprint 5 — Funcionalidades II e UX (30/set–13/out) · 12 pts · **release v1.2.0** · ✅ **FEITO**

| ID | Tarefa | Pts | Valor | Status |
|----|--------|----:|-------|--------|
| S5-1 | **Busca e filtros** em Dívidas/Pagamentos (texto, categoria, status, período) | 2 | Usabilidade com volume | ✅ **FEITO** |
| S5-2 | **Exportar relatório em PDF** e **dados em CSV/Excel** | 3 | Pedido recorrente em apps do gênero | ✅ **FEITO** |
| S5-3 | **Notificações de vencimento** (nativas do SO, 3 dias antes) | 2 | Evita atraso — o problema-raiz do usuário | ✅ **FEITO** |
| S5-4 | **Atalhos de teclado** (Ctrl+N dívida, Ctrl+P pagamento, Ctrl+F busca, 1..9 views) | 1 | Produtividade | ✅ **FEITO** |
| S5-5 | **Ordenação e paginação** das listas | 2 | Performance percebida | ✅ **FEITO** |
| S5-6 | **Anexos**: comprovante (imagem/PDF) por pagamento | 2 | Rastreabilidade | ✅ **FEITO** |

> Validado em runtime (`validate-s5.cjs`): 6/6 itens passaram, 0 erros de console.
> **108 testes unitários verdes (`npm run test`)**. Código em `views/{dividas,pagamentos,relatorio}.js`,
> `src/dominio.js` (filtros/ordenação/paginação), `main.js`/`preload.js` (IPC), `app.js`.

---

## Sprint 6 — Hardening e saída do Beta (14–27/out) · 12 pts · **v2.1.0** · ✅ **FEITO**

| ID | Tarefa | Pts | Critério de aceite | Status |
|----|--------|----:|--------------------|--------|
| S6-1 | Eliminar `unsafe-eval` da CSP (migrar templates string → render functions ou pré-compilar) | 3 | CSP sem `unsafe-eval`, app funcional | ⬜ |
| S6-2 | Varredura de XSS: substituir concatenação de HTML por escape/`textContent` nos pontos que recebem dado do usuário | 2 | Auditoria documentada | ⬜ |
| S6-3 | **Criptografia opcional** do arquivo de dados com senha (AES-256-GCM via `node:crypto`) | 2 | Opt-in; sem senha, comportamento atual | ⬜ |
| S6-4 | Auditoria de **acessibilidade** (navegação por teclado, foco visível, contraste AA, ARIA) | 2 | Checklist WCAG 2.1 AA + correções (skip-link, `:focus-visible`, contraste medido) | ✅ **FEITO** |
| S6-5 | **Teste de carga**: 500 dívidas / 5.000 pagamentos; otimizar o que passar de 100 ms | 1 | Relatório de performance + `scripts/bench-carga.cjs` | ✅ **FEITO** |
| S6-6 | Fechar documentação: ADRs, CHANGELOG, atualização do As-Built e dos diagramas | 2 | Docs coerentes com o código | ✅ **FEITO** |
| S6-7 | **Multiperfis (S6-4 real)**: seleção/troca de perfil, criptografia por perfil, tag "Ativo" no logado, card de usuário na sidebar | 3 | E2E 24/24 (perfil Esposa) + 11/11 (gerenciar) + 126/126 Vitest; boot abre seletor antes do desbloqueio | ✅ **FEITO** |

**Marco final:** ✅ **v2.1.0** — multiperfis entregues (S6-7); removido o rótulo Beta.

---

> **Atualização (16/ago/2026):** o plano original previa 6 sprints até **v2.1.0**.
> Após o fechamento, foi entregue o **S6-7 (Multiperfis)**, elevando a versão para
> **v2.1.0**. A suíte Vitest está em **126/126 testes verdes**. Para os próximos passos
> (integridade numérica, auditoria, retenção e Multiperfis 2.0), ver
> `docs/BRAINSTORM-MELHORIAS.md` (rodada de 16/ago).

> **Atualização (19/ago/2026):** entregue o **UI/Theme pass 2** sobre a v2.1.0 — relevo raised
> (50/50) em scrollbar, botões secundários e cabeçalho de página; contraste absoluto (preto/branco)
> em títulos/textos/labels; correção de cantos quadrados (`--radius` restaurada); card de Insights
> com fundo consistente; seção "Novidades" no Sobre. Suíte Vitest em **126/126 testes verdes**.
> Detalhes em `docs/RELATORIO-ATUALIZACOES.md`.

---

## Distribuição de esforço

```
Qualidade / testes / CI     ████████████████         28%
Integridade de dados        ██████████████           24%
Refatoração                 ████████████             20%
Funcionalidades novas       ████████████             20%
Segurança / a11y / docs     █████                     8%
```

Racional: 72% do trimestre é investido em **base**. Um app financeiro sem testes e sem
garantia de integridade não pode ganhar funcionalidades — cada nova feature aumenta a
superfície de falha sobre um alicerce não verificado.

## Riscos do plano

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Refatoração da S3 introduz regressão | Alta | Alto | Só é feita **depois** da suíte de testes da S1/S2 |
| Estimativa otimista (dev part-time) | Média | Médio | Backlog das S4/S5 é ordenado por valor; o que não couber é cortado, não empurrado |
| Remover `unsafe-eval` quebrar as views | Média | Alto | Fazer em branch dedicada com verificação por render real no Electron |
| Escopo crescer via brainstorm | Alta | Médio | Brainstorm é **backlog**, não compromisso. Só entra em sprint o que está nesta tabela |

## Definition of Done

Uma tarefa só está pronta quando:
1. Código na `master` seguindo Conventional Commits;
2. Teste automatizado cobrindo o comportamento novo/alterado;
3. CI verde;
4. Documento afetado (As-Built, diagrama, manual) atualizado;
5. Verificação manual no Electron real quando houver mudança visual.
