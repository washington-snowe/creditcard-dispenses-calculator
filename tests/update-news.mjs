import { expect } from "playwright/test";
import { readFile } from "node:fs/promises";
import { goTo } from "./navigation.mjs";

export async function verifyUpdateNews(browser, url) {
  const notes = JSON.parse(
    await readFile(
      new URL("../src/release-notes.json", import.meta.url),
      "utf8",
    ),
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
  });
  try {
    await context.addInitScript(
      ({ notes }) => {
        const fixture = (window.updateFixture = {
          info: { currentVersion: notes.version, canInstall: true },
          fail: false,
          mode: "cancel",
        });
        let listener, rejectDownload;
        window.saldo = {
          load: async () => null,
          save: async () => {},
          ready: async () => {},
          updateInfo: async () => fixture.info,
          checkUpdates: async () => {
            if (fixture.fail)
              throw new Error(
                "Não foi possível conectar ao serviço de atualização.",
              );
            return fixture.info;
          },
          onUpdateProgress: (callback) => {
            listener = callback;
            return () => {
              listener = null;
            };
          },
          downloadUpdate: async () => {
            if (fixture.mode === "cancel") {
              listener?.({
                phase: "download",
                received: 1024,
                total: 2048,
                percent: 50,
              });
              await new Promise((resolve, reject) => {
                rejectDownload = reject;
              });
            } else fixture.info.readyVersion = fixture.info.version;
          },
          cancelUpdate: async () =>
            rejectDownload(new Error("Download cancelado.")),
          applyUpdate: async () => {
            throw new Error("Feche os outros processos e tente novamente.");
          },
        };
      },
      { notes },
    );
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await expect(page.locator("main")).toBeVisible();
    await goTo(page, "Atualizações");
    await expect(
      page.getByRole("heading", {
        name: `Novidades da versão ${notes.version}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(
      notes.highlights.length,
    );
    await expect(page.locator("main")).not.toContainText(
      /GitHub|repositório|Node\.js|Git instalado/i,
    );
    await page.screenshot({
      path: ".runtime/update-news-installed.png",
      fullPage: true,
    });
    await page.evaluate(() => {
      window.updateFixture.fail = true;
    });
    await page
      .getByRole("button", { name: "Verificar atualizações", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      "Não foi possível conectar ao serviço de atualização.",
    );
    await expect(
      page.getByRole("heading", {
        name: notes.highlights[0].title,
        exact: true,
      }),
    ).toBeVisible();
    await page.evaluate(() => {
      window.updateFixture.fail = false;
    });
    const nextNotes = {
      ...notes,
      version: "99.0.0",
      title: "Próxima versão",
      highlights: [
        {
          title: "Destaque da próxima versão",
          description: "Notas específicas para a nova versão.",
          kind: "improved",
        },
      ],
    };
    await page.evaluate((notes) => {
      Object.assign(window.updateFixture.info, {
        available: true,
        version: notes.version,
        notes,
      });
    }, nextNotes);
    await page
      .getByRole("button", { name: "Verificar atualizações", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Destaque da próxima versão",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByText(`Novidades da sua versão atual (${notes.version})`, {
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: notes.highlights[0].title,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Baixar atualização", exact: true })
      .click();
    await expect(page.getByText("50%", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Cancelar download", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText("Download cancelado.");
    await page.evaluate(() => {
      window.updateFixture.info.notes = null;
    });
    await page
      .getByRole("button", { name: "Verificar atualizações", exact: true })
      .click();
    await expect(
      page.getByText(/Os destaques desta versão não estão disponíveis/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Destaque da próxima versão",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.evaluate(() => {
      window.updateFixture.mode = "ready";
    });
    await page
      .getByRole("button", { name: "Baixar atualização", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reiniciar e atualizar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Aplicar atualização", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
      "Feche os outros processos e tente novamente.",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: ".runtime/update-news-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(errors).toEqual([]);
    console.log(
      "Novidades instaladas, próxima versão, ausência de notas, download, cancelamento, recuperação de erro e layout móvel verificados.",
    );
  } finally {
    await context.close();
  }
}
