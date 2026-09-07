CREATE TABLE "custom_filters" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"model_type" varchar(50) DEFAULT 'conversation' NOT NULL,
	"query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visibility" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"email_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"push_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"muted_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"identifier" text NOT NULL,
	"subscription_type" integer DEFAULT 0 NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"notificable_type" varchar(255),
	"notificable_id" integer,
	"notification_type" integer DEFAULT 0 NOT NULL,
	"read_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_filters" ADD CONSTRAINT "custom_filters_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_filters" ADD CONSTRAINT "custom_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_custom_filters_on_account_id" ON "custom_filters" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_custom_filters_on_user_id" ON "custom_filters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_notification_settings_on_account_id_and_user_id" ON "notification_settings" USING btree ("account_id","user_id");--> statement-breakpoint
CREATE INDEX "index_notification_subscriptions_on_user_id" ON "notification_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "index_notification_subscriptions_on_identifier" ON "notification_subscriptions" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "index_notifications_on_user_id_and_read_at" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "index_notifications_on_account_id" ON "notifications" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_notifications_on_notificable" ON "notifications" USING btree ("notificable_type","notificable_id");