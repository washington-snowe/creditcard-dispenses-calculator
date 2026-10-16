import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const {
  parseReleaseNotes,
  readReleaseNotes,
} = require("../electron/release-notes.cjs");
const { createUpdater, REPOSITORY } = require("../electron/updater.cjs");
const notes = JSON.parse(
  await readFile(new URL("../src/release-notes.json", import.meta.url), "utf8"),
);
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("as novidades distribuídas correspondem à versão do aplicativo", () => {
  assert.deepEqual(parseReleaseNotes(notes, pkg.version), notes);
});
test("notas de outra versão, campos inválidos e listas excessivas são rejeitados", () => {
  for (const invalid of [
    null,
    { ...notes, version: "0.0.0" },
    { ...notes, title: " " },
    { ...notes, highlights: [] },
    { ...notes, highlights: Array(9).fill(notes.highlights[0]) },
    { ...notes, highlights: [{ ...notes.highlights[0], kind: "unknown" }] },
    {
      ...notes,
      highlights: [{ ...notes.highlights[0], description: "x".repeat(501) }],
    },
  ]) {
    assert.throws(() => parseReleaseNotes(invalid, pkg.version));
  }
});
test("leitura aceita BOM e limita bytes mesmo sem tamanho informado", async () => {
  assert.deepEqual(
    await readReleaseNotes(
      new Response("\uFEFF" + JSON.stringify(notes)),
      pkg.version,
    ),
    notes,
  );
  await assert.rejects(
    readReleaseNotes(
      new Response("x", { headers: { "content-length": "32769" } }),
      pkg.version,
    ),
  );
  await assert.rejects(
    readReleaseNotes(new Response("x".repeat(32769)), pkg.version),
  );
  await assert.rejects(readReleaseNotes(new Response("not json"), pkg.version));
});
test("notas corretas são expostas; notas ausentes ou de outra versão não bloqueiam a atualização", async () => {
  const root = await mkdtemp(join(tmpdir(), "contaclara-notes-"));
  try {
    for (const metadata of [notes, { ...notes, version: "0.0.0" }, null]) {
      const updater = createUpdater({
        currentVersion: "1.0.0",
        userData: root,
        fetch: async (url: string) => {
          if (url.endsWith("/latest")) {
            const response = new Response("");
            Object.defineProperty(response, "url", {
              value: `${REPOSITORY}/releases/tag/v${pkg.version}`,
            });
            return response;
          }
          assert.equal(
            url,
            `${REPOSITORY}/releases/download/v${pkg.version}/release-notes.json`,
          );
          return metadata
            ? new Response(JSON.stringify(metadata))
            : new Response("", { status: 404 });
        },
      });
      const result = await updater.check();
      assert.equal(result.available, true);
      assert.equal(result.version, pkg.version);
      assert.deepEqual(result.notes, metadata === notes ? notes : null);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("cancelar a consulta de notas propaga o cancelamento da atualização", async () => {
  const root = await mkdtemp(join(tmpdir(), "contaclara-notes-abort-"));
  const controller = new AbortController();
  try {
    const updater = createUpdater({
      currentVersion: "1.0.0",
      userData: root,
      fetch: async (url: string) => {
        if (url.endsWith("/latest")) {
          const response = new Response("");
          Object.defineProperty(response, "url", {
            value: `${REPOSITORY}/releases/tag/v${pkg.version}`,
          });
          return response;
        }
        controller.abort();
        throw controller.signal.reason;
      },
    });
    await assert.rejects(updater.check(controller.signal), {
      name: "AbortError",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
