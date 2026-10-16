import { expect } from "playwright/test";
import { goTo } from "./navigation.mjs";
export async function verifyFunctionSearch(page, { resize = true } = {}) {
  if (resize) await page.setViewportSize({ width: 1440, height: 1040 });
  await expect(page.locator("main")).toBeVisible();
  const search = page.getByRole("combobox", {
    name: "Buscar funções",
    exact: true,
  });
  async function revealSearch() {
    if (!(await search.isVisible()))
      await page
        .getByRole("button", { name: "Expandir menu lateral", exact: true })
        .click();
    await expect(search).toBeVisible();
  }
  await revealSearch();
  await search.focus();
  await expect(
    page.getByText("Experimente procurar", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pagar fatura", exact: true }).click();
  await expect(search).toHaveValue("Pagar fatura");
  await expect(
    page.getByRole("option", { name: /Meus cartões/ }),
  ).toBeVisible();
  await search.press("Enter");
  await expect(page.locator("main")).toHaveAttribute("data-page", "cards");
  await expect(page.locator("main h1")).toBeFocused();
  await revealSearch();
  await search.fill("SALÁRIO");
  await expect(
    page.getByRole("option", { name: /Entradas do mês/ }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.locator("main")).toHaveAttribute("data-page", "income");
  await revealSearch();
  await search.fill("banana telescópio");
  await expect(page.getByText(/Nenhuma função encontrada/)).toBeVisible();
  await search.press("Enter");
  await expect(page.locator("main")).toHaveAttribute("data-page", "income");
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await search.fill("parcelas");
  const first = await search.getAttribute("aria-activedescendant");
  await search.press("ArrowDown");
  expect(await search.getAttribute("aria-activedescendant")).not.toBe(first);
  await search.press("Escape");
  await page
    .getByRole("button", { name: "Recolher menu lateral", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Buscar funções no menu", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Encontrar uma função",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill("backup");
  await search.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-page", "data");
  await page.keyboard.press("Control+k");
  await page.getByLabel("Busca geral", { exact: true }).fill("tema escuro");
  await page.getByLabel("Busca geral", { exact: true }).press("Enter");
  await expect(page.locator("main")).toHaveAttribute("data-page", "appearance");
  await page
    .getByRole("button", { name: "Expandir menu lateral", exact: true })
    .click();
  if (resize) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Buscar funções no menu", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await search.fill("antecipar");
    await search.press("Enter");
    await expect(page.locator("main")).toHaveAttribute(
      "data-page",
      "anticipation",
    );
    await expect(page.locator(".app-shell")).not.toHaveClass(
      /mobile-menu-open/,
    );
    await page
      .getByRole("button", { name: "Expandir menu lateral", exact: true })
      .click();
    await search.fill("atualizar");
    await search.press("Enter");
    await expect(page.locator("main")).toHaveAttribute("data-page", "updates");
    await expect(page.locator(".app-shell")).not.toHaveClass(
      /mobile-menu-open/,
    );
    await page.setViewportSize({ width: 1440, height: 1040 });
  }
  await goTo(page, "Início");
  console.log(
    "Busca do menu: intenções, sugestões, teclado, modo recolhido, busca geral e navegação móvel verificados.",
  );
}
