import { z } from "zod";

export const transactionTypes = ["INCOME", "EXPENSE"] as const;
export const scholarshipStatuses = [
  "TO_APPLY",
  "APPLIED",
  "WON",
  "REJECTED",
] as const;
const validDateTime = z
  .string()
  .datetime({ offset: true })
  .refine((value) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    return (
      calendarDate.getUTCFullYear() === year &&
      calendarDate.getUTCMonth() === month - 1 &&
      calendarDate.getUTCDate() === day
    );
  }, "Enter a real calendar date and time.");

export const transactionInput = z.object({
  type: z.enum(transactionTypes),
  amount: z.number().int().positive().max(2_147_483_647),
  category: z.string().trim().min(1).max(40),
  note: z.string().trim().max(240).optional().default(""),
  date: validDateTime,
});

export const budgetInput = z.object({
  category: z.string().trim().min(1).max(40),
  monthlyLimit: z.number().int().positive().max(2_147_483_647),
});

export const goalInput = z.object({
  name: z.string().trim().min(1).max(80),
  target: z.number().int().positive().max(2_147_483_647),
  targetDate: validDateTime,
});

export const scholarshipInput = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.number().int().nonnegative().max(2_147_483_647),
  deadline: validDateTime,
  url: z.string().url().or(z.literal("")).optional().default(""),
  status: z.enum(scholarshipStatuses),
});

export const jobInput = z.object({
  title: z.string().trim().min(1).max(100),
  hourlyRate: z.number().int().positive().max(2_147_483_647),
  hoursPerWeek: z.number().positive().max(80),
});

export type TransactionInput = z.infer<typeof transactionInput>;
export type BudgetInput = z.infer<typeof budgetInput>;
export type GoalInput = z.infer<typeof goalInput>;
export type ScholarshipInput = z.infer<typeof scholarshipInput>;
export type JobInput = z.infer<typeof jobInput>;
