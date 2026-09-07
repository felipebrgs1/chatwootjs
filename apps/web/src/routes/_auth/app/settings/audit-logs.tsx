import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useSessionContext } from "@/components/session-provider";
import { apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/audit-logs")({
  component: AuditLogsPage,
});

interface AuditLogRow {
  id: number;
  user_id: number | null;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  changes: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: "criou",
  update: "alterou",
  destroy: "excluiu",
};

/** M12 — Trilha de auditoria (só admin): timeline por ator/ação/recurso. */
function AuditLogsPage() {
  const { session } = useSessionContext();
  const accountId = session?.accountId ?? null;
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [actor, setActor] = useState("");
  const [resource, setResource] = useState("");

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (actor.trim()) params.set("user_id", actor.trim());
    if (resource.trim()) params.set("auditable_type", resource.trim());
    void apiFetch<{ audit_logs: AuditLogRow[] }>(
      `/api/v1/accounts/${accountId}/audit_logs?${params}`,
    )
      .then((data) => {
        if (!cancelled) setItems(data.audit_logs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, actor, resource]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Quem criou, alterou ou excluiu cada recurso da conta.
        </p>
      </header>
      <main className="grid content-start gap-4 p-6">
        <div className="flex gap-2">
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Filtrar por ator (user_id)…"
            inputMode="numeric"
            className="h-9 w-56 rounded-md border bg-card px-3 text-sm outline-none focus:border-woot-blue"
          />
          <input
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            placeholder="Filtrar por recurso (ex.: Conversation)…"
            className="h-9 w-64 rounded-md border bg-card px-3 text-sm outline-none focus:border-woot-blue"
          />
        </div>
        <ul className="divide-y divide-border rounded-lg border bg-card">
          {items.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">
              Nenhum evento registrado ainda.
            </li>
          )}
          {items.map((log) => (
            <li key={log.id} className="px-4 py-2.5 text-sm">
              <p>
                <span className="font-medium">
                  {log.user_id != null ? `Agente #${log.user_id}` : "Sistema"}
                </span>{" "}
                {ACTION_LABELS[log.action] ?? log.action}{" "}
                <span className="font-mono text-xs">
                  {log.auditable_type ?? "—"}#{log.auditable_id ?? "—"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString("pt-BR")}
                {Object.keys(log.changes).length > 0 && ` · ${Object.keys(log.changes).join(", ")}`}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
