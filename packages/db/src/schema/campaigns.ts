import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
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

export type Campaign = typeof campaigns.$inferSelect;
