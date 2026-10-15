import { expect } from "playwright/test";
import { goTo } from "./navigation.mjs";
export async function verifyCohesion(page) {
  await goTo(page, "Início");
  await expect(page.locator(".sidebar .nav-item")).toHaveCount(4);
  await expect(page.locator(".home-widget")).toHaveCount(3);
  await expect(
    page.getByRole("region", { name: "Conheça as funções" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "O que mudou no mês?", exact: true }),
  ).toHaveCount(0);
  await goTo(page, "Meus cartões");
  await goTo(page, "Pendências");
  await page
    .getByRole("button", { name: "Área: Movimentações", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Meus cartões", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  for (const [tab, label] of [
    ["Entradas do mês", "Buscar entradas"],
    ["Entradas do mês", "Buscar rendas recorrentes"],
    ["Despesas", "Buscar despesas"],
    ["Assinaturas", "Buscar assinaturas"],
  ]) {
    await goTo(page, tab);
    const input = page.getByLabel(label, { exact: true }),
      before = await input.inputValue();
    await input.fill("Filtro que deve permanecer");
    await goTo(page, "Visão geral");
    await goTo(page, tab);
    await expect(input).toHaveValue("Filtro que deve permanecer");
    await input.fill(before);
  }
  await goTo(page, "Entradas do mês");
  await page
    .getByLabel("Buscar entradas", { exact: true })
    .fill("Filtro antes de restaurar");
  const current = await page.evaluate(async () =>
    window.saldo
      ? await window.saldo.load()
      : JSON.parse(localStorage.getItem("saldo-data-v1")),
  );
  await page
    .locator('input[accept=".json,application/json"]')
    .setInputFiles({
      name: "current.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(current)),
    });
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByLabel("Buscar entradas", { exact: true })).toHaveValue(
    "",
  );
  await goTo(page, "Minhas compras");
  const toggle = page.getByRole("button", {
    name: "Filtros de compras",
    exact: true,
  });
  if ((await toggle.getAttribute("aria-expanded")) === "true")
    await toggle.click();
  await expect(page.getByLabel("Filtrar banco", { exact: true })).toBeHidden();
  await page.getByLabel("Buscar compras", { exact: true }).fill("Geladeira");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  const edit = page.getByRole("button", {
    name: "Editar Geladeira",
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole("dialog"),
    field = page.getByLabel("Descrição da compra", { exact: true });
  await field.fill("Texto ainda não salvo");
  const box = await dialog.boundingBox();
  await page.mouse.click(box.x + 3, box.y + box.height / 2);
  await expect(dialog).toBeVisible();
  await expect(field).toHaveValue("Texto ainda não salvo");
  const inside = await field.boundingBox();
  await page.mouse.move(
    inside.x + inside.width / 2,
    inside.y + inside.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(Math.max(1, box.x - 12), Math.max(1, box.y + 10));
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(edit).toBeFocused();
  await edit.click();
  const reopened = await dialog.boundingBox();
  await page.mouse.click(
    Math.max(1, reopened.x - 12),
    Math.max(1, reopened.y + 10),
  );
  await expect(dialog).not.toBeVisible();
  await expect(edit).toBeFocused();
  const trigger = page.getByRole("button", {
    name: "Mais opções de Geladeira",
    exact: true,
  });
  await trigger.click();
  const menu = page.getByRole("group", {
    name: "Mais opções de Geladeira",
    exact: true,
  });
  await expect(menu).toBeVisible();
  const geometry = await menu.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: innerWidth,
      height: innerHeight,
      front: el.contains(
        document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
      ),
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(7);
  expect(geometry.top).toBeGreaterThanOrEqual(7);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width - 7);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height - 7);
  expect(geometry.front).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  // Switching search -> edit must not let the old dialog steal focus.
  await page.keyboard.press("Control+k");
  await page.getByLabel("Busca geral", { exact: true }).fill("Geladeira");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("Geladeira");
  await expect
    .poll(() =>
      page.evaluate(() => !!document.activeElement?.closest("dialog[open]")),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await goTo(page, "Entradas do mês");
  console.log(
    "Início com três blocos, quatro áreas, memória de navegação e filtros, detalhes recolhidos, cliques/arrastos em janelas, foco restaurado e ações acima da tabela verificados.",
  );
}
