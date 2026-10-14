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
  addMonths,
  money,
  monthLabel,
  monthSnapshot,
  type Card,
  type Payment,
  type Purchase,
} from "../domain";
import { Empty } from "./ui";
const axis = { fill: "var(--muted)", fontSize: 11 };
const tooltip = {
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: 12,
  boxShadow: "var(--shadow)",
};
const tickMoney = (cents: number) =>
  cents >= 100000
    ? `${(cents / 100000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : `${cents / 100}`;
export function MonthlyChart({
  purchases,
  payments,
  start,
  count = 6,
  onMonth,
}: {
  purchases: Purchase[];
  payments: Payment[];
  start: string;
  count?: number;
  onMonth?: (month: string) => void;
}) {
  const rows = Array.from({ length: count }, (_, i) =>
    monthSnapshot(purchases, payments, addMonths(start, i)),
  );
  if (!purchases.length)
    return (
      <Empty
        title="Seu futuro começa aqui"
        text="Adicione uma compra para ver pagamentos e previsões."
      />
    );
  return (
    <>
      <div className="chart chart-monthly">
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
              width={53}
            />
            <Tooltip
              cursor={{ fill: "var(--hover)" }}
              contentStyle={tooltip}
              labelFormatter={(label) => monthLabel(String(label))}
              formatter={(value, name) => [
                money(Number(value)),
                name === "paid" ? "Parcelas pagas" : "Ainda a pagar",
              ]}
            />
            <Bar
              isAnimationActive={false}
              dataKey="paid"
              onClick={(_entry, index) => onMonth?.(rows[index].month)}
              cursor={onMonth ? "pointer" : "default"}
              stackId="month"
              fill="var(--mint)"
              maxBarSize={48}
            />
            <Bar
              isAnimationActive={false}
              dataKey="outstanding"
              onClick={(_entry, index) => onMonth?.(rows[index].month)}
              cursor={onMonth ? "pointer" : "default"}
              stackId="month"
              fill="var(--accent)"
              radius={[7, 7, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span>
          <i className="dot accent" />
          Ainda a pagar
        </span>
        <span>
          <i className="dot mint" />
          Parcelas pagas
        </span>
        <small>Valores em R$ · clique para abrir um mês</small>
      </div>
    </>
  );
}
export function DistributionChart({
  cards,
}: {
  cards: (Card & { debt: number })[];
}) {
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
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
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
              formatter={(value) => money(Number(value))}
              contentStyle={tooltip}
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
          <div key={c.id}>
            <span className="dot" style={{ background: c.color }} />
            <span>
              {c.bank}
              <small>{c.name}</small>
            </span>
            <strong>
              {money(c.debt)}
              <small>{Math.round((c.debt / total) * 100)}% do saldo</small>
            </strong>
          </div>
        ))}
      </div>
    </>
  );
}
export function ComparisonChart({
  cards,
}: {
  cards: (Card & { debt: number })[];
}) {
  return (
    <div className="comparison-rows">
      {cards.map((c) => {
        const highest = Math.max(1, ...cards.map((card) => card.debt));
        return (
          <div key={c.id}>
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
          </div>
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
    <div className="chart simulation-chart">
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
            width={53}
          />
          <Tooltip
            labelFormatter={(l) => monthLabel(String(l))}
            formatter={(v, name) => [
              money(Number(v)),
              name === "before" ? "Sem antecipar" : "Após quitar selecionadas",
            ]}
            contentStyle={tooltip}
          />
          <Legend
            formatter={(name) =>
              name === "before" ? "Sem antecipar" : "Após quitar selecionadas"
            }
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
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
