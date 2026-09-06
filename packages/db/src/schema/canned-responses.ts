import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./auth";

// Respostas prontas (`//atalho`) — espelha `canned_responses` do schema.rb.

export const cannedResponses = pgTable(
  "canned_responses",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    shortCode: varchar("short_code", { length: 255 }),
    content: text("content"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_canned_responses_on_short_code_and_account_id").on(
      table.shortCode,
      table.accountId,
    ),
    index("index_canned_responses_on_account_id").on(table.accountId),
  ],
);

export type CannedResponse = typeof cannedResponses.$inferSelect;
