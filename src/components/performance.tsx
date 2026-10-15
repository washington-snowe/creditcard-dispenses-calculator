import { useEffect, useState } from "react";
import { Cpu, RefreshCw, CircleAlert, Check } from "lucide-react";
import type { Settings } from "../domain";
import type { PerformanceInfo } from "../storage";
import { Panel } from "./ui";

export function PerformancePanel({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (settings: Settings, message?: string) => Promise<boolean>;
}) {
  const [info, setInfo] = useState<PerformanceInfo | null>(null);
  const [error, setError] = useState("");
  const [restarting, setRestarting] = useState(false);
  const desktop = !!window.saldo?.performanceInfo;
  const [enabled, setEnabled] = useState(
    settings.hardwareAcceleration !== false,
  );
  const [changing, setChanging] = useState(false);
  useEffect(() => {
    setEnabled(settings.hardwareAcceleration !== false);
  }, [settings.hardwareAcceleration]);
  async function change(value: boolean) {
    setEnabled(value);
    setChanging(true);
    try {
      const ok = await onSave(
        { ...settings, hardwareAcceleration: value },
        value === info?.enabledAtLaunch
          ? "Preferência de desempenho salva."
          : "Preferência salva. Reinicie para aplicar a aceleração de hardware.",
      );
      if (!ok) setEnabled(settings.hardwareAcceleration !== false);
    } finally {
      setChanging(false);
    }
  }
  useEffect(() => {
    let live = true;
    window.saldo
      ?.performanceInfo?.()
      .then((value) => {
        if (live) {
          setInfo(value);
          setError("");
        }
      })
      .catch(() => {
        if (live)
          setError(
            "Não foi possível consultar o desempenho. Tente abrir esta tela novamente.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  const pending =
    !!info &&
    info.enabledAtLaunch !== (settings.hardwareAcceleration !== false);
  const gpuActive =
    info?.accelerationEnabled && info.gpuCompositing === "enabled";
  async function restart() {
    if (!window.saldo?.restart || saving || restarting) return;
    setRestarting(true);
    try {
      await window.saldo.restart();
    } catch {
      setRestarting(false);
      setError(
        "Não foi possível reiniciar. Feche e abra o programa para aplicar a preferência salva.",
      );
    }
  }
  return (
    <Panel
      title="Desempenho"
      subtitle="Ajuste como o aplicativo usa os recursos do computador."
    >
      <div className="performance-settings">
        <div className="performance-choice">
          <span className="performance-icon">
            <Cpu size={24} />
          </span>
          <div>
            <label className="check-line">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!desktop || saving || changing || restarting || !info}
                onChange={(event) => void change(event.target.checked)}
              />
              Usar aceleração de hardware
            </label>
            <p>
              Permite usar a GPU para desenhar a interface. Pode deixar gráficos
              e animações mais suaves, dependendo do computador e do driver.
            </p>
          </div>
        </div>
        {!desktop ? (
          <p className="feedback-note" data-tone="info">
            <Cpu size={18} />
            <span>
              Essa opção está disponível no aplicativo desktop. No navegador, a
              aceleração é controlada pelo próprio navegador.
            </span>
          </p>
        ) : (
          info && (
            <div
              className="feedback-note"
              data-tone={changing ? "info" : pending ? "warning" : "success"}
              role="status"
              data-testid="performance-status"
            >
              {pending ? <CircleAlert size={18} /> : <Check size={18} />}
              <div>
                <strong>
                  {changing
                    ? "Salvando preferência…"
                    : pending
                      ? "Reinício necessário"
                      : enabled
                        ? "Aceleração permitida"
                        : "Aceleração desativada"}
                </strong>
                <p>
                  {changing
                    ? "Aguarde a conclusão da gravação."
                    : pending
                      ? "Sua preferência está salva. O programa continua com a configuração anterior até reiniciar."
                      : gpuActive
                        ? "A interface está usando composição gráfica por hardware."
                        : enabled
                          ? "A GPU está permitida. O sistema pode usar renderização por software conforme a disponibilidade do driver."
                          : "O aplicativo foi iniciado com a aceleração de hardware desativada."}
                </p>
              </div>
            </div>
          )
        )}
        {error && (
          <p className="feedback-note" data-tone="danger" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
          </p>
        )}
        {pending && (
          <button
            type="button"
            className="button secondary"
            disabled={saving || changing || restarting}
            onClick={() => void restart()}
          >
            <RefreshCw size={16} />
            {restarting ? "Reiniciando…" : "Reiniciar para aplicar"}
          </button>
        )}
        {desktop && (
          <p className="field-hint">
            A mudança exige reiniciar o aplicativo. Seus dados e preferências
            são preservados.
          </p>
        )}
      </div>
    </Panel>
  );
}
