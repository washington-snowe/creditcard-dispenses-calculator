import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "playwright/test";
import { verifyAccessibility } from "./accessibility.mjs";

// Public test identifiers only. All Google requests are intercepted locally;
// no credentials or accounts are sent to a real Firebase project.
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5175",
    "--strictPort",
  ],
  {
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: "test-public-key",
      VITE_FIREBASE_AUTH_DOMAIN: "contaclara-test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "contaclara-test",
      VITE_FIREBASE_APP_ID: "1:123:web:test",
      VITE_CHECKOUT_ENABLED: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Servidor de autenticação não iniciou")),
      20000,
    );
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("5175")) {
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
      reject(new Error(`Servidor finalizou: ${code}`));
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
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const calls = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const uid = "local-test-user",
    email = "ana@example.com";
  let displayName = "Ana Silva";
  const now = Math.floor(Date.now() / 1000);
  const token =
    [
      { alg: "RS256", typ: "JWT" },
      {
        sub: uid,
        user_id: uid,
        aud: "contaclara-test",
        iat: now,
        exp: now + 3600,
        email,
        email_verified: false,
        firebase: { sign_in_provider: "password" },
      },
    ]
      .map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
      .join(".") + ".test-signature";
  await page.route(/https:\/\/.*googleapis\.com\//, async (route) => {
    const request = route.request();
    if (!request.url().includes("identitytoolkit.googleapis.com"))
      return route.abort();
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
        },
      });
    const body = request.postDataJSON();
    calls.push({ url: request.url(), body });
    let result = {};
    let status = 200;
    if (
      request.url().includes("accounts:signInWithPassword") &&
      body.password === "incorrect"
    ) {
      status = 400;
      result = { error: { code: 400, message: "INVALID_LOGIN_CREDENTIALS" } };
    } else if (request.url().includes("accounts:lookup")) {
      result = {
        users: [
          {
            localId: uid,
            email,
            displayName,
            emailVerified: false,
            passwordHash: "test",
            providerUserInfo: [{ providerId: "password", email }],
            createdAt: String(Date.now()),
            lastLoginAt: String(Date.now()),
          },
        ],
      };
    } else if (request.url().includes("accounts:update")) {
      displayName = body.displayName || displayName;
      result = { localId: uid, email, displayName };
    } else if (request.url().includes("accounts:sendOobCode")) {
      result = { email };
    } else {
      result = {
        localId: uid,
        email,
        displayName,
        idToken: token,
        refreshToken: "test-refresh-token",
        expiresIn: "3600",
        registered: true,
      };
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(result),
    });
  });
  await page.goto("http://127.0.0.1:5175/#conta");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("E-mail", { exact: true })).toBeVisible();
  await verifyAccessibility(page, "formulário de login");
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByLabel("Senha", { exact: true }).fill("incorrect");
  await dialog.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(dialog.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await dialog.getByRole("button", { name: "Ocultar senha" }).click();
  await dialog.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "E-mail ou senha incorretos",
  );
  await dialog.getByRole("button", { name: "Esqueci minha senha" }).click();
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(dialog.getByRole("status")).toContainText("Se houver uma conta");
  assert(calls.some((call) => call.body.requestType === "PASSWORD_RESET"));
  await dialog.getByRole("button", { name: "Voltar para entrar" }).click();
  await dialog
    .getByRole("button", { name: "Criar conta", exact: true })
    .click();
  await dialog.getByLabel("Seu nome", { exact: true }).fill("Ana Silva");
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByLabel("Senha", { exact: true }).fill("valid-test-password");
  const legalTab = page.waitForEvent("popup");
  await dialog
    .getByRole("link", { name: "Termos de uso (abre em nova aba)" })
    .click();
  const legal = await legalTab;
  await expect(legal.getByRole("dialog")).toContainText(
    "Finalidade do produto",
  );
  await legal.close();
  await expect(dialog.getByLabel("Seu nome", { exact: true })).toHaveValue(
    "Ana Silva",
  );
  await expect(dialog.getByLabel("Senha", { exact: true })).toHaveValue(
    "valid-test-password",
  );
  await verifyAccessibility(page, "formulário de cadastro");
  // Native form validation must prevent registration without consent.
  await dialog.getByRole("button", { name: "Criar minha conta" }).click();
  assert(!calls.some((call) => call.url.includes("accounts:signUp")));
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(
    dialog.getByRole("button", { name: "Sair da conta" }),
  ).toBeVisible();
  await expect(dialog).toContainText(email);
  await expect(dialog).toContainText("Confirme seu e-mail");
  await expect(dialog).toContainText("Nenhuma cobrança está disponível");
  await verifyAccessibility(page, "conta autenticada");
  assert(
    calls.some(
      (call) =>
        call.url.includes("accounts:signUp") && call.body.email === email,
    ),
  );
  await dialog.getByRole("button", { name: "Reenviar confirmação" }).click();
  await expect(dialog.getByRole("status")).toContainText("novo e-mail");
  assert(calls.some((call) => call.body.requestType === "VERIFY_EMAIL"));
  await dialog.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    dialog.getByRole("button", { name: "Entrar na minha conta" }),
  ).toBeVisible();
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByLabel("Senha", { exact: true }).fill("valid-test-password");
  await dialog.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(
    dialog.getByRole("button", { name: "Sair da conta" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText(email);
  await mkdir(".runtime", { recursive: true });
  await page.screenshot({ path: ".runtime/account-390.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Conta validada com API simulada: senha incorreta, recuperação, consentimento, cadastro, confirmação, login, saída e persistência. Nenhum serviço externo recebeu dados.",
  );
} finally {
  await browser?.close();
  server.kill();
}
