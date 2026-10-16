import { verifyPhraseLayout } from "./audit.mjs";
import { goTo } from "./navigation.mjs";
import { verifyGoalDialog } from "./goals.mjs";
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
  "Boas-vindas",
  "Metas",
  "Calendário",
  "Pendências",
  "Simular compra",
  "Dados e segurança",
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
  await goTo(page, "Início");
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
    const month = new Date().toISOString().slice(0, 7);
    data.goals = [
      {
        id: "layout-saving",
        title: "Minha próxima conquista",
        description:
          "Um objetivo para acompanhar com os registros do programa.",
        kind: "saving",
        targetCents: 200000,
        startMonth: month,
        deadlineMonth: null,
        category: null,
        baselineCents: null,
        archived: false,
      },
      {
        id: "layout-spending",
        title: "Reduzir os gastos com alimentação",
        description: "Comparação com meu gasto de referência.",
        kind: "spending",
        targetCents: 30000,
        startMonth: month,
        deadlineMonth: null,
        category: "Alimentação",
        baselineCents: 40000,
        archived: false,
      },
    ];
    localStorage.setItem("saldo-data-v1", JSON.stringify(data));
  });
  await page.reload();
  await goTo(page, "Início");
  await verifyTypography(page);
  await verifyNavigation(page);
  await verifyChartTooltips(page);
  await mkdir(".runtime", { recursive: true });
  for (const theme of ["Escuro", "Ultra Dark", "Claro"]) {
    await goTo(page, "Aparência");
    await page.getByRole("button", { name: new RegExp(`^${theme}`) }).click();
    await page
      .getByRole("button", { name: "Aplicar aparência", exact: true })
      .click();
    await goTo(page, "Visão geral");
    const marks = await page.locator(".bank-mark").evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, border: style.borderWidth };
      }),
    );
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      expect(mark.background).toBe("rgba(0, 0, 0, 0)");
      expect(mark.border).toBe("0px");
    }
    await verifyTypography(page);
    await verifyPhraseLayout(page);
    await goTo(page, "Início");
    await page.screenshot({
      path: `.runtime/welcome-${theme.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
    await goTo(page, "Visão geral");
    await page.screenshot({
      path: `.runtime/identity-theme-${theme.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
  }
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1040 });
    await verifyPhraseLayout(page);
    await verifyBrandLayout(page);
    if (width === 390) await verifySuggestionLayout(page, "Sugestão em 390 px");
    if (width === 390) {
      await verifyNavigation(page);
      await verifyChartTooltips(page);
    }
    for (const tab of tabs) {
      await goTo(page, tab);
      await verifyPageLayout(page, `${width}px / ${tab}`);
      if (tab === "Simular compra" || tab === "Dados e segurança") {
        const controls = await page
          .locator(
            ".simulator-fields input, .simulator-fields select, .import-controls select",
          )
          .evaluateAll((nodes) =>
            nodes.map((el) => ({
              height: el.getBoundingClientRect().height,
              radius: parseFloat(getComputedStyle(el).borderRadius),
              font: getComputedStyle(el).fontFamily,
            })),
          );
        expect(controls.length).toBeGreaterThan(0);
        for (const control of controls) {
          expect(control.height).toBeGreaterThanOrEqual(44);
          expect(control.radius).toBeGreaterThanOrEqual(8);
          expect(control.font.startsWith("Inter")).toBeTruthy();
        }
      }
    }
    await goTo(page, "Visão geral");
    await page.screenshot({
      path: `.runtime/identity-${width}.png`,
      fullPage: true,
    });
    if (width <= 390) await verifyGoalDialog(page);
  }
  await page.setViewportSize({ width: 1440, height: 1040 });
  // Double the root text size without shrinking the viewport, exercising text
  // enlargement independently of native Electron page zoom.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "175%";
  });
  await verifyPhraseLayout(page);
  await verifySuggestionLayout(page, "Sugestão com texto a 200%");
  for (const tab of tabs) {
    await goTo(page, tab);
    await verifyPageLayout(page, `texto 200% / ${tab}`);
  }
  await verifyGoalDialog(page);
  // A high balance must reflow in dialogs when the user enlarges text.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("saldo-data-v1"));
    data.cards[0].name = "Cartão principal para compras e serviços";
    data.cards[0].limitCents = 100_000_000_000;
    data.purchases[0].totalCents = 99_999_999_999;
    data.purchases[0].paid = 0;
    data.settings.motion = false;
    localStorage.setItem("saldo-data-v1", JSON.stringify(data));
  });
  await page.reload();
  await expect(page.getByTestId("launch-welcome")).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "175%";
  });
  await goTo(page, "Meus cartões");
  await page
    .getByRole("button", { name: /^Ver detalhes do cartão/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollWidth - el.clientWidth))
    .toBeLessThanOrEqual(1);
  await dialog.press("Escape");
  await goTo(page, "Minhas compras");
  await page.getByRole("button", { name: "Nova compra", exact: true }).click();
  await page
    .getByLabel("Descrição da compra", { exact: true })
    .fill("Compra com valor alto para conferir a prévia ampliada");
  await page
    .getByLabel("Valor total da compra", { exact: true })
    .fill("999999999,99");
  await expect
    .poll(() => dialog.evaluate((el) => el.scrollWidth - el.clientWidth))
    .toBeLessThanOrEqual(1);
  await dialog.press("Escape");
  await goTo(page, "Visão geral");
  await page.screenshot({
    path: ".runtime/identity-text-200.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log(
    "Tipografia oficial, números tabulares, preferências antigas e dezessete telas entre 320 e 1440 px, com aumento de texto a 200%, verificados.",
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
