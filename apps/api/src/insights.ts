export interface InsightTransaction {
  type: string;
  amount: number;
  category: string;
  date: Date;
}

export interface InsightBudget {
  category: string;
  monthlyLimit: number;
}

export function calculateBudgetProgress(
  limit: number,
  spent: number,
): { percent: number; remaining: number; level: "green" | "amber" | "red" } {
  const ratio =
    limit <= 0 ? (spent > 0 ? Number.POSITIVE_INFINITY : 0) : spent / limit;
  const percent = Number.isFinite(ratio) ? Math.round(ratio * 100) : 100;
  return {
    percent,
    remaining: limit - spent,
    level: ratio > 1 ? "red" : ratio >= 0.8 ? "amber" : "green",
  };
}

export function buildMonthlyInsights(
  transactions: InsightTransaction[],
  budgets: InsightBudget[],
  now: Date,
) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const day = now.getDate();
  const current = transactions.filter(
    (item) => item.date >= monthStart && item.date < nextMonthStart,
  );
  const previous = transactions.filter(
    (item) => item.date >= previousMonthStart && item.date < monthStart,
  );
  const expenses = current.filter((item) => item.type === "EXPENSE");
  const income = current
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amount, 0);
  const spent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const previousSpent = previous
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);
  const dailyRate = day > 0 ? spent / day : 0;
  const categoryTotals = expenses.reduce<Record<string, number>>(
    (totals, item) => {
      totals[item.category] = (totals[item.category] ?? 0) + item.amount;
      return totals;
    },
    {},
  );
  const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const budgetTotal = budgets.reduce(
    (sum, budget) => sum + budget.monthlyLimit,
    0,
  );
  const budgetLeft = budgetTotal - spent;
  const dayCountLeft = Math.max(1, daysInMonth - day + 1);

  return {
    income,
    spent,
    balance: income - spent,
    budgetLeft,
    safeToSpendPerDay: Math.max(0, Math.floor(budgetLeft / dayCountLeft)),
    topCategory: top
      ? {
          name: top[0],
          amount: top[1],
          share: spent ? Math.round((top[1] / spent) * 100) : 0,
        }
      : null,
    monthOverMonthChange:
      previousSpent === 0
        ? spent > 0
          ? 100
          : 0
        : Math.round(((spent - previousSpent) / previousSpent) * 100),
    forecast: Math.round(dailyRate * daysInMonth),
    categoryBudgets: budgets.map((budget) => {
      const progress = calculateBudgetProgress(
        budget.monthlyLimit,
        categoryTotals[budget.category] ?? 0,
      );
      return {
        ...budget,
        spent: categoryTotals[budget.category] ?? 0,
        ...progress,
        overspent: progress.remaining < 0,
      };
    }),
    categoryTotals: Object.entries(categoryTotals).map(
      ([category, amount]) => ({ category, amount }),
    ),
  };
}
