CREATE TABLE "agent_bot_inboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"inbox_id" integer,
	"agent_bot_id" integer,
	"status" integer DEFAULT 0 NOT NULL,
	"account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_bots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"description" varchar(255),
	"outgoing_url" varchar(255),
	"account_id" integer,
	"bot_type" integer DEFAULT 0 NOT NULL,
	"bot_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer,
	"action" varchar(50) NOT NULL,
	"auditable_type" varchar(100),
	"auditable_id" integer,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"account_id" integer,
	"template_type" integer DEFAULT 1 NOT NULL,
	"locale" integer DEFAULT 0 NOT NULL,
	"inbox_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"banner_message" text NOT NULL,
	"banner_type" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_bot_inboxes" ADD CONSTRAINT "agent_bot_inboxes_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_bot_inboxes" ADD CONSTRAINT "agent_bot_inboxes_agent_bot_id_agent_bots_id_fk" FOREIGN KEY ("agent_bot_id") REFERENCES "public"."agent_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_bot_inboxes" ADD CONSTRAINT "agent_bot_inboxes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_bots" ADD CONSTRAINT "agent_bots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_agent_bot_inboxes_on_inbox_id" ON "agent_bot_inboxes" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_agent_bots_on_account_id" ON "agent_bots" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_audit_logs_on_account_id" ON "audit_logs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_audit_logs_on_auditable" ON "audit_logs" USING btree ("auditable_type","auditable_id");--> statement-breakpoint
CREATE INDEX "index_audit_logs_on_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_email_templates_on_account_id" ON "email_templates" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_email_templates_on_inbox_id" ON "email_templates" USING btree ("inbox_id");