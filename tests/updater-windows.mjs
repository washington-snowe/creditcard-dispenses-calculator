import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
  cp,
  stat,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { _electron as electron, expect } from "playwright/test";
import { createPackage, extractAll, uncacheAll } from "@electron/asar";
const require = createRequire(import.meta.url);
const { createUpdater, REPOSITORY } = require("../electron/updater.cjs");
if (process.platform !== "win32")
  throw new Error("Este teste precisa do Windows e do aplicativo empacotado.");
const root = await mkdtemp(join(tmpdir(), "saldo atualização teste-"));
const userData = join(root, "dados"),
  updates = join(userData, "updates");
const originalDir = join(root, "original", "Saldo-win32-x64");
const sourceDir = dirname(
  resolve(process.env.SALDO_EXECUTABLE || "release/Saldo-win32-x64/saldo.exe"),
);
const original = join(originalDir, "saldo.exe");
const currentVersion = JSON.parse(
  await readFile("package.json", "utf8"),
).version;
const [major, minor, patch] = currentVersion.split(".").map(Number);
const goodVersion = `${major}.${minor}.${patch + 1}`,
  nextVersion = `${major}.${minor}.${patch + 2}`,
  badVersion = `${major}.${minor}.${patch + 3}`;
const oldEnv = process.env.SALDO_DATA_DIR;
process.env.SALDO_DATA_DIR = userData;
let app,
  scriptCounter = 0;
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function annotation(kind, title, message) {
  const escaped = String(message)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.log(`::${kind} title=${title}::${escaped}`);
}
async function ps(code) {
  const file = join(root, `test-${++scriptCounter}.ps1`);
  await writeFile(file, "\uFEFF$ErrorActionPreference = 'Stop'\n" + code);
  return new Promise((resolve, reject) => {
    const child = spawn(
      join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        file,
      ],
      {
        windowsHide: true,
        env: Object.fromEntries(
          Object.entries(process.env).filter(
            ([key]) => key.toUpperCase() !== "PSMODULEPATH",
          ),
        ),
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(output.trim()) : reject(new Error(output)),
    );
  });
}
async function waitFor(predicate, message, milliseconds = 90000) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) {
    const value = await predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(message);
}
async function stopOwnedProcesses() {
  // Restrict process lookup to this test's unique executable paths, never a shared process name.
  await ps(`$prefix = ${quote(root + "\\")}
Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -and $_.CommandLine -notlike '*--type=*' } | ForEach-Object {
  & taskkill.exe /PID $_.ProcessId /T /F | Out-Null
}`);
}
async function runningAt(executable) {
  const output = await ps(
    `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq ${quote(executable)} -and $_.CommandLine -notlike '*--type=*' } | Select-Object -ExpandProperty ProcessId`,
  );
  return output.split(/\s+/).filter(Boolean).map(Number);
}
function fixtureFetch(version, bytes) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  return async (url) => {
    let response;
    if (url.endsWith("/latest")) {
      response = new Response("");
      Object.defineProperty(response, "url", {
        value: `${REPOSITORY}/releases/tag/v${version}`,
      });
    } else {
      response = url.endsWith("SHA256SUMS.txt")
        ? new Response(`${hash}  Saldo-Windows-x64.zip\r\n`)
        : new Response(bytes, {
            headers: { "content-length": String(bytes.length) },
          });
      Object.defineProperty(response, "url", { value: url });
    }
    return response;
  };
}
async function candidate(version, broken = false) {
  const directory = join(root, `fixture-${version}`),
    packaged = join(directory, "Saldo-win32-x64");
  await cp(sourceDir, packaged, { recursive: true });
  const archive = join(packaged, "resources", "app.asar"),
    unpacked = join(root, `asar-${version}`);
  extractAll(archive, unpacked);
  const metadata = JSON.parse(
    await readFile(join(unpacked, "package.json"), "utf8"),
  );
  metadata.version = version;
  await writeFile(join(unpacked, "package.json"), JSON.stringify(metadata));
  if (broken)
    await writeFile(
      join(unpacked, "dist", "index.html"),
      "<!doctype html><html><body>Simulação de versão que não carrega os dados.</body></html>",
    );
  uncacheAll();
  await rm(archive);
  await createPackage(unpacked, archive);
  const zip = join(root, `${version}-fixture.zip`);
  await ps(
    `Compress-Archive -LiteralPath ${quote(packaged)} -DestinationPath ${quote(zip)}`,
  );
  return await readFile(zip);
}
async function controller(
  version,
  bytes,
  pid,
  installedExecutable = original,
  installedVersion = currentVersion,
) {
  return createUpdater({
    currentVersion: installedVersion,
    userData,
    platform: "win32",
    arch: "x64",
    packaged: true,
    executable: installedExecutable,
    pid,
    fetch: fixtureFetch(version, bytes),
  });
}
async function launchOriginal(executablePath = original) {
  app = await electron.launch({
    executablePath,
    args: [],
    env: { ...process.env, SALDO_DATA_DIR: userData },
  });
  const page = await app.firstWindow();
  await expect(page.getByTestId("welcome-pending")).toBeVisible();
  return await app.evaluate(() => process.pid);
}
async function journal() {
  try {
    return JSON.parse(
      (await readFile(join(updates, "last-update.json"), "utf8")).replace(
        /^\uFEFF/,
        "",
      ),
    );
  } catch {
    return null;
  }
}
async function assertClean(version) {
  await waitFor(
    async () => {
      const versions = await readdir(join(updates, "versions"));
      const files = await readdir(updates);
      return (
        versions.length === 1 &&
        versions[0] === version &&
        !files.some((file) =>
          /\.zip(?:\.part)?$|\.ps1$|^(?:helper-|ready-)/.test(file),
        )
      );
    },
    "Versões antigas ou arquivos temporários permaneceram após a confirmação.",
    20000,
  );
  assert.deepEqual(await readdir(join(updates, "staging")), []);
}
try {
  await mkdir(userData, { recursive: true });
  await cp(sourceDir, originalDir, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  const finances = JSON.stringify({
    version: 1,
    cards: [],
    purchases: [],
    settings: {
      theme: "ultra",
      accent: "#20c7a0",
      font: "inter",
      motion: false,
      glow: true,
      hardwareAcceleration: false,
      carryover: { startMonth: month, openingCents: -12000 },
    },
    recurringIncomes: [
      {
        id: "salary",
        description: "Renda recorrente preservada",
        source: "Trabalho",
        amountCents: 100000,
        dueDay: 1,
        frequency: "monthly",
        startMonth: month,
        endMonth: null,
      },
    ],
    incomeReceipts: [
      {
        id: "receipt",
        recurringId: "salary",
        month,
        date: month + "-01",
        amountCents: 100000,
        source: "Trabalho",
        description: "Renda recorrente preservada",
      },
    ],
    expenses: [
      {
        id: "expense",
        description: "Despesa preservada",
        payee: "Mercado",
        category: "Casa",
        amountCents: 3000,
        dueDate: month + "-01",
        method: "pix",
        paidDate: month + "-01",
      },
    ],
    cashEntries: [
      {
        id: "e",
        description: "Saldo preservado",
        source: "Salário",
        date: month + "-01",
        amountCents: 500000,
        kind: "income",
      },
    ],
    subscriptions: [
      {
        id: "s",
        name: "Academia",
        provider: "Esporte",
        category: "Outros",
        amountCents: 5000,
        cardId: null,
        frequency: "monthly",
        dueDay: 10,
        startMonth: month,
        endMonth: null,
      },
    ],
  });
  await writeFile(join(userData, "finances.json"), finances);
  await mkdir(join(userData, "backups"), { recursive: true });
  await writeFile(join(userData, "backups", "manual.json"), finances);
  await mkdir(updates, { recursive: true });
  await writeFile(join(updates, "finances-before-legacy-123.json"), finances);
  const good = await candidate(goodVersion);
  annotation(
    "notice",
    "Atualizador Windows",
    "Pacote local de teste criado; iniciando o aplicativo original.",
  );
  const pid = await launchOriginal();
  assert.ok(Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  const liveCheck = await (
    await app.firstWindow()
  ).evaluate(() => window.saldo.checkUpdates());
  assert.equal(liveCheck.currentVersion, currentVersion);
  assert.equal(liveCheck.repository, REPOSITORY);
  assert.match(liveCheck.version, /^\d+\.\d+\.\d+$/);
  annotation(
    "notice",
    "Atualizador Windows",
    "Aplicativo original aberto; preparando download e extração real.",
  );
  const updater = await controller(goodVersion, good, pid);
  await updater.download(); // Real PowerShell extraction, ZIP checks and ASAR/version validation.
  annotation(
    "notice",
    "Atualizador Windows",
    "Download, checksum e extração concluídos; aplicando a atualização.",
  );
  assert.equal((await updater.info()).readyVersion, goodVersion);
  // Simulate accumulation left by older releases. It must remain until commit.
  const legacy = join(updates, "versions", "1.0.0");
  await mkdir(legacy, { recursive: true });
  await writeFile(join(legacy, "obsolete.exe"), "old runtime");
  await writeFile(join(updates, "1.0.0.zip"), "old downloaded ZIP");
  await updater.apply();
  assert.equal(
    await readFile(join(legacy, "obsolete.exe"), "utf8"),
    "old runtime",
  );
  await app.close();
  app = undefined;
  const success = await waitFor(async () => {
    const value = await journal();
    return value?.version === goodVersion ? value : null;
  }, "A atualização nativa não concluiu.");
  assert.equal(success.success, true, success.message);
  await assertClean(goodVersion);
  annotation(
    "notice",
    "Atualizador Windows",
    "Nova versão abriu e validou os dados; verificando o atalho original.",
  );
  assert.equal(
    await readFile(join(userData, "finances.json"), "utf8"),
    finances,
  );
  const files = await readdir(updates);
  const backup = files.find((file) =>
    file.startsWith(`finances-before-${goodVersion}-`),
  );
  assert.ok(backup);
  assert.equal(await readFile(join(updates, backup), "utf8"), finances);
  assert.equal(
    await readFile(join(userData, "backups", "manual.json"), "utf8"),
    finances,
  );
  assert.equal(
    await readFile(join(updates, "finances-before-legacy-123.json"), "utf8"),
    finances,
  );
  const target = join(
    updates,
    "versions",
    goodVersion,
    "Saldo-win32-x64",
    "saldo.exe",
  );
  assert.equal(await updater.activeLaunch(), target);
  await stopOwnedProcesses();
  await waitFor(
    async () => !(await runningAt(target)).length,
    "A versão de teste não fechou.",
    15000,
  );
  // The original portable executable redirects to the installed version after the update.
  const bootstrap = spawn(original, [], {
    env: { ...process.env, SALDO_DATA_DIR: userData },
    stdio: "ignore",
  });
  await new Promise((resolve, reject) => {
    bootstrap.once("error", reject);
    bootstrap.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Bootstrap: ${code}`)),
    );
  });
  await waitFor(
    async () => (await runningAt(target)).length,
    "O atalho original não abriu a versão nova.",
    20000,
  );
  // Upgrade again from a managed version. Its executable is also hosting the
  // updater helper, so cleanup must tolerate Windows locking it until helper exit.
  const next = await candidate(nextVersion);
  const [managedPid] = await runningAt(target);
  assert.ok(managedPid > 0);
  const second = await controller(
    nextVersion,
    next,
    managedPid,
    target,
    goodVersion,
  );
  await second.download();
  await second.apply();
  assert.equal(
    (await stat(target)).isFile(),
    true,
    "A versão de recuperação deve existir até a confirmação.",
  );
  await ps(`& taskkill.exe /PID ${managedPid} /T /F | Out-Null`);
  const secondResult = await waitFor(async () => {
    const value = await journal();
    return value?.version === nextVersion ? value : null;
  }, "A segunda atualização nativa não concluiu.");
  assert.equal(secondResult.success, true, secondResult.message);
  await assertClean(nextVersion);
  const nextTarget = join(
    updates,
    "versions",
    nextVersion,
    "Saldo-win32-x64",
    "saldo.exe",
  );
  assert.equal(await updater.activeLaunch(), nextTarget);
  assert.equal(
    await readFile(join(userData, "finances.json"), "utf8"),
    finances,
  );
  assert.equal(
    await readFile(join(userData, "backups", "manual.json"), "utf8"),
    finances,
  );
  assert.equal(await readFile(join(updates, backup), "utf8"), finances);
  assert.equal(
    await readFile(join(updates, "finances-before-legacy-123.json"), "utf8"),
    finances,
  );
  await stopOwnedProcesses();
  await waitFor(
    async () => !(await runningAt(nextTarget)).length,
    "A versão redirecionada não fechou.",
    15000,
  );
  console.log(
    "Windows: duas atualizações reais, limpeza de versões/ZIPs/temporários, arquivos bloqueados, backups preservados e atalho original verificados.",
  );

  // A correctly hashed package that cannot load its renderer must roll back automatically.
  const broken = await candidate(badVersion, true);
  const oldPid = await launchOriginal(nextTarget);
  const rollback = await controller(
    badVersion,
    broken,
    oldPid,
    nextTarget,
    nextVersion,
  );
  await rollback.download();
  await rollback.apply();
  await app.close();
  app = undefined;
  const failure = await waitFor(async () => {
    const value = await journal();
    return value?.version === badVersion ? value : null;
  }, "A atualização com falha não foi revertida.");
  assert.equal(failure.success, false);
  assert.equal(
    JSON.parse(await readFile(join(updates, "active.json"), "utf8")).version,
    nextVersion,
  );
  await waitFor(
    async () => (await runningAt(nextTarget)).length,
    "A versão anterior não reabriu.",
    20000,
  );
  assert.equal(
    await readFile(join(userData, "finances.json"), "utf8"),
    finances,
  );
  await assertClean(nextVersion);
  assert.equal(
    await readFile(join(userData, "backups", "manual.json"), "utf8"),
    finances,
  );
  await stopOwnedProcesses();
  console.log(
    "Windows: versão que não consegue carregar os dados foi rejeitada; versão anterior reaberta e arquivo preservado.",
  );

  const invalid = await controller(badVersion, good);
  await assert.rejects(invalid.download(), /vers.o do pacote/);
  assert.equal((await invalid.info()).readyVersion, null);
  const maliciousZip = join(root, "unsafe.zip"),
    outside = join(updates, "outside.txt");
  await ps(`Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open(${quote(maliciousZip)}, [IO.Compression.ZipArchiveMode]::Create)
try { $null = $archive.CreateEntry('../../outside.txt') } finally { $archive.Dispose() }`);
  const unsafe = await controller(badVersion, await readFile(maliciousZip));
  await assert.rejects(unsafe.download(), /Caminho inv.lido/);
  await assert.rejects(readFile(outside), { code: "ENOENT" });
  assert.equal(
    await readFile(join(userData, "finances.json"), "utf8"),
    finances,
  );
  console.log(
    "Windows: pacote de versão diferente e ZIP com tentativa de sair da pasta foram rejeitados.",
  );
} catch (error) {
  for (const file of await readdir(updates).catch(() => [])) {
    if (file.endsWith(".log")) {
      const contents = (await readFile(join(updates, file), "utf8")).slice(
        -8000,
      );
      if (contents.trim())
        annotation("error", "Diagnóstico do helper Windows", contents);
    }
  }
  annotation(
    "error",
    "Falha no teste de atualização Windows",
    error.stack ?? error.message ?? error,
  );
  throw error;
} finally {
  await app?.close().catch(() => {});
  await stopOwnedProcesses().catch(() => {});
  if (oldEnv === undefined) delete process.env.SALDO_DATA_DIR;
  else process.env.SALDO_DATA_DIR = oldEnv;
  await rm(root, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 500,
  }).catch((error) => {
    annotation(
      "error",
      "Falha na limpeza do teste Windows",
      error.stack ?? error.message,
    );
    throw error;
  });
}
