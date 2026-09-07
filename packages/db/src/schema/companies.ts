import {
  bigint,
  bigserial,
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

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const companies = pgTable(
  "companies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    domain: varchar("domain", { length: 255 }),
    description: text("description"),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    contactsCount: integer("contacts_count"),
    additionalAttributes: jsonb("additional_attributes").default({}),
    customAttributes: jsonb("custom_attributes").default({}),
    lastActivityAt: timestamp("last_activity_at"),
  },
  (table) => [
    uniqueIndex("index_companies_on_account_and_domain")
      .on(table.accountId, table.domain)
      .where(sql`(domain IS NOT NULL)`),
    index("index_companies_on_account_id").on(table.accountId),
    index("index_companies_on_name_and_account_id").on(table.name, table.accountId),
  ],
);

export type Company = typeof companies.$inferSelect;
