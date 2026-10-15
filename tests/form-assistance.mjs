import { expect } from "playwright/test";
export async function runFormAssistance(page) {
  const nav = async (name) =>
    page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
  const cancel = async () => {
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  };
  await nav("Minhas compras");
  await page.getByRole("button", { name: "Nova compra", exact: true }).click();
  const name = page.getByLabel("Descrição da compra", { exact: true });
  await name.fill("No");
  await expect(page.locator(".ghost-suffix")).toHaveText("tebook");
  expect(
    Number(
      await page
        .locator(".ghost-suffix")
        .evaluate((el) => getComputedStyle(el).opacity),
    ),
  ).toBeLessThan(1);
  await expect(name).toHaveValue("No");
  await name.press("Tab");
  await expect(name).toHaveValue("Notebook");
  await expect(name).toBeFocused();
  await expect(page.getByLabel("Categoria", { exact: true })).toHaveValue(
    "Tecnologia",
  );
  await name.press("Tab");
  await expect(page.getByLabel("Banco", { exact: true })).toBeFocused();
  await name.fill("No");
  await name.press("Shift+Tab");
  await expect(name).toHaveValue("No");
  await expect(
    page.getByRole("button", { name: "Fechar", exact: true }),
  ).toBeFocused();
  await name.focus();
  await name.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".ghost-suffix")).toHaveCount(0);
  await name.press("Tab");
  await expect(page.getByLabel("Banco", { exact: true })).toBeFocused();
  await name.fill("Gel");
  await name.press("Tab");
  await expect(name).toHaveValue("Geladeira");
  await expect(page.locator(".category-hint")).toContainText(
    "pelo seu histórico",
  );
  await page.getByLabel("Categoria", { exact: true }).selectOption("Lazer");
  await name.fill("Notebook");
  await expect(page.getByLabel("Categoria", { exact: true })).toHaveValue(
    "Lazer",
  );
  await page
    .getByRole("button", { name: "Detectar pelo nome", exact: true })
    .click();
  await expect(page.getByLabel("Categoria", { exact: true })).toHaveValue(
    "Tecnologia",
  );
  await name.fill("No");
  await name.press("ArrowLeft");
  await expect(page.locator(".ghost-suffix")).toHaveCount(0);
  await name.press("Tab");
  await expect(name).toHaveValue("No");
  await name.fill("No");
  await name.dispatchEvent("compositionstart");
  await expect(page.locator(".ghost-suffix")).toHaveCount(0);
  await name.dispatchEvent("compositionend");
  await expect(page.locator(".ghost-suffix")).toBeVisible();
  await cancel();
  await page
    .getByRole("button", { name: "Editar Geladeira", exact: true })
    .click();
  await name.fill("Notebook");
  await expect(page.getByLabel("Categoria", { exact: true })).toHaveValue(
    "Casa",
  );
  await cancel();

  await nav("Assinaturas");
  await page
    .getByRole("button", { name: "Nova assinatura", exact: true })
    .click();
  const subscription = page.getByLabel("Nome da assinatura", { exact: true });
  await subscription.fill("Net");
  await subscription.press("Tab");
  await expect(subscription).toHaveValue("Netflix");
  await expect(
    page.getByLabel("Categoria da assinatura", { exact: true }),
  ).toHaveValue("Lazer");
  const provider = page.getByLabel("Fornecedor da assinatura", { exact: true });
  await provider.fill("Ne");
  await provider.press("Tab");
  await expect(provider).toHaveValue("Netflix");
  await page
    .getByLabel("Categoria da assinatura", { exact: true })
    .selectOption("Tecnologia");
  await subscription.fill("Spotify");
  await expect(
    page.getByLabel("Categoria da assinatura", { exact: true }),
  ).toHaveValue("Tecnologia");
  await cancel();

  await nav("Despesas");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  const expense = page.getByLabel("Descrição da despesa", { exact: true });
  await expense.fill("Conta de l");
  await expense.press("Tab");
  await expect(expense).toHaveValue("Conta de luz");
  await expect(
    page.getByLabel("Categoria da despesa", { exact: true }),
  ).toHaveValue("Casa");
  await page
    .getByLabel("Categoria da despesa", { exact: true })
    .selectOption("Outros");
  await expense.fill("Uber");
  await expect(
    page.getByLabel("Categoria da despesa", { exact: true }),
  ).toHaveValue("Outros");
  await page
    .getByRole("button", { name: "Detectar pelo nome", exact: true })
    .click();
  await expect(
    page.getByLabel("Categoria da despesa", { exact: true }),
  ).toHaveValue("Transporte");
  await cancel();

  await nav("Entradas do mês");
  await page.getByRole("button", { name: "Nova entrada", exact: true }).click();
  const income = page.getByLabel("Descrição do movimento", { exact: true });
  await income.fill("Sa");
  await income.press("Tab");
  await expect(income).toHaveValue("Salário recebido");
  const source = page.getByLabel("Origem do dinheiro / motivo", {
    exact: true,
  });
  await source.fill("Fre");
  await source.press("Tab");
  await expect(source).toHaveValue("Freelance");
  await cancel();
  await page
    .getByRole("button", { name: "Renda recorrente", exact: true })
    .click();
  const recurring = page.getByLabel("Descrição da renda", { exact: true });
  await recurring.fill("Reem");
  await recurring.press("Tab");
  await expect(recurring).toHaveValue("Reembolso");
  await cancel();

  await nav("Meus cartões");
  await page.getByRole("button", { name: "Novo cartão", exact: true }).click();
  const bank = page.getByRole("dialog").getByLabel("Banco", { exact: true });
  const banks = await bank.locator("option").allTextContents();
  for (const bankName of banks.filter((x) => x !== "Outro")) {
    await bank.selectOption({ label: bankName });
    const logo = page
      .getByRole("dialog")
      .getByAltText(`Logo ${bankName}`, { exact: true });
    await expect(logo).toBeVisible();
    await expect
      .poll(() => logo.evaluate((img) => img.naturalWidth))
      .toBeGreaterThan(0);
    const details = await logo.evaluate((img) => ({
      local: !img.src.startsWith("https://"),
      filter: getComputedStyle(img).filter,
    }));
    expect(details.local).toBeTruthy();
    expect(details.filter).toBe("none");
  }
  await bank.selectOption("Outro");
  await page.getByLabel("Nome do banco", { exact: true }).fill("Banco pessoal");
  await expect(page.getByRole("dialog").locator(".bank-mark img")).toHaveCount(
    0,
  );
  await cancel();
  await nav("Entradas do mês");
  console.log(
    "Sugestões com Tab, Shift+Tab, Esc, cursor, composição, histórico, categorias manuais/automáticas e 11 logos locais verificados.",
  );
}
