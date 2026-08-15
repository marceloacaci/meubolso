# MeuBolso

Gerenciador de finanças pessoais **minimalista** para dívidas, empréstimos e cartão de crédito.
100% local (sem nuvem, sem conta), foco em privacidade e em não perder os seus dados.

![Versão](https://img.shields.io/badge/vers%C3%A3o-2.0.0--rc-green)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%20%7C%20Linux%20%7C%20macOS-green)
![Testes](https://img.shields.io/badge/testes-98%2F98%20Vitest-brightgreen)
![A11y](https://img.shields.io/badge/a11y-WCAG%202.1%20AA-green)
![CSP](https://img.shields.io/badge/CSP-sem%20unsafe--eval-green)

## Funcionalidades

- **Dívidas & parcelas:** controle de dívidas, parcelas, juros e CET por dívida.
- **Pagamentos:** registro de pagamentos por parcela, com carteira e anexo de comprovante.
- **Vencimentos:** parcelas a vencer e em atraso, com dias de antecedência/atraso.
- **Relatório:** resumo financeiro, dívidas em atraso e vencendo nos próximos 7 dias.
- **Carteiras, Recorrentes & Metas:** gestão de saldos, despesas recorrentes e objetivos.
- **Lixeira durável:** exclusão é *soft-delete* — restaure ou exclua definitivamente
  (dívidas + pagamentos, carteiras, recorrentes e metas). Nunca se perde um dado.
- **Criptografia opcional (AES-256-GCM):** ative uma senha para cifrar o arquivo local.
- **Acessibilidade:** navegação por teclado, skip-link, foco visível, WCAG 2.1 AA.
- **i18n:** Português, English, Español.

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

| Ambiente | Como roda | Onde ficam os dados |
|----------|-----------|--------------------|
| **Desenvolvimento** | `npm start` (código-fonte) | `%APPDATA%\meubolso\meubolso.json` |
| **Portátil** | `MeuBolso-*-portable.exe` baixado | na **própria pasta do executável** (`meubolso.json` ao lado do `.exe`) |
| **Instalado** | `MeuBolso-*-setup.exe` instalado | `%APPDATA%\meubolso\<versão>\meubolso.json` (isolado por versão) |

A página **Sobre** mostra o ambiente ativo e o caminho exato do arquivo de dados.
Para mover dados entre ambientes, use **Exportar/Importar** (CSV/JSON) na interface.

## Atualização (auto-update)

- O **instalador (setup.exe)** se atualiza **sozinho**: ao abrir, verifica o GitHub;
  se houver versão nova, baixa em segundo plano e instala ao fechar. Nenhuma ação do usuário.
- O **portátil (.exe)** **não** auto-atualiza — basta baixar a versão nova do GitHub e
  substituir o arquivo (ou copiar o `meubolso.json` da pasta antiga para a nova).

## Roadmap de Sprints

| Sprint | Tema | Status | % |
|--------|------|--------|---|
| S1 | Fundação & integridade de dados | FEITO | 100% |
| S2 | Recuperação & backups | FEITO | 100% |
| S3 | Extração de views (Vue 3) | FEITO | 100% |
| S4 | Funcionalidades II & UX (carteiras, recorrentes, metas) | FEITO | 100% |
| S5 | Busca, filtros, exportação, notificações | FEITO | 100% |
| S6 | Hardening & saída do Beta | FEITO | 100% |
| B6/B7 | Lixeira (trash) durável | FEITO | 100% |

## Qualidade & verificação

- **Suíte Vitest:** `98/98` testes verdes (`npm run test`).
- **Auditoria de acessibilidade:** `scripts/audit-a11y.cjs` — 8/8 critérios WCAG 2.1 AA em Electron headless.
- **Teste de carga:** `scripts/bench-carga.cjs` — `resumoParcelas` × 500 dívidas em ~4,7 ms.
- **CSP:** `script-src 'self'` sem `unsafe-eval` (Vue 3 runtime-only).

## Privacidade

Todos os dados ficam no arquivo local `meubolso.json` (pasta de dados do app).
Não há telemetria nem servidores remotos. Opcionalmente, cifre o arquivo com AES-256-GCM
(senha definida por você — sem senha, o arquivo é JSON aberto).

## Licença

MIT © 2026 MeuBolso — desenvolvido por Marcelo Acácio.
