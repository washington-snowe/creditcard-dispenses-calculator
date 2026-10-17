import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "playwright/test";
import { verifyAccessibility } from "./accessibility.mjs";

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4174",
    "--strictPort",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Preview não iniciou em 20 segundos")),
      20000,
    );
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("4174")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
    server.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Preview encerrou: ${code}`));
    });
  });
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH === "bundled"
        ? undefined
        : process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4174");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Pare de pagarcontas no escuro.",
  );
  await expect(
    page.getByRole("link", { name: /Quero assumir o controle/ }),
  ).toHaveAttribute(
    "href",
    /releases\/latest\/download\/ContaClara-Windows-x64.zip$/,
  );
  await expect(page.locator(".preview-stat.primary strong")).toContainText(
    "4.560,00",
  );
  await page.getByRole("tab", { name: "Visão geral", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Cartões", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "Cartões" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Metas", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tabpanel", { name: "Visão geral" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Próximo mês da demonstração" })
    .click();
  await expect(page.locator(".preview-month")).toContainText("Julho 2026");
  await expect(page.locator(".preview-stat.primary strong")).toContainText(
    "4.830,00",
  );
  await expect(
    page.getByRole("button", { name: "Próximo mês da demonstração" }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Cartões", exact: true }).click();
  await expect(page.locator(".demo-bank-card")).toContainText("1.570,00");
  await page.getByRole("tab", { name: "Metas", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "R$ 2.800 de R$ 4.000",
  );
  await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
  await page
    .getByRole("button", { name: "Mês anterior da demonstração" })
    .click();
  await page
    .getByRole("button", { name: "Mês anterior da demonstração" })
    .click();
  await expect(page.locator(".preview-month")).toContainText("Maio 2026");
  await expect(
    page.getByRole("button", { name: "Mês anterior da demonstração" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("img", { name: /Exemplo de previsão/ }),
  ).toHaveAttribute("aria-label", /Mai R\$\s*2.180,00/);
  await page
    .getByRole("button", { name: "Próximo mês da demonstração" })
    .click();

  await page.getByRole("button", { name: "Mensal", exact: true }).click();
  await expect(page.locator(".plan-heading .pill")).toHaveText("Plano mensal");
  await expect(page.locator(".plan-price")).toContainText("Em definição");
  await page.getByRole("button", { name: /^Anual/ }).click();
  await expect(page.locator(".plan-heading .pill")).toHaveText("Plano anual");
  await page
    .getByRole("button", { name: "Conhecer os planos", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Valores, condições e formas de pagamento",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Conhecer os planos", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Seu espaço está chegando.",
  );
  await expect(page.getByRole("dialog").locator("input")).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar janela" }).click();
  await page.getByRole("button", { name: "Privacidade", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "não são enviados automaticamente ao site ou ao Firebase",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Termos de uso", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "ainda estão em definição",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Suporte", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Dúvidas frequentes/ })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/#duvidas$/);
  await page
    .locator("summary")
    .filter({ hasText: "O aplicativo funciona sem internet?" })
    .click();
  await expect(page.locator("details[open]")).toContainText(
    "gestão financeira funciona localmente",
  );
  await page
    .locator("summary")
    .filter({ hasText: "Quanto custam os planos?" })
    .click();
  await expect(page.locator("details[open]")).toHaveCount(1);
  await expect(page.locator("details[open]")).toContainText("em definição");
  await page
    .locator("summary")
    .filter({ hasText: "Quanto custam os planos?" })
    .click();

  await mkdir(".runtime", { recursive: true });
  for (const width of [1440, 1024, 768, 700, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:4174");
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert(
      overflow.scroll <= overflow.width + 1,
      `Overflow em ${width}px: ${JSON.stringify(overflow)}`,
    );
    for (const tab of ["Visão geral", "Cartões", "Metas"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Overflow na demonstração ${tab}/${width}`,
      );
    }
    await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
    if (width <= 700) {
      await page
        .getByRole("button", { name: "Abrir menu", exact: true })
        .click();
      await expect(page.getByRole("navigation")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Abrir menu", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Abrir menu", exact: true })
        .click();
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "Recursos", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Abrir menu", exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
    }
    if ([1440, 390].includes(width)) {
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: `.runtime/site-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({ path: `.runtime/hero-${width}.png` });
    }
    await page
      .getByRole("button", { name: "Conhecer os planos", exact: true })
      .click();
    const rect = await page.getByRole("dialog").boundingBox();
    assert(
      rect.x >= 0 && rect.x + rect.width <= width + 1,
      `Dialog fora da tela em ${width}`,
    );
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await verifyAccessibility(page, "site público em celular");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Overflow com texto a 200%",
  );
  await page
    .getByRole("button", { name: "Conhecer os planos", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  assert(
    await page
      .getByRole("dialog")
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    "Overflow no dialog com texto ampliado",
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  await page.goto("http://127.0.0.1:4174/?checkout=success#conta");
  await expect(page.getByRole("dialog")).toContainText(
    "só será exibida como ativa após a confirmação",
  );
  await expect(page.getByRole("dialog")).not.toContainText("Assinatura ativa");
  await verifyAccessibility(page, "área da conta em preparação");
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, [], `Erros no navegador: ${errors.join("; ")}`);
  console.log(
    "Site validado: demonstração, meses, planos, navegação, diálogos, FAQ, retorno de checkout, 320–1440px e texto a 200%.",
  );
} finally {
  await browser?.close();
  server.kill();
}
