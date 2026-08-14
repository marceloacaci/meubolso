# Manual do Usuário — MeuBolso

**Versão 1.2.0** · Windows · Linux · macOS
Gerenciador de finanças pessoais 100% local e offline.

---

## Sumário

1. [Sobre o MeuBolso](#1-sobre-o-meubolso)
2. [Requisitos e instalação](#2-requisitos-e-instalação)
3. [Primeiros passos](#3-primeiros-passos)
4. [Conhecendo a tela](#4-conhecendo-a-tela)
5. [Dívidas](#5-dívidas)
6. [Pagamentos](#6-pagamentos)
7. [Carteiras](#7-carteiras)
8. [Vencimentos](#8-vencimentos)
9. [Painel e Relatório](#9-painel-e-relatório)
10. [Pontuação, níveis e conquistas](#10-pontuação-níveis-e-conquistas)
11. [Configurações](#11-configurações)
12. [Backup, exportação e restauração](#12-backup-exportação-e-restauração)
13. [Atualizações](#13-atualizações)
14. [Privacidade e segurança](#14-privacidade-e-segurança)
15. [Perguntas frequentes](#15-perguntas-frequentes)
16. [Solução de problemas](#16-solução-de-problemas)
17. [Glossário](#17-glossário)
18. [Busca, filtros e ordenação (v1.2.0)](#18-busca-filtros-e-ordenação)
19. [Atalhos de teclado (v1.2.0)](#19-atalhos-de-teclado)
20. [Exportar CSV / PDF (v1.2.0)](#20-exportar-csv--pdf)
21. [Notificações de vencimento e anexos (v1.2.0)](#21-notificações-de-vencimento-e-anexos)

---

## 1. Sobre o MeuBolso

O MeuBolso ajuda você a **enxergar e quitar suas dívidas**. Ele foi feito para
pessoas físicas que têm empréstimos, cartão de crédito, financiamentos ou contas
parceladas espalhados e querem tudo em um só lugar.

O que ele faz:
- Registra dívidas divididas em parcelas, com vencimento e status de cada uma.
- Registra os pagamentos e atualiza o status das parcelas automaticamente.
- Organiza o dinheiro em carteiras, debitando o saldo a cada pagamento.
- Mostra painéis, gráficos e insights sobre a sua situação.
- Dá pontos, níveis e conquistas para manter você motivado a continuar.

O que ele **não** faz: não conecta ao seu banco, não importa extrato, não envia nada
para a internet e não pede cadastro.

> ✅ **Versão estável.** Esta documentação cobre a v1.2.0. Mantenha backups
> periódicos (seção 12) como precaução, mas o app é considerado estável para uso
> diário.

---

## 2. Requisitos e instalação

### Requisitos
| Item | Mínimo |
|------|--------|
| Sistema | Windows 10+ (x64), Linux x64, macOS (Intel ou Apple Silicon) |
| Memória | 4 GB de RAM |
| Disco | ~250 MB |
| Internet | **Não é necessária** (só para baixar atualizações) |

### Instalação no Windows
1. Acesse https://github.com/marceloacaci/meubolso/releases
2. Baixe **`MeuBolso-1.0.0-setup.exe`**.
3. Execute. Se o Windows exibir "Windows protegeu o seu PC", clique em
   **Mais informações → Executar assim mesmo** (o app não tem assinatura digital paga).
4. Escolha a pasta de instalação e conclua. Um atalho é criado na área de trabalho.

**Prefere não instalar?** Baixe `MeuBolso-1.0.0-portable.exe` e execute direto — de um
pendrive, inclusive.

### Instalação no Linux
- **AppImage**: baixe, dê permissão (`chmod +x MeuBolso-1.0.0-linux.AppImage`) e execute.
- **Debian/Ubuntu**: `sudo dpkg -i MeuBolso-1.0.0-linux.deb`

### Instalação no macOS
Baixe o `.dmg` correspondente à sua arquitetura, arraste para *Aplicativos*. Na
primeira execução: clique com o botão direito → **Abrir** → **Abrir**.

---

## 3. Primeiros passos

Roteiro sugerido para os primeiros 10 minutos:

1. **Abra o app.** Você começa no Painel, vazio. Você já ganha alguns pontos só por
   acessar.
2. **Crie uma carteira** (menu *Carteiras* → *Nova carteira*). Ex.: "Conta Corrente",
   saldo R$ 1.500,00. Serve para o app saber de onde sai o dinheiro dos pagamentos.
3. **Cadastre sua primeira dívida** (botão *Nova dívida* no topo da lateral).
   Ex.: "Cartão Nubank", categoria *Cartão de crédito*, 6 parcelas de R$ 300,00.
4. **Registre um pagamento** já feito (botão *Novo pagamento*), escolhendo a dívida,
   a parcela e a carteira.
5. **Volte ao Painel.** Os gráficos e insights já refletem sua situação.

> Dica: cadastre primeiro as dívidas com **maior juros** — o app vai destacar isso
> nos insights.

---

## 4. Conhecendo a tela

```
┌──────────────┬────────────────────────────────────────────┐
│  🪙 MeuBolso │   Saudação, relógio, nível e XP            │
│              ├────────────────────────────────────────────┤
│ + Nova dívida│                                            │
│ + Novo pagto │        ÁREA DE CONTEÚDO                    │
│              │        (a view selecionada)                │
│ PRINCIPAL    │                                            │
│  Painel      │                                            │
│  Dívidas     │                                            │
│  Pagamentos  │                                            │
│  Vencimentos │                                            │
│  Carteiras   │                                            │
│  Relatório   │                                            │
│              │                                            │
│  Configurações                                            │
│  Sobre       │                                            │
├──────────────┴────────────────────────────────────────────┤
│  Dica financeira rotativa                                 │
└───────────────────────────────────────────────────────────┘
```

- **Barra lateral**: navegação. Pode ser recolhida para ganhar espaço.
- **Botões de ação rápida**: *Nova dívida* e *Novo pagamento* estão sempre à mão.
- **Cabeçalho**: mostra saudação conforme a hora, o relógio e o seu nível com a barra
  de progresso de XP.
- **Rodapé**: dicas financeiras que se alternam automaticamente.

---

## 5. Dívidas

### Cadastrar
1. Clique em **Nova dívida**.
2. Preencha:
   - **Descrição** — nome que você reconhece ("Empréstimo Caixa", "Fatura Itaú").
   - **Categoria** — *Empréstimo*, *Cartão de crédito*, *Serviço* ou *Outro*.
     A categoria alimenta os gráficos e insights.
   - **Número de parcelas** — o app gera automaticamente a grade de parcelas.
   - Para cada parcela: **valor** e **data de vencimento**.
3. Salve. **+10 pontos.**

> O app preenche as datas em sequência mensal automaticamente; você pode ajustar
> qualquer parcela individualmente.

### Status das parcelas
| Status | Significado |
|--------|-------------|
| **Pendente** | Ainda não paga e dentro do prazo |
| **Pago** | Total da parcela quitado |
| **Atrasado** | Venceu e não foi quitada |
| **Negociado** | Repactuada com o credor |

O status é **calculado pelo app** a partir dos pagamentos que você registra — você não
precisa marcar parcela como paga na mão.

### Gerenciar uma dívida
Na lista de dívidas, o botão de **gestão** abre uma tela detalhada onde você vê parcela
por parcela e pode lançar o pagamento direto de cada uma. Ao quitar a dívida inteira:
**+50 pontos**.

### Editar e excluir
- **Editar**: +5 pontos.
- **Excluir**: **−10 pontos** e remove a dívida. O app pede confirmação — a exclusão
  não pode ser desfeita (só restaurando um backup).

---

## 6. Pagamentos

### Registrar
1. **Novo pagamento**.
2. Escolha a **dívida**, depois a **parcela** que está sendo paga.
3. Informe **valor** e **data**.
4. Escolha a **carteira** de onde o dinheiro saiu (opcional, mas recomendado).
5. Salve. **+15 pontos.**

O app faz três coisas automaticamente:
- Soma o pagamento ao total pago da dívida.
- Recalcula o status daquela parcela.
- Debita o valor do saldo da carteira escolhida.

### Pagamentos parciais
São suportados. Se a parcela é de R$ 300 e você pagou R$ 180, registre R$ 180 —
a parcela continua pendente com R$ 120 em aberto e o app mostra isso.

### Editar e excluir
- **Editar** (+8 pontos): o app **estorna** o débito antigo na carteira e aplica o novo.
- **Excluir** (−5 pontos): devolve o valor à carteira e reverte o status da parcela.

---

## 7. Carteiras

Carteiras representam **de onde vem o dinheiro**: conta corrente, poupança, dinheiro
vivo, vale, uma reserva específica.

- **Nova carteira** (+20 pontos): nome e saldo inicial.
- **Editar carteira** (+5 pontos): ajuste nome ou saldo (útil quando entra salário).
- O total de todas as carteiras aparece consolidado.

**Por que usar:** sem carteira, você só sabe quanto deve. Com carteira, você sabe se
**consegue pagar** o que vence este mês.

---

## 8. Vencimentos

Lista as parcelas ordenadas por data, destacando:
- o que **já venceu** e continua em aberto;
- o que **vence nos próximos dias**;
- o que está mais distante.

Use esta tela como sua agenda de pagamentos da semana.

---

## 9. Painel e Relatório

### Painel
Visão consolidada: total devido, total pago, saldo em aberto, saldo das carteiras,
gráficos de composição da dívida (rosca/pizza) e de status das parcelas (barras),
mais os **insights automáticos**.

Exemplos de insight que o app gera sozinho:
- "Cartão de crédito representa **X%** da sua dívida — o juro do rotativo é alto,
  priorize quitar."
- Alertas de concentração de vencimento e de parcelas atrasadas.

### Relatório
Detalhamento por categoria e por período, com os mesmos gráficos em maior resolução.
Use para conferência mensal.

> Os gráficos são desenhados com Chart.js e funcionam offline.

---

## 10. Pontuação, níveis e conquistas

O MeuBolso usa gamificação para transformar organização financeira em hábito.

### Como ganhar (e perder) pontos

| Ação | Pontos |
|------|-------:|
| Acessar o app | +3 |
| Editar dívida | +5 |
| Gestão de dívida | +5 |
| Editar carteira | +5 |
| Editar pagamento | +8 |
| Registrar dívida | +10 |
| **Registrar pagamento** | **+15** |
| Criar carteira | +20 |
| **Quitar uma dívida** | **+50** |
| Excluir pagamento | −5 |
| Excluir dívida | −10 |

### Níveis
A cada **100 XP** você sobe um nível, e cada nível tem um título:

1. Iniciante · 2. Organizador · 3. Controlador · 4. Disciplinado · 5. Estrategista
6. Guardião · 7. Mestre · 8. Especialista · 9. Expert · 10. Lenda das Finanças

Ao subir de nível aparece uma **celebração animada com confete**. A tela
*Pontuação e Conquistas* mostra seu XP total, quanto falta para o próximo nível,
o gráfico de XP por atividade e o histórico dos **últimos 100** registros de pontos.

> Sua pontuação tem backup próprio (`pontos.bak.json`), separado dos dados financeiros.

---

## 11. Configurações

| Opção | O que faz |
|-------|-----------|
| **Tema** | Claro ou escuro |
| **Idioma** | Português, Inglês ou Espanhol — muda toda a interface na hora |
| **Dados** | Exportar, importar, fazer backup agora, restaurar backup |
| **Caminho dos dados** | Mostra onde o arquivo `meubolso.json` está gravado |

A tela **Sobre** exibe a versão do app, do Electron, do Node e do Chromium, o sistema
operacional e o tipo de armazenamento — informações úteis ao relatar um bug.

---

## 12. Backup, exportação e restauração

### Backup automático
**Toda vez que algo é salvo**, o app copia a versão anterior íntegra para
`dados.bak.json`. É uma rede de segurança de uma geração: protege contra a última
alteração ruim, não contra um problema de semanas atrás.

### Backup manual (recomendado: 1× por semana)
*Configurações → Dados → **Fazer backup agora***.

### Exportar
*Configurações → Dados → **Exportar*** gera um arquivo
`meubolso-AAAA-MM-DD.json` na pasta que você escolher. **Guarde-o fora do computador**
(pendrive, nuvem pessoal). Este é o seu backup de verdade.

### Importar
*Configurações → Dados → **Importar*** lê um `.json` exportado.
⚠️ **Substitui** os dados atuais. Exporte antes de importar.

### Restaurar backup
*Configurações → Dados → **Restaurar backup*** volta ao conteúdo do `dados.bak.json`.

### Onde ficam os arquivos

| Sistema | Pasta |
|---------|-------|
| Windows | `%APPDATA%\Roaming\meubolso\` |
| macOS | `~/Library/Application Support/meubolso/` |
| Linux | `~/.config/meubolso/` |

Arquivos: `meubolso.json` (dados), `dados.bak.json` (backup), `pontos.bak.json`
(pontuação).

> 💡 **Boa prática:** antes de atualizar o app ou mexer nas configurações, exporte.
> Leva 5 segundos.

---

## 13. Atualizações

Nas versões instaladas oficialmente, o MeuBolso verifica sozinho se há versão nova no
GitHub, baixa em segundo plano e **instala ao fechar o app**. Você não precisa fazer
nada. A versão portátil e a execução em modo desenvolvedor não se atualizam
automaticamente.

---

## 14. Privacidade e segurança

- **Nada sai do seu computador.** Não há conta, login, servidor ou nuvem.
- A única conexão de rede é a checagem de atualização no GitHub.
- Links externos (repositório, por exemplo) só abrem no navegador após você clicar,
  e o app só aceita endereços `http`/`https`.
- ⚠️ O arquivo de dados é um **JSON legível**, sem criptografia. Quem tiver acesso ao
  seu usuário no computador pode lê-lo. Se o equipamento é compartilhado, use
  criptografia de disco (BitLocker / FileVault / LUKS).

---

## 15. Perguntas frequentes

**Preciso de internet?** Não. Só para baixar o app e as atualizações.

**Funciona em mais de um computador?** Sim, exportando o JSON de um e importando no
outro. Não há sincronização automática.

**Dá para usar em vários usuários / familiares?** O app é mono-usuário. Cada usuário do
sistema operacional tem sua própria pasta de dados.

**Registrei um pagamento errado, e agora?** Edite ou exclua o pagamento — o app
estorna o valor na carteira e recalcula o status da parcela.

**Perdi pontos ao excluir. Dá para recuperar?** Os pontos negativos são intencionais
(desestimulam apagar histórico). Continue registrando pagamentos: cada um vale +15.

**Posso registrar dívida sem parcelas?** Cadastre com 1 parcela igual ao valor total.

**Quantas dívidas suporta?** Não há limite fixo. Para uso pessoal típico (dezenas de
dívidas, centenas de pagamentos) o desempenho é imediato.

**Meus dados sumiram depois de atualizar!** Veja a seção 16.

---

## 16. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| App abre vazio, dados sumiram | O arquivo principal não foi lido | *Configurações → Restaurar backup*. Se não resolver, importe seu último `.json` exportado |
| "Windows protegeu o seu PC" | Instalador sem assinatura digital | *Mais informações → Executar assim mesmo* |
| Tela em branco ao abrir | Renderização travada | Feche e reabra. Persistindo, reinstale mantendo a pasta de dados |
| Gráficos não aparecem | Falha no desenho do canvas | Troque de aba e volte; se persistir, reinicie o app |
| Saldo da carteira negativo | Pagamentos maiores que o saldo informado | Edite a carteira e ajuste o saldo real |
| Parcela continua "pendente" após pagar | Pagamento parcial, ou vinculado a outra parcela | Abra a gestão da dívida e confira a qual parcela o pagamento foi vinculado |
| Atualização não chega | Versão portátil ou modo dev | Baixe manualmente na página de Releases |

**Ao relatar um bug** em https://github.com/marceloacaci/meubolso/issues, inclua:
versão do app e do sistema (tela *Sobre*), o que você fez, o que esperava e o que
aconteceu. **Nunca anexe seu arquivo de dados real** — ele contém suas informações
financeiras.

---

## 18. Busca, filtros e ordenação (v1.2.0)

As telas **Dívidas** e **Pagamentos** trazem ferramentas de volume:

- **Busca por texto**: digite na caixa de busca (ou `Ctrl+F`) para filtrar por
  descrição, credor ou observação. A busca ignora maiúsculas e acentos.
- **Filtros**: por **categoria**, **status** (em dia / atrasada / quitada) e
  **período** (mês). Use o botão *Limpar* para remover todos os filtros.
- **Ordenação**: clique no cabeçalho de uma coluna (descrição, credor, total,
  saldo) para ordenar; clique de novo para inverter a direção.
- **Paginação**: as listas são paginadas (12 itens por página). Use os botões
  *Anterior/Próximo* na base da lista.

---

## 19. Atalhos de teclado (v1.2.0)

| Atalho | Ação |
|--------|------|
| `1` a `9` | Troca para a view correspondente (Painel, Dívidas, Pagamentos, Vencimentos, Relatório, Carteiras, Gamificação, Config, Sobre) |
| `Ctrl+N` | Nova dívida |
| `Ctrl+P` | Novo pagamento |
| `Ctrl+F` | Foca a busca |
| `Ctrl+E` | Exportar (relatório) |

> Os atalhos numéricos só funcionam quando o cursor não está dentro de um campo
> de texto (caixa de busca, formulário).

---

## 20. Exportar CSV / PDF (v1.2.0)

Na tela **Relatório** há botões para exportar:

- **CSV**: gera um arquivo `.csv` (UTF-8 com BOM, abre correto no Excel) com
  dívidas e pagamentos — útil para análise externa ou planilhas.
- **PDF**: gera um relatório em PDF da tela atual.

O seletor de pasta/arquivo é o nativo do sistema operacional.

---

## 21. Notificações de vencimento e anexos (v1.2.0)

- **Notificações de vencimento**: o app avisa (notificação nativa do sistema)
  sobre parcelas que vencem em até **3 dias**. Avisos não se repetem para a mesma
  parcela. Esta funcionalidade é ativada por padrão; se o seu SO bloquear
  notificações do app, ajuste nas configurações de notificação do sistema.
- **Anexos de comprovante**: em cada pagamento há um botão *Anexar* para vincular
  um comprovante (imagem ou PDF). Quando há anexo, aparece o ícone 📎 — clique
  para abrir o arquivo.

---

## 17. Glossário

| Termo | Significado |
|-------|-------------|
| **Dívida** | Compromisso financeiro total, dividido em parcelas |
| **Parcela** | Fração da dívida com valor e vencimento próprios |
| **Pagamento** | Valor efetivamente pago, vinculado a uma parcela |
| **Carteira** | Fonte de dinheiro (conta, poupança, espécie) com saldo |
| **Saldo da dívida** | Total das parcelas menos o total já pago |
| **XP** | Pontos de experiência ganhos ao usar o app |
| **Nível** | Faixa de progresso — 1 nível a cada 100 XP |
| **Rotativo** | Crédito automático e caríssimo do cartão quando não se paga a fatura integral |
| **CET** | Custo Efetivo Total — o custo real de um empréstimo, com taxas e seguros |

---

**MeuBolso** · Desenvolvido por Marcelo Acácio · Licença MIT
https://github.com/marceloacaci/meubolso
