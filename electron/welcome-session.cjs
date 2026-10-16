const fs = require("node:fs/promises");
const path = require("node:path");
const { randomInt } = require("node:crypto");
const { userInfo } = require("node:os");
const phrases = require("./welcome-phrases.json");

function nextPhrase(saved, random = randomInt) {
  const validIndex = (n) => Number.isInteger(n) && n >= 0 && n < phrases.length;
  const last = validIndex(saved?.last) ? saved.last : null;
  let remaining =
    saved?.version === 1 &&
    Array.isArray(saved.remaining) &&
    saved.remaining.length < phrases.length &&
    saved.remaining.every(validIndex) &&
    new Set(saved.remaining).size === saved.remaining.length &&
    !saved.remaining.includes(last)
      ? [...saved.remaining]
      : [];
  if (!remaining.length) {
    remaining = phrases.map((_, i) => i);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    if (remaining[0] === last)
      [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
  }
  const phraseId = remaining.shift();
  return {
    info: { phraseId, phrase: phrases[phraseId] },
    state: { version: 1, last: phraseId, remaining },
  };
}

// One promise per process: StrictMode, navigation and renderer reloads share it.
// The separate file contains quote indexes only; finances and backups are untouched.
function createWelcomeSession(
  directory,
  { account = userInfo, random = randomInt } = {},
) {
  let session;
  return () =>
    (session ??= (async () => {
      let name = null;
      try {
        const username = account().username;
        if (typeof username === "string")
          name =
            username
              .replace(/[\u0000-\u001f\u007f]/g, "")
              .trim()
              .slice(0, 80) || null;
      } catch {
        /* Unavailable OS accounts receive a generic welcome. */
      }
      const filename = path.join(directory, "welcome-state.json");
      let saved;
      try {
        if ((await fs.stat(filename)).size <= 16_384)
          saved = JSON.parse(await fs.readFile(filename, "utf8"));
      } catch {
        /* Missing or invalid quote history starts a new deck. */
      }
      const { info, state } = nextPhrase(saved, random);
      try {
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(filename + ".tmp", JSON.stringify(state), {
          mode: 0o600,
        });
        await fs.rename(filename + ".tmp", filename);
      } catch {
        /* A read-only disk must not prevent opening the app. */
      }
      return { name, ...info };
    })());
}
module.exports = { createWelcomeSession, nextPhrase };
