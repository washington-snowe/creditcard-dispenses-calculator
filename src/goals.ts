import {
  addMonths,
  currentMonth,
  installmentAmount,
  monthsBetween,
  scheduledMonth,
  type Data,
  type Goal,
} from "./domain";
import { actualFlows, recursInMonth } from "./finance";
import { monthLedger } from "./insights";

// Spending is measured by the bill/due month, including paid and pending items.
// Payments themselves are not extra expenses in this view.
export function goalSpending(
  data: Data,
  month: string,
  category: string | null = null,
) {
  return monthLedger(data, month)
    .filter(
      (r) =>
        !r.income &&
        r.date.startsWith(month) &&
        (!category || r.category === category),
    )
    .reduce((sum, r) => sum + r.amount, 0);
}
export function spendingProgress(
  data: Data,
  goal: Goal,
  month: string,
  today = currentMonth(),
) {
  const spent = goalSpending(data, month, goal.category);
  const active =
    month >= goal.startMonth &&
    (!goal.deadlineMonth || month <= goal.deadlineMonth);
  const future = month > today;
  return {
    spent,
    active,
    future,
    remaining: goal.targetCents - spent,
    percent: (spent / goal.targetCents) * 100,
    saved:
      goal.baselineCents === null || !active || future
        ? null
        : goal.baselineCents - spent,
    achieved: active && month < today && spent <= goal.targetCents,
  };
}
export function savingsPlan(
  data: Data,
  selectedMonth: string,
  today = currentMonth(),
) {
  const cutoff = selectedMonth < today ? selectedMonth : today;
  const goals = data.goals ?? [];
  const earliest = goals.reduce(
    (m, g) => (g.startMonth < m ? g.startMonth : m),
    cutoff,
  );
  const carry = data.settings?.carryover;
  // An explicitly entered opening balance replaces earlier cash history.
  // Do not add those earlier flows a second time when a goal predates it.
  const start =
    carry && carry.startMonth <= cutoff && carry.startMonth > earliest
      ? carry.startMonth
      : earliest;
  const flows = actualFlows(data);
  const changes = new Map<string, number>();
  const put = (month: string, amount: number) => {
    if (month <= cutoff) {
      const m = month < start ? start : month;
      changes.set(m, (changes.get(m) ?? 0) + amount);
    }
  };
  let opening = 0;
  if (carry && carry.startMonth <= start) {
    opening = carry.openingCents;
    for (const [m, amount] of flows)
      if (m >= carry.startMonth && m < start) opening += amount;
  }
  for (const [m, amount] of flows) if (m >= start) put(m, amount);
  // Reserve every unpaid obligation through cutoff once, including arrears.
  let pending = 0;
  const owe = (month: string, amount: number) => {
    if (month <= cutoff) {
      pending += amount;
      put(month, -amount);
    }
  };
  for (const p of data.purchases) {
    const last = Math.min(
      p.installments - 1,
      p.paid + monthsBetween(p.nextMonth, cutoff),
    );
    for (let index = p.paid; index <= last; index++)
      owe(scheduledMonth(p, index), installmentAmount(p, index));
  }
  for (const e of data.expenses ?? [])
    if (!e.paidDate) owe(e.dueDate.slice(0, 7), e.amountCents);
  const paidPeriods = new Set(
    (data.subscriptionPayments ?? []).map(
      (p) => `${p.subscriptionId}:${p.month}`,
    ),
  );
  for (const sub of data.subscriptions ?? []) {
    const end = sub.endMonth && sub.endMonth < cutoff ? sub.endMonth : cutoff;
    const step = { monthly: 1, quarterly: 3, yearly: 12 }[sub.frequency];
    for (let m = sub.startMonth; m <= end; m = addMonths(m, step))
      if (recursInMonth(sub, m) && !paidPeriods.has(`${sub.id}:${m}`))
        owe(m, sub.amountCents);
  }
  const reserve = data.settings?.reserveCents ?? 0;
  let free = opening - reserve;
  const savings = goals.filter((g) => g.kind === "saving" && !g.archived);
  const allocations = new Map(savings.map((g) => [g.id, 0]));
  const history: { month: string; balance: number; allocated: number }[] = [];
  for (let m = start; m <= cutoff; m = addMonths(m, 1)) {
    free += changes.get(m) ?? 0;
    // A later deficit consumes the lowest-priority estimates first, rather
    // than pretending that every positive month is permanent savings.
    if (free < 0)
      for (const g of [...savings].reverse()) {
        const take = Math.min(allocations.get(g.id)!, -free);
        allocations.set(g.id, allocations.get(g.id)! - take);
        free += take;
      }
    if (free > 0)
      for (const g of savings)
        if (g.startMonth <= m) {
          const give = Math.min(g.targetCents - allocations.get(g.id)!, free);
          allocations.set(g.id, allocations.get(g.id)! + give);
          free -= give;
        }
    const allocated = [...allocations.values()].reduce((a, b) => a + b, 0);
    history.push({ month: m, balance: free + allocated, allocated });
  }
  const allocated = [...allocations.values()].reduce((a, b) => a + b, 0);
  return {
    start,
    cutoff,
    opening,
    reserve,
    pending,
    allocations,
    allocated,
    available: Math.max(0, free + allocated),
    free: Math.max(0, free),
    deficit: Math.max(0, -free),
    history,
  };
}
