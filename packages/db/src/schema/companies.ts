import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./auth";

// Empresas — espelha chatwoot/db/schema.rb (tabela `companies`).
// Contatos vinculam via contacts.company_id (sem FK, igual ao Rails).

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    domain: varchar("domain", { length: 255 }),
    description: text("description"),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    contactsCount: integer("contacts_count"),
    additionalAttributes: jsonb("additional_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    customAttributes: jsonb("custom_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_companies_on_account_id").on(table.accountId),
    index("index_companies_on_name_and_account_id").on(table.name, table.accountId),
  ],
);

export type Company = typeof companies.$inferSelect;
