# Auditoria de Acessibilidade — MeuBolso (WCAG 2.1 AA)

> Sprint 6, tarefa **S6-4**. Baseline de auditoria feito em `<DATA>`.
> Responsável técnico: Marcelo Acácio.
> Método: inspeção estática (grep no `styles.css`/`index.html`/`app.js`/`views/*.js`)
> + verificação em Electron headless (`scripts/audit-a11y.cjs`) onde aplicável.
> Critério de aceite (do cronograma): "Checklist WCAG 2.1 AA nos fluxos principais".

## Como ler este documento

- **Status**: ✅ atendido · 🟡 parcial/precisa de correção · ⬜ ausente
- Cada item cita `arquivo:linha` onde foi verificado.
- Os itens marcados 🟡/⬜ viraram tarefas de correção (S6-4e) com commit próprio.

---

## 1. Perceptível

| # | Critério (WCAG 2.1) | O que verificar | Status | Evidência / Nota |
|---|----------------------|-----------------|--------|------------------|
| 1.1.1 | Texto alternativo (A) | `img`/`canvas`/ícones decorativos com `aria-hidden`; ícones informativos com `aria-label`/`title` | ✅ | Ícones SVG (`data-ico`) já injetam `aria-hidden="true"` em `icons.js:21`; auditados 25 ícones, 0 sem `aria-hidden` (`audit-a11y.cjs`). Canvas dos gráficos tem `aria-label` (AS-BUILT §9). |
| 1.3.1 | Info e relação (A) | Estrutura semântica (heading hierarchy, listas, `role` corretos) | 🟡 | Sidebar usa `<nav aria-label>`, botões `<button>`. Mas cards de resumo e listas de dívidas/pagamentos não usam `<ul>`/`<li>` semanticamente — são `<div>` com grid. |
| 1.3.2 | Sequência com significado (A) | Ordem de leitura = ordem visual | ✅ | Layout de coluna única (sidebar + conteúdo); sem `tabindex` positivo que desordene. |
| 1.3.5 | Identificação do propósito (AA) | `autocomplete` em inputs de formulário | ⬜ | Formulários de dívida/pagamento não usam `autocomplete`. Menor prioridade (app financeiro local). |
| 1.4.1 | Uso de cor (A) | Cor não é o único meio de transmitir info | 🟡 | Status de parcela (pendente/pago/atrasado) usa COR + TEXTO. Metas usam barra + %. OK. Mas badge de nível e indicadores de "em dia/atrasado" podem depender de cor. |
| 1.4.3 | Contraste mínimo (AA) | Texto 4.5:1; texto grande 3:1 | 🟡 | Requer medição em ambos os temas (S6-4d). Cores de destaque (verde/azul/roxo/laranja/rosa do gear) sobre fundos claros/escuros precisam de checagem de contraste. |
| 1.4.4 | Redimensionar texto (AA) | Zoom 200% sem perda de conteúdo | 🟡 | Janela tem `minWidth` (PITFALL do main.js). Com zoom de fonte (gear `data-fonte`), layout pode quebrar. Verificar. |
| 1.4.11 | Non-text contrast (AA) | Componentes UI / foco 3:1 | ✅ | `:focus-visible` global aplica `outline: 2px solid var(--primary)` (S6-4e); `var(--primary)` tem contraste 6.12 (claro) / 7.32 (escuro) sobre `--bg` — bem acima de 3:1. |
| 1.4.12 | Espaçamento de texto (AA) | Respeita `line-height`/`letter-spacing` do usuário | ✅ | App não sobrescreve com `!important` agressivo em `line-height`/`letter-spacing`. |

## 2. Operável

| # | Critério | O que verificar | Status | Evidência |
|---|----------|-----------------|--------|-----------|
| 2.1.1 | Teclado (A) | Toda funcionalidade via teclado | 🟡 | Sidebar é `<button>` (focável). Atalhos Ctrl+N/Ctrl+P/Ctrl+F/1..9 existem (S5-4). MAS: fechar modal apenas via `tentarFecharModal()` no Esc — confirmar. FAB mobile e gear-panel: checar foco. |
| 2.1.2 | Sem armadilha de teclado (A) | Foco não trava | ✅ | Modal fecha com Esc; sem `keydown` que capture perpetuamente. |
| 2.4.1 | Contornar blocos (A) | Skip-link / pular para conteúdo | ✅ | Skip-link `.skip-link` (`Pular para o conteúdo`, i18n `a11y.pularConteudo` pt/en/es) inserido como 1º elemento focável em `index.html`; `#app` recebe `tabindex="-1"` como alvo. Confirmado por `audit-a11y.cjs` (2.4.1 PASS). |
| 2.4.3 | Ordem de foco (A) | Foco segue ordem lógica | 🟡 | Gear-panel abre como `role="dialog"` posicionado no canto — verificar se o foco entra nele e volta. |
| 2.4.7 | Foco visível (AA) | Indicador de foco visível | ✅ | Regra `:where(a,button,input,...):focus-visible { outline: 2px solid var(--primary); outline-offset:2px }` em `styles.css` (S6-4e); confirmada no stylesheet por `audit-a11y.cjs` (2.4.7 PASS). Campos `.campo` também cobertos. |
| 2.5.8 | Alvo de toque (AA) | Alvos ≥ 24×24px | ✅ | Botões e nav-links têm padding; mobile FAB grande. |

## 3. Compreensível

| # | Critério | O que verificar | Status | Evidência |
|---|----------|-----------------|--------|-----------|
| 3.1.1 | Linguagem da página (A) | `lang` no `<html>` | ✅ | `index.html:2` `<html lang="pt-BR">`. |
| 3.2.1 | Em foco (A) | Foco não muda contexto sozinho | ✅ | Navegação só troca view no `click`/`Enter`, não no `focus`. |
| 3.2.3 | Navegação consistente (AA) | Nav consistente | ✅ | Mesma sidebar em todas as views. |
| 3.3.1 | Identificação de erro (A) | Erros de formulário identificados | 🟡 | Validações existem (S4/S5); checar se o erro é anunciado (aria-live) e não só cor. |
| 3.3.2 | Rótulos ou instruções (A) | Inputs têm `<label>` | 🟡 | Modais usam `src/ui/modais.js`; verificar `for`/`id` ou `aria-label` em cada campo. |

## 4. Robusto

| # | Critério | O que verificar | Status | Evidência |
|---|----------|-----------------|--------|-----------|
| 4.1.2 | Nome, função, valor (A) | Componentes com nome acessível | 🟡 | Botões de `data-acao` (ex.: `nova-divida`) — o nome acessível vem do texto interno? `cta.novaDivida` está em `<span data-i18n>` (visível). Gear/labels: checar. |
| 4.1.3 | Mensagens de status (AA) | `role="status"`/`aria-live` para feedback | 🟡 | Toasts usam `aria-live="polite"` (skill MeuBolso). Loading "Carregando..." deve ter `role="status"`. |

---

## Resumo de lacunas (viraram S6-4e)

1. **Skip-link** "pular para conteúdo" (2.4.1) — ⬜ ausente.
2. **Foco visível** `:focus-visible` global (2.4.7 / 1.4.11) — 🟡 auditar e garantir.
3. **Ícones decorativos** com `aria-hidden` (1.1.1) — 🟡 aplicar nos `data-ico`.
4. **Contraste AA** dos 5 accents + textos (1.4.3) — 🟡 medir (S6-4d).
5. **Labels/erros de formulário** anunciados (3.3.1/3.3.2) — 🟡 checar modais.
6. **Semântica de listas** (dívidas/pagamentos/metas) (1.3.1) — 🟡 opcional, baixo risco.

> Correções serão non-destructive (CSS + atributos ARIA + skip-link), validadas pelo
> `scripts/audit-a11y.cjs` em Electron headless antes do commit.
