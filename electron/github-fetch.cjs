const { Readable } = require("node:stream");
const { trustedUrl } = require("./updater.cjs");
// Electron's net.fetch does not expose Response.url consistently. Track and validate
// native redirects ourselves, preserving the operating system's proxy settings.
function createGitHubFetch(net) {
  return async (url, options = {}) => {
    let current = trustedUrl(url).href;
    if (options.signal?.aborted) throw options.signal.reason;
    return new Promise((resolve, reject) => {
      const request = net.request({
        url: current,
        method: "GET",
        redirect: "manual",
      });
      let incoming,
        redirects = 0;
      const cleanup = () => options.signal?.removeEventListener("abort", abort);
      const abort = () => {
        const error = new Error("Download cancelado.");
        incoming?.destroy(error);
        request.abort();
        cleanup();
        reject(error);
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      request.on("error", (error) => {
        cleanup();
        reject(error);
      });
      request.on("redirect", (_status, _method, destination) => {
        try {
          current = trustedUrl(destination).href;
          if (++redirects > 8)
            throw new Error(
              "Não foi possível conectar ao serviço de atualização.",
            );
          request.followRedirect();
        } catch (error) {
          request.abort();
          cleanup();
          reject(error);
        }
      });
      request.on("response", (message) => {
        incoming = message;
        incoming.once("close", cleanup);
        const headers = new Headers();
        for (const [name, value] of Object.entries(message.headers)) {
          if (value !== undefined)
            headers.set(
              name,
              Array.isArray(value) ? value.join(", ") : String(value),
            );
        }
        const response = new Response(Readable.toWeb(message), {
          status: message.statusCode,
          headers,
        });
        Object.defineProperty(response, "url", { value: current });
        resolve(response);
      });
      for (const [name, value] of Object.entries(options.headers ?? {}))
        request.setHeader(name, value);
      request.end();
    });
  };
}
module.exports = { createGitHubFetch };
