const SUPER_KEY = "cw_super_token";

export function getSuperToken(): string | null {
  try {
    return localStorage.getItem(SUPER_KEY);
  } catch {
    return null;
  }
}

export class SuperApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function superFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(getSuperToken() ? { Authorization: `Bearer ${getSuperToken()}` } : undefined),
      ...init.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };
  if (!res.ok) throw new SuperApiError(res.status, body.error ?? `Erro ${res.status}`);
  return body.data as T;
}

export async function superSignIn(email: string, password: string): Promise<void> {
  const data = await superFetch<{ token: string }>(`/super_admin/auth/sign_in`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  try {
    localStorage.setItem(SUPER_KEY, data.token);
  } catch {
    /* privado — segue sem persistir */
  }
}

export function superSignOut(): void {
  try {
    localStorage.removeItem(SUPER_KEY);
  } catch {
    /* noop */
  }
}
