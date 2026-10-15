import { goTo } from "./navigation.mjs";
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
  await goTo(page, "Visão geral");
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
  await goTo(page, "Antecipações");
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
  await goTo(page, "Início");
  await expect(
    page.getByRole("heading", { name: "Resumo do mês" }),
  ).toBeVisible();
  await expect(page.locator(".sidebar .nav-item")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Personalizar início", exact: true })
    .click();
  await page.getByLabel("Atalhos das funções", { exact: true }).check();
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
    await goTo(page, "Início");
  }
  await page
    .getByRole("button", { name: "Personalizar início", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restaurar organização padrão", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conheça as funções" }),
  ).toHaveCount(0);
  const wide = await page.evaluate(() => innerWidth > 1020);
  if (wide) {
    const before = await page.locator(".main-wrapper").boundingBox();
    await page
      .getByRole("button", { name: "Recolher menu lateral", exact: true })
      .click();
    await expect(page.locator(".app-shell")).toHaveClass(/sidebar-collapsed/);
    await expect
      .poll(
        async () => (await page.locator(".main-wrapper").boundingBox()).width,
      )
      .toBeGreaterThan(before.width);
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
      .getByRole("button", { name: "Área: Movimentações", exact: true })
      .click();
    await goTo(page, "Meus cartões");
    await expect(page.locator(".app-shell")).not.toHaveClass(
      /mobile-menu-open/,
    );
  }
  console.log(
    "Boas-vindas, atalhos por teclado, navegação agrupada e menu recolhível verificados.",
  );
}

export async function verifyMotion(page) {
  await goTo(page, "Aparência");
  await page.getByLabel("Animações suaves", { exact: true }).check();
  await page
    .getByRole("button", { name: "Aplicar aparência", exact: true })
    .click();
  await goTo(page, "Início");
  const frames = await page.evaluate(async () => {
    const sidebar = document.querySelector(".sidebar");
    const main = document.querySelector(".main-wrapper");
    const start = sidebar.getBoundingClientRect().width;
    document.querySelector(".sidebar-toggle").click();
    const samples = [];
    for (let n = 0; n < 35; n++) {
      await new Promise(requestAnimationFrame);
      samples.push({
        width: sidebar.getBoundingClientRect().width,
        left: main.getBoundingClientRect().left,
      });
    }
    return { start, samples };
  });
  const end = frames.samples.at(-1).width;
  expect(
    frames.samples.some(
      (item) => item.width < frames.start - 1 && item.width > end + 1,
    ),
    "o menu deve passar por larguras intermediárias",
  ).toBeTruthy();
  for (const item of frames.samples)
    expect(Math.abs(item.left - item.width)).toBeLessThan(1);
  await page
    .getByRole("button", { name: "Expandir menu lateral", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBeCloseTo(frames.start, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".sidebar")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await goTo(page, "Aparência");
  await page.getByLabel("Animações suaves", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Aplicar aparência", exact: true })
    .click();
  expect(
    await page
      .locator(".sidebar")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await expect(
    page.getByLabel("Usar aceleração de hardware", { exact: true }),
  ).toBeDisabled();
  console.log(
    "Menu animado com conteúdo sincronizado; preferências de reduzir movimento e opção desktop de hardware verificadas.",
  );
}

export async function verifyFeedback(page) {
  await goTo(page, "Visão geral");
  await expect(page.getByTestId("monthly-total").locator("..")).toHaveAttribute(
    "data-tone",
    "warning",
  );
  await goTo(page, "Entradas do mês");
  await expect(
    page.getByTestId("cash-remaining").locator(".."),
  ).toHaveAttribute("data-tone", "danger");
  await expect(page.getByTestId("cash-income").locator("..")).toHaveAttribute(
    "data-tone",
    "success",
  );
  await goTo(page, "Despesas");
  await page.getByRole("button", { name: "Nova despesa", exact: true }).click();
  await page
    .getByLabel("Descrição da despesa")
    .fill("Despesa de teste vencida");
  await page.getByLabel("Destino / favorecido").fill("Teste");
  await page.getByLabel("Valor da despesa").fill("90,00");
  await page.getByLabel("Vencimento da despesa").fill("2000-01-01");
  await page
    .getByRole("button", { name: "Salvar despesa", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".expense-late")).toHaveText("Atrasada");
  await expect(
    page
      .locator(".stat-card")
      .filter({ has: page.getByText("Atrasadas", { exact: true }) }),
  ).toHaveAttribute("data-tone", "danger");
  console.log(
    "Cores de pendência, saldo negativo, entradas e atrasos verificadas com dados reais na interface.",
  );
}

export async function verifySuggestionLayout(page, context) {
  await goTo(page, "Minhas compras");
  await page.getByRole("button", { name: "Nova compra", exact: true }).click();
  const input = page.getByLabel("Descrição da compra", { exact: true });
  await input.fill("No");
  await expect(page.locator(".ghost-suffix")).toBeVisible();
  const layout = await input.evaluate((element) => {
    const ghost = element.parentElement.querySelector(".input-ghost");
    const prefix = ghost.querySelector(".ghost-prefix");
    const css = getComputedStyle(element),
      canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const box = element.getBoundingClientRect(),
      overlay = ghost.getBoundingClientRect();
    const dialog = element.closest("dialog");
    return {
      alignment:
        overlay.left -
        (box.left +
          parseFloat(css.borderLeftWidth) +
          parseFloat(css.paddingLeft)),
      textWidth: prefix.getBoundingClientRect().width,
      measured: ctx.measureText(element.value).width,
      overflow: dialog.scrollWidth > dialog.clientWidth + 1,
      outside: overlay.right > box.right,
    };
  });
  expect(Math.abs(layout.alignment), context).toBeLessThan(1);
  expect(Math.abs(layout.textWidth - layout.measured), context).toBeLessThan(1);
  expect(layout.overflow, context).toBeFalsy();
  expect(layout.outside, context).toBeFalsy();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
}
