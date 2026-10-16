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
  symlink,
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
const { cleanupUpdates } = require("../electron/update-cleanup.cjs");
const payload = "verified package fixture";
const hash = createHash("sha256").update(payload).digest("hex");
function response(body: string, url: string, headers = {}) {
  const value = new Response(body, { headers });
  Object.defineProperty(value, "url", { value: url });
  return value;
}
function fetchFixture(badChecksum = false, version = "3.1.0") {
  return async (url: string) => {
    if (url.endsWith("/latest"))
      return response("", `${REPOSITORY}/releases/tag/v${version}`);
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
    await assert.rejects(readFile(join(root, "updates", "3.1.0.zip")), {
      code: "ENOENT",
    });
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
        const stage = join(
          root,
          "updates",
          "staging",
          "11111111-1111-1111-1111-111111111111",
        );
        await mkdir(stage, { recursive: true });
        await writeFile(join(stage, "partial.exe"), "incomplete extraction");
        throw new Error("Pacote inválido");
      },
    });
    await assert.rejects(updater.download(), /Pacote inválido/);
    assert.equal((await updater.info()).readyVersion, null);
    assert.deepEqual(await readdir(join(root, "updates", "staging")), []);
    await assert.rejects(readFile(join(root, "updates", "3.1.0.zip")), {
      code: "ENOENT",
    });
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

test("limpeza remove o acúmulo de versões e temporários, mantendo atual, ativa, preparada, dados e todos os backups", async () => {
  const userData = await mkdtemp(join(tmpdir(), "saldo-cleanup-"));
  const root = join(userData, "updates");
  const nonce = "11111111-1111-1111-1111-111111111111";
  try {
    for (const version of ["2.0.0", "3.0.0", "3.1.0", "3.2.0", "3.3.0"]) {
      const directory = join(root, "versions", version, "Saldo-win32-x64");
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "saldo.exe"), version);
    }
    const keepFiles = [
      "finances.json",
      "backups/snapshot.json",
      "updates/finances-before-3.0.0-123.json",
      "updates/backup-manual.json",
      "updates/notes.txt",
      "updates/versions/custom/keep.txt",
    ];
    for (const file of keepFiles) {
      await mkdir(join(userData, file, ".."), { recursive: true });
      await writeFile(join(userData, file), "preserved exactly");
    }
    await writeFile(
      join(root, "active.json"),
      JSON.stringify({ version: "3.1.0" }),
    );
    const temporary = [
      "2.0.0.zip",
      "3.0.0.zip.part",
      "prepare.ps1",
      `helper-${nonce}.cjs`,
      `helper-${nonce}.json`,
      `helper-ready-${nonce}.json`,
      `ready-${nonce}.json`,
    ];
    for (const file of temporary) await writeFile(join(root, file), "obsolete");
    await mkdir(join(root, "staging", nonce), { recursive: true });
    await writeFile(join(root, "staging", nonce, "partial.exe"), "obsolete");
    await cleanupUpdates({
      userData,
      currentVersion: "3.0.0",
      keepVersions: ["3.2.0"],
      executable: join(
        root,
        "versions",
        "3.3.0",
        "Saldo-win32-x64",
        "saldo.exe",
      ),
    });
    assert.deepEqual((await readdir(join(root, "versions"))).sort(), [
      "3.0.0",
      "3.1.0",
      "3.2.0",
      "3.3.0",
      "custom",
    ]);
    assert.deepEqual(await readdir(join(root, "staging")), []);
    for (const file of temporary)
      await assert.rejects(readFile(join(root, file)), { code: "ENOENT" });
    for (const file of keepFiles)
      assert.equal(
        await readFile(join(userData, file), "utf8"),
        "preserved exactly",
      );
    // Repeated cleanup is harmless, and the committed version survives an older launcher.
    await cleanupUpdates({ userData, currentVersion: "3.0.0" });
    assert.deepEqual((await readdir(join(root, "versions"))).sort(), [
      "3.0.0",
      "3.1.0",
      "custom",
    ]);
  } finally {
    await rm(userData, { recursive: true, force: true });
  }
});

test("limpeza não segue links nem apaga diretórios que contêm dados ou backups", async () => {
  const userData = await mkdtemp(join(tmpdir(), "saldo-cleanup-links-"));
  const outside = await mkdtemp(join(tmpdir(), "saldo-private-"));
  const versions = join(userData, "updates", "versions");
  try {
    await writeFile(join(outside, "private.txt"), "private");
    await mkdir(versions, { recursive: true });
    // Junctions do not require Developer Mode/admin on Windows.
    await symlink(outside, join(versions, "1.0.0"), "junction");
    for (const [version, file] of [
      ["1.1.0", "finances.json"],
      ["1.2.0", "backups/snapshot.json"],
      ["1.3.0", "finances-before-3.0.0.json"],
    ]) {
      await mkdir(join(versions, version, file, ".."), { recursive: true });
      await writeFile(join(versions, version, file), "preserve");
    }
    await cleanupUpdates({ userData, currentVersion: "3.0.0" });
    assert.equal(
      await readFile(join(outside, "private.txt"), "utf8"),
      "private",
    );
    assert.deepEqual((await readdir(versions)).sort(), [
      "1.0.0",
      "1.1.0",
      "1.2.0",
      "1.3.0",
    ]);
    // A linked versions container is also never traversed.
    await symlink(outside, join(userData, "updates", "staging"), "junction");
    await cleanupUpdates({ userData, currentVersion: "3.0.0" });
    assert.equal(
      await readFile(join(outside, "private.txt"), "utf8"),
      "private",
    );
  } finally {
    await rm(userData, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("confirmar leitura e iniciar outro download aguarda o commit sem excluir o ACK ou a versão de recuperação", async () => {
  const userData = await mkdtemp(join(tmpdir(), "saldo-cleanup-ack-"));
  const root = join(userData, "updates");
  const nonce = "22222222-2222-2222-2222-222222222222";
  const oldVersion = join(root, "versions", "3.0.0");
  try {
    await mkdir(oldVersion, { recursive: true });
    await writeFile(join(oldVersion, "saldo.exe"), "rollback");
    await writeFile(
      join(root, "active.json"),
      JSON.stringify({ version: "3.0.0" }),
    );
    let fetched = false;
    const fixture = fetchFixture(false, "3.2.0");
    const updater = createUpdater({
      currentVersion: "3.1.0",
      userData,
      platform: "win32",
      arch: "x64",
      packaged: true,
      fetch: (url: string) => {
        fetched = true;
        return fixture(url);
      },
      prepare: async () => {},
    });
    await updater.ready([`--saldo-update-ack=${nonce}`]);
    assert.equal(
      JSON.parse(await readFile(join(root, `ready-${nonce}.json`), "utf8"))
        .version,
      "3.1.0",
    );
    const download = updater.download();
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(
      fetched,
      false,
      "Outro download só começa depois da confirmação.",
    );
    assert.equal(
      JSON.parse(await readFile(join(root, `ready-${nonce}.json`), "utf8"))
        .version,
      "3.1.0",
    );
    assert.equal(
      await readFile(join(oldVersion, "saldo.exe"), "utf8"),
      "rollback",
    );
    await writeFile(
      join(root, "active.json"),
      JSON.stringify({ version: "3.1.0" }),
    );
    await writeFile(
      join(root, "last-update.json"),
      JSON.stringify({
        success: true,
        version: "3.1.0",
        processId: process.pid,
      }),
    );
    assert.deepEqual(await download, { version: "3.2.0", ready: true });
    const until = Date.now() + 5000;
    while (
      (await readdir(join(root, "versions"))).includes("3.0.0") &&
      Date.now() < until
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    await assert.rejects(readFile(join(oldVersion, "saldo.exe")), {
      code: "ENOENT",
    });
  } finally {
    await rm(userData, { recursive: true, force: true });
  }
});

test("reiniciar com argumento de confirmação antigo ainda limpa arquivos acumulados", async () => {
  const userData = await mkdtemp(join(tmpdir(), "saldo-cleanup-relaunch-"));
  const root = join(userData, "updates");
  const nonce = "33333333-3333-3333-3333-333333333333";
  try {
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "active.json"),
      JSON.stringify({ version: "3.1.0" }),
    );
    await writeFile(
      join(root, "last-update.json"),
      JSON.stringify({
        success: true,
        version: "3.1.0",
        processId: process.pid + 1,
      }),
    );
    await writeFile(join(root, "3.1.0.zip.part"), "interrupted download");
    const updater = createUpdater({
      currentVersion: "3.1.0",
      userData,
      platform: "win32",
      arch: "x64",
      packaged: true,
    });
    await updater.ready([`--saldo-update-ack=${nonce}`]);
    await assert.rejects(readFile(join(root, "3.1.0.zip.part")), {
      code: "ENOENT",
    });
    await assert.rejects(readFile(join(root, `ready-${nonce}.json`)), {
      code: "ENOENT",
    });
  } finally {
    await rm(userData, { recursive: true, force: true });
  }
});

test("um estado ativo corrompido não permite limpar versões de recuperação", async () => {
  const userData = await mkdtemp(join(tmpdir(), "saldo-cleanup-invalid-"));
  const root = join(userData, "updates");
  try {
    await mkdir(join(root, "versions", "1.0.0"), { recursive: true });
    await writeFile(join(root, "versions", "1.0.0", "saldo.exe"), "recovery");
    await writeFile(join(root, "active.json"), '{"version":"../../unsafe"}');
    await cleanupUpdates({ userData, currentVersion: "3.0.0" });
    assert.equal(
      await readFile(join(root, "versions", "1.0.0", "saldo.exe"), "utf8"),
      "recovery",
    );
  } finally {
    await rm(userData, { recursive: true, force: true });
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
