import {
  bigint,
  bigserial,
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

import { accounts, users } from "./auth";
import { inboxes } from "./inboxes";

// Campanhas — espelha `campaigns` do schema.rb (campos do M7; display_id e
// sender seguem o Rails para paridade do payload).
// campaign_type: 0 ongoing, 1 one_off. campaign_status: 0 active, 1 completed.

export const campaigns = pgTable(
  "campaigns",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    description: text("description"),
    triggerRules: jsonb("trigger_rules")
      .$type<{ url?: string; time_on_page?: number }>()
      .notNull()
      .default({}),
    campaignType: integer("campaign_type").notNull().default(0),
    campaignStatus: integer("campaign_status").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    audience: jsonb("audience")
      .$type<{ labels?: string[]; inboxes?: number[] }>()
      .notNull()
      .default({}),
    displayId: integer("display_id"),
    senderId: integer("sender_id").references(() => users.id, { onDelete: "set null" }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_campaigns_on_account_id").on(table.accountId),
    index("index_campaigns_on_campaign_status").on(table.campaignStatus),
    index("index_campaigns_on_campaign_type").on(table.campaignType),
    index("index_campaigns_on_inbox_id").on(table.inboxId),
  ],
);

// D1 — destinatários de campanha (bulk). Espelha `campaign_recipients` do
// `chatwoot/db/schema.rb`. Em PG o unique simples equivale ao parcial do
// Rails (WHERE source_id IS NOT NULL), pois NULLs não conflitam.

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    campaignId: bigint("campaign_id", { mode: "number" }).notNull(),
    contactId: bigint("contact_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    sourceId: varchar("source_id", { length: 255 }),
    status: integer("status").notNull().default(0),
    errorCode: varchar("error_code", { length: 255 }),
    errorTitle: varchar("error_title", { length: 255 }),
    errorMessage: text("error_message"),
    messageContent: text("message_content"),
    sentAt: timestamp("sent_at", { withTimezone: false }),
    deliveredAt: timestamp("delivered_at", { withTimezone: false }),
    readAt: timestamp("read_at", { withTimezone: false }),
    failedAt: timestamp("failed_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
  },
  (table) => [
    index("index_campaign_recipients_on_account_id_and_campaign_id").on(
      table.accountId,
      table.campaignId,
    ),
    index("index_campaign_recipients_on_account_id").on(table.accountId),
    unique("index_campaign_recipients_on_campaign_id_and_contact_id").on(
      table.campaignId,
      table.contactId,
    ),
    index("index_campaign_recipients_on_campaign_id_and_status").on(table.campaignId, table.status),
    index("index_campaign_recipients_on_campaign_id").on(table.campaignId),
    index("index_campaign_recipients_on_contact_id").on(table.contactId),
    index("index_campaign_recipients_on_inbox_id").on(table.inboxId),
    unique("index_campaign_recipients_on_source_id").on(table.sourceId),
  ],
);

export type Campaign = typeof campaigns.$inferSelect;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
