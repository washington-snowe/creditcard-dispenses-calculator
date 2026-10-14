const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const { prepareScript, applyScript } = require("./update-scripts.cjs");
const REPOSITORY =
  "https://github.com/washington-snowe/creditcard-dispenses-calculator";
const ASSET = "Saldo-Windows-x64.zip";
function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match || match.slice(1).some((v) => !Number.isSafeInteger(Number(v))))
    throw new Error("Versão inválida na atualização.");
  return match.slice(1).map(Number);
}
function newer(candidate, current) {
  const a = parseVersion(candidate),
    b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
function trustedUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    ![
      "github.com",
      "release-assets.githubusercontent.com",
      "objects.githubusercontent.com",
      "github-releases.githubusercontent.com",
    ].includes(url.hostname)
  )
    throw new Error("Destino de atualização não autorizado.");
  return url;
}
function checksum(text) {
  if (text.length > 16384) throw new Error("Arquivo de checksum inválido.");
  const line = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .find((line) => /^[a-f\d]{64}\s+\*?Saldo-Windows-x64\.zip\s*$/i.test(line));
  if (!line) throw new Error("Checksum da versão indisponível.");
  return line.trim().split(/\s+/)[0].toLowerCase();
}
function runPowerShell(file, detached = false) {
  return new Promise((resolve, reject) => {
    // A PowerShell 7 launcher can pass module paths incompatible with Windows PowerShell 5.1.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "PSMODULEPATH",
      ),
    );
    const executable =
      process.platform === "win32"
        ? path.join(
            process.env.SystemRoot || "C:\\Windows",
            "System32",
            "WindowsPowerShell",
            "v1.0",
            "powershell.exe",
          )
        : "powershell.exe";
    const child = spawn(
      executable,
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        file,
      ],
      {
        cwd: path.dirname(file),
        windowsHide: true,
        detached,
        env,
        stdio: detached ? "ignore" : ["ignore", "pipe", "pipe"],
      },
    );
    child.on("error", reject);
    if (detached) {
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
      return;
    }
    let output = "";
    child.stdout.on("data", (chunk) => {
      output = (output + chunk).slice(-6000);
    });
    child.stderr.on("data", (chunk) => {
      output = (output + chunk).slice(-6000);
    });
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `Não foi possível preparar a atualização: ${output.trim()}`,
            ),
          ),
    );
  });
}
function createUpdater(options) {
  const {
    currentVersion,
    userData,
    onProgress = () => {},
    fetch: fetcher = fetch,
    platform = process.platform,
    arch = process.arch,
    packaged = false,
    executable = process.execPath,
    pid = process.pid,
    prepare = runPowerShell,
  } = options;
  parseVersion(currentVersion);
  const root = path.join(userData, "updates");
  const active = path.join(root, "active.json");
  const log = path.join(root, "last-update.json");
  const canInstall = platform === "win32" && arch === "x64" && packaged;
  let controller, prepared, latest;
  async function request(url, signal) {
    trustedUrl(url);
    const response = await fetcher(url, {
      signal,
      redirect: "follow",
      headers: { "User-Agent": `Saldo/${currentVersion}` },
    });
    if (response.url) trustedUrl(response.url);
    if (!response.ok)
      throw new Error(
        `GitHub respondeu ${response.status}. Verifique sua conexão e tente novamente.`,
      );
    return response;
  }
  async function info() {
    let lastUpdate = null;
    try {
      lastUpdate = JSON.parse(
        (await fs.readFile(log, "utf8")).replace(/^\uFEFF/, ""),
      );
    } catch {
      /* No update has been applied yet. */
    }
    return {
      currentVersion,
      canInstall,
      repository: REPOSITORY,
      lastUpdate,
      ...(latest ?? {}),
      readyVersion: prepared?.version ?? null,
      downloading: !!controller,
    };
  }
  async function check(signal) {
    const response = await request(
      `${REPOSITORY}/releases/latest`,
      signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
    );
    const final = new URL(response.url);
    const prefix =
      "/washington-snowe/creditcard-dispenses-calculator/releases/tag/";
    if (final.hostname !== "github.com" || !final.pathname.startsWith(prefix))
      throw new Error("A versão publicada não foi encontrada no GitHub.");
    const tag = decodeURIComponent(final.pathname.slice(prefix.length));
    parseVersion(tag);
    const version = tag.replace(/^v/, "");
    const available = newer(version, currentVersion);
    latest = {
      version,
      available,
      releaseUrl: `${REPOSITORY}/releases/tag/${tag}`,
      downloadUrl: `${REPOSITORY}/releases/download/${tag}/${ASSET}`,
    };
    return { ...(await info()), ...latest };
  }
  async function download() {
    if (!canInstall)
      throw new Error(
        "A instalação automática está disponível no aplicativo empacotado para Windows de 64 bits.",
      );
    if (controller) throw new Error("Uma atualização já está em andamento.");
    controller = new AbortController();
    prepared = null;
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(600000),
    ]);
    let partial;
    try {
      const release = await check(signal);
      if (!release.available)
        throw new Error("Você já está usando a versão mais recente.");
      const tag = "v" + release.version;
      const expected = checksum(
        await (
          await request(
            `${REPOSITORY}/releases/download/${tag}/SHA256SUMS.txt`,
            signal,
          )
        ).text(),
      );
      await fs.mkdir(root, { recursive: true });
      const zip = path.join(root, `${release.version}.zip`);
      partial = zip + ".part";
      const response = await request(release.downloadUrl, signal);
      if (!response.body)
        throw new Error("O download não retornou um arquivo.");
      const total = Number(response.headers.get("content-length")) || 0;
      if (total > 500000000) throw new Error("Atualização grande demais.");
      const file = await fs.open(partial, "w", 0o600),
        hash = createHash("sha256");
      let received = 0;
      try {
        for await (const chunk of response.body) {
          if (signal.aborted) throw new Error("Download cancelado.");
          received += chunk.length;
          if (received > 500000000)
            throw new Error("Atualização grande demais.");
          hash.update(chunk);
          await file.writeFile(chunk);
          onProgress({
            received,
            total,
            percent: total
              ? Math.min(100, Math.floor((received / total) * 100))
              : null,
            phase: "download",
          });
        }
        await file.sync();
      } finally {
        await file.close();
      }
      if (!received || hash.digest("hex") !== expected)
        throw new Error(
          "O checksum do arquivo não confere. O aplicativo atual foi preservado.",
        );
      await fs.rename(partial, zip);
      partial = null;
      const nonce = randomUUID();
      const stage = path.join(root, "staging", nonce),
        destination = path.join(root, "versions", release.version);
      const script = path.join(root, "prepare.ps1");
      await fs.writeFile(
        script,
        "\uFEFF" +
          prepareScript({
            zip,
            stage,
            destination,
            version: release.version,
            hash: expected,
          }),
        { mode: 0o600 },
      );
      onProgress({ phase: "verify", percent: 100, received, total });
      await prepare(script);
      if (signal.aborted) throw new Error("Download cancelado.");
      prepared = { version: release.version, destination, nonce };
      onProgress({
        phase: "ready",
        version: release.version,
        percent: 100,
        received,
        total,
      });
      return { version: release.version, ready: true };
    } catch (error) {
      const message = signal.aborted
        ? "Download cancelado ou tempo de espera excedido. Tente novamente."
        : error.message;
      onProgress({
        phase: "error",
        message,
        percent: null,
        received: 0,
        total: 0,
      });
      throw new Error(message);
    } finally {
      if (partial) await fs.rm(partial, { force: true }).catch(() => {});
      controller = null;
    }
  }
  async function apply() {
    if (!canInstall || !prepared)
      throw new Error("Baixe e verifique a atualização antes de instalar.");
    const { version, destination, nonce } = prepared;
    const target = path.join(destination, "Saldo-win32-x64", "saldo.exe");
    await fs.access(target);
    try {
      await fs.copyFile(
        path.join(userData, "finances.json"),
        path.join(root, `finances-before-${version}-${Date.now()}.json`),
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const script = path.join(root, `apply-${nonce}.ps1`);
    await fs.writeFile(
      script,
      "\uFEFF" +
        applyScript({
          version,
          nonce,
          pid,
          executable: target,
          original: executable,
          active,
          log,
          ack: path.join(root, `ready-${nonce}.json`),
        }),
      { mode: 0o600 },
    );
    await runPowerShell(script, true);
    return { restarting: true };
  }
  async function activeLaunch() {
    if (!canInstall) return null;
    try {
      const pointer = JSON.parse(
        (await fs.readFile(active, "utf8")).replace(/^\uFEFF/, ""),
      );
      if (!newer(pointer.version, currentVersion)) return null;
      const target = path.join(
        root,
        "versions",
        pointer.version,
        "Saldo-win32-x64",
        "saldo.exe",
      );
      await fs.access(target);
      return target;
    } catch {
      return null;
    }
  }
  async function ready(args = process.argv) {
    const arg = args.find((arg) =>
      /^--saldo-update-ack=[a-f\d-]{36}$/.test(arg),
    );
    if (arg) {
      const nonce = arg.split("=")[1];
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(
        path.join(root, `ready-${nonce}.json`),
        JSON.stringify({ version: currentVersion }),
        { mode: 0o600 },
      );
    }
  }
  return {
    info,
    check,
    download,
    apply,
    activeLaunch,
    ready,
    cancel: () => controller?.abort(),
  };
}
module.exports = {
  createUpdater,
  parseVersion,
  newer,
  trustedUrl,
  checksum,
  REPOSITORY,
};
