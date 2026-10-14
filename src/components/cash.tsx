import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  currentMonth,
  money,
  parseMoney,
  type CashEntry,
  type Data,
} from "../domain";
import { localDate, incomeMonth, monthlyBudget } from "../finance";
import { Dialog, Empty, Panel } from "./ui";
export function CashForm({
  entry,
  kind = "income",
  month,
  saving,
  onSave,
  onClose,
}: {
  entry?: CashEntry;
  kind?: CashEntry["kind"];
  month: string;
  saving: boolean;
  onSave: (e: CashEntry) => Promise<boolean>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(entry?.description ?? "");
  const [source, setSource] = useState(entry?.source ?? "");
  const [type, setType] = useState(entry?.kind ?? kind);
  const [date, setDate] = useState(entry?.date ?? `${month}-01`);
  const [amount, setAmount] = useState(
    entry ? (entry.amountCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [status, setStatus] = useState<"received" | "planned">(
    entry?.status ?? (month > currentMonth() ? "planned" : "received"),
  );
  const [error, setError] = useState("");
  return (
    <Dialog
      title={
        entry
          ? "Editar movimento"
          : type === "income"
            ? "Uma nova entrada"
            : "Registrar uma redução"
      }
      subtitle="Dê uma origem a cada valor e acompanhe seu dinheiro."
      onClose={onClose}
    >
      <form
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            const cents = parseMoney(amount);
            if (
              type === "income" &&
              status === "received" &&
              date > localDate()
            )
              throw new Error("Para datas futuras, escolha entrada prevista.");
            if (!cents || !description.trim() || !source.trim())
              throw new Error(
                "Informe descrição, origem e um valor maior que zero.",
              );
            if (
              await onSave({
                id: entry?.id ?? crypto.randomUUID(),
                description: description.trim(),
                source: source.trim(),
                date,
                amountCents: cents,
                kind: type,
                ...(type === "income" ? { status } : {}),
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label>
          Descrição do movimento
          <input
            autoFocus
            required
            maxLength={100}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Salário, serviço, reembolso..."
          />
        </label>
        <div className="form-row">
          <label>
            Tipo de movimento
            <select
              aria-label="Tipo de movimento"
              value={type}
              onChange={(e) => setType(e.target.value as CashEntry["kind"])}
            >
              <option value="income">Entrada de dinheiro</option>
              <option value="deduction">Redução / outro gasto</option>
            </select>
          </label>
          <label>
            Data do movimento
            <input
              required
              aria-label="Data do movimento"
              type="date"
              min="2000-01-01"
              max="2199-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <label>
          Origem do dinheiro / motivo
          <input
            required
            maxLength={80}
            list="cash-sources"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={
              type === "income"
                ? "Ex.: Salário, Freelance, Vendas"
                : "Ex.: Alimentação, saque, ajuste"
            }
          />
          <datalist id="cash-sources">
            {[
              "Salário",
              "Freelance",
              "Vendas",
              "Reembolso",
              "Investimentos",
              "Outros gastos",
            ].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label>
          Valor do movimento
          <div className="money-field large">
            <span>R$</span>
            <input
              required
              aria-label="Valor do movimento"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </label>
        {type === "income" && (
          <label>
            Situação da entrada
            <select
              aria-label="Situação da entrada"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "received" | "planned")
              }
            >
              <option value="received">Já recebida</option>
              <option value="planned">Prevista</option>
            </select>
          </label>
        )}
        <p className="field-hint">
          Entradas aumentam o dinheiro do mês. Reduções registram outros gastos
          ou ajustes. Não registre as faturas novamente aqui: elas são
          descontadas automaticamente no resumo.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            type="button"
            className="button secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            Salvar movimento
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function CashPage({
  data,
  month,
  saving,
  onCreate,
  onEdit,
  onDelete,
  onCards,
  onReceive,
}: {
  data: Data;
  month: string;
  saving: boolean;
  onCreate: (kind: CashEntry["kind"]) => void;
  onEdit: (entry: CashEntry) => void;
  onDelete: (entry: CashEntry) => void;
  onCards: () => void;
  onReceive: (entry: CashEntry) => void;
}) {
  const [search, setSearch] = useState(""),
    [source, setSource] = useState("all"),
    [kind, setKind] = useState("all");
  const budget = monthlyBudget(data, month);
  const rows = budget.entries
    .filter(
      (e) =>
        (source === "all" || e.source === source) &&
        (kind === "all" || e.kind === kind) &&
        `${e.description} ${e.source}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const grouped = new Map<string, number>();
  for (const entry of budget.entries)
    grouped.set(
      entry.source,
      (grouped.get(entry.source) ?? 0) +
        (entry.kind === "income" ? entry.amountCents : -entry.amountCents),
    );
  for (const r of data.incomeReceipts ?? [])
    if (r.date.slice(0, 7) === month)
      grouped.set(r.source, (grouped.get(r.source) ?? 0) + r.amountCents);
  for (const r of incomeMonth(data, month))
    if (!r.receipt)
      grouped.set(r.rule.source, (grouped.get(r.rule.source) ?? 0) + r.amount);
  const largest = Math.max(1, ...[...grouped.values()].map(Math.abs));
  return (
    <>
      <div className="stats-grid cash-stats">
        <div className="stat-card">
          <div className="stat-title">
            Entradas do mês
            <span className="stat-icon green">
              <ArrowDownLeft size={18} />
            </span>
          </div>
          <strong data-testid="cash-income">{money(budget.income)}</strong>
          <div className="stat-foot">
            Recebidas · previstas: {money(budget.expectedIncome)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            Reduções e outros gastos
            <span className="stat-icon amber">
              <ArrowUpRight size={18} />
            </span>
          </div>
          <strong>{money(budget.deductions)}</strong>
          <div className="stat-foot">
            Disponível: {money(budget.net + budget.opening)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            Faturas, assinaturas e despesas
            <span className="stat-icon">
              <Wallet size={18} />
            </span>
          </div>
          <strong data-testid="cash-commitments">
            {money(budget.commitments)}
          </strong>
          <div className="stat-foot">
            {money(budget.paid)} pagos · {money(budget.pending)} pendentes
          </div>
        </div>
        <div
          className={`stat-card debt ${budget.remaining < 0 ? "negative-balance" : ""}`}
        >
          <div className="stat-title">
            Quanto sobrará no mês
            <span className="stat-icon green">
              <Banknote size={18} />
            </span>
          </div>
          <strong data-testid="cash-remaining">
            {money(budget.remaining)}
          </strong>
          <div className="stat-foot">
            {budget.remaining < 0
              ? "Compromissos acima das entradas líquidas"
              : "Depois de todos os pagamentos cadastrados"}
          </div>
        </div>
      </div>
      <div className="cash-explanation">
        <Check size={16} />
        <p>
          As faturas já pagas continuam descontadas. Antecipações entram no mês
          em que você as registrou. O resumo considera o mês inteiro; os filtros
          abaixo alteram somente a listagem.
        </p>
      </div>
      <div className="planning-grid cash-grid">
        <Panel
          title="Movimentos pontuais do mês"
          subtitle="Entradas, origens e ajustes para cada mês."
          action={
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => onCreate("deduction")}
            >
              <ArrowUpRight size={14} />
              Registrar redução
            </button>
          }
        >
          <div className="ledger-filters">
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Buscar entradas"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar descrição ou origem..."
              />
            </label>
            <select
              aria-label="Filtrar origem das entradas"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">Todas as origens</option>
              {[...new Set((data.cashEntries ?? []).map((e) => e.source))].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
            <select
              aria-label="Filtrar tipo de movimento"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="all">Todos os movimentos</option>
              <option value="income">Entradas</option>
              <option value="deduction">Reduções</option>
            </select>
          </div>
          {rows.length ? (
            <div className="table-scroll">
              <table className="cash-table">
                <thead>
                  <tr>
                    <th>Movimento</th>
                    <th>Origem / motivo</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.description}</strong>
                        <small className="cell-small">
                          {e.kind === "income"
                            ? e.status === "planned"
                              ? "Prevista"
                              : "Recebida"
                            : "Redução"}
                        </small>
                      </td>
                      <td>{e.source}</td>
                      <td>{e.date.split("-").reverse().join("/")}</td>
                      <td>
                        <strong
                          className={
                            e.kind === "income" ? "mint-text" : "danger-text"
                          }
                        >
                          {e.kind === "income" ? "+" : "−"}{" "}
                          {money(e.amountCents)}
                        </strong>
                      </td>
                      <td>
                        <div className="row-actions">
                          {e.status === "planned" && (
                            <button
                              className="icon-button pay"
                              disabled={saving}
                              aria-label={`Receber entrada ${e.description}`}
                              onClick={() => onReceive(e)}
                            >
                              <Check size={15} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            disabled={saving}
                            aria-label={`Editar movimento ${e.description}`}
                            onClick={() => onEdit(e)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            disabled={saving}
                            aria-label={`Excluir movimento ${e.description}`}
                            onClick={() => onDelete(e)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={<Banknote size={25} />}
              title="Cada entrada conta"
              text="Registre dinheiro recebido neste mês ou ajuste os filtros."
              action={
                <button
                  className="button secondary"
                  onClick={() => onCreate("income")}
                >
                  <Plus size={15} />
                  Adicionar entrada
                </button>
              }
            />
          )}
          <div className="table-footer">
            {rows.length} movimentos nos filtros · resumo mensal preservado
          </div>
        </Panel>
        <Panel
          title="De onde vem o dinheiro?"
          subtitle="Entradas e previsões por origem, menos reduções."
        >
          {grouped.size ? (
            <div className="comparison-rows">
              {[...grouped.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => (
                  <div key={name}>
                    <div className="comparison-label">
                      <span>{name}</span>
                      <strong className={amount < 0 ? "danger-text" : ""}>
                        {money(amount)}
                      </strong>
                    </div>
                    <div className="comparison-track">
                      <span
                        style={{
                          width: `${(Math.abs(amount) / largest) * 100}%`,
                          background:
                            amount < 0 ? "var(--danger)" : "var(--mint)",
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              title="Suas origens aparecem aqui"
              text="Adicione uma entrada para comparar as fontes de renda."
            />
          )}
          <div className="budget-breakdown">
            <div>
              <span>Saldo de abertura</span>
              <strong>{money(budget.opening)}</strong>
            </div>
            <div>
              <span>Entradas líquidas</span>
              <strong>{money(budget.net)}</strong>
            </div>
            <div>
              <span>Entradas ainda previstas</span>
              <strong>+ {money(budget.expectedIncome)}</strong>
            </div>
            <div>
              <span>Pagamentos registrados</span>
              <strong>− {money(budget.paid)}</strong>
            </div>
            <div>
              <span>Ainda falta pagar</span>
              <strong>− {money(budget.pending)}</strong>
            </div>
            <div>
              <span>Saldo final previsto</span>
              <strong>{money(budget.remaining)}</strong>
            </div>
            <button className="text-button" onClick={onCards}>
              Consultar as faturas <ArrowUpRight size={14} />
            </button>
          </div>
          {budget.estimated && (
            <p className="history-note padded">
              Pagamentos antigos são estimados pelas parcelas informadas. Os
              novos pagamentos registram o mês efetivo.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
