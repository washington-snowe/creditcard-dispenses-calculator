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
    popover = useRef<HTMLDivElement>(null),
    requestedFocus = useRef<"first" | "last" | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (
        event.target instanceof Node &&
        popover.current?.contains(event.target)
      )
        return;
      popover.current?.hidePopover();
    };
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
        onKeyDown={(event) => {
          const el = popover.current;
          if (
            !el ||
            !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
          )
            return;
          if (
            !el.matches(":popover-open") &&
            ["Home", "End"].includes(event.key)
          )
            return;
          event.preventDefault();
          requestedFocus.current = ["ArrowUp", "End"].includes(event.key)
            ? "last"
            : "first";
          if (!el.matches(":popover-open")) el.showPopover();
          else if (getComputedStyle(el).visibility === "visible") {
            const buttons = el.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            );
            buttons[
              requestedFocus.current === "last" ? buttons.length - 1 : 0
            ]?.focus();
            requestedFocus.current = null;
          }
        }}
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
            if (!el.contains(document.activeElement)) {
              const buttons = el.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              );
              buttons[
                requestedFocus.current === "last" ? buttons.length - 1 : 0
              ]?.focus({ preventScroll: true });
            }
            requestedFocus.current = null;
          }
        }}
        onKeyDown={(event) => {
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          if (!buttons.length) return;
          event.preventDefault();
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length
          ].focus();
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) {
            popover.current?.hidePopover();
            trigger.current?.focus({ preventScroll: true });
          }
        }}
      >
        {children}
      </div>
    </>
  );
}
