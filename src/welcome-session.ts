import phrases from "../electron/welcome-phrases.json";
export type WelcomeInfo = {
  name: string | null;
  phraseId: number;
  phrase: string;
};
let session: Promise<WelcomeInfo> | undefined;
function previewWelcome(): WelcomeInfo {
  let last = -1;
  try {
    last = Number(localStorage.getItem("contaclara-welcome-last") ?? -1);
  } catch {
    /* Optional preview history. */
  }
  const candidates = phrases.map((_, i) => i).filter((i) => i !== last);
  const phraseId = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    localStorage.setItem("contaclara-welcome-last", String(phraseId));
  } catch {
    /* Storage can be disabled. */
  }
  return { name: null, phraseId, phrase: phrases[phraseId] };
}
export function welcomeSession(): Promise<WelcomeInfo> {
  return (session ??= (
    window.saldo?.welcomeInfo?.() ?? Promise.resolve(previewWelcome())
  ).catch(() => previewWelcome()));
}
