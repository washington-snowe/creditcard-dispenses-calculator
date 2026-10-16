import { expect } from "playwright/test";
import { goTo } from "./navigation.mjs";
export async function verifyGreeting(page) {
  await expect(page.getByTestId("launch-welcome")).toBeVisible();
  const phrase = page.getByTestId("welcome-phrase");
  await expect(phrase).toHaveAttribute("aria-busy", "false");
  const id = await phrase.getAttribute("data-phrase-id");
  expect(Number(id)).toBeGreaterThanOrEqual(0);
  expect(Number(id)).toBeLessThan(200);
  const before = await page.evaluate(() =>
    window.saldo ? window.saldo.load() : localStorage.getItem("saldo-data-v1"),
  );
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator(".greeting-grid button")).toHaveCount(6);
  await expect(page.getByLabel("Escolher mês")).toHaveCount(0);
  for (const [name, heading] of [
    ["Cuidar das minhas metas", "Metas"],
    ["Revisar minhas contas", "Pendências"],
    ["Planejar próximos meses", "Previsão mensal"],
  ]) {
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await goTo(page, "Boas-vindas");
    await expect(phrase).toHaveAttribute("data-phrase-id", id);
  }
  for (const [name, label] of [
    ["Cadastrar meu primeiro cartão", "Nome do cartão"],
    ["Registrar uma entrada", "Descrição"],
  ]) {
    const button = page.getByRole("button", { name: new RegExp(`^${name}`) });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    if (label === "Nome do cartão")
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    else
      await expect(
        page.getByRole("heading", { name: "Uma nova entrada", exact: true }),
      ).toBeVisible();
    await page.getByRole("dialog").press("Escape");
  }
  await page.reload();
  await expect(page.getByTestId("launch-welcome")).toBeVisible();
  await expect(phrase).toHaveAttribute("aria-busy", "false");
  const after = await page.evaluate(() =>
    window.saldo ? window.saldo.load() : localStorage.getItem("saldo-data-v1"),
  );
  expect(after).toEqual(before);
  if (await page.evaluate(() => !!window.saldo?.welcomeInfo))
    await expect(phrase).toHaveAttribute("data-phrase-id", id);
  else await expect(phrase).not.toHaveAttribute("data-phrase-id", id);
  console.log(
    "Boas-vindas padrão, atalhos por teclado, frase da sessão e preservação dos dados verificados.",
  );
}
