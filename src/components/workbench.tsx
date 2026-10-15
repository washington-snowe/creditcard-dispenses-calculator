import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  addMonths,
  currentMonth,
  money,
  moneyInput,
  monthLabel,
  parseMoney,
  type Data,
  type Settings,
} from "../domain";
import { localDate } from "../finance";
import {
  availableBudget,
  bestCards,
  calendarEvents,
  cardTiming,
  categoryComparison,
  monthLedger,
  pendingItems,
  searchAll,
  simulatePurchase,
  type Destination,
  type LedgerItem,
} from "../insights";
import { Dialog, Empty, Panel } from "./ui";
import { BankLogo } from "./bank-logo";
export function LedgerList({
  rows,
  onOpen,
}: {
  rows: LedgerItem[];
  onOpen: (r: LedgerItem) => void;
}) {
  return (
    <div className="ledger-list">
      {rows.length ? (
        rows.map((r) => (
          <button
            key={r.key}
            onClick={() => onOpen(r)}
            className="ledger-row"
            data-tone={
              r.paid
                ? "success"
                : r.income
                  ? "info"
                  : r.date < localDate()
                    ? "danger"
                    : "warning"
            }
          >
            <span className="event-indicator">
              {r.paid ? (
                <CheckCheck size={17} />
              ) : r.income ? (
                <ArrowDown size={17} />
              ) : (
                <CalendarDays size={17} />
              )}
            </span>
            <span>
              <strong>{r.label}</strong>
              <small>
                {r.date.split("-").reverse().join("/")} · {r.detail} ·{" "}
                {r.paid ? "Confirmado" : r.income ? "A receber" : "Pendente"}
              </small>
            </span>
            <strong>
              {r.income ? "+ " : ""}
              {money(r.amount)}
            </strong>
          </button>
        ))
      ) : (
        <p className="field-hint">Nenhum lançamento neste período.</p>
      )}
    </div>
  );
}
export function AvailableCard({
  data,
  month,
  saving,
  onSettings,
}: {
  data: Data;
  month: string;
  saving: boolean;
  onSettings: (s: Settings) => Promise<boolean>;
}) {
  const b = availableBudget(data, month);
  const [reserve, setReserve] = useState(moneyInput(b.reserve));
  const [error, setError] = useState("");
  return (
    <Panel
      title="Quanto posso gastar?"
      subtitle="Após compromissos cadastrados e sua reserva mensal."
    >
      <div
        className="available-hero"
        data-tone={b.available < 0 ? "danger" : "success"}
      >
        <ShieldCheck />
        <span>
          Disponível com dinheiro recebido
          <strong data-testid="available-to-spend">{money(b.available)}</strong>
        </span>
      </div>
      <div className="budget-breakdown">
        <span>
          Saldo atual<strong>{money(b.actualBalance)}</strong>
        </span>
        <span>
          Compromissos pendentes<strong>− {money(b.pending)}</strong>
        </span>
        <span>
          Reserva mensal<strong>− {money(b.reserve)}</strong>
        </span>
        <span>
          Se a renda prevista entrar
          <strong>{money(b.projectedAvailable)}</strong>
        </span>
      </div>
      <details className="more-details">
        <summary>Ajustar reserva</summary>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const cents = parseMoney(reserve);
              if (
                await onSettings({
                  ...data.settings,
                  theme: data.settings?.theme ?? "light",
                  reserveCents: cents,
                })
              )
                setError("");
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <label>
            Reserva mensal (R$)
            <input
              aria-label="Reserva mensal"
              inputMode="decimal"
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
              required
            />
          </label>
          <button className="button secondary" disabled={saving}>
            Salvar reserva
          </button>
        </form>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </details>
      <p className="field-hint">
        Considera apenas o que você cadastrou
        {b.carryEnabled ? ", incluindo o saldo entre meses configurado" : ""}.
        Renda prevista não entra no valor principal.
        {b.estimated ? " Há pagamentos históricos estimados." : ""}
      </p>
    </Panel>
  );
}
export function ComparisonPanel({
  data,
  month,
  onOpen,
}: {
  data: Data;
  month: string;
  onOpen: (rows: LedgerItem[], title: string) => void;
}) {
  const rows = categoryComparison(data, month),
    current = rows.reduce((s, r) => s + r.current, 0),
    previous = rows.reduce((s, r) => s + r.prior, 0);
  return (
    <Panel
      title="O que mudou no mês?"
      subtitle={`${monthLabel(month, true)} comparado a ${monthLabel(addMonths(month, -1), true)} · todas as despesas por mês de cobrança.`}
    >
      <div
        className="comparison-summary"
        data-tone={current > previous ? "warning" : "success"}
      >
        <strong>{money(current - previous)}</strong>
        <span>
          {previous
            ? `${(((current - previous) / previous) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação ao mês anterior`
            : "Sem base anterior para calcular porcentagem"}
        </span>
      </div>
      {rows.length ? (
        <div className="category-comparison">
          {rows.map((r) => (
            <button
              key={r.category}
              onClick={() =>
                onOpen(
                  monthLedger(data, month).filter(
                    (i) => !i.income && i.category === r.category,
                  ),
                  `${r.category} · ${monthLabel(month)}`,
                )
              }
            >
              <span>
                <strong>{r.category}</strong>
                <small>
                  {money(r.prior)} → {money(r.current)}
                </small>
              </span>
              <span data-tone={r.delta > 0 ? "warning" : "success"}>
                {r.delta > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{" "}
                {money(Math.abs(r.delta))}
                <small>
                  {r.percentage === null
                    ? "Sem base anterior"
                    : `${r.percentage.toFixed(1).replace(".", ",")}%`}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="field-hint">Registre despesas para comparar os meses.</p>
      )}
      <p className="field-hint">
        Parcelas, assinaturas, despesas e ajustes de saída. Antecipações mantêm
        o mês de cobrança original; não representam uma nova despesa.
      </p>
    </Panel>
  );
}
export function CalendarPage({
  data,
  month,
  onOpen,
  onBill,
}: {
  data: Data;
  month: string;
  onOpen: (r: Destination) => void;
  onBill: (id: string) => void;
}) {
  const openEvent = (r: LedgerItem) =>
    r.key.startsWith("bill:") ? onBill(r.id) : onOpen(r);
  const [selected, setSelected] = useState("");
  const events = useMemo(() => calendarEvents(data, month), [data, month]);
  const [year, m] = month.split("-").map(Number),
    days = new Date(year, m, 0).getDate(),
    offset = new Date(year, m - 1, 1).getDay();
  const date = selected.startsWith(month) ? selected : `${month}-01`;
  return (
    <div className="calendar-layout">
      <Panel
        title="Seu calendário financeiro"
        subtitle="Selecione um dia para ver os detalhes. Fechamentos são estimados conforme o cadastro."
      >
        <div className="calendar-grid" aria-label="Dias do mês">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <span className="weekday" key={d}>
              {d}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`empty:${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = `${month}-${String(i + 1).padStart(2, "0")}`,
              rows = events.filter((r) => r.date === day);
            return (
              <button
                key={day}
                aria-label={`${i + 1} de ${monthLabel(month)}: ${rows.length} eventos`}
                aria-pressed={date === day}
                className={`calendar-day ${day === localDate() ? "today" : ""}`}
                onClick={() => setSelected(day)}
              >
                <strong>{i + 1}</strong>
                <span>
                  {rows.length > 0 && (
                    <>
                      <i
                        className="dot"
                        style={{
                          background: rows.some((r) => !r.paid && !r.income)
                            ? "var(--amber)"
                            : "var(--mint)",
                        }}
                      />
                      <small>
                        {rows.length}{" "}
                        <span className="calendar-event-word">eventos</span>
                      </small>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel
        title={`Dia ${date.slice(-2)}`}
        subtitle="Toque em um lançamento para abrir."
      >
        <LedgerList
          rows={events.filter((r) => r.date === date)}
          onOpen={openEvent}
        />
      </Panel>
      <Panel
        className="full-width"
        title="Agenda do mês"
        subtitle="Faturas agrupam parcelas e assinaturas do cartão, sem duplicar valores."
      >
        <LedgerList rows={events} onOpen={openEvent} />
      </Panel>
    </div>
  );
}
export function PendingPage({
  data,
  month,
  onOpen,
}: {
  data: Data;
  month: string;
  onOpen: (r: Destination) => void;
}) {
  const [filter, setFilter] = useState("all");
  const rows = pendingItems(data, month),
    today = localDate();
  const review = monthLedger(data, month).filter(
    (r) => r.category === "Outros",
  );
  const shown =
    filter === "review"
      ? review
      : rows.filter(
          (r) =>
            filter === "all" ||
            (filter === "overdue"
              ? r.date < today
              : filter === "soon"
                ? r.date >= today &&
                  r.date <=
                    new Date(Date.parse(today + "T12:00:00Z") + 7 * 86400000)
                      .toISOString()
                      .slice(0, 10)
                : r.kind === "subscription"),
        );
  return (
    <>
      <div className="insight-stats">
        <div
          data-tone={rows.some((r) => r.date < today) ? "danger" : "success"}
        >
          <CircleAlert />
          <span>
            Vencidas neste período
            <strong>{rows.filter((r) => r.date < today).length}</strong>
          </span>
        </div>
        <div data-tone="warning">
          <CalendarDays />
          <span>
            Compromissos pendentes
            <strong>{money(rows.reduce((s, r) => s + r.amount, 0))}</strong>
          </span>
        </div>
      </div>
      <Panel
        title="Central de pendências"
        subtitle="Pendências do mês selecionado e parcelas/despesas vencidas trazidas para o mês atual."
      >
        <label>
          Mostrar
          <select
            aria-label="Filtrar pendências"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="overdue">Vencidas</option>
            <option value="soon">Próximos 7 dias</option>
            <option value="subscription">Assinaturas a renovar</option>
            <option value="review">Revisar categoria Outros</option>
          </select>
        </label>
        <LedgerList rows={shown} onOpen={onOpen} />
        <p className="field-hint">
          Selecione “Revisar categoria Outros” para abrir os lançamentos que
          podem precisar de uma categoria mais específica. Os avisos dependem
          dos registros do aplicativo.
        </p>
      </Panel>
    </>
  );
}
export function SimulatorPage({
  data,
  onCard,
  onCreate,
}: {
  data: Data;
  onCard: (id: string) => void;
  onCreate: (purchase: PurchaseDraft) => void;
}) {
  const [date, setDate] = useState(localDate()),
    [amount, setAmount] = useState(""),
    [count, setCount] = useState("1"),
    [cardId, setCardId] = useState(data.cards[0]?.id ?? ""),
    [override, setOverride] = useState("");
  let cents = 0;
  try {
    cents = parseMoney(amount);
  } catch {}
  const rankings = bestCards(data, date, cents),
    selected = data.cards.find((c) => c.id === cardId),
    timing = selected ? cardTiming(selected, date) : null,
    firstMonth = override || timing?.billMonth || date.slice(0, 7);
  let simulation: ReturnType<typeof simulatePurchase> = [],
    error = "";
  if (amount)
    try {
      simulation = simulatePurchase(
        data,
        cardId,
        cents,
        Number(count),
        firstMonth,
      );
    } catch (e) {
      error = (e as Error).message;
    }
  return (
    <div className="workbench-grid">
      <Panel
        title="Antes de comprar"
        subtitle="Simule o impacto sem alterar seus registros."
      >
        <div className="simulator-fields">
          <label>
            Data da compra
            <input
              aria-label="Data da compra simulada"
              type="date"
              min="2000-01-01"
              max="2199-12-31"
              required
              value={date}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value);
                  setOverride("");
                }
              }}
            />
          </label>
          <label>
            Valor total (R$)
            <input
              aria-label="Valor da compra simulada"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </label>
          <label>
            Parcelas
            <input
              aria-label="Parcelas simuladas"
              type="number"
              min={1}
              max={600}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
          <label>
            Cartão
            <select
              aria-label="Cartão da simulação"
              value={cardId}
              onChange={(e) => {
                setCardId(e.target.value);
                setOverride("");
              }}
            >
              {data.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Primeira fatura
            <input
              aria-label="Primeira fatura simulada"
              type="month"
              min="2000-01"
              max="2199-12"
              value={firstMonth}
              onChange={(e) => setOverride(e.target.value)}
            />
          </label>
        </div>
        {!data.cards.length && (
          <Empty
            title="Cadastre um cartão"
            text="Depois, simule uma compra e compare os prazos."
          />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="field-hint">
          Inclua juros no valor total. A primeira fatura deve ser neste mês ou
          depois. A simulação usa rendas previstas e saldo entre meses
          configurado; confira o primeiro vencimento no banco.
        </p>
        {simulation.length > 0 && (
          <button
            className="button primary"
            onClick={() =>
              onCreate({
                cardId,
                totalCents: cents,
                installments: Number(count),
                nextMonth: firstMonth,
              })
            }
          >
            Continuar para anotar compra
          </button>
        )}
      </Panel>
      <Panel
        title="Melhor cartão para esta data"
        subtitle="Prioriza limite cadastrado suficiente e, depois, maior prazo."
      >
        {rankings.length ? (
          rankings.map((r, i) => (
            <button
              className="recommendation"
              key={r.card.id}
              onClick={() => {
                setCardId(r.card.id);
                setOverride("");
              }}
              aria-pressed={cardId === r.card.id}
            >
              <BankLogo bank={r.card.bank} />
              <span>
                <strong>
                  {i === 0 ? "★ " : ""}
                  {r.card.name}
                </strong>
                <small>
                  Vencimento {r.due.split("-").reverse().join("/")} · {r.days}{" "}
                  dias
                </small>
                <small>
                  {r.available === null
                    ? "Limite não informado"
                    : `${money(r.available)} livres estimados`}
                  {!r.fits ? " · limite insuficiente" : ""}
                </small>
              </span>
            </button>
          ))
        ) : (
          <p className="field-hint">
            Informe o dia de fechamento dos cartões para comparar prazos.
          </p>
        )}
        {data.cards
          .filter((c) => !c.closingDay)
          .map((c) => (
            <button
              className="text-button"
              key={c.id}
              onClick={() => onCard(c.id)}
            >
              Configurar fechamento de {c.name}
            </button>
          ))}
        <p className="field-hint">
          Compras no dia do fechamento são consideradas na fatura que fecha
          nesse dia. O banco pode processá-las de outra forma. O limite estimado
          considera as parcelas em aberto cadastradas.
        </p>
      </Panel>
      {simulation.length > 0 && (
        <Panel
          className="full-width"
          title="Impacto nas próximas faturas"
          subtitle="Saldo projetado após a compra e a reserva mensal. Valores negativos indicam falta de dinheiro."
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Parcela nova</th>
                  <th>Fatura antes</th>
                  <th>Fatura depois</th>
                  <th>Saldo após reserva</th>
                </tr>
              </thead>
              <tbody>
                {simulation.map((r) => (
                  <tr key={r.month}>
                    <td>{monthLabel(r.month, true)}</td>
                    <td>{money(r.installment)}</td>
                    <td>{money(r.billBefore)}</td>
                    <td>{money(r.billBefore + r.installment)}</td>
                    <td className={r.balanceAfter < 0 ? "overdue" : ""}>
                      {money(r.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
export type PurchaseDraft = {
  cardId: string;
  totalCents: number;
  installments: number;
  nextMonth: string;
};
export function GlobalSearch({
  data,
  onOpen,
  onClose,
  onNavigate,
}: {
  data: Data;
  onOpen: (r: Destination) => void;
  onClose: () => void;
  onNavigate: (tab: "calendar" | "pending" | "simulator" | "data") => void;
}) {
  const [query, setQuery] = useState(""),
    rows = useMemo(() => searchAll(data, query), [data, query]);
  return (
    <Dialog
      title="Buscar no ContaClara"
      subtitle="Compras, cartões, assinaturas, despesas e entradas."
      onClose={onClose}
    >
      <div
        className="global-search-dialog"
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          const fields = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>("input, button"),
          );
          const i = fields.indexOf(document.activeElement as HTMLElement);
          e.preventDefault();
          fields[
            (i + (e.key === "ArrowDown" ? 1 : -1) + fields.length) %
              fields.length
          ]?.focus();
        }}
      >
        <label className="search">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Busca geral"
            placeholder="O que você quer encontrar?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && rows[0]) onOpen(rows[0]);
            }}
          />
        </label>
        <div className="search-results">
          {rows.map((r) => (
            <button key={`${r.kind}:${r.id}`} onClick={() => onOpen(r)}>
              <span>
                <strong>{r.label}</strong>
                <small>{r.detail}</small>
              </span>
              {r.amount !== undefined && <strong>{money(r.amount)}</strong>}
            </button>
          ))}
          {query && !rows.length && <p>Nenhum resultado encontrado.</p>}
          {!query &&
            (
              [
                ["calendar", "Calendário financeiro"],
                ["pending", "Central de pendências"],
                ["simulator", "Simular compra"],
                ["data", "Importar e gerenciar backups"],
              ] as const
            ).map(([tab, label]) => (
              <button key={tab} onClick={() => onNavigate(tab)}>
                {label}
              </button>
            ))}
        </div>
        <small className="field-hint">
          ↑ ↓ para navegar · Enter para abrir · Esc para fechar
        </small>
      </div>
    </Dialog>
  );
}
