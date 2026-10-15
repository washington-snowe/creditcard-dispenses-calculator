const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const MAX_BYTES = 5_000_000,
  LIMIT = 30;
function usable(text) {
  const d = JSON.parse(text);
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.cards) ||
    !Array.isArray(d.purchases) ||
    Buffer.byteLength(text) > MAX_BYTES
  )
    throw new Error("Backup inválido.");
  return d;
}
function createBackups(directory) {
  const root = path.join(directory, "backups");
  const valid = (id) =>
    typeof id === "string" && /^backup-\d{13}-[a-f0-9-]{36}\.json$/.test(id);
  async function list() {
    let files;
    try {
      files = await fs.readdir(root);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
    return (
      await Promise.all(
        files.filter(valid).map(async (id) => {
          const stat = await fs.stat(path.join(root, id));
          return {
            id,
            createdAt: new Date(Number(id.slice(7, 20))).toISOString(),
            bytes: stat.size,
          };
        }),
      )
    ).sort((a, b) => b.id.localeCompare(a.id));
  }
  async function snapshot(text, force = false, now = Date.now()) {
    usable(text);
    const entries = await list();
    if (
      !force &&
      entries.length &&
      now - Number(entries[0].id.slice(7, 20)) < 86400000
    )
      return false;
    await fs.mkdir(root, { recursive: true });
    const id = `backup-${String(now).padStart(13, "0")}-${randomUUID()}.json`;
    const file = await fs.open(path.join(root, id), "wx", 0o600);
    try {
      await file.writeFile(text, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    for (const old of (await list()).slice(LIMIT))
      await fs.unlink(path.join(root, old.id));
    return true;
  }
  async function read(id) {
    if (!valid(id)) throw new Error("Cópia de segurança inválida.");
    const target = path.join(root, id),
      stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES)
      throw new Error("Cópia de segurança inválida.");
    return usable(await fs.readFile(target, "utf8"));
  }
  return { list, snapshot, read };
}
module.exports = { createBackups };
