import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// D1 — Captain (IA), sessões de agente, outcomes e embeddings de artigos.
// Espelha `chatwoot/db/schema.rb`. Sem FKs em D1 (D2 alinha); índices
// exóticos (ivfflat/gist, gin, expressão md5/lower, parciais com WHERE que
// mudam semântica) ficam para D2 — aqui só btree com nomes Rails exatos.

const ts = (name: string) => timestamp(name, { withTimezone: false });

export const captainAssistants = pgTable(
  "captain_assistants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    description: text("description"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    responseGuidelines: jsonb("response_guidelines").$type<unknown[]>().default([]),
    guardrails: jsonb("guardrails").$type<unknown[]>().default([]),
  },
  (table) => [index("index_captain_assistants_on_account_id").on(table.accountId)],
);

export const captainDocuments = pgTable(
  "captain_documents",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    externalLink: text("external_link").notNull(),
    content: text("content"),
    assistantId: bigint("assistant_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    status: integer("status").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    syncStatus: integer("sync_status"),
    lastSyncedAt: ts("last_synced_at"),
    lastSyncAttemptedAt: ts("last_sync_attempted_at"),
  },
  (table) => [
    // O unique real do Rails é expressão (assistant_id, md5(external_link)) — D2.
    index("idx_captain_documents_on_account_assistant_sync_stats").on(
      table.accountId,
      table.assistantId,
      table.syncStatus,
      table.lastSyncedAt,
    ),
    index("index_captain_documents_on_account_id_and_sync_status").on(
      table.accountId,
      table.syncStatus,
    ),
    index("index_captain_documents_on_account_id").on(table.accountId),
    index("index_captain_documents_on_assistant_id").on(table.assistantId),
    index("index_captain_documents_on_status").on(table.status),
  ],
);

export const captainAssistantResponses = pgTable(
  "captain_assistant_responses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    question: varchar("question", { length: 255 }).notNull(),
    answer: text("answer").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    assistantId: bigint("assistant_id", { mode: "number" }).notNull(),
    documentableId: bigint("documentable_id", { mode: "number" }),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    status: integer("status").notNull().default(1),
    documentableType: varchar("documentable_type", { length: 255 }),
    edited: boolean("edited").notNull().default(false),
  },
  (table) => [
    index("index_captain_assistant_responses_on_account_id").on(table.accountId),
    index("index_captain_assistant_responses_on_assistant_id").on(table.assistantId),
    index("idx_cap_asst_resp_on_documentable").on(table.documentableId, table.documentableType),
    index("index_captain_assistant_responses_on_status").on(table.status),
  ],
);

export const captainCustomTools = pgTable(
  "captain_custom_tools",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    httpMethod: varchar("http_method", { length: 255 }).notNull().default("GET"),
    endpointUrl: text("endpoint_url").notNull(),
    requestTemplate: text("request_template"),
    responseTemplate: text("response_template"),
    authType: varchar("auth_type", { length: 255 }).default("none"),
    authConfig: jsonb("auth_config").$type<Record<string, unknown>>().default({}),
    paramSchema: jsonb("param_schema").$type<unknown[]>().default([]),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    unique("index_captain_custom_tools_on_account_id_and_slug").on(table.accountId, table.slug),
    index("index_captain_custom_tools_on_account_id").on(table.accountId),
  ],
);

export const captainFaqObservations = pgTable(
  "captain_faq_observations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    faqSuggestionId: bigint("faq_suggestion_id", { mode: "number" }),
    generatedQuestion: varchar("generated_question", { length: 255 }).notNull(),
    generatedAnswer: text("generated_answer").notNull(),
    language: varchar("language", { length: 255 }).notNull().default("en"),
    status: integer("status").notNull().default(0),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    // No Rails é parcial (WHERE faq_suggestion_id IS NOT NULL); em PG o unique
    // simples é equivalente (NULLs não conflitam).
    unique("idx_captain_faq_observations_on_conversation_and_suggestion").on(
      table.conversationId,
      table.faqSuggestionId,
    ),
    index("index_captain_faq_observations_on_account_id").on(table.accountId),
    index("index_captain_faq_observations_on_conversation_id").on(table.conversationId),
    index("index_captain_faq_observations_on_faq_suggestion_id").on(table.faqSuggestionId),
  ],
);

export const captainFaqSuggestions = pgTable(
  "captain_faq_suggestions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    question: varchar("question", { length: 255 }).notNull(),
    answer: text("answer").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    assistantId: bigint("assistant_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    language: varchar("language", { length: 255 }).notNull().default("en"),
    sourceCount: integer("source_count").notNull().default(0),
    status: integer("status").notNull().default(0),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("index_captain_faq_suggestions_on_account_id").on(table.accountId),
    index("idx_cap_faq_suggestions_on_account_assistant_status_language").on(
      table.accountId,
      table.assistantId,
      table.status,
      table.language,
    ),
    index("index_captain_faq_suggestions_on_assistant_id").on(table.assistantId),
  ],
);

export const captainInboxes = pgTable(
  "captain_inboxes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    captainAssistantId: bigint("captain_assistant_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    unique("index_captain_inboxes_on_captain_assistant_id_and_inbox_id").on(
      table.captainAssistantId,
      table.inboxId,
    ),
    index("index_captain_inboxes_on_captain_assistant_id").on(table.captainAssistantId),
    index("index_captain_inboxes_on_inbox_id").on(table.inboxId),
  ],
);

export const captainMessageReports = pgTable(
  "captain_message_reports",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    messageId: bigint("message_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    reportReason: varchar("report_reason", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("index_captain_message_reports_on_account_id").on(table.accountId),
    index("index_captain_message_reports_on_conversation_id").on(table.conversationId),
    index("index_captain_message_reports_on_message_id").on(table.messageId),
    index("index_captain_message_reports_on_user_id").on(table.userId),
  ],
);

export const captainScenarios = pgTable(
  "captain_scenarios",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    instruction: text("instruction"),
    tools: jsonb("tools").$type<unknown[]>().default([]),
    enabled: boolean("enabled").notNull().default(true),
    assistantId: bigint("assistant_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("index_captain_scenarios_on_account_id").on(table.accountId),
    index("index_captain_scenarios_on_assistant_id_and_enabled").on(
      table.assistantId,
      table.enabled,
    ),
    index("index_captain_scenarios_on_assistant_id").on(table.assistantId),
    index("index_captain_scenarios_on_enabled").on(table.enabled),
  ],
);

export const conversationOutcomes = pgTable(
  "conversation_outcomes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    assistantId: bigint("assistant_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    firstCaptainReplyAt: ts("first_captain_reply_at"),
    lastCaptainReplyAt: ts("last_captain_reply_at"),
    captainReplyCount: integer("captain_reply_count").notNull().default(0),
    firstHumanReplyAt: ts("first_human_reply_at"),
    handoffAt: ts("handoff_at"),
    handoffReasonCategory: varchar("handoff_reason_category", { length: 255 }),
    resolvedAt: ts("resolved_at"),
    csatRating: integer("csat_rating"),
    csatReceivedAt: ts("csat_received_at"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    episodeTrigger: varchar("episode_trigger", { length: 255 }).notNull().default("initial"),
    startedAt: ts("started_at").notNull(),
    endedAt: ts("ended_at"),
  },
  (table) => [
    index("idx_conversation_outcomes_on_assistant_handoff_at").on(
      table.accountId,
      table.assistantId,
      table.handoffAt,
    ),
    index("idx_conversation_outcomes_on_assistant_resolved_at").on(
      table.accountId,
      table.assistantId,
      table.resolvedAt,
    ),
    index("idx_conversation_outcomes_on_assistant_started_at").on(
      table.accountId,
      table.assistantId,
      table.startedAt,
    ),
    unique("idx_conversation_outcomes_unique_boundary").on(
      table.accountId,
      table.conversationId,
      table.startedAt,
    ),
    // Parciais do Rails (episode_trigger='initial', ended_at IS NULL) — D2.
    index("index_conversation_outcomes_on_account_id").on(table.accountId),
    index("index_conversation_outcomes_on_assistant_id").on(table.assistantId),
    index("index_conversation_outcomes_on_conversation_id").on(table.conversationId),
    index("index_conversation_outcomes_on_inbox_id").on(table.inboxId),
  ],
);

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionType: integer("session_type").notNull(),
    subjectType: varchar("subject_type", { length: 255 }).notNull(),
    subjectId: bigint("subject_id", { mode: "number" }).notNull(),
    resultType: varchar("result_type", { length: 255 }),
    resultId: bigint("result_id", { mode: "number" }),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    assistantId: bigint("assistant_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }),
    llmModel: varchar("llm_model", { length: 255 }),
    creditsConsumed: doublePrecision("credits_consumed"),
    faqIds: jsonb("faq_ids").$type<unknown[]>().default([]),
    documentIds: jsonb("document_ids").$type<unknown[]>().default([]),
    scenarioIds: jsonb("scenario_ids").$type<unknown[]>().default([]),
    runContext: jsonb("run_context").$type<Record<string, unknown>>().default({}),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    citedDocumentIds: jsonb("cited_document_ids").$type<unknown[]>().notNull().default([]),
    usedFaqIds: jsonb("used_faq_ids").$type<unknown[]>().notNull().default([]),
  },
  (table) => [
    index("idx_on_account_id_result_type_result_id_ca66c00cd7").on(
      table.accountId,
      table.resultType,
      table.resultId,
    ),
    index("idx_on_account_id_session_type_created_at_c20a14bd4e").on(
      table.accountId,
      table.sessionType,
      table.createdAt,
    ),
    index("idx_on_account_id_subject_type_subject_id_6d60963b3d").on(
      table.accountId,
      table.subjectType,
      table.subjectId,
    ),
    index("index_agent_sessions_on_account_id").on(table.accountId),
    index("index_agent_sessions_on_assistant_id").on(table.assistantId),
    // GIN em cited/document/used ids — D2.
    index("index_agent_sessions_on_user_id").on(table.userId),
  ],
);

export const articleEmbeddings = pgTable("article_embeddings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  articleId: bigint("article_id", { mode: "number" }).notNull(),
  term: text("term").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  // Índice ivfflat em embedding — D2.
});

export type CaptainAssistant = typeof captainAssistants.$inferSelect;
export type CaptainDocument = typeof captainDocuments.$inferSelect;
export type CaptainAssistantResponse = typeof captainAssistantResponses.$inferSelect;
export type CaptainCustomTool = typeof captainCustomTools.$inferSelect;
export type CaptainFaqObservation = typeof captainFaqObservations.$inferSelect;
export type CaptainFaqSuggestion = typeof captainFaqSuggestions.$inferSelect;
export type CaptainInbox = typeof captainInboxes.$inferSelect;
export type CaptainMessageReport = typeof captainMessageReports.$inferSelect;
export type CaptainScenario = typeof captainScenarios.$inferSelect;
export type ConversationOutcome = typeof conversationOutcomes.$inferSelect;
export type AgentSession = typeof agentSessions.$inferSelect;
export type ArticleEmbedding = typeof articleEmbeddings.$inferSelect;
