import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BANKS } from "../src/domain";
import { bankLogoFile } from "../src/banks";
test("todos os bancos cadastrados têm imagem original local e checksum de procedência", () => {
  const sources = JSON.parse(readFileSync("public/banks/sources.json", "utf8"));
  for (const bank of BANKS.filter((name) => name !== "Outro")) {
    const file = bankLogoFile(bank);
    assert.ok(file, bank);
    const source = sources.find(
      (entry: { bank: string }) => entry.bank === bank,
    );
    assert.equal(source.file, file);
    const bytes = readFileSync(`public/banks/${file}`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      source.sha256,
    );
    assert.ok(source.source.startsWith("https://"));
  }
});
test("apelidos usuais dos bancos reutilizam a marca certa sem adivinhar banco desconhecido", () => {
  assert.equal(bankLogoFile("Itaú Unibanco"), bankLogoFile("Itaú"));
  assert.equal(bankLogoFile("Banco Inter"), bankLogoFile("Inter"));
  assert.equal(bankLogoFile("Caixa Econômica Federal"), bankLogoFile("Caixa"));
  assert.equal(bankLogoFile("c6"), bankLogoFile("C6 Bank"));
  assert.equal(bankLogoFile("Outro"), null);
  assert.equal(bankLogoFile("Banco pessoal"), null);
});
