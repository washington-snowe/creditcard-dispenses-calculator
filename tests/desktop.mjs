import { _electron as electron, expect } from "playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFlow } from "./flow.mjs";
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
  const saved = JSON.parse(
    await readFile(join(directory, "finances.json"), "utf8"),
  );
  expect(saved.cards).toHaveLength(2);
  expect(saved.purchases).toHaveLength(1);
  expect(saved.purchases[0].paid).toBe(3);
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
