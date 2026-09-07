import { bigint, bigserial, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// D1 — Papéis customizados por conta. Espelha `custom_roles` do
// `chatwoot/db/schema.rb` (permissions é text[] no Rails).

const ts = (name: string) => timestamp(name, { withTimezone: false });

export const customRoles = pgTable(
  "custom_roles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 255 }),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    permissions: text("permissions").array().default([]),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [index("index_custom_roles_on_account_id").on(table.accountId)],
);

export type CustomRole = typeof customRoles.$inferSelect;
