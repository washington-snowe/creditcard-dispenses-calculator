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
export type Data = { version: 1; cards: Card[]; purchases: Purchase[] };
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
  };
}
