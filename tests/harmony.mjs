import { expect } from "playwright/test";
import { goTo, openCardDetails } from "./navigation.mjs";
export async function verifyHarmony(page) {
  const current = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const saved = await page.evaluate(async () =>
    window.saldo
      ? await window.saldo.load()
      : JSON.parse(localStorage.getItem("saldo-data-v1")),
  );
  await goTo(page, "Início");
  const hierarchy = await page.evaluate(() => ({
    pending: parseFloat(
      getComputedStyle(
        document.querySelector('[data-testid="welcome-pending"]'),
      ).fontSize,
    ),
    available: parseFloat(
      getComputedStyle(
        document.querySelector('[data-testid="available-to-spend"]'),
      ).fontSize,
    ),
  }));
  expect(hierarchy.pending).toBeGreaterThan(hierarchy.available);
  await goTo(page, "Meus cartões");
  if (
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .click();
  await page.getByLabel("Escolher mês", { exact: true }).fill(current);
  const tile = page.locator(".card-tile").first();
  await expect(tile).toBeVisible();
  await expect(tile.locator(".plastic-card")).toHaveCount(0);
  const limit = await tile.locator(".card-tile-limit strong").innerText();
  const bill = await tile.locator(".card-tile-balance strong").innerText();
  await openCardDetails(page, saved.cards[0].name);
  const percent = await page
    .getByRole("dialog")
    .locator(".limit strong")
    .innerText();
  await page.getByRole("dialog").press("Escape");
  await page.getByLabel("Filtrar categoria").selectOption("Saúde");
  await openCardDetails(page, saved.cards[0].name);
  await expect(page.getByRole("dialog").locator(".limit strong")).toHaveText(
    percent,
  );
  await page.getByRole("dialog").press("Escape");
  await expect(tile.locator(".card-tile-limit strong")).toHaveText(limit);
  await expect(tile.locator(".card-tile-balance strong")).toHaveText(bill);
  await page
    .getByRole("button", { name: "Filtros de compras", exact: true })
    .click();
  const chip = page.getByRole("button", {
    name: "Remover filtro Categoria: Saúde",
    exact: true,
  });
  await chip.focus();
  await chip.press("Enter");
  await expect(
    page.getByRole("group", { name: "Filtros ativos", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Filtros de compras", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await page.getByRole("button", { name: /^Remover filtro Mês:/ }).click();
  await expect(page.getByLabel("Escolher mês", { exact: true })).toHaveValue(
    current,
  );
  // Remove one filter while keeping the other two selections.
  await page
    .getByRole("button", { name: "Filtros de compras", exact: true })
    .click();
  const bank = saved.cards[0].bank;
  await page.getByLabel("Filtrar banco", { exact: true }).selectOption(bank);
  await page.getByLabel("Filtrar categoria").selectOption("Casa");
  await page.getByLabel("Buscar compras", { exact: true }).fill("Geladeira");
  await page
    .getByRole("button", {
      name: "Remover filtro Categoria: Casa",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Filtrar banco", { exact: true })).toHaveValue(
    bank,
  );
  await expect(page.getByLabel("Buscar compras", { exact: true })).toHaveValue(
    "Geladeira",
  );
  await page
    .getByRole("button", {
      name: "Limpar todos os filtros globais",
      exact: true,
    })
    .click();
  const name = saved.cards[0].name;
  await openCardDetails(page, name);
  await page.getByText(/Compras neste cartão \(/).click();
  await expect(
    page.getByRole("dialog").locator(".card-records ul").first(),
  ).toBeVisible();
  await page.getByRole("dialog").press("Escape");
  await expect(
    page.getByRole("button", {
      name: `Ver detalhes do cartão ${name}`,
      exact: true,
    }),
  ).toBeFocused();
  const menuButton = page.getByRole("button", {
    name: `Mais opções do cartão ${name}`,
    exact: true,
  });
  await menuButton.click();
  const menu = page.getByRole("group", {
    name: `Mais opções do cartão ${name}`,
    exact: true,
  });
  await page.keyboard.press("End");
  await expect(
    menu.getByRole("button", { name: `Excluir cartão ${name}`, exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await expect(
    menu.getByRole("button", { name: `Editar cartão ${name}`, exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Nome do cartão", { exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(menuButton).toBeFocused();
  await menuButton.click();
  await menu.evaluate((el) => {
    el.style.maxHeight = "70px";
    el.scrollTop = el.scrollHeight;
  });
  await expect(menu).toBeVisible();
  await expect
    .poll(() => menu.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(menuButton).toBeFocused();
  await goTo(page, "Minhas compras");
  await page.getByRole("button", { name: "Nova compra", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  const description = page.getByLabel("Descrição da compra", { exact: true });
  await expect(description).toHaveAttribute("aria-invalid", "true");
  await expect(description).toBeFocused();
  await description.fill("Teste de validação sem salvar");
  const amount = page.getByLabel("Valor total da compra", { exact: true });
  await amount.fill("valor inválido");
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toBeFocused();
  const errorId = await amount.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${errorId}"]`)).toHaveText(
    "Use um valor válido, como 150,00.",
  );
  await amount.fill("0,01");
  await page.getByLabel("Número de parcelas", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  await expect(page.locator(".field-error")).toHaveText(
    /pelo menos um centavo por parcela/,
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await goTo(page, "Meus cartões");
  await page.getByRole("button", { name: "Novo cartão", exact: true }).click();
  await page
    .getByLabel("Nome do cartão", { exact: true })
    .fill("Cartão sem salvar");
  await page.getByText("Mais opções do cartão", { exact: true }).click();
  const digits = page.getByLabel(/Últimos 4 dígitos/);
  await digits.fill("12");
  await page.getByText("Mais opções do cartão", { exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar cartão", exact: true })
    .click();
  await expect(digits).toBeVisible();
  await expect(digits).toBeFocused();
  await expect(digits).toHaveValue("12");
  await expect(digits).toHaveAttribute("aria-invalid", "true");
  await digits.fill("1234");
  await expect(digits).not.toHaveAttribute("aria-invalid", "true");
  await page.getByRole("dialog").evaluate((el) => {
    el.addEventListener(
      "close",
      () =>
        document.querySelector('input[aria-label="Buscar compras"]').focus(),
      { once: true },
    );
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(
    page.getByLabel("Buscar compras", { exact: true }),
  ).toBeFocused();
  const after = await page.evaluate(async () =>
    window.saldo
      ? await window.saldo.load()
      : JSON.parse(localStorage.getItem("saldo-data-v1")),
  );
  expect(after).toEqual(saved);
  await goTo(page, "Visão geral");
  await expect(
    page
      .locator('.chart-monthly path.recharts-rectangle[fill="var(--warning)"]')
      .first(),
  ).toBeVisible();
  console.log(
    "Hierarquia do início, cartões compactos, limite sem filtros, etiquetas independentes e de mês, foco, menus com teclado/rolagem e erros junto aos campos sem alterar dados verificados.",
  );
}
