import {
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

// Importação de dados (CSV de contatos no M3; data_type cresce depois).
// Espelha chatwoot/db/schema.rb (tabelas data_import*).

export const dataImports = pgTable(
  "data_imports",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    dataType: varchar("data_type", { length: 255 }).notNull(), // 'contact'
    // status: 0 pending, 1 processing, 2 completed, 3 failed, 4 abandoned
    status: integer("status").notNull().default(0),
    processingErrors: text("processing_errors"),
    totalRecords: integer("total_records"),
    processedRecords: integer("processed_records"),
    name: varchar("name", { length: 255 }),
    initiatedById: integer("initiated_by_id"),
    sourceMetadata: jsonb("source_metadata").notNull().default({}),
    stats: jsonb("stats").notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_data_imports_on_account_id").on(table.accountId),
    index("index_data_imports_on_initiated_by_id").on(table.initiatedById),
  ],
);

export const dataImportItems = pgTable(
  "data_import_items",
  {
    id: serial("id").primaryKey(),
    dataImportId: integer("data_import_id")
      .notNull()
      .references(() => dataImports.id, { onDelete: "cascade" }),
    sourceObjectType: varchar("source_object_type", { length: 255 }).notNull(),
    sourceObjectId: varchar("source_object_id", { length: 255 }).notNull(),
    // status: 0 pending, 1 processing, 2 success, 3 failed
    status: integer("status").notNull().default(0),
    chatwootRecordType: varchar("chatwoot_record_type", { length: 255 }),
    chatwootRecordId: integer("chatwoot_record_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: varchar("last_error_code", { length: 255 }),
    lastErrorMessage: text("last_error_message"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("idx_data_import_items_on_import_and_source").on(
      table.dataImportId,
      table.sourceObjectType,
      table.sourceObjectId,
    ),
    index("index_data_import_items_on_data_import_id").on(table.dataImportId),
  ],
);

export const dataImportErrors = pgTable(
  "data_import_errors",
  {
    id: serial("id").primaryKey(),
    dataImportId: integer("data_import_id")
      .notNull()
      .references(() => dataImports.id, { onDelete: "cascade" }),
    dataImportItemId: integer("data_import_item_id").references(() => dataImportItems.id, {
      onDelete: "cascade",
    }),
    sourceObjectType: varchar("source_object_type", { length: 255 }),
    sourceObjectId: varchar("source_object_id", { length: 255 }),
    errorCode: varchar("error_code", { length: 255 }).notNull(),
    message: text("message"),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_data_import_errors_on_data_import_id").on(table.dataImportId)],
);

export type DataImport = typeof dataImports.$inferSelect;
export type DataImportItem = typeof dataImportItems.$inferSelect;
export type DataImportError = typeof dataImportErrors.$inferSelect;
