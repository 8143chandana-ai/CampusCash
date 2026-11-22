export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) {
    throw new ApiError(
      body.error?.message ?? "Something went wrong.",
      body.error?.code ?? "UNKNOWN",
      response.status,
    );
  }
  return body as T;
}

export function money(amount: number, currency = "INR") {
  const rupees = amount / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function localDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}
