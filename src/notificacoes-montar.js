// Monta as mensagens de notificação nativa a partir das dívidas do usuário.
// Extraído de app.js (S7) para poder ser testado de forma isolada.
//
// CORREÇÃO (contagem por DÍVIDA, não por parcela): o texto da notificação diz
// "Você tem {n} dívida(s) em atraso", então {n} deve ser o número de DÍVIDAS
// distintas com ao menos uma parcela atrasada — NÃO o número de parcelas. Antes
// contávamos atrasadas++ por parcela, então uma dívida com 2 parcelas vencidas
// aparecia como "2 dívidas" (bug reportado: 1 dívida atrasada exibindo 2).
//
// CORREÇÃO DE BUG (regressão de parse): o parse de `p.vencimento` respeita o
// formato real salvo (data ISO 'AAAA-MM-DD' de 10 chars via <input type="date">
// ou datetime ISO 'AAAA-MM-DDTHH:MM:SS'). Só anexa 'T00:00:00' se length===10.
function montarNotificacoes(deps) {
  const { dividas, hoje, em3, t, dadosCarregados } = deps;
  if (!dadosCarregados || !dividas) return [];
  let atrasadas = 0, avencer = 0;
  for (const d of dividas) {
    const ps = (d.parcelas || []).filter(p => p.status === 'pendente' || !p.status);
    let divAtrasada = false, divAVencer = false;
    for (const p of ps) {
      const v = p.vencimento
        ? new Date(p.vencimento + (p.vencimento.length === 10 ? 'T00:00:00' : ''))
        : null;
      if (!v || isNaN(v)) continue;
      if (v < hoje) divAtrasada = true;
      else if (v >= hoje && v <= em3) divAVencer = true;
    }
    // Conta a DÍVIDA uma única vez (prioriza atraso sobre "a vencer").
    if (divAtrasada) atrasadas++;
    else if (divAVencer) avencer++;
  }
  const msgs = [];
  if (atrasadas > 0) msgs.push({ titulo: t('notif.titulo'), corpo: t('notif.atrasadas').replace('{n}', atrasadas) });
  if (avencer > 0) msgs.push({ titulo: t('notif.titulo'), corpo: t('notif.aVencer').replace('{n}', avencer) });
  // Lembrete de pontuar (gamificação) — leve e motivacional.
  msgs.push({ titulo: t('notif.titulo'), corpo: t('notif.pontuar') });
  return msgs;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { montarNotificacoes };
if (typeof window !== 'undefined') window.montarNotificacoesMod = montarNotificacoes;
