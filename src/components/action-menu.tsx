import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
export function ActionMenu({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => popover.current?.hidePopover();
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className="icon-button"
        type="button"
        disabled={disabled}
        aria-label={label}
        title="Mais opções"
        popoverTarget={id}
        aria-expanded={open}
      >
        <Ellipsis size={18} />
      </button>
      <div
        ref={popover}
        id={id}
        className="action-popover"
        popover="auto"
        role="group"
        aria-label={label}
        onBeforeToggle={(event) => {
          if (event.newState === "open" && popover.current)
            popover.current.style.visibility = "hidden";
        }}
        onToggle={(event) => {
          const showing = event.newState === "open";
          setOpen(showing);
          const el = popover.current,
            anchor = trigger.current;
          if (showing && el && anchor) {
            const a = anchor.getBoundingClientRect(),
              b = el.getBoundingClientRect();
            el.style.left = `${Math.max(8, Math.min(a.right - b.width, innerWidth - b.width - 8))}px`;
            el.style.top = `${Math.max(8, Math.min(a.bottom + 8 + b.height > innerHeight ? a.top - b.height - 8 : a.bottom + 8, innerHeight - b.height - 8))}px`;
            el.style.visibility = "visible";
            el.querySelector<HTMLElement>("button:not(:disabled)")?.focus({
              preventScroll: true,
            });
          }
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button"))
            popover.current?.hidePopover();
        }}
      >
        {children}
      </div>
    </>
  );
}
