import { useEffect, useMemo, useState } from "react";
import { DatabaseBackup, FileUp, RefreshCw, Undo2 } from "lucide-react";
import {
  CATEGORIES,
  money,
  monthLabel,
  type Data,
  type Settings,
} from "../domain";
import {
  applyStatement,
  importPreview,
  parseCsv,
  parseOfx,
  type ImportTarget,
  type StatementRow,
} from "../import-statements";
import {
  createBackup,
  listBackups,
  readBackup,
  type BackupInfo,
} from "../storage";
import { Panel } from "./ui";
export type ChangeRecord = { data: Data; message: string; time: string };
export function DataCenter({
  data,
  month,
  saving,
  onCommit,
  onSettings,
  onRestore,
  history,
  onUndo,
  onExport,
  onImport,
}: {
  data: Data;
  month: string;
  saving: boolean;
  onCommit: (d: Data, m: string) => Promise<boolean>;
  onSettings: (s: Settings) => Promise<boolean>;
  onRestore: (d: Data) => void;
  history: ChangeRecord[];
  onUndo: () => void;
  onExport: () => void;
  onImport: () => void;
}) {
  const [text, setText] = useState(""),
    [format, setFormat] = useState("csv"),
    [fileName, setFileName] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [mode, setMode] = useState<"card" | "cash">("card"),
    [cardId, setCardId] = useState(data.cards[0]?.id ?? ""),
    [bill, setBill] = useState(month),
    [source, setSource] = useState("Extrato importado"),
    [positive, setPositive] = useState(true),
    [mapping, setMapping] = useState<{
      date: number;
      description: number;
      value: number;
    }>(),
    [excluded, setExcluded] = useState<Set<number>>(new Set()),
    [categories, setCategories] = useState<Record<number, string>>({}),
    [backups, setBackups] = useState<BackupInfo[]>([]),
    [busy, setBusy] = useState(false);
  let rows: StatementRow[] = [],
    headers: string[] = [],
    columns = { date: -1, description: -1, value: -1 },
    needsMapping = false,
    parseError = "";
  if (text)
    try {
      if (format === "ofx") rows = parseOfx(text);
      else {
        const parsed = parseCsv(text, mapping);
        rows = parsed.rows;
        headers = parsed.headers;
        columns = parsed.columns;
        needsMapping = parsed.needsMapping;
      }
    } catch (e) {
      parseError = (e as Error).message;
    }
  const target: ImportTarget =
    mode === "card"
      ? { kind: "card", cardId, month: bill, positiveCharges: positive }
      : { kind: "cash", source };
  const preview = importPreview(data, rows, target),
    eligible = preview.filter((r) => r.selected),
    selected = eligible.filter((r) => !excluded.has(r.line));
  async function refresh() {
    try {
      setBackups(await listBackups());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, [data]);
  async function safe(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="data-center">
      <Panel
        title="Importar fatura ou extrato"
        subtitle="Confira os lançamentos e as categorias antes de adicionar. O arquivo é processado neste dispositivo."
      >
        <div className="import-controls">
          <label>
            Destino
            <select
              aria-label="Destino da importação"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "card" | "cash");
                setExcluded(new Set());
              }}
            >
              <option value="card">Fatura de cartão</option>
              <option value="cash">Entradas e ajustes de saída</option>
            </select>
          </label>
          {mode === "card" ? (
            <>
              <label>
                Cartão
                <select
                  aria-label="Cartão da importação"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {data.cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bank} · {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mês da fatura
                <input
                  aria-label="Mês da fatura importada"
                  type="month"
                  min="2000-01"
                  max="2199-12"
                  value={bill}
                  onChange={(e) => setBill(e.target.value)}
                />
              </label>
              <label>
                Sinal das compras
                <select
                  aria-label="Sinal das compras"
                  value={positive ? "positive" : "negative"}
                  onChange={(e) => setPositive(e.target.value === "positive")}
                >
                  <option value="positive">
                    Valores positivos são compras
                  </option>
                  <option value="negative">
                    Valores negativos são compras
                  </option>
                </select>
              </label>
            </>
          ) : (
            <label>
              Origem / conta
              <input
                aria-label="Origem do extrato"
                maxLength={80}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </label>
          )}
          <label className="file-drop">
            Arquivo CSV ou OFX
            <input
              aria-label="Arquivo de fatura ou extrato"
              type="file"
              accept=".csv,.ofx,text/csv,application/x-ofx"
              disabled={saving || busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setText("");
                setFileName("");
                void safe(async () => {
                  if (file.size > 5_000_000)
                    throw new Error("O arquivo deve ter até 5 MB.");
                  const content = await file.text();
                  const ofx = file.name.toLowerCase().endsWith(".ofx");
                  setFormat(ofx ? "ofx" : "csv");
                  setPositive(!ofx);
                  setText(content);
                  setFileName(file.name);
                  setMapping(undefined);
                  setExcluded(new Set());
                  setCategories({});
                });
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {fileName && <p className="field-hint">Arquivo: {fileName}</p>}
        {headers.length > 0 && (
          <details className="more-details" open={needsMapping || undefined}>
            <summary>Colunas do CSV</summary>
            <div className="form-row">
              {(["date", "description", "value"] as const).map((key) => (
                <label key={key}>
                  {key === "date"
                    ? "Data"
                    : key === "description"
                      ? "Descrição"
                      : "Valor"}
                  <select
                    aria-label={`Coluna ${key}`}
                    value={columns[key]}
                    onChange={(e) =>
                      setMapping({ ...columns, [key]: Number(e.target.value) })
                    }
                  >
                    <option value={-1}>Escolha uma coluna</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="field-hint">
              Datas DD/MM/AAAA ou AAAA-MM-DD; valores como 1.234,56 ou 1234.56.
              Cabeçalho obrigatório.
            </p>
          </details>
        )}
        {parseError && (
          <p role="alert" className="form-error">
            {parseError}
          </p>
        )}
        {preview.length > 0 && (
          <>
            <div
              className="import-summary"
              data-tone={preview.some((r) => r.error) ? "warning" : "info"}
            >
              <strong>
                {selected.length} selecionados ·{" "}
                {money(selected.reduce((s, r) => s + Math.abs(r.cents), 0))}
              </strong>
              <span>
                {preview.filter((r) => r.duplicate).length} possíveis duplicatas
                · {preview.filter((r) => r.credit).length} créditos ignorados ·{" "}
                {preview.filter((r) => r.error).length} linhas com erro
              </span>
            </div>
            <div className="table-scroll">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>Adicionar</th>
                    <th>Data / descrição</th>
                    <th>Valor</th>
                    <th>Categoria / situação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.line}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Importar linha ${r.line}`}
                          disabled={!r.selected || saving}
                          checked={r.selected && !excluded.has(r.line)}
                          onChange={(e) =>
                            setExcluded((old) => {
                              const next = new Set(old);
                              if (e.target.checked) next.delete(r.line);
                              else next.add(r.line);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td>
                        <strong>{r.description || "Sem descrição"}</strong>
                        <small className="cell-small">
                          Linha {r.line} · {r.date || "Data inválida"}
                        </small>
                      </td>
                      <td>{money(r.cents)}</td>
                      <td>
                        {r.error ||
                          (r.duplicate ? (
                            "Possível duplicata"
                          ) : r.credit ? (
                            "Crédito: não gera compra"
                          ) : mode === "card" ? (
                            <select
                              aria-label={`Categoria da linha ${r.line}`}
                              value={categories[r.line] ?? r.category}
                              onChange={(e) =>
                                setCategories((old) => ({
                                  ...old,
                                  [r.line]: e.target.value,
                                }))
                              }
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          ) : r.cents > 0 ? (
                            "Entrada recebida"
                          ) : (
                            "Ajuste de saída"
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="button primary"
              disabled={
                saving ||
                busy ||
                !selected.length ||
                (mode === "card" && (!cardId || !bill))
              }
              onClick={() =>
                void safe(async () => {
                  const next = applyStatement(
                    data,
                    rows,
                    target,
                    new Set(selected.map((r) => r.line)),
                    categories,
                  );
                  if (
                    await onCommit(
                      next,
                      `${selected.length} lançamentos importados.`,
                    )
                  ) {
                    setMessage(
                      "Importação concluída. Você pode desfazer a alteração.",
                    );
                    setText("");
                    setFileName("");
                    await refresh();
                  }
                })
              }
            >
              <FileUp size={17} />
              Confirmar importação de {selected.length} lançamentos
            </button>
          </>
        )}
        <p className="field-hint">
          No cartão, cada linha vira uma compra de uma parcela. Revise o mês e
          as possíveis duplicatas antes de confirmar.
        </p>
        <details className="more-details">
          <summary>Como importar sem duplicar valores</summary>
          <p className="field-hint">
            No cartão, cada linha vira uma compra de uma parcela no mês da
            fatura escolhido. Se o arquivo trouxer parcelas individuais, importe
            apenas a fatura desejada e ajuste o parcelamento na compra quando
            necessário. Créditos, estornos e pagamentos da fatura não devem ser
            cadastrados como compras. Possíveis duplicatas são bloqueadas.
          </p>{" "}
        </details>
      </Panel>
      <Panel
        title="Cópias de segurança"
        subtitle={
          window.saldo
            ? "Cópia local automática a cada 24 horas com uso do aplicativo; até 30 versões."
            : "Prévia no navegador: até 5 cópias, conforme o espaço disponível."
        }
        action={
          <button
            className="icon-button"
            aria-label="Atualizar lista de backups"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={18} />
          </button>
        }
      >
        <div className="backup-file-actions">
          <button
            className="button secondary"
            disabled={saving || busy}
            onClick={onExport}
          >
            Exportar backup
          </button>
          <button
            className="button secondary"
            disabled={saving || busy}
            onClick={onImport}
          >
            Importar backup
          </button>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            aria-label="Backups automáticos"
            checked={data.settings?.automaticBackups !== false}
            disabled={saving || busy}
            onChange={(e) =>
              void onSettings({
                ...data.settings,
                theme: data.settings?.theme ?? "light",
                automaticBackups: e.target.checked,
              })
            }
          />
          Criar backups automáticos
        </label>
        <button
          className="button secondary"
          disabled={saving || busy}
          onClick={() =>
            void safe(async () => {
              await createBackup(data);
              await refresh();
              setMessage("Cópia de segurança criada.");
            })
          }
        >
          <DatabaseBackup size={17} />
          Criar cópia agora
        </button>
        <div className="backup-list">
          {backups.length ? (
            backups.map((b) => (
              <div key={b.id}>
                <span>
                  <strong>
                    {new Date(b.createdAt).toLocaleString("pt-BR")}
                  </strong>
                  <small>
                    {(b.bytes / 1024).toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    KB
                  </small>
                </span>
                <button
                  className="button secondary"
                  disabled={saving || busy}
                  onClick={() =>
                    void safe(async () => onRestore(await readBackup(b.id)))
                  }
                >
                  Restaurar esta cópia
                </button>
              </div>
            ))
          ) : (
            <p className="field-hint">
              As cópias aparecerão aqui após o primeiro salvamento ou uma
              criação manual.
            </p>
          )}
        </div>
        <p className="field-hint">
          Antes de restaurar, uma cópia do estado atual é criada. As cópias
          ficam no mesmo dispositivo; exporte um backup para outro local para se
          proteger de perda do computador.
        </p>
      </Panel>
      <Panel
        title="Alterações recentes"
        subtitle="Até 20 alterações desta sessão. Desfazer preserva suas preferências atuais."
      >
        <button
          className="button secondary"
          disabled={saving || !history.length}
          onClick={onUndo}
        >
          <Undo2 size={17} />
          Desfazer última alteração
        </button>
        <ol className="change-history">
          {[...history].reverse().map((h, i) => (
            <li key={`${h.time}:${i}`}>
              <strong>{h.message}</strong>
              <small>{new Date(h.time).toLocaleTimeString("pt-BR")}</small>
            </li>
          ))}
        </ol>
        {!history.length && (
          <p className="field-hint">
            Nenhuma alteração para desfazer nesta sessão.
          </p>
        )}
      </Panel>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="import-summary" role="status" data-tone="success">
          {message}
        </p>
      )}
    </div>
  );
}
