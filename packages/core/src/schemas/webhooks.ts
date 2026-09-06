import { z } from "zod";

// Espelha webhooks_controller do Rails.

export const WEBHOOK_EVENTS = [
  "conversation_status_changed",
  "conversation_updated",
  "conversation_created",
  "contact_created",
  "contact_updated",
  "message_created",
  "message_updated",
  "webwidget_triggered",
  "inbox_created",
  "inbox_updated",
  "conversation_typing_on",
  "conversation_typing_off",
] as const;

export const CreateWebhookSchema = z.object({
  url: z.url("URL inválida"),
  name: z.string().trim().optional(),
  inbox_id: z.number().int().positive().nullable().optional(),
  subscriptions: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Informe ao menos um evento"),
});

export const UpdateWebhookSchema = CreateWebhookSchema.partial();
