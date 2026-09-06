import { z } from "zod";

// Espelha campaigns_controller do Rails.

export const CAMPAIGN_TYPES = ["ongoing", "one_off"] as const;
export const CAMPAIGN_STATUSES = ["active", "completed"] as const;

export const TriggerRulesSchema = z.object({
  url: z.string().trim().optional(),
  time_on_page: z.coerce.number().int().min(0).max(86400).optional(),
});

export const AudienceSchema = z.object({
  labels: z.array(z.string().trim().min(1)).optional(),
});

export const CampaignsQuerySchema = z.object({
  campaign_type: z.enum(CAMPAIGN_TYPES).optional(),
});

export const CreateCampaignSchema = z.object({
  inbox_id: z.number().int().positive(),
  title: z.string().trim().min(1, "Informe o título"),
  message: z.string().trim().min(1, "Informe a mensagem"),
  description: z.string().optional(),
  campaign_type: z.enum(CAMPAIGN_TYPES).optional(),
  trigger_rules: TriggerRulesSchema.optional(),
  audience: AudienceSchema.optional(),
  scheduled_at: z.string().trim().optional(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  enabled: z.boolean().optional(),
});
