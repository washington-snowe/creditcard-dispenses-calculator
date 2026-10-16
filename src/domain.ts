export type Card = {
  id: string;
  name: string;
  bank: string;
  last4: string;
  color: string;
  dueDay: number;
  closingDay?: number;
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
  importKey?: string;
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
  settings?: Settings;
  recurringIncomes?: RecurringIncome[];
  incomeReceipts?: IncomeReceipt[];
  expenses?: Expense[];
  cashEntries?: CashEntry[];
  subscriptions?: Subscription[];
  subscriptionPayments?: SubscriptionPayment[];
  goals?: Goal[];
};
export type Goal = {
  id: string;
  title: string;
  description: string;
  kind: "saving" | "spending";
  targetCents: number;
  startMonth: string;
  deadlineMonth: string | null;
  category: string | null;
  baselineCents: number | null;
  archived: boolean;
};
export type Settings = {
  theme: "light" | "dark" | "ultra";
  accent?: string;
  glow?: boolean;
  motion?: boolean;
  sidebarCollapsed?: boolean;
  hardwareAcceleration?: boolean;
  reserveCents?: number;
  privacy?: boolean;
  density?: "compact" | "comfortable";
  automaticBackups?: boolean;
  homeWidgets?: string[];
  carryover?: { startMonth: string; openingCents: number };
};
export type RecurringIncome = {
  id: string;
  description: string;
  source: string;
  amountCents: number;
  dueDay: number;
  frequency: "monthly" | "quarterly" | "yearly";
  startMonth: string;
  endMonth: string | null;
};
export type IncomeReceipt = {
  id: string;
  recurringId: string;
  month: string;
  date: string;
  amountCents: number;
  source: string;
  description: string;
};
export type Expense = {
  id: string;
  description: string;
  payee: string;
  category: string;
  amountCents: number;
  dueDate: string;
  method: "pix" | "boleto" | "cash" | "debit" | "transfer" | "other";
  paidDate: string | null;
};
export type CashEntry = {
  id: string;
  description: string;
  source: string;
  date: string;
  amountCents: number;
  kind: "income" | "deduction";
  importKey?: string;
  status?: "received" | "planned";
};
export type Subscription = {
  id: string;
  name: string;
  provider: string;
  category: string;
  amountCents: number;
  cardId: string | null;
  frequency: "monthly" | "quarterly" | "yearly";
  dueDay: number;
  startMonth: string;
  endMonth: string | null;
};
export type SubscriptionPayment = {
  id: string;
  subscriptionId: string;
  month: string;
  paidMonth: string;
  amountCents: number;
  cardId: string | null;
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
// Only fresh data gets the new default; existing settings and legacy backups stay intact.
export const EMPTY: Data = {
  version: 1,
  cards: [],
  purchases: [],
  settings: { theme: "ultra" },
};
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
let financialPrivacy = false;
export const setFinancialPrivacy = (enabled: boolean) => {
  financialPrivacy = enabled;
};
export const isFinancialPrivate = () => financialPrivacy;
export const money = (cents: number) =>
  financialPrivacy
    ? "R$ ••••"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(cents / 100);
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
      "Arquivo inválido: confira os registros, metas e valores do backup.",
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
      (c.closingDay !== undefined && !number(c.closingDay, 1, 31)) ||
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
      (p.importKey !== undefined && !text(p.importKey, 200)) ||
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
    (!x.settings ||
      !["light", "dark", "ultra"].includes(x.settings.theme) ||
      (x.settings.accent !== undefined &&
        !/^#[a-f\d]{6}$/i.test(x.settings.accent)) ||
      (x.settings.glow !== undefined && typeof x.settings.glow !== "boolean") ||
      (x.settings.motion !== undefined &&
        typeof x.settings.motion !== "boolean") ||
      (x.settings.hardwareAcceleration !== undefined &&
        typeof x.settings.hardwareAcceleration !== "boolean") ||
      (x.settings.sidebarCollapsed !== undefined &&
        typeof x.settings.sidebarCollapsed !== "boolean") ||
      (x.settings.reserveCents !== undefined &&
        !number(x.settings.reserveCents, 0, 100_000_000_000)) ||
      (x.settings.privacy !== undefined &&
        typeof x.settings.privacy !== "boolean") ||
      (x.settings.automaticBackups !== undefined &&
        typeof x.settings.automaticBackups !== "boolean") ||
      (x.settings.density !== undefined &&
        !["compact", "comfortable"].includes(x.settings.density)) ||
      (x.settings.homeWidgets !== undefined &&
        (!Array.isArray(x.settings.homeWidgets) ||
          x.settings.homeWidgets.length > 5 ||
          new Set(x.settings.homeWidgets).size !==
            x.settings.homeWidgets.length ||
          x.settings.homeWidgets.some(
            (w) =>
              ![
                "summary",
                "available",
                "attention",
                "comparison",
                "functions",
              ].includes(w),
          ))) ||
      (x.settings.carryover !== undefined &&
        (!x.settings.carryover ||
          !month(x.settings.carryover.startMonth) ||
          !number(
            x.settings.carryover.openingCents,
            -100_000_000_000,
            100_000_000_000,
          ))))
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
  const validDate = (value: unknown) => {
    if (
      typeof value !== "string" ||
      !/^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)
    )
      return false;
    const [year, m, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, m - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === day
    );
  };
  if (x.cashEntries !== undefined) {
    if (!Array.isArray(x.cashEntries) || x.cashEntries.length > 10000)
      return fail();
    const entries = new Set<string>();
    for (const entry of x.cashEntries) {
      if (
        !entry ||
        !text(entry.id) ||
        entries.has(entry.id) ||
        !text(entry.description) ||
        (entry.importKey !== undefined && !text(entry.importKey, 200)) ||
        !text(entry.source, 80) ||
        !validDate(entry.date) ||
        !number(entry.amountCents, 1, 100_000_000_000) ||
        !["income", "deduction"].includes(entry.kind) ||
        (entry.status !== undefined &&
          (entry.kind !== "income" ||
            !["received", "planned"].includes(entry.status)))
      )
        return fail();
      entries.add(entry.id);
    }
  }
  const subscriptionIds = new Set<string>();
  if (x.subscriptions !== undefined) {
    if (!Array.isArray(x.subscriptions) || x.subscriptions.length > 1000)
      return fail();
    for (const sub of x.subscriptions) {
      if (
        !sub ||
        !text(sub.id) ||
        subscriptionIds.has(sub.id) ||
        !text(sub.name) ||
        !text(sub.provider, 80) ||
        !CATEGORIES.includes(sub.category) ||
        !number(sub.amountCents, 1, 100_000_000_000) ||
        !(sub.cardId === null || ids.has(sub.cardId)) ||
        !["monthly", "quarterly", "yearly"].includes(sub.frequency) ||
        !number(sub.dueDay, 1, 31) ||
        !month(sub.startMonth) ||
        !(
          sub.endMonth === null ||
          (month(sub.endMonth) && sub.endMonth >= sub.startMonth)
        )
      )
        return fail();
      subscriptionIds.add(sub.id);
    }
  }
  if (x.subscriptionPayments !== undefined) {
    if (
      !Array.isArray(x.subscriptionPayments) ||
      x.subscriptionPayments.length > 30000
    )
      return fail();
    const paymentIds = new Set<string>(),
      periods = new Set<string>();
    for (const payment of x.subscriptionPayments) {
      const key = `${payment?.subscriptionId}:${payment?.month}`;
      if (
        !payment ||
        !text(payment.id) ||
        paymentIds.has(payment.id) ||
        periods.has(key) ||
        !subscriptionIds.has(payment.subscriptionId) ||
        !month(payment.month) ||
        !month(payment.paidMonth) ||
        !number(payment.amountCents, 1, 100_000_000_000) ||
        !(payment.cardId === null || ids.has(payment.cardId))
      )
        return fail();
      paymentIds.add(payment.id);
      periods.add(key);
    }
  }
  const incomeIds = new Set<string>();
  if (x.recurringIncomes !== undefined) {
    if (!Array.isArray(x.recurringIncomes) || x.recurringIncomes.length > 1000)
      return fail();
    for (const r of x.recurringIncomes) {
      if (
        !r ||
        !text(r.id) ||
        incomeIds.has(r.id) ||
        !text(r.description) ||
        !text(r.source, 80) ||
        !number(r.amountCents, 1, 100_000_000_000) ||
        !number(r.dueDay, 1, 31) ||
        !["monthly", "quarterly", "yearly"].includes(r.frequency) ||
        !month(r.startMonth) ||
        !(
          r.endMonth === null ||
          (month(r.endMonth) && r.endMonth >= r.startMonth)
        )
      )
        return fail();
      incomeIds.add(r.id);
    }
  }
  if (x.incomeReceipts !== undefined) {
    if (!Array.isArray(x.incomeReceipts) || x.incomeReceipts.length > 30000)
      return fail();
    const receiptIds = new Set<string>(),
      periods = new Set<string>();
    for (const r of x.incomeReceipts) {
      const key = `${r?.recurringId}:${r?.month}`;
      if (
        !r ||
        !text(r.id) ||
        receiptIds.has(r.id) ||
        periods.has(key) ||
        !incomeIds.has(r.recurringId) ||
        !month(r.month) ||
        !validDate(r.date) ||
        !number(r.amountCents, 1, 100_000_000_000) ||
        !text(r.description) ||
        !text(r.source, 80)
      )
        return fail();
      receiptIds.add(r.id);
      periods.add(key);
    }
  }
  if (x.expenses !== undefined) {
    if (!Array.isArray(x.expenses) || x.expenses.length > 10000) return fail();
    const expenseIds = new Set<string>();
    for (const e of x.expenses) {
      if (
        !e ||
        !text(e.id) ||
        expenseIds.has(e.id) ||
        !text(e.description) ||
        !text(e.payee, 80) ||
        !CATEGORIES.includes(e.category) ||
        !number(e.amountCents, 1, 100_000_000_000) ||
        !validDate(e.dueDate) ||
        !["pix", "boleto", "cash", "debit", "transfer", "other"].includes(
          e.method,
        ) ||
        !(e.paidDate === null || validDate(e.paidDate))
      )
        return fail();
      expenseIds.add(e.id);
    }
  }
  if (x.goals !== undefined) {
    if (!Array.isArray(x.goals) || x.goals.length > 100) return fail();
    const goalIds = new Set<string>();
    for (const g of x.goals) {
      if (
        !g ||
        !text(g.id) ||
        goalIds.has(g.id) ||
        !text(g.title, 80) ||
        typeof g.description !== "string" ||
        g.description.length > 300 ||
        !["saving", "spending"].includes(g.kind) ||
        !number(g.targetCents, 1, 100_000_000_000) ||
        !month(g.startMonth) ||
        !(
          g.deadlineMonth === null ||
          (month(g.deadlineMonth) && g.deadlineMonth >= g.startMonth)
        ) ||
        !(g.category === null || CATEGORIES.includes(g.category)) ||
        !(
          g.baselineCents === null ||
          number(g.baselineCents, 0, 100_000_000_000)
        ) ||
        (g.kind === "saving" &&
          (g.category !== null || g.baselineCents !== null)) ||
        typeof g.archived !== "boolean"
      )
        return fail();
      goalIds.add(g.id);
    }
  }
  // Keep only supported fields when importing untrusted backups.
  return {
    version: 1,
    ...(x.goals
      ? {
          goals: x.goals.map((g) => ({
            id: g.id,
            title: g.title.trim(),
            description: g.description.trim(),
            kind: g.kind,
            targetCents: g.targetCents,
            startMonth: g.startMonth,
            deadlineMonth: g.deadlineMonth,
            category: g.category,
            baselineCents: g.baselineCents,
            archived: g.archived,
          })),
        }
      : {}),
    cards: x.cards.map((c) => ({
      id: c.id,
      name: c.name,
      bank: c.bank,
      last4: c.last4,
      color: c.color,
      dueDay: c.dueDay,
      ...(c.closingDay !== undefined ? { closingDay: c.closingDay } : {}),
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
      ...(p.importKey ? { importKey: p.importKey } : {}),
    })),
    ...(x.settings
      ? {
          settings: {
            theme: x.settings.theme,
            ...(x.settings.reserveCents !== undefined
              ? { reserveCents: x.settings.reserveCents }
              : {}),
            ...(x.settings.privacy !== undefined
              ? { privacy: x.settings.privacy }
              : {}),
            ...(x.settings.density !== undefined
              ? { density: x.settings.density }
              : {}),
            ...(x.settings.automaticBackups !== undefined
              ? { automaticBackups: x.settings.automaticBackups }
              : {}),
            ...(x.settings.homeWidgets !== undefined
              ? { homeWidgets: [...x.settings.homeWidgets] }
              : {}),
            ...(x.settings.accent !== undefined
              ? { accent: x.settings.accent }
              : {}),
            ...(x.settings.glow !== undefined ? { glow: x.settings.glow } : {}),
            ...(x.settings.motion !== undefined
              ? { motion: x.settings.motion }
              : {}),
            ...(x.settings.hardwareAcceleration !== undefined
              ? { hardwareAcceleration: x.settings.hardwareAcceleration }
              : {}),
            ...(x.settings.sidebarCollapsed !== undefined
              ? { sidebarCollapsed: x.settings.sidebarCollapsed }
              : {}),
            ...(x.settings.carryover
              ? {
                  carryover: {
                    startMonth: x.settings.carryover.startMonth,
                    openingCents: x.settings.carryover.openingCents,
                  },
                }
              : {}),
          },
        }
      : {}),
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
    ...(x.cashEntries
      ? {
          cashEntries: x.cashEntries.map((e) => ({
            id: e.id,
            description: e.description,
            source: e.source,
            date: e.date,
            amountCents: e.amountCents,
            kind: e.kind,
            ...(e.importKey ? { importKey: e.importKey } : {}),
            ...(e.status ? { status: e.status } : {}),
          })),
        }
      : {}),
    ...(x.subscriptions
      ? {
          subscriptions: x.subscriptions.map((s) => ({
            id: s.id,
            name: s.name,
            provider: s.provider,
            category: s.category,
            amountCents: s.amountCents,
            cardId: s.cardId,
            frequency: s.frequency,
            dueDay: s.dueDay,
            startMonth: s.startMonth,
            endMonth: s.endMonth,
          })),
        }
      : {}),
    ...(x.subscriptionPayments
      ? {
          subscriptionPayments: x.subscriptionPayments.map((p) => ({
            id: p.id,
            subscriptionId: p.subscriptionId,
            month: p.month,
            paidMonth: p.paidMonth,
            amountCents: p.amountCents,
            cardId: p.cardId,
          })),
        }
      : {}),
    ...(x.recurringIncomes
      ? {
          recurringIncomes: x.recurringIncomes.map((r) => ({
            id: r.id,
            description: r.description,
            source: r.source,
            amountCents: r.amountCents,
            dueDay: r.dueDay,
            frequency: r.frequency,
            startMonth: r.startMonth,
            endMonth: r.endMonth,
          })),
        }
      : {}),
    ...(x.incomeReceipts
      ? {
          incomeReceipts: x.incomeReceipts.map((r) => ({
            id: r.id,
            recurringId: r.recurringId,
            month: r.month,
            date: r.date,
            amountCents: r.amountCents,
            source: r.source,
            description: r.description,
          })),
        }
      : {}),
    ...(x.expenses
      ? {
          expenses: x.expenses.map((e) => ({
            id: e.id,
            description: e.description,
            payee: e.payee,
            category: e.category,
            amountCents: e.amountCents,
            dueDate: e.dueDate,
            method: e.method,
            paidDate: e.paidDate,
          })),
        }
      : {}),
  };
}
