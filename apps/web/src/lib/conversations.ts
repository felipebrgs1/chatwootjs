import { apiFetch } from "@/lib/auth";

export type ConversationStatus = "open" | "pending" | "resolved" | "snoozed";
export type AssigneeType = "me" | "unassigned" | "all";

export interface ConversationFilters {
  status?: ConversationStatus | "all";
  assignee_type?: AssigneeType;
  inbox_id?: number;
  team_id?: number;
  labels?: string[];
  q?: string;
  sort_by?: "latest" | "created_at_asc" | "priority" | "waiting_since";
  page?: number;
}

export interface ConversationItem {
  id: number;
  display_id: number;
  uuid: string;
  status: string;
  priority: string | null;
  inbox_id: number;
  inbox_name: string | null;
  channel_type: string | null;
  contact_id: number | null;
  assignee_id: number | null;
  assignee_name: string | null;
  team_id: number | null;
  snoozed_until: number | null;
  waiting_since: number | null;
  unread_count: number;
  muted: boolean;
  labels: string[];
  last_activity_at: number;
  first_reply_created_at: number | null;
  meta: {
    sender: { id: number | null; name: string; thumbnail: string | null; type: string };
    assignee: { id: number | null; name: string } | null;
  };
  messages: Array<{
    id: number;
    content: string | null;
    message_type: string;
    private: boolean;
    sender_name: string | null;
    created_at: string;
  }>;
}

export interface ConversationListResponse {
  conversations: ConversationItem[];
  meta: {
    mine_count: number;
    unassigned_count: number;
    all_count: number;
    total_count: number;
    current_page: number;
  };
}

export interface ConversationDetail extends ConversationItem {
  contact: {
    id: number;
    name: string;
    email: string | null;
    phone_number: string | null;
    additional_attributes: Record<string, unknown>;
    custom_attributes: Record<string, unknown>;
  } | null;
  participants: Array<{ id: number; name: string; email: string }>;
}

export interface Message {
  id: number;
  content: string | null;
  message_type: "incoming" | "outgoing" | "activity" | "template";
  private: boolean;
  content_type: string;
  content_attributes: Record<string, unknown>;
  status: string;
  sender: { id: number | null; name: string | null; type: string | null } | null;
  attachments: Array<{
    id: number;
    file_type: "image" | "audio" | "video" | "file";
    external_url: string | null;
    extension: string | null;
    fallback_title: string | null;
    meta: Record<string, unknown>;
  }>;
  created_at: number;
}

export interface InboxOption {
  id: number;
  name: string;
  channel_type: string | null;
}

function toQuery(filters: ConversationFilters): string {
  const params = new URLSearchParams();
  const status = filters.status === "all" ? undefined : (filters.status ?? "open");
  if (status) params.set("status", status);
  if (filters.assignee_type) params.set("assignee_type", filters.assignee_type);
  if (filters.inbox_id) params.set("inbox_id", String(filters.inbox_id));
  if (filters.team_id !== undefined) params.set("team_id", String(filters.team_id));
  for (const label of filters.labels ?? []) params.append("labels[]", label);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  params.set("page", String(filters.page ?? 1));
  return params.toString();
}

export async function listConversations(
  accountId: number,
  filters: ConversationFilters,
): Promise<ConversationListResponse> {
  return apiFetch(`/api/v1/accounts/${accountId}/conversations?${toQuery(filters)}`);
}

export async function getConversation(accountId: number, id: number): Promise<ConversationDetail> {
  return apiFetch<{ conversation: ConversationDetail }>(
    `/api/v1/accounts/${accountId}/conversations/${id}`,
  ).then((d) => d.conversation);
}

export async function listMessages(
  accountId: number,
  conversationId: number,
  after?: number,
): Promise<Message[]> {
  const qs = after !== undefined ? `?after=${after}` : "";
  return apiFetch<{ messages: Message[] }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages${qs}`,
  ).then((d) => d.messages);
}

export async function sendMessage(
  accountId: number,
  conversationId: number,
  input: {
    content: string;
    private: boolean;
    content_attributes?: Record<string, unknown>;
    echo_id?: string | number;
  },
): Promise<Message> {
  return apiFetch<{ message: Message }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify(input) },
  ).then((d) => d.message);
}

export async function toggleStatus(
  accountId: number,
  conversationId: number,
  status: string,
  snoozedUntil?: number,
): Promise<ConversationDetail> {
  return apiFetch<{ conversation: ConversationDetail }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_status`,
    { method: "POST", body: JSON.stringify({ status, snoozed_until: snoozedUntil }) },
  ).then((d) => d.conversation);
}

export async function assignConversation(
  accountId: number,
  conversationId: number,
  assigneeId: number,
): Promise<ConversationDetail> {
  return apiFetch<{ conversation: ConversationDetail }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/assignments`,
    { method: "POST", body: JSON.stringify({ assignee_id: assigneeId }) },
  ).then((d) => d.conversation);
}

export async function setPriority(
  accountId: number,
  conversationId: number,
  priority: string,
): Promise<ConversationDetail> {
  return apiFetch<{ conversation: ConversationDetail }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/priority`,
    { method: "POST", body: JSON.stringify({ priority }) },
  ).then((d) => d.conversation);
}

export async function setLabels(
  accountId: number,
  conversationId: number,
  labels: string[],
): Promise<string[]> {
  return apiFetch<{ labels: string[] }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`,
    { method: "POST", body: JSON.stringify({ labels }) },
  ).then((d) => d.labels);
}

export async function markRead(accountId: number, conversationId: number): Promise<void> {
  await apiFetch(`/api/v1/accounts/${accountId}/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export async function uploadFile(
  accountId: number,
  conversationId: number,
  file: File,
  options?: { private?: boolean; content?: string },
): Promise<Message> {
  const body = new FormData();
  body.append("file", file);
  if (options?.private) body.append("private", "true");
  if (options?.content) body.append("content", options.content);
  return apiFetch<{ message: Message }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/upload`,
    { method: "POST", body },
  ).then((d) => d.message);
}

export async function deleteMessage(
  accountId: number,
  conversationId: number,
  messageId: number,
): Promise<void> {
  await apiFetch(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages/${messageId}`,
    { method: "DELETE" },
  );
}

export async function loadInboxOptions(accountId: number): Promise<InboxOption[]> {
  return apiFetch<{ inboxes: InboxOption[] }>(`/api/v1/accounts/${accountId}/inboxes`).then(
    (d) => d.inboxes,
  );
}

export async function muteConversation(
  accountId: number,
  conversationId: number,
  muted: boolean,
): Promise<void> {
  await apiFetch(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/${muted ? "mute" : "unmute"}`,
    { method: "POST" },
  );
}
