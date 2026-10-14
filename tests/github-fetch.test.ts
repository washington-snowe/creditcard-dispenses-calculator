import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createGitHubFetch } = require("../electron/github-fetch.cjs");
const repository =
  "https://github.com/washington-snowe/creditcard-dispenses-calculator";
class Request extends EventEmitter {
  aborted = false;
  followed = false;
  setHeader() {}
  abort() {
    this.aborted = true;
  }
  followRedirect() {
    this.followed = true;
  }
  end() {}
}
test("transporte nativo mantém a URL final e transmite o corpo sem perder bytes", async () => {
  const request = new Request();
  request.end = () =>
    queueMicrotask(() =>
      request.emit("redirect", 302, "GET", repository + "/releases/tag/v3.0.1"),
    );
  request.followRedirect = () => {
    request.followed = true;
    const incoming = Object.assign(new PassThrough(), {
      statusCode: 200,
      headers: { "content-length": "5" },
    });
    request.emit("response", incoming);
    incoming.end(Buffer.from([0, 1, 2, 254, 255]));
  };
  const fetch = createGitHubFetch({
    request: (options: { redirect: string }) => {
      assert.equal(options.redirect, "manual");
      return request;
    },
  });
  const response = await fetch(repository + "/releases/latest");
  assert.equal(response.url, repository + "/releases/tag/v3.0.1");
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    Buffer.from([0, 1, 2, 254, 255]),
  );
  assert.equal(request.followed, true);
});
test("redirecionamento para fora do GitHub é bloqueado antes de seguir o destino", async () => {
  const request = new Request();
  request.end = () =>
    queueMicrotask(() =>
      request.emit("redirect", 302, "GET", "https://evil.example/file"),
    );
  const fetch = createGitHubFetch({ request: () => request });
  await assert.rejects(
    fetch(repository + "/releases/latest"),
    /não autorizado/,
  );
  assert.equal(request.aborted, true);
  assert.equal(request.followed, false);
});
test("cancelamento aborta uma consulta nativa ainda sem resposta", async () => {
  const request = new Request(),
    controller = new AbortController();
  const fetch = createGitHubFetch({ request: () => request });
  const response = fetch(repository + "/releases/latest", {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(response, /cancelado/);
  assert.equal(request.aborted, true);
});
