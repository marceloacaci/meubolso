# Diagramas UML — MeuBolso

Conjunto de diagramas UML que descrevem o funcionamento real do aplicativo
**MeuBolso** (gerenciador de dívidas com gamificação), mapeado diretamente do
código-fonte (`app.js`, `main.js`, `preload.js`, `icons.js`).

## Arquitetura em resumo

```
┌──────────────────────────────────────────────────────────────┐
│  PROCESSO PRINCIPAL DO ELECTRON (main.js)                      │
│  - Cria a janela (BrowserWindow)                               │
│  - Handler IPC: dados:carregar / dados:salvar-agora / ...      │
│  - Persistência em JSON (userData/meubolso.json) + backup      │
│    automático (dados.bak.json) e backup de pontuação           │
└───────────────┬──────────────────────────────────────────────┘
                │ ipcRenderer.invoke (clone estruturado)
                │  [estado é Proxy do Vue -> desserializado p/ objeto plano]
┌───────────────▼──────────────────────────────────────────────┐
│  PRELOAD (preload.js)  — contextBridge                          │
│  window.api = { carregar, salvarAgora, exportar, importar, ... }│
└───────────────┬──────────────────────────────────────────────┘
                │ window.api.*
┌───────────────▼──────────────────────────────────────────────┐
│  RENDERER (app.js)  — Vue (reactive) + DOM                      │
│  - Estado reativo (dividas, pagamentos, carteiras, gamificacao) │
│  - Render das views (Painel, Dívidas, Pagamentos, Vencimentos,  │
│    Relatório, Carteiras, Gamificação, Config, Sobre)            │
│  - Gamificação (XP, níveis, histórico, celebração)             │
└───────────────────────────────────────────────────────────────┘
```

## Diagramas disponíveis

| Arquivo                            | Tipo                | Foco                                        |
|------------------------------------|---------------------|---------------------------------------------|
| `01-casos-de-uso.puml`             | Use Case            | Ações do usuário no app                     |
| `02-diagrama-classes.puml`         | Class               | Modelo de dados (Estado, Dívida, Parcela…)  |
| `03-sequencia-pagamento.puml`      | Sequence            | Registrar pagamento + sincronia de parcela  |
| `04-sequencia-xp.puml`             | Sequence            | Ganho de XP / subida de nível               |
| `05-estado-divida.puml`            | State / Activity    | Ciclo de vida da dívida e da parcela        |
| `06-atividade-gamificacao.puml`    | Activity            | Fluxo de gamificação (ações → XP → nível)   |

## Como renderizar (gerar PNG/SVG)

Os arquivos usam a sintaxe **PlantUML** (https://plantuml.com). Para converter em
imagem, você pode:

1. **VS Code**: instalar a extensão *PlantUML* (jebbs) e abrir o preview (Alt+D).
2. **CLI** (precisa de Java):
   ```
   java -jar plantuml.jar 0*.puml
   ```
   ou com a imagem Docker:
   ```
   docker run --rm -v "%CD%:/docs" plantuml/plantuml:alpine /docs/0*.puml
   ```
3. **Online**: colar o conteúdo em https://www.plantuml.com/plantuml/uml/

> Nota: o `plantuml.jar` (gerador) está em `docs/uml/` e está listado no
> `.gitignore` (binário grande, não versionado). Os arquivos `.puml` (fonte)
> e `.png` (render já gerado) **são** versionados. Para regenerar os PNGs:
> `java -jar plantuml.jar -charset UTF-8 0*.puml` (o `-charset UTF-8` é
> necessário para os acentos do português).

> Observação técnica do app: o estado é um `Proxy` reativo do Vue. Antes de
> enviar pelo IPC (clone estruturado do Electron, que **não** clona Proxies), o
> `app.js` desserializa para objeto plano via `JSON.parse(JSON.stringify(estado))`
> (`persistir()` → `window.api.salvarAgora`). Isso está refletido nos diagramas
> de sequência.
