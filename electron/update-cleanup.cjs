// Only updater-owned paths may be removed. User records and every backup stay outside
// this allowlist; even a misplaced data file or a directory link prevents removal.
// Electron's normal fs treats app.asar as a virtual directory. A recursive rm
// can open/cache the OLD archive and lock it on Windows. Use the real filesystem
// here so archives remain ordinary files, without touching the running archive.
const fs = process.versions.electron
  ? require("original-fs").promises
  : require("node:fs/promises");
const path = require("node:path");
const VERSION = /^\d+\.\d+\.\d+$/;
const UUID = "[a-f\\d]{8}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{12}";
const STAGE = new RegExp(`^${UUID}$`);
const TEMPORARY = new RegExp(
  `^(?:\\d+\\.\\d+\\.\\d+\\.zip(?:\\.part)?|prepare\\.ps1|(?:helper-|helper-ready-|ready-)${UUID}\\.(?:cjs|json)(?:\\.log)?)$`,
);
async function plainDirectory(directory) {
  try {
    const stat = await fs.lstat(directory);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
async function disposable(directory, budget = { entries: 25000 }) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (--budget.entries < 0 || entry.isSymbolicLink()) return false;
    if (
      /^finances(?:\.json(?:\.tmp)?|-before-)/i.test(entry.name) ||
      /backup/i.test(entry.name)
    )
      return false;
    if (
      entry.isDirectory() &&
      !(await disposable(path.join(directory, entry.name), budget))
    )
      return false;
  }
  return true;
}
async function cleanupUpdates({
  userData,
  currentVersion,
  executable,
  keepVersions = [],
}) {
  const root = path.join(userData, "updates");
  if (!VERSION.test(currentVersion) || !(await plainDirectory(root))) return;
  const keep = new Set([currentVersion, ...keepVersions]);
  // Preserve the committed version even when an older portable launcher is running.
  try {
    const pointer = JSON.parse(
      (await fs.readFile(path.join(root, "active.json"), "utf8")).replace(
        /^\uFEFF/,
        "",
      ),
    );
    if (!VERSION.test(pointer.version)) return;
    keep.add(pointer.version);
  } catch (error) {
    if (error.code !== "ENOENT") return; // Ambiguous state must never trigger deletion.
  }
  const versions = path.join(root, "versions");
  if (executable) {
    const relative = path.relative(versions, executable).split(path.sep);
    if (VERSION.test(relative[0])) keep.add(relative[0]);
  }
  async function remove(directory, name, recursive) {
    const target = path.join(directory, name);
    try {
      const stat = await fs.lstat(target);
      if (stat.isSymbolicLink()) return;
      if (recursive && (!stat.isDirectory() || !(await disposable(target))))
        return;
      if (!recursive && !stat.isFile()) return;
      await fs.rm(target, {
        force: true,
        recursive,
        maxRetries: 3,
        retryDelay: 500,
      });
    } catch {
      // Windows may still hold the old executable. Retry on the next launch/update.
      // Cleanup must never turn a successful update into a rollback.
    }
  }
  if (await plainDirectory(versions)) {
    for (const name of await fs.readdir(versions)) {
      if (VERSION.test(name) && !keep.has(name))
        await remove(versions, name, true);
    }
  }
  const staging = path.join(root, "staging");
  if (await plainDirectory(staging)) {
    for (const name of await fs.readdir(staging)) {
      if (STAGE.test(name)) await remove(staging, name, true);
    }
  }
  for (const name of await fs.readdir(root)) {
    if (TEMPORARY.test(name)) await remove(root, name, false);
  }
}
module.exports = { cleanupUpdates };
