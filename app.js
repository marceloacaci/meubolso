// Estado em memória (espelho do arquivo). Tornado reativo (Vue.reactive)
// para que os componentes de view recomputem quando os dados mudam.
// OBS: para manter a reatividade, NUNCA reatribua `estado = {...}` — use
// Object.assign(estado, ...) (ver carregar/importar/restaurar).
let estado = Vue.reactive({ dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [], lixeira: { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] }, configuracoes: { moeda: 'BRL' }, filtro: { texto: '', categoria: '', status: '', periodo: '', periodoDe: '', periodoAte: '', ordenar: 'descricao', asc: true, pagina: 1, porPagina: 12 } });

// Cache síncrono dos perfis de dados (índice + ativo) para as views que
// renderizam de forma síncrona (ex.: página Configurações) poderem listar
// os perfis sem chamar IPC assíncrono dentro do template. Atualizado por
// atualizarPerfisInfo() nos pontos em que a lista muda.
let perfisInfo = { ativo: null, perfis: [] };
window.__perfisInfo = perfisInfo;
async function atualizarPerfisInfo() {
  try { const r = await window.api.perfilListar(); if (r && r.perfis) perfisInfo = { ativo: r.ativo, perfis: r.perfis }; } catch (_) {}
  window.__perfisInfo = perfisInfo;
  // Exibe "Usuário: <nome>" do perfil (usuário) ativo na sidebar, abaixo do logo.
  const el = document.getElementById('sidebar-usuario');
  if (el) {
    const ativo = (perfisInfo.perfis || []).find(p => p.id === perfisInfo.ativo);
    el.textContent = ativo ? t('perfil.usuario') + ': ' + ativo.nome : '';
    el.style.display = ativo ? '' : 'none';
  }
  if (window.render) window.render();
}

// ---------- Utilitários ----------
// Formatação monetária (BRL). O Intl insere "R$ " com espaço; envelopamos para
// colar o cifrão ao número ("R$100,00"), conforme padrão de UI solicitado.
const __fmtIntl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = { format: (n) => __fmtIntl.format(Number(n) || 0).replace(/R\$\s+/, 'R$') };
const fmtData = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
// Data de HOJE no fuso LOCAL (não UTC). Motivo: `new Date().toISOString()`
// devolve a data em UTC; logo após a meia-noite local (ex.: 23h30 em brasília,
// UTC−3) ela já aponta o dia SEGUINTE, fazendo pagamentos e vencimentos baterem
// no dia errado (defeito D-01 do AS-BUILT §8.1).
const hoje = () => {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Dinheiro (defeito D-02 do AS-BUILT §8.1) ----------
// Somatórios financeiros em ponto flutuante acumulam erro de centavos
// (0.1 + 0.2 === 0.30000000000000004). Toda soma de valores monetários deve
// passar por `somaDinheiro`, que opera em centavos inteiros e devolve Number
// arredondado a 2 casas — evitando que uma dívida "quitada" nunca zere exato
// (o que impediria o bônus de +50 XP de "dívida quitada").
function somaDinheiro(...valores) {
  let centavos = 0;
  for (const v of valores) {
    const n = Number(v) || 0;
    centavos += Math.round(n * 100);
  }
  return centavos / 100;
}
// Lê um valor monetário como Number arredondado (centavos), tolerante a string.
function numDinheiro(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

// Rótulos de status de parcela
const STATUS_LABEL = {
  pendente: 'status.pendente',
  pago: 'status.pago',
  atrasado: 'status.atrasado',
  negociado: 'status.negociado'
};

// ~50 dicas financeiras exibidas no rodapé rolante
const DICAS = [
  { pt: 'Crie uma reserva de emergência equivalente a 3 a 6 meses dos seus gastos.', en: 'Build an emergency fund worth 3 to 6 months of your expenses.', es: 'Crea un fondo de emergencia equivante a 3-6 meses de tus gastos.' },
  { pt: 'Pague as dívidas com os maiores juros primeiro (método avalanche).', en: 'Pay the highest-interest debts first (avalanche method).', es: 'Paga las dudas con mayores intereses primero (método avalancha).' },
  { pt: 'Anote todos os gastos por 30 dias para descobrir para onde vai o dinheiro.', en: 'Track every expense for 30 days to see where your money goes.', es: 'Anota todos los gastos por 30 días para ver a dónde va el dinero.' },
  { pt: 'Regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança e dívidas.', en: 'Rule 50/30/20: 50% needs, 30% wants, 20% savings and debt.', es: 'Regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro y dudas.' },
  { pt: 'Evite pagar só o mínimo do cartão de crédito: os juros são altíssimos.', en: 'Avoid paying only the credit card minimum: the interest is very high.', es: 'Evita pagar solo el mínimo de la tarjeta: los intereses son altísimos.' },
  { pt: 'Negocie prazos e taxas com credores antes de deixar a dívida vencer.', en: 'Negotiate terms and rates with creditors before the debt is due.', es: 'Negocia plazos y tasas con acreedores antes de que venza la duda.' },
  { pt: 'Use dinheiro ou débito para compras de impulso e evite surpresas na fatura.', en: 'Use cash or debit for impulse buys and avoid bill surprises.', es: 'Usa efectivo o débito para compras por impulso y evita sorpresas en el resumen.' },
  { pt: 'Reveja assinaturas recorrentes (streaming, apps) pelo menos 1x por ano.', en: 'Review recurring subscriptions (streaming, apps) at least once a year.', es: 'Revisa suscripciones recorrentes (streaming, apps) al menos 1 vez al año.' },
  { pt: 'Estabeleça metas financeiras claras e com prazo: torna poupar mais fácil.', en: 'Set clear, time-bound financial goals: it makes saving easier.', es: 'Establece metas financieras claras y con plazo: ahorrar se vuelve más fácil.' },
  { pt: 'Automatize a poupança: transfira um valor todo mês no dia do salário.', en: 'Automate savings: transfer an amount every month on payday.', es: 'Automatiza el ahorro: transfiere un monto cada mes el día del sueldo.' },
  { pt: 'Compare preços antes de comprar: a diferença pode ser de 30% ou mais.', en: 'Compare prices before buying: the difference can be 30% or more.', es: 'Compara precios antes de comprar: la diferencia puede ser del 30% o más.' },
  { pt: 'Não misture dinheiro de lazer com dinheiro de contas fixas.', en: 'Do not mix leisure money with fixed-bills money.', es: 'No mezzcles dinero de ocio con dinero de cuentas fijas.' },
  { pt: 'Fique atento ao Custo Efetivo Total (CET) de empréstimos e financiamentos.', en: 'Watch the Total Effective Cost (CET) of loans and financing.', es: 'Presta atención al Costo Efetivo Total (CET) de préstamos y financiaciones.' },
  { pt: 'Prefira quitar à vista quando o desconto supera a rentabilidade da poupança.', en: 'Prefer paying in full when the discount beats savings returns.', es: 'Prefiere pagar al contado cuando el descuento supera la rentabilidad del ahorro.' },
  { pt: 'Tenha um orçamento mensal escrito — quem não mede, não controla.', en: 'Keep a written monthly budget — what is not measured is not controlled.', es: 'Ten un presupuesto mensual por escrito — quien no mide, no controla.' },
  { pt: 'Reduza o uso de cheques especiais: o juro diário é um dos maiores do mercado.', en: 'Cut overdraft use: the daily interest is among the highest.', es: 'Reduce el uso de cheques especiales: el interés diario es de los más altos.' },
  { pt: 'Compre em atacado itens de consumo contínuo para economizar no longo prazo.', en: 'Buy staples in bulk to save over the long run.', es: 'Compra al por mayor artículos de consumo continuo para ahorrar a largo plazo.' },
  { pt: 'Revise seu plano de celular: planos antigos costumam ser mais caros.', en: 'Review your phone plan: old plans tend to be more expensive.', es: 'Revisa tu plan de celular: los planos antiguos suelen ser más caros.' },
  { pt: 'Use a técnica de esperar 24h antes de compras não essenciais.', en: 'Use the 24-hour wait rule before non-essential purchases.', es: 'Usa la técnica de esperar 24h antes de compras no esenciais.' },
  { pt: 'Mantenha contas separadas: corrente para gastos e poupança para objetivos.', en: 'Keep separate accounts: checking for spending, savings for goals.', es: 'Manten cuentas separadas: corriente para gastos y ahorro para objetivos.' },
  { pt: 'Aumente a renda negociando um aumento ou uma fonte extra de trabalho.', en: 'Boost income by negotiating a raise or a side job.', es: 'Aumenta el ingreso negociando un aumento o un trabajo extra.' },
  { pt: 'Pague contas em dia para não desperdiçar dinheiro com multas e juros.', en: 'Pay bills on time to avoid wasting money on fees and interest.', es: 'Paga las cuentas a tiempo para no desperdiciar dinero en multas e intereses.' },
  { pt: 'Evite financiar bens que desvalorizam (carro, eletrônicos) por muito tempo.', en: 'Avoid financing depreciating assets (car, electronics) for long periods.', es: 'Evita financiar bienes que se devalúan (coche, electrónicos) por mucho tiempo.' },
  { pt: 'Faça um fundo para impostos e despesas anuais, não só mensais.', en: 'Create a fund for taxes and yearly expenses, not just monthly.', es: 'Crea un fundo para impuestos y gastos anuales, no solo mensuales.' },
  { pt: 'Não use o limite do cartão como se fosse renda disponível.', en: 'Do not treat your card limit as available income.', es: 'No uses el límite de la tarjeta como si fuera ingreso disponible.' },
  { pt: 'Priorize quitar dívidas antes de investir em renda variável.', en: 'Prioritize paying off debt before investing in variable income.', es: 'Prioriza pagar dudas antes de invertir en renta variable.' },
  { pt: 'Leia o contrato antes de assinar: entenda IOF, seguros e taxas.', en: 'Read the contract before signing: understand IOF, insurance and fees.', es: 'Le el contrato antes de firmar: entiende IOF, seguros y tasas.' },
  { pt: 'Use aplicativos de controle financeiro para visualizar sua evolução.', en: 'Use finance apps to visualize your progress.', es: 'Usa aplicaciones de control financiero para visualizar tu evolución.' },
  { pt: 'Corrija o hábito de comprar por ansiedade ou tédio, não por necessidade.', en: 'Fix the habit of buying out of anxiety or boredom, not need.', es: 'Corrige el hábito de comprar por ansiedad o tedio, no por necesidad.' },
  { pt: 'Renegocie dívidas em atraso: credores preferem receber parcelado a nada.', en: 'Renegotiate overdue debts: creditors prefer installments to nothing.', es: 'Renegocia dudas en mora: los acreedores prefieren cuotas a nada.' },
  { pt: 'Invista em educação financeira — é o melhor retorno a longo prazo.', en: 'Invest in financial education — best long-term return.', es: 'Invierte en educación financiera — es el mejor retorno a largo plazo.' },
  { pt: 'Evite ser fiador de terceiros: a dívida pode virar sua sem aviso.', en: 'Avoid co-signing for others: the debt may become yours.', es: 'Evita ser fiador de terceros: la duda puede volverse tuya sin aviso.' },
  { pt: 'Compre bens usados de qualidade: economiza até 50% com mesma utilidade.', en: 'Buy quality used goods: save up to 50% with same utility.', es: 'Compra bienes usados de calidad: ahorra hasta 50% con la misma utilidad.' },
  { pt: 'Não tome empréstimo para pagar outra dívida sem plano de saída.', en: 'Do not borrow to pay another debt without an exit plan.', es: 'No pidas préstamo para pagar otra duda sin plan de salida.' },
  { pt: 'Monitore seu score de crédito: influencia juros de futuros contratos.', en: 'Monitor your credit score: it affects future loan rates.', es: 'Monitoriza tu score de crédito: influye en los intereses de futuros contratos.' },
  { pt: 'Separe um valor fixo para lazer no orçamento — restrição total não dura.', en: 'Set a fixed fun-money amount in your budget — total restriction fails.', es: 'Separa un monto fijo para ocio en el presupuesto — la restricción total no dura.' },
  { pt: 'Use listas de compras para não cair em promoções não planejadas.', en: 'Use shopping lists to avoid unplanned promotions.', es: 'Usa listas de compras para no caer en promociones no planeadas.' },
  { pt: 'Aprenda a diferença entre ativo (gera renda) e passivo (custa dinheiro).', en: 'Learn the difference between assets (earn) and liabilities (cost).', es: 'Aprende la diferencia entre activo (genera ingreso) y pasivo (cuesta dinero).' },
  { pt: 'Faça manutenção preventiva: evita reparos caros no futuro.', en: 'Do preventive maintenance: avoids costly future repairs.', es: 'Haz mantenimiento preventivo: evita reparaciones caras en el futuro.' },
  { pt: 'Negocie descontos à vista em serviços e consultorias.', en: 'Negotiate cash discounts on services and consulting.', es: 'Negocia descuentos al contado en servicios y consultorías.' },
  { pt: 'Não saia de casa sem um teto de gasto definido para o dia.', en: 'Do not leave home without a daily spending cap.', es: 'No salgas de casa sin un tope de gasto definido para el día.' },
  { pt: 'Converse com a família sobre dinheiro: metas em comum têm mais chance.', en: 'Talk with family about money: shared goals stand a better chance.', es: 'Habla con la familia sobre dinero: las metas en común tienen más posibilidades.' },
  { pt: 'Evite o "efeito treino": não gaste mais só porque ganhou bônus ou 13º.', en: 'Avoid the "treat effect": do not spend more just because of a bonus.', es: 'Evita el "efecto premio": no gastes más solo por un bónus o el 13º.' },
  { pt: 'Compare o custo por uso de bens antes de adquirir algo caro.', en: 'Compare cost-per-use of items before buying something pricey.', es: 'Compara el costo por uso de bienes antes de adquirir algo caro.' },
  { pt: 'Mantenha documentos e boletos organizados para pagar no prazo.', en: 'Keep documents and bills organized to pay on time.', es: 'Manten documentos y boletos organizados para pagar a tiempo.' },
  { pt: 'Use a regra dos 30 dias para compras grandes e evite arrependimento.', en: 'Use the 30-day rule for big purchases and avoid regret.', es: 'Usa la regla de 30 días para compras grandes y evita arrepentimiento.' },
  { pt: 'Reveja seu seguro: cobertura adequada evita perdas financeiras enormes.', en: 'Review your insurance: right coverage avoids huge financial losses.', es: 'Revisa tu seguro: cobertura adecuada evita pérdidas financieras enormes.' },
  { pt: 'Lembre-se: liberdade financeira é construída com pequenas decisões diárias.', en: 'Remember: financial freedom is built with small daily choices.', es: 'Recuerda: la libertad financiera se construe con pequeñas decisones diarias.' },
  { pt: 'Comece cedo: o tempo é o maior aliado dos juros compostos.', en: 'Start early: time is the biggest ally of compound interest.', es: 'Empieza temprano: el tiempo es el mayor aliado de los intereses compuestos.' },
  { pt: 'Pague a si mesmo primeiro: reserve antes de gastar.', en: 'Pay yourself first: set aside before spending.', es: 'Páguese a sí mismo primero: reserva antes de gastar.' },
  { pt: 'Evite comprar para "aparentar" — status não paga contas.', en: 'Avoid buying to "show off" — status does not pay bills.', es: 'Evita comprar para "aparentar" — el estatus no paga cuentas.' },
  { pt: 'Tenha 3 contas: gastos, emergência e objetivos de longo prazo.', en: 'Use 3 accounts: spending, emergency and long-term goals.', es: 'Ten 3 cuentas: gastos, emergencia y objetivos a largo plazo.' },
  { pt: 'Reveja sua vida de assinaturas: cancele o que não usa.', en: 'Audit your subscriptions: cancel what you do not use.', es: 'Audita tus suscripciones: cancela lo que no usas.' },
  { pt: 'Compre qualidade durável: mais caro hoje, mais barato no total.', en: 'Buy durable quality: pricier now, cheaper overall.', es: 'Compra calidad duradera: más caro hoy, más barato en total.' },
  { pt: 'Estipule um limite semanal de "prazer" e respeite-o.', en: 'Set a weekly "fun" limit and stick to it.', es: 'Estipula un límite semanal de "placer" y respétalo.' },
  { pt: 'Não compare sua jornada com o fim de outra pessoa.', en: 'Do not compare your journey to someone elses finish.', es: 'No compares tu recorrido con el final de otra persona.' },
  { pt: 'Use a regra 24h para compras acima de 10% da sua renda.', en: 'Use the 24h rule for buys above 10% of your income.', es: 'Usa la regla 24h para compras sobre el 10% de tu ingreso.' },
  { pt: 'Automatize contas fixas para nunca esquecer um vencimento.', en: 'Automate fixed bills so you never miss a due date.', es: 'Automatiza cuentas fijas para nunca olvidar un vencimiento.' },
  { pt: 'Mantenha um "fundo do carro" para manutenção e impostos.', en: 'Keep a "car fund" for upkeep and taxes.', es: 'Manten un "fondo del coche" para mantenimiento e impuestos.' },
  { pt: 'Priorize aposentadoria: contribua mesmo que pouco.', en: 'Prioritize retirement: contribute even if small.', es: 'Prioriza la jubilación: aporta aunque sea poco.' },
  { pt: 'Evite a "economia de pontos": não gaste só para acumular.', en: 'Avoid "points economics": do not spend just to earn.', es: 'Evita la "economía de puntos": no gastes solo para acumular.' },
  { pt: 'Negocie sua fatura de cartão se estiver com dificuldade.', en: 'Negotiate your card bill if you are struggling.', es: 'Negocia tu resumen de tarjeta si estás en dificultad.' },
  { pt: 'Use cupons e cashback, mas só em o que já compraria.', en: 'Use coupons and cashback, but only on what you would buy.', es: 'Usa cupones y cashback, pero solo en lo que ya comprarías.' },
  { pt: 'Não deixe dinheiro parado em contas sem rendimento.', en: 'Do not leave money idle in non-interest accounts.', es: 'No dejes dinero ocioso en cuentas sin rendimiento.' },
  { pt: 'Crie um "orçamento de felicidade": gaste com experiências.', en: 'Create a "happiness budget": spend on experiences.', es: 'Crea un "presupuesto de felicidad": gasta en experiencias.' },
  { pt: 'Evite lojas de conveniência: o preço por unidade é maior.', en: 'Avoid convenience stores: unit price is higher.', es: 'Evita tiendas de conveniencia: el precio por unidad es mayor.' },
  { pt: 'Pague dívidas do tipo "revolving" antes das de baixo juros.', en: 'Pay revolving debts before low-interest ones.', es: 'Paga dudas "revolving" antes que las de bajo interés.' },
  { pt: 'Mantenha 3 a 6 meses de despesa em fundo de emergência.', en: 'Keep 3 to 6 months of expenses in an emergency fund.', es: 'Manten 3 a 6 meses de gastos en fundo de emergencia.' },
  { pt: 'Use a regra 50/15/35: 50% contas, 15% lazer, 35% futuro.', en: 'Use 50/15/35: 50% bills, 15% fun, 35% future.', es: 'Usa 50/15/35: 50% cuentas, 15% ocio, 35% futuro.' },
  { pt: 'Venda o que não usa: desapego gera caixa.', en: 'Sell what you do not use: letting go creates cash.', es: 'Vende lo que no usas: el desapego genera efectivo.' },
  { pt: 'Evite compras "em conta" se não precisar daquilo.', en: 'Avoid "cheap" buys if you do not need the item.', es: 'Evita compras "baratas" si no necesitas eso.' },
  { pt: 'Aprenda a ler um demonstrativo bancário.', en: 'Learn to read a bank statement.', es: 'Aprende a leer un estado de cuenta bancario.' },
  { pt: 'Estabeleça um "dia sem gastos" por semana.', en: 'Set a "no-spend day" each week.', es: 'Establece un "día sin gastos" por semana.' },
  { pt: 'Use a técnica de "envelopes" para controlar categorias.', en: 'Use the "envelope" method to control categories.', es: 'Usa la técnica de "sobres" para controlar categorías.' },
  { pt: 'Não financie o estilo de vida com dívida de consumo.', en: 'Do not finance your lifestyle with consumer debt.', es: 'No financies tu estilo de vida con duda de consumo.' },
  { pt: 'Recompense-se com metas atingidas, mas sem estourar.', en: 'Reward yourself on hits, but without overspending.', es: 'Premiate con metas logradas, pero sin excederte.' },
  { pt: 'Evite a "inflação de estilo de vida" ao ganhar mais.', en: 'Avoid "lifestyle inflation" when you earn more.', es: 'Evita la "inflación de estilo de vida" al ganar más.' },
  { pt: 'Mantenha controle de pequenos gastos diários: eles somam.', en: 'Track small daily expenses: they add up.', es: 'Manten el control de pequeños gastos diarios: se suman.' },
  { pt: 'Prefira garantia estendida apenas em itens caros e frágeis.', en: 'Only buy extended warranty on pricey, fragile items.', es: 'Prefiere garantía extendida solo en artículos caros y frágiles.' },
  { pt: 'Use aplicativos de cashback em combústivel e mercado.', en: 'Use cashback apps for fuel and groceries.', es: 'Usa apps de cashback en combustible y supermercado.' },
  { pt: 'Não adianta ganhar mais se os gastos crescem na mesma proporção.', en: 'Earning more helps little if spending grows the same.', es: 'No sirve ganar más si los gastos crecen en la misma proporción.' },
  { pt: 'Crie um fundo para "sonhos": viagem, curso, negócio.', en: 'Build a "dream fund" for trips, courses, business.', es: 'Crea un fundo para "sueños": viaje, curso, negocio.' },
  { pt: 'Evite compras em grupo quando for só por pressão social.', en: 'Avoid group buys driven only by social pressure.', es: 'Evita compras en grupo solo por presión social.' },
  { pt: 'Reveja sua carteira de seguros uma vez por ano.', en: 'Review your insurance portfolio once a year.', es: 'Revisa tu cartera de seguros una vez al año.' },
  { pt: 'Use dinheiro para dias de "dieta financeira" controlada.', en: 'Use cash on controlled "financial diet" days.', es: 'Usa efectivo en días de "dieta financiera" controlada.' },
  { pt: 'Pague o cartão todo mês: juros de rotação são caríssimos.', en: 'Pay the card in full monthly: revolving interest is costly.', es: 'Paga la tarjeta todos los meses: los intereses de rotación son carísimos.' },
  { pt: 'Tenha metas de "não gastos" tanto quanto de gastos.', en: 'Set "no-spend" goals as much as spend goals.', es: 'Ten metas de "no gastar" tanto como de gastar.' },
  { pt: 'Evite lojas de atacado se mora sozinho e o alimento estraga.', en: 'Skip bulk stores if you live alone and food spoils.', es: 'Evita tiendas de mayoreo si vives solo y la comida se echa a perder.' },
  { pt: 'Aprenda a dizer "não" para convites que furam o orçamento.', en: 'Learn to say "no" to invites that break the budget.', es: 'Aprende a decir "no" a invitaciones que rompen el presupuesto.' },
  { pt: 'Use a regra 10-10-10: impacto em 10 dias, 10 meses, 10 anos.', en: 'Use the 10-10-10 rule: impact in 10 days, 10 months, 10 years.', es: 'Usa la regla 10-10-10: impacto en 10 días, 10 meses, 10 años.' },
  { pt: 'Mantenha um "diário de gratidão" para comprar menos por emoção.', en: 'Keep a gratitude journal to buy less on emotion.', es: 'Manten un "diario de gratitud" para comprar menos por emoción.' },
  { pt: 'Compre livros e cursos: conhecimento rende juros altos.', en: 'Buy books and courses: knowledge pays high returns.', es: 'Compra libros y cursos: el conocimiento paga intereses altos.' },
  { pt: 'Não use "parceria" para justificar gastos supérfluos.', en: 'Do not use "sharing" to justify needless spending.', es: 'No uses la "compañía" para justificar gastos supérfluos.' },
  { pt: 'Estabeleça um teto de gastos com cartão por mês.', en: 'Set a monthly card-spending ceiling.', es: 'Establece un tope de gasto con tarjeta por mes.' },
  { pt: 'Use a técnica "compre um, use um ano" antes de repetir.', en: 'Use the "buy one, use one year" test before repeating.', es: 'Usa la técnica "compra uno, usa un año" antes de repetir.' },
  { pt: 'Evite juros compostos contra você: quite cedo.', en: 'Avoid compound interest against you: pay off early.', es: 'Evita intereses compuestos en su contra: paga temprano.' },
  { pt: 'Mantenha foco no "porquê" do seu plano financeiro.', en: 'Keep focus on the "why" of your financial plan.', es: 'Manten el foco en el "porqué" de tu plan financiero.' }
];

// ⚠️ Funções de cálculo financeiro foram EXTRAÍDAS para `src/dominio.js`
// (S1-2 do cronograma) e ficam disponíveis globalmente (carregado antes deste
// arquivo em index.html). As que dependem de `estado.pagamentos` são mantidas
// AQUI como wrappers finos. Padrão: capturam a referência do domínio via
// `globalThis.*` (explícito, sem hoisting) e reatribuem o global para o wrapper.
// Implementação e testes: src/dominio.js + tests/.
const _domTotalPago = globalThis.totalPago;
const _domSaldoDivida = globalThis.saldoDivida;
const _domValorPagoParcela = globalThis.valorPagoParcela;
const _domResumoParcelas = globalThis.resumoParcelas;
const _domSincronizarParcela = globalThis.sincronizarParcela;
globalThis.totalPago = function (d) { return _domTotalPago(d, estado.pagamentos); };
globalThis.saldoDivida = function (d) { return _domSaldoDivida(d, estado.pagamentos); };
globalThis.valorPagoParcela = function (d, parcelaId) {
  if (!parcelaId) return globalThis.totalPago(d);
  return _domValorPagoParcela(d, parcelaId, estado.pagamentos);
};
globalThis.resumoParcelas = function (d) { return _domResumoParcelas(d, estado.pagamentos); };
globalThis.sincronizarParcela = function (divida, parcelaId) { return _domSincronizarParcela(divida, parcelaId, estado.pagamentos); };

// Monta o bloco de resumo de parcelas exibido no modal de pagamentos (formato simples).
function resumoParcelasHtml(d, r) {
  return `
    <div class="resumo-parcelas">
      <div class="campo"><label>${t('label.parcelasPagas')}</label><span>${r.pagas} de ${r.total} paga(s)</span></div>
      <div class="campo"><label>${t('label.valorPago')}</label><span>${fmt.format(r.valorPago)} de ${fmt.format(r.valorTotal)} (${r.percentualPago}%)</span></div>
      <div class="campo"><label>${t('label.restante')}</label><span>${fmt.format(r.valorRestante)} (${r.percentualRestante}%)</span></div>
    </div>
  `;
}

// ---------- Pagamento por parcela (individual) ----------
// Soma APENAS os pagamentos vinculados a UMA parcela específica da dívida.
// Cada parcela é tratada de forma isolada: uma parcela não paga tem 0 pago.
// Nota: as implementações de `valorPagoParcela` e `sincronizarParcela` foram
// extraídas para src/dominio.js (valorPagoParcela_D / sincronizarParcela_D); os
// wrappers acima injetam estado.pagamentos. Ver tests/valorPagoParcela.test.js.

// Monta o bloco de resumo de UMA parcela selecionada, exibindo o quanto

// JÁ foi pago nela (individual) vs. o valor da própria parcela.
function pagamentosParcelaHtml(d, parcelaId) {
  const parc = (d.parcelas || []).find(p => p.id === parcelaId);
  const valorParcela = parc ? Number(parc.valor) || 0 : 0;
  const pagoParcela = valorPagoParcela(d, parcelaId);
  const restanteParcela = Math.max(0, valorParcela - pagoParcela);
  const percPago = valorParcela > 0 ? ((pagoParcela / valorParcela) * 100).toFixed(0) : 0;
  const percRestante = valorParcela > 0 ? ((restanteParcela / valorParcela) * 100).toFixed(0) : 0;
  return `
    <div class="pagamento-parcela">
      <div class="campo"><label>${t('label.pagoParcela')}</label><span>${fmt.format(pagoParcela)} de ${fmt.format(valorParcela)} (${percPago}%)</span></div>
      <div class="campo"><label>${t('label.restanteParcela')}</label><span>${fmt.format(restanteParcela)} (${percRestante}%)</span></div>
    </div>
  `;
}

// ---------- Métricas e gráficos (SVG puro, sem dependências) ----------
const CATEGORIAS = {
  emprestimo: { label: 'cat.emprestimo', cor: '#2d6a4f' },
  cartao: { label: 'cat.cartao', cor: '#c1121f' },
  servico: { label: 'cat.servico', cor: '#b45309' },
  outro: { label: 'cat.outro', cor: '#64748b' }
};
const CORES_STATUS = {
  pendente: '#c1121f',
  pago: '#166534',
  atrasado: '#7f1d1d',
  negociado: '#b45309'
};

// ---------- Internacionalização (i18n) ----------
// Estado de idioma/tema persistido em estado.configuracoes.
let idiomaAtual = (estado.configuracoes && estado.configuracoes.idioma) || 'pt';
let temaAtual = (estado.configuracoes && estado.configuracoes.tema) || 'light';
// S6-3: trava de segurança — so permite persistir apos os dados terem sido
// carregados. Evita sobrescrever o arquivo criptografado com o estado vazio
// (dividas:[]) caso algum persistir() dispare antes do usuario desbloquear.
let dadosCarregados = false;

// Ref reativo (Vue) que dispara a re-renderização das views. Toda ação que
// antes chamava render() (e reescrevia app.innerHTML) agora incrementa este
// tick; os componentes de view observam uiTick e recalculam o v-html sozinhos.
// Isso é o "Vue dono da view" — o app.js NUNCA reescreve o #app; o Vue reage.
const uiTick = Vue.ref(0);
window.uiTick = uiTick;
// Ref reativo dedicado à view atual. O root Vue (<component :is>) observa
// este ref para TROCAR de view. Mantemos viewAtual (let) em sincronia para
// o resto do app.js (renderSobre, etc.), mas a TROCA em si usa o ref para
// garantir reatividade (um plain let sozinho não dispara o Vue).
const viewRef = Vue.ref('painel');
window.__viewRef = viewRef;

// Dicionário de traduções movido para src/i18n/ (S3-1) — carregado como
// <script> no index.html (antes de app.js) e exposto como global window.I18N.
// Aqui apenas consumimos o global I18N.

function t(k) {
  return (I18N[idiomaAtual] && I18N[idiomaAtual][k] != null) ? I18N[idiomaAtual][k] : (I18N.pt[k] != null ? I18N.pt[k] : k);
}

// Expõe helpers para o restante do app (render de views, gráficos, badges)
// consumir sem acoplar ao escopo fechado do app.js. Atualizado quando o
// idioma muda.
function catLabel(c) { return t(CATEGORIAS[c]?.label) || c; }
window.MeuBolso = {
  t, fmt, catLabel, totalDivida, totalPago, saldoDivida, ganharXP,
  get idioma() { return idiomaAtual; },
  // Referência ao estado reativo (Vue.reactive) para inspeção/extensibilidade.
  // Mutar window.MeuBolso.estado.dividas (push/splice) e chamar render()
  // faz a view recalcular sozinha — é isso que torna o Vue "dono da view".
  estado
};
function atualizarMeuBolso() { window.MeuBolso = { t, fmt, catLabel, totalDivida, totalPago, saldoDivida, get idioma() { return idiomaAtual; }, estado }; }
// Tradução com interpolação de variáveis: ti('chave', {n: 3}) substitui {n}.
function ti(k, vars) {
  let s = t(k);
  if (vars) for (const key in vars) s = s.split('{' + key + '}').join(vars[key]);
  return s;
}

// Aplica tema e idioma persistidos ao carregar
function aplicarTema() {
  const isDark = temaAtual === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  // Bootstrap 5.3 usa data-bs-theme para modo escuro nativo dos componentes.
  document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
  document.querySelectorAll('[data-tema]').forEach(b => {
    const on = b.dataset.tema === temaAtual;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  // Gráficos (Chart.js) cacheiam a cor do texto no momento da montagem; ao
  // trocar o tema, força o redesenho para aplicar a nova cor (claro/escuro).
  if (window.ChartGraficos && window.ChartGraficos.atualizarCores) {
    try { window.ChartGraficos.atualizarCores(); } catch (_) {}
  }
}
function aplicarIdioma() {
  document.documentElement.setAttribute('lang', idiomaAtual === 'pt' ? 'pt-BR' : idiomaAtual);
  document.querySelectorAll('[data-idioma]').forEach(b => {
    const on = b.dataset.idioma === idiomaAtual;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  // Sincroniza o relógio de Brasília (relogio.js lê 'appIdioma' do localStorage).
  try { localStorage.setItem('appIdioma', idiomaAtual); } catch (e) {}
  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new window.Event('idiomaAlterado'));
  }
  traduzirEstaticos();
}

// Paleta de cores de destaque (cor primária do app + mapeamento Bootstrap).
const ACENTOS = {
  verde:   { primary: '#2d6a4f', hover: '#1b4332', rgb: '45,106,79',  textEmph: '#1b4332', bgSubtle: '#e6f3ec', borderSubtle: '#b7ddc9' },
  azul:    { primary: '#1d4ed8', hover: '#1e40af', rgb: '29,78,216',  textEmph: '#13347f', bgSubtle: '#e6ecfd', borderSubtle: '#b7c5f2' },
  roxo:    { primary: '#6d28d9', hover: '#5b21b6', rgb: '109,40,217', textEmph: '#4c1d95', bgSubtle: '#ece4fd', borderSubtle: '#cbbdf2' },
  laranja: { primary: '#c2410c', hover: '#9a3412', rgb: '194,65,12', textEmph: '#7c2d12', bgSubtle: '#fbe6db', borderSubtle: '#f2c3aa' },
  rosa:    { primary: '#be185d', hover: '#9d174d', rgb: '190,24,93',  textEmph: '#831843', bgSubtle: '#fbe3ee', borderSubtle: '#f2bcd4' }
};
let acentoAtual = (estado.configuracoes && estado.configuracoes.acento) || 'verde';

function aplicarAceno() {
  const a = ACENTOS[acentoAtual] || ACENTOS.verde;
  const root = document.documentElement.style;
  root.setProperty('--primary', a.primary);
  root.setProperty('--primary-hover', a.hover);
  root.setProperty('--bs-primary', a.primary);
  root.setProperty('--bs-primary-rgb', a.rgb);
  root.setProperty('--bs-primary-text-emphasis', a.textEmph);
  root.setProperty('--bs-primary-bg-subtle', a.bgSubtle);
  root.setProperty('--bs-primary-border-subtle', a.borderSubtle);
  document.querySelectorAll('[data-accent]').forEach(b => {
    b.classList.toggle('active', b.dataset.accent === acentoAtual);
  });
}
function salvarPrefs() {
  estado.configuracoes = estado.configuracoes || {};
  estado.configuracoes.tema = temaAtual;
  estado.configuracoes.idioma = idiomaAtual;
  estado.configuracoes.acento = acentoAtual;
  persistir();
}
// Traduz os textos estáticos do topbar e tabs (fora do #app, não re-renderizados)
function traduzirEstaticos() {
  const titulo = document.getElementById('app-titulo');
  if (titulo) titulo.textContent = t('app.titulo');
  const map = {
    'exportar': 'acao.exportar', 'importar': 'acao.importar', 'restaurar': 'acao.restaurar'
  };
  document.querySelectorAll('.topbar-acoes [data-acao]').forEach(b => {
    const chave = map[b.dataset.acao];
    if (chave) b.textContent = t(chave);
  });
  const tabs = {
    'painel': 'tab.painel', 'dividas': 'tab.dividas', 'pagamentos': 'tab.pagamentos',
    'vencimentos': 'tab.vencimentos', 'relatorio': 'tab.relatorio', 'configuracoes': 'tab.configuracoes',
    'sobre': 'tab.sobre', 'carteiras': 'tab.carteiras', 'lixeira': 'tab.lixeira'
  };
  document.querySelectorAll('.tab').forEach(b => {
    const chave = tabs[b.dataset.view];
    if (chave) {
      // Preserva o ícone e o badge; troca só o rótulo textual.
      const label = b.querySelector('.nav-label');
      if (label) label.textContent = t(chave);
    }
  });
  // Rótulo "DICAS" do carrossel de dicas.
  const tag = document.querySelector('.ticker-tag');
  if (tag) tag.textContent = t('ticker.tag');
  // Traduz quaisquer elementos com data-i18n (ex.: botão "Nova dívida" e títulos de grupo).
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // Traduz tooltips (title) marcados com data-i18n-title (ex.: menu de configurações rápidas).
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
    if (el.getAttribute('aria-label') === el.dataset.i18nTitleFallback) {
      el.setAttribute('aria-label', t(el.dataset.i18nTitle));
    }
  });
  // Tooltip das bandeiras de idioma: nome do idioma-alvo NO idioma atual do sistema.
  document.querySelectorAll('[data-idioma]').forEach(b => {
    b.setAttribute('title', t('idiomaNome.' + b.dataset.idioma));
    b.setAttribute('aria-label', t('idiomaNome.' + b.dataset.idioma));
  });
  // Botão de criptografia no menu rápido reflete o estado (ativar/desativar).
  // Extraído para atualizarGearCripto() para que também rode após carregar/trocar
  // perfil (não só na troca de idioma) — ver bug: engrenagem não acompanhava o
  // estado do perfil recém-carregado quando o idioma não mudava.
  atualizarGearCripto();
}

// Atualiza o botão de criptografia do menu de configurações rápidas (engrenagem
// ao lado do relógio) para refletir o estado do perfil ATIVO. Deve ser chamado
// após cada carregamento/troca de perfil, não apenas na troca de idioma.
function atualizarGearCripto() {
  const gearCripto = document.getElementById('gear-cripto-btn');
  if (gearCripto) {
    const ativa = !!(estado.configuracoes && estado.configuracoes.criptografia && estado.configuracoes.criptografia.ativa);
    gearCripto.dataset.acao = ativa ? 'cripto-desativar' : 'cripto-ativar';
    gearCripto.classList.toggle('gear-cripto--ativa', ativa);
    // Mesma coloração do botão da página Configurações: borda/vermelho sem
    // preenchimento ao desativar (perigo) e borda de destaque ao ativar.
    gearCripto.classList.toggle('gear-cripto--perigo', ativa);
    gearCripto.classList.toggle('gear-cripto--destaque', !ativa);
    const label = gearCripto.querySelector('[data-i18n]');
    if (label) label.textContent = t(ativa ? 'cripto.desativar' : 'cripto.ativar');
  }
  // Reconstrói o carrossel de dicas no idioma atual.
  initTicker();
  // Re-renderiza o botão "Ver detalhes" da caixa de nível no idioma atual.
  atualizarBadgeNivel();
}

// Preenche os badges dinâmicos da sidebar (só aparecem com valor > 0).
function atualizarBadges() {
  const dividasAtivas = estado.dividas.length;
  const pendentes = estado.dividas.reduce((acc, d) =>
    acc + (d.parcelas || []).filter(p => (p.status || 'pendente') !== 'pago').length, 0);
  const { proximas, atrasadas } = calcularVencimentos();

  const setBadge = (id, valor, alerta = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!valor) { el.hidden = true; el.textContent = ''; el.classList.remove('nav-badge--alerta'); return; }
    el.hidden = false;
    el.textContent = String(valor);
    // Vermelho (--alerta) SÓ quando há vencimentos PRÓXIMOS (atenção iminente).
    el.classList.toggle('nav-badge--alerta', alerta);
  };
  setBadge('badge-dividas', dividasAtivas);
  setBadge('badge-pagamentos', pendentes);
  // O badge de vencimentos mostra o total de dívidas próximas E vencidas.
  // Fica vermelho (--alerta) apenas se houver 1+ (atenção iminente).
  const totalVenc = proximas.length + atrasadas.length;
  setBadge('badge-vencimentos', totalVenc, totalVenc > 0);
  setBadge('badge-lixeira', estado.lixeira.dividas.length + estado.lixeira.carteiras.length
    + estado.lixeira.recorrentes.length + estado.lixeira.metas.length);
  // S6-3: card de game no menu (sidebar) atualiza a cada render, não só na
  // página de Pontuação/Conquistas. Garante que os dados do game apareçam no menu.
  atualizarBadgeNivel();
}

function calcularMetricas() {
  // totalGeral = soma dos totais de cada dívida (função totalDivida(d) em
  // src/dominio.js). NÃO chamar a variável de `totalDivida`, senão ela sombreia
  // a função e o reduce cai em TDZ ("Cannot access before initialization").
  const totalGeral = estado.dividas.reduce((acc, d) => somaDinheiro(acc, totalDivida(d)), 0);
  const totalPago = estado.pagamentos.reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
  const saldo = Math.max(0, totalGeral - totalPago);
  const progresso = totalGeral > 0 ? Math.min(100, (totalPago / totalGeral) * 100) : 0;

  const porCategoria = Object.keys(CATEGORIAS).map(k => {
    const valor = estado.dividas
      .filter(d => (d.categoria || 'outro') === k)
      .reduce((acc, d) => somaDinheiro(acc, totalDivida(d)), 0);
    return { key: k, label: t(CATEGORIAS[k].label), cor: CATEGORIAS[k].cor, valor };
  }).filter(c => c.valor > 0);

  const hojeDt = new Date();
  const todosStatus = { pendente: 0, pago: 0, atrasado: 0, negociado: 0 };
  for (const d of estado.dividas) {
    for (const p of (d.parcelas || [])) {
      const s = p.status || 'pendente';
      todosStatus[s] = (todosStatus[s] || 0) + 1;
      if (s === 'pendente' && p.vencimento && new Date(p.vencimento) < hojeDt) {
        // vencida e não paga -> conta como atrasada no gráfico
        todosStatus.pendente--;
        todosStatus.atrasado++;
      }
    }
  }
  const porStatus = Object.keys(todosStatus)
    .filter(k => todosStatus[k] > 0)
    .map(k => ({ key: k, label: t(STATUS_LABEL[k]) || k, cor: CORES_STATUS[k] || '#64748b', qtd: todosStatus[k] }));

  return { totalGeral, totalPago, saldo, progresso, porCategoria, porStatus };
}

function gerarInsights(m) {
  const out = [];
  if (m.totalGeral === 0) {
    out.push({ tipo: 'neutro', ico: ICON.vazio, texto: ti('insight.vazio') });
    return out;
  }
  if (m.progresso >= 75) out.push({ tipo: 'bom', ico: ICON.festa, texto: ti('insight.quitadoAlto', { p: m.progresso.toFixed(0) }) });
  else if (m.progresso >= 40) out.push({ tipo: 'bom', ico: ICON.forca, texto: ti('insight.quitadoMedio', { p: m.progresso.toFixed(0) }) });
  else if (m.progresso > 0) out.push({ tipo: 'aten', ico: ICON.ampulheta, texto: ti('insight.quitadoBaixo', { p: m.progresso.toFixed(0) }) });
  else out.push({ tipo: 'ruim', ico: ICON.alerta, texto: ti('insight.nenhumPagamento') });

  const atrasadas = (m.porStatus.find(s => s.key === 'atrasado') || {}).qtd || 0;
  if (atrasadas > 0) out.push({ tipo: 'ruim', ico: ICON.alerta, texto: ti('insight.atrasadas', { n: atrasadas }) });

  const maior = estado.dividas.reduce((max, d) => (totalDivida(d) > totalDivida(max) ? d : max), estado.dividas[0]);
  if (maior) out.push({ tipo: 'neutro', ico: ICON.marcador, texto: ti('insight.maior', { d: escapeHtml(maior.descricao), v: fmt.format(totalDivida(maior)) }) });

  const cartao = (m.porCategoria.find(c => c.key === 'cartao') || {}).valor || 0;
  if (cartao > 0) out.push({ tipo: 'aten', ico: ICON.cartao, texto: ti('insight.cartao', { p: ((cartao / m.totalGeral) * 100).toFixed(0) }) });

  const negociadas = (m.porStatus.find(s => s.key === 'negociado') || {}).qtd || 0;
  if (negociadas > 0) out.push({ tipo: 'bom', ico: ICON.acordo, texto: ti('insight.negociadas', { n: negociadas }) });

  const totalParcelas = estado.dividas.reduce((acc, d) => acc + (d.parcelas || []).length, 0);
  if (totalParcelas > 12) out.push({ tipo: 'aten', ico: ICON.quebra, texto: ti('insight.muitasParcelas', { n: totalParcelas }) });

  return out;
}

// Ícone SVG de carteira semi-aberta (neutro, em currentColor) — substitui o emoji.

// Gráficos de pizza/rosca agora usam Chart.js (ver graficos-chartjs.js):
// rotação inicial a partir do topo (como um relógio), fade/load suave e
// hoverOffset (fatias se separam no hover). Cada função devolve um <canvas> e
// registra os dados para montagem pós-render (Vue.nextTick).
let __graficoSeq = 0;
function graficoPizza(dados) {
  if (!dados.length) return '<p class="stat-sub">' + t('painel.semDados') + '</p>';
  // Ordena do MAIOR para o MENOR (maior fatia no topo, varrendo como relógio).
  const ordenado = [...dados].sort((a, b) => b.valor - a.valor);
  const total = ordenado.reduce((a, d) => a + d.valor, 0);
  const id = 'chart-pizza-' + (__graficoSeq++);
  if (window.ChartGraficos) {
    window.ChartGraficos.registrar(id, {
      tipo: 'doughnut',
      labels: ordenado.map(d => d.label),
      valores: ordenado.map(d => d.valor),
      cores: ordenado.map(d => d.cor),
      centroLabel: t('grafico.total'),
      centroValor: fmt.format(total),
      fmt: (v) => fmt.format(v)
    });
  }
  return `<div class="chart-wrap"><canvas id="${id}" role="img" aria-label="${t('grafico.dividaCategoria')}"></canvas></div>`;
}

// Gráfico de rosca (pago vs em aberto).
function graficoRosca(m) {
  const id = 'chart-rosca-' + (__graficoSeq++);
  if (window.ChartGraficos) {
    const segs = [];
    if (m.totalGeral > 0) {
      const pago = m.totalPago / m.totalGeral;
      const aberto = 1 - pago;
      if (aberto > 0) segs.push({ label: t('grafico.emAberto'), v: aberto, c: '#c1121f' });
      if (pago > 0) segs.push({ label: t('grafico.pago'), v: pago, c: '#2d6a4f' });
      if (!segs.length) segs.push({ label: t('grafico.pago'), v: 1, c: '#2d6a4f' });
    } else {
      segs.push({ label: t('grafico.semDivida'), v: 1, c: '#e5e7eb' });
    }
    window.ChartGraficos.registrar(id, {
      tipo: 'doughnut',
      labels: segs.map(s => s.label),
      valores: segs.map(s => s.v),
      cores: segs.map(s => s.c),
      centroLabel: t('grafico.quitado'),
      centroValor: m.progresso.toFixed(0) + '%',
      fmt: (v) => (v * 100).toFixed(0) + '%'
    });
  }
  return `<div class="chart-wrap"><canvas id="${id}" role="img" aria-label="${t('grafico.pagoVsAberto')}"></canvas></div>`;
}

// cada barra cresce de baixo p/ cima, com tooltip e hover. Cores por status.
function graficoBarrasStatus(dados) {
  if (!dados.length) return '<p class="stat-sub">' + t('grafico.semParcelas') + '</p>';
  const id = 'chart-barras-status-' + (__graficoSeq++);
  if (window.ChartGraficos) {
    window.ChartGraficos.registrar(id, {
      tipo: 'bar',
      labels: dados.map(d => d.label),
      valores: dados.map(d => d.qtd),
      cores: dados.map(d => d.cor),
      fmt: (v) => v + ' parcelas'
    });
  }
  return `<div class="chart-wrap"><canvas id="${id}" role="img" aria-label="${t('grafico.status')}"></canvas></div>`;
}

// Gráfico de barras de XP por motivo (tela de detalhes de pontos).
// Usa o MESMO degradê da barra do menu (primary -> success-claro) e a
// animação .chart-bar (cresce de baixo para cima, suave).
function graficoBarrasXP(historico) {
  if (!historico || !historico.length) return '<p class="stat-sub">' + t('game.logVazio') + '</p>';
  // Agrega XP positivo por motivo (categoria).
  const agregado = {};
  for (const h of historico) {
    if ((h.pontos || 0) <= 0) continue;
    const chave = normalizarMotivoChave(h.motivo);
    agregado[chave] = (agregado[chave] || 0) + h.pontos;
  }
  let dados = Object.entries(agregado)
    .map(([chave, xp]) => {
      const res = resolverMotivo(chave);
      const label = res ? (res.quest ? t(res.quest) : t(chave)) : t(chave);
      return { label, xp };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 6);
  if (!dados.length) return '<p class="stat-sub">' + t('game.logVazio') + '</p>';

  const id = 'chart-barras-xp-' + (__graficoSeq++);
  if (window.ChartGraficos) {
    window.ChartGraficos.registrar(id, {
      tipo: 'bar',
      degrade: true, // gradiente primário -> success-claro por barra
      labels: dados.map(d => d.label),
      valores: dados.map(d => d.xp),
      fmt: (v) => '+' + v + ' XP'
    });
  }
  return `<div class="game-grafico-wrap"><canvas id="${id}" role="img" aria-label="${t('game.graficoXP')}"></canvas></div>`;
}

let _toastTimer = null;
function toast(msg, tipo = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${tipo}`;
  // Garante que apareça: força display inline (especificidade máxima), o que
  // SEMPRE vence o "display: none" que o Bootstrap 5 define na classe .toast
  // (e qualquer outro CSS conflitante), independente da ordem de carregamento
  // das folhas de estilo. Sem isso, o aviso de XP ficava invisível no Electron.
  el.style.display = 'flex';
  el.classList.remove('hidden');
  // Cancela o timer anterior para não esconder um toast novo cedo demais
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.add('hidden'); el.style.display = ''; }, 2400);
}
// Variante que aceita HTML já montado (ex.: toast de XP com ícone SVG).
// O chamador é responsável por escapar qualquer texto que possa vir de fora
// (usamos escapeHtml nas partes de texto); o SVG do ícone vem do nosso mapa
// interno (ICON.*) e é considerado confiável.
function toastHTML(html, tipo = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = html;
  el.className = `toast ${tipo}`;
  el.style.display = 'flex';
  el.classList.remove('hidden');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.add('hidden'); el.style.display = ''; }, 2400);
}

// ---------- Persistência ----------
// ---------- Persistência ----------
async function carregar() {
  // NÃO reatribui `estado = ...` (perderia a reatividade do Vue.reactive).
  // Carrega em um objeto temporário e faz merge no estado reativo.
  dadosCarregados = false; // trava: estado ainda nao populado (ex.: arquivo cripto)
  const novo = await window.api.carregar();
  // S6-3: arquivo criptografado sem senha na sessão -> pede a senha.
  if (novo && novo.criptografado) {
    abrirModalDesbloqueio();
    return;
  }
  Object.assign(estado, {
    configuracoes: novo.configuracoes || { moeda: 'BRL' },
    dividas: novo.dividas || [],
    pagamentos: novo.pagamentos || [],
    carteiras: novo.carteiras || [],
    recorrentes: novo.recorrentes || [],
    metas: novo.metas || [],
    lixeira: novo.lixeira || { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] },
    filtro: novo.filtro || { texto: '', categoria: '', status: '', periodo: '', ordenar: 'descricao', asc: true, pagina: 1, porPagina: 12 },
    gamificacao: novo.gamificacao || { xp: 0, nivel: 1, ultimoAcesso: '' }
  });
  dadosCarregados = true; // estado populado: persistir() liberado
  if (!estado.configuracoes) estado.configuracoes = { moeda: 'BRL' };
  if (typeof estado.configuracoes.notificarVencimento !== 'boolean') estado.configuracoes.notificarVencimento = true;
  if (typeof estado.configuracoes.antecedenciaNotif !== 'number') estado.configuracoes.antecedenciaNotif = 3;
  if (!Array.isArray(estado.configuracoes.avisados)) estado.configuracoes.avisados = [];
  if (!estado.dividas) estado.dividas = [];
  if (!estado.pagamentos) estado.pagamentos = [];
  if (!estado.carteiras) estado.carteiras = []; // preparação para a funcionalidade Carteiras
  if (!estado.recorrentes) estado.recorrentes = []; // S4-1: despesas recorrentes
  if (!estado.metas) estado.metas = []; // S4-3: metas financeiras
  if (!estado.lixeira) estado.lixeira = { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] };
  if (!estado.gamificacao) estado.gamificacao = { xp: 0, nivel: 1, ultimoAcesso: '' };
  if (!estado.gamificacao.historico) estado.gamificacao.historico = [];
  // Dados legados: o usuário já tem XP acumulado, mas o histórico de pontos
  // passou a ser registrado só depois. Semeia um registro de "saldo anterior"
  // para que o log reflita os pontos já existentes (evita log vazio com XP > 0).
  if (estado.gamificacao.historico.length === 0 && (estado.gamificacao.xp || 0) > 0) {
    estado.gamificacao.historico.push({
      pontos: estado.gamificacao.xp,
      motivo: 'xp.saldoAnterior',
      nivel: estado.gamificacao.nivel || nivelDe(estado.gamificacao.xp),
      horario: horarioAgora()
    });
  }
  // S6-4: aplica as preferências DO PERFIL carregado (idioma, tema, acento) para
  // que cada perfil tenha seu próprio idioma/tema (ex.: esposa em inglês).
  const cfg = estado.configuracoes || {};
  if (cfg.idioma && cfg.idioma !== idiomaAtual) { idiomaAtual = cfg.idioma; aplicarIdioma(); }
  if (cfg.tema && cfg.tema !== temaAtual) { temaAtual = cfg.tema; aplicarTema(); }
  if (cfg.acento && cfg.acento !== acentoAtual) { acentoAtual = cfg.acento; aplicarAceno(); }
  // Recálculo retroativo: a pontuação por gestão de dívida caiu de 30 para 5 XP.
  // Recompensa o XP já registrado no histórico e recalcula o total/nível.
  await migrarXPgestao();
  // Reflete o estado de criptografia do perfil carregado na engrenagem (menu rápido),
  // independente de ter havido troca de idioma.
  atualizarGearCripto();
  // Mantém o cache de perfis (usado pela página Configurações) em sincronia
  // com o perfil ativo recém-carregado.
  await atualizarPerfisInfo();
}

// S6-3: modal de desbloqueio do arquivo criptografado.
function abrirModalDesbloqueio() {
  // "Entrar sem senha" apenas FECHA o modal — não grava nada (a trava
  // dadosCarregados impede persistir() de sobrescrever o arquivo). Os dados
  // criptografados permanecem intactos em disco até o usuário desbloquear.
  const entrarSemSenha = () => {
    // Não faz carregar() nem salvar: o arquivo criptografado fica intacto.
    if (window.mostrarToast) window.mostrarToast(t('cripto.semSenhaAviso') || 'Dados ocultos. Digite a senha depois para acessá-los.', 'info');
    if (window.render) window.render();
  };
  abrirModal(
    t('cripto.desbloquear') || 'Dados protegidos por criptografia',
    [
      { label: t('cripto.senha') || 'Senha', name: 'senha', type: 'password', required: true }
    ],
    async (vals) => {
      const senha = (vals && vals.senha) || '';
      if (!senha) {
        if (window.mostrarToast) window.mostrarToast(t('cripto.senhaVazia') || 'Digite a senha para desbloquear os dados.', 'erro');
        return false; // mantem o modal aberto
      }
      const r = await window.api.criptoDesbloquear(senha);
      if (!r || !r.ok) {
        if (window.mostrarToast) window.mostrarToast(t('cripto.senhaIncorreta') || 'Senha incorreta. Tente novamente.', 'erro');
        return false; // mantem o modal aberto
      }
      if (window.mostrarToast) window.mostrarToast(t('cripto.desbloqueado') || 'Dados desbloqueados', 'sucesso');
      await carregar();
      if (window.render) window.render(); // garante a atualização da UI com os dados
      return true;
    },
    {
      mensagem: t('cripto.desbloquearMsg') ||
        'Seus dados estão criptografados neste computador. Digite a senha para acessá-los. Se preferir, pode entrar sem senha — seus dados permanecerão salvos e protegidos, apenas ocultos até você desbloquear.',
      acaoSecundaria: {
        texto: t('cripto.entrarSemSenha') || 'Entrar sem senha (dados ocultos)',
        aoClicar: entrarSemSenha
      }
    }
  );
}

// S6-4: funções de múltiplos perfis de dados.
async function listarPerfis() {
  try { return await window.api.perfilListar(); } catch (_) { return { ativo: null, perfis: [] }; }
}
// Tela de seleção de perfil ao abrir (ou via menu). Lista os perfis existentes
// e permite escolher qual carregar, criar novo ou gerenciar.
async function abrirSelecaoPerfil() {
  const { ativo, perfis } = await listarPerfis();
  const itens = (perfis || []).map(p => `
    <div class="perfil-item">
      <button type="button" class="btn btn-primary perfil-escolher" data-id="${p.id}">${escapeHtml(p.nome)}${p.id === ativo ? ' ✓' : ''}</button>
      <button type="button" class="btn btn-ghost perfil-gerenciar" data-id="${p.id}" title="${t('perfil.gerenciar')}">⚙</button>
    </div>`).join('') || `<p class="modal-msg">${t('perfil.nenhum')}</p>`;
  abrirModal(
    t('perfil.selecione') || 'Selecionar perfil',
    [],
    () => true,
    {
      mensagem: t('perfil.selecioneMsg') || 'Escolha qual perfil de dados deseja abrir.',
      customHtml: `<div class="perfil-lista">${itens}</div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-criar-perfil">${t('perfil.criar') || 'Criar novo perfil'}</button>
        </div>`,
      aoMontar: (modalCard) => {
        modalCard.querySelectorAll('.perfil-escolher').forEach(b => {
          b.onclick = async () => {
            const id = b.dataset.id;
            fecharModal();
            await trocarPerfil(id);
          };
        });
        modalCard.querySelectorAll('.perfil-gerenciar').forEach(b => {
          b.onclick = () => gerenciarPerfil(b.dataset.id);
        });
        const criar = modalCard.querySelector('#btn-criar-perfil');
        if (criar) criar.onclick = () => criarPerfilFlow();
      }
    }
  );
}
// Troca o perfil ATIVO ao vivo (sem fechar o sistema). Salva o atual e carrega o alvo.
async function trocarPerfil(id) {
  if (!id) return;
  // Salva o perfil atual antes de trocar (se já houver dados carregados).
  if (dadosCarregados) { try { await persistir(true); } catch (_) {} }
  const r = await window.api.perfilDefinirAtivo(id);
  if (!r || !r.ok) {
    if (window.mostrarToast) window.mostrarToast(t('perfil.erroTrocar') || 'Não foi possível trocar o perfil', 'erro');
    return;
  }
  // Limpa a trava e recarrega do arquivo do novo perfil.
  dadosCarregados = false;
  await carregar(); // vai pedir senha se o perfil alvo estiver criptografado
  if (window.render) window.render();
  if (window.mostrarToast) window.mostrarToast(t('perfil.trocado') || 'Perfil trocado', 'sucesso');
  await atualizarPerfisInfo();
}
// Fluxo de criar novo perfil (pede o nome; permite criptografar e definir senha).
function criarPerfilFlow() {
  abrirModal(t('perfil.criar') || 'Criar novo perfil', [
    { label: t('perfil.nome') || 'Nome do perfil', name: 'nome', type: 'text', required: true, placeholder: t('perfil.nomePlaceholder') || 'Ex.: Esposa' },
    { label: t('perfil.criptografar') || 'Criptografar este perfil?', name: 'cripto', type: 'checkbox' },
    { label: t('cripto.definirSenha') || 'Senha', name: 'senha', type: 'password', required: false },
    { label: t('cripto.confirmarSenha') || 'Confirmar senha', name: 'senhaConfirmar', type: 'password', required: false }
  ], async (vals) => {
    const nome = (vals && vals.nome || '').trim();
    if (!nome) { if (window.mostrarToast) window.mostrarToast(t('perfil.nomeVazio') || 'Informe um nome', 'erro'); return false; }
    if (vals.cripto && vals.senha) {
      if (vals.senha !== vals.senhaConfirmar) { if (window.mostrarToast) window.mostrarToast(t('cripto.senhasDiferem') || 'As senhas não conferem. Digite novamente.', 'erro'); return false; }
    }
    const r = await window.api.perfilCriar(nome);
    if (!r || !r.ok) {
      if (window.mostrarToast) window.mostrarToast(t('perfil.erroCriar') || 'Não foi possível criar o perfil', 'erro');
      return false;
    }
    // Torna o novo perfil ativo PRIMEIRO (trocarPerfil salva o perfil anterior e
    // recarrega o estado vazio do novo). Só DEPOIS ativa a criptografia — assim o
    // estado em memória já pertence ao novo perfil e o criptoAtivar cifra o arquivo
    // certo (evita sobrescrever o arquivo do novo perfil com dados do perfil anterior).
    await trocarPerfil(r.id);
    if (vals.cripto && vals.senha) {
      const ra = await window.api.criptoAtivar(vals.senha);
      if (!ra || !ra.ok) { if (window.mostrarToast) window.mostrarToast(t('cripto.erro'), 'erro'); }
      else {
        // Mantém o estado em memória coerente com o arquivo (o IPC cifra o arquivo,
        // mas não toca no estado do renderer — sem isso o próximo persistir gravaria aberto).
        estado.configuracoes = estado.configuracoes || {};
        estado.configuracoes.criptografia = { ativa: true };
      }
    }
    if (window.mostrarToast) window.mostrarToast(t('perfil.criado') || 'Perfil criado', 'sucesso');
    return true;
  });
}
// Gerencia um perfil: renomear e trocar senha (exige senha atual se criptografado).
function gerenciarPerfil(id) {
  abrirModal(t('perfil.gerenciar') || 'Gerenciar perfil', [
    { label: t('perfil.novoNome') || 'Novo nome do perfil', name: 'nome', type: 'text', required: true },
    { label: t('perfil.senhaAtual') || 'Senha atual (se criptografado)', name: 'senhaAtual', type: 'password', required: false },
    { label: t('cripto.novaSenha') || 'Nova senha', name: 'senhaNova', type: 'password', required: false }
  ], async (vals) => {
    const nome = (vals && vals.nome || '').trim();
    if (!nome) { if (window.mostrarToast) window.mostrarToast(t('perfil.nomeVazio') || 'Informe um nome', 'erro'); return false; }
    const rr = await window.api.perfilRenomear({ id, nome });
    if (!rr || !rr.ok) { if (window.mostrarToast) window.mostrarToast(t('perfil.erroRenomear') || 'Não foi possível renomear', 'erro'); return false; }
    if (vals.senhaNova) {
      const rt = await window.api.perfilTrocarSenha({ id, senhaAtual: vals.senhaAtual || '', senhaNova: vals.senhaNova });
      if (!rt || !rt.ok) { if (window.mostrarToast) window.mostrarToast((t('perfil.erroSenha') || 'Falha ao trocar senha') + ': ' + ((rt && rt.erro) || ''), 'erro'); return false; }
    }
    if (window.mostrarToast) window.mostrarToast(t('perfil.salvo') || 'Perfil salvo', 'sucesso');
    await atualizarPerfisInfo();
    return true;
  });
}

// S6-3: ativa a criptografia (pede senha via modal) e re-salva cifrado.
// Nao usa window.prompt (nao abre em build empacotado com contextIsolation);
// usa o abrirModal padrao do app, igual ao desbloqueio.
function ativarCriptografia() {
  abrirModal(t('cripto.ativar') || 'Ativar criptografia', [
    { label: t('cripto.definirSenha') || 'Defina uma senha para criptografar os dados:', name: 'senha', type: 'password', required: true },
    { label: t('cripto.confirmarSenha') || 'Confirmar senha', name: 'senhaConfirmar', type: 'password', required: true }
  ], async (vals) => {
    const senha = (vals && vals.senha) || '';
    if (!senha) return false;
    if (senha !== (vals && vals.senhaConfirmar)) { if (window.mostrarToast) window.mostrarToast(t('cripto.senhasDiferem') || 'As senhas não conferem. Digite novamente.', 'erro'); return false; }
    const r = await window.api.criptoAtivar(senha);
    if (r && r.ok) {
      estado.configuracoes = estado.configuracoes || {};
      estado.configuracoes.criptografia = { ativa: true };
      if (window.render) window.render();
      if (window.mostrarToast) window.mostrarToast(t('cripto.ativada') || 'Criptografia ativada', 'sucesso');
      return true;
    }
    if (window.mostrarToast) window.mostrarToast((t('cripto.erro') || 'Erro') + ': ' + ((r && r.erro) || ''), 'erro');
    return false;
  });
}

// S6-3: desativa a criptografia (volta ao JSON aberto).
async function desativarCriptografia() {
  const r = await window.api.criptoDesativar();
  if (r && r.ok) {
    estado.configuracoes = estado.configuracoes || {};
    estado.configuracoes.criptografia = { ativa: false };
    if (window.render) window.render();
    if (window.mostrarToast) window.mostrarToast(t('cripto.desativada') || 'Criptografia desativada', 'sucesso');
  } else if (r && r.erro && window.mostrarToast) {
    window.mostrarToast((t('cripto.erro') || 'Erro') + ': ' + r.erro, 'erro');
  }
}

// B8: verificação manual de atualização (botão na página Sobre).
// Dispara a checagem no processo principal; o fluxo de modais (atualizacao.js)
// apresenta o resultado (disponível / já atualizado / erro).
async function verificarAtualizacaoManual() {
  if (!window.api || typeof window.api.updateVerificarAgora !== 'function') {
    if (window.mostrarToast) window.mostrarToast(t('upd.verificando') || 'Verificando atualizações…', 'info');
    return;
  }
  if (window.mostrarToast) window.mostrarToast(t('upd.verificando') || 'Verificando atualizações…', 'info');
  try {
    await window.api.updateVerificarAgora();
  } catch (e) {
    if (window.mostrarToast) window.mostrarToast((t('upd.erro') || 'Erro') + ': ' + (e && e.message ? e.message : e), 'erro');
  }
}

// S5-3: varre parcelas pendentes que vencem em até `antecedenciaNotif` dias e
// dispara notificações nativas (via main process) para as ainda não avisadas.
// Guarda os IDs avisados em estado.configuracoes.avisados para não repetir.
async function verificarNotificacoes() {
  if (!estado.configuracoes || estado.configuracoes.notificarVencimento === false) return;
  const dias = Math.max(0, Number(estado.configuracoes.antecedenciaNotif) || 3);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje); limite.setDate(limite.getDate() + dias);
  const avisados = new Set(estado.configuracoes.avisados || []);
  const pendentes = [];
  for (const d of estado.dividas) {
    for (const p of (d.parcelas || [])) {
      if ((p.status || 'pendente') === 'pago') continue;
      const dt = new Date(p.vencimento + (p.vencimento.length === 10 ? 'T00:00:00' : ''));
      if (isNaN(dt)) continue;
      dt.setHours(0, 0, 0, 0);
      if (dt >= hoje && dt <= limite) {
        const chave = d.id + ':' + p.id;
        if (avisados.has(chave)) continue;
        pendentes.push({ chave, descricao: d.descricao, credor: d.credor, parcela: p.numero, vencimento: p.vencimento, valor: p.valor });
      }
    }
  }
  for (const item of pendentes) {
    try {
      await window.api.notificarVencimento(item);
      estado.configuracoes.avisados.push(item.chave);
    } catch (_) { /* ignora falha de notificação */ }
  }
  if (pendentes.length) await persistir(true);
}

// ---------- Gamificação (níveis / XP) ----------
// NIVEIS é a fonte da verdade em src/dominio.js (carregado antes em index.html),
// disponível globalmente neste escopo. tituloNivel() resolve o rótulo i18n via
// t('nivel.nomeN') — não precisamos redeclarar a tabela aqui (evita o erro de
// "Identifier 'NIVEIS' has already been declared" que quebrava o parse do app).

// Migração retroativa de XP (recompensa por gestão de dívida caiu de 30 -> 5) e
// correção dos níveis registrados no histórico.
// 1) Migra pontos de gestão 30 -> 5 (flag migradoGestao30, uma vez).
// 2) Recalcula o nível de CADA entrada do histórico na ordem cronológica. Este
//    passo roda SEMPRE (idempotente), ignorando flags de migrações anteriores,
//    para corrigir qualquer estado legado inconsistente. O nível de uma entrada
//    é o nível do usuário APÓS somar os pontos dela, acumulados do início da
//    jornada — assim registros antigos mostram o nível da época e, ao cruzar o
//    limite de um nível, aquele registro passa a mostrar o novo nível.
async function migrarXPgestao() {
  const g = estado.gamificacao;
  if (!g || !g.historico) return;
  let alterou = false;

  // 1) Migração de pontos: gestão 30 -> 5 (roda uma vez).
  if (!g.migradoGestao30) {
    for (const h of g.historico) {
      if (h.motivo === 'xp.gestao' && Number(h.pontos) === 30) {
        h.pontos = 5;
        alterou = true;
      }
    }
    g.migradoGestao30 = true;
  }

  // 2) Correção dos níveis de CADA entrada. Roda SEMPRE (idempotente), sem
  //    depender de flag: uma versão anterior podia ter gravado níveis errados e
  //    marcado a flag, congelando dados corrompidos. Recalcular a cada carga é
  //    barato e garante consistência (só persiste se algo mudou).
  //    O nível de uma entrada é o nível do usuário AO FINAL dela, com a XP
  //    acumulada do início da jornada.
  //    ATENÇÃO: o histórico é mantido mais-recente-primeiro (ganharXP usa
  //    unshift), ou seja, o índice 0 é a entrada MAIS NOVA e o último índice é
  //    a MAIS ANTIGA. Para acumular a XP na ordem cronológica (antiga -> recente)
  //    e obter níveis não-decrescentes no tempo, iteramos DE TRÁS PARA FRENTE.
  {
    let acum = 0;
    for (let i = g.historico.length - 1; i >= 0; i--) {
      const h = g.historico[i];
      acum += (Number(h.pontos) || 0);
      const nivelCorreto = nivelDe(acum);
      if (h.nivel !== nivelCorreto) { h.nivel = nivelCorreto; alterou = true; }
    }
    // Remove a flag legada para não deixar rastro de estado inconsistente.
    if (g.niveisHistoricoCorrigido) { delete g.niveisHistoricoCorrigido; }
  }

  if (alterou) {
    g.xp = g.historico.reduce((a, h) => a + (Number(h.pontos) || 0), 0);
    g.nivel = nivelDe(g.xp);
    await persistir();
  }
}

// Retorna o título (nome) do nível informado, traduzido conforme o idioma atual.
function tituloNivel(n) {
  const chave = 'nivel.nome' + Math.min(n, 10);
  return t(chave);
}

// Mapeia cada motivo de XP (chave i18n) ao ícone e à chave do nome de quest correspondente.
// - 'quest' define o nome exibido no histórico (igual à lista de quests).
// - 'quest: null' significa manter o nome original do motivo (apenas adiciona o ícone).
const MAPA_MOTIVO = {
  'xp.dividaNova':    { ico: ICON.dividaNova, quest: 'game.q.nova' },
  'xp.pagamento':     { ico: ICON.dinheiro, quest: 'game.q.pag' },
  'xp.editarPagamento':{ ico: ICON.editarPagamento, quest: 'game.q.editarPagamento' },
  'xp.gestao':        { ico: ICON.gestao, quest: 'game.q.gestao' },
  'xp.quitou':        { ico: ICON.trofeu, quest: 'game.q.quitou' },
  'xp.acesso':        { ico: ICON.acesso, quest: 'game.q.acesso' },
  'xp.novaCarteira':  { ico: ICON.carteira, quest: 'game.q.novaCarteira' },
  'xp.editarCarteira':{ ico: ICON.editarCarteira, quest: 'game.q.editarCarteira' },
  'xp.desconhecido':  { ico: ICON.editar, quest: 'game.q.editar' },
  'xp.saldoAnterior': { ico: ICON.caixa, quest: null }
};

// Resolve o ícone + nome a exibir para um motivo (aceita chave i18n OU texto já traduzido em pt/en/es).
function resolverMotivo(m) {
  if (!m) return null;
  if (MAPA_MOTIVO[m]) return MAPA_MOTIVO[m];
  // Mapa reverso estático: texto traduzido (qualquer idioma) -> chave i18n.
  if (MAPA_TEXTO_CHAVE[m]) return MAPA_MOTIVO[MAPA_TEXTO_CHAVE[m]];
  for (const chave in MAPA_MOTIVO) {
    if (t(chave) === m) return MAPA_MOTIVO[chave];
  }
  return null;
}

// Mapa reverso (texto traduzido -> chave) para os três idiomas suportados.
// Permite normalizar registros legados que foram salvos como texto (não como chave).
const MAPA_TEXTO_CHAVE = (() => {
  const mapa = {};
  for (const chave in MAPA_MOTIVO) {
    for (const lang of ['pt', 'en', 'es']) {
      const txt = (I18N[lang] && I18N[lang][chave] != null) ? I18N[lang][chave]
                 : (I18N.pt[chave] != null ? I18N.pt[chave] : chave);
      if (txt !== chave) mapa[txt] = chave;
    }
  }
  return mapa;
})();

// Normaliza um motivo (chave ou texto) para a chave i18n, para ser salvo de forma consistente.
function normalizarMotivoChave(m) {
  if (!m) return 'xp.desconhecido';
  if (MAPA_MOTIVO[m]) return m;                 // já é chave
  if (MAPA_TEXTO_CHAVE[m]) return MAPA_TEXTO_CHAVE[m]; // texto -> chave
  return m;                                     // texto desconhecido: mantém
}
function horarioAgora() {
  // Data e hora localizadas em que o ponto foi conquistado (formato explícito).
  try {
    const fmt = new Intl.DateTimeFormat(
      idiomaAtual === 'en' ? 'en-US' : idiomaAtual === 'es' ? 'es-ES' : 'pt-BR',
      { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
    );
    return fmt.format(new Date());
  } catch (e) { return new Date().toLocaleString(); }
}
// Relógio fixo no canto inferior (horário de Brasília), em tempo real.
// Data por extenso (dia da semana + dia/mês/ano) e horário conforme o idioma:
// PT e ES -> 24h; EN -> padrão americano (12h com AM/PM).
const fmtDiaRelogio = {
  pt: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
  es: new Intl.DateTimeFormat('es-ES', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
};
const fmtHoraRelogio = {
  pt: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  en: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
  es: new Intl.DateTimeFormat('es-ES', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
};
// O relógio de Brasília agora é um componente Vue isolado (relogio.vue.js),
// montado em #relógio-brasília, fora do <main>. O app vanilla não o toca.
function ganharXP(pontos, motivo) {
  if (!estado.gamificacao) estado.gamificacao = { xp: 0, nivel: 1, historico: [] };
  if (!estado.gamificacao.historico) estado.gamificacao.historico = [];
  const antes = estado.gamificacao.nivel;
  estado.gamificacao.xp = (estado.gamificacao.xp || 0) + pontos;
  estado.gamificacao.nivel = nivelDe(estado.gamificacao.xp);
  // Normaliza o motivo para a chave i18n (cobre chamadas que passam texto traduzido).
  const chaveMotivo = normalizarMotivoChave(motivo || t('xp.desconhecido'));
  // Registra no log de pontuação (mais recente primeiro).
  estado.gamificacao.historico.unshift({
    pontos,
    motivo: chaveMotivo,
    nivel: estado.gamificacao.nivel,
    horario: horarioAgora()
  });
  // Mantém no máximo 100 registros.
  if (estado.gamificacao.historico.length > 100) estado.gamificacao.historico.length = 100;
  // Salva em silêncio: o aviso de XP (toast abaixo) não deve ser sobrescrito
  // por um eventual toast de "erro ao salvar" caso o salvamento falhe.
  persistir(true);
  atualizarBadgeNivel();
  // Mensagem de XP (ganho OU perda) — sempre exibida, mesmo quando há outra
  // mensagem do sistema. Exibida ANTES da celebração de nível, e o render() também
  // roda antes: se celebrarNivel() lançar (ex.: canvas/confete no Electron), o aviso
  // de XP e a atualização dos pontos/progresso ainda acontecem.
  const res = resolverMotivo(chaveMotivo);
  // O ícone (ICON.*) é um SVG confiável do nosso mapa interno — entra como HTML.
  // O texto (pontos + nome traduzido) é escapado para nunca vazar código.
  const icoHTML = res && res.ico ? res.ico : '';
  const nomeXP = res ? t(res.quest || 'xp.desconhecido') : chaveMotivo;
  const sinal = pontos >= 0 ? '+' : '';
  const txtXP = escapeHtml(`${sinal}${pontos} XP · ${nomeXP}`);
  const msgXP = `<span class="toast-ico">${icoHTML}</span><span class="toast-txt">${txtXP}</span>`;
  toastHTML(msgXP, 'success');
  // Garante que a view (progress bar, registros, badge) reflita o novo estado,
  // independente de o chamador chamar render() ou não — e ANTES da celebração,
  // para que uma falha na celebração nunca impeça a atualização dos pontos.
  render();
  if (estado.gamificacao.nivel > antes) {
    // Celebração centralizada e animada ao subir de nível (mostra o novo nível alcançado).
    // Envolve em try/catch: um erro no confete/canvas não pode quebrar o fluxo de XP.
    try { celebrarNivel(estado.gamificacao.nivel); }
    catch (e) { console.error('Falha na celebração de nível:', e); }
  }
}
// ---------- Celebração de subida de nível ----------
// Exibe um overlay centralizado, destacado e animado mostrando o novo nível
// alcançado (com efeito brilhoso e confete), exaltando a conquista e motivando
// o usuário a continuar progredindo. Traduzido conforme o idioma atual.
let _levelupFechado = false;        // estado interno para não disparar confete após o fechamento
let _levelupRaf = null;             // referência do loop de animação do confete
function celebrarNivel(nivel) {
  const overlay = document.getElementById('levelup-overlay');
  const card = document.getElementById('levelup-card');
  if (!overlay || !card) return;

  // Preenche os textos traduzidos.
  document.getElementById('levelup-numero').textContent = nivel;
  document.getElementById('levelup-titulo').textContent = ti('nivel.celebTitulo', { n: nivel });
  document.getElementById('levelup-parabens').textContent = t('nivel.celebParabens');
  document.getElementById('levelup-motivo').textContent = t('nivel.celebMotivo');
  // Título (nome) do nível alcançado, exaltando a conquista.
  const nome = tituloNivel(nivel).toUpperCase();
  const tituloNivelEl = document.getElementById('levelup-titulo-nivel');
  tituloNivelEl.textContent = nome;

  // Torna o overlay visível e animável.
  overlay.classList.add('visivel');
  overlay.setAttribute('aria-hidden', 'false');
  card.classList.remove('levelup-fechar');
  // Reinicia a animação de entrada (força reflow para reiniciar @keyframes).
  card.classList.remove('levelup-animar');
  void card.offsetWidth;
  card.classList.add('levelup-animar');
  _levelupFechado = false;

  // Dispara o confete brilhoso.
  iniciarConfete();

  // NÃO fecha automaticamente: o overlay de parabenização permanece visível
  // até o usuário clicar no botão "Seguir" (ou no próprio overlay / Esc).
}

let _levelupTimer = null;
function fecharLevelUp() {
  const overlay = document.getElementById('levelup-overlay');
  const card = document.getElementById('levelup-card');
  if (!overlay || !card) return;
  _levelupFechado = true;
  if (_levelupTimer) { clearTimeout(_levelupTimer); _levelupTimer = null; }
  card.classList.remove('levelup-animar');
  card.classList.add('levelup-fechar');
  overlay.setAttribute('aria-hidden', 'true');
  // Espera a animação de saída antes de esconder o overlay.
  setTimeout(() => {
    overlay.classList.remove('visivel');
    pararConfete();
  }, 360);
}

// Confete em <canvas> (sem dependências): partículas coloridas com brilho que
// caem e giram, evocando uma comemoração. Respeita o tamanho da janela.
function iniciarConfete() {
  const canvas = document.getElementById('levelup-confetti');
  if (!canvas) return;
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return; // sem suporte a canvas: ignora o confete (a celebração segue sem ele)
  const dpr = window.devicePixelRatio || 1;
  function dimensionar() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  dimensionar();
  // Cores festivas (com brilho) — usam as cores do tema primário/sucesso para coesão.
  const cores = ['#2d6a4f', '#166534', '#3fb985', '#f4c430', '#e0924a', '#5b8def', '#e35d6a'];
  const W = window.innerWidth, H = window.innerHeight;
  const num = 140;
  const particulas = Array.from({ length: num }, () => ({
    x: Math.random() * W,
    y: Math.random() * -H,
    r: 4 + Math.random() * 6,
    c: cores[(Math.random() * cores.length) | 0],
    vy: 2 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.15 + Math.random() * 0.3,
    form: Math.random() < 0.5 ? 'rect' : 'circ'
  }));
  let frames = 0;
  const maxFrames = 320; // ~5s de animação
  if (_levelupRaf) cancelAnimationFrame(_levelupRaf);
  function quadro() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particulas) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.shadowColor = p.c;
      ctx.shadowBlur = 12;       // efeito brilhoso
      ctx.fillStyle = p.c;
      if (p.form === 'rect') {
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    frames++;
    if (frames < maxFrames && !_levelupFechado) {
      _levelupRaf = requestAnimationFrame(quadro);
    } else {
      ctx.clearRect(0, 0, W, H);
      _levelupRaf = null;
    }
  }
  _levelupRaf = requestAnimationFrame(quadro);
}
function pararConfete() {
  if (_levelupRaf) { cancelAnimationFrame(_levelupRaf); _levelupRaf = null; }
  const canvas = document.getElementById('levelup-confetti');
  if (canvas) { const ctx = canvas.getContext('2d'); ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

// Fecha a celebração ao clicar no botão "Continuar", no overlay ou pressionar Esc.
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest('[data-acao="fechar-levelup"]')) { fecharLevelUp(); return; }
  const overlay = document.getElementById('levelup-overlay');
  if (overlay && overlay.classList.contains('visivel') &&
      e.target === overlay && !e.target.closest('.levelup-card')) {
    fecharLevelUp();
  }
});

// Abre links externos (http/https) no navegador padrão via preload (api.abrirLink),
// em vez de tentar navegar dentro do Electron. Evita quebra de segurança (contextIsolation).
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (/^https?:\/\//i.test(href)) {
    e.preventDefault();
    if (window.api && window.api.abrirLink) window.api.abrirLink(href);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('levelup-overlay');
    if (overlay && overlay.classList.contains('visivel')) fecharLevelUp();
  }
});

function atualizarBadgeNivel() {
  const el = document.getElementById('badge-nivel');
  if (!el) return;
  const g = estado.gamificacao || { xp: 0, nivel: 1 };
  const xpTotal = g.xp || 0;
  const nivel = g.nivel || 1;
  // Progresso até o próximo nível (nome do próximo título).
  const proximo = nivel + 1;
  let txtProgresso;
  if (proximo > NIVEIS.length) {
    txtProgresso = t('game.nivelMax');
  } else {
    const proximoThreshold = NIVEIS[proximo - 1].xp; // xp necessário para o próximo nível
    const faltam = Math.max(0, proximoThreshold - xpTotal);
    txtProgresso = `${xpTotal} / ${proximoThreshold} XP ${t('game.paraProximo')} ${tituloNivel(proximo)}`;
  }
  const pctBarra = progressoNivel(xpTotal) * 100;
  el.innerHTML = `<div class='perfil-texto'><span class='nivel-ico'>${ICON.trofeu}</span> ${t('nivel.titulo')} ${nivel} · ${tituloNivel(nivel)}</div>` +
    `<span class='nivel-barra'><span style='width:${pctBarra}%'></span></span>` +
    `<span class='nivel-xp'>${txtProgresso}</span>` +
    `<button class='nivel-btn' data-view='gamificacao'>${t('nivel.verDetalhes')} ${ICON.setaDireita}</button>`;
}
async function persistir(silencio = false) {
  // S6-3: nao grava enquanto os dados nao foram carregados (ex.: arquivo
  // criptografado aguardando desbloqueio). Evita sobrescrever o arquivo
  // criptografado com o estado vazio (dividas:[]) e perder os dados.
  if (!dadosCarregados) return;
  try {
    // `estado` é um Proxy reativo do Vue. O ipcRenderer.invoke usa clone
    // estruturado, que NÃO clona Proxies — lançaria "An object could not be
    // cloned" e o salvamento falharia silenciosamente (nada gravado no disco).
    // Por isso desserializamos para um objeto plano antes de enviar.
    const plano = JSON.parse(JSON.stringify(estado));
    // Salva imediatamente para garantir persistência ao fechar
    const ok = await window.api.salvarAgora(plano);
    if (!ok && !silencio) toast(t('toast.erroSalvar'), 'error');
  } catch (e) {
    // NÃO deixa uma falha de salvamento (ex.: api.salvar rejeita no Electron)
    // interromper o fluxo que chamou persistir() — caso contrário o ganho de XP,
    // o toast e a atualização da progress bar/registros deixariam de acontecer.
    console.error('Falha ao persistir estado:', e);
    if (!silencio) toast(t('toast.erroSalvar'), 'error');
  }
}

// ---------- Roteamento de views ----------
let viewAtual = 'painel';
function setView(v) {
  viewAtual = v;
  if (window.__viewRef) window.__viewRef.value = v; // ref reativo: troca a view no root Vue
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === v);
  });
  // Ao abrir "Sobre", busca as informações reais do sistema (versões) via IPC.
  // O render() só incrementa o tick; quando as infos chegarem, render() roda
  // de novo e a view "Sobre" exibe os dados atualizados.
  if (v === 'sobre' && !_sobreInfoCache) {
    obterInfoSistema().then(() => { if (viewAtual === 'sobre') render(); });
  }
  render();
}

// S5-4: foca o campo de busca da view atual (se houver). Usado pelo atalho Ctrl+F.
function focarBusca() {
  const el = document.querySelector('#busca, #busca-global, [data-busca]');
  if (el) { el.focus(); el.select && el.select(); }
}

// S5-1/S5-5: atualiza um campo do filtro/ordenação e re-renderiza.
// Aceita também um objeto parcial. Reseta a página ao filtrar.
function definirFiltro(campo, valor) {
  if (typeof estado.filtro !== 'object' || estado.filtro === null) {
    estado.filtro = { texto: '', categoria: '', status: '', periodo: '', periodoDe: '', periodoAte: '', ordenar: 'descricao', asc: true, pagina: 1, porPagina: 12 };
  }
  if (typeof campo === 'object') {
    Object.assign(estado.filtro, campo);
  } else {
    estado.filtro[campo] = valor;
    if (campo !== 'pagina') estado.filtro.pagina = 1;
  }
  render();
}

function limparFiltro() {
  estado.filtro = { texto: '', categoria: '', status: '', periodo: '', periodoDe: '', periodoAte: '', ordenar: 'descricao', asc: true, pagina: 1, porPagina: estado.filtro ? estado.filtro.porPagina : 12 };
  render();
}

// ---------- Modal ----------
// Modais movidos para src/ui/modais.js (S3-3) — consumidos como globais.
// ---------- Ações: Dívidas ----------
const STATUS_OPTIONS = [
  { value: 'pendente' },
  { value: 'pago' },
  { value: 'parcial' },
  { value: 'atrasado' },
  { value: 'negociado' }
];

// Lê as parcelas preenchidas no formulário dinâmico
// Monta o HTML dos formulários de parcelas (valor, vencimento, status, pagamento)
function parcelasParaFormulario(n, parcelasExistentes = []) {
  let html = '';
  for (let i = 0; i < n; i++) {
    const existente = parcelasExistentes[i];
    const dataPadrao = (() => {
        const dt = new Date();
        dt.setDate(1);                 // evita estouro de mês (ex.: 31 + 1 = 03/03)
        dt.setMonth(dt.getMonth() + i);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      })();
    const opts = STATUS_OPTIONS.map(o =>
      `<option value="${o.value}"${o.value === (existente?.status || 'pendente') ? ' selected' : ''}>${t('status.' + o.value)}</option>`).join('');
    // Campos de pagamento (valor pago + data) ficam ocultos quando o status é 'pendente'
    // e são revelados ao selecionar 'pago'/'parcial' (ou 'atrasado'/'negociado').
    const statusAtual = existente?.status || 'pendente';
    const mostraPagamento = statusAtual !== 'pendente';
    html += `
      <div class="parcela-item">
        <div class="parcela-topo"><span>${t('pagamento.parcela')} ${i + 1}</span></div>
        <div class="parcela-grid">
          <div class="campo">
            <label>${t('form.valorParcela')} (${t('moeda')})</label>
            <input type="text" inputmode="decimal" step="0.01" min="0" name="pv${i}" placeholder="${t('form.exValorParcela') || '0,00'}" value="${existente ? (Number(existente.valor) || 0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : ''}" />
          </div>
          <div class="campo">
            <label>${t('form.vencimento')}</label>
            <input type="date" name="pd${i}" value="${existente ? existente.vencimento : dataPadrao}" />
          </div>
          <div class="campo full">
            <label>${t('form.status')}</label>
            <select name="ps${i}">${opts}</select>
          </div>
          <div class="campo full parcela-pagamento" id="pagamento-parcela-${i}" style="${mostraPagamento ? '' : 'display:none'}">
            <label>${t('form.valorPago')} (${t('moeda')})</label>
            <input type="text" inputmode="decimal" step="0.01" min="0" name="pvpg${i}" placeholder="${t('form.exValorParcela') || '0,00'}" value="${existente ? (Number(existente.valorPago) || 0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : ''}" />
            <label>${t('form.dataPagamento')}</label>
            <input type="date" name="pdpg${i}" value="${existente ? (existente.dataPagamento || '') : ''}" />
          </div>
          <div class="campo full">
            <label>${t('form.notaParcela')} (${t('form.opcional')})</label>
            <input type="text" name="pn${i}" placeholder="${t('form.exNota') || 'Ex: pagou via PIX'}" value="${existente ? escapeHtml(existente.nota || '') : ''}" />
          </div>
        </div>
      </div>`;
  }
  return html;
}

// Lê as parcelas preenchidas no formulário dinâmico e DERIVA o status a partir
// do valor pago (fonte única de verdade), garantindo coerência financeira.
function lerParcelasDoForm(form, n, parcelasExistentes = []) {
  const parcelas = [];
  for (let i = 0; i < n; i++) {
    const v = form.querySelector(`[name="pv${i}"]`)?.value;
    const d = form.querySelector(`[name="pd${i}"]`)?.value;
    const s = form.querySelector(`[name="ps${i}"]`)?.value || 'pendente';
    const nt = form.querySelector(`[name="pn${i}"]`)?.value || '';
    const vp = form.querySelector(`[name="pvpg${i}"]`)?.value;
    const dp = form.querySelector(`[name="pdpg${i}"]`)?.value;
    const existente = parcelasExistentes[i];
    const valor = Math.max(0, Number(String(v).replace(',', '.')) || 0);
    const valorPago = Math.max(0, Number(String(vp).replace(',', '.')) || 0);
    // Status derivado do valor pago, exceto categorias manuais de gestão.
    let status = s;
    if (s !== 'atrasado' && s !== 'negociado') {
      if (valorPago <= 0) status = 'pendente';
      else if (valorPago >= valor) status = 'pago';
      else status = 'parcial';
    }
    parcelas.push({
      id: existente?.id || uid(),
      numero: i + 1,
      valor,
      vencimento: d || hoje(),
      status,
      valorPago: valorPago > 0 ? valorPago : 0,
      dataPagamento: valorPago > 0 ? (dp || hoje()) : '',
      nota: nt.trim()
    });
  }
  return parcelas;
}
// Conecta os eventos das parcelas (toggle de pagamento e derivação de status)
// após o HTML ser injetado no DOM — evita handlers inline com aspas aninhadas.
function conectarEventosParcelas(wrap) {
  if (!wrap) return;
  wrap.querySelectorAll('.parcela-item').forEach((item) => {
    const sel = item.querySelector('select[name^="ps"]');
    const pagBloco = item.querySelector('.parcela-pagamento');
    const vInput = item.querySelector('input[name^="pvpg"]');
    const valorInput = item.querySelector('input[name^="pv"]');
    const sanitizar = (el) => { if (el) el.addEventListener('input', () => {
      // permite dígitos, vírgula ou ponto; bloqueia negativo e limita a 2 casas
      // decimais. Mantém a VÍRGULA pt-BR visível enquanto digita (não converte
      // para ponto), para o usuário ver "12,50" e não "12.50".
      let v = el.value.replace(/[^0-9.,]/g, '').replace(/-/g, '');
      const partes = v.split(/[,.]/);
      if (partes.length > 1) {
        v = partes[0] + ',' + partes.slice(1).join('').slice(0, 2);
      }
      if (el.value !== v) el.value = v;
    }); };
    sanitizar(vInput);
    sanitizar(valorInput);
    if (sel && pagBloco) {
      const toggle = () => {
        pagBloco.style.display = (sel.value === 'pendente') ? 'none' : '';
        if (sel.value === 'pago' && vInput && !vInput.value && valorInput && valorInput.value) {
          vInput.value = valorInput.value;
        }
      };
      sel.addEventListener('change', toggle);
    }
    if (vInput && sel) {
      vInput.addEventListener('input', () => {
        const v = parseFloat((vInput.value || '0').replace(',', '.')) || 0;
        const val = parseFloat((valorInput && valorInput.value || '0').replace(',', '.')) || 0;
        if (sel.value !== 'atrasado' && sel.value !== 'negociado') {
          if (v <= 0) sel.value = 'pendente';
          else if (v >= val) sel.value = 'pago';
          else sel.value = 'parcial';
        }
      });
    }
  });
}

// Sanitiza um input de valor decimal (type="text" + inputmode="decimal"),
// permitindo digitação livre de centavos com vírgula pt-BR ou ponto. Mantém a
// vírgula visível enquanto digita e bloqueia negativos/caracteres inválidos.
// Usado nos campos de valor de pagamento (abrirModal e lançamento de parcela),
// que antes eram type="number" e só aceitavam centavos pelas setas (step).
function sanitizarDecimalInput(el) {
  if (!el) return;
  el.addEventListener('input', () => {
    let v = el.value.replace(/[^0-9.,]/g, '').replace(/-/g, '');
    const partes = v.split(/[,.]/);
    if (partes.length > 1) {
      v = partes[0] + ',' + partes.slice(1).join('').slice(0, 2);
    }
    if (el.value !== v) el.value = v;
  });
}

// Normaliza um valor digitado (vírgula pt-BR ou ponto) para Number.
function numeroDeInput(val) {
  return Number(String(val == null ? '' : val).replace(',', '.')) || 0;
}

function novaDivida() {
  abrirModal(t('divida.nova').replace(/^\+\s*/, '') || 'Nova dívida', [
    { name: 'descricao', label: t('form.descricao'), type: 'text', placeholder: t('form.exDescricao'), required: true },
    { name: 'credor', label: t('form.credor'), type: 'text', placeholder: t('form.exCredor'), required: true },
    { name: 'categoria', label: t('form.categoria'), type: 'select', value: 'emprestimo', options: [
      { value: 'emprestimo', label: t(CATEGORIAS.emprestimo.label) },
      { value: 'cartao', label: t(CATEGORIAS.cartao.label) },
      { value: 'servico', label: t(CATEGORIAS.servico.label) },
      { value: 'outro', label: t(CATEGORIAS.outro.label) }
    ]},
    { name: 'numParcelas', label: t('form.numero') + ' de parcelas', type: 'number', step: '1', min: '1', placeholder: '1', value: '1', required: true, id: 'num-parcelas-input' },
    { name: 'observacao', label: t('form.observacao'), type: 'textarea', value: '' }
  ], async (v) => {
    const n = Math.max(1, parseInt(v.numParcelas, 10) || 1);
    const form = document.getElementById('form-modal');
    const parcelas = lerParcelasDoForm(form, n);
    const total = parcelas.reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
    const divida = {
      id: uid(),
      descricao: v.descricao.trim(),
      credor: v.credor.trim(),
      categoria: v.categoria,
      valorTotal: total,
      parcelas,
      observacao: v.observacao || '',
      criadaEm: hoje()
    };
    // Cria registros de pagamento para parcelas já pagas no cadastro,
    // integrando com o gráfico de composição (Pago vs Em aberto) e a barra Quitado.
    parcelas.forEach(p => {
      if (p.valorPago > 0) {
        estado.pagamentos.push({
          id: uid(),
          dividaId: divida.id,
          parcelaId: p.id,
          valor: p.valorPago,
          data: p.dataPagamento || hoje(),
          criadoEm: hoje()
        });
      }
    });
    estado.dividas.push(divida);
    await persistir();
    toast(t('toast.dividaSalva'), 'success');
    ganharXP(10, t('xp.dividaNova'));
    render();
  });
  // Conecta o contador de parcelas à geração dinâmica dos formulários
  const input = document.getElementById('num-parcelas-input');
  const gerar = () => {
    const n = Math.max(1, parseInt(input?.value, 10) || 1);
    const wrap = document.getElementById('parcelas-dinamicas');
    if (!wrap) return;
    wrap.innerHTML = parcelasParaFormulario(n);
    conectarEventosParcelas(wrap);
    const aviso = document.getElementById('aviso-parcelas');
    if (aviso) aviso.textContent = t('aviso.parcelas').replace('${n}', n);
  };
  if (input) {
    input.addEventListener('input', gerar);
    // Constrói o container abaixo dos campos do formulário
    const camposForm = document.getElementById('campos-form');
    if (camposForm) {
      const bloco = document.createElement('div');
      bloco.innerHTML = `
        <p class="aviso-parcelas" id="aviso-parcelas">Preencha os dados de cada uma das parcelas.</p>
        <div class="parcelas-lista" id="parcelas-dinamicas"></div>`;
      camposForm.appendChild(bloco);
    }
    gerar();
  }
}

function editarDivida(d) {
  const parcelasAtuais = d.parcelas || [];
  abrirModal(t('modal.editarDivida'), [
    { name: 'descricao', label: t('form.descricao'), type: 'text', value: d.descricao, required: true },
    { name: 'credor', label: t('form.credor'), type: 'text', value: d.credor, required: true },
    { name: 'categoria', label: t('form.categoria'), type: 'select', value: d.categoria, options: [
      { value: 'emprestimo', label: t(CATEGORIAS.emprestimo.label) },
      { value: 'cartao', label: t(CATEGORIAS.cartao.label) },
      { value: 'servico', label: t(CATEGORIAS.servico.label) },
      { value: 'outro', label: t(CATEGORIAS.outro.label) }
    ]},
    { name: 'numParcelas', label: t('form.numero') + ' de parcelas', type: 'number', step: '1', min: '1', placeholder: '1', value: String(parcelasAtuais.length || 1), required: true, id: 'num-parcelas-input' },
    { name: 'observacao', label: t('form.observacao'), type: 'textarea', value: d.observacao || '' }
  ], async (v) => {
    const n = Math.max(1, parseInt(v.numParcelas, 10) || 1);
    const form = document.getElementById('form-modal');
    const parcelas = lerParcelasDoForm(form, n, parcelasAtuais);
    const total = parcelas.reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
    Object.assign(d, {
      descricao: v.descricao.trim(),
      credor: v.credor.trim(),
      categoria: v.categoria,
      valorTotal: total,
      parcelas,
      observacao: v.observacao || ''
    });
    // Sincroniza estado.pagamentos com o valor pago por parcela informado no
    // formulário de edição da dívida. Sem isso, a página de Pagamentos (que lê de
    // estado.pagamentos) exibia o valor ANTIGO quando a dívida já estava paga e o
    // usuário aumentava o valor e a marcava como paga (relato de bug: a view de
    // Pagamentos mostrava o pagamento efetuado como o valor antigo).
    estado.pagamentos = reconciliarPagamentosAposEdicao(d, estado.pagamentos);
    await persistir();
    toast(t('toast.dividaAtualizada'), 'success');
    ganharXP(5);
    render();
  });

  // Conecta o contador de parcelas à geração dinâmica dos formulários
  const input = document.getElementById('num-parcelas-input');
  const gerar = () => {
    const n = Math.max(1, parseInt(input?.value, 10) || 1);
    const wrap = document.getElementById('parcelas-dinamicas');
    if (!wrap) return;
    wrap.innerHTML = parcelasParaFormulario(n, parcelasAtuais);
    conectarEventosParcelas(wrap);
    const aviso = document.getElementById('aviso-parcelas');
    if (aviso) aviso.textContent = t('aviso.parcelas').replace('${n}', n);
  };
  if (input) {
    input.addEventListener('input', gerar);
    const camposForm = document.getElementById('campos-form');
    if (camposForm) {
      const bloco = document.createElement('div');
      bloco.innerHTML = `
        <p class="aviso-parcelas" id="aviso-parcelas">Preencha os dados de cada uma das parcelas.</p>
        <div class="parcelas-lista" id="parcelas-dinamicas"></div>`;
      camposForm.appendChild(bloco);
    }
    gerar();
  }
}

function excluirDivida(d) {
  abrirConfirmacao({
    titulo: t('divida.excluir'),
    mensagem: t('msg.confirmExcluirDivida'),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      // Soft delete: move para a lixeira (recuperável) em vez de apagar.
      const pagamentosDaDivida = estado.pagamentos.filter(p => p.dividaId === d.id);
      estado.dividas = estado.dividas.filter(x => x.id !== d.id);
      estado.pagamentos = estado.pagamentos.filter(p => p.dividaId !== d.id);
      estado.lixeira.dividas.unshift({
        ...d,
        _excluidoEm: new Date().toISOString()
      });
      for (const pg of pagamentosDaDivida) {
        estado.lixeira.pagamentos.unshift({ ...pg, _excluidoEm: new Date().toISOString() });
      }
      await persistir();
      ganharXP(-10);
      toast(t('toast.dividaExcluida'));
      render();
    }
  });
}

// Restaura uma dívida (e seus pagamentos) da lixeira para o estado ativo.
async function restaurarDivida(id) {
  const item = estado.lixeira.dividas.find(x => x.id === id);
  if (!item) return;
  const { _excluidoEm, ...divida } = item;
  estado.lixeira.dividas = estado.lixeira.dividas.filter(x => x.id !== id);
  const pags = estado.lixeira.pagamentos.filter(p => p.dividaId === id);
  estado.lixeira.pagamentos = estado.lixeira.pagamentos.filter(p => p.dividaId !== id);
  estado.dividas.push(divida);
  for (const pg of pags) {
    const { _excluidoEm: _e, ...p } = pg;
    estado.pagamentos.push(p);
  }
  await persistir();
  toast(t('toast.dividaRestaurada'));
  render();
}

// Exclui definitivamente uma dívida da lixeira.
async function esvaziarLixeiraDivida(id) {
  abrirConfirmacao({
    titulo: t('lixeira.confirmarExclusao'),
    mensagem: t('lixeira.msgExclusaoDefinitiva'),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      estado.lixeira.dividas = estado.lixeira.dividas.filter(x => x.id !== id);
      estado.lixeira.pagamentos = estado.lixeira.pagamentos.filter(p => p.dividaId !== id);
      await persistir();
      toast(t('toast.excluidoDefinitivamente'));
      render();
    }
  });
}

// Esvazia toda a lixeira (exclusão definitiva de tudo).
async function esvaziarLixeiraTudo() {
  const total = estado.lixeira.dividas.length + estado.lixeira.pagamentos.length
    + estado.lixeira.carteiras.length + estado.lixeira.recorrentes.length + estado.lixeira.metas.length;
  if (total === 0) { toast(t('lixeira.vazia')); return; }
  abrirConfirmacao({
    titulo: t('lixeira.confirmarExclusaoTudo'),
    mensagem: t('lixeira.msgExclusaoTudo'),
    textoConfirmar: t('acao.esvaziar'),
    perigo: true,
    aoConfirmar: async () => {
      estado.lixeira = { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] };
      await persistir();
      toast(t('toast.lixeiraEsvaziada'));
      render();
    }
  });
}

// --- Restaurar itens da lixeira (carteiras / recorrentes / metas) ---
async function restaurarCarteira(id) { restaurarItemLixeira('carteiras', id, t('toast.carteiraRestaurada')); }
async function restaurarRecorrente(id) { restaurarItemLixeira('recorrentes', id, t('toast.recorrenteRestaurado')); }
async function restaurarMeta(id) { restaurarItemLixeira('metas', id, t('toast.metaRestaurada')); }

// Move um item da lixeira de volta para sua coleção ativa (remove _excluidoEm).
async function restaurarItemLixeira(tipo, id, msg) {
  const item = (estado.lixeira[tipo] || []).find(x => x.id === id);
  if (!item) return;
  const { _excluidoEm, ...restaurado } = item;
  estado.lixeira[tipo] = estado.lixeira[tipo].filter(x => x.id !== id);
  estado[tipo].push(restaurado);
  await persistir();
  toast(msg);
  render();
}

// --- Excluir definitivamente um item da lixeira por tipo ---
async function esvaziarLixeiraItem(tipo, id) {
  abrirConfirmacao({
    titulo: t('lixeira.confirmarExclusao'),
    mensagem: t('lixeira.msgExclusaoDefinitiva'),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      estado.lixeira[tipo] = estado.lixeira[tipo].filter(x => x.id !== id);
      await persistir();
      toast(t('toast.excluidoDefinitivamente'));
      render();
    }
  });
}

// ---------- Ações: Pagamentos ----------
function novoPagamento(dividaPreSelecionada = null) {
  const opcoes = estado.dividas.map(d => ({
    value: d.id,
    label: `${d.descricao} — ${fmt.format(saldoDivida(d))}`
  }));
  if (opcoes.length === 0) {
    toast(t('empty.pagamentos1'), 'error');
    return;
  }
  // Opções de parcela da dívida selecionada (inclui todas, pagas ou não)
  const opcoesParcela = (d) => (d.parcelas || []).map(parc => ({
    value: parc.id,
    label: `${t('pagamento.parcela')} ${parc.numero} · ${fmt.format(parc.valor)} · ${fmtData(parc.vencimento)} (${t(STATUS_LABEL[parc.status]) || parc.status})`
  }));

  // Pré-seleciona a próxima parcela em aberto (ou a última se todas pagas)
  const pagasSet = new Set(
    estado.pagamentos.filter(p => p.dividaId === dividaPreSelecionada?.id && p.parcelaId)
      .map(p => p.parcelaId)
  );
  const preSelecDiv = dividaPreSelecionada || estado.dividas.find(d => d.id === opcoes[0].value);
  const proximaPre = (preSelecDiv?.parcelas || []).find(p => !pagasSet.has(p.id));
  const parcelaInicial = proximaPre ? proximaPre.id : (preSelecDiv?.parcelas?.[0]?.id || '');

  abrirModal(t('modal.registrarPagamento'), [
    { name: 'dividaId', label: t('form.divida'), type: 'select', value: preSelecDiv?.id || opcoes[0].value, options: opcoes },
    { name: 'parcelaId', label: t('pagamento.parcela'), type: 'select', value: parcelaInicial, options: opcoesParcela(preSelecDiv) },
    { name: 'valor', label: t('form.valorPago') + ' (' + t('moeda') + ')', type: 'text', inputmode: 'decimal', step: '0.01', placeholder: '0,00', required: true },
    { name: 'data', label: t('form.dataPagamento'), type: 'date', value: hoje(), required: true },
    { name: 'nota', label: t('form.nota'), type: 'text', placeholder: 'Opcional', value: preSelecDiv?.observacao || '' },
    { name: 'carteiraId', label: t('form.carteira'), type: 'select', value: '', options: [{ value: '', label: t('nenhuma') || '—' }].concat((estado.carteiras || []).map(c => ({ value: c.id, label: c.nome }))) }
  ], async (v) => {
    const divida = estado.dividas.find(d => d.id === v.dividaId);
    if (!divida) return;

    // Vincula à parcela escolhida no formulário (cada parcela tratada isoladamente).
    const parcelaId = v.parcelaId || (divida.parcelas?.[0]?.id || null);

    const pagamento = {
      id: uid(),
      dividaId: divida.id,
      parcelaId,
      valor: numeroDeInput(v.valor),
      data: v.data,
      nota: v.nota || '',
      carteiraId: v.carteiraId || null
    };
    // IMPORTANTE: aplicarDebitoCarteira é async (pode abrir confirmação de
    // saldo insuficiente). Precisa de await, senão r é uma Promise e r.ok é
    // undefined -> o pagamento nunca era salvo.
    const r = await aplicarDebitoCarteira(pagamento, 0, null);
    if (!r.ok) { render(); return; } // usuário cancelou saldo insuficiente
    estado.pagamentos.push(pagamento);

    // Mantém a parcela vinculada em sincronia com os pagamentos (fonte de verdade:
    // recalcula valorPago/status/data a partir de TODOS os pagamentos da parcela).
    sincronizarParcela(divida, parcelaId);
    // Nota unificada: o pagamento e a dívida compartilham a mesma observação.
    // Se o usuário informou nota no pagamento, ela vira a observação da dívida.
    if (v.nota) divida.observacao = v.nota;

    await persistir();
    toast(t('toast.pagamentoRegistrado'), 'success');
    ganharXP(15, t('xp.pagamento'));
    render();
  });

  // Ao trocar a dívida ou a parcela, atualiza o resumo INDIVIDUAL da parcela.
  const atualizarResumoParcela = () => {
    const selD = document.getElementById('modal')?.querySelector('[name="dividaId"]');
    const selP = document.getElementById('modal')?.querySelector('[name="parcelaId"]');
    const d = estado.dividas.find(x => x.id === selD?.value);
    const resumoEl = document.getElementById('resumo-parcelas');
    if (!d || !resumoEl) return;
    const r = resumoParcelas(d);
    resumoEl.innerHTML =
      resumoParcelasHtml(d, r) +
      (selP ? pagamentosParcelaHtml(d, selP.value) : '');
  };

  const selDividaNP = document.getElementById('modal')?.querySelector('[name="dividaId"]');
  const selParcelaNP = document.getElementById('modal')?.querySelector('[name="parcelaId"]');
  if (selDividaNP) {
    selDividaNP.addEventListener('change', () => {
      const d = estado.dividas.find(x => x.id === selDividaNP.value);
      if (!d || !selParcelaNP) return;
      const opts = opcoesParcela(d);
      selParcelaNP.innerHTML = opts.map(o =>
        `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      selParcelaNP.value = opts[0]?.value || '';
      atualizarResumoParcela();
    });
  }
  if (selParcelaNP) {
    selParcelaNP.addEventListener('change', atualizarResumoParcela);
  }
  // Exibe o resumo inicial já com a parcela pré-selecionada
  atualizarResumoParcela();
  // Permite digitar centavos com vírgula pt-BR no campo de valor (text+inputmode).
  sanitizarDecimalInput(document.getElementById('modal')?.querySelector('[name="valor"]'));
}

function editarPagamento(p) {
  // Identifica pela referência do array em memória (edição in-place) e pelo id,
  // para garantir que a alteração persista ao salvar.
  const pagamento = estado.pagamentos.find(x => x.id === p.id) || p;
  const divida = estado.dividas.find(d => d.id === pagamento.dividaId);
  if (!divida) {
    toast(t('toast.erroPagamento'), 'error');
    return;
  }

  // Opções de parcela da dívida atualmente selecionada
  const opcoesParcela = (d) => (d.parcelas || []).map(parc => ({
    value: parc.id,
    label: `${t('pagamento.parcela')} ${parc.numero} · ${fmt.format(parc.valor)} · ${fmtData(parc.vencimento)} (${t(STATUS_LABEL[parc.status]) || parc.status})`
  }));

  abrirModal(t('modal.editarPagamento'), [
    { name: 'dividaId', label: t('form.divida'), type: 'select', value: pagamento.dividaId, options: estado.dividas.map(d => ({
      value: d.id,
      label: `${d.descricao} — ${fmt.format(saldoDivida(d))}`
    })) },
    { name: 'parcelaId', label: t('pagamento.parcela'), type: 'select', value: pagamento.parcelaId || '', options: opcoesParcela(divida) },
    { name: 'valor', label: t('form.valorPago') + ' (' + t('moeda') + ')', type: 'text', inputmode: 'decimal', step: '0.01', value: String(Number(pagamento.valor) || 0), required: true },
    { name: 'data', label: t('form.dataPagamento'), type: 'date', value: pagamento.data || hoje(), required: true },
    { name: 'nota', label: t('form.nota'), type: 'text', value: pagamento.nota || '', placeholder: 'Opcional' }
  ], async (v) => {
    const novaDivida = estado.dividas.find(d => d.id === v.dividaId);
    if (!novaDivida) return;
    // Mantém a parcela escolhida no formulário; se for de outra dívida (ou vazia),
    // re-vincula à próxima parcela em aberto da dívida selecionada (ou à última).
    let parcelaId = v.parcelaId || '';
    const pertence = (novaDivida.parcelas || []).some(x => x.id === parcelaId);
    if (!pertence) {
      const pagas = new Set(
        estado.pagamentos.filter(x => x.dividaId === novaDivida.id && x.parcelaId && x.id !== pagamento.id)
          .map(x => x.parcelaId)
      );
      const proxima = (novaDivida.parcelas || []).find(x => !pagas.has(x.id));
      parcelaId = proxima ? proxima.id : (novaDivida.parcelas?.[0]?.id || null);
    }
    // Atualiza o próprio objeto de pagamento (persistido via referência).
    Object.assign(pagamento, {
      dividaId: novaDivida.id,
      parcelaId,
      valor: numeroDeInput(v.valor),
      data: v.data,
      nota: v.nota || ''
    });
    // Recalcula a parcela de ORIGEM (se mudou de parcela/dívida) e a de DESTINO,
    // para manter valorPago/status/data consistentes após a edição.
    if (pagamento.parcelaId && pagamento.parcelaId !== parcelaId) {
      sincronizarParcela(divida, pagamento.parcelaId);
    }
    sincronizarParcela(novaDivida, parcelaId);
    // Nota unificada: o pagamento e a dívida compartilham a mesma observação.
    if (v.nota) novaDivida.observacao = v.nota;
    await persistir();
    toast(t('toast.pagamentoAtualizado'), 'success');
    ganharXP(8, t('xp.editarPagamento'));
    render();
  });

  // Preenche os campos de valor/data/nota conforme a parcela selecionada.
  // - ao ABRIR (parcelaAtual=true): mostra os dados do próprio pagamento em edição.
  // - ao TROCAR para outra parcela (parcelaAtual=false): carrega o pagamento já
  //   registrado daquela fatura (cada parcela tratada isoladamente); se a fatura
  //   ainda não foi paga, zera os campos para um novo registro.
  const preencherCamposDaParcela = (parcelaAtual = false) => {
    const selD = document.getElementById('modal')?.querySelector('[name="dividaId"]');
    const selP = document.getElementById('modal')?.querySelector('[name="parcelaId"]');
    const d = estado.dividas.find(x => x.id === selD?.value);
    if (!d || !selP) return;
    const parcelaId = selP.value;
    const valEl = document.getElementById('modal')?.querySelector('[name="valor"]');
    const datEl = document.getElementById('modal')?.querySelector('[name="data"]');
    const notEl = document.getElementById('modal')?.querySelector('[name="nota"]');
    if (parcelaAtual) {
      // Edição do próprio pagamento: mantém os valores atuais dele.
      if (valEl) valEl.value = String(Number(pagamento.valor) || 0);
      if (datEl) datEl.value = pagamento.data || hoje();
      if (notEl) notEl.value = pagamento.nota || '';
      return;
    }
    const pag = estado.pagamentos.find(x =>
      x.dividaId === d.id && x.parcelaId === parcelaId && x.id !== pagamento.id);
    if (valEl) { valEl.value = pag ? String(Number(pag.valor) || 0) : ''; }
    if (datEl) { datEl.value = pag ? (pag.data || hoje()) : hoje(); }
    if (notEl) { notEl.value = pag ? (pag.nota || '') : ''; }
  };

  // Ao trocar a dívida ou a parcela, recarrega o seletor, atualiza o resumo
  // INDIVIDUAL da parcela e os campos do formulário para aquela fatura.
  const atualizarAoSelecionar = () => {
    const selD = document.getElementById('modal')?.querySelector('[name="dividaId"]');
    const selP = document.getElementById('modal')?.querySelector('[name="parcelaId"]');
    const d = estado.dividas.find(x => x.id === selD?.value);
    const resumoEl = document.getElementById('resumo-parcelas');
    if (!d || !resumoEl) return;
    const r = resumoParcelas(d);
    resumoEl.innerHTML =
      resumoParcelasHtml(d, r) +
      (selP ? pagamentosParcelaHtml(d, selP.value) : '');
    preencherCamposDaParcela();
  };

  const selDivida = document.getElementById('modal')?.querySelector('[name="dividaId"]');
  if (selDivida) {
    selDivida.addEventListener('change', () => {
      const d = estado.dividas.find(x => x.id === selDivida.value);
      const selParcela = document.getElementById('modal')?.querySelector('[name="parcelaId"]');
      if (!d || !selParcela) return;
      const opts = opcoesParcela(d);
      selParcela.innerHTML = opts.map(o =>
        `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      selParcela.value = opts[0]?.value || '';
      atualizarAoSelecionar();
    });
  }

  const selParcelaEP = document.getElementById('modal')?.querySelector('[name="parcelaId"]');
  if (selParcelaEP) {
    selParcelaEP.addEventListener('change', atualizarAoSelecionar);
  }

  // Exibe o resumo inicial das parcelas (dívida + parcela individual)
  const resumoEl = document.getElementById('resumo-parcelas');
  if (resumoEl) {
    const r = resumoParcelas(divida);
    resumoEl.innerHTML =
      resumoParcelasHtml(divida, r) +
      pagamentosParcelaHtml(divida, pagamento.parcelaId || '');
  }
  // Ao abrir, os campos mostram os dados do próprio pagamento em edição.
  preencherCamposDaParcela(true);
  // Permite digitar centavos com vírgula pt-BR no campo de valor (text+inputmode).
  sanitizarDecimalInput(document.getElementById('modal')?.querySelector('[name="valor"]'));
}

// ---------- Gestão de pagamentos de UMA dívida (fluxo por parcela) ----------
// Abre uma janela da dívida que lista TODAS as parcelas. O usuário pode registrar
// ou editar o pagamento de cada parcela individualmente ("salvando a parte"),
// sem fechar a janela. Cada salvamento persiste aquele pagamento. Só ao clicar
// em "Concluir" (salvar tudo) a janela fecha e a dívida principal é efetivada.
function abrirGestaoDivida(d) {
  const modal = document.getElementById('modal');
  const modalCard = document.querySelector('.modal-card');
  modalCard.classList.add('modal-card--gestao');
  const resumo = resumoParcelas(d);

  const linhaParcela = (parc) => {
    const pago = valorPagoParcela(d, parc.id);
    const restante = Math.max(0, (Number(parc.valor) || 0) - pago);
    const pct = (Number(parc.valor) || 0) > 0 ? Math.round((pago / (Number(parc.valor) || 0)) * 100) : 0;
    const pagamentoExistente = estado.pagamentos.find(x => x.dividaId === d.id && x.parcelaId === parc.id);
    const acao = pagamentoExistente ? t('acao.editar') : t('acao.pagar');
    const statusPago = pago >= (Number(parc.valor) || 0) && (Number(parc.valor) || 0) > 0
      ? '<span class="tag pago" style="margin-left:6px">' + t('acao.quitada') + '</span>' : '';
    return `
      <div class="item-linha gestao-parcela">
        <div>
          <div class="titulo">Parcela ${parc.numero}${statusPago}</div>
          <div class="subtitulo">Venc ${fmtData(parc.vencimento)} · ${t(STATUS_LABEL[parc.status]) || parc.status}${parc.nota ? ' · ' + escapeHtml(parc.nota) : ''}</div>
        </div>
        <div>${fmt.format(Number(parc.valor) || 0)}</div>
        <div class="valor-saldo ${pago > 0 ? 'pago' : 'pendente'}">${fmt.format(pago)} <span style="color:var(--text-muted);font-weight:400">/ ${fmt.format(restante)}</span></div>
        <div style="color:var(--text-muted)">${pct}%</div>
        <div>
          <button class="btn-icon" data-acao="lancar-parcela" data-divida="${d.id}" data-parcela="${parc.id}">${acao}</button>
        </div>
      </div>`;
  };

  modalCard.innerHTML = `
    <button type="button" class="modal-fechar" data-acao="fechar-modal-x" aria-label="${escapeHtml(t('modal.fechar'))}">×</button>
    <h2 id="modal-titulo">${t('gestao.titulo')}${escapeHtml(d.descricao)}</h2>
    <div class="gestao-resumo">${resumoParcelasHtml(d, resumo)}</div>
    <div class="lista" style="margin-top:12px">
      <div class="lista-header gestao-header">
        <div>${t('col.parcela')}</div><div>${t('col.valor')}</div><div>${t('col.pagoResta')}</div><div>${t('col.pct')}</div><div></div>
      </div>
      ${(d.parcelas || []).slice().sort((a, b) => (a.numero || 0) - (b.numero || 0)).map(linhaParcela).join('')}
    </div>
    <div class="form-actions">
      <button type="button" id="btn-concluir-divida" class="btn btn-primary">${t('gestao.concluir')}</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // A gestão salva cada parcela individualmente; na lista (sem inputs) não há
  // alteração pendente. Captura snapshot para o caso de uma sub-janela de parcela.
  modalSnapshotInicial = capturarModalSnapshot();

  modalCard.querySelectorAll('[data-acao="lancar-parcela"]').forEach(b => {
    b.addEventListener('click', () => {
      const dividaId = b.dataset.divida;
      const parcelaId = b.dataset.parcela;
      const div = estado.dividas.find(x => x.id === dividaId);
      const parc = (div?.parcelas || []).find(x => x.id === parcelaId);
      if (div && parc) lancarPagamentoParcela(div, parc);
    });
  });
  document.getElementById('btn-concluir-divida').onclick = () => {
    fecharModal();
    // Bônus ao quitar a dívida inteira (100% paga)
    const pago = estado.pagamentos.filter(p => p.dividaId === d.id).reduce((a, p) => somaDinheiro(a, numDinheiro(p.valor)), 0);
    const total = totalDivida(d);
    if (total > 0 && pago >= total) ganharXP(50, t('xp.quitou'));
    ganharXP(5, t('xp.gestao'));
    render();
  };
  window.api.flashFoco();
}

// Formulário de lançamento/edição do pagamento de UMA parcela, dentro da gestão.
// Ao salvar, faz "upsert" do pagamento daquela parcela (um por parcela), persiste
// e VOLTA para a janela da dívida (não fecha). "Voltar" também retorna à gestão.
function lancarPagamentoParcela(d, parc) {
  const modal = document.getElementById('modal');
  const modalCard = document.querySelector('.modal-card');
  modalCard.classList.add('modal-card--gestao');
  const existente = estado.pagamentos.find(x => x.dividaId === d.id && x.parcelaId === parc.id);
  const valorParcela = Number(parc.valor) || 0;
  const jaPago = valorPagoParcela(d, parc.id);

  modalCard.innerHTML = `
    <button type="button" class="modal-fechar" data-acao="fechar-modal-x" aria-label="${escapeHtml(t('modal.fechar'))}">×</button>
    <h2 id="modal-titulo">${existente ? t('modal.editarPagamento') : t('modal.registrarPagamento')} — ${t('pagamento.parcela')} ${parc.numero}</h2>
    <div class="gestao-resumo">
      <div class="resumo-parcelas">
        <div class="campo"><label>${t('gestao.valorParcela')}</label><span>${fmt.format(valorParcela)}</span></div>
        <div class="campo"><label>${t('gestao.jaPago')}</label><span>${fmt.format(jaPago)}</span></div>
        <div class="campo"><label>${t('gestao.restanteParcela')}</label><span>${fmt.format(Math.max(0, valorParcela - jaPago))}</span></div>
      </div>
    </div>
    <form id="form-parcela" novalidate>
      <div id="campos-form">
        <div class="campo">
          <label>${t('form.valorPago')} (${t('moeda')})</label>
          <input type="text" inputmode="decimal" step="0.01" min="0" name="valor" placeholder="0,00" value="${existente ? (Number(existente.valor) || 0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : ''}" required />
        </div>
        <div class="campo">
          <label>${t('form.dataPagamento')}</label>
          <input type="date" name="data" value="${existente ? existente.data : hoje()}" required />
        </div>
        <div class="campo full">
          <label>${t('form.nota')}</label>
          <input type="text" name="nota" placeholder="Opcional" value="${existente ? escapeHtml(existente.nota || '') : ''}" />
        </div>
        <div class="campo full">
          <label>${t('form.carteira')}</label>
          <select name="carteiraId">
            <option value="">${t('nenhuma') || '—'}</option>
            ${(estado.carteiras || []).map(c => `<option value="${c.id}" ${existente && existente.carteiraId === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" id="btn-voltar" class="btn btn-ghost">${t('gestao.voltar')}</button>
        <button type="submit" id="btn-salvar-parcela" class="btn btn-primary">${t('gestao.salvarParcela')}</button>
      </div>
    </form>
  `;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  // Captura o estado inicial dos campos da parcela para detectar alterações.
  modalSnapshotInicial = capturarModalSnapshot();

  const form = document.getElementById('form-parcela');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valor = numeroDeInput(form.querySelector('[name="valor"]').value);
    const data = form.querySelector('[name="data"]').value || hoje();
    const nota = form.querySelector('[name="nota"]').value || '';
    const carteiraId = form.querySelector('[name="carteiraId"]').value || null;
    const valorAntigo = existente ? (Number(existente.valor) || 0) : 0;
    const carteiraIdAntigo = existente ? (existente.carteiraId || null) : null;
    if (existente) {
      Object.assign(existente, { valor, data, nota, carteiraId });
      const r = await aplicarDebitoCarteira(existente, valorAntigo, carteiraIdAntigo);
      if (!r.ok) { abrirGestaoDivida(d); return; } // cancelou saldo insuficiente
    } else {
      const pagamento = { id: uid(), dividaId: d.id, parcelaId: parc.id, valor, data, nota, carteiraId };
      const r = await aplicarDebitoCarteira(pagamento, 0, null);
      if (!r.ok) { abrirGestaoDivida(d); return; } // cancelou saldo insuficiente
      estado.pagamentos.push(pagamento);
    }
    // Recalcula o cache da parcela (valorPago, dataPagamento, status) a partir de
    // TODOS os pagamentos vinculados — fonte de verdade única. Garante que, ao
    // editar a dívida depois, o campo "valor pago" da parcela esteja correto.
    sincronizarParcela(d, parc.id);
    // Nota unificada: o pagamento e a dívida compartilham a mesma observação.
    if (nota) d.observacao = nota;
    persistir();
    ganharXP(existente ? 8 : 15, existente ? t('xp.editarPagamento') : t('xp.pagamento'));
    toast(existente ? t('toast.pagamentoAtualizado') : t('toast.pagamentoParcelaRegistrado'), 'success');
    abrirGestaoDivida(d); // volta para a janela da dívida, atualizada
  });
  document.getElementById('btn-voltar').onclick = () => abrirGestaoDivida(d);
  const primeiro = form.querySelector('input, select, textarea');
  if (primeiro) {
    window.api.flashFoco();
    setTimeout(() => { primeiro.focus(); if (primeiro.value && primeiro.select) primeiro.select(); }, 100);
  }
}

function excluirPagamento(p) {
  abrirConfirmacao({
    titulo: t('pagamento.excluir'),
    mensagem: t('msg.confirmExcluirPagamento'),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      const divida = estado.dividas.find(d => d.id === p.dividaId);
      estado.pagamentos = estado.pagamentos.filter(x => x.id !== p.id);
      if (divida) sincronizarParcela(divida, p.parcelaId);
      await persistir();
      ganharXP(-5);
      toast(t('toast.pagamentoExcluido'));
      render();
    }
  });
}

// ---------- Renderização ----------
// Calcula parcelas que vencem nos próximos 7 dias e as já atrasadas.
function calcularVencimentos(filtro) {
  const f = filtro || estado.filtro || {};
  const texto = normalizarTexto(f.texto);
  const de = f.periodoDe || '';
  const ate = f.periodoAte || '';
  const hojeDt = new Date();
  const limite = new Date(); limite.setDate(limite.getDate() + 7);
  const proximas = [];
  const atrasadas = [];
  for (const d of estado.dividas) {
    if (texto) {
      const alvo = normalizarTexto([d.descricao, d.credor, d.observacao].join(' '));
      if (!alvo.includes(texto)) continue;
    }
    const pagosIds = new Set(
      estado.pagamentos.filter(p => p.dividaId === d.id && p.parcelaId).map(p => p.parcelaId)
    );
    for (const p of (d.parcelas || [])) {
      if (pagosIds.has(p.id)) continue; // já paga, ignora
      const v = (p.vencimento || '').slice(0, 7); // 'YYYY-MM'
      if (de && v < de) continue;
      if (ate && v > ate) continue;
      const dt = new Date(p.vencimento);
      if (dt < hojeDt) {
        const dias = Math.max(0, Math.floor((hojeDt - dt) / 86400000));
        atrasadas.push({ divida: d, parcela: p, dias });
      } else if (dt <= limite) {
        const dias = Math.max(0, Math.floor((dt - hojeDt) / 86400000));
        proximas.push({ divida: d, parcela: p, dias });
      }
    }
  }
  proximas.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento));
  atrasadas.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento));
  return { proximas, atrasadas };
}

function render() {
  // Vue é DONO da view: NUNCA reescrevemos o #app aqui. Apenas incrementamos
  // o tick reativo — o root <component :is> e os componentes de view observam
  // uiTick e recalculam o v-html sozinhos (sem congelamento no Electron).
  // Antes de re-renderizar, preserva o foco/cursor do campo de busca (que é
  // recriado a cada tick) para a digitação não "piscar" ao filtrar dinamicamente.
  let _focoBusca = null;
  const ativo = document.activeElement;
  if (ativo && ativo.classList && ativo.classList.contains('campo-busca')) {
    try { _focoBusca = { start: ativo.selectionStart, end: ativo.selectionEnd, val: ativo.value }; } catch (_) {}
  }
  window.__focoBusca = _focoBusca;
  if (typeof window.uiTick !== 'undefined') window.uiTick.value++;
  // Mantém o botão de criptografia do menu rápido (engrenagem) sempre em
  // sincronia com o estado do perfil ativo — inclusive quando o usuário
  // ativa/desativa na página Configurações (que só chama render()).
  if (typeof atualizarGearCripto === 'function') atualizarGearCripto();
  // A montagem dos gráficos Chart.js (canvas dentro do v-html) é feita no hook
  // updated() de cada view que os usa (painel/relatorio/gamificacao). O updated()
  // roda APÓS o Vue aplicar o novo v-html e popular os pendentes — garantindo que
  // o <canvas> exista e o gráfico seja desenhado. Agendar montar() aqui via
  // nextTick disparava uma segunda chamada que destruía os gráficos já montados
  // (o nextTick do render rodava DEPOIS do updated(), apagando o canvas).
  // Atualiza os contadores da sidebar a cada "render".
  atualizarBadges();
}

// Event delegation para a busca dinâmica: como a view é re-renderizada via
// v-html a cada tecla, o handler inline "oninput" não é confiável (o input é
// recriado). Delegar no document captura o "input" em qualquer .campo-busca,
// mesmo após re-render, e chama definirFiltro('texto', valor) — filtrando
// dinamicamente a partir do primeiro caractere digitado.
function instalarDelegacaoBusca() {
  if (window.__delegacaoBuscaOk) return;
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('campo-busca')) {
      definirFiltro('texto', t.value);
    }
  });
  window.__delegacaoBuscaOk = true;
}

// View "Vencimentos": foco em urgência — parcelas atrasadas e que vencem em breve.

// View "Configurações": reúne aparência, idioma e dados (antigos botões soltos).

// Cache local das informações de sistema (evita piscar ao re-renderizar).
let _sobreInfoCache = null;
async function obterInfoSistema() {
  if (_sobreInfoCache) return _sobreInfoCache;
  try {
    const info = await window.api.sistemaInfo();
    _sobreInfoCache = info || {};
  } catch (e) {
    _sobreInfoCache = {};
  }
  return _sobreInfoCache;
}

// ---------- Carteiras (preparação para a funcionalidade) ----------
// Cada carteira guarda um saldo que, no futuro, poderá ser usado para
// realizar pagamentos de dívidas. Por enquanto expõe a listagem, criação,
// edição e exclusão de carteiras com saldo inicial.
function saldoTotalCarteiras() {
  return (estado.carteiras || []).reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
}

// ---------- Débito de carteira nos pagamentos ----------
function carteiraPorId(id) { return (estado.carteiras || []).find(c => c.id === id) || null; }

// Aplica o débito de uma carteira num pagamento (estorna a antiga, debita a nova).
// É async porque a confirmação de saldo insuficiente usa o modal estilizado
// (o confirm() nativo não funciona no Electron com contextIsolation).
// Retorna { ok, insuficiente }.
async function aplicarDebitoCarteira(pagamento, valorAntigo, carteiraIdAntigo) {
  const vNovo = Number(pagamento.valor) || 0;
  const vAntigo = Number(valorAntigo) || 0;
  const cNova = carteiraPorId(pagamento.carteiraId);
  const cAntiga = carteiraPorId(carteiraIdAntigo);

  // Estorna da carteira antiga (se havia e é diferente da nova)
  if (cAntiga && cAntiga.id !== (pagamento.carteiraId || null)) {
    cAntiga.saldo = (Number(cAntiga.saldo) || 0) + vAntigo;
  }
  // Aplica na nova (se informada e for diferente da antiga)
  if (cNova && cNova.id !== (carteiraIdAntigo || null)) {
    const saldoFinal = (Number(cNova.saldo) || 0) - vNovo;
    if (saldoFinal < 0) {
      const confirmou = await abrirConfirmacao({
        titulo: t('carteira.saldoInsuficienteTit'),
        mensagem: t('carteira.saldoInsuficiente'),
        textoConfirmar: t('acao.continuar'),
        textoCancelar: t('acao.cancelar'),
        perigo: true
      });
      if (!confirmou) {
        // Reverte o estorno da antiga e aborta.
        if (cAntiga && cAntiga.id !== (pagamento.carteiraId || null)) {
          cAntiga.saldo = (Number(cAntiga.saldo) || 0) - vAntigo;
        }
        return { ok: false, insuficiente: true };
      }
    }
    cNova.saldo = saldoFinal;
  }
  return { ok: true, insuficiente: false };
}

function estornarDebitoCarteira(pagamento) {
  const c = carteiraPorId(pagamento.carteiraId);
  if (c) c.saldo = (Number(c.saldo) || 0) + (Number(pagamento.valor) || 0);
}

function novaCarteira() {
  abrirModal(t('carteira.nova') || t('carteira.titulo'), [
    { name: 'nome', label: t('carteira.nome'), type: 'text', placeholder: t('carteira.exNome'), required: true },
    { name: 'saldo', label: t('carteira.saldoInicial') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', placeholder: '0,00', value: '0', required: true }
  ], async (v) => {
    estado.carteiras.push({
      id: uid(),
      nome: v.nome.trim(),
      saldo: Number(v.saldo) || 0,
      criadaEm: hoje()
    });
    await persistir();
    toast(t('toast.dividaSalva'), 'success');
    ganharXP(20, t('xp.novaCarteira'));
    render();
  });
}

function editarCarteira(c) {
  if (!c) return;
  abrirModal(t('carteira.editar'), [
    { name: 'nome', label: t('carteira.nome'), type: 'text', value: c.nome, required: true },
    { name: 'saldo', label: t('carteira.saldo') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', value: String(c.saldo), required: true }
  ], async (v) => {
    c.nome = v.nome.trim();
    c.saldo = Number(v.saldo) || 0;
    await persistir();
    toast(t('toast.dividaAtualizada'), 'success');
    ganharXP(5, t('xp.editarCarteira'));
    render();
  });
}

async function excluirCarteira(id) {
  const c = estado.carteiras.find(x => x.id === id);
  if (!c) return;
  abrirConfirmacao({
    titulo: t('carteira.excluir'),
    mensagem: t('carteira.confirmExcluir').replace('{nome}', c.nome),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      estado.carteiras = estado.carteiras.filter(x => x.id !== id);
      estado.lixeira.carteiras.unshift({ ...c, _excluidoEm: new Date().toISOString() });
      await persistir();
      toast(t('toast.carteiraExcluida'), 'success');
      render();
    }
  });
}

// ============================================================
// SPRINT 4 — Despesas recorrentes / assinaturas (S4-1)
// ============================================================
function novaRecorrente() {
  abrirModal(t('recorrentes.nova'), [
    { name: 'descricao', label: t('recorrentes.descricao'), type: 'text', placeholder: t('recorrentes.exDescricao'), required: true },
    { name: 'categoria', label: t('recorrentes.categoria'), type: 'select', value: 'servico', options: [
      { value: 'servico', label: t(RECORRENTE_CATS.servico.label) },
      { value: 'cartao', label: t(RECORRENTE_CATS.cartao.label) },
      { value: 'emprestimo', label: t(RECORRENTE_CATS.emprestimo.label) },
      { value: 'outro', label: t(RECORRENTE_CATS.outro.label) }
    ]},
    { name: 'valor', label: t('recorrentes.valor') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', min: '0', placeholder: '0,00', value: '', required: true },
    { name: 'diaVencimento', label: t('recorrentes.diaVencimento'), type: 'number', step: '1', min: '1', max: '31', placeholder: '1' },
    { name: 'observacao', label: t('recorrentes.observacao'), type: 'textarea', value: '' }
  ], async (v) => {
    estado.recorrentes.push({
      id: uid(),
      descricao: v.descricao.trim(),
      categoria: v.categoria,
      valor: Math.max(0, Number(String(v.valor).replace(',', '.')) || 0),
      diaVencimento: Math.min(31, Math.max(1, parseInt(v.diaVencimento, 10) || 1)),
      observacao: v.observacao || '',
      pausada: false,
      criadaEm: hoje()
    });
    await persistir();
    toast(t('toast.dividaSalva'), 'success');
    render();
  });
}

function editarRecorrente(r) {
  if (!r) return;
  abrirModal(t('recorrentes.editar'), [
    { name: 'descricao', label: t('recorrentes.descricao'), type: 'text', value: r.descricao, required: true },
    { name: 'categoria', label: t('recorrentes.categoria'), type: 'select', value: r.categoria, options: [
      { value: 'servico', label: t(RECORRENTE_CATS.servico.label) },
      { value: 'cartao', label: t(RECORRENTE_CATS.cartao.label) },
      { value: 'emprestimo', label: t(RECORRENTE_CATS.emprestimo.label) },
      { value: 'outro', label: t(RECORRENTE_CATS.outro.label) }
    ]},
    { name: 'valor', label: t('recorrentes.valor') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', min: '0', value: String(r.valor), required: true },
    { name: 'diaVencimento', label: t('recorrentes.diaVencimento'), type: 'number', step: '1', min: '1', max: '31', value: String(r.diaVencimento || 1) },
    { name: 'observacao', label: t('recorrentes.observacao'), type: 'textarea', value: r.observacao || '' },
    { name: 'pausada', label: t('recorrentes.pausada'), type: 'checkbox', value: !!r.pausada }
  ], async (v) => {
    r.descricao = v.descricao.trim();
    r.categoria = v.categoria;
    r.valor = Math.max(0, Number(String(v.valor).replace(',', '.')) || 0);
    r.diaVencimento = Math.min(31, Math.max(1, parseInt(v.diaVencimento, 10) || 1));
    r.observacao = v.observacao || '';
    r.pausada = !!v.pausada;
    await persistir();
    toast(t('toast.dividaAtualizada'), 'success');
    render();
  });
}

async function excluirRecorrente(id) {
  const r = estado.recorrentes.find(x => x.id === id);
  if (!r) return;
  abrirConfirmacao({
    titulo: t('recorrentes.excluir'),
    mensagem: t('recorrentes.confirmExcluir').replace('{nome}', r.descricao),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      estado.recorrentes = estado.recorrentes.filter(x => x.id !== id);
      estado.lixeira.recorrentes.unshift({ ...r, _excluidoEm: new Date().toISOString() });
      await persistir();
      toast(t('toast.dividaExcluida'), 'success');
      render();
    }
  });
}

// ============================================================
// SPRINT 4 — Juros & CET por dívida (S4-2)
// ============================================================
function editarJuros(d) {
  if (!d) return;
  abrirModal(t('juros.titulo') + ' — ' + d.descricao, [
    { name: 'taxaMensal', label: t('juros.taxaMensal'), type: 'number', step: '0.01', min: '0', placeholder: '0', value: String(numDinheiro(d.taxaMensal)) },
    { name: 'prazoMeses', label: t('juros.prazoMeses'), type: 'number', step: '1', min: '1', placeholder: '12', value: String(d.prazoMeses || 12) }
  ], async (v) => {
    d.taxaMensal = Math.max(0, Number(String(v.taxaMensal).replace(',', '.')) || 0);
    d.prazoMeses = Math.max(1, parseInt(v.prazoMeses, 10) || 12);
    await persistir();
    toast(t('toast.dividaAtualizada'), 'success');
    render();
  });
}

// ============================================================
// SPRINT 4 — Metas financeiras (S4-3) + conquistas atreladas (S4-5)
// ============================================================
function novaMeta() {
  abrirModal(t('metas.nova'), [
    { name: 'titulo', label: t('metas.descricao'), type: 'text', placeholder: t('metas.exTitulo'), required: true },
    { name: 'valorAlvo', label: t('metas.valorAlvo') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', min: '0', placeholder: '0,00', value: '', required: true },
    { name: 'valorAtual', label: t('metas.valorAtual') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', min: '0', placeholder: '0,00', value: '0' },
    { name: 'prazo', label: t('metas.prazo'), type: 'text', placeholder: 'ex: 12/2026' }
  ], async (v) => {
    estado.metas.push({
      id: uid(),
      titulo: v.titulo.trim(),
      valorAlvo: Math.max(0, Number(String(v.valorAlvo).replace(',', '.')) || 0),
      valorAtual: Math.max(0, Number(String(v.valorAtual).replace(',', '.')) || 0),
      prazo: v.prazo || '',
      concluida: false,
      criadaEm: hoje()
    });
    await persistir();
    toast(t('toast.dividaSalva'), 'success');
    render();
  });
}

function editarMeta(m) {
  if (!m) return;
  abrirModal(t('metas.editar'), [
    { name: 'titulo', label: t('metas.descricao'), type: 'text', value: m.titulo, required: true },
    { name: 'valorAlvo', label: t('metas.valorAlvo') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', min: '0', value: String(m.valorAlvo), required: true },
    { name: 'valorAtual', label: t('metas.valorAtual') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', min: '0', value: String(m.valorAtual) },
    { name: 'prazo', label: t('metas.prazo'), type: 'text', value: m.prazo || '' }
  ], async (v) => {
    m.titulo = v.titulo.trim();
    m.valorAlvo = Math.max(0, Number(String(v.valorAlvo).replace(',', '.')) || 0);
    m.valorAtual = Math.max(0, Number(String(v.valorAtual).replace(',', '.')) || 0);
    m.prazo = v.prazo || '';
    verificarConquistaMeta(m);
    await persistir();
    toast(t('toast.dividaAtualizada'), 'success');
    render();
  });
}

// S4-5: ao concluir uma meta (100% ou flag concluida), concede XP de conquista
// (somente a primeira vez — não re-concede ao reabrir/editar).
function verificarConquistaMeta(m) {
  const alvo = Math.max(0, numDinheiro(m.valorAlvo));
  const atual = Math.max(0, numDinheiro(m.valorAtual));
  const atingiu = (m.concluida || (alvo > 0 && atual >= alvo));
  if (atingiu && !m.conquistaConcedida) {
    m.conquistaConcedida = true;
    m.concluida = true;
    ganharXP(25, t('xp.conquistaMeta'));
    toast(t('metas.parabens').replace('{nome}', m.titulo), 'success');
  } else if (!atingiu) {
    m.conquistaConcedida = false;
    m.concluida = false;
  }
}

async function excluirMeta(id) {
  const m = estado.metas.find(x => x.id === id);
  if (!m) return;
  abrirConfirmacao({
    titulo: t('metas.excluir'),
    mensagem: t('metas.confirmExcluir').replace('{nome}', m.titulo),
    textoConfirmar: t('acao.excluir'),
    perigo: true,
    aoConfirmar: async () => {
      estado.metas = estado.metas.filter(x => x.id !== id);
      estado.lixeira.metas.unshift({ ...m, _excluidoEm: new Date().toISOString() });
      await persistir();
      toast(t('toast.dividaExcluida'), 'success');
      render();
    }
  });
}

// ============================================================
// SPRINT 4 — Simulador de quitação (S4-4)
// ============================================================
function simularQuitacaoHandler() {
  const est = document.getElementById('sim-estrategia');
  const pag = document.getElementById('sim-pagamento');
  const estrategia = est ? est.value : 'avalanche';
  const pagamento = Number(String(pag && pag.value || '0').replace(',', '.')) || 0;
  const r = simularQuitacao(estado.dividas, { estrategia, pagamentoMensal: pagamento, pagamentos: estado.pagamentos });
  window.__simCache = { meses: r.meses, totalJuros: r.totalJuros, possivel: r.possivel, pagamento, estrategia };
  render();
}

function initTicker() {
  const track = document.getElementById('ticker-track');
  if (!track) return;
  // Embaralha as dicas (Fisher-Yates) UMA vez por sessão, para que a ordem
  // aleatória seja mantida ao trocar de idioma (a mesma dica segue sendo exibida, só traduzida).
  if (!ordemTicker) {
    ordemTicker = DICAS.map(d => d);
    for (let i = ordemTicker.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordemTicker[i], ordemTicker[j]] = [ordemTicker[j], ordemTicker[i]];
    }
  }
  // Duplica a lista embaralhada para o scroll ser contínuo (translateX -50%)
  const umaVolta = ordemTicker.map(d => {
    const texto = (d[idiomaAtual] || d.pt || d);
    return `<span class="ticker-item"><span class="star">${ICON.estrela}</span>${escapeHtml(texto)}</span>`;
  }).join('');
  track.innerHTML = umaVolta + umaVolta;
  // Duração proporcional à quantidade, com velocidade mais lenta (mais leitura)
  const segundos = Math.max(90, DICAS.length * 5);
  track.style.animationDuration = `${segundos}s`;
}
// Ordem aleatória do carrossel (gerada uma vez por sessão).
let ordemTicker = null;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// S5-6: anexa um comprovante (imagem/PDF) a um pagamento.
async function anexarAnexoPagamento(id) {
  const p = estado.pagamentos.find(x => x.id === id);
  if (!p) return;
  const r = await window.api.selecionarAnexo();
  if (r.cancelado || !r.ok || !r.caminho) return;
  p.anexo = r.caminho;
  await persistir();
  toast(t('toast.anexoAdicionado'), 'success');
  render();
}

// S5-6: abre o arquivo de comprovante anexado no visualizador padrão do SO.
function abrirAnexo(id) {
  const p = estado.pagamentos.find(x => x.id === id);
  if (!p || !p.anexo) return;
  window.api.abrirLink(p.anexo);
}


// ---------- Handlers ----------
// S6-3: impede registrar novas entradas enquanto os dados nao foram carregados
// (ex.: arquivo criptografado aguardando desbloqueio). Evita a falsa sensacao
// de salvamento: o usuario adicionaria um dado que nao persiste (a trava em
// persistir() bloqueia a gravacao) e perderia ao fechar. Em vez de so avisar,
// reabre a caixa de dialogo de desbloqueio para o usuario digitar a senha na hora.
function bloquearSeNaoCarregado() {
  if (dadosCarregados) return false;
  if (window.mostrarToast) window.mostrarToast(t('cripto.entrarSemSenhaAviso') || 'Desbloqueie os dados para registrar novas entradas.', 'info');
  abrirModalDesbloqueio();
  return true;
}

const handlers = {
  'nova-divida': () => { if (bloquearSeNaoCarregado()) return; novaDivida(); },
  'anexar-anexo': (id) => anexarAnexoPagamento(id),
  'abrir-anexo': (id) => abrirAnexo(id),
  'limpar-filtro': () => limparFiltro(),
  'pagina': (pag) => definirFiltro('pagina', Number(pag) || 1),
  'ordenar': (campo) => {
    const f = estado.filtro || {};
    if (f.ordenar === campo) definirFiltro('asc', !f.asc);
    else definirFiltro({ ordenar: campo, asc: true });
  },
  'editar-divida': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) editarDivida(d);
  },
  'excluir-divida': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) excluirDivida(d);
  },
  'restaurar-divida': (id) => restaurarDivida(id),
  'esvaziar-lixeira-divida': (id) => esvaziarLixeiraDivida(id),
  'esvaziar-lixeira-tudo': () => esvaziarLixeiraTudo(),
  'restaurar-carteira': (id) => restaurarCarteira(id),
  'restaurar-recorrente': (id) => restaurarRecorrente(id),
  'restaurar-meta': (id) => restaurarMeta(id),
  'esvaziar-lixeira-carteira': (id) => esvaziarLixeiraItem('carteiras', id),
  'esvaziar-lixeira-recorrente': (id) => esvaziarLixeiraItem('recorrentes', id),
  'esvaziar-lixeira-meta': (id) => esvaziarLixeiraItem('metas', id),
  'novo-pagamento': () => { if (bloquearSeNaoCarregado()) return; novoPagamento(); },
  'nova-carteira': () => { if (bloquearSeNaoCarregado()) return; novaCarteira(); },
  'editar-carteira': (id) => {
    const c = estado.carteiras.find(x => x.id === id);
    if (c) editarCarteira(c);
  },
  'excluir-carteira': (id) => excluirCarteira(id),
  'pagar': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) novoPagamento(d);
  },
  'gerenciar-pagamentos': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) abrirGestaoDivida(d);
  },
  'excluir-pagamento': (id) => {
    const p = estado.pagamentos.find(x => x.id === id);
    if (p) excluirPagamento(p);
  },
  'editar-pagamento': (id) => {
    const p = estado.pagamentos.find(x => x.id === id);
    if (p) editarPagamento(p);
  },
  'exportar': () => exportarDados(),
  'exportar-csv': () => exportarCSV(),
  'exportar-pdf': () => exportarPDF(),
  'importar': () => importarDados(),
  'restaurar': () => restaurarBackup(),
  'fazerBackup': () => fazerBackupManual(),
  // S6-4: perfis
  'perfil-selecionar': () => abrirSelecaoPerfil(),
  'gerenciar-perfil-ativo': () => { const id = (window.__perfisInfo && window.__perfisInfo.ativo) || null; if (id) gerenciarPerfil(id); },
  'perfil-trocar': (id) => trocarPerfil(id),
  'cripto-ativar': () => ativarCriptografia(),
  'cripto-desativar': () => desativarCriptografia(),
  // B8: verificação manual de atualização (página Sobre)
  'verificar-atualizacao': () => verificarAtualizacaoManual(),
  // Sprint 4 — novas funcionalidades
  'nova-recorrente': () => { if (bloquearSeNaoCarregado()) return; novaRecorrente(); },
  'editar-recorrente': (id) => {
    const r = estado.recorrentes.find(x => x.id === id);
    if (r) editarRecorrente(r);
  },
  'excluir-recorrente': (id) => excluirRecorrente(id),
  'editar-juros': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) editarJuros(d);
  },
  'nova-meta': () => { if (bloquearSeNaoCarregado()) return; novaMeta(); },
  'editar-meta': (id) => {
    const m = estado.metas.find(x => x.id === id);
    if (m) editarMeta(m);
  },
  'excluir-meta': (id) => excluirMeta(id),
  'simular-quitacao': () => simularQuitacaoHandler()
};

async function exportarDados() {
  const r = await window.api.exportar();
  if (r.cancelado) return;
  if (r.ok) toast(t('toast.exportado') + r.caminho, 'success');
  else toast(r.erro || 'Erro ao exportar', 'error');
}

// S5-2: gera CSV (UTF-8 com BOM para o Excel abrir acentos) de dívidas e pagamentos.
function gerarCSV() {
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const linhas = [];
  linhas.push('DÍVIDAS');
  linhas.push([t('col.divida'), t('col.categoria'), t('col.total'), t('col.pago'), t('col.saldo')].map(esc).join(','));
  for (const d of estado.dividas) {
    linhas.push([d.descricao, t(CATEGORIAS[d.categoria]?.label) || d.categoria,
      totalDivida(d).toFixed(2), totalPago(d).toFixed(2), saldoDivida(d).toFixed(2)].map(esc).join(','));
  }
  linhas.push('');
  linhas.push('PAGAMENTOS');
  linhas.push([t('col.divida'), t('col.parcela'), t('col.valor'), t('form.data'), t('form.nota')].map(esc).join(','));
  for (const p of estado.pagamentos) {
    const d = estado.dividas.find(x => x.id === p.dividaId);
    const parc = d && (d.parcelas || []).find(x => x.id === p.parcelaId);
    linhas.push([d ? d.descricao : '', parc ? 'P' + parc.numero : '',
      Number(p.valor || 0).toFixed(2), p.data || '', p.nota || ''].map(esc).join(','));
  }
  return '﻿' + linhas.join('\r\n');
}

async function exportarCSV() {
  const csv = gerarCSV();
  const r = await window.api.exportarCSV(csv, 'meubolso-' + new Date().toISOString().slice(0, 10) + '.csv');
  if (r.cancelado) return;
  if (r.ok) toast(t('toast.exportado') + r.caminho, 'success');
  else toast(r.erro || 'Erro ao exportar CSV', 'error');
}

async function exportarPDF() {
  const r = await window.api.exportarPDF('meubolso-relatorio-' + new Date().toISOString().slice(0, 10) + '.pdf');
  if (r.cancelado) return;
  if (r.ok) toast(t('toast.exportado') + r.caminho, 'success');
  else toast(r.erro || 'Erro ao exportar PDF', 'error');
}

async function importarDados() {
  const r = await window.api.importar();
  if (r.cancelado) return;
  if (!r.ok) {
    toast(r.erro || 'Erro ao importar', 'error');
    return;
  }
  const atuais = estado.dividas.length + estado.pagamentos.length;
  const novos = r.dados.dividas.length + r.dados.pagamentos.length;
  const msg = atuais > 0
    ? `Você já tem ${atuais} registros. Substituir pelos ${novos} do arquivo importado?`
    : `Importar ${novos} registros?`;
  abrirConfirmacao({
    titulo: t('importar.titulo'),
    mensagem: msg,
    textoConfirmar: t('acao.importar'),
    perigo: true,
    aoConfirmar: async () => {
      // Mantém a reatividade do estado (Vue.reactive): faz merge, não reatribui.
      Object.assign(estado, {
        dividas: r.dados.dividas,
        pagamentos: r.dados.pagamentos,
        configuracoes: r.dados.configuracoes || { moeda: 'BRL' }
      });
      await persistir();
      toast(t('toast.dadosImportados'), 'success');
      render();
    }
  });
}

async function restaurarBackup() {
  const info = await window.api.backupInfo();
  if (!info.existe) {
    toast(info.erro || 'Nenhum backup local encontrado', 'error');
    return;
  }
  const dataLocal = new Date(info.modificadoEm).toLocaleString('pt-BR');
  const atuais = estado.dividas.length + estado.pagamentos.length;
  const msg = atuais > 0
    ? `Backup de ${dataLocal}.\n\nIsso substituirá os ${atuais} registros atuais pelo conteúdo do backup.\n\nContinuar?`
    : `Backup de ${dataLocal}.\n\nRestaurar este backup?`;
  abrirConfirmacao({
    titulo: t('restaurar.titulo'),
    mensagem: msg,
    textoConfirmar: t('acao.restaurar'),
    perigo: true,
    aoConfirmar: async () => {
      const r = await window.api.restaurar();
      if (!r.ok) {
        toast(r.erro || 'Erro ao restaurar', 'error');
        return;
      }
      // Mantém a reatividade do estado (Vue.reactive): faz merge, não reatribui.
      Object.assign(estado, {
        dividas: r.dados.dividas,
        pagamentos: r.dados.pagamentos,
        configuracoes: r.dados.configuracoes || { moeda: 'BRL' }
      });
      await persistir();
      // Respiro após IPC pesado para o compositor se estabilizar.
      await new Promise(resolve => setTimeout(resolve, 300));
      toast(t('toast.backupRestaurado'), 'success');
      render();
      // Destrava o foco dos inputs (equivalente a minimizar/maximizar a janela,
      // mas sem interação manual do usuário).
      await window.api.flashFoco();
    }
  });
}

async function fazerBackupManual() {
  const r = await window.api.fazerBackup();
  if (r.ok) toast(t('toast.backupFeito'), 'success');
  else toast(r.erro || 'Erro ao fazer backup', 'error');
}

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', async () => {
  // Guard contra re-entrada: em alguns ambientes (ex.: jsdom em testes) o
  // DOMContentLoaded pode disparar mais de uma vez, o que duplicaria os
  // listeners e quebraria toggles (tema/engrenagem). No Electron real só
  // dispara uma vez, mas o guard mantém o app robusto.
  if (window.__appInicializado) return;
  window.__appInicializado = true;

  // Preenche os ícones SVG marcados com data-ico no HTML estático
  // (o HTML não avalia ${...}; os SVGs vêm da biblioteca icons.js).
  if (typeof ICON !== 'undefined') {
    document.querySelectorAll('[data-ico]').forEach((el) => {
      const svg = ICON[el.getAttribute('data-ico')];
      if (svg) el.innerHTML = svg;
    });
  }

  // Navegação: cliques nos itens da sidebar (data-view).
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => setView(t.dataset.view));
  });

  // Delegação de eventos para ações (data-acao) — cobre itens da sidebar,
  // botões das views (incluindo Configurações) e o FAB mobile.
  document.addEventListener('click', (e) => {
    // Navegação por data-view (sidebar OU qualquer botão, ex.: "Ver detalhes" do game).
    const nav = e.target.closest('[data-view]');
    if (nav) { setView(nav.dataset.view); return; }
    const alvo = e.target.closest('[data-acao]');
    if (!alvo) return;
    const acao = alvo.dataset.acao;
    const id = alvo.dataset.id;
    handlers[acao]?.(id, alvo);
  });

  // Delegação para preferências (tema / idioma / fonte) — funcionam onde
  // estiverem, inclusive dentro da view Configurações (renderizada dinamicamente).
  document.addEventListener('click', (e) => {
    const tema = e.target.closest('[data-tema]');
    if (tema) {
      temaAtual = tema.dataset.tema;
      aplicarTema();
      salvarPrefs();
      return;
    }
    const idioma = e.target.closest('[data-idioma]');
    if (idioma) {
      const novo = idioma.dataset.idioma;
      if (novo === idiomaAtual) return; // ja esta neste idioma: nao re-renderiza
      idiomaAtual = novo;
      aplicarIdioma();
      salvarPrefs();
      render(); // re-renderiza a UI com o novo idioma
      return;
    }
    const fonte = e.target.closest('[data-fonte]');
    if (fonte) {
      // 3 tamanhos fixos: normal (1), grande (1.15), extra grande (1.3).
      const NIVEIS = [1, 1.15, 1.3];
      let s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-scale')) || 1;
      let idx = NIVEIS.reduce((best, n, i) => (Math.abs(n - s) < Math.abs(NIVEIS[best] - s) ? i : best), 0);
      const idxAntes = idx;
      if (fonte.dataset.fonte === 'aumentar') idx = Math.min(NIVEIS.length - 1, idx + 1);
      else idx = Math.max(0, idx - 1);
      s = NIVEIS[idx];
      document.documentElement.style.setProperty('--app-font-scale', s.toFixed(2));
      try { localStorage.setItem('appFontScale', s.toFixed(2)); } catch (e2) {}
      // So re-renderiza se o nivel realmente mudou (evita "atualizar a pagina"
      // quando ja esta no minimo/maximo e o usuario clica de novo).
      if (idx !== idxAntes) render();
      return;
    }
    const acento = e.target.closest('[data-accent]');
    if (acento) {
      acentoAtual = acento.dataset.accent;
      aplicarAceno();
      salvarPrefs();
      return;
    }
    // Alterna o painel de configurações rápidas (engrenagem ao lado do relógio).
    const gearBtn = e.target.closest('#btn-gear');
    if (gearBtn) {
      const panel = document.getElementById('gear-panel');
      const aberto = panel.classList.toggle('hidden') === false;
      gearBtn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      return;
    }
    // Fecha o painel ao clicar fora dele (e fora da engrenagem).
    const panel = document.getElementById('gear-panel');
    if (panel && !panel.classList.contains('hidden') && !e.target.closest('.relogio-wrap')) {
      panel.classList.add('hidden');
      const gb = document.getElementById('btn-gear');
      if (gb) gb.setAttribute('aria-expanded', 'false');
    }
  });

  // Fecha o painel de configurações com a tecla Escape.
  document.addEventListener('keydown', (e) => {
    // S5-4: atalhos de teclado de produtividade.
    // Não intercepta quando o foco está em campo de formulário (exceto Escape),
    // para não atrapalhar a digitação em modais/inputs.
    const emCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target && e.target.tagName) || '');
    if (!emCampo) {
      // Navegação entre views: 1..9
      const mapaNumeros = ['painel','dividas','pagamentos','vencimentos','carteiras','recorrentes','metas','juros','simulador'];
      if (e.key >= '1' && e.key <= '9') {
        const v = mapaNumeros[parseInt(e.key, 10) - 1];
        if (v) { setView(v); return; }
      }
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'n') { e.preventDefault(); if (typeof novaDivida === 'function') novaDivida(); return; }
        if (k === 'p') { e.preventDefault(); if (typeof novaPagamento === 'function') novaPagamento(); return; }
        if (k === 'f') { e.preventDefault(); focarBusca(); return; }
        if (k === 'e') { e.preventDefault(); if (typeof exportarDados === 'function') exportarDados(); return; }
      }
    }
    if (e.key === 'Escape') {
      const panel = document.getElementById('gear-panel');
      if (panel && !panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        const gb = document.getElementById('btn-gear');
        if (gb) gb.setAttribute('aria-expanded', 'false');
      }
    }
  });

  initTicker();
  // S6-4: se houver mais de um perfil, abre a seleção de perfil ao iniciar
  // (o usuário escolhe qual conjunto de dados/idioma/tema carregar).
  const listaPerfis = await listarPerfis();
  await carregar();
  if ((listaPerfis.perfis || []).length > 1) {
    abrirSelecaoPerfil();
  }
  // S5-3: notificações de vencimento — verifica no boot e a cada 6 horas.
  verificarNotificacoes().catch(() => {});
  setInterval(() => { verificarNotificacoes().catch(() => {}); }, 6 * 60 * 60 * 1000);
  // Lê preferências persistidas e aplica
  idiomaAtual = (estado.configuracoes && estado.configuracoes.idioma) || 'pt';
  temaAtual = (estado.configuracoes && estado.configuracoes.tema) || 'light';
  acentoAtual = (estado.configuracoes && estado.configuracoes.acento) || 'verde';
  // Fonte: abre SEMPRE no tamanho original (--app-font-scale: 1, definido no
  // :root do styles.css). Não restauramos o valor salvo em localStorage, para
  // que a inspeção do tamanho da janela seja feita na fonte padrão do sistema.
  // O controle de fonte (engrenagem) continua funcionando em tempo de execução.
  aplicarTema();
  aplicarIdioma();
  aplicarAceno();
  atualizarBadgeNivel();
  // XP de login diário (1x por dia)
  const dataHoje = hoje();
  if ((estado.gamificacao && estado.gamificacao.ultimoAcesso) !== dataHoje) {
    if (estado.gamificacao) estado.gamificacao.ultimoAcesso = dataHoje;
    ganharXP(3, t('xp.acesso'));
  }

  // ---------- Monta o app Vue (DONO da view) ----------
  // Root com <component :is="currentView">: troca o componente de view de
  // forma reativa. currentView é um computed (em setup) que lê o ref
  // __viewRef (troca de view) + uiTick (re-render ao mudar dados), então
  // navegação e qualquer render() forçam a troca/recálculo. NÃO congela no
  // Electron: o Vue reage a si próprio; o app.js só incrementa o tick /
  // troca o ref.
  if (typeof Vue !== 'undefined') {
    const RootApp = {
      components: window.MeuBolsoViews || {},
      setup() {
        const currentView = Vue.computed(() => {
          const v = window.__viewRef ? window.__viewRef.value : viewAtual;
          if (window.uiTick) window.uiTick.value; // dependência reativa p/ dados
          return v;
        });
        return { currentView };
      },
      render() {
        // key = uiTick.value força o Vue a RECRIAR o componente de view a cada
        // tick. Sem isso, <component :is> com o mesmo nome de view não re-renderiza
        // o filho, e o computed html (que depende de uiTick) não era reavaliado —
        // ex.: o botão de criptografia da página Configurações não refletia
        // ativar/desativar. Os inputs ficam em modais (fora do #app), então
        // recriar a view não perde digitação em formulários da view.
        const comp = (window.MeuBolsoViews || {})[this.currentView] || 'div';
        return Vue.h(comp, { key: window.uiTick ? window.uiTick.value : 0 });
      },
      updated() {
        // Após o Vue re-renderizar a view (v-html recriado), restaura o
        // foco/cursor no campo de busca se ele estava focado antes do tick —
        // garante digitação contínua e sem "pisco" ao filtrar dinamicamente.
        const f = window.__focoBusca;
        if (f) {
          const el = document.querySelector('.campo-busca');
          if (el) {
            el.focus();
            try { el.setSelectionRange(f.start, f.end); } catch (_) {}
          }
        }
      }
    };
    Vue.createApp(RootApp).mount('#app');
    instalarDelegacaoBusca();
  }
  render();
});
