import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { money, monthLabel } from "../domain";

// The Recharts portal escapes panel clipping, animated stacking contexts and
// the doughnut centre. Coordinates stay in CSS pixels, including native zoom.
export const tooltipLayer = {
  position: "fixed" as const,
  inset: 0,
  pointerEvents: "none" as const,
  zIndex: 1000,
};
export function ChartTooltip({
  chartRef,
  mode = "monthly",
  active,
  payload = [],
  label,
  coordinate,
}: {
  chartRef: RefObject<HTMLDivElement | null>;
  mode?: "monthly" | "distribution" | "simulation";
  active?: boolean;
  payload?: readonly {
    name?: string | number;
    value?: unknown;
    color?: string;
  }[];
  label?: unknown;
  coordinate?: { x?: number; y?: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    if (!active || !payload.length) return;
    const place = () => {
      const chart =
        chartRef.current?.querySelector<HTMLElement>(".recharts-wrapper");
      const box = ref.current?.getBoundingClientRect();
      if (!chart || !box) return;
      const origin = chart.getBoundingClientRect();
      const x = origin.left + (coordinate?.x ?? origin.width / 2);
      const y = origin.top + (coordinate?.y ?? origin.height / 2);
      const left = Math.max(
        8,
        Math.min(x + 16, window.innerWidth - box.width - 8),
      );
      const above = y - box.height - 16;
      const top = Math.max(
        8,
        Math.min(
          above >= 8 ? above : y + 16,
          window.innerHeight - box.height - 8,
        ),
      );
      setPosition((prev) =>
        prev.left === left && prev.top === top ? prev : { left, top },
      );
    };
    place();
    const observer = new ResizeObserver(place);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [active, chartRef, coordinate?.x, coordinate?.y, payload]);
  if (!active || !payload.length) return null;
  const names: Record<string, string> =
    mode === "simulation"
      ? { before: "Sem antecipar", after: "Após quitar selecionadas" }
      : { paid: "Valores pagos", outstanding: "Ainda a pagar" };
  return (
    <div ref={ref} role="tooltip" className="chart-tooltip" style={position}>
      {mode !== "distribution" && label != null && (
        <strong>{monthLabel(String(label))}</strong>
      )}
      {payload.map((item, i) => (
        <div className="chart-tooltip-row" key={`${item.name}:${i}`}>
          <span>
            <i
              className="dot"
              style={{ background: item.color ?? "var(--accent)" }}
            />
            {names[String(item.name)] ?? item.name}
          </span>
          <b>{money(Number(item.value))}</b>
        </div>
      ))}
    </div>
  );
}
