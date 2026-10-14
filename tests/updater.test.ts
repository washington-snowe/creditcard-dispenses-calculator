import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const {
  newer,
  trustedUrl,
  checksum,
  createUpdater,
  REPOSITORY,
} = require("../electron/updater.cjs");
const payload = "verified package fixture";
const hash = createHash("sha256").update(payload).digest("hex");
function response(body: string, url: string, headers = {}) {
  const value = new Response(body, { headers });
  Object.defineProperty(value, "url", { value: url });
  return value;
}
function fetchFixture(badChecksum = false) {
  return async (url: string) => {
    if (url.endsWith("/latest"))
      return response("", `${REPOSITORY}/releases/tag/v3.1.0`);
    if (url.endsWith("SHA256SUMS.txt"))
      return response(
        `${badChecksum ? "0".repeat(64) : hash}  Saldo-Windows-x64.zip\r\n`,
        url,
      );
    return response(
      payload,
      "https://release-assets.githubusercontent.com/fixture.zip",
      { "content-length": String(payload.length) },
    );
  };
}
test("versões são comparadas numericamente e destinos externos ou HTTP são rejeitados", () => {
  assert.equal(newer("v3.10.0", "3.9.9"), true);
  assert.equal(newer("3.0.0", "3.0.0"), false);
  assert.equal(newer("2.9.9", "3.0.0"), false);
  assert.throws(() => newer("../3.0.0", "3.0.0"));
  for (const url of [
    "http://github.com/a",
    "https://evil.example/a",
    "https://github.com.evil.example/a",
    "https://user:pass@github.com/a",
  ])
    assert.throws(() => trustedUrl(url));
});
test("checksum exige o hash e o nome exatos do arquivo oficial", () => {
  assert.equal(checksum(`\uFEFF${hash}  Saldo-Windows-x64.zip\r\n`), hash);
  assert.throws(() => checksum(`${hash}  other.zip`));
  assert.throws(() => checksum("not-a-checksum"));
});
test("download verificado prepara a versão sem alterar os dados ou ativar a atualização", async () => {
  const root = await mkdtemp(join(tmpdir(), "saldo-update-"));
  try {
    const finances = '{"private":"preserve"}';
    await writeFile(join(root, "finances.json"), finances);
    let prepared = false;
    const progress: { phase: string }[] = [];
    const updater = createUpdater({
      currentVersion: "3.0.0",
      userData: root,
      platform: "win32",
      arch: "x64",
      packaged: true,
      fetch: fetchFixture(),
      onProgress: (p: { phase: string }) => progress.push(p),
      prepare: async (script: string) => {
        const text = await readFile(script, "utf8");
        assert.ok(text.includes(hash));
        assert.ok(text.includes("3.1.0"));
        prepared = true;
      },
    });
    assert.equal((await updater.check()).available, true);
    assert.deepEqual(await updater.download(), {
      version: "3.1.0",
      ready: true,
    });
    assert.equal(prepared, true);
    assert.equal((await updater.info()).readyVersion, "3.1.0");
    assert.equal(progress.at(-1)?.phase, "ready");
    assert.equal(await readFile(join(root, "finances.json"), "utf8"), finances);
    await assert.rejects(readFile(join(root, "updates", "active.json")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("checksum inválido interrompe a instalação, apaga o parcial e preserva o aplicativo e dados", async () => {
  const root = await mkdtemp(join(tmpdir(), "saldo-update-"));
  try {
    await writeFile(join(root, "finances.json"), "preserved");
    let called = false;
    const updater = createUpdater({
      currentVersion: "3.0.0",
      userData: root,
      platform: "win32",
      arch: "x64",
      packaged: true,
      fetch: fetchFixture(true),
      prepare: async () => {
        called = true;
      },
    });
    await assert.rejects(updater.download(), /checksum/);
    assert.equal(called, false);
    assert.equal((await updater.info()).readyVersion, null);
    assert.ok(
      !(await readdir(join(root, "updates"))).some((file) =>
        file.endsWith(".part"),
      ),
    );
    assert.equal(
      await readFile(join(root, "finances.json"), "utf8"),
      "preserved",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("falha na extração não marca atualização pronta e plataformas sem suporte não instalam", async () => {
  const root = await mkdtemp(join(tmpdir(), "saldo-update-"));
  try {
    const updater = createUpdater({
      currentVersion: "3.0.0",
      userData: root,
      platform: "win32",
      arch: "x64",
      packaged: true,
      fetch: fetchFixture(),
      prepare: async () => {
        throw new Error("Pacote inválido");
      },
    });
    await assert.rejects(updater.download(), /Pacote inválido/);
    assert.equal((await updater.info()).readyVersion, null);
    await assert.rejects(updater.apply(), /Baixe/);
    const unsupported = createUpdater({
      currentVersion: "3.0.0",
      userData: root,
      platform: "linux",
      packaged: true,
    });
    await assert.rejects(unsupported.download(), /Windows/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("o atalho original encontra somente uma versão instalada mais nova no diretório controlado", async () => {
  const root = await mkdtemp(join(tmpdir(), "saldo-update-"));
  try {
    const updater = createUpdater({
      currentVersion: "3.0.0",
      userData: root,
      platform: "win32",
      arch: "x64",
      packaged: true,
    });
    const executable = join(
      root,
      "updates",
      "versions",
      "3.1.0",
      "Saldo-win32-x64",
      "saldo.exe",
    );
    await mkdir(join(root, "updates", "versions", "3.1.0", "Saldo-win32-x64"), {
      recursive: true,
    });
    await writeFile(executable, "fixture");
    await writeFile(
      join(root, "updates", "active.json"),
      JSON.stringify({ version: "3.1.0" }),
    );
    assert.equal(await updater.activeLaunch(), executable);
    await writeFile(
      join(root, "updates", "active.json"),
      JSON.stringify({ version: "../evil" }),
    );
    assert.equal(await updater.activeLaunch(), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("cancelar interrompe a consulta em andamento e libera o atualizador para tentar novamente", async () => {
  const root = await mkdtemp(join(tmpdir(), "saldo-update-"));
  try {
    let started!: () => void;
    const pending = new Promise<void>((resolve) => {
      started = resolve;
    });
    const progress: { phase: string }[] = [];
    const updater = createUpdater({
      currentVersion: "3.0.0",
      userData: root,
      platform: "win32",
      arch: "x64",
      packaged: true,
      onProgress: (value: { phase: string }) => progress.push(value),
      fetch: (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
          started();
        }),
    });
    const attempt = updater.download();
    await pending;
    updater.cancel();
    await assert.rejects(attempt, /cancelado/);
    assert.equal((await updater.info()).downloading, false);
    assert.equal((await updater.info()).readyVersion, null);
    assert.equal(progress.at(-1)?.phase, "error");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
