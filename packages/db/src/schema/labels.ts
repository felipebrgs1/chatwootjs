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

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const customAttributeDefinitions = pgTable(
  "custom_attribute_definitions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    attributeDisplayName: varchar("attribute_display_name", { length: 255 }),
    attributeKey: varchar("attribute_key", { length: 255 }),
    attributeDisplayType: integer("attribute_display_type").default(0),
    defaultValue: integer("default_value"),
    attributeModel: integer("attribute_model").default(0),
    accountId: bigint("account_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    attributeDescription: text("attribute_description"),
    attributeValues: jsonb("attribute_values").default([]),
    regexPattern: varchar("regex_pattern", { length: 255 }),
    regexCue: varchar("regex_cue", { length: 255 }),
  },
  (table) => [
    index("index_custom_attribute_definitions_on_account_id").on(table.accountId),
    uniqueIndex("attribute_key_model_index").on(
      table.attributeKey,
      table.attributeModel,
      table.accountId,
    ),
  ],
);

export const labels = pgTable(
  "labels",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    color: varchar("color", { length: 255 }).notNull().default("#1f93ff"),
    showOnSidebar: boolean("show_on_sidebar"),
    accountId: bigint("account_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_labels_on_account_id").on(table.accountId),
    uniqueIndex("index_labels_on_title_and_account_id").on(table.title, table.accountId),
  ],
);

export const taggings = pgTable(
  "taggings",
  {
    id: serial("id").primaryKey(),
    tagId: integer("tag_id"),
    taggableType: varchar("taggable_type", { length: 255 }),
    taggableId: integer("taggable_id"),
    taggerType: varchar("tagger_type", { length: 255 }),
    taggerId: integer("tagger_id"),
    context: varchar("context", { length: 128 }),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("index_taggings_on_context").on(table.context),
    uniqueIndex("taggings_idx").on(
      table.tagId,
      table.taggableId,
      table.taggableType,
      table.context,
      table.taggerId,
      table.taggerType,
    ),
    index("index_taggings_on_tag_id").on(table.tagId),
    index("index_taggings_on_taggable_id_and_taggable_type_and_context").on(
      table.taggableId,
      table.taggableType,
      table.context,
    ),
    index("taggings_idy").on(table.taggableId, table.taggableType, table.taggerId, table.context),
    index("index_taggings_on_taggable_id").on(table.taggableId),
    index("index_taggings_on_taggable_type").on(table.taggableType),
    index("index_taggings_on_tagger_id_and_tagger_type").on(table.taggerId, table.taggerType),
    index("index_taggings_on_tagger_id").on(table.taggerId),
  ],
);

export type CustomAttributeDefinition = typeof customAttributeDefinitions.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type Tagging = typeof taggings.$inferSelect;
