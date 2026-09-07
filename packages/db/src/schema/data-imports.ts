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

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const dataImportErrors = pgTable(
  "data_import_errors",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    dataImportId: bigint("data_import_id", { mode: "number" }).notNull(),
    dataImportItemId: bigint("data_import_item_id", { mode: "number" }),
    sourceObjectType: varchar("source_object_type", { length: 255 }),
    sourceObjectId: varchar("source_object_id", { length: 255 }),
    errorCode: varchar("error_code", { length: 255 }).notNull(),
    message: text("message"),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_data_import_errors_on_data_import_id").on(table.dataImportId),
    index("index_data_import_errors_on_data_import_item_id").on(table.dataImportItemId),
    index("idx_data_import_errors_on_source").on(table.sourceObjectType, table.sourceObjectId),
  ],
);

export const dataImportItems = pgTable(
  "data_import_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    dataImportId: bigint("data_import_id", { mode: "number" }).notNull(),
    sourceProvider: varchar("source_provider", { length: 255 }).notNull(),
    sourceObjectType: varchar("source_object_type", { length: 255 }).notNull(),
    sourceObjectId: varchar("source_object_id", { length: 255 }).notNull(),
    status: integer("status").notNull().default(0),
    chatwootRecordType: varchar("chatwoot_record_type", { length: 255 }),
    chatwootRecordId: bigint("chatwoot_record_id", { mode: "number" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: varchar("last_error_code", { length: 255 }),
    lastErrorMessage: text("last_error_message"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_data_import_items_on_record").on(table.chatwootRecordType, table.chatwootRecordId),
    uniqueIndex("idx_data_import_items_on_import_and_source").on(
      table.dataImportId,
      table.sourceObjectType,
      table.sourceObjectId,
    ),
    index("index_data_import_items_on_data_import_id").on(table.dataImportId),
    index("idx_data_import_items_on_source").on(
      table.sourceProvider,
      table.sourceObjectType,
      table.sourceObjectId,
    ),
  ],
);

export const dataImportMappings = pgTable(
  "data_import_mappings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    dataImportId: bigint("data_import_id", { mode: "number" }).notNull(),
    sourceProvider: varchar("source_provider", { length: 255 }).notNull(),
    sourceObjectType: varchar("source_object_type", { length: 255 }).notNull(),
    sourceObjectId: varchar("source_object_id", { length: 255 }).notNull(),
    chatwootRecordType: varchar("chatwoot_record_type", { length: 255 }).notNull(),
    chatwootRecordId: bigint("chatwoot_record_id", { mode: "number" }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_data_import_mappings_on_account_and_source").on(
      table.accountId,
      table.sourceProvider,
      table.sourceObjectType,
      table.sourceObjectId,
    ),
    index("idx_data_import_mappings_on_record").on(
      table.chatwootRecordType,
      table.chatwootRecordId,
    ),
    index("index_data_import_mappings_on_data_import_id").on(table.dataImportId),
  ],
);

export const dataImports = pgTable(
  "data_imports",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    dataType: varchar("data_type", { length: 255 }).notNull(),
    status: integer("status").notNull().default(0),
    processingErrors: text("processing_errors"),
    totalRecords: integer("total_records"),
    processedRecords: integer("processed_records"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    name: varchar("name", { length: 255 }),
    sourceType: varchar("source_type", { length: 255 }),
    sourceProvider: varchar("source_provider", { length: 255 }),
    importTypes: jsonb("import_types").notNull().default([]),
    initiatedById: integer("initiated_by_id"),
    accessToken: text("access_token"),
    sourceMetadata: jsonb("source_metadata").notNull().default({}),
    stats: jsonb("stats").notNull().default({}),
    cursor: jsonb("cursor").notNull().default({}),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    abandonedAt: timestamp("abandoned_at"),
    lastErrorAt: timestamp("last_error_at"),
  },
  (table) => [
    index("index_data_imports_on_account_id").on(table.accountId),
    index("index_data_imports_on_initiated_by_id").on(table.initiatedById),
    index("index_data_imports_on_source_provider").on(table.sourceProvider),
  ],
);

export type DataImportError = typeof dataImportErrors.$inferSelect;
export type DataImportItem = typeof dataImportItems.$inferSelect;
export type DataImportMapping = typeof dataImportMappings.$inferSelect;
export type DataImport = typeof dataImports.$inferSelect;
