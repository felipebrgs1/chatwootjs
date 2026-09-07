import { z } from "zod";

// Espelha notifications_controller / notification_settings_controller /
// custom_filters_controller do Rails.

export const NOTIFICATION_TYPES = [
  "assigned_conversation",
  "conversation_mention",
  "participating_conversation_new_message",
] as const;

export type NotificationTypeName = (typeof NOTIFICATION_TYPES)[number];

export const NotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // ?read=false → só não lidas (o sino usa assim).
  read: z.enum(["true", "false"]).optional(),
});

export type NotificationsQuery = z.infer<typeof NotificationsQuerySchema>;

export const NotificationSnoozeBodySchema = z.object({
  snoozed_until: z.string().datetime({ offset: true }),
});

export type NotificationSnoozeBody = z.infer<typeof NotificationSnoozeBodySchema>;

export const NotificationSettingsSchema = z.object({
  email_flags: z.array(z.string()).optional(),
  push_flags: z.array(z.string()).optional(),
  muted_flags: z.array(z.string()).optional(),
});

export type NotificationSettingsInput = z.infer<typeof NotificationSettingsSchema>;

/** Query serializada da lista de conversas (M4) — o que a view salva. */
export const CustomFilterQuerySchema = z
  .object({
    status: z.string().optional(),
    assignee: z.string().optional(),
    q: z.string().optional(),
    inbox_id: z.number().int().positive().optional(),
    labels: z.array(z.string()).optional(),
    sort_by: z.string().optional(),
  })
  .catchall(z.unknown());

export const CreateCustomFilterSchema = z.object({
  name: z.string().trim().min(1).max(255),
  model_type: z.literal("conversation").default("conversation"),
  query: CustomFilterQuerySchema,
  visibility: z.union([z.literal(0), z.literal(1)]).default(0),
});

export type CreateCustomFilterInput = z.infer<typeof CreateCustomFilterSchema>;

export const UpdateCustomFilterSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  query: CustomFilterQuerySchema.optional(),
  visibility: z.union([z.literal(0), z.literal(1)]).optional(),
});

export type UpdateCustomFilterInput = z.infer<typeof UpdateCustomFilterSchema>;

export const PresenceHeartbeatSchema = z.object({
  status: z.enum(["online", "busy", "offline"]).default("online"),
});

export type PresenceHeartbeat = z.infer<typeof PresenceHeartbeatSchema>;
