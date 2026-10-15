import { packager } from "@electron/packager";
import { resolve } from "node:path";
const platform = process.env.SALDO_PLATFORM || process.platform;
const outputs = await packager({
  dir: ".",
  name: "Saldo",
  out: "release",
  overwrite: true,
  asar: true,
  platform,
  ...(platform === "win32"
    ? { icon: resolve("public/brand/icon.ico") }
    : platform === "linux"
      ? { icon: resolve("public/brand/icon.png") }
      : {}),
  arch: process.env.SALDO_ARCH || process.arch,
  executableName: "saldo",
  appBundleId: "com.saldo.desktop",
  win32metadata: {
    ProductName: "ContaClara",
    FileDescription: "ContaClara — Finanças pessoais",
  },
  ignore: [
    /^\/release($|\/)/,
    /^\/tests($|\/)/,
    /^\/.git($|\/)/,
    /^\/.cache($|\/)/,
    /^\/.runtime($|\/)/,
    /^\/src($|\/)/,
    /^\/scripts($|\/)/,
    /^\/playwright-report($|\/)/,
  ],
  download: { cacheRoot: resolve(".cache/electron") },
});
for (const output of outputs)
  console.log(`Aplicativo desktop criado em ${output}`);
