CREATE EXTENSION IF NOT EXISTS "vector";
--> statement-breakpoint
ALTER TABLE "audit_logs" RENAME TO "audits";
--> statement-breakpoint
ALTER SEQUENCE IF EXISTS "audit_logs_id_seq" RENAME TO "audits_id_seq";
--> statement-breakpoint
CREATE TABLE "action_mailbox_inbound_emails" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"message_checksum" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_action_mailbox_inbound_emails_uniqueness" UNIQUE("message_id","message_checksum")
);
--> statement-breakpoint
CREATE TABLE "active_storage_attachments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"record_type" varchar(255) NOT NULL,
	"record_id" bigint NOT NULL,
	"blob_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "index_active_storage_attachments_uniqueness" UNIQUE("record_type","record_id","name","blob_id")
);
--> statement-breakpoint
CREATE TABLE "active_storage_blobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content_type" varchar(255),
	"metadata" text,
	"byte_size" bigint NOT NULL,
	"checksum" varchar(255),
	"created_at" timestamp NOT NULL,
	"service_name" varchar(255) NOT NULL,
	CONSTRAINT "index_active_storage_blobs_on_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "active_storage_variant_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"blob_id" bigint NOT NULL,
	"variation_digest" varchar(255) NOT NULL,
	CONSTRAINT "index_active_storage_variant_records_uniqueness" UNIQUE("blob_id","variation_digest")
);
--> statement-breakpoint
CREATE TABLE "account_saml_settings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"sso_url" varchar(255),
	"certificate" text,
	"sp_entity_id" varchar(255),
	"idp_entity_id" varchar(255),
	"role_mappings" json DEFAULT '{}'::json,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"ip_address" varchar(255),
	"user_agent" varchar(255),
	"browser_name" varchar(255),
	"browser_version" varchar(255),
	"device_name" varchar(255),
	"platform_name" varchar(255),
	"platform_version" varchar(255),
	"city" varchar(255),
	"country" varchar(255),
	"country_code" varchar(255),
	"last_activity_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_user_sessions_on_user_id_and_client_id" UNIQUE("user_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"contact_id" bigint NOT NULL,
	"message_id" bigint,
	"accepted_by_agent_id" bigint,
	"provider_call_id" varchar(255) NOT NULL,
	"provider" integer DEFAULT 0 NOT NULL,
	"direction" integer NOT NULL,
	"status" varchar(255) DEFAULT 'ringing' NOT NULL,
	"started_at" timestamp,
	"duration_seconds" integer,
	"end_reason" varchar(255),
	"meta" jsonb DEFAULT '{}'::jsonb,
	"transcript" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_calls_on_provider_and_provider_call_id" UNIQUE("provider","provider_call_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"campaign_id" bigint NOT NULL,
	"contact_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"source_id" varchar(255),
	"status" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(255),
	"error_title" varchar(255),
	"error_message" text,
	"message_content" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_campaign_recipients_on_campaign_id_and_contact_id" UNIQUE("campaign_id","contact_id"),
	CONSTRAINT "index_campaign_recipients_on_source_id" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_type" integer NOT NULL,
	"subject_type" varchar(255) NOT NULL,
	"subject_id" bigint NOT NULL,
	"result_type" varchar(255),
	"result_id" bigint,
	"account_id" bigint NOT NULL,
	"assistant_id" bigint NOT NULL,
	"user_id" bigint,
	"llm_model" varchar(255),
	"credits_consumed" double precision,
	"faq_ids" jsonb DEFAULT '[]'::jsonb,
	"document_ids" jsonb DEFAULT '[]'::jsonb,
	"scenario_ids" jsonb DEFAULT '[]'::jsonb,
	"run_context" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"cited_document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"used_faq_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_embeddings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"article_id" bigint NOT NULL,
	"term" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captain_assistant_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"question" varchar(255) NOT NULL,
	"answer" text NOT NULL,
	"embedding" vector(1536),
	"assistant_id" bigint NOT NULL,
	"documentable_id" bigint,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"documentable_type" varchar(255),
	"edited" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captain_assistants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_id" bigint NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_guidelines" jsonb DEFAULT '[]'::jsonb,
	"guardrails" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "captain_custom_tools" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"http_method" varchar(255) DEFAULT 'GET' NOT NULL,
	"endpoint_url" text NOT NULL,
	"request_template" text,
	"response_template" text,
	"auth_type" varchar(255) DEFAULT 'none',
	"auth_config" jsonb DEFAULT '{}'::jsonb,
	"param_schema" jsonb DEFAULT '[]'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_captain_custom_tools_on_account_id_and_slug" UNIQUE("account_id","slug")
);
--> statement-breakpoint
CREATE TABLE "captain_documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"external_link" text NOT NULL,
	"content" text,
	"assistant_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sync_status" integer,
	"last_synced_at" timestamp,
	"last_sync_attempted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "captain_faq_observations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"faq_suggestion_id" bigint,
	"generated_question" varchar(255) NOT NULL,
	"generated_answer" text NOT NULL,
	"language" varchar(255) DEFAULT 'en' NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_captain_faq_observations_on_conversation_and_suggestion" UNIQUE("conversation_id","faq_suggestion_id")
);
--> statement-breakpoint
CREATE TABLE "captain_faq_suggestions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"question" varchar(255) NOT NULL,
	"answer" text NOT NULL,
	"embedding" vector(1536),
	"assistant_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"language" varchar(255) DEFAULT 'en' NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captain_inboxes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"captain_assistant_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_captain_inboxes_on_captain_assistant_id_and_inbox_id" UNIQUE("captain_assistant_id","inbox_id")
);
--> statement-breakpoint
CREATE TABLE "captain_message_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"message_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"report_reason" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captain_scenarios" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" text,
	"instruction" text,
	"tools" jsonb DEFAULT '[]'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"assistant_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_outcomes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"assistant_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"first_captain_reply_at" timestamp,
	"last_captain_reply_at" timestamp,
	"captain_reply_count" integer DEFAULT 0 NOT NULL,
	"first_human_reply_at" timestamp,
	"handoff_at" timestamp,
	"handoff_reason_category" varchar(255),
	"resolved_at" timestamp,
	"csat_rating" integer,
	"csat_received_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"episode_trigger" varchar(255) DEFAULT 'initial' NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "idx_conversation_outcomes_unique_boundary" UNIQUE("account_id","conversation_id","started_at")
);
--> statement-breakpoint
CREATE TABLE "channel_tiktok" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"refresh_token_expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_channel_tiktok_on_business_id" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "channel_twilio_sms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"phone_number" varchar(255),
	"auth_token" varchar(255) NOT NULL,
	"account_sid" varchar(255) NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"medium" integer DEFAULT 0,
	"messaging_service_sid" varchar(255),
	"api_key_sid" varchar(255),
	"content_templates" jsonb DEFAULT '{}'::jsonb,
	"content_templates_last_updated" timestamp,
	"voice_enabled" boolean DEFAULT false NOT NULL,
	"twiml_app_sid" varchar(255),
	"api_key_secret" varchar(255),
	"provider_config" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "index_channel_twilio_sms_on_account_sid_and_phone_number" UNIQUE("account_sid","phone_number"),
	CONSTRAINT "index_channel_twilio_sms_on_messaging_service_sid" UNIQUE("messaging_service_sid"),
	CONSTRAINT "index_channel_twilio_sms_on_phone_number" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "copilot_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"copilot_thread_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"message" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"message_type" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "copilot_threads" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"user_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"assistant_id" integer
);
--> statement-breakpoint
CREATE TABLE "custom_roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"description" varchar(255),
	"account_id" bigint NOT NULL,
	"permissions" text[] DEFAULT '{}',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_import_mappings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"data_import_id" bigint NOT NULL,
	"source_provider" varchar(255) NOT NULL,
	"source_object_type" varchar(255) NOT NULL,
	"source_object_id" varchar(255) NOT NULL,
	"chatwoot_record_type" varchar(255) NOT NULL,
	"chatwoot_record_id" bigint NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_data_import_mappings_on_account_and_source" UNIQUE("account_id","source_provider","source_object_type","source_object_id")
);
--> statement-breakpoint
CREATE TABLE "integrations_hooks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" integer DEFAULT 1,
	"inbox_id" integer,
	"account_id" integer,
	"app_id" varchar(255),
	"hook_type" integer DEFAULT 0,
	"reference_id" varchar(255),
	"access_token" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "portals_members" (
	"portal_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	CONSTRAINT "index_portals_members_on_portal_id_and_user_id" UNIQUE("portal_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "related_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category_id" bigint,
	"related_category_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "index_related_categories_on_category_id_and_related_category_id" UNIQUE("category_id","related_category_id"),
	CONSTRAINT "index_related_categories_on_related_category_id_and_category_id" UNIQUE("related_category_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "platform_app_permissibles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"platform_app_id" bigint NOT NULL,
	"permissible_type" varchar(255) NOT NULL,
	"permissible_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "unique_permissibles_index" UNIQUE("platform_app_id","permissible_id","permissible_type")
);
--> statement-breakpoint
CREATE TABLE "agent_capacity_policies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"exclusion_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applied_slas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"sla_policy_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"sla_status" integer DEFAULT 0,
	"completed_at" timestamp,
	CONSTRAINT "index_applied_slas_on_account_sla_policy_conversation" UNIQUE("account_id","sla_policy_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "inbox_capacity_limits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent_capacity_policy_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"conversation_limit" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "idx_on_agent_capacity_policy_id_inbox_id_71c7ec4caf" UNIQUE("agent_capacity_policy_id","inbox_id")
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"leave_type" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"approved_by_id" bigint,
	"approved_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"applied_sla_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"sla_policy_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"event_type" integer,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"first_response_time_threshold" double precision,
	"next_response_time_threshold" double precision,
	"only_during_business_hours" boolean DEFAULT false,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"description" varchar(255),
	"resolution_time_threshold" double precision
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"taggings_count" integer DEFAULT 0,
	CONSTRAINT "index_tags_on_name" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audit_logs_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
CREATE INDEX "index_active_storage_attachments_on_blob_id" ON "active_storage_attachments" USING btree ("blob_id");--> statement-breakpoint
CREATE INDEX "index_account_saml_settings_on_account_id" ON "account_saml_settings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_user_sessions_on_user_id" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_calls_on_account_id_and_contact_id" ON "calls" USING btree ("account_id","contact_id");--> statement-breakpoint
CREATE INDEX "index_calls_on_account_id_and_conversation_id" ON "calls" USING btree ("account_id","conversation_id");--> statement-breakpoint
CREATE INDEX "index_calls_on_account_id_and_created_at" ON "calls" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "index_calls_on_message_id" ON "calls" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_account_id_and_campaign_id" ON "campaign_recipients" USING btree ("account_id","campaign_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_account_id" ON "campaign_recipients" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_campaign_id_and_status" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_campaign_id" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_contact_id" ON "campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_inbox_id" ON "campaign_recipients" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "idx_on_account_id_result_type_result_id_ca66c00cd7" ON "agent_sessions" USING btree ("account_id","result_type","result_id");--> statement-breakpoint
CREATE INDEX "idx_on_account_id_session_type_created_at_c20a14bd4e" ON "agent_sessions" USING btree ("account_id","session_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_on_account_id_subject_type_subject_id_6d60963b3d" ON "agent_sessions" USING btree ("account_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_account_id" ON "agent_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_assistant_id" ON "agent_sessions" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_user_id" ON "agent_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_captain_assistant_responses_on_account_id" ON "captain_assistant_responses" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_assistant_responses_on_assistant_id" ON "captain_assistant_responses" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "idx_cap_asst_resp_on_documentable" ON "captain_assistant_responses" USING btree ("documentable_id","documentable_type");--> statement-breakpoint
CREATE INDEX "index_captain_assistant_responses_on_status" ON "captain_assistant_responses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "index_captain_assistants_on_account_id" ON "captain_assistants" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_custom_tools_on_account_id" ON "captain_custom_tools" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_captain_documents_on_account_assistant_sync_stats" ON "captain_documents" USING btree ("account_id","assistant_id","sync_status","last_synced_at");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_account_id_and_sync_status" ON "captain_documents" USING btree ("account_id","sync_status");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_account_id" ON "captain_documents" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_assistant_id" ON "captain_documents" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_status" ON "captain_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "index_captain_faq_observations_on_account_id" ON "captain_faq_observations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_faq_observations_on_conversation_id" ON "captain_faq_observations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_captain_faq_observations_on_faq_suggestion_id" ON "captain_faq_observations" USING btree ("faq_suggestion_id");--> statement-breakpoint
CREATE INDEX "index_captain_faq_suggestions_on_account_id" ON "captain_faq_suggestions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_cap_faq_suggestions_on_account_assistant_status_language" ON "captain_faq_suggestions" USING btree ("account_id","assistant_id","status","language");--> statement-breakpoint
CREATE INDEX "index_captain_faq_suggestions_on_assistant_id" ON "captain_faq_suggestions" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_captain_inboxes_on_captain_assistant_id" ON "captain_inboxes" USING btree ("captain_assistant_id");--> statement-breakpoint
CREATE INDEX "index_captain_inboxes_on_inbox_id" ON "captain_inboxes" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_captain_message_reports_on_account_id" ON "captain_message_reports" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_message_reports_on_conversation_id" ON "captain_message_reports" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_captain_message_reports_on_message_id" ON "captain_message_reports" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "index_captain_message_reports_on_user_id" ON "captain_message_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_captain_scenarios_on_account_id" ON "captain_scenarios" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_scenarios_on_assistant_id_and_enabled" ON "captain_scenarios" USING btree ("assistant_id","enabled");--> statement-breakpoint
CREATE INDEX "index_captain_scenarios_on_assistant_id" ON "captain_scenarios" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_captain_scenarios_on_enabled" ON "captain_scenarios" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_conversation_outcomes_on_assistant_handoff_at" ON "conversation_outcomes" USING btree ("account_id","assistant_id","handoff_at");--> statement-breakpoint
CREATE INDEX "idx_conversation_outcomes_on_assistant_resolved_at" ON "conversation_outcomes" USING btree ("account_id","assistant_id","resolved_at");--> statement-breakpoint
CREATE INDEX "idx_conversation_outcomes_on_assistant_started_at" ON "conversation_outcomes" USING btree ("account_id","assistant_id","started_at");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_account_id" ON "conversation_outcomes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_assistant_id" ON "conversation_outcomes" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_conversation_id" ON "conversation_outcomes" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_inbox_id" ON "conversation_outcomes" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_copilot_messages_on_account_id" ON "copilot_messages" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_copilot_messages_on_copilot_thread_id" ON "copilot_messages" USING btree ("copilot_thread_id");--> statement-breakpoint
CREATE INDEX "index_copilot_threads_on_account_id" ON "copilot_threads" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_copilot_threads_on_assistant_id" ON "copilot_threads" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_copilot_threads_on_user_id" ON "copilot_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_custom_roles_on_account_id" ON "custom_roles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_data_import_mappings_on_record" ON "data_import_mappings" USING btree ("chatwoot_record_type","chatwoot_record_id");--> statement-breakpoint
CREATE INDEX "index_data_import_mappings_on_data_import_id" ON "data_import_mappings" USING btree ("data_import_id");--> statement-breakpoint
CREATE INDEX "index_portals_members_on_portal_id" ON "portals_members" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "index_portals_members_on_user_id" ON "portals_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_platform_app_permissibles_on_permissibles" ON "platform_app_permissibles" USING btree ("permissible_type","permissible_id");--> statement-breakpoint
CREATE INDEX "index_platform_app_permissibles_on_platform_app_id" ON "platform_app_permissibles" USING btree ("platform_app_id");--> statement-breakpoint
CREATE INDEX "index_agent_capacity_policies_on_account_id" ON "agent_capacity_policies" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_applied_slas_on_account_id" ON "applied_slas" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_applied_slas_on_conversation_id" ON "applied_slas" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_applied_slas_on_sla_policy_id" ON "applied_slas" USING btree ("sla_policy_id");--> statement-breakpoint
CREATE INDEX "index_inbox_capacity_limits_on_agent_capacity_policy_id" ON "inbox_capacity_limits" USING btree ("agent_capacity_policy_id");--> statement-breakpoint
CREATE INDEX "index_inbox_capacity_limits_on_inbox_id" ON "inbox_capacity_limits" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_leaves_on_account_id_and_status" ON "leaves" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "index_leaves_on_account_id" ON "leaves" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_leaves_on_approved_by_id" ON "leaves" USING btree ("approved_by_id");--> statement-breakpoint
CREATE INDEX "index_leaves_on_user_id" ON "leaves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_sla_events_on_account_id" ON "sla_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_sla_events_on_applied_sla_id" ON "sla_events" USING btree ("applied_sla_id");--> statement-breakpoint
CREATE INDEX "index_sla_events_on_conversation_id" ON "sla_events" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_sla_events_on_inbox_id" ON "sla_events" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_sla_events_on_sla_policy_id" ON "sla_events" USING btree ("sla_policy_id");--> statement-breakpoint
CREATE INDEX "index_sla_policies_on_account_id" ON "sla_policies" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;