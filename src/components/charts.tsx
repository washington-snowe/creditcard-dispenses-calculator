import { useRef } from "react";
import { ChartTooltip, tooltipLayer } from "./chart-tooltip";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  isFinancialPrivate,
  addMonths,
  money,
  monthLabel,
  monthSnapshot,
  type Card,
  type Payment,
  type Purchase,
  type Subscription,
  type SubscriptionPayment,
} from "../domain";
import { subscriptionMonth } from "../finance";
import { Empty } from "./ui";
const axis = { fill: "var(--muted)", fontSize: "var(--text-caption)" };
const tickMoney = (cents: number) =>
  isFinancialPrivate()
    ? "•••"
    : cents >= 100000
      ? `${(cents / 100000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
      : `${cents / 100}`;
export function MonthlyChart({
  purchases,
  payments,
  start,
  count = 6,
  onMonth,
  subscriptions = [],
  subscriptionPayments = [],
}: {
  purchases: Purchase[];
  payments: Payment[];
  start: string;
  count?: number;
  onMonth?: (month: string) => void;
  subscriptions?: Subscription[];
  subscriptionPayments?: SubscriptionPayment[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rows = Array.from({ length: count }, (_, i) => {
    const month = addMonths(start, i),
      base = monthSnapshot(purchases, payments, month);
    const recurring = subscriptionMonth(
      subscriptions,
      subscriptionPayments,
      month,
    );
    return {
      ...base,
      outstanding:
        base.outstanding +
        recurring.filter((i) => !i.paid).reduce((sum, i) => sum + i.amount, 0),
      paid:
        base.paid +
        recurring.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0),
    };
  });
  if (!purchases.length && !subscriptions.length)
    return (
      <Empty
        title="Seu futuro começa aqui"
        text="Adicione uma compra para ver pagamentos e previsões."
      />
    );
  return (
    <>
      <div ref={chartRef} className="chart chart-monthly">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 22, right: 18, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--grid)"
              strokeDasharray="4 5"
            />
            <XAxis
              dataKey="month"
              tickFormatter={(month) => monthLabel(month, true)}
              axisLine={false}
              tickLine={false}
              tick={axis}
              dy={8}
            />
            <YAxis
              tickFormatter={tickMoney}
              axisLine={false}
              tickLine={false}
              tick={axis}
              width="auto"
            />
            <Tooltip
              cursor={{ fill: "var(--hover)" }}
              portal={document.body}
              wrapperStyle={tooltipLayer}
              content={<ChartTooltip chartRef={chartRef} />}
            />
            <Bar
              isAnimationActive={false}
              dataKey="paid"
              onClick={(_entry, index) => onMonth?.(rows[index].month)}
              cursor={onMonth ? "pointer" : "default"}
              stackId="month"
              fill="var(--success)"
              maxBarSize={48}
            />
            <Bar
              isAnimationActive={false}
              dataKey="outstanding"
              onClick={(_entry, index) => onMonth?.(rows[index].month)}
              cursor={onMonth ? "pointer" : "default"}
              stackId="month"
              fill="var(--warning)"
              radius={[7, 7, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-month-links">
        <summary>Abrir detalhes de um mês</summary>
        <div>
          {rows.map((r) => (
            <button
              className="text-button"
              key={r.month}
              onClick={() => onMonth?.(r.month)}
            >
              {monthLabel(r.month, true)}
            </button>
          ))}
        </div>
      </details>
      <div className="chart-legend">
        <span>
          <i className="dot" style={{ background: "var(--warning)" }} />
          Ainda a pagar
        </span>
        <span>
          <i className="dot" style={{ background: "var(--success)" }} />
          Valores pagos
        </span>
        <small>Valores em R$ · clique para abrir um mês</small>
      </div>
    </>
  );
}
export function DistributionChart({
  cards,
  onCard,
}: {
  cards: (Card & { debt: number })[];
  onCard?: (id: string) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rows = cards.filter((c) => c.debt > 0),
    total = rows.reduce((sum, c) => sum + c.debt, 0);
  if (!rows.length)
    return (
      <Empty
        title="Saldo em equilíbrio"
        text="Sem valores pendentes nos filtros selecionados."
      />
    );
  return (
    <>
      <div ref={chartRef} className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              onClick={(_entry, index) => onCard?.(rows[index].id)}
              cursor={onCard ? "pointer" : "default"}
              dataKey="debt"
              nameKey="name"
              innerRadius="76%"
              outerRadius="96%"
              paddingAngle={4}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {rows.map((c) => (
                <Cell key={c.id} fill={c.color} />
              ))}
            </Pie>
            <Tooltip
              portal={document.body}
              wrapperStyle={tooltipLayer}
              content={<ChartTooltip chartRef={chartRef} mode="distribution" />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <small>Ainda a pagar</small>
          <strong>{money(total)}</strong>
          <span>{rows.length} cartões</span>
        </div>
      </div>
      <div className="donut-legend">
        {rows.map((c) => (
          <button
            className="donut-legend-row"
            key={c.id}
            onClick={() => onCard?.(c.id)}
          >
            <span className="dot" style={{ background: c.color }} />
            <span>
              {c.bank}
              <small>{c.name}</small>
            </span>
            <strong>
              {money(c.debt)}
              <small>{Math.round((c.debt / total) * 100)}% do saldo</small>
            </strong>
          </button>
        ))}
      </div>
    </>
  );
}
export function ComparisonChart({
  cards,
  onCard,
}: {
  cards: (Card & { debt: number })[];
  onCard?: (id: string) => void;
}) {
  return (
    <div className="comparison-rows">
      {cards.map((c) => {
        const highest = Math.max(1, ...cards.map((card) => card.debt));
        return (
          <button
            className="comparison-row-button"
            key={c.id}
            onClick={() => onCard?.(c.id)}
          >
            <div className="comparison-label">
              <span>
                <i className="dot" style={{ background: c.color }} />
                {c.bank} · {c.name}
              </span>
              <strong>{money(c.debt)}</strong>
            </div>
            <div className="comparison-track">
              <span
                style={{
                  width: `${(c.debt / highest) * 100}%`,
                  background: c.color,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
export function SimulationChart({
  purchases,
  payments,
  selected,
  start,
}: {
  purchases: Purchase[];
  payments: Payment[];
  selected: string[];
  start: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rows = Array.from({ length: 8 }, (_, i) => {
    const month = addMonths(start, i);
    return {
      month,
      before: monthSnapshot(purchases, payments, month).outstanding,
      after: monthSnapshot(
        purchases.filter((p) => !selected.includes(p.id)),
        payments,
        month,
      ).outstanding,
    };
  });
  return (
    <div ref={chartRef} className="chart simulation-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="simulation-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mint)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--mint)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--grid)"
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => monthLabel(m, true)}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={tickMoney}
            tick={axis}
            axisLine={false}
            tickLine={false}
            width="auto"
          />
          <Tooltip
            portal={document.body}
            wrapperStyle={tooltipLayer}
            content={<ChartTooltip chartRef={chartRef} mode="simulation" />}
          />
          <Legend
            formatter={(name) =>
              name === "before" ? "Sem antecipar" : "Após quitar selecionadas"
            }
            wrapperStyle={{ fontSize: "var(--text-caption)", paddingTop: 12 }}
          />
          <Area
            isAnimationActive={false}
            type="linear"
            dataKey="before"
            fill="none"
            stroke="var(--muted)"
            strokeDasharray="5 5"
            strokeWidth={2}
          />
          <Area
            isAnimationActive={false}
            type="linear"
            dataKey="after"
            fill="url(#simulation-fill)"
            stroke="var(--mint)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
