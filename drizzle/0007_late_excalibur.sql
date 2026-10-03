CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_enabled" boolean DEFAULT true NOT NULL,
	"ordering_enabled" boolean DEFAULT true NOT NULL,
	"analytics_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"reference" text NOT NULL,
	"voided" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reference" UNIQUE("restaurant_id","reference"),
	CONSTRAINT "payment_positive" CHECK ("payment_record"."amount_minor">0)
);
--> statement-breakpoint
CREATE TABLE "billing_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"price_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"limits" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plan_code_unique" UNIQUE("code"),
	CONSTRAINT "plan_price_nonnegative" CHECK ("billing_plan"."price_minor">=0)
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_tenant_id" UNIQUE("restaurant_id","id"),
	CONSTRAINT "subscription_dates" CHECK ("subscription"."ends_at">"subscription"."starts_at"),
	CONSTRAINT "subscription_status" CHECK ("subscription"."status" in ('ACTIVE','PAST_DUE','CANCELLED'))
);
--> statement-breakpoint
CREATE TABLE "support_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_record" ADD CONSTRAINT "payment_record_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_record" ADD CONSTRAINT "payment_record_restaurant_id_subscription_id_subscription_restaurant_id_id_fk" FOREIGN KEY ("restaurant_id","subscription_id") REFERENCES "public"."subscription"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_billing_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_tenant_time" ON "payment_record" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_current" ON "subscription" USING btree ("restaurant_id") WHERE "subscription"."status" in ('ACTIVE','PAST_DUE');--> statement-breakpoint
CREATE INDEX "support_open_time" ON "support_ticket" USING btree ("resolved","created_at");