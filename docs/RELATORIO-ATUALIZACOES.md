# Relatório de Atualizações — MeuBolso (UI / Tema / Cabeçalho)

> Documento de consolidação das melhorias e correções de interface aplicadas neste ciclo.
> Todas as mudanças foram validadas por **inspeção real no browser** (medição de `getComputedStyle` /
> `getBoundingClientRect`, com `?nocache`) e pela suíte **Vitest 126/126**.
> Protocolo de verificação: skill `fcs` (Fix Code Skill).

## Escopo das alterações
Arquivo afetado principal: `styles.css` (variáveis de tema `:root` / `[data-theme="dark"]`, scrollbar,
`.btn`, `.btn-ghost`, `.card`, `.list-group-item`, `.text-secondary`, `.page-header`), além de
`src/ui/modais.js` (mapeamento dos botões das janelas) e `views/sobre.js` (seção Novidades).

---

## 1. Scrollbar com relevo raised (50/50 + linha cortante)
- Track (fundo): neutro, sem raised.
- Thumb (barra que arrasta): **gradiente raised 50/50** (metade superior clara / metade inferior
  escura) em **todos os estados** — parado, `:hover` e `:active` (arrastando).
- **Linha cortante** de 1px no meio do thumb (camada extra no `background-image`) para marcar a
  separação entre as metades, em toda a área do thumb.
- Compatibilidade: `scrollbar-color` para Firefox + `::-webkit-scrollbar-*` para Chromium/Electron.
- Correção técnica: o Chromium/Electron ignora `color-mix` e o shorthand `background` em
  `::-webkit-scrollbar-thumb`; passou-se a usar **cores hex fixas por tema** no gradiente.

## 2. CORREÇÃO CRÍTICA — cantos quadrados em botões e cards
- Sintoma: botões (Nova dívida, Limpar filtros, Gerenciar pagamentos) e cards da página Dívidas
  perderam a quina arredondada.
- Causa raiz: a variável `--radius: 8px` foi **apagada inadvertidamente** durante a edição das
  variáveis de scrollbar no `:root`. Como `.btn`, `.btn-limpar-filtros`, `.card` etc. usam
  `border-radius: var(--radius)`, a variável indefinida fez o raio cair para **0px**.
- Correção: `--radius: 8px` restaurado no `:root`. Validado no browser (`border-radius = 8px`).

## 3. Botões secundários das janelas com raised
- `.btn-ghost` (usado por **Cancelar** do modal de nova dívida, **Voltar** da gestão de dívida,
  ação secundária e **Cancelar** das confirmações) recebeu o gradiente raised (topo claro / base
  escura), mantendo a cor da fonte original.
- Botões destacados (Salvar `.btn-primary`, Confirmar `.btn-danger`/`.btn-primary`) já tinham raised.

## 4. Card de Insights — fundo consistente
- Os itens de lista (`.list-group-item`) do card de Insights (e demais listas dentro de cards)
  herdavam um fundo branco puro do Bootstrap, criando um "retângulo mais claro" sobre o card.
- Correção: `.card .list-group-item` com `background-color: transparent` (herda o fundo do card),
  no repouso e no hover.

## 5. Contraste absoluto (preto/branco) em textos e títulos
- `--text` e `--text-muted` passaram a ser **preto absoluto (`#000`) no claro / branco absoluto
  (`#fff`) no escuro** — cobrindo títulos de páginas, títulos de cards, textos, labels de card
  e números de destaque menores (hierarquia por peso/tamanho, não por cinza).
- **Venceu o `!important` do Bootstrap** em `.text-secondary` (título RESUMO, "Total de dívidas",
  "Pago", "Saldo", "Quitado", etc.), que fixava cinza via `--bs-secondary-color`. Regra com
  `!important` + ordem posterior.
- **Exceção preservada:** valores coloridos (verde `--success` / vermelho `--danger`) dos cards de
  resumo (Pago/Saldo) continuam intactos.
- **Cards de filtros DE FORA:** isolados via `.card:has([data-filtro])`, que reseta as variáveis de
  texto para o cinza original (claro e escuro). Tratados à parte conforme combinado.

## 6. Cabeçalho de página (`.page-header`) com raised + centralização
- Aplicado o gradiente raised (metade clara em cima) + `box-shadow` no card do título das páginas.
- Título e botão (ex.: "+ Nova dívida" em Dívidas, Pagamentos, Vencimentos) **centralizados
  verticalmente na linha do gradiente raised** (meio geométrico do card).
- Causa do desalinhamento anterior: `padding` assimétrico (24px topo / 10px base) deslocava o
  conteúdo ~7px abaixo da linha do relevo. Tornado simétrico (`16px 24px`). Validado no browser:
  `h2.mid == btn.mid == cardMid` (diff 0.0).

## 7. Skill `fcs` (Fix Code Skill)
- Criada para tornar obrigatória a validação por **inspeção real** (CSS: serve o app, probe HTML,
  `getComputedStyle`/`getBoundingClientRect`, `?nocache`, medir antes de afirmar) e por
  **execução de testes** (lógica: Vitest / execução real da função / Electron headless).
- Registrada em memória para ser carregada automaticamente em edições de código do MeuBolso.

---

## Status de verificação
- Suíte Vitest: **126/126 testes passando**.
- Inspeção visual: medições de `border-radius`, `color` e posições confirmadas no browser real
  (Chromium) antes de cada conclusão.
- Nenhum `console.error` introduzido.

## Artefatos atualizados em conjunto
- `views/sobre.js` + i18n (pt/en/es): seção **Novidades** no Sobre do app.
- `README.md`: seção de atualizações / badges de versão e testes alinhados (126 testes).
- `package.json`: versão alinhada para `2.1.0`.
- `docs/AS-BUILT.md` e `docs/CRONOGRAMA-3-MESES.md`: entrada de changelog das melhorias de UI.
