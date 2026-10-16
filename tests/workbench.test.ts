import test from "node:test";
import assert from "node:assert/strict";
import {
  availableBudget,
  bestCards,
  calendarEvents,
  cardTiming,
  categoryComparison,
  pendingItems,
  monthLedger,
  searchAll,
  simulatePurchase,
} from "../src/insights";
import { monthFlow } from "../src/finance";
import { validateData, type Data, type Card } from "../src/domain";
const card: Card = {
  id: "a",
  name: "Principal",
  bank: "Itaú",
  last4: "",
  color: "#2563eb",
  dueDay: 10,
  closingDay: 2,
  limitCents: 100000,
};
const base = (): Data => ({
  version: 1,
  cards: [card],
  purchases: [],
  cashEntries: [
    {
      id: "income",
      description: "Salário",
      source: "Trabalho",
      amountCents: 100000,
      date: "2026-10-01",
      kind: "income",
      status: "received",
    },
    {
      id: "planned",
      description: "Freela",
      source: "Cliente",
      amountCents: 50000,
      date: "2026-10-20",
      kind: "income",
      status: "planned",
    },
  ],
  expenses: [
    {
      id: "e",
      description: "Energia",
      payee: "Concessionária",
      category: "Casa",
      amountCents: 20000,
      dueDate: "2026-10-12",
      method: "pix",
      paidDate: null,
    },
  ],
  settings: { theme: "light", reserveCents: 10000 },
});
test("disponível separa renda recebida, previsão e reserva, sem descontar pagos duas vezes", () => {
  const d = base();
  let b = availableBudget(d, "2026-10");
  assert.equal(b.available, 70000);
  assert.equal(b.projectedAvailable, 120000);
  d.expenses![0].paidDate = "2026-10-13";
  b = availableBudget(d, "2026-10");
  assert.equal(b.available, 70000);
  assert.equal(b.pending, 0);
});
test("prazo considera fechamento, virada de ano e fevereiro sem depender do relógio", () => {
  assert.equal(cardTiming(card, "2026-10-02")!.due, "2026-10-10");
  assert.equal(cardTiming(card, "2026-10-03")!.due, "2026-11-10");
  assert.equal(
    cardTiming({ ...card, closingDay: 25, dueDay: 5 }, "2026-12-26")!.due,
    "2027-02-05",
  );
  assert.equal(
    cardTiming({ ...card, closingDay: 31, dueDay: 30 }, "2028-02-28")!.due,
    "2028-03-30",
  );
  assert.equal(
    cardTiming({ ...card, closingDay: undefined }, "2026-10-01"),
    null,
  );
  const d = base();
  d.cards.push({
    ...card,
    id: "b",
    name: "Outro",
    closingDay: 20,
    limitCents: 100,
  });
  const ranked = bestCards(d, "2026-10-03", 1000);
  assert.equal(ranked[0].card.id, "a");
  assert.equal(ranked[1].fits, false);
});
test("calendário agrupa assinaturas na fatura sem somar cobranças duas vezes", () => {
  const d = base();
  d.purchases = [
    {
      id: "p",
      description: "Notebook",
      cardId: "a",
      category: "Tecnologia",
      totalCents: 30000,
      installments: 3,
      paid: 0,
      nextMonth: "2026-10",
    },
  ];
  d.subscriptions = [
    {
      id: "s",
      name: "Streaming",
      provider: "TV",
      category: "Lazer",
      amountCents: 2000,
      cardId: "a",
      frequency: "monthly",
      dueDay: 8,
      startMonth: "2026-10",
      endMonth: null,
    },
  ];
  let rows = calendarEvents(d, "2026-10");
  assert.equal(rows.find((r) => r.key === "bill:a")!.amount, 12000);
  assert.equal(
    rows.some((r) => r.kind === "subscription"),
    false,
  );
  assert.equal(
    rows.some((r) => r.key === "closing:a"),
    true,
  );
  d.subscriptionPayments = [
    {
      id: "sp",
      subscriptionId: "s",
      month: "2026-10",
      paidMonth: "2026-10",
      amountCents: 2000,
      cardId: null,
    },
  ];
  rows = calendarEvents(d, "2026-10");
  assert.equal(rows.find((r) => r.key === "bill:a")!.amount, 10000);
  assert.equal(rows.filter((r) => r.kind === "subscription").length, 1);
});
test("simulação conserva centavos, projeta reserva e não modifica os dados", () => {
  const d = base(),
    original = structuredClone(d),
    rows = simulatePurchase(d, "a", 10001, 3, "2026-10", "2026-10");
  assert.equal(
    rows.reduce((s, r) => s + r.installment, 0),
    10001,
  );
  assert.equal(rows[0].balanceAfter, 120000 - 3334);
  assert.deepEqual(d, original);
  d.settings!.carryover = { startMonth: "2026-10", openingCents: 0 };
  const carry = simulatePurchase(d, "a", 30000, 3, "2026-10", "2026-10");
  assert.equal(carry[1].balanceAfter, 100000); // October 120000 minus first 10000, then November 10000.
  d.settings!.carryover = { startMonth: "2026-11", openingCents: 50000 };
  const future = simulatePurchase(d, "a", 30000, 3, "2026-10", "2026-10");
  assert.equal(future[1].balanceAfter, 30000);
  const long = simulatePurchase(d, "a", 60001, 600, "2026-10", "2026-10");
  assert.equal(
    long.reduce((s, r) => s + r.installment, 0),
    60001,
  );
  assert.throws(() => simulatePurchase(d, "a", 100, 1, "2026-09", "2026-10"));
  assert.throws(() =>
    simulatePurchase(d, "missing", 10, 1, "2026-10", "2026-10"),
  );
  assert.throws(() => simulatePurchase(d, "a", 10, 20, "2026-10", "2026-10"));
});
test("comparação usa competência, ignora rendas e diferencia base zero", () => {
  const d = base();
  d.expenses!.push({
    ...d.expenses![0],
    id: "old",
    amountCents: 10000,
    dueDate: "2026-09-12",
  });
  const rows = categoryComparison(d, "2026-10");
  assert.equal(rows[0].current, 20000);
  assert.equal(rows[0].prior, 10000);
  assert.equal(rows[0].percentage, 100);
  assert.equal(
    pendingItems(d, "2026-10").every((r) => !r.income && !r.paid),
    true,
  );
  assert.equal(searchAll(d, "salario")[0].id, "income");
  assert.equal(searchAll(d, "itau")[0].id, "a");
  assert.equal(searchAll(d, "inexistente").length, 0);
});
test("preferências novas e chaves de importação sobrevivem a backup e rejeitam entrada malformada", () => {
  const d = base();
  d.settings = {
    ...d.settings!,
    privacy: true,
    density: "compact",
    automaticBackups: false,
    homeWidgets: ["available", "summary"],
  };
  d.cashEntries![0].importKey = "cash:fitid";
  assert.deepEqual(validateData(d), d);
  for (const settings of [
    { reserveCents: -1 },
    { privacy: "true" },
    { homeWidgets: ["summary", "summary"] },
    { density: "tiny" },
  ])
    assert.throws(() =>
      validateData({ ...d, settings: { ...d.settings, ...settings } }),
    );
  assert.throws(() =>
    validateData({ ...d, cards: [{ ...card, closingDay: 32 }] }),
  );
});

test("calendário mostra recebimentos no mês real, preserva histórico e não duplica períodos", () => {
  const d = base();
  d.cashEntries = [];
  d.expenses = [];
  d.recurringIncomes = [
    {
      id: "r",
      description: "Nome atualizado",
      source: "Origem atualizada",
      amountCents: 90000,
      dueDay: 5,
      frequency: "monthly",
      startMonth: "2026-01",
      endMonth: null,
    },
  ];
  d.incomeReceipts = [
    {
      id: "r1",
      recurringId: "r",
      month: "2026-08",
      date: "2026-10-02",
      amountCents: 30000,
      description: "Trabalho de agosto",
      source: "Cliente antigo",
    },
    {
      id: "r2",
      recurringId: "r",
      month: "2026-09",
      date: "2026-10-03",
      amountCents: 40000,
      description: "Trabalho de setembro",
      source: "Cliente antigo",
    },
  ];
  const events = calendarEvents(validateData(d), "2026-10").filter(
    (e) => e.kind === "recurring",
  );
  assert.equal(events.length, 3);
  assert.equal(new Set(events.map((e) => e.key)).size, 3);
  const actual = events.filter((e) => e.paid);
  assert.deepEqual(
    actual.map((e) => [e.label, e.detail, e.date, e.amount]),
    [
      ["Trabalho de agosto", "Cliente antigo", "2026-10-02", 30000],
      ["Trabalho de setembro", "Cliente antigo", "2026-10-03", 40000],
    ],
  );
  assert.equal(events.filter((e) => !e.paid)[0].amount, 90000);
  assert.equal(
    calendarEvents(d, "2026-08").filter((e) => e.kind === "recurring").length,
    0,
  );
  assert.equal(
    calendarEvents(d, "2026-09").filter((e) => e.kind === "recurring").length,
    0,
  );
  assert.equal(monthFlow(d, "2026-10").income, 70000);
  // A drilldown deliberately excludes recurring rules and must exclude receipts too.
  assert.equal(
    monthLedger({ ...d, recurringIncomes: [] }, "2026-10").length,
    0,
  );
});
