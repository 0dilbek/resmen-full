CREATE TYPE "public"."restaurant_status" AS ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'ADMIN', 'MANAGER', 'CASHIER');--> statement-breakpoint
CREATE TABLE "restaurant_settings" (
	"restaurant_id" uuid PRIMARY KEY NOT NULL,
	"default_locale" text DEFAULT 'uz' NOT NULL,
	"enabled_locales" jsonb DEFAULT '["uz","ru","en"]'::jsonb NOT NULL,
	"currency" text DEFAULT 'UZS' NOT NULL,
	"ordering_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "settings_locale" CHECK ("restaurant_settings"."default_locale" in ('uz','ru','en')),
	CONSTRAINT "settings_currency" CHECK ("restaurant_settings"."currency" in ('UZS','USD','EUR'))
);
--> statement-breakpoint
CREATE TABLE "restaurant_slug" (
	"slug" text PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "restaurant_status" DEFAULT 'DRAFT' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"logo" text,
	"cover" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "branch_slug" (
	"restaurant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"branch_id" uuid NOT NULL,
	CONSTRAINT "branch_slug_reserved" UNIQUE("restaurant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "branch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'Asia/Tashkent' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "branch_tenant_slug_unique" UNIQUE("restaurant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"catalog_revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "menu_branch" UNIQUE("restaurant_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid,
	"actor_id" text,
	"scope" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_branch" (
	"restaurant_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	CONSTRAINT "invitation_branch_restaurant_id_invitation_id_branch_id_pk" PRIMARY KEY("restaurant_id","invitation_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"all_branches" boolean NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "invitation_tenant_id" UNIQUE("restaurant_id","id")
);
--> statement-breakpoint
CREATE TABLE "membership_branch" (
	"restaurant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	CONSTRAINT "membership_branch_restaurant_id_membership_id_branch_id_pk" PRIMARY KEY("restaurant_id","membership_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	"all_branches" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_user_tenant" UNIQUE("restaurant_id","user_id"),
	CONSTRAINT "membership_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "membership_scope" CHECK (("membership"."role" in ('OWNER','ADMIN') and "membership"."all_branches") or ("membership"."role" = 'CASHIER' and not "membership"."all_branches") or "membership"."role" = 'MANAGER')
);
--> statement-breakpoint
CREATE TABLE "platform_grant" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD CONSTRAINT "restaurant_settings_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_slug" ADD CONSTRAINT "restaurant_slug_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_slug" ADD CONSTRAINT "branch_slug_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu" ADD CONSTRAINT "menu_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_branch" ADD CONSTRAINT "invitation_branch_restaurant_id_invitation_id_invitation_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","invitation_id") REFERENCES "public"."invitation"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_branch" ADD CONSTRAINT "invitation_branch_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_branch" ADD CONSTRAINT "membership_branch_restaurant_id_membership_id_membership_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","membership_id") REFERENCES "public"."membership"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_branch" ADD CONSTRAINT "membership_branch_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_grant" ADD CONSTRAINT "platform_grant_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restaurant_slug_tenant_idx" ON "restaurant_slug" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_one_default" ON "branch" USING btree ("restaurant_id") WHERE "branch"."is_default" = true;--> statement-breakpoint
CREATE INDEX "audit_tenant_time_idx" ON "audit_log" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "invitation_tenant_idx" ON "invitation" USING btree ("restaurant_id","email");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "membership" USING btree ("user_id","active");