import {
  addMonths,
  currentMonth,
  installmentAmount,
  monthSnapshot,
  monthsBetween,
  type Card,
  type Data,
  type Purchase,
} from "./domain";
import {
  expenseMonth,
  incomeMonth,
  localDate,
  monthFlow,
  monthlyBudget,
  subscriptionDate,
  subscriptionMonth,
} from "./finance";
export type Destination = {
  kind:
    "purchase" | "card" | "subscription" | "expense" | "income" | "recurring";
  id: string;
};
export type LedgerItem = Destination & {
  key: string;
  label: string;
  detail: string;
  amount: number;
  date: string;
  paid: boolean;
  income?: boolean;
  category?: string;
};
export function availableBudget(data: Data, month: string) {
  const flow = monthlyBudget(data, month),
    reserve = data.settings?.reserveCents ?? 0;
  // Expected income is kept separate; the primary figure never spends unreceived income.
  return {
    ...flow,
    reserve,
    available: flow.actualBalance - flow.pending - reserve,
    projectedAvailable: flow.remaining - reserve,
  };
}
export function monthLedger(data: Data, month: string): LedgerItem[] {
  const snapshot = monthSnapshot(data.purchases, data.payments ?? [], month);
  const rows: LedgerItem[] = snapshot.items.map((item) => ({
    kind: "purchase",
    id: item.purchase.id,
    key: `p:${item.purchase.id}:${item.installment}`,
    label: item.purchase.description,
    detail: `Parcela ${item.installment}/${item.purchase.installments}`,
    amount: item.amount,
    date: subscriptionDate(
      data.cards.find((c) => c.id === item.purchase.cardId)!,
      item.scheduledMonth,
    ),
    paid: item.paid,
    category: item.purchase.category,
  }));
  for (const item of subscriptionMonth(
    data.subscriptions ?? [],
    data.subscriptionPayments ?? [],
    month,
  ))
    rows.push({
      kind: "subscription",
      id: item.subscription.id,
      key: `s:${item.subscription.id}`,
      label: item.subscription.name,
      detail: item.cardId
        ? `Assinatura · ${data.cards.find((c) => c.id === item.cardId)?.name ?? "Cartão"}`
        : "Assinatura fora do cartão",
      amount: item.amount,
      date: item.dueDate,
      paid: item.paid,
      category: item.subscription.category,
    });
  for (const e of expenseMonth(data, month))
    rows.push({
      kind: "expense",
      id: e.id,
      key: `e:${e.id}`,
      label: e.description,
      detail: e.payee || "Despesa",
      amount: e.amountCents,
      date: e.dueDate,
      paid: !!e.paidDate,
      category: e.category,
    });
  for (const e of data.cashEntries ?? [])
    if (e.date.startsWith(month))
      rows.push({
        kind: "income",
        id: e.id,
        key: `c:${e.id}`,
        label: e.description,
        detail: e.source,
        amount: e.amountCents,
        date: e.date,
        paid: e.status !== "planned",
        income: e.kind === "income",
        category: e.kind === "deduction" ? "Outros" : undefined,
      });
  for (const e of incomeMonth(data, month))
    rows.push({
      kind: "recurring",
      id: e.rule.id,
      key: `r:${e.rule.id}`,
      label: e.rule.description,
      detail: e.rule.source,
      amount: e.amount,
      date: e.receipt?.date ?? e.date,
      paid: !!e.receipt,
      income: true,
    });
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label),
  );
}
export function calendarEvents(data: Data, month: string): LedgerItem[] {
  const ledger = monthLedger(data, month);
  // Purchases and card subscriptions appear only in their bill, avoiding double-counting.
  const events = ledger.filter((r) => {
    if (!r.date.startsWith(month) || r.kind === "purchase") return false;
    if (r.kind !== "subscription") return true;
    const payment = data.subscriptionPayments?.find(
      (p) => p.month === month && p.subscriptionId === r.id,
    );
    return !(payment
      ? payment.cardId
      : data.subscriptions?.find((s) => s.id === r.id)?.cardId);
  });
  const items = monthSnapshot(data.purchases, data.payments ?? [], month).items;
  const subs = subscriptionMonth(
    data.subscriptions ?? [],
    data.subscriptionPayments ?? [],
    month,
  );
  for (const card of data.cards) {
    const purchases = items.filter((i) => i.purchase.cardId === card.id),
      subscriptions = subs.filter((i) => i.cardId === card.id);
    if (purchases.length || subscriptions.length)
      events.push({
        kind: "card",
        id: card.id,
        key: `bill:${card.id}`,
        label: `Fatura · ${card.name}`,
        detail: card.bank,
        amount:
          purchases.reduce((s, i) => s + i.amount, 0) +
          subscriptions.reduce((s, i) => s + i.amount, 0),
        paid:
          purchases.every((i) => i.paid) && subscriptions.every((i) => i.paid),
        date: subscriptionDate(card, month),
      });
    if (card.closingDay)
      events.push({
        kind: "card",
        id: card.id,
        key: `closing:${card.id}`,
        label: `Fechamento · ${card.name}`,
        detail: "Compras a partir do dia seguinte entram na próxima fatura",
        amount: 0,
        paid: false,
        date: subscriptionDate({ dueDay: card.closingDay }, month),
      });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
export function pendingItems(data: Data, month: string) {
  return monthLedger(data, month)
    .filter((r) => !r.paid && !r.income)
    .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}
export function categoryComparison(data: Data, month: string) {
  const previous = addMonths(month, -1);
  const totals = (m: string) => {
    const rows = new Map<string, number>();
    for (const r of monthLedger(data, m))
      if (!r.income && r.category && r.date.startsWith(m))
        rows.set(r.category, (rows.get(r.category) ?? 0) + r.amount);
    return rows;
  };
  const before = totals(previous),
    after = totals(month);
  return [...new Set([...before.keys(), ...after.keys()])]
    .map((category) => {
      const current = after.get(category) ?? 0,
        prior = before.get(category) ?? 0;
      return {
        category,
        current,
        prior,
        delta: current - prior,
        percentage: prior ? ((current - prior) / prior) * 100 : null,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
export function cardTiming(card: Card, date: string) {
  if (!card.closingDay) return null;
  const month = date.slice(0, 7);
  // Conservative boundary: a purchase on the closing day still belongs to that statement.
  const close = subscriptionDate({ dueDay: card.closingDay }, month);
  const closingMonth = date > close ? addMonths(month, 1) : month;
  const closing = subscriptionDate({ dueDay: card.closingDay }, closingMonth);
  const billMonth =
    card.dueDay > card.closingDay ? closingMonth : addMonths(closingMonth, 1);
  const due = subscriptionDate(card, billMonth);
  const days = Math.round(
    (Date.parse(due + "T12:00:00Z") - Date.parse(date + "T12:00:00Z")) /
      86400000,
  );
  return { card, closing, due, billMonth, days };
}
export function bestCards(data: Data, date = localDate(), amount = 0) {
  return data.cards
    .flatMap((card) => {
      const timing = cardTiming(card, date);
      const used = data.purchases
        .filter((p) => p.cardId === card.id)
        .reduce(
          (s, p) =>
            s +
            Array.from({ length: p.installments - p.paid }, (_, i) =>
              installmentAmount(p, p.paid + i),
            ).reduce((x, y) => x + y, 0),
          0,
        );
      return timing
        ? [
            {
              ...timing,
              available: card.limitCents > 0 ? card.limitCents - used : null,
              fits: card.limitCents === 0 || used + amount <= card.limitCents,
            },
          ]
        : [];
    })
    .sort((a, b) => Number(b.fits) - Number(a.fits) || b.days - a.days);
}
export function simulatePurchase(
  data: Data,
  cardId: string,
  amount: number,
  installments: number,
  firstMonth: string,
  today = currentMonth(),
) {
  if (
    !data.cards.some((c) => c.id === cardId) ||
    !Number.isSafeInteger(amount) ||
    amount < installments ||
    amount > 100_000_000_000 ||
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 600 ||
    !/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(firstMonth) ||
    firstMonth < today ||
    addMonths(firstMonth, installments - 1) > "2199-12"
  )
    throw new Error(
      "Confira cartão, valor e parcelas. A primeira fatura deve ser neste mês ou depois e terminar até dezembro de 2199.",
    );
  const purchase: Purchase = {
    id: "simulation",
    cardId,
    description: "Compra simulada",
    category: "Compras",
    totalCents: amount,
    installments,
    paid: 0,
    nextMonth: firstMonth,
  };
  // Advance the projection once per month instead of recalculating all earlier
  // months for every row; long installment plans stay responsive.
  let priorBalance = 0,
    addedCarry = 0;
  const carry = data.settings?.carryover;
  return Array.from({ length: installments }, (_, i) => {
    const month = addMonths(firstMonth, i),
      flow = monthFlow(data, month);
    const carryActive = !!carry && month >= carry.startMonth;
    const base =
      i === 0
        ? monthlyBudget(data, month).remaining
        : (carryActive
            ? month === carry!.startMonth
              ? carry!.openingCents
              : priorBalance
            : 0) + flow.projectedFlow;
    const installment = installmentAmount(purchase, i);
    const effect = installment + (carryActive ? addedCarry : 0);
    priorBalance = base;
    addedCarry = carryActive ? addedCarry + installment : 0;
    return {
      month,
      installment,
      billBefore:
        flow.cards.items
          .filter((r) => r.purchase.cardId === cardId)
          .reduce((s, r) => s + r.amount, 0) +
        flow.subscriptions
          .filter((r) => r.cardId === cardId)
          .reduce((s, r) => s + r.amount, 0),
      balanceBefore: base,
      balanceAfter: base - effect - (data.settings?.reserveCents ?? 0),
    };
  });
}
export function searchAll(data: Data, query: string) {
  const fold = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const words = fold(query.trim()).split(/\s+/);
  if (!query.trim()) return [];
  const rows: (Destination & {
    label: string;
    detail: string;
    amount?: number;
  })[] = [
    ...data.cards.map((c) => ({
      kind: "card" as const,
      id: c.id,
      label: c.name,
      detail: `Cartão · ${c.bank}`,
    })),
    ...data.purchases.map((p) => ({
      kind: "purchase" as const,
      id: p.id,
      label: p.description,
      detail: `Compra · ${p.category} · ${data.cards.find((c) => c.id === p.cardId)?.name}`,
      amount: p.totalCents,
    })),
    ...(data.subscriptions ?? []).map((s) => ({
      kind: "subscription" as const,
      id: s.id,
      label: s.name,
      detail: `Assinatura · ${s.provider} · ${s.category}`,
      amount: s.amountCents,
    })),
    ...(data.expenses ?? []).map((e) => ({
      kind: "expense" as const,
      id: e.id,
      label: e.description,
      detail: `Despesa · ${e.payee} · ${e.category}`,
      amount: e.amountCents,
    })),
    ...(data.cashEntries ?? []).map((e) => ({
      kind: "income" as const,
      id: e.id,
      label: e.description,
      detail: `${e.kind === "income" ? "Entrada" : "Ajuste"} · ${e.source}`,
      amount: e.amountCents,
    })),
    ...(data.recurringIncomes ?? []).map((r) => ({
      kind: "recurring" as const,
      id: r.id,
      label: r.description,
      detail: `Renda recorrente · ${r.source}`,
      amount: r.amountCents,
    })),
  ];
  return rows
    .filter((r) =>
      words.every((w) => fold(`${r.label} ${r.detail}`).includes(w)),
    )
    .slice(0, 60);
}
