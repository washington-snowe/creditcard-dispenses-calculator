import { useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowUp,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Target,
  TrendingDown,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORIES,
  addMonths,
  currentMonth,
  isFinancialPrivate,
  money,
  moneyInput,
  monthLabel,
  monthsBetween,
  type Data,
  type Goal,
} from "../domain";
import { goalSpending, savingsPlan, spendingProgress } from "../goals";
import { Dialog, Empty, Panel } from "./ui";
import { Field, useFieldFeedback } from "./field";
import { ActionMenu } from "./action-menu";
import { ChartTooltip, tooltipLayer } from "./chart-tooltip";

export function GoalForm({
  goal,
  kind = "saving",
  data,
  month,
  saving,
  onSave,
  onClose,
}: {
  goal?: Goal;
  kind?: Goal["kind"];
  data: Data;
  month: string;
  saving: boolean;
  onSave: (goal: Goal) => Promise<boolean>;
  onClose: () => void;
}) {
  const [type, setType] = useState(goal?.kind ?? kind);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [target, setTarget] = useState(
    goal ? moneyInput(goal.targetCents) : "",
  );
  const [start, setStart] = useState(goal?.startMonth ?? month);
  const [deadline, setDeadline] = useState(goal?.deadlineMonth ?? "");
  const [category, setCategory] = useState(goal?.category ?? "all");
  const [manualReference, setManualReference] = useState(!!goal);
  const [reference, setReference] = useState(
    goal?.baselineCents != null ? moneyInput(goal.baselineCents) : "",
  );
  const previous = useMemo(
    () =>
      goalSpending(
        data,
        addMonths(start, -1),
        category === "all" ? null : category,
      ),
    [data, start, category],
  );
  const effectiveReference = manualReference
    ? reference
    : previous
      ? moneyInput(previous)
      : "";
  const feedback = useFieldFeedback();
  const [error, setError] = useState("");
  return (
    <Dialog
      title={goal ? "Editar meta" : "Nova meta"}
      subtitle="Transforme seus planos em passos que você consegue acompanhar."
      onClose={onClose}
    >
      <form
        {...feedback.formProps}
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (!title.trim())
            return void feedback.fail("title", "Dê um nome à meta.");
          const amount = feedback.money("target", target);
          if (amount === null) return;
          const baseline =
            type === "spending" && effectiveReference.trim()
              ? feedback.money("reference", effectiveReference, true)
              : null;
          if (
            type === "spending" &&
            effectiveReference.trim() &&
            baseline === null
          )
            return;
          if (deadline && deadline < start)
            return void feedback.fail(
              "deadline",
              "O prazo deve ser igual ou posterior ao início.",
            );
          if (!goal && (data.goals?.length ?? 0) >= 100)
            return setError(
              "Você pode manter até 100 metas, incluindo as arquivadas.",
            );
          if (
            await onSave({
              id: goal?.id ?? crypto.randomUUID(),
              title: title.trim(),
              description: description.trim(),
              kind: type,
              targetCents: amount,
              startMonth: start,
              deadlineMonth: deadline || null,
              category:
                type === "spending" && category !== "all" ? category : null,
              baselineCents: type === "spending" ? baseline : null,
              archived: goal?.archived ?? false,
            })
          )
            onClose();
        }}
      >
        <div className="goal-form">
          <Field>
            Tipo de meta
            <select
              aria-label="Tipo de meta"
              value={type}
              onChange={(event) => setType(event.target.value as Goal["kind"])}
            >
              <option value="saving">Juntar dinheiro / comprar algo</option>
              <option value="spending">Gastar menos</option>
            </select>
          </Field>
          <Field data-field="title" error={feedback.issues.title}>
            Nome da meta
            <input
              aria-label="Nome da meta"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={80}
              placeholder={
                type === "saving"
                  ? "Ex.: Comprar um notebook"
                  : "Ex.: Gastar menos com alimentação"
              }
            />
          </Field>
          <Field data-field="target" error={feedback.issues.target}>
            {type === "saving" ? "Valor do objetivo" : "Limite por mês"}
            <input
              aria-label={
                type === "saving" ? "Valor do objetivo" : "Limite por mês"
              }
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
              placeholder="Ex.: 1.500,00"
            />
          </Field>
          {type === "spending" && (
            <>
              <Field>
                Categoria da meta
                <select
                  aria-label="Categoria da meta"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="all">Todos os gastos</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field data-field="reference" error={feedback.issues.reference}>
                Gasto de referência (opcional)
                <input
                  aria-label="Gasto de referência"
                  inputMode="decimal"
                  value={effectiveReference}
                  onChange={(event) => {
                    setManualReference(true);
                    setReference(event.target.value);
                  }}
                  placeholder="Ex.: 600,00"
                />
                <small className="field-hint">
                  Sugerimos o gasto de {monthLabel(addMonths(start, -1))}. Você
                  pode informar outro valor para comparar a economia.
                </small>
              </Field>
            </>
          )}
          <div className="form-row">
            <Field>
              Começar em
              <input
                aria-label="Começar em"
                type="month"
                min="2000-01"
                max="2199-12"
                required
                value={start}
                onChange={(event) => setStart(event.target.value || month)}
              />
            </Field>
            <Field data-field="deadline" error={feedback.issues.deadline}>
              {type === "saving"
                ? "Prazo desejado (opcional)"
                : "Acompanhar até (opcional)"}
              <input
                aria-label="Prazo da meta"
                type="month"
                min={start}
                max="2199-12"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </Field>
          </div>
          <Field>
            Descrição (opcional)
            <textarea
              aria-label="Descrição da meta"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Por que essa meta é importante para você?"
            />
          </Field>
          <p className="goal-form-note">
            {type === "saving"
              ? "O progresso usa as sobras dos seus registros, depois dos compromissos e da reserva. As metas recebem esse valor na ordem de prioridade, sem contar o mesmo dinheiro duas vezes. É uma estimativa: nenhum valor é transferido ou separado no banco."
              : "O limite considera parcelas, assinaturas, despesas e reduções de saldo do mês. A economia é a diferença para o gasto de referência; no mês em andamento ela ainda é parcial."}
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
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
            <Check size={16} />
            {saving ? "Salvando…" : "Salvar meta"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function SavingsEvolution({
  rows,
}: {
  rows: ReturnType<typeof savingsPlan>["history"];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const recent = rows.slice(-12);
  return (
    <details className="goal-evolution">
      <summary>
        Ver evolução das economias <ChevronRight size={16} />
      </summary>
      <Panel
        title="Evolução do saldo para metas"
        subtitle="Saldo acumulado após pagamentos, compromissos pendentes e reserva financeira. Últimos 12 meses do acompanhamento."
      >
        <div
          className="goal-chart"
          ref={chartRef}
          role="img"
          aria-label="Evolução mensal do saldo estimado para metas"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={recent}
              margin={{ top: 15, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                stroke="var(--grid)"
                vertical={false}
                strokeDasharray="4 5"
              />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => monthLabel(m, true)}
                tick={{ fill: "var(--muted)", fontSize: "var(--text-caption)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width="auto"
                tickFormatter={(v) => (isFinancialPrivate() ? "•••" : money(v))}
                tick={{ fill: "var(--muted)", fontSize: "var(--text-caption)" }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Tooltip
                portal={document.body}
                wrapperStyle={tooltipLayer}
                content={<ChartTooltip chartRef={chartRef} />}
              />
              <Bar
                dataKey="balance"
                name="Disponível estimado"
                fill="var(--accent)"
                maxBarSize={52}
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              >
                {recent.map((row) => (
                  <Cell
                    key={row.month}
                    fill={row.balance < 0 ? "var(--danger)" : "var(--accent)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="goal-chart-table">
          <summary>Consultar valores por mês</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Saldo para metas</th>
                  <th>Distribuído às metas</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.month}>
                    <td>{monthLabel(r.month)}</td>
                    <td>{money(r.balance)}</td>
                    <td>{money(r.allocated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Panel>
    </details>
  );
}

export function GoalsPage({
  data,
  month,
  saving,
  onNew,
  onEdit,
  onChange,
}: {
  data: Data;
  month: string;
  saving: boolean;
  onNew: (kind: Goal["kind"]) => void;
  onEdit: (goal: Goal) => void;
  onChange: (goals: Goal[], message: string) => Promise<boolean>;
}) {
  const [kind, setKind] = useState("all"),
    [status, setStatus] = useState("active"),
    [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<Goal | null>(null);
  const goals = data.goals ?? [],
    today = currentMonth();
  const plan = useMemo(() => savingsPlan(data, month), [data, month]);
  const fold = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  const filtered = goals.filter(
    (g) =>
      (kind === "all" || g.kind === kind) &&
      (status === "all" || g.archived === (status === "archived")) &&
      fold(`${g.title} ${g.description} ${g.category ?? ""}`).includes(
        fold(query.trim()),
      ),
  );
  const savings = goals.filter((g) => !g.archived && g.kind === "saving");
  return (
    <div className="goals-page">
      <div className="goal-summary-grid">
        <section className="goal-summary">
          <span>
            <Wallet size={18} />
            Economia disponível estimada
          </span>
          <strong data-testid="goals-available">{money(plan.available)}</strong>
          <small>
            Desde {monthLabel(plan.start)} · até {monthLabel(plan.cutoff)}
          </small>
        </section>
        <section className="goal-summary">
          <span>
            <Target size={18} />
            Direcionado às metas
          </span>
          <strong data-testid="goals-allocated">{money(plan.allocated)}</strong>
          <small>
            {savings.length}{" "}
            {savings.length === 1
              ? "objetivo de juntar dinheiro"
              : "objetivos de juntar dinheiro"}
          </small>
        </section>
        <section className="goal-summary">
          <span>
            <TrendingDown size={18} />
            Acompanhar seus hábitos
          </span>
          <strong>
            {goals.filter((g) => !g.archived && g.kind === "spending").length}
          </strong>
          <small>Metas para gastar menos</small>
        </section>
      </div>
      <details className="goal-method">
        <summary>Como o progresso é calculado?</summary>
        <p>
          Consideramos o dinheiro recebido e os pagamentos desde o início do
          acompanhamento. Descontamos uma vez os compromissos ainda pendentes
          até {monthLabel(plan.cutoff)}, inclusive atrasos, e sua reserva
          financeira. Rendas previstas ficam de fora. Se você usa transporte de
          saldo, o saldo anterior é incluído.
        </p>
        <p>
          As metas de juntar dinheiro recebem o saldo disponível na ordem em que
          aparecem. Use “Priorizar meta” para mudar essa ordem. Uma nova despesa
          ou um déficit pode reduzir o progresso. Os valores são estimativas dos
          seus registros, não depósitos separados no banco.
        </p>
        <dl>
          <div>
            <dt>Saldo inicial considerado</dt>
            <dd>{money(plan.opening)}</dd>
          </div>
          <div>
            <dt>Compromissos pendentes descontados</dt>
            <dd>{money(plan.pending)}</dd>
          </div>
          <div>
            <dt>Reserva protegida</dt>
            <dd>{money(plan.reserve)}</dd>
          </div>
          <div>
            <dt>Sobra sem destino</dt>
            <dd>{money(plan.free)}</dd>
          </div>
        </dl>
      </details>
      {month > today && (
        <p className="goal-notice">
          Os objetivos de juntar dinheiro mostram o progresso até{" "}
          {monthLabel(today)}. Valores futuros não são tratados como
          economizados.
        </p>
      )}
      {plan.deficit > 0 && (
        <p className="goal-notice danger">
          Os registros indicam {money(plan.deficit)} a cobrir antes de
          direcionar novas sobras às metas.
        </p>
      )}
      {!goals.length ? (
        <div className="goal-empty-grid">
          <button className="goal-starter" onClick={() => onNew("saving")}>
            <span className="goal-symbol">
              <Target size={24} />
            </span>
            <h2>O que você quer conquistar?</h2>
            <p>
              Um notebook, uma viagem ou uma reserva. Defina o valor e acompanhe
              quanto falta com os seus registros.
            </p>
            <span>
              Criar meta para juntar dinheiro <Plus size={16} />
            </span>
          </button>
          <button className="goal-starter" onClick={() => onNew("spending")}>
            <span className="goal-symbol">
              <TrendingDown size={24} />
            </span>
            <h2>Que gasto você quer reduzir?</h2>
            <p>
              Escolha um limite mensal para todos os gastos ou para uma
              categoria e veja sua economia.
            </p>
            <span>
              Criar meta para gastar menos <Plus size={16} />
            </span>
          </button>
        </div>
      ) : (
        <>
          <div className="goal-filters">
            <label className="search">
              <Search size={17} />
              <input
                aria-label="Buscar metas"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar suas metas…"
              />
            </label>
            <select
              aria-label="Filtrar tipo de meta"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="saving">Juntar dinheiro</option>
              <option value="spending">Gastar menos</option>
            </select>
            <select
              aria-label="Filtrar situação das metas"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Em acompanhamento</option>
              <option value="archived">Arquivadas</option>
              <option value="all">Todas as situações</option>
            </select>
          </div>
          {!filtered.length && (
            <Empty
              title="Nenhuma meta encontrada"
              text="Ajuste a busca ou os filtros para encontrar seus objetivos."
            />
          )}
          <div className="goal-grid">
            {filtered.map((goal) => {
              const amount = plan.allocations.get(goal.id) ?? 0,
                left = Math.max(0, goal.targetCents - amount);
              const spending =
                goal.kind === "spending"
                  ? spendingProgress(data, goal, month)
                  : null;
              const notStarted =
                goal.startMonth > (spending ? month : plan.cutoff);
              const outside = !!spending && !spending.active;
              const ready =
                !goal.archived &&
                !notStarted &&
                (spending ? spending.achieved : left === 0);
              const overspent =
                !!spending &&
                spending.active &&
                spending.spent > goal.targetCents;
              const overdue =
                goal.kind === "saving" &&
                !!goal.deadlineMonth &&
                goal.deadlineMonth < plan.cutoff &&
                left > 0;
              const tone =
                overspent || overdue
                  ? "danger"
                  : ready
                    ? "success"
                    : spending?.active && spending.percent >= 80
                      ? "warning"
                      : "accent";
              const percent = spending
                ? spending.percent
                : (amount / goal.targetCents) * 100;
              const label = goal.archived
                ? "Arquivada"
                : notStarted
                  ? "Ainda não começou"
                  : outside
                    ? "Fora do período"
                    : spending?.future
                      ? "Previsão"
                      : overspent
                        ? "Limite ultrapassado"
                        : ready
                          ? spending
                            ? "Dentro do limite · mês encerrado"
                            : "Valor disponível"
                          : overdue
                            ? "Prazo passou"
                            : spending
                              ? "Mês em acompanhamento"
                              : "Em progresso";
              const periods = goal.deadlineMonth
                ? Math.max(
                    1,
                    monthsBetween(
                      plan.cutoff < goal.startMonth
                        ? goal.startMonth
                        : plan.cutoff,
                      goal.deadlineMonth,
                    ) + 1,
                  )
                : null;
              return (
                <article
                  className="goal-card"
                  data-tone={tone}
                  aria-label={`Meta ${goal.title}`}
                  key={goal.id}
                >
                  <header>
                    <span className="goal-symbol">
                      {goal.kind === "saving" ? (
                        <Target size={22} />
                      ) : (
                        <TrendingDown size={22} />
                      )}
                    </span>
                    <span className="goal-kind">
                      {goal.kind === "saving"
                        ? `Juntar dinheiro · prioridade ${savings.findIndex((g) => g.id === goal.id) + 1 || "—"}`
                        : `Gastar menos · ${goal.category ?? "todos os gastos"}`}
                    </span>
                    <ActionMenu
                      disabled={saving}
                      label={`Mais opções da meta ${goal.title}`}
                    >
                      <button onClick={() => onEdit(goal)}>
                        <Pencil size={15} />
                        Editar meta
                      </button>
                      {goal.kind === "saving" &&
                        !goal.archived &&
                        savings[0]?.id !== goal.id && (
                          <button
                            onClick={() =>
                              void onChange(
                                [
                                  goal,
                                  ...goals.filter((g) => g.id !== goal.id),
                                ],
                                "Prioridade das metas atualizada.",
                              )
                            }
                          >
                            <ArrowUp size={15} />
                            Priorizar meta
                          </button>
                        )}
                      <button
                        onClick={() =>
                          void onChange(
                            goals.map((g) =>
                              g.id === goal.id
                                ? { ...g, archived: !g.archived }
                                : g,
                            ),
                            goal.archived
                              ? "Meta retomada."
                              : "Meta arquivada.",
                          )
                        }
                      >
                        <Archive size={15} />
                        {goal.archived ? "Retomar meta" : "Arquivar meta"}
                      </button>
                      <button
                        className="danger-text"
                        onClick={() => setRemoving(goal)}
                      >
                        <Trash2 size={15} />
                        Excluir meta
                      </button>
                    </ActionMenu>
                  </header>
                  <h2>{goal.title}</h2>
                  {goal.description && (
                    <p className="goal-description">{goal.description}</p>
                  )}
                  <span className={`goal-status ${tone}`}>{label}</span>
                  <div className="goal-amount">
                    <small>
                      {spending
                        ? spending.future
                          ? "Gastos já previstos"
                          : "Gasto no mês"
                        : "Disponível estimado para a meta"}
                    </small>
                    <strong data-testid="goal-current">
                      {money(spending ? spending.spent : amount)}
                    </strong>
                    <span>
                      {spending ? "de um limite de" : "de um objetivo de"}{" "}
                      {money(goal.targetCents)}
                    </span>
                  </div>
                  <div
                    className="goal-meter"
                    role="progressbar"
                    aria-label={`${spending ? "Limite utilizado" : "Progresso"}: ${goal.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(
                      Math.max(0, Math.min(100, percent)),
                    )}
                    aria-valuetext={`${Math.round(percent)}%${spending ? " do limite utilizado" : " do objetivo disponível"}`}
                  >
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, percent))}%`,
                      }}
                    />
                  </div>
                  <div className="goal-progress-caption">
                    <span>
                      {Math.round(percent)}%{" "}
                      {spending ? "do limite" : "do objetivo"}
                    </span>
                    <strong>
                      {spending
                        ? `${spending.remaining < 0 ? "Excedeu" : "Pode gastar até"} ${money(Math.abs(spending.remaining))}`
                        : `Faltam ${money(left)}`}
                    </strong>
                  </div>
                  {spending ? (
                    <p className="goal-insight">
                      {outside || notStarted || spending.future
                        ? "A economia será avaliada nos meses do acompanhamento."
                        : spending.saved === null
                          ? "Informe um gasto de referência para comparar a economia."
                          : `${month < today ? "Economia no mês" : "Economia parcial"}: ${money(spending.saved)} em relação à referência de ${money(goal.baselineCents!)}.`}
                      {month === today && spending.active
                        ? " O resultado pode mudar até o fim do mês."
                        : ""}
                    </p>
                  ) : (
                    <p className="goal-insight">
                      {notStarted
                        ? `O acompanhamento começa em ${monthLabel(goal.startMonth)}.`
                        : left === 0
                          ? "Seus registros indicam saldo para realizar este objetivo. Confira se todas as suas contas estão cadastradas."
                          : goal.deadlineMonth && periods && !overdue
                            ? `Para chegar até ${monthLabel(goal.deadlineMonth)}, será preciso mais ${money(Math.ceil(left / periods))} por mês, em média.`
                            : overdue
                              ? "Você pode ajustar o prazo ou priorizar esta meta."
                              : "Continue registrando entradas e despesas. As novas sobras atualizam esta meta automaticamente."}
                    </p>
                  )}
                  <footer>
                    <span>
                      Desde {monthLabel(goal.startMonth)}
                      {goal.deadlineMonth
                        ? ` · Até ${monthLabel(goal.deadlineMonth)}`
                        : ""}
                    </span>
                    <button
                      className="text-button"
                      disabled={saving}
                      onClick={() => onEdit(goal)}
                    >
                      Editar <Pencil size={13} />
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
          <SavingsEvolution rows={plan.history} />
        </>
      )}
      {removing && (
        <Dialog
          title="Excluir meta?"
          onClose={() => {
            if (!saving) setRemoving(null);
          }}
        >
          <div className="confirm-content">
            <p>
              Excluir “{removing.title}”? Seus lançamentos financeiros serão
              preservados. O saldo estimado poderá ser redistribuído às outras
              metas.
            </p>
          </div>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setRemoving(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={saving}
              onClick={async () => {
                if (
                  await onChange(
                    goals.filter((g) => g.id !== removing.id),
                    "Meta excluída.",
                  )
                )
                  setRemoving(null);
              }}
            >
              Excluir meta
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
