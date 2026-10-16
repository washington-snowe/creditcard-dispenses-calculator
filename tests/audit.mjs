import { expect } from "playwright/test";
import { readFile } from "node:fs/promises";
import { goTo } from "./navigation.mjs";

export async function verifyActionMenus(page, { resize = true } = {}) {
  const original = await page.evaluate(() =>
    window.saldo
      ? window.saldo.load()
      : JSON.parse(localStorage.getItem("saldo-data-v1")),
  );
  const originalSize = page.viewportSize();
  const month = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, m] = month.split("-").map(Number);
  const prior = new Date(year, m - 2, 1);
  const previousMonth = `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, "0")}`;
  const fixture = {
    version: 1,
    cards: [
      {
        id: "a",
        name: "Principal",
        bank: "Nubank",
        last4: "",
        color: "#665df5",
        dueDay: 10,
        limitCents: 100000,
      },
    ],
    purchases: [
      {
        id: "active",
        description: "Notebook",
        cardId: "a",
        category: "Tecnologia",
        totalCents: 30000,
        installments: 3,
        paid: 0,
        nextMonth: month,
      },
      {
        id: "paid",
        description: "Compra quitada",
        cardId: "a",
        category: "Compras",
        totalCents: 1000,
        installments: 1,
        paid: 1,
        nextMonth: month,
      },
    ],
    subscriptions: [
      {
        id: "s",
        name: "Streaming",
        provider: "Serviço",
        category: "Lazer",
        amountCents: 2000,
        cardId: null,
        frequency: "monthly",
        dueDay: 10,
        startMonth: month,
        endMonth: null,
      },
    ],
    cashEntries: [
      {
        id: "c",
        description: "Entrada avulsa",
        source: "Trabalho",
        date: `${month}-01`,
        amountCents: 10000,
        kind: "income",
      },
    ],
    recurringIncomes: [
      {
        id: "r",
        description: "Renda mensal",
        source: "Empresa",
        amountCents: 50000,
        dueDay: 10,
        frequency: "monthly",
        startMonth: month,
        endMonth: null,
      },
    ],
    incomeReceipts: [
      {
        id: "receipt-prev",
        recurringId: "r",
        month: previousMonth,
        date: `${month}-02`,
        amountCents: 10000,
        description: "Renda histórica anterior",
        source: "Origem antiga",
      },
      {
        id: "receipt-current",
        recurringId: "r",
        month,
        date: `${month}-03`,
        amountCents: 20000,
        description: "Renda histórica atual",
        source: "Origem antiga",
      },
    ],
    expenses: [
      {
        id: "e",
        description: "Energia",
        payee: "Concessionária",
        category: "Casa",
        amountCents: 5000,
        dueDate: `${month}-10`,
        method: "pix",
        paidDate: null,
      },
    ],
    goals: [
      {
        id: "g",
        title: "Minha conquista",
        description: "",
        kind: "saving",
        targetCents: 100000,
        startMonth: month,
        deadlineMonth: null,
        category: null,
        baselineCents: null,
        archived: false,
      },
    ],
    settings: { theme: "ultra", motion: false },
  };
  const replace = async (data) => {
    await page.evaluate(async (value) => {
      if (window.saldo) await window.saldo.save(value);
      else localStorage.setItem("saldo-data-v1", JSON.stringify(value));
    }, data);
    await page.reload();
    await expect(page.getByTestId("launch-welcome")).toBeVisible();
  };
  async function checkMenu(label, count) {
    const trigger = page.getByRole("button", { name: label, exact: true });
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    const menu = page.getByRole("group", { name: label, exact: true });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button")).toHaveCount(count);
    const layout = await menu.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: innerWidth,
        height: innerHeight,
        items: [...el.querySelectorAll("button")].map((b) => {
          const text = b.querySelector(".action-label"),
            icon = b.querySelector("svg");
          return {
            width: b.clientWidth,
            overflow: text.scrollWidth - text.clientWidth,
            icon: icon.getBoundingClientRect().width,
            height: b.clientHeight,
          };
        }),
      };
    });
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.right).toBeLessThanOrEqual(layout.width + 1);
    expect(layout.top).toBeGreaterThanOrEqual(0);
    expect(layout.bottom).toBeLessThanOrEqual(layout.height + 1);
    for (const item of layout.items) {
      expect(item.width).toBeGreaterThan(100);
      expect(item.overflow).toBeLessThanOrEqual(1);
      expect(item.icon).toBeGreaterThanOrEqual(15);
      expect(item.height).toBeGreaterThanOrEqual(44);
    }
    await expect(menu.getByRole("button").first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("button").last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(menu).not.toBeVisible();
  }
  try {
    await replace(fixture);
    for (const [destination, label, count] of [
      ["Meus cartões", "Mais opções do cartão Principal", 3],
      ["Minhas compras", "Mais opções de Notebook", 2],
      ["Entradas do mês", "Mais opções de Entrada avulsa", 2],
      ["Entradas do mês", "Mais opções de Renda mensal", 2],
      ["Despesas", "Mais opções de Energia", 2],
      ["Assinaturas", "Mais opções de Streaming", 2],
      ["Metas", "Mais opções da meta Minha conquista", 3],
    ]) {
      await goTo(page, destination);
      await checkMenu(label, count);
    }
    await goTo(page, "Minhas compras");
    await page.getByRole("button", { name: "Quitadas", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Mais opções de Compra quitada",
        exact: true,
      }),
    ).toHaveCount(0);
    const remove = page.getByRole("button", {
      name: "Excluir Compra quitada",
      exact: true,
    });
    await expect(remove).toBeVisible();
    await expect(remove).toHaveClass(/action-direct/);
    await remove.click();
    await expect(
      page.getByRole("dialog", { name: "Excluir compra?", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await goTo(page, "Visão geral");
    await page
      .getByLabel("Filtrar status", { exact: true })
      .selectOption("all");
    await expect(
      page.getByRole("button", {
        name: "Mais opções de Notebook",
        exact: true,
      }),
    ).toHaveCount(0);
    const advance = page.getByRole("button", {
      name: "Antecipar Notebook",
      exact: true,
    });
    await expect(advance).toHaveClass(/action-direct/);
    await advance.click();
    await expect(
      page.getByRole("button", { name: "Registrar antecipação", exact: true }),
    ).toBeVisible();
    await page.getByRole("dialog").press("Escape");
    await expect(advance).toBeFocused();
    await goTo(page, "Calendário");
    const agenda = page.locator("section.panel").filter({
      has: page.getByRole("heading", { name: "Agenda do mês", exact: true }),
    });
    await expect(
      agenda.getByRole("button", { name: /Renda histórica anterior/ }),
    ).toHaveCount(1);
    await expect(
      agenda.getByRole("button", { name: /Renda histórica atual/ }),
    ).toHaveCount(1);
    await expect(agenda).toContainText("Origem antiga");
    for (const theme of ["light", "dark", "ultra"]) {
      await replace({ ...fixture, settings: { ...fixture.settings, theme } });
      await goTo(page, "Minhas compras");
      await checkMenu("Mais opções de Notebook", 2);
    }
    if (resize) {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await checkMenu("Mais opções de Notebook", 2);
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "175%";
      });
      await checkMenu("Mais opções de Notebook", 2);
    }
    const unchanged = await page.evaluate(() =>
      window.saldo
        ? window.saldo.load()
        : JSON.parse(localStorage.getItem("saldo-data-v1")),
    );
    expect(unchanged).toEqual(fixture);
    console.log(
      "Menus de sete contextos: ícones, texto, teclado, limites da janela e ações únicas diretas verificados sem alterar registros.",
    );
  } finally {
    await page.evaluate(() =>
      document.documentElement.style.removeProperty("font-size"),
    );
    if (resize && originalSize) await page.setViewportSize(originalSize);
    await replace(original);
    await goTo(page, "Visão geral");
  }
}

export async function verifyPhraseLayout(page) {
  const phrases = JSON.parse(
    await readFile(
      new URL("../electron/welcome-phrases.json", import.meta.url),
      "utf8",
    ),
  );
  await goTo(page, "Boas-vindas");
  await expect(page.getByTestId("welcome-phrase")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.evaluate(() => document.fonts.ready);
  const result = await page
    .getByTestId("welcome-phrase")
    .evaluate((el, phrases) => {
      const original = el.textContent;
      const failures = [];
      for (const phrase of phrases) {
        el.textContent = phrase;
        const box = el.getBoundingClientRect(),
          hero = el.closest(".greeting-hero"),
          parent = hero.getBoundingClientRect(),
          style = getComputedStyle(hero);
        if (
          el.scrollWidth > el.clientWidth + 1 ||
          el.scrollHeight > el.clientHeight + 1 ||
          box.right > parent.right - parseFloat(style.paddingRight) + 1 ||
          box.bottom > parent.bottom - parseFloat(style.paddingBottom) + 1
        )
          failures.push(phrase);
      }
      el.textContent = original;
      return failures;
    }, phrases);
  expect(result).toEqual([]);
}
