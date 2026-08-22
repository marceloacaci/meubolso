# Documento Formal — Entendimento do Problema

**Disciplina:** [Nome da disciplina]  
**Data de conclusão:** 19 de agosto de 2026 (até 23h59)  
**Status:** Rascunho para entrega (vários envios permitidos)

---

## 1. Integrantes do grupo

| Nome completo                         | RA / Matrícula |
| ------------------------------------- | -------------- |
| Marcelo Luiz de Acácio                | [preencher RA] |
| [Nome completo do(a) colega de grupo] | [preencher RA] |

> Caso o trabalho seja individual, remova a segunda linha da tabela.

---

## 2. Organização atendida

**Projeto MeuBolso** — aplicação de controle financeiro pessoal e familiar, desenvolvida como produto de software voltado a **pessoas físicas que precisam organizar suas finanças**, mas que muitas vezes não dispõem de ferramentas adequadas, conhecimento ou motivação para fazê-lo de forma sistemática.

O sistema reúne as **funcionalidades básicas de gestão financeira** — registro de **dívidas**, **pagamentos**, **carteiras**, **metas** e **despesas recorrentes** — em um único ambiente de fácil uso, com **apresentação de resumos e estatísticas financeiras** (totais, saldos, gráficos de distribuição por categoria e evolução) que dão ao usuário uma visão consolidada do próprio patrimônio. Para sustentar o hábito de uso, o produto incorpora mecanismos de **gamificação** (níveis, títulos e recompensas de progresso) e um **rodapé de dicas rolantes** com orientações financeiras, elementos voltados a engajar o usuário leigo no acompanhamento contínuo.

Trata-se de um software desktop multiplataforma (Windows/Linux/macOS) distribuído como aplicação autônoma, com armazenamento local dos dados do usuário. A "organização atendida" é, portanto, o próprio ecossistema do produto e sua base de usuários — pessoas físicas em busca de organização financeira —, que exige usabilidade, motivação à adoção e, em segundo plano, privacidade e isolamento de informações sensíveis. (O suporte a **perfis de dados independentes** é um recurso mais recente do produto e, neste momento, recebe menos destaque no escopo do problema em análise.)

---

## 3. Problema real identificado

Em pesquisas de campo com potenciais usuários e na análise de aplicativos concorrentes de controle financeiro, identificou-se que **a organização financeira de pessoas físicas é frequentemente negligenciada**: muitas pessoas precisam organizar suas finanças, porém não dispõem de ferramentas adequadas, de conhecimento suficiente ou de motivação para manter esse controle de forma sistemática. Isso resulta em dívidas não acompanhadas, vencimentos esquecidos e ausência de visão consolidada do próprio patrimônio.

Os aspectos centrais do problema observado são:

1. **Baixa adoção e dificuldade de uso contínuo.** Sem uma interface clara, gratuita e voltada ao usuário leigo — que apresente resumos e estatísticas compreensíveis e elementos que estimulem o engajamento (como gamificação e orientações constantes) — a pessoa física não desenvolve o hábito de registrar e acompanhar suas finanças, perpetuando a desorganização.
2. **Ausência de apoio à tomada de consciência financeira.** Muitas ferramentas apenas armazenam lançamentos, sem traduzi-los em resumos, gráficos e dicas que ajudem o usuário leigo a entender sua real situação e a tomar decisões.
3. **Compartilhamento do equipamento e proteção (recurso mais recente do produto).** Embora hoje o MeuBolso já conte com suporte a perfis de dados independentes e criptografia por perfil, esses recursos são evoluções recentes e, no escopo deste problema, recebem menos destaque — ainda assim, a falta de separação clara dos dados em equipamentos compartilhados e a exposição de informações sensíveis em arquivos locais sem criptografia permanecem como riscos secundários a considerar.

O problema, portanto, é, em primeiro plano, a **baixa adesão à organização financeira** (falta de ferramenta acessível, de conhecimento e de motivação contínua), agravada pela **ausência de resumos e estatísticas que deem visibilidade ao usuário** — com a separação de perfis e a criptografia figurando como dimensões complementares e de menor prioridade no momento.

---

## 4. Justificativa técnica

A solução proposta fundamenta-se nos seguintes pontos técnicos, já validados em implementação no próprio produto:

- **Funcionalidades básicas de gestão financeira.** O sistema implementa o ciclo completo de registro e acompanhamento de **dívidas**, **pagamentos**, **carteiras**, **metas** e **despesas recorrentes**, com validações e consistência de dados, dando ao usuário leigo um ponto único para organizar suas finanças.

- **Apresentação de resumos e estatísticas financeiras.** A camada de visualização consolida os lançamentos em **totais, saldos, gráficos de distribuição por categoria e indicadores de evolução**, traduzindo os dados brutos em informação compreensível — elemento central para que o usuário compreenda sua real situação e tome decisões.

- **Gamificação e dicas rolantes para engajamento.** O produto adota mecanismos de **gamificação** (níveis, títulos e recompensas de progresso) e um **rodapé de dicas rolantes** com orientações financeiras. Esses recursos atacam diretamente a raiz da baixa adesão, estimulando o uso contínuo por meio de motivação e reforço positivo.

- **Plataforma adequada (Electron + Vue 3).** O uso de Electron permite distribuição desktop autônoma com acesso ao sistema de arquivos local; o Vue 3 atua na camada de visualização de forma reativa, mantendo resumos, gráficos e indicadores sempre sincronizados com os dados, sem recarregamentos manuais.

- **Experiência do usuário segura e acessível.** A interface simples e voltada ao usuário leigo favorece a adoção. (Como evolução mais recente, o produto também já conta com **perfis de dados independentes e criptografia por perfil**, com isolamento de arquivos e senha de descriptografia — recurso maduro, porém com menor prioridade no escopo do problema aqui analisado.)

Dessa forma, a abordagem ataca as raízes do problema de forma integrada: **adoção e engajamento** (interface clara, gamificação, dicas e resumos visíveis), **consciência financeira** (estatísticas e gráficos) e, de forma complementar, **separação e proteção** (perfis e criptografia), com tecnologias maduras e já testadas no contexto da aplicação.

---

## 5. Considerações finais

O entendimento do problema direciona o desenvolvimento para um produto de organização financeira centrado no **engajamento do usuário leigo**: funcionalidades básicas de gestão, **apresentação clara de resumos e estatísticas**, **gamificação** e **dicas rolantes** como sustentáculo do hábito de uso contínuo. A separação de perfis e a criptografia, embora já presentes como evoluções recentes do MeuBolso, figuram aqui como dimensões complementares e de menor prioridade. O escopo técnico apresentado já conta com prova de conceito funcional no produto, o que reduz riscos de implementação.

---

_Documento elaborado para atividade acadêmica — Entrega prevista: 19/08/2026._
