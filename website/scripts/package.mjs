import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  copyFile,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const { version } = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
if (!/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Versão inválida para o ZIP do site.");
const stage = await mkdtemp(join(tmpdir(), "contaclara-site-"));
try {
  const folder = join(stage, "ContaClara-Site");
  await mkdir(folder);
  // Explicit allowlist: dependencies, private env files and test artifacts stay out.
  for (const item of [
    "src",
    "public",
    "docs",
    "tests",
    "scripts",
    "dist",
    "package.json",
    "package-lock.json",
    "README.md",
    ".env.example",
    "firebase.json",
    "firestore.rules",
    "index.html",
    "tsconfig.json",
    "vite.config.ts",
  ]) {
    await cp(join(root, item), join(folder, item), { recursive: true });
  }
  const filename = `ContaClara-Site-v${version}.zip`;
  const archive = join(stage, filename);
  execFileSync("zip", ["-qr", archive, "ContaClara-Site"], {
    cwd: stage,
    stdio: "inherit",
  });
  execFileSync("unzip", ["-tq", archive], { stdio: "inherit" });
  const destination = resolve(root, "downloads");
  await mkdir(destination, { recursive: true });
  await copyFile(archive, join(destination, filename));
  const hash = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  await writeFile(
    join(destination, "ContaClara-Site-SHA256SUMS.txt"),
    `${hash}  ${filename}\n`,
  );
  console.log(`Site preparado: ${join(destination, filename)}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
