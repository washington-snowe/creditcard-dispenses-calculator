import { _electron as electron, expect } from "playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFlow } from "./flow.mjs";
import { runEnhancements } from "./enhancements.mjs";
import { runMoney } from "./money.mjs";
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
  expect(await page.evaluate(() => typeof window.saldo?.save)).toBe("function");
  expect(await page.evaluate(() => typeof window.require)).toBe("undefined");
  await app.close();
  app = undefined;
  app = await electron.launch({
    executablePath,
    args,
    env: { ...process.env, SALDO_DATA_DIR: directory },
  });
  const restarted = await app.firstWindow();
  await expect(
    restarted.getByRole("heading", { name: "Tudo sob controle." }),
  ).toBeVisible();
  await expect(restarted.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(restarted.getByTestId("total-debt")).toHaveText(/1\.900,00/);
  await restarted
    .getByRole("button", { name: "Entradas do mês", exact: true })
    .click();
  await expect(restarted.getByTestId("cash-remaining")).toHaveText(/4\.050,00/);
  await restarted
    .getByRole("button", { name: "Minhas compras", exact: true })
    .click();
  await restarted
    .getByRole("button", { name: "Quitadas", exact: true })
    .click();
  await expect(restarted.locator(".purchase-table tbody")).toContainText(
    "Teste de centavos",
  );
  expect(errors).toEqual([]);
  await app.close();
  app = undefined;
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
