import {
  boolean,
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

import { accounts, users } from "./auth";
import { inboxes } from "./inboxes";

// CRM de contatos — espelha chatwoot/db/schema.rb.
// additional_attributes = dados por canal (formulário do widget etc.).
// custom_attributes = campos definidos em custom_attribute_definitions.

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().default(""),
    email: varchar("email", { length: 255 }),
    phoneNumber: varchar("phone_number", { length: 255 }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    additionalAttributes: jsonb("additional_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    identifier: varchar("identifier", { length: 255 }),
    customAttributes: jsonb("custom_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    contactType: integer("contact_type").notNull().default(0),
    middleName: varchar("middle_name", { length: 255 }).notNull().default(""),
    lastName: varchar("last_name", { length: 255 }).notNull().default(""),
    location: varchar("location", { length: 255 }).notNull().default(""),
    countryCode: varchar("country_code", { length: 255 }).notNull().default(""),
    blocked: boolean("blocked").notNull().default(false),
    companyId: integer("company_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uniq_email_per_account_contact").on(table.email, table.accountId),
    unique("uniq_identifier_per_account_contact").on(table.identifier, table.accountId),
    index("index_contacts_on_account_id").on(table.accountId),
    index("index_contacts_on_account_id_and_last_activity_at").on(
      table.accountId,
      table.lastActivityAt,
    ),
    index("index_contacts_on_phone_number_and_account_id").on(table.phoneNumber, table.accountId),
    index("index_contacts_on_company_id").on(table.companyId),
  ],
);

/** Vínculo contato ↔ inbox (identidade por canal). */
export const contactInboxes = pgTable(
  "contact_inboxes",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull(),
    hmacVerified: boolean("hmac_verified").notNull().default(false),
    pubsubToken: varchar("pubsub_token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_contact_inboxes_on_inbox_id_and_source_id").on(table.inboxId, table.sourceId),
    index("index_contact_inboxes_on_contact_id").on(table.contactId),
    index("index_contact_inboxes_on_inbox_id").on(table.inboxId),
    index("index_contact_inboxes_on_pubsub_token").on(table.pubsubToken),
    index("index_contact_inboxes_on_source_id").on(table.sourceId),
  ],
);

/** Notas internas sobre um contato. */
export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_notes_on_account_id").on(table.accountId),
    index("index_notes_on_contact_id").on(table.contactId),
    index("index_notes_on_user_id").on(table.userId),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type ContactInbox = typeof contactInboxes.$inferSelect;
export type Note = typeof notes.$inferSelect;
