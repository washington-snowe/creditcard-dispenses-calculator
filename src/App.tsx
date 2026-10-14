import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Repeat,
  RefreshCw,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  FileUp,
  Filter,
  LayoutDashboard,
  Moon,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  Undo2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  COLORS,
  CATEGORIES,
  EMPTY,
  addMonths,
  anticipationOptions,
  currentMonth,
  forecast,
  installmentAmount,
  money,
  monthLabel,
  monthSnapshot,
  parseMoney,
  payPurchase,
  remaining,
  removePurchase,
  replacePurchase,
  suggestPayoffs,
  validateData,
  type Card,
  type Data,
  type Purchase,
  type CashEntry,
  type Subscription,
} from "./domain";
import { loadData, saveData } from "./storage";
import { CardForm, PurchaseForm } from "./components/forms";
import {
  ComparisonChart,
  DistributionChart,
  MonthlyChart,
  SimulationChart,
} from "./components/charts";
import { Dialog, Empty, LocalNote, Panel, PlasticCard } from "./components/ui";
import { CashForm, CashPage } from "./components/cash";
import {
  SubscriptionForm,
  SubscriptionsPage,
} from "./components/subscriptions";
import { UpdatesPage } from "./components/updates";
import {
  payEntireCardMonth,
  paySubscription,
  removeSubscription,
  subscriptionMonth,
} from "./finance";

type Tab =
  | "overview"
  | "purchases"
  | "cards"
  | "planning"
  | "anticipation"
  | "income"
  | "subscriptions"
  | "updates";
type Filters = {
  search: string;
  bank: string;
  card: string;
  category: string;
  status: string;
};
type Modal =
  | { type: "card"; card?: Card }
  | { type: "purchase"; purchase?: Purchase; cardId?: string }
  | {
      type: "confirm";
      title: string;
      text: string;
      detail?: ReactNode;
      action: () => Promise<boolean>;
      danger?: boolean;
    }
  | { type: "advance"; purchase: Purchase }
  | { type: "income"; entry?: CashEntry; kind?: CashEntry["kind"] }
  | { type: "subscription"; subscription?: Subscription }
  | null;
const CLEAR: Filters = {
  search: "",
  bank: "all",
  card: "all",
  category: "all",
  status: "all",
};
const nav = [
  { id: "overview" as const, title: "Visão geral", icon: LayoutDashboard },
  { id: "purchases" as const, title: "Minhas compras", icon: ShoppingBag },
  { id: "cards" as const, title: "Meus cartões", icon: CreditCard },
  { id: "planning" as const, title: "Planejamento", icon: CalendarDays },
  { id: "anticipation" as const, title: "Antecipações", icon: Zap },
  { id: "income" as const, title: "Entradas do mês", icon: Banknote },
  { id: "subscriptions" as const, title: "Assinaturas", icon: Repeat },
  { id: "updates" as const, title: "Atualizações", icon: RefreshCw },
];
const titles: Record<Tab, [string, string]> = {
  income: [
    "Seu dinheiro, com destino.",
    "Registre as entradas, ajuste os valores e saiba quanto vai sobrar.",
  ],
  subscriptions: [
    "Recorrências sob controle.",
    "Seus serviços, renovações e compromissos em um só lugar.",
  ],
  updates: [
    "Seu Saldo, sempre atual.",
    "Confira as novas versões publicadas no seu repositório GitHub.",
  ],
  overview: [
    "Tudo sob controle.",
    "Um pouco mais de clareza. Muito mais tranquilidade.",
  ],
  purchases: [
    "Cada compra, no seu lugar.",
    "Todos os cartões. Todas as parcelas. Uma visão completa.",
  ],
  cards: [
    "Seus cartões. Seu ritmo.",
    "Acompanhe cada saldo e dê o mês como pago em um clique.",
  ],
  planning: [
    "Faça espaço para o futuro.",
    "Navegue pelo calendário e veja exatamente o que vem pela frente.",
  ],
  anticipation: [
    "Menos parcelas. Mais respiro.",
    "Compare os valores, simule quitações e alivie os próximos meses.",
  ],
};
function demoData(theme: "light" | "dark"): Data {
  const cards: Card[] = [
    {
      id: crypto.randomUUID(),
      name: "Meu roxinho",
      bank: "Nubank",
      last4: "4829",
      color: COLORS[1],
      dueDay: 10,
      limitCents: 1000000,
    },
    {
      id: crypto.randomUUID(),
      name: "Para o dia a dia",
      bank: "Itaú",
      last4: "1056",
      color: COLORS[2],
      dueDay: 15,
      limitCents: 800000,
    },
    {
      id: crypto.randomUUID(),
      name: "Planos e viagens",
      bank: "Inter",
      last4: "7312",
      color: COLORS[0],
      dueDay: 20,
      limitCents: 600000,
    },
  ];
  const p = (
    description: string,
    card: number,
    totalCents: number,
    installments: number,
    paid: number,
    category: string,
  ): Purchase => ({
    id: crypto.randomUUID(),
    description,
    cardId: cards[card].id,
    totalCents,
    installments,
    paid,
    category,
    nextMonth: currentMonth(),
  });
  return {
    version: 1,
    cards,
    purchases: [
      p("Notebook novo", 0, 480000, 12, 4, "Tecnologia"),
      p("Sofá da sala", 1, 240000, 10, 3, "Casa"),
      p("Passagens para as férias", 2, 180000, 6, 2, "Lazer"),
      p("Curso de inglês", 0, 120000, 12, 7, "Educação"),
      p("Tênis de corrida", 1, 45000, 3, 1, "Compras"),
    ],
    payments: [],
    settings: { theme },
  };
}
function AdvanceForm({
  purchase,
  saving,
  onClose,
  onSave,
}: {
  purchase: Purchase;
  saving: boolean;
  onClose: () => void;
  onSave: (count: number) => Promise<boolean>;
}) {
  const left = purchase.installments - purchase.paid;
  const [count, setCount] = useState("1");
  const n = Number(count),
    valid = Number.isInteger(n) && n >= 1 && n <= left;
  const amount = valid
    ? Array.from({ length: n }, (_, i) =>
        installmentAmount(purchase, purchase.paid + i),
      ).reduce((s, a) => s + a, 0)
    : 0;
  return (
    <Dialog
      title="Antecipar parcelas"
      subtitle={purchase.description}
      onClose={onClose}
    >
      <form
        className="advance-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (valid && (await onSave(n))) onClose();
        }}
      >
        <label>
          Quantas parcelas você pagou adiantado?
          <input
            autoFocus
            type="number"
            min={1}
            max={left}
            required
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <div className="advance-presets">
          <button
            type="button"
            className="button secondary"
            onClick={() => setCount("1")}
          >
            Uma parcela
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => setCount(String(left))}
          >
            Quitar a compra
          </button>
        </div>
        <div className="pay-preview">
          <small>Total a registrar</small>
          <strong>{money(amount)}</strong>
          <span>
            {valid && n === left
              ? "Compra quitada. Nenhuma parcela futura."
              : valid
                ? `Próxima cobrança: ${monthLabel(addMonths(purchase.nextMonth, n), true)}`
                : "Confira a quantidade de parcelas."}
          </span>
        </div>
        <p className="field-hint">
          As próximas parcelas serão marcadas como pagas. Isso registra o
          pagamento no aplicativo; não movimenta dinheiro no banco.
        </p>
        <div className="dialog-footer">
          <button
            type="button"
            className="button secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={saving || !valid}>
            Registrar antecipação
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function App() {
  const [data, setData] = useState<Data>(structuredClone(EMPTY));
  const [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false),
    savingLock = useRef(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [filters, setFilters] = useState<Filters>(CLEAR);
  const [month, setMonth] = useState(currentMonth());
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<Data | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [sort, setSort] = useState("largest");
  const [budget, setBudget] = useState("");
  const [selectedPayoffs, setSelectedPayoffs] = useState<string[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const today = currentMonth(),
    theme = data.settings?.theme ?? "light";
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  async function initialize() {
    setLoadError("");
    try {
      const loadedData = await loadData();
      await window.saldo?.ready?.();
      setData(loadedData);
      setLoaded(true);
    } catch (error) {
      setLoadError((error as Error).message);
    }
  }
  useEffect(() => {
    void initialize();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timeout);
  }, [toast]);
  async function commit(next: Data, message = "Tudo salvo!", undoable = true) {
    if (!loaded || savingLock.current) return false;
    savingLock.current = true;
    setSaving(true);
    try {
      const clean = validateData(next);
      await saveData(clean);
      if (undoable) setUndo(data);
      setData(clean);
      setToast(message);
      return true;
    } catch (error) {
      setToast(`Não foi possível salvar: ${(error as Error).message}`);
      return false;
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }
  const cardsById = new Map(data.cards.map((c) => [c.id, c]));
  const purchases = data.purchases.filter((p) => {
    const card = cardsById.get(p.cardId)!;
    const matches = `${p.description} ${p.category} ${card.name} ${card.bank}`
      .toLocaleLowerCase("pt-BR")
      .includes(filters.search.toLocaleLowerCase("pt-BR").trim());
    return (
      matches &&
      (filters.bank === "all" || card.bank === filters.bank) &&
      (filters.card === "all" || card.id === filters.card) &&
      (filters.category === "all" || p.category === filters.category) &&
      (filters.status === "all" ||
        (filters.status === "paid"
          ? p.paid === p.installments
          : p.paid < p.installments))
    );
  });
  const payments = data.payments ?? [];
  const subscriptionPayments = data.subscriptionPayments ?? [];
  const paidSubscriptionsInMonth = new Map(
    subscriptionPayments
      .filter((p) => p.month === month)
      .map((p) => [p.subscriptionId, p]),
  );
  const selectedSubscriptions = (data.subscriptions ?? []).filter((sub) => {
    const payment = paidSubscriptionsInMonth.get(sub.id);
    const cardId = payment ? payment.cardId : sub.cardId;
    const card = cardsById.get(cardId ?? "");
    const paid = !!payment;
    return (
      `${sub.name} ${sub.provider} ${sub.category} ${card?.name ?? ""} ${card?.bank ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(filters.search.toLocaleLowerCase("pt-BR").trim()) &&
      (filters.bank === "all" || card?.bank === filters.bank) &&
      (filters.card === "all" || cardId === filters.card) &&
      (filters.category === "all" || sub.category === filters.category) &&
      (filters.status === "all" || (filters.status === "paid" ? paid : !paid))
    );
  });
  const recurring = subscriptionMonth(
    selectedSubscriptions,
    subscriptionPayments,
    month,
  );
  const allRecurring = subscriptionMonth(
    data.subscriptions ?? [],
    subscriptionPayments,
    month,
  );
  const baseSnapshot = monthSnapshot(purchases, payments, month);
  const snapshot = {
    ...baseSnapshot,
    outstanding:
      baseSnapshot.outstanding +
      recurring.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0),
    paid:
      baseSnapshot.paid +
      recurring.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0),
  };
  const hasPurchaseFilters = !["income", "subscriptions", "updates"].includes(
    tab,
  );
  const months = forecast(purchases, today);
  const debt = purchases.reduce((s, p) => s + remaining(p), 0);
  const total = purchases.reduce((s, p) => s + p.totalCents, 0);
  const active = purchases.filter((p) => p.paid < p.installments);
  const filtered = Object.entries(filters).some(
    ([key, value]) => value !== (CLEAR as Record<string, string>)[key],
  );
  const cardData = data.cards
    .filter(
      (c) =>
        (filters.bank === "all" || c.bank === filters.bank) &&
        (filters.card === "all" || c.id === filters.card),
    )
    .map((c) => {
      const ps = purchases.filter((p) => p.cardId === c.id);
      const full = data.purchases.filter((p) => p.cardId === c.id);
      const bill = monthSnapshot(full, payments, month);
      const billSubscriptions = allRecurring.filter((i) => i.cardId === c.id);
      return {
        ...c,
        debt: ps.reduce((s, p) => s + remaining(p), 0),
        total: ps.reduce((s, p) => s + p.totalCents, 0),
        monthly:
          monthSnapshot(ps, payments, month).outstanding +
          recurring
            .filter((i) => i.cardId === c.id && !i.paid)
            .reduce((s, i) => s + i.amount, 0),
        bill: {
          ...bill,
          total:
            bill.total + billSubscriptions.reduce((s, i) => s + i.amount, 0),
          outstanding:
            bill.outstanding +
            billSubscriptions
              .filter((i) => !i.paid)
              .reduce((s, i) => s + i.amount, 0),
        },
        count: ps.length,
      };
    });
  const candidates = anticipationOptions(purchases).sort((a, b) =>
    sort === "efficient"
      ? b.efficiency - a.efficiency || b.monthlyRelief - a.monthlyRelief
      : sort === "cheapest"
        ? a.cost - b.cost
        : b.monthlyRelief - a.monthlyRelief,
  );
  const selectedOptions = candidates.filter((c) =>
    selectedPayoffs.includes(c.purchase.id),
  );
  const cost = selectedOptions.reduce((sum, c) => sum + c.cost, 0);
  const nextMonth = addMonths(today, 1);
  const nextBill = monthSnapshot(purchases, payments, nextMonth).outstanding;
  const nextAfter = monthSnapshot(
    purchases.filter((p) => !selectedPayoffs.includes(p.id)),
    payments,
    nextMonth,
  ).outstanding;
  useEffect(() => {
    const valid = new Set(
      anticipationOptions(purchases).map((c) => c.purchase.id),
    );
    setSelectedPayoffs((previous) =>
      previous.every((id) => valid.has(id))
        ? previous
        : previous.filter((id) => valid.has(id)),
    );
  }, [data, filters]);
  function updateFilter(key: keyof Filters, value: string) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "bank" ? { card: "all" } : {}),
    }));
  }
  function confirm(
    title: string,
    text: string,
    action: () => Promise<boolean>,
    danger = false,
    detail?: ReactNode,
  ) {
    setModal({ type: "confirm", title, text, action, danger, detail });
  }
  function addPurchase(cardId?: string) {
    setModal(
      data.cards.length ? { type: "purchase", cardId } : { type: "card" },
    );
  }
  function pay(p: Purchase) {
    confirm(
      "Registrar pagamento?",
      `Marcar a parcela ${p.paid + 1}/${p.installments} de “${p.description}” como paga?`,
      () =>
        commit(
          payPurchase(data, p.id, 1, today),
          "Parcela paga. Seu planejamento foi atualizado.",
        ),
      false,
      <div className="pay-preview">
        <small>Pagamento a registrar</small>
        <strong>{money(installmentAmount(p, p.paid))}</strong>
        <span>Registro no mês atual. Não efetua pagamento no banco.</span>
      </div>,
    );
  }
  function payCard(card: Card) {
    const bill = monthSnapshot(
      data.purchases.filter((p) => p.cardId === card.id),
      payments,
      today,
    );
    const unpaid = bill.items.filter((item) => !item.paid);
    const unpaidSubs = subscriptionMonth(
      data.subscriptions ?? [],
      subscriptionPayments,
      today,
    ).filter((i) => i.cardId === card.id && !i.paid);
    const subscriptionTotal = unpaidSubs.reduce((s, i) => s + i.amount, 0);
    if ((!unpaid.length && !unpaidSubs.length) || month !== today) return;
    confirm(
      "Marcar cartão como pago neste mês?",
      `Registrar todas as ${unpaid.length} parcelas e ${unpaidSubs.length} assinaturas pendentes de “${card.name}” em ${monthLabel(today)}? Inclui vencidas e todos os valores do cartão, mesmo fora dos filtros.`,
      () =>
        commit(
          payEntireCardMonth(data, card.id, today),
          `Cartão ${card.name} marcado como pago neste mês.`,
        ),
      false,
      <>
        <div className="pay-preview">
          <small>Total da fatura cadastrada</small>
          <strong>{money(bill.outstanding + subscriptionTotal)}</strong>
          <span>
            Isso registra os pagamentos feitos por você; não movimenta dinheiro
            no banco.
          </span>
        </div>
        <div className="confirm-items">
          {unpaidSubs.map((item) => (
            <div key={item.subscription.id}>
              <span>
                {item.subscription.name}
                <small>Assinatura · {monthLabel(today, true)}</small>
              </span>
              <strong>{money(item.amount)}</strong>
            </div>
          ))}
          {unpaid.map((item) => (
            <div key={`${item.purchase.id}:${item.installment}`}>
              <span>
                {item.purchase.description}
                <small>
                  Parcela {item.installment}/{item.purchase.installments}
                </small>
              </span>
              <strong>{money(item.amount)}</strong>
            </div>
          ))}
        </div>
      </>,
    );
  }
  function deleteCard(card: Card) {
    if (
      data.purchases.some((p) => p.cardId === card.id) ||
      data.subscriptions?.some((s) => s.cardId === card.id) ||
      subscriptionPayments.some((p) => p.cardId === card.id)
    ) {
      setToast(
        "Este cartão tem compras vinculadas ou assinaturas associadas. Mova ou exclua esses registros antes de removê-lo.",
      );
      return;
    }
    confirm(
      "Excluir cartão?",
      `O cartão “${card.name}” será removido.`,
      async () => {
        const ok = await commit(
          { ...data, cards: data.cards.filter((c) => c.id !== card.id) },
          "Cartão excluído.",
        );
        if (ok && filters.card === card.id) updateFilter("card", "all");
        return ok;
      },
      true,
    );
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `saldo-backup-${today}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Backup exportado com seus cartões, pagamentos e tema.");
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("O backup deve ter até 5 MB.");
      const imported = validateData(JSON.parse(await file.text()));
      confirm(
        "Restaurar backup?",
        `Restaurar ${imported.cards.length} cartões, ${imported.purchases.length} compras, ${imported.cashEntries?.length ?? 0} movimentos de dinheiro e ${imported.subscriptions?.length ?? 0} assinaturas? Isso substituirá os dados atuais. Exporte uma cópia antes para preservá-los.`,
        async () => {
          const ok = await commit(imported, "Backup restaurado.");
          if (ok) {
            setFilters(CLEAR);
            setSelectedPayoffs([]);
          }
          return ok;
        },
        true,
      );
    } catch (error) {
      setToast(`Não foi possível importar: ${(error as Error).message}`);
    }
  }
  async function restoreUndo() {
    if (
      undo &&
      (await commit(
        { ...undo, ...(data.settings ? { settings: data.settings } : {}) },
        "Última alteração desfeita.",
        false,
      ))
    )
      setUndo(null);
  }
  function table(rows: Purchase[], compact = false) {
    return (
      <div className="table-scroll">
        <table className="purchase-table">
          <thead>
            <tr>
              <th>Compra / valor total</th>
              <th>Cartão</th>
              <th>Progresso</th>
              <th>Próxima parcela</th>
              <th>Saldo a pagar</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const card = cardsById.get(p.cardId)!,
                paid = p.paid === p.installments;
              return (
                <tr key={p.id}>
                  <td>
                    <div className="purchase-name">
                      <span className="category-icon">
                        <ShoppingBag size={17} />
                      </span>
                      <div>
                        <strong>{p.description}</strong>
                        <small>
                          {p.category} · {money(p.totalCents)}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="card-tag">
                      <i className="dot" style={{ background: card.color }} />
                      {card.bank}
                    </span>
                    <small className="cell-small">{card.name}</small>
                  </td>
                  <td>
                    <div className="progress-label">
                      {p.paid}
                      <span>/ {p.installments} pagas</span>
                    </div>
                    <div className="progress">
                      <i
                        style={{
                          width: `${(p.paid / p.installments) * 100}%`,
                          background: paid ? "var(--mint)" : card.color,
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    {paid ? (
                      <span className="badge green">
                        <CheckCheck size={12} />
                        Quitada
                      </span>
                    ) : (
                      <>
                        <strong>{money(installmentAmount(p, p.paid))}</strong>
                        <small
                          className={`cell-small ${p.nextMonth < today ? "overdue" : ""}`}
                        >
                          {monthLabel(p.nextMonth, true)}
                          {p.nextMonth < today ? " · vencida" : ""}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <strong className="amount">{money(remaining(p))}</strong>
                  </td>
                  <td>
                    <div className="row-actions">
                      {!paid && (
                        <>
                          <button
                            className="icon-button pay"
                            disabled={saving}
                            title="Registrar pagamento"
                            aria-label={`Pagar próxima parcela de ${p.description}`}
                            onClick={() => pay(p)}
                          >
                            <Check size={17} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={saving}
                            title="Antecipar parcelas"
                            aria-label={`Antecipar ${p.description}`}
                            onClick={() =>
                              setModal({ type: "advance", purchase: p })
                            }
                          >
                            <Zap size={15} />
                          </button>
                        </>
                      )}
                      <button
                        className="icon-button"
                        disabled={saving}
                        title="Editar compra"
                        aria-label={`Editar ${p.description}`}
                        onClick={() =>
                          setModal({ type: "purchase", purchase: p })
                        }
                      >
                        <Pencil size={15} />
                      </button>
                      {!compact && (
                        <button
                          className="icon-button danger-text"
                          disabled={saving}
                          aria-label={`Excluir ${p.description}`}
                          title="Excluir compra"
                          onClick={() =>
                            confirm(
                              "Excluir compra?",
                              `Remover “${p.description}” e os registros de pagamento desta compra?`,
                              () =>
                                commit(
                                  removePurchase(data, p.id),
                                  "Compra excluída.",
                                ),
                              true,
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  function monthItems(selectedMonth: string, includeSubscriptions = true) {
    const detail = monthSnapshot(purchases, payments, selectedMonth);
    const subscriptions = includeSubscriptions
      ? subscriptionMonth(
          selectedSubscriptions,
          subscriptionPayments,
          selectedMonth,
        )
      : [];
    return (
      <div className="month-details">
        {detail.items.length ? (
          detail.items.map((item) => (
            <div key={`${item.purchase.id}:${item.installment}`}>
              <span className={`installment-check ${item.paid ? "paid" : ""}`}>
                {item.paid ? <Check size={15} /> : <ShoppingBag size={15} />}
              </span>
              <span>
                <strong>{item.purchase.description}</strong>
                <small>
                  {cardsById.get(item.purchase.cardId)?.name} · Parcela{" "}
                  {item.installment}/{item.purchase.installments}
                  {item.payment
                    ? ` · paga em ${monthLabel(item.payment.paidMonth, true)}`
                    : ""}
                  {item.scheduledMonth < selectedMonth && !item.paid
                    ? " · vencida"
                    : ""}
                </small>
              </span>
              <span className={`badge ${item.paid ? "green" : ""}`}>
                {item.paid
                  ? item.payment?.kind === "advance"
                    ? "Antecipada"
                    : "Paga"
                  : "A pagar"}
              </span>
              <strong>{money(item.amount)}</strong>
            </div>
          ))
        ) : subscriptions.length ? null : (
          <Empty
            title="Um mês livre de parcelas"
            text="Não há parcelas cadastradas para este mês."
          />
        )}
        {subscriptions.map((item) => (
          <div key={item.subscription.id}>
            <span className={`installment-check ${item.paid ? "paid" : ""}`}>
              <Repeat size={15} />
            </span>
            <span>
              <strong>{item.subscription.name}</strong>
              <small>
                Assinatura ·{" "}
                {cardsById.get(item.cardId ?? "")?.name ?? "Fora dos cartões"}
              </small>
            </span>
            <span className={`badge ${item.paid ? "green" : ""}`}>
              {item.paid ? "Paga" : "A pagar"}
            </span>
            <strong>{money(item.amount)}</strong>
          </div>
        ))}
        {detail.estimated && (
          <p className="history-note">
            <CircleHelp size={14} />O histórico anterior aos registros é
            estimado pelas parcelas já pagas e pelo mês informado.
          </p>
        )}
      </div>
    );
  }
  if (!loaded)
    return (
      <div className="loading-screen">
        <span className="brand-logo">
          <ChartNoAxesCombined size={25} />
        </span>
        <h1>saldo.</h1>
        {loadError ? (
          <>
            <p role="alert">
              Não foi possível carregar seus dados: {loadError}
            </p>
            <p>
              Os arquivos foram preservados. Corrija o arquivo ou restaure uma
              cópia válida na pasta de dados.
            </p>
            <button className="button primary" onClick={initialize}>
              Tentar novamente
            </button>
          </>
        ) : (
          <p>Um instante para colocar tudo no lugar…</p>
        )}
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <ChartNoAxesCombined size={23} />
          </div>
          <span>
            saldo<span>.</span>
          </span>
          <small>{__APP_VERSION__}</small>
        </div>
        <span className="workspace-label">SEU ESPAÇO FINANCEIRO</span>
        <nav aria-label="Navegação principal">
          {nav.map((item) => (
            <button
              key={item.id}
              aria-label={item.title}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={19} />
              <span>{item.title}</span>
              {item.id === "anticipation" && (
                <span className="new-pill">NOVO</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-symbol">
            <Zap size={20} />
          </span>
          <h3>
            Mais espaço
            <br />
            no seu orçamento.
          </h3>
          <p>Descubra quais compras vale a pena quitar primeiro.</p>
          <button onClick={() => setTab("anticipation")}>
            Simular antecipação <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className="theme-switch"
            disabled={saving}
            aria-label={
              theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"
            }
            onClick={() =>
              void commit(
                {
                  ...data,
                  settings: { theme: theme === "light" ? "dark" : "light" },
                },
                `Tema ${theme === "light" ? "escuro" : "claro"} ativado.`,
                false,
              )
            }
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            <span>{theme === "light" ? "Tema escuro" : "Tema claro"}</span>
            <i>
              <span />
            </i>
          </button>
          <div className="profile">
            <span>EU</span>
            <div>
              <strong>Meu espaço</strong>
              <small>Local e privado</small>
            </div>
            <i className="dot mint" />
          </div>
        </div>
      </aside>
      <div className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            Meu espaço <ChevronRight size={13} />
            <span>{nav.find((n) => n.id === tab)?.title}</span>
          </div>
          <div className="topbar-actions">
            <span className="save-status">
              <i className="dot mint" />
              {saving ? "Salvando…" : "Tudo salvo"}
            </span>
            {undo && (
              <button
                className="icon-button"
                disabled={saving}
                aria-label="Desfazer última alteração"
                title="Desfazer última alteração"
                onClick={() => void restoreUndo()}
              >
                <Undo2 size={17} />
              </button>
            )}
            <button
              className="icon-button"
              disabled={saving}
              aria-label="Exportar backup"
              title="Exportar backup"
              onClick={exportBackup}
            >
              <Download size={18} />
            </button>
            <button
              className="icon-button"
              disabled={saving}
              aria-label="Importar backup"
              title="Importar backup"
              onClick={() => importRef.current?.click()}
            >
              <FileUp size={18} />
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                void importBackup(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="avatar-small">EU</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                <i className="dot accent" /> CLAREZA PARA SEUS PRÓXIMOS PASSOS
              </span>
              <h1>{titles[tab][0]}</h1>
              <p>{titles[tab][1]}</p>
            </div>
            {tab !== "updates" && (
              <button
                className="button primary"
                disabled={saving}
                onClick={() =>
                  tab === "income"
                    ? setModal({ type: "income" })
                    : tab === "subscriptions"
                      ? setModal({ type: "subscription" })
                      : tab === "cards"
                        ? setModal({ type: "card" })
                        : addPurchase()
                }
              >
                <Plus size={17} />
                {tab === "income"
                  ? "Nova entrada"
                  : tab === "subscriptions"
                    ? "Nova assinatura"
                    : tab === "cards" || !data.cards.length
                      ? "Novo cartão"
                      : "Nova compra"}
              </button>
            )}
          </div>
          {tab !== "updates" && (
            <div className="month-toolbar">
              <div className="month-navigation">
                <button
                  className="icon-button"
                  aria-label="Mês anterior"
                  disabled={month <= "2000-01"}
                  onClick={() => setMonth(addMonths(month, -1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <label className="month-label">
                  <CalendarDays size={17} />
                  <span>{monthLabel(month)}</span>
                  <input
                    aria-label="Escolher mês"
                    type="month"
                    min="2000-01"
                    max="2199-12"
                    value={month}
                    onChange={(e) => {
                      if (e.target.value) setMonth(e.target.value);
                    }}
                  />
                </label>
                <button
                  className="icon-button"
                  aria-label="Próximo mês"
                  disabled={month >= "2199-12"}
                  onClick={() => setMonth(addMonths(month, 1))}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="period-hint">
                {month === today ? (
                  <span className="badge accent-badge">Mês atual</span>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => setMonth(today)}
                  >
                    Voltar ao mês atual <ArrowRight size={13} />
                  </button>
                )}
                <span>
                  {month < today
                    ? "Histórico de parcelas"
                    : month > today
                      ? "Previsão de pagamentos"
                      : "Seu ponto de partida"}
                </span>
              </div>
            </div>
          )}
          {hasPurchaseFilters && (
            <section className="global-filters" aria-label="Filtros globais">
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Buscar compras"
                  value={filters.search}
                  placeholder="Buscar em todas as compras..."
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
              </label>
              <select
                aria-label="Filtrar banco"
                value={filters.bank}
                onChange={(e) => updateFilter("bank", e.target.value)}
              >
                <option value="all">Todos os bancos</option>
                {[...new Set(data.cards.map((c) => c.bank))].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar por cartão"
                value={filters.card}
                onChange={(e) => updateFilter("card", e.target.value)}
              >
                <option value="all">Todos os cartões</option>
                {data.cards
                  .filter(
                    (c) => filters.bank === "all" || c.bank === filters.bank,
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bank} · {c.name}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Filtrar categoria"
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar status"
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="active">Em andamento</option>
                <option value="paid">Quitadas</option>
              </select>
              {filtered && (
                <button
                  className="icon-button"
                  aria-label="Limpar filtros"
                  title="Limpar filtros"
                  onClick={() => setFilters(CLEAR)}
                >
                  <X size={16} />
                </button>
              )}
            </section>
          )}
          {hasPurchaseFilters && filtered && (
            <div className="filter-feedback">
              <Filter size={13} />
              {purchases.length} compras nos filtros · cartões, totais e
              gráficos seguem a mesma seleção
              <button
                aria-label="Limpar todos os filtros globais"
                onClick={() => setFilters(CLEAR)}
              >
                Limpar filtros
              </button>
            </div>
          )}
          {hasPurchaseFilters && tab !== "anticipation" && (
            <div className="stats-grid">
              <div className="stat-card debt">
                <div className="stat-title">
                  Saldo parcelado a pagar
                  <span className="stat-icon">
                    <Wallet size={19} />
                  </span>
                </div>
                <strong data-testid="total-debt">{money(debt)}</strong>
                <div className="stat-foot">
                  <span className="dot accent" />
                  {active.length} compras em andamento
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">
                  A pagar no mês selecionado
                  <span className="stat-icon amber">
                    <CalendarDays size={19} />
                  </span>
                </div>
                <strong data-testid="monthly-total">
                  {money(snapshot.outstanding)}
                </strong>
                <div className="stat-foot">
                  {monthLabel(month, true)}
                  {snapshot.items.some(
                    (i) => !i.paid && i.scheduledMonth < month,
                  )
                    ? " · inclui vencidas"
                    : " · parcelas pendentes"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">
                  Cobranças do mês já pagas
                  <span className="stat-icon green">
                    <CheckCheck size={19} />
                  </span>
                </div>
                <strong>{money(snapshot.paid)}</strong>
                <div className="stat-foot">
                  <ArrowDownRight size={13} />
                  Total histórico de parcelas: {money(total - debt)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">
                  Até a última parcela
                  <span className="stat-icon purple">
                    <TrendingDown size={19} />
                  </span>
                </div>
                <strong className="date-stat">
                  {months.length
                    ? monthLabel(months.at(-1)!.month, true)
                    : "Tudo em dia"}
                </strong>
                <div className="stat-foot">
                  {months.length
                    ? `${months.length} meses no planejamento`
                    : "Nenhuma parcela pendente"}
                </div>
              </div>
            </div>
          )}

          {tab === "overview" && (
            <>
              {!data.purchases.length &&
                !data.cashEntries?.length &&
                !data.subscriptions?.length && (
                  <div className="welcome-banner">
                    <span>
                      <Sparkles size={23} />
                    </span>
                    <div>
                      <h3>Sua tranquilidade começa com o primeiro passo.</h3>
                      <p>
                        Cadastre um cartão e uma compra, ou explore com dados
                        fictícios.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        confirm(
                          "Carregar exemplo?",
                          "Os dados fictícios substituirão todos os seus registros atuais, incluindo entradas e assinaturas. Você pode desfazer a alteração.",
                          () =>
                            commit(
                              demoData(theme),
                              "Dados de exemplo carregados. São fictícios.",
                            ),
                        )
                      }
                    >
                      Experimentar exemplo <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              <div className="charts-grid">
                <Panel
                  title="Um mês de cada vez"
                  subtitle="Parcelas e assinaturas, pagas e pendentes · próximos seis meses"
                  action={
                    <button
                      className="text-button"
                      onClick={() => setTab("planning")}
                    >
                      Explorar calendário <ArrowUpRight size={14} />
                    </button>
                  }
                >
                  <MonthlyChart
                    purchases={purchases}
                    payments={payments}
                    subscriptions={selectedSubscriptions}
                    subscriptionPayments={subscriptionPayments}
                    start={month}
                    onMonth={setMonth}
                  />
                </Panel>
                <Panel
                  title="Seu saldo, por cartão"
                  subtitle="Quanto cada cartão representa no saldo restante"
                >
                  <DistributionChart cards={cardData} />
                </Panel>
              </div>
              <div className="section-heading">
                <h2>
                  Seus cartões{" "}
                  <span className="count-pill">{cardData.length}</span>
                </h2>
                <button className="text-button" onClick={() => setTab("cards")}>
                  Gerenciar cartões <ArrowRight size={14} />
                </button>
              </div>
              <div className="mini-cards">
                {cardData.slice(0, 3).map((card) => (
                  <button
                    className="mini-card"
                    key={card.id}
                    onClick={() => {
                      updateFilter("card", card.id);
                      setTab("cards");
                    }}
                  >
                    <PlasticCard compact card={card} />
                    <div className="mini-card-bottom">
                      <div>
                        <small>Saldo a pagar</small>
                        <strong>{money(card.debt)}</strong>
                      </div>
                      <div>
                        <small>No mês selecionado</small>
                        <strong>{money(card.monthly)}</strong>
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  className="add-card-tile"
                  onClick={() => setModal({ type: "card" })}
                >
                  <span>
                    <Plus size={23} />
                  </span>
                  <strong>Adicionar cartão</strong>
                  <small>Seu banco. Seu estilo.</small>
                </button>
              </div>
              <Panel
                title="Compras em andamento"
                subtitle="Organizadas para você não perder nenhuma parcela."
                className="purchases-panel"
                action={
                  <button
                    className="text-button"
                    onClick={() => setTab("purchases")}
                  >
                    Ver todas <ArrowRight size={14} />
                  </button>
                }
              >
                {active.length ? (
                  table(active.slice(0, 5), true)
                ) : (
                  <Empty
                    title="Tudo organizado por aqui"
                    text="Cadastre uma compra ou ajuste os filtros para acompanhar as parcelas."
                    action={
                      <button
                        className="button secondary"
                        onClick={() => addPurchase()}
                      >
                        <Plus size={15} />
                        Adicionar compra
                      </button>
                    }
                  />
                )}
              </Panel>
              {active.length > 0 && (
                <div className="insight">
                  <span>
                    <Zap size={20} />
                  </span>
                  <div>
                    <h3>Tem uma parcela pesando no seu mês?</h3>
                    <p>
                      Compare o custo para quitar com o alívio mensal. Simule
                      antes de decidir.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setTab("anticipation")}
                  >
                    Ver oportunidades <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "purchases" && (
            <Panel
              title="Todas as suas compras"
              subtitle={`${purchases.length} compras · saldo ${money(debt)}`}
              action={
                <div className="segmented">
                  {[
                    ["all", "Todas"],
                    ["active", "Em andamento"],
                    ["paid", "Quitadas"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={filters.status === value ? "selected" : ""}
                      aria-pressed={filters.status === value}
                      onClick={() => updateFilter("status", value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              {purchases.length ? (
                table(
                  [...purchases].sort((a, b) => b.totalCents - a.totalCents),
                )
              ) : (
                <Empty
                  title="Nenhuma compra encontrada"
                  text="Ajuste os filtros ou adicione uma nova compra."
                />
              )}
              <div className="table-footer">
                <Check size={13} />
                Valores em centavos exatos. Pagamentos atualizam o planejamento
                automaticamente.
              </div>
            </Panel>
          )}
          {tab === "cards" && (
            <>
              <div className="card-grid">
                {cardData.map((card) => (
                  <section className="managed-card" key={card.id}>
                    <PlasticCard card={card} />
                    <div className="managed-card-info">
                      <div className="managed-card-amount">
                        <span>
                          Saldo a pagar {filtered && <small>nos filtros</small>}
                        </span>
                        <strong>{money(card.debt)}</strong>
                      </div>
                      <dl>
                        <div>
                          <dt>Total de compras</dt>
                          <dd>{money(card.total)}</dd>
                        </div>
                        <div>
                          <dt>Total já pago</dt>
                          <dd>{money(card.total - card.debt)}</dd>
                        </div>
                        <div>
                          <dt>Vencimento</dt>
                          <dd>Dia {card.dueDay}</dd>
                        </div>
                      </dl>
                      {card.limitCents > 0 && (
                        <div className="limit">
                          <div>
                            <span>Saldo / limite informado</span>
                            <strong>
                              {Math.round((card.debt / card.limitCents) * 100)}%
                            </strong>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                width: `${Math.min(100, (card.debt / card.limitCents) * 100)}%`,
                                background:
                                  card.debt > card.limitCents
                                    ? "var(--danger)"
                                    : card.color,
                              }}
                            />
                          </div>
                          <small>
                            {money(card.limitCents)} de limite · compras
                            cadastradas
                          </small>
                        </div>
                      )}
                      <div
                        className={`card-bill ${card.bill.total > 0 && card.bill.outstanding === 0 ? "settled" : ""}`}
                      >
                        <div>
                          <span>
                            Fatura cadastrada · {monthLabel(month, true)}
                          </span>
                          <strong>{money(card.bill.outstanding)}</strong>
                        </div>
                        {card.bill.total > 0 && card.bill.outstanding === 0 ? (
                          <span className="badge green">
                            <CheckCheck size={13} />
                            {month === today
                              ? "Pago neste mês"
                              : "Parcelas pagas"}
                          </span>
                        ) : (
                          <button
                            className="button pay-button"
                            disabled={
                              saving ||
                              month !== today ||
                              card.bill.outstanding === 0
                            }
                            aria-label={`Pagar cartão ${card.name} neste mês`}
                            onClick={() => payCard(card)}
                          >
                            <Check size={15} />
                            {card.bill.outstanding
                              ? "Marcar mês como pago"
                              : "Sem parcelas"}
                          </button>
                        )}
                      </div>
                      {month !== today && (
                        <small className="field-hint">
                          Volte ao mês atual para registrar a fatura paga.
                        </small>
                      )}
                      <div className="managed-card-actions">
                        <button
                          className="text-button"
                          onClick={() => addPurchase(card.id)}
                        >
                          <Plus size={14} />
                          Nova compra
                        </button>
                        <button
                          className="icon-button"
                          disabled={saving}
                          aria-label={`Editar cartão ${card.name}`}
                          onClick={() => setModal({ type: "card", card })}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger-text"
                          disabled={saving}
                          aria-label={`Excluir cartão ${card.name}`}
                          onClick={() => deleteCard(card)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
                {cardData.length === 0 && (
                  <button
                    className="add-card-tile tall"
                    onClick={() => setModal({ type: "card" })}
                  >
                    <span>
                      <Plus size={28} />
                    </span>
                    <strong>Mais um cartão, menos confusão.</strong>
                    <small>Todos os seus bancos em um lugar.</small>
                  </button>
                )}
              </div>
              <Panel
                className="card-summary"
                title="Resumo dos cartões"
                subtitle={
                  filtered
                    ? "Valores das compras nos filtros globais selecionados"
                    : "Compras cadastradas em todos os seus cartões"
                }
              >
                {cardData.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Cartão</th>
                          <th>Compras</th>
                          <th>Já pago</th>
                          <th>Saldo restante</th>
                          <th>Mês selecionado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardData.map((card) => (
                          <tr key={card.id}>
                            <td>
                              <span className="card-tag">
                                <i
                                  className="dot"
                                  style={{ background: card.color }}
                                />
                                {card.bank} · {card.name}
                              </span>
                            </td>
                            <td>{money(card.total)}</td>
                            <td>{money(card.total - card.debt)}</td>
                            <td>
                              <strong>{money(card.debt)}</strong>
                            </td>
                            <td>{money(card.monthly)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total nos filtros</td>
                          <td>{money(total)}</td>
                          <td>{money(total - debt)}</td>
                          <td>{money(debt)}</td>
                          <td>
                            {money(
                              cardData.reduce((sum, c) => sum + c.monthly, 0),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Seu primeiro cartão é o começo"
                    text="Cadastre o banco, um apelido e o vencimento."
                  />
                )}
              </Panel>
            </>
          )}
          {tab === "planning" && (
            <>
              <Panel
                title="Seu calendário financeiro"
                subtitle="Uma coluna por mês. Verde é pago; violeta ainda está pendente."
              >
                <MonthlyChart
                  purchases={purchases}
                  payments={payments}
                  subscriptions={selectedSubscriptions}
                  subscriptionPayments={subscriptionPayments}
                  start={month}
                  count={8}
                  onMonth={setMonth}
                />
              </Panel>
              <div className="planning-grid">
                <Panel
                  title={`Parcelas de ${monthLabel(month)}`}
                  subtitle={`${snapshot.items.length} parcelas e ${recurring.length} assinaturas · ${money(snapshot.outstanding)} a pagar`}
                  className="selected-month-panel"
                >
                  {monthItems(month)}
                </Panel>
                <Panel
                  title="Saldo por cartão"
                  subtitle="Compare os saldos restantes nas compras selecionadas."
                >
                  {cardData.length ? (
                    <ComparisonChart cards={cardData} />
                  ) : (
                    <Empty
                      title="Nenhum cartão nos filtros"
                      text="Ajuste os filtros para comparar os saldos."
                    />
                  )}
                </Panel>
              </div>
              {months.length > 0 && (
                <Panel
                  title="Até a última parcela"
                  subtitle="Compras parceladas até a quitação. Assinaturas aparecem no gráfico e no mês selecionado."
                  className="calendar-panel"
                >
                  <div className="table-scroll forecast-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Mês</th>
                          {cardData.map((card) => (
                            <th key={card.id}>{card.name}</th>
                          ))}
                          <th>Total pendente</th>
                          <th>
                            <span className="sr-only">Detalhes</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((row) => (
                          <MonthRows
                            key={row.month}
                            row={row}
                            cards={cardData}
                            expanded={expandedMonth === row.month}
                            onExpand={() => {
                              setMonth(row.month);
                              setExpandedMonth((m) =>
                                m === row.month ? null : row.month,
                              );
                            }}
                            detail={monthItems(row.month, false)}
                          />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Até a quitação</td>
                          {cardData.map((card) => (
                            <td key={card.id}>{money(card.debt)}</td>
                          ))}
                          <td>{money(debt)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Panel>
              )}
            </>
          )}
          {tab === "anticipation" && (
            <>
              <div className="anticipation-hero">
                <div>
                  <span className="eyebrow">
                    <Zap size={13} /> TROQUE PESO POR POSSIBILIDADES
                  </span>
                  <h2>Qual compra vale quitar primeiro?</h2>
                  <p>
                    Uma parcela alta libera mais por mês. Uma compra perto do
                    fim custa menos para quitar. Compare as duas coisas com o
                    seu orçamento.
                  </p>
                </div>
                <div className="hero-orbit">
                  <Zap size={42} />
                </div>
              </div>
              <div className="anticipation-layout">
                <div>
                  <Panel
                    title="Suas oportunidades"
                    subtitle="Selecione compras para comparar a quitação completa."
                    action={
                      <select
                        className="sort-select"
                        aria-label="Ordenar antecipações"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="largest">Maior parcela mensal</option>
                        <option value="efficient">Maior alívio por real</option>
                        <option value="cheapest">
                          Menor valor para quitar
                        </option>
                      </select>
                    }
                  >
                    <div className="budget-bar">
                      <label>
                        Quanto você pode antecipar?
                        <div className="money-field">
                          <span>R$</span>
                          <input
                            aria-label="Orçamento para antecipação"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                          />
                        </div>
                      </label>
                      <button
                        className="button secondary"
                        onClick={() => {
                          try {
                            const cents = parseMoney(budget);
                            if (!cents)
                              throw new Error(
                                "Informe um orçamento maior que zero.",
                              );
                            const ids = suggestPayoffs(purchases, cents);
                            setSelectedPayoffs(ids);
                            setSort("efficient");
                            setToast(
                              ids.length
                                ? "Sugestão por alívio por real, dentro do orçamento. Você pode ajustar a seleção."
                                : "Nenhuma compra cabe inteira nesse orçamento. Você pode antecipar parcelas individuais em Minhas compras.",
                            );
                          } catch (error) {
                            setToast((error as Error).message);
                          }
                        }}
                      >
                        <Sparkles size={15} />
                        Sugerir seleção
                      </button>
                    </div>
                    {candidates.length ? (
                      <div className="opportunities">
                        {candidates.map((option, index) => {
                          const card = cardsById.get(option.purchase.cardId)!;
                          const chosen = selectedPayoffs.includes(
                            option.purchase.id,
                          );
                          return (
                            <label
                              className={`opportunity ${chosen ? "chosen" : ""}`}
                              key={option.purchase.id}
                            >
                              <input
                                type="checkbox"
                                aria-label={`Selecionar quitação de ${option.purchase.description}`}
                                checked={chosen}
                                onChange={(e) =>
                                  setSelectedPayoffs((previous) =>
                                    e.target.checked
                                      ? [...previous, option.purchase.id]
                                      : previous.filter(
                                          (id) => id !== option.purchase.id,
                                        ),
                                  )
                                }
                              />
                              <div className="opportunity-body">
                                <div className="opportunity-heading">
                                  <span className="rank">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <div>
                                    <strong>
                                      {option.purchase.description}
                                    </strong>
                                    <small>
                                      <i
                                        className="dot"
                                        style={{ background: card.color }}
                                      />
                                      {card.bank} · {option.monthsLeft} parcelas
                                      restantes
                                    </small>
                                  </div>
                                  {index === 0 && (
                                    <span className="badge accent-badge">
                                      {sort === "largest"
                                        ? "Maior parcela"
                                        : sort === "cheapest"
                                          ? "Menor custo"
                                          : "Maior eficiência"}
                                    </span>
                                  )}
                                </div>
                                <div className="opportunity-values">
                                  <div>
                                    <small>Parcela mensal</small>
                                    <strong>
                                      {money(option.monthlyRelief)}
                                    </strong>
                                  </div>
                                  <span>
                                    <ArrowRight size={15} />
                                  </span>
                                  <div>
                                    <small>Para quitar tudo</small>
                                    <strong>{money(option.cost)}</strong>
                                  </div>
                                  <div>
                                    <small>Alívio por R$ 100</small>
                                    <strong className="mint-text">
                                      {money(
                                        Math.round(option.efficiency * 10000),
                                      )}
                                      <span>/mês ativo</span>
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <Empty
                        title="Nenhuma parcela para antecipar"
                        text="Você está livre de parcelas nos filtros selecionados."
                      />
                    )}
                  </Panel>
                  <Panel
                    title="O efeito no seu orçamento"
                    subtitle="Simulação das parcelas mensais, sem descontos bancários."
                    className="simulation-panel"
                  >
                    <SimulationChart
                      purchases={purchases}
                      payments={payments}
                      selected={selectedPayoffs}
                      start={today}
                    />
                  </Panel>
                </div>
                <aside className="payoff-summary">
                  <span className="summary-icon">
                    <Zap size={23} />
                  </span>
                  <span className="eyebrow">SUA SIMULAÇÃO</span>
                  <h2>Um novo respiro.</h2>
                  <p>
                    {selectedOptions.length
                      ? `${selectedOptions.length} compras selecionadas para quitar`
                      : "Selecione uma ou mais compras ao lado."}
                  </p>
                  <div className="payoff-cost">
                    <small>Valor para quitar agora</small>
                    <strong data-testid="payoff-cost">{money(cost)}</strong>
                  </div>
                  <div className="payoff-relief">
                    <small>Alívio em {monthLabel(nextMonth, true)}</small>
                    <strong data-testid="payoff-relief">
                      {money(nextBill - nextAfter)}
                    </strong>
                    <span>
                      De {money(nextBill)} para {money(nextAfter)}
                    </span>
                  </div>
                  <div className="summary-line">
                    <span>Compras a quitar</span>
                    <strong>{selectedOptions.length}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Saldo após quitar</span>
                    <strong>{money(debt - cost)}</strong>
                  </div>
                  <button
                    className="button primary"
                    disabled={!selectedOptions.length || saving}
                    onClick={() =>
                      confirm(
                        "Registrar quitação antecipada?",
                        `Marcar todas as parcelas restantes de ${selectedOptions.length} compras como pagas no mês atual?`,
                        async () => {
                          let next = data;
                          for (const option of selectedOptions)
                            next = payPurchase(
                              next,
                              option.purchase.id,
                              option.monthsLeft,
                              today,
                              "advance",
                            );
                          const ok = await commit(
                            next,
                            "Quitações registradas. Seus próximos meses ficaram mais leves.",
                          );
                          if (ok) setSelectedPayoffs([]);
                          return ok;
                        },
                        false,
                        <div className="pay-preview">
                          <small>Valor total a registrar</small>
                          <strong>{money(cost)}</strong>
                          <span>
                            Confirme somente os pagamentos que você fez. O
                            aplicativo não paga o banco.
                          </span>
                        </div>,
                      )
                    }
                  >
                    <CheckCheck size={17} />
                    Registrar quitação
                  </button>
                  <button
                    className="text-button"
                    disabled={!selectedOptions.length}
                    onClick={() => setSelectedPayoffs([])}
                  >
                    Limpar seleção
                  </button>
                  <div className="summary-note">
                    <CircleHelp size={16} />
                    <p>
                      O alívio por real é a parcela mensal dividida pelo saldo a
                      quitar. É uma comparação, não uma garantia de economia em
                      juros. Consulte os descontos com o banco.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {tab === "income" && (
            <CashPage
              data={data}
              month={month}
              saving={saving}
              onCreate={(kind) => setModal({ type: "income", kind })}
              onEdit={(entry) => setModal({ type: "income", entry })}
              onDelete={(entry) =>
                confirm(
                  "Excluir movimento?",
                  `Remover “${entry.description}” do orçamento?`,
                  () =>
                    commit(
                      {
                        ...data,
                        cashEntries: (data.cashEntries ?? []).filter(
                          (e) => e.id !== entry.id,
                        ),
                      },
                      "Movimento excluído.",
                    ),
                  true,
                )
              }
              onCards={() => {
                setFilters(CLEAR);
                setTab("cards");
              }}
            />
          )}
          {tab === "subscriptions" && (
            <SubscriptionsPage
              data={data}
              month={month}
              saving={saving}
              onEdit={(subscription) =>
                setModal({ type: "subscription", subscription })
              }
              onDelete={(subscription) =>
                confirm(
                  "Excluir assinatura?",
                  `Remover “${subscription.name}” e seus registros de pagamento? Para apenas parar cobranças futuras, edite o último mês de cobrança.`,
                  () =>
                    commit(
                      removeSubscription(data, subscription.id),
                      "Assinatura excluída.",
                    ),
                  true,
                )
              }
              onPay={(subscription) =>
                confirm(
                  "Registrar assinatura paga?",
                  `Registrar o pagamento de “${subscription.name}” referente a ${monthLabel(month)} no mês atual?`,
                  () =>
                    commit(
                      paySubscription(data, subscription.id, month, today),
                      "Assinatura marcada como paga.",
                    ),
                )
              }
              onUnpay={(subscription) =>
                confirm(
                  "Corrigir pagamento da assinatura?",
                  "Esse pagamento voltará a ficar pendente no mês da cobrança.",
                  () =>
                    commit(
                      {
                        ...data,
                        subscriptionPayments: subscriptionPayments.filter(
                          (p) =>
                            !(
                              p.subscriptionId === subscription.id &&
                              p.month === month
                            ),
                        ),
                      },
                      "Pagamento da assinatura corrigido.",
                    ),
                  true,
                )
              }
            />
          )}
          {tab === "updates" && <UpdatesPage />}
          <footer className="page-footer">
            <LocalNote />
            <span>
              Saldo {__APP_VERSION__} <i>·</i> Seu dinheiro. Suas
              possibilidades.
            </span>
          </footer>
        </main>
      </div>
      {modal?.type === "income" && (
        <CashForm
          entry={modal.entry}
          kind={modal.kind}
          month={month}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(entry) =>
            commit(
              {
                ...data,
                cashEntries: modal.entry
                  ? (data.cashEntries ?? []).map((e) =>
                      e.id === entry.id ? entry : e,
                    )
                  : [...(data.cashEntries ?? []), entry],
              },
              "Movimento salvo. Orçamento atualizado.",
            )
          }
        />
      )}
      {modal?.type === "subscription" && (
        <SubscriptionForm
          subscription={modal.subscription}
          data={data}
          month={month}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(subscription) =>
            commit(
              {
                ...data,
                subscriptions: modal.subscription
                  ? (data.subscriptions ?? []).map((s) =>
                      s.id === subscription.id ? subscription : s,
                    )
                  : [...(data.subscriptions ?? []), subscription],
              },
              "Assinatura salva. Previsões atualizadas.",
            )
          }
        />
      )}
      {modal?.type === "card" && (
        <CardForm
          key={modal.card?.id ?? "new-card"}
          card={modal.card}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(card) =>
            commit(
              {
                ...data,
                cards: modal.card
                  ? data.cards.map((c) => (c.id === card.id ? card : c))
                  : [...data.cards, card],
              },
              "Cartão salvo. Seu espaço ficou mais completo.",
            )
          }
        />
      )}
      {modal?.type === "purchase" && (
        <PurchaseForm
          key={modal.purchase?.id ?? "new-purchase"}
          purchase={modal.purchase}
          cardId={modal.cardId}
          cards={data.cards}
          hasHistory={payments.some((p) => p.purchaseId === modal.purchase?.id)}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(purchase) =>
            commit(
              replacePurchase(data, purchase),
              "Compra salva. Seu planejamento está atualizado.",
            )
          }
        />
      )}
      {modal?.type === "advance" && (
        <AdvanceForm
          purchase={modal.purchase}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(count) =>
            commit(
              payPurchase(data, modal.purchase.id, count, today, "advance"),
              "Antecipação registrada.",
            )
          }
        />
      )}
      {modal?.type === "confirm" && (
        <Dialog
          title={modal.title}
          onClose={() => {
            if (!saving) setModal(null);
          }}
        >
          <div className="confirm-content">
            <p>{modal.text}</p>
            {modal.detail}
          </div>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>
            <button
              className={`button ${modal.danger ? "danger" : "primary"}`}
              disabled={saving}
              onClick={async () => {
                if (await modal.action()) setModal(null);
              }}
            >
              {modal.danger ? "Confirmar" : "Continuar"}
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          <p>{toast}</p>
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function MonthRows({
  row,
  cards,
  expanded,
  onExpand,
  detail,
}: {
  row: ReturnType<typeof forecast>[number];
  cards: Card[];
  expanded: boolean;
  onExpand: () => void;
  detail: ReactNode;
}) {
  return (
    <>
      <tr className={expanded ? "expanded-row" : ""}>
        <td>
          <button
            className="month-button"
            aria-expanded={expanded}
            onClick={onExpand}
          >
            {monthLabel(row.month)}
          </button>
        </td>
        {cards.map((c) => (
          <td key={c.id}>{money(row.byCard[c.id] ?? 0)}</td>
        ))}
        <td>
          <strong>{money(row.total)}</strong>
        </td>
        <td>
          <button
            className="icon-button"
            aria-label={`Ver parcelas de ${monthLabel(row.month)}`}
            aria-expanded={expanded}
            onClick={onExpand}
          >
            {expanded ? <X size={16} /> : <ChevronRight size={16} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={cards.length + 3}>{detail}</td>
        </tr>
      )}
    </>
  );
}
