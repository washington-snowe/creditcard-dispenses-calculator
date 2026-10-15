import { useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
export function FilterChips({
  items,
  onClear,
}: {
  items: { key: string; label: string; remove: () => void }[];
  onClear: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (restoreFocus.current === null) return;
    const chips =
      root.current?.querySelectorAll<HTMLButtonElement>(".filter-chip");
    const next = chips?.length
      ? chips[Math.min(restoreFocus.current, chips.length - 1)]
      : document.querySelector<HTMLButtonElement>(
          'button[aria-controls="purchase-filter-fields"]',
        );
    restoreFocus.current = null;
    next?.focus({ preventScroll: true });
  }, [items]);
  if (!items.length) return null;
  return (
    <div
      ref={root}
      className="filter-chips"
      role="group"
      aria-label="Filtros ativos"
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          className="filter-chip"
          aria-label={`Remover filtro ${item.label}`}
          onClick={(event) => {
            if (document.activeElement === event.currentTarget)
              restoreFocus.current = index;
            item.remove();
          }}
        >
          <span>{item.label}</span>
          <X size={14} aria-hidden="true" />
        </button>
      ))}
      <button
        className="text-button"
        aria-label="Limpar todos os filtros globais"
        onClick={() => {
          restoreFocus.current = 0;
          onClear();
        }}
      >
        Limpar todos
      </button>
    </div>
  );
}
