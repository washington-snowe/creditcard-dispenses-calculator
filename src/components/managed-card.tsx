import { subscriptionMonth } from "../finance";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCheck,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { money, monthLabel, remaining, type Card, type Data } from "../domain";
import { ActionMenu } from "./action-menu";
import { BankLogo } from "./bank-logo";
import { Dialog, PlasticCard } from "./ui";

type CardSummary = Card & {
  usedCents: number;
  bill: { total: number; outstanding: number };
};
export function ManagedCard({
  card,
  data,
  month,
  today,
  saving,
  onEdit,
  onDelete,
  onPurchase,
  children,
}: {
  card: CardSummary;
  data: Data;
  month: string;
  today: string;
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPurchase: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const paid = card.bill.total > 0 && card.bill.outstanding === 0;
  const overdue =
    card.bill.outstanding > 0 &&
    (month < today || (month === today && card.dueDay < new Date().getDate()));
  // Keep closed tiles inexpensive; derive the detailed records only on demand.
  const subscriptions = open
    ? subscriptionMonth(
        data.subscriptions ?? [],
        data.subscriptionPayments ?? [],
        month,
      ).filter((s) => s.cardId === card.id)
    : [];
  const purchases = open
    ? data.purchases.filter((p) => p.cardId === card.id)
    : [];
  const purchaseNames = new Map(purchases.map((p) => [p.id, p.description]));
  const subscriptionNames = new Map(
    open ? (data.subscriptions ?? []).map((s) => [s.id, s.name]) : [],
  );
  const payments = open
    ? [
        ...(data.payments ?? [])
          .filter((p) => purchaseNames.has(p.purchaseId))
          .map((p) => ({
            ...p,
            key: `purchase:${p.id}`,
            label: purchaseNames.get(p.purchaseId),
            detail: `Parcela ${p.installment}`,
          })),
        ...(data.subscriptionPayments ?? [])
          .filter((p) => p.cardId === card.id)
          .map((p) => ({
            ...p,
            key: `subscription:${p.id}`,
            label: subscriptionNames.get(p.subscriptionId),
            detail: "Assinatura",
          })),
      ].sort((a, b) => b.paidMonth.localeCompare(a.paidMonth))
    : [];
  return (
    <section
      className="managed-card card-tile"
      style={{ "--card-color": card.color } as CSSProperties}
      aria-label={`Cartão ${card.name}`}
    >
      <header className="card-tile-heading">
        <span className="bank-identity">
          <BankLogo bank={card.bank} />
        </span>
        <div>
          <h2>{card.name}</h2>
          <p>
            {card.bank}
            {card.last4 && ` · ${card.last4}`}
          </p>
        </div>
        <ActionMenu
          label={`Mais opções do cartão ${card.name}`}
          disabled={saving}
        >
          <button onClick={onPurchase}>
            <Plus size={16} /> Nova compra neste cartão
          </button>
          <button aria-label={`Editar cartão ${card.name}`} onClick={onEdit}>
            <Pencil size={16} /> Editar cartão
          </button>
          <button
            className="danger-text"
            aria-label={`Excluir cartão ${card.name}`}
            onClick={onDelete}
          >
            <Trash2 size={16} /> Excluir cartão
          </button>
        </ActionMenu>
      </header>
      <div className="card-tile-balance">
        <span>Fatura cadastrada · {monthLabel(month, true)}</span>
        <strong>{money(card.bill.outstanding)}</strong>
      </div>
      <div
        className="card-tile-limit"
        data-tone={
          card.limitCents > 0 && card.usedCents > card.limitCents
            ? "danger"
            : undefined
        }
      >
        <span>
          {card.limitCents > 0 && card.usedCents > card.limitCents
            ? "Limite informado excedido"
            : "Limite disponível estimado"}
        </span>
        <strong>
          {card.limitCents > 0
            ? money(Math.max(0, card.limitCents - card.usedCents))
            : "Não informado"}
        </strong>
      </div>
      <footer className="card-tile-footer">
        <span
          className="card-state"
          data-tone={
            paid
              ? "success"
              : overdue
                ? "danger"
                : card.bill.outstanding > 0
                  ? "warning"
                  : "info"
          }
        >
          {paid ? <CheckCheck size={15} /> : <Clock size={15} />}
          {paid
            ? month === today
              ? "Pago neste mês"
              : "Parcelas pagas"
            : card.bill.outstanding > 0
              ? `${overdue ? "Em atraso · dia" : "Vence dia"} ${card.dueDay}`
              : "Sem cobranças"}
        </span>
        <button
          className="text-button"
          aria-label={`Ver detalhes do cartão ${card.name}`}
          onClick={() => setOpen(true)}
        >
          Ver detalhes <ArrowRight size={15} />
        </button>
      </footer>
      {open && (
        <Dialog
          wide
          title={`Detalhes de ${card.name}`}
          subtitle={`${card.bank} · ${monthLabel(month)}`}
          onClose={() => setOpen(false)}
        >
          <div className="card-details-body">
            <div className="card-details-layout">
              <PlasticCard card={card} />
              {children(() => setOpen(false))}
            </div>
            <p className="field-hint card-limit-note">
              O limite é uma estimativa baseada no valor informado e no saldo
              total das compras cadastradas, sem os filtros. Consulte o banco
              para o limite real.
            </p>
            <details className="more-details card-records">
              <summary>Compras neste cartão ({purchases.length})</summary>
              {purchases.length ? (
                <ul>
                  {purchases.map((p) => (
                    <li key={p.id}>
                      <span>
                        <strong>{p.description}</strong>
                        <small>
                          {p.paid}/{p.installments} parcelas pagas
                        </small>
                      </span>
                      <strong>{money(remaining(p))}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-hint">
                  Nenhuma compra cadastrada neste cartão.
                </p>
              )}
            </details>
            <details className="more-details card-records">
              <summary>Assinaturas na fatura ({subscriptions.length})</summary>
              {subscriptions.length ? (
                <ul>
                  {subscriptions.map((s) => (
                    <li key={s.subscription.id}>
                      <span>
                        <strong>{s.subscription.name}</strong>
                        <small>
                          {s.paid ? "Paga" : "Pendente"} ·{" "}
                          {s.dueDate.split("-").reverse().join("/")}
                        </small>
                      </span>
                      <strong>{money(s.amount)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-hint">Nenhuma assinatura nesta fatura.</p>
              )}
            </details>
            <details className="more-details card-records">
              <summary>Histórico de pagamentos ({payments.length})</summary>
              {payments.length ? (
                <ul>
                  {payments.map((p) => (
                    <li key={p.key}>
                      <span>
                        <strong>{p.label}</strong>
                        <small>
                          {monthLabel(p.paidMonth, true)} · {p.detail}
                        </small>
                      </span>
                      <strong>{money(p.amountCents)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-hint">
                  Nenhum pagamento registrado para este cartão.
                </p>
              )}
            </details>
          </div>
          <div className="dialog-footer">
            <button
              className="button secondary"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Editar cartão
            </button>
            <button
              className="button primary"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                onPurchase();
              }}
            >
              Nova compra neste cartão
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
