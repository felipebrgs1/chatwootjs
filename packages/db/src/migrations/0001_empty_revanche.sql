CREATE TABLE "channel_api" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"webhook_url" text,
	"identifier" varchar(255),
	"hmac_token" varchar(255),
	"hmac_mandatory" boolean DEFAULT false NOT NULL,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_api_identifier_unique" UNIQUE("identifier"),
	CONSTRAINT "channel_api_hmac_token_unique" UNIQUE("hmac_token")
);
--> statement-breakpoint
CREATE TABLE "channel_email" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"forward_to_email" varchar(255) NOT NULL,
	"imap_enabled" boolean DEFAULT false NOT NULL,
	"imap_address" varchar(255) DEFAULT '' NOT NULL,
	"imap_port" integer DEFAULT 0 NOT NULL,
	"imap_login" varchar(255) DEFAULT '' NOT NULL,
	"imap_password" varchar(255) DEFAULT '' NOT NULL,
	"imap_enable_ssl" boolean DEFAULT true NOT NULL,
	"smtp_enabled" boolean DEFAULT false NOT NULL,
	"smtp_address" varchar(255) DEFAULT '' NOT NULL,
	"smtp_port" integer DEFAULT 0 NOT NULL,
	"smtp_login" varchar(255) DEFAULT '' NOT NULL,
	"smtp_password" varchar(255) DEFAULT '' NOT NULL,
	"smtp_domain" varchar(255) DEFAULT '' NOT NULL,
	"smtp_enable_starttls_auto" boolean DEFAULT true NOT NULL,
	"smtp_authentication" varchar(255) DEFAULT 'login' NOT NULL,
	"smtp_openssl_verify_mode" varchar(255) DEFAULT 'none' NOT NULL,
	"smtp_enable_ssl_tls" boolean DEFAULT false NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider" varchar(255),
	"imap_authentication" varchar(255) DEFAULT 'plain' NOT NULL,
	"verified_for_sending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_email_email_unique" UNIQUE("email"),
	CONSTRAINT "channel_email_forward_to_email_unique" UNIQUE("forward_to_email")
);
--> statement-breakpoint
CREATE TABLE "channel_facebook_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"page_id" varchar(255) NOT NULL,
	"user_access_token" text NOT NULL,
	"page_access_token" text NOT NULL,
	"instagram_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_channel_facebook_pages_on_page_id_and_account_id" UNIQUE("page_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "channel_instagram" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"access_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"instagram_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_instagram_instagram_id_unique" UNIQUE("instagram_id")
);
--> statement-breakpoint
CREATE TABLE "channel_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"line_channel_id" varchar(255) NOT NULL,
	"line_channel_secret" varchar(255) NOT NULL,
	"line_channel_token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_line_line_channel_id_unique" UNIQUE("line_channel_id")
);
--> statement-breakpoint
CREATE TABLE "channel_sms" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"provider" varchar(255) DEFAULT 'default' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_sms_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "channel_telegram" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"bot_name" varchar(255),
	"bot_token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_telegram_bot_token_unique" UNIQUE("bot_token")
);
--> statement-breakpoint
CREATE TABLE "channel_twitter_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"profile_id" varchar(255) NOT NULL,
	"twitter_access_token" text NOT NULL,
	"twitter_access_token_secret" text NOT NULL,
	"tweets_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_channel_twitter_profiles_on_account_id_and_profile_id" UNIQUE("account_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "channel_web_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"website_url" text,
	"website_token" varchar(255) NOT NULL,
	"widget_color" varchar(20) DEFAULT '#1f93ff' NOT NULL,
	"welcome_title" varchar(255),
	"welcome_tagline" varchar(255),
	"feature_flags" integer DEFAULT 7 NOT NULL,
	"reply_time" integer DEFAULT 0 NOT NULL,
	"hmac_token" varchar(255),
	"pre_chat_form_enabled" boolean DEFAULT false NOT NULL,
	"pre_chat_form_options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hmac_mandatory" boolean DEFAULT false NOT NULL,
	"continuity_via_email" boolean DEFAULT true NOT NULL,
	"allowed_domains" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_web_widgets_website_token_unique" UNIQUE("website_token"),
	CONSTRAINT "channel_web_widgets_hmac_token_unique" UNIQUE("hmac_token")
);
--> statement-breakpoint
CREATE TABLE "channel_whatsapp" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"business_management_token" text,
	"phone_number" varchar(255) NOT NULL,
	"provider" varchar(255) DEFAULT 'default' NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message_templates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message_templates_last_updated" timestamp with time zone,
	"phone_number_health" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phone_number_health_checked_at" timestamp with time zone,
	"phone_number_health_error" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_whatsapp_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "contact_inboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"source_id" text NOT NULL,
	"hmac_verified" boolean DEFAULT false NOT NULL,
	"pubsub_token" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_inboxes_pubsub_token_unique" UNIQUE("pubsub_token"),
	CONSTRAINT "index_contact_inboxes_on_inbox_id_and_source_id" UNIQUE("inbox_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" varchar(255),
	"phone_number" varchar(255),
	"account_id" integer NOT NULL,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"identifier" varchar(255),
	"custom_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_activity_at" timestamp with time zone,
	"contact_type" integer DEFAULT 0 NOT NULL,
	"middle_name" varchar(255) DEFAULT '' NOT NULL,
	"last_name" varchar(255) DEFAULT '' NOT NULL,
	"location" varchar(255) DEFAULT '' NOT NULL,
	"country_code" varchar(255) DEFAULT '' NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_email_per_account_contact" UNIQUE("email","account_id"),
	CONSTRAINT "uniq_identifier_per_account_contact" UNIQUE("identifier","account_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"account_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_import_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_import_id" integer NOT NULL,
	"data_import_item_id" integer,
	"source_object_type" varchar(255),
	"source_object_id" varchar(255),
	"error_code" varchar(255) NOT NULL,
	"message" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_import_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_import_id" integer NOT NULL,
	"source_object_type" varchar(255) NOT NULL,
	"source_object_id" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"chatwoot_record_type" varchar(255),
	"chatwoot_record_id" integer,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" varchar(255),
	"last_error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idx_data_import_items_on_import_and_source" UNIQUE("data_import_id","source_object_type","source_object_id")
);
--> statement-breakpoint
CREATE TABLE "data_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"data_type" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"processing_errors" text,
	"total_records" integer,
	"processed_records" integer,
	"name" varchar(255),
	"initiated_by_id" integer,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"assignment_order" integer DEFAULT 0 NOT NULL,
	"conversation_priority" integer DEFAULT 0 NOT NULL,
	"fair_distribution_limit" integer DEFAULT 100 NOT NULL,
	"fair_distribution_window" integer DEFAULT 3600 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"exclude_older_than_hours" integer DEFAULT 168,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_assignment_policies_on_account_id_and_name" UNIQUE("account_id","name")
);
--> statement-breakpoint
CREATE TABLE "dashboard_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_assignment_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"inbox_id" integer NOT NULL,
	"assignment_policy_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_inbox_assignment_policy" UNIQUE("inbox_id","assignment_policy_id")
);
--> statement-breakpoint
CREATE TABLE "inbox_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_inbox_members_on_inbox_id_and_user_id" UNIQUE("inbox_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"inbox_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"closed_all_day" boolean DEFAULT false NOT NULL,
	"open_hour" integer,
	"open_minutes" integer,
	"close_hour" integer,
	"close_minutes" integer,
	"open_all_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"channel_type" varchar(255),
	"enable_auto_assignment" boolean DEFAULT true NOT NULL,
	"greeting_enabled" boolean DEFAULT false NOT NULL,
	"greeting_message" text,
	"email_address" varchar(255),
	"working_hours_enabled" boolean DEFAULT false NOT NULL,
	"out_of_office_message" text,
	"timezone" varchar(255) DEFAULT 'UTC' NOT NULL,
	"enable_email_collect" boolean DEFAULT true NOT NULL,
	"csat_survey_enabled" boolean DEFAULT false NOT NULL,
	"allow_messages_after_resolved" boolean DEFAULT true NOT NULL,
	"auto_assignment_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lock_to_single_conversation" boolean DEFAULT false NOT NULL,
	"sender_name_type" integer DEFAULT 0 NOT NULL,
	"business_name" varchar(255),
	"csat_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_attribute_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"attribute_model" integer DEFAULT 0 NOT NULL,
	"attribute_key" varchar(255) NOT NULL,
	"attribute_display_name" varchar(255),
	"attribute_display_type" integer DEFAULT 0 NOT NULL,
	"default_value" varchar(255),
	"attribute_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attribute_description" text,
	"regex_pattern" varchar(255),
	"regex_cue" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_key_model_index" UNIQUE("attribute_key","attribute_model","account_id")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" text,
	"color" varchar(255) DEFAULT '#1f93ff' NOT NULL,
	"show_on_sidebar" boolean DEFAULT true NOT NULL,
	"account_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_labels_on_title_and_account_id" UNIQUE("title","account_id")
);
--> statement-breakpoint
ALTER TABLE "channel_api" ADD CONSTRAINT "channel_api_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_email" ADD CONSTRAINT "channel_email_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_facebook_pages" ADD CONSTRAINT "channel_facebook_pages_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_instagram" ADD CONSTRAINT "channel_instagram_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_line" ADD CONSTRAINT "channel_line_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_sms" ADD CONSTRAINT "channel_sms_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_telegram" ADD CONSTRAINT "channel_telegram_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_twitter_profiles" ADD CONSTRAINT "channel_twitter_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_web_widgets" ADD CONSTRAINT "channel_web_widgets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_whatsapp" ADD CONSTRAINT "channel_whatsapp_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_inboxes" ADD CONSTRAINT "contact_inboxes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_inboxes" ADD CONSTRAINT "contact_inboxes_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_errors" ADD CONSTRAINT "data_import_errors_data_import_id_data_imports_id_fk" FOREIGN KEY ("data_import_id") REFERENCES "public"."data_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_errors" ADD CONSTRAINT "data_import_errors_data_import_item_id_data_import_items_id_fk" FOREIGN KEY ("data_import_item_id") REFERENCES "public"."data_import_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_items" ADD CONSTRAINT "data_import_items_data_import_id_data_imports_id_fk" FOREIGN KEY ("data_import_id") REFERENCES "public"."data_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_policies" ADD CONSTRAINT "assignment_policies_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_apps" ADD CONSTRAINT "dashboard_apps_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_assignment_policies" ADD CONSTRAINT "inbox_assignment_policies_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_assignment_policies" ADD CONSTRAINT "inbox_assignment_policies_assignment_policy_id_assignment_policies_id_fk" FOREIGN KEY ("assignment_policy_id") REFERENCES "public"."assignment_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_members" ADD CONSTRAINT "inbox_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_members" ADD CONSTRAINT "inbox_members_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_attribute_definitions" ADD CONSTRAINT "custom_attribute_definitions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_channel_web_widgets_on_hmac_token" ON "channel_web_widgets" USING btree ("hmac_token");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_contact_id" ON "contact_inboxes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_inbox_id" ON "contact_inboxes" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_pubsub_token" ON "contact_inboxes" USING btree ("pubsub_token");--> statement-breakpoint
CREATE INDEX "index_contact_inboxes_on_source_id" ON "contact_inboxes" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "index_contacts_on_account_id" ON "contacts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_contacts_on_account_id_and_last_activity_at" ON "contacts" USING btree ("account_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "index_contacts_on_phone_number_and_account_id" ON "contacts" USING btree ("phone_number","account_id");--> statement-breakpoint
CREATE INDEX "index_notes_on_account_id" ON "notes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_notes_on_contact_id" ON "notes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_notes_on_user_id" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_data_import_errors_on_data_import_id" ON "data_import_errors" USING btree ("data_import_id");--> statement-breakpoint
CREATE INDEX "index_data_import_items_on_data_import_id" ON "data_import_items" USING btree ("data_import_id");--> statement-breakpoint
CREATE INDEX "index_data_imports_on_account_id" ON "data_imports" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_data_imports_on_initiated_by_id" ON "data_imports" USING btree ("initiated_by_id");--> statement-breakpoint
CREATE INDEX "index_assignment_policies_on_enabled" ON "assignment_policies" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "index_dashboard_apps_on_account_id" ON "dashboard_apps" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_dashboard_apps_on_user_id" ON "dashboard_apps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_inbox_members_on_inbox_id" ON "inbox_members" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_working_hours_on_account_id" ON "working_hours" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_working_hours_on_inbox_id" ON "working_hours" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_inboxes_on_account_id" ON "inboxes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_inboxes_on_channel_id_and_channel_type" ON "inboxes" USING btree ("channel_id","channel_type");--> statement-breakpoint
CREATE INDEX "index_custom_attribute_definitions_on_account_id" ON "custom_attribute_definitions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_labels_on_account_id" ON "labels" USING btree ("account_id");