import { SuggestionInput } from "./suggestion-input";
import { CategoryHint, useSmartCategory } from "./smart-category";
import { EXAMPLES, nameOptions, categoryHistory } from "../suggestions";
import { useMemo, useState } from "react";
import { Check, Pencil, Repeat, Search, Trash2 } from "lucide-react";
import {
  CATEGORIES,
  currentMonth,
  money,
  monthLabel,
  parseMoney,
  type Data,
  type Subscription,
} from "../domain";
import { FREQUENCIES, subscriptionMonth } from "../finance";
import { Dialog, Empty, Panel } from "./ui";
export function SubscriptionForm({
  subscription,
  data,
  month,
  saving,
  onSave,
  onClose,
}: {
  subscription?: Subscription;
  data: Data;
  month: string;
  saving: boolean;
  onSave: (s: Subscription) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(subscription?.name ?? ""),
    [provider, setProvider] = useState(subscription?.provider ?? "");
  const [amount, setAmount] = useState(
    subscription
      ? (subscription.amountCents / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [frequency, setFrequency] = useState(
    subscription?.frequency ?? "monthly",
  );
  const history = useMemo(() => categoryHistory(data, "subscription"), [data]);
  const names = useMemo(
    () =>
      nameOptions(
        history.map((x) => x.name),
        EXAMPLES.subscription,
      ),
    [history],
  );
  const providers = useMemo(
    () =>
      nameOptions(
        (data.subscriptions ?? []).map((x) => x.provider),
        [
          "Netflix",
          "Spotify",
          "Amazon",
          "Google",
          "Microsoft",
          "Apple",
          "Academia",
        ],
      ),
    [data],
  );
  const smart = useSmartCategory(
    subscription?.category ?? "Outros",
    !!subscription,
    history,
  );
  const { category } = smart;
  const [card, setCard] = useState(subscription?.cardId ?? ""),
    [due, setDue] = useState(String(subscription?.dueDay ?? 10));
  const [start, setStart] = useState(subscription?.startMonth ?? month),
    [end, setEnd] = useState(subscription?.endMonth ?? "");
  const [error, setError] = useState("");
  return (
    <Dialog
      title={subscription ? "Editar assinatura" : "Uma nova assinatura"}
      subtitle="Recorrências entram no seu orçamento automaticamente."
      onClose={onClose}
    >
      <form
        className="simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            const cents = parseMoney(amount);
            if (!name.trim() || !provider.trim() || !cents)
              throw new Error(
                "Informe nome, fornecedor e valor maior que zero.",
              );
            if (end && end < start)
              throw new Error("O mês final não pode ser anterior ao início.");
            if (
              await onSave({
                id: subscription?.id ?? crypto.randomUUID(),
                name: name.trim(),
                provider: provider.trim(),
                amountCents: cents,
                frequency,
                category,
                cardId: card || null,
                dueDay: Number(due),
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
        <label>
          Nome da assinatura
          <SuggestionInput
            aria-label="Nome da assinatura"
            autoFocus
            required
            maxLength={100}
            value={name}
            onValueChange={(value) => {
              setName(value);
              smart.onName(value);
            }}
            suggestions={names}
            placeholder="Ex.: Netflix, academia, armazenamento..."
          />
        </label>
        <label>
          Fornecedor da assinatura
          <SuggestionInput
            aria-label="Fornecedor da assinatura"
            required
            maxLength={80}
            value={provider}
            onValueChange={setProvider}
            suggestions={providers}
            placeholder="Ex.: Netflix, Google, academia"
          />
        </label>
        <div className="form-row">
          <label>
            Valor da cobrança
            <div className="money-field">
              <span>R$</span>
              <input
                required
                aria-label="Valor da cobrança"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </label>
          <label>
            Frequência
            <select
              aria-label="Frequência da assinatura"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as Subscription["frequency"])
              }
            >
              {Object.entries(FREQUENCIES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Cartão da assinatura
            <select
              aria-label="Cartão da assinatura"
              value={card}
              onChange={(e) => setCard(e.target.value)}
            >
              <option value="">Fora dos cartões / débito</option>
              {data.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.bank} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dia da cobrança
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
          Categoria
          <select
            aria-label="Categoria da assinatura"
            value={category}
            onChange={(e) => smart.choose(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <CategoryHint state={smart} name={name} />
        <div className="form-row">
          <label>
            Mês de início
            <input
              type="month"
              required
              min="2000-01"
              max="2199-12"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <details className="more-details" open={!!subscription || undefined}>
            <summary>Encerrar cobranças</summary>{" "}
            <label>
              Último mês de cobrança <small>opcional</small>
              <input
                type="month"
                min={start}
                max="2199-12"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </details>
        </div>
        <p className="field-hint">
          No cartão, a cobrança será incluída na fatura cadastrada. Não cadastre
          a mesma assinatura como compra parcelada. Meses antigos não são
          acumulados automaticamente. Valores já pagos são preservados ao editar
          a assinatura.
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
            Salvar assinatura
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function SubscriptionsPage({
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
  onEdit: (s: Subscription) => void;
  onDelete: (s: Subscription) => void;
  onPay: (s: Subscription) => void;
  onUnpay: (s: Subscription) => void;
}) {
  const [search, setSearch] = useState(""),
    [card, setCard] = useState("all"),
    [frequency, setFrequency] = useState("all");
  const subs = data.subscriptions ?? [],
    occurrences = subscriptionMonth(
      subs,
      data.subscriptionPayments ?? [],
      month,
    );
  const byId = new Map(occurrences.map((item) => [item.subscription.id, item]));
  const rows = subs.filter(
    (s) =>
      `${s.name} ${s.provider}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")) &&
      (card === "all" ||
        (byId.has(s.id) ? byId.get(s.id)!.cardId : s.cardId) ===
          (card === "none" ? null : card)) &&
      (frequency === "all" || s.frequency === frequency),
  );
  const total = occurrences.reduce((sum, i) => sum + i.amount, 0),
    paid = occurrences
      .filter((i) => i.paid)
      .reduce((sum, i) => sum + i.amount, 0);
  return (
    <>
      <div className="stats-grid subscription-stats">
        <div className="stat-card debt">
          <div className="stat-title">
            Assinaturas neste mês
            <span className="stat-icon">
              <Repeat size={18} />
            </span>
          </div>
          <strong data-testid="subscription-total">{money(total)}</strong>
          <div className="stat-foot">
            {occurrences.length} cobranças em {monthLabel(month, true)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">
            Já pagas no período
            <span className="stat-icon green">
              <Check size={18} />
            </span>
          </div>
          <strong>{money(paid)}</strong>
          <div className="stat-foot">Pendente: {money(total - paid)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Nos cartões</div>
          <strong>
            {money(
              occurrences
                .filter((i) => i.cardId !== null)
                .reduce((sum, i) => sum + i.amount, 0),
            )}
          </strong>
          <div className="stat-foot">Incluídas nas faturas cadastradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Fora dos cartões</div>
          <strong>
            {money(
              occurrences
                .filter((i) => i.cardId === null)
                .reduce((sum, i) => sum + i.amount, 0),
            )}
          </strong>
          <div className="stat-foot">
            Também descontadas no orçamento mensal
          </div>
        </div>
      </div>
      <Panel
        title="Suas recorrências"
        subtitle="Os filtros alteram a listagem; o resumo mostra o mês inteiro."
      >
        <div className="ledger-filters">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Buscar assinaturas"
              placeholder="Buscar assinatura ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar cartão das assinaturas"
            value={card}
            onChange={(e) => setCard(e.target.value)}
          >
            <option value="all">Todos os cartões</option>
            <option value="none">Fora dos cartões</option>
            {data.cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar frequência das assinaturas"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="all">Todas as frequências</option>
            {Object.entries(FREQUENCIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table className="subscription-table">
              <thead>
                <tr>
                  <th>Assinatura</th>
                  <th>Pagamento</th>
                  <th>Cobrança</th>
                  <th>Mês selecionado</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const occurrence = byId.get(s.id);
                  const cardId = occurrence ? occurrence.cardId : s.cardId;
                  const c = data.cards.find((c) => c.id === cardId);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="purchase-name">
                          <span className="category-icon">
                            <Repeat size={17} />
                          </span>
                          <div>
                            <strong>{s.name}</strong>
                            <small>
                              {s.provider} · {s.category}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c ? `${c.bank} · ${c.name}` : "Fora dos cartões"}
                      </td>
                      <td>
                        <strong>
                          {money(occurrence?.amount ?? s.amountCents)}
                        </strong>
                        <small className="cell-small">
                          {FREQUENCIES[s.frequency]} · dia {s.dueDay}
                        </small>
                        {occurrence?.paid &&
                          occurrence.amount !== s.amountCents && (
                            <small className="cell-small">
                              Preço atual: {money(s.amountCents)}
                            </small>
                          )}
                      </td>
                      <td>
                        {occurrence ? (
                          <>
                            <span
                              className={`badge ${occurrence.paid ? "green" : "warning"}`}
                            >
                              {occurrence.paid ? "Paga" : "A pagar"}
                            </span>
                            <small className="cell-small">
                              {occurrence.dueDate
                                .split("-")
                                .reverse()
                                .join("/")}
                            </small>
                          </>
                        ) : (
                          <span className="badge">
                            {s.endMonth && month > s.endMonth
                              ? "Encerrada"
                              : month < s.startMonth
                                ? "Ainda não iniciou"
                                : "Sem renovação"}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {occurrence && (
                            <button
                              className={`icon-button ${occurrence.paid ? "" : "pay"}`}
                              disabled={saving || month > currentMonth()}
                              aria-label={`${occurrence.paid ? "Desmarcar" : "Pagar"} assinatura ${s.name}`}
                              onClick={() =>
                                occurrence.paid ? onUnpay(s) : onPay(s)
                              }
                              title={
                                occurrence.paid
                                  ? "Corrigir pagamento"
                                  : "Registrar pagamento"
                              }
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            disabled={saving}
                            aria-label={`Editar assinatura ${s.name}`}
                            onClick={() => onEdit(s)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-text"
                            disabled={saving}
                            aria-label={`Excluir assinatura ${s.name}`}
                            onClick={() => onDelete(s)}
                          >
                            <Trash2 size={15} />
                          </button>
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
            icon={<Repeat size={25} />}
            title="Suas assinaturas, organizadas"
            text="Cadastre recorrências ou ajuste a busca para acompanhar as cobranças."
          />
        )}
        <div className="table-footer">
          {rows.length} assinaturas nos filtros · cobranças anuais e trimestrais
          entram somente no mês da renovação
        </div>
      </Panel>
    </>
  );
}
