import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";

describe("API integration", () => {
  let app: Express;
  let prisma: PrismaClient;
  let baseUrl: string;
  let server: ReturnType<Express["listen"]>;
  const testEmail = `integration-${Date.now()}@campuscash.test`;

  beforeAll(async () => {
    process.env.DATABASE_URL = "file:./test-integration.db";
    process.env.JWT_SECRET = "integration-test-secret-long-enough-32";
    process.env.WEB_ORIGIN = "http://localhost:5173";
    ({ app } = await import("../src/app.js"));
    ({ prisma } = await import("../src/db.js"));
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    await prisma.transaction.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: testEmail } });
      await prisma.$disconnect();
    }
    if (server)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
  });

  it("signs up, creates a transaction, and returns it only for the authenticated user", async () => {
    const signup = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "student-password-123",
      }),
    });
    expect(signup.status).toBe(201);
    const cookie = signup.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const created = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookie! },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: 1250,
        category: "Food",
        note: "Lunch",
        date: new Date().toISOString(),
      }),
    });
    expect(created.status).toBe(201);
    const list = await fetch(`${baseUrl}/transactions?limit=10`, {
      headers: { cookie: cookie! },
    });
    expect(list.status).toBe(200);
    const result = (await list.json()) as {
      items: Array<{ amount: number; note: string }>;
    };
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ amount: 1250, note: "Lunch" });

    const anonymous = await fetch(`${baseUrl}/transactions`);
    expect(anonymous.status).toBe(401);
  });
});
