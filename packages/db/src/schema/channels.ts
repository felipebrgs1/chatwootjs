import {
  bigserial,
  boolean,
  integer,
  jsonb,
  serial,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const channelApi = pgTable(
  "channel_api",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    webhookUrl: varchar("webhook_url", { length: 255 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    identifier: varchar("identifier", { length: 255 }),
    hmacToken: varchar("hmac_token", { length: 255 }),
    hmacMandatory: boolean("hmac_mandatory").default(false),
    additionalAttributes: jsonb("additional_attributes").default({}),
    secret: varchar("secret", { length: 255 }),
  },
  (table) => [
    uniqueIndex("index_channel_api_on_hmac_token").on(table.hmacToken),
    uniqueIndex("index_channel_api_on_identifier").on(table.identifier),
  ],
);

export const channelEmail = pgTable(
  "channel_email",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    forwardToEmail: varchar("forward_to_email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    imapEnabled: boolean("imap_enabled").default(false),
    imapAddress: varchar("imap_address", { length: 255 }).default(""),
    imapPort: integer("imap_port").default(0),
    imapLogin: varchar("imap_login", { length: 255 }).default(""),
    imapPassword: varchar("imap_password", { length: 255 }).default(""),
    imapEnableSsl: boolean("imap_enable_ssl").default(true),
    smtpEnabled: boolean("smtp_enabled").default(false),
    smtpAddress: varchar("smtp_address", { length: 255 }).default(""),
    smtpPort: integer("smtp_port").default(0),
    smtpLogin: varchar("smtp_login", { length: 255 }).default(""),
    smtpPassword: varchar("smtp_password", { length: 255 }).default(""),
    smtpDomain: varchar("smtp_domain", { length: 255 }).default(""),
    smtpEnableStarttlsAuto: boolean("smtp_enable_starttls_auto").default(true),
    smtpAuthentication: varchar("smtp_authentication", { length: 255 }).default("login"),
    smtpOpensslVerifyMode: varchar("smtp_openssl_verify_mode", { length: 255 }).default("none"),
    smtpEnableSslTls: boolean("smtp_enable_ssl_tls").default(false),
    providerConfig: jsonb("provider_config").default({}),
    provider: varchar("provider", { length: 255 }),
    imapAuthentication: varchar("imap_authentication", { length: 255 }).default("plain"),
    verifiedForSending: boolean("verified_for_sending").notNull().default(false),
  },
  (table) => [
    uniqueIndex("index_channel_email_on_email").on(table.email),
    uniqueIndex("index_channel_email_on_forward_to_email").on(table.forwardToEmail),
  ],
);

export const channelFacebookPages = pgTable(
  "channel_facebook_pages",
  {
    id: serial("id").primaryKey(),
    pageId: varchar("page_id", { length: 255 }).notNull(),
    userAccessToken: varchar("user_access_token", { length: 255 }).notNull(),
    pageAccessToken: varchar("page_access_token", { length: 255 }).notNull(),
    accountId: integer("account_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    instagramId: varchar("instagram_id", { length: 255 }),
  },
  (table) => [
    uniqueIndex("index_channel_facebook_pages_on_page_id_and_account_id").on(
      table.pageId,
      table.accountId,
    ),
    index("index_channel_facebook_pages_on_page_id").on(table.pageId),
  ],
);

export const channelInstagrams = pgTable(
  "channel_instagram",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accessToken: varchar("access_token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    accountId: integer("account_id").notNull(),
    instagramId: varchar("instagram_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("index_channel_instagram_on_instagram_id").on(table.instagramId)],
);

export const channelLines = pgTable(
  "channel_line",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    lineChannelId: varchar("line_channel_id", { length: 255 }).notNull(),
    lineChannelSecret: varchar("line_channel_secret", { length: 255 }).notNull(),
    lineChannelToken: varchar("line_channel_token", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("index_channel_line_on_line_channel_id").on(table.lineChannelId)],
);

export const channelSms = pgTable(
  "channel_sms",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    phoneNumber: varchar("phone_number", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).default("default"),
    providerConfig: jsonb("provider_config").default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("index_channel_sms_on_phone_number").on(table.phoneNumber)],
);

export const channelTelegrams = pgTable(
  "channel_telegram",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    botName: varchar("bot_name", { length: 255 }),
    accountId: integer("account_id").notNull(),
    botToken: varchar("bot_token", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("index_channel_telegram_on_bot_token").on(table.botToken)],
);

export const channelTiktok = pgTable(
  "channel_tiktok",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    businessId: varchar("business_id", { length: 255 }).notNull(),
    accessToken: varchar("access_token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("index_channel_tiktok_on_business_id").on(table.businessId)],
);

export const channelTwilioSms = pgTable(
  "channel_twilio_sms",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    phoneNumber: varchar("phone_number", { length: 255 }),
    authToken: varchar("auth_token", { length: 255 }).notNull(),
    accountSid: varchar("account_sid", { length: 255 }).notNull(),
    accountId: integer("account_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    medium: integer("medium").default(0),
    messagingServiceSid: varchar("messaging_service_sid", { length: 255 }),
    apiKeySid: varchar("api_key_sid", { length: 255 }),
    contentTemplates: jsonb("content_templates").default({}),
    contentTemplatesLastUpdated: timestamp("content_templates_last_updated"),
    voiceEnabled: boolean("voice_enabled").notNull().default(false),
    twimlAppSid: varchar("twiml_app_sid", { length: 255 }),
    apiKeySecret: varchar("api_key_secret", { length: 255 }),
    providerConfig: jsonb("provider_config").default({}),
  },
  (table) => [
    uniqueIndex("index_channel_twilio_sms_on_account_sid_and_phone_number").on(
      table.accountSid,
      table.phoneNumber,
    ),
    uniqueIndex("index_channel_twilio_sms_on_messaging_service_sid").on(table.messagingServiceSid),
    uniqueIndex("index_channel_twilio_sms_on_phone_number").on(table.phoneNumber),
  ],
);

export const channelTwitters = pgTable(
  "channel_twitter_profiles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: varchar("profile_id", { length: 255 }).notNull(),
    twitterAccessToken: varchar("twitter_access_token", { length: 255 }).notNull(),
    twitterAccessTokenSecret: varchar("twitter_access_token_secret", { length: 255 }).notNull(),
    accountId: integer("account_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    tweetsEnabled: boolean("tweets_enabled").default(true),
  },
  (table) => [
    uniqueIndex("index_channel_twitter_profiles_on_account_id_and_profile_id").on(
      table.accountId,
      table.profileId,
    ),
  ],
);

export const channelWebWidgets = pgTable(
  "channel_web_widgets",
  {
    id: serial("id").primaryKey(),
    websiteUrl: varchar("website_url", { length: 255 }),
    accountId: integer("account_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    websiteToken: varchar("website_token", { length: 255 }),
    widgetColor: varchar("widget_color", { length: 255 }).default("#1f93ff"),
    welcomeTitle: varchar("welcome_title", { length: 255 }),
    welcomeTagline: varchar("welcome_tagline", { length: 255 }),
    featureFlags: integer("feature_flags").notNull().default(7),
    replyTime: integer("reply_time").default(0),
    hmacToken: varchar("hmac_token", { length: 255 }),
    preChatFormEnabled: boolean("pre_chat_form_enabled").default(false),
    preChatFormOptions: jsonb("pre_chat_form_options").default({}),
    hmacMandatory: boolean("hmac_mandatory").default(false),
    continuityViaEmail: boolean("continuity_via_email").notNull().default(true),
    allowedDomains: text("allowed_domains").default(""),
  },
  (table) => [
    uniqueIndex("index_channel_web_widgets_on_hmac_token").on(table.hmacToken),
    uniqueIndex("index_channel_web_widgets_on_website_token").on(table.websiteToken),
  ],
);

export const channelWhatsapps = pgTable(
  "channel_whatsapp",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    businessManagementToken: text("business_management_token"),
    phoneNumber: varchar("phone_number", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).default("default"),
    providerConfig: jsonb("provider_config").default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    messageTemplates: jsonb("message_templates").default({}),
    messageTemplatesLastUpdated: timestamp("message_templates_last_updated"),
    phoneNumberHealth: jsonb("phone_number_health").notNull().default({}),
    phoneNumberHealthCheckedAt: timestamp("phone_number_health_checked_at"),
    phoneNumberHealthError: varchar("phone_number_health_error", { length: 500 }),
  },
  (table) => [
    index("index_channel_whatsapp_on_phone_number_health_checked_at").on(
      table.phoneNumberHealthCheckedAt,
    ),
    uniqueIndex("index_channel_whatsapp_on_phone_number").on(table.phoneNumber),
  ],
);

export type ChannelApiRow = typeof channelApi.$inferSelect;
export type ChannelEmailRow = typeof channelEmail.$inferSelect;
export type ChannelFacebookPages = typeof channelFacebookPages.$inferSelect;
export type ChannelInstagrams = typeof channelInstagrams.$inferSelect;
export type ChannelLines = typeof channelLines.$inferSelect;
export type ChannelSms = typeof channelSms.$inferSelect;
export type ChannelTelegrams = typeof channelTelegrams.$inferSelect;
export type ChannelTiktok = typeof channelTiktok.$inferSelect;
export type ChannelTwilioSms = typeof channelTwilioSms.$inferSelect;
export type ChannelTwitters = typeof channelTwitters.$inferSelect;
export type ChannelWebWidget = typeof channelWebWidgets.$inferSelect;
export type ChannelWhatsapps = typeof channelWhatsapps.$inferSelect;
