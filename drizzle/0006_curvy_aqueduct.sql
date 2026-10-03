ALTER TABLE "menu" ADD CONSTRAINT "menu_tenant_branch_id" UNIQUE("restaurant_id","branch_id","id");--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_tenant_branch_id" UNIQUE("restaurant_id","branch_id","id");--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "order_counter" (
	"restaurant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_counter_restaurant_id_branch_id_pk" PRIMARY KEY("restaurant_id","branch_id")
);--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"request_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_event_version" UNIQUE("restaurant_id","order_id","version"),
	CONSTRAINT "order_event_request" UNIQUE("restaurant_id","order_id","request_id")
);--> statement-breakpoint
CREATE TABLE "order_item_modifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"name" text NOT NULL,
	"group_name" text NOT NULL,
	"price_delta_minor" bigint NOT NULL,
	CONSTRAINT "order_item_option" UNIQUE("restaurant_id","item_id","option_id")
);--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "order_item_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "order_item_quantity" CHECK ("order_item"."quantity" between 1 and 99),
	CONSTRAINT "order_item_money" CHECK ("order_item"."unit_minor">=0 and "order_item"."total_minor"="order_item"."unit_minor"*"order_item"."quantity")
);--> statement-breakpoint
CREATE TABLE "customer_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	"qr_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"table_label" text NOT NULL,
	"status" "order_status" DEFAULT 'NEW' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"guest_hash" text NOT NULL,
	"locale" text NOT NULL,
	"total_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "order_tenant_menu_id" UNIQUE("restaurant_id","menu_id","id"),
	CONSTRAINT "order_idempotency" UNIQUE("restaurant_id","branch_id","idempotency_key"),
	CONSTRAINT "order_branch_number" UNIQUE("restaurant_id","branch_id","number"),
	CONSTRAINT "order_total_bound" CHECK ("customer_order"."total_minor">=0 and "customer_order"."total_minor"<=99999999999999)
);--> statement-breakpoint
ALTER TABLE "order_counter" ADD CONSTRAINT "order_counter_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_restaurant_id_order_id_customer_order_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","order_id") REFERENCES "public"."customer_order"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifier" ADD CONSTRAINT "order_item_modifier_restaurant_id_item_id_order_item_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","item_id") REFERENCES "public"."order_item"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifier" ADD CONSTRAINT "order_item_modifier_restaurant_id_option_id_modifier_option_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","option_id") REFERENCES "public"."modifier_option"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_restaurant_id_menu_id_order_id_customer_order_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","order_id") REFERENCES "public"."customer_order"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_restaurant_id_menu_id_product_id_product_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","product_id") REFERENCES "public"."product"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_restaurant_id_branch_id_branch_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id") REFERENCES "public"."branch"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_restaurant_id_branch_id_menu_id_menu_restaurant_id_branch_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id","menu_id") REFERENCES "public"."menu"("restaurant_id","branch_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_restaurant_id_branch_id_table_id_dining_table_restaurant_id_branch_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id","table_id") REFERENCES "public"."dining_table"("restaurant_id","branch_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_restaurant_id_branch_id_qr_id_qr_code_restaurant_id_branch_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id","qr_id") REFERENCES "public"."qr_code"("restaurant_id","branch_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_parent_idx" ON "order_item" USING btree ("restaurant_id","order_id","position");--> statement-breakpoint
CREATE INDEX "order_branch_status_created_idx" ON "customer_order" USING btree ("restaurant_id","branch_id","status","created_at","id");--> statement-breakpoint
CREATE INDEX "order_branch_updated_idx" ON "customer_order" USING btree ("restaurant_id","branch_id","updated_at","id");
