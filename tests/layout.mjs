import {
  verifyChartTooltips,
  verifyNavigation,
  verifyMotion,
  verifyFeedback,
  verifySuggestionLayout,
} from "./design.mjs";
import { chromium, expect } from "playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import {
  verifyBrandLayout,
  verifyPageLayout,
  verifyTypography,
} from "./identity.mjs";

const tabs = [
  "Início",
  "Visão geral",
  "Minhas compras",
  "Meus cartões",
  "Planejamento",
  "Antecipações",
  "Entradas do mês",
  "Assinaturas",
  "Despesas",
  "Aparência",
  "Atualizações",
];
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4174",
    "--strictPort",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (data) => {
      if (data.toString().includes("4174")) resolve();
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
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4174");
  await page
    .getByRole("button", { name: "Experimentar exemplo", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await verifyMotion(page);
  await verifyFeedback(page);
  // Version 4 backups may contain a user-selected font. Importing them must not
  // re-enable font selection or change the new official typefaces.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("saldo-data-v1"));
    data.settings = {
      ...data.settings,
      theme: "light",
      font: "dm",
      motion: false,
    };
    localStorage.setItem("saldo-data-v1", JSON.stringify(data));
  });
  await page.reload();
  await verifyTypography(page);
  await verifyNavigation(page);
  await verifyChartTooltips(page);
  await mkdir(".runtime", { recursive: true });
  for (const theme of ["Escuro", "Ultra Dark", "Claro"]) {
    await page.getByRole("button", { name: "Aparência", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`^${theme}`) }).click();
    await page
      .getByRole("button", { name: "Aplicar aparência", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Visão geral", exact: true })
      .click();
    await verifyTypography(page);
    await page.getByRole("button", { name: "Início", exact: true }).click();
    await page.screenshot({
      path: `.runtime/welcome-${theme.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Visão geral", exact: true })
      .click();
    await page.screenshot({
      path: `.runtime/identity-theme-${theme.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
  }
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1040 });
    await verifyBrandLayout(page);
    if (width === 390) await verifySuggestionLayout(page, "Sugestão em 390 px");
    if (width === 390) {
      await verifyNavigation(page);
      await verifyChartTooltips(page);
    }
    for (const tab of tabs) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await verifyPageLayout(page, `${width}px / ${tab}`);
    }
    await page
      .getByRole("button", { name: "Visão geral", exact: true })
      .click();
    await page.screenshot({
      path: `.runtime/identity-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1040 });
  // Double the root text size without shrinking the viewport, exercising text
  // enlargement independently of native Electron page zoom.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "175%";
  });
  await verifySuggestionLayout(page, "Sugestão com texto a 200%");
  for (const tab of tabs) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await verifyPageLayout(page, `texto 200% / ${tab}`);
  }
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await page.screenshot({
    path: ".runtime/identity-text-200.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log(
    "Tipografia oficial, números tabulares, preferências antigas e onze telas entre 320 e 1440 px, com aumento de texto a 200%, verificados.",
  );
} catch (error) {
  if (browser) {
    await mkdir(".runtime", { recursive: true });
    await browser
      .contexts()[0]
      ?.pages()[0]
      ?.screenshot({ path: ".runtime/identity-failure.png", fullPage: true });
  }
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
