import {
  bigint,
  bigserial,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// D1 — ActiveStorage + ActionMailbox. Espelha `chatwoot/db/schema.rb`
// (active_storage_blobs/attachments/variant_records,
// action_mailbox_inbound_emails). DDL fiel mesmo sem uso funcional — o
// armazenamento de anexos continua via S3/MinIO no app.

const ts = (name: string) => timestamp(name, { withTimezone: false });

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
    createdAt: ts("created_at").notNull(),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
  },
  (table) => [unique("index_active_storage_blobs_on_key").on(table.key)],
);

export const activeStorageAttachments = pgTable(
  "active_storage_attachments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    recordType: varchar("record_type", { length: 255 }).notNull(),
    recordId: bigint("record_id", { mode: "number" }).notNull(),
    blobId: bigint("blob_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [
    index("index_active_storage_attachments_on_blob_id").on(table.blobId),
    unique("index_active_storage_attachments_uniqueness").on(
      table.recordType,
      table.recordId,
      table.name,
      table.blobId,
    ),
  ],
);

export const activeStorageVariantRecords = pgTable(
  "active_storage_variant_records",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    blobId: bigint("blob_id", { mode: "number" }).notNull(),
    variationDigest: varchar("variation_digest", { length: 255 }).notNull(),
  },
  (table) => [
    unique("index_active_storage_variant_records_uniqueness").on(
      table.blobId,
      table.variationDigest,
    ),
  ],
);

export const actionMailboxInboundEmails = pgTable(
  "action_mailbox_inbound_emails",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: integer("status").notNull().default(0),
    messageId: varchar("message_id", { length: 255 }).notNull(),
    messageChecksum: varchar("message_checksum", { length: 255 }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    unique("index_action_mailbox_inbound_emails_uniqueness").on(
      table.messageId,
      table.messageChecksum,
    ),
  ],
);

export type ActiveStorageBlob = typeof activeStorageBlobs.$inferSelect;
export type ActiveStorageAttachment = typeof activeStorageAttachments.$inferSelect;
export type ActiveStorageVariantRecord = typeof activeStorageVariantRecords.$inferSelect;
export type ActionMailboxInboundEmail = typeof actionMailboxInboundEmails.$inferSelect;
