import { expect } from "playwright/test";
export const areas = {
  Início: "Resumo",
  "Visão geral": "Resumo",
  Calendário: "Resumo",
  Pendências: "Resumo",
  "Minhas compras": "Movimentações",
  "Meus cartões": "Movimentações",
  "Entradas do mês": "Movimentações",
  Despesas: "Movimentações",
  Assinaturas: "Movimentações",
  Planejamento: "Planejamento",
  Metas: "Planejamento",
  Antecipações: "Planejamento",
  "Simular compra": "Planejamento",
  Aparência: "Configurações",
  "Dados e segurança": "Configurações",
  Atualizações: "Configurações",
};
export async function goTo(page, name) {
  if (!(await page.getByRole("button", { name, exact: true }).isVisible())) {
    if (!areas[name]) throw new Error(`Destino desconhecido: ${name}`);
    await page
      .getByRole("button", { name: `Área: ${areas[name]}`, exact: true })
      .click();
  }
  await page.getByRole("button", { name, exact: true }).click();
  const filters = page.getByRole("button", {
    name: "Filtros de compras",
    exact: true,
  });
  if (
    (await filters.isVisible()) &&
    (await filters.getAttribute("aria-expanded")) === "false"
  )
    await filters.click();
}

export async function purchaseAction(page, name) {
  const description = name.replace(/^(Excluir|Antecipar) /, "");
  await page
    .getByRole("button", { name: `Mais opções de ${description}`, exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}

export async function recordAction(page, name) {
  const match = name.match(
    /^(Editar|Excluir) (cartão|movimento|assinatura|renda|despesa) (.+)$/,
  );
  if (!match) throw new Error(`Ação de registro desconhecida: ${name}`);
  const label =
    match[2] === "cartão"
      ? `Mais opções do cartão ${match[3]}`
      : `Mais opções de ${match[3]}`;
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}
export async function openCardDetails(page, name) {
  await page
    .getByRole("button", {
      name: `Ver detalhes do cartão ${name}`,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: `Detalhes de ${name}`, exact: true }),
  ).toBeVisible();
}
export async function payCardAction(page, name) {
  await openCardDetails(page, name);
  await page
    .getByRole("button", {
      name: `Pagar cartão ${name} neste mês`,
      exact: true,
    })
    .click();
}
