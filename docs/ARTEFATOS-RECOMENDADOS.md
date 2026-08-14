# Artefatos e Diagramas Recomendados — MeuBolso

> Documento de engenharia. Público-alvo: analista/desenvolvedor de sistemas.
> Objetivo: definir **quais** artefatos o projeto deve manter, **por que**,
> e o **estado atual** (o que já existe, o que falta).

## 1. Critério de escolha

MeuBolso é um **app desktop mono-usuário, offline, sem backend, sem multi-tenant**
(Electron + Vue 3 via CDN local + persistência em JSON). Isso elimina de saída uma
boa parte do "kit corporativo" (diagrama de implantação multi-nó, ERD relacional,
contrato OpenAPI, modelo C4 nível 4, matriz RACI de squads). Documentação em excesso
para um projeto de 1 desenvolvedor vira dívida: envelhece e mente.

Regra adotada: **manter só o artefato que responde uma pergunta que alguém realmente faz.**

## 2. Estado atual do acervo

| # | Artefato | Existe? | Local |
|---|----------|---------|-------|
| 1 | README (visão, stack, instalação) | ✅ | `README.md` |
| 2 | Diagrama de Casos de Uso | ✅ | `docs/uml/01-casos-de-uso.puml` |
| 3 | Diagrama de Classes (modelo de dados) | ✅ | `docs/uml/02-diagrama-classes.puml` |
| 4 | Sequência — pagamento de parcela | ✅ | `docs/uml/03-sequencia-pagamento.puml` |
| 5 | Sequência — ganho de XP | ✅ | `docs/uml/04-sequencia-xp.puml` |
| 6 | Máquina de Estados — dívida/parcela | ✅ | `docs/uml/05-estado-divida.puml` |
| 7 | Atividade — gamificação | ✅ | `docs/uml/06-atividade-gamificacao.puml` |
| 8 | Documento As-Built (arquitetura real) | ✅ **novo** | `docs/AS-BUILT.md` |
| 9 | Manual do Usuário | ✅ **novo** | `docs/MANUAL-DO-USUARIO.md` |
| 10 | Cronograma / Roadmap 3 meses | ✅ **novo** | `docs/CRONOGRAMA-3-MESES.md` |
| 11 | Brainstorm de melhorias | ✅ **novo** | `docs/BRAINSTORM-MELHORIAS.md` |
| 12 | ADRs (Architecture Decision Records) | ❌ **recomendado** | `docs/adr/` |
| 13 | Diagrama de Componentes (C4 nível 3) | ❌ **recomendado** | `docs/uml/07-componentes.puml` |
| 14 | Diagrama de Implantação (build/release) | ❌ **recomendado** | `docs/uml/08-implantacao.puml` |
| 15 | Modelo de dados JSON (schema) | ❌ **recomendado** | `docs/schema/estado.schema.json` |
| 16 | Matriz de Rastreabilidade RF ↔ Código | ❌ opcional | `docs/RASTREABILIDADE.md` |
| 17 | Plano de Testes / casos de teste | ❌ **recomendado** | `docs/PLANO-DE-TESTES.md` |
| 18 | CHANGELOG (Keep a Changelog) | ❌ **recomendado** | `CHANGELOG.md` |
| 19 | CONTRIBUTING + templates de issue/PR | ⚠️ parcial (`.github/`) | — |
| 20 | Guia de Estilo / Design System | ❌ opcional | `docs/DESIGN-SYSTEM.md` |
| 21 | Análise de risco / LGPD | ❌ opcional (mas barato) | `docs/PRIVACIDADE-LGPD.md` |

## 3. Prioridade recomendada (o que faria primeiro)

**Alta (faz diferença já):**
1. **ADRs** — o projeto já acumulou decisões arquiteturais caras e revertidas
   (node:sqlite → sql.js → JSON puro; MySQL descartado; Vue via CDN vendorizado
   em vez de bundler). Sem ADR, essas decisões serão re-litigadas daqui a 6 meses.
   Formato Michael Nygard, 1 arquivo por decisão, ~1 página.
2. **CHANGELOG.md** — já se usa Conventional Commits e tags `vX.Y.Z`; o changelog
   é derivável quase de graça (`git log --pretty` ou `standard-version`).
3. **JSON Schema do estado** — hoje o contrato de dados só existe implicitamente na
   função `normalizar()` (`main.js:44`). Um schema versionado permite validar
   importação de arquivos, escrever migrações e detectar corrupção.
4. **Plano de testes** — o projeto tem **88 testes automatizados** (Vitest) verdes
   em `tests/*.test.js` (domínio financeiro, gamificação, persistência, integridade,
   Sprint 4 e Sprint 5), além de validação funcional em runtime via `validate-*.cjs`
   no Electron. O que falta é um documento que mapeie os casos de teste por
   funcionalidade — recomendado para rastreabilidade.

**Média:**
5. Diagrama de **componentes** (main / preload / renderer / views / vendor) — o
   `00-visao-geral.md` já tem um ASCII disso; formalizar em PlantUML.
6. Diagrama de **implantação/pipeline** (dev → electron-builder → GitHub Release →
   electron-updater → máquina do usuário).
7. Matriz de rastreabilidade RF ↔ função ↔ diagrama.

**Baixa (só se o projeto crescer / abrir para contribuidores):**
8. Design System, guia de contribuição detalhado, diagrama de pacotes.

## 4. O que NÃO recomendo produzir

- **ERD / MER**: não há banco relacional. O modelo é um documento JSON agregado.
  O diagrama de classes já cobre.
- **Diagrama de implantação multi-servidor / infra**: não há servidor.
- **OpenAPI/Swagger**: não há API HTTP. O contrato IPC é o equivalente — documente-o
  em tabela (feito no As-Built, seção 6), não em Swagger.
- **BPMN**: o processo de negócio aqui é fino demais; o diagrama de atividade UML
  que já existe basta.
- **Diagrama de comunicação UML**: redundante com os de sequência.

## 5. Convenções de manutenção

- Fonte da verdade é o **código**. Todo diagrama tem que citar arquivo:linha que ele
  descreve, para que a defasagem seja detectável.
- `.puml` versionado + `.png` versionado (renderizar com
  `java -jar plantuml.jar -charset UTF-8 0*.puml`).
- Regra: **PR que muda o modelo de dados ou o fluxo IPC deve atualizar o diagrama
  correspondente** — colocar isso no template de PR.
- Documento envelhecido é pior que documento ausente: se não for manter, apague.
