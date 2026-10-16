import { useEffect, useState } from "react";
import {
  CheckCheck,
  Download,
  ExternalLink,
  Sparkles,
  Check,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import bundledNotes from "../release-notes.json";
import type { ReleaseNotes, UpdateInfo, UpdateProgress } from "../storage";
import { Dialog, Panel } from "./ui";
function ReleaseHighlights({ notes }: { notes: ReleaseNotes }) {
  return (
    <div className="release-highlights">
      {notes.highlights.map((item, index) => (
        <article key={`${item.title}-${index}`} className="release-highlight">
          <span className="release-highlight-icon" aria-hidden="true">
            {item.kind === "fixed" ? (
              <ShieldCheck size={20} />
            ) : item.kind === "new" ? (
              <Sparkles size={20} />
            ) : (
              <Check size={20} />
            )}
          </span>
          <div>
            <span className={`release-kind release-kind-${item.kind}`}>
              {item.kind === "new"
                ? "Novo"
                : item.kind === "fixed"
                  ? "Correção"
                  : "Melhoria"}
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
export function UpdatesPage() {
  const [info, setInfo] = useState<UpdateInfo>({
    currentVersion: __APP_VERSION__,
    canInstall: false,
    repository:
      "https://github.com/washington-snowe/creditcard-dispenses-calculator",
  });
  const [status, setStatus] = useState<
    "idle" | "checking" | "downloading" | "ready" | "applying"
  >("idle");
  const [progress, setProgress] = useState<UpdateProgress | null>(null),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    let mounted = true;
    window.saldo
      ?.updateInfo()
      .then((value) => {
        if (mounted) {
          setInfo(value);
          if (value.readyVersion) setStatus("ready");
          else if (value.downloading) setStatus("downloading");
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });
    const cleanup = window.saldo?.onUpdateProgress((value) => {
      setProgress(value);
      if (value.phase === "error") {
        setError(value.message ?? "Não foi possível baixar a atualização.");
        setStatus("idle");
        return;
      }
      setStatus(value.phase === "ready" ? "ready" : "downloading");
      if (value.version)
        setInfo((previous) => ({
          ...previous,
          version: value.version,
          available: true,
        }));
    });
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);
  async function check() {
    if (!window.saldo) return;
    setError("");
    setStatus("checking");
    try {
      setInfo(await window.saldo.checkUpdates());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus("idle");
    }
  }
  async function download() {
    if (!window.saldo) return;
    setError("");
    setProgress(null);
    setStatus("downloading");
    try {
      await window.saldo.downloadUpdate();
      setInfo(await window.saldo.updateInfo());
      setStatus("ready");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }
  const availableVersion = info.available ? info.version : null;
  const installedNotes =
    bundledNotes.version === info.currentVersion
      ? (bundledNotes as ReleaseNotes)
      : null;
  const notes = availableVersion
    ? info.notes?.version === availableVersion
      ? info.notes
      : null
    : installedNotes;
  return (
    <div className="updates-layout">
      <Panel
        title="Atualizações do ContaClara"
        subtitle="Conheça as novidades e mantenha seu aplicativo em dia."
      >
        <div className="update-body">
          <div className="update-version">
            <span className="summary-icon">
              <RefreshCw size={25} />
            </span>
            <div>
              <small>Versão instalada</small>
              <strong data-testid="app-version">{info.currentVersion}</strong>
              <p>ContaClara para gestão local das suas finanças</p>
            </div>
            <span className="badge accent-badge">Windows x64</span>
          </div>
          {info.available === false && (
            <div className="cash-explanation">
              <CheckCheck size={19} />
              <p>Você já está na versão mais recente disponível.</p>
            </div>
          )}
          {info.available && (
            <div className="update-available">
              <div>
                <small>Uma nova versão está disponível</small>
                <h3>ContaClara {info.version}</h3>
                <p>Confira as novidades desta versão antes de atualizar.</p>
              </div>
              <Download size={27} />
            </div>
          )}
          {status === "downloading" && (
            <div className="update-progress">
              <div>
                <span>
                  {progress?.phase === "verify"
                    ? "Verificando a atualização e preparando os arquivos…"
                    : "Baixando a nova versão…"}
                </span>
                <strong>
                  {progress?.percent === null || !progress
                    ? ""
                    : `${progress.percent}%`}
                </strong>
              </div>
              <div className="progress">
                <i
                  style={{
                    width: `${progress?.percent ?? 5}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
              <small>
                {progress
                  ? `${(progress.received / 1024 / 1024).toFixed(1)} MB recebidos`
                  : "Conectando ao serviço de atualização…"}
              </small>
            </div>
          )}
          {status === "ready" && (
            <div className="cash-explanation">
              <ShieldCheck size={20} />
              <p>
                Download verificado. A nova versão está pronta para abrir com os
                seus dados.
              </p>
            </div>
          )}
          {error && (
            <p className="update-error" role="alert">
              {error}
            </p>
          )}
          {info.lastUpdate && (
            <div className="update-last">
              <strong>
                {info.lastUpdate.success
                  ? `Última atualização: ${info.lastUpdate.version}`
                  : "A última atualização foi revertida"}
              </strong>
              <p>
                {info.lastUpdate.success
                  ? "Aplicativo e dados carregados com sucesso."
                  : info.lastUpdate.message}
              </p>
            </div>
          )}
          <div className="update-actions">
            <button
              className="button secondary"
              disabled={!window.saldo || status !== "idle"}
              onClick={check}
            >
              <RefreshCw size={15} />
              {status === "checking"
                ? "Verificando…"
                : "Verificar atualizações"}
            </button>
            {info.available && info.canInstall && status === "idle" && (
              <button className="button primary" onClick={download}>
                <Download size={16} />
                Baixar atualização
              </button>
            )}
            {status === "downloading" && (
              <button
                className="button secondary"
                onClick={() => void window.saldo?.cancelUpdate()}
              >
                Cancelar download
              </button>
            )}
            {status === "ready" && (
              <button
                className="button primary"
                onClick={() => setConfirm(true)}
              >
                <Upload size={16} />
                Reiniciar e atualizar
              </button>
            )}
          </div>
          {!info.canInstall && (
            <div className="update-manual">
              <p className="field-hint">
                A atualização automática está disponível no aplicativo para
                Windows de 64 bits.
              </p>
              {window.saldo ? (
                <button
                  className="button secondary"
                  onClick={() =>
                    void window.saldo
                      ?.openReleases()
                      .catch((err) => setError(err.message))
                  }
                >
                  <ExternalLink size={15} /> Baixar para Windows
                </button>
              ) : (
                <a
                  className="button secondary"
                  href={`${info.repository}/releases/latest`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} /> Baixar para Windows
                </a>
              )}
            </div>
          )}
          <p className="field-hint update-note">
            Seus registros e preferências são preservados durante a atualização.
          </p>
        </div>
      </Panel>
      <Panel
        title={`Novidades da versão ${availableVersion ?? info.currentVersion}`}
        subtitle={
          notes?.title ??
          (availableVersion
            ? "Uma nova versão do ContaClara está disponível."
            : "Confira o que há de novo no seu aplicativo.")
        }
      >
        <div className="release-body">
          <span className="release-status">
            <Sparkles size={16} aria-hidden="true" />
            {availableVersion
              ? "Disponível para atualizar"
              : "Sua versão instalada"}
          </span>
          {notes ? (
            <ReleaseHighlights notes={notes} />
          ) : (
            <p className="release-unavailable">
              Os destaques desta versão não estão disponíveis no momento. Você
              pode verificar novamente mais tarde.
            </p>
          )}
          {availableVersion && installedNotes && (
            <details className="release-installed">
              <summary>
                Novidades da sua versão atual ({info.currentVersion})
              </summary>
              <ReleaseHighlights notes={installedNotes} />
            </details>
          )}
        </div>
      </Panel>
      <div className="update-reassurance">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>Atualize com tranquilidade</strong>
          <p>
            Uma cópia de segurança é criada antes da troca. Se a nova versão não
            conseguir abrir seus dados, a anterior é recuperada. Após a
            confirmação, os arquivos antigos da atualização são removidos e seus
            backups são mantidos.
          </p>
        </div>
      </div>
      {confirm && (
        <Dialog
          title="Reiniciar e aplicar atualização?"
          onClose={() => {
            if (status !== "applying") setConfirm(false);
          }}
        >
          <div className="confirm-content">
            <p>
              O aplicativo será fechado e reaberto. Seus dados serão preservados
              e haverá uma cópia de segurança antes da troca. Não desligue o
              computador durante esse processo.
            </p>
            {error && (
              <p className="update-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={status === "applying"}
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={status === "applying"}
              onClick={async () => {
                setStatus("applying");
                setError("");
                try {
                  await window.saldo?.applyUpdate();
                } catch (err) {
                  setError((err as Error).message);
                  setStatus("ready");
                }
              }}
            >
              Aplicar atualização
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
