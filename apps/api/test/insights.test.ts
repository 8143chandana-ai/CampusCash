import { describe, expect, it } from "vitest";
import {
  buildMonthlyInsights,
  calculateBudgetProgress,
} from "../src/insights.js";

describe("calculateBudgetProgress", () => {
  it("uses green below 80%, amber from 80–100%, and red only above 100%", () => {
    expect(calculateBudgetProgress(10000, 7999).level).toBe("green");
    expect(calculateBudgetProgress(10000, 8000).level).toBe("amber");
    expect(calculateBudgetProgress(10000, 10000).level).toBe("amber");
    expect(calculateBudgetProgress(10000, 10001).level).toBe("red");
  });

  it("handles zero budgets without division errors", () => {
    expect(calculateBudgetProgress(0, 0)).toEqual({
      percent: 0,
      remaining: 0,
      level: "green",
    });
    expect(calculateBudgetProgress(0, 10)).toEqual({
      percent: 100,
      remaining: -10,
      level: "red",
    });
  });
});

describe("buildMonthlyInsights", () => {
  it("computes monthly totals, safe-to-spend and category overspend", () => {
    const now = new Date(2026, 3, 10, 12);
    const rows = [
      {
        type: "INCOME",
        amount: 100000,
        category: "Allowance",
        date: new Date(2026, 3, 2),
      },
      {
        type: "EXPENSE",
        amount: 40000,
        category: "Food",
        date: new Date(2026, 3, 5),
      },
      {
        type: "EXPENSE",
        amount: 30000,
        category: "Rent",
        date: new Date(2026, 3, 8),
      },
      {
        type: "EXPENSE",
        amount: 20000,
        category: "Food",
        date: new Date(2026, 2, 20),
      },
    ];
    const result = buildMonthlyInsights(
      rows,
      [
        { category: "Food", monthlyLimit: 35000 },
        { category: "Rent", monthlyLimit: 25000 },
      ],
      now,
    );
    expect(result.income).toBe(100000);
    expect(result.spent).toBe(70000);
    expect(result.balance).toBe(30000);
    expect(
      result.categoryBudgets.find((item) => item.category === "Food")
        ?.overspent,
    ).toBe(true);
    expect(result.safeToSpendPerDay).toBe(0);
    expect(result.topCategory).toEqual({
      name: "Food",
      amount: 40000,
      share: 57,
    });
  });

  it("returns empty-month values and handles a month rollover", () => {
    const result = buildMonthlyInsights([], [], new Date(2026, 0, 31, 12));
    expect(result.spent).toBe(0);
    expect(result.topCategory).toBeNull();
    expect(result.forecast).toBe(0);
    expect(result.safeToSpendPerDay).toBe(0);
  });
});
