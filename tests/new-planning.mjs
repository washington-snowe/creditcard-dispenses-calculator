import { goTo } from "./navigation.mjs";
import { expect } from "playwright/test";
export async function runNewPlanning(page) {
  const month = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  await goTo(page, "Entradas do mês");
  await page
    .getByRole("button", { name: "Renda recorrente", exact: true })
    .click();
  await page.getByLabel("Descrição da renda").fill("Salário recorrente");
  await page.getByLabel("Origem da renda").fill("Empresa mensal");
  await page.getByLabel("Valor previsto da renda").fill("1000,00");
  await page
    .getByRole("button", { name: "Salvar renda recorrente", exact: true })
    .click();
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.050,00/);
  await expect(page.getByTestId("cash-income")).toHaveText(/5\.000,00/);
  await page
    .getByRole("button", {
      name: "Receber renda Salário recorrente",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Confirmar registro", exact: true })
    .click();
  await expect(page.getByTestId("cash-income")).toHaveText(/6\.000,00/);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.050,00/);
  await page.getByRole("button", { name: "Nova entrada", exact: true }).click();
  await page.getByLabel("Descrição do movimento").fill("Pix previsto");
  await page.getByLabel("Origem do dinheiro / motivo").fill("Cliente futuro");
  await page.getByLabel("Valor do movimento").fill("100,00");
  await page.getByLabel("Situação da entrada").selectOption("planned");
  await page
    .getByRole("button", { name: "Salvar movimento", exact: true })
    .click();
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.150,00/);
  await page
    .getByRole("button", { name: "Receber entrada Pix previsto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar registro", exact: true })
    .click();
  await expect(page.getByTestId("cash-income")).toHaveText(/6\.100,00/);
  await page.getByLabel("Transportar saldo automaticamente").check();
  await page.getByLabel("Mês inicial do saldo").fill(month);
  await page.getByLabel("Valor do saldo inicial").fill("500,00");
  await page
    .getByRole("button", { name: "Salvar saldo inicial", exact: true })
    .click();
  await expect(page.getByTestId("opening-balance")).toHaveText(/500,00/);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.650,00/);
  await goTo(page, "Despesas");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page.getByLabel("Descrição da despesa").fill("Conta de luz");
  await page.getByLabel("Destino / favorecido").fill("Energia");
  await page.getByLabel("Valor da despesa").fill("200,00");
  await page.getByLabel("Vencimento da despesa").fill(month + "-01");
  await page.getByLabel("Categoria da despesa").selectOption("Casa");
  await page
    .getByLabel("Forma de pagamento", { exact: true })
    .selectOption("boleto");
  await page
    .getByRole("button", { name: "Salvar despesa", exact: true })
    .click();
  await expect(page.getByTestId("expense-pending")).toHaveText(/200,00/);
  await page.getByLabel("Filtrar forma de pagamento").selectOption("pix");
  await expect(page.locator(".expense-table tbody tr")).toHaveCount(0);
  await page.getByLabel("Filtrar forma de pagamento").selectOption("boleto");
  await expect(page.locator(".expense-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Pagar despesa Conta de luz", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar registro", exact: true })
    .click();
  await expect(page.getByTestId("expense-pending")).toHaveText(/0,00/);
  await expect(page.locator(".expense-table tbody")).toContainText("Paga");
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.450,00/);
  await expect(page.getByTestId("actual-balance")).toHaveText(/5\.450,00/);
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(page.getByTestId("opening-balance")).toHaveText(/5\.450,00/);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.390,00/);
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await goTo(page, "Aparência");
  await page.getByRole("button", { name: /Ultra Dark/ }).click();
  await page.getByLabel("Cor personalizada do tema").fill("#20c7a0");
  await expect(page.getByLabel("Fonte da interface")).toHaveCount(0);
  await page.getByLabel("Animações suaves").uncheck();
  await page
    .getByRole("button", { name: "Aplicar aparência", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ultra");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.locator("html")).not.toHaveAttribute("data-font");
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue("--accent-base"),
    ),
  ).toBe("#20c7a0");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ultra");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-remaining")).toHaveText(/5\.450,00/);
  await goTo(page, "Início");
  await expect(page.getByTestId("welcome-pending")).toHaveText(/0,00/);
  await expect(page.getByTestId("welcome-paid")).toContainText("950,00");
  await expect(
    page.getByRole("progressbar", { name: "Compromissos do mês pagos" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(page.getByTestId("welcome-pending")).toHaveText(/1\.060,00/);
  await expect(page.getByTestId("welcome-paid")).toHaveCount(0);
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await goTo(page, "Entradas do mês");
  console.log(
    "Novidades verificadas: rendas previstas/recebidas, saldo inicial e próximo mês, despesas e filtros, Ultra Dark, cores, fontes, movimento e persistência.",
  );
}
