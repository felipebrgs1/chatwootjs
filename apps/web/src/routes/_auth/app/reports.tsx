import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { useSessionContext } from "@/components/session-provider";
import {
  formatDuration,
  getReportTable,
  getSummary,
  type BreakdownRow,
  type CsatReport,
  type OverviewPoint,
  type Summary,
} from "@/lib/reports";

export const Route = createFileRoute("/_auth/app/reports")({
  component: ReportsPage,
});

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "agents", label: "Agentes" },
  { value: "teams", label: "Times" },
  { value: "inboxes", label: "Inboxes" },
  { value: "labels", label: "Labels" },
  { value: "csat", label: "CSAT" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function defaultSince(): string {
  const d = new Date(Date.now() - 30 * 24 * 3600_000);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ReportsPage() {
  const { session } = useSessionContext();
  const [tab, setTab] = useState<Tab>("overview");
  const [since, setSince] = useState(defaultSince);
  const [until, setUntil] = useState(today);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cache, setCache] = useState<
    Record<string, { rows?: BreakdownRow[]; overview?: OverviewPoint[]; csat?: CsatReport }>
  >({});

  const params = useMemo(
    () => ({ since, until, timezone_offset: -new Date().getTimezoneOffset() }),
    [since, until],
  );
  const dataKey = `${tab}|${params.since}|${params.until}|${params.timezone_offset}`;
  const current = cache[dataKey] ?? {};
  const rows = current.rows ?? null;
  const overview = current.overview ?? null;
  const csat = current.csat ?? null;

  useEffect(() => {
    if (!session) return;
    void getSummary(session.accountId, params)
      .then(setSummary)
      .catch(() => {});
  }, [session, params]);

  useEffect(() => {
    if (!session || cache[dataKey]) return;
    let cancelled = false;
    const store = (patch: {
      rows?: BreakdownRow[];
      overview?: OverviewPoint[];
      csat?: CsatReport;
    }) => {
      if (!cancelled) setCache((prev) => ({ ...prev, [dataKey]: patch }));
    };
    if (tab === "overview") {
      void getReportTable(session.accountId, "overview", params)
        .then((d) => store({ overview: d as OverviewPoint[] }))
        .catch(() => {});
    } else if (tab === "csat") {
      void getReportTable(session.accountId, "csat", params)
        .then((d) => store({ csat: d as CsatReport }))
        .catch(() => {});
    } else {
      void getReportTable(session.accountId, tab, params)
        .then((d) => store({ rows: d as BreakdownRow[] }))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [session, tab, params, dataKey, cache]);

  function exportCsv(): void {
    const head = ["nome", "conversas", "resolucoes", "primeira_resposta_s", "resolucao_s"];
    const lines = (rows ?? []).map((r) =>
      [
        `"${r.name.replaceAll('"', '""')}"`,
        r.conversations_count,
        r.resolutions_count,
        r.avg_first_response_time ?? "",
        r.avg_resolution_time ?? "",
      ].join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${tab}-${since}-${until}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis: Array<[string, string]> = summary
    ? [
        ["Conversas", String(summary.conversations_count)],
        ["Recebidas", String(summary.incoming_messages_count)],
        ["Enviadas", String(summary.outgoing_messages_count)],
        ["Resolvidas", String(summary.resolutions_count)],
        ["1ª resposta média", formatDuration(summary.avg_first_response_time)],
        ["Resolução média", formatDuration(summary.avg_resolution_time)],
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Desempenho da operação no período.</p>
      </header>
      <main className="grid content-start gap-4 p-6">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
          <div className="grid gap-1.5">
            <Label htmlFor="since">De</Label>
            <Input
              id="since"
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="until">Até</Label>
            <Input
              id="until"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <Button
                key={t.value}
                variant={tab === t.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          {rows && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={exportCsv}>
              Exportar CSV
            </Button>
          )}
        </div>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-white p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        {tab === "overview" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-medium">Conversas por dia</h2>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={overview ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="conversations_count"
                      stroke="#1f93ff"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-medium">Resoluções por dia</h2>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={overview ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="resolutions_count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {tab === "csat" && csat && (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-medium">
                Satisfação — média {csat.average?.toFixed(1) ?? "—"} ({csat.total} respostas
                {csat.response_rate !== null &&
                  ` · ${(csat.response_rate * 100).toFixed(0)}% das resolvidas`}
                )
              </h2>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={csat.distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {rows && (
          <section className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Conversas</th>
                  <th className="px-3 py-2">Resolvidas</th>
                  <th className="px-3 py-2">1ª resposta</th>
                  <th className="px-3 py-2">Resolução</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.id)} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">{r.conversations_count}</td>
                    <td className="px-3 py-2">{r.resolutions_count}</td>
                    <td className="px-3 py-2">{formatDuration(r.avg_first_response_time)}</td>
                    <td className="px-3 py-2">{formatDuration(r.avg_resolution_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
