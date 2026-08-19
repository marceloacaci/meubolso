# Brainstorm de Melhorias — MeuBolso

> Backlog **exploratório**, não compromisso. Cada item traz esforço estimado (P/M/G),
> impacto no usuário e uma nota de viabilidade dentro das restrições do projeto
> (offline, sem servidor, sem bundler, 1 desenvolvedor).
>
> Legenda de esforço: **P** ≤ 8h · **M** 8–24h · **G** > 24h
> Impacto: ⭐ baixo · ⭐⭐ médio · ⭐⭐⭐ alto
>
> **Status de implementação (atualizado em 16/ago/2026):** várias ideias deste
> brainstorm já viraram realidade nas Sprints 1–6. Itens entregues estão marcados
> com ✅ na coluna de Nota:
> - **S1**: B1 (escrita atômica) ✅ · B2 (schema + migrações) ✅ · B3 (backup rotativo 7 gerações) ✅ · B4 (recuperação do .bak) ✅
> - **S4**: A1 (juros e CET) ✅ · A2 (simulador avalanche × bola de neve) ✅ · A3 (despesas recorrentes) ✅ · A4 (metas financeiras) ✅
> - **S5**: busca/filtros, ordenação/paginação, export CSV/PDF, notificações de vencimento, atalhos e anexos de comprovante ✅
> - **S6-4**: **Multiperfis** (troca de perfil + criptografia por perfil) ✅ — atende parcialmente **H5** (Modo família multi-perfil): hoje é multi-*perfil* de dados no mesmo app, não multi-usuário concorrente.

---

## A. Produto — funcionalidades financeiras

| # | Ideia | Esf. | Impacto | Nota |
|---|-------|:----:|:-------:|------|
| A1 | **Juros e CET por dívida** — taxa mensal, montante final, custo real do crédito | M | ⭐⭐⭐ | Hoje o app soma parcelas; não modela o custo do dinheiro. É a maior lacuna funcional |
| A2 | **Simulador avalanche × bola de neve** — ordem ótima de quitação e economia estimada | M | ⭐⭐⭐ | Killer feature. O app já dá a dica no rodapé, mas não executa |
| A3 | **Despesas recorrentes / assinaturas** sem fim definido | M | ⭐⭐⭐ | O modelo atual só entende dívida parcelada finita |
| A4 | **Metas financeiras** com prazo e progresso | M | ⭐⭐ | Casa perfeitamente com a gamificação existente |
| A5 | **Renda e orçamento mensal** (50/30/20) | G | ⭐⭐⭐ | Expande o escopo de "gestor de dívidas" para "gestor financeiro". Decisão de produto, não técnica |
| A6 | **Projeção de fluxo de caixa** 6/12 meses (vencimentos × saldo das carteiras) | M | ⭐⭐⭐ | Responde "vou conseguir pagar?" — a pergunta que importa |
| A7 | **Renegociação de dívida** como operação de 1ª classe (histórico do antes/depois) | M | ⭐⭐ | Já existe o status "negociado", mas sem processo |
| A8 | **Multi-moeda** com taxa manual | P | ⭐ | `configuracoes.moeda` já existe e está subutilizada |
| A9 | **Categorias personalizadas** pelo usuário | P | ⭐⭐ | Hoje são 4 fixas em `CATEGORIAS` |
| A10 | **Credores/instituições** como entidade (agrupar dívidas por banco) | M | ⭐⭐ | Melhora relatórios |
| A11 | **Juros de mora automáticos** em parcela atrasada | M | ⭐⭐ | Precisa de A1 |
| A12 | **Antecipação com desconto** (simular quitar antes) | M | ⭐⭐ | Precisa de A1 |

---

## B. Dados, confiabilidade e persistência

| # | Ideia | Esf. | Impacto | Nota |
|---|-------|:----:|:-------:|------|
| B1 | **Escrita atômica** (tmp + rename) | P | ⭐⭐⭐ | 🔴 Risco atual real de corrupção. Já no Cronograma S1 |
| B2 | **Versionamento de schema + migrações** | M | ⭐⭐⭐ | Sem isso, toda mudança de modelo é uma bomba-relógio |
| B3 | **Backup rotativo de 7 gerações** em vez de 1 | P | ⭐⭐⭐ | Backup de 1 geração não protege contra erro descoberto tardiamente |
| B4 | **Recuperação automática** a partir do `.bak` quando o principal falha | P | ⭐⭐⭐ | Hoje o app abre vazio e assusta o usuário |
| B5 | **Log de auditoria** append-only de operações (event sourcing leve) | G | ⭐⭐ | Habilita undo global e reconstrução do estado |
| B6 | **Undo/Redo** (Ctrl+Z) | M | ⭐⭐⭐ | A exclusão hoje é irreversível — principal fonte de ansiedade |
| B7 | **Lixeira** com retenção de 30 dias | P | ⭐⭐ | Alternativa mais barata que B6 |
| B8 | **Criptografia opcional por senha** (AES-256-GCM, `node:crypto`) | M | ⭐⭐ | Dados financeiros em claro no disco |
| B9 | **Escrita incremental / debounce inteligente** | M | ⭐ | Só relevante com estado grande. Não otimizar cedo |
| B10 | **Verificação de integridade** (hash SHA-256 no arquivo) | P | ⭐⭐ | Detecta corrupção antes de mostrar dado errado |
| B11 | **Sync opcional por pasta** (OneDrive/Dropbox/Drive) com detecção de conflito | M | ⭐⭐ | Multi-dispositivo sem construir servidor. Muito bom custo-benefício |

---

## C. Arquitetura e engenharia

| # | Ideia | Esf. | Impacto | Nota |
|---|-------|:----:|:-------:|------|
| C1 | **Quebrar `app.js`** (3.519 LOC) em domínio/UI/i18n | G | ⭐⭐⭐ | Pré-requisito de tudo que vier depois |
| C2 | **Suíte de testes (Vitest)** com foco no domínio financeiro | M | ⭐⭐⭐ | Zero testes hoje em cálculo de dinheiro |
| C3 | **Testes E2E com Playwright + Electron** | M | ⭐⭐ | Cobre os fluxos críticos ponta a ponta |
| C4 | **Adotar Vite** para build do renderer | G | ⭐⭐ | Ganha HMR, tree-shaking e permite remover `unsafe-eval`. Contra: adiciona toolchain a um projeto hoje sem build |
| C5 | **TypeScript** ou JSDoc + `checkJs` | G | ⭐⭐ | JSDoc é o caminho pragmático: tipagem sem transpilar |
| C6 | **ESLint + Prettier** com CI | P | ⭐⭐ | Barato e imediato |
| C7 | **SFCs Vue** (`.vue`) no lugar de HTML em string | G | ⭐⭐ | Depende de C4 |
| C8 | **Store centralizada** (Pinia ou reactive store próprio) | M | ⭐⭐ | Estado hoje é uma variável global mutada em toda parte |
| C9 | **Camada de repositório** isolando persistência do domínio | M | ⭐⭐ | Permite trocar JSON → SQLite sem tocar em regra de negócio |
| C10 | **Unificar handlers IPC duplicados** | P | ⭐ | `dados:salvar` == `dados:salvar-agora` |
| C11 | **Decimal seguro para dinheiro** (inteiros em centavos ou dinero.js) | M | ⭐⭐⭐ | ⚠️ Ponto flutuante em finanças gera divergência de centavos acumulada |
| C12 | **Utilitário de datas** (fuso/UTC) | P | ⭐⭐ | `new Date().toISOString().slice(0,10)` usa UTC — perto da meia-noite grava o dia errado no Brasil |

> ⚠️ **C11 e C12 são bugs latentes CONFIRMADOS por execução**, não melhorias
> cosméticas:
>
> - **C12 (fuso):** `hoje()` em `app.js:17` faz
>   `new Date().toISOString().slice(0,10)`, que devolve a data **UTC**.
>   Verificado: às **05/08 23:30 em Brasília (UTC−3)** a função retorna
>   **`2026-08-06`** — um dia à frente. Todo pagamento registrado após ~21h no
>   Brasil grava a data errada, o que desloca o cálculo de atraso das parcelas.
> - **C11 (float):** `0.1 + 0.2 === 0.3` é `false` em JS
>   (`0.30000000000000004`). Como `totalDivida`/`totalPago`/`saldoDivida` somam
>   floats, o erro se acumula e uma dívida quitada pode nunca zerar exatamente,
>   impedindo o bônus de +50 XP de "dívida quitada".
> - **E4 (níveis):** verificado que `nivelDe()` diverge da tabela `NIVEIS` a
>   partir do nível 6 — com 600 XP a tabela diz "nível 6" e a função retorna
>   **7**; com 1600 XP a tabela diz 10 e a função retorna **17**.


---

## D. Interface e experiência

| # | Ideia | Esf. | Impacto |
|---|-------|:----:|:-------:|
| D1 | Busca global e filtros combinados (categoria, status, período, valor) | M | ⭐⭐⭐ |
| D2 | Atalhos de teclado + paleta de comandos (Ctrl+K) | M | ⭐⭐ |
| D3 | Notificações nativas do SO para vencimentos próximos | P | ⭐⭐⭐ |
| D4 | Ordenação e paginação de listas | P | ⭐⭐ |
| D5 | Modo compacto / densidade ajustável | P | ⭐ |
| D6 | Dashboard configurável (arrastar e ocultar cards) | G | ⭐⭐ |
| D7 | Anexar comprovante (imagem/PDF) ao pagamento | M | ⭐⭐ |
| D8 | Onboarding guiado na primeira execução | M | ⭐⭐⭐ |
| D9 | Estados vazios instrutivos ("nenhuma dívida ainda — comece por…") | P | ⭐⭐ |
| D10 | Bandeja do sistema + iniciar minimizado | P | ⭐ |
| D11 | Temas adicionais além de claro/escuro (alto contraste, sépia) | P | ⭐ |
| D12 | Gráfico de evolução do endividamento no tempo (linha) | M | ⭐⭐⭐ |
| D13 | Heatmap de calendário de vencimentos | M | ⭐⭐ |
| D14 | Ações em lote (marcar N parcelas como pagas) | M | ⭐⭐ |
| D15 | Auditoria de acessibilidade WCAG 2.1 AA | M | ⭐⭐ |
| D16 | Duplicar dívida como template | P | ⭐⭐ |

---

## E. Gamificação (evolução)

| # | Ideia | Esf. | Impacto | Nota |
|---|-------|:----:|:-------:|------|
| E1 | **Conquistas/badges nomeadas** ("Primeira dívida quitada", "3 meses sem atraso", "Reserva formada") | M | ⭐⭐⭐ | Hoje há XP e nível, mas não conquistas discretas colecionáveis |
| E2 | **Streak** de dias/meses sem atraso | P | ⭐⭐⭐ | Mecânica de hábito mais eficaz que XP puro |
| E3 | **Rebalancear a economia de XP** — pagar deveria valer proporcionalmente ao esforço, não valor fixo | M | ⭐⭐ | Hoje quitar R$ 50 e R$ 5.000 valem os mesmos 15 XP |
| E4 | Corrigir **`NIVEIS` × `nivelDe()`** (tabela não linear vs. cálculo linear) | P | ⭐⭐ | Inconsistência documentada no As-Built §8 |
| E5 | Níveis além do 10 (prestígio) | P | ⭐ | Nível 10 = 1.000 XP é alcançável em poucos meses |
| E6 | Resumo mensal ("Em setembro você quitou R$ X e ganhou Y XP") | M | ⭐⭐⭐ | Momento de retenção |
| E7 | Desafios semanais opcionais | M | ⭐⭐ | Cuidado: pode gamificar em excesso um app financeiro |
| E8 | Exportar "cartão de conquista" como imagem para compartilhar | M | ⭐ | Marketing orgânico |

---

## F. Plataforma e distribuição

| # | Ideia | Esf. | Impacto | Nota |
|---|-------|:----:|:-------:|------|
| F1 | **Assinatura de código** (Windows/macOS) | M | ⭐⭐⭐ | Elimina o alerta "Windows protegeu o seu PC" — hoje é a maior barreira de adoção. Custo em R$ |
| F2 | Publicar na **Microsoft Store** / Flathub / Snap | M | ⭐⭐ | Descoberta orgânica |
| F3 | Reduzir tamanho do pacote (podar `node_modules`, `asar`) | P | ⭐ | — |
| F4 | Build **ARM64 para Windows/Linux** | P | ⭐ | Já existe para macOS |
| F5 | **Versão web/PWA** compartilhando o mesmo domínio | G | ⭐⭐ | Só faz sentido após C1/C9 |
| F6 | **App móvel companheiro** (leitura + registro rápido) | G | ⭐⭐⭐ | Grande. Exigiria sincronização (ver B11) |
| F7 | Canal **beta** de atualizações separado do estável | P | ⭐ | `electron-updater` já suporta |

---

## G. Processo e projeto

| # | Ideia | Esf. | Impacto |
|---|-------|:----:|:-------:|
| G1 | ADRs para as decisões arquiteturais (persistência, Vue sem bundler…) | P | ⭐⭐⭐ |
| G2 | CHANGELOG automatizado (`standard-version` a partir dos Conventional Commits) | P | ⭐⭐ |
| G3 | Templates de issue/PR + CONTRIBUTING | P | ⭐⭐ |
| G4 | Cobertura de testes no CI com gate mínimo | P | ⭐⭐ |
| G5 | Dependabot / auditoria de dependências | P | ⭐⭐ |
| G6 | Página de landing do projeto (GitHub Pages) com screenshots | M | ⭐⭐ |
| G7 | Canal de feedback do usuário (issue template guiado) | P | ⭐⭐ |
| G8 | Roadmap público no GitHub Projects | P | ⭐ |

---

## H. Ideias exploratórias (alto risco / alta recompensa)

| # | Ideia | Nota crítica |
|---|-------|--------------|
| H1 | **Import de extrato OFX/CSV do banco** | Alto valor, esforço grande, e a conciliação automática é notoriamente difícil de acertar |
| H2 | **Open Finance (Pluggy/Belvo)** | Mataria a proposta "100% offline, zero cadastro" que hoje é o diferencial. Só como modo opt-in claramente separado |
| H3 | **OCR de boleto/comprovante** | Divertido, mas periférico ao problema central |
| H4 | **Assistente com LLM local** para insights | Aumentaria muito o tamanho do pacote; os insights baseados em regra já cobrem 80% do valor |
| H5 | **Modo família** multi-perfil | Rompe a premissa mono-usuário; requer repensar o modelo de dados |
| H6 | **Widget de desktop** com resumo | Nicho |

---

## Top 10 se eu tivesse que escolher hoje

Ordenado por **(impacto × urgência) ÷ esforço**:

1. **B1** — escrita atômica *(risco de perda de dados, 2h)*
2. **C12** — bug de fuso horário nas datas *(dado errado silencioso)*
3. **C2** — suíte de testes do domínio financeiro
4. **B4 + B3** — recuperação automática e backup de 7 gerações
5. **C11** — dinheiro em centavos inteiros
6. **B6/B7** — undo ou lixeira *(medo de errar trava o uso)*
7. **A2** — simulador de quitação *(o diferencial de produto)*
8. **D3** — notificação de vencimento *(resolve o problema-raiz)*
9. **C1** — quebrar o `app.js`
10. **F1** — assinatura de código *(destrava adoção externa)*

**O que eu NÃO faria agora:** C4/C7 (Vite + SFCs), H2 (Open Finance), F6 (app móvel),
A5 (orçamento completo). São bons, mas grandes demais para o estágio — e três deles
mudam a identidade do produto antes de a base estar sólida.

---

## Rodada de Brainstorm — 16/ago/2026 (pós S6-4)

Revisão de estratégia após o fechamento do ciclo de multiperfis. O produto saiu do
Beta (S6) e ganhou multiperfis (S6-4). O núcleo de "gestor de dívidas local e
privado" está maduro. Próximo salto de valor = **confiança nos números** e
**retenção pelo hábito**, não mais novas telas.

### Diagnóstico (onde estamos)
- ✅ Base sólida: dados atômicos, lixeira, backup, cripto opcional, multiperfis.
- ✅ Qualidade: 126/126 testes Vitest + E2E headless nos fluxos críticos (seleção de
  perfil, desbloqueio, sidebar, tag "Ativo", filtros auto-aplicáveis).
- 🔴 **Dívida técnica confirmada por execução** (ver C11/C12 abaixo): dinheiro em
  float e datas em UTC. Já causa XP de "dívida quitada" que não dispara e vencimentos
  com 1 dia de defasagem perto da meia-noite. É o calcanhar de Aquiles para um app
  financeiro.
- 🟡 Documentação: README e As-Built alinhados; resta sincronizar MANUAL-DO-USUARIO
  (multiperfis) e o cronograma de 3 meses.

### Estratégia (princípios)
1. **Corrigir antes de expandir.** Os bugs C11/C12 são silenciosos e financeiros —
   prioridade zero. Um app de dinheiro que erra centavos ou datas quebra a confiança.
2. **Retenção pelo hábito, não por gamificação exagerada** (ver E2/E3). Streak de
   dias sem atraso > XP inflado.
3. **Multiperfis como porta de entrada, não fim.** O próximo passo natural é B11
   (sync por pasta) para o mesmo usuário em 2 PCs — não H5 completo (multi-usuário).
4. **Zero nuvem por princípio.** Open Finance (H2) só como modo opt-in isolado.

### Proposta de Sprints (próximos ~3 meses)

| Sprint | Tema | Itens-chave | Esforço | Valor |
|--------|------|-------------|:--------:|------|
| **S7** | **Integridade numérica** | C11 (centavos inteiros), C12 (fuso BR), E4 (tabela NÍVEIS × nivelDe), testes de regressão do domínio | M | Crítico |
| **S8** | **Confiança & auditoria** | C10 (unificar IPC duplicado), C5 (ESLint/Prettier+CI), B10 (hash SHA-256 de integridade), C2 (expandir suíte de testes) | M | Alto |
| **S9** | **Hábito & retenção** | E2 (streak sem atraso), E6 (resumo mensal), D3 (notificação nativa de vencimento), D9 (estados vazios) | M | Alto |
| **S10** | **Multiperfis 2.0** | B11 (sync por pasta OneDrive/Dropbox com detecção de conflito), H5 (modo família leve: convite de perfil), E5 (níveis além do 10) | G | Médio |

### Cronograma sugerido (12 semanas)
- **Semanas 1–3 (S7):** correção de float (centavos) + fuso BR + tabela de níveis.
  Entrega: `npm run test` continua verde; nova suíte de regressão de domínio.
- **Semanas 4–6 (S8):** lint/CI + hash de integridade + IPC único. Entrega: porta
  de auditoria e build reproduzível no CI.
- **Semanas 7–9 (S9):** streak + resumo mensal + notificações nativas. Entrega:
  retenção mensurável (DAU de quem abre para ver o resumo).
- **Semanas 10–12 (S10):** sync por pasta + modo família leve. Entrega: multiperfis
  úteis entre dispositivos.

### Top 5 próximos passos (agora)
1. **S7-C11** — migrar soma de dinheiro para centavos inteiros (evita deriva).
2. **S7-C12** — `hoje()` em fuso de Brasília (corrige vencimentos/atraso).
3. **S7-E4** — alinhar `NIVEIS` e `nivelDe()` (nível correto em todo o XP).
4. **S8-B10** — SHA-256 do arquivo para detectar corrupção antes de exibir.
5. **S9-E2** — streak de dias sem atraso (mecânica de hábito de alto impacto).

### O que deliberadamente NÃO entrará no roadmap
- **A5 (orçamento 50/30/20)** e **H2 (Open Finance):** mudam a proposta de valor
  "minimalista e offline". Reavaliar só após S10.
- **C4/C7 (Vite + SFCs):** toolchain pesado para um app sem bundler; o modelo atual
  (script clássico + Vue runtime) funciona e mantém o CSP sem `unsafe-eval`.
