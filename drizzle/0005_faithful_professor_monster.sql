CREATE TYPE "public"."qr_kind" AS ENUM('RESTAURANT', 'BRANCH', 'TABLE');--> statement-breakpoint
CREATE TABLE "dining_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "table_tenant_branch_id" UNIQUE("restaurant_id","branch_id","id"),
	CONSTRAINT "table_branch_label" UNIQUE("restaurant_id","branch_id","label")
);
--> statement-breakpoint
CREATE TABLE "qr_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"branch_id" uuid,
	"table_id" uuid,
	"kind" "qr_kind" NOT NULL,
	"label" text NOT NULL,
	"token" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_code_token_unique" UNIQUE("token"),
	CONSTRAINT "qr_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "qr_shape" CHECK (("qr_code"."kind"='RESTAURANT' and "qr_code"."branch_id" is null and "qr_code"."table_id" is null) or ("qr_code"."kind"='BRANCH' and "qr_code"."branch_id" is not null and "qr_code"."table_id" is null) or ("qr_code"."kind"='TABLE' and "qr_code"."branch_id" is not null and "qr_code"."table_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_restaurant_id_branch_id_table_id_dining_table_restaurant_id_branch_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id","table_id") REFERENCES "public"."dining_table"("restaurant_id","branch_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_tenant_branch_idx" ON "qr_code" USING btree ("restaurant_id","branch_id");