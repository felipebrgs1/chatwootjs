import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts } from "./auth";
import { contacts } from "./contacts";
import { inboxes } from "./inboxes";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" })
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    campaignId: bigint("campaign_id", { mode: "number" })
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: bigint("contact_id", { mode: "number" })
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    inboxId: bigint("inbox_id", { mode: "number" })
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    sourceId: varchar("source_id", { length: 255 }),
    status: integer("status").notNull().default(0),
    errorCode: varchar("error_code", { length: 255 }),
    errorTitle: varchar("error_title", { length: 255 }),
    errorMessage: text("error_message"),
    messageContent: text("message_content"),
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_campaign_recipients_on_account_id_and_campaign_id").on(
      table.accountId,
      table.campaignId,
    ),
    index("index_campaign_recipients_on_account_id").on(table.accountId),
    uniqueIndex("index_campaign_recipients_on_campaign_id_and_contact_id").on(
      table.campaignId,
      table.contactId,
    ),
    index("index_campaign_recipients_on_campaign_id_and_status").on(table.campaignId, table.status),
    index("index_campaign_recipients_on_campaign_id").on(table.campaignId),
    index("index_campaign_recipients_on_contact_id").on(table.contactId),
    index("index_campaign_recipients_on_inbox_id").on(table.inboxId),
    uniqueIndex("index_campaign_recipients_on_source_id")
      .on(table.sourceId)
      .where(sql`(source_id IS NOT NULL)`),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    displayId: integer("display_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    message: text("message").notNull(),
    senderId: integer("sender_id"),
    enabled: boolean("enabled").default(true),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    triggerRules: jsonb("trigger_rules").default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    campaignType: integer("campaign_type").notNull().default(0),
    campaignStatus: integer("campaign_status").notNull().default(0),
    audience: jsonb("audience").default([]),
    scheduledAt: timestamp("scheduled_at"),
    triggerOnlyDuringBusinessHours: boolean("trigger_only_during_business_hours").default(false),
    templateParams: jsonb("template_params"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("index_campaigns_on_account_id").on(table.accountId),
    index("index_campaigns_on_campaign_status").on(table.campaignStatus),
    index("index_campaigns_on_campaign_type").on(table.campaignType),
    index("index_campaigns_on_inbox_id").on(table.inboxId),
    index("index_campaigns_on_scheduled_at").on(table.scheduledAt),
  ],
);

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
