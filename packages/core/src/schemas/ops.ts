import { z } from "zod";

export const AuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  user_id: z.coerce.number().int().positive().optional(),
  auditable_type: z.string().max(100).optional(),
  action: z.enum(["create", "update", "destroy"]).optional(),
});

export type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;

export const CreateAgentBotSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(255).optional(),
  outgoing_url: z.string().trim().url().max(255).optional(),
  bot_type: z.union([z.literal(0), z.literal(1)]).default(0),
  bot_config: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAgentBotInput = z.infer<typeof CreateAgentBotSchema>;

export const UpdateAgentBotSchema = CreateAgentBotSchema.partial();

export type UpdateAgentBotInput = z.infer<typeof UpdateAgentBotSchema>;

export const SetInboxBotSchema = z.object({
  agent_bot_id: z.number().int().positive().nullable(),
});

export type SetInboxBotInput = z.infer<typeof SetInboxBotSchema>;

/** Bot externo entrega resposta neste formato (igual ao Bot API do Rails). */
export const AgentBotWebhookSchema = z.object({
  conversation_id: z.number().int().positive().optional(),
  content: z.string().min(1).max(4000),
  secret: z.string().optional(),
});

export type AgentBotWebhookInput = z.infer<typeof AgentBotWebhookSchema>;

export const CaptainAssistSchema = z.object({
  type: z.enum(["reply_suggest", "summarize", "rewrite"]),
  conversation_id: z.number().int().positive().optional(),
  content: z.string().max(8000).optional(),
});

export type CaptainAssistInput = z.infer<typeof CaptainAssistSchema>;

export const SuperAdminSignInSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(1),
});

export type SuperAdminSignInInput = z.infer<typeof SuperAdminSignInSchema>;

export const InstallationConfigSchema = z.object({
  value: z.unknown(),
});

export type InstallationConfigInput = z.infer<typeof InstallationConfigSchema>;
