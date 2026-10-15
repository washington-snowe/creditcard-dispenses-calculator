import { BankLogo } from "./bank-logo";
import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  const titleId = useId();
  const backdropPress = useRef(false);
  useEffect(() => {
    const element = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      requestAnimationFrame(() => {
        if (document.querySelector("dialog[open]")) return;
        if (opener?.isConnected && !opener.closest("dialog"))
          opener.focus({ preventScroll: true });
        else
          document
            .querySelector<HTMLElement>("main h1")
            ?.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        backdropPress.current =
          e.target === e.currentTarget &&
          (e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom);
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (
          backdropPress.current &&
          e.target === e.currentTarget &&
          (e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom)
        )
          onClose();
        backdropPress.current = false;
      }}
    >
      <div className="dialog-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
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
          <BankLogo bank={card.bank} />
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
