import { test } from "node:test";
import assert from "node:assert/strict";
import {
  payPurchase,
  validateData,
  type Data,
  type Subscription,
} from "../src/domain";
import {
  monthlyBudget,
  payEntireCardMonth,
  paySubscription,
  recursInMonth,
  removeSubscription,
  subscriptionDate,
  subscriptionMonth,
} from "../src/finance";
const sub = (extra: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  name: "Netflix",
  provider: "Netflix",
  category: "Lazer",
  cardId: "c1",
  amountCents: 5000,
  frequency: "monthly",
  dueDay: 31,
  startMonth: "2026-10",
  endMonth: null,
  ...extra,
});
const data = (): Data => ({
  version: 1,
  cards: [
    {
      id: "c1",
      name: "Principal",
      bank: "Nubank",
      last4: "",
      color: "#2563eb",
      dueDay: 10,
      limitCents: 0,
    },
  ],
  purchases: [
    {
      id: "p1",
      description: "Notebook",
      category: "Tecnologia",
      cardId: "c1",
      totalCents: 30000,
      installments: 3,
      paid: 0,
      nextMonth: "2026-10",
    },
  ],
  cashEntries: [
    {
      id: "e1",
      description: "Salário",
      source: "Salário",
      kind: "income",
      amountCents: 200000,
      date: "2026-10-01",
    },
    {
      id: "e2",
      description: "Outro gasto",
      source: "Ajuste",
      kind: "deduction",
      amountCents: 20000,
      date: "2026-10-05",
    },
  ],
  subscriptions: [
    sub(),
    sub({
      id: "s2",
      name: "Academia",
      provider: "Academia",
      cardId: null,
      amountCents: 10000,
    }),
  ],
});
test("saldo mensal desconta reduções, faturas e assinaturas de cartão e débito uma única vez", () => {
  const d = data(),
    budget = monthlyBudget(d, "2026-10");
  assert.equal(budget.income, 200000);
  assert.equal(budget.net, 180000);
  assert.equal(budget.commitments, 25000);
  assert.equal(budget.remaining, 155000);
  const afterCard = payEntireCardMonth(d, "c1", "2026-10");
  assert.equal(afterCard.purchases[0].paid, 1);
  assert.equal(afterCard.subscriptionPayments?.length, 1);
  const paid = monthlyBudget(afterCard, "2026-10");
  assert.equal(paid.paid, 15000);
  assert.equal(paid.pending, 10000);
  assert.equal(paid.remaining, budget.remaining);
  const afterAll = paySubscription(afterCard, "s2", "2026-10", "2026-10");
  assert.equal(monthlyBudget(afterAll, "2026-10").remaining, 155000);
  assert.deepEqual(payEntireCardMonth(afterAll, "c1", "2026-10"), afterAll);
});
test("assinaturas anuais e trimestrais cobram somente na renovação e respeitam início/fim", () => {
  assert.equal(recursInMonth(sub({ frequency: "yearly" }), "2026-11"), false);
  assert.equal(recursInMonth(sub({ frequency: "yearly" }), "2027-10"), true);
  assert.equal(recursInMonth(sub({ frequency: "quarterly" }), "2027-01"), true);
  assert.equal(recursInMonth(sub({ endMonth: "2026-12" }), "2027-01"), false);
  assert.equal(recursInMonth(sub(), "2026-09"), false);
});
test("vencimentos no dia 31 são ajustados para o último dia de fevereiro", () => {
  assert.equal(subscriptionDate(sub(), "2027-02"), "2027-02-28");
  assert.equal(subscriptionDate(sub(), "2028-02"), "2028-02-29");
});
test("histórico de assinaturas preserva preço e cartão mesmo após editar o contrato", () => {
  const paid = paySubscription(data(), "s1", "2026-10", "2026-10");
  const edited = {
    ...paid,
    subscriptions: paid.subscriptions!.map((s) =>
      s.id === "s1"
        ? { ...s, amountCents: 8000, cardId: null, startMonth: "2026-11" }
        : s,
    ),
  };
  const october = subscriptionMonth(
    edited.subscriptions,
    edited.subscriptionPayments!,
    "2026-10",
  );
  assert.equal(october.find((i) => i.subscription.id === "s1")!.amount, 5000);
  assert.equal(october.find((i) => i.subscription.id === "s1")!.cardId, "c1");
  assert.doesNotThrow(() => validateData(edited));
});
test("antecipações pesam no mês do pagamento e não são descontadas de novo no futuro", () => {
  const d = { ...data(), subscriptions: [] };
  const paid = payPurchase(d, "p1", 3, "2026-10", "advance");
  assert.equal(monthlyBudget(paid, "2026-10").commitments, 30000);
  assert.equal(monthlyBudget(paid, "2026-11").commitments, 0);
});
test("entradas são isoladas por mês e o orçamento permite saldo negativo sem arredondar", () => {
  const d = {
    ...data(),
    cashEntries: [
      {
        id: "e",
        description: "Pix",
        source: "Freelance",
        kind: "income" as const,
        date: "2026-11-01",
        amountCents: 29,
      },
    ],
    subscriptions: [],
  };
  assert.equal(monthlyBudget(d, "2026-10").remaining, -10000);
  assert.equal(monthlyBudget(d, "2026-11").remaining, -9971);
});
test("novos campos persistem no backup; datas impossíveis e referências inválidas são rejeitadas", () => {
  const d = paySubscription(data(), "s1", "2026-10", "2026-10");
  assert.deepEqual(validateData(d), d);
  assert.throws(() =>
    validateData({
      ...d,
      cashEntries: [{ ...d.cashEntries![0], date: "2026-02-31" }],
    }),
  );
  assert.throws(() =>
    validateData({ ...d, subscriptions: [sub({ cardId: "missing" })] }),
  );
  assert.throws(() =>
    validateData({ ...d, subscriptions: [sub({ endMonth: "2026-09" })] }),
  );
  assert.throws(() =>
    validateData({
      ...d,
      subscriptionPayments: [
        ...d.subscriptionPayments!,
        ...d.subscriptionPayments!,
      ],
    }),
  );
});
test("excluir assinatura remove somente seus pagamentos, sem tocar entradas ou compras", () => {
  const d = paySubscription(data(), "s1", "2026-10", "2026-10");
  const removed = removeSubscription(d, "s1");
  assert.equal(removed.subscriptionPayments?.length, 0);
  assert.equal(removed.subscriptions?.length, 1);
  assert.deepEqual(removed.cashEntries, d.cashEntries);
  assert.deepEqual(removed.purchases, d.purchases);
});
