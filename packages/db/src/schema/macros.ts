import { index, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { accounts, users } from "./auth";

// Macros de 1 clique — espelha `macros` do schema.rb.
// visibility: 0 personal, 1 global. actions: [{ action_name, action_params }]

export const macros = pgTable(
  "macros",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    visibility: integer("visibility").notNull().default(0),
    createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
    updatedById: integer("updated_by_id").references(() => users.id, { onDelete: "set null" }),
    actions: jsonb("actions")
      .$type<Array<{ action_name: string; action_params: unknown[] }>>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_macros_on_account_id").on(table.accountId)],
);

export type Macro = typeof macros.$inferSelect;
