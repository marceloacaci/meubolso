# MeuBolso

Gerenciador de finanças pessoais **minimalista** para dívidas, empréstimos e cartão de crédito.
100% local (sem nuvem, sem conta), foco em privacidade e em não perder os seus dados.

![Versão](https://img.shields.io/badge/vers%C3%A3o-2.1.0-green)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%20%7C%20Linux%20%7C%20macOS-green)
![Testes](https://img.shields.io/badge/testes-126%2F126%20Vitest-brightgreen)
![A11y](https://img.shields.io/badge/a11y-WCAG%202.1%20AA-green)
![CSP](https://img.shields.io/badge/CSP-sem%20unsafe--eval-green)

## Funcionalidades

- **Dívidas & parcelas:** controle de dívidas, parcelas, juros e CET por dívida.
- **Pagamentos:** registro de pagamentos por parcela, com carteira e anexo de comprovante.
- **Vencimentos:** parcelas a vencer e em atraso, com dias de antecedência/atraso.
- **Relatório:** resumo financeiro, dívidas em atraso e vencendo nos próximos 7 dias.
- **Carteiras, Recorrentes & Metas:** gestão de saldos, despesas recorrentes e objetivos.
- **Lixeira durável:** exclusão é _soft-delete_ — restaure ou exclua definitivamente
  (dívidas + pagamentos, carteiras, recorrentes e metas). Nunca se perde um dado.
- **Criptografia opcional (AES-256-GCM):** ative uma senha para cifrar o arquivo local.
- **Multiperfis (S6-4):** separe dívidas e dados por perfil, com troca e criptografia
  individual por perfil; a tag **"Ativo"** identifica o perfil logado.
- **Configurações Rápidas:** painel accordeon (engrenagem ao lado do relógio) com tema,
  cor de destaque, idioma, fonte, **Dados** (backup/exportar/importar/restaurar) e
  **Perfis de dados** (trocar/gerenciar) — tudo sem sair da tela atual.
- **Acessibilidade:** navegação por teclado, skip-link, foco visível, WCAG 2.1 AA.
- **i18n:** Português, English, Español.

## Atualizações recentes (v2.1.0)

Melhorias de interface e tema (validadas por inspeção real no browser + suíte Vitest 126/126):

- **Relevo raised** (metade clara em cima) em botões, cards e na **barra de rolagem** (thumb
  com linha cortante nos estados parado/hover/arrastando), em ambos os temas.
- **Botões secundários das janelas** (Cancelar, Voltar, ação secundária) agora com relevo raised.
- **Contraste absoluto** (preto no claro / branco no escuro) em títulos, textos e labels;
  valores coloridos (verde/vermelho) preservados.
- **Cabeçalho de página** com relevo + sombra e título/botão centralizados na linha do relevo.
- Correção de **cantos quadrados** em botões/cards (variável `--radius` restaurada).
- Card de **Insights** com fundo consistente (itens herdam o card).
- Detalhes em `docs/RELATORIO-ATUALIZACOES.md`.

## Instalação e execução (desenvolvimento)

```bash
npm install
npm start          # inicia o app Electron
npm run test       # roda a suíte Vitest (98 testes)
npm run dist:win   # gera o instalador Windows (.exe) via electron-builder
```

> Requer Node.js 18+ e Electron. Os binários de build (NSIS/portable) são gerados
> com `electron-builder` e publicados no GitHub Releases.

## Build & release

- `npm run dist` gera os instaladores para a plataforma atual.
- A release é marcada por **tag** (`vX.Y.Z`) no GitHub; veja a aba
  [Releases](https://github.com/marceloacaci/meubolso/releases).
- Binários assinados/automatizados: ver `package.json` → `build` (electron-builder).

## Ambientes e onde ficam os dados

O MeuBolso separa os dados de cada forma de execução para **não misturar entradas**:

| Ambiente            | Como roda                         | Onde ficam os dados                                                    |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| **Desenvolvimento** | `npm start` (código-fonte)        | `%APPDATA%\meubolso\meubolso.json`                                     |
| **Portátil**        | `MeuBolso-*-portable.exe` baixado | na **própria pasta do executável** (`meubolso.json` ao lado do `.exe`) |
| **Instalado**       | `MeuBolso-*-setup.exe` instalado  | `%APPDATA%\meubolso\<versão>\meubolso.json` (isolado por versão)       |

A página **Sobre** mostra o ambiente ativo e o caminho exato do arquivo de dados.
Para mover dados entre ambientes, use **Exportar/Importar** (CSV/JSON) na interface.

## Atualização (estilo comercial)

O app verifica novas versões no GitHub e apresenta um fluxo guiado (igual a grandes
sistemas comerciais): modal **"Atualização disponível"** (versão, relatório de
fix/atualizações, tamanho), **barra de progresso** durante o download e, ao concluir,
**"Reiniciar agora ou depois"**.

- **Instalador (setup.exe):** ao abrir, verifica o GitHub. Se houver versão nova, o
  usuário decide baixar; instalado ao reiniciar. Requer o `latest.yml` na release.
- **Portátil (.exe):** também se atualiza **sem download manual** — baixa o novo
  executável da release e, ao reiniciar, um script auxiliar troca o arquivo e relança.
  Os dados ficam na própria pasta do executável e são preservados.

### Migração de dados entre versões (instalado)

Os dados do instalado ficam em `%APPDATA%\meubolso\<versão>\`. Ao abrir uma versão
nova, os dados da pasta anterior são **copiados** para a atual (nunca apagados antes
da cópia) e pastas de versões obsoletas sem dados são removidas. Nada se perde ao atualizar.

## Roadmap de Sprints

| Sprint | Tema                                                    | Status | %    |
| ------ | ------------------------------------------------------- | ------ | ---- |
| S1     | Fundação & integridade de dados                         | FEITO  | 100% |
| S2     | Recuperação & backups                                   | FEITO  | 100% |
| S3     | Extração de views (Vue 3)                               | FEITO  | 100% |
| S4     | Funcionalidades II & UX (carteiras, recorrentes, metas) | FEITO  | 100% |
| S5     | Busca, filtros, exportação, notificações                | FEITO  | 100% |
| S6     | Hardening & saída do Beta                               | FEITO  | 100% |
| S6-4   | Multiperfis (troca de perfil + criptografia por perfil) | FEITO  | 100% |
| B6/B7  | Lixeira (trash) durável                                 | FEITO  | 100% |

## Qualidade & verificação

- **Suíte Vitest:** `108/108` testes verdes (`npm run test`).
- **Auditoria de acessibilidade:** `scripts/audit-a11y.cjs` — 8/8 critérios WCAG 2.1 AA em Electron headless.
- **Teste de carga:** `scripts/bench-carga.cjs` — `resumoParcelas` × 500 dívidas em ~4,7 ms.
- **CSP:** `script-src 'self'` sem `unsafe-eval` (Vue 3 runtime-only).

## Privacidade

Todos os dados ficam no arquivo local `meubolso.json` (pasta de dados do app).
Não há telemetria nem servidores remotos. Opcionalmente, cifre o arquivo com AES-256-GCM
(senha definida por você — sem senha, o arquivo é JSON aberto).

## Licença

MIT © 2026 MeuBolso — desenvolvido por Marcelo Acácio.
