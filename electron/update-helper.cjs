// Runs using the application's bundled Node runtime, independently of its window.
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = async (file) =>
  JSON.parse((await fs.readFile(file, "utf8")).replace(/^\uFEFF/, ""));
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}
async function launch(executable, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      detached: true,
      windowsHide: false,
      stdio: "ignore",
      env,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve(child);
    });
  });
}
async function atomic(file, value) {
  const temporary = file + ".tmp";
  await fs.writeFile(temporary, JSON.stringify(value));
  await fs.rename(temporary, file);
}
async function main() {
  const config = await json(process.argv[2]);
  if (
    !Number.isInteger(config.pid) ||
    config.pid <= 0 ||
    !/^\d+\.\d+\.\d+$/.test(config.version)
  )
    throw new Error("Configuração do atualizador inválida.");
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => key.toUpperCase() !== "ELECTRON_RUN_AS_NODE",
    ),
  );
  let previous = null,
    child;
  try {
    previous = await fs.readFile(config.active, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.writeFile(
    config.helperReady,
    JSON.stringify({ nonce: config.nonce, version: config.version }),
  );
  try {
    const deadline = Date.now() + 60000;
    while (alive(config.pid)) {
      if (Date.now() >= deadline)
        throw new Error("A versão anterior não fechou.");
      await delay(250);
    }
    child = await launch(
      config.executable,
      ["--saldo-update-ack=" + config.nonce],
      env,
    );
    let exited = false;
    child.once("exit", () => {
      exited = true;
    });
    const readyUntil = Date.now() + 45000;
    let ready = false;
    while (Date.now() < readyUntil) {
      try {
        if ((await json(config.ack)).version === config.version) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for the new app to validate its data. */
      }
      if (exited) throw new Error("A nova versão não conseguiu abrir.");
      await delay(250);
    }
    if (!ready)
      throw new Error("A nova versão não confirmou a leitura dos dados.");
    await atomic(config.active, { version: config.version });
    await atomic(config.log, {
      success: true,
      version: config.version,
      processId: child.pid,
    });
  } catch (error) {
    if (child && alive(child.pid)) {
      await new Promise((resolve) => {
        const kill = spawn(
          "taskkill.exe",
          ["/PID", String(child.pid), "/T", "/F"],
          { windowsHide: true, stdio: "ignore" },
        );
        kill.once("error", resolve);
        kill.once("exit", resolve);
      });
    }
    if (previous === null) await fs.rm(config.active, { force: true });
    else await fs.writeFile(config.active, previous);
    await atomic(config.log, {
      success: false,
      version: config.version,
      message: error.message,
    }).catch(() => {});
    await launch(config.original, [], env);
  }
}
main().catch(async (error) => {
  await fs
    .writeFile(process.argv[2] + ".log", error.stack ?? String(error))
    .catch(() => {});
  process.exitCode = 1;
});
