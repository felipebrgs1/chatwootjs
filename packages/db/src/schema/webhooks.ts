import {
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
import { inboxes } from "./inboxes";

// Webhooks de saída — espelha `webhooks` do schema.rb.
// webhook_type: 0 account_type, 1 inbox_type.
// subscriptions: ex. ["conversation_created","message_created",...]

export const webhooks = pgTable(
  "webhooks",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    inboxId: integer("inbox_id").references(() => inboxes.id, { onDelete: "cascade" }),
    url: text("url"),
    webhookType: integer("webhook_type").notNull().default(0),
    subscriptions: jsonb("subscriptions").$type<string[]>().notNull().default([]),
    name: varchar("name", { length: 255 }),
    secret: varchar("secret", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_webhooks_on_account_id_and_url").on(table.accountId, table.url),
    index("index_webhooks_on_account_id").on(table.accountId),
  ],
);

export type Webhook = typeof webhooks.$inferSelect;
