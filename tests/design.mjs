import { expect } from "playwright/test";

async function assertFloating(page) {
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("R$");
  const placement = await tip.evaluate((element) => {
    const box = element.getBoundingClientRect();
    // Pointer events normally pass through the informational overlay. Enable
    // hit testing briefly to check actual painting order, not just z-index.
    element.style.pointerEvents = "auto";
    const front = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    element.style.pointerEvents = "";
    return {
      outsidePanel: !element.closest(".panel"),
      inFront: element.contains(front),
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(placement.outsidePanel).toBeTruthy();
  expect(
    placement.inFront,
    "o valor precisa estar acima de gráficos e outros painéis",
  ).toBeTruthy();
  expect(placement.left).toBeGreaterThanOrEqual(7);
  expect(placement.top).toBeGreaterThanOrEqual(7);
  expect(placement.right).toBeLessThanOrEqual(placement.width - 7);
  expect(placement.bottom).toBeLessThanOrEqual(placement.height - 7);
}
export async function verifyChartTooltips(page) {
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  const clear = page.getByRole("button", {
    name: "Limpar filtros",
    exact: true,
  });
  if (await clear.isVisible()) await clear.click();
  const bar = page
    .locator('.chart-monthly path.recharts-rectangle[fill="var(--accent)"]')
    .filter({ visible: true })
    .first();
  await bar.hover();
  await assertFloating(page);
  await page.mouse.move(0, 0);
  // The middle of a sector's bounding box can be inside the doughnut hole.
  // Use a point on the arc itself and exercise genuine browser pointer input.
  const sector = page.locator(".donut-wrap .recharts-sector").first();
  await sector.scrollIntoViewIfNeeded();
  const point = await sector.evaluate((path) => {
    for (let n = 0.15; n < 0.85; n += 0.1) {
      const local = path.getPointAtLength(path.getTotalLength() * n);
      const p = new DOMPoint(local.x, local.y).matrixTransform(
        path.getScreenCTM(),
      );
      for (const dx of [-2, 2])
        for (const dy of [-2, 2]) {
          if (document.elementFromPoint(p.x + dx, p.y + dy) === path)
            return { x: p.x + dx, y: p.y + dy };
        }
    }
    throw new Error("Não foi encontrado um ponto visível no arco");
  });
  await page.mouse.move(point.x, point.y);
  await assertFloating(page);
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Antecipações", exact: true }).click();
  const simulation = page.locator(".simulation-chart svg[role=application]");
  await simulation.scrollIntoViewIfNeeded();
  const bounds = await simulation.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await assertFloating(page);
  await page.mouse.move(0, 0);
}
export async function verifyNavigation(page) {
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Boas-vindas ao ContaClara." }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Conheça as funções" })
      .getByRole("button"),
  ).toHaveCount(8);
  await expect(
    page.getByRole("region", { name: "Filtros globais" }),
  ).toHaveCount(0);
  for (const title of [
    "Meus cartões",
    "Minhas compras",
    "Entradas do mês",
    "Despesas",
    "Assinaturas",
    "Planejamento",
    "Antecipações",
    "Visão geral",
  ]) {
    await page
      .getByRole("button", { name: `Explorar ${title}`, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button", { name: title, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Início", exact: true }).click();
  }
  const wide = await page.evaluate(() => innerWidth > 1020);
  if (wide) {
    const before = await page.locator(".main-wrapper").boundingBox();
    await page
      .getByRole("button", { name: "Recolher menu lateral", exact: true })
      .click();
    await expect(page.locator(".app-shell")).toHaveClass(/sidebar-collapsed/);
    expect(
      (await page.locator(".main-wrapper").boundingBox()).width,
    ).toBeGreaterThan(before.width);
    await expect(page.locator(".sidebar .brand-symbol")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Expandir menu lateral", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Expandir menu lateral", exact: true })
      .click();
  } else {
    await page
      .getByRole("button", { name: "Expandir menu lateral", exact: true })
      .click();
    await expect(page.locator(".app-shell")).toHaveClass(/mobile-menu-open/);
    await expect(page.locator(".nav-item > span").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".app-shell")).not.toHaveClass(
      /mobile-menu-open/,
    );
    await expect(
      page.getByRole("button", { name: "Expandir menu lateral", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Expandir menu lateral", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Meus cartões", exact: true })
      .click();
    await expect(page.locator(".app-shell")).not.toHaveClass(
      /mobile-menu-open/,
    );
  }
  console.log(
    "Boas-vindas, atalhos por teclado, navegação agrupada e menu recolhível verificados.",
  );
}
