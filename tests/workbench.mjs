import { expect } from "playwright/test";
const readData = (page) =>
  page.evaluate(async () =>
    window.saldo
      ? await window.saldo.load()
      : JSON.parse(localStorage.getItem("saldo-data-v1")),
  );
const nav = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
export async function runWorkbench(page) {
  const original = await readData(page),
    now = new Date(),
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await nav(page, "Início");
  await expect(page.getByTestId("available-to-spend")).toBeVisible();
  await page.getByText("Ajustar reserva", { exact: true }).click();
  await page.getByLabel("Reserva mensal", { exact: true }).fill("100,00");
  await nav(page, "Salvar reserva");
  await expect
    .poll(async () => (await readData(page)).settings.reserveCents)
    .toBe(10000);
  await nav(page, "Personalizar início");
  await page.getByLabel("Atalhos das funções", { exact: true }).uncheck();
  await expect(
    page.getByRole("button", { name: "Explorar Visão geral", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Mover Disponível para gastar para cima");
  await expect
    .poll(async () => (await readData(page)).settings.homeWidgets[0])
    .toBe("available");
  await nav(page, "Restaurar organização padrão");
  await expect(
    page.getByRole("button", { name: "Explorar Visão geral", exact: true }),
  ).toBeVisible();
  await nav(page, "Calendário");
  await expect(page.locator(".calendar-day")).toHaveCount(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  );
  await page.locator(".calendar-day").nth(9).click();
  await expect(page.locator(".calendar-day").nth(9)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .locator(".full-width .ledger-row")
    .filter({ hasText: "Fatura ·" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /^Fatura de / }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Parcela");
  await nav(page, "Fechar");
  await nav(page, "Pendências");
  await page.getByLabel("Filtrar pendências").selectOption("review");
  await page.getByLabel("Filtrar pendências").selectOption("all");
  await page.keyboard.press("Control+k");
  await expect(page.getByLabel("Busca geral", { exact: true })).toBeVisible();
  await page.getByLabel("Busca geral", { exact: true }).fill("Geladeira");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Descrição da compra")).toHaveValue("Geladeira");
  await nav(page, "Cancelar");
  await nav(page, "Simular compra");
  await expect(
    page.getByText(
      "Informe o dia de fechamento dos cartões para comparar prazos.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Configurar fechamento de/ })
    .first()
    .click();
  await page.getByLabel("Dia de fechamento", { exact: true }).fill("2");
  await nav(page, "Salvar cartão");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await nav(page, "Simular compra");
  await expect(page.locator(".recommendation")).toHaveCount(1);
  await page.getByLabel("Valor da compra simulada").fill("100,01");
  await page.getByLabel("Parcelas simuladas").fill("3");
  await expect(page.locator(".workbench-grid tbody tr")).toHaveCount(3);
  const beforeSimulation = await readData(page);
  await nav(page, "Continuar para anotar compra");
  await expect(
    page.getByLabel("Valor total da compra", { exact: true }),
  ).toHaveValue("100,01");
  await expect(page.getByLabel("Número de parcelas")).toHaveValue("3");
  await nav(page, "Cancelar");
  expect(await readData(page)).toEqual(beforeSimulation);
  await nav(page, "Visão geral");
  await page.locator(".donut-legend-row").first().click();
  await expect(page.getByRole("dialog")).toContainText(
    "Saldo das parcelas restantes",
  );
  await nav(page, "Fechar");
  await nav(page, "Ocultar valores");
  await expect(page.getByTestId("total-debt")).toHaveText("R$ ••••");
  await page
    .locator('.chart-monthly path.recharts-rectangle[fill="var(--accent)"]')
    .filter({ visible: true })
    .first()
    .hover();
  await expect(page.getByRole("tooltip")).toContainText("R$ ••••");
  await page.mouse.move(0, 0);
  await nav(page, "Mostrar valores");
  await expect(page.getByTestId("total-debt")).not.toContainText("••••");
  await nav(page, "Aparência");
  await page.getByLabel("Densidade da interface").selectOption("compact");
  await nav(page, "Aplicar aparência");
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await nav(page, "Dados e segurança");
  await nav(page, "Criar cópia agora");
  await expect(
    page.getByRole("status").filter({ hasText: "Cópia de segurança criada." }),
  ).toBeVisible();
  await expect(page.locator(".backup-list > div").first()).toBeVisible();
  await page.getByLabel("Arquivo de fatura ou extrato").setInputFiles({
    name: "fatura.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `Data;Descrição;Valor\n${month}-01;Compra importada UI;31,99\n${month}-01;Compra importada UI;31,99\n31/02/2026;Data inválida;10,00\n${month}-02;Estorno;-10,00`,
    ),
  });
  await expect(page.locator(".import-summary").first()).toContainText(
    "1 possíveis duplicatas",
  );
  await expect(page.locator(".import-table tbody tr")).toHaveCount(4);
  await page.getByLabel("Categoria da linha 2").selectOption("Tecnologia");
  await page
    .getByRole("button", {
      name: "Confirmar importação de 1 lançamentos",
      exact: true,
    })
    .click();
  await expect
    .poll(async () =>
      (await readData(page)).purchases.some(
        (p) =>
          p.description === "Compra importada UI" &&
          p.category === "Tecnologia" &&
          p.totalCents === 3199,
      ),
    )
    .toBe(true);
  await page.getByLabel("Arquivo de fatura ou extrato").setInputFiles({
    name: "fatura.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `Data;Descrição;Valor\n${month}-01;Compra importada UI;31,99`,
    ),
  });
  await expect(page.locator(".import-summary").first()).toContainText(
    "1 possíveis duplicatas",
  );
  await expect(
    page.getByRole("button", {
      name: "Confirmar importação de 0 lançamentos",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Desfazer última alteração", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await readData(page)).purchases.some(
        (p) => p.description === "Compra importada UI",
      ),
    )
    .toBe(false);
  await page.getByLabel("Destino da importação").selectOption("cash");
  const ofxDate = month.replaceAll("-", "") + "03";
  await page.getByLabel("Arquivo de fatura ou extrato").setInputFiles({
    name: "extrato.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.from(
      `<OFX><STMTTRN><DTPOSTED>${ofxDate}<TRNAMT>100.01<FITID>ui-income<MEMO>OFX entrada UI</STMTTRN><STMTTRN><DTPOSTED>${ofxDate}<TRNAMT>-10.01<FITID>ui-outflow<MEMO>OFX saída UI</STMTTRN></OFX>`,
    ),
  });
  await expect(page.locator(".import-table tbody tr")).toHaveCount(2);
  await nav(page, "Confirmar importação de 2 lançamentos");
  await expect
    .poll(async () =>
      (await readData(page)).cashEntries
        .filter((e) => e.description.startsWith("OFX "))
        .map((e) => [e.kind, e.amountCents]),
    )
    .toEqual([
      ["income", 10001],
      ["deduction", 1001],
    ]);
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Desfazer última alteração", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await readData(page)).cashEntries.some((e) =>
        e.description.startsWith("OFX "),
      ),
    )
    .toBe(false);
  // A second independent edit verifies that the undo stack retains earlier changes.
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Desfazer última alteração", exact: true })
    .click();
  await expect
    .poll(async () => (await readData(page)).cards[0].closingDay)
    .toBeUndefined();
  // Restore a real local snapshot through the confirmation flow.
  await page
    .locator(".backup-list > div")
    .first()
    .getByRole("button", { name: "Restaurar esta cópia" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Uma cópia do estado atual será criada antes.",
  );
  await nav(page, "Confirmar");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect
    .poll(async () => (await readData(page)).cards[0].closingDay)
    .toBe(2);
  // Preserve the fixture for the rest of both browser and packaged desktop suites.
  await page.locator('input[accept=".json,application/json"]').setInputFiles({
    name: "original.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await nav(page, "Confirmar");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await readData(page)).toEqual(original);
  await nav(page, "Entradas do mês");
  console.log(
    "Disponível, reserva, cards ordenáveis, calendário, pendências, busca por teclado, prazos, simulação, gráficos detalhados, privacidade, densidade, importação, duplicatas, múltiplos desfazeres e restauração real verificados.",
  );
}
