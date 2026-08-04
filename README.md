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
- Relatórios e painel de visão geral (gráficos de pizza/rosca e barras)
- Tema claro/escuro e três idiomas: **Português (PT), Inglês (EN) e Espanhol (ES)**
- **Persistência local 100% offline** em arquivo JSON (sem servidor, sem nuvem)
- **Backup automático** a cada salvamento (cópia rotativa em `dados.bak.json`)
  + exportação/importação manual para arquivo JSON e restauração do backup local

## Tecnologia
O MeuBolso é um app desktop construído com:

| Camada | Tecnologia |
|--------|------------|
| Runtime / shell desktop | **Electron** `^43` (janela nativa, multiplataforma) |
| Banco de dados local | **JSON** simples (`meubolso.json` gravado de forma síncrona e imediata na pasta `userData` do Electron — sem dependências de banco) |
| UI / views | **Vue 3** — cada tela é um componente Vue montado sob um `#app`; `relogio.js` e `icons.js` permanecem em JS puro (vanilla) por dependência de relógio/ícones |
| Gráficos | **Chart.js** (`chart.umd.js`, vendor offline) |
| Estilo / componentes | **Bootstrap 5.3** vendored offline (`bootstrap.min.css` + `bootstrap.bundle.min.js`), com paleta e temas (claro/escuro) sobrescritos em `styles.css` |
| Ferramentas de build | **electron-builder** (gera instaladores NSIS, portátil e pacotes Linux/macOS) |
| Atualizações | **electron-updater** (auto-update a partir das Releases do GitHub) |

Dados de implementação:
- Persistência síncrona e imediata: o `render()` clona o estado reativo (Proxy do
  Vue) para um objeto plano antes de gravar, evitando falhas de clonagem do Electron
  e garantindo que os dados sejam escritos no disco a cada alteração.
- Backups: antes de sobrescrever `meubolso.json`, o app copia a versão anterior para
  `dados.bak.json`. Há também exportação/importação manual (JSON) e restauração do
  backup local pela tela de Configurações.
- Animações de barras de progresso e gráficos usando `transform` (GPU, `scaleX`/`scaleY`),
  sem "engasgos" de layout. Os gráficos do painel são (re)montados nos hooks
  `mounted()`/`updated()` das views (após o Vue aplicar o DOM), respeitando o
  `overflow: hidden` dos cards para não transbordar.
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

## Backup dos seus dados
- **Automático**: a cada salvamento o app guarda a última versão íntegra em
  `dados.bak.json` (mesma pasta dos dados). Em Configurações > Dados você também
  pode usar "Fazer backup agora" para forçar uma cópia.
- **Manual**: "Exportar" gera um `.json` em qualquer pasta; "Importar" restaura de um
  `.json`; "Restaurar backup" volta para o `dados.bak.json` mais recente.
- Os arquivos ficam em `%APPDATA%/Roaming/meubolso` (Windows),
  `~/Library/Application Support/meubolso` (macOS) ou `~/.config/meubolso` (Linux).

## Versionamento
Adotamos [Conventional Commits](https://www.conventionalcommits.org/).
Cada release é uma tag `vX.Y.Z`. A tag `v1.0.0` corresponde à **versão Beta** descrita
acima.

## Privacidade
Todos os dados ficam no seu computador (arquivo `meubolso.json` na pasta `userData`
do Electron). Nada é enviado para a nuvem.

## Autor
Desenvolvido por **Marcelo Acácio**.
Repositório: <https://github.com/marceloacaci/meubolso>

## Licença
MIT
