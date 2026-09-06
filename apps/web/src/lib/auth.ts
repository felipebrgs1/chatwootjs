import { useCallback, useEffect, useState } from "react";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

const ACCESS_KEY = "cw_access_token";
const REFRESH_KEY = "cw_refresh_token";
const ACCOUNT_KEY = "cw_account_id";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  availability: "online" | "busy" | "offline";
}

export interface SessionAccount {
  id: number;
  name: string;
  locale: string;
  role: "agent" | "administrator";
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getSelectedAccountId(): number | null {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function setSelectedAccountId(id: number): void {
  localStorage.setItem(ACCOUNT_KEY, String(id));
}

export class ApiError extends Error {
  readonly status: number;
  readonly attributes?: Record<string, string[]>;

  constructor(status: number, message: string, attributes?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.attributes = attributes;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${SERVER_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { data: { access_token: string; refresh_token: string } };
    saveTokens(body.data.access_token, body.data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/** fetch autenticado com Bearer + rotação de refresh (1 retry). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const request = async (): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(`${SERVER_URL}${path}`, { ...init, headers });
  };

  let res = await request();
  if (res.status === 401 && getRefreshToken() && (await tryRefresh())) {
    res = await request();
  }
  if (res.status === 401) {
    clearSession();
    throw new ApiError(401, "Sessão expirada — entre novamente");
  }
  const body = (await res.json()) as {
    data: T;
    error?: string;
    attributes?: Record<string, string[]>;
  };
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "Erro inesperado", body.attributes);
  }
  return body.data;
}

// ---- Auth actions (públicas) ----

export interface SignInResult {
  user: SessionUser;
  access_token: string;
  refresh_token: string;
}

async function publicPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as {
    data: T;
    error?: string;
    attributes?: Record<string, string[]>;
  };
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? "Erro inesperado", body.attributes);
  }
  return body.data;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const data = await publicPost<SignInResult>("/auth/sign_in", { email, password });
  saveTokens(data.access_token, data.refresh_token);
  const accounts = await apiFetch<{ accounts: SessionAccount[] }>("/api/v1/accounts");
  const first = accounts.accounts[0];
  if (first) setSelectedAccountId(first.id);
  return data.user;
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  accountName?: string,
): Promise<SessionUser> {
  const data = await publicPost<SignInResult & { account_id: number }>("/auth/sign_up", {
    name,
    email,
    password,
    account_name: accountName,
  });
  saveTokens(data.access_token, data.refresh_token);
  setSelectedAccountId(data.account_id);
  return data.user;
}

export async function signOut(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await publicPost("/auth/sign_out", { refresh_token: refreshToken });
    } catch {
      // sair mesmo se o servidor falhar
    }
  }
  clearSession();
}

// ---- Sessão (hook) ----

export interface Session {
  user: SessionUser;
  accounts: SessionAccount[];
  accountId: number;
  account: SessionAccount;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!getAccessToken()) throw new ApiError(401, "Sem sessão");
      const [{ user }, { accounts }] = await Promise.all([
        apiFetch<{ user: SessionUser }>("/api/v1/profile"),
        apiFetch<{ accounts: SessionAccount[] }>("/api/v1/accounts"),
      ]);
      if (accounts.length === 0) throw new ApiError(403, "Nenhuma conta vinculada");
      let accountId = getSelectedAccountId();
      if (!accountId || !accounts.some((a) => a.id === accountId)) {
        accountId = accounts[0]!.id;
        setSelectedAccountId(accountId);
      }
      const account = accounts.find((a) => a.id === accountId)!;
      setSession({ user, accounts, accountId, account });
    } catch (err) {
      setSession(null);
      setError(err instanceof ApiError ? err : new ApiError(500, "Erro inesperado"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, [load]);

  const switchAccount = useCallback(
    (id: number) => {
      setSelectedAccountId(id);
      void load();
    },
    [load],
  );

  return { session, loading, error, reload: load, switchAccount };
}
