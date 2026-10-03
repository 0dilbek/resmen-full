CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "category_tenant_menu_id" UNIQUE("restaurant_id","menu_id","id")
);
--> statement-breakpoint
CREATE TABLE "category_translation" (
	"restaurant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "category_translation_restaurant_id_category_id_locale_pk" PRIMARY KEY("restaurant_id","category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"state" text DEFAULT 'PENDING' NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_asset_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "media_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "media_tenant_menu_id" UNIQUE("restaurant_id","menu_id","id")
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_image_restaurant_id_product_id_media_id_pk" PRIMARY KEY("restaurant_id","product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_translation" (
	"restaurant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ingredients" text DEFAULT '' NOT NULL,
	CONSTRAINT "product_translation_restaurant_id_product_id_locale_pk" PRIMARY KEY("restaurant_id","product_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"price_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"allergens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "product_tenant_menu_id" UNIQUE("restaurant_id","menu_id","id"),
	CONSTRAINT "product_price_nonnegative" CHECK ("product"."price_minor">=0 and "product"."price_minor"<=9999999999)
);
--> statement-breakpoint
CREATE TABLE "modifier_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"names" jsonb NOT NULL,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modifier_group_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "modifier_group_tenant_menu_id" UNIQUE("restaurant_id","menu_id","id"),
	CONSTRAINT "modifier_selection_limits" CHECK ("modifier_group"."min_selections">=0 and "modifier_group"."max_selections">="modifier_group"."min_selections" and "modifier_group"."max_selections"<=20)
);
--> statement-breakpoint
CREATE TABLE "modifier_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"names" jsonb NOT NULL,
	"price_delta_minor" bigint DEFAULT 0 NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modifier_option_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "modifier_price_nonnegative" CHECK ("modifier_option"."price_delta_minor">=0 and "modifier_option"."price_delta_minor"<=9999999999)
);
--> statement-breakpoint
CREATE TABLE "product_modifier_group" (
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "product_modifier_group_restaurant_id_product_id_group_id_pk" PRIMARY KEY("restaurant_id","product_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "request_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_restaurant_id_menu_id_menu_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id") REFERENCES "public"."menu"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_translation" ADD CONSTRAINT "category_translation_restaurant_id_category_id_category_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","category_id") REFERENCES "public"."category"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_restaurant_id_menu_id_menu_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id") REFERENCES "public"."menu"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_restaurant_id_menu_id_product_id_product_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","product_id") REFERENCES "public"."product"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_restaurant_id_menu_id_media_id_media_asset_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","media_id") REFERENCES "public"."media_asset"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translation" ADD CONSTRAINT "product_translation_restaurant_id_product_id_product_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","product_id") REFERENCES "public"."product"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_restaurant_id_menu_id_category_id_category_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","category_id") REFERENCES "public"."category"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_group" ADD CONSTRAINT "modifier_group_restaurant_id_menu_id_menu_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id") REFERENCES "public"."menu"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_option" ADD CONSTRAINT "modifier_option_restaurant_id_group_id_modifier_group_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","group_id") REFERENCES "public"."modifier_group"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifier_group" ADD CONSTRAINT "product_modifier_group_restaurant_id_menu_id_product_id_product_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","product_id") REFERENCES "public"."product"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_modifier_group" ADD CONSTRAINT "product_modifier_group_restaurant_id_menu_id_group_id_modifier_group_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","group_id") REFERENCES "public"."modifier_group"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_menu_order_idx" ON "category" USING btree ("restaurant_id","menu_id","sort_order","id");--> statement-breakpoint
CREATE INDEX "media_tenant_state_idx" ON "media_asset" USING btree ("restaurant_id","state","created_at");--> statement-breakpoint
CREATE INDEX "product_menu_category_idx" ON "product" USING btree ("restaurant_id","menu_id","category_id","sort_order","id");