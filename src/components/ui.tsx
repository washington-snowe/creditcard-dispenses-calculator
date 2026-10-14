import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  ChartNoAxesCombined,
  CreditCard,
  LockKeyhole,
  Radio,
  Sparkles,
  X,
} from "lucide-react";
import type { Card } from "../domain";
export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">
            <Sparkles size={12} /> SEU PRÓXIMO PASSO
          </span>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title,
  text,
  action,
  icon = <ChartNoAxesCombined size={26} />,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: ReactNode;
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
export function PlasticCard({
  card,
  compact = false,
}: {
  card: Card;
  compact?: boolean;
}) {
  return (
    <div
      className={`plastic-card ${compact ? "compact" : ""}`}
      style={{ "--card-color": card.color } as CSSProperties}
    >
      <div className="card-orbit orbit-one" />
      <div className="card-orbit orbit-two" />
      <div className="card-grain" />
      <div className="plastic-top">
        <div className="plastic-brand">
          <span>{card.bank.slice(0, 2).toUpperCase()}</span>
          <strong>{card.bank}</strong>
        </div>
        <Radio size={23} />
      </div>
      <div className="chip-row">
        <div className="chip">
          <i />
          <i />
          <i />
          <i />
        </div>
        <span>CRÉDITO</span>
      </div>
      <div className="card-digits">
        •••• <span>••••</span> <span>••••</span> {card.last4 || "••••"}
      </div>
      <div className="plastic-bottom">
        <div>
          <small>SEU CARTÃO</small>
          <strong>{card.name || "Meu cartão"}</strong>
        </div>
        <CreditCard size={26} />
      </div>
    </div>
  );
}
export function LocalNote() {
  return (
    <span className="local-note">
      <LockKeyhole size={13} /> Seus dados continuam neste dispositivo.
    </span>
  );
}
