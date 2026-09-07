CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE TABLE "action_mailbox_inbound_emails" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"message_checksum" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "active_storage_attachments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"record_type" varchar(255) NOT NULL,
	"record_id" bigint NOT NULL,
	"blob_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL
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
	"service_name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "active_storage_variant_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"blob_id" bigint NOT NULL,
	"variation_digest" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"owner_type" varchar(255),
	"owner_id" bigint,
	"token" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
CREATE TABLE "account_users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint,
	"user_id" bigint,
	"role" integer DEFAULT 0,
	"inviter_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"active_at" timestamp,
	"availability" integer DEFAULT 0 NOT NULL,
	"auto_offline" boolean DEFAULT true NOT NULL,
	"custom_role_id" bigint,
	"agent_capacity_policy_id" bigint
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"locale" integer DEFAULT 0,
	"domain" varchar(100),
	"support_email" varchar(100),
	"feature_flags" bigint DEFAULT 0 NOT NULL,
	"auto_resolve_duration" integer,
	"limits" jsonb DEFAULT '{}'::jsonb,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb,
	"status" integer DEFAULT 0,
	"internal_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"feature_flags_ext_1" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installation_configs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"serialized_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"locked" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
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
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(255) DEFAULT 'email' NOT NULL,
	"uid" varchar(255) DEFAULT '' NOT NULL,
	"encrypted_password" varchar(255) DEFAULT '' NOT NULL,
	"reset_password_token" varchar(255),
	"reset_password_sent_at" timestamp,
	"remember_created_at" timestamp,
	"sign_in_count" integer DEFAULT 0 NOT NULL,
	"current_sign_in_at" timestamp,
	"last_sign_in_at" timestamp,
	"current_sign_in_ip" varchar(255),
	"last_sign_in_ip" varchar(255),
	"confirmation_token" varchar(255),
	"confirmed_at" timestamp,
	"confirmation_sent_at" timestamp,
	"unconfirmed_email" varchar(255),
	"name" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"email" varchar(255),
	"tokens" json,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"pubsub_token" varchar(255),
	"availability" integer DEFAULT 0,
	"ui_settings" jsonb DEFAULT '{}'::jsonb,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb,
	"type" varchar(255),
	"message_signature" text,
	"otp_secret" varchar(255),
	"consumed_timestep" integer,
	"otp_required_for_login" boolean DEFAULT false,
	"otp_backup_codes" text
);
--> statement-breakpoint
CREATE TABLE "automation_rule_pending_executions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"automation_rule_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"message_id" bigint,
	"due_at" timestamp NOT NULL,
	"episode_key" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"skip_reason" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"event_name" varchar(255) NOT NULL,
	"conditions" jsonb DEFAULT '{}' NOT NULL,
	"actions" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"execution_delay" integer
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
	"updated_at" timestamp NOT NULL
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
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"display_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"message" text NOT NULL,
	"sender_id" integer,
	"enabled" boolean DEFAULT true,
	"account_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"trigger_rules" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"campaign_type" integer DEFAULT 0 NOT NULL,
	"campaign_status" integer DEFAULT 0 NOT NULL,
	"audience" jsonb DEFAULT '[]'::jsonb,
	"scheduled_at" timestamp,
	"trigger_only_during_business_hours" boolean DEFAULT false,
	"template_params" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "canned_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"short_code" varchar(255),
	"content" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
	"updated_at" timestamp NOT NULL
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
	"updated_at" timestamp NOT NULL
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
	"updated_at" timestamp NOT NULL
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
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "channel_api" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"webhook_url" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"identifier" varchar(255),
	"hmac_token" varchar(255),
	"hmac_mandatory" boolean DEFAULT false,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb,
	"secret" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "channel_email" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"forward_to_email" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"imap_enabled" boolean DEFAULT false,
	"imap_address" varchar(255) DEFAULT '',
	"imap_port" integer DEFAULT 0,
	"imap_login" varchar(255) DEFAULT '',
	"imap_password" varchar(255) DEFAULT '',
	"imap_enable_ssl" boolean DEFAULT true,
	"smtp_enabled" boolean DEFAULT false,
	"smtp_address" varchar(255) DEFAULT '',
	"smtp_port" integer DEFAULT 0,
	"smtp_login" varchar(255) DEFAULT '',
	"smtp_password" varchar(255) DEFAULT '',
	"smtp_domain" varchar(255) DEFAULT '',
	"smtp_enable_starttls_auto" boolean DEFAULT true,
	"smtp_authentication" varchar(255) DEFAULT 'login',
	"smtp_openssl_verify_mode" varchar(255) DEFAULT 'none',
	"smtp_enable_ssl_tls" boolean DEFAULT false,
	"provider_config" jsonb DEFAULT '{}'::jsonb,
	"provider" varchar(255),
	"imap_authentication" varchar(255) DEFAULT 'plain',
	"verified_for_sending" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_facebook_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" varchar(255) NOT NULL,
	"user_access_token" varchar(255) NOT NULL,
	"page_access_token" varchar(255) NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"instagram_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "channel_instagram" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"account_id" integer NOT NULL,
	"instagram_id" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_line" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"line_channel_id" varchar(255) NOT NULL,
	"line_channel_secret" varchar(255) NOT NULL,
	"line_channel_token" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_sms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"provider" varchar(255) DEFAULT 'default',
	"provider_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_telegram" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bot_name" varchar(255),
	"account_id" integer NOT NULL,
	"bot_token" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
	"updated_at" timestamp NOT NULL
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
	"provider_config" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "channel_twitter_profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" varchar(255) NOT NULL,
	"twitter_access_token" varchar(255) NOT NULL,
	"twitter_access_token_secret" varchar(255) NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"tweets_enabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "channel_web_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_url" varchar(255),
	"account_id" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"website_token" varchar(255),
	"widget_color" varchar(255) DEFAULT '#1f93ff',
	"welcome_title" varchar(255),
	"welcome_tagline" varchar(255),
	"feature_flags" integer DEFAULT 7 NOT NULL,
	"reply_time" integer DEFAULT 0,
	"hmac_token" varchar(255),
	"pre_chat_form_enabled" boolean DEFAULT false,
	"pre_chat_form_options" jsonb DEFAULT '{}'::jsonb,
	"hmac_mandatory" boolean DEFAULT false,
	"continuity_via_email" boolean DEFAULT true NOT NULL,
	"allowed_domains" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "channel_whatsapp" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"business_management_token" text,
	"phone_number" varchar(255) NOT NULL,
	"provider" varchar(255) DEFAULT 'default',
	"provider_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"message_templates" jsonb DEFAULT '{}'::jsonb,
	"message_templates_last_updated" timestamp,
	"phone_number_health" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phone_number_health_checked_at" timestamp,
	"phone_number_health_error" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"description" text,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"contacts_count" integer,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb,
	"last_activity_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contact_inboxes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"contact_id" bigint,
	"inbox_id" bigint,
	"source_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"hmac_verified" boolean DEFAULT false,
	"pubsub_token" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) DEFAULT '',
	"email" varchar(255),
	"phone_number" varchar(255),
	"account_id" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb,
	"identifier" varchar(255),
	"custom_attributes" jsonb DEFAULT '{}'::jsonb,
	"last_activity_at" timestamp,
	"contact_type" integer DEFAULT 0,
	"middle_name" varchar(255) DEFAULT '',
	"last_name" varchar(255) DEFAULT '',
	"location" varchar(255) DEFAULT '',
	"country_code" varchar(255) DEFAULT '',
	"blocked" boolean DEFAULT false NOT NULL,
	"company_id" bigint
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"account_id" bigint NOT NULL,
	"contact_id" bigint NOT NULL,
	"user_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"assignee_id" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"contact_id" bigint,
	"display_id" integer NOT NULL,
	"contact_last_seen_at" timestamp,
	"agent_last_seen_at" timestamp,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb,
	"contact_inbox_id" bigint,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255),
	"last_activity_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"team_id" bigint,
	"campaign_id" bigint,
	"snoozed_until" timestamp,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb,
	"assignee_last_seen_at" timestamp,
	"first_reply_created_at" timestamp,
	"priority" integer,
	"sla_policy_id" bigint,
	"waiting_since" timestamp,
	"cached_label_list" text,
	"assignee_agent_bot_id" bigint,
	"ai_assignee_type" varchar(255),
	"status_changed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"mentioned_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
CREATE TABLE "data_import_errors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"data_import_id" bigint NOT NULL,
	"data_import_item_id" bigint,
	"source_object_type" varchar(255),
	"source_object_id" varchar(255),
	"error_code" varchar(255) NOT NULL,
	"message" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_import_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"data_import_id" bigint NOT NULL,
	"source_provider" varchar(255) NOT NULL,
	"source_object_type" varchar(255) NOT NULL,
	"source_object_id" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"chatwoot_record_type" varchar(255),
	"chatwoot_record_id" bigint,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" varchar(255),
	"last_error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
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
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_imports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"data_type" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"processing_errors" text,
	"total_records" integer,
	"processed_records" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" varchar(255),
	"source_type" varchar(255),
	"source_provider" varchar(255),
	"import_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"initiated_by_id" integer,
	"access_token" text,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"abandoned_at" timestamp,
	"last_error_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assignment_policies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"assignment_order" integer DEFAULT 0 NOT NULL,
	"conversation_priority" integer DEFAULT 0 NOT NULL,
	"fair_distribution_limit" integer DEFAULT 100 NOT NULL,
	"fair_distribution_window" integer DEFAULT 3600 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"exclude_older_than_hours" integer DEFAULT 168
);
--> statement-breakpoint
CREATE TABLE "dashboard_apps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" jsonb DEFAULT '[]'::jsonb,
	"account_id" bigint NOT NULL,
	"user_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_assignment_policies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"inbox_id" bigint NOT NULL,
	"assignment_policy_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"inbox_id" bigint,
	"account_id" bigint,
	"day_of_week" integer NOT NULL,
	"closed_all_day" boolean DEFAULT false,
	"open_hour" integer,
	"open_minutes" integer,
	"close_hour" integer,
	"close_minutes" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"open_all_day" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "inboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"channel_type" varchar(255),
	"enable_auto_assignment" boolean DEFAULT true,
	"greeting_enabled" boolean DEFAULT false,
	"greeting_message" varchar(255),
	"email_address" varchar(255),
	"working_hours_enabled" boolean DEFAULT false,
	"out_of_office_message" varchar(255),
	"timezone" varchar(255) DEFAULT 'UTC',
	"enable_email_collect" boolean DEFAULT true,
	"csat_survey_enabled" boolean DEFAULT false,
	"allow_messages_after_resolved" boolean DEFAULT true,
	"auto_assignment_config" jsonb DEFAULT '{}'::jsonb,
	"lock_to_single_conversation" boolean DEFAULT false NOT NULL,
	"portal_id" bigint,
	"sender_name_type" integer DEFAULT 0 NOT NULL,
	"business_name" varchar(255),
	"csat_config" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_attribute_definitions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attribute_display_name" varchar(255),
	"attribute_key" varchar(255),
	"attribute_display_type" integer DEFAULT 0,
	"default_value" integer,
	"attribute_model" integer DEFAULT 0,
	"account_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"attribute_description" text,
	"attribute_values" jsonb DEFAULT '[]'::jsonb,
	"regex_pattern" varchar(255),
	"regex_cue" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" text,
	"color" varchar(255) DEFAULT '#1f93ff' NOT NULL,
	"show_on_sidebar" boolean,
	"account_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taggings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag_id" integer,
	"taggable_type" varchar(255),
	"taggable_id" integer,
	"tagger_type" varchar(255),
	"tagger_id" integer,
	"context" varchar(128),
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"team_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"allow_auto_assign" boolean DEFAULT true,
	"account_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"icon" varchar(255) DEFAULT '',
	"icon_color" varchar(255) DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "macros" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"visibility" integer DEFAULT 0,
	"created_by_id" bigint,
	"updated_by_id" bigint,
	"actions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
CREATE TABLE "webhooks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"inbox_id" integer,
	"url" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"webhook_type" integer DEFAULT 0,
	"subscriptions" jsonb DEFAULT '["conversation_status_changed","conversation_updated","conversation_created","contact_created","contact_updated","message_created","message_updated","webwidget_triggered"]'::jsonb,
	"name" varchar(255),
	"secret" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "reporting_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"value" double precision,
	"account_id" integer,
	"inbox_id" integer,
	"user_id" integer,
	"conversation_id" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"value_in_business_hours" double precision,
	"event_start_time" timestamp,
	"event_end_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "reporting_events_rollups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"date" date NOT NULL,
	"dimension_type" varchar(255) NOT NULL,
	"dimension_id" bigint NOT NULL,
	"metric" varchar(255) NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	"sum_value" double precision DEFAULT 0 NOT NULL,
	"sum_value_business_hours" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"portal_id" integer NOT NULL,
	"category_id" integer,
	"folder_id" integer,
	"title" varchar(255),
	"description" text,
	"content" text,
	"status" integer,
	"views" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"author_id" bigint,
	"associated_article_id" bigint,
	"meta" jsonb DEFAULT '{}'::jsonb,
	"slug" varchar(255) NOT NULL,
	"position" integer,
	"locale" varchar(255) DEFAULT 'en' NOT NULL,
	"draft_title" varchar(255),
	"draft_content" text
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"portal_id" integer NOT NULL,
	"name" varchar(255),
	"description" text,
	"position" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"locale" varchar(255) DEFAULT 'en',
	"slug" varchar(255) NOT NULL,
	"parent_category_id" bigint,
	"associated_category_id" bigint,
	"icon" varchar(255) DEFAULT '',
	"icon_color" varchar(255) DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"custom_domain" varchar(255),
	"color" varchar(255),
	"homepage_link" varchar(255),
	"page_title" varchar(255),
	"header_text" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"config" jsonb DEFAULT '{"allowed_locales":["en"]}'::jsonb,
	"archived" boolean DEFAULT false,
	"channel_web_widget_id" bigint,
	"ssl_settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portals_members" (
	"portal_id" bigint NOT NULL,
	"user_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category_id" bigint,
	"related_category_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_type" integer DEFAULT 0,
	"external_url" varchar(255),
	"coordinates_lat" double precision DEFAULT 0,
	"coordinates_long" double precision DEFAULT 0,
	"message_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"fallback_title" varchar(255),
	"extension" varchar(255),
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "csat_survey_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"conversation_id" bigint NOT NULL,
	"message_id" bigint NOT NULL,
	"rating" integer NOT NULL,
	"feedback_message" text,
	"contact_id" bigint NOT NULL,
	"assigned_agent_id" bigint,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"csat_review_notes" text,
	"review_notes_updated_at" timestamp,
	"review_notes_updated_by_id" bigint
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text,
	"account_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"message_type" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"status" integer DEFAULT 0,
	"source_id" text,
	"content_type" integer DEFAULT 0 NOT NULL,
	"content_attributes" json DEFAULT '{}'::json,
	"sender_type" varchar(255),
	"sender_id" bigint,
	"external_source_ids" jsonb DEFAULT '{}'::jsonb,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb,
	"processed_message_content" text,
	"sentiment" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "custom_filters" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"filter_type" integer DEFAULT 0 NOT NULL,
	"query" jsonb DEFAULT '{}' NOT NULL,
	"account_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"user_id" integer,
	"email_flags" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"push_flags" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"subscription_type" integer NOT NULL,
	"subscription_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"identifier" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"notification_type" integer NOT NULL,
	"primary_actor_type" varchar(255) NOT NULL,
	"primary_actor_id" bigint NOT NULL,
	"secondary_actor_type" varchar(255),
	"secondary_actor_id" bigint,
	"read_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"snoozed_until" timestamp,
	"last_activity_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_bot_inboxes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"inbox_id" integer,
	"agent_bot_id" integer,
	"status" integer DEFAULT 0,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"account_id" integer
);
--> statement-breakpoint
CREATE TABLE "agent_bots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"description" varchar(255),
	"outgoing_url" varchar(255),
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"account_id" bigint,
	"bot_type" integer DEFAULT 0,
	"bot_config" jsonb DEFAULT '{}'::jsonb,
	"secret" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auditable_id" bigint,
	"auditable_type" varchar(255),
	"associated_id" bigint,
	"associated_type" varchar(255),
	"user_id" bigint,
	"user_type" varchar(255),
	"username" varchar(255),
	"action" varchar(255),
	"audited_changes" jsonb,
	"version" integer DEFAULT 0,
	"comment" varchar(255),
	"remote_address" varchar(255),
	"request_uuid" varchar(255),
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"account_id" integer,
	"template_type" integer DEFAULT 1,
	"locale" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"inbox_id" integer
);
--> statement-breakpoint
CREATE TABLE "platform_app_permissibles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"platform_app_id" bigint NOT NULL,
	"permissible_type" varchar(255) NOT NULL,
	"permissible_id" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_apps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_banners" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"banner_message" text NOT NULL,
	"banner_type" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inbox_capacity_limits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agent_capacity_policy_id" bigint NOT NULL,
	"inbox_id" bigint NOT NULL,
	"conversation_limit" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
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
	"taggings_count" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "active_storage_attachments" ADD CONSTRAINT "active_storage_attachments_blob_id_active_storage_blobs_id_fk" FOREIGN KEY ("blob_id") REFERENCES "public"."active_storage_blobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_storage_variant_records" ADD CONSTRAINT "active_storage_variant_records_blob_id_active_storage_blobs_id_fk" FOREIGN KEY ("blob_id") REFERENCES "public"."active_storage_blobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "index_action_mailbox_inbound_emails_uniqueness" ON "action_mailbox_inbound_emails" USING btree ("message_id","message_checksum");--> statement-breakpoint
CREATE INDEX "index_active_storage_attachments_on_blob_id" ON "active_storage_attachments" USING btree ("blob_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_active_storage_attachments_uniqueness" ON "active_storage_attachments" USING btree ("record_type","record_id","name","blob_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_active_storage_blobs_on_key" ON "active_storage_blobs" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "index_active_storage_variant_records_uniqueness" ON "active_storage_variant_records" USING btree ("blob_id","variation_digest");--> statement-breakpoint
CREATE INDEX "index_access_tokens_on_owner_type_and_owner_id" ON "access_tokens" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_access_tokens_on_token" ON "access_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "index_account_saml_settings_on_account_id" ON "account_saml_settings" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_id_per_account_id" ON "account_users" USING btree ("account_id","user_id");--> statement-breakpoint
CREATE INDEX "index_account_users_on_account_id" ON "account_users" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_account_users_on_agent_capacity_policy_id" ON "account_users" USING btree ("agent_capacity_policy_id");--> statement-breakpoint
CREATE INDEX "index_account_users_on_custom_role_id" ON "account_users" USING btree ("custom_role_id");--> statement-breakpoint
CREATE INDEX "index_account_users_on_user_id" ON "account_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_accounts_on_status" ON "accounts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "index_installation_configs_on_name_and_created_at" ON "installation_configs" USING btree ("name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "index_installation_configs_on_name" ON "installation_configs" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "index_user_sessions_on_user_id_and_client_id" ON "user_sessions" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "index_user_sessions_on_user_id" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_users_on_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "index_users_on_otp_required_for_login" ON "users" USING btree ("otp_required_for_login");--> statement-breakpoint
CREATE UNIQUE INDEX "index_users_on_otp_secret" ON "users" USING btree ("otp_secret");--> statement-breakpoint
CREATE UNIQUE INDEX "index_users_on_pubsub_token" ON "users" USING btree ("pubsub_token");--> statement-breakpoint
CREATE UNIQUE INDEX "index_users_on_reset_password_token" ON "users" USING btree ("reset_password_token");--> statement-breakpoint
CREATE UNIQUE INDEX "index_users_on_uid_and_provider" ON "users" USING btree ("uid","provider");--> statement-breakpoint
CREATE INDEX "index_automation_rule_pending_executions_on_account_id" ON "automation_rule_pending_executions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_automation_pending_execution_episode" ON "automation_rule_pending_executions" USING btree ("automation_rule_id","conversation_id","episode_key");--> statement-breakpoint
CREATE INDEX "index_automation_rule_pending_executions_on_automation_rule_id" ON "automation_rule_pending_executions" USING btree ("automation_rule_id");--> statement-breakpoint
CREATE INDEX "index_automation_rule_pending_executions_on_conversation_id" ON "automation_rule_pending_executions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_automation_rule_pending_executions_on_status_and_due_at" ON "automation_rule_pending_executions" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "index_automation_pending_executions_on_status_and_updated_at" ON "automation_rule_pending_executions" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "index_automation_rules_on_account_id" ON "automation_rules" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_calls_on_account_id_and_contact_id" ON "calls" USING btree ("account_id","contact_id");--> statement-breakpoint
CREATE INDEX "index_calls_on_account_id_and_conversation_id" ON "calls" USING btree ("account_id","conversation_id");--> statement-breakpoint
CREATE INDEX "index_calls_on_account_id_and_created_at" ON "calls" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "index_calls_on_message_id" ON "calls" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_calls_on_provider_and_provider_call_id" ON "calls" USING btree ("provider","provider_call_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_account_id_and_campaign_id" ON "campaign_recipients" USING btree ("account_id","campaign_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_account_id" ON "campaign_recipients" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_campaign_recipients_on_campaign_id_and_contact_id" ON "campaign_recipients" USING btree ("campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_campaign_id_and_status" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_campaign_id" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_contact_id" ON "campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_campaign_recipients_on_inbox_id" ON "campaign_recipients" USING btree ("inbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_campaign_recipients_on_source_id" ON "campaign_recipients" USING btree ("source_id") WHERE (source_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "index_campaigns_on_account_id" ON "campaigns" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_campaign_status" ON "campaigns" USING btree ("campaign_status");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_campaign_type" ON "campaigns" USING btree ("campaign_type");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_inbox_id" ON "campaigns" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_scheduled_at" ON "campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_on_account_id_result_type_result_id_ca66c00cd7" ON "agent_sessions" USING btree ("account_id","result_type","result_id");--> statement-breakpoint
CREATE INDEX "idx_on_account_id_session_type_created_at_c20a14bd4e" ON "agent_sessions" USING btree ("account_id","session_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_on_account_id_subject_type_subject_id_6d60963b3d" ON "agent_sessions" USING btree ("account_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_account_id" ON "agent_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_assistant_id" ON "agent_sessions" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_cited_document_ids" ON "agent_sessions" USING gin ("cited_document_ids");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_document_ids" ON "agent_sessions" USING gin ("document_ids");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_used_faq_ids" ON "agent_sessions" USING gin ("used_faq_ids");--> statement-breakpoint
CREATE INDEX "index_agent_sessions_on_user_id" ON "agent_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_article_embeddings_on_embedding" ON "article_embeddings" USING ivfflat ("embedding" vector_l2_ops);--> statement-breakpoint
CREATE INDEX "index_captain_assistant_responses_on_account_id" ON "captain_assistant_responses" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_assistant_responses_on_assistant_id" ON "captain_assistant_responses" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "idx_cap_asst_resp_on_documentable" ON "captain_assistant_responses" USING btree ("documentable_id","documentable_type");--> statement-breakpoint
CREATE INDEX "vector_idx_knowledge_entries_embedding" ON "captain_assistant_responses" USING ivfflat ("embedding" vector_l2_ops);--> statement-breakpoint
CREATE INDEX "index_captain_assistant_responses_on_status" ON "captain_assistant_responses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "index_captain_assistants_on_account_id" ON "captain_assistants" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_captain_custom_tools_on_account_id_and_slug" ON "captain_custom_tools" USING btree ("account_id","slug");--> statement-breakpoint
CREATE INDEX "index_captain_custom_tools_on_account_id" ON "captain_custom_tools" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_captain_documents_on_assistant_id_and_external_link_md5" ON "captain_documents" USING btree (assistant_id, md5(external_link));--> statement-breakpoint
CREATE INDEX "idx_captain_documents_on_account_assistant_sync_stats" ON "captain_documents" USING btree ("account_id","assistant_id","sync_status","last_synced_at");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_account_id_and_sync_status" ON "captain_documents" USING btree ("account_id","sync_status");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_account_id" ON "captain_documents" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_assistant_id" ON "captain_documents" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_captain_documents_on_status" ON "captain_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "index_captain_faq_observations_on_account_id" ON "captain_faq_observations" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_captain_faq_observations_on_conversation_and_suggestion" ON "captain_faq_observations" USING btree ("conversation_id","faq_suggestion_id") WHERE (faq_suggestion_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "index_captain_faq_observations_on_conversation_id" ON "captain_faq_observations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_captain_faq_observations_on_faq_suggestion_id" ON "captain_faq_observations" USING btree ("faq_suggestion_id");--> statement-breakpoint
CREATE INDEX "index_captain_faq_suggestions_on_account_id" ON "captain_faq_suggestions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_cap_faq_suggestions_on_account_assistant_status_language" ON "captain_faq_suggestions" USING btree ("account_id","assistant_id","status","language");--> statement-breakpoint
CREATE INDEX "index_captain_faq_suggestions_on_assistant_id" ON "captain_faq_suggestions" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "vector_idx_captain_faq_suggestions_embedding" ON "captain_faq_suggestions" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "index_captain_inboxes_on_captain_assistant_id_and_inbox_id" ON "captain_inboxes" USING btree ("captain_assistant_id","inbox_id");--> statement-breakpoint
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
CREATE UNIQUE INDEX "idx_conversation_outcomes_unique_boundary" ON "conversation_outcomes" USING btree ("account_id","conversation_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_conversation_outcomes_initial_episode" ON "conversation_outcomes" USING btree ("account_id","conversation_id") WHERE ((episode_trigger)::text = 'initial'::text);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_conversation_outcomes_open_episode" ON "conversation_outcomes" USING btree ("account_id","conversation_id") WHERE (ended_at IS NULL);--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_account_id" ON "conversation_outcomes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_assistant_id" ON "conversation_outcomes" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_conversation_id" ON "conversation_outcomes" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_conversation_outcomes_on_inbox_id" ON "conversation_outcomes" USING btree ("inbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_api_on_hmac_token" ON "channel_api" USING btree ("hmac_token");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_api_on_identifier" ON "channel_api" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_email_on_email" ON "channel_email" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_email_on_forward_to_email" ON "channel_email" USING btree ("forward_to_email");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_facebook_pages_on_page_id_and_account_id" ON "channel_facebook_pages" USING btree ("page_id","account_id");--> statement-breakpoint
CREATE INDEX "index_channel_facebook_pages_on_page_id" ON "channel_facebook_pages" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_instagram_on_instagram_id" ON "channel_instagram" USING btree ("instagram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_line_on_line_channel_id" ON "channel_line" USING btree ("line_channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_sms_on_phone_number" ON "channel_sms" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_telegram_on_bot_token" ON "channel_telegram" USING btree ("bot_token");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_tiktok_on_business_id" ON "channel_tiktok" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_twilio_sms_on_account_sid_and_phone_number" ON "channel_twilio_sms" USING btree ("account_sid","phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_twilio_sms_on_messaging_service_sid" ON "channel_twilio_sms" USING btree ("messaging_service_sid");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_twilio_sms_on_phone_number" ON "channel_twilio_sms" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_twitter_profiles_on_account_id_and_profile_id" ON "channel_twitter_profiles" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_web_widgets_on_hmac_token" ON "channel_web_widgets" USING btree ("hmac_token");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_web_widgets_on_website_token" ON "channel_web_widgets" USING btree ("website_token");--> statement-breakpoint
CREATE INDEX "index_channel_whatsapp_on_phone_number_health_checked_at" ON "channel_whatsapp" USING btree ("phone_number_health_checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "index_channel_whatsapp_on_phone_number" ON "channel_whatsapp" USING btree ("phone_number");--> statement-breakpoint
CREATE UNIQUE INDEX "index_companies_on_account_and_domain" ON "companies" USING btree ("account_id","domain") WHERE (domain IS NOT NULL);--> statement-breakpoint
CREATE INDEX "index_companies_on_account_id" ON "companies" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_companies_on_name_and_account_id" ON "companies" USING btree ("name","account_id");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_contact_id" ON "contact_inboxes" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_contact_inboxes_on_inbox_id_and_source_id" ON "contact_inboxes" USING btree ("inbox_id","source_id");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_inbox_id" ON "contact_inboxes" USING btree ("inbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_contact_inboxes_on_pubsub_token" ON "contact_inboxes" USING btree ("pubsub_token");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_source_id" ON "contact_inboxes" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "index_contacts_on_lower_email_account_id" ON "contacts" USING btree (lower((email)::text), account_id);--> statement-breakpoint
CREATE INDEX "index_contacts_on_account_id_and_contact_type" ON "contacts" USING btree ("account_id","contact_type");--> statement-breakpoint
CREATE INDEX "index_contacts_on_nonempty_fields" ON "contacts" USING btree ("account_id","email","phone_number","identifier") WHERE (((email)::text <> ''::text) OR ((phone_number)::text <> ''::text) OR ((identifier)::text <> ''::text));--> statement-breakpoint
CREATE INDEX "index_contacts_on_account_id_and_last_activity_at" ON "contacts" USING btree ("account_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "index_contacts_on_account_id" ON "contacts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_resolved_contact_account_id" ON "contacts" USING btree ("account_id") WHERE (((email)::text <> ''::text) OR ((phone_number)::text <> ''::text) OR ((identifier)::text <> ''::text));--> statement-breakpoint
CREATE INDEX "index_contacts_on_blocked" ON "contacts" USING btree ("blocked");--> statement-breakpoint
CREATE INDEX "index_contacts_on_company_id" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_email_per_account_contact" ON "contacts" USING btree ("email","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identifier_per_account_contact" ON "contacts" USING btree ("identifier","account_id");--> statement-breakpoint
CREATE INDEX "index_contacts_on_name_email_phone_number_identifier" ON "contacts" USING gin ("name" gin_trgm_ops,"email" gin_trgm_ops,"phone_number" gin_trgm_ops,"identifier" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "index_contacts_on_phone_number_and_account_id" ON "contacts" USING btree ("phone_number","account_id");--> statement-breakpoint
CREATE INDEX "index_notes_on_account_id" ON "notes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_notes_on_contact_id" ON "notes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_notes_on_user_id" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_conversation_participants_on_account_id" ON "conversation_participants" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_conversation_participants_on_conversation_id" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_conversation_participants_on_user_id_and_conversation_id" ON "conversation_participants" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE INDEX "index_conversation_participants_on_user_id" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_conversations_on_account_id_and_display_id" ON "conversations" USING btree ("account_id","display_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_id_and_account_id" ON "conversations" USING btree ("account_id","id");--> statement-breakpoint
CREATE INDEX "conv_acid_inbid_stat_asgnid_idx" ON "conversations" USING btree ("account_id","inbox_id","status","assignee_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_account_id_status_created_at" ON "conversations" USING btree ("account_id","status","created_at");--> statement-breakpoint
CREATE INDEX "index_conversations_on_account_id" ON "conversations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_assignee_id_and_account_id" ON "conversations" USING btree ("assignee_id","account_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_campaign_id" ON "conversations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_contact_id" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_contact_inbox_id" ON "conversations" USING btree ("contact_inbox_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_created_at" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "index_conversations_on_first_reply_created_at" ON "conversations" USING btree ("first_reply_created_at");--> statement-breakpoint
CREATE INDEX "index_conversations_on_identifier_and_account_id" ON "conversations" USING btree ("identifier","account_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_inbox_id" ON "conversations" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_priority" ON "conversations" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "index_conversations_on_status_and_account_id" ON "conversations" USING btree ("status","account_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_status_and_priority" ON "conversations" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "index_conversations_on_team_id" ON "conversations" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_conversations_on_uuid" ON "conversations" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX "index_conversations_on_waiting_since" ON "conversations" USING btree ("waiting_since");--> statement-breakpoint
CREATE INDEX "index_mentions_on_account_id" ON "mentions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_mentions_on_conversation_id" ON "mentions" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_mentions_on_user_id_and_conversation_id" ON "mentions" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE INDEX "index_mentions_on_user_id" ON "mentions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_copilot_messages_on_account_id" ON "copilot_messages" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_copilot_messages_on_copilot_thread_id" ON "copilot_messages" USING btree ("copilot_thread_id");--> statement-breakpoint
CREATE INDEX "index_copilot_threads_on_account_id" ON "copilot_threads" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_copilot_threads_on_assistant_id" ON "copilot_threads" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "index_copilot_threads_on_user_id" ON "copilot_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_custom_roles_on_account_id" ON "custom_roles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_data_import_errors_on_data_import_id" ON "data_import_errors" USING btree ("data_import_id");--> statement-breakpoint
CREATE INDEX "index_data_import_errors_on_data_import_item_id" ON "data_import_errors" USING btree ("data_import_item_id");--> statement-breakpoint
CREATE INDEX "idx_data_import_errors_on_source" ON "data_import_errors" USING btree ("source_object_type","source_object_id");--> statement-breakpoint
CREATE INDEX "idx_data_import_items_on_record" ON "data_import_items" USING btree ("chatwoot_record_type","chatwoot_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_data_import_items_on_import_and_source" ON "data_import_items" USING btree ("data_import_id","source_object_type","source_object_id");--> statement-breakpoint
CREATE INDEX "index_data_import_items_on_data_import_id" ON "data_import_items" USING btree ("data_import_id");--> statement-breakpoint
CREATE INDEX "idx_data_import_items_on_source" ON "data_import_items" USING btree ("source_provider","source_object_type","source_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_data_import_mappings_on_account_and_source" ON "data_import_mappings" USING btree ("account_id","source_provider","source_object_type","source_object_id");--> statement-breakpoint
CREATE INDEX "idx_data_import_mappings_on_record" ON "data_import_mappings" USING btree ("chatwoot_record_type","chatwoot_record_id");--> statement-breakpoint
CREATE INDEX "index_data_import_mappings_on_data_import_id" ON "data_import_mappings" USING btree ("data_import_id");--> statement-breakpoint
CREATE INDEX "index_data_imports_on_account_id" ON "data_imports" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_data_imports_on_initiated_by_id" ON "data_imports" USING btree ("initiated_by_id");--> statement-breakpoint
CREATE INDEX "index_data_imports_on_source_provider" ON "data_imports" USING btree ("source_provider");--> statement-breakpoint
CREATE UNIQUE INDEX "index_assignment_policies_on_account_id_and_name" ON "assignment_policies" USING btree ("account_id","name");--> statement-breakpoint
CREATE INDEX "index_assignment_policies_on_account_id" ON "assignment_policies" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_assignment_policies_on_enabled" ON "assignment_policies" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "index_dashboard_apps_on_account_id" ON "dashboard_apps" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_dashboard_apps_on_user_id" ON "dashboard_apps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_inbox_assignment_policies_on_assignment_policy_id" ON "inbox_assignment_policies" USING btree ("assignment_policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_inbox_assignment_policies_on_inbox_id" ON "inbox_assignment_policies" USING btree ("inbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_inbox_members_on_inbox_id_and_user_id" ON "inbox_members" USING btree ("inbox_id","user_id");--> statement-breakpoint
CREATE INDEX "index_inbox_members_on_inbox_id" ON "inbox_members" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_working_hours_on_account_id" ON "working_hours" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_working_hours_on_inbox_id" ON "working_hours" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_inboxes_on_account_id" ON "inboxes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_inboxes_on_channel_id_and_channel_type" ON "inboxes" USING btree ("channel_id","channel_type");--> statement-breakpoint
CREATE INDEX "index_inboxes_on_portal_id" ON "inboxes" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "index_custom_attribute_definitions_on_account_id" ON "custom_attribute_definitions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_key_model_index" ON "custom_attribute_definitions" USING btree ("attribute_key","attribute_model","account_id");--> statement-breakpoint
CREATE INDEX "index_labels_on_account_id" ON "labels" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_labels_on_title_and_account_id" ON "labels" USING btree ("title","account_id");--> statement-breakpoint
CREATE INDEX "index_taggings_on_context" ON "taggings" USING btree ("context");--> statement-breakpoint
CREATE UNIQUE INDEX "taggings_idx" ON "taggings" USING btree ("tag_id","taggable_id","taggable_type","context","tagger_id","tagger_type");--> statement-breakpoint
CREATE INDEX "index_taggings_on_tag_id" ON "taggings" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "index_taggings_on_taggable_id_and_taggable_type_and_context" ON "taggings" USING btree ("taggable_id","taggable_type","context");--> statement-breakpoint
CREATE INDEX "taggings_idy" ON "taggings" USING btree ("taggable_id","taggable_type","tagger_id","context");--> statement-breakpoint
CREATE INDEX "index_taggings_on_taggable_id" ON "taggings" USING btree ("taggable_id");--> statement-breakpoint
CREATE INDEX "index_taggings_on_taggable_type" ON "taggings" USING btree ("taggable_type");--> statement-breakpoint
CREATE INDEX "index_taggings_on_tagger_id_and_tagger_type" ON "taggings" USING btree ("tagger_id","tagger_type");--> statement-breakpoint
CREATE INDEX "index_taggings_on_tagger_id" ON "taggings" USING btree ("tagger_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_team_members_on_team_id_and_user_id" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "index_team_members_on_team_id" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "index_team_members_on_user_id" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_teams_on_account_id" ON "teams" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_teams_on_name_and_account_id" ON "teams" USING btree ("name","account_id");--> statement-breakpoint
CREATE INDEX "index_macros_on_account_id" ON "macros" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_webhooks_on_account_id_and_url" ON "webhooks" USING btree ("account_id","url");--> statement-breakpoint
CREATE INDEX "reporting_events__account_id__name__created_at" ON "reporting_events" USING btree ("account_id","name","created_at");--> statement-breakpoint
CREATE INDEX "index_reporting_events_for_response_distribution" ON "reporting_events" USING btree ("account_id","name","inbox_id","created_at");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_account_id" ON "reporting_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_conversation_id" ON "reporting_events" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_created_at" ON "reporting_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_inbox_id" ON "reporting_events" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_name" ON "reporting_events" USING btree ("name");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_user_id" ON "reporting_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_rollup_unique_key" ON "reporting_events_rollups" USING btree ("account_id","date","dimension_type","dimension_id","metric");--> statement-breakpoint
CREATE INDEX "index_rollup_summary" ON "reporting_events_rollups" USING btree ("account_id","dimension_type","date");--> statement-breakpoint
CREATE INDEX "index_rollup_timeseries" ON "reporting_events_rollups" USING btree ("account_id","metric","date");--> statement-breakpoint
CREATE INDEX "index_articles_on_account_id" ON "articles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_articles_on_associated_article_id" ON "articles" USING btree ("associated_article_id");--> statement-breakpoint
CREATE INDEX "index_articles_on_author_id" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "index_articles_on_portal_id" ON "articles" USING btree ("portal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_articles_on_slug" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "index_articles_on_status" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "index_articles_on_views" ON "articles" USING btree ("views");--> statement-breakpoint
CREATE INDEX "index_categories_on_associated_category_id" ON "categories" USING btree ("associated_category_id");--> statement-breakpoint
CREATE INDEX "index_categories_on_locale_and_account_id" ON "categories" USING btree ("locale","account_id");--> statement-breakpoint
CREATE INDEX "index_categories_on_locale" ON "categories" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "index_categories_on_parent_category_id" ON "categories" USING btree ("parent_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_categories_on_slug_and_locale_and_portal_id" ON "categories" USING btree ("slug","locale","portal_id");--> statement-breakpoint
CREATE INDEX "index_portals_on_channel_web_widget_id" ON "portals" USING btree ("channel_web_widget_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_portals_on_custom_domain" ON "portals" USING btree ("custom_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "index_portals_on_slug" ON "portals" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "index_portals_members_on_portal_id_and_user_id" ON "portals_members" USING btree ("portal_id","user_id");--> statement-breakpoint
CREATE INDEX "index_portals_members_on_portal_id" ON "portals_members" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "index_portals_members_on_user_id" ON "portals_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_related_categories_on_category_id_and_related_category_id" ON "related_categories" USING btree ("category_id","related_category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_related_categories_on_related_category_id_and_category_id" ON "related_categories" USING btree ("related_category_id","category_id");--> statement-breakpoint
CREATE INDEX "index_attachments_on_account_id" ON "attachments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_attachments_on_message_id" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_account_id" ON "csat_survey_responses" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_assigned_agent_id" ON "csat_survey_responses" USING btree ("assigned_agent_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_contact_id" ON "csat_survey_responses" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_conversation_id" ON "csat_survey_responses" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_csat_survey_responses_on_message_id" ON "csat_survey_responses" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_review_notes_updated_by_id" ON "csat_survey_responses" USING btree ("review_notes_updated_by_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_additional_attributes_campaign_id" ON "messages" USING gin (((additional_attributes -> 'campaign_id'::text)));--> statement-breakpoint
CREATE INDEX "idx_messages_account_content_created" ON "messages" USING btree ("account_id","content_type","created_at");--> statement-breakpoint
CREATE INDEX "index_messages_on_account_created_type" ON "messages" USING btree ("account_id","created_at","message_type");--> statement-breakpoint
CREATE INDEX "index_messages_on_account_id_and_inbox_id" ON "messages" USING btree ("account_id","inbox_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_account_id" ON "messages" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_content" ON "messages" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "index_messages_on_conversation_account_type_created" ON "messages" USING btree ("conversation_id","account_id","message_type","created_at");--> statement-breakpoint
CREATE INDEX "index_messages_on_conversation_id" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_created_at" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "index_messages_on_inbox_id" ON "messages" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_sender_and_created" ON "messages" USING btree ("sender_type","sender_id","created_at");--> statement-breakpoint
CREATE INDEX "index_messages_on_sender_type_and_sender_id" ON "messages" USING btree ("sender_type","sender_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_source_id" ON "messages" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "index_custom_filters_on_account_id" ON "custom_filters" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_custom_filters_on_user_id" ON "custom_filters" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "by_account_user" ON "notification_settings" USING btree ("account_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_notification_subscriptions_on_identifier" ON "notification_subscriptions" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "index_notification_subscriptions_on_user_id" ON "notification_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_notifications_on_account_id" ON "notifications" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_notifications_on_last_activity_at" ON "notifications" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "uniq_primary_actor_per_account_notifications" ON "notifications" USING btree ("primary_actor_type","primary_actor_id");--> statement-breakpoint
CREATE INDEX "uniq_secondary_actor_per_account_notifications" ON "notifications" USING btree ("secondary_actor_type","secondary_actor_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_performance" ON "notifications" USING btree ("user_id","account_id","snoozed_until","read_at");--> statement-breakpoint
CREATE INDEX "index_notifications_on_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_agent_bots_on_account_id" ON "agent_bots" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_audits_on_associated_and_created_at" ON "audits" USING btree ("associated_type","associated_id","created_at");--> statement-breakpoint
CREATE INDEX "associated_index" ON "audits" USING btree ("associated_type","associated_id");--> statement-breakpoint
CREATE INDEX "auditable_index" ON "audits" USING btree ("auditable_type","auditable_id","version");--> statement-breakpoint
CREATE INDEX "index_audits_on_created_at" ON "audits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "index_audits_on_request_uuid" ON "audits" USING btree ("request_uuid");--> statement-breakpoint
CREATE INDEX "user_index" ON "audits" USING btree ("user_id","user_type");--> statement-breakpoint
CREATE UNIQUE INDEX "index_email_templates_on_account_scope" ON "email_templates" USING btree ("account_id","name","template_type","locale") WHERE (account_id IS NOT NULL) AND (inbox_id IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "index_email_templates_on_inbox_scope" ON "email_templates" USING btree ("inbox_id","name","template_type","locale") WHERE (inbox_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "index_email_templates_on_inbox_id" ON "email_templates" USING btree ("inbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_email_templates_on_installation_scope" ON "email_templates" USING btree ("name","template_type","locale") WHERE (account_id IS NULL) AND (inbox_id IS NULL);--> statement-breakpoint
CREATE INDEX "index_platform_app_permissibles_on_permissibles" ON "platform_app_permissibles" USING btree ("permissible_type","permissible_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_permissibles_index" ON "platform_app_permissibles" USING btree ("platform_app_id","permissible_id","permissible_type");--> statement-breakpoint
CREATE INDEX "index_platform_app_permissibles_on_platform_app_id" ON "platform_app_permissibles" USING btree ("platform_app_id");--> statement-breakpoint
CREATE INDEX "index_agent_capacity_policies_on_account_id" ON "agent_capacity_policies" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "index_applied_slas_on_account_sla_policy_conversation" ON "applied_slas" USING btree ("account_id","sla_policy_id","conversation_id");--> statement-breakpoint
CREATE INDEX "index_applied_slas_on_account_id" ON "applied_slas" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_applied_slas_on_conversation_id" ON "applied_slas" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_applied_slas_on_sla_policy_id" ON "applied_slas" USING btree ("sla_policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_on_agent_capacity_policy_id_inbox_id_71c7ec4caf" ON "inbox_capacity_limits" USING btree ("agent_capacity_policy_id","inbox_id");--> statement-breakpoint
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
CREATE INDEX "tags_name_trgm_idx" ON "tags" USING gin (lower((name)::text) gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "index_tags_on_name" ON "tags" USING btree ("name");