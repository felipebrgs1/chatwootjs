CREATE TABLE "automation_rule_pending_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"automation_rule_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"message_id" integer,
	"due_at" timestamp with time zone NOT NULL,
	"episode_key" varchar(255) NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"skip_reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_automation_pending_execution_episode" UNIQUE("automation_rule_id","conversation_id","episode_key")
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"event_name" varchar(255) NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"execution_delay" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canned_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"short_code" varchar(255),
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_canned_responses_on_short_code_and_account_id" UNIQUE("short_code","account_id")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_team_members_on_team_id_and_user_id" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"allow_auto_assign" boolean DEFAULT true NOT NULL,
	"icon" varchar(255) DEFAULT '' NOT NULL,
	"icon_color" varchar(255) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_teams_on_name_and_account_id" UNIQUE("name","account_id")
);
--> statement-breakpoint
CREATE TABLE "macros" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"visibility" integer DEFAULT 0 NOT NULL,
	"created_by_id" integer,
	"updated_by_id" integer,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"inbox_id" integer,
	"url" text,
	"webhook_type" integer DEFAULT 0 NOT NULL,
	"subscriptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"name" varchar(255),
	"secret" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_webhooks_on_account_id_and_url" UNIQUE("account_id","url")
);
--> statement-breakpoint
ALTER TABLE "automation_rule_pending_executions" ADD CONSTRAINT "automation_rule_pending_executions_automation_rule_id_automation_rules_id_fk" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rule_pending_executions" ADD CONSTRAINT "automation_rule_pending_executions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rule_pending_executions" ADD CONSTRAINT "automation_rule_pending_executions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rule_pending_executions" ADD CONSTRAINT "automation_rule_pending_executions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macros" ADD CONSTRAINT "macros_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macros" ADD CONSTRAINT "macros_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macros" ADD CONSTRAINT "macros_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_automation_rule_pending_executions_on_account_id" ON "automation_rule_pending_executions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_automation_pending_executions_due_at" ON "automation_rule_pending_executions" USING btree ("due_at","status");--> statement-breakpoint
CREATE INDEX "index_automation_rules_on_account_id" ON "automation_rules" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_canned_responses_on_account_id" ON "canned_responses" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_team_members_on_team_id" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "index_team_members_on_user_id" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_teams_on_account_id" ON "teams" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_macros_on_account_id" ON "macros" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_webhooks_on_account_id" ON "webhooks" USING btree ("account_id");