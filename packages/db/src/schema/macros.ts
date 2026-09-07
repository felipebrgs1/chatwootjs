import {
  bigint,
  bigserial,
  integer,
  jsonb,
  timestamp,
  varchar,
  pgTable,
  index,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const macros = pgTable(
  "macros",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    visibility: integer("visibility").default(0),
    createdById: bigint("created_by_id", { mode: "number" }),
    updatedById: bigint("updated_by_id", { mode: "number" }),
    actions: jsonb("actions").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("index_macros_on_account_id").on(table.accountId)],
);

export type Macro = typeof macros.$inferSelect;
