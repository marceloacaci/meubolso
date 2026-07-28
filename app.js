// Estado em memória (espelho do arquivo). Tornado reativo (Vue.reactive)
// para que os componentes de view recomputem quando os dados mudam.
// OBS: para manter a reatividade, NUNCA reatribua `estado = {...}` — use
// Object.assign(estado, ...) (ver carregar/importar/restaurar).
let estado = Vue.reactive({ dividas: [], pagamentos: [], configuracoes: { moeda: 'BRL' } });

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
const hoje = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

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

function totalDivida(d) {
  return (d.parcelas || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
}
function totalPago(d) {
  // Considera apenas pagamentos vinculados a ESTA dívida (filtra por dividaId
  // E por parcelaId pertencente à dívida) — evita somar pagamentos de outra dívida.
  const ids = new Set((d.parcelas || []).filter(p => p.id).map(p => p.id));
  return estado.pagamentos
    .filter(p => p.dividaId === d.id && ids.has(p.parcelaId))
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
}
function saldoDivida(d) {
  return Math.max(0, totalDivida(d) - totalPago(d));
}

// ---------- Resumo de parcelas ----------
function resumoParcelas(d) {
  const total = (d.parcelas || []).length;
  // Conta parcelas pagas a partir dos pagamentos vinculados
  const pagamentoParcelas = new Set(
    estado.pagamentos.filter(p => p.dividaId === d.id && p.parcelaId).map(p => p.parcelaId)
  );
  const pagas = (d.parcelas || []).filter(p => pagamentoParcelas.has(p.id)).length;
  const restantes = total - pagas;
  const valorTotal = totalDivida(d);
  const valorPago = totalPago(d);
  const valorRestante = saldoDivida(d);
  // Percentuais baseados no VALOR (não na contagem de parcelas)
  const percentualPago = valorTotal > 0 ? ((valorPago / valorTotal) * 100).toFixed(0) : 0;
  const percentualRestante = valorTotal > 0 ? ((valorRestante / valorTotal) * 100).toFixed(0) : 0;

  return {
    total,
    pagas,
    restantes,
    percentualPago,
    percentualRestante,
    valorTotal,
    valorPago,
    valorRestante
  };
}

// Monta o bloco de resumo de parcelas exibido no modal de pagamentos (formato simples).
function resumoParcelasHtml(d, r) {
  return `
    <div class="resumo-parcelas">
      <div class="campo"><label>Parcelas pagas</label><span>${r.pagas} de ${r.total} paga(s)</span></div>
      <div class="campo"><label>Valor pago</label><span>${fmt.format(r.valorPago)} de ${fmt.format(r.valorTotal)} (${r.percentualPago}%)</span></div>
      <div class="campo"><label>Restante</label><span>${fmt.format(r.valorRestante)} (${r.percentualRestante}%)</span></div>
    </div>
  `;
}

// ---------- Pagamento por parcela (individual) ----------
// Soma APENAS os pagamentos vinculados a UMA parcela específica da dívida.
// Cada parcela é tratada de forma isolada: uma parcela não paga tem 0 pago.
function valorPagoParcela(d, parcelaId) {
  if (!parcelaId) {
    // Sem parcela vinculada: considera o total pago da dívida (caso legado).
    return totalPago(d);
  }
  return estado.pagamentos
    .filter(p => p.dividaId === d.id && p.parcelaId === parcelaId)
    .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
}

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
      <div class="campo"><label>Pago nesta parcela</label><span>${fmt.format(pagoParcela)} de ${fmt.format(valorParcela)} (${percPago}%)</span></div>
      <div class="campo"><label>Restante nesta parcela</label><span>${fmt.format(restanteParcela)} (${percRestante}%)</span></div>
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

const I18N = {
  pt: {
    'app.titulo': 'MeuBolso', 'ticker.tag': 'Dicas',
    'relogio.fuso': 'Brasília',
    'cta.novaDivida': 'Nova dívida', 'nav.grupo.principal': 'Principal', 'nav.grupo.analise': 'Análise', 'nav.grupo.sistema': 'Sistema',
    'cta.novoPagamento': 'Novo pagamento',
    'tab.carteiras': 'Carteiras',
    'carteira.titulo': 'Carteiras', 'carteira.nova': 'Nova carteira', 'carteira.nome': 'Nome da carteira',
    'carteira.saldo': 'Saldo', 'carteira.saldoInicial': 'Saldo inicial', 'carteira.total': 'Saldo total',
    'carteira.vazia': 'Nenhuma carteira cadastrada. Crie uma carteira para registrar saldos e usá-los nos pagamentos.',
    'carteira.editar': 'Editar carteira', 'carteira.excluir': 'Excluir carteira', 'carteira.confirmExcluir': 'Excluir a carteira "{nome}"? Esta ação não pode ser desfeita.',
    'form.carteira': 'Carteira de origem', 'carteira.origem': 'Carteira', 'carteira.debitado': 'Débito de',
    'carteira.saldoInsuficiente': 'Saldo da carteira insuficiente. O saldo ficará negativo. Deseja continuar?',
    'carteira.comPagamentos': 'Esta carteira possui pagamentos vinculados. Exclua ou reatribua os pagamentos antes de removê-la.',
    'nenhuma': 'Nenhuma', 'moeda': 'R$',
    'tab.painel': 'Painel', 'tab.resumo': 'Resumo', 'tab.dividas': 'Dívidas', 'tab.pagamentos': 'Pagamentos',
    'tab.vencimentos': 'Vencimentos', 'tab.relatorio': 'Relatório', 'tab.configuracoes': 'Configurações',
    'acao.exportar': 'Exportar', 'acao.importar': 'Importar', 'acao.restaurar': 'Restaurar backup',
    'divida.nova': 'Nova dívida', 'pagamento.novo': 'Novo pagamento', 'pagamento.gerenciar': 'Gerenciar pagamentos',
    'acao.editar': 'Editar', 'acao.excluir': 'Excluir', 'acao.pagar': 'Pagar',
    'acao.salvar': 'Salvar', 'acao.cancelar': 'Cancelar', 'acao.voltar': 'Voltar',
    'acao.fechar': 'Fechar', 'acao.fecharSemSalvar': 'Fechar sem salvar', 'acao.continuarEditando': 'Continuar editando', 'acao.continuar': 'Continuar',
    'acao.concluir': 'Concluir (salvar tudo)', 'acao.salvarParcela': 'Salvar esta parcela',
    'acao.importar': 'Importar', 'acao.restaurar': 'Restaurar',
    'divida.excluir': 'Excluir dívida', 'pagamento.excluir': 'Excluir pagamento',
    'importar.titulo': 'Importar dados', 'restaurar.titulo': 'Restaurar backup',
    'carteira.saldoInsuficienteTit': 'Saldo insuficiente',
    'form.descricao': 'Descrição', 'form.credor': 'Credor', 'form.categoria': 'Categoria',
    'form.observacao': 'Observação da dívida', 'form.parcelas': 'Parcelas', 'form.divida': 'Dívida',
    'form.valorParcela': 'Valor da parcela', 'form.vencimento': 'Vencimento', 'form.status': 'Status',
    'form.numero': 'Número', 'form.notaParcela': 'Nota da parcela',
    'form.valorPago': 'Valor pago', 'form.data': 'Data do pagamento', 'form.nota': 'Nota',
    'label.parcelasPagas': 'Parcelas pagas', 'label.valorPago': 'Valor pago',
    'label.restante': 'Restante', 'label.pagoTotal': '% pago', 'label.restanteTotal': '% restante',
    'empty.dividas': 'Nenhuma dívida cadastrada. Comece adicionando uma.',
    'empty.pagamentos1': 'Cadastre uma dívida primeiro para registrar pagamentos.',
    'empty.pagamentos2': 'Nenhuma dívida com pagamento registrado ainda.',
    'empty.pagamentos3': 'Use "Gerenciar pagamentos" em uma dívida ou "+ Novo pagamento".',
    'toast.pagamentoRegistrado': 'Pagamento registrado',
    'toast.pagamentoAtualizado': 'Pagamento da parcela atualizado',
    'toast.pagamentoParcelaRegistrado': 'Pagamento da parcela registrado',
    'toast.pagamentoExcluido': 'Pagamento excluído', 'toast.backupRestaurado': 'Backup restaurado',
    'toast.dadosImportados': 'Dados importados', 'toast.erroPagamento': 'A dívida vinculada a este pagamento não existe mais',
    'toast.exportado': 'Exportado para ',
    'toast.dividaSalva': 'Dívida salva',
    'toast.erroSalvar': 'Erro ao salvar dados',
    'status.pendente': 'Pendente', 'status.pago': 'Pago', 'status.atrasado': 'Atrasado', 'status.negociado': 'Negociado',
    'modal.editarDivida': 'Editar dívida', 'modal.registrarPagamento': 'Registrar pagamento',
    'modal.editarPagamento': 'Editar pagamento', 'aviso.parcelas': 'Preencha os dados de cada uma das ${n} parcela(s).',
    'toast.dividaAtualizada': 'Dívida atualizada', 'toast.dividaExcluida': 'Dívida excluída', 'toast.carteiraExcluida': 'Carteira excluída',
    'gestao.titulo': 'Pagamentos — ', 'gestao.concluir': 'Concluir (salvar tudo)',
    'gestao.valorParcela': 'Valor da parcela', 'gestao.jaPago': 'Já pago nesta parcela', 'gestao.restanteParcela': 'Restante nesta parcela',
    'gestao.salvarParcela': 'Salvar esta parcela', 'gestao.voltar': 'Voltar',
    'form.valorPago': 'Valor pago (R$)', 'form.dataPagamento': 'Data do pagamento', 'form.nota': 'Nota',
    'pagamento.parcela': 'Parcela',
    'divida.parcelas': 'parcela(s)', 'divida.comAtraso': 'com atraso',
    'pagamentos.titulo': 'Pagamentos', 'dividas.titulo': 'Minhas dívidas',
    'painel.titulo': 'Painel', 'resumo.titulo': 'Resumo Financeiro',
    'col.parcela': 'Parcela',
    'msg.confirmExcluirPagamento': 'Excluir este pagamento?',
    'msg.confirmExcluirDivida': 'Excluir esta dívida e todos os seus pagamentos?',
    'modal.fechar': 'Fechar',
    'msg.confirmFecharSemSalvar': 'Você fez alterações que não foram salvas. Deseja fechar a janela sem salvar?',
    'painel.titulo': 'Painel financeiro', 'painel.resumo': 'Resumo', 'painel.quitado': 'Quitado',
    'painel.pago': 'Pago', 'painel.saldo': 'Saldo', 'painel.categoria': 'Dívida por categoria',
    'painel.composicao': 'Composição', 'painel.insights': 'Insights sobre sua situação',
    'painel.status': 'Status das parcelas', 'painel.emAberto': 'Em aberto', 'painel.semDados': 'Sem dados.',
    'resumo.totalDividas': 'Total de dívidas', 'resumo.totalPago': 'Total pago', 'resumo.saldoPagar': 'Saldo a pagar',
    'resumo.dividasAtivas': 'Dívidas ativas', 'resumo.quitado': '% quitado', 'resumo.proximos7': 'Vencendo nos próximos 7 dias',
    'resumo.nenhumaProxima': 'Nenhuma parcela próxima do vencimento.',
    'cat.emprestimo': 'Empréstimo', 'cat.cartao': 'Cartão', 'cat.servico': 'Serviço', 'cat.outro': 'Outro',
    'status.pendente': 'Pendente', 'status.pago': 'Pago', 'status.atrasado': 'Atrasado', 'status.negociado': 'Negociado',
    'insight.vazio': 'Você não tem dívidas cadastradas. Que tal começar uma reserva de emergência?',
    'insight.quitadoAlto': '<b>{p}%</b> da dívida total já foi quitado. Você está no caminho certo!',
    'insight.quitadoMedio': 'Você já quitou <b>{p}%</b> das dívidas. Mantenha o ritmo de pagamentos.',
    'insight.quitadoBaixo': 'Apenas <b>{p}%</b> quitado. Considere pagar mais que o mínimo para reduzir juros.',
    'insight.nenhumPagamento': 'Nenhum pagamento registrado ainda. Comece quitando as parcelas que vencem primeiro.',
    'insight.atrasadas': 'Você tem <b>{n}</b> parcela(s) em atraso. Negocie ou quite o quanto antes para evitar juros maiores.',
    'insight.maior': 'Maior dívida: <b>{d}</b> ({v}).',
    'insight.cartao': 'Cartão de crédito representa <b>{p}%</b> da dívida. O juro do rotativo é alto: priorize quitar.',
    'insight.negociadas': '<b>{n}</b> parcela(s) negociada(s). Bom trabalho em reorganizar a dívida.',
    'insight.muitasParcelas': 'Você tem <b>{n}</b> parcelas ativas. Muitas dívidas fragmentadas dificultam o controle — considere concentrar.',
    'painel.totalDividas': 'Total de dívidas',
    'col.divida': 'Dívida', 'col.categoria': 'Categoria', 'col.total': 'Total', 'col.pago': 'Pago', 'col.saldo': 'Saldo', 'col.parcela': 'Parcela', 'col.vencimento': 'Vencimento', 'col.valor': 'Valor', 'col.acao': 'Ação',
    'col.pagoResta': 'Pago / resta', 'col.pct': '%',
    'grafico.total': 'Total', 'grafico.quitado': 'Quitado', 'grafico.dividaCategoria': 'Dívida por categoria', 'grafico.pagoVsAberto': 'Pago vs em aberto', 'grafico.emAberto': 'Em aberto', 'grafico.pago': 'Pago', 'grafico.semDivida': 'Sem dívidas',
    'relatorio.titulo': 'Relatório financeiro', 'vencimentos.titulo': 'Vencimentos', 'vencimentos.atrasadas': 'Parcelas atrasadas',
    'vencimentos.proximas': 'Vencendo nos próximos 7 dias',
    'vencimentos.nenhumaAtrasada': 'Nenhuma parcela atrasada.',
    'vencimentos.nenhumaProxima': 'Nenhuma parcela próxima do vencimento.',
    'config.titulo': 'Configurações', 'config.aparencia': 'Aparência', 'config.cor': 'Cor de destaque', 'config.corDestaque': 'Selecione a cor de destaque do sistema', 'config.tema': 'Tema',
    'config.fonte': 'Tamanho da fonte', 'config.idioma': 'Idioma', 'config.dados': 'Dados',
    'nivel.titulo': 'Nível', 'nivel.subiu': 'Você subiu para o nível',
    'nivel.verDetalhes': 'Ver detalhes',
    'nivel.celebTitulo': 'Nível {n} alcançado!', 'nivel.celebParabens': 'Parabéns! Você subiu de nível.', 'nivel.celebMotivo': 'Continue progredindo para desbloquear novos títulos e recompensas!',
    'nivel.continuar': 'Continuar',
    'xp.desconhecido': 'Pontuação',
    'xp.saldoAnterior': 'Pontos acumulados anteriormente', 'xp.saldoAnteriorInfo': 'Antes do registro detalhado',
    'xp.dividaNova': 'Dívida registrada', 'xp.pagamento': 'Pagamento registrado', 'xp.gestao': 'Gestão realizada', 'xp.acesso': 'Acesso registrado', 'xp.quitou': 'Dívida quitada', 'xp.novaCarteira': 'Carteira criada', 'xp.editarCarteira': 'Carteira editada',
    'nivel.nome1': 'Iniciante', 'nivel.nome2': 'Organizador', 'nivel.nome3': 'Controlador', 'nivel.nome4': 'Disciplinado',
    'nivel.nome5': 'Estrategista', 'nivel.nome6': 'Guardião', 'nivel.nome7': 'Mestre', 'nivel.nome8': 'Especialista',
    'nivel.nome9': 'Expert', 'nivel.nome10': 'Lenda das Finanças',
    'game.titulo': 'Pontuação e Conquistas', 'game.resumo': 'Detalhes da pontuação', 'game.xpAtual': 'XP total',
    'game.faltamNivel': 'Faltam', 'game.nivel': 'Nível', 'game.log': 'Histórico de pontos', 'game.paraProximo': 'para alcançar o nível', 'game.nivelMax': 'Nível máximo alcançado',
    'game.logVazio': 'Nenhum ponto registrado ainda. Comece cadastrando uma dívida!',
    'game.graficoXP': 'XP por atividade',
    'game.quests': 'Quests (como pontuar)', 'game.q.nova': 'Cadastrar uma nova dívida', 'game.q.editar': 'Editar uma dívida',
    'game.q.novaCarteira': 'Criar uma nova carteira', 'game.q.editarCarteira': 'Editar uma carteira',
    'game.q.pag': 'Registrar um pagamento', 'game.q.gestao': 'Concluir a gestão de uma dívida',
    'game.q.quitou': 'Quitar uma dívida por completo', 'game.q.acesso': 'Acesso diário ao app',
    'game.tabela': 'Tabela de níveis', 'game.tituloNivel': 'Título',
    'tab.sobre': 'Sobre',
    'sobre.titulo': 'Sobre o MeuBolso',
    'sobre.resumo': 'Resumo', 'sobre.sistema': 'Informações do sistema', 'sobre.tech': 'Tecnologias',
    'sobre.bootstrap': 'Framework CSS (componentes e tema)',
    'sobre.creditos': 'Créditos', 'sobre.licenca': 'Licença',
    'sobre.projeto': 'Projeto', 'sobre.verProjeto': 'Ver projeto no GitHub', 'sobre.verDevGitHub': 'Ver no GitHub',
    'sobre.idiomas': 'Idiomas',
    'sobre.descricao': 'O MeuBolso é um gerenciador de dívidas minimalista para desktop, voltado a pessoas físicas que querem controlar empréstimos, cartão de crédito e financiamentos em um só lugar. Registre dívidas, acompanhe parcelas e pagamentos, visualize relatórios e mantenha a motivação com um sistema de pontos e níveis — tudo localmente, sem necessidade de conta ou internet.',
    'sobre.dev': 'Desenvolvido por', 'sobre.devNome': 'Marcelo Acácio', 'sobre.devCargo': 'Analista e Desenvolvedor de Sistemas',
    'sobre.copy': '© 2026 MeuBolso. Todos os direitos reservados.',
    'sobre.versaoApp': 'Versão do app', 'sobre.versaoElectron': 'Electron', 'sobre.versaoNode': 'Node.js',
    'techVue': 'Framework reativo (view)', 'techSQLite': 'Persistência local (SQLite)', 'techChart': 'Gráficos (Chart.js)',
    'sobre.sistemaOp': 'Sistema operacional', 'sobre.arquitetura': 'Arquitetura'
  },

  en: {
    'app.titulo': 'MeuBolso', 'ticker.tag': 'Tips',
    'relogio.fuso': 'Brasilia',
    'cta.novaDivida': 'New debt', 'nav.grupo.principal': 'Main', 'nav.grupo.analise': 'Analysis', 'nav.grupo.sistema': 'System',
    'cta.novoPagamento': 'New payment',
    'tab.carteiras': 'Wallets',
    'carteira.titulo': 'Wallets', 'carteira.nova': 'New wallet', 'carteira.nome': 'Wallet name',
    'carteira.saldo': 'Balance', 'carteira.saldoInicial': 'Initial balance', 'carteira.total': 'Total balance',
    'carteira.vazia': 'No wallet registered. Create a wallet to record balances and use them for payments.',
    'carteira.editar': 'Edit wallet', 'carteira.excluir': 'Delete wallet', 'carteira.confirmExcluir': 'Delete the wallet "{nome}"? This action cannot be undone.',
    'form.carteira': 'Source wallet', 'carteira.origem': 'Wallet', 'carteira.debitado': 'Debited from',
    'carteira.saldoInsuficiente': 'Wallet balance is insufficient. The balance will go negative. Continue?',
    'carteira.comPagamentos': 'This wallet has linked payments. Delete or reassign those payments before removing it.',
    'nenhuma': 'None', 'moeda': '$',
    'tab.painel': 'Dashboard', 'tab.resumo': 'Summary', 'tab.dividas': 'Debts', 'tab.pagamentos': 'Payments',
    'tab.vencimentos': 'Due dates', 'tab.relatorio': 'Report', 'tab.configuracoes': 'Settings',
    'acao.exportar': 'Export', 'acao.importar': 'Import', 'acao.restaurar': 'Restore backup',
    'divida.nova': 'New debt', 'pagamento.novo': 'New payment', 'pagamento.gerenciar': 'Manage payments',
    'acao.editar': 'Edit', 'acao.excluir': 'Delete', 'acao.pagar': 'Pay',
    'acao.salvar': 'Save', 'acao.cancelar': 'Cancel', 'acao.voltar': 'Back',
    'acao.fechar': 'Close', 'acao.fecharSemSalvar': 'Close without saving', 'acao.continuarEditando': 'Keep editing', 'acao.continuar': 'Continue',
    'acao.importar': 'Import', 'acao.restaurar': 'Restore',
    'divida.excluir': 'Delete debt', 'pagamento.excluir': 'Delete payment',
    'importar.titulo': 'Import data', 'restaurar.titulo': 'Restore backup',
    'carteira.saldoInsuficienteTit': 'Insufficient balance',
    'acao.concluir': 'Finish (save all)', 'acao.salvarParcela': 'Save this installment',
    'form.descricao': 'Description', 'form.credor': 'Creditor', 'form.categoria': 'Category',
    'form.observacao': 'Debt note', 'form.parcelas': 'Installments', 'form.divida': 'Debt',
    'form.valorParcela': 'Installment amount', 'form.vencimento': 'Due date', 'form.status': 'Status',
    'form.numero': 'Number', 'form.notaParcela': 'Installment note',
    'form.valorPago': 'Amount paid', 'form.data': 'Payment date', 'form.nota': 'Note',
    'label.parcelasPagas': 'Paid installments', 'label.valorPago': 'Amount paid',
    'label.restante': 'Remaining', 'label.pagoTotal': '% paid', 'label.restanteTotal': '% remaining',
    'empty.dividas': 'No debts registered. Start by adding one.',
    'empty.pagamentos1': 'Register a debt first to record payments.',
    'empty.pagamentos2': 'No debt with payments recorded yet.',
    'empty.pagamentos3': 'Use "Manage payments" on a debt or "+ New payment".',
    'toast.pagamentoRegistrado': 'Payment registered',
    'toast.pagamentoAtualizado': 'Installment payment updated',
    'toast.pagamentoParcelaRegistrado': 'Installment payment registered',
    'toast.pagamentoExcluido': 'Payment deleted', 'toast.backupRestaurado': 'Backup restored',
    'toast.dadosImportados': 'Data imported', 'toast.erroPagamento': 'The debt linked to this payment no longer exists',
    'toast.exportado': 'Exported to ',
    'toast.dividaSalva': 'Debt saved',
    'toast.erroSalvar': 'Error saving data',
    'divida.parcelas': 'installment(s)', 'divida.comAtraso': 'overdue',
    'status.pendente': 'Pending', 'status.pago': 'Paid', 'status.atrasado': 'Overdue', 'status.negociado': 'Renegotiated',
    'pagamentos.titulo': 'Payments', 'dividas.titulo': 'My Debts',
    'painel.titulo': 'Dashboard', 'resumo.titulo': 'Financial Summary',
    'col.parcela': 'Installment',
    'msg.confirmExcluirPagamento': 'Delete this payment?',
    'msg.confirmExcluirDivida': 'Delete this debt and all its payments?',
    'modal.fechar': 'Close',
    'msg.confirmFecharSemSalvar': 'You have unsaved changes. Close without saving?',
    'painel.titulo': 'Financial dashboard', 'painel.resumo': 'Summary', 'painel.quitado': 'Paid off',
    'painel.pago': 'Paid', 'painel.saldo': 'Balance', 'painel.categoria': 'Debt by category',
    'painel.composicao': 'Composition', 'painel.insights': 'Insights about your situation',
    'painel.status': 'Installment status', 'painel.emAberto': 'Outstanding', 'painel.semDados': 'No data.',
    'resumo.totalDividas': 'Total debts', 'resumo.totalPago': 'Total paid', 'resumo.saldoPagar': 'Balance due',
    'resumo.dividasAtivas': 'Active debts', 'resumo.quitado': '% paid off', 'resumo.proximos7': 'Due in the next 7 days',
    'resumo.nenhumaProxima': 'No installments due soon.',
    'cat.emprestimo': 'Loan', 'cat.cartao': 'Card', 'cat.servico': 'Service', 'cat.outro': 'Other',
    'status.pendente': 'Pending', 'status.pago': 'Paid', 'status.atrasado': 'Overdue', 'status.negociado': 'Renegotiated',
    'insight.vazio': 'You have no registered debts. How about starting an emergency fund?',
    'insight.quitadoAlto': '<b>{p}%</b> of your total debt is already paid off. You are on the right track!',
    'insight.quitadoMedio': 'You have already paid off <b>{p}%</b> of your debts. Keep up the payment pace.',
    'insight.quitadoBaixo': 'Only <b>{p}%</b> paid off. Consider paying more than the minimum to reduce interest.',
    'insight.nenhumPagamento': 'No payments recorded yet. Start by paying the installments that come due first.',
    'insight.atrasadas': 'You have <b>{n}</b> overdue installment(s). Negotiate or pay them soon to avoid higher interest.',
    'insight.maior': 'Largest debt: <b>{d}</b> ({v}).',
    'insight.cartao': 'Credit card represents <b>{p}%</b> of your debt. Revolving interest is high: prioritize paying it off.',
    'insight.negociadas': '<b>{n}</b> renegotiated installment(s). Good job reorganizing your debt.',
    'insight.muitasParcelas': 'You have <b>{n}</b> active installments. Many fragmented debts make control harder — consider consolidating.',
    'painel.totalDividas': 'Total debts',
    'col.divida': 'Debt', 'col.categoria': 'Category', 'col.total': 'Total', 'col.pago': 'Paid', 'col.saldo': 'Balance', 'col.parcela': 'Installment', 'col.vencimento': 'Due date', 'col.valor': 'Amount', 'col.acao': 'Action',
    'col.pagoResta': 'Paid / remaining', 'col.pct': '%',
    'grafico.total': 'Total', 'grafico.quitado': 'Paid off', 'grafico.dividaCategoria': 'Debt by category', 'grafico.pagoVsAberto': 'Paid vs outstanding', 'grafico.emAberto': 'Outstanding', 'grafico.pago': 'Paid', 'grafico.semDivida': 'No debt',
    'relatorio.titulo': 'Financial report', 'vencimentos.titulo': 'Due dates', 'vencimentos.atrasadas': 'Overdue installments',
    'vencimentos.proximas': 'Due in the next 7 days',
    'vencimentos.nenhumaAtrasada': 'No overdue installments.',
    'vencimentos.nenhumaProxima': 'No installments due soon.',
    'config.titulo': 'Settings', 'config.aparencia': 'Appearance', 'config.cor': 'Accent color', 'config.corDestaque': 'Select the system accent color', 'config.tema': 'Theme',
    'config.fonte': 'Font size', 'config.idioma': 'Language', 'config.dados': 'Data',
    'nivel.titulo': 'Level', 'nivel.subiu': 'You reached level',
    'xp.dividaNova': 'Debt registered', 'xp.pagamento': 'Payment registered',
    'xp.gestao': 'Management done', 'xp.acesso': 'Session logged', 'xp.quitou': 'Debt paid off', 'xp.novaCarteira': 'Wallet created', 'xp.editarCarteira': 'Wallet edited',
    'nivel.verDetalhes': 'View details',
    'nivel.celebTitulo': 'Level {n} reached!', 'nivel.celebParabens': 'Congratulations! You leveled up.', 'nivel.celebMotivo': 'Keep progressing to unlock new titles and rewards!',
    'nivel.continuar': 'Continue',
    'xp.desconhecido': 'Score',
    'xp.saldoAnterior': 'Points earned previously', 'xp.saldoAnteriorInfo': 'Before detailed tracking',
    'nivel.nome1': 'Beginner', 'nivel.nome2': 'Organizer', 'nivel.nome3': 'Controller', 'nivel.nome4': 'Disciplined',
    'nivel.nome5': 'Strategist', 'nivel.nome6': 'Guardian', 'nivel.nome7': 'Master', 'nivel.nome8': 'Specialist',
    'nivel.nome9': 'Expert', 'nivel.nome10': 'Finance Legend',
    'game.titulo': 'Score & Achievements', 'game.resumo': 'Score details', 'game.xpAtual': 'Total XP',
    'game.faltamNivel': 'Need', 'game.nivel': 'Level', 'game.log': 'Points history', 'game.paraProximo': 'to reach level', 'game.nivelMax': 'Max level reached',
    'game.logVazio': 'No points recorded yet. Start by adding a debt!',
    'game.graficoXP': 'XP by activity',
    'game.quests': 'Quests (how to score)', 'game.q.nova': 'Register a new debt', 'game.q.editar': 'Edit a debt',
    'game.q.novaCarteira': 'Create a new wallet', 'game.q.editarCarteira': 'Edit a wallet',
    'game.q.pag': 'Record a payment', 'game.q.gestao': 'Finish managing a debt',
    'game.q.quitou': 'Pay off a debt completely', 'game.q.acesso': 'Daily app access',
    'game.tabela': 'Level table', 'game.tituloNivel': 'Title',
    'tab.sobre': 'About',
    'sobre.titulo': 'About MeuBolso',
    'sobre.resumo': 'Summary', 'sobre.sistema': 'System information', 'sobre.tech': 'Technologies',
    'sobre.bootstrap': 'CSS framework (components & theme)',
    'sobre.creditos': 'Credits', 'sobre.licenca': 'License',
    'sobre.projeto': 'Project', 'sobre.verProjeto': 'View project on GitHub', 'sobre.verDevGitHub': 'View on GitHub',
    'sobre.idiomas': 'Languages',
    'sobre.descricao': 'MeuBolso is a minimalist desktop debt manager for individuals who want to keep track of loans, credit cards and financing in one place. Register debts, follow installments and payments, view reports, and stay motivated with a points and levels system — all locally, with no account or internet required.',
    'sobre.dev': 'Developed by', 'sobre.devNome': 'Marcelo Acácio', 'sobre.devCargo': 'Systems Analyst and Developer',
    'sobre.copy': '© 2026 MeuBolso. All rights reserved.',
    'sobre.versaoApp': 'App version', 'sobre.versaoElectron': 'Electron', 'sobre.versaoNode': 'Node.js',
    'techVue': 'Reactive framework (view)', 'techSQLite': 'Local persistence (SQLite)', 'techChart': 'Charts (Chart.js)',
    'sobre.sistemaOp': 'Operating system', 'sobre.arquitetura': 'Architecture',
    'modal.editarDivida': 'Edit debt', 'modal.registrarPagamento': 'Register payment',
    'modal.editarPagamento': 'Edit payment', 'aviso.parcelas': 'Fill in the data for each of the ${n} installment(s).',
    'toast.dividaAtualizada': 'Debt updated', 'toast.dividaExcluida': 'Debt deleted', 'toast.carteiraExcluida': 'Wallet deleted',
    'gestao.titulo': 'Payments — ', 'gestao.concluir': 'Finish (save all)',
    'gestao.valorParcela': 'Installment amount', 'gestao.jaPago': 'Already paid on this installment', 'gestao.restanteParcela': 'Remaining on this installment',
    'gestao.salvarParcela': 'Save this installment', 'gestao.voltar': 'Back',
    'form.valorPago': 'Amount paid ($)', 'form.dataPagamento': 'Payment date', 'form.nota': 'Note',
    'pagamento.parcela': 'Installment'
  },
  es: {
    'app.titulo': 'MeuBolso', 'ticker.tag': 'Consejos',
    'relogio.fuso': 'Brasil',
    'cta.novaDivida': 'Nueva deuda', 'nav.grupo.principal': 'Principal', 'nav.grupo.analise': 'Análisis', 'nav.grupo.sistema': 'Sistema',
    'cta.novoPagamento': 'Nuevo pago',
    'tab.carteiras': 'Carteras',
    'carteira.titulo': 'Carteras', 'carteira.nova': 'Nueva cartera', 'carteira.nome': 'Nombre de la cartera',
    'carteira.saldo': 'Saldo', 'carteira.saldoInicial': 'Saldo inicial', 'carteira.total': 'Saldo total',
    'carteira.vazia': 'Ninguna cartera registrada. Crea una cartera para registrar saldos y usarlos en los pagos.',
    'carteira.editar': 'Editar cartera', 'carteira.excluir': 'Eliminar cartera', 'carteira.confirmExcluir': '¿Eliminar la cartera "{nome}"? Esta acción no se puede deshacer.',
    'form.carteira': 'Cartera de origen', 'carteira.origem': 'Cartera', 'carteira.debitado': 'Debitado de',
    'carteira.saldoInsuficiente': 'El saldo de la cartera es insuficiente. Quedará negativo. ¿Continuar?',
    'carteira.comPagamentos': 'Esta cartera tiene pagos vinculados. Elimina o reasigna esos pagos antes de quitarla.',
    'nenhuma': 'Ninguna', 'moeda': 'R$',
    'tab.painel': 'Panel', 'tab.resumo': 'Resumen', 'tab.dividas': 'Deudas', 'tab.pagamentos': 'Pagos',
    'tab.vencimentos': 'Vencimientos', 'tab.relatorio': 'Informe', 'tab.configuracoes': 'Ajustes',
    'acao.exportar': 'Exportar', 'acao.importar': 'Importar', 'acao.restaurar': 'Restaurar copia',
    'divida.nova': 'Nueva deuda', 'pagamento.novo': 'Nuevo pago', 'pagamento.gerenciar': 'Gestionar pagos',
    'acao.editar': 'Editar', 'acao.excluir': 'Eliminar', 'acao.pagar': 'Pagar',
    'acao.salvar': 'Guardar', 'acao.cancelar': 'Cancelar', 'acao.voltar': 'Volver',
    'acao.fechar': 'Cerrar', 'acao.fecharSemSalvar': 'Cerrar sin guardar', 'acao.continuarEditando': 'Seguir editando', 'acao.continuar': 'Continuar',
    'acao.importar': 'Importar', 'acao.restaurar': 'Restaurar',
    'divida.excluir': 'Eliminar deuda', 'pagamento.excluir': 'Eliminar pago',
    'importar.titulo': 'Importar datos', 'restaurar.titulo': 'Restaurar copia',
    'carteira.saldoInsuficienteTit': 'Saldo insuficiente',
    'acao.concluir': 'Finalizar (guardar todo)', 'acao.salvarParcela': 'Guardar esta cuota',
    'form.descricao': 'Descripción', 'form.credor': 'Acreedor', 'form.categoria': 'Categoría',
    'form.observacao': 'Nota de la deuda', 'form.parcelas': 'Cuotas', 'form.divida': 'Deuda',
    'form.valorParcela': 'Importe de la cuota', 'form.vencimento': 'Vencimiento', 'form.status': 'Estado',
    'form.numero': 'Número', 'form.notaParcela': 'Nota de la cuota',
    'form.valorPago': 'Importe pagado', 'form.data': 'Fecha de pago', 'form.nota': 'Nota',
    'label.parcelasPagas': 'Cuotas pagadas', 'label.valorPago': 'Importe pagado',
    'label.restante': 'Restante', 'label.pagoTotal': '% pagado', 'label.restanteTotal': '% restante',
    'empty.dividas': 'Ninguna deuda registrada. Empiece agregando una.',
    'empty.pagamentos1': 'Registre una deuda primero para anotar pagos.',
    'empty.pagamentos2': 'Ninguna deuda con pagos registrados aún.',
    'empty.pagamentos3': 'Use "Gestionar pagos" en una deuda o "+ Nuevo pago".',
    'toast.pagamentoRegistrado': 'Pago registrado',
    'toast.pagamentoAtualizado': 'Pago de cuota actualizado',
    'toast.pagamentoParcelaRegistrado': 'Pago de cuota registrado',
    'toast.pagamentoExcluido': 'Pago eliminado', 'toast.backupRestaurado': 'Copia restaurada',
    'toast.dadosImportados': 'Datos importados', 'toast.erroPagamento': 'La deuda vinculada a este pago ya no existe',
    'toast.exportado': 'Exportado a ',
    'toast.dividaSalva': 'Deuda guardada',
    'toast.erroSalvar': 'Error al guardar datos',
    'divida.parcelas': 'cuota(s)', 'divida.comAtraso': 'atrasada',
    'status.pendente': 'Pendiente', 'status.pago': 'Pagado', 'status.atrasado': 'Atrasado', 'status.negociado': 'Renegociado',
    'pagamentos.titulo': 'Pagos', 'dividas.titulo': 'Mis Deudas',
    'painel.titulo': 'Panel', 'resumo.titulo': 'Resumen Financiero',
    'col.parcela': 'Cuota',
    'msg.confirmExcluirPagamento': '¿Eliminar este pago?',
    'msg.confirmExcluirDivida': '¿Eliminar esta deuda y todos sus pagos?',
    'modal.fechar': 'Cerrar',
    'msg.confirmFecharSemSalvar': 'Tienes cambios sin guardar. ¿Cerrar la ventana sin guardar?',
    'painel.titulo': 'Panel financiero', 'painel.resumo': 'Resumen', 'painel.quitado': 'Saldado',
    'painel.pago': 'Pagado', 'painel.saldo': 'Saldo', 'painel.categoria': 'Deuda por categoría',
    'painel.composicao': 'Composición', 'painel.insights': 'Análisis de tu situación',
    'painel.status': 'Estado de las cuotas', 'painel.emAberto': 'En abierto', 'painel.semDados': 'Sin datos.',
    'resumo.totalDividas': 'Total de deudas', 'resumo.totalPago': 'Total pagado', 'resumo.saldoPagar': 'Saldo a pagar',
    'resumo.dividasAtivas': 'Deudas activas', 'resumo.quitado': '% saldado', 'resumo.proximos7': 'Vencen en los próximos 7 días',
    'resumo.nenhumaProxima': 'Ninguna cuota próxima al vencimiento.',
    'cat.emprestimo': 'Préstamo', 'cat.cartao': 'Tarjeta', 'cat.servico': 'Servicio', 'cat.outro': 'Otro',
    'status.pendente': 'Pendiente', 'status.pago': 'Pagada', 'status.atrasado': 'Atrasada', 'status.negociado': 'Renegociada',
    'insight.vazio': 'No tienes deudas registradas. ¿Qué tal empezar un fondo de emergencia?',
    'insight.quitadoAlto': '<b>{p}%</b> de la deuda total ya está pagado. ¡Vas por buen camino!',
    'insight.quitadoMedio': 'Ya pagaste <b>{p}%</b> de tus deudas. Mantén el ritmo de pagos.',
    'insight.quitadoBaixo': 'Solo <b>{p}%</b> pagado. Considera pagar más del mínimo para reducir intereses.',
    'insight.nenhumPagamento': 'Ningún pago registrado aún. Empieza pagando las cuotas que vencen primero.',
    'insight.atrasadas': 'Tienes <b>{n}</b> cuota(s) atrasada(s). Negocia o paga cuanto antes para evitar intereses mayores.',
    'insight.maior': 'Deuda mayor: <b>{d}</b> ({v}).',
    'insight.cartao': 'La tarjeta de crédito representa <b>{p}%</b> de la deuda. El interés rotativo es alto: prioriza saldarla.',
    'insight.negociadas': '<b>{n}</b> cuota(s) renegociada(s). Buen trabajo reorganizando la deuda.',
    'insight.muitasParcelas': 'Tienes <b>{n}</b> cuotas activas. Muchas deudas fragmentadas dificultan el control — considera concentrarlas.',
    'painel.totalDividas': 'Total de deudas',
    'col.divida': 'Deuda', 'col.categoria': 'Categoría', 'col.total': 'Total', 'col.pago': 'Pagado', 'col.saldo': 'Saldo', 'col.parcela': 'Cuota', 'col.vencimento': 'Vencimiento', 'col.valor': 'Importe', 'col.acao': 'Acción',
    'col.pagoResta': 'Pagado / resta', 'col.pct': '%',
    'grafico.total': 'Total', 'grafico.quitado': 'Saldado', 'grafico.dividaCategoria': 'Deuda por categoría', 'grafico.pagoVsAberto': 'Pagado vs pendiente', 'grafico.emAberto': 'Pendiente', 'grafico.pago': 'Pagado', 'grafico.semDivida': 'Sin deudas',
    'relatorio.titulo': 'Informe financiero', 'vencimentos.titulo': 'Vencimientos', 'vencimentos.atrasadas': 'Cuotas atrasadas',
    'vencimentos.proximas': 'Vencen en los próximos 7 días',
    'vencimentos.nenhumaAtrasada': 'Ninguna cuota atrasada.',
    'vencimentos.nenhumaProxima': 'Ninguna cuota próxima al vencimiento.',
    'config.titulo': 'Ajustes', 'config.aparencia': 'Apariencia', 'config.cor': 'Color de destaque', 'config.corDestaque': 'Selecciona el color de destaque del sistema', 'config.tema': 'Tema',
    'config.fonte': 'Tamaño de letra', 'config.idioma': 'Idioma', 'config.dados': 'Datos',
    'nivel.titulo': 'Nivel', 'nivel.subiu': 'Subiste al nivel',
    'xp.dividaNova': 'Deuda registrada', 'xp.pagamento': 'Pago registrado',
    'xp.gestao': 'Gestion completa', 'xp.acesso': 'Acceso registrado', 'xp.quitou': 'Deuda saldada', 'xp.novaCarteira': 'Cartera creada', 'xp.editarCarteira': 'Cartera editada',
    'nivel.verDetalhes': 'Ver detalles',
    'nivel.celebTitulo': '¡Nivel {n} alcanzado!', 'nivel.celebParabens': '¡Felicidades! Subiste de nivel.', 'nivel.celebMotivo': '¡Sigue progresando para desbloquear nuevos títulos y recompensas!',
    'nivel.continuar': 'Continuar',
    'xp.desconhecido': 'Puntos',
    'xp.saldoAnterior': 'Puntos acumulados anteriormente', 'xp.saldoAnteriorInfo': 'Antes del registro detallado',
    'nivel.nome1': 'Principiante', 'nivel.nome2': 'Organizador', 'nivel.nome3': 'Controlador', 'nivel.nome4': 'Disciplinado',
    'nivel.nome5': 'Estratega', 'nivel.nome6': 'Guardián', 'nivel.nome7': 'Maestro', 'nivel.nome8': 'Especialista',
    'nivel.nome9': 'Experto', 'nivel.nome10': 'Leyenda de las Finanzas',
    'game.titulo': 'Puntos y Logros', 'game.resumo': 'Detalles de la puntuación', 'game.xpAtual': 'XP total',
    'game.faltamNivel': 'Faltan', 'game.nivel': 'Nivel', 'game.log': 'Historial de puntos', 'game.paraProximo': 'para alcanzar el nivel', 'game.nivelMax': 'Nivel máximo alcanzado',
    'game.logVazio': 'Ningún punto registrado aún. ¡Empieza agregando una deuda!',
    'game.graficoXP': 'XP por actividad',
    'game.quests': 'Misiones (cómo puntuar)', 'game.q.nova': 'Registrar una nueva deuda', 'game.q.editar': 'Editar una deuda',
    'game.q.novaCarteira': 'Crear una nueva cartera', 'game.q.editarCarteira': 'Editar una cartera',
    'game.q.pag': 'Registrar un pago', 'game.q.gestao': 'Terminar de gestionar una deuda',
    'game.q.quitou': 'Pagar una deuda por completo', 'game.q.acesso': 'Acceso diario a la app',
    'game.tabela': 'Tabla de niveles', 'game.tituloNivel': 'Título',
    'tab.sobre': 'Acerca de',
    'sobre.titulo': 'Acerca de MeuBolso',
    'sobre.resumo': 'Resumen', 'sobre.sistema': 'Información del sistema', 'sobre.tech': 'Tecnologías',
    'sobre.bootstrap': 'Framework CSS (componentes y tema)',
    'sobre.creditos': 'Créditos', 'sobre.licenca': 'Licencia',
    'sobre.projeto': 'Proyecto', 'sobre.verProjeto': 'Ver proyecto en GitHub', 'sobre.verDevGitHub': 'Ver en GitHub',
    'sobre.idiomas': 'Idiomas',
    'sobre.descricao': 'MeuBolso es un gestor de deudas minimalista para escritorio, dirigido a personas físicas que quieren controlar préstamos, tarjeta de crédito y financiaciones en un solo lugar. Registre deudas, siga cuotas y pagos, vea informes y mantenga la motivación con un sistema de puntos y niveles — todo de forma local, sin cuenta ni internet.',
    'sobre.dev': 'Desarrollado por', 'sobre.devNome': 'Marcelo Acácio', 'sobre.devCargo': 'Analista y Desarrollador de Sistemas',
    'sobre.copy': '© 2026 MeuBolso. Todos los derechos reservados.',
    'sobre.versaoApp': 'Versión de la app', 'sobre.versaoElectron': 'Electron', 'sobre.versaoNode': 'Node.js',
    'techVue': 'Framework reactivo (vista)', 'techSQLite': 'Persistencia local (SQLite)', 'techChart': 'Gráficos (Chart.js)',
    'sobre.sistemaOp': 'Sistema operativo', 'sobre.arquitetura': 'Arquitectura',
    'modal.editarDivida': 'Editar deuda', 'modal.registrarPagamento': 'Registrar pago',
    'modal.editarPagamento': 'Editar pago', 'aviso.parcelas': 'Complete los datos de cada una de las ${n} cuota(s).',
    'toast.dividaAtualizada': 'Deuda actualizada', 'toast.dividaExcluida': 'Deuda eliminada', 'toast.carteiraExcluida': 'Cartera eliminada',
    'gestao.titulo': 'Pagos — ', 'gestao.concluir': 'Finalizar (guardar todo)',
    'gestao.valorParcela': 'Importe de la cuota', 'gestao.jaPago': 'Ya pagado en esta cuota', 'gestao.restanteParcela': 'Restante en esta cuota',
    'gestao.salvarParcela': 'Guardar esta cuota', 'gestao.voltar': 'Volver',
    'form.valorPago': 'Importe pagado ($)', 'form.dataPagamento': 'Fecha de pago', 'form.nota': 'Nota',
    'pagamento.parcela': 'Cuota'
  }
};

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
}
function aplicarIdioma() {
  document.documentElement.setAttribute('lang', idiomaAtual === 'pt' ? 'pt-BR' : idiomaAtual);
  document.querySelectorAll('[data-idioma]').forEach(b => {
    const on = b.dataset.idioma === idiomaAtual;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
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
    'sobre': 'tab.sobre', 'carteiras': 'tab.carteiras'
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
}

function calcularMetricas() {
  const totalDivida = estado.dividas.reduce((acc, d) => acc + (d.parcelas || []).reduce((a, p) => a + (Number(p.valor) || 0), 0), 0);
  const totalPago = estado.pagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const saldo = Math.max(0, totalDivida - totalPago);
  const progresso = totalDivida > 0 ? Math.min(100, (totalPago / totalDivida) * 100) : 0;

  const porCategoria = Object.keys(CATEGORIAS).map(k => {
    const valor = estado.dividas
      .filter(d => (d.categoria || 'outro') === k)
      .reduce((acc, d) => acc + (d.parcelas || []).reduce((a, p) => a + (Number(p.valor) || 0), 0), 0);
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

  return { totalDivida, totalPago, saldo, progresso, porCategoria, porStatus };
}

function gerarInsights(m) {
  const out = [];
  if (m.totalDivida === 0) {
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
  if (cartao > 0) out.push({ tipo: 'aten', ico: ICON.cartao, texto: ti('insight.cartao', { p: ((cartao / m.totalDivida) * 100).toFixed(0) }) });

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
    if (m.totalDivida > 0) {
      const pago = m.totalPago / m.totalDivida;
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

// Gráfico de barras (status das parcelas) — agora Chart.js (tipo 'bar'):
// cada barra cresce de baixo p/ cima, com tooltip e hover. Cores por status.
function graficoBarrasStatus(dados) {
  if (!dados.length) return '<p class="stat-sub">Sem parcelas.</p>';
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
  return `<div class="chart-wrap"><canvas id="${id}" role="img" aria-label="Status das parcelas"></canvas></div>`;
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
  const novo = await window.api.carregar();
  Object.assign(estado, {
    configuracoes: novo.configuracoes || { moeda: 'BRL' },
    dividas: novo.dividas || [],
    pagamentos: novo.pagamentos || [],
    carteiras: novo.carteiras || [],
    gamificacao: novo.gamificacao || { xp: 0, nivel: 1, ultimoAcesso: '' }
  });
  if (!estado.configuracoes) estado.configuracoes = { moeda: 'BRL' };
  if (!estado.dividas) estado.dividas = [];
  if (!estado.pagamentos) estado.pagamentos = [];
  if (!estado.carteiras) estado.carteiras = []; // preparação para a funcionalidade Carteiras
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
  // Recálculo retroativo: a pontuação por gestão de dívida caiu de 30 para 5 XP.
  // Recompensa o XP já registrado no histórico e recalcula o total/nível.
  await migrarXPgestao();
}

// ---------- Gamificação (níveis / XP) ----------
const XP_POR_NIVEL = 100; // cada 100 XP = 1 nível
// Tabela de níveis que o usuário pode alcançar (limite inferior de XP por nível).
const NIVEIS = [
  { nivel: 1, xp: 0,    titulo: 'nivel.nome1' },
  { nivel: 2, xp: 100,  titulo: 'nivel.nome2' },
  { nivel: 3, xp: 200,  titulo: 'nivel.nome3' },
  { nivel: 4, xp: 300,  titulo: 'nivel.nome4' },
  { nivel: 5, xp: 400,  titulo: 'nivel.nome5' },
  { nivel: 6, xp: 600,  titulo: 'nivel.nome6' },
  { nivel: 7, xp: 800,  titulo: 'nivel.nome7' },
  { nivel: 8, xp: 1000, titulo: 'nivel.nome8' },
  { nivel: 9, xp: 1300, titulo: 'nivel.nome9' },
  { nivel: 10, xp: 1600, titulo: 'nivel.nome10' }
];
function nivelDe(xp) { return 1 + Math.floor((xp || 0) / XP_POR_NIVEL); }

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
  'xp.dividaNova':    { ico: ICON.documento, quest: 'game.q.nova' },
  'xp.pagamento':     { ico: ICON.cartao, quest: 'game.q.pag' },
  'xp.gestao':        { ico: ICON.pasta, quest: 'game.q.gestao' },
  'xp.quitou':        { ico: ICON.chegada, quest: 'game.q.quitou' },
  'xp.acesso':        { ico: ICON.porta, quest: 'game.q.acesso' },
  'xp.novaCarteira':  { ico: ICON.carteira, quest: 'game.q.novaCarteira' },
  'xp.editarCarteira':{ ico: ICON.editar, quest: 'game.q.editarCarteira' },
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
  const resto = xpTotal % XP_POR_NIVEL;
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
  el.innerHTML = `<div class='perfil-texto'><span class='nivel-ico'>${ICON.trofeu}</span> ${t('nivel.titulo')} ${nivel} · ${tituloNivel(nivel)}</div>` +
    `<span class='nivel-barra'><span style='width:${(resto / XP_POR_NIVEL) * 100}%'></span></span>` +
    `<span class='nivel-xp'>${txtProgresso}</span>` +
    `<button class='nivel-btn' data-view='gamificacao'>${t('nivel.verDetalhes')} ${ICON.setaDireita}</button>`;
}
async function persistir(silencio = false) {
  try {
    const ok = await window.api.salvar(estado);
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

// ---------- Modal ----------
function abrirModal(titulo, campos, onSubmit) {
  // Constrói HTML como string. Substitui o modal-card inteiro, garantindo
  // que não haja estado residual entre aberturas (handlers, .value, focus).
  const modalCard = document.querySelector('.modal-card');
  modalCard.classList.remove('modal-card--gestao'); // garante modal padrão

  const escapeAttr = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const camposHtml = campos.map(c => {
    let inputHtml;
    if (c.type === 'select') {
      const optionsHtml = c.options.map(opt => {
        const sel = String(opt.value) === String(c.value) ? ' selected' : '';
        return `<option value="${escapeAttr(opt.value)}"${sel}>${escapeHtml(opt.label)}</option>`;
      }).join('');
      inputHtml = `<select class="form-select" name="${escapeAttr(c.name)}"${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''}>${optionsHtml}</select>`;
    } else if (c.type === 'textarea') {
      inputHtml = `<textarea class="form-control" name="${escapeAttr(c.name)}" rows="3"${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''}>${escapeHtml(c.value || '')}</textarea>`;
    } else {
      inputHtml = `<input class="form-control" type="${escapeAttr(c.type || 'text')}" name="${escapeAttr(c.name)}"${c.value !== undefined && c.value !== null ? ` value="${escapeAttr(c.value)}"` : ''}${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.step ? ` step="${escapeAttr(c.step)}"` : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''} />`;
    }
    return `<div class="mb-3"><label class="form-label">${escapeHtml(c.label)}</label>${inputHtml}</div>`;
  }).join('');

  modalCard.innerHTML = `
    <button type="button" class="modal-fechar" data-acao="fechar-modal-x" aria-label="${escapeAttr(t('modal.fechar'))}">×</button>
    <h2 id="modal-titulo">${escapeHtml(titulo)}</h2>
    <form id="form-modal" novalidate>
      <div id="campos-form">${camposHtml}</div>
      <div id="resumo-parcelas"></div>
      <div class="form-actions">
        <button type="button" id="btn-cancelar" class="btn btn-ghost">Cancelar</button>
        <button type="submit" id="btn-salvar" class="btn btn-primary">Salvar</button>
      </div>
    </form>
  `;

  // Mostra o modal
  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  // Captura o estado inicial dos campos para detectar alterações não salvas.
  modalSnapshotInicial = capturarModalSnapshot();

  // Amarra os handlers no form NOVO
  const form = document.getElementById('form-modal');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = form.querySelectorAll('input, select, textarea');
    const valores = {};
    campos.forEach((c, i) => { valores[c.name] = inputs[i]?.value ?? ''; });
    fecharModal();
    onSubmit(valores);
  });

  document.getElementById('btn-cancelar').onclick = tentarFecharModal;
  // A janela NÃO fecha ao clicar fora dela (modal-overlay). Assim o usuário
  // não perde os dados digitados se o mouse sair da janela e ele clicar fora.
  // O fechamento ocorre apenas pelos botões da própria janela (Salvar/Cancelar).

  // Foco no primeiro campo.
  // Destrava o foco "preso" do Electron (bug pós-IPC pesado). Equivale a
  // minimizar/maximizar a janela, mas feito via flashFoco() no main process.
  const primeiro = form.querySelector('input, select, textarea');
  if (primeiro) {
    window.api.flashFoco();
    setTimeout(() => {
      primeiro.focus();
      if (primeiro.value && primeiro.select) {
        primeiro.select();
      }
    }, 100);
  }
}

function fecharModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.querySelector('.modal-card')?.classList.remove('modal-card--gestao');
  modalSnapshotInicial = ''; // limpa o rastreamento de alterações ao fechar
}

// ---------- Detecção de alterações não salvas nos modais ----------
// Captura um "snapshot" estável dos valores dos campos do modal atual para
// detectar se o usuário digitou algo diferente desde a abertura.
let modalSnapshotInicial = '';
function capturarModalSnapshot() {
  const modal = document.getElementById('modal');
  if (!modal || modal.classList.contains('hidden')) return '';
  const campos = modal.querySelectorAll('input, select, textarea');
  return Array.from(campos)
    .map(e => `${e.name || e.id || ''}=${e.value || ''}`)
    .sort().join('|');
}
function modalFoiAlterado() {
  if (!modalSnapshotInicial) return false;
  return capturarModalSnapshot() !== modalSnapshotInicial;
}
// Fecha o modal, mas pergunta confirmação se houve alterações não salvas.
function tentarFecharModal() {
  if (!modalFoiAlterado()) { fecharModal(); return; }
  abrirConfirmacao({
    titulo: t('acao.fechar'),
    mensagem: t('msg.confirmFecharSemSalvar'),
    textoConfirmar: t('acao.fecharSemSalvar'),
    textoCancelar: t('acao.continuarEditando'),
    perigo: false,
    aoConfirmar: () => fecharModal()
  });
}

// ---------- Modal de confirmação customizado (visual consistente com o sistema) ----------
// Substitui o `confirm()` nativo (janela do SO) por um modal estilizado igual aos
// demais do app. Reaproveita o overlay #modal e o .modal-card para manter o mesmo
// visual, elementos e botões (Cancelar = btn-ghost, Confirmar = btn-danger/primary).
// opções: { titulo, mensagem, textoConfirmar, textoCancelar, perigo, aoConfirmar, aoCancelar }
// Retorna uma Promise<boolean> que resolve true (confirmou) ou false (cancelou).
function abrirConfirmacao(opts) {
  return new Promise((resolve) => {
    const o = opts || {};
    const modal = document.getElementById('modal');
    const modalCard = document.querySelector('.modal-card');
    if (!modal || !modalCard) { resolve(false); return; }
    modalCard.classList.remove('modal-card--gestao');

    // Preserva o conteúdo do modal "pai" (ex.: formulário em edição) para
    // restaurá-lo caso o usuário CANCELE a confirmação (continuar editando).
    const htmlAnterior = modalCard.innerHTML;

    const escapeAttr = (s) => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const isPerigo = o.perigo !== false; // perigo por padrão (exclusões)
    const clsConfirmar = isPerigo ? 'btn btn-danger' : 'btn btn-primary';
    modalCard.innerHTML = `
      <div class="confirm-card ${isPerigo ? 'confirm-card--perigo' : ''}">
        <div class="confirm-ico" aria-hidden="true">${isPerigo ? ICON.alerta : ICON.info}</div>
        <h2 id="confirm-titulo" class="confirm-titulo">${escapeHtml(o.titulo || t('acao.excluir'))}</h2>
        <p class="confirm-msg">${escapeHtml(o.mensagem || '')}</p>
        <div class="form-actions confirm-acoes">
          <button type="button" class="btn btn-ghost" id="confirm-cancelar">${escapeHtml(o.textoCancelar || t('acao.cancelar'))}</button>
          <button type="button" class="btn ${isPerigo ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${escapeHtml(o.textoConfirmar || t('acao.excluir'))}</button>
        </div>
      </div>`;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    const restaurarAnterior = () => { modalCard.innerHTML = htmlAnterior; };

    const btnCancelar = document.getElementById('confirm-cancelar');
    const btnOk = document.getElementById('confirm-ok');
    // Cancelar = NÃO sair: restaura o formulário e mantém o modal aberto.
    if (btnCancelar) btnCancelar.onclick = () => {
      restaurarAnterior();
      if (typeof o.aoCancelar === 'function') o.aoCancelar();
      resolve(false);
    };
    // Confirmar = executa a ação e fecha o modal.
    if (btnOk) btnOk.onclick = () => {
      if (typeof o.aoConfirmar === 'function') o.aoConfirmar();
      fecharModal();
      resolve(true);
    };
    // Foco no botão de confirmação para navegação por teclado.
    if (btnOk) { window.api.flashFoco(); setTimeout(() => btnOk.focus(), 60); }
  });
}

// Delegação: o botão "X" (fechar) em qualquer modal dispara a tentativa de fechar.
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest('[data-acao="fechar-modal-x"]')) {
    tentarFecharModal();
  }
});

// ---------- Ações: Dívidas ----------
const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'negociado', label: 'Negociado' }
];

// Lê as parcelas preenchidas no formulário dinâmico
// Monta o HTML dos formulários de parcelas (valor, vencimento, status)
function parcelasParaFormulario(n, parcelasExistentes = []) {
  let html = '';
  for (let i = 0; i < n; i++) {
    const existente = parcelasExistentes[i];
    const dataPadrao = (() => {
      const dt = new Date();
      dt.setMonth(dt.getMonth() + i);
      return dt.toISOString().slice(0, 10);
    })();
    const opts = STATUS_OPTIONS.map(o =>
      `<option value="${o.value}"${o.value === (existente?.status || 'pendente') ? ' selected' : ''}>${o.label}</option>`).join('');
    html += `
      <div class="parcela-item">
        <div class="parcela-topo"><span>Parcela ${i + 1}</span></div>
        <div class="parcela-grid">
          <div class="campo">
            <label>Valor (${t('moeda')})</label>
            <input type="number" step="0.01" min="0" name="pv${i}" placeholder="0,00" value="${existente ? (Number(existente.valor) || 0) : ''}" />
          </div>
          <div class="campo">
            <label>Vencimento</label>
            <input type="date" name="pd${i}" value="${existente ? existente.vencimento : dataPadrao}" />
          </div>
          <div class="campo full">
            <label>Status</label>
            <select name="ps${i}">${opts}</select>
          </div>
          <div class="campo full">
            <label>Nota da parcela (opcional)</label>
            <input type="text" name="pn${i}" placeholder="Ex: pagou via PIX" value="${existente ? escapeHtml(existente.nota || '') : ''}" />
          </div>
        </div>
      </div>`;
  }
  return html;
}

function lerParcelasDoForm(form, n, parcelasExistentes = []) {
  const parcelas = [];
  for (let i = 0; i < n; i++) {
    const v = form.querySelector(`[name="pv${i}"]`)?.value;
    const d = form.querySelector(`[name="pd${i}"]`)?.value;
    const s = form.querySelector(`[name="ps${i}"]`)?.value || 'pendente';
    const nt = form.querySelector(`[name="pn${i}"]`)?.value || '';
    const existente = parcelasExistentes[i];
    parcelas.push({
      id: existente?.id || uid(),
      numero: i + 1,
      valor: Number(v) || 0,
      vencimento: d || hoje(),
      status: s,
      nota: nt.trim()
    });
  }
  return parcelas;
}

function novaDivida() {
  abrirModal(t('divida.nova').replace(/^\+\s*/, '') || 'Nova dívida', [
    { name: 'descricao', label: t('form.descricao'), type: 'text', placeholder: 'Ex: Empréstimo bancário', required: true },
    { name: 'credor', label: t('form.credor'), type: 'text', placeholder: 'Ex: Banco X', required: true },
    { name: 'categoria', label: t('form.categoria'), type: 'select', value: 'emprestimo', options: [
      { value: 'emprestimo', label: t(CATEGORIAS.emprestimo.label) },
      { value: 'cartao', label: t(CATEGORIAS.cartao.label) },
      { value: 'servico', label: t(CATEGORIAS.servico.label) },
      { value: 'outro', label: t(CATEGORIAS.outro.label) }
    ]},
    { name: 'numParcelas', label: t('form.numero') + ' de parcelas', type: 'number', step: '1', placeholder: '1', value: '1', required: true, id: 'num-parcelas-input' },
    { name: 'observacao', label: t('form.observacao'), type: 'textarea', value: '' }
  ], async (v) => {
    const n = Math.max(1, parseInt(v.numParcelas, 10) || 1);
    const form = document.getElementById('form-modal');
    const parcelas = lerParcelasDoForm(form, n);
    const total = parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    estado.dividas.push({
      id: uid(),
      descricao: v.descricao.trim(),
      credor: v.credor.trim(),
      categoria: v.categoria,
      valorTotal: total,
      parcelas,
      observacao: v.observacao || '',
      criadaEm: hoje()
    });
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
    { name: 'numParcelas', label: t('form.numero') + ' de parcelas', type: 'number', step: '1', placeholder: '1', value: String(parcelasAtuais.length || 1), required: true, id: 'num-parcelas-input' },
    { name: 'observacao', label: t('form.observacao'), type: 'textarea', value: d.observacao || '' }
  ], async (v) => {
    const n = Math.max(1, parseInt(v.numParcelas, 10) || 1);
    const form = document.getElementById('form-modal');
    const parcelas = lerParcelasDoForm(form, n, parcelasAtuais);
    const total = parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    Object.assign(d, {
      descricao: v.descricao.trim(),
      credor: v.credor.trim(),
      categoria: v.categoria,
      valorTotal: total,
      parcelas,
      observacao: v.observacao || ''
    });
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
      estado.dividas = estado.dividas.filter(x => x.id !== d.id);
      estado.pagamentos = estado.pagamentos.filter(p => p.dividaId !== d.id);
      await persistir();
      ganharXP(-10);
      toast(t('toast.dividaExcluida'));
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
    { name: 'valor', label: t('form.valorPago') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', placeholder: '0,00', required: true },
    { name: 'data', label: t('form.dataPagamento'), type: 'date', value: hoje(), required: true },
    { name: 'nota', label: t('form.nota'), type: 'text', placeholder: 'Opcional' },
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
      valor: Number(v.valor) || 0,
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
    { name: 'valor', label: t('form.valorPago') + ' (' + t('moeda') + ')', type: 'number', step: '0.01', value: String(Number(pagamento.valor) || 0), required: true },
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
      valor: Number(v.valor) || 0,
      data: v.data,
      nota: v.nota || ''
    });
    await persistir();
    toast(t('toast.pagamentoAtualizado'), 'success');
    ganharXP(8);
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
    const acao = pagamentoExistente ? 'Editar' : 'Pagar';
    const statusPago = pago >= (Number(parc.valor) || 0) && (Number(parc.valor) || 0) > 0
      ? '<span class="tag pago" style="margin-left:6px">quitada</span>' : '';
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
    const pago = estado.pagamentos.filter(p => p.dividaId === d.id).reduce((a, p) => a + (Number(p.valor) || 0), 0);
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
          <input type="number" step="0.01" min="0" name="valor" placeholder="0,00" value="${existente ? (Number(existente.valor) || 0) : ''}" required />
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
    const valor = Number(form.querySelector('[name="valor"]').value) || 0;
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
    // Atualiza o status da parcela conforme o pagamento (quitada se pago integralmente)
    const novoPago = valorPagoParcela(d, parc.id);
    if (novoPago >= valorParcela && valorParcela > 0) {
      parc.status = 'pago';
    } else if (parc.status === 'pago') {
      parc.status = 'pendente';
    }
    persistir();
    ganharXP(15);
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
      estado.pagamentos = estado.pagamentos.filter(x => x.id !== p.id);
      await persistir();
      ganharXP(-5);
      toast(t('toast.pagamentoExcluido'));
      render();
    }
  });
}

// ---------- Renderização ----------
// Calcula parcelas que vencem nos próximos 7 dias e as já atrasadas.
function calcularVencimentos() {
  const hojeDt = new Date();
  const limite = new Date(); limite.setDate(limite.getDate() + 7);
  const proximas = [];
  const atrasadas = [];
  for (const d of estado.dividas) {
    const pagosIds = new Set(
      estado.pagamentos.filter(p => p.dividaId === d.id && p.parcelaId).map(p => p.parcelaId)
    );
    for (const p of (d.parcelas || [])) {
      if (pagosIds.has(p.id)) continue; // já paga, ignora
      const dt = new Date(p.vencimento);
      if (dt < hojeDt) atrasadas.push({ divida: d, parcela: p });
      else if (dt <= limite) proximas.push({ divida: d, parcela: p });
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
  if (typeof window.uiTick !== 'undefined') window.uiTick.value++;
  // Os gráficos Chart.js (pizza/rosca) usam <canvas> dentro do v-html; precisam
  // ser montados APÓS o Vue atualizar o DOM. Agendamos via nextTick.
  if (typeof Vue !== 'undefined' && Vue.nextTick && window.ChartGraficos) {
    Vue.nextTick(() => { try { window.ChartGraficos.montar(); } catch (_) {} });
  }
  // Atualiza os contadores da sidebar a cada "render".
  atualizarBadges();
}

function renderPainel() {
  const metricas = calcularMetricas();
  const insights = gerarInsights(metricas);

  return `
    <div class="page-header"><h2>${t('painel.titulo')}</h2></div>

    <div class="row row-cols-1 row-cols-lg-3 g-3 mb-4">
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.resumo')}</h3>
            <div class="h3 mb-1">${fmt.format(metricas.totalDivida)}</div>
            <div class="text-secondary small">${t('painel.totalDividas')} (${estado.dividas.length})</div>
            <div class="d-flex justify-content-between text-secondary small mt-3 mb-1">
              <span>${t('painel.quitado')}</span><span>${metricas.progresso.toFixed(0)}%</span>
            </div>
            <div class="progress" style="height:8px">
              <div class="progress-bar" style="width:${metricas.progresso}%"></div>
            </div>
            <div class="d-flex gap-4 mt-3">
              <div><div class="text-secondary small">${t('painel.pago')}</div><div class="fw-semibold text-success">${fmt.format(metricas.totalPago)}</div></div>
              <div><div class="text-secondary small">${t('painel.saldo')}</div><div class="fw-semibold text-danger">${fmt.format(metricas.saldo)}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.categoria')}</h3>
            <div class="chart-wrap">${graficoPizza(metricas.porCategoria)}</div>
            ${metricas.porCategoria.length ? `<div class="legend">${metricas.porCategoria.map(c => `
              <span class="legend-item"><span class="legend-dot" style="background:${c.cor}"></span>${c.label} ${fmt.format(c.valor)}</span>`).join('')}</div>` : `<p class="text-secondary small mb-0">${t('painel.semDados')}</p>`}
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.composicao')}</h3>
            <div class="chart-wrap">${graficoRosca(metricas)}</div>
            <div class="legend">
              <span class="legend-item"><span class="legend-dot" style="background:#2d6a4f"></span>${t('painel.pago')} ${fmt.format(metricas.totalPago)}</span>
              <span class="legend-item"><span class="legend-dot" style="background:#c1121f"></span>${t('painel.emAberto')} ${fmt.format(metricas.saldo)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row row-cols-1 row-cols-lg-3 g-3">
      <div class="col-lg-8">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.insights')}</h3>
            <ul class="list-group list-group-flush">
              ${insights.map(i => `<li class="list-group-item d-flex gap-2 align-items-start px-0 border-0"><span>${i.ico}</span><span>${i.texto}</span></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.status')}</h3>
            <div class="chart-wrap">${graficoBarrasStatus(metricas.porStatus)}</div>
            <div class="legend">
              ${metricas.porStatus.map(s => `<span class="legend-item"><span class="legend-dot" style="background:${s.cor}"></span>${s.label} ${s.qtd}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRelatorio() {
  const total = estado.dividas.reduce((acc, d) => acc + totalDivida(d), 0);
  const pago = estado.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const saldo = Math.max(0, total - pago);
  const restantes = estado.dividas.length;

  const hojeDt = new Date();
  const limite = new Date(); limite.setDate(limite.getDate() + 7);
  const proximas = [];
  for (const d of estado.dividas) {
    const pagosIds = new Set(
      estado.pagamentos.filter(p => p.dividaId === d.id && p.parcelaId).map(p => p.parcelaId)
    );
    for (const p of (d.parcelas || [])) {
      if (pagosIds.has(p.id)) continue;
      const dt = new Date(p.vencimento);
      if (dt >= hojeDt && dt <= limite) {
        proximas.push({ divida: d, parcela: p });
      }
    }
  }
  proximas.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento));

  const progresso = total > 0 ? Math.min(100, (pago / total) * 100) : 0;

  return `
    <div class="page-header"><h2>${t('relatorio.titulo')}</h2></div>
    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.totalDividas')}</div>
            <div class="h4 mb-2">${fmt.format(total)}</div>
            <div class="progress" role="progressbar" aria-label="${progresso.toFixed(0)}${t('resumo.quitado')}" style="height:6px">
              <div class="progress-bar" style="width:${progresso}%"></div>
            </div>
            <div class="text-secondary small mt-1">${progresso.toFixed(0)}${t('resumo.quitado')}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.totalPago')}</div>
            <div class="h4 mb-0 text-success">${fmt.format(pago)}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.saldoPagar')}</div>
            <div class="h4 mb-0 text-danger">${fmt.format(saldo)}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.dividasAtivas')}</div>
            <div class="h4 mb-0">${restantes}</div>
          </div>
        </div>
      </div>
    </div>

    <h3 class="h6 text-secondary mb-2">${t('resumo.proximos7')}</h3>
    ${proximas.length === 0 ? `
      <div class="alert alert-success d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.check}</span>
        <div>${t('resumo.nenhumaProxima')}</div>
      </div>
    ` : `
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>${t('col.divida')}</th>
                <th>${t('col.parcela')}</th>
                <th>${t('col.vencimento')}</th>
                <th class="text-end">${t('col.valor')}</th>
                <th class="text-end">${t('col.acao')}</th>
              </tr>
            </thead>
            <tbody>
              ${proximas.map(({divida, parcela}) => `
                <tr>
                  <td>
                    <div class="fw-semibold">${escapeHtml(divida.descricao)}</div>
                    <div class="text-secondary small">${escapeHtml(divida.credor)}</div>
                  </td>
                  <td>${parcela.numero}</td>
                  <td>${fmtData(parcela.vencimento)}</td>
                  <td class="text-end text-danger">${fmt.format(parcela.valor)}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-primary" data-acao="pagar" data-id="${divida.id}">${t('acao.pagar')}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;
}

// View "Vencimentos": foco em urgência — parcelas atrasadas e que vencem em breve.
function renderVencimentos() {
  const { proximas, atrasadas } = calcularVencimentos();
  const linha = ({ divida, parcela }, atrasada) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(divida.descricao)}</div>
        <div class="text-secondary small">${escapeHtml(divida.credor)}</div>
      </td>
      <td>${parcela.numero}</td>
      <td>${fmtData(parcela.vencimento)}</td>
      <td class="text-end ${atrasada ? 'text-danger fw-bold' : 'text-danger'}">${fmt.format(parcela.valor)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-primary" data-acao="pagar" data-id="${divida.id}">${t('acao.pagar')}</button>
      </td>
    </tr>`;

  const bloco = (titulo, itens, atrasada, vazio) => `
    <h3 class="h6 ${atrasada ? 'text-danger' : 'text-secondary'} mb-2">${titulo}</h3>
    ${itens.length === 0 ? `
      <div class="alert ${atrasada ? 'alert-danger' : 'alert-success'} d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.check}</span>
        <div>${vazio}</div>
      </div>
    ` : `
      <div class="card shadow-sm mb-3">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>${t('col.divida')}</th>
                <th>${t('col.parcela')}</th>
                <th>${t('col.vencimento')}</th>
                <th class="text-end">${t('col.valor')}</th>
                <th class="text-end">${t('col.acao')}</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map(i => linha(i, atrasada)).join('')}
            </tbody>
          </table>
        </div>
      </div>`}`;

  return `
    <div class="page-header"><h2>${t('vencimentos.titulo')}</h2></div>
    ${bloco(t('vencimentos.atrasadas'), atrasadas, true, t('vencimentos.nenhumaAtrasada'))}
    ${bloco(t('vencimentos.proximas'), proximas, false, t('vencimentos.nenhumaProxima'))}
  `;
}

// View "Configurações": reúne aparência, idioma e dados (antigos botões soltos).
function renderConfiguracoes() {
  const fs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-scale')) || 1;
  const tamFonte = fs > 1.15 ? 'Grande' : fs < 0.95 ? 'Pequena' : 'Padrão';
  return `
    <div class="page-header"><h2>${t('config.titulo')}</h2></div>
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3" style="max-width:1000px">
      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.aparencia')}</h3>
          <div class="config-linha">
            <span>${t('config.tema')}</span>
            <div class="btn-group" role="group" aria-label="Tema">
              <button class="btn btn-outline-secondary ${temaAtual === 'light' ? 'active' : ''}" data-tema="light">${ICON.sol} Claro</button>
              <button class="btn btn-outline-secondary ${temaAtual === 'dark' ? 'active' : ''}" data-tema="dark">${ICON.lua} Escuro</button>
            </div>
          </div>
          <div class="config-linha">
            <span>${t('config.fonte')} (${tamFonte})</span>
            <div class="btn-group" role="group" aria-label="Tamanho da fonte">
              <button class="btn btn-outline-secondary" data-fonte="aumentar" title="Aumentar fonte">${ICON.setaCima} A</button>
              <button class="btn btn-outline-secondary" data-fonte="diminuir" title="Diminuir fonte">${ICON.setaBaixo} a</button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.cor')}</h3>
          <div class="config-linha">
            <span>${t('config.corDestaque')}</span>
            <div class="gear-grupo gear-cores" role="group" aria-label="Cor de destaque">
              <button class="gear-cor ${acentoAtual === 'verde' ? 'active' : ''}" data-accent="verde" style="--sw:#2d6a4f" title="Verde" aria-label="Verde"></button>
              <button class="gear-cor ${acentoAtual === 'azul' ? 'active' : ''}" data-accent="azul" style="--sw:#1d4ed8" title="Azul" aria-label="Azul"></button>
              <button class="gear-cor ${acentoAtual === 'roxo' ? 'active' : ''}" data-accent="roxo" style="--sw:#6d28d9" title="Roxo" aria-label="Roxo"></button>
              <button class="gear-cor ${acentoAtual === 'laranja' ? 'active' : ''}" data-accent="laranja" style="--sw:#c2410c" title="Laranja" aria-label="Laranja"></button>
              <button class="gear-cor ${acentoAtual === 'rosa' ? 'active' : ''}" data-accent="rosa" style="--sw:#be185d" title="Rosa" aria-label="Rosa"></button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.idioma')}</h3>
          <div class="config-linha">
            <span>${t('config.idioma')}</span>
            <div class="btn-group" role="group" aria-label="Idioma">
              <button class="btn btn-outline-secondary ${idiomaAtual === 'pt' ? 'active' : ''}" data-idioma="pt" title="Português"><span class="bandeira">${ICON.br}</span> PT</button>
              <button class="btn btn-outline-secondary ${idiomaAtual === 'en' ? 'active' : ''}" data-idioma="en" title="English"><span class="bandeira">${ICON.us}</span> EN</button>
              <button class="btn btn-outline-secondary ${idiomaAtual === 'es' ? 'active' : ''}" data-idioma="es" title="Español"><span class="bandeira">${ICON.es}</span> ES</button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.dados')}</h3>
          <div class="config-acoes">
            <button class="btn btn-outline-secondary" data-acao="exportar" title="Exportar dados para um arquivo JSON">${ICON.exportar} ${t('acao.exportar')}</button>
            <button class="btn btn-outline-secondary" data-acao="importar" title="Importar dados de um arquivo JSON">${ICON.importar} ${t('acao.importar')}</button>
            <button class="btn btn-outline-secondary" data-acao="restaurar" title="Restaurar a partir do backup automático local">${ICON.reciclar} ${t('acao.restaurar')}</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderGamificacao() {
  const g = estado.gamificacao || { xp: 0, nivel: 1, historico: [] };
  const xpTotal = g.xp || 0;
  const nivel = g.nivel || 1;
  const resto = xpTotal % XP_POR_NIVEL;
  const proximo = nivel + 1;

  // Progresso até o próximo nível (usando o limite real da tabela de níveis).
  let txtProgresso, pctBarra, proximoThreshold;
  if (proximo > NIVEIS.length) {
    txtProgresso = t('game.nivelMax');
    // Mesma base do card do menu (resto / XP_POR_NIVEL) para consistência entre telas.
    pctBarra = (resto / XP_POR_NIVEL) * 100;
    proximoThreshold = xpTotal;
  } else {
    proximoThreshold = NIVEIS[proximo - 1].xp; // xp necessário para o próximo nível
    const faltam = Math.max(0, proximoThreshold - xpTotal);
    // Mesma base do card do menu: progresso DENTRO do nível atual (resto / XP_POR_NIVEL),
    // para que a barra zere ao subir de nível e seja consistente entre as telas.
    pctBarra = (resto / XP_POR_NIVEL) * 100;
    txtProgresso = `${xpTotal} / ${proximoThreshold} XP ${t('game.paraProximo')} ${tituloNivel(proximo)}`;
  }

  // --- Detalhes da pontuação ---
  const detalhes = `
    <section class="config-secao game-resumo">
      <h3>${t('game.resumo')}</h3>
      <div class="game-nivel-grande">${ICON.trofeu} ${t('nivel.titulo')} ${nivel} — ${tituloNivel(nivel)}</div>
      <div class="barra-progresso barra-pontos"><div class="barra-progresso-preenchimento" style="width:${pctBarra}%"></div></div>
      <div class="game-xp-linha">
        <span>${t('game.xpAtual')}: <b>${xpTotal}</b></span>
        <span>${xpTotal} / ${proximoThreshold} XP</span>
      </div>
      <p class="game-faltam"><b>${txtProgresso}</b></p>
    </section>`;

  // --- Gráfico de barras: XP por motivo (mesmo degradê da barra do menu) ---
  const graficoXP = `
    <section class="config-secao game-grafico">
      <h3>${t('game.graficoXP')}</h3>
      <div class="game-grafico-wrap">${graficoBarrasXP(g.historico)}</div>
    </section>`;
  const historico = (g.historico || []).slice(0, 30);
  const log = `
    <section class="config-secao">
      <h3>${t('game.log')}</h3>
      ${historico.length === 0 ? `<p class="stat-sub">${t('game.logVazio')}</p>` : `
      <ul class="game-log">
        ${historico.map(h => {
          // Resolve ícone + nome (igual à lista de quests). 'xp.saldoAnterior' mantém o nome, mas traduzido.
          const res = resolverMotivo(h.motivo);
          let ico = '', nome;
          if (res) {
            ico = res.ico + ' ';
            if (res.quest) {
              nome = t(res.quest);
            } else {
              // Sem nome de quest (ex.: saldo anterior): traduz o próprio motivo (normalizado p/ chave).
              nome = t(normalizarMotivoChave(h.motivo));
            }
          } else {
            // Fallback: normaliza motivos legados (texto ou chave) para o texto traduzido.
            nome = t(normalizarMotivoChave(h.motivo));
          }
          const motivoExibir = ico + escapeHtml(nome);
          return `\n          <li>
            <span class="game-log-motivo">${motivoExibir}</span>
            <span class="game-log-pontos ${h.pontos >= 0 ? 'pos' : 'neg'}">${h.pontos >= 0 ? '+' : ''}${h.pontos} XP</span>
            <span class="game-log-meta">${escapeHtml(h.horario || '')} · ${t('nivel.titulo')} ${h.nivel || '-'}</span>
          </li>`;
        }).join('')}
      </ul>`}
    </section>`;

  // --- Quests (desafios) que geram pontos ---
  const quests = [
    { ico: ICON.documento, tit: t('game.q.nova'), pts: '+10 XP' },
    { ico: ICON.editar, tit: t('game.q.editar'), pts: '+5 XP' },
    { ico: ICON.cartao, tit: t('game.q.pag'), pts: '+15 XP' },
    { ico: ICON.pasta, tit: t('game.q.gestao'), pts: '+5 XP' },
    { ico: ICON.chegada, tit: t('game.q.quitou'), pts: '+50 XP' },
    { ico: ICON.carteira, tit: t('game.q.novaCarteira'), pts: '+20 XP' },
    { ico: ICON.editar, tit: t('game.q.editarCarteira'), pts: '+5 XP' },
    { ico: ICON.porta, tit: t('game.q.acesso'), pts: '+3 XP' }
  ];
  const questsHtml = `
    <section class="config-secao">
      <h3>${t('game.quests')}</h3>
      <ul class="game-quests">
        ${quests.map(q => `
          <li><span class="game-quest-ico">${q.ico}</span>
            <span class="game-quest-tit">${q.tit}</span>
            <span class="game-quest-pts">${q.pts}</span></li>`).join('')}
      </ul>
    </section>`;

  // --- Tabela de níveis ---
  const tabela = `
    <section class="config-secao game-tabela">
      <h3>${t('game.tabela')}</h3>
      <table class="game-table">
        <thead><tr><th>${t('game.nivel')}</th><th>XP</th><th>${t('game.tituloNivel')}</th></tr></thead>
        <tbody>
          ${NIVEIS.map(n => `
            <tr class="${n.nivel === nivel ? 'atual' : ''}">
              <td>${n.nivel}</td>
              <td>${n.xp}</td>
              <td>${t(n.titulo)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </section>`;

  return `
    <div class="page-header"><h2>${t('game.titulo')}</h2></div>
    <div class="config-grid config-grid--wide">
      ${detalhes}
      ${graficoXP}
      ${log}
      ${questsHtml}
      ${tabela}
    </div>
  `;
}

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

function renderSobre() {
  const info = _sobreInfoCache || {};
  const REPO_URL = 'https://github.com/marceloacaci/meubolso';
  const DEV_URL = 'https://github.com/marceloacaci';
  const linha = (rotulo, valor) => `
    <div class="sobre-linha">
      <span class="sobre-rotulo">${rotulo}</span>
      <span class="sobre-valor">${escapeHtml(valor || '—')}</span>
    </div>`;

  const techs = [
    { ico: ICON.raio, nome: 'Electron', desc: t('sobre.versaoElectron') + (info.electron ? ' ' + info.electron : '') },
    { ico: ICON.nodejs, nome: 'Node.js', desc: t('sobre.versaoNode') + (info.node ? ' ' + info.node : '') },
    { ico: ICON.globo, nome: 'Chromium', desc: info.chrome ? 'v' + info.chrome : 'Browser engine' },
    { ico: ICON.javascript, nome: 'JavaScript (ES2022)', desc: 'Vanilla JS' },
    { ico: ICON.bootstrap, nome: 'Bootstrap 5.3', desc: t('sobre.bootstrap') },
    { ico: ICON.cadeado, nome: 'Context Isolation', desc: 'Electron preload + ipcRenderer' },
    { ico: ICON.engrenagem, nome: 'Vue 3', desc: t('techVue') },
    { ico: ICON.documento, nome: 'SQLite', desc: t('techSQLite') },
    { ico: ICON.grafico || ICON.relatorio, nome: 'Chart.js', desc: t('techChart') }
  ];

  return `
    <div class="page-header"><h2>${ICON.sobre} ${t('sobre.titulo')}</h2></div>

    <div class="config-grid sobre-grid">

      <section class="config-secao sobre-secao">
        <h3>${ICON.lampada} ${t('sobre.resumo')}</h3>
        <p class="sobre-descricao">${t('sobre.descricao')}</p>
        <div class="sobre-link-repo">
          <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer" class="sobre-link">
            ${ICON.github} <span>${t('sobre.verProjeto')}</span>
          </a>
        </div>
      </section>

      <section class="config-secao sobre-secao">
        <h3>${ICON.ferramenta} ${t('sobre.tech')}</h3>
        <ul class="list-group">
          ${techs.map(te => `
            <li class="list-group-item d-flex align-items-center gap-3"><span class="sobre-tech-ico">${te.ico}</span>
              <span class="sobre-tech-nome">${te.nome}</span>
              <span class="sobre-tech-desc ms-auto">${escapeHtml(te.desc)}</span></li>`).join('')}
        </ul>
      </section>

      <section class="config-secao sobre-secao" id="sobre-sistema">
        <h3>${ICON.monitor} ${t('sobre.sistema')}</h3>
        ${linha(t('sobre.versaoApp'), info.appVersion)}
        ${linha(t('sobre.versaoElectron'), info.electron)}
        ${linha(t('sobre.versaoNode'), info.node)}
        ${linha('Chromium', info.chrome)}
        ${linha(t('sobre.sistemaOp'), info.so)}
        ${linha(t('sobre.arquitetura'), info.arquitetura)}
        ${linha(t('sobre.idiomas'), 'Português · English · Español')}
      </section>

      <section class="config-secao sobre-secao">
        <h3>${ICON.pessoa} ${t('sobre.creditos')}</h3>
        <div class="sobre-creditos">
          <div class="sobre-dev-rotulo">${t('sobre.dev')}: ${t('sobre.devNome')}</div>
          <div class="sobre-dev-cargo">${t('sobre.devCargo')}</div>
          <a href="${DEV_URL}" target="_blank" rel="noopener noreferrer" class="sobre-link sobre-link-dev">
            ${ICON.github} <span>${t('sobre.verDevGitHub')}</span>
          </a>
        </div>
      </section>

      <section class="config-secao sobre-secao sobre-licenca">
        <h3>${ICON.documento} ${t('sobre.licenca')}</h3>
        <p class="sobre-copy">${t('sobre.copy')}</p>
      </section>

    </div>
  `;
}

// ---------- Carteiras (preparação para a funcionalidade) ----------
// Cada carteira guarda um saldo que, no futuro, poderá ser usado para
// realizar pagamentos de dívidas. Por enquanto expõe a listagem, criação,
// edição e exclusão de carteiras com saldo inicial.
function saldoTotalCarteiras() {
  return (estado.carteiras || []).reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
}

function renderCarteiras() {
  const carteiras = estado.carteiras || [];
  const total = saldoTotalCarteiras();

  const lista = carteiras.length === 0
    ? `<div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
       <span style="font-size:20px">${ICON.carteira}</span>
       <div>${t('carteira.vazia')}</div>
     </div>`
    : `<div class="vstack gap-2">
         ${carteiras.map(c => `
           <div class="card shadow-sm">
             <div class="card-body d-flex align-items-center justify-content-between gap-3">
               <div>
                 <div class="fw-semibold">${escapeHtml(c.nome)}</div>
                 <div class="h5 mb-1 text-primary">${fmt.format(Number(c.saldo) || 0)}</div>
               </div>
               <div class="d-flex gap-2">
                 <button class="btn btn-sm btn-outline-secondary" data-acao="editar-carteira" data-id="${c.id}" title="${t('carteira.editar')}">${t('acao.editar')}</button>
                 <button class="btn btn-sm btn-outline-danger" data-acao="excluir-carteira" data-id="${c.id}" title="${t('carteira.excluir')}">${t('acao.excluir')}</button>
               </div>
             </div>
           </div>`).join('')}
       </div>`;

  return `
    <div class="page-header">
      <h2>${ICON.carteira} ${t('carteira.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-carteira">${ICON.mais} ${t('carteira.nova')}</button>
    </div>
    <div class="alert alert-info d-inline-flex align-items-center gap-2 mb-3" role="status">
      <span>${t('carteira.total')}:</span> <b>${fmt.format(total)}</b>
    </div>
    ${lista}
  `;
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
    { name: 'nome', label: t('carteira.nome'), type: 'text', placeholder: 'Ex: Conta corrente', required: true },
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
      await persistir();
      toast(t('toast.carteiraExcluida'), 'success');
      render();
    }
  });
}

function renderDividas() {
  if (estado.dividas.length === 0) {
    return `
      <div class="page-header">
        <h2>${t('dividas.titulo')}</h2>
        <button class="btn btn-primary" data-acao="nova-divida">${ICON.mais} ${t('divida.nova')}</button>
      </div>
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:20px">${ICON.dividas}</span>
        <div>${t('empty.dividas')}</div>
      </div>
    `;
  }
  return `
    <div class="page-header">
      <h2>${t('dividas.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-divida">${ICON.mais} ${t('divida.nova')}</button>
    </div>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>${t('col.divida')}</th>
              <th>${t('col.categoria')}</th>
              <th class="text-end">${t('col.total')}</th>
              <th class="text-end">${t('col.pago')}</th>
              <th class="text-end">${t('col.saldo')}</th>
              <th class="text-end">${t('col.acao')}</th>
            </tr>
          </thead>
          <tbody>
            ${estado.dividas.map(d => `
              <tr>
                <td>
                  <div class="fw-semibold">${escapeHtml(d.descricao)}</div>
                  <div class="text-secondary small">${escapeHtml(d.credor)} · ${(d.parcelas||[]).length} ${t('divida.parcelas')}${(d.parcelas||[]).some(p => (p.status || 'pendente') === 'atrasado') ? ' · <span class="text-danger fw-semibold">' + t('divida.comAtraso') + '</span>' : ''}${d.observacao ? ` · <span class="text-secondary">${escapeHtml(d.observacao)}</span>` : ''}</div>
                </td>
                <td><span class="badge rounded-pill text-bg-secondary">${t(CATEGORIAS[d.categoria]?.label) || d.categoria}</span></td>
                <td class="text-end">${fmt.format(totalDivida(d))}</td>
                <td class="text-end text-success">${fmt.format(totalPago(d))}</td>
                <td class="text-end ${saldoDivida(d) > 0 ? 'text-danger' : 'text-success'}">${fmt.format(saldoDivida(d))}</td>
                <td class="text-end text-nowrap">
                  <button class="btn btn-sm btn-outline-secondary" data-acao="editar-divida" data-id="${d.id}">${t('acao.editar')}</button>
                  <button class="btn btn-sm btn-outline-danger" data-acao="excluir-divida" data-id="${d.id}">${t('acao.excluir')}</button>
                  <button class="btn btn-sm btn-primary" data-acao="gerenciar-pagamentos" data-id="${d.id}">${t('pagamento.gerenciar')}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPagamentos() {
  if (estado.dividas.length === 0) {
    return `
      <div class="page-header">
        <h2>${t('pagamentos.titulo')}</h2>
        <button class="btn btn-primary" data-acao="novo-pagamento">${t('pagamento.novo')}</button>
      </div>
      <div class="lista"><div class="empty">
        <div class="emoji">${ICON.dinheiro}</div>
        <div>${t('empty.pagamentos1')}</div>
      </div></div>
    `;
  }
  // Agrupa dívidas que possuem ao menos um pagamento (receberam pagamento).
  const comPagamento = estado.dividas.filter(d =>
    estado.pagamentos.some(p => p.dividaId === d.id && (d.parcelas || []).some(pc => pc.id === p.parcelaId))
  );

  const blocoDivida = (d) => {
    const r = resumoParcelas(d);
    const pagosDesta = estado.pagamentos
      .filter(p => p.dividaId === d.id && (d.parcelas || []).some(pc => pc.id === p.parcelaId))
      .sort((a, b) => {
        const na = (d.parcelas || []).find(pc => pc.id === a.parcelaId)?.numero || 0;
        const nb = (d.parcelas || []).find(pc => pc.id === b.parcelaId)?.numero || 0;
        return na - nb;
      });
    return `
      <div class="cartao-divida">
        <div class="barra-progresso" title="${r.percentualPago}% pago" aria-label="${r.percentualPago}% pago">
          <div class="barra-progresso-preenchimento" style="width:${r.percentualPago}%"></div>
          <span class="barra-progresso-texto">${r.percentualPago}%</span>
        </div>
        <div class="divida-cabecalho">
          <div>
            <div class="titulo">${escapeHtml(d.descricao)}</div>
            <div class="subtitulo">${escapeHtml(d.credor || '')} · ${t(CATEGORIAS[d.categoria]?.label) || d.categoria}</div>
          </div>
          <button class="btn btn-primary" style="font-size:12px;padding:4px 10px" data-acao="gerenciar-pagamentos" data-id="${d.id}">${t('pagamento.gerenciar')}</button>
        </div>
        <div class="divida-resumo">
          <div class="campo"><label>${t('label.parcelasPagas')}</label><span>${r.pagas} de ${r.total}</span></div>
          <div class="campo"><label>${t('label.valorPago')}</label><span>${fmt.format(r.valorPago)} de ${fmt.format(r.valorTotal)}</span></div>
          <div class="campo"><label>${t('label.restante')}</label><span>${fmt.format(r.valorRestante)}</span></div>
          <div class="campo"><label>${t('label.pagoTotal')}</label><span>${r.percentualPago}%</span></div>
          <div class="campo"><label>${t('label.restanteTotal')}</label><span>${r.percentualRestante}%</span></div>
        </div>
        <div class="card shadow-sm mt-2">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>${t('col.parcela')}</th>
                  <th>${t('label.valorPago')}</th>
                  <th>${t('form.data')}</th>
                  <th>${t('form.nota')}</th>
                  <th class="text-end">${t('col.acao')}</th>
                </tr>
              </thead>
              <tbody>
                ${pagosDesta.map(p => {
                  const parc = (d.parcelas || []).find(x => x.id === p.parcelaId);
                  return `
                    <tr>
                      <td>
                        <div class="fw-semibold">${parc ? 'Parcela ' + parc.numero : '(parcela)'}</div>
                        <div class="text-secondary small">${escapeHtml(d.credor || '')}</div>
                      </td>
                      <td class="text-success">${fmt.format(p.valor)}</td>
                      <td>${fmtData(p.data)}</td>
                      <td>${escapeHtml(p.nota || '')}</td>
                      <td class="text-end text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" data-acao="editar-pagamento" data-id="${p.id}">${t('acao.editar')}</button>
                        <button class="btn btn-sm btn-outline-danger" data-acao="excluir-pagamento" data-id="${p.id}">${t('acao.excluir')}</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  };

  return `
    <div class="page-header">
      <h2>${t('pagamentos.titulo')}</h2>
      <button class="btn btn-primary" data-acao="novo-pagamento">${ICON.mais} ${t('pagamento.novo')}</button>
    </div>
    ${comPagamento.length === 0 ? `
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:20px">${ICON.dinheiro}</span>
        <div>${t('empty.pagamentos2')}<br/>${t('empty.pagamentos3')}</div>
      </div>
    ` : comPagamento.map(blocoDivida).join('')}
  `;
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

// ---------- Ponte de render para os componentes Vue ----------
// As funções renderX() (HTML puro) são expostas para os componentes de view
// (views/*.js) injetarem via v-html. O Vue reage ao uiTick e recalcula.
window.__mbRender = {
  painel: renderPainel,
  relatorio: renderRelatorio,
  vencimentos: renderVencimentos,
  dividas: renderDividas,
  pagamentos: renderPagamentos,
  carteiras: renderCarteiras,
  gamificacao: renderGamificacao,
  sobre: renderSobre,
  configuracoes: renderConfiguracoes
};


// ---------- Handlers ----------
const handlers = {
  'nova-divida': () => novaDivida(),
  'editar-divida': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) editarDivida(d);
  },
  'excluir-divida': (id) => {
    const d = estado.dividas.find(x => x.id === id);
    if (d) excluirDivida(d);
  },
  'novo-pagamento': () => novoPagamento(),
  'nova-carteira': () => novaCarteira(),
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
  'importar': () => importarDados(),
  'restaurar': () => restaurarBackup()
};

async function exportarDados() {
  const r = await window.api.exportar();
  if (r.cancelado) return;
  if (r.ok) toast(t('toast.exportado') + r.caminho, 'success');
  else toast(r.erro || 'Erro ao exportar', 'error');
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
      idiomaAtual = idioma.dataset.idioma;
      aplicarIdioma();
      salvarPrefs();
      render(); // re-renderiza a UI com o novo idioma
      return;
    }
    const fonte = e.target.closest('[data-fonte]');
    if (fonte) {
      let s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-scale')) || 1;
      s = fonte.dataset.fonte === 'aumentar' ? Math.min(1.4, s + 0.1) : Math.max(0.8, s - 0.1);
      document.documentElement.style.setProperty('--app-font-scale', s.toFixed(2));
      try { localStorage.setItem('appFontScale', s.toFixed(2)); } catch (e2) {}
      render(); // atualiza o rótulo "Padrão/Grande/Pequena"
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
  await carregar();
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
      template: '<component :is="currentView"></component>'
    };
    Vue.createApp(RootApp).mount('#app');
  }
  render();
});
