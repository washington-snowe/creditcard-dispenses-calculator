import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  currentMonth,
  validateData,
  type Data,
  type RecurringIncome,
} from "../src/domain";
import {
  incomeMonth,
  monthlyBudget,
  receiveIncome,
  localDate,
  expenseMonth,
} from "../src/finance";
const now = currentMonth(),
  previous = addMonths(now, -1),
  future = addMonths(now, 1);
const rule: RecurringIncome = {
  id: "r",
  description: "Salário",
  source: "Empresa",
  amountCents: 200000,
  dueDay: 31,
  frequency: "monthly",
  startMonth: previous,
  endMonth: null,
};
const data = (): Data => ({
  version: 1,
  cards: [],
  purchases: [],
  settings: {
    theme: "ultra",
    accent: "#20c7a0",
    glow: true,
    motion: false,
    font: "dm",
    carryover: { startMonth: previous, openingCents: 10000 },
  },
  recurringIncomes: [rule],
  cashEntries: [
    {
      id: "c",
      description: "Valor recebido",
      source: "Cliente",
      date: previous + "-01",
      kind: "income",
      amountCents: 100000,
    },
  ],
  expenses: [
    {
      id: "e",
      description: "Luz",
      payee: "Energia",
      category: "Casa",
      amountCents: 10000,
      dueDate: previous + "-10",
      method: "boleto",
      paidDate: null,
    },
  ],
});
test("renda recorrente gera previsão sem fingir dinheiro recebido e recebimento é idempotente", () => {
  const d = data();
  assert.equal(monthlyBudget(d, now).income, 0);
  assert.equal(monthlyBudget(d, now).expectedIncome, 200000);
  const received = receiveIncome(d, "r", now, localDate());
  assert.equal(monthlyBudget(received, now).income, 200000);
  assert.equal(monthlyBudget(received, now).expectedIncome, 0);
  assert.deepEqual(receiveIncome(received, "r", now), received);
});
test("renda recebida em mês posterior entra na data real e preserva origem e valor após edição", () => {
  const received = receiveIncome(data(), "r", previous, localDate());
  received.recurringIncomes = [
    { ...rule, amountCents: 300000, source: "Outra empresa" },
  ];
  assert.equal(incomeMonth(received, previous)[0].amount, 200000);
  assert.equal(received.incomeReceipts![0].source, "Empresa");
  assert.equal(monthlyBudget(received, now).income, 200000);
  assert.equal(monthlyBudget(received, previous).income, 100000);
});
test("sobra efetiva anterior é transportada, com pendência antiga descontada apenas no mês atual", () => {
  const d = data(),
    before = monthlyBudget(d, now);
  assert.equal(before.opening, 110000);
  assert.equal(before.expensePending, 10000);
  assert.equal(before.remaining, 300000);
  d.expenses![0].paidDate = localDate();
  const after = monthlyBudget(d, now);
  assert.equal(after.remaining, before.remaining);
  assert.equal(after.actualBalance, 100000);
  assert.equal(monthlyBudget(d, future).opening, 300000);
});
test("editar ou excluir movimento antigo recalcula saldo acumulado sem criar entradas duplicadas", () => {
  const d = data();
  const first = monthlyBudget(d, now).opening;
  d.cashEntries![0].amountCents += 25;
  assert.equal(monthlyBudget(d, now).opening, first + 25);
  d.cashEntries = [];
  assert.equal(monthlyBudget(d, now).opening, 10000);
});
test("conta paga no futuro da competência pesa só no mês efetivo e não repete o débito", () => {
  const d = data();
  d.recurringIncomes = [];
  d.expenses![0].paidDate = localDate();
  assert.equal(monthlyBudget(d, previous).expensePaid, 0);
  assert.equal(monthlyBudget(d, now).expensePaid, 10000);
  assert.equal(monthlyBudget(d, future).expensePaid, 0);
  assert.equal(monthlyBudget(d, future).opening, 100000);
});
test("déficit e mês inicial futuro respeitam o ponto de partida configurado", () => {
  const d = data();
  d.settings!.carryover = { startMonth: now, openingCents: -5000 };
  assert.equal(monthlyBudget(d, now).opening, -5000);
  assert.equal(monthlyBudget(d, previous).opening, 0);
  assert.equal(monthlyBudget(d, future).opening, 185000);
});
test("planejamento de rendas respeita frequência, período e último dia de fevereiro", () => {
  const d = data();
  d.recurringIncomes = [
    {
      ...rule,
      frequency: "yearly",
      startMonth: "2026-02",
      endMonth: "2027-02",
    },
  ];
  assert.equal(incomeMonth(d, "2026-03").length, 0);
  assert.equal(incomeMonth(d, "2027-02")[0].date, "2027-02-28");
  assert.equal(incomeMonth(d, "2028-02").length, 0);
});
test("backup aceita novos campos e rejeita datas inválidas, referências e valores impossíveis", () => {
  const d = receiveIncome(data(), "r", now, localDate());
  assert.deepEqual(validateData(d), d);
  assert.throws(() =>
    validateData({
      ...d,
      expenses: [{ ...d.expenses![0], dueDate: "2026-02-31" }],
    }),
  );
  assert.throws(() =>
    validateData({
      ...d,
      incomeReceipts: [{ ...d.incomeReceipts![0], recurringId: "unknown" }],
    }),
  );
  assert.throws(() =>
    validateData({
      ...d,
      settings: { theme: "ultra", accent: "javascript:alert(1)" },
    }),
  );
  assert.throws(() =>
    validateData({
      ...d,
      settings: {
        theme: "dark",
        carryover: { startMonth: now, openingCents: 0.1 },
      },
    }),
  );
});
test("despesas vencidas aparecem no mês atual, sem se acumular artificialmente nos futuros", () => {
  assert.equal(expenseMonth(data(), now).length, 1);
  assert.equal(expenseMonth(data(), future).length, 0);
});
