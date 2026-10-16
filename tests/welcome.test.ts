import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const phrases: string[] = require("../electron/welcome-phrases.json");
const {
  createWelcomeSession,
  nextPhrase,
} = require("../electron/welcome-session.cjs");

test("banco contém exatamente 200 frases originais distintas e legíveis", () => {
  assert.equal(phrases.length, 200);
  assert.equal(new Set(phrases).size, 200);
  for (const phrase of phrases) {
    assert.equal(phrase, phrase.trim());
    assert.ok(phrase.length >= 32 && phrase.length <= 88);
  }
});

test("frases não repetem por 200 inícios nem na fronteira entre ciclos", () => {
  let state: unknown;
  let previous: number | null = null;
  for (let cycle = 0; cycle < 3; cycle++) {
    const used = new Set();
    for (let i = 0; i < 200; i++) {
      const result = nextPhrase(state, () => 0);
      assert.equal(result.info.phrase, phrases[result.info.phraseId]);
      assert.notEqual(result.info.phraseId, previous);
      assert.ok(!used.has(result.info.phraseId));
      used.add(result.info.phraseId);
      previous = result.info.phraseId;
      state = JSON.parse(JSON.stringify(result.state));
    }
    assert.equal(used.size, 200);
  }
});

test("históricos inválidos são recuperados sem produzir frases ausentes", () => {
  for (const saved of [
    null,
    {},
    3,
    { version: 1, last: 2, remaining: [2] },
    { version: 1, remaining: [3, 3] },
    { version: 1, remaining: [-1] },
    { version: 1, remaining: [200] },
    { version: 1, remaining: ["2"] },
    { version: 2, remaining: [5] },
    { version: 1, remaining: "erro" },
  ]) {
    const result = nextPhrase(saved, () => 0);
    assert.ok(phrases.includes(result.info.phrase));
    assert.equal(new Set(result.state.remaining).size, 199);
  }
});

test("sessão é única por processo; próximo início muda a frase sem alterar finanças e backups", async () => {
  const dir = await mkdtemp(join(tmpdir(), "contaclara-welcome-"));
  try {
    const finances = '{"version":1,"cards":[],"purchases":[]}';
    await writeFile(join(dir, "finances.json"), finances);
    await writeFile(join(dir, "backup.json"), finances);
    const session = createWelcomeSession(dir, {
      account: () => ({ username: "  Ana\nSilva  " }),
      random: () => 0,
    });
    assert.equal(session(), session());
    const results = await Promise.all(
      Array.from({ length: 8 }, () => session()),
    );
    for (const info of results) assert.deepEqual(info, results[0]);
    assert.equal(results[0].name, "AnaSilva");
    const history = JSON.parse(
      await readFile(join(dir, "welcome-state.json"), "utf8"),
    );
    assert.equal(history.remaining.length, 199);
    assert.ok(!JSON.stringify(history).includes("Ana"));
    const restarted = await createWelcomeSession(dir, {
      account: () => {
        throw Error("OS unavailable");
      },
      random: () => 0,
    })();
    assert.equal(restarted.name, null);
    assert.notEqual(restarted.phraseId, results[0].phraseId);
    for (const filename of ["finances.json", "backup.json"])
      assert.equal(await readFile(join(dir, filename), "utf8"), finances);
    await writeFile(join(dir, "welcome-state.json"), "not json");
    const recovered = await createWelcomeSession(dir, {
      account: () => ({ username: " ".repeat(90) }),
    })();
    assert.equal(recovered.name, null);
    assert.ok(phrases.includes(recovered.phrase));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("falha de gravação do histórico não impede abrir a sessão", async () => {
  const dir = await mkdtemp(join(tmpdir(), "contaclara-welcome-unwritable-"));
  try {
    const file = join(dir, "file");
    await writeFile(file, "keep");
    const info = await createWelcomeSession(file, {
      account: () => ({ username: "a".repeat(100) }),
    })();
    assert.equal(info.name.length, 80);
    assert.ok(phrases.includes(info.phrase));
    assert.equal(await readFile(file, "utf8"), "keep");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
