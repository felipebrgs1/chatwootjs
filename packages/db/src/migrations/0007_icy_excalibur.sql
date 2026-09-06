CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"description" text,
	"account_id" integer NOT NULL,
	"contacts_count" integer,
	"additional_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"custom_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_companies_on_account_id" ON "companies" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "index_companies_on_name_and_account_id" ON "companies" USING btree ("name","account_id");--> statement-breakpoint
CREATE INDEX "index_contacts_on_company_id" ON "contacts" USING btree ("company_id");