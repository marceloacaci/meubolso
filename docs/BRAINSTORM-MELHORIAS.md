# Brainstorm de Melhorias — MeuBolso

> Backlog **exploratório**, não compromisso. Cada item traz esforço estimado (P/M/G),
> impacto no usuário e uma nota de viabilidade dentro das restrições do projeto
> (offline, sem servidor, sem bundler, 1 desenvolvedor).
>
> Legenda de esforço: **P** ≤ 8h · **M** 8–24h · **G** > 24h
> Impacto: ⭐ baixo · ⭐⭐ médio · ⭐⭐⭐ alto

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
