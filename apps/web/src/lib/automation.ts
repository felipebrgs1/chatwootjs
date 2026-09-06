import { apiFetch } from "@/lib/auth";
import type { ConversationDetail } from "@/lib/conversations";

// Client da fase 6 (teams, canned, macros, automações, webhooks).

export interface Team {
  id: number;
  name: string;
  description: string | null;
  allow_auto_assign: boolean;
  members: Array<{ id: number; name: string; email: string }>;
  conversations_count?: number;
}

export interface CannedResponse {
  id: number;
  short_code: string | null;
  content: string | null;
}

export interface MacroAction {
  action_name: string;
  action_params: unknown[];
}

export interface Macro {
  id: number;
  name: string;
  visibility: "personal" | "global";
  actions: MacroAction[];
  created_by_id: number | null;
}

export interface AutomationCondition {
  attribute_key: string;
  filter_operator: string;
  values: unknown;
  query_operator?: string | null;
}

export interface AutomationRule {
  id: number;
  name: string;
  description: string | null;
  event_name: string;
  conditions: AutomationCondition[];
  actions: MacroAction[];
  active: boolean;
  execution_delay: number | null;
}

export interface Webhook {
  id: number;
  name: string | null;
  url: string | null;
  inbox_id: number | null;
  subscriptions: string[];
}

export const MACRO_ACTIONS = [
  "assign_agent",
  "assign_team",
  "add_label",
  "remove_label",
  "send_message",
  "change_status",
  "change_priority",
  "snooze",
] as const;

export const AUTOMATION_EVENTS = [
  "conversation_created",
  "conversation_updated",
  "message_created",
] as const;

export const CONDITION_KEYS = [
  "status",
  "priority",
  "inbox_id",
  "assignee_id",
  "team_id",
  "labels",
  "message_type",
  "content",
  "email",
  "phone_number",
  "private_note",
] as const;

export async function listTeams(accountId: number): Promise<Team[]> {
  const d = await apiFetch<{ teams: Team[] }>(`/api/v1/accounts/${accountId}/teams`);
  return d.teams;
}

export async function listCanned(accountId: number, search?: string): Promise<CannedResponse[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const d = await apiFetch<{ canned_responses: CannedResponse[] }>(
    `/api/v1/accounts/${accountId}/canned_responses${q}`,
  );
  return d.canned_responses;
}

export async function listMacros(accountId: number): Promise<Macro[]> {
  const d = await apiFetch<{ macros: Macro[] }>(`/api/v1/accounts/${accountId}/macros`);
  return d.macros;
}

export async function executeMacro(
  accountId: number,
  macroId: number,
  conversationId: number,
): Promise<void> {
  await apiFetch(`/api/v1/accounts/${accountId}/macros/${macroId}/execute`, {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId }),
  });
}

export async function setConversationTeam(
  accountId: number,
  conversationId: number,
  teamId: number | null,
): Promise<ConversationDetail> {
  return apiFetch<{ conversation: ConversationDetail }>(
    `/api/v1/accounts/${accountId}/conversations/${conversationId}/team`,
    { method: "POST", body: JSON.stringify({ team_id: teamId ?? 0 }) },
  ).then((d) => d.conversation);
}
