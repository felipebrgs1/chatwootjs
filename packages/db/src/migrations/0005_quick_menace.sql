CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"description" text,
	"trigger_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"campaign_type" integer DEFAULT 0 NOT NULL,
	"campaign_status" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"audience" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_id" integer,
	"sender_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporting_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"conversation_id" integer,
	"inbox_id" integer,
	"team_id" integer,
	"user_id" integer,
	"label" varchar(255),
	"name" varchar(255),
	"value" double precision,
	"value_in_business_hours" double precision,
	"event_start_time" timestamp with time zone,
	"event_end_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporting_events_rollups" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"date" date NOT NULL,
	"dimension_type" varchar(255) NOT NULL,
	"dimension_id" bigint NOT NULL,
	"metric" varchar(255) NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	"sum_value" double precision DEFAULT 0 NOT NULL,
	"sum_value_business_hours" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_rollup_unique_key" UNIQUE("account_id","date","dimension_type","dimension_id","metric")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"portal_id" integer NOT NULL,
	"category_id" integer,
	"folder_id" integer,
	"author_id" integer,
	"title" varchar(500),
	"slug" varchar(255) NOT NULL,
	"description" text,
	"content" text,
	"status" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"position" integer,
	"locale" varchar(32) DEFAULT 'pt-BR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"portal_id" integer NOT NULL,
	"name" varchar(255),
	"slug" varchar(255) NOT NULL,
	"description" text,
	"locale" varchar(32) DEFAULT 'pt-BR' NOT NULL,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portals" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"custom_domain" varchar(255),
	"color" varchar(255),
	"homepage_link" varchar(255),
	"page_title" varchar(255),
	"header_text" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portals_slug_unique" UNIQUE("slug"),
	CONSTRAINT "index_portals_on_slug" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_events" ADD CONSTRAINT "reporting_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_events" ADD CONSTRAINT "reporting_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_events" ADD CONSTRAINT "reporting_events_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_events" ADD CONSTRAINT "reporting_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portals" ADD CONSTRAINT "portals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_campaigns_on_account_id" ON "campaigns" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_campaign_status" ON "campaigns" USING btree ("campaign_status");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_campaign_type" ON "campaigns" USING btree ("campaign_type");--> statement-breakpoint
CREATE INDEX "index_campaigns_on_inbox_id" ON "campaigns" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "reporting_events__account_id__name__created_at" ON "reporting_events" USING btree ("account_id","name","created_at");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_account_id" ON "reporting_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_conversation_id" ON "reporting_events" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_inbox_id" ON "reporting_events" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_name" ON "reporting_events" USING btree ("name");--> statement-breakpoint
CREATE INDEX "index_reporting_events_on_created_at" ON "reporting_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "index_rollup_summary" ON "reporting_events_rollups" USING btree ("account_id","dimension_type","date");--> statement-breakpoint
CREATE INDEX "index_rollup_timeseries" ON "reporting_events_rollups" USING btree ("account_id","metric","date");--> statement-breakpoint
CREATE INDEX "index_articles_on_portal_id_and_status" ON "articles" USING btree ("portal_id","status");--> statement-breakpoint
CREATE INDEX "index_articles_on_account_id" ON "articles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_articles_on_category_id" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "index_categories_on_portal_id" ON "categories" USING btree ("portal_id");--> statement-breakpoint
CREATE INDEX "index_categories_on_account_id" ON "categories" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_folders_on_category_id" ON "folders" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "index_portals_on_account_id" ON "portals" USING btree ("account_id");