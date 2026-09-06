CREATE TABLE "taggings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag_id" integer NOT NULL,
	"taggable_type" varchar(255) NOT NULL,
	"taggable_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"context" varchar(128),
	"created_at" timestamp with time zone,
	CONSTRAINT "taggings_idx" UNIQUE("tag_id","taggable_id","taggable_type","context")
);
--> statement-breakpoint
ALTER TABLE "taggings" ADD CONSTRAINT "taggings_tag_id_labels_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taggings" ADD CONSTRAINT "taggings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_taggings_on_taggable_id_and_taggable_type_and_context" ON "taggings" USING btree ("taggable_id","taggable_type","context");--> statement-breakpoint
CREATE INDEX "index_taggings_on_tag_id" ON "taggings" USING btree ("tag_id");