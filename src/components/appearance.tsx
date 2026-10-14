import { useState, type CSSProperties } from "react";
import { Check, Moon, Sparkles, Sun } from "lucide-react";
import type { Settings } from "../domain";
import { Panel } from "./ui";
export const ACCENTS = [
  "#7967ff",
  "#20c7a0",
  "#38bdf8",
  "#f472b6",
  "#f59e0b",
  "#f87171",
];
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function blend(hex: string, to: number, ratio: number) {
  return (
    "#" +
    rgb(hex)
      .map((n) =>
        Math.round(n + (to - n) * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex: string) {
  return rgb(hex)
    .map((n) => {
      const v = n / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function applyAppearance(settings: Settings) {
  const root = document.documentElement,
    dark = settings.theme !== "light",
    base = settings.accent ?? "#7967ff";
  root.dataset.theme = settings.theme;
  root.dataset.motion = settings.motion === false ? "off" : "on";
  root.dataset.glow = settings.glow === false ? "off" : "on";
  root.dataset.font = settings.font ?? "dm";
  let ink = base;
  const bg =
    settings.theme === "ultra" ? "#0b0b13" : dark ? "#151e30" : "#ffffff";
  for (let i = 0; i <= 10; i++) {
    const a = luminance(ink),
      b = luminance(bg);
    if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5) break;
    ink = blend(base, dark ? 255 : 0, (i + 1) / 10);
  }
  root.style.setProperty("--accent-base", base);
  root.style.setProperty("--accent", ink);
  root.style.setProperty("--accent-strong", base);
  root.style.setProperty(
    "--accent-soft",
    `color-mix(in srgb, ${base} ${dark ? 18 : 10}%, var(--surface))`,
  );
  root.style.setProperty(
    "--on-accent",
    luminance(base) > 0.179 ? "#081018" : "#ffffff",
  );
}
export function AppearancePage({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (s: Settings) => Promise<boolean>;
}) {
  const [theme, setTheme] = useState(settings.theme),
    [accent, setAccent] = useState(settings.accent ?? ACCENTS[0]),
    [font, setFont] = useState(settings.font ?? "dm"),
    [glow, setGlow] = useState(settings.glow !== false),
    [motion, setMotion] = useState(settings.motion !== false);
  const themes = [
    { id: "light" as const, name: "Claro", text: "Leve e luminoso", icon: Sun },
    {
      id: "dark" as const,
      name: "Escuro",
      text: "Profundidade em azul",
      icon: Moon,
    },
    {
      id: "ultra" as const,
      name: "Ultra Dark",
      text: "Preto, contraste e glow",
      icon: Sparkles,
    },
  ];
  return (
    <div className="appearance-layout">
      <Panel
        title="Um Saldo com a sua identidade"
        subtitle="Tema, cores e movimento, do seu jeito."
      >
        <form
          className="appearance-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave({ ...settings, theme, accent, font, glow, motion });
          }}
        >
          <fieldset>
            <legend>Tema da interface</legend>
            <div className="theme-choices">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={theme === t.id}
                  className={`theme-choice ${t.id} ${theme === t.id ? "selected" : ""}`}
                  onClick={() => setTheme(t.id)}
                >
                  <span className="theme-mini">
                    <i />
                    <i />
                    <i />
                  </span>
                  <t.icon size={18} />
                  <strong>{t.name}</strong>
                  <small>{t.text}</small>
                  {theme === t.id && (
                    <Check className="choice-check" size={16} />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Cor de destaque</legend>
            <div className="accent-choices">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="accent-swatch"
                  aria-label={`Usar cor ${c}`}
                  aria-pressed={c === accent}
                  style={{ background: c }}
                  onClick={() => setAccent(c)}
                >
                  {c === accent && <Check size={18} />}
                </button>
              ))}
              <label className="custom-accent">
                Cor personalizada
                <input
                  aria-label="Cor personalizada do tema"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                />
                <span>{accent.toUpperCase()}</span>
              </label>
            </div>
          </fieldset>
          <label>
            Fonte da interface
            <select
              aria-label="Fonte da interface"
              value={font}
              onChange={(e) => setFont(e.target.value as "dm" | "inter")}
            >
              <option value="dm">DM Sans + Manrope</option>
              <option value="inter">Inter + Manrope</option>
            </select>
          </label>
          <div className="effects-choices">
            <label className="check-line">
              <input
                type="checkbox"
                checked={glow}
                onChange={(e) => setGlow(e.target.checked)}
              />
              Efeitos de glow
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                checked={motion}
                onChange={(e) => setMotion(e.target.checked)}
              />
              Animações suaves
            </label>
          </div>
          <p className="field-hint">
            Fontes incluídas no aplicativo, disponíveis offline. O contraste dos
            textos se adapta à cor escolhida. A preferência de reduzir movimento
            do Windows é respeitada.
          </p>
          <button className="button primary" disabled={saving}>
            Aplicar aparência
          </button>
        </form>
      </Panel>
      <div
        className={`appearance-preview ${theme}`}
        style={{ "--preview-accent": accent } as CSSProperties}
      >
        <span className="eyebrow">PRÉVIA DO SEU ESPAÇO</span>
        <h2>
          Seu dinheiro.
          <br />
          Seu universo.
        </h2>
        <div className={`preview-plastic ${glow ? "with-glow" : ""}`}>
          <small>SALDO / PERSONAL</small>
          <Sparkles size={23} />
          <strong>•••• &nbsp; •••• &nbsp; 2026</strong>
          <span>Mais clareza. Mais possibilidades.</span>
        </div>
        <div className="preview-stat">
          <small>Um próximo passo, mais leve</small>
          <strong>R$ 4.850,00</strong>
          <span className="preview-line" />
        </div>
        <p>
          As cores e o tema serão aplicados a todos os painéis, gráficos e
          formulários.
        </p>
      </div>
    </div>
  );
}
