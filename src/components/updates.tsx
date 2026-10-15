import { useEffect, useState } from "react";
import {
  CheckCheck,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { UpdateInfo, UpdateProgress } from "../storage";
import { Dialog, Panel } from "./ui";
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
      setStatus("ready");
    } catch (err) {
      setError((err as Error).message);
      setStatus("idle");
    }
  }
  return (
    <div className="updates-layout">
      <Panel
        title="Atualizações pelo GitHub"
        subtitle="Versões oficiais do seu repositório, sem instalar Node.js ou Git."
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
                <p>
                  Inclui o aplicativo completo com as alterações publicadas no
                  GitHub.
                </p>
              </div>
              <Download size={27} />
            </div>
          )}
          {status === "downloading" && (
            <div className="update-progress">
              <div>
                <span>
                  {progress?.phase === "verify"
                    ? "Conferindo checksum e preparando os arquivos…"
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
                  : "Conectando ao GitHub…"}
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
            {window.saldo ? (
              <button
                className="button secondary"
                onClick={() =>
                  void window.saldo
                    ?.openReleases()
                    .catch((err) => setError(err.message))
                }
              >
                <ExternalLink size={15} /> Versões no GitHub
              </button>
            ) : (
              <a
                className="button secondary"
                href={`${info.repository}/releases/latest`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} /> Versões no GitHub
              </a>
            )}
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
            <p className="field-hint">
              A instalação automática funciona no aplicativo empacotado para
              Windows de 64 bits. No navegador ou em outro sistema, use a página
              de versões do GitHub.
            </p>
          )}
          <p className="field-hint update-note">
            Alterações no código do repositório entram no aplicativo quando uma
            nova versão é publicada. O atualizador baixa o pacote dessa versão;
            não altera suas entradas, cartões ou assinaturas.
          </p>
        </div>
      </Panel>
      <Panel
        title="Seus dados continuam com você"
        subtitle="Um processo com verificação e retorno à versão anterior."
      >
        <div className="update-steps">
          <div>
            <span>01</span>
            <p>Consulta a versão mais recente publicada no GitHub.</p>
          </div>
          <div>
            <span>02</span>
            <p>
              Baixa o ZIP por HTTPS e confere o checksum e a versão do
              aplicativo.
            </p>
          </div>
          <div>
            <span>03</span>
            <p>Preserva os dados e cria uma cópia antes de reiniciar.</p>
          </div>
          <div>
            <span>04</span>
            <p>
              Ativa a nova versão somente após ela abrir e ler os dados. Se isso
              falhar, volta à versão anterior.
            </p>
          </div>
        </div>
      </Panel>
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
