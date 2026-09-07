import {
  bigint,
  bigserial,
  integer,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const actionMailboxInboundEmails = pgTable(
  "action_mailbox_inbound_emails",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: integer("status").notNull().default(0),
    messageId: varchar("message_id", { length: 255 }).notNull(),
    messageChecksum: varchar("message_checksum", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("index_action_mailbox_inbound_emails_uniqueness").on(
      table.messageId,
      table.messageChecksum,
    ),
  ],
);

export const activeStorageAttachments = pgTable(
  "active_storage_attachments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    recordType: varchar("record_type", { length: 255 }).notNull(),
    recordId: bigint("record_id", { mode: "number" }).notNull(),
    blobId: bigint("blob_id", { mode: "number" })
      .notNull()
      .references(() => activeStorageBlobs.id),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_active_storage_attachments_on_blob_id").on(table.blobId),
    uniqueIndex("index_active_storage_attachments_uniqueness").on(
      table.recordType,
      table.recordId,
      table.name,
      table.blobId,
    ),
  ],
);

export const activeStorageBlobs = pgTable(
  "active_storage_blobs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: varchar("key", { length: 255 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 255 }),
    metadata: text("metadata"),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    checksum: varchar("checksum", { length: 255 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
  },
  (table) => [uniqueIndex("index_active_storage_blobs_on_key").on(table.key)],
);

export const activeStorageVariantRecords = pgTable(
  "active_storage_variant_records",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    blobId: bigint("blob_id", { mode: "number" })
      .notNull()
      .references(() => activeStorageBlobs.id),
    variationDigest: varchar("variation_digest", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("index_active_storage_variant_records_uniqueness").on(
      table.blobId,
      table.variationDigest,
    ),
  ],
);

export type ActionMailboxInboundEmail = typeof actionMailboxInboundEmails.$inferSelect;
export type ActiveStorageAttachment = typeof activeStorageAttachments.$inferSelect;
export type ActiveStorageBlob = typeof activeStorageBlobs.$inferSelect;
export type ActiveStorageVariantRecord = typeof activeStorageVariantRecords.$inferSelect;
