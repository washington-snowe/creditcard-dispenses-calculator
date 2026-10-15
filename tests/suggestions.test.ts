import { test } from "node:test";
import assert from "node:assert/strict";
import { completionFor, detectCategory, nameOptions } from "../src/suggestions";

test("completar nomes conserva o prefixo digitado, respeita acentos e limite", () => {
  assert.equal(completionFor("No", ["Notebook"])?.accepted, "Notebook");
  assert.equal(completionFor("no", ["Notebook"])?.accepted, "notebook");
  assert.equal(
    completionFor("Cafe\u0301", ["Café da manhã"])?.suffix,
    " da manhã",
  );
  assert.equal(completionFor("Notebook", ["Notebook"]), null);
  assert.equal(completionFor(" ", ["Notebook"]), null);
  assert.equal(completionFor("No", ["Notebook"], 4), null);
});
test("nomes repetidos do histórico têm prioridade sobre exemplos e variantes", () => {
  const values = nameOptions(
    [
      "Assinatura própria",
      "Notebook do trabalho",
      "Assinatura própria",
      "Notebook pessoal",
    ],
    ["Notebook", "Assinatura própria"],
  );
  assert.equal(values[0], "Assinatura própria");
  assert.equal(completionFor("No", values)?.accepted, "Notebook pessoal");
  assert.equal(values.filter((x) => x === "Assinatura própria").length, 1);
});
test("categoria reconhece nomes completos, acentos e expressões específicas", () => {
  for (const [name, category] of [
    ["Notebook gamer", "Tecnologia"],
    ["Netflix", "Lazer"],
    ["Conta de luz", "Casa"],
    ["Farmácia", "Saúde"],
    ["Curso de inglês", "Educação"],
    ["Supermercado", "Alimentação"],
    ["Uber", "Transporte"],
    ["Tênis", "Compras"],
    ["Amazon Prime", "Lazer"],
    ["Passagem aérea da viagem", "Transporte"],
  ])
    assert.equal(detectCategory(name!)?.category, category, name);
  assert.equal(detectCategory("computacional"), null);
  assert.equal(detectCategory("Nome totalmente pessoal"), null);
});
test("categoria aprende escolhas cadastradas, preferindo frequência e desempate recente", () => {
  const history = [
    { name: "Netflix", category: "Educação" },
    { name: "Netflix", category: "Educação" },
    { name: "Netflix", category: "Lazer" },
  ];
  assert.deepEqual(detectCategory("netflix", history), {
    category: "Educação",
    source: "history",
  });
  assert.equal(detectCategory("Netflix", history.slice(1))?.category, "Lazer");
  assert.equal(
    detectCategory("Netflix", [{ name: "Netflix", category: "Inválida" }])
      ?.category,
    "Lazer",
  );
});
