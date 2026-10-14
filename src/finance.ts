import {
  currentMonth,
  monthSnapshot,
  monthsBetween,
  payCardMonth,
  type Data,
  type Subscription,
  type SubscriptionPayment,
} from "./domain";
export const FREQUENCIES = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};
const steps = { monthly: 1, quarterly: 3, yearly: 12 };
export function recursInMonth(sub: Subscription, month: string) {
  return (
    month >= sub.startMonth &&
    (!sub.endMonth || month <= sub.endMonth) &&
    monthsBetween(sub.startMonth, month) % steps[sub.frequency] === 0
  );
}
export function subscriptionDate(sub: Subscription, month: string) {
  const [year, m] = month.split("-").map(Number);
  const day = Math.min(sub.dueDay, new Date(year, m, 0).getDate());
  return `${month}-${String(day).padStart(2, "0")}`;
}
export function subscriptionMonth(
  subscriptions: Subscription[],
  payments: SubscriptionPayment[],
  month: string,
) {
  const paidInMonth = new Map(
    payments.filter((p) => p.month === month).map((p) => [p.subscriptionId, p]),
  );
  return subscriptions.flatMap((subscription) => {
    const payment = paidInMonth.get(subscription.id);
    if (!payment && !recursInMonth(subscription, month)) return [];
    return [
      {
        subscription,
        month,
        amount: payment?.amountCents ?? subscription.amountCents,
        cardId: payment ? payment.cardId : subscription.cardId,
        paid: !!payment,
        dueDate: subscriptionDate(subscription, month),
        payment,
      },
    ];
  });
}
export function paySubscription(
  data: Data,
  id: string,
  month: string,
  paidMonth = currentMonth(),
): Data {
  const item = subscriptionMonth(
    data.subscriptions ?? [],
    data.subscriptionPayments ?? [],
    month,
  ).find((item) => item.subscription.id === id);
  if (!item)
    throw new Error("Não há cobrança desta assinatura no mês selecionado.");
  if (item.paid) return data;
  const payment: SubscriptionPayment = {
    id: crypto.randomUUID(),
    subscriptionId: id,
    month,
    paidMonth,
    amountCents: item.amount,
    cardId: item.cardId,
  };
  return {
    ...data,
    subscriptionPayments: [...(data.subscriptionPayments ?? []), payment],
  };
}
export function payEntireCardMonth(
  data: Data,
  cardId: string,
  month = currentMonth(),
): Data {
  let next = payCardMonth(data, cardId, month);
  for (const item of subscriptionMonth(
    data.subscriptions ?? [],
    data.subscriptionPayments ?? [],
    month,
  ).filter((item) => item.cardId === cardId && !item.paid))
    next = paySubscription(next, item.subscription.id, month, month);
  return next;
}
export function removeSubscription(data: Data, id: string): Data {
  return {
    ...data,
    subscriptions: (data.subscriptions ?? []).filter((s) => s.id !== id),
    subscriptionPayments: (data.subscriptionPayments ?? []).filter(
      (p) => p.subscriptionId !== id,
    ),
  };
}
export function monthlyBudget(data: Data, month: string) {
  const entries = (data.cashEntries ?? []).filter(
    (entry) => entry.date.slice(0, 7) === month,
  );
  const income = entries
    .filter((entry) => entry.kind === "income")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const deductions = entries
    .filter((entry) => entry.kind === "deduction")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const cards = monthSnapshot(data.purchases, data.payments ?? [], month);
  const subscriptions = subscriptionMonth(
    data.subscriptions ?? [],
    data.subscriptionPayments ?? [],
    month,
  );
  const subscriptionCash = (data.subscriptionPayments ?? [])
    .filter((p) => p.paidMonth === month)
    .reduce((sum, p) => sum + p.amountCents, 0);
  const subscriptionPending = subscriptions
    .filter((item) => !item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  const paid = cards.cashPaid + subscriptionCash;
  const pending = cards.outstanding + subscriptionPending;
  const net = income - deductions;
  return {
    income,
    deductions,
    net,
    paid,
    pending,
    commitments: paid + pending,
    remaining: net - paid - pending,
    entries,
    cards,
    subscriptions,
    estimated: cards.estimated,
  };
}
