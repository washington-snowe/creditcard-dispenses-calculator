import { chromium, expect } from "playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { runFlow } from "./flow.mjs";
import { runEnhancements } from "./enhancements.mjs";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (d.toString().includes("4173")) resolve();
    });
    server.on("error", reject);
    server.on("exit", (code) =>
      reject(new Error(`Servidor finalizou: ${code}`)),
    );
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1040 },
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173");
  await runFlow(page);
  await runEnhancements(page);
  const backup = await page.evaluate(() =>
    localStorage.getItem("saldo-data-v1"),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(
    page.getByRole("heading", { name: "Restaurar backup?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup", exact: true })
    .click();
  await expect((await download).suggestedFilename()).toMatch(
    /^saldo-backup-.*\.json$/,
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("status")).toContainText(
    "Não foi possível importar",
  );
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Experimentar exemplo" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.waitForTimeout(800);
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Fechar aviso" }).click();
  await mkdir(".runtime", { recursive: true });
  await page.screenshot({ path: ".runtime/overview.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("total-debt")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: ".runtime/mobile.png", fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    "Backup, restauração, rejeição de arquivo inválido e layout responsivo verificados. Nenhum erro de JavaScript.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
