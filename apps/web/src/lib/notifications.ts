import { apiFetch } from "@/lib/auth";

export interface ApiNotification {
  id: number;
  notification_type: string;
  notificable_type: string | null;
  notificable_id: number | null;
  read_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  conversation_id: number | null;
  actor_name: string | null;
}

export interface NotificationSettings {
  email_flags: string[];
  push_flags: string[];
  muted_flags: string[];
}

export interface CustomFilter {
  id: number;
  name: string;
  model_type: string;
  query: Record<string, unknown>;
  visibility: number;
}

export interface PresenceEntry {
  user_id: number;
  account_id: number;
  status: "online" | "busy" | "offline";
  last_seen_at: number;
}

export interface SearchResults {
  conversations: Array<{
    id: number | string;
    kind: string;
    title: string;
    subtitle: string | null;
  }>;
  contacts: Array<{ id: number | string; kind: string; title: string; subtitle: string | null }>;
  articles: Array<{ id: number | string; kind: string; title: string; subtitle: string | null }>;
  canned_responses: Array<{
    id: number | string;
    kind: string;
    title: string;
    subtitle: string | null;
  }>;
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  assigned_conversation: "Conversa atribuída a você",
  conversation_mention: "Você foi mencionado",
  participating_conversation_new_message: "Nova mensagem em conversa que você participa",
};

export async function listNotifications(
  accountId: number,
  opts: { read?: boolean; page?: number } = {},
): Promise<{
  notifications: ApiNotification[];
  unread_count: number;
  meta: { page: number; total: number };
}> {
  const params = new URLSearchParams({ account_id: String(accountId) });
  if (opts.read !== undefined) params.set("read", String(opts.read));
  if (opts.page) params.set("page", String(opts.page));
  const data = await apiFetch<{
    notifications: ApiNotification[];
    unread_count: number;
    meta: { page: number; total: number };
  }>(`/api/v1/notifications?${params}`);
  return data;
}

export async function readAllNotifications(accountId: number): Promise<void> {
  await apiFetch(`/api/v1/notifications/read_all?account_id=${accountId}`, { method: "POST" });
}

export async function markNotificationRead(accountId: number, id: number): Promise<void> {
  await apiFetch(`/api/v1/notifications/${id}/read?account_id=${accountId}`, { method: "POST" });
}

export async function getNotificationSettings(accountId: number): Promise<NotificationSettings> {
  const data = await apiFetch<{ notification_settings: NotificationSettings }>(
    `/api/v1/accounts/${accountId}/notification_settings`,
  );
  return data.notification_settings;
}

export async function updateNotificationSettings(
  accountId: number,
  input: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const data = await apiFetch<{ notification_settings: NotificationSettings }>(
    `/api/v1/accounts/${accountId}/notification_settings`,
    { method: "PUT", body: JSON.stringify(input) },
  );
  return data.notification_settings;
}

export async function listCustomFilters(accountId: number): Promise<CustomFilter[]> {
  const data = await apiFetch<{ custom_filters: CustomFilter[] }>(
    `/api/v1/accounts/${accountId}/custom_filters`,
  );
  return data.custom_filters;
}

export async function createCustomFilter(
  accountId: number,
  input: { name: string; query: Record<string, unknown>; visibility?: number },
): Promise<CustomFilter> {
  const data = await apiFetch<{ custom_filter: CustomFilter }>(
    `/api/v1/accounts/${accountId}/custom_filters`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.custom_filter;
}

export async function deleteCustomFilter(accountId: number, id: number): Promise<void> {
  await apiFetch(`/api/v1/accounts/${accountId}/custom_filters/${id}`, { method: "DELETE" });
}

export async function getPresence(accountId: number): Promise<PresenceEntry[]> {
  const data = await apiFetch<{ presence: PresenceEntry[] }>(
    `/api/v1/accounts/${accountId}/presence`,
  );
  return data.presence;
}

export async function unifiedSearch(accountId: number, q: string): Promise<SearchResults> {
  const data = await apiFetch<SearchResults>(
    `/api/v1/accounts/${accountId}/search?q=${encodeURIComponent(q)}`,
  );
  return data;
}
