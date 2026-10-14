import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileUp,
  LayoutDashboard,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";
import {
  BANKS,
  CATEGORIES,
  COLORS,
  EMPTY,
  addMonths,
  currentMonth,
  forecast,
  installmentAmount,
  money,
  moneyInput,
  monthLabel,
  parseMoney,
  payNext,
  remaining,
  validateData,
  type Card,
  type Data,
  type Purchase,
} from "./domain";
import { loadData, saveData } from "./storage";

type Tab = "overview" | "purchases" | "cards" | "planning";
type ModalState =
  | { type: "card"; card?: Card }
  | { type: "purchase"; purchase?: Purchase; cardId?: string }
  | {
      type: "confirm";
      title: string;
      text: string;
      action: () => Promise<boolean>;
      danger?: boolean;
    }
  | null;
const nav = [
  { id: "overview" as const, title: "Visão geral", icon: LayoutDashboard },
  { id: "purchases" as const, title: "Minhas compras", icon: ShoppingBag },
  { id: "cards" as const, title: "Meus cartões", icon: CreditCard },
  { id: "planning" as const, title: "Planejamento", icon: ChartNoAxesCombined },
];
const titles: Record<Tab, [string, string]> = {
  overview: [
    "Tudo sob controle.",
    "Uma visão clara de seus cartões e próximos pagamentos.",
  ],
  purchases: [
    "Cada compra, organizada.",
    "Acompanhe suas parcelas e registre os pagamentos.",
  ],
  cards: [
    "Seus cartões, juntos.",
    "Saiba quanto está comprometido em cada cartão.",
  ],
  planning: [
    "Olhe para os próximos meses.",
    "Veja seus compromissos diminuírem até a última parcela.",
  ],
};
const uid = () => crypto.randomUUID();
function demoData(): Data {
  const month = currentMonth();
  const cards: Card[] = [
    {
      id: uid(),
      name: "Meu roxinho",
      bank: "Nubank",
      last4: "4829",
      color: "#8b5cf6",
      dueDay: 10,
      limitCents: 1000000,
    },
    {
      id: uid(),
      name: "Para o dia a dia",
      bank: "Itaú",
      last4: "1056",
      color: "#f97316",
      dueDay: 15,
      limitCents: 800000,
    },
    {
      id: uid(),
      name: "Planos e viagens",
      bank: "Inter",
      last4: "7312",
      color: "#2563eb",
      dueDay: 20,
      limitCents: 600000,
    },
  ];
  const purchase = (
    description: string,
    card: number,
    totalCents: number,
    installments: number,
    paid: number,
    category: string,
  ): Purchase => ({
    id: uid(),
    description,
    cardId: cards[card].id,
    totalCents,
    installments,
    paid,
    category,
    nextMonth: month,
  });
  return {
    version: 1,
    cards,
    purchases: [
      purchase("Notebook novo", 0, 480000, 12, 4, "Tecnologia"),
      purchase("Sofá da sala", 1, 240000, 10, 3, "Casa"),
      purchase("Passagens para as férias", 2, 180000, 6, 2, "Lazer"),
      purchase("Curso de inglês", 0, 120000, 12, 7, "Educação"),
      purchase("Tênis de corrida", 1, 45000, 3, 1, "Compras"),
    ],
  };
}

function Dialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-inner">
        <div className="dialog-heading">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Empty({
  icon = <ShoppingBag size={28} />,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function CardForm({
  card,
  saving,
  onSave,
  onClose,
}: {
  card?: Card;
  saving: boolean;
  onSave: (card: Card) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(card?.name ?? "");
  const [bank, setBank] = useState(
    card && !BANKS.includes(card.bank) ? "Outro" : (card?.bank ?? "Nubank"),
  );
  const [customBank, setCustomBank] = useState(card?.bank ?? "");
  const [last4, setLast4] = useState(card?.last4 ?? "");
  const [color, setColor] = useState(card?.color ?? COLORS[0]);
  const [due, setDue] = useState(String(card?.dueDay ?? 10));
  const [limit, setLimit] = useState(
    card?.limitCents ? moneyInput(card.limitCents) : "",
  );
  const [error, setError] = useState("");
  return (
    <Dialog
      title={card ? "Editar cartão" : "Um novo cartão"}
      subtitle="Só precisamos de um nome e alguns detalhes. Nada de dados sensíveis."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            if (last4 && !/^\d{4}$/.test(last4))
              throw new Error(
                "Informe os quatro últimos dígitos ou deixe em branco.",
              );
            if (
              await onSave({
                id: card?.id ?? uid(),
                name: name.trim(),
                bank: bank === "Outro" ? customBank.trim() : bank,
                last4,
                color,
                dueDay: Number(due),
                limitCents: limit.trim() ? parseMoney(limit) : 0,
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label>
          Nome do cartão
          <input
            autoFocus
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Meu cartão principal"
          />
        </label>
        <label>
          Banco
          <select
            aria-label="Banco"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          >
            {BANKS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        {bank === "Outro" && (
          <label>
            Nome do banco
            <input
              required
              maxLength={50}
              value={customBank}
              onChange={(e) => setCustomBank(e.target.value)}
              placeholder="Qual é o banco?"
            />
          </label>
        )}
        <div className="form-row">
          <label>
            Últimos 4 dígitos <small>opcional</small>
            <input
              value={last4}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
            />
          </label>
          <label>
            Dia de vencimento
            <input
              type="number"
              min={1}
              max={31}
              required
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </div>
        <label>
          Limite do cartão <small>opcional</small>
          <div className="money-field">
            <span>R$</span>
            <input
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </label>
        <fieldset className="color-field">
          <legend>Cor do cartão</legend>
          <div className="color-options">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={
                  c === color ? "color-option selected" : "color-option"
                }
                style={{ background: c }}
                aria-label={`Cor ${c}`}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
              >
                {c === color && <Check size={16} />}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            Salvar cartão
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function PurchaseForm({
  purchase,
  cards,
  cardId,
  saving,
  onSave,
  onClose,
}: {
  purchase?: Purchase;
  cards: Card[];
  cardId?: string;
  saving: boolean;
  onSave: (purchase: Purchase) => Promise<boolean>;
  onClose: () => void;
}) {
  const initial =
    cards.find((c) => c.id === (purchase?.cardId ?? cardId)) ?? cards[0];
  const [description, setDescription] = useState(purchase?.description ?? "");
  const [bank, setBank] = useState(initial.bank);
  const [selectedCard, setSelectedCard] = useState(initial.id);
  const [total, setTotal] = useState(
    purchase ? moneyInput(purchase.totalCents) : "",
  );
  const [amountMode, setAmountMode] = useState("total");
  const [installments, setInstallments] = useState(
    String(purchase?.installments ?? 1),
  );
  const [paid, setPaid] = useState(String(purchase?.paid ?? 0));
  const [month, setMonth] = useState(purchase?.nextMonth ?? currentMonth());
  const [category, setCategory] = useState(purchase?.category ?? CATEGORIES[0]);
  const [error, setError] = useState("");
  const bankCards = cards.filter((c) => c.bank === bank);
  let preview: Purchase | null = null;
  try {
    const cents =
      parseMoney(total) *
      (amountMode === "installment" ? Number(installments) : 1);
    const count = Number(installments),
      done = Number(paid);
    if (cents >= count && count > 0 && done >= 0 && done <= count)
      preview = {
        id: "",
        description,
        cardId: selectedCard,
        category,
        totalCents: cents,
        installments: count,
        paid: done,
        nextMonth: month,
      };
  } catch {
    /* Empty or incomplete input. */
  }
  return (
    <Dialog
      title={purchase ? "Editar compra" : "Adicionar uma compra"}
      subtitle="Organize agora. Seu planejamento faz o resto."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            if (Number(paid) > Number(installments))
              throw new Error(
                "As parcelas pagas não podem superar o total de parcelas.",
              );
            if (
              await onSave({
                id: purchase?.id ?? uid(),
                description: description.trim(),
                cardId: selectedCard,
                category,
                totalCents:
                  parseMoney(total) *
                  (amountMode === "installment" ? Number(installments) : 1),
                installments: Number(installments),
                paid: Number(paid),
                nextMonth: month,
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <label>
          Descrição da compra
          <input
            autoFocus
            required
            maxLength={100}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Notebook, sofá, viagem..."
          />
        </label>
        <div className="form-row">
          <label>
            Banco
            <select
              aria-label="Banco"
              value={bank}
              onChange={(e) => {
                setBank(e.target.value);
                setSelectedCard(
                  cards.find((c) => c.bank === e.target.value)!.id,
                );
              }}
            >
              {[...new Set(cards.map((c) => c.bank))].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            Cartão
            <select
              aria-label="Cartão"
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
            >
              {bankCards.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                  {c.last4 ? ` · ${c.last4}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Como informar o valor
          <select
            aria-label="Como informar o valor"
            value={amountMode}
            onChange={(e) => {
              setAmountMode(e.target.value);
              setTotal("");
            }}
          >
            <option value="total">Valor total da compra</option>
            <option value="installment">Valor de cada parcela</option>
          </select>
        </label>
        <label>
          {amountMode === "total"
            ? "Valor total da compra"
            : "Valor de cada parcela"}
          <div className="money-field">
            <span>R$</span>
            <input
              aria-label={
                amountMode === "total"
                  ? "Valor total da compra"
                  : "Valor de cada parcela"
              }
              required
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <span className="field-hint">
            {amountMode === "total"
              ? "Informe o total final, incluindo juros, se houver."
              : "O total será o valor da parcela multiplicado pelo número de parcelas."}
          </span>
        </label>
        <div className="form-row">
          <label>
            Número de parcelas
            <input
              type="number"
              min={1}
              max={600}
              required
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
          </label>
          <label>
            Parcelas já pagas
            <input
              type="number"
              min={0}
              max={Number(installments)}
              required
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Mês da próxima parcela
            <input
              type="month"
              required
              min="2000-01"
              max="2199-12"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <label>
            Categoria
            <select
              aria-label="Categoria"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {preview && (
          <div className="purchase-preview">
            <div>
              <span>Próxima parcela</span>
              <strong>
                {preview.paid === preview.installments
                  ? money(0)
                  : money(installmentAmount(preview, preview.paid))}
              </strong>
            </div>
            <div>
              <span>Saldo a pagar</span>
              <strong>{money(remaining(preview))}</strong>
            </div>
          </div>
        )}
        <p className="field-hint">
          A diferença de centavos é distribuída nas primeiras parcelas. Parcelas
          vencidas e não pagas entram no mês atual.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            Salvar compra
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function App() {
  const [data, setData] = useState<Data>(structuredClone(EMPTY));
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [filterCard, setFilterCard] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [chartPage, setChartPage] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  async function initialize() {
    setLoadError("");
    try {
      setData(await loadData());
      setLoaded(true);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }
  useEffect(() => {
    void initialize();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    setChartPage(0);
  }, [filterCard, data]);
  async function commit(next: Data, message = "Tudo salvo!") {
    if (savingLock.current || !loaded) return false;
    savingLock.current = true;
    setSaving(true);
    try {
      const validated = validateData(next);
      await saveData(validated);
      setData(validated);
      setToast(message);
      return true;
    } catch (e) {
      setToast(`Não foi possível salvar: ${(e as Error).message}`);
      return false;
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }
  const selected = data.purchases.filter(
    (p) => tab === "cards" || filterCard === "all" || p.cardId === filterCard,
  );
  const months = forecast(selected);
  const debt = selected.reduce((s, p) => s + remaining(p), 0);
  const total = selected.reduce((s, p) => s + p.totalCents, 0);
  const monthly = months[0]?.total ?? 0;
  const active = selected.filter((p) => p.paid < p.installments);
  const current = currentMonth();
  const overdue = active.some((p) => p.nextMonth < current);
  const nextAmount = months[1]?.total ?? 0;
  const difference = monthly
    ? Math.round(((monthly - nextAmount) / monthly) * 100)
    : 0;
  const cardData = data.cards
    .map((card) => {
      const purchases = selected.filter((p) => p.cardId === card.id);
      return {
        ...card,
        debt: purchases.reduce((sum, p) => sum + remaining(p), 0),
        total: purchases.reduce((sum, p) => sum + p.totalCents, 0),
        monthly: months[0]?.byCard[card.id] ?? 0,
        count: purchases.length,
      };
    })
    .filter(
      (c) => tab === "cards" || filterCard === "all" || c.id === filterCard,
    );
  const pieData = cardData.filter((c) => c.debt > 0);
  const filteredPurchases = selected.filter(
    (p) =>
      (status === "all" ||
        (status === "active"
          ? p.paid < p.installments
          : p.paid === p.installments)) &&
      `${p.description} ${p.category} ${data.cards.find((c) => c.id === p.cardId)?.bank}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const addPurchase = (cardId?: string) =>
    data.cards.length
      ? setModal({ type: "purchase", cardId })
      : setModal({ type: "card" });
  const confirm = (
    title: string,
    text: string,
    action: () => Promise<boolean>,
    danger = true,
  ) => setModal({ type: "confirm", title, text, action, danger });
  const removeCard = (card: Card) => {
    if (data.purchases.some((p) => p.cardId === card.id)) {
      setToast(
        "Este cartão tem compras vinculadas. Mova ou exclua essas compras antes de excluir o cartão.",
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
        if (ok && filterCard === card.id) setFilterCard("all");
        return ok;
      },
    );
  };
  const pay = (p: Purchase) =>
    confirm(
      "Registrar pagamento?",
      `Marcar a parcela ${p.paid + 1} de ${p.installments} de “${p.description}” (${money(installmentAmount(p, p.paid))}) como paga? O mês da próxima parcela será atualizado.`,
      () =>
        commit(
          {
            ...data,
            purchases: data.purchases.map((x) =>
              x.id === p.id ? payNext(x) : x,
            ),
          },
          "Pagamento registrado. Você pode corrigir as parcelas em Editar compra.",
        ),
      false,
    );
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `saldo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Backup exportado. Guarde-o em um lugar seguro.");
  };
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("O backup deve ter até 5 MB.");
      const imported = validateData(JSON.parse(await file.text()));
      confirm(
        "Restaurar backup?",
        `O arquivo contém ${imported.cards.length} cartões e ${imported.purchases.length} compras e substituirá os dados atuais. Exporte um backup antes se quiser preservá-los.`,
        async () => {
          const ok = await commit(imported, "Backup restaurado com sucesso.");
          if (ok) setFilterCard("all");
          return ok;
        },
      );
    } catch (e) {
      setToast(`Não foi possível importar: ${(e as Error).message}`);
    }
  }
  function purchaseTable(purchases: Purchase[], compact = false) {
    return (
      <div className="table-scroll">
        <table className="purchase-table">
          <thead>
            <tr>
              <th>Compra</th>
              <th>Cartão</th>
              <th>Parcelas pagas</th>
              <th>Próxima parcela</th>
              <th>Saldo a pagar</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => {
              const card = data.cards.find((c) => c.id === p.cardId)!;
              const paid = p.paid === p.installments;
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
                          {p.category} · total {money(p.totalCents)}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="card-tag">
                      <span style={{ background: card.color }} />
                      {card.bank}
                    </div>
                    <small className="cell-small">{card.name}</small>
                  </td>
                  <td>
                    <div className="progress-label">
                      {p.paid}
                      <span>/ {p.installments}</span>
                      {paid && <CheckCheck size={14} />}
                    </div>
                    <div className="progress">
                      <i
                        style={{
                          width: `${(p.paid / p.installments) * 100}%`,
                          background: paid ? "#10b981" : card.color,
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    {paid ? (
                      <span className="badge green">Quitada</span>
                    ) : (
                      <>
                        <strong className="amount">
                          {money(installmentAmount(p, p.paid))}
                        </strong>
                        <small
                          className={`cell-small ${p.nextMonth < current ? "overdue" : ""}`}
                        >
                          {monthLabel(p.nextMonth, true)}
                          {p.nextMonth < current ? " · em atraso" : ""}
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
                        <button
                          className="icon-button pay"
                          disabled={saving}
                          onClick={() => pay(p)}
                          aria-label={`Pagar próxima parcela de ${p.description}`}
                          title="Registrar pagamento"
                        >
                          <Check size={17} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        onClick={() =>
                          setModal({ type: "purchase", purchase: p })
                        }
                        aria-label={`Editar ${p.description}`}
                        title="Editar compra"
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
                              `A compra “${p.description}” e suas parcelas serão removidas do planejamento.`,
                              () =>
                                commit(
                                  {
                                    ...data,
                                    purchases: data.purchases.filter(
                                      (x) => x.id !== p.id,
                                    ),
                                  },
                                  "Compra excluída.",
                                ),
                            )
                          }
                        >
                          <Trash2 size={16} />
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
  const chart = (all = false) => {
    const visible = all
      ? months.slice(chartPage * 12, chartPage * 12 + 12)
      : months.slice(0, 6);
    return months.length ? (
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={visible}
            margin={{ top: 20, right: 18, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="balance-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#edf0f5"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="month"
              tickFormatter={(m) => monthLabel(m, true)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#8892a4", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              tickFormatter={(v) =>
                `${Number(v) >= 100000 ? (Number(v) / 100000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : Number(v) / 100}`
              }
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#8892a4", fontSize: 11 }}
              width={50}
            />
            <Tooltip
              formatter={(value) => [money(Number(value)), "A pagar"]}
              labelFormatter={(label) => monthLabel(String(label))}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #edf0f5",
                fontSize: 13,
              }}
            />
            <Area
              isAnimationActive={false}
              name="A pagar"
              type="linear"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#balance-gradient)"
              dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <Empty
        icon={<ChartNoAxesCombined size={26} />}
        title="Seu futuro começa aqui"
        text="Cadastre uma compra para ver a previsão mensal."
      />
    );
  };

  if (!loaded)
    return (
      <div className="loading-screen">
        <div className="brand-logo">
          <ChartNoAxesCombined size={25} />
        </div>
        <h1>Saldo</h1>
        {loadError ? (
          <>
            <p role="alert">
              Não foi possível carregar seus dados: {loadError}
            </p>
            <p>
              Os arquivos existentes foram preservados. Corrija o arquivo ou
              restaure uma cópia válida na pasta de dados.
            </p>
            <button className="button primary" onClick={initialize}>
              Tentar novamente
            </button>
          </>
        ) : (
          <p>Preparando suas finanças…</p>
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
            saldo<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="workspace-label">SEU ESPAÇO FINANCEIRO</div>
        <nav aria-label="Navegação principal">
          {nav.map((item) => (
            <button
              key={item.id}
              aria-label={item.title}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>{item.title}</span>
              {item.id === "cards" && (
                <span className="nav-count">{data.cards.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <div className="tip-icon">
            <Sparkles size={18} />
          </div>
          <h3>
            Pequenos passos.
            <br />
            Mais tranquilidade.
          </h3>
          <p>Acompanhe suas parcelas e faça planos com clareza.</p>
          <button onClick={() => setTab("planning")}>
            Ver meu planejamento <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <LockKeyhole size={15} />
            <span>Seus dados ficam com você</span>
          </div>
          <div className="profile">
            <div className="profile-avatar">EU</div>
            <div>
              <strong>Meu espaço</strong>
              <small>Finanças pessoais</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <div className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            Meu espaço <ChevronRight size={14} />
            <span>{nav.find((n) => n.id === tab)?.title}</span>
          </div>
          <div className="topbar-right">
            <span className="save-status">
              <span />
              {saving ? "Salvando…" : "Salvo neste dispositivo"}
            </span>
            <button
              className="icon-button"
              title="Exportar backup"
              aria-label="Exportar backup"
              onClick={exportBackup}
            >
              <Download size={18} />
            </button>
            <button
              className="icon-button"
              title="Importar backup"
              aria-label="Importar backup"
              onClick={() => importInput.current?.click()}
            >
              <FileUp size={18} />
            </button>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                void importBackup(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                SUAS FINANÇAS, EM EQUILÍBRIO
              </div>
              <h1>{titles[tab][0]}</h1>
              <p>{titles[tab][1]}</p>
            </div>
            <button
              className="button primary"
              onClick={() =>
                tab === "cards" ? setModal({ type: "card" }) : addPurchase()
              }
            >
              <Plus size={17} />
              {tab === "cards" || !data.cards.length
                ? "Novo cartão"
                : "Nova compra"}
            </button>
          </div>
          <div className="filter-bar">
            <div className="period">
              <CalendarDays size={16} />
              <span>{monthLabel(current)}</span>
              <span className="badge">Mês atual</span>
            </div>
            {tab !== "cards" && (
              <label className="filter-select">
                <CreditCard size={16} />
                <select
                  aria-label="Filtrar por cartão"
                  value={filterCard}
                  onChange={(e) => setFilterCard(e.target.value)}
                >
                  <option value="all">Todos os cartões</option>
                  {data.cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bank} · {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {tab !== "cards" && (
            <div className="stats-grid">
              <div className="stat-card debt">
                <div className="stat-title">
                  Saldo total a pagar{" "}
                  <span className="stat-icon">
                    <Wallet size={18} />
                  </span>
                </div>
                <strong data-testid="total-debt">{money(debt)}</strong>
                <div className="stat-foot">
                  <span className="dot blue" />
                  {active.length}{" "}
                  {active.length === 1
                    ? "compra em andamento"
                    : "compras em andamento"}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">
                  A pagar neste mês{" "}
                  <span className="stat-icon orange">
                    <CalendarDays size={18} />
                  </span>
                </div>
                <strong data-testid="monthly-total">{money(monthly)}</strong>
                <div className="stat-foot">
                  {overdue ? (
                    <span className="overdue">
                      Inclui parcelas vencidas não pagas
                    </span>
                  ) : (
                    "Suas parcelas do mês atual"
                  )}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">
                  Total já pago{" "}
                  <span className="stat-icon green">
                    <CheckCheck size={19} />
                  </span>
                </div>
                <strong>{money(total - debt)}</strong>
                <div className="stat-foot">
                  <ArrowDownLeft size={14} className="green-text" />
                  Um passo mais perto de quitar tudo
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">
                  Última parcela{" "}
                  <span className="stat-icon purple">
                    <TrendingDown size={18} />
                  </span>
                </div>
                <strong className="date-stat">
                  {months.length
                    ? monthLabel(months.at(-1)!.month, true)
                    : "Tudo em dia"}
                </strong>
                <div className="stat-foot">
                  {months.length
                    ? `${months.length} ${months.length === 1 ? "mês" : "meses"} no planejamento`
                    : "Sem parcelas pendentes"}
                </div>
              </div>
            </div>
          )}
          {tab === "overview" && (
            <>
              {!data.purchases.length && (
                <div className="welcome-banner">
                  <div className="welcome-icon">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3>Vamos dar clareza às suas finanças?</h3>
                    <p>
                      Comece cadastrando um cartão e sua primeira compra, ou
                      explore com dados de exemplo.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      confirm(
                        "Carregar exemplo?",
                        "Serão adicionados cartões e compras fictícios para explorar o aplicativo. Estes dados substituirão os cadastros atuais; você pode excluí-los depois.",
                        () =>
                          commit(
                            demoData(),
                            "Dados de exemplo carregados. São fictícios.",
                          ),
                        false,
                      )
                    }
                  >
                    Experimentar exemplo <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <div className="charts-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Seu pagamento, mês a mês</h2>
                      <p>Previsão para os próximos seis meses</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("planning")}
                    >
                      Ver previsão <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {chart()}
                  <div className="chart-footer">
                    <span className="dot blue" />
                    Total de parcelas por mês{" "}
                    <span className="chart-unit">Valores em R$</span>
                  </div>
                </section>
                <section className="panel distribution-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Onde está seu saldo?</h2>
                      <p>Distribuição do saldo a pagar por cartão</p>
                    </div>
                    <CreditCard size={18} className="muted" />
                  </div>
                  {pieData.length ? (
                    <>
                      <div className="donut-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              isAnimationActive={false}
                              data={pieData}
                              dataKey="debt"
                              nameKey="name"
                              innerRadius="72%"
                              outerRadius="96%"
                              paddingAngle={3}
                              stroke="none"
                              startAngle={90}
                              endAngle={-270}
                            >
                              {pieData.map((c) => (
                                <Cell key={c.id} fill={c.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => money(Number(value))}
                              contentStyle={{ borderRadius: 12, fontSize: 13 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="donut-center">
                          <small>Saldo a pagar</small>
                          <strong>{money(debt)}</strong>
                        </div>
                      </div>
                      <div className="donut-legend">
                        {pieData.map((c) => (
                          <div key={c.id}>
                            <span
                              className="dot"
                              style={{ background: c.color }}
                            />
                            <span>
                              {c.bank} <small>· {c.name}</small>
                            </span>
                            <strong>
                              {Math.round((c.debt / debt) * 100)}%
                            </strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Empty
                      icon={<CreditCard size={26} />}
                      title="Espaço para seus cartões"
                      text="O saldo de cada cartão vai aparecer aqui."
                    />
                  )}
                </section>
              </div>
              <section className="cards-section">
                <div className="section-heading">
                  <h2>
                    Seus cartões{" "}
                    <span className="count-pill">{cardData.length}</span>
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => setTab("cards")}
                  >
                    Gerenciar cartões <ArrowRight size={15} />
                  </button>
                </div>
                <div className="mini-cards">
                  {cardData.map((c) => (
                    <button
                      key={c.id}
                      className="mini-card"
                      onClick={() => {
                        setFilterCard(c.id);
                        setTab("purchases");
                      }}
                    >
                      <div className="mini-card-top">
                        <span
                          className="bank-icon"
                          style={{ background: c.color }}
                        >
                          {c.bank.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>{c.bank}</strong>
                          <small>
                            {c.name}
                            {c.last4 ? ` · ${c.last4}` : ""}
                          </small>
                        </div>
                        <ChevronRight size={16} />
                      </div>
                      <div className="mini-card-stats">
                        <div>
                          <small>Saldo a pagar</small>
                          <strong>{money(c.debt)}</strong>
                        </div>
                        <div>
                          <small>Neste mês</small>
                          <strong>{money(c.monthly)}</strong>
                        </div>
                      </div>
                      <div className="mini-card-bottom">
                        <span>Vencimento dia {c.dueDay}</span>
                        <span className="dot" style={{ background: c.color }} />
                      </div>
                    </button>
                  ))}
                  <button
                    className="add-card-tile"
                    onClick={() => setModal({ type: "card" })}
                  >
                    <span>
                      <Plus size={22} />
                    </span>
                    <strong>Adicionar cartão</strong>
                    <small>Seus bancos em um só lugar</small>
                  </button>
                </div>
              </section>
              <section className="panel purchases-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Compras em andamento</h2>
                    <p>Uma parcela de cada vez. Você está no caminho.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      setStatus("active");
                      setTab("purchases");
                    }}
                  >
                    Ver todas <ArrowRight size={15} />
                  </button>
                </div>
                {active.length ? (
                  purchaseTable(active.slice(0, 5), true)
                ) : (
                  <Empty
                    title={
                      data.purchases.length
                        ? "Tudo quitado por aqui!"
                        : "Suas compras vão aparecer aqui"
                    }
                    text="Cadastre uma compra para acompanhar cada parcela."
                    action={
                      <button
                        className="button secondary"
                        onClick={() => addPurchase()}
                      >
                        <Plus size={16} />
                        {data.cards.length
                          ? "Adicionar compra"
                          : "Cadastrar primeiro cartão"}
                      </button>
                    }
                  />
                )}
              </section>
              {debt > 0 && (
                <div className="insight">
                  <span>
                    <Sparkles size={18} />
                  </span>
                  <p>
                    {difference > 0 ? (
                      <>
                        Um respiro no próximo mês: suas parcelas caem{" "}
                        <strong>{difference}%</strong>, para{" "}
                        <strong>{money(nextAmount)}</strong>.
                      </>
                    ) : (
                      <>
                        Seu próximo mês tem <strong>{money(nextAmount)}</strong>{" "}
                        em parcelas previstas. Acompanhe seus pagamentos para
                        manter o planejamento atualizado.
                      </>
                    )}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setTab("planning")}
                  >
                    Planejar <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
          {tab === "purchases" && (
            <section className="panel">
              <div className="purchase-toolbar">
                <div className="segmented" aria-label="Status das compras">
                  {[
                    ["active", "Em andamento"],
                    ["paid", "Quitadas"],
                    ["all", "Todas"],
                  ].map(([value, title]) => (
                    <button
                      key={value}
                      className={status === value ? "selected" : ""}
                      onClick={() => setStatus(value)}
                      aria-pressed={status === value}
                    >
                      {title}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    aria-label="Buscar compras"
                    placeholder="Buscar uma compra..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              {filteredPurchases.length ? (
                purchaseTable(filteredPurchases)
              ) : (
                <Empty
                  title="Nenhuma compra encontrada"
                  text={
                    search || status !== "active"
                      ? "Tente outra busca ou altere os filtros."
                      : "Adicione uma compra e acompanhe suas parcelas aqui."
                  }
                  action={
                    !search && (
                      <button
                        className="button secondary"
                        onClick={() => addPurchase()}
                      >
                        <Plus size={16} />
                        Adicionar compra
                      </button>
                    )
                  }
                />
              )}
              <div className="table-footer">
                {filteredPurchases.length}{" "}
                {filteredPurchases.length === 1 ? "compra" : "compras"} ·
                Valores calculados a partir das parcelas registradas
              </div>
            </section>
          )}
          {tab === "cards" && (
            <>
              <div className="card-grid">
                {data.cards.map((card) => {
                  const purchases = data.purchases.filter(
                      (p) => p.cardId === card.id,
                    ),
                    debt = purchases.reduce((s, p) => s + remaining(p), 0),
                    total = purchases.reduce((s, p) => s + p.totalCents, 0),
                    monthTotal = forecast(purchases)[0]?.total ?? 0;
                  return (
                    <section className="managed-card" key={card.id}>
                      <div
                        className="plastic-card"
                        style={{
                          background: `linear-gradient(125deg, ${card.color}, ${card.color}dd)`,
                        }}
                      >
                        <div className="plastic-top">
                          <span>{card.bank}</span>
                          <CreditCard size={25} />
                        </div>
                        <div className="chip">
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="card-digits">
                          •••• &nbsp; •••• &nbsp; •••• &nbsp;{" "}
                          {card.last4 || "••••"}
                        </div>
                        <div className="plastic-bottom">
                          <strong>{card.name}</strong>
                          <span>CRÉDITO</span>
                        </div>
                      </div>
                      <div className="managed-card-info">
                        <div className="managed-card-amount">
                          <span>Saldo a pagar</span>
                          <strong>{money(debt)}</strong>
                        </div>
                        <dl>
                          <div>
                            <dt>Compras cadastradas</dt>
                            <dd>{money(total)}</dd>
                          </div>
                          <div>
                            <dt>Total já pago</dt>
                            <dd>{money(total - debt)}</dd>
                          </div>
                          <div>
                            <dt>Parcelas neste mês</dt>
                            <dd>{money(monthTotal)}</dd>
                          </div>
                          <div>
                            <dt>Vencimento</dt>
                            <dd>Dia {card.dueDay}</dd>
                          </div>
                        </dl>
                        {card.limitCents > 0 && (
                          <div className="limit">
                            <div>
                              <span>Saldo / limite cadastrado</span>
                              <strong>
                                {Math.round((debt / card.limitCents) * 100)}%
                              </strong>
                            </div>
                            <div className="progress">
                              <i
                                style={{
                                  width: `${Math.min(100, (debt / card.limitCents) * 100)}%`,
                                  background:
                                    debt > card.limitCents
                                      ? "#dc2626"
                                      : card.color,
                                }}
                              />
                            </div>
                            <small>
                              Limite {money(card.limitCents)} · apenas compras
                              cadastradas
                            </small>
                          </div>
                        )}
                        <div className="managed-card-actions">
                          <button
                            className="text-button"
                            onClick={() => addPurchase(card.id)}
                          >
                            <Plus size={15} />
                            Nova compra
                          </button>
                          <button
                            className="icon-button"
                            title="Editar cartão"
                            aria-label={`Editar cartão ${card.name}`}
                            onClick={() => setModal({ type: "card", card })}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            disabled={saving}
                            title="Excluir cartão"
                            aria-label={`Excluir cartão ${card.name}`}
                            onClick={() => removeCard(card)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </section>
                  );
                })}
                <button
                  className="add-card-tile tall"
                  onClick={() => setModal({ type: "card" })}
                >
                  <span>
                    <Plus size={28} />
                  </span>
                  <strong>Seu próximo cartão</strong>
                  <small>Cadastre qualquer banco e acompanhe tudo junto.</small>
                </button>
              </div>
              <section className="panel card-summary">
                <div className="panel-heading">
                  <div>
                    <h2>Resumo de todos os cartões</h2>
                    <p>Histórico e compromissos das compras cadastradas</p>
                  </div>
                </div>
                {data.cards.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Cartão</th>
                          <th>Total de compras</th>
                          <th>Já pago</th>
                          <th>Saldo a pagar</th>
                          <th>Neste mês</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardData.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <span className="card-tag">
                                <span style={{ background: c.color }} />
                                {c.bank} · {c.name}
                              </span>
                            </td>
                            <td>{money(c.total)}</td>
                            <td>{money(c.total - c.debt)}</td>
                            <td>
                              <strong>{money(c.debt)}</strong>
                            </td>
                            <td>{money(c.monthly)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total de todos os cartões</td>
                          <td>{money(total)}</td>
                          <td>{money(total - debt)}</td>
                          <td>{money(debt)}</td>
                          <td>{money(monthly)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={<CreditCard size={28} />}
                    title="Seu primeiro cartão é o começo"
                    text="Cadastre o banco, um apelido e o vencimento. Não precisamos do número completo do cartão."
                  />
                )}
              </section>
            </>
          )}
          {tab === "planning" && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>O caminho até a quitação</h2>
                    <p>
                      Valores mensais previstos em R$ · até a última parcela
                    </p>
                  </div>
                  {months.length > 12 && (
                    <div className="chart-navigation">
                      <button
                        className="icon-button"
                        aria-label="Meses anteriores"
                        disabled={!chartPage}
                        onClick={() => setChartPage((p) => p - 1)}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span>
                        {chartPage + 1} / {Math.ceil(months.length / 12)}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Próximos meses"
                        disabled={(chartPage + 1) * 12 >= months.length}
                        onClick={() => setChartPage((p) => p + 1)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
                {chart(true)}
              </section>
              {months.length > 0 && (
                <section className="panel monthly-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Seu calendário de pagamentos</h2>
                      <p>
                        Selecione um mês para ver as parcelas individuais.
                        Parcelas vencidas são acumuladas no mês atual.
                      </p>
                    </div>
                    <span className="badge">{months.length} meses</span>
                  </div>
                  <div className="table-scroll forecast-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Mês</th>
                          {cardData.map((c) => (
                            <th key={c.id}>
                              <span className="card-tag">
                                <span style={{ background: c.color }} />
                                {c.name}
                              </span>
                            </th>
                          ))}
                          <th>Total do mês</th>
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
                            onExpand={() =>
                              setExpandedMonth((m) =>
                                m === row.month ? null : row.month,
                              )
                            }
                          />
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Até a quitação</td>
                          {cardData.map((c) => (
                            <td key={c.id}>{money(c.debt)}</td>
                          ))}
                          <td>{money(debt)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}
              {pieData.length > 0 && (
                <section className="panel comparison">
                  <div className="panel-heading">
                    <div>
                      <h2>Saldo por cartão</h2>
                      <p>
                        Compare quanto ainda falta pagar em cada cartão ·
                        valores em R$
                      </p>
                    </div>
                  </div>
                  <div className="bar-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cardData}
                        margin={{ top: 15, right: 20, bottom: 10, left: 10 }}
                      >
                        <CartesianGrid vertical={false} stroke="#edf0f5" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => Number(v) / 100 + ""}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                        />
                        <Tooltip
                          formatter={(v) => [money(Number(v)), "Saldo a pagar"]}
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="debt"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={80}
                        >
                          {cardData.map((c) => (
                            <Cell key={c.id} fill={c.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <LockKeyhole size={13} /> Local, privado e no seu ritmo.
            </span>
            <span>
              Saldo <span className="footer-dot">·</span> Clareza para seus
              próximos passos
            </span>
          </footer>
        </main>
      </div>
      {modal?.type === "card" && (
        <CardForm
          key={modal.card?.id ?? "new-card"}
          card={modal.card}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={async (card) =>
            commit(
              {
                ...data,
                cards: modal.card
                  ? data.cards.map((c) => (c.id === card.id ? card : c))
                  : [...data.cards, card],
              },
              "Cartão salvo. Agora você pode cadastrar suas compras.",
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
          saving={saving}
          onClose={() => setModal(null)}
          onSave={async (purchase) =>
            commit(
              {
                ...data,
                purchases: modal.purchase
                  ? data.purchases.map((p) =>
                      p.id === purchase.id ? purchase : p,
                    )
                  : [...data.purchases, purchase],
              },
              "Compra salva e planejamento atualizado.",
            )
          }
        />
      )}
      {modal?.type === "confirm" && (
        <Dialog title={modal.title} onClose={() => setModal(null)}>
          <p className="confirm-text">{modal.text}</p>
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
          <Check size={17} />
          <span>{toast}</span>
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
}: {
  row: ReturnType<typeof forecast>[number];
  cards: Card[];
  expanded: boolean;
  onExpand: () => void;
}) {
  return (
    <>
      <tr className={expanded ? "expanded-row" : ""}>
        <td>
          <button
            className="month-button"
            onClick={onExpand}
            aria-expanded={expanded}
          >
            {monthLabel(row.month)}
            {row.month === currentMonth() && (
              <span className="badge">Atual</span>
            )}
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
          <td colSpan={cards.length + 3}>
            <div className="month-details">
              {row.items.length ? (
                row.items.map((item) => (
                  <div key={`${item.purchase.id}-${item.installment}`}>
                    <ShoppingBag size={16} />
                    <span>
                      <strong>{item.purchase.description}</strong>
                      <small>
                        {cards.find((c) => c.id === item.purchase.cardId)?.name}{" "}
                        · Parcela {item.installment}/
                        {item.purchase.installments}
                      </small>
                    </span>
                    <strong>{money(item.amount)}</strong>
                  </div>
                ))
              ) : (
                <p>Nenhuma parcela prevista neste mês.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
