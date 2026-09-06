CREATE TABLE "conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_conversation_participants_on_user_id_and_conversation_id" UNIQUE("user_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"assignee_id" integer,
	"contact_id" integer,
	"display_id" integer NOT NULL,
	"contact_last_seen_at" timestamp with time zone,
	"agent_last_seen_at" timestamp with time zone,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_inbox_id" integer,
	"uuid" varchar(64) NOT NULL,
	"identifier" varchar(255),
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"team_id" integer,
	"snoozed_until" timestamp with time zone,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assignee_last_seen_at" timestamp with time zone,
	"first_reply_created_at" timestamp with time zone,
	"priority" integer,
	"waiting_since" timestamp with time zone,
	"cached_label_list" text DEFAULT '' NOT NULL,
	"muted" boolean DEFAULT false NOT NULL,
	"status_changed_at" timestamp with time zone,
	"unread_incoming_messages_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "index_conversations_on_account_id_and_display_id" UNIQUE("account_id","display_id")
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"mentioned_by" integer,
	"mentioned_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_mentions_on_user_id_and_conversation_id" UNIQUE("user_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_type" integer DEFAULT 0 NOT NULL,
	"external_url" varchar(1024),
	"coordinates_lat" real DEFAULT 0 NOT NULL,
	"coordinates_long" real DEFAULT 0 NOT NULL,
	"message_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"fallback_title" varchar(1024),
	"extension" varchar(64),
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csat_survey_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"feedback_message" text,
	"contact_id" integer NOT NULL,
	"assigned_agent_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text,
	"account_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"message_type" integer NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"source_id" text,
	"content_type" integer DEFAULT 0 NOT NULL,
	"content_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sender_type" varchar(255),
	"sender_id" integer,
	"external_source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_message_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_inbox_id_contact_inboxes_id_fk" FOREIGN KEY ("contact_inbox_id") REFERENCES "public"."contact_inboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_mentioned_by_users_id_fk" FOREIGN KEY ("mentioned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_survey_responses" ADD CONSTRAINT "csat_survey_responses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_survey_responses" ADD CONSTRAINT "csat_survey_responses_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_survey_responses" ADD CONSTRAINT "csat_survey_responses_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csat_survey_responses" ADD CONSTRAINT "csat_survey_responses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_conversation_participants_on_account_id" ON "conversation_participants" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_conversation_participants_on_conversation_id" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conv_acid_inbid_stat_asgnid_idx" ON "conversations" USING btree ("account_id","inbox_id","status","assignee_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_account_id_status_created_at" ON "conversations" USING btree ("account_id","status","created_at");--> statement-breakpoint
CREATE INDEX "index_conversations_on_assignee_id_and_account_id" ON "conversations" USING btree ("assignee_id","account_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_contact_id" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_inbox_id" ON "conversations" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_priority" ON "conversations" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "index_conversations_on_status_and_account_id" ON "conversations" USING btree ("status","account_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_team_id" ON "conversations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "index_conversations_on_waiting_since" ON "conversations" USING btree ("waiting_since");--> statement-breakpoint
CREATE INDEX "index_mentions_on_account_id" ON "mentions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_mentions_on_conversation_id" ON "mentions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_attachments_on_account_id" ON "attachments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_attachments_on_message_id" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_account_id" ON "csat_survey_responses" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_conversation_id" ON "csat_survey_responses" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_csat_survey_responses_on_message_id" ON "csat_survey_responses" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_conversation_id" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_conversation_account_type_created" ON "messages" USING btree ("conversation_id","account_id","message_type","created_at");--> statement-breakpoint
CREATE INDEX "index_messages_on_account_id_and_inbox_id" ON "messages" USING btree ("account_id","inbox_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_sender_type_and_sender_id" ON "messages" USING btree ("sender_type","sender_id");--> statement-breakpoint
CREATE INDEX "index_messages_on_source_id" ON "messages" USING btree ("source_id");