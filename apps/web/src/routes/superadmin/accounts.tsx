import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";

import { SuperApiError, getSuperToken, superFetch, superSignOut } from "@/lib/superadmin";

export const Route = createFileRoute("/superadmin/accounts")({
  component: SuperAdminPage,
});

type Tab = "accounts" | "users" | "settings";

interface AccountRow {
  id: number;
  name: string;
  locale: string;
  users: number;
  created_at: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  accounts: number;
}

interface ConfigRow {
  id: number;
  name: string;
  value: unknown;
  locked: boolean;
}

/** M12 — Console do superadmin: contas, usuários, installation_configs. */
function SuperAdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("accounts");
  const [q, setQ] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!getSuperToken()) {
      void navigate({ to: "/superadmin/login" });
      return;
    }
    let cancelled = false;
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    void (async () => {
      try {
        if (tab === "accounts") {
          const data = await superFetch<{ accounts: AccountRow[] }>(
            `/super_admin/accounts${params}`,
          );
          if (!cancelled) setAccounts(data.accounts);
        } else if (tab === "users") {
          const data = await superFetch<{ users: UserRow[] }>(`/super_admin/users${params}`);
          if (!cancelled) setUsers(data.users);
        } else {
          const data = await superFetch<{ installation_configs: ConfigRow[] }>(
            `/super_admin/installation_configs`,
          );
          if (!cancelled) setConfigs(data.installation_configs);
        }
      } catch (err) {
        if (err instanceof SuperApiError && err.status === 401 && !cancelled) {
          superSignOut();
          void navigate({ to: "/superadmin/login" });
        } else if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro inesperado");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, q, navigate, version]);

  async function remove(path: string): Promise<void> {
    if (!window.confirm("Excluir permanentemente?")) return;
    await superFetch(path, { method: "DELETE" });
    setVersion((v) => v + 1);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <nav className="flex gap-1" aria-label="Superadmin">
          {(["accounts", "users", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "rounded-lg bg-woot-nav-active-bg px-3 py-1.5 text-sm font-medium text-woot-blue"
                  : "rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              }
            >
              {t === "accounts" ? "Contas" : t === "users" ? "Usuários" : "Configurações"}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="h-8 w-48"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              superSignOut();
              void navigate({ to: "/superadmin/login" });
            }}
          >
            Sair
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {tab === "accounts" && (
        <table className="w-full overflow-hidden rounded-lg border bg-card text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Conta</th>
              <th className="px-3 py-2">Locale</th>
              <th className="px-3 py-2">Usuários</th>
              <th className="px-3 py-2">Criada em</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="px-3 py-2">{a.id}</td>
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2">{a.locale}</td>
                <td className="px-3 py-2">{a.users}</td>
                <td className="px-3 py-2">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => void remove(`/super_admin/accounts/${a.id}`)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "users" && (
        <table className="w-full overflow-hidden rounded-lg border bg-card text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Contas</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.accounts}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => void remove(`/super_admin/users/${u.id}`)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "settings" && (
        <ul className="grid gap-2">
          {configs.map((c) => (
            <li key={c.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <p className="font-mono text-xs font-medium">{c.name}</p>
              <pre className="mt-1 max-h-32 overflow-auto text-xs text-muted-foreground">
                {JSON.stringify(c.value, null, 2)}
              </pre>
            </li>
          ))}
          {configs.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhuma configuração registrada.</li>
          )}
        </ul>
      )}
    </div>
  );
}
