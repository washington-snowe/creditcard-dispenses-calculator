import { expect } from "playwright/test";

export async function runFlow(page) {
  await expect(
    page.getByRole("heading", { name: "Boas-vindas ao ContaClara." }),
  ).toBeVisible();
  await expect(page.getByTestId("welcome-pending")).toHaveText(/0,00/);
  await expect(page.getByTestId("welcome-paid")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Explorar Visão geral", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tudo sob controle." }),
  ).toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/0,00/);
  await page.getByRole("button", { name: "Novo cartão", exact: true }).click();
  await page.getByLabel("Nome do cartão").fill("Principal");
  await page.getByLabel("Banco", { exact: true }).selectOption("Nubank");
  await page.getByLabel(/Últimos 4 dígitos/).fill("1234");
  await page.getByLabel(/Limite do cartão/).fill("1000,00");
  await page
    .getByRole("button", { name: "Salvar cartão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Nova compra", exact: true }).click();
  await page.getByLabel("Descrição da compra").fill("Teste de centavos");
  await page.getByLabel("Valor total da compra").fill("100,00");
  await page.getByLabel("Número de parcelas").fill("3");
  await page.getByLabel("Parcelas já pagas").fill("1");
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/66,66/);
  await expect(page.getByTestId("monthly-total")).toHaveText(/33,33/);
  await page.getByRole("button", { name: "Meus cartões" }).click();
  await page.getByRole("button", { name: "Novo cartão", exact: true }).click();
  await page.getByLabel("Nome do cartão").fill("Viagens");
  await page.getByLabel("Banco", { exact: true }).selectOption("Inter");
  await page
    .getByRole("button", { name: "Salvar cartão", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Minhas compras", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova compra", exact: true }).click();
  await page.getByLabel("Descrição da compra").fill("Passagem");
  await page.getByLabel("Banco", { exact: true }).selectOption("Inter");
  await expect(page.getByLabel("Cartão", { exact: true })).toContainText(
    "Viagens",
  );
  await page.getByLabel("Como informar o valor").selectOption("installment");
  await page.getByLabel("Valor de cada parcela").fill("300,00");
  await page.getByLabel("Número de parcelas").fill("4");
  await page.getByLabel("Parcelas já pagas").fill("2");
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/666,66/);
  await expect(page.getByTestId("monthly-total")).toHaveText(/333,33/);
  await page
    .getByRole("button", { name: "Pagar próxima parcela de Teste de centavos" })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/633,33/);
  await page
    .getByRole("button", { name: "Editar Teste de centavos", exact: true })
    .click();
  await page.getByLabel("Parcelas já pagas").fill("1");
  await page
    .getByLabel("Mês da próxima parcela")
    .fill(new Date().toISOString().slice(0, 7));
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/666,66/);
  const id = await page
    .getByLabel("Filtrar por cartão")
    .locator("option")
    .filter({ hasText: "Principal" })
    .getAttribute("value");
  await page.getByLabel("Filtrar por cartão").selectOption(id);
  await expect(page.getByTestId("total-debt")).toHaveText(/66,66/);
  await page.getByRole("button", { name: "Meus cartões" }).click();
  await expect(page.locator(".card-summary tfoot")).toContainText("66,66");
  await page.getByRole("button", { name: "Excluir cartão Principal" }).click();
  await expect(page.getByRole("status")).toContainText("compras vinculadas");
  await expect(page.locator(".toast")).toHaveAttribute("data-tone", "warning");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Planejamento", exact: true }).click();
  await page.getByLabel("Filtrar por cartão").selectOption("all");
  await expect(page.locator(".forecast-table tfoot")).toContainText("666,66");
  await page
    .locator(".forecast-table tbody tr")
    .first()
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".forecast-table .month-details")).toContainText(
    "Teste de centavos",
  );
  await expect(page.locator(".forecast-table .month-details")).toContainText(
    "Passagem",
  );
  await page.reload();
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await expect(page.getByTestId("total-debt")).toHaveText(/666,66/);
  await page
    .getByRole("button", { name: "Minhas compras", exact: true })
    .click();
  await page.getByLabel("Buscar compras").fill("Passagem");
  await expect(page.locator(".purchase-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Excluir Passagem", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".purchase-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Excluir Passagem", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/0,00/);
  await page.getByLabel("Buscar compras").fill("");
  await expect(page.getByTestId("total-debt")).toHaveText(/66,66/);
  await page
    .getByRole("button", { name: "Editar Teste de centavos", exact: true })
    .click();
  await page.getByLabel("Parcelas já pagas").fill("3");
  await page
    .getByRole("button", { name: "Salvar compra", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-debt")).toHaveText(/0,00/);
  await page.getByRole("button", { name: "Quitadas", exact: true }).click();
  await expect(page.locator(".purchase-table tbody")).toContainText("Quitada");
  await page.getByRole("button", { name: "Planejamento", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Um mês livre de parcelas" }),
  ).toBeVisible();
  console.log(
    "Fluxos verificados: cartões, seleção de banco, compras, centavos, pagamentos, edição, filtros, resumo global, previsão individual, persistência, exclusão e quitação.",
  );
}
