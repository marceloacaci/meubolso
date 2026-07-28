# MeuBolso

Gerenciador de finanças pessoais minimalista para desktop — controle de dívidas,
empréstimos, cartão de crédito e carteiras, **100% local e offline**.

![Plataformas](https://img.shields.io/badge/Windows-Linux-macOS-blue)
![Status](https://img.shields.io/badge/versão-1.0.0%20Beta-yellow)

> ⚠️ **Versão 1.0 — BETA**
> A release `1.0.0` é uma **versão Beta** de testes. Está funcional para uso
> diário, mas pode conter ajustes de interface, comportamentos em evolução e
> possíveis instabilidades. Use com cautela e mantenha backups dos seus dados.
> Feedbacks e relatos de bugs são muito bem-vindos.

## Recursos
- Cadastro de dívidas com parcelas e acompanhamento de pagamentos
- Carteiras com saldo para organizar o dinheiro usado nos pagamentos
- Sistema de pontos (XP), níveis e conquistas para manter a motivação
- Relatórios e painel de visão geral (gráficos de pizza e barras)
- Tema claro/escuro e três idiomas: **Português (PT), Inglês (EN) e Espanhol (ES)**
- Persistência local com SQLite (rápido, incremental, offline)

## Tecnologia
O MeuBolso é um app desktop construído com:

| Camada | Tecnologia |
|--------|------------|
| Runtime / shell desktop | **Electron** `^43` (janela nativa, multiplataforma) |
| Banco de dados local | **SQLite** via `node:sqlite` (`DatabaseSync`, embutido no Node do Electron) |
| UI / views | **Vue 3** — cada tela é um componente Vue montado sob um `#app`; `relogio.js` e `icons.js` permanecem em JS puro (vanilla) por dependência de relógio/ícones |
| Gráficos | **Chart.js** (`chart.umd.js`, vendor offline) |
| Estilo / componentes | **Bootstrap 5.3** vendored offline (`bootstrap.min.css` + `bootstrap.bundle.min.js`), com paleta e temas (claro/escuro) sobrescritos em `styles.css` |
| Ferramentas de build | **electron-builder** (gera instaladores NSIS, portátil e pacotes Linux/macOS) |
| Atualizações | **electron-updater** (auto-update a partir das Releases do GitHub) |

Destaques de implementação:
- Animações de barras de progresso e gráficos usando `transform` (GPU, `scaleX`/`scaleY`),
  sem "engasgos" de layout.
- Internacionalização completa (PT/EN/ES) em toda a interface, incluindo o painel,
  relatórios e telas de configuração.
- Respeita `prefers-reduced-motion` (desliga animações para quem prefere menos movimento).

## Como usar (desenvolvimento)
```bash
npm install
npm start
```

## Como baixar (usuário final)
Baixe o instalador ou a versão portátil na página de
[Releases](https://github.com/marceloacaci/meubolso/releases).
- **Windows**: `MeuBolso-x.y.z-setup.exe` (instalador) ou `MeuBolso-x.y.z-portable.exe` (portátil, sem instalar)
- **Linux**: `.AppImage` ou `.deb`
- **macOS**: `.dmg`

O app avisa e atualiza sozinho quando há nova versão (quando em build oficial).

## Versionamento
Adotamos [Conventional Commits](https://www.conventionalcommits.org/).
Cada release é uma tag `vX.Y.Z`. A tag `v1.0.0` corresponde à **versão Beta** descrita
acima.

## Privacidade
Todos os dados ficam no seu computador (SQLite em `%APPDATA%/MeuBolso` no Windows).
Nada é enviado para a nuvem.

## Autor
Desenvolvido por **Marcelo Acácio**.
Repositório: <https://github.com/marceloacaci/meubolso>

## Licença
MIT
