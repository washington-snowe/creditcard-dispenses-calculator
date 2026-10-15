import type { PurchaseDraft } from "./workbench";
import { SuggestionInput } from "./suggestion-input";
import { CategoryHint, useSmartCategory } from "./smart-category";
import { EXAMPLES, nameOptions, categoryHistory } from "../suggestions";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  BANKS,
  CATEGORIES,
  COLORS,
  addMonths,
  currentMonth,
  installmentAmount,
  money,
  moneyInput,
  monthLabel,
  parseMoney,
  remaining,
  type Data,
  type Card,
  type Purchase,
} from "../domain";
import { Dialog, PlasticCard } from "./ui";
const uid = () => crypto.randomUUID();
export function CardForm({
  card,
  data,
  saving,
  onSave,
  onClose,
}: {
  card?: Card;
  data?: Data;
  saving: boolean;
  onSave: (card: Card) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(card?.name ?? "");
  const names = useMemo(
    () => nameOptions(data?.cards.map((c) => c.name) ?? [], EXAMPLES.card),
    [data],
  );
  const [bank, setBank] = useState(
    card && !BANKS.includes(card.bank) ? "Outro" : (card?.bank ?? "Nubank"),
  );
  const [customBank, setCustomBank] = useState(card?.bank ?? "");
  const [last4, setLast4] = useState(card?.last4 ?? "");
  const [color, setColor] = useState(card?.color ?? COLORS[0]);
  const [closing, setClosing] = useState(String(card?.closingDay ?? ""));
  const [due, setDue] = useState(String(card?.dueDay ?? 10));
  const [limit, setLimit] = useState(
    card?.limitCents ? moneyInput(card.limitCents) : "",
  );
  const [error, setError] = useState("");
  const preview: Card = {
    id: card?.id ?? "",
    name: name || "Meu cartão",
    bank: bank === "Outro" ? customBank || "Seu banco" : bank,
    last4,
    color,
    dueDay: Number(due),
    ...(closing ? { closingDay: Number(closing) } : {}),
    limitCents: 0,
  };
  return (
    <Dialog
      wide
      title={card ? "Editar cartão" : "Um novo cartão"}
      subtitle="Um cartão com a sua cara. Todos os seus bancos em um só lugar."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            if (!name.trim() || (bank === "Outro" && !customBank.trim()))
              throw new Error("Informe o nome do cartão e o banco.");
            if (last4 && !/^\d{4}$/.test(last4))
              throw new Error(
                "Informe quatro dígitos ou deixe o campo em branco.",
              );
            if (
              await onSave({
                ...preview,
                id: card?.id ?? uid(),
                name: name.trim(),
                bank: bank === "Outro" ? customBank.trim() : bank,
                limitCents: limit.trim() ? parseMoney(limit) : 0,
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div className="form-layout">
          <div className="form-main">
            <div className="form-section-title">
              <span>01</span>
              <div>
                <h3>Identidade do cartão</h3>
                <p>Um apelido ajuda a encontrar o cartão certo.</p>
              </div>
            </div>
            <label>
              Nome do cartão
              <SuggestionInput
                aria-label="Nome do cartão"
                autoFocus
                required
                maxLength={50}
                value={name}
                onValueChange={setName}
                suggestions={names}
                placeholder="Ex.: Meu roxinho"
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
                <SuggestionInput
                  aria-label="Nome do banco"
                  required
                  maxLength={50}
                  value={customBank}
                  onValueChange={setCustomBank}
                  suggestions={BANKS.filter((b) => b !== "Outro")}
                  placeholder="Seu banco"
                />
              </label>
            )}
            <div className="form-row">
              <label>
                Dia de vencimento
                <input
                  type="number"
                  required
                  min={1}
                  max={31}
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
            </div>
            <label>
              Dia de fechamento <small>opcional</small>
              <input
                aria-label="Dia de fechamento"
                type="number"
                min={1}
                max={31}
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                placeholder="Confira no banco"
              />
              <span className="field-hint">
                Permite sugerir o melhor cartão para cada dia.
              </span>
            </label>
            <details className="more-details" open={!!card || undefined}>
              <summary>Mais opções do cartão</summary>
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
                <legend>Escolha a cor</legend>
                <div className="color-options">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`color-option ${color === c ? "selected" : ""}`}
                      aria-label={`Cor ${c}`}
                      aria-pressed={color === c}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    >
                      {color === c && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </fieldset>
            </details>
          </div>
          <aside className="form-summary card-preview">
            <span className="eyebrow">PRÉVIA DO SEU CARTÃO</span>
            <PlasticCard card={preview} />
            <div className="summary-note">
              <CreditCard size={18} />
              <p>
                Cadastre apenas os últimos quatro dígitos. Não precisamos de
                senha, CVV ou número completo.
              </p>
            </div>
            <div className="summary-line">
              <span>Vencimento</span>
              <strong>Dia {due || "—"}</strong>
            </div>
            <div className="summary-line">
              <span>Uso</span>
              <strong>Compras e parcelas</strong>
            </div>
          </aside>
        </div>
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
            Salvar cartão <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function PurchaseForm({
  purchase,
  data,
  cards,
  cardId,
  saving,
  hasHistory = false,
  draft,
  onSave,
  onClose,
}: {
  purchase?: Purchase;
  data?: Data;
  cards: Card[];
  cardId?: string;
  saving: boolean;
  hasHistory?: boolean;
  draft?: PurchaseDraft;
  onSave: (p: Purchase) => Promise<boolean>;
  onClose: () => void;
}) {
  const initial =
    cards.find((c) => c.id === (purchase?.cardId ?? cardId)) ?? cards[0];
  const [description, setDescription] = useState(purchase?.description ?? "");
  const [bank, setBank] = useState(initial.bank);
  const [selectedCard, setSelectedCard] = useState(initial.id);
  const [total, setTotal] = useState(
    purchase
      ? moneyInput(purchase.totalCents)
      : draft
        ? moneyInput(draft.totalCents)
        : "",
  );
  const [mode, setMode] = useState("total");
  const [installments, setInstallments] = useState(
    String(purchase?.installments ?? draft?.installments ?? 1),
  );
  const [paid, setPaid] = useState(String(purchase?.paid ?? 0));
  const [month, setMonth] = useState(
    purchase?.nextMonth ?? draft?.nextMonth ?? currentMonth(),
  );
  const history = useMemo(() => categoryHistory(data, "purchase"), [data]);
  const names = useMemo(
    () =>
      nameOptions(
        history.map((x) => x.name),
        EXAMPLES.purchase,
      ),
    [history],
  );
  const smart = useSmartCategory(
    purchase?.category ?? CATEGORIES[0]!,
    !!purchase,
    history,
  );
  const { category } = smart;
  const [error, setError] = useState("");
  const selected = cards.find((c) => c.id === selectedCard)!;
  let preview: Purchase | null = null;
  try {
    const count = Number(installments),
      done = Number(paid),
      cents = parseMoney(total) * (mode === "installment" ? count : 1);
    if (
      Number.isInteger(count) &&
      count >= 1 &&
      count <= 600 &&
      cents >= count &&
      Number.isInteger(done) &&
      done >= 0 &&
      done <= count &&
      cents <= 100_000_000_000
    )
      preview = {
        id: purchase?.id ?? "",
        description,
        cardId: selectedCard,
        category,
        totalCents: cents,
        installments: count,
        paid: done,
        nextMonth: month,
      };
  } catch {
    /* Incomplete fields have no calculated summary. */
  }
  const last =
    preview && preview.paid < preview.installments && month
      ? addMonths(month, preview.installments - preview.paid - 1)
      : null;
  return (
    <Dialog
      wide
      title={purchase ? "Editar compra" : "Adicionar uma compra"}
      subtitle="Os detalhes de um lado. Seu planejamento do outro."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            if (!description.trim()) throw new Error("Dê um nome à compra.");
            if (Number(paid) > Number(installments))
              throw new Error("As parcelas pagas não podem superar o total.");
            if (!preview)
              throw new Error("Confira o valor e o número de parcelas.");
            if (
              await onSave({
                ...preview,
                ...(purchase?.importKey
                  ? { importKey: purchase.importKey }
                  : {}),
                id: purchase?.id ?? uid(),
                description: description.trim(),
              })
            )
              onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div className="form-layout">
          <div className="form-main">
            <div className="form-section-title">
              <span>01</span>
              <div>
                <h3>A compra</h3>
                <p>O que você comprou e onde vai pagar.</p>
              </div>
            </div>
            <label>
              Descrição da compra
              <SuggestionInput
                aria-label="Descrição da compra"
                autoFocus
                required
                maxLength={100}
                value={description}
                onValueChange={(value) => {
                  setDescription(value);
                  smart.onName(value);
                }}
                suggestions={names}
                placeholder="Ex.: Notebook, sofá ou uma viagem"
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
                  {cards
                    .filter((c) => c.bank === bank)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.last4 ? ` · ${c.last4}` : ""}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Categoria
                <select
                  aria-label="Categoria"
                  value={category}
                  onChange={(e) => smart.choose(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Como informar o valor
                <select
                  aria-label="Como informar o valor"
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setTotal("");
                  }}
                >
                  <option value="total">Valor total da compra</option>
                  <option value="installment">Valor de cada parcela</option>
                </select>
              </label>
            </div>
            <CategoryHint state={smart} name={description} />
            <label>
              {mode === "total"
                ? "Valor total da compra"
                : "Valor de cada parcela"}
              <div className="money-field large">
                <span>R$</span>
                <input
                  required
                  aria-label={
                    mode === "total"
                      ? "Valor total da compra"
                      : "Valor de cada parcela"
                  }
                  inputMode="decimal"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <span className="field-hint">
                {mode === "total"
                  ? "Inclua os juros no valor final, se houver."
                  : "O total será este valor multiplicado pelas parcelas."}
              </span>
            </label>
            <div className="form-section-title second">
              <span>02</span>
              <div>
                <h3>O parcelamento</h3>
                <p>Informe como está o pagamento hoje.</p>
              </div>
            </div>
            <div className="form-row">
              <label>
                Número de parcelas
                <input
                  type="number"
                  required
                  min={1}
                  max={600}
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </label>
              <details className="more-details" open={!!purchase || undefined}>
                <summary>Já pagou parcelas?</summary>
                <label>
                  Parcelas já pagas
                  <input
                    type="number"
                    required
                    min={0}
                    max={Number(installments)}
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                  />
                </label>
              </details>
            </div>
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
              <span className="field-hint">
                A primeira parcela que ainda falta pagar.
              </span>
            </label>
            {hasHistory && (
              <p className="field-hint">
                Alterar o valor ou o número total de parcelas recalcula o
                histórico desta compra. Ao corrigir parcelas pagas, atualize
                também o mês da próxima parcela.
              </p>
            )}
          </div>
          <aside className="form-summary">
            <span className="eyebrow">SEU PLANEJAMENTO, AO VIVO</span>
            <div className="summary-icon">
              <ShoppingBag size={23} />
            </div>
            <h3>{description || "Sua nova compra"}</h3>
            <div className="summary-card">
              <span className="dot" style={{ background: selected.color }} />
              {selected.bank} · {selected.name}
            </div>
            <div className="preview-value">
              <small>Saldo a pagar</small>
              <strong data-testid="purchase-preview-debt">
                {preview ? money(remaining(preview)) : "R$ —"}
              </strong>
            </div>
            <div className="summary-line">
              <span>
                <Wallet size={14} /> Valor total
              </span>
              <strong>{preview ? money(preview.totalCents) : "—"}</strong>
            </div>
            <div className="summary-line">
              <span>
                <CreditCard size={14} /> Próxima parcela
              </span>
              <strong>
                {preview
                  ? money(
                      preview.paid === preview.installments
                        ? 0
                        : installmentAmount(preview, preview.paid),
                    )
                  : "—"}
              </strong>
            </div>
            <div className="summary-line">
              <span>
                <Check size={14} /> Pagas / total
              </span>
              <strong>
                {paid || "0"} / {installments || "—"}
              </strong>
            </div>
            <div className="summary-line">
              <span>
                <CalendarDays size={14} /> Última parcela
              </span>
              <strong>{last ? monthLabel(last, true) : "—"}</strong>
            </div>
            <div className="summary-note">
              <Check size={17} />
              <p>
                Centavos ajustados automaticamente. O total das parcelas sempre
                fecha com o valor da compra.
              </p>
            </div>
          </aside>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <span className="footer-helper">
            Tudo salvo somente no seu dispositivo.
          </span>
          <button
            type="button"
            className="button secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={saving}>
            Salvar compra <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
