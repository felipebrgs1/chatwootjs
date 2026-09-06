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

import { accounts } from "./auth";

// Labels + atributos customizáveis — espelha chatwoot/db/schema.rb.

export const labels = pgTable(
  "labels",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    color: varchar("color", { length: 255 }).notNull().default("#1f93ff"),
    showOnSidebar: boolean("show_on_sidebar").notNull().default(true),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_labels_on_title_and_account_id").on(table.title, table.accountId),
    index("index_labels_on_account_id").on(table.accountId),
  ],
);

/**
 * attribute_model: 0 = contact, 1 = conversation (o 1 entra em uso no M4).
 * attribute_type: 0 text, 1 number, 2 link, 3 date, 4 list, 5 select…
 * Espelha app/models/custom_attribute_definition.rb.
 */
export const customAttributeDefinitions = pgTable(
  "custom_attribute_definitions",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    attributeModel: integer("attribute_model").notNull().default(0),
    attributeKey: varchar("attribute_key", { length: 255 }).notNull(),
    attributeDisplayName: varchar("attribute_display_name", { length: 255 }),
    attributeDisplayType: integer("attribute_display_type").notNull().default(0),
    defaultValue: varchar("default_value", { length: 255 }),
    attributeValues: jsonb("attribute_values").$type<string[]>().notNull().default([]),
    attributeDescription: text("attribute_description"),
    regexPattern: varchar("regex_pattern", { length: 255 }),
    regexCue: varchar("regex_cue", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("attribute_key_model_index").on(
      table.attributeKey,
      table.attributeModel,
      table.accountId,
    ),
    index("index_custom_attribute_definitions_on_account_id").on(table.accountId),
  ],
);

export type Label = typeof labels.$inferSelect;
export type CustomAttributeDefinition = typeof customAttributeDefinitions.$inferSelect;

/**
 * Vínculo tag ↔ entidade (acts-as-taggable). taggable_type: 'Contact',
 * 'Conversation' (M4); tag_id aponta para labels. context = 'labels'.
 */
export const taggings = pgTable(
  "taggings",
  {
    id: serial("id").primaryKey(),
    tagId: integer("tag_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    taggableType: varchar("taggable_type", { length: 255 }).notNull(),
    taggableId: integer("taggable_id").notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    context: varchar("context", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  (table) => [
    unique("taggings_idx").on(table.tagId, table.taggableId, table.taggableType, table.context),
    index("index_taggings_on_taggable_id_and_taggable_type_and_context").on(
      table.taggableId,
      table.taggableType,
      table.context,
    ),
    index("index_taggings_on_tag_id").on(table.tagId),
  ],
);

export type Tagging = typeof taggings.$inferSelect;
