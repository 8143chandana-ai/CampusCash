import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  budgetInput,
  goalInput,
  jobInput,
  scholarshipInput,
  transactionInput,
} from "@campuscash/shared";
import { prisma } from "./db.js";
import { buildMonthlyInsights } from "./insights.js";
import { errorHandler, requireAuth, type AuthRequest } from "./middleware.js";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
const idParams = z.object({ id: z.string().min(1) });
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({ error: { code, message } });
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  return secret && secret.length >= 32 && !secret.startsWith("replace-this")
    ? secret
    : undefined;
}

function parsed<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/signup", authLimiter, async (req, res) => {
  const input = parsed(authSchema, req.body);
  if (!input)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Enter a valid email and a password of at least 8 characters.",
    );
  const secret = jwtSecret();
  if (!secret)
    return sendError(
      res,
      500,
      "CONFIGURATION_ERROR",
      "Authentication is not configured with a secure secret.",
    );
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing)
    return sendError(
      res,
      409,
      "EMAIL_IN_USE",
      "An account with this email already exists.",
    );
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
  });
  const token = jwt.sign({}, secret, { subject: user.id, expiresIn: "7d" });
  res.cookie("campuscash_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res
    .status(201)
    .json({
      user: { id: user.id, email: user.email, currency: user.currency },
    });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const input = parsed(authSchema, req.body);
  if (!input)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Enter a valid email and password.",
    );
  const secret = jwtSecret();
  if (!secret)
    return sendError(
      res,
      500,
      "CONFIGURATION_ERROR",
      "Authentication is not configured with a secure secret.",
    );
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return sendError(
      res,
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }
  const token = jwt.sign({}, secret, { subject: user.id, expiresIn: "7d" });
  res.cookie("campuscash_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.json({
    user: { id: user.id, email: user.email, currency: user.currency },
  });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("campuscash_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(204).end();
});

app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, currency: true },
  });
  if (!user)
    return sendError(res, 401, "UNAUTHORIZED", "Please log in to continue.");
  return res.json({ user });
});

app.use("/api", requireAuth);

app.get("/api/transactions", async (req: AuthRequest, res) => {
  const pagingResult = pagination.safeParse(req.query);
  if (!pagingResult.success)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid pagination values.",
    );
  const paging = pagingResult.data;
  const month =
    typeof req.query.month === "string" ? req.query.month : undefined;
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined;
  const where: Record<string, unknown> = { userId: req.userId };
  if (category) where.category = category;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNumber] = month.split("-").map(Number);
    if (monthNumber < 1 || monthNumber > 12)
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Month must use YYYY-MM format.",
      );
    where.date = {
      gte: new Date(year, monthNumber - 1, 1),
      lt: new Date(year, monthNumber, 1),
    };
  } else if (month)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Month must use YYYY-MM format.",
    );
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (paging.page - 1) * paging.limit,
      take: paging.limit,
    }),
    prisma.transaction.count({ where }),
  ]);
  return res.json({ items, page: paging.page, limit: paging.limit, total });
});

app.post("/api/transactions", async (req: AuthRequest, res) => {
  const input = parsed(transactionInput, req.body);
  if (!input)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Check the transaction details and try again.",
    );
  const item = await prisma.transaction.create({
    data: { ...input, userId: req.userId! },
  });
  return res.status(201).json({ item });
});

app.patch("/api/transactions/:id", async (req: AuthRequest, res) => {
  const params = parsed(idParams, req.params);
  const input = parsed(transactionInput.partial(), req.body);
  if (!params || !input || !Object.keys(input).length)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Check the transaction details and try again.",
    );
  const existing = await prisma.transaction.findFirst({
    where: { id: params.id, userId: req.userId },
  });
  if (!existing)
    return sendError(res, 404, "NOT_FOUND", "Transaction not found.");
  return res.json({
    item: await prisma.transaction.update({
      where: { id: existing.id },
      data: input,
    }),
  });
});

app.delete("/api/transactions/:id", async (req: AuthRequest, res) => {
  const params = parsed(idParams, req.params);
  if (!params)
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid transaction id.");
  const result = await prisma.transaction.deleteMany({
    where: { id: params.id, userId: req.userId },
  });
  return result.count
    ? res.status(204).end()
    : sendError(res, 404, "NOT_FOUND", "Transaction not found.");
});

function prismaErrorCode(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

async function crudRoutes<Input extends object, Entity extends { id: string }>(
  path: string,
  schema: z.ZodType<Input>,
  patchSchema: z.ZodType<Partial<Input>>,
  operations: {
    list: (userId: string, skip: number, take: number) => Promise<Entity[]>;
    count: (userId: string) => Promise<number>;
    create: (userId: string, input: Input) => Promise<Entity>;
    find: (userId: string, id: string) => Promise<Entity | null>;
    update: (id: string, input: Partial<Input>) => Promise<Entity>;
    remove: (userId: string, id: string) => Promise<number>;
  },
) {
  app.get(`/api/${path}`, async (req: AuthRequest, res) => {
    const pagingResult = pagination.safeParse(req.query);
    if (!pagingResult.success)
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Invalid pagination values.",
      );
    const paging = pagingResult.data;
    const [items, total] = await Promise.all([
      operations.list(
        req.userId!,
        (paging.page - 1) * paging.limit,
        paging.limit,
      ),
      operations.count(req.userId!),
    ]);
    return res.json({ items, page: paging.page, limit: paging.limit, total });
  });
  app.post(`/api/${path}`, async (req: AuthRequest, res) => {
    const input = parsed(schema, req.body);
    if (!input)
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        `Check the ${path} details and try again.`,
      );
    try {
      const item = await operations.create(req.userId!, input);
      return res.status(201).json({ item });
    } catch (error) {
      if (path === "budgets" && prismaErrorCode(error) === "P2002") {
        return sendError(
          res,
          409,
          "BUDGET_EXISTS",
          "A budget already exists for this category.",
        );
      }
      throw error;
    }
  });
  app.patch(`/api/${path}/:id`, async (req: AuthRequest, res) => {
    const params = parsed(idParams, req.params);
    const input = parsed(patchSchema, req.body);
    if (!params || !input || !Object.keys(input).length)
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Check the details and try again.",
      );
    const existing = await operations.find(req.userId!, params.id);
    if (!existing)
      return sendError(
        res,
        404,
        "NOT_FOUND",
        `${path.slice(0, -1)} not found.`,
      );
    try {
      const item = await operations.update(params.id, input);
      return res.json({ item });
    } catch (error) {
      if (path === "budgets" && prismaErrorCode(error) === "P2002") {
        return sendError(
          res,
          409,
          "BUDGET_EXISTS",
          "A budget already exists for this category.",
        );
      }
      throw error;
    }
  });
  app.delete(`/api/${path}/:id`, async (req: AuthRequest, res) => {
    const params = parsed(idParams, req.params);
    if (!params) return sendError(res, 400, "VALIDATION_ERROR", "Invalid id.");
    const deleted = await operations.remove(req.userId!, params.id);
    return deleted
      ? res.status(204).end()
      : sendError(res, 404, "NOT_FOUND", `${path.slice(0, -1)} not found.`);
  });
}

await crudRoutes("budgets", budgetInput, budgetInput.partial(), {
  list: (userId, skip, take) =>
    prisma.budget.findMany({
      where: { userId },
      orderBy: { category: "asc" },
      skip,
      take,
    }),
  count: (userId) => prisma.budget.count({ where: { userId } }),
  create: (userId, input) =>
    prisma.budget.create({ data: { ...input, userId } }),
  find: (userId, id) => prisma.budget.findFirst({ where: { id, userId } }),
  update: (id, input) => prisma.budget.update({ where: { id }, data: input }),
  remove: async (userId, id) =>
    (await prisma.budget.deleteMany({ where: { id, userId } })).count,
});
await crudRoutes("goals", goalInput, goalInput.partial(), {
  list: (userId, skip, take) =>
    prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { targetDate: "asc" },
      skip,
      take,
    }),
  count: (userId) => prisma.savingsGoal.count({ where: { userId } }),
  create: (userId, input) =>
    prisma.savingsGoal.create({
      data: { ...input, targetDate: new Date(input.targetDate), userId },
    }),
  find: (userId, id) => prisma.savingsGoal.findFirst({ where: { id, userId } }),
  update: (id, input) =>
    prisma.savingsGoal.update({
      where: { id },
      data: {
        ...input,
        ...(input.targetDate ? { targetDate: new Date(input.targetDate) } : {}),
      },
    }),
  remove: async (userId, id) =>
    (await prisma.savingsGoal.deleteMany({ where: { id, userId } })).count,
});
await crudRoutes("scholarships", scholarshipInput, scholarshipInput.partial(), {
  list: (userId, skip, take) =>
    prisma.scholarship.findMany({
      where: { userId },
      orderBy: { deadline: "asc" },
      skip,
      take,
    }),
  count: (userId) => prisma.scholarship.count({ where: { userId } }),
  create: (userId, input) =>
    prisma.scholarship.create({
      data: { ...input, deadline: new Date(input.deadline), userId },
    }),
  find: (userId, id) => prisma.scholarship.findFirst({ where: { id, userId } }),
  update: (id, input) =>
    prisma.scholarship.update({
      where: { id },
      data: {
        ...input,
        ...(input.deadline ? { deadline: new Date(input.deadline) } : {}),
      },
    }),
  remove: async (userId, id) =>
    (await prisma.scholarship.deleteMany({ where: { id, userId } })).count,
});
await crudRoutes("jobs", jobInput, jobInput.partial(), {
  list: (userId, skip, take) =>
    prisma.job.findMany({
      where: { userId },
      orderBy: { title: "asc" },
      skip,
      take,
    }),
  count: (userId) => prisma.job.count({ where: { userId } }),
  create: (userId, input) => prisma.job.create({ data: { ...input, userId } }),
  find: (userId, id) => prisma.job.findFirst({ where: { id, userId } }),
  update: (id, input) => prisma.job.update({ where: { id }, data: input }),
  remove: async (userId, id) =>
    (await prisma.job.deleteMany({ where: { id, userId } })).count,
});

app.post("/api/goals/:id/deposit", async (req: AuthRequest, res) => {
  const params = parsed(idParams, req.params);
  const input = z
    .object({
      amount: z.number().int().positive().max(2_147_483_647),
      direction: z.enum(["deposit", "withdraw"]).optional(),
    })
    .safeParse(req.body);
  if (!params || !input.success)
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Enter a valid positive amount.",
    );
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: params.id, userId: req.userId },
  });
  if (!goal) return sendError(res, 404, "NOT_FOUND", "Savings goal not found.");
  if (input.data.direction === "withdraw" && input.data.amount > goal.saved) {
    return sendError(
      res,
      400,
      "INSUFFICIENT_SAVINGS",
      "You can’t withdraw more than this goal has saved.",
    );
  }
  const saved = Math.max(
    0,
    goal.saved +
      input.data.amount * (input.data.direction === "withdraw" ? -1 : 1),
  );
  return res.json({
    item: await prisma.savingsGoal.update({
      where: { id: goal.id },
      data: { saved },
    }),
  });
});

app.get("/api/insights/summary", async (req: AuthRequest, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [transactions, budgets, goals, scholarships] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.userId, date: { gte: start } },
    }),
    prisma.budget.findMany({ where: { userId: req.userId } }),
    prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      orderBy: { targetDate: "asc" },
    }),
    prisma.scholarship.findMany({
      where: { userId: req.userId, status: { in: ["TO_APPLY", "APPLIED"] } },
      orderBy: { deadline: "asc" },
      take: 1,
    }),
  ]);
  const summary = buildMonthlyInsights(transactions, budgets, now);
  const trends = await Promise.all(
    Array.from({ length: 6 }, async (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const rows = await prisma.transaction.findMany({
        where: {
          userId: req.userId,
          type: "EXPENSE",
          date: { gte: date, lt: next },
        },
        select: { amount: true },
      });
      return {
        month: date.toLocaleString("en", { month: "short" }),
        spent: rows.reduce((sum, row) => sum + row.amount, 0),
      };
    }),
  );
  return res.json({
    ...summary,
    trends,
    goals,
    nextScholarship: scholarships[0] ?? null,
  });
});

app.use((req, res) =>
  sendError(res, 404, "NOT_FOUND", `No route for ${req.method} ${req.path}.`),
);
app.use(errorHandler);

export { app };
