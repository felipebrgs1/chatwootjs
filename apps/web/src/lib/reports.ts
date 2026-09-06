import { apiFetch } from "@/lib/auth";

// Client de relatórios + CSAT (M8).

export interface Summary {
  conversations_count: number;
  incoming_messages_count: number;
  outgoing_messages_count: number;
  resolutions_count: number;
  avg_first_response_time: number | null;
  avg_resolution_time: number | null;
  reply_time: number | null;
}

export interface BreakdownRow {
  id: number | string;
  name: string;
  conversations_count: number;
  resolutions_count: number;
  avg_first_response_time: number | null;
  avg_resolution_time: number | null;
}

export interface OverviewPoint {
  date: string;
  conversations_count: number;
  resolutions_count: number;
}

export interface CsatReport {
  total: number;
  average: number | null;
  distribution: Array<{ rating: number; count: number }>;
  response_rate: number | null;
}

export function reportQuery(params: { since?: string; until?: string; timezone_offset?: number }) {
  const q = new URLSearchParams();
  if (params.since) q.set("since", params.since);
  if (params.until) q.set("until", params.until);
  if (params.timezone_offset !== undefined)
    q.set("timezone_offset", String(params.timezone_offset));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function getSummary(
  accountId: number,
  params: { since?: string; until?: string; timezone_offset?: number },
): Promise<Summary> {
  const d = await apiFetch<{ data: Summary } & Summary>(
    `/api/v1/accounts/${accountId}/reports/summary${reportQuery(params)}`,
  );
  return (d as { data?: Summary }).data ?? (d as Summary);
}

export async function getReportTable(
  accountId: number,
  scope: "agents" | "teams" | "inboxes" | "labels" | "overview" | "csat",
  params: { since?: string; until?: string; timezone_offset?: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const d = await apiFetch<{ data: unknown }>(
    `/api/v1/accounts/${accountId}/reports/${scope}${reportQuery(params)}`,
  );
  return d.data ?? d;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
