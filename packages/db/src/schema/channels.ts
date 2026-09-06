import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./auth";

// Canais de conversa — espelha chatwoot/db/schema.rb.
// Cada row pertence a uma inbox via inboxes.channel_id + inboxes.channel_type.
// Canais externos (M10) já têm o schema completo, mas só entram em uso lá.

export const channelWebWidgets = pgTable(
  "channel_web_widgets",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    websiteUrl: text("website_url"),
    websiteToken: varchar("website_token", { length: 255 }).notNull().unique(),
    widgetColor: varchar("widget_color", { length: 20 }).notNull().default("#1f93ff"),
    welcomeTitle: varchar("welcome_title", { length: 255 }),
    welcomeTagline: varchar("welcome_tagline", { length: 255 }),
    featureFlags: integer("feature_flags").notNull().default(7),
    replyTime: integer("reply_time").notNull().default(0),
    hmacToken: varchar("hmac_token", { length: 255 }).unique(),
    preChatFormEnabled: boolean("pre_chat_form_enabled").notNull().default(false),
    preChatFormOptions: jsonb("pre_chat_form_options").notNull().default({}),
    hmacMandatory: boolean("hmac_mandatory").notNull().default(false),
    continuityViaEmail: boolean("continuity_via_email").notNull().default(true),
    allowedDomains: text("allowed_domains").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_channel_web_widgets_on_hmac_token").on(table.hmacToken)],
);

export const channelApi = pgTable("channel_api", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  webhookUrl: text("webhook_url"),
  identifier: varchar("identifier", { length: 255 }).unique(),
  hmacToken: varchar("hmac_token", { length: 255 }).unique(),
  hmacMandatory: boolean("hmac_mandatory").notNull().default(false),
  additionalAttributes: jsonb("additional_attributes").notNull().default({}),
  secret: text("secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelEmail = pgTable("channel_email", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  forwardToEmail: varchar("forward_to_email", { length: 255 }).notNull().unique(),
  imapEnabled: boolean("imap_enabled").notNull().default(false),
  imapAddress: varchar("imap_address", { length: 255 }).notNull().default(""),
  imapPort: integer("imap_port").notNull().default(0),
  imapLogin: varchar("imap_login", { length: 255 }).notNull().default(""),
  imapPassword: varchar("imap_password", { length: 255 }).notNull().default(""),
  imapEnableSsl: boolean("imap_enable_ssl").notNull().default(true),
  smtpEnabled: boolean("smtp_enabled").notNull().default(false),
  smtpAddress: varchar("smtp_address", { length: 255 }).notNull().default(""),
  smtpPort: integer("smtp_port").notNull().default(0),
  smtpLogin: varchar("smtp_login", { length: 255 }).notNull().default(""),
  smtpPassword: varchar("smtp_password", { length: 255 }).notNull().default(""),
  smtpDomain: varchar("smtp_domain", { length: 255 }).notNull().default(""),
  smtpEnableStarttlsAuto: boolean("smtp_enable_starttls_auto").notNull().default(true),
  smtpAuthentication: varchar("smtp_authentication", { length: 255 }).notNull().default("login"),
  smtpOpensslVerifyMode: varchar("smtp_openssl_verify_mode", { length: 255 })
    .notNull()
    .default("none"),
  smtpEnableSslTls: boolean("smtp_enable_ssl_tls").notNull().default(false),
  providerConfig: jsonb("provider_config").notNull().default({}),
  provider: varchar("provider", { length: 255 }),
  imapAuthentication: varchar("imap_authentication", { length: 255 }).notNull().default("plain"),
  verifiedForSending: boolean("verified_for_sending").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelFacebookPages = pgTable(
  "channel_facebook_pages",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    pageId: varchar("page_id", { length: 255 }).notNull(),
    userAccessToken: text("user_access_token").notNull(),
    pageAccessToken: text("page_access_token").notNull(),
    instagramId: varchar("instagram_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_channel_facebook_pages_on_page_id_and_account_id").on(
      table.pageId,
      table.accountId,
    ),
  ],
);

export const channelInstagrams = pgTable("channel_instagram", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  instagramId: varchar("instagram_id", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelTwitters = pgTable(
  "channel_twitter_profiles",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    profileId: varchar("profile_id", { length: 255 }).notNull(),
    twitterAccessToken: text("twitter_access_token").notNull(),
    twitterAccessTokenSecret: text("twitter_access_token_secret").notNull(),
    tweetsEnabled: boolean("tweets_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_channel_twitter_profiles_on_account_id_and_profile_id").on(
      table.accountId,
      table.profileId,
    ),
  ],
);

export const channelTelegrams = pgTable("channel_telegram", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  botName: varchar("bot_name", { length: 255 }),
  botToken: varchar("bot_token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelWhatsapps = pgTable("channel_whatsapp", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  businessManagementToken: text("business_management_token"),
  phoneNumber: varchar("phone_number", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 255 }).notNull().default("default"),
  providerConfig: jsonb("provider_config").notNull().default({}),
  messageTemplates: jsonb("message_templates").notNull().default({}),
  messageTemplatesLastUpdated: timestamp("message_templates_last_updated", {
    withTimezone: true,
  }),
  phoneNumberHealth: jsonb("phone_number_health").notNull().default({}),
  phoneNumberHealthCheckedAt: timestamp("phone_number_health_checked_at", { withTimezone: true }),
  phoneNumberHealthError: varchar("phone_number_health_error", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelSms = pgTable("channel_sms", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  phoneNumber: varchar("phone_number", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 255 }).notNull().default("default"),
  providerConfig: jsonb("provider_config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelLines = pgTable("channel_line", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  lineChannelId: varchar("line_channel_id", { length: 255 }).notNull().unique(),
  lineChannelSecret: varchar("line_channel_secret", { length: 255 }).notNull(),
  lineChannelToken: varchar("line_channel_token", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChannelWebWidget = typeof channelWebWidgets.$inferSelect;
export type ChannelApiRow = typeof channelApi.$inferSelect;
export type ChannelEmailRow = typeof channelEmail.$inferSelect;
