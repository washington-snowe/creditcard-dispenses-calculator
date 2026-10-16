import {
  currentMonth,
  addMonths,
  installmentAmount,
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
export function recursInMonth(
  sub: Pick<Subscription, "startMonth" | "endMonth" | "frequency">,
  month: string,
) {
  return (
    month >= sub.startMonth &&
    (!sub.endMonth || month <= sub.endMonth) &&
    monthsBetween(sub.startMonth, month) % steps[sub.frequency] === 0
  );
}
export function subscriptionDate(
  sub: Pick<Subscription, "dueDay">,
  month: string,
) {
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
export function monthFlow(data: Data, month: string) {
  const entries = (data.cashEntries ?? []).filter(
    (entry) => entry.date.slice(0, 7) === month,
  );
  const income =
    entries
      .filter((entry) => entry.kind === "income" && entry.status !== "planned")
      .reduce((sum, entry) => sum + entry.amountCents, 0) +
    (data.incomeReceipts ?? [])
      .filter((r) => r.date.slice(0, 7) === month)
      .reduce((s, r) => s + r.amountCents, 0);
  const expectedIncome =
    entries
      .filter((e) => e.kind === "income" && e.status === "planned")
      .reduce((s, e) => s + e.amountCents, 0) +
    incomeMonth(data, month)
      .filter((r) => !r.receipt)
      .reduce((s, r) => s + r.amount, 0);
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
  const expensePaid = (data.expenses ?? [])
    .filter((e) => e.paidDate?.slice(0, 7) === month)
    .reduce((s, e) => s + e.amountCents, 0);
  const expensePending = expenseMonth(data, month)
    .filter((e) => !e.paidDate)
    .reduce((s, e) => s + e.amountCents, 0);
  const paid = cards.cashPaid + subscriptionCash + expensePaid;
  const pending = cards.outstanding + subscriptionPending + expensePending;
  const net = income - deductions;
  return {
    income,
    expectedIncome,
    deductions,
    net,
    paid,
    pending,
    commitments: paid + pending,
    remaining: net - paid - pending,
    actualFlow: net - paid,
    projectedFlow: net + expectedIncome - paid - pending,
    expensePaid,
    expensePending,
    entries,
    cards,
    subscriptions,
    estimated: cards.estimated,
  };
}
export function localDate(date = new Date()) {
  return `${currentMonth(date)}-${String(date.getDate()).padStart(2, "0")}`;
}
export const METHODS = {
  pix: "Pix",
  boleto: "Boleto",
  cash: "Dinheiro",
  debit: "Débito",
  transfer: "Transferência",
  other: "Outro",
};
export function incomeMonth(data: Data, month: string) {
  const receipts = new Map(
    (data.incomeReceipts ?? [])
      .filter((r) => r.month === month)
      .map((r) => [r.recurringId, r]),
  );
  return (data.recurringIncomes ?? []).flatMap((r) => {
    const receipt = receipts.get(r.id);
    if (!receipt && !recursInMonth(r, month)) return [];
    return [
      {
        rule: r,
        receipt,
        amount: receipt?.amountCents ?? r.amountCents,
        date: subscriptionDate(r, month),
      },
    ];
  });
}
export function receiveIncome(
  data: Data,
  id: string,
  month: string,
  date = localDate(),
): Data {
  const item = incomeMonth(data, month).find((r) => r.rule.id === id);
  if (!item) throw new Error("Não existe entrada recorrente neste mês.");
  if (item.receipt) return data;
  return {
    ...data,
    incomeReceipts: [
      ...(data.incomeReceipts ?? []),
      {
        id: crypto.randomUUID(),
        recurringId: id,
        month,
        date,
        amountCents: item.amount,
        source: item.rule.source,
        description: item.rule.description,
      },
    ],
  };
}
export function expenseMonth(
  data: Data,
  month: string,
  today = currentMonth(),
) {
  return (data.expenses ?? []).filter(
    (e) =>
      e.dueDate.slice(0, 7) === month ||
      (month === today && !e.paidDate && e.dueDate.slice(0, 7) < month),
  );
}
export function actualFlows(data: Data) {
  const flows = new Map<string, number>();
  const put = (m: string, amount: number) =>
    flows.set(m, (flows.get(m) ?? 0) + amount);
  for (const e of data.cashEntries ?? [])
    if (e.status !== "planned")
      put(
        e.date.slice(0, 7),
        e.kind === "income" ? e.amountCents : -e.amountCents,
      );
  for (const r of data.incomeReceipts ?? [])
    put(r.date.slice(0, 7), r.amountCents);
  const known = new Set(
    (data.payments ?? []).map((p) => `${p.purchaseId}:${p.installment}`),
  );
  for (const p of data.payments ?? []) put(p.paidMonth, -p.amountCents);
  for (const p of data.purchases)
    for (let i = 0; i < p.paid; i++)
      if (!known.has(`${p.id}:${i + 1}`))
        put(addMonths(p.nextMonth, i - p.paid), -installmentAmount(p, i));
  for (const p of data.subscriptionPayments ?? [])
    put(p.paidMonth, -p.amountCents);
  for (const e of data.expenses ?? [])
    if (e.paidDate) put(e.paidDate.slice(0, 7), -e.amountCents);
  return flows;
}
export function monthlyBudget(data: Data, month: string) {
  const flow = monthFlow(data, month),
    config = data.settings?.carryover,
    today = currentMonth();
  let opening = 0,
    actualOpening = 0;
  if (config && month >= config.startMonth) {
    opening = config.openingCents;
    actualOpening = config.openingCents;
    const actual = actualFlows(data);
    for (const [m, value] of actual)
      if (m >= config.startMonth && m < month) actualOpening += value;
    for (const [m, value] of actual)
      if (m >= config.startMonth && m < month && m < today) opening += value;
    for (
      let m = config.startMonth > today ? config.startMonth : today;
      m < month;
      m = addMonths(m, 1)
    )
      opening += monthFlow(data, m).projectedFlow;
  }
  return {
    ...flow,
    opening,
    actualBalance: actualOpening + flow.actualFlow,
    remaining: opening + flow.projectedFlow,
    carryEnabled: !!config && month >= config.startMonth,
    projectedOpening: month > today && !!config,
  };
}
