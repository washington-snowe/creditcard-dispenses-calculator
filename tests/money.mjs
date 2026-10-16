import {
  goTo,
  recordAction,
  payCardAction,
  openCardDetails,
} from "./navigation.mjs";
import { expect } from "playwright/test";
import { readFile } from "node:fs/promises";
const version = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
).version;
const releaseNotes = JSON.parse(
  await readFile(new URL("../src/release-notes.json", import.meta.url), "utf8"),
);
export async function runMoney(page) {
  const month = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-remaining")).toHaveText(/−?\s*-?600,00/);
  await page.getByRole("button", { name: "Nova entrada", exact: true }).click();
  await page.getByLabel("Descrição do movimento").fill("Salário recebido");
  await page.getByLabel("Origem do dinheiro / motivo").fill("Salário");
  await page.getByLabel("Data do movimento").fill(`${month}-01`);
  await page.getByLabel("Valor do movimento").fill("5000,00");
  await page
    .getByRole("button", { name: "Salvar movimento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Registrar redução", exact: true })
    .click();
  await page.getByLabel("Descrição do movimento").fill("Ajuste de caixa");
  await page.getByLabel("Origem do dinheiro / motivo").fill("Ajuste");
  await page.getByLabel("Valor do movimento").fill("200,00");
  await page
    .getByRole("button", { name: "Salvar movimento", exact: true })
    .click();
  await expect(page.getByTestId("cash-income")).toHaveText(/5\.000,00/);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.200,00/);
  await page.getByLabel("Filtrar origem das entradas").selectOption("Salário");
  await expect(page.locator(".cash-table tbody tr")).toHaveCount(1);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.200,00/);
  await page.getByLabel("Filtrar origem das entradas").selectOption("all");
  await page.getByLabel("Filtrar tipo de movimento").selectOption("deduction");
  await expect(page.locator(".cash-table tbody tr")).toHaveCount(1);
  await page.getByLabel("Filtrar tipo de movimento").selectOption("all");
  await page.getByLabel("Buscar entradas").fill("recebido");
  await expect(page.locator(".cash-table tbody tr")).toHaveCount(1);
  await page.getByLabel("Buscar entradas").fill("");
  await recordAction(page, "Editar movimento Ajuste de caixa");
  await page.getByLabel("Valor do movimento").fill("250,00");
  await page
    .getByRole("button", { name: "Salvar movimento", exact: true })
    .click();
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.150,00/);
  await page.getByRole("button", { name: "Desfazer última alteração" }).click();
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.200,00/);
  await recordAction(page, "Excluir movimento Ajuste de caixa");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.400,00/);
  await page.getByRole("button", { name: "Desfazer última alteração" }).click();
  await goTo(page, "Assinaturas");
  async function subscribe(name, provider, value, card = "") {
    await page
      .getByRole("button", { name: "Nova assinatura", exact: true })
      .click();
    await page.getByLabel("Nome da assinatura").fill(name);
    await page.getByLabel("Fornecedor da assinatura").fill(provider);
    await page.getByLabel("Valor da cobrança").fill(value);
    await page
      .getByLabel("Cartão da assinatura")
      .selectOption(card ? { label: card } : "");
    await page.getByLabel("Mês de início").fill(month);
    await page
      .getByRole("button", { name: "Salvar assinatura", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await subscribe("Streaming", "Vídeos", "100,00", "Nubank · Principal");
  await subscribe("Academia", "Esporte", "50,00");
  await expect(page.getByTestId("subscription-total")).toHaveText(/150,00/);
  await page.getByLabel("Filtrar cartão das assinaturas").selectOption("none");
  await expect(page.locator(".subscription-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".subscription-table tbody")).toContainText(
    "Academia",
  );
  await page.getByLabel("Filtrar cartão das assinaturas").selectOption("all");
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-commitments")).toHaveText(/750,00/);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.050,00/);
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(page.getByTestId("cash-income")).toHaveText(/0,00/);
  await expect(page.getByTestId("cash-commitments")).toHaveText(/1\.050,00/);
  await expect(page.locator(".negative-balance")).toBeVisible();
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await page.getByRole("button", { name: "Consultar as faturas" }).click();
  await payCardAction(page, "Principal");
  await expect(page.getByRole("dialog")).toContainText("Streaming");
  await expect(page.getByRole("dialog")).toContainText("100,00");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.050,00/);
  await expect(page.locator(".budget-breakdown")).toContainText("700,00");
  await goTo(page, "Assinaturas");
  await page
    .getByRole("button", { name: "Pagar assinatura Academia", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await recordAction(page, "Editar assinatura Academia");
  await page.getByLabel("Valor da cobrança").fill("60,00");
  await page
    .getByLabel("Cartão da assinatura")
    .selectOption({ label: "Nubank · Principal" });
  await page
    .getByRole("button", { name: "Salvar assinatura", exact: true })
    .click();
  await expect(page.getByTestId("subscription-total")).toHaveText(/150,00/);
  await page.getByLabel("Filtrar cartão das assinaturas").selectOption("none");
  await expect(page.locator(".subscription-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".subscription-table tbody")).toContainText(
    "Fora dos cartões",
  );
  await expect(page.locator(".subscription-table tbody")).toContainText(
    "50,00",
  );
  await expect(page.locator(".subscription-table tbody")).toContainText(
    "Preço atual",
  );
  await page.getByLabel("Filtrar cartão das assinaturas").selectOption("all");
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(page.getByTestId("subscription-total")).toHaveText(/160,00/);
  await expect(
    page.getByRole("button", {
      name: "Pagar assinatura Streaming",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Voltar ao mês atual/ }).click();
  await goTo(page, "Atualizações");
  await expect(page.getByTestId("app-version")).toHaveText(version);
  await expect(
    page.getByRole("heading", {
      name: "Atualizações do ContaClara",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: `Novidades da versão ${version}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(
    releaseNotes.highlights.length,
  );
  await expect(page.locator("main")).not.toContainText(
    /GitHub|repositório|Node\.js|Git instalado/i,
  );
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.050,00/);
  await page.reload();
  await goTo(page, "Entradas do mês");
  await expect(page.getByTestId("cash-commitments")).toHaveText(/750,00/);
  await expect(page.getByTestId("cash-remaining")).toHaveText(/4\.050,00/);
  await expect(page.locator(".cash-table tbody tr")).toHaveCount(2);
  console.log(
    "Entradas, reduções, filtros, recorrências, fatura com assinatura, histórico de preço/cartão, saldo sem duplicação e persistência verificados.",
  );
}
