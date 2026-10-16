import { test } from "node:test";
import assert from "node:assert/strict";
import { findFunctions } from "../src/navigation";
test("busca de funções entende intenções financeiras, acentos e nomes alternativos", () => {
  for (const [query, expected] of [
    ["pagar fatura", "cards"],
    ["Como cadastrar um cartão", "cards"],
    ["Onde vejo quanto posso gastar", "home"],
    ["SALÁRIO", "income"],
    ["quanto estou devendo", "overview"],
    ["quanto vou pagar", "planning"],
    ["quanto sobra", "income"],
    ["parcelas caras", "anticipation"],
    ["adiantar parcelas", "anticipation"],
    ["tema escuro", "appearance"],
    ["cópia segurança", "data"],
    ["aceleração hardware", "appearance"],
    ["atualizar", "updates"],
    ["Netflix", "subscriptions"],
    ["boleto", "expenses"],
  ])
    assert.equal(findFunctions(query)[0]?.id, expected, query);
});
test("busca combina palavras sem depender da ordem e não sugere destinos sem relação", () => {
  assert.equal(findFunctions("fatura pagar")[0]?.id, "cards");
  assert.deepEqual(findFunctions("banana telescópio"), []);
  assert.deepEqual(
    findFunctions("Configurações").map((item) => item.id),
    ["appearance", "data", "updates"],
  );
  assert.ok(findFunctions("   ").length >= 6);
  assert.equal(findFunctions("Meus cartões")[0]?.id, "cards");
});
