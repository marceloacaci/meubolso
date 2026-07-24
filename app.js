// Estado em memória (espelho do arquivo)
let estado = { dividas: [], pagamentos: [], configuracoes: { moeda: 'BRL' } };

// ---------- Utilitários ----------
const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
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

const I18N = {
  pt: {
    'app.titulo': 'MeuBolso', 'ticker.tag': 'Dicas',
    'relogio.fuso': 'Brasília',
    'cta.novaDivida': 'Nova dívida', 'nav.grupo.principal': 'Principal', 'nav.grupo.analise': 'Análise', 'nav.grupo.sistema': 'Sistema',
    'cta.novoPagamento': 'Novo pagamento',
    'tab.carteiras': 'Carteiras',
    'carteira.titulo': 'Carteiras', 'carteira.nova': '+ Nova carteira', 'carteira.nome': 'Nome da carteira',
    'carteira.saldo': 'Saldo', 'carteira.saldoInicial': 'Saldo inicial', 'carteira.total': 'Saldo total',
    'carteira.vazia': 'Nenhuma carteira cadastrada. Crie uma carteira para registrar saldos e usá-los nos pagamentos.',
    'carteira.editar': 'Editar carteira', 'carteira.excluir': 'Excluir carteira',
    'tab.painel': 'Painel', 'tab.resumo': 'Resumo', 'tab.dividas': 'Dívidas', 'tab.pagamentos': 'Pagamentos',
    'tab.vencimentos': 'Vencimentos', 'tab.relatorio': 'Relatório', 'tab.configuracoes': 'Configurações',
    'acao.exportar': '⬇ Exportar', 'acao.importar': '⬆ Importar', 'acao.restaurar': '↩ Restaurar backup',
    'divida.nova': '+ Nova dívida', 'pagamento.novo': '+ Novo pagamento', 'pagamento.gerenciar': 'Gerenciar pagamentos',
    'acao.editar': 'Editar', 'acao.excluir': 'Excluir', 'acao.pagar': 'Pagar',
    'acao.salvar': 'Salvar', 'acao.cancelar': 'Cancelar', 'acao.voltar': 'Voltar',
    'acao.concluir': 'Concluir (salvar tudo)', 'acao.salvarParcela': 'Salvar esta parcela',
    'form.descricao': 'Descrição', 'form.credor': 'Credor', 'form.categoria': 'Categoria',
    'form.observacao': 'Observação da dívida', 'form.parcelas': 'Parcelas', 'form.divida': 'Dívida',
    'form.valorParcela': 'Valor da parcela', 'form.vencimento': 'Vencimento', 'form.status': 'Status',
    'form.numero': 'Número', 'form.notaParcela': 'Nota da parcela',
    'form.valorPago': 'Valor pago (R$)', 'form.data': 'Data do pagamento', 'form.nota': 'Nota',
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
    'toast.dividaAtualizada': 'Dívida atualizada', 'toast.dividaExcluida': 'Dívida excluída',
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
    'grafico.total': 'Total', 'grafico.quitado': 'Quitado', 'grafico.dividaCategoria': 'Dívida por categoria', 'grafico.pagoVsAberto': 'Pago vs em aberto',
    'relatorio.titulo': 'Relatório financeiro', 'vencimentos.titulo': 'Vencimentos', 'vencimentos.atrasadas': 'Parcelas atrasadas',
    'vencimentos.proximas': 'Vencendo nos próximos 7 dias',
    'vencimentos.nenhumaAtrasada': 'Nenhuma parcela atrasada. 🎉',
    'vencimentos.nenhumaProxima': 'Nenhuma parcela próxima do vencimento.',
    'config.titulo': 'Configurações', 'config.aparencia': 'Aparência', 'config.tema': 'Tema',
    'config.fonte': 'Tamanho da fonte', 'config.idioma': 'Idioma', 'config.dados': 'Dados',
    'nivel.titulo': 'Nível', 'nivel.subiu': 'Você subiu para o nível',
    'nivel.verDetalhes': 'Ver detalhes',
    'nivel.celebTitulo': 'Nível {n} alcançado!', 'nivel.celebParabens': 'Parabéns! Você subiu de nível.', 'nivel.celebMotivo': 'Continue progredindo para desbloquear novos títulos e recompensas!',
    'nivel.continuar': 'Continuar',
    'xp.desconhecido': 'Pontuação',
    'xp.saldoAnterior': 'Pontos acumulados anteriormente', 'xp.saldoAnteriorInfo': 'Antes do registro detalhado',
    'xp.dividaNova': 'Dívida registrada', 'xp.pagamento': 'Pagamento registrado', 'xp.gestao': 'Gestão realizada', 'xp.acesso': 'Acesso registrado', 'xp.quitou': 'Dívida quitada',
    'nivel.nome1': 'Iniciante', 'nivel.nome2': 'Organizador', 'nivel.nome3': 'Controlador', 'nivel.nome4': 'Disciplinado',
    'nivel.nome5': 'Estrategista', 'nivel.nome6': 'Guardião', 'nivel.nome7': 'Mestre', 'nivel.nome8': 'Especialista',
    'nivel.nome9': 'Expert', 'nivel.nome10': 'Lenda das Finanças',
    'game.titulo': 'Pontuação e Conquistas', 'game.resumo': 'Detalhes da pontuação', 'game.xpAtual': 'XP total',
    'game.faltamNivel': 'Faltam', 'game.nivel': 'Nível', 'game.log': 'Histórico de pontos', 'game.paraProximo': 'para alcançar o nível', 'game.nivelMax': 'Nível máximo alcançado',
    'game.logVazio': 'Nenhum ponto registrado ainda. Comece cadastrando uma dívida!',
    'game.quests': 'Quests (como pontuar)', 'game.q.nova': 'Cadastrar uma nova dívida', 'game.q.editar': 'Editar uma dívida',
    'game.q.pag': 'Registrar um pagamento', 'game.q.gestao': 'Concluir a gestão de uma dívida',
    'game.q.quitou': 'Quitar uma dívida por completo', 'game.q.acesso': 'Acesso diário ao app',
    'game.tabela': 'Tabela de níveis', 'game.tituloNivel': 'Título',
    'tab.sobre': 'Sobre',
    'sobre.titulo': 'Sobre o MeuBolso',
    'sobre.resumo': 'Resumo', 'sobre.sistema': 'Informações do sistema', 'sobre.tech': 'Tecnologias',
    'sobre.creditos': 'Créditos', 'sobre.licenca': 'Licença',
    'sobre.descricao': 'O MeuBolso é um gerenciador de dívidas minimalista para desktop, voltado a pessoas físicas que querem controlar empréstimos, cartão de crédito e financiamentos em um só lugar. Registre dívidas, acompanhe parcelas e pagamentos, visualize relatórios e mantenha a motivação com um sistema de pontos e níveis — tudo localmente, sem necessidade de conta ou internet.',
    'sobre.dev': 'Desenvolvido por', 'sobre.devNome': 'Marcelo Acácio', 'sobre.devCargo': 'Analista e Desenvolvedor de Sistemas',
    'sobre.copy': '© 2026 MeuBolso. Todos os direitos reservados.',
    'sobre.versaoApp': 'Versão do app', 'sobre.versaoElectron': 'Electron', 'sobre.versaoNode': 'Node.js',
    'sobre.sistemaOp': 'Sistema operacional', 'sobre.arquitetura': 'Arquitetura'
  },

  en: {
    'app.titulo': 'MeuBolso', 'ticker.tag': 'Tips',
    'relogio.fuso': 'Brasilia',
    'cta.novaDivida': 'New debt', 'nav.grupo.principal': 'Main', 'nav.grupo.analise': 'Analysis', 'nav.grupo.sistema': 'System',
    'cta.novoPagamento': 'New payment',
    'tab.carteiras': 'Wallets',
    'carteira.titulo': 'Wallets', 'carteira.nova': '+ New wallet', 'carteira.nome': 'Wallet name',
    'carteira.saldo': 'Balance', 'carteira.saldoInicial': 'Initial balance', 'carteira.total': 'Total balance',
    'carteira.vazia': 'No wallet registered. Create a wallet to record balances and use them for payments.',
    'carteira.editar': 'Edit wallet', 'carteira.excluir': 'Delete wallet',
    'tab.painel': 'Dashboard', 'tab.resumo': 'Summary', 'tab.dividas': 'Debts', 'tab.pagamentos': 'Payments',
    'tab.vencimentos': 'Due dates', 'tab.relatorio': 'Report', 'tab.configuracoes': 'Settings',
    'acao.exportar': '⬇ Export', 'acao.importar': '⬆ Import', 'acao.restaurar': '↩ Restore backup',
    'divida.nova': '+ New debt', 'pagamento.novo': '+ New payment', 'pagamento.gerenciar': 'Manage payments',
    'acao.editar': 'Edit', 'acao.excluir': 'Delete', 'acao.pagar': 'Pay',
    'acao.salvar': 'Save', 'acao.cancelar': 'Cancel', 'acao.voltar': 'Back',
    'acao.concluir': 'Finish (save all)', 'acao.salvarParcela': 'Save this installment',
    'form.descricao': 'Description', 'form.credor': 'Creditor', 'form.categoria': 'Category',
    'form.observacao': 'Debt note', 'form.parcelas': 'Installments', 'form.divida': 'Debt',
    'form.valorParcela': 'Installment amount', 'form.vencimento': 'Due date', 'form.status': 'Status',
    'form.numero': 'Number', 'form.notaParcela': 'Installment note',
    'form.valorPago': 'Amount paid ($)', 'form.data': 'Payment date', 'form.nota': 'Note',
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
    'grafico.total': 'Total', 'grafico.quitado': 'Paid off', 'grafico.dividaCategoria': 'Debt by category', 'grafico.pagoVsAberto': 'Paid vs outstanding',
    'relatorio.titulo': 'Financial report', 'vencimentos.titulo': 'Due dates', 'vencimentos.atrasadas': 'Overdue installments',
    'vencimentos.proximas': 'Due in the next 7 days',
    'vencimentos.nenhumaAtrasada': 'No overdue installments. 🎉',
    'vencimentos.nenhumaProxima': 'No installments due soon.',
    'config.titulo': 'Settings', 'config.aparencia': 'Appearance', 'config.tema': 'Theme',
    'config.fonte': 'Font size', 'config.idioma': 'Language', 'config.dados': 'Data',
    'nivel.titulo': 'Level', 'nivel.subiu': 'You reached level',
    'xp.dividaNova': 'Debt registered', 'xp.pagamento': 'Payment registered',
    'xp.gestao': 'Management done', 'xp.acesso': 'Session logged', 'xp.quitou': 'Debt paid off',
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
    'game.quests': 'Quests (how to score)', 'game.q.nova': 'Register a new debt', 'game.q.editar': 'Edit a debt',
    'game.q.pag': 'Record a payment', 'game.q.gestao': 'Finish managing a debt',
    'game.q.quitou': 'Pay off a debt completely', 'game.q.acesso': 'Daily app access',
    'game.tabela': 'Level table', 'game.tituloNivel': 'Title',
    'tab.sobre': 'About',
    'sobre.titulo': 'About MeuBolso',
    'sobre.resumo': 'Summary', 'sobre.sistema': 'System information', 'sobre.tech': 'Technologies',
    'sobre.creditos': 'Credits', 'sobre.licenca': 'License',
    'sobre.descricao': 'MeuBolso is a minimalist desktop debt manager for individuals who want to keep track of loans, credit cards and financing in one place. Register debts, follow installments and payments, view reports, and stay motivated with a points and levels system — all locally, with no account or internet required.',
    'sobre.dev': 'Developed by', 'sobre.devNome': 'Marcelo Acácio', 'sobre.devCargo': 'Systems Analyst and Developer',
    'sobre.copy': '© 2026 MeuBolso. All rights reserved.',
    'sobre.versaoApp': 'App version', 'sobre.versaoElectron': 'Electron', 'sobre.versaoNode': 'Node.js',
    'sobre.sistemaOp': 'Operating system', 'sobre.arquitetura': 'Architecture',
    'modal.editarDivida': 'Edit debt', 'modal.registrarPagamento': 'Register payment',
    'modal.editarPagamento': 'Edit payment', 'aviso.parcelas': 'Fill in the data for each of the ${n} installment(s).',
    'toast.dividaAtualizada': 'Debt updated', 'toast.dividaExcluida': 'Debt deleted',
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
    'carteira.titulo': 'Carteras', 'carteira.nova': '+ Nueva cartera', 'carteira.nome': 'Nombre de la cartera',
    'carteira.saldo': 'Saldo', 'carteira.saldoInicial': 'Saldo inicial', 'carteira.total': 'Saldo total',
    'carteira.vazia': 'Ninguna cartera registrada. Crea una cartera para registrar saldos y usarlos en los pagos.',
    'carteira.editar': 'Editar cartera', 'carteira.excluir': 'Eliminar cartera',
    'tab.painel': 'Panel', 'tab.resumo': 'Resumen', 'tab.dividas': 'Deudas', 'tab.pagamentos': 'Pagos',
    'tab.vencimentos': 'Vencimientos', 'tab.relatorio': 'Informe', 'tab.configuracoes': 'Ajustes',
    'acao.exportar': '⬇ Exportar', 'acao.importar': '⬆ Importar', 'acao.restaurar': '↩ Restaurar copia',
    'divida.nova': '+ Nueva deuda', 'pagamento.novo': '+ Nuevo pago', 'pagamento.gerenciar': 'Gestionar pagos',
    'acao.editar': 'Editar', 'acao.excluir': 'Eliminar', 'acao.pagar': 'Pagar',
    'acao.salvar': 'Guardar', 'acao.cancelar': 'Cancelar', 'acao.voltar': 'Volver',
    'acao.concluir': 'Finalizar (guardar todo)', 'acao.salvarParcela': 'Guardar esta cuota',
    'form.descricao': 'Descripción', 'form.credor': 'Acreedor', 'form.categoria': 'Categoría',
    'form.observacao': 'Nota de la deuda', 'form.parcelas': 'Cuotas', 'form.divida': 'Deuda',
    'form.valorParcela': 'Importe de la cuota', 'form.vencimento': 'Vencimiento', 'form.status': 'Estado',
    'form.numero': 'Número', 'form.notaParcela': 'Nota de la cuota',
    'form.valorPago': 'Importe pagado ($)', 'form.data': 'Fecha de pago', 'form.nota': 'Nota',
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
    'grafico.total': 'Total', 'grafico.quitado': 'Saldado', 'grafico.dividaCategoria': 'Deuda por categoría', 'grafico.pagoVsAberto': 'Pagado vs pendiente',
    'relatorio.titulo': 'Informe financiero', 'vencimentos.titulo': 'Vencimientos', 'vencimentos.atrasadas': 'Cuotas atrasadas',
    'vencimentos.proximas': 'Vencen en los próximos 7 días',
    'vencimentos.nenhumaAtrasada': 'Ninguna cuota atrasada. 🎉',
    'vencimentos.nenhumaProxima': 'Ninguna cuota próxima al vencimiento.',
    'config.titulo': 'Ajustes', 'config.aparencia': 'Apariencia', 'config.tema': 'Tema',
    'config.fonte': 'Tamaño de letra', 'config.idioma': 'Idioma', 'config.dados': 'Datos',
    'nivel.titulo': 'Nivel', 'nivel.subiu': 'Subiste al nivel',
    'xp.dividaNova': 'Deuda registrada', 'xp.pagamento': 'Pago registrado',
    'xp.gestao': 'Gestion completa', 'xp.acesso': 'Acceso registrado', 'xp.quitou': 'Deuda saldada',
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
    'game.quests': 'Misiones (cómo puntuar)', 'game.q.nova': 'Registrar una nueva deuda', 'game.q.editar': 'Editar una deuda',
    'game.q.pag': 'Registrar un pago', 'game.q.gestao': 'Terminar de gestionar una deuda',
    'game.q.quitou': 'Pagar una deuda por completo', 'game.q.acesso': 'Acceso diario a la app',
    'game.tabela': 'Tabla de niveles', 'game.tituloNivel': 'Título',
    'tab.sobre': 'Acerca de',
    'sobre.titulo': 'Acerca de MeuBolso',
    'sobre.resumo': 'Resumen', 'sobre.sistema': 'Información del sistema', 'sobre.tech': 'Tecnologías',
    'sobre.creditos': 'Créditos', 'sobre.licenca': 'Licencia',
    'sobre.descricao': 'MeuBolso es un gestor de deudas minimalista para escritorio, dirigido a personas físicas que quieren controlar préstamos, tarjeta de crédito y financiaciones en un solo lugar. Registre deudas, siga cuotas y pagos, vea informes y mantenga la motivación con un sistema de puntos y niveles — todo de forma local, sin cuenta ni internet.',
    'sobre.dev': 'Desarrollado por', 'sobre.devNome': 'Marcelo Acácio', 'sobre.devCargo': 'Analista y Desarrollador de Sistemas',
    'sobre.copy': '© 2026 MeuBolso. Todos los derechos reservados.',
    'sobre.versaoApp': 'Versión de la app', 'sobre.versaoElectron': 'Electron', 'sobre.versaoNode': 'Node.js',
    'sobre.sistemaOp': 'Sistema operativo', 'sobre.arquitetura': 'Arquitectura',
    'modal.editarDivida': 'Editar deuda', 'modal.registrarPagamento': 'Registrar pago',
    'modal.editarPagamento': 'Editar pago', 'aviso.parcelas': 'Complete los datos de cada una de las ${n} cuota(s).',
    'toast.dividaAtualizada': 'Deuda actualizada', 'toast.dividaExcluida': 'Deuda eliminada',
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
// Tradução com interpolação de variáveis: ti('chave', {n: 3}) substitui {n}.
function ti(k, vars) {
  let s = t(k);
  if (vars) for (const key in vars) s = s.split('{' + key + '}').join(vars[key]);
  return s;
}

// Aplica tema e idioma persistidos ao carregar
function aplicarTema() {
  document.documentElement.setAttribute('data-theme', temaAtual === 'dark' ? 'dark' : 'light');
  document.querySelectorAll('.prefs-btn[data-tema]').forEach(b => {
    b.classList.toggle('ativo', b.dataset.tema === temaAtual);
  });
}
function aplicarIdioma() {
  document.documentElement.setAttribute('lang', idiomaAtual === 'pt' ? 'pt-BR' : idiomaAtual);
  document.querySelectorAll('.prefs-btn[data-idioma]').forEach(b => {
    b.classList.toggle('ativo', b.dataset.idioma === idiomaAtual);
  });
  traduzirEstaticos();
}
function salvarPrefs() {
  estado.configuracoes = estado.configuracoes || {};
  estado.configuracoes.tema = temaAtual;
  estado.configuracoes.idioma = idiomaAtual;
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
  const { atrasadas } = calcularVencimentos();

  const setBadge = (id, valor) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!valor) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = String(valor);
  };
  setBadge('badge-dividas', dividasAtivas);
  setBadge('badge-pagamentos', pendentes);
  setBadge('badge-vencimentos', atrasadas.length);
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
    out.push({ tipo: 'neutro', ico: '📭', texto: ti('insight.vazio') });
    return out;
  }
  if (m.progresso >= 75) out.push({ tipo: 'bom', ico: '🎉', texto: ti('insight.quitadoAlto', { p: m.progresso.toFixed(0) }) });
  else if (m.progresso >= 40) out.push({ tipo: 'bom', ico: '💪', texto: ti('insight.quitadoMedio', { p: m.progresso.toFixed(0) }) });
  else if (m.progresso > 0) out.push({ tipo: 'aten', ico: '⏳', texto: ti('insight.quitadoBaixo', { p: m.progresso.toFixed(0) }) });
  else out.push({ tipo: 'ruim', ico: '🚨', texto: ti('insight.nenhumPagamento') });

  const atrasadas = (m.porStatus.find(s => s.key === 'atrasado') || {}).qtd || 0;
  if (atrasadas > 0) out.push({ tipo: 'ruim', ico: '⚠️', texto: ti('insight.atrasadas', { n: atrasadas }) });

  const maior = estado.dividas.reduce((max, d) => (totalDivida(d) > totalDivida(max) ? d : max), estado.dividas[0]);
  if (maior) out.push({ tipo: 'neutro', ico: '📌', texto: ti('insight.maior', { d: escapeHtml(maior.descricao), v: fmt.format(totalDivida(maior)) }) });

  const cartao = (m.porCategoria.find(c => c.key === 'cartao') || {}).valor || 0;
  if (cartao > 0) out.push({ tipo: 'aten', ico: '💳', texto: ti('insight.cartao', { p: ((cartao / m.totalDivida) * 100).toFixed(0) }) });

  const negociadas = (m.porStatus.find(s => s.key === 'negociado') || {}).qtd || 0;
  if (negociadas > 0) out.push({ tipo: 'bom', ico: '🤝', texto: ti('insight.negociadas', { n: negociadas }) });

  const totalParcelas = estado.dividas.reduce((acc, d) => acc + (d.parcelas || []).length, 0);
  if (totalParcelas > 12) out.push({ tipo: 'aten', ico: '🧩', texto: ti('insight.muitasParcelas', { n: totalParcelas }) });

  return out;
}

// Gráfico de pizza (categorias)
function graficoPizza(dados) {
  if (!dados.length) return '<p class="stat-sub">' + t('painel.semDados') + '</p>';
  const total = dados.reduce((a, d) => a + d.valor, 0);
  const cx = 90, cy = 90, r = 80;
  let ang = -Math.PI / 2;
  const fatias = dados.map(d => {
    const frac = d.valor / total;
    const a2 = ang + frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = frac > 0.5 ? 1 : 0;
    const path = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
    ang = a2;
    return `<path d="${path}" fill="${d.cor}"><title>${d.label}: ${fmt.format(d.valor)}</title></path>`;
  }).join('');
  return `<svg viewBox="0 0 180 180" role="img" aria-label="${t('grafico.dividaCategoria')}">${fatias}<circle cx="${cx}" cy="${cy}" r="34" fill="#fff"/><text x="90" y="86" text-anchor="middle" font-size="11" fill="#6b6b6b">${t('grafico.total')}</text><text x="90" y="100" text-anchor="middle" font-size="12" font-weight="600" fill="#1a1a1a">${fmt.format(total)}</text></svg>`;
}

// Gráfico de rosca (pago vs em aberto)
function graficoRosca(m) {
  const cx = 90, cy = 90, r = 80, rin = 50;
  const pago = m.totalDivida > 0 ? m.totalPago / m.totalDivida : 0;
  const aberto = 1 - pago;
  const fatias = [];
  if (m.totalDivida > 0) {
    let ang = -Math.PI / 2;
    const segs = [{ v: aberto, c: '#c1121f' }, { v: pago, c: '#2d6a4f' }];
    for (const s of segs) {
      if (s.v <= 0) continue;
      const a2 = ang + s.v * Math.PI * 2;
      const large = s.v > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(ang), y1 = cy + r * Math.sin(ang);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const xi2 = cx + rin * Math.cos(a2), yi2 = cy + rin * Math.sin(a2);
      const xi1 = cx + rin * Math.cos(ang), yi1 = cy + rin * Math.sin(ang);
      fatias.push({ path: `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi2.toFixed(2)},${yi2.toFixed(2)} A${rin},${rin} 0 ${large},0 ${xi1.toFixed(2)},${yi1.toFixed(2)} Z`, cor: s.c });
      ang = a2;
    }
  }
  const paths = fatias.length ? fatias.map(f => `<path d="${f.path}" fill="${f.cor}"/>`).join('')
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e5e7eb"/>`;
  return `<svg viewBox="0 0 180 180" role="img" aria-label="${t('grafico.pagoVsAberto')}">${paths}<circle cx="${cx}" cy="${cy}" r="${rin}" fill="#fff"/><text x="90" y="86" text-anchor="middle" font-size="11" fill="#6b6b6b">${t('grafico.quitado')}</text><text x="90" y="100" text-anchor="middle" font-size="12" font-weight="600" fill="#1a1a1a">${m.progresso.toFixed(0)}%</text></svg>`;
}

// Gráfico de barras (status das parcelas)
function graficoBarrasStatus(dados) {
  if (!dados.length) return '<p class="stat-sub">Sem parcelas.</p>';
  const max = Math.max(...dados.map(d => d.qtd), 1);
  const w = 240, h = 140, pad = 20;
  const bw = (w - pad * 2) / dados.length - 10;
  const bars = dados.map((d, i) => {
    const bh = (d.qtd / max) * (h - pad * 2);
    const x = pad + i * ((w - pad * 2) / dados.length) + 5;
    const y = h - pad - bh;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${d.cor}"><title>${d.label}: ${d.qtd}</title></rect>
      <text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#6b6b6b">${d.label}</text>
      <text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#1a1a1a">${d.qtd}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Status das parcelas">${bars}</svg>`;
}

let _toastTimer = null;
function toast(msg, tipo = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${tipo}`;
  // Garante que apareça (remove a classe hidden imediatamente)
  el.classList.remove('hidden');
  // Cancela o timer anterior para não esconder um toast novo cedo demais
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ---------- Persistência ----------
async function carregar() {
  estado = await window.api.carregar();
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
  'xp.dividaNova':    { ico: '📝', quest: 'game.q.nova' },
  'xp.pagamento':     { ico: '💳', quest: 'game.q.pag' },
  'xp.gestao':        { ico: '🗂️', quest: 'game.q.gestao' },
  'xp.quitou':        { ico: '🏁', quest: 'game.q.quitou' },
  'xp.acesso':        { ico: '🚪', quest: 'game.q.acesso' },
  'xp.desconhecido':  { ico: '✏️', quest: 'game.q.editar' },
  'xp.saldoAnterior': { ico: '📦', quest: null }
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
function atualizarRelogioBrasilia() {
  const el = document.getElementById('relogio-brasilia');
  if (!el) return;
  const lang = (idiomaAtual === 'en' || idiomaAtual === 'es') ? idiomaAtual : 'pt';
  let txt = '🕐 ';
  try {
    const dia = fmtDiaRelogio[lang].format(new Date());
    const hora = fmtHoraRelogio[lang].format(new Date());
    // Garante a primeira letra do dia da semana em maiúsculo (independente do idioma/locale).
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    txt += `${diaCap}, ${hora} (${t('relogio.fuso')})`;
  }
  catch (e) { txt += new Date().toLocaleString('pt-BR'); }
  el.textContent = txt;
}
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
  persistir();
  atualizarBadgeNivel();
  // Mensagem de XP ganha — sempre exibida, mesmo quando há outra mensagem do sistema.
  const res = resolverMotivo(chaveMotivo);
  const nomeXP = res ? `${res.ico} ${t(res.quest || 'xp.desconhecido')}` : chaveMotivo;
  const msgXP = `+${pontos} XP · ${nomeXP}`;
  if (estado.gamificacao.nivel > antes) {
    // Celebração centralizada e animada ao subir de nível (mostra o novo nível alcançado).
    celebrarNivel(estado.gamificacao.nivel);
  }
  // Aviso de XP ganha é sempre exibido (mesmo ao subir de nível).
  toast(msgXP, 'success');
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

  // Fecha automaticamente após alguns segundos (mantém o foco na celebração).
  if (_levelupTimer) clearTimeout(_levelupTimer);
  _levelupTimer = setTimeout(fecharLevelUp, 5200);
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
    txtProgresso = `${xpTotal} / ${proximoThreshold} ${t('game.paraProximo')} ${tituloNivel(proximo)}`;
  }
  el.innerHTML = `<div class='perfil-texto'><span class='nivel-ico'>🏆</span> ${t('nivel.titulo')} ${nivel} · ${tituloNivel(nivel)}</div>` +
    `<span class='nivel-barra'><span style='width:${(resto / XP_POR_NIVEL) * 100}%'></span></span>` +
    `<span class='nivel-xp'>${txtProgresso}</span>` +
    `<button class='nivel-btn' data-view='gamificacao' title='${t('nivel.verDetalhes')}'>${t('nivel.verDetalhes')} →</button>`;
}
async function persistir() {
  const ok = await window.api.salvar(estado);
  if (!ok) toast(t('toast.erroSalvar'), 'error');
}

// ---------- Roteamento de views ----------
let viewAtual = 'painel';
function setView(v) {
  viewAtual = v;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === v);
  });
  render();
}

// ---------- Modal ----------
function abrirModal(titulo, campos, onSubmit) {
  document.getElementById('modal-titulo').textContent = titulo;

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
      inputHtml = `<select name="${escapeAttr(c.name)}"${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''}>${optionsHtml}</select>`;
    } else if (c.type === 'textarea') {
      inputHtml = `<textarea name="${escapeAttr(c.name)}" rows="3"${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''}>${escapeHtml(c.value || '')}</textarea>`;
    } else {
      inputHtml = `<input type="${escapeAttr(c.type || 'text')}" name="${escapeAttr(c.name)}"${c.value !== undefined && c.value !== null ? ` value="${escapeAttr(c.value)}"` : ''}${c.placeholder ? ` placeholder="${escapeAttr(c.placeholder)}"` : ''}${c.required ? ' required' : ''}${c.step ? ` step="${escapeAttr(c.step)}"` : ''}${c.id ? ` id="${escapeAttr(c.id)}"` : ''} />`;
    }
    return `<div class="campo"><label>${escapeHtml(c.label)}</label>${inputHtml}</div>`;
  }).join('');

  modalCard.innerHTML = `\n    <button type="button" class="modal-fechar" data-acao="fechar-modal-x" aria-label="${escapeAttr(t('modal.fechar'))}">×</button>\n    <h2 id="modal-titulo">${escapeHtml(titulo)}</h2>\n    <form id="form-modal" novalidate>\n      <div id="campos-form">${camposHtml}</div>\n      <div id="resumo-parcelas"></div>\n      <div class="form-actions">\n        <button type="button" id="btn-cancelar" class="btn btn-ghost">Cancelar</button>\n        <button type="submit" id="btn-salvar" class="btn btn-primary">Salvar</button>\n      </div>\n    </form>\n  `;

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
  if (modalFoiAlterado()) {
    if (!confirm(t('msg.confirmFecharSemSalvar'))) return;
  }
  fecharModal();
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
            <label>Valor (R$)</label>
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
  if (!confirm(t('msg.confirmExcluirDivida'))) return;
  estado.dividas = estado.dividas.filter(x => x.id !== d.id);
  estado.pagamentos = estado.pagamentos.filter(p => p.dividaId !== d.id);
  persistir().then(render);
  ganharXP(-10);
  toast(t('toast.dividaExcluida'));
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
    { name: 'valor', label: t('form.valorPago'), type: 'number', step: '0.01', placeholder: '0,00', required: true },
    { name: 'data', label: t('form.dataPagamento'), type: 'date', value: hoje(), required: true },
    { name: 'nota', label: t('form.nota'), type: 'text', placeholder: 'Opcional' }
  ], async (v) => {
    const divida = estado.dividas.find(d => d.id === v.dividaId);
    if (!divida) return;

    // Vincula à parcela escolhida no formulário (cada parcela tratada isoladamente).
    const parcelaId = v.parcelaId || (divida.parcelas?.[0]?.id || null);

    estado.pagamentos.push({
      id: uid(),
      dividaId: divida.id,
      parcelaId,
      valor: Number(v.valor) || 0,
      data: v.data,
      nota: v.nota || ''
    });
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
    { name: 'valor', label: t('form.valorPago'), type: 'number', step: '0.01', value: String(Number(pagamento.valor) || 0), required: true },
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
          <label>${t('form.valorPago')}</label>
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = Number(form.querySelector('[name="valor"]').value) || 0;
    const data = form.querySelector('[name="data"]').value || hoje();
    const nota = form.querySelector('[name="nota"]').value || '';
    if (existente) {
      Object.assign(existente, { valor, data, nota });
    } else {
      estado.pagamentos.push({
        id: uid(), dividaId: d.id, parcelaId: parc.id, valor, data, nota
      });
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
  if (!confirm(t('msg.confirmExcluirPagamento'))) return;
  estado.pagamentos = estado.pagamentos.filter(x => x.id !== p.id);
  persistir().then(render);
  ganharXP(-5);
  toast(t('toast.pagamentoExcluido'));
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
  const app = document.getElementById('app');
  if (viewAtual === 'painel') app.innerHTML = renderPainel();
  else if (viewAtual === 'relatorio') app.innerHTML = renderRelatorio();
  else if (viewAtual === 'dividas') app.innerHTML = renderDividas();
  else if (viewAtual === 'pagamentos') app.innerHTML = renderPagamentos();
  else if (viewAtual === 'vencimentos') app.innerHTML = renderVencimentos();
  else if (viewAtual === 'gamificacao') app.innerHTML = renderGamificacao();
  else if (viewAtual === 'sobre') app.innerHTML = renderSobre();
  else if (viewAtual === 'carteiras') app.innerHTML = renderCarteiras();
  else app.innerHTML = renderConfiguracoes();
  // Ao abrir "Sobre", busca as informações reais do sistema (versões) via IPC.
  if (viewAtual === 'sobre' && !_sobreInfoCache) {
    obterInfoSistema().then(() => { if (viewAtual === 'sobre') render(); });
  }
  // re-amarra os handlers APENAS dentro do <main> recém-renderizado
  app.querySelectorAll('[data-acao]').forEach(b => {
    b.addEventListener('click', () => {
      const acao = b.dataset.acao;
      const id = b.dataset.id;
      handlers[acao]?.(id, b);
    });
  });
  // Atualiza os contadores da sidebar a cada render.
  atualizarBadges();
}

function renderPainel() {
  const metricas = calcularMetricas();
  const insights = gerarInsights(metricas);

  return `
    <div class="page-header"><h2>${t('painel.titulo')}</h2></div>

    <div class="grid-dash">
      <div class="panel">
        <h3>${t('painel.resumo')}</h3>
        <div class="stat-big">${fmt.format(metricas.totalDivida)}</div>
        <div class="stat-sub">${t('painel.totalDividas')} (${estado.dividas.length})</div>
        <div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)">
            <span>${t('painel.quitado')}</span><span>${metricas.progresso.toFixed(0)}%</span>
          </div>
          <div class="barra-progresso"><div style="width:${metricas.progresso}%"></div></div>
        </div>
        <div style="display:flex;gap:16px;margin-top:14px">
          <div><div class="stat-sub">${t('painel.pago')}</div><div style="font-weight:600;color:var(--success)">${fmt.format(metricas.totalPago)}</div></div>
          <div><div class="stat-sub">${t('painel.saldo')}</div><div style="font-weight:600;color:var(--danger)">${fmt.format(metricas.saldo)}</div></div>
        </div>
      </div>

      <div class="panel">
        <h3>${t('painel.categoria')}</h3>
        <div class="chart-wrap">${graficoPizza(metricas.porCategoria)}</div>
        ${metricas.porCategoria.length ? `<div class="legend">${metricas.porCategoria.map(c => `
          <span class="legend-item"><span class="legend-dot" style="background:${c.cor}"></span>${c.label} ${fmt.format(c.valor)}</span>`).join('')}</div>` : `<p class="stat-sub">${t('painel.semDados')}</p>`}
      </div>

      <div class="panel">
        <h3>${t('painel.composicao')}</h3>
        <div class="chart-wrap">${graficoRosca(metricas)}</div>
        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#2d6a4f"></span>${t('painel.pago')} ${fmt.format(metricas.totalPago)}</span>
          <span class="legend-item"><span class="legend-dot" style="background:#c1121f"></span>${t('painel.emAberto')} ${fmt.format(metricas.saldo)}</span>
        </div>
      </div>
    </div>

    <div class="grid-dash">
      <div class="panel" style="grid-column: span 2">
        <h3>${t('painel.insights')}</h3>
        <ul class="insights">
          ${insights.map(i => `<li class="insight ${i.tipo}"><span class="ico">${i.ico}</span><span>${i.texto}</span></li>`).join('')}
        </ul>
      </div>
      <div class="panel">
        <h3>${t('painel.status')}</h3>
        <div class="chart-wrap">${graficoBarrasStatus(metricas.porStatus)}</div>
        <div class="legend">
          ${metricas.porStatus.map(s => `<span class="legend-item"><span class="legend-dot" style="background:${s.cor}"></span>${s.label} ${s.qtd}</span>`).join('')}
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
    <div class="cards">
      <div class="card">
        <div class="label">${t('resumo.totalDividas')}</div>
        <div class="valor">${fmt.format(total)}</div>
        <div class="barra-progresso"><div style="width:${progresso}%"></div></div>
        <div class="label" style="margin-top:6px">${progresso.toFixed(0)}% ${t('resumo.quitado')}</div>
      </div>
      <div class="card">
        <div class="label">${t('resumo.totalPago')}</div>
        <div class="valor positivo">${fmt.format(pago)}</div>
      </div>
      <div class="card">
        <div class="label">${t('resumo.saldoPagar')}</div>
        <div class="valor negativo">${fmt.format(saldo)}</div>
      </div>
      <div class="card">
        <div class="label">${t('resumo.dividasAtivas')}</div>
        <div class="valor">${restantes}</div>
      </div>
    </div>

    <div class="page-header"><h2 style="font-size:16px">${t('resumo.proximos7')}</h2></div>
    ${proximas.length === 0 ? `
      <div class="lista"><div class="empty">
        <div class="emoji">✓</div>
        <div>${t('resumo.nenhumaProxima')}</div>
      </div></div>
    ` : `
      <div class="lista">
        <div class="lista-header" style="grid-template-columns: 1.6fr 1fr 1fr 1fr 100px">
          <div>${t('col.divida')}</div><div>${t('col.parcela')}</div><div>${t('col.vencimento')}</div><div>${t('col.valor')}</div><div>${t('col.acao')}</div>
        </div>
        ${proximas.map(({divida, parcela}) => `
          <div class="item-linha" style="grid-template-columns: 1.6fr 1fr 1fr 1fr 100px">
            <div>
              <div class="titulo">${escapeHtml(divida.descricao)}</div>
              <div class="subtitulo">${escapeHtml(divida.credor)}</div>
            </div>
            <div>${parcela.numero}</div>
            <div>${fmtData(parcela.vencimento)}</div>
            <div class="valor-saldo pendente">${fmt.format(parcela.valor)}</div>
            <div>
              <button class="btn btn-primary" style="font-size:12px;padding:4px 8px"
                data-acao="pagar" data-id="${divida.id}">${t('acao.pagar')}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// View "Vencimentos": foco em urgência — parcelas atrasadas e que vencem em breve.
function renderVencimentos() {
  const { proximas, atrasadas } = calcularVencimentos();
  const linha = ({ divida, parcela }, atrasada) => `
    <div class="item-linha" style="grid-template-columns: 1.6fr 1fr 1fr 1fr 100px">
      <div>
        <div class="titulo">${escapeHtml(divida.descricao)}</div>
        <div class="subtitulo">${escapeHtml(divida.credor)}</div>
      </div>
      <div>${parcela.numero}</div>
      <div>${fmtData(parcela.vencimento)}</div>
      <div class="valor-saldo ${atrasada ? 'atrasado' : 'pendente'}">${fmt.format(parcela.valor)}</div>
      <div>
        <button class="btn btn-primary" style="font-size:12px;padding:4px 8px"
          data-acao="pagar" data-id="${divida.id}">${t('acao.pagar')}</button>
      </div>
    </div>`;

  const bloco = (titulo, itens, atrasada, vazio) => `
    <div class="page-header"><h2 style="font-size:16px">${titulo}</h2></div>
    ${itens.length === 0 ? `
      <div class="lista"><div class="empty"><div class="emoji">✓</div><div>${vazio}</div></div></div>
    ` : `
      <div class="lista">
        <div class="lista-header" style="grid-template-columns: 1.6fr 1fr 1fr 1fr 100px">
          <div>${t('col.divida')}</div><div>${t('col.parcela')}</div><div>${t('col.vencimento')}</div><div>${t('col.valor')}</div><div>${t('col.acao')}</div>
        </div>
        ${itens.map(i => linha(i, atrasada)).join('')}
      </div>`}`;

  return `
    <div class="page-header"><h2>${t('vencimentos.titulo')}</h2></div>
    ${bloco(t('vencimentos.atrasadas'), atrasadas, true, t('vencimentos.nenhumaAtrasada'))}
    <div style="height:18px"></div>
    ${bloco(t('vencimentos.proximas'), proximas, false, t('vencimentos.nenhumaProxima'))}
  `;
}

// View "Configurações": reúne aparência, idioma e dados (antigos botões soltos).
function renderConfiguracoes() {
  const fs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-scale')) || 1;
  const tamFonte = fs > 1.15 ? 'Grande' : fs < 0.95 ? 'Pequena' : 'Padrão';
  return `
    <div class="page-header"><h2>${t('config.titulo')}</h2></div>
    <div class="config-grid">
      <section class="config-secao">
        <h3>${t('config.aparencia')}</h3>
        <div class="config-linha">
          <span>${t('config.tema')}</span>
          <div class="prefs-grupo" role="group" aria-label="Tema">
            <button class="prefs-btn ${temaAtual === 'light' ? 'ativo' : ''}" data-tema="light" title="Tema claro">☀️ Claro</button>
            <button class="prefs-btn ${temaAtual === 'dark' ? 'ativo' : ''}" data-tema="dark" title="Tema escuro">🌙 Escuro</button>
          </div>
        </div>
        <div class="config-linha">
          <span>${t('config.fonte')} (${tamFonte})</span>
          <div class="prefs-grupo" role="group" aria-label="Tamanho da fonte">
            <button class="prefs-btn" data-fonte="aumentar" title="Aumentar fonte">🔼 A</button>
            <button class="prefs-btn" data-fonte="diminuir" title="Diminuir fonte">🔽 a</button>
          </div>
        </div>
      </section>

      <section class="config-secao">
        <h3>${t('config.idioma')}</h3>
        <div class="config-linha">
          <span>${t('config.idioma')}</span>
          <div class="prefs-grupo" role="group" aria-label="Idioma">
            <button class="prefs-btn ${idiomaAtual === 'pt' ? 'ativo' : ''}" data-idioma="pt" title="Português"><span class="bandeira">🇧🇷</span> PT</button>
            <button class="prefs-btn ${idiomaAtual === 'en' ? 'ativo' : ''}" data-idioma="en" title="English"><span class="bandeira">🇺🇸</span> EN</button>
            <button class="prefs-btn ${idiomaAtual === 'es' ? 'ativo' : ''}" data-idioma="es" title="Español"><span class="bandeira">🇪🇸</span> ES</button>
          </div>
        </div>
      </section>

      <section class="config-secao">
        <h3>${t('config.dados')}</h3>
        <div class="config-acoes">
          <button class="btn btn-ghost" data-acao="exportar" title="Exportar dados para um arquivo JSON">⬇️ ${t('acao.exportar')}</button>
          <button class="btn btn-ghost" data-acao="importar" title="Importar dados de um arquivo JSON">⬆️ ${t('acao.importar')}</button>
          <button class="btn btn-ghost" data-acao="restaurar" title="Restaurar a partir do backup automático local">♻️ ${t('acao.restaurar')}</button>
        </div>
      </section>
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
    txtProgresso = `${xpTotal} / ${proximoThreshold} ${t('game.paraProximo')} ${tituloNivel(proximo)}`;
  }

  // --- Detalhes da pontuação ---
  const detalhes = `
    <section class="config-secao game-resumo">
      <h3>${t('game.resumo')}</h3>
      <div class="game-nivel-grande">🏆 ${t('nivel.titulo')} ${nivel} — ${tituloNivel(nivel)}</div>
      <div class="barra-progresso"><div style="width:${pctBarra}%"></div></div>
      <div class="game-xp-linha">
        <span>${t('game.xpAtual')}: <b>${xpTotal}</b></span>
        <span>${xpTotal} / ${proximoThreshold} XP</span>
      </div>
      <p class="game-faltam"><b>${txtProgresso}</b></p>
    </section>`;

  // --- Log de pontos obtidos ---
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
    { ico: '📝', tit: t('game.q.nova'), pts: '+10 XP' },
    { ico: '✏️', tit: t('game.q.editar'), pts: '+5 XP' },
    { ico: '💳', tit: t('game.q.pag'), pts: '+15 XP' },
    { ico: '🗂️', tit: t('game.q.gestao'), pts: '+30 XP' },
    { ico: '🏁', tit: t('game.q.quitou'), pts: '+50 XP' },
    { ico: '🚪', tit: t('game.q.acesso'), pts: '+3 XP' }
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
  const linha = (rotulo, valor) => `
    <div class="sobre-linha">
      <span class="sobre-rotulo">${rotulo}</span>
      <span class="sobre-valor">${escapeHtml(valor || '—')}</span>
    </div>`;

  const techs = [
    { ico: '⚡', nome: 'Electron', desc: t('sobre.versaoElectron') + (info.electron ? ' ' + info.electron : '') },
    { ico: '🟢', nome: 'Node.js', desc: t('sobre.versaoNode') + (info.node ? ' ' + info.node : '') },
    { ico: '🌐', nome: 'Chromium', desc: info.chrome ? 'v' + info.chrome : 'Browser engine' },
    { ico: '🟨', nome: 'JavaScript (ES2022)', desc: 'Vanilla JS' },
    { ico: '🎨', nome: 'HTML5 + CSS3', desc: 'Sem frameworks de UI' },
    { ico: '🔒', nome: 'Context Isolation', desc: 'Electron preload + ipcRenderer' }
  ];

  return `
    <div class="page-header"><h2>ℹ️ ${t('sobre.titulo')}</h2></div>

    <div class="config-grid sobre-grid">

      <section class="config-secao sobre-secao">
        <h3>💡 ${t('sobre.resumo')}</h3>
        <p class="sobre-descricao">${t('sobre.descricao')}</p>
      </section>

      <section class="config-secao sobre-secao">
        <h3>🛠️ ${t('sobre.tech')}</h3>
        <ul class="sobre-tech">
          ${techs.map(te => `
            <li><span class="sobre-tech-ico">${te.ico}</span>
              <span class="sobre-tech-nome">${te.nome}</span>
              <span class="sobre-tech-desc">${escapeHtml(te.desc)}</span></li>`).join('')}
        </ul>
      </section>

      <section class="config-secao sobre-secao" id="sobre-sistema">
        <h3>🖥️ ${t('sobre.sistema')}</h3>
        ${linha(t('sobre.versaoApp'), info.appVersion)}
        ${linha(t('sobre.versaoElectron'), info.electron)}
        ${linha(t('sobre.versaoNode'), info.node)}
        ${linha('Chromium', info.chrome)}
        ${linha(t('sobre.sistemaOp'), info.so)}
        ${linha(t('sobre.arquitetura'), info.arquitetura)}
      </section>

      <section class="config-secao sobre-secao">
        <h3>👤 ${t('sobre.creditos')}</h3>
        <div class="sobre-creditos">
          <div class="sobre-dev-rotulo">${t('sobre.dev')}: ${t('sobre.devNome')}</div>
          <div class="sobre-dev-cargo">${t('sobre.devCargo')}</div>
        </div>
      </section>

      <section class="config-secao sobre-secao sobre-licenca">
        <h3>📄 ${t('sobre.licenca')}</h3>
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
    ? `<div class="lista"><div class="empty">
         <div class="emoji">🪪</div>
         <div>${t('carteira.vazia')}</div>
       </div></div>`
    : `<div class="lista carteiras-lista">
         ${carteiras.map(c => `
           <div class="carteira-card">
             <div class="carteira-info">
               <div class="carteira-nome">${escapeHtml(c.nome)}</div>
               <div class="carteira-saldo">${fmt.format(Number(c.saldo) || 0)}</div>
             </div>
             <div class="carteira-acoes">
               <button class="btn-icon" data-acao="editar-carteira" data-id="${c.id}" title="${t('carteira.editar')}">${t('acao.editar')}</button>
               <button class="btn-icon danger" data-acao="excluir-carteira" data-id="${c.id}" title="${t('carteira.excluir')}">${t('acao.excluir')}</button>
             </div>
           </div>`).join('')}
       </div>`;

  return `
    <div class="page-header">
      <h2>🪪 ${t('carteira.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-carteira">${t('carteira.nova')}</button>
    </div>
    <div class="carteira-resumo">
      <span>${t('carteira.total')}:</span> <b>${fmt.format(total)}</b>
    </div>
    ${lista}
  `;
}

function novaCarteira() {
  abrirModal(t('carteira.nova').replace(/^\+\s*/, '') || t('carteira.titulo'), [
    { name: 'nome', label: t('carteira.nome'), type: 'text', placeholder: 'Ex: Conta corrente', required: true },
    { name: 'saldo', label: t('carteira.saldoInicial'), type: 'number', step: '0.01', placeholder: '0,00', value: '0', required: true }
  ], async (v) => {
    estado.carteiras.push({
      id: uid(),
      nome: v.nome.trim(),
      saldo: Number(v.saldo) || 0,
      criadaEm: hoje()
    });
    await persistir();
    toast(t('toast.dividaSalva'), 'success');
    render();
  });
}

function editarCarteira(id) {
  const c = estado.carteiras.find(x => x.id === id);
  if (!c) return;
  abrirModal(t('carteira.editar'), [
    { name: 'nome', label: t('carteira.nome'), type: 'text', value: c.nome, required: true },
    { name: 'saldo', label: t('carteira.saldo'), type: 'number', step: '0.01', value: String(c.saldo), required: true }
  ], async (v) => {
    c.nome = v.nome.trim();
    c.saldo = Number(v.saldo) || 0;
    await persistir();
    toast(t('toast.dividaAtualizada'), 'success');
    render();
  });
}

async function excluirCarteira(id) {
  const c = estado.carteiras.find(x => x.id === id);
  if (!c) return;
  if (!confirm(t('msg.confirmExcluirDivida').replace('esta dívida', 'esta carteira'))) return;
  estado.carteiras = estado.carteiras.filter(x => x.id !== id);
  await persistir();
  toast(t('toast.dividaExcluida'), 'success');
  render();
}

function renderDividas() {
  if (estado.dividas.length === 0) {
    return `
      <div class="page-header">
        <h2>${t('dividas.titulo')}</h2>
        <button class="btn btn-primary" data-acao="nova-divida">${t('divida.nova')}</button>
      </div>
      <div class="lista"><div class="empty">
        <div class="emoji">📋</div>
        <div>${t('empty.dividas')}</div>
      </div></div>
    `;
  }
  return `
    <div class="page-header">
      <h2>${t('dividas.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-divida">${t('divida.nova')}</button>
    </div>
    <div class="lista">
      <div class="lista-header" style="grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr 150px">
        <div>${t('col.divida')}</div><div>${t('col.categoria')}</div><div>${t('col.total')}</div><div>${t('col.pago')}</div><div>${t('col.saldo')}</div><div></div>
      </div>
      ${estado.dividas.map(d => `
        <div class="item-linha" style="grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr 150px">
          <div>
            <div class="titulo">${escapeHtml(d.descricao)}</div>
            <div class="subtitulo">${escapeHtml(d.credor)} · ${(d.parcelas||[]).length} ${t('divida.parcelas')}${(d.parcelas||[]).some(p => (p.status || 'pendente') === 'atrasado') ? ' · <span style="color:var(--danger);font-weight:600">' + t('divida.comAtraso') + '</span>' : ''}${d.observacao ? ` · <span style="color:var(--text-muted)">${escapeHtml(d.observacao)}</span>` : ''}</div>
          </div>
          <div><span class="tag ${d.categoria}">${t(CATEGORIAS[d.categoria]?.label) || d.categoria}</span></div>
          <div>${fmt.format(totalDivida(d))}</div>
          <div class="valor-saldo pago">${fmt.format(totalPago(d))}</div>
          <div class="valor-saldo ${saldoDivida(d) > 0 ? 'pendente' : 'pago'}">${fmt.format(saldoDivida(d))}</div>
          <div>
            <button class="btn-icon" data-acao="editar-divida" data-id="${d.id}">${t('acao.editar')}</button>
            <button class="btn-icon danger" data-acao="excluir-divida" data-id="${d.id}">${t('acao.excluir')}</button>
            <button class="btn-icon" data-acao="gerenciar-pagamentos" data-id="${d.id}" style="margin-top:4px">${t('pagamento.gerenciar')}</button>
          </div>
        </div>
      `).join('')}
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
        <div class="emoji">💸</div>
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
        <div class="lista" style="border:none;box-shadow:none;margin-top:8px">
          <div class="lista-header" style="grid-template-columns: 1.4fr 1fr 1fr 1.4fr 90px">
            <div>${t('col.parcela')}</div><div>${t('label.valorPago')}</div><div>${t('form.data')}</div><div>${t('form.nota')}</div><div></div>
          </div>
          ${pagosDesta.map(p => {
            const parc = (d.parcelas || []).find(x => x.id === p.parcelaId);
            return `
              <div class="item-linha" style="grid-template-columns: 1.4fr 1fr 1fr 1.4fr 90px">
                <div>
                  <div class="titulo">${parc ? 'Parcela ' + parc.numero : '(parcela)'}</div>
                  <div class="subtitulo">${escapeHtml(d.credor || '')}</div>
                </div>
                <div class="valor-saldo pago">${fmt.format(p.valor)}</div>
                <div>${fmtData(p.data)}</div>
                <div>${escapeHtml(p.nota || '')}</div>
                <div>
                  <button class="btn-icon" data-acao="editar-pagamento" data-id="${p.id}">${t('acao.editar')}</button>
                  <button class="btn-icon danger" data-acao="excluir-pagamento" data-id="${p.id}">${t('acao.excluir')}</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  };

  return `
    <div class="page-header">
      <h2>${t('pagamentos.titulo')}</h2>
      <button class="btn btn-primary" data-acao="novo-pagamento">${t('pagamento.novo')}</button>
    </div>
    ${comPagamento.length === 0 ? `
      <div class="lista"><div class="empty">
        <div class="emoji">💸</div>
        <div>${t('empty.pagamentos2')}<br/>${t('empty.pagamentos3')}</div>
      </div></div>
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
    return `<span class="ticker-item"><span class="star">★</span>${escapeHtml(texto)}</span>`;
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
  if (!confirm(msg)) return;

  estado = {
    dividas: r.dados.dividas,
    pagamentos: r.dados.pagamentos,
    configuracoes: r.dados.configuracoes || { moeda: 'BRL' }
  };
  await persistir();
  toast(t('toast.dadosImportados'), 'success');
  render();
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
  if (!confirm(msg)) return;

  const r = await window.api.restaurar();
  if (!r.ok) {
    toast(r.erro || 'Erro ao restaurar', 'error');
    return;
  }
  estado = {
    dividas: r.dados.dividas,
    pagamentos: r.dados.pagamentos,
    configuracoes: r.dados.configuracoes || { moeda: 'BRL' }
  };
  await persistir();
  // Respiro após IPC pesado para o compositor se estabilizar.
  await new Promise(resolve => setTimeout(resolve, 300));
  toast(t('toast.backupRestaurado'), 'success');
  render();
  // Destrava o foco dos inputs (equivalente a minimizar/maximizar a janela,
  // mas sem interação manual do usuário).
  await window.api.flashFoco();
}

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', async () => {
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
  });

  initTicker();
  await carregar();
  // Lê preferências persistidas e aplica
  idiomaAtual = (estado.configuracoes && estado.configuracoes.idioma) || 'pt';
  temaAtual = (estado.configuracoes && estado.configuracoes.tema) || 'light';
  // Restaura tamanho de fonte salvo
  try {
    const fs = localStorage.getItem('appFontScale');
    if (fs) document.documentElement.style.setProperty('--app-font-scale', fs);
  } catch (e) {}
  aplicarTema();
  aplicarIdioma();
  atualizarBadgeNivel();
  // XP de login diário (1x por dia)
  const dataHoje = hoje();
  if ((estado.gamificacao && estado.gamificacao.ultimoAcesso) !== dataHoje) {
    if (estado.gamificacao) estado.gamificacao.ultimoAcesso = dataHoje;
    ganharXP(3, t('xp.acesso'));
  }
  render();
  // Relógio de Brasília: atualiza imediatamente e a cada segundo.
  atualizarRelogioBrasilia();
  setInterval(atualizarRelogioBrasilia, 1000);
});
