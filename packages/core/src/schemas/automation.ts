import { z } from "zod";

// Espelha automation_rules_controller do Rails. As ações aqui também são
// reutilizadas pelas macros (macros_controller aceita o mesmo formato
// `{ action_name, action_params }`).

export const AUTOMATION_EVENTS = [
  "conversation_created",
  "conversation_updated",
  "message_created",
] as const;

export const AUTOMATION_CONDITION_KEYS = [
  "content",
  "email",
  "country_code",
  "status",
  "message_type",
  "browser_language",
  "assignee_id",
  "team_id",
  "referer",
  "city",
  "company_name",
  "inbox_id",
  "mail_subject",
  "phone_number",
  "priority",
  "conversation_language",
  "labels",
  "private_note",
] as const;

export const AUTOMATION_FILTER_OPERATORS = [
  "equal_to",
  "not_equal_to",
  "contains",
  "does_not_contain",
  "is_present",
  "is_not_present",
  "is_greater_than",
  "is_less_than",
] as const;

export const AUTOMATION_ACTION_NAMES = [
  "send_message",
  "add_label",
  "remove_label",
  "send_email_to_team",
  "assign_team",
  "assign_agent",
  "remove_assigned_agent",
  "remove_assigned_team",
  "send_webhook_event",
  "mute_conversation",
  "send_attachment",
  "change_status",
  "resolve_conversation",
  "open_conversation",
  "pending_conversation",
  "snooze_conversation",
  "change_priority",
  "send_email_transcript",
  "add_private_note",
] as const;

export const ActionItemSchema = z.object({
  action_name: z.string().trim().min(1),
  action_params: z.array(z.unknown()).default([]),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

export const ConditionItemSchema = z.object({
  attribute_key: z.string().trim().min(1),
  filter_operator: z.string().trim().min(1),
  values: z.unknown(),
  query_operator: z.enum(["AND", "OR", "and", "or", ""]).nullable().optional(),
});

export type ConditionItem = z.infer<typeof ConditionItemSchema>;

export const CreateAutomationRuleSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().optional(),
  event_name: z.enum(AUTOMATION_EVENTS),
  conditions: z.array(ConditionItemSchema).default([]),
  actions: z.array(ActionItemSchema).min(1, "Informe ao menos uma ação"),
  active: z.boolean().optional(),
  execution_delay: z.number().int().min(10).max(43_200).nullable().optional(),
});

export const UpdateAutomationRuleSchema = CreateAutomationRuleSchema.partial();
