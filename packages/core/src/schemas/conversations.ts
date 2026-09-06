import { z } from "zod";

// Espelha conversations_controller.rb + messages_controller.rb do Rails.

export const CONVERSATION_STATUSES = ["open", "pending", "resolved", "snoozed"] as const;
export const CONVERSATION_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

export const STATUS_TO_INT: Record<string, number> = {
  open: 0,
  resolved: 1,
  pending: 2,
  snoozed: 3,
};

export const STATUS_FROM_INT = ["open", "resolved", "pending", "snoozed"] as const;

export const PRIORITY_TO_INT: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export const PRIORITY_FROM_INT = ["none", "low", "medium", "high", "urgent"] as const;

/**
 * GET /conversations — Hono só entrega query como string; `labels[]` precisa
 * do mesmo preprocess do M3.
 */
export const ConversationQuerySchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object") {
      const out = { ...(raw as Record<string, unknown>) };
      const labels = out["labels[]"] ?? out["labels"];
      if (labels !== undefined) {
        out.labels = Array.isArray(labels) ? labels : [labels];
        delete out["labels[]"];
      }
      return out;
    }
    return raw;
  },
  z.object({
    status: z.enum([...CONVERSATION_STATUSES, "all"]).default("open"),
    assignee_type: z.enum(["me", "unassigned", "all"]).optional(),
    assignee_id: z.coerce.number().int().positive().optional(),
    inbox_id: z.coerce.number().int().positive().optional(),
    team_id: z.coerce.number().int().optional(),
    labels: z.array(z.string().trim()).optional(),
    q: z.string().trim().optional(),
    sort_by: z
      .enum(["latest", "created_at_asc", "priority", "waiting_since", "latest_created"])
      .optional(),
    conversation_type: z.enum(["mention", "participating", "unattended"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
  }),
);

export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;

export const ToggleStatusSchema = z.object({
  status: z.enum(["open", "resolved", "pending", "snoozed"]),
  snoozed_until: z.coerce.number().int().optional(),
});

export const AssigneeBodySchema = z.object({
  assignee_id: z.number().int().min(0), // 0 = remover
});

export const TeamBodySchema = z.object({
  team_id: z.number().int().min(0).nullable(), // 0/null = remover
});

export const PriorityBodySchema = z.object({
  priority: z.enum(CONVERSATION_PRIORITIES),
});

export const ConversationLabelsBodySchema = z.object({
  labels: z.array(z.string().trim()),
});

export const SnoozeBodySchema = z.object({
  snoozed_until: z.coerce.number().int(), // epoch seconds
});

export const ConversationMetaQuerySchema = z.object({
  status: z.enum([...CONVERSATION_STATUSES, "all"]).default("open"),
  assignee_type: z.enum(["me", "unassigned", "all"]).optional(),
  inbox_id: z.coerce.number().int().positive().optional(),
  team_id: z.coerce.number().int().optional(),
});

export function toEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
