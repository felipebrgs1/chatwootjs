import { bigint, bigserial, text, timestamp, varchar, pgTable, index } from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const customRoles = pgTable(
  "custom_roles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 255 }),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    permissions: text("permissions").array().default([]),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("index_custom_roles_on_account_id").on(table.accountId)],
);

export type CustomRole = typeof customRoles.$inferSelect;
