import { runFormAssistance } from "./form-assistance.mjs";
import { verifyChartTooltips, verifyNavigation } from "./design.mjs";
import { _electron as electron, expect } from "playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFlow } from "./flow.mjs";
import { runEnhancements } from "./enhancements.mjs";
import { runNewPlanning } from "./new-planning.mjs";
import { runMoney } from "./money.mjs";
import { verifyPageLayout, verifyTypography } from "./identity.mjs";
// Surface native test failures in Actions annotations, including packaged-only
// failures whose logs require an authenticated GitHub session to view.
process.on("uncaughtExceptionMonitor", (error) => {
  const detail = String(error.stack ?? error)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.error(`::error title=Desktop validation::${detail}`);
});
const directory = await mkdtemp(join(tmpdir(), "saldo-desktop-test-"));
let app;
const executablePath = process.env.SALDO_EXECUTABLE;
const args = executablePath ? [] : ["."];
if (process.env.SALDO_HEADLESS === "1") args.push("--ozone-platform=headless");
try {
  app = await electron.launch({
    executablePath,
    args,
    env: { ...process.env, SALDO_DATA_DIR: directory },
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await runFlow(page);
  await runEnhancements(page);
  const saved = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(saved.cards).toHaveLength(2);
  expect(saved.purchases).toHaveLength(4);
  expect(saved.purchases[0].paid).toBe(3);
  expect(saved.payments).toHaveLength(2);
  expect(saved.settings.theme).toBe("dark");
  await runMoney(page);
  const withMoney = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(withMoney.cashEntries).toHaveLength(2);
  expect(withMoney.subscriptions).toHaveLength(2);
  expect(withMoney.subscriptionPayments).toHaveLength(2);
  await runNewPlanning(page);
  await runFormAssistance(page);
  const expanded = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(expanded.recurringIncomes).toHaveLength(1);
  expect(expanded.incomeReceipts).toHaveLength(1);
  expect(expanded.expenses).toHaveLength(1);
  expect(expanded.settings.accent).toBe("#20c7a0");
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await verifyTypography(page);
  await verifyNavigation(page);
  const zoomRoles = await app.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    return ["zoom-in", "zoom-out", "zoom-reset"].map(
      (id) => menu.getMenuItemById(id)?.role,
    );
  });
  expect(zoomRoles).toEqual(["zoomin", "zoomout", "resetzoom"]);
  for (const factor of [1.25, 2]) {
    await app.evaluate(({ BrowserWindow }, zoom) => {
      BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(zoom);
    }, factor);
    for (const tab of [
      "Início",
      "Visão geral",
      "Minhas compras",
      "Meus cartões",
      "Entradas do mês",
      "Aparência",
    ]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await verifyPageLayout(page, `Electron / zoom ${factor * 100}% / ${tab}`);
    }
    await verifyChartTooltips(page);
  }
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1);
  });
  console.log(
    "Fontes oficiais, controles nativos e layout com zoom real a 125% e 200% verificados no Electron.",
  );
  expect(await page.evaluate(() => typeof window.saldo?.save)).toBe("function");
  expect(await page.evaluate(() => typeof window.require)).toBe("undefined");
  await page.getByRole("button", { name: "Aparência", exact: true }).click();
  await expect(
    page.getByLabel("Usar aceleração de hardware", { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Usar aceleração de hardware", { exact: true })
    .uncheck();
  await expect(page.getByTestId("performance-status")).toContainText(
    "Reinício necessário",
  );
  const preferenceSaved = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(preferenceSaved.settings.hardwareAcceleration).toBe(false);
  for (const field of [
    "cards",
    "purchases",
    "payments",
    "cashEntries",
    "expenses",
    "recurringIncomes",
    "incomeReceipts",
    "subscriptions",
    "subscriptionPayments",
  ])
    expect(preferenceSaved[field]).toEqual(expanded[field]);
  // Observe the native relaunch request without leaving an unowned child
  // process. The next launches below exercise the real pre-ready decision.
  await app.evaluate(({ app }) => {
    globalThis.restartProbe = {
      relaunch: app.relaunch,
      quit: app.quit,
      relaunches: 0,
      quits: 0,
    };
    app.relaunch = () => {
      globalThis.restartProbe.relaunches++;
    };
    app.quit = () => {
      globalThis.restartProbe.quits++;
    };
  });
  await page
    .getByRole("button", { name: "Reiniciar para aplicar", exact: true })
    .click();
  await expect
    .poll(() => app.evaluate(() => globalThis.restartProbe.quits))
    .toBe(1);
  expect(await app.evaluate(() => globalThis.restartProbe.relaunches)).toBe(1);
  await app.evaluate(({ app }) => {
    app.relaunch = globalThis.restartProbe.relaunch;
    app.quit = globalThis.restartProbe.quit;
    delete globalThis.restartProbe;
  });
  await app.close();
  app = undefined;
  app = await electron.launch({
    executablePath,
    args,
    env: { ...process.env, SALDO_DATA_DIR: directory },
  });
  const restarted = await app.firstWindow();
  await expect(
    restarted.getByRole("heading", { name: "Boas-vindas ao ContaClara." }),
  ).toBeVisible();
  expect(
    await app.evaluate(({ app }) => app.isHardwareAccelerationEnabled()),
  ).toBe(false);
  const disabledInfo = await restarted.evaluate(() =>
    window.saldo.performanceInfo(),
  );
  expect(disabledInfo.enabledAtLaunch).toBe(false);
  expect(disabledInfo.accelerationEnabled).toBe(false);

  await expect(restarted.locator("html")).toHaveAttribute(
    "data-theme",
    "ultra",
  );
  await restarted
    .getByRole("button", { name: "Visão geral", exact: true })
    .click();
  await expect(restarted.getByTestId("total-debt")).toHaveText(/1\.900,00/);
  await restarted
    .getByRole("button", { name: "Entradas do mês", exact: true })
    .click();
  await expect(restarted.getByTestId("cash-remaining")).toHaveText(/5\.450,00/);
  await restarted
    .getByRole("button", { name: "Minhas compras", exact: true })
    .click();
  await restarted
    .getByRole("button", { name: "Quitadas", exact: true })
    .click();
  await expect(restarted.locator(".purchase-table tbody")).toContainText(
    "Teste de centavos",
  );
  await restarted
    .getByRole("button", { name: "Aparência", exact: true })
    .click();
  await expect(restarted.getByTestId("performance-status")).toContainText(
    "Aceleração desativada",
  );
  await expect(
    restarted.getByRole("button", {
      name: "Reiniciar para aplicar",
      exact: true,
    }),
  ).toHaveCount(0);
  await restarted
    .getByLabel("Usar aceleração de hardware", { exact: true })
    .check();
  await expect(restarted.getByTestId("performance-status")).toContainText(
    "Reinício necessário",
  );
  expect(errors).toEqual([]);
  await app.close();
  app = undefined;
  app = await electron.launch({
    executablePath,
    args,
    env: { ...process.env, SALDO_DATA_DIR: directory },
  });
  const enabledAgain = await app.firstWindow();
  await enabledAgain
    .getByRole("button", { name: "Aparência", exact: true })
    .click();
  await expect(
    enabledAgain.getByLabel("Usar aceleração de hardware", { exact: true }),
  ).toBeChecked();
  await expect(enabledAgain.getByTestId("performance-status")).toContainText(
    "Aceleração permitida",
  );
  expect(
    (await enabledAgain.evaluate(() => window.saldo.performanceInfo()))
      .enabledAtLaunch,
  ).toBe(true);
  const enabledData = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(enabledData.settings.hardwareAcceleration).toBe(true);
  expect(enabledData.purchases).toEqual(preferenceSaved.purchases);
  expect(enabledData.cashEntries).toEqual(preferenceSaved.cashEntries);
  await app.close();
  app = undefined;
  console.log(
    "Aceleração desativada antes de ready, reativação, botão de reinício e preservação financeira verificados no Electron.",
  );
  const legacy = {
    version: 1,
    cards: saved.cards,
    purchases: [
      {
        id: "legacy",
        description: "Compra da versão 1",
        cardId: saved.cards[0].id,
        category: "Compras",
        totalCents: 10000,
        installments: 3,
        paid: 1,
        nextMonth: new Date().toISOString().slice(0, 7),
      },
    ],
  };
  const legacyJson = JSON.stringify(legacy);
  await writeFile(join(directory, "finances.json"), legacyJson, "utf8");
  app = await electron.launch({
    executablePath,
    args,
    env: { ...process.env, SALDO_DATA_DIR: directory },
  });
  const upgraded = await app.firstWindow();
  await upgraded
    .getByRole("button", { name: "Visão geral", exact: true })
    .click();
  await expect(upgraded.getByTestId("total-debt")).toHaveText(/66,66/);
  expect(await readFile(join(directory, "finances.json"), "utf8")).toBe(
    legacyJson,
  );
  await upgraded.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(upgraded.locator("html")).toHaveAttribute("data-theme", "dark");
  const migrated = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(migrated.cards).toEqual(legacy.cards);
  expect(migrated.purchases).toEqual(legacy.purchases);
  await app.close();
  app = undefined;
  await writeFile(join(directory, "finances.json"), "invalid-json", "utf8");
  app = await electron.launch({
    executablePath,
    args,
    env: { ...process.env, SALDO_DATA_DIR: directory },
  });
  const recovery = await app.firstWindow();
  await expect(recovery.getByRole("alert")).toContainText(
    "Não foi possível carregar",
  );
  expect(await readFile(join(directory, "finances.json"), "utf8")).toBe(
    "invalid-json",
  );
  console.log(
    "Electron verificado: interface real, IPC, arquivo JSON, isolamento do renderer e persistência após reiniciar.",
  );
} finally {
  await app?.close();
  await rm(directory, { recursive: true, force: true });
}
