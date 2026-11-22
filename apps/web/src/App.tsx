import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Banknote,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  CircleHelp,
  Clock3,
  Coffee,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, localDate, money } from "./api";

type User = { id: string; email: string; currency: string };
type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  note: string;
  date: string;
};
type Budget = { id: string; category: string; monthlyLimit: number };
type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  targetDate: string;
};
type Scholarship = {
  id: string;
  name: string;
  amount: number;
  deadline: string;
  url: string;
  status: string;
};
type Job = {
  id: string;
  title: string;
  hourlyRate: number;
  hoursPerWeek: number;
};
type Page<T> = { items: T[]; total: number };
type Summary = {
  income: number;
  spent: number;
  balance: number;
  budgetLeft: number;
  safeToSpendPerDay: number;
  topCategory: { name: string; amount: number; share: number } | null;
  monthOverMonthChange: number;
  forecast: number;
  categoryBudgets: Array<
    Budget & {
      spent: number;
      percent: number;
      level: string;
      remaining: number;
      overspent: boolean;
    }
  >;
  categoryTotals: Array<{ category: string; amount: number }>;
  trends: Array<{ month: string; spent: number }>;
  goals: Goal[];
  nextScholarship: Scholarship | null;
};

const icons = [
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  BookOpenCheck,
  BriefcaseBusiness,
];
const navItems = [
  { to: "/", label: "Overview" },
  { to: "/transactions", label: "Transactions" },
  { to: "/budgets", label: "Budgets" },
  { to: "/goals", label: "Savings goals" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/jobs", label: "Income ideas" },
];
const colors = [
  "#2f7657",
  "#9dba4d",
  "#e7a54a",
  "#78a3a0",
  "#b9a2c9",
  "#e8816a",
];
const categories = [
  "Food",
  "Transport",
  "Study",
  "Shopping",
  "Housing",
  "Health",
  "Entertainment",
  "Other",
];
const jobIdeas = [
  {
    title: "Peer tutor",
    detail: "Teach a subject you love",
    icon: BookOpenCheck,
  },
  {
    title: "Campus café",
    detail: "Flexible shifts between classes",
    icon: Coffee,
  },
  {
    title: "Freelance design",
    detail: "Small projects, your schedule",
    icon: Sparkles,
  },
  {
    title: "Research assistant",
    detail: "Work with a faculty team",
    icon: Search,
  },
];

function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void refresh();
    const handleRefresh = () => {
      void refresh();
    };
    window.addEventListener("campuscash:refresh", handleRefresh);
    return () =>
      window.removeEventListener("campuscash:refresh", handleRefresh);
  }, [refresh]);
  return { data, error, loading, refresh };
}

function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "plain" | "outline" | "danger";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-ink text-white hover:bg-leaf",
    plain: "bg-lime text-ink hover:bg-[#cae85e]",
    outline: "border border-line bg-white text-ink hover:bg-paper",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function PageTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[.15em] text-leaf">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

function Skeleton({ className = "h-28" }: { className?: string }) {
  return (
    <div aria-label="Loading" className={`skeleton rounded-2xl ${className}`} />
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-ink">
      <span>{label}</span>
      {children}
      {error && (
        <span role="alert" className="block text-xs font-medium text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-[#9aa49d] focus:border-leaf focus:ring-2 focus:ring-[#2f7657]/15";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-extrabold">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-white"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then(({ user: current }) => setUser(current))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/login");
  }
  if (authLoading)
    return (
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-10">
        <Skeleton className="h-14" />
        <Skeleton className="h-52" />
        <Skeleton className="h-64" />
      </div>
    );
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : <AuthScreen onAuth={setUser} />
        }
      />
      <Route
        path="*"
        element={
          user ? (
            <div className="min-h-screen">
              <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-white px-5 py-7 lg:flex">
                <Link to="/" className="mb-12 flex items-center gap-3 px-2">
                  <Logo />
                  <span className="display text-lg font-extrabold tracking-tight">
                    campus<span className="text-leaf">cash</span>
                  </span>
                </Link>
                <nav aria-label="Main navigation" className="space-y-1.5">
                  {navItems.map((item, index) => {
                    const Icon = icons[index];
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${isActive ? "bg-[#eff5eb] text-leaf" : "text-muted hover:bg-paper hover:text-ink"}`
                        }
                      >
                        <Icon size={18} strokeWidth={2} />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </nav>
                <div className="mt-auto rounded-2xl bg-[#eff5eb] p-4">
                  <div className="mb-2 flex items-center gap-2 text-leaf">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold">A little reminder</span>
                  </div>
                  <p className="text-sm leading-5 text-ink">
                    Small steps today make money feel lighter tomorrow.
                  </p>
                </div>
              </aside>
              <main className="min-h-screen pb-24 lg:ml-64 lg:pb-8">
                <header className="sticky top-0 z-10 border-b border-line/80 bg-paper/90 px-4 py-3 backdrop-blur-lg sm:px-7 lg:px-10">
                  <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        className="rounded-lg p-2 lg:hidden"
                        aria-label="Open navigation"
                        onClick={() => setMobileMenu(!mobileMenu)}
                      >
                        <Menu size={21} />
                      </button>
                      <div className="lg:hidden">
                        <Logo />
                      </div>
                      <p className="hidden text-sm font-medium text-muted sm:block">
                        {new Date().toLocaleDateString("en-IN", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-sm text-muted sm:block">
                        {user.email}
                      </span>
                      <button
                        aria-label="Log out"
                        onClick={() => void logout()}
                        className="rounded-xl border border-line bg-white p-2.5 text-muted hover:text-ink"
                      >
                        <LogOut size={17} />
                      </button>
                      <Button
                        onClick={() => setQuickAdd(true)}
                        className="!min-h-10 !px-3 sm:!px-4"
                      >
                        <Plus size={17} />
                        <span className="hidden sm:inline">Quick add</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                    </div>
                  </div>
                  {mobileMenu && (
                    <nav
                      aria-label="Mobile navigation"
                      className="absolute inset-x-0 top-full grid grid-cols-2 gap-2 border-b border-line bg-white p-4 shadow-lg lg:hidden"
                    >
                      {navItems.map((item, index) => {
                        const Icon = icons[index];
                        return (
                          <NavLink
                            onClick={() => setMobileMenu(false)}
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-[#eff5eb] text-leaf" : "text-muted"}`
                            }
                          >
                            <Icon size={17} />
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </nav>
                  )}
                </header>
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <Dashboard
                          currency={user.currency}
                          onQuickAdd={() => setQuickAdd(true)}
                        />
                      }
                    />
                    <Route
                      path="/transactions"
                      element={<Transactions currency={user.currency} />}
                    />
                    <Route
                      path="/budgets"
                      element={<Budgets currency={user.currency} />}
                    />
                    <Route
                      path="/goals"
                      element={<Goals currency={user.currency} />}
                    />
                    <Route
                      path="/scholarships"
                      element={<Scholarships currency={user.currency} />}
                    />
                    <Route
                      path="/jobs"
                      element={<Jobs currency={user.currency} />}
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
              <nav
                aria-label="Quick navigation"
                className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden"
              >
                {[
                  navItems[0],
                  navItems[1],
                  navItems[2],
                  navItems[3],
                  navItems[4],
                ].map((item) => {
                  const index = navItems.indexOf(item);
                  const Icon = icons[index];
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-leaf" : "text-muted"}`
                      }
                    >
                      <Icon size={19} />
                      {item.label === "Overview"
                        ? "Home"
                        : item.label === "Transactions"
                          ? "Activity"
                          : item.label === "Scholarships"
                            ? "Awards"
                            : item.label === "Savings goals"
                              ? "Goals"
                              : "Budget"}
                    </NavLink>
                  );
                })}
              </nav>
              {quickAdd && (
                <QuickAdd
                  currency={user.currency}
                  onClose={() => setQuickAdd(false)}
                />
              )}
            </div>
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      />
    </Routes>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-lime"
    >
      <BadgeIndianRupee size={21} />
    </span>
  );
}

function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>(
        `/auth/${signup ? "signup" : "login"}`,
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      onAuth(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-card md:grid-cols-2">
        <div className="flex min-h-[350px] flex-col justify-between bg-ink p-8 text-white sm:p-12">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="display text-xl font-extrabold">
              campus<span className="text-lime">cash</span>
            </span>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[.15em] text-lime">
              Your money, your momentum
            </p>
            <h1 className="max-w-sm text-4xl font-extrabold leading-tight sm:text-5xl">
              Make room for what matters.
            </h1>
            <p className="mt-4 max-w-sm leading-6 text-white/70">
              A little clarity goes a long way. Your student money life, all in
              one calm place.
            </p>
          </div>
          <p className="text-xs text-white/50">
            Built for student life. Ready when you are.
          </p>
        </div>
        <div className="flex items-center justify-center p-7 sm:p-12">
          <form onSubmit={submit} className="w-full max-w-sm space-y-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-leaf">
                {signup ? "A fresh start" : "Welcome back"}
              </p>
              <h2 className="text-2xl font-extrabold">
                {signup ? "Create your account" : "Sign in to CampusCash"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {signup
                  ? "Let’s make your money feel manageable."
                  : "Your goals are right where you left them."}
              </p>
            </div>
            <Field label="Email address">
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
              />
            </Field>
            <Field label="Password">
              <input
                className={inputClass}
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "One moment…" : signup ? "Create account" : "Sign in"}
              <ArrowUpRight size={17} />
            </Button>
            <p className="text-center text-sm text-muted">
              {signup ? "Already have an account?" : "New to CampusCash?"}{" "}
              <button
                type="button"
                className="font-bold text-leaf hover:underline"
                onClick={() => {
                  setSignup(!signup);
                  setError("");
                }}
              >
                {signup ? "Sign in" : "Create account"}
              </button>
            </p>
            <p className="text-center text-xs text-muted">
              Your information stays yours. We keep it private and secure.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  currency,
  onQuickAdd,
}: {
  currency: string;
  onQuickAdd: () => void;
}) {
  const { data, error, loading, refresh } =
    useResource<Summary>("/insights/summary");
  const [txData, setTxData] = useState<Transaction[]>([]);
  useEffect(() => {
    api<Page<Transaction>>("/transactions?limit=5")
      .then((response) => setTxData(response.items))
      .catch(() => setTxData([]));
  }, [data]);
  const today = new Date();
  if (loading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-16" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  if (error || !data)
    return (
      <ErrorState
        message={error || "Could not load your overview."}
        onRetry={() => void refresh()}
      />
    );
  const metrics = [
    {
      label: "Money in",
      value: data.income,
      icon: ArrowDownLeft,
      tint: "bg-[#edf6ee] text-leaf",
      note: "This month",
    },
    {
      label: "Money out",
      value: data.spent,
      icon: ArrowUpRight,
      tint: "bg-[#fff2e8] text-[#ae6233]",
      note: `${data.monthOverMonthChange > 0 ? "+" : ""}${data.monthOverMonthChange}% vs last month`,
    },
    {
      label: "Left in budget",
      value: data.budgetLeft,
      icon: Wallet,
      tint: "bg-[#f0effa] text-[#7065a4]",
      note:
        data.budgetLeft < 0
          ? "Over your monthly budget"
          : "Across your budgets",
    },
    {
      label: "Safe to spend daily",
      value: data.safeToSpendPerDay,
      icon: CalendarDays,
      tint: "bg-[#f5f5e8] text-[#818532]",
      note: "Until month end",
    },
  ];
  return (
    <div>
      <PageTitle
        eyebrow={today.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        })}
        title="Your money, at a glance"
        action={
          <Button onClick={onQuickAdd} variant="plain">
            <Plus size={17} />
            Add expense
          </Button>
        }
      />
      <div className="mb-5 rounded-2xl bg-ink p-5 text-white sm:flex sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="text-sm font-medium text-white/65">
            A good money day starts with a small check-in.
          </p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            {data.budgetLeft >= 0
              ? "You’re finding your rhythm."
              : "Let’s get back on track."}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Your month-end spend estimate is{" "}
            <strong className="text-lime">
              {money(data.forecast, currency)}
            </strong>{" "}
            at your current pace.
          </p>
        </div>
        <div className="mt-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lime sm:mt-0">
          <TrendingUp size={28} />
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="!p-4 sm:!p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted">{metric.label}</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight">
                  {money(metric.value, currency)}
                </p>
              </div>
              <span className={`rounded-xl p-2.5 ${metric.tint}`}>
                <metric.icon size={19} />
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{metric.note}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold">Spending rhythm</h2>
              <p className="mt-1 text-xs text-muted">Your last six months</p>
            </div>
            <span className="rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold text-muted">
              Expenses
            </span>
          </div>
          {data.trends.every((point) => point.spent === 0) ? (
            <EmptyMini
              title="Your trend starts here"
              detail="Log an expense to see your spending over time."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <AreaChart
                  data={data.trends}
                  margin={{ left: -20, right: 4, top: 8 }}
                >
                  <defs>
                    <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#92bb68"
                        stopOpacity={0.28}
                      />
                      <stop offset="95%" stopColor="#92bb68" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#edf0eb" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#829087", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#829087", fontSize: 10 }}
                    tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value), currency)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e7ebe5",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="#43825d"
                    strokeWidth={2.5}
                    fill="url(#spendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card>
          <div className="mb-4">
            <h2 className="text-base font-extrabold">Where it goes</h2>
            <p className="mt-1 text-xs text-muted">Your spending by category</p>
          </div>
          {data.categoryTotals.length ? (
            <div className="flex flex-col items-center sm:flex-row xl:flex-col">
              <div className="h-44 w-full max-w-[230px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.categoryTotals}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={54}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {data.categoryTotals.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={colors[index % colors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => money(Number(value), currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2">
                {data.categoryTotals.slice(0, 4).map((item, index) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <i
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: colors[index % colors.length],
                        }}
                      />
                      {item.category}
                    </span>
                    <strong>{money(item.amount, currency)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyMini
              title="No spending to break down"
              detail="Your category chart will appear here."
            />
          )}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold">Recent activity</h2>
              <p className="mt-1 text-xs text-muted">Your latest money moves</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-bold text-leaf hover:underline"
            >
              See all
            </Link>
          </div>
          {txData.length ? (
            txData
              .slice(0, 4)
              .map((tx) => (
                <TransactionRow key={tx.id} tx={tx} currency={currency} />
              ))
          ) : (
            <EmptyMini
              title="Your story starts with a transaction"
              detail="Log your first expense or income."
              action={
                <Button onClick={onQuickAdd} variant="outline">
                  <Plus size={15} />
                  Add one
                </Button>
              }
            />
          )}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold">Budget check-in</h2>
              <p className="mt-1 text-xs text-muted">
                A little progress adds up.
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-bold text-leaf hover:underline"
            >
              Details
            </Link>
          </div>
          {data.categoryBudgets.length ? (
            <div className="space-y-4">
              {data.categoryBudgets.slice(0, 4).map((item) => {
                const color =
                  item.level === "red"
                    ? "bg-red-600"
                    : item.level === "amber"
                      ? "bg-amber-500"
                      : "bg-leaf";
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold">{item.category}</span>
                      <span
                        className={
                          item.level === "red"
                            ? "font-bold text-red-700"
                            : item.level === "amber"
                              ? "font-bold text-amber-700"
                              : "text-muted"
                        }
                      >
                        {money(item.spent, currency)} /{" "}
                        {money(item.monthlyLimit, currency)}
                      </span>
                    </div>
                    <Progress
                      value={item.spent}
                      max={item.monthlyLimit}
                      color={color}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyMini
              title="Set a gentle limit"
              detail="Choose a category budget to see how you’re tracking."
              action={
                <Link
                  to="/budgets"
                  className="text-xs font-bold text-leaf hover:underline"
                >
                  Make a budget
                </Link>
              }
            />
          )}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold">On your horizon</h2>
              <p className="mt-1 text-xs text-muted">
                Scholarships worth keeping close
              </p>
            </div>
            <Link
              to="/scholarships"
              className="text-xs font-bold text-leaf hover:underline"
            >
              View all
            </Link>
          </div>
          {data.nextScholarship ? (
            <ScholarshipPreview
              item={data.nextScholarship}
              currency={currency}
            />
          ) : (
            <EmptyMini
              title="No deadlines on your list"
              detail="Add a scholarship so it doesn’t slip by."
            />
          )}
          {data.goals.slice(0, 2).map((goal) => (
            <div key={goal.id} className="mt-4 border-t border-line pt-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{goal.name}</span>
                <span className="text-muted">
                  {goal.target
                    ? Math.min(
                        100,
                        Math.round((goal.saved / goal.target) * 100),
                      )
                    : 0}
                  %
                </span>
              </div>
              <Progress value={goal.saved} max={goal.target} />
              <p className="mt-1 text-xs text-muted">
                {money(goal.saved, currency)} of {money(goal.target, currency)}
              </p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function EmptyMini({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center py-4 text-center">
      <span className="mb-2 rounded-xl bg-paper p-2.5 text-leaf">
        <Sparkles size={18} />
      </span>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted">{detail}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function Progress({
  value,
  max,
  color = "bg-leaf",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const percent =
    max > 0
      ? Math.min(100, Math.max(0, (value / max) * 100))
      : value > 0
        ? 100
        : 0;
  return (
    <div
      className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf0eb]"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function TransactionRow({
  tx,
  currency,
  trailing,
}: {
  tx: Transaction;
  currency: string;
  trailing?: ReactNode;
}) {
  const positive = tx.type === "INCOME";
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${positive ? "bg-[#edf6ee] text-leaf" : "bg-paper text-muted"}`}
      >
        {positive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{tx.note || tx.category}</p>
        <p className="mt-0.5 text-xs text-muted">
          {tx.category} ·{" "}
          {new Date(tx.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
      <p className={`text-sm font-bold ${positive ? "text-leaf" : "text-ink"}`}>
        {positive ? "+" : "−"}
        {money(tx.amount, currency)}
      </p>
      {trailing}
    </div>
  );
}

function ScholarshipPreview({
  item,
  currency,
}: {
  item: Scholarship;
  currency: string;
}) {
  const days = Math.ceil(
    (new Date(item.deadline).getTime() - Date.now()) / 86400000,
  );
  return (
    <div className="flex items-center gap-3 rounded-xl bg-paper p-3.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-leaf">
        <BookOpenCheck size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {money(item.amount, currency)} ·{" "}
          {days < 0
            ? `${Math.abs(days)} days overdue`
            : days === 0
              ? "Due today"
              : `${days} days left`}
        </p>
      </div>
      <Clock3
        size={16}
        className={days <= 7 ? "text-amber-600" : "text-muted"}
      />
    </div>
  );
}

function Transactions({ currency }: { currency: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const path = `/transactions?month=${month}&limit=100${category ? `&category=${encodeURIComponent(category)}` : ""}`;
  const { data, error, loading, refresh } =
    useResource<Page<Transaction>>(path);
  async function remove(id: string) {
    if (!window.confirm("Delete this transaction? This can’t be undone."))
      return;
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not delete transaction.",
      );
    }
  }
  return (
    <div>
      <PageTitle
        eyebrow="Keep it simple"
        title="Transactions"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={17} />
            Add transaction
          </Button>
        }
      />
      <Card>
        <div className="mb-5 flex flex-wrap gap-3">
          <Field label="Month">
            <input
              type="month"
              className={`${inputClass} !w-auto`}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <select
              className={`${inputClass} !w-auto min-w-36`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
        {notice && (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {notice}
          </p>
        )}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : data?.items.length ? (
          data.items.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              currency={currency}
              trailing={
                <div className="flex gap-1">
                  <button
                    aria-label={`Edit ${tx.note || tx.category}`}
                    onClick={() => {
                      setEditing(tx);
                      setFormOpen(true);
                    }}
                    className="rounded-lg p-2 text-muted hover:bg-paper hover:text-ink"
                  >
                    <Settings2 size={16} />
                  </button>
                  <button
                    aria-label={`Delete ${tx.note || tx.category}`}
                    onClick={() => void remove(tx.id)}
                    className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              }
            />
          ))
        ) : (
          <EmptyMini
            title="Nothing logged this month"
            detail="Start with the little things. They add up to a clearer picture."
            action={
              <Button onClick={() => setFormOpen(true)} variant="outline">
                <Plus size={15} />
                Add a transaction
              </Button>
            }
          />
        )}
      </Card>
      {formOpen && (
        <Modal
          title={editing ? "Edit transaction" : "Add a transaction"}
          onClose={() => setFormOpen(false)}
        >
          <TransactionForm
            currency={currency}
            initial={editing}
            onCancel={() => setFormOpen(false)}
            onSaved={async () => {
              setFormOpen(false);
              await refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function TransactionForm({
  currency,
  initial,
  onCancel,
  onSaved,
}: {
  currency: string;
  initial: Transaction | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initial?.type ?? "EXPENSE",
  );
  const [amount, setAmount] = useState(
    initial ? String(initial.amount / 100) : "",
  );
  const [category, setCategory] = useState(initial?.category ?? "Food");
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(
    initial ? localDate(initial.date) : localDate(new Date().toISOString()),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const minorAmount = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        type,
        amount: minorAmount,
        category,
        note,
        date: new Date(`${date}T12:00:00`).toISOString(),
      };
      await api(initial ? `/transactions/${initial.id}` : "/transactions", {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this transaction.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#edf0eb] p-1">
        <button
          type="button"
          onClick={() => setType("EXPENSE")}
          className={`rounded-lg py-2.5 text-sm font-bold ${type === "EXPENSE" ? "bg-white shadow-sm" : "text-muted"}`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("INCOME")}
          className={`rounded-lg py-2.5 text-sm font-bold ${type === "INCOME" ? "bg-white shadow-sm" : "text-muted"}`}
        >
          Income
        </button>
      </div>
      <Field label={`Amount (${currency})`}>
        <input
          autoFocus
          className={inputClass}
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {(type === "EXPENSE"
              ? categories
              : ["Allowance", "Salary", "Scholarship", "Freelance", "Other"]
            ).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            className={inputClass}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input
          className={inputClass}
          maxLength={240}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for?"
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : initial ? "Save changes" : "Save transaction"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function QuickAdd({
  currency,
  onClose,
}: {
  currency: string;
  onClose: () => void;
}) {
  return (
    <Modal title="A quick money note" onClose={onClose}>
      <TransactionForm
        currency={currency}
        initial={null}
        onCancel={onClose}
        onSaved={async () => {
          window.dispatchEvent(new Event("campuscash:refresh"));
          onClose();
        }}
      />
    </Modal>
  );
}

function Budgets({ currency }: { currency: string }) {
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const { loading, refresh } = useResource<Page<Budget>>("/budgets?limit=100");
  const { data: summary, refresh: refreshSummary } =
    useResource<Summary>("/insights/summary");
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    const monthlyLimit = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(monthlyLimit) || monthlyLimit <= 0) {
      setError("Enter a monthly limit greater than zero.");
      return;
    }
    try {
      await api("/budgets", {
        method: "POST",
        body: JSON.stringify({ category, monthlyLimit }),
      });
      setAmount("");
      await refresh();
      await refreshSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save budget.");
    }
  }
  return (
    <div>
      <PageTitle eyebrow="Give your money a plan" title="Monthly budgets" />
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card>
          <h2 className="mb-1 text-base font-extrabold">
            Set a category limit
          </h2>
          <p className="mb-5 text-sm text-muted">
            Keep it realistic; you can always adjust it.
          </p>
          <form onSubmit={save} className="space-y-4">
            <Field label="Category">
              <select
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label={`Monthly limit (${currency})`}>
              <input
                className={inputClass}
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 4,000"
              />
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              <Plus size={16} />
              Create budget
            </Button>
          </form>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold">This month’s plan</h2>
              <p className="mt-1 text-xs text-muted">
                You can see how you’re doing at a glance.
              </p>
            </div>
            <span className="rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold text-muted">
              {new Date().toLocaleDateString("en-IN", { month: "long" })}
            </span>
          </div>
          {loading ? (
            <Skeleton />
          ) : summary?.categoryBudgets.length ? (
            <div className="space-y-5">
              {summary.categoryBudgets.map((item) => {
                const color =
                  item.level === "red"
                    ? "bg-red-600"
                    : item.level === "amber"
                      ? "bg-amber-500"
                      : "bg-leaf";
                return (
                  <div key={item.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{item.category}</p>
                        <p className="mt-1 text-xs text-muted">
                          {money(item.spent, currency)} spent of{" "}
                          {money(item.monthlyLimit, currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{item.percent}%</p>
                        <p
                          className={`text-xs font-semibold ${item.overspent ? "text-red-700" : item.level === "amber" ? "text-amber-700" : "text-muted"}`}
                        >
                          {item.overspent
                            ? `${money(Math.abs(item.remaining), currency)} over`
                            : `${money(item.remaining, currency)} left`}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={item.spent}
                      max={item.monthlyLimit}
                      color={color}
                    />
                    <p className="mt-1 text-xs text-muted">
                      {item.level === "red"
                        ? "Over budget — take a breath and adjust your plan."
                        : item.level === "amber"
                          ? "Getting close — you’ve used at least 80%."
                          : "On track"}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyMini
              title="Your plan begins with one category"
              detail="Add a monthly limit to see your progress here."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function Goals({ currency }: { currency: string }) {
  const { data, loading, error, refresh } =
    useResource<Page<Goal>>("/goals?limit=100");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [direction, setDirection] = useState<"deposit" | "withdraw">("deposit");
  async function contribute(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    const minorAmount = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    try {
      await api(`/goals/${active.id}/deposit`, {
        method: "POST",
        body: JSON.stringify({ amount: minorAmount, direction }),
      });
      setActive(null);
      setAmount("");
      setFormError("");
      await refresh();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not add money to this goal.",
      );
    }
  }
  return (
    <div>
      <PageTitle
        eyebrow="The future you is cheering"
        title="Savings goals"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            New goal
          </Button>
        }
      />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((x) => (
            <Skeleton key={x} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((goal) => {
            const pct = goal.target
              ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
              : 0;
            const months = Math.max(
              1,
              (new Date(goal.targetDate).getFullYear() -
                new Date().getFullYear()) *
                12 +
                new Date(goal.targetDate).getMonth() -
                new Date().getMonth(),
            );
            const monthly = Math.max(0, goal.target - goal.saved) / months;
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between">
                  <span className="rounded-xl bg-[#eff5eb] p-3 text-leaf">
                    <Target size={20} />
                  </span>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-muted">
                    {pct}% there
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-extrabold">{goal.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  Target date ·{" "}
                  {new Date(goal.targetDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <Progress value={goal.saved} max={goal.target} />
                <div className="mt-3 flex justify-between text-sm">
                  <span>
                    <strong>{money(goal.saved, currency)}</strong>{" "}
                    <span className="text-muted">saved</span>
                  </span>
                  <span className="text-muted">
                    of {money(goal.target, currency)}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-paper p-3">
                  <span className="text-xs text-muted">
                    To reach it, save about
                  </span>
                  <strong className="text-sm">
                    {money(monthly, currency)} / month
                  </strong>
                </div>{" "}
                <Button
                  onClick={() => {
                    setActive(goal);
                    setFormError("");
                    setDirection("deposit");
                  }}
                  variant="outline"
                  className="mt-4 w-full"
                >
                  <Plus size={16} />
                  Update savings
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyMini
            title="Give your savings a destination"
            detail="A laptop, a trip home, a little rainy-day cushion — it all starts with a goal."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus size={15} />
                Create a goal
              </Button>
            }
          />
        </Card>
      )}
      {open && (
        <Modal title="Create a savings goal" onClose={() => setOpen(false)}>
          <GoalForm
            currency={currency}
            onCancel={() => setOpen(false)}
            onSaved={async () => {
              setOpen(false);
              await refresh();
            }}
          />
        </Modal>
      )}
      {active && (
        <Modal title={`Update ${active.name}`} onClose={() => setActive(null)}>
          <form onSubmit={contribute} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#edf0eb] p-1">
              <button
                type="button"
                onClick={() => setDirection("deposit")}
                className={`rounded-lg py-2.5 text-sm font-bold ${direction === "deposit" ? "bg-white shadow-sm" : "text-muted"}`}
              >
                Add savings
              </button>
              <button
                type="button"
                onClick={() => setDirection("withdraw")}
                className={`rounded-lg py-2.5 text-sm font-bold ${direction === "withdraw" ? "bg-white shadow-sm" : "text-muted"}`}
              >
                Withdraw
              </button>
            </div>
            <p className="text-sm text-muted">
              Current savings: {money(active.saved, currency)}
            </p>
            <Field label={`Amount (${currency})`}>
              <input
                autoFocus
                className={inputClass}
                type="number"
                step="0.01"
                min="0.01"
                max={direction === "withdraw" ? active.saved / 100 : undefined}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            {formError && (
              <p role="alert" className="text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {direction === "deposit" ? (
                  <Plus size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                )}
                {direction === "deposit" ? "Add savings" : "Withdraw"}
              </Button>
              <Button variant="outline" onClick={() => setActive(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function GoalForm({
  currency,
  onCancel,
  onSaved,
}: {
  currency: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Math.round(Number(target) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Enter a target greater than zero.");
      return;
    }
    if (!targetDate || targetDate < localDate(new Date().toISOString())) {
      setError("Choose a date in the future.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/goals", {
        method: "POST",
        body: JSON.stringify({
          name,
          target: amount,
          targetDate: new Date(`${targetDate}T12:00:00`).toISOString(),
        }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create goal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="What are you saving for?">
        <input
          className={inputClass}
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="A laptop, a trip home…"
        />
      </Field>
      <Field label={`Target amount (${currency})`}>
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0.01"
          required
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0.00"
        />
      </Field>
      <Field label="Target date">
        <input
          className={inputClass}
          type="date"
          required
          min={localDate(new Date().toISOString())}
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Creating…" : "Create goal"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Scholarships({ currency }: { currency: string }) {
  const { data, loading, error, refresh } = useResource<Page<Scholarship>>(
    "/scholarships?limit=100",
  );
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const shown = useMemo(
    () =>
      (data?.items ?? []).filter(
        (item) => filter === "ALL" || item.status === filter,
      ),
    [data, filter],
  );
  return (
    <div>
      <PageTitle
        eyebrow="Future funding"
        title="Scholarship tracker"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add scholarship
          </Button>
        }
      />
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Keep every opportunity and deadline in one place.
          </p>
          <select
            aria-label="Filter scholarships"
            className={`${inputClass} !w-auto`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="TO_APPLY">To apply</option>
            <option value="APPLIED">Applied</option>
            <option value="WON">Won</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton className="h-20" key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : shown.length ? (
          <div className="space-y-3">
            {shown.map((item) => (
              <ScholarshipCard
                key={item.id}
                item={item}
                currency={currency}
                onUpdate={async (status) => {
                  await api(`/scholarships/${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  });
                  await refresh();
                }}
                onDelete={async () => {
                  if (window.confirm("Delete this scholarship?")) {
                    await api(`/scholarships/${item.id}`, { method: "DELETE" });
                    await refresh();
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyMini
            title="No scholarships here yet"
            detail="Add one you’ve spotted and we’ll help keep the deadline in view."
            action={
              <Button onClick={() => setOpen(true)} variant="outline">
                <Plus size={15} />
                Add one
              </Button>
            }
          />
        )}
      </Card>
      {open && (
        <Modal title="Add a scholarship" onClose={() => setOpen(false)}>
          <ScholarshipForm
            currency={currency}
            onCancel={() => setOpen(false)}
            onSaved={async () => {
              setOpen(false);
              await refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ScholarshipCard({
  item,
  currency,
  onUpdate,
  onDelete,
}: {
  item: Scholarship;
  currency: string;
  onUpdate: (status: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const days = Math.ceil(
    (new Date(item.deadline).getTime() - Date.now()) / 86400000,
  );
  const label: Record<string, string> = {
    TO_APPLY: "To apply",
    APPLIED: "Applied",
    WON: "Won",
    REJECTED: "Rejected",
  };
  const statusColor: Record<string, string> = {
    TO_APPLY: "bg-[#fff4df] text-[#885d12]",
    APPLIED: "bg-[#eff5eb] text-leaf",
    WON: "bg-[#e9f4f3] text-[#35716c]",
    REJECTED: "bg-paper text-muted",
  };
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff5eb] text-leaf sm:flex">
        <BookOpenCheck size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">{item.name}</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusColor[item.status]}`}
          >
            {label[item.status] ?? item.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {money(item.amount, currency)} · Deadline{" "}
          {new Date(item.deadline).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <p
          className={`mt-1 text-xs font-semibold ${days < 0 ? "text-red-700" : days <= 7 ? "text-amber-700" : "text-muted"}`}
        >
          {days < 0
            ? `Overdue by ${Math.abs(days)} days`
            : days === 0
              ? "Due today"
              : `${days} days left`}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {item.url && (
          <a
            className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-leaf hover:bg-paper"
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            Open link
          </a>
        )}
        <select
          aria-label={`Update status for ${item.name}`}
          className={`${inputClass} !w-auto !py-2 text-xs`}
          value={item.status}
          onChange={(e) => {
            setError("");
            void onUpdate(e.target.value).catch((err: unknown) =>
              setError(
                err instanceof Error ? err.message : "Could not update status.",
              ),
            );
          }}
        >
          {Object.entries(label).map(([key, text]) => (
            <option value={key} key={key}>
              {text}
            </option>
          ))}
        </select>
        <button
          aria-label={`Delete ${item.name}`}
          onClick={() => {
            setError("");
            void onDelete().catch((err: unknown) =>
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not delete scholarship.",
              ),
            );
          }}
          className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ScholarshipForm({
  currency,
  onCancel,
  onSaved,
}: {
  currency: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("TO_APPLY");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(minor) || minor < 0) {
      setError("Enter a valid award amount.");
      return;
    }
    if (!deadline) {
      setError("Choose the scholarship deadline.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/scholarships", {
        method: "POST",
        body: JSON.stringify({
          name,
          amount: minor,
          deadline: new Date(`${deadline}T12:00:00`).toISOString(),
          url,
          status,
        }),
      });
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not add scholarship.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Scholarship name">
        <input
          className={inputClass}
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Future Leaders Award"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Award amount (${currency})`}>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Deadline">
          <input
            className={inputClass}
            type="date"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Application link (optional)">
        <input
          className={inputClass}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
        />
      </Field>
      <Field label="Status">
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="TO_APPLY">To apply</option>
          <option value="APPLIED">Applied</option>
          <option value="WON">Won</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </Field>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : "Save scholarship"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Jobs({ currency }: { currency: string }) {
  const { data, loading, error, refresh } =
    useResource<Page<Job>>("/jobs?limit=100");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const projected = (job: Job) => job.hourlyRate * job.hoursPerWeek * 4.33;
  return (
    <div>
      <PageTitle
        eyebrow="Make your time count"
        title="Income planner"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add a gig
          </Button>
        }
      />
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Plan around your week</h2>
              <p className="mt-1 text-sm text-muted">
                See what your time could add up to.
              </p>
            </div>
            <span className="rounded-xl bg-[#eff5eb] p-3 text-leaf">
              <Banknote size={20} />
            </span>
          </div>
          {notice && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {notice}
            </p>
          )}
          {loading ? (
            <Skeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
          ) : data?.items.length ? (
            <div className="space-y-3">
              {data.items.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-paper p-4"
                >
                  <div>
                    <h3 className="font-bold">{job.title}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {money(job.hourlyRate, currency)}/hr · {job.hoursPerWeek}{" "}
                      hrs/week
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-leaf">
                      {money(projected(job), currency)}
                    </p>
                    <p className="text-[11px] text-muted">per month</p>
                  </div>
                  <button
                    aria-label={`Delete ${job.title}`}
                    onClick={async () => {
                      if (window.confirm("Remove this gig?")) {
                        try {
                          await api(`/jobs/${job.id}`, { method: "DELETE" });
                          await refresh();
                        } catch (err) {
                          setNotice(
                            err instanceof Error
                              ? err.message
                              : "Could not remove gig.",
                          );
                        }
                      }
                    }}
                    className="rounded-lg p-2 text-muted hover:bg-white hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyMini
              title="See what a side gig could bring in"
              detail="Add your hourly rate and weekly hours for a monthly estimate."
              action={
                <Button onClick={() => setOpen(true)} variant="outline">
                  <Plus size={15} />
                  Add a gig
                </Button>
              }
            />
          )}
        </Card>
        <Card className="bg-[#eff5eb]">
          <p className="text-xs font-bold uppercase tracking-[.13em] text-leaf">
            Monthly projection
          </p>
          <p className="mt-3 text-3xl font-extrabold">
            {money(
              (data?.items ?? []).reduce(
                (total, job) => total + projected(job),
                0,
              ),
              currency,
            )}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Based on 4.33 weeks in a month and the hours you’re able to give.
          </p>
          <div className="mt-6 flex items-start gap-2 border-t border-[#dce8d7] pt-4 text-xs leading-5 text-muted">
            <CircleHelp size={15} className="mt-0.5 shrink-0" />
            An estimate, not a promise — leave room for exams, rest, and the
            things that matter.
          </div>
        </Card>
      </div>
      <div className="mb-4">
        <h2 className="text-lg font-extrabold">
          A few ideas to get you started
        </h2>
        <p className="mt-1 text-sm text-muted">
          Flexible work that can fit around student life.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {jobIdeas.map((idea) => (
          <Card key={idea.title} className="!p-4">
            <span className="mb-4 inline-flex rounded-xl bg-paper p-2.5 text-leaf">
              <idea.icon size={18} />
            </span>
            <h3 className="font-bold">{idea.title}</h3>
            <p className="mt-1 text-sm text-muted">{idea.detail}</p>
          </Card>
        ))}
      </div>
      {open && (
        <Modal title="Add an income source" onClose={() => setOpen(false)}>
          <JobForm
            currency={currency}
            onCancel={() => setOpen(false)}
            onSaved={async () => {
              setOpen(false);
              await refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function JobForm({
  currency,
  onCancel,
  onSaved,
}: {
  currency: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [rate, setRate] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const hourlyRate = Math.round(Number(rate) * 100);
    const hoursPerWeek = Number(hours);
    if (
      !Number.isSafeInteger(hourlyRate) ||
      hourlyRate <= 0 ||
      !Number.isFinite(hoursPerWeek) ||
      hoursPerWeek <= 0 ||
      hoursPerWeek > 80
    ) {
      setError("Enter a valid hourly rate and 1–80 hours per week.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/jobs", {
        method: "POST",
        body: JSON.stringify({ title, hourlyRate, hoursPerWeek }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save gig.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Gig or role">
        <input
          className={inputClass}
          required
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Math tutor"
        />
      </Field>
      <Field label={`Hourly rate (${currency})`}>
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0.01"
          required
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="0.00"
        />
      </Field>
      <Field label="Hours per week">
        <input
          className={inputClass}
          type="number"
          step="0.5"
          min="0.5"
          max="80"
          required
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="e.g. 6"
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : "Add income source"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
      <p className="font-bold">We couldn’t load this just now.</p>
      <p className="mt-1">{message}</p>
      <button className="mt-2 font-bold underline" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export default App;
