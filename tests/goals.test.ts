import { test } from "node:test";
import assert from "node:assert/strict";
import { validateData, payPurchase, type Data, type Goal } from "../src/domain";
import { paySubscription } from "../src/finance";
import { goalSpending, savingsPlan, spendingProgress } from "../src/goals";
const goal = (id = "g", patch: Partial<Goal> = {}): Goal => ({
  id,
  title: "Meu objetivo",
  description: "",
  kind: "saving",
  targetCents: 70000,
  startMonth: "2026-01",
  deadlineMonth: null,
  category: null,
  baselineCents: null,
  archived: false,
  ...patch,
});
const base = (): Data => ({
  version: 1,
  cards: [],
  purchases: [],
  goals: [goal()],
  cashEntries: [
    {
      id: "i",
      description: "Salário",
      source: "Empresa",
      date: "2026-01-05",
      kind: "income",
      amountCents: 100000,
    },
  ],
});
test("metas preservam backups antigos, sobrevivem ao round-trip e descartam campos desconhecidos", () => {
  assert.deepEqual(validateData({ version: 1, cards: [], purchases: [] }), {
    version: 1,
    cards: [],
    purchases: [],
  });
  const d = base();
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(d))), d);
  const clean = validateData({
    ...d,
    goals: [{ ...goal(), unknown: "discard" }],
  });
  assert.equal("unknown" in clean.goals![0], false);
  clean.goals![0].title = "Mudou";
  assert.equal(d.goals![0].title, "Meu objetivo");
  for (const goals of [
    [goal(), goal()],
    [{ ...goal(), targetCents: -1 }],
    [{ ...goal(), targetCents: "100" }],
    [{ ...goal(), archived: "false" }],
    [{ ...goal(), startMonth: "2026-13" }],
    [{ ...goal(), deadlineMonth: "2025-12" }],
    [{ ...goal(), category: "Casa" }],
    Array(101).fill(goal()),
  ])
    assert.throws(() => validateData({ ...d, goals }));
});
test("a prioridade distribui o saldo sem duplicar dinheiro e respeita o início das metas", () => {
  const d = base();
  d.goals = [goal(), goal("b", { targetCents: 50000 })];
  let plan = savingsPlan(d, "2026-01", "2026-03");
  assert.equal(plan.available, 100000);
  assert.equal(plan.allocations.get("g"), 70000);
  assert.equal(plan.allocations.get("b"), 30000);
  assert.equal(plan.allocated, 100000);
  d.goals.reverse();
  plan = savingsPlan(d, "2026-01", "2026-03");
  assert.equal(plan.allocations.get("b"), 50000);
  assert.equal(plan.allocations.get("g"), 50000);
  d.goals[0].startMonth = "2026-02";
  plan = savingsPlan(d, "2026-01", "2026-03");
  assert.equal(plan.allocations.get("b"), 0);
  assert.equal(plan.free, 30000);
  assert.equal(
    savingsPlan(d, "2026-02", "2026-03").allocations.get("b"),
    30000,
  );
});
test("déficits reduzem o progresso e seguem para o próximo mês sem virar economia fictícia", () => {
  const d = base();
  d.goals = [goal(), goal("b", { targetCents: 50000 })];
  d.cashEntries!.push({
    id: "e",
    description: "Ajuste",
    source: "Retirada",
    kind: "deduction",
    amountCents: 140000,
    date: "2026-02-02",
  });
  let plan = savingsPlan(d, "2026-02", "2026-03");
  assert.equal(plan.allocated, 0);
  assert.equal(plan.available, 0);
  assert.equal(plan.deficit, 40000);
  d.cashEntries!.push({
    id: "new",
    description: "Recebido",
    source: "Cliente",
    kind: "income",
    amountCents: 50000,
    date: "2026-03-02",
  });
  plan = savingsPlan(d, "2026-03", "2026-03");
  assert.equal(plan.allocated, 10000);
  assert.equal(plan.allocations.get("b"), 0);
});
test("dinheiro previsto e meses futuros não entram no saldo economizado; arquivar redistribui a estimativa", () => {
  const d = base();
  d.goals!.push(goal("b", { targetCents: 50000 }));
  d.cashEntries!.push(
    {
      id: "planned",
      description: "Previsão",
      source: "Cliente",
      kind: "income",
      status: "planned",
      amountCents: 900000,
      date: "2026-01-10",
    },
    {
      id: "future",
      description: "Futuro",
      source: "Cliente",
      kind: "income",
      amountCents: 900000,
      date: "2026-02-10",
    },
  );
  assert.equal(savingsPlan(d, "2026-05", "2026-01").available, 100000);
  d.goals![0].archived = true;
  const plan = savingsPlan(d, "2026-01", "2026-01");
  assert.equal(plan.allocations.has("g"), false);
  assert.equal(plan.allocations.get("b"), 50000);
  assert.equal(plan.free, 50000);
});
test("pagamentos, parcelas e assinaturas são descontados uma vez; quitar não cria novas sobras", () => {
  const d = base();
  d.settings = { theme: "ultra", reserveCents: 10000 };
  d.cards = [
    {
      id: "c",
      name: "Cartão",
      bank: "Nubank",
      last4: "",
      color: "#123456",
      dueDay: 10,
      limitCents: 100000,
    },
  ];
  d.purchases = [
    {
      id: "p",
      cardId: "c",
      description: "Compra",
      category: "Casa",
      totalCents: 30000,
      installments: 3,
      paid: 0,
      nextMonth: "2026-01",
    },
  ];
  d.expenses = [
    {
      id: "e",
      description: "Mercado",
      payee: "Loja",
      category: "Alimentação",
      amountCents: 15000,
      dueDate: "2026-01-05",
      paidDate: null,
      method: "pix",
    },
  ];
  d.subscriptions = [
    {
      id: "s",
      name: "Streaming",
      provider: "Serviço",
      category: "Lazer",
      amountCents: 5000,
      cardId: "c",
      frequency: "monthly",
      startMonth: "2026-01",
      endMonth: null,
      dueDay: 10,
    },
  ];
  assert.equal(savingsPlan(d, "2026-01", "2026-03").available, 60000);
  const paid = paySubscription(
    payPurchase(d, "p", 1, "2026-01"),
    "s",
    "2026-01",
    "2026-01",
  );
  paid.expenses![0].paidDate = "2026-01-08";
  assert.equal(savingsPlan(paid, "2026-01", "2026-03").available, 60000);
  const advanced = payPurchase(d, "p", 2, "2026-01");
  assert.equal(savingsPlan(advanced, "2026-01", "2026-03").available, 50000);
  assert.equal(savingsPlan(advanced, "2026-02", "2026-03").available, 45000);
  assert.equal(goalSpending(advanced, "2026-01"), 30000); // one due installment, not the cash advance again
  assert.equal(goalSpending(advanced, "2026-01", "Alimentação"), 15000);
});
test("saldo transportado e reserva entram uma vez; atrasos anteriores ao início são protegidos", () => {
  const d = base();
  d.goals = [goal("g", { startMonth: "2026-02", targetCents: 200000 })];
  d.settings = {
    theme: "ultra",
    reserveCents: 10000,
    carryover: { startMonth: "2026-01", openingCents: 20000 },
  };
  d.expenses = [
    {
      id: "e",
      description: "Conta atrasada",
      payee: "Empresa",
      category: "Casa",
      amountCents: 15000,
      dueDate: "2026-01-05",
      paidDate: null,
      method: "boleto",
    },
  ];
  const plan = savingsPlan(d, "2026-02", "2026-02");
  assert.equal(plan.opening, 120000);
  assert.equal(plan.available, 95000);
  assert.equal(plan.pending, 15000);
  assert.equal(savingsPlan(d, "2026-03", "2026-03").available, 95000);
});
test("limite mensal compara referência, preserva centavos e só fecha resultados em meses encerrados", () => {
  const d = base();
  d.expenses = [
    {
      id: "e",
      description: "Mercado",
      payee: "Loja",
      category: "Alimentação",
      amountCents: 20001,
      dueDate: "2026-01-05",
      paidDate: null,
      method: "pix",
    },
  ];
  const g = goal("limit", {
    kind: "spending",
    targetCents: 30000,
    baselineCents: 40000,
    category: "Alimentação",
  });
  let result = spendingProgress(d, g, "2026-01", "2026-01");
  assert.equal(result.saved, 19999);
  assert.equal(result.remaining, 9999);
  assert.equal(result.achieved, false);
  assert.equal(spendingProgress(d, g, "2026-01", "2026-02").achieved, true);
  assert.equal(spendingProgress(d, g, "2026-02", "2026-01").saved, null);
  assert.equal(
    spendingProgress(
      d,
      { ...g, deadlineMonth: "2026-01" },
      "2026-02",
      "2026-03",
    ).active,
    false,
  );
  d.expenses![0].amountCents = 45000;
  result = spendingProgress(d, g, "2026-01", "2026-02");
  assert.equal(result.saved, -5000);
  assert.equal(result.remaining, -15000);
  assert.equal(result.achieved, false);
});
test("parcelas com divisão inexata mantêm os centavos após pagamento", () => {
  const d = base();
  d.cashEntries![0].amountCents = 1000;
  d.cards = [
    {
      id: "c",
      name: "Cartão",
      bank: "Inter",
      last4: "",
      color: "#123456",
      dueDay: 10,
      limitCents: 100000,
    },
  ];
  d.purchases = [
    {
      id: "p",
      cardId: "c",
      description: "Centavos",
      category: "Compras",
      totalCents: 100,
      installments: 3,
      paid: 0,
      nextMonth: "2026-01",
    },
  ];
  assert.equal(savingsPlan(d, "2026-01", "2026-01").available, 966);
  assert.equal(
    savingsPlan(payPurchase(d, "p", 1, "2026-01"), "2026-01", "2026-01")
      .available,
    966,
  );
});

test("um saldo inicial posterior ao início da meta substitui o histórico anterior, sem duplicar dinheiro", () => {
  const d = base();
  d.settings = {
    theme: "ultra",
    reserveCents: 10000,
    carryover: { startMonth: "2026-02", openingCents: 200000 },
  };
  d.cashEntries!.push({
    id: "feb",
    description: "Recebido em fevereiro",
    source: "Empresa",
    date: "2026-02-02",
    kind: "income",
    amountCents: 50000,
  });
  const plan = savingsPlan(d, "2026-02", "2026-03");
  assert.equal(plan.start, "2026-02");
  assert.equal(plan.opening, 200000);
  assert.equal(plan.available, 240000);
  assert.equal(savingsPlan(d, "2026-01", "2026-03").available, 90000); // the future opening is not applied retroactively
});
