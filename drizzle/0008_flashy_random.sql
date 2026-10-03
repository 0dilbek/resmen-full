CREATE TABLE "analytics_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"menu_id" uuid NOT NULL,
	"product_id" uuid,
	"kind" text NOT NULL,
	"locale" text NOT NULL,
	"template_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_kind" CHECK ("analytics_event"."kind" in ('MENU_VIEW','PRODUCT_VIEW','CART_ADD','QR_SCAN')),
	CONSTRAINT "analytics_product_shape" CHECK (("analytics_event"."kind" in ('PRODUCT_VIEW','CART_ADD') and "analytics_event"."product_id" is not null) or ("analytics_event"."kind" in ('MENU_VIEW','QR_SCAN') and "analytics_event"."product_id" is null))
);
--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_restaurant_id_branch_id_menu_id_menu_restaurant_id_branch_id_id_fk" FOREIGN KEY ("restaurant_id","branch_id","menu_id") REFERENCES "public"."menu"("restaurant_id","branch_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_restaurant_id_menu_id_product_id_product_restaurant_id_menu_id_id_fk" FOREIGN KEY ("restaurant_id","menu_id","product_id") REFERENCES "public"."product"("restaurant_id","menu_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_tenant_branch_time" ON "analytics_event" USING btree ("restaurant_id","branch_id","created_at");