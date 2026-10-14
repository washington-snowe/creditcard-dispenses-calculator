import { packager } from "@electron/packager";
import { resolve } from "node:path";
const outputs = await packager({
  dir: ".",
  name: "Saldo",
  out: "release",
  overwrite: true,
  asar: true,
  platform: process.env.SALDO_PLATFORM || process.platform,
  arch: process.env.SALDO_ARCH || process.arch,
  executableName: "saldo",
  appBundleId: "com.saldo.desktop",
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
