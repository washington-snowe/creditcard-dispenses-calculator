import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  rm,
  readFile,
  writeFile,
  mkdir,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const { createBackups } = createRequire(import.meta.url)(
  "../electron/backups.cjs",
);
test("backups diários são atômicos, limitados, recuperáveis e não aceitam caminhos externos", async () => {
  const root = await mkdtemp(join(tmpdir(), "contaclara-backups-"));
  try {
    const backups = createBackups(root),
      json = JSON.stringify({
        version: 1,
        cards: [],
        purchases: [],
        settings: { theme: "dark" },
      }),
      now = 1792060000000;
    assert.deepEqual(await backups.list(), []);
    assert.equal(await backups.snapshot(json, false, now), true);
    assert.equal(await backups.snapshot(json, false, now + 1000), false);
    for (let i = 1; i <= 35; i++)
      await backups.snapshot(json, true, now + i * 1000);
    const list = await backups.list();
    assert.equal(list.length, 30);
    assert.deepEqual(await backups.read(list[0].id), JSON.parse(json));
    await assert.rejects(backups.read("../finances.json"));
    await assert.rejects(backups.snapshot('{"broken":true}', true));
    assert.equal((await backups.list()).length, 30);
    await writeFile(join(root, "backups", list[0].id), "broken");
    await assert.rejects(backups.read(list[0].id));
    assert.deepEqual(await backups.read(list[1].id), JSON.parse(json));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pastas e links com nome de backup não bloqueiam cópias e permanecem intactos", async () => {
  const root = await mkdtemp(join(tmpdir(), "contaclara-backup-entries-"));
  try {
    const now = 1792060000000;
    const misleading =
      "backup-1792160000000-00000000-0000-0000-0000-000000000000.json";
    await mkdir(join(root, "backups", misleading), { recursive: true });
    await writeFile(join(root, "backups", misleading, "keep.txt"), "preserve");
    if (process.platform !== "win32")
      await symlink(
        join(root, "missing"),
        join(
          root,
          "backups",
          "backup-1792160000001-00000000-0000-0000-0000-000000000000.json",
        ),
      );
    const backups = createBackups(root);
    assert.deepEqual(await backups.list(), []);
    const json = JSON.stringify({ version: 1, cards: [], purchases: [] });
    assert.equal(await backups.snapshot(json, false, now), true);
    for (let i = 1; i <= 31; i++)
      await backups.snapshot(json, true, now + i * 1000);
    const entries = await backups.list();
    assert.equal(entries.length, 30);
    assert.deepEqual(await backups.read(entries[0].id), JSON.parse(json));
    assert.equal(
      await readFile(join(root, "backups", misleading, "keep.txt"), "utf8"),
      "preserve",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
