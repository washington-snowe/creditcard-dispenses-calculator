export type Card = {
  id: string;
  name: string;
  bank: string;
  last4: string;
  color: string;
  dueDay: number;
  limitCents: number;
};
export type Purchase = {
  id: string;
  description: string;
  cardId: string;
  category: string;
  totalCents: number;
  installments: number;
  paid: number;
  nextMonth: string;
};
export type Payment = {
  id: string;
  purchaseId: string;
  installment: number;
  amountCents: number;
  paidMonth: string;
  scheduledMonth: string;
  kind: "regular" | "advance";
};
export type Data = {
  version: 1;
  cards: Card[];
  purchases: Purchase[];
  payments?: Payment[];
  settings?: { theme: "light" | "dark" };
};
export type MonthItem = {
  purchase: Purchase;
  installment: number;
  amount: number;
  scheduledMonth: string;
  paid: boolean;
  estimated: boolean;
  payment?: Payment;
};
export type MonthSnapshot = {
  month: string;
  total: number;
  outstanding: number;
  paid: number;
  cashPaid: number;
  estimated: boolean;
  items: MonthItem[];
};
export type Month = {
  month: string;
  total: number;
  byCard: Record<string, number>;
  items: { purchase: Purchase; amount: number; installment: number }[];
};
export const EMPTY: Data = { version: 1, cards: [], purchases: [] };
export const COLORS = [
  "#2563eb",
  "#8b5cf6",
  "#f97316",
  "#10b981",
  "#ec4899",
  "#334155",
];
export const BANKS = [
  "Nubank",
  "Itaú",
  "Banco do Brasil",
  "Bradesco",
  "Santander",
  "Inter",
  "Caixa",
  "C6 Bank",
  "BTG Pactual",
  "Mercado Pago",
  "PicPay",
  "Outro",
];
export const CATEGORIES = [
  "Compras",
  "Casa",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Tecnologia",
  "Outros",
];
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export function currentMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function addMonths(month: string, count: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + count, 1);
  return currentMonth(date);
}
export function monthLabel(month: string, short = false) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: short ? "short" : "long",
    year: "numeric",
  })
    .format(new Date(y, m - 1, 1))
    .replace(".", "");
}
export function parseMoney(value: string): number {
  let text = value.trim().replace(/^R\$\s*/, "");
  if (text.includes(",")) {
    if (!/^(\d+|\d{1,3}(\.\d{3})+)(,\d{1,2})?$/.test(text))
      throw new Error("Informe um valor válido, como 1.200,50.");
    text = text.replaceAll(".", "").replace(",", ".");
  } else if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error("Informe um valor válido, como 1200,50.");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_000)
    throw new Error("Valor acima do limite permitido.");
  return cents;
}
export const moneyInput = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");
export function installmentAmount(p: Purchase, index: number): number {
  return (
    Math.floor(p.totalCents / p.installments) +
    (index < p.totalCents % p.installments ? 1 : 0)
  );
}
export function remaining(p: Purchase): number {
  return (
    Math.floor(p.totalCents / p.installments) * (p.installments - p.paid) +
    Math.max(0, (p.totalCents % p.installments) - p.paid)
  );
}
export function payNext(p: Purchase): Purchase {
  return p.paid < p.installments
    ? { ...p, paid: p.paid + 1, nextMonth: addMonths(p.nextMonth, 1) }
    : p;
}
export function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + tm - fm;
}
export function scheduledMonth(p: Purchase, index: number) {
  return addMonths(p.nextMonth, index - p.paid);
}
export function monthSnapshot(
  purchases: Purchase[],
  payments: Payment[],
  month: string,
  today = currentMonth(),
): MonthSnapshot {
  const records = new Map(
    payments.map((payment) => [
      `${payment.purchaseId}:${payment.installment}`,
      payment,
    ]),
  );
  const items: MonthItem[] = [];
  const paymentsByPurchase = new Map<string, Payment[]>();
  for (const payment of payments) {
    const list = paymentsByPurchase.get(payment.purchaseId) ?? [];
    list.push(payment);
    paymentsByPurchase.set(payment.purchaseId, list);
  }
  for (const p of purchases) {
    const start = addMonths(p.nextMonth, -p.paid);
    const index = monthsBetween(start, month);
    const indices = new Set<number>();
    if (index >= 0 && index < p.installments) indices.add(index);
    if (month === today) {
      for (let i = p.paid; i < Math.min(index, p.installments); i++)
        indices.add(i);
      // Keep overdue installments visible after they are settled in this month.
      for (const payment of paymentsByPurchase.get(p.id) ?? []) {
        if (payment.paidMonth === month && payment.scheduledMonth < month)
          indices.add(payment.installment - 1);
      }
    }
    for (const i of [...indices].sort((a, b) => a - b)) {
      const payment = records.get(`${p.id}:${i + 1}`);
      items.push({
        purchase: p,
        installment: i + 1,
        amount: installmentAmount(p, i),
        scheduledMonth: scheduledMonth(p, i),
        paid: i < p.paid,
        estimated: i < p.paid && !payment,
        payment,
      });
    }
  }
  const purchaseIds = new Set(purchases.map((p) => p.id));
  const actualCash = payments
    .filter(
      (payment) =>
        purchaseIds.has(payment.purchaseId) && payment.paidMonth === month,
    )
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  return {
    month,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    outstanding: items
      .filter((item) => !item.paid)
      .reduce((sum, item) => sum + item.amount, 0),
    paid: items
      .filter((item) => item.paid)
      .reduce((sum, item) => sum + item.amount, 0),
    cashPaid:
      actualCash +
      items
        .filter((item) => item.estimated)
        .reduce((sum, item) => sum + item.amount, 0),
    estimated: items.some((item) => item.estimated),
    items,
  };
}
export function payPurchase(
  data: Data,
  purchaseId: string,
  count = 1,
  month = currentMonth(),
  kind: Payment["kind"] = "regular",
): Data {
  const p = data.purchases.find((purchase) => purchase.id === purchaseId);
  if (
    !p ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > p.installments - p.paid
  )
    throw new Error("Quantidade de parcelas inválida para pagamento.");
  const payments: Payment[] = [];
  for (let i = p.paid; i < p.paid + count; i++) {
    payments.push({
      id: crypto.randomUUID(),
      purchaseId,
      installment: i + 1,
      amountCents: installmentAmount(p, i),
      paidMonth: month,
      scheduledMonth: scheduledMonth(p, i),
      kind: scheduledMonth(p, i) > month ? "advance" : kind,
    });
  }
  return {
    ...data,
    purchases: data.purchases.map((purchase) =>
      purchase.id === p.id
        ? {
            ...p,
            paid: p.paid + count,
            nextMonth: addMonths(p.nextMonth, count),
          }
        : purchase,
    ),
    payments: [...(data.payments ?? []), ...payments],
  };
}
export function payCardMonth(
  data: Data,
  cardId: string,
  month = currentMonth(),
): Data {
  let next = data;
  for (const p of data.purchases.filter(
    (purchase) =>
      purchase.cardId === cardId &&
      purchase.paid < purchase.installments &&
      purchase.nextMonth <= month,
  )) {
    const count = Math.min(
      p.installments - p.paid,
      monthsBetween(p.nextMonth, month) + 1,
    );
    next = payPurchase(next, p.id, count, month);
  }
  return next;
}
export function replacePurchase(data: Data, purchase: Purchase): Data {
  const previous = data.purchases.find((p) => p.id === purchase.id);
  const financialChange =
    previous &&
    (previous.totalCents !== purchase.totalCents ||
      previous.installments !== purchase.installments);
  const payments = (data.payments ?? []).filter(
    (payment) =>
      payment.purchaseId !== purchase.id ||
      (!financialChange && payment.installment <= purchase.paid),
  );
  return {
    ...data,
    purchases: previous
      ? data.purchases.map((p) => (p.id === purchase.id ? purchase : p))
      : [...data.purchases, purchase],
    ...(data.payments ? { payments } : {}),
  };
}
export function removePurchase(data: Data, id: string): Data {
  return {
    ...data,
    purchases: data.purchases.filter((p) => p.id !== id),
    ...(data.payments
      ? {
          payments: data.payments.filter(
            (payment) => payment.purchaseId !== id,
          ),
        }
      : {}),
  };
}
export function anticipationOptions(purchases: Purchase[]) {
  return purchases
    .filter((p) => p.paid < p.installments)
    .map((p) => {
      const cost = remaining(p);
      const monthlyRelief = installmentAmount(p, p.paid);
      return {
        purchase: p,
        cost,
        monthlyRelief,
        monthsLeft: p.installments - p.paid,
        efficiency: monthlyRelief / cost,
      };
    });
}
export function suggestPayoffs(
  purchases: Purchase[],
  budget: number,
): string[] {
  if (!Number.isSafeInteger(budget) || budget < 0)
    throw new Error("Informe um orçamento válido.");
  const options = anticipationOptions(purchases).sort(
    (a, b) =>
      b.efficiency - a.efficiency ||
      b.monthlyRelief - a.monthlyRelief ||
      a.cost - b.cost,
  );
  const result: string[] = [];
  let left = budget;
  for (const option of options) {
    if (option.cost <= left) {
      result.push(option.purchase.id);
      left -= option.cost;
    }
  }
  return result;
}
export function forecast(
  purchases: Purchase[],
  from = currentMonth(),
): Month[] {
  const months = new Map<string, Month>();
  for (const p of purchases) {
    for (let i = p.paid; i < p.installments; i++) {
      // Unpaid installments scheduled in the past remain due in the current month.
      const scheduled = addMonths(p.nextMonth, i - p.paid);
      const month = scheduled < from ? from : scheduled;
      const row = months.get(month) ?? {
        month,
        total: 0,
        byCard: Object.create(null) as Record<string, number>,
        items: [],
      };
      const amount = installmentAmount(p, i);
      row.total += amount;
      row.byCard[p.cardId] = (row.byCard[p.cardId] ?? 0) + amount;
      row.items.push({ purchase: p, amount, installment: i + 1 });
      months.set(month, row);
    }
  }
  const last = [...months.keys()].sort().at(-1);
  if (!last) return [];
  const result: Month[] = [];
  for (let month = from; month <= last; month = addMonths(month, 1)) {
    result.push(
      months.get(month) ?? {
        month,
        total: 0,
        byCard: Object.create(null) as Record<string, number>,
        items: [],
      },
    );
  }
  return result;
}
export function validateData(input: unknown): Data {
  const fail = () => {
    throw new Error(
      "Arquivo inválido: confira os cartões, compras e valores do backup.",
    );
  };
  if (!input || typeof input !== "object") return fail();
  const x = input as Data;
  if (
    x.version !== 1 ||
    !Array.isArray(x.cards) ||
    !Array.isArray(x.purchases) ||
    x.cards.length > 100 ||
    x.purchases.length > 10000
  )
    return fail();
  const text = (v: unknown, max = 100) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max;
  const number = (v: unknown, min: number, max: number) =>
    Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
  const ids = new Set<string>();
  for (const c of x.cards) {
    if (
      !c ||
      !text(c.id) ||
      ids.has(c.id) ||
      !text(c.name, 50) ||
      !text(c.bank, 50) ||
      typeof c.last4 !== "string" ||
      !/^(\d{4})?$/.test(c.last4) ||
      !/^#[0-9a-fA-F]{6}$/.test(c.color) ||
      !number(c.dueDay, 1, 31) ||
      !number(c.limitCents, 0, 100_000_000_000)
    )
      return fail();
    ids.add(c.id);
  }
  const purchaseIds = new Set<string>();
  for (const p of x.purchases) {
    if (
      !p ||
      !text(p.id) ||
      purchaseIds.has(p.id) ||
      !text(p.description) ||
      !ids.has(p.cardId) ||
      !CATEGORIES.includes(p.category) ||
      !number(p.totalCents, 1, 100_000_000_000) ||
      !number(p.installments, 1, 600) ||
      p.totalCents < p.installments ||
      !number(p.paid, 0, p.installments) ||
      typeof p.nextMonth !== "string" ||
      !/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(p.nextMonth)
    )
      return fail();
    purchaseIds.add(p.id);
  }
  const month = (v: unknown) =>
    typeof v === "string" && /^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(v);
  if (
    x.settings !== undefined &&
    (!x.settings || !["light", "dark"].includes(x.settings.theme))
  )
    return fail();
  if (x.payments !== undefined) {
    if (!Array.isArray(x.payments) || x.payments.length > 30000) return fail();
    const paymentIds = new Set<string>();
    const installments = new Set<string>();
    for (const payment of x.payments) {
      const p = x.purchases.find((p) => p.id === payment?.purchaseId);
      const key = `${payment?.purchaseId}:${payment?.installment}`;
      if (
        !payment ||
        !p ||
        !text(payment.id) ||
        paymentIds.has(payment.id) ||
        installments.has(key) ||
        !number(payment.installment, 1, p.paid) ||
        !number(payment.amountCents, 1, 100_000_000_000) ||
        payment.amountCents !== installmentAmount(p, payment.installment - 1) ||
        !month(payment.paidMonth) ||
        !month(payment.scheduledMonth) ||
        !["regular", "advance"].includes(payment.kind)
      )
        return fail();
      paymentIds.add(payment.id);
      installments.add(key);
    }
  }
  // Keep only supported fields when importing untrusted backups.
  return {
    version: 1,
    cards: x.cards.map((c) => ({
      id: c.id,
      name: c.name,
      bank: c.bank,
      last4: c.last4,
      color: c.color,
      dueDay: c.dueDay,
      limitCents: c.limitCents,
    })),
    purchases: x.purchases.map((p) => ({
      id: p.id,
      description: p.description,
      cardId: p.cardId,
      category: p.category,
      totalCents: p.totalCents,
      installments: p.installments,
      paid: p.paid,
      nextMonth: p.nextMonth,
    })),
    ...(x.settings ? { settings: { theme: x.settings.theme } } : {}),
    ...(x.payments
      ? {
          payments: x.payments.map((payment) => ({
            id: payment.id,
            purchaseId: payment.purchaseId,
            installment: payment.installment,
            amountCents: payment.amountCents,
            paidMonth: payment.paidMonth,
            scheduledMonth: payment.scheduledMonth,
            kind: payment.kind,
          })),
        }
      : {}),
  };
}
