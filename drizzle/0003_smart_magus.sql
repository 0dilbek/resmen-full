CREATE TYPE "public"."template_status" AS ENUM('ACTIVE', 'RETIRED', 'BLOCKED');--> statement-breakpoint
CREATE TABLE "template_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "template_status" DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_config" (
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"draft" jsonb NOT NULL,
	"draft_version" integer DEFAULT 1 NOT NULL,
	"published_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_config_restaurant_id_menu_id_pk" PRIMARY KEY("restaurant_id","menu_id")
);
--> statement-breakpoint
CREATE TABLE "template_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_revision_tenant_menu_id" UNIQUE("restaurant_id","menu_id","id")
);
--> statement-breakpoint
ALTER TABLE "template_config" ADD CONSTRAINT "template_config_restaurant_id_menu_id_menu_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id") REFERENCES "public"."menu"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_config" ADD CONSTRAINT "template_config_restaurant_id_menu_id_published_revision_id_template_revision_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","published_revision_id") REFERENCES "public"."template_revision"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_revision" ADD CONSTRAINT "template_revision_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_revision" ADD CONSTRAINT "template_revision_restaurant_id_menu_id_menu_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id") REFERENCES "public"."menu"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "template_catalog" ("id") VALUES ('minimal-01'), ('luxury-01'), ('fastfood-01'), ('uzbek-modern-01');
