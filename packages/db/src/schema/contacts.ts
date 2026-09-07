import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  serial,
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

export const contactInboxes = pgTable(
  "contact_inboxes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    contactId: bigint("contact_id", { mode: "number" }),
    inboxId: bigint("inbox_id", { mode: "number" }),
    sourceId: text("source_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    hmacVerified: boolean("hmac_verified").default(false),
    pubsubToken: varchar("pubsub_token", { length: 255 }),
  },
  (table) => [
    index("index_contact_inboxes_on_contact_id").on(table.contactId),
    uniqueIndex("index_contact_inboxes_on_inbox_id_and_source_id").on(
      table.inboxId,
      table.sourceId,
    ),
    index("index_contact_inboxes_on_inbox_id").on(table.inboxId),
    uniqueIndex("index_contact_inboxes_on_pubsub_token").on(table.pubsubToken),
    index("index_contact_inboxes_on_source_id").on(table.sourceId),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).default(""),
    email: varchar("email", { length: 255 }),
    phoneNumber: varchar("phone_number", { length: 255 }),
    accountId: integer("account_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    additionalAttributes: jsonb("additional_attributes").default({}),
    identifier: varchar("identifier", { length: 255 }),
    customAttributes: jsonb("custom_attributes").default({}),
    lastActivityAt: timestamp("last_activity_at"),
    contactType: integer("contact_type").default(0),
    middleName: varchar("middle_name", { length: 255 }).default(""),
    lastName: varchar("last_name", { length: 255 }).default(""),
    location: varchar("location", { length: 255 }).default(""),
    countryCode: varchar("country_code", { length: 255 }).default(""),
    blocked: boolean("blocked").notNull().default(false),
    companyId: bigint("company_id", { mode: "number" }),
  },
  (table) => [
    index("index_contacts_on_lower_email_account_id").on(sql`lower((email)::text), account_id`),
    index("index_contacts_on_account_id_and_contact_type").on(table.accountId, table.contactType),
    index("index_contacts_on_nonempty_fields")
      .on(table.accountId, table.email, table.phoneNumber, table.identifier)
      .where(
        sql`(((email)::text <> ''::text) OR ((phone_number)::text <> ''::text) OR ((identifier)::text <> ''::text))`,
      ),
    index("index_contacts_on_account_id_and_last_activity_at").on(
      table.accountId,
      table.lastActivityAt,
    ),
    index("index_contacts_on_account_id").on(table.accountId),
    index("index_resolved_contact_account_id")
      .on(table.accountId)
      .where(
        sql`(((email)::text <> ''::text) OR ((phone_number)::text <> ''::text) OR ((identifier)::text <> ''::text))`,
      ),
    index("index_contacts_on_blocked").on(table.blocked),
    index("index_contacts_on_company_id").on(table.companyId),
    uniqueIndex("uniq_email_per_account_contact").on(table.email, table.accountId),
    uniqueIndex("uniq_identifier_per_account_contact").on(table.identifier, table.accountId),
    index("index_contacts_on_name_email_phone_number_identifier").using(
      "gin",
      sql`"name" gin_trgm_ops`,
      sql`"email" gin_trgm_ops`,
      sql`"phone_number" gin_trgm_ops`,
      sql`"identifier" gin_trgm_ops`,
    ),
    index("index_contacts_on_phone_number_and_account_id").on(table.phoneNumber, table.accountId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    content: text("content").notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    contactId: bigint("contact_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_notes_on_account_id").on(table.accountId),
    index("index_notes_on_contact_id").on(table.contactId),
    index("index_notes_on_user_id").on(table.userId),
  ],
);

export type ContactInbox = typeof contactInboxes.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Note = typeof notes.$inferSelect;
