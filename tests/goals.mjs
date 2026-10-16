import { expect } from "playwright/test";
import { goTo } from "./navigation.mjs";
export async function verifyGoalDialog(page) {
  await goTo(page, "Metas");
  await page.getByRole("button", { name: "Nova meta", exact: true }).click();
  await page
    .getByLabel("Tipo de meta", { exact: true })
    .selectOption("spending");
  const dialog = page.getByRole("dialog", { name: "Nova meta", exact: true });
  const layout = await dialog.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      viewport: innerWidth,
      overflow: element.scrollWidth - element.clientWidth,
      controls: [...element.querySelectorAll("input, select, textarea")].map(
        (control) => ({
          width: control.getBoundingClientRect().width,
          font: getComputedStyle(control).fontFamily,
          outside: control.getBoundingClientRect().right > box.right + 1,
        }),
      ),
    };
  });
  expect(layout.left).toBeGreaterThanOrEqual(0);
  expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  for (const control of layout.controls) {
    expect(control.width).toBeGreaterThan(0);
    expect(control.font.startsWith("Inter")).toBeTruthy();
    expect(control.outside).toBeFalsy();
  }
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
}
export async function verifyGoals(page, { capture = false } = {}) {
  await expect(page.locator(".save-status")).toHaveText(/Tudo salvo/);
  const original = await page.evaluate(async () =>
    window.saldo
      ? await window.saldo.load()
      : JSON.parse(localStorage.getItem("saldo-data-v1")),
  );
  const fixture = await page.evaluate(() => {
    const now = new Date(),
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return {
      version: 1,
      cards: [
        {
          id: "goal-card",
          name: "Principal",
          bank: "Inter",
          last4: "",
          color: "#2563eb",
          dueDay: 10,
          limitCents: 500000,
        },
      ],
      purchases: [
        {
          id: "goal-purchase",
          description: "Alimentação parcelada",
          cardId: "goal-card",
          category: "Alimentação",
          totalCents: 30000,
          installments: 3,
          paid: 0,
          nextMonth: month,
        },
      ],
      settings: { theme: "ultra", motion: false },
      cashEntries: [
        {
          id: "goal-income",
          description: "Renda recebida",
          source: "Empresa",
          date: month + "-01",
          amountCents: 100000,
          kind: "income",
        },
        {
          id: "goal-expected",
          description: "Valor previsto",
          source: "Empresa",
          date: month + "-02",
          amountCents: 500000,
          kind: "income",
          status: "planned",
        },
      ],
      expenses: [
        {
          id: "goal-expense",
          description: "Mercado",
          payee: "Loja",
          category: "Alimentação",
          amountCents: 10000,
          dueDate: month + "-05",
          method: "pix",
          paidDate: null,
        },
      ],
      goals: [],
    };
  });
  const replace = async (data) => {
    await page.evaluate(async (data) => {
      if (window.saldo) await window.saldo.save(data);
      else localStorage.setItem("saldo-data-v1", JSON.stringify(data));
    }, data);
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
  };
  const card = (name) =>
    page.getByRole("article", { name: `Meta ${name}`, exact: true });
  async function create(title, amount, kind = "saving") {
    await page.getByRole("button", { name: "Nova meta", exact: true }).click();
    await page.getByLabel("Tipo de meta", { exact: true }).selectOption(kind);
    await page.getByLabel("Nome da meta", { exact: true }).fill(title);
    await page
      .getByLabel(kind === "saving" ? "Valor do objetivo" : "Limite por mês", {
        exact: true,
      })
      .fill(amount);
  }
  async function action(title, label) {
    await card(title)
      .getByRole("button", {
        name: `Mais opções da meta ${title}`,
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  async function save() {
    await page
      .getByRole("button", { name: "Salvar meta", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  try {
    await replace(fixture);
    await goTo(page, "Metas");
    await expect(
      page.getByRole("heading", {
        name: "O que você quer conquistar?",
        exact: true,
      }),
    ).toBeVisible();
    await create("Notebook", "1000,00");
    await save();
    await expect(card("Notebook").getByTestId("goal-current")).toHaveText(
      /800,00/,
    );
    await expect(card("Notebook").getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "80",
    );
    await expect(page.getByTestId("goals-available")).toHaveText(/800,00/);
    await create("Viagem", "500,00");
    await save();
    await expect(card("Viagem").getByTestId("goal-current")).toHaveText(/0,00/);
    await action("Viagem", "Priorizar meta");
    await expect(card("Viagem").getByTestId("goal-current")).toHaveText(
      /500,00/,
    );
    await expect(card("Notebook").getByTestId("goal-current")).toHaveText(
      /300,00/,
    );
    await action("Notebook", "Editar meta");
    await page.getByLabel("Valor do objetivo", { exact: true }).fill("2000,00");
    await save();
    await expect(card("Notebook").getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "15",
    );
    await create("Comer melhor gastando menos", "300,00", "spending");
    await page
      .getByLabel("Categoria da meta", { exact: true })
      .selectOption("Alimentação");
    await page
      .getByLabel("Gasto de referência", { exact: true })
      .fill("400,00");
    await save();
    await expect(
      card("Comer melhor gastando menos").getByTestId("goal-current"),
    ).toHaveText(/200,00/);
    await expect(card("Comer melhor gastando menos")).toContainText(
      /Economia parcial:.*200,00/,
    );
    await page.reload();
    await goTo(page, "Metas");
    await expect(card("Notebook").getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "15",
    );
    await expect(page.getByRole("article")).toHaveCount(3);
    await page.getByLabel("Buscar metas", { exact: true }).fill("viágem");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByLabel("Buscar metas", { exact: true }).fill("");
    await page
      .getByLabel("Filtrar tipo de meta", { exact: true })
      .selectOption("spending");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page
      .getByLabel("Filtrar tipo de meta", { exact: true })
      .selectOption("all");
    await page.getByText("Ver evolução das economias", { exact: true }).click();
    await expect(
      page.getByRole("img", {
        name: "Evolução mensal do saldo estimado para metas",
        exact: true,
      }),
    ).toBeVisible();
    await page.locator(".goal-chart path.recharts-rectangle").first().hover();
    await expect(page.getByRole("tooltip")).toContainText(/800,00/);
    expect(
      await page.getByRole("tooltip").evaluate((element) => {
        const box = element.getBoundingClientRect();
        element.style.pointerEvents = "auto";
        const front = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        element.style.pointerEvents = "";
        return element.contains(front) && !element.closest(".panel");
      }),
    ).toBeTruthy();
    await page.mouse.move(0, 0);
    await page.getByText("Consultar valores por mês", { exact: true }).click();
    await expect(page.locator(".goal-chart-table table")).toContainText(
      /800,00/,
    );
    if (capture) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: ".runtime/goals-wide.png",
        fullPage: true,
        animations: "disabled",
      });
    }
    await goTo(page, "Despesas");
    await page
      .getByRole("button", { name: "Nova despesa", exact: true })
      .click();
    await page
      .getByLabel("Descrição da despesa", { exact: true })
      .fill("Outra ida ao mercado");
    await page.getByLabel("Destino / favorecido", { exact: true }).fill("Loja");
    await page
      .getByLabel("Categoria da despesa", { exact: true })
      .selectOption("Alimentação");
    await page.getByLabel("Valor da despesa", { exact: true }).fill("150,00");
    await page
      .getByRole("button", { name: "Salvar despesa", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await goTo(page, "Metas");
    await expect(page.getByTestId("goals-available")).toHaveText(/650,00/);
    await expect(
      card("Comer melhor gastando menos").getByTestId("goal-current"),
    ).toHaveText(/350,00/);
    await expect(card("Comer melhor gastando menos")).toContainText(
      "Limite ultrapassado",
    );
    await expect(card("Comer melhor gastando menos")).toContainText(
      /Economia parcial:.*50,00/,
    );
    await expect(card("Notebook").getByTestId("goal-current")).toHaveText(
      /150,00/,
    );
    await page.keyboard.press("Control+k");
    await page.getByLabel("Busca geral", { exact: true }).fill("Notebook");
    await page.getByRole("button", { name: /Notebook.*Meta/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Editar meta", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await action("Viagem", "Arquivar meta");
    await expect(card("Viagem")).toHaveCount(0);
    await expect(card("Notebook").getByTestId("goal-current")).toHaveText(
      /650,00/,
    );
    await page
      .getByLabel("Filtrar situação das metas", { exact: true })
      .selectOption("archived");
    await expect(card("Viagem")).toBeVisible();
    await action("Viagem", "Retomar meta");
    await page
      .getByLabel("Filtrar situação das metas", { exact: true })
      .selectOption("active");
    await action("Viagem", "Excluir meta");
    await expect(
      page.getByRole("dialog", { name: "Excluir meta?", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Excluir meta", exact: true })
      .click();
    await expect(card("Viagem")).toHaveCount(0);
    const saved = await page.evaluate(async () =>
      window.saldo
        ? await window.saldo.load()
        : JSON.parse(localStorage.getItem("saldo-data-v1")),
    );
    expect(saved.goals).toHaveLength(2);
    expect(saved.purchases).toEqual(fixture.purchases);
    expect(saved.cashEntries).toEqual(fixture.cashEntries);
    await page.locator('input[accept=".json,application/json"]').setInputFiles({
      name: "metas-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
    await expect(
      page.getByRole("dialog", { name: "Restaurar backup?", exact: true }),
    ).toContainText("2 metas");
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const restored = await page.evaluate(async () =>
      window.saldo
        ? await window.saldo.load()
        : JSON.parse(localStorage.getItem("saldo-data-v1")),
    );
    expect(restored.goals).toEqual(saved.goals);
    console.log(
      "Metas: saldo recebido, prioridades sem duplicação, limites por categoria, economia parcial, novas despesas, filtros, busca, edição, arquivo, exclusão e persistência verificados.",
    );
  } finally {
    await replace(original);
  }
}
