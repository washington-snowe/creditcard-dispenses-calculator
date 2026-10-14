import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anticipationOptions,
  forecast,
  monthSnapshot,
  payCardMonth,
  payPurchase,
  remaining,
  removePurchase,
  replacePurchase,
  suggestPayoffs,
  validateData,
  type Data,
  type Purchase,
} from "../src/domain";
const purchase = (extra: Partial<Purchase> = {}): Purchase => ({
  id: "p1",
  cardId: "c1",
  description: "Notebook",
  category: "Tecnologia",
  totalCents: 10000,
  installments: 3,
  paid: 0,
  nextMonth: "2026-10",
  ...extra,
});
const data = (purchases = [purchase()]): Data => ({
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
  purchases,
});
test("a navegação mensal não acumula parcelas anteriores em um mês futuro", () => {
  const d = data();
  assert.equal(
    monthSnapshot(d.purchases, [], "2026-11", "2026-10").outstanding,
    3333,
  );
  assert.equal(
    monthSnapshot(d.purchases, [], "2026-09", "2026-10").outstanding,
    0,
  );
  assert.equal(
    monthSnapshot(d.purchases, [], "2026-12", "2026-10").outstanding,
    3333,
  );
});
test("pagamento mensal do cartão inclui vencidas e não paga parcelas futuras ou de outro cartão", () => {
  const d = data([
    purchase({ nextMonth: "2026-09" }),
    purchase({ id: "p2", nextMonth: "2026-11" }),
    purchase({ id: "p3", cardId: "c2" }),
  ]);
  const paid = payCardMonth(d, "c1", "2026-10");
  assert.equal(paid.purchases[0].paid, 2);
  assert.equal(paid.purchases[0].nextMonth, "2026-11");
  assert.equal(paid.purchases[1].paid, 0);
  assert.equal(paid.purchases[2].paid, 0);
  assert.equal(paid.payments?.length, 2);
  assert.equal(
    monthSnapshot(
      paid.purchases.filter((p) => p.cardId === "c1"),
      paid.payments!,
      "2026-10",
      "2026-10",
    ).outstanding,
    0,
  );
  assert.equal(
    monthSnapshot(
      paid.purchases.filter((p) => p.cardId === "c1"),
      paid.payments!,
      "2026-10",
      "2026-10",
    ).paid,
    6667,
  );
  assert.deepEqual(payCardMonth(paid, "c1", "2026-10"), paid);
});
test("quitação antecipada registra os valores exatos e elimina todos os compromissos futuros", () => {
  const d = data();
  const next = payPurchase(d, "p1", 3, "2026-10", "advance");
  assert.equal(remaining(next.purchases[0]), 0);
  assert.equal(forecast(next.purchases, "2026-10").length, 0);
  assert.equal(
    next.payments?.reduce((s, p) => s + p.amountCents, 0),
    10000,
  );
  assert.equal(
    monthSnapshot(next.purchases, next.payments!, "2026-10", "2026-10")
      .cashPaid,
    10000,
  );
  assert.equal(
    monthSnapshot(next.purchases, next.payments!, "2026-11", "2026-10").paid,
    3333,
  );
  assert.equal(next.payments![2].scheduledMonth, "2026-12");
  assert.equal(next.payments![2].kind, "advance");
  assert.throws(() => payPurchase(next, "p1", 1, "2026-10"));
});
test("antecipar duas parcelas desloca a próxima cobrança sem alterar a data original da última", () => {
  const next = payPurchase(data(), "p1", 2, "2026-10", "advance");
  assert.equal(next.purchases[0].nextMonth, "2026-12");
  assert.equal(
    monthSnapshot(next.purchases, next.payments!, "2026-11", "2026-10")
      .outstanding,
    0,
  );
  assert.equal(
    monthSnapshot(next.purchases, next.payments!, "2026-12", "2026-10")
      .outstanding,
    3333,
  );
});
test("backups antigos continuam válidos e o histórico estimado é identificado", () => {
  const legacy = data([purchase({ paid: 1, nextMonth: "2026-11" })]);
  assert.deepEqual(validateData(legacy), legacy);
  const snapshot = monthSnapshot(legacy.purchases, [], "2026-10", "2026-11");
  assert.equal(snapshot.paid, 3334);
  assert.equal(snapshot.estimated, true);
});
test("tema e histórico persistem em backups e registros duplicados ou incoerentes são rejeitados", () => {
  const d = {
    ...payPurchase(data(), "p1", 1, "2026-10"),
    settings: { theme: "dark" as const },
  };
  assert.deepEqual(validateData(d), d);
  assert.throws(() =>
    validateData({ ...d, payments: [...d.payments!, ...d.payments!] }),
  );
  assert.throws(() =>
    validateData({ ...d, payments: [{ ...d.payments![0], amountCents: 1 }] }),
  );
  assert.throws(() => validateData({ ...d, settings: { theme: "invalid" } }));
});
test("corrigir parcelas pagas ou excluir compra remove somente os registros afetados", () => {
  const d = payPurchase(data(), "p1", 2, "2026-10");
  const edited = replacePurchase(d, {
    ...d.purchases[0],
    paid: 1,
    nextMonth: "2026-11",
  });
  assert.equal(edited.payments?.length, 1);
  assert.doesNotThrow(() => validateData(edited));
  const changed = replacePurchase(d, { ...d.purchases[0], totalCents: 12000 });
  assert.equal(changed.payments?.length, 0);
  const removed = removePurchase(d, "p1");
  assert.equal(removed.purchases.length, 0);
  assert.equal(removed.payments?.length, 0);
});
test("sugestões priorizam alívio por real sem exceder o orçamento", () => {
  const purchases = [
    purchase({ id: "expensive", totalCents: 120000, installments: 12 }),
    purchase({ id: "short", totalCents: 30000, installments: 3 }),
    purchase({ id: "small", totalCents: 10000, installments: 2 }),
  ];
  assert.deepEqual(suggestPayoffs(purchases, 40000), ["small", "short"]);
  assert.deepEqual(suggestPayoffs(purchases, 0), []);
  assert.equal(anticipationOptions(purchases)[0].monthlyRelief, 10000);
  assert.throws(() => suggestPayoffs(purchases, -1));
});
