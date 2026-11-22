import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = "demo@campuscash.app";

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: await bcrypt.hash("campus123", 12),
      currency: "INR",
    },
    create: {
      email,
      passwordHash: await bcrypt.hash("campus123", 12),
      currency: "INR",
    },
  });
  await Promise.all([
    prisma.transaction.deleteMany({ where: { userId: user.id } }),
    prisma.budget.deleteMany({ where: { userId: user.id } }),
    prisma.savingsGoal.deleteMany({ where: { userId: user.id } }),
    prisma.scholarship.deleteMany({ where: { userId: user.id } }),
    prisma.job.deleteMany({ where: { userId: user.id } }),
  ]);
  const now = new Date();
  const transactionRows = Array.from({ length: 6 }, (_, monthOffset) => {
    const month = new Date(
      now.getFullYear(),
      now.getMonth() - 5 + monthOffset,
      1,
    );
    const base = [
      {
        type: "INCOME",
        amount: 1250000,
        category: "Allowance",
        note: "Monthly allowance",
        day: 2,
      },
      {
        type: "EXPENSE",
        amount: 285000,
        category: "Housing",
        note: "Room and utilities",
        day: 3,
      },
      {
        type: "EXPENSE",
        amount: 42000,
        category: "Food",
        note: "Groceries for the week",
        day: 5,
      },
      {
        type: "EXPENSE",
        amount: 16000,
        category: "Transport",
        note: "Metro pass",
        day: 7,
      },
      {
        type: "EXPENSE",
        amount: 22500,
        category: "Food",
        note: "Lunch with friends",
        day: 10,
      },
      {
        type: "EXPENSE",
        amount: 18000,
        category: "Study",
        note: "Course materials",
        day: 13,
      },
      {
        type: "EXPENSE",
        amount: 12500,
        category: "Shopping",
        note: "Everyday essentials",
        day: 18,
      },
      {
        type: "EXPENSE",
        amount: 14000,
        category: "Food",
        note: "Campus café",
        day: 22,
      },
    ];
    const scale = 0.78 + monthOffset * 0.055;
    return base.map((item) => ({
      userId: user.id,
      type: item.type,
      amount:
        item.type === "EXPENSE" ? Math.round(item.amount * scale) : item.amount,
      category: item.category,
      note: item.note,
      date: new Date(
        month.getFullYear(),
        month.getMonth(),
        Math.min(
          item.day,
          monthOffset === 5
            ? now.getDate()
            : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
        ),
        12,
      ),
    }));
  }).flat();
  await prisma.transaction.createMany({ data: transactionRows });
  await prisma.budget.createMany({
    data: [
      { userId: user.id, category: "Food", monthlyLimit: 160000 },
      { userId: user.id, category: "Transport", monthlyLimit: 70000 },
      { userId: user.id, category: "Study", monthlyLimit: 60000 },
      { userId: user.id, category: "Shopping", monthlyLimit: 50000 },
      { userId: user.id, category: "Housing", monthlyLimit: 320000 },
    ],
  });
  await prisma.savingsGoal.createMany({
    data: [
      {
        userId: user.id,
        name: "A new laptop",
        target: 6500000,
        saved: 2400000,
        targetDate: new Date(now.getFullYear(), now.getMonth() + 5, 15),
      },
      {
        userId: user.id,
        name: "Trip home",
        target: 1800000,
        saved: 750000,
        targetDate: new Date(now.getFullYear(), now.getMonth() + 3, 10),
      },
    ],
  });
  await prisma.scholarship.createMany({
    data: [
      {
        userId: user.id,
        name: "Bright Futures Student Grant",
        amount: 5000000,
        deadline: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 8,
        ),
        url: "https://example.org/scholarships",
        status: "TO_APPLY",
      },
      {
        userId: user.id,
        name: "Campus Excellence Award",
        amount: 2500000,
        deadline: new Date(now.getFullYear(), now.getMonth() + 1, 12),
        url: "https://example.org/award",
        status: "APPLIED",
      },
    ],
  });
  await prisma.job.createMany({
    data: [
      {
        userId: user.id,
        title: "Peer math tutor",
        hourlyRate: 18000,
        hoursPerWeek: 4,
      },
      {
        userId: user.id,
        title: "Campus café shift",
        hourlyRate: 12000,
        hoursPerWeek: 6,
      },
    ],
  });
  console.log(`Seeded demo account: ${email} / campus123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
