import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  forecast,
  installmentAmount,
  parseMoney,
  payNext,
  remaining,
  validateData,
  type Purchase,
} from "../src/domain";
const purchase = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: "p1",
  cardId: "c1",
  description: "Notebook",
  category: "Tecnologia",
  totalCents: 10000,
  installments: 3,
  paid: 1,
  nextMonth: "2026-12",
  ...overrides,
});
test("parcelamento conserva os centavos e desconta somente parcelas pagas", () => {
  const p = purchase();
  assert.deepEqual(
    [0, 1, 2].map((i) => installmentAmount(p, i)),
    [3334, 3333, 3333],
  );
  assert.equal(remaining(p), 6666);
  assert.equal(remaining(purchase({ paid: 3 })), 0);
});
test("previsão individual e por cartão soma todas as dívidas até a quitação, inclusive meses sem parcela", () => {
  const a = purchase();
  const b = purchase({
    id: "p2",
    cardId: "c2",
    totalCents: 9000,
    installments: 3,
    paid: 0,
    nextMonth: "2027-02",
  });
  const rows = forecast([a, b], "2026-11");
  assert.deepEqual(
    rows.map((r) => r.total),
    [0, 3333, 3333, 3000, 3000, 3000],
  );
  assert.equal(
    rows.reduce((sum, r) => sum + r.total, 0),
    remaining(a) + remaining(b),
  );
  assert.equal(rows[3].byCard.c2, 3000);
  assert.equal(rows[1].items[0].installment, 2);
});
test("parcelas vencidas ficam no mês atual, sem desaparecer da dívida", () => {
  const rows = forecast(
    [purchase({ paid: 0, nextMonth: "2026-10" })],
    "2026-11",
  );
  assert.deepEqual(
    rows.map((r) => r.total),
    [6667, 3333],
  );
});
test("registrar pagamento avança a data e a parcela; compras quitadas não mudam", () => {
  const p = payNext(purchase());
  assert.equal(p.paid, 2);
  assert.equal(p.nextMonth, "2027-01");
  assert.equal(remaining(p), 3333);
  const paid = purchase({ paid: 3 });
  assert.equal(payNext(paid), paid);
  assert.equal(addMonths("2026-12", 1), "2027-01");
});
test("valores brasileiros são convertidos sem erro de ponto flutuante", () => {
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("0,29"), 29);
  assert.equal(parseMoney("1234.56"), 123456);
  for (const invalid of ["-1", "12,345", "1e4", "abc", "", "1.234.56"])
    assert.throws(() => parseMoney(invalid));
});
test("backups inválidos, referências inexistentes e parcelas impossíveis são rejeitados", () => {
  const data = {
    version: 1,
    cards: [
      {
        id: "c1",
        name: "Principal",
        bank: "Nubank",
        last4: "1234",
        color: "#2563eb",
        dueDay: 10,
        limitCents: 100000,
      },
    ],
    purchases: [purchase()],
  };
  assert.deepEqual(validateData(data), data);
  assert.throws(() =>
    validateData({ ...data, purchases: [purchase({ paid: 4 })] }),
  );
  assert.throws(() =>
    validateData({ ...data, purchases: [purchase({ cardId: "missing" })] }),
  );
  assert.throws(() =>
    validateData({ ...data, cards: [...data.cards, ...data.cards] }),
  );
  assert.throws(() =>
    validateData({ ...data, purchases: [purchase({ totalCents: 2 })] }),
  );
  assert.throws(() => validateData({ ...data, version: 99 }));
});
test("previsões longas e múltiplos cartões mantêm a soma exata", () => {
  const purchases = Array.from({ length: 30 }, (_, i) =>
    purchase({
      id: String(i),
      cardId: `c${i % 3}`,
      totalCents: 100000 + i,
      installments: 60,
      paid: i,
      nextMonth: "2026-11",
    }),
  );
  const rows = forecast(purchases, "2026-11");
  assert.equal(rows.length, 60);
  assert.equal(
    rows.reduce((sum, row) => sum + row.total, 0),
    purchases.reduce((sum, p) => sum + remaining(p), 0),
  );
  assert.equal(forecast([purchase({ paid: 3 })]).length, 0);
});
