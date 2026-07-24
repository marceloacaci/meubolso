# MeuBolso

Gerenciador de finanças pessoais minimalista para desktop — controle de dívidas, empréstimos, cartão de crédito e carteiras, 100% local e offline.

![Plataformas](https://img.shields.io/badge/Windows-Linux-macOS-blue)

## Recursos
- Cadastro de dívidas com parcelas e acompanhamento de pagamentos
- Carteiras com saldo para organizar o dinheiro usado nos pagamentos
- Sistema de pontos e níveis para manter a motivação
- Relatórios e painel de visão geral
- Tema claro/escuro e idiomas PT/EN/ES
- Persistência local com SQLite (rápido, incremental, offline)

## Como usar (desenvolvimento)
```bash
npm install
npm start
```

## Como baixar (usuário final)
Baixe o instalador ou a versão portátil na página de
[Releases](https://github.com/MeuBolso/MeuBolso/releases).
- **Windows**: `MeuBolso-x.y.z-setup.exe` (instalador) ou `MeuBolso-x.y.z-portable.exe` (portátil, sem instalar)
- **Linux**: `.AppImage` ou `.deb`
- **macOS**: `.dmg`

O app avisa e atualiza sozinho quando há nova versão.

## Versionamento
Adotamos [Conventional Commits](https://www.conventionalcommits.org/).
Cada release é uma tag `vX.Y.Z` que dispara o build automático dos três sistemas
operacionais via GitHub Actions.

## Privacidade
Todos os dados ficam no seu computador (SQLite em `%APPDATA%/MeuBolso` no Windows).
Nada é enviado para a nuvem.
