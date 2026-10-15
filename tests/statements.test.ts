import test from "node:test";
import assert from "node:assert/strict";
import {
  applyStatement,
  csvCells,
  importPreview,
  parseCsv,
  parseOfx,
  statementDate,
  statementMoney,
} from "../src/import-statements";
import type { Data } from "../src/domain";
const data: Data = {
  version: 1,
  cards: [
    {
      id: "a",
      name: "Cartão",
      bank: "Nubank",
      last4: "",
      color: "#123456",
      dueDay: 10,
      limitCents: 0,
    },
  ],
  purchases: [],
};
const target = {
  kind: "card" as const,
  cardId: "a",
  month: "2026-10",
  positiveCharges: true,
};
test("CSV lê BOM, acentos, delimitadores, aspas escapadas e quebras dentro de descrição", () => {
  const parsed = parseCsv(
    '\uFEFFData;Descrição;Valor\r\n01/10/2026;"Mercado; bairro";1.234,56\r\n02/10/2026;"Loja ""A""";10,10',
  );
  assert.equal(parsed.rows[0].cents, 123456);
  assert.equal(parsed.rows[0].date, "2026-10-01");
  assert.equal(parsed.rows[1].description, 'Loja "A"');
  assert.deepEqual(
    csvCells('Data,Descrição,Valor\n2026-10-01,"Compra\nem loja",10.99', ","),
    [
      ["Data", "Descrição", "Valor"],
      ["2026-10-01", "Compra\nem loja", "10.99"],
    ],
  );
  const mapped = parseCsv("Dia;Texto;Preço\n01/10/2026;Almoço;20,10");
  assert.equal(mapped.needsMapping, true);
  assert.equal(
    parseCsv("Dia;Texto;Preço\n01/10/2026;Almoço;20,10", {
      date: 0,
      description: 1,
      value: 2,
    }).rows[0].cents,
    2010,
  );
  assert.throws(() => csvCells('"sem fechamento', ","));
});
test("datas e valores inválidos geram erros por linha e não viram números incorretos", () => {
  assert.equal(statementMoney("(1.234,56)"), -123456);
  assert.equal(statementMoney("-12.99"), -1299);
  assert.equal(statementDate("20261001120000[-3:BRT]"), "2026-10-01");
  for (const v of ["1,234.56", "1.2.3", "0", "1e9", "NaN"])
    assert.throws(() => statementMoney(v));
  assert.throws(() => statementDate("31/02/2026"));
  assert.ok(
    parseCsv("Data;Descrição;Valor\n31/02/2026;Inválido;20").rows[0].error,
  );
  assert.ok(
    parseCsv("Data;Descrição;Valor\n01/10/2026;Inválido;xyz").rows[0].error,
  );
});
test("OFX SGML e XML extraem datas, valores, identificadores e entidades sem carregar recursos", () => {
  for (const xml of [false, true]) {
    const tag = (key: string, value: string) =>
      `<${key}>${value}${xml ? `</${key}>` : ""}\n`;
    const rows = parseOfx(
      "<OFX><STMTTRN>" +
        tag("DTPOSTED", "20261001120000[-3:BRT]") +
        tag("TRNAMT", "-10.01") +
        tag("MEMO", "Loja &amp; Café") +
        tag("FITID", "ABC1") +
        "</STMTTRN></OFX>",
    );
    assert.equal(rows[0].cents, -1001);
    assert.equal(rows[0].description, "Loja & Café");
    assert.equal(rows[0].reference, "ABC1");
  }
  assert.throws(() => parseOfx("<!DOCTYPE OFX><OFX></OFX>"));
  assert.throws(() => parseOfx("<OFX/>"));
});
test("importação exige seleção válida, bloqueia duplicatas, ignora créditos e conserva os dados antigos", () => {
  const rows = parseCsv(
    "Data;Descrição;Valor\n01/10/2026;Netflix;20,10\n01/10/2026;Netflix;20,10\n02/10/2026;Estorno;-10,00\n31/02/2026;Erro;2",
  ).rows;
  const original = structuredClone(data),
    preview = importPreview(data, rows, target);
  assert.equal(preview[0].category, "Lazer");
  assert.equal(preview[1].duplicate, true);
  assert.equal(preview[2].credit, true);
  const next = applyStatement(
    data,
    rows,
    target,
    new Set(rows.map((r) => r.line)),
    { 2: "Outros" },
  );
  assert.equal(next.purchases.length, 1);
  assert.equal(next.purchases[0].totalCents, 2010);
  assert.equal(next.purchases[0].category, "Outros");
  assert.deepEqual(data, original);
  assert.equal(importPreview(next, rows, target)[0].duplicate, true);
  assert.throws(() => applyStatement(next, rows, target, new Set([2])));
  const cash = applyStatement(
    data,
    rows,
    { kind: "cash", source: "Banco" },
    new Set([2, 4]),
  );
  assert.equal(cash.cashEntries!.length, 2);
  assert.equal(cash.cashEntries![0].kind, "income");
  assert.equal(cash.cashEntries![1].kind, "deduction");
});
