# CampusCash

CampusCash is a mobile-first money companion for college students. Log money in seconds, see how your month is going, make a savings plan, keep scholarship deadlines close, and estimate flexible income.

## Folder structure

```text
apps/
  api/                 Express + TypeScript REST API, Prisma schema, seed and tests
  web/                 React + Vite + TypeScript responsive app
packages/
  shared/              Shared Zod request schemas and types
```

## Setup

Requirements: Node.js 20+ and npm.

1. Copy `.env.example` to `apps/api/.env`. Set `JWT_SECRET` to a unique random value of at least 32 characters.
2. Install dependencies: `npm install`
3. Generate the Prisma client and create the local SQLite database:

   ```sh
   npm run db:generate
   npm run db:push
   ```

4. Load the demo data: `npm run db:seed`
5. Start both apps: `npm run dev`
6. Open [http://localhost:5173](http://localhost:5173). Demo sign-in: `demo@campuscash.app` / `campus123`.

The API listens at `http://localhost:4000`; Vite proxies `/api` requests. For PostgreSQL, change the Prisma datasource provider to `postgresql`, set `DATABASE_URL` to your PostgreSQL connection string, then run `npm run db:generate` and `npm run db:push`. The schema uses portable scalar fields and integer minor units.

## API overview

All private routes require the `campuscash_token` httpOnly cookie. Auth routes are rate-limited. Lists support `page` and `limit` (maximum 100), and transactions additionally support `month=YYYY-MM` and `category`.

| Method                   | Route                                           | Purpose                                                                  |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------ |
| POST                     | `/api/auth/signup`, `/api/auth/login`           | Create an account or start a session                                     |
| POST                     | `/api/auth/logout`                              | Clear the session cookie                                                 |
| GET                      | `/api/auth/me`                                  | Get current user                                                         |
| GET, POST                | `/api/transactions`                             | List or add transactions                                                 |
| PATCH, DELETE            | `/api/transactions/:id`                         | Edit or remove a transaction                                             |
| GET, POST, PATCH, DELETE | `/api/budgets` and `/api/budgets/:id`           | Manage monthly category budgets                                          |
| GET, POST, PATCH, DELETE | `/api/goals` and `/api/goals/:id`               | Manage savings goals                                                     |
| POST                     | `/api/goals/:id/deposit`                        | Deposit to or withdraw from a goal (`direction: "withdraw"` to withdraw) |
| GET, POST, PATCH, DELETE | `/api/scholarships` and `/api/scholarships/:id` | Track scholarship applications                                           |
| GET, POST, PATCH, DELETE | `/api/jobs` and `/api/jobs/:id`                 | Plan hourly income                                                       |
| GET                      | `/api/insights/summary`                         | Server-computed monthly insights and six-month trend                     |

Errors use `{ "error": { "code": "…", "message": "…" } }`. Money inputs and outputs are integer minor units (paise for INR); the UI converts to and from rupees. Every private query is scoped to the authenticated user.

## Quality checks

```sh
npm test
npm run build
npm run lint
```

## Screenshots

_Dashboard screenshot placeholder_

_Mobile experience screenshot placeholder_

## Why this solves the problem

CampusCash makes the daily money check-in short and approachable: quick-add is always available, spending and budget status are visible together, and goal progress turns saving into a concrete next step. Scholarship deadlines and flexible work estimates sit alongside everyday expenses, so students can make both immediate and longer-term decisions in one place.

## Future roadmap

1. Receipt OCR to turn a photo into a reviewed expense.
2. Bank and UPI import with clear consent and duplicate detection.
3. Scholarship auto-discovery matched to a student’s profile and eligibility.

## Assumptions

- INR is the initial currency and monetary values are stored as paise.
- One user account is one personal finance space; all records are private to that account.
- Income and expenses share the transaction tracker; budgets apply to expenses.
- Forecast is a simple current-month daily-rate projection, not financial advice.
- Job income projection uses 4.33 weeks per month and does not model tax or deductions.
- SQLite is the local default; use the documented datasource change for PostgreSQL.
