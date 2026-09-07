import { z } from "zod";

// Schemas espelham os params permitidos do inboxes_controller.rb do Rails.

export const WebWidgetChannelSchema = z.object({
  type: z.literal("Channel::WebWidget"),
  website_url: z.string().trim().min(1),
  website_title: z.string().trim().optional(),
  widget_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .default("#1f93ff"),
  welcome_title: z.string().trim().optional(),
  welcome_tagline: z.string().trim().optional(),
  pre_chat_form_enabled: z.boolean().optional(),
  pre_chat_form_options: z.record(z.string(), z.unknown()).optional(),
  hmac_mandatory: z.boolean().optional(),
  allowed_domains: z.string().optional(),
});

export const ApiChannelSchema = z.object({
  type: z.literal("Channel::Api"),
  webhook_url: z.string().trim().optional(),
  identifier: z.string().trim().min(1),
  hmac_mandatory: z.boolean().optional(),
  secret: z.string().trim().optional(),
});

export const EmailChannelSchema = z.object({
  type: z.literal("Channel::Email"),
  email: z.email().trim(),
  forward_to_email: z.email().trim(),
  imap_enabled: z.boolean().optional(),
  imap_address: z.string().optional(),
  imap_port: z.coerce.number().int().min(0).optional(),
  imap_login: z.string().optional(),
  imap_password: z.string().optional(),
  imap_enable_ssl: z.boolean().optional(),
  smtp_enabled: z.boolean().optional(),
  smtp_address: z.string().optional(),
  smtp_port: z.coerce.number().int().min(0).optional(),
  smtp_login: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_domain: z.string().optional(),
  smtp_authentication: z.string().optional(),
});

export const TelegramChannelSchema = z.object({
  type: z.literal("Channel::Telegram"),
  bot_name: z.string().trim().optional(),
  bot_token: z.string().trim().min(1),
});

export const WhatsappChannelSchema = z.object({
  type: z.literal("Channel::Whatsapp"),
  phone_number: z.string().trim().min(1),
  provider: z.string().trim().default("default"),
  provider_config: z.record(z.string(), z.unknown()).optional(),
  business_management_token: z.string().optional(),
});

export const SmsChannelSchema = z.object({
  type: z.literal("Channel::Sms"),
  phone_number: z.string().trim().min(1),
  provider: z.string().trim().default("default"),
  provider_config: z.record(z.string(), z.unknown()).optional(),
});

export const LineChannelSchema = z.object({
  type: z.literal("Channel::Line"),
  line_channel_id: z.string().trim().min(1),
  line_channel_secret: z.string().trim().min(1),
  line_channel_token: z.string().trim().min(1),
});

// Facebook/Instagram/Twitter: OAuth no M10; aceita os campos para o wizard.
export const FacebookChannelSchema = z.object({
  type: z.literal("Channel::FacebookPage"),
  page_id: z.string().trim().min(1),
  user_access_token: z.string().trim().min(1),
  page_access_token: z.string().trim().min(1),
  instagram_id: z.string().optional(),
});

export const InstagramChannelSchema = z.object({
  type: z.literal("Channel::Instagram"),
  instagram_id: z.string().trim().min(1),
  access_token: z.string().trim().min(1),
  expires_at: z.coerce.number().int(),
});

export const TwitterChannelSchema = z.object({
  type: z.literal("Channel::TwitterProfile"),
  profile_id: z.string().trim().min(1),
  twitter_access_token: z.string().trim().min(1),
  twitter_access_token_secret: z.string().trim().min(1),
});

export const ChannelSchema = z.discriminatedUnion("type", [
  WebWidgetChannelSchema,
  ApiChannelSchema,
  EmailChannelSchema,
  TelegramChannelSchema,
  WhatsappChannelSchema,
  SmsChannelSchema,
  LineChannelSchema,
  FacebookChannelSchema,
  InstagramChannelSchema,
  TwitterChannelSchema,
]);

export const CreateInboxSchema = z.object({
  name: z.string().trim().min(1),
  channel: ChannelSchema,
  enable_auto_assignment: z.boolean().optional(),
  greeting_enabled: z.boolean().optional(),
  greeting_message: z.string().optional(),
  working_hours_enabled: z.boolean().optional(),
  out_of_office_message: z.string().optional(),
  timezone: z.string().optional(),
  enable_email_collect: z.boolean().optional(),
  csat_survey_enabled: z.boolean().optional(),
  allow_messages_after_resolved: z.boolean().optional(),
  lock_to_single_conversation: z.boolean().optional(),
});

export type CreateInboxInput = z.infer<typeof CreateInboxSchema>;

export const UpdateInboxSchema = z.object({
  name: z.string().trim().min(1).optional(),
  enable_auto_assignment: z.boolean().optional(),
  greeting_enabled: z.boolean().optional(),
  greeting_message: z.string().nullish(),
  working_hours_enabled: z.boolean().optional(),
  out_of_office_message: z.string().nullish(),
  timezone: z.string().optional(),
  enable_email_collect: z.boolean().optional(),
  csat_survey_enabled: z.boolean().optional(),
  allow_messages_after_resolved: z.boolean().optional(),
  lock_to_single_conversation: z.boolean().optional(),
  channel: z
    .object({
      widget_color: z
        .string()
        .regex(/^#[0-9a-fA-F]{3,8}$/)
        .optional(),
      welcome_title: z.string().nullish(),
      welcome_tagline: z.string().nullish(),
      pre_chat_form_enabled: z.boolean().optional(),
      hmac_mandatory: z.boolean().optional(),
      // Credenciais de canais externos (Configuração da inbox; merge parcial,
      // nunca expostas na leitura — toApiInbox mascara segredos).
      provider: z.string().trim().optional(),
      provider_config: z.record(z.string(), z.unknown()).optional(),
      business_management_token: z.string().nullish(),
      phone_number: z.string().trim().optional(),
      bot_token: z.string().trim().optional(),
      line_channel_secret: z.string().trim().optional(),
      line_channel_token: z.string().trim().optional(),
      page_access_token: z.string().trim().optional(),
      access_token: z.string().trim().optional(),
      // Voz via Twilio (inbox Channel::Api; vai para additional_attributes.voice).
      voice_provider: z.string().trim().optional(),
      voice_twiml_url: z.string().trim().optional(),
      voice_status_callback: z.string().trim().optional(),
      voice_twilio_account_sid: z.string().trim().optional(),
      voice_twilio_auth_token: z.string().trim().optional(),
      voice_twilio_from: z.string().trim().optional(),
    })
    .optional(),
});

export type UpdateInboxInput = z.infer<typeof UpdateInboxSchema>;

/** POST/PUT .../inbox_members — Rails usa `user_ids`. */
export const InboxMembersBodySchema = z.object({
  user_ids: z.array(z.number().int().positive()).min(1),
});

export type InboxMembersBody = z.infer<typeof InboxMembersBodySchema>;

/** PUT .../working_hours — 7 dias (0=domingo … 6=sábado). */
export const WorkingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  closed_all_day: z.boolean().default(false),
  open_all_day: z.boolean().default(false),
  open_hour: z.number().int().min(0).max(23).nullish(),
  open_minutes: z.number().int().min(0).max(59).nullish(),
  close_hour: z.number().int().min(0).max(23).nullish(),
  close_minutes: z.number().int().min(0).max(59).nullish(),
});

export const WorkingHoursBodySchema = z.object({
  working_hours: z.array(WorkingHourSchema).min(1).max(7),
});

export type WorkingHoursBody = z.infer<typeof WorkingHoursBodySchema>;
