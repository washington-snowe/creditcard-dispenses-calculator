import { expect } from "playwright/test";
export async function runEnhancements(page) {
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const following = await page.evaluate(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Minhas compras", exact: true })
    .click();
  async function add(
    description,
    bank,
    total,
    installments,
    category,
    month = today,
  ) {
    await page
      .getByRole("button", { name: "Nova compra", exact: true })
      .click();
    await page.getByLabel("Descrição da compra").fill(description);
    await page.getByLabel("Banco", { exact: true }).selectOption(bank);
    await page.getByLabel("Categoria", { exact: true }).selectOption(category);
    await page.getByLabel("Valor total da compra").fill(total);
    await page.getByLabel("Número de parcelas").fill(String(installments));
    await page.getByLabel("Mês da próxima parcela").fill(month);
    await page
      .getByRole("button", { name: "Salvar compra", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await add("Geladeira", "Nubank", "1200,00", 3, "Casa");
  await add("Curso", "Nubank", "400,00", 2, "Educação");
  await add("Viagem futura", "Inter", "900,00", 3, "Lazer", following);
  await expect(page.getByTestId("total-debt")).toHaveText(/2\.500,00/);
  await expect(page.getByTestId("monthly-total")).toHaveText(/600,00/);
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await page
    .locator('.chart-monthly path.recharts-rectangle[fill="var(--accent)"]')
    .nth(1)
    .click();
  await expect(page.getByLabel("Escolher mês")).toHaveValue(following);
  await expect(page.getByTestId("monthly-total")).toHaveText(/900,00/);
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(page.getByTestId("monthly-total")).toHaveText(/900,00/);
  await page.getByRole("button", { name: "Mês anterior", exact: true }).click();
  await page.getByRole("button", { name: "Mês anterior", exact: true }).click();
  await expect(page.getByTestId("monthly-total")).toHaveText(/0,00/);
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await page.getByLabel("Buscar compras").fill("Geladeira");
  await expect(page.getByTestId("total-debt")).toHaveText(/1\.200,00/);
  await page.getByRole("button", { name: "Planejamento", exact: true }).click();
  await expect(page.locator(".selected-month-panel")).toContainText(
    "Geladeira",
  );
  await expect(page.locator(".selected-month-panel")).not.toContainText(
    "Curso",
  );
  await page.getByLabel("Buscar compras").fill("");
  await page.getByLabel("Filtrar banco").selectOption("Inter");
  await expect(page.getByTestId("total-debt")).toHaveText(/900,00/);
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.getByLabel("Filtrar categoria").selectOption("Casa");
  await page.getByRole("button", { name: "Meus cartões", exact: true }).click();
  await page
    .getByRole("button", { name: "Pagar cartão Principal neste mês" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Curso");
  await expect(page.getByRole("dialog")).toContainText("600,00");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByTestId("total-debt")).toHaveText(/1\.200,00/);
  await page
    .getByRole("button", { name: "Pagar cartão Principal neste mês" })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/800,00/);
  await expect(page.locator(".managed-card").first()).toContainText(
    "Pago neste mês",
  );
  await page.getByRole("button", { name: "Desfazer última alteração" }).click();
  await expect(page.getByTestId("total-debt")).toHaveText(/1\.200,00/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.getByRole("button", { name: "Antecipações", exact: true }).click();
  await page.getByLabel("Orçamento para antecipação").fill("500,00");
  await page.getByRole("button", { name: "Sugerir seleção" }).click();
  await expect(page.getByLabel("Selecionar quitação de Curso")).toBeChecked();
  await expect(
    page.getByLabel("Selecionar quitação de Geladeira"),
  ).not.toBeChecked();
  await expect(page.getByTestId("payoff-cost")).toHaveText(/400,00/);
  await expect(page.getByTestId("payoff-relief")).toHaveText(/200,00/);
  await page
    .getByRole("button", { name: "Registrar quitação", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Minhas compras", exact: true })
    .click();
  await expect(page.getByTestId("total-debt")).toHaveText(/2\.100,00/);
  await expect(
    page.locator(".purchase-table tbody tr").filter({ hasText: "Curso" }),
  ).toContainText("Quitada");
  await page.getByRole("button", { name: "Desfazer última alteração" }).click();
  await expect(page.getByTestId("total-debt")).toHaveText(/2\.500,00/);
  await page
    .getByRole("button", { name: "Antecipar Geladeira", exact: true })
    .click();
  await page.getByLabel("Quantas parcelas você pagou adiantado?").fill("2");
  await expect(page.getByRole("dialog")).toContainText("800,00");
  await page
    .getByRole("button", { name: "Registrar antecipação", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/1\.700,00/);
  await expect(page.getByTestId("monthly-total")).toHaveText(/200,00/);
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(page.getByTestId("monthly-total")).toHaveText(/500,00/);
  await page.getByRole("button", { name: "Meus cartões", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pagar cartão Principal neste mês" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await page.getByRole("button", { name: "Desfazer última alteração" }).click();
  await expect(page.getByTestId("total-debt")).toHaveText(/2\.500,00/);
  await page
    .getByRole("button", { name: "Pagar cartão Principal neste mês" })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("welcome-paid")).toContainText("600,00");
  await expect(page.getByTestId("welcome-pending")).toHaveText(/0,00/);
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await expect(page.getByTestId("total-debt")).toHaveText(/1\.900,00/);
  await expect(page.getByTestId("monthly-total")).toHaveText(/0,00/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  console.log(
    "Melhorias verificadas: tema persistente, meses passados/futuros, filtros globais, fatura completa mesmo com filtro, desfazer, orçamento, simulação, quitação e antecipação parcial.",
  );
}
