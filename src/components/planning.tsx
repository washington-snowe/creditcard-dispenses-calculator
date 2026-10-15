import { ActionMenu } from "./action-menu";
import { Field, useFieldFeedback } from "./field";
import { useViewFilter } from "../view-state";
import { SuggestionInput } from "./suggestion-input";
import { CategoryHint, useSmartCategory } from "./smart-category";
import { EXAMPLES, nameOptions, categoryHistory } from "../suggestions";
import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Wallet,
  Search,
} from "lucide-react";
import {
  CATEGORIES,
  currentMonth,
  money,
  parseMoney,
  type Data,
  type RecurringIncome,
  type Expense,
  type Settings,
} from "../domain";
import {
  expenseMonth,
  FREQUENCIES,
  incomeMonth,
  localDate,
  METHODS,
  monthlyBudget,
} from "../finance";
import { Dialog, Empty, Panel } from "./ui";
type Save<T> = (value: T) => Promise<boolean>;
export function Settlement({
  title,
  onClose,
  onSave,
}: {
  title: string;
  onClose: () => void;
  onSave: Save<string>;
}) {
  const [date, setDate] = useState(localDate()),
    [busy, setBusy] = useState(false);
  const feedback = useFieldFeedback();
  return (
    <Dialog
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        {...feedback.formProps}
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (await onSave(date)) onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field>
          Data efetiva
          <input
            aria-label="Data efetiva"
            type="date"
            required
            min="2000-01-01"
            max={localDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <p className="field-hint">
          O dinheiro entra ou sai no mês desta data. O registro não movimenta
          sua conta bancária.
        </p>
        <div className="dialog-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            Confirmar registro
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function RecurringForm({
  rule,
  data,
  month,
  saving,
  onSave,
  onClose,
}: {
  rule?: RecurringIncome;
  data?: Data;
  month: string;
  saving: boolean;
  onSave: Save<RecurringIncome>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(rule?.description ?? ""),
    [source, setSource] = useState(rule?.source ?? ""),
    [amount, setAmount] = useState(
      rule ? (rule.amountCents / 100).toFixed(2) : "",
    ),
    [day, setDay] = useState(rule?.dueDay ?? 5),
    [frequency, setFrequency] = useState<RecurringIncome["frequency"]>(
      rule?.frequency ?? "monthly",
    ),
    [start, setStart] = useState(rule?.startMonth ?? month),
    [end, setEnd] = useState(rule?.endMonth ?? ""),
    [error, setError] = useState("");
  const names = useMemo(
    () =>
      nameOptions(
        (data?.recurringIncomes ?? []).map((r) => r.description),
        EXAMPLES.income,
      ),
    [data],
  );
  const sources = useMemo(
    () =>
      nameOptions(
        [
          ...(data?.recurringIncomes ?? []).map((r) => r.source),
          ...(data?.cashEntries ?? []).map((e) => e.source),
        ],
        EXAMPLES.source,
      ),
    [data],
  );
  const feedback = useFieldFeedback();
  return (
    <Dialog
      title={rule ? "Editar renda recorrente" : "Nova renda recorrente"}
      subtitle="Planeje as próximas entradas. Confirme cada recebimento."
      onClose={onClose}
    >
      <form
        {...feedback.formProps}
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (!description.trim()) {
              feedback.fail("description", "Descreva esta renda.");
              return;
            }
            if (!source.trim()) {
              feedback.fail("source", "Informe a origem da renda.");
              return;
            }
            const cents = feedback.money("amount", amount);
            if (cents === null) return;
            if (!cents || (end && end < start))
              throw Error("Confira o valor e o período.");
            if (
              await onSave({
                id: rule?.id ?? crypto.randomUUID(),
                description: description.trim(),
                source: source.trim(),
                amountCents: cents,
                dueDay: day,
                frequency,
                startMonth: start,
                endMonth: end || null,
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <Field data-field="description" error={feedback.issues.description}>
          Descrição da renda
          <SuggestionInput
            aria-label="Descrição da renda"
            required
            autoFocus
            maxLength={100}
            value={description}
            onValueChange={setDescription}
            suggestions={names}
            placeholder="Salário, aluguel recebido…"
          />
        </Field>
        <Field data-field="source" error={feedback.issues.source}>
          Origem da renda
          <SuggestionInput
            aria-label="Origem da renda"
            required
            maxLength={80}
            value={source}
            onValueChange={setSource}
            suggestions={sources}
            placeholder="Empresa, cliente, imóvel…"
          />
        </Field>
        <div className="form-row">
          <Field data-field="amount" error={feedback.issues.amount}>
            Valor previsto
            <input
              aria-label="Valor previsto da renda"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field>
            Dia previsto
            <input
              type="number"
              min={1}
              max={31}
              required
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field>
          Frequência da renda
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as RecurringIncome["frequency"])
            }
          >
            {Object.entries(FREQUENCIES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field>
            Início da renda
            <input
              required
              type="month"
              min="2000-01"
              max="2199-12"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <details className="more-details" open={!!rule || undefined}>
            <summary>Definir fim da renda</summary>{" "}
            <Field>
              Fim da renda (opcional)
              <input
                type="month"
                min={start}
                max="2199-12"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </details>
        </div>
        <p className="field-hint">
          A previsão se repete automaticamente. Recebimentos já registrados
          mantêm o valor e a origem ao editar esta regra. Para encerrar mantendo
          o histórico, preencha o mês final.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button
            className="button secondary"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            Salvar renda recorrente
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function IncomePlanning({
  data,
  month,
  saving,
  onSettings,
  onCreate,
  onEdit,
  onDelete,
  onReceive,
  onUnreceive,
}: {
  data: Data;
  month: string;
  saving: boolean;
  onSettings: Save<Settings>;
  onCreate: () => void;
  onEdit: (r: RecurringIncome) => void;
  onDelete: (r: RecurringIncome) => void;
  onReceive: (r: RecurringIncome) => void;
  onUnreceive: (r: RecurringIncome) => void;
}) {
  const config = data.settings?.carryover;
  const [enabled, setEnabled] = useState(!!config),
    [start, setStart] = useState(config?.startMonth ?? month),
    [amount, setAmount] = useState(
      (Math.abs(config?.openingCents ?? 0) / 100).toFixed(2),
    ),
    [negative, setNegative] = useState((config?.openingCents ?? 0) < 0),
    [error, setError] = useState("");
  const [search, setSearch] = useViewFilter("recurring.search", ""),
    [source, setSource] = useViewFilter("recurring.source", "all"),
    [status, setStatus] = useViewFilter("recurring.status", "all");
  const occurrences = incomeMonth(data, month),
    rows = (data.recurringIncomes ?? []).filter(
      (r) =>
        `${r.description} ${r.source}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")) &&
        (source === "all" || source === r.source) &&
        (status === "all" ||
          (status === "received"
            ? occurrences.some((o) => o.rule.id === r.id && o.receipt)
            : occurrences.some((o) => o.rule.id === r.id && !o.receipt))),
    );
  const budget = monthlyBudget(data, month);
  return (
    <div className="planning-stack">
      <div className="balance-ribbon">
        <div>
          <Wallet size={22} />
          <span>
            Saldo de abertura{" "}
            <strong data-testid="opening-balance">
              {money(budget.opening)}
            </strong>
            <small>
              {budget.projectedOpening
                ? "Projeção dos meses anteriores"
                : "Movimentações efetivas dos meses anteriores"}
            </small>
          </span>
        </div>
        <div>
          <Banknote size={22} />
          <span>
            Saldo efetivo{" "}
            <strong data-testid="actual-balance">
              {money(budget.actualBalance)}
            </strong>
            <small>Somente dinheiro recebido e pagamentos registrados</small>
          </span>
        </div>
      </div>
      <Panel
        title="Rendas que se repetem"
        subtitle="Previsões por mês, com confirmação individual de recebimento."
        action={
          <button
            className="button secondary"
            disabled={saving}
            onClick={onCreate}
          >
            <Plus size={15} />
            Renda recorrente
          </button>
        }
      >
        <div className="ledger-filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Buscar rendas recorrentes"
              placeholder="Buscar renda ou origem…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar origem das rendas"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">Todas as origens</option>
            {[
              ...new Set((data.recurringIncomes ?? []).map((r) => r.source)),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar situação das rendas"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todas as situações</option>
            <option value="received">Recebidas</option>
            <option value="planned">Previstas no mês</option>
          </select>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table className="recurring-table">
              <thead>
                <tr>
                  <th>Renda / origem</th>
                  <th>Valor</th>
                  <th>Situação no mês</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const o = occurrences.find((o) => o.rule.id === r.id);
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.description}</strong>
                        <small className="cell-small">
                          {r.source} · {FREQUENCIES[r.frequency]}
                        </small>
                      </td>
                      <td>
                        <strong>{money(o?.amount ?? r.amountCents)}</strong>
                        <small className="cell-small">Dia {r.dueDay}</small>
                      </td>
                      <td>
                        <span
                          className={`badge ${o?.receipt ? "green" : "warning"}`}
                        >
                          {o?.receipt
                            ? "Recebida"
                            : o
                              ? "Prevista"
                              : "Sem previsão"}
                        </span>
                        {o && (
                          <small className="cell-small">
                            {(o.receipt?.date ?? o.date)
                              .split("-")
                              .reverse()
                              .join("/")}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {o && (
                            <button
                              className="icon-button pay"
                              disabled={saving || month > currentMonth()}
                              aria-label={`${o.receipt ? "Desmarcar recebimento" : "Receber renda"} ${r.description}`}
                              onClick={() =>
                                o.receipt ? onUnreceive(r) : onReceive(r)
                              }
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <ActionMenu
                            label={`Mais opções de ${r.description}`}
                            disabled={saving}
                          >
                            <button
                              className="icon-button"
                              aria-label={`Editar renda ${r.description}`}
                              disabled={saving}
                              onClick={() => onEdit(r)}
                            >
                              <Pencil size={15} /> Editar
                            </button>
                            <button
                              className="icon-button danger-text"
                              aria-label={`Excluir renda ${r.description}`}
                              disabled={saving}
                              onClick={() => onDelete(r)}
                            >
                              <Trash2 size={15} /> Excluir
                            </button>
                          </ActionMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<Repeat size={26} />}
            title="Uma previsão para cada mês"
            text="Cadastre seu salário ou outra renda recorrente."
          />
        )}
      </Panel>
      <Panel
        title="Saldo entre meses"
        subtitle="Escolha de onde começa o acompanhamento. O restante é calculado automaticamente."
      >
        <form
          className="simple-form carry-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              const settings: Settings = {
                ...(data.settings ?? { theme: "light" }),
              };
              if (enabled)
                settings.carryover = {
                  startMonth: start,
                  openingCents: parseMoney(amount) * (negative ? -1 : 1),
                };
              else delete settings.carryover;
              await onSettings(settings);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <label className="check-line">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Transportar saldo automaticamente
          </label>
          <div className="carry-fields">
            <label>
              Mês inicial do saldo
              <input
                required
                disabled={!enabled}
                type="month"
                min="2000-01"
                max="2199-12"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Saldo inicial
              <input
                aria-label="Valor do saldo inicial"
                required
                disabled={!enabled}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Tipo de saldo
              <select
                disabled={!enabled}
                value={negative ? "negative" : "positive"}
                onChange={(e) => setNegative(e.target.value === "negative")}
              >
                <option value="positive">Dinheiro disponível</option>
                <option value="negative">Déficit / negativo</option>
              </select>
            </label>
          </div>
          <p className="field-hint">
            Informe o dinheiro disponível antes dos movimentos do mês inicial.
            Meses passados usam entradas recebidas e pagamentos efetivos. Meses
            futuros projetam as rendas previstas e contas pendentes. As reduções
            antigas continuam consideradas; evite cadastrar o mesmo gasto
            novamente em Despesas.
          </p>
          {error && <p role="alert">{error}</p>}
          <button className="button primary" disabled={saving}>
            Salvar saldo inicial
          </button>
        </form>
      </Panel>
    </div>
  );
}
export function ExpenseForm({
  expense,
  data,
  month,
  saving,
  onSave,
  onClose,
}: {
  expense?: Expense;
  data?: Data;
  month: string;
  saving: boolean;
  onSave: Save<Expense>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(expense?.description ?? ""),
    [payee, setPayee] = useState(expense?.payee ?? ""),
    [amount, setAmount] = useState(
      expense ? (expense.amountCents / 100).toFixed(2) : "",
    ),
    [method, setMethod] = useState<Expense["method"]>(expense?.method ?? "pix"),
    [due, setDue] = useState(expense?.dueDate ?? `${month}-01`),
    [paid, setPaid] = useState(!!expense?.paidDate),
    [paidDate, setPaidDate] = useState(expense?.paidDate ?? localDate()),
    [error, setError] = useState("");
  const history = useMemo(() => categoryHistory(data, "expense"), [data]);
  const names = useMemo(
    () =>
      nameOptions(
        history.map((e) => e.name),
        EXAMPLES.expense,
      ),
    [history],
  );
  const payees = useMemo(
    () => nameOptions((data?.expenses ?? []).map((e) => e.payee)),
    [data],
  );
  const smart = useSmartCategory(
    expense?.category ?? "Outros",
    !!expense,
    history,
  );
  const { category } = smart;
  const feedback = useFieldFeedback();
  return (
    <Dialog
      title={expense ? "Editar despesa" : "Nova despesa"}
      subtitle="Contas e gastos fora dos cartões, sem duplicar a fatura."
      onClose={onClose}
    >
      <form
        {...feedback.formProps}
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (!description.trim()) {
              feedback.fail("description", "Descreva esta despesa.");
              return;
            }
            if (!payee.trim()) {
              feedback.fail("payee", "Informe o destino ou favorecido.");
              return;
            }
            const cents = feedback.money("amount", amount);
            if (cents === null) return;
            if (!cents) throw Error("Informe um valor maior que zero.");
            if (
              await onSave({
                id: expense?.id ?? crypto.randomUUID(),
                description: description.trim(),
                payee: payee.trim(),
                category,
                method,
                amountCents: cents,
                dueDate: due,
                paidDate: paid ? paidDate : null,
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <Field data-field="description" error={feedback.issues.description}>
          Descrição da despesa
          <SuggestionInput
            aria-label="Descrição da despesa"
            required
            autoFocus
            maxLength={100}
            value={description}
            onValueChange={(value) => {
              setDescription(value);
              smart.onName(value);
            }}
            suggestions={names}
            placeholder="Aluguel, mercado, conta de luz…"
          />
        </Field>
        <Field data-field="payee" error={feedback.issues.payee}>
          Destino / favorecido
          <SuggestionInput
            aria-label="Destino / favorecido"
            required
            maxLength={80}
            value={payee}
            onValueChange={setPayee}
            suggestions={payees}
          />
        </Field>
        <div className="form-row">
          <Field data-field="amount" error={feedback.issues.amount}>
            Valor da despesa
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field>
            Vencimento da despesa
            <input
              required
              type="date"
              min="2000-01-01"
              max="2199-12-31"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field>
            Categoria da despesa
            <select
              aria-label="Categoria da despesa"
              value={category}
              onChange={(e) => smart.choose(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field>
            Forma de pagamento
            <select
              aria-label="Forma de pagamento"
              value={method}
              onChange={(e) => setMethod(e.target.value as Expense["method"])}
            >
              {Object.entries(METHODS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <CategoryHint state={smart} name={description} />
        <Field className="check-line">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          Já foi paga
        </Field>
        {paid && (
          <Field>
            Data do pagamento
            <input
              required
              type="date"
              min="2000-01-01"
              max={localDate()}
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </Field>
        )}
        <p className="field-hint">
          Despesas pendentes entram na previsão. Ao pagar, o desembolso entra na
          data efetiva, sem descontar duas vezes.
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
            Salvar despesa
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function ExpensesPage({
  data,
  month,
  saving,
  onEdit,
  onDelete,
  onPay,
  onUnpay,
}: {
  data: Data;
  month: string;
  saving: boolean;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onPay: (e: Expense) => void;
  onUnpay: (e: Expense) => void;
}) {
  const [search, setSearch] = useViewFilter("expenses.search", ""),
    [category, setCategory] = useViewFilter("expenses.category", "all"),
    [method, setMethod] = useViewFilter("expenses.method", "all"),
    [status, setStatus] = useViewFilter("expenses.status", "all");
  const period = expenseMonth(data, month),
    late = (e: Expense) => !e.paidDate && e.dueDate < localDate(),
    rows = period
      .filter(
        (e) =>
          `${e.description} ${e.payee}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")) &&
          (category === "all" || category === e.category) &&
          (method === "all" || method === e.method) &&
          (status === "all" ||
            (status === "paid"
              ? !!e.paidDate
              : status === "late"
                ? late(e)
                : !e.paidDate)),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const sum = (list: Expense[]) => list.reduce((s, e) => s + e.amountCents, 0),
    pending = sum(period.filter((e) => !e.paidDate));
  return (
    <>
      <div className="stats-grid">
        <div className="stat-card debt" data-tone="info">
          <div className="stat-title">Despesas no período</div>
          <strong>{money(sum(period))}</strong>
          <div className="stat-foot">Inclui atrasadas no mês atual</div>
        </div>
        <div
          className="stat-card"
          data-tone={pending > 0 ? "warning" : "success"}
        >
          <div className="stat-title">Ainda falta pagar</div>
          <strong data-testid="expense-pending">{money(pending)}</strong>
          <div className="stat-foot">Contas fora dos cartões</div>
        </div>
        <div
          className="stat-card"
          data-tone={period.some(late) ? "danger" : "info"}
        >
          <div className="stat-title">Atrasadas</div>
          <strong className="danger-text">
            {money(sum(period.filter(late)))}
          </strong>
          <div className="stat-foot">Vencimento anterior a hoje</div>
        </div>
        <div className="stat-card" data-tone="success">
          <div className="stat-title">Pagamentos neste mês</div>
          <strong>
            {money(
              sum(
                (data.expenses ?? []).filter(
                  (e) => e.paidDate?.slice(0, 7) === month,
                ),
              ),
            )}
          </strong>
          <div className="stat-foot">Pela data efetiva do pagamento</div>
        </div>
      </div>
      <Panel
        title="Suas contas, organizadas"
        subtitle="Pix, boletos, dinheiro e débito com vencimento e situação."
      >
        <div className="ledger-filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Buscar despesas"
              value={search}
              placeholder="Buscar conta ou favorecido…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar categoria das despesas"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar forma de pagamento"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="all">Todas as formas</option>
            {Object.entries(METHODS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar situação das despesas"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todas as situações</option>
            <option value="paid">Pagas</option>
            <option value="pending">Pendentes</option>
            <option value="late">Atrasadas</option>
          </select>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Despesa / destino</th>
                  <th>Valor / forma</th>
                  <th>Vencimento</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.description}</strong>
                      <small className="cell-small">
                        {e.payee} · {e.category}
                      </small>
                    </td>
                    <td>
                      <strong>{money(e.amountCents)}</strong>
                      <small className="cell-small">{METHODS[e.method]}</small>
                    </td>
                    <td>{e.dueDate.split("-").reverse().join("/")}</td>
                    <td>
                      <span
                        className={`badge ${e.paidDate ? "green" : late(e) ? "expense-late" : "warning"}`}
                      >
                        {e.paidDate
                          ? "Paga"
                          : late(e)
                            ? "Atrasada"
                            : "Pendente"}
                      </span>
                      {e.paidDate && (
                        <small className="cell-small">
                          Paga em {e.paidDate.split("-").reverse().join("/")}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button pay"
                          disabled={saving}
                          aria-label={`${e.paidDate ? "Desmarcar pagamento" : "Pagar despesa"} ${e.description}`}
                          onClick={() => (e.paidDate ? onUnpay(e) : onPay(e))}
                        >
                          <Check size={16} />
                        </button>
                        <ActionMenu
                          label={`Mais opções de ${e.description}`}
                          disabled={saving}
                        >
                          <button
                            className="icon-button"
                            disabled={saving}
                            aria-label={`Editar despesa ${e.description}`}
                            onClick={() => onEdit(e)}
                          >
                            <Pencil size={15} /> Editar
                          </button>
                          <button
                            className="icon-button danger-text"
                            disabled={saving}
                            aria-label={`Excluir despesa ${e.description}`}
                            onClick={() => onDelete(e)}
                          >
                            <Trash2 size={15} /> Excluir
                          </button>
                        </ActionMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Tudo em seu lugar"
            text="Cadastre uma despesa ou ajuste os filtros."
          />
        )}
        <div className="table-footer">
          {rows.length} despesas nos filtros · o orçamento considera todos os
          registros
        </div>
      </Panel>
    </>
  );
}
