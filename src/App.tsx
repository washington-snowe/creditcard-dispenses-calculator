import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AvailableCard,
  CalendarPage,
  ComparisonPanel,
  GlobalSearch,
  LedgerList,
  PendingPage,
  SimulatorPage,
  type PurchaseDraft,
} from "./components/workbench";
import { DataCenter, type ChangeRecord } from "./components/data-center";
import { monthLedger, type Destination, type LedgerItem } from "./insights";
import { createBackup } from "./storage";
import { Eye, EyeOff, DatabaseBackup, Bell, Calculator } from "lucide-react";
import { WelcomePage } from "./components/welcome";
import { BrandLogo } from "./components/brand";
import {
  TriangleAlert,
  CircleAlert,
  House,
  PanelLeftClose,
  PanelLeftOpen,
  Ellipsis,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  ReceiptText,
  Palette,
  Repeat,
  RefreshCw,
  CalendarDays,
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
  setFinancialPrivacy,
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
  type RecurringIncome,
  type Expense,
  type Settings,
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
import {
  IncomePlanning,
  RecurringForm,
  ExpenseForm,
  ExpensesPage,
  Settlement,
} from "./components/planning";
import { AppearancePage, applyAppearance } from "./components/appearance";
import { receiveIncome } from "./finance";
import { UpdatesPage } from "./components/updates";
import {
  payEntireCardMonth,
  paySubscription,
  removeSubscription,
  subscriptionMonth,
} from "./finance";

type Tab =
  | "calendar"
  | "pending"
  | "simulator"
  | "data"
  | "home"
  | "overview"
  | "purchases"
  | "cards"
  | "planning"
  | "anticipation"
  | "income"
  | "subscriptions"
  | "updates"
  | "expenses"
  | "appearance";
type Filters = {
  search: string;
  bank: string;
  card: string;
  category: string;
  status: string;
};
type Modal =
  | { type: "search" }
  | { type: "drill"; rows: LedgerItem[]; title: string }
  | { type: "card"; card?: Card }
  | {
      type: "purchase";
      purchase?: Purchase;
      cardId?: string;
      draft?: PurchaseDraft;
    }
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
  | { type: "recurring"; rule?: RecurringIncome }
  | { type: "expense"; expense?: Expense }
  | {
      type: "settlement";
      title: string;
      action: (date: string) => Promise<boolean>;
    }
  | null;
const CLEAR: Filters = {
  search: "",
  bank: "all",
  card: "all",
  category: "all",
  status: "all",
};
const nav = [
  { id: "calendar" as const, title: "Calendário", icon: CalendarDays },
  { id: "pending" as const, title: "Pendências", icon: Bell },
  { id: "simulator" as const, title: "Simular compra", icon: Calculator },
  { id: "data" as const, title: "Dados e segurança", icon: DatabaseBackup },
  { id: "home" as const, title: "Início", icon: House },
  { id: "overview" as const, title: "Visão geral", icon: LayoutDashboard },
  { id: "purchases" as const, title: "Minhas compras", icon: ShoppingBag },
  { id: "cards" as const, title: "Meus cartões", icon: CreditCard },
  { id: "planning" as const, title: "Planejamento", icon: CalendarDays },
  { id: "anticipation" as const, title: "Antecipações", icon: Zap },
  { id: "income" as const, title: "Entradas do mês", icon: Banknote },
  { id: "subscriptions" as const, title: "Assinaturas", icon: Repeat },
  { id: "expenses" as const, title: "Despesas", icon: ReceiptText },
  { id: "appearance" as const, title: "Aparência", icon: Palette },
  { id: "updates" as const, title: "Atualizações", icon: RefreshCw },
];
const navGroups = [
  { title: "Acompanhar", ids: ["home", "overview", "calendar", "pending"] },
  {
    title: "Organizar",
    ids: ["cards", "purchases", "income", "expenses", "subscriptions"],
  },
  { title: "Planejar", ids: ["planning", "anticipation", "simulator"] },
  { title: "Preferências", ids: ["appearance", "data", "updates"] },
];
const titles: Record<Tab, [string, string]> = {
  calendar: [
    "Cada dia, uma visão clara.",
    "Recebimentos, vencimentos e fechamentos organizados no mês.",
  ],
  pending: [
    "O próximo passo está aqui.",
    "Veja o que falta pagar e o que merece sua atenção.",
  ],
  simulator: [
    "Compre com planejamento.",
    "Compare cartões e descubra o impacto antes de assumir uma parcela.",
  ],
  data: [
    "Seus dados, bem cuidados.",
    "Importe lançamentos, acompanhe alterações e restaure cópias de segurança.",
  ],
  home: [
    "Boas-vindas ao ContaClara.",
    "Seu mês com clareza. Escolha por onde começar.",
  ],
  expenses: [
    "Cada conta, no seu tempo.",
    "Organize Pix, boletos, dinheiro e débito, com vencimento e pagamento.",
  ],
  appearance: [
    "Um espaço que é seu.",
    "Ultra Dark, cores e movimento. Escolha como suas finanças se apresentam.",
  ],
  income: [
    "Seu dinheiro, com destino.",
    "Registre as entradas, ajuste os valores e saiba quanto vai sobrar.",
  ],
  subscriptions: [
    "Recorrências sob controle.",
    "Seus serviços, renovações e compromissos em um só lugar.",
  ],
  updates: [
    "Seu ContaClara, sempre atual.",
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
function demoData(theme: Settings["theme"]): Data {
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
  const [tab, setTab] = useState<Tab>("home");
  const [filters, setFilters] = useState<Filters>(CLEAR);
  const [month, setMonth] = useState(currentMonth());
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToastState] = useState<{
    message: string;
    tone: "success" | "warning" | "danger";
  } | null>(null);
  function setToast(
    message: string,
    tone: "success" | "warning" | "danger" = "success",
  ) {
    setToastState(message ? { message, tone } : null);
  }
  const [history, setHistory] = useState<ChangeRecord[]>([]);
  const undo = history.at(-1)?.data;
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [sort, setSort] = useState("largest");
  const [budget, setBudget] = useState("");
  const [selectedPayoffs, setSelectedPayoffs] = useState<string[]>([]);
  const [compactViewport, setCompactViewport] = useState(
    () => window.matchMedia("(max-width: 1020px)").matches,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const collapsed = compactViewport
    ? !mobileMenuOpen
    : !!data.settings?.sidebarCollapsed;
  const navigate = (next: Tab) => {
    setTab(next);
    setMobileMenuOpen(false);
    setToolsOpen(false);
  };
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1020px)");
    const update = () => {
      setCompactViewport(query.matches);
      setMobileMenuOpen(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node))
        setToolsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (toolsOpen) toolsRef.current?.querySelector("button")?.focus();
        setToolsOpen(false);
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          menuToggleRef.current?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [mobileMenuOpen, toolsOpen]);
  const importRef = useRef<HTMLInputElement>(null);
  const today = currentMonth(),
    theme = data.settings?.theme ?? "light";
  setFinancialPrivacy(!!data.settings?.privacy);
  useEffect(() => {
    applyAppearance(data.settings ?? { theme: "light" });
  }, [data.settings]);
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
      if (undoable)
        setHistory((previous) =>
          [
            ...previous,
            { data, message, time: new Date().toISOString() },
          ].slice(-20),
        );
      setData(clean);
      setToast(message);
      return true;
    } catch (error) {
      setToast(
        `Não foi possível salvar: ${(error as Error).message}`,
        "danger",
      );
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
  const hasPurchaseFilters = ![
    "home",
    "calendar",
    "pending",
    "simulator",
    "data",
    "income",
    "subscriptions",
    "updates",
    "expenses",
    "appearance",
  ].includes(tab);
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
        "warning",
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
        `Restaurar ${imported.cards.length} cartões, ${imported.purchases.length} compras, ${imported.cashEntries?.length ?? 0} movimentos de dinheiro e ${imported.subscriptions?.length ?? 0} assinaturas, ${imported.recurringIncomes?.length ?? 0} rendas recorrentes e ${imported.expenses?.length ?? 0} despesas? Isso substituirá os dados atuais. Exporte uma cópia antes para preservá-los.`,
        async () => {
          try {
            await createBackup(data);
          } catch (error) {
            setToast(
              `Não foi possível preservar o estado atual: ${(error as Error).message}`,
              "danger",
            );
            return false;
          }
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
      setToast(
        `Não foi possível importar: ${(error as Error).message}`,
        "danger",
      );
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
      setHistory((previous) => previous.slice(0, -1));
  }
  function openDestination(destination: Destination) {
    const { kind, id } = destination;
    if (kind === "card") {
      const card = data.cards.find((c) => c.id === id);
      if (card) {
        navigate("cards");
        setFilters(CLEAR);
        setModal({ type: "card", card });
      }
    }
    if (kind === "purchase") {
      const purchase = data.purchases.find((p) => p.id === id);
      if (purchase) {
        navigate("purchases");
        setFilters(CLEAR);
        setModal({ type: "purchase", purchase });
      }
    }
    if (kind === "subscription") {
      const subscription = data.subscriptions?.find((s) => s.id === id);
      if (subscription) {
        navigate("subscriptions");
        setModal({ type: "subscription", subscription });
      }
    }
    if (kind === "expense") {
      const expense = data.expenses?.find((e) => e.id === id);
      if (expense) {
        navigate("expenses");
        setMonth(expense.dueDate.slice(0, 7));
        setModal({ type: "expense", expense });
      }
    }
    if (kind === "income") {
      const entry = data.cashEntries?.find((e) => e.id === id);
      if (entry) {
        navigate("income");
        setMonth(entry.date.slice(0, 7));
        setModal({ type: "income", entry });
      }
    }
    if (kind === "recurring") {
      const rule = data.recurringIncomes?.find((r) => r.id === id);
      if (rule) {
        navigate("income");
        setModal({ type: "recurring", rule });
      }
    }
  }
  function drillMonth(selected: string) {
    setMonth(selected);
    const subset = {
      ...data,
      purchases,
      subscriptions: selectedSubscriptions,
      expenses: [],
      cashEntries: [],
      recurringIncomes: [],
    };
    setModal({
      type: "drill",
      title: `Parcelas e assinaturas · ${monthLabel(selected)}`,
      rows: monthLedger(subset, selected),
    });
  }
  function drillBill(id: string) {
    const rows = monthLedger(data, month).filter((r) =>
      r.kind === "purchase"
        ? data.purchases.find((p) => p.id === r.id)?.cardId === id
        : r.kind === "subscription" &&
          allRecurring.find((i) => i.subscription.id === r.id)?.cardId === id,
    );
    setModal({
      type: "drill",
      title: `Fatura de ${cardsById.get(id)?.name} · ${monthLabel(month)}`,
      rows,
    });
  }
  function drillCard(id: string) {
    const card = cardsById.get(id)!;
    setModal({
      type: "drill",
      title: `Saldo a pagar · ${card.name}`,
      rows: purchases
        .filter((p) => p.cardId === id && remaining(p) > 0)
        .map((p) => ({
          kind: "purchase",
          id: p.id,
          key: p.id,
          label: p.description,
          detail: "Saldo das parcelas restantes",
          date: `${p.nextMonth}-01`,
          amount: remaining(p),
          paid: false,
        })),
    });
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (loaded && !modal) setModal({ type: "search" });
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [loaded, modal]);
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
        <BrandLogo />
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
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}
    >
      {compactViewport && (
        <button
          aria-hidden={!mobileMenuOpen}
          tabIndex={mobileMenuOpen ? 0 : -1}
          disabled={!mobileMenuOpen}
          className="sidebar-backdrop"
          aria-label="Fechar menu lateral"
          onClick={() => {
            setMobileMenuOpen(false);
            menuToggleRef.current?.focus();
          }}
        />
      )}
      <aside className="sidebar" aria-label="Menu lateral">
        <div className="brand">
          <BrandLogo variant="responsive" />
          <small>{__APP_VERSION__}</small>
        </div>
        <button
          ref={menuToggleRef}
          className="sidebar-toggle"
          aria-label={
            collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
          }
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!collapsed}
          aria-controls="main-navigation"
          disabled={saving}
          onClick={() => {
            if (compactViewport) setMobileMenuOpen(!mobileMenuOpen);
            else
              void commit(
                {
                  ...data,
                  settings: {
                    ...data.settings,
                    theme,
                    sidebarCollapsed: !collapsed,
                  },
                },
                collapsed ? "Menu expandido." : "Menu recolhido.",
                false,
              );
          }}
        >
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
          <span>Recolher menu</span>
        </button>
        <nav id="main-navigation" aria-label="Navegação principal">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <span className="nav-group-label">{group.title}</span>
              {group.ids.map((id) => {
                const item = nav.find((item) => item.id === id)!;
                return (
                  <button
                    key={item.id}
                    aria-label={item.title}
                    title={collapsed ? item.title : undefined}
                    className={`nav-item ${tab === item.id ? "active" : ""}`}
                    aria-current={tab === item.id ? "page" : undefined}
                    onClick={() => navigate(item.id)}
                  >
                    <item.icon size={19} />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
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
                  settings: {
                    ...data.settings,
                    theme: theme === "light" ? "dark" : "light",
                  },
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
            <span className="brand-name">ContaClara</span>
            <ChevronRight size={13} />
            <span>{nav.find((n) => n.id === tab)?.title}</span>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Busca geral (Ctrl+K)"
              title="Busca geral (Ctrl+K)"
              onClick={() => setModal({ type: "search" })}
            >
              <Search size={18} />
            </button>
            <button
              className="icon-button"
              aria-label={
                data.settings?.privacy ? "Mostrar valores" : "Ocultar valores"
              }
              title="Modo privacidade"
              disabled={saving}
              onClick={() =>
                void commit(
                  {
                    ...data,
                    settings: {
                      ...data.settings,
                      theme,
                      privacy: !data.settings?.privacy,
                    },
                  },
                  data.settings?.privacy
                    ? "Valores visíveis."
                    : "Valores ocultos.",
                  false,
                )
              }
            >
              {data.settings?.privacy ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
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
            <div className="topbar-tools" ref={toolsRef}>
              <button
                className="icon-button"
                aria-label="Opções de backup"
                title="Opções de backup"
                aria-expanded={toolsOpen}
                aria-controls="backup-options"
                onClick={() => setToolsOpen(!toolsOpen)}
              >
                <Ellipsis size={20} />
              </button>
              {toolsOpen && (
                <div
                  id="backup-options"
                  className="backup-options"
                  aria-label="Cópias de segurança"
                >
                  <strong>Cópias de segurança</strong>
                  <button
                    disabled={saving}
                    onClick={() => {
                      exportBackup();
                      setToolsOpen(false);
                    }}
                  >
                    <Download size={17} />
                    Exportar backup
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => {
                      importRef.current?.click();
                      setToolsOpen(false);
                    }}
                  >
                    <FileUp size={17} />
                    Importar backup
                  </button>
                  <small>Seus dados ficam apenas neste dispositivo.</small>
                </div>
              )}
            </div>
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
        <main key={tab} className="page-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                <i className="dot accent" /> CLAREZA PARA SEUS PRÓXIMOS PASSOS
              </span>
              <h1>{titles[tab][0]}</h1>
              <p>{titles[tab][1]}</p>
            </div>
            {![
              "home",
              "updates",
              "appearance",
              "data",
              "simulator",
              "pending",
              "calendar",
            ].includes(tab) && (
              <button
                className="button primary"
                disabled={saving}
                onClick={() =>
                  tab === "expenses"
                    ? setModal({ type: "expense" })
                    : tab === "income"
                      ? setModal({ type: "income" })
                      : tab === "subscriptions"
                        ? setModal({ type: "subscription" })
                        : tab === "cards"
                          ? setModal({ type: "card" })
                          : addPurchase()
                }
              >
                <Plus size={17} />
                {tab === "expenses"
                  ? "Nova despesa"
                  : tab === "income"
                    ? "Nova entrada"
                    : tab === "subscriptions"
                      ? "Nova assinatura"
                      : tab === "cards" || !data.cards.length
                        ? "Novo cartão"
                        : "Nova compra"}
              </button>
            )}
          </div>
          {!["updates", "appearance", "data", "simulator"].includes(tab) && (
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
              <div
                className="stat-card debt"
                data-tone={debt > 0 ? "warning" : "success"}
              >
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
              <div
                className="stat-card"
                data-tone={
                  snapshot.items.some(
                    (i) => !i.paid && i.scheduledMonth < month,
                  )
                    ? "danger"
                    : snapshot.outstanding > 0
                      ? "warning"
                      : "success"
                }
              >
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
              <div
                className="stat-card"
                data-tone={snapshot.paid > 0 ? "success" : "info"}
              >
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
              <div
                className="stat-card"
                data-tone={months.length ? "info" : "success"}
              >
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

          {tab === "home" && (
            <WelcomePage
              data={data}
              month={month}
              onNavigate={navigate}
              saving={saving}
              onSettings={(settings) =>
                commit(
                  { ...data, settings },
                  "Página inicial personalizada.",
                  false,
                )
              }
              onOpen={openDestination}
              onDrill={(rows, title) =>
                setModal({ type: "drill", rows, title })
              }
              onStart={() => setModal({ type: "card" })}
              onDemo={() =>
                confirm(
                  "Carregar exemplo?",
                  "Os dados fictícios substituirão todos os seus registros atuais. Você pode desfazer a alteração.",
                  () =>
                    commit(
                      demoData(theme),
                      "Dados de exemplo carregados. São fictícios.",
                    ),
                )
              }
            />
          )}

          {tab === "overview" && (
            <>
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
                    onMonth={drillMonth}
                  />
                </Panel>
                <Panel
                  title="Seu saldo, por cartão"
                  subtitle="Quanto cada cartão representa no saldo restante"
                >
                  <DistributionChart cards={cardData} onCard={drillCard} />
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
          {tab === "overview" && (
            <ComparisonPanel
              data={data}
              month={month}
              onOpen={(rows, title) => setModal({ type: "drill", rows, title })}
            />
          )}
          {tab === "calendar" && (
            <CalendarPage
              data={data}
              month={month}
              onOpen={openDestination}
              onBill={drillBill}
            />
          )}
          {tab === "pending" && (
            <PendingPage data={data} month={month} onOpen={openDestination} />
          )}
          {tab === "simulator" && (
            <SimulatorPage
              data={data}
              onCard={(id) => openDestination({ kind: "card", id })}
              onCreate={(draft) =>
                setModal({ type: "purchase", cardId: draft.cardId, draft })
              }
            />
          )}
          {tab === "data" && (
            <DataCenter
              data={data}
              month={month}
              saving={saving}
              history={history}
              onUndo={() => void restoreUndo()}
              onCommit={commit}
              onSettings={(settings) =>
                commit(
                  { ...data, settings },
                  "Preferência de backup salva.",
                  false,
                )
              }
              onRestore={(restored) =>
                confirm(
                  "Restaurar cópia de segurança?",
                  `Substituir os dados atuais por esta cópia (${restored.cards.length} cartões, ${restored.purchases.length} compras)? Uma cópia do estado atual será criada antes.`,
                  async () => {
                    try {
                      await createBackup(data);
                    } catch (error) {
                      setToast((error as Error).message, "danger");
                      return false;
                    }
                    return commit(restored, "Cópia de segurança restaurada.");
                  },
                  true,
                )
              }
            />
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
                  onMonth={drillMonth}
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
                    <ComparisonChart cards={cardData} onCard={drillCard} />
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
                              ids.length ? "success" : "warning",
                            );
                          } catch (error) {
                            setToast((error as Error).message, "warning");
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
            <>
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
                onReceive={(entry) =>
                  setModal({
                    type: "settlement",
                    title: "Confirmar entrada recebida",
                    action: (date) =>
                      commit(
                        {
                          ...data,
                          cashEntries: (data.cashEntries ?? []).map((e) =>
                            e.id === entry.id
                              ? { ...e, status: "received", date }
                              : e,
                          ),
                        },
                        "Entrada recebida.",
                      ),
                  })
                }
                onCards={() => {
                  setFilters(CLEAR);
                  setTab("cards");
                }}
              />
              <IncomePlanning
                key={`${data.settings?.carryover?.startMonth}-${data.settings?.carryover?.openingCents}`}
                data={data}
                month={month}
                saving={saving}
                onSettings={(settings) =>
                  commit(
                    { ...data, settings },
                    "Saldo entre meses configurado.",
                    false,
                  )
                }
                onCreate={() => setModal({ type: "recurring" })}
                onEdit={(rule) => setModal({ type: "recurring", rule })}
                onReceive={(rule) =>
                  setModal({
                    type: "settlement",
                    title: "Confirmar renda recebida",
                    action: (date) =>
                      commit(
                        receiveIncome(data, rule.id, month, date),
                        "Recebimento registrado.",
                      ),
                  })
                }
                onUnreceive={(rule) =>
                  confirm(
                    "Corrigir recebimento?",
                    "A renda voltará a ser prevista para o mês da regra.",
                    () =>
                      commit(
                        {
                          ...data,
                          incomeReceipts: (data.incomeReceipts ?? []).filter(
                            (r) =>
                              !(r.recurringId === rule.id && r.month === month),
                          ),
                        },
                        "Recebimento corrigido.",
                      ),
                    true,
                  )
                }
                onDelete={(rule) =>
                  confirm(
                    "Excluir renda recorrente?",
                    "Serão removidos a regra e seus recebimentos. Para manter o histórico, edite o mês final.",
                    () =>
                      commit(
                        {
                          ...data,
                          recurringIncomes: (
                            data.recurringIncomes ?? []
                          ).filter((r) => r.id !== rule.id),
                          incomeReceipts: (data.incomeReceipts ?? []).filter(
                            (r) => r.recurringId !== rule.id,
                          ),
                        },
                        "Renda excluída.",
                      ),
                    true,
                  )
                }
              />
            </>
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
          {tab === "expenses" && (
            <ExpensesPage
              data={data}
              month={month}
              saving={saving}
              onEdit={(expense) => setModal({ type: "expense", expense })}
              onPay={(expense) =>
                setModal({
                  type: "settlement",
                  title: "Registrar despesa paga",
                  action: (date) =>
                    commit(
                      {
                        ...data,
                        expenses: (data.expenses ?? []).map((e) =>
                          e.id === expense.id ? { ...e, paidDate: date } : e,
                        ),
                      },
                      "Despesa paga.",
                    ),
                })
              }
              onUnpay={(expense) =>
                confirm(
                  "Corrigir pagamento?",
                  "A despesa voltará a ficar pendente.",
                  () =>
                    commit(
                      {
                        ...data,
                        expenses: (data.expenses ?? []).map((e) =>
                          e.id === expense.id ? { ...e, paidDate: null } : e,
                        ),
                      },
                      "Pagamento corrigido.",
                    ),
                  true,
                )
              }
              onDelete={(expense) =>
                confirm(
                  "Excluir despesa?",
                  "Remover esta despesa e recalcular o saldo dos meses envolvidos?",
                  () =>
                    commit(
                      {
                        ...data,
                        expenses: (data.expenses ?? []).filter(
                          (e) => e.id !== expense.id,
                        ),
                      },
                      "Despesa excluída.",
                    ),
                  true,
                )
              }
            />
          )}
          {tab === "appearance" && (
            <AppearancePage
              settings={data.settings ?? { theme: "light" }}
              saving={saving}
              onSave={(settings, message = "Aparência personalizada.") =>
                commit({ ...data, settings }, message, false)
              }
            />
          )}
          {tab === "updates" && <UpdatesPage />}
          <footer className="page-footer">
            <LocalNote />
            <span>
              ContaClara {__APP_VERSION__} <i>·</i> Seu dinheiro. Suas
              possibilidades.
            </span>
          </footer>
        </main>
      </div>
      {modal?.type === "search" && (
        <GlobalSearch
          data={data}
          onOpen={openDestination}
          onClose={() => setModal(null)}
          onNavigate={(tab) => {
            setModal(null);
            navigate(tab);
          }}
        />
      )}
      {modal?.type === "drill" && (
        <Dialog
          title={modal.title}
          subtitle={`Total: ${money(modal.rows.reduce((s, r) => s + r.amount, 0))}`}
          onClose={() => setModal(null)}
          wide
        >
          <div className="drill-content">
            <LedgerList rows={modal.rows} onOpen={openDestination} />
          </div>
        </Dialog>
      )}
      {modal?.type === "settlement" && (
        <Settlement
          title={modal.title}
          onSave={modal.action}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "recurring" && (
        <RecurringForm
          data={data}
          rule={modal.rule}
          month={month}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(rule) =>
            commit(
              {
                ...data,
                recurringIncomes: modal.rule
                  ? (data.recurringIncomes ?? []).map((r) =>
                      r.id === rule.id ? rule : r,
                    )
                  : [...(data.recurringIncomes ?? []), rule],
              },
              "Renda recorrente salva.",
            )
          }
        />
      )}
      {modal?.type === "expense" && (
        <ExpenseForm
          data={data}
          expense={modal.expense}
          month={month}
          saving={saving}
          onClose={() => {
            if (!saving) setModal(null);
          }}
          onSave={(expense) =>
            commit(
              {
                ...data,
                expenses: modal.expense
                  ? (data.expenses ?? []).map((e) =>
                      e.id === expense.id ? expense : e,
                    )
                  : [...(data.expenses ?? []), expense],
              },
              "Despesa salva.",
            )
          }
        />
      )}
      {modal?.type === "income" && (
        <CashForm
          data={data}
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
          data={data}
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
          data={data}
          key={modal.purchase?.id ?? "new-purchase"}
          purchase={modal.purchase}
          cardId={modal.cardId}
          draft={modal.draft}
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
        <div className="toast" data-tone={toast.tone} role="status">
          <span>
            {toast.tone === "danger" ? (
              <CircleAlert size={16} />
            ) : toast.tone === "warning" ? (
              <TriangleAlert size={16} />
            ) : (
              <Check size={16} />
            )}
          </span>
          <p>{toast.message}</p>
          {undo && (
            <button
              className="text-button"
              disabled={saving}
              onClick={() => void restoreUndo()}
            >
              Desfazer
            </button>
          )}
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
