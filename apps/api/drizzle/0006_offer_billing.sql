CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"owner_email" text NOT NULL,
	"name" text NOT NULL,
	"crm" text,
	"stripe_customer_id" text,
	"created_at" bigint NOT NULL,
	"invite_sent_at" bigint
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"option" text NOT NULL,
	"origin" text NOT NULL,
	"status" text NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"company" text,
	"crm" text,
	"team_size" text,
	"src" text,
	"campaign" text,
	"agreement_version" text,
	"agreement_accepted_at" bigint,
	"renewal_consent_at" bigint,
	"renewal_consent_text" text,
	"sms_consent" boolean DEFAULT false NOT NULL,
	"sms_consent_at" bigint,
	"sms_consent_text" text,
	"stripe_session_id" text,
	"stripe_customer_id" text,
	"stripe_payment_intent_id" text,
	"stripe_subscription_id" text,
	"amount_total" integer,
	"currency" text,
	"payments_made" integer DEFAULT 0 NOT NULL,
	"paid_at" bigint,
	"payment_failed_at" bigint,
	"membership_ended_at" bigint,
	"refunded_at" bigint,
	"ghl_contact_id" text,
	"ghl_synced_at" bigint,
	"ghl_attempts" integer DEFAULT 0 NOT NULL,
	"ghl_next_attempt_at" bigint,
	"ghl_error" text,
	"account_id" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "orders_plan" CHECK ("orders"."plan" in ('library', 'cohort', 'agents')),
	CONSTRAINT "orders_option" CHECK ("orders"."option" in ('full', 'two_pay', 'upfront', 'upto15', '16to40')),
	CONSTRAINT "orders_origin" CHECK ("orders"."origin" in ('offer', 'payment_link')),
	CONSTRAINT "orders_status" CHECK ("orders"."status" in ('pending', 'paid', 'trialing', 'expired', 'failed', 'refunded')),
	CONSTRAINT "orders_crm" CHECK ("orders"."crm" is null or "orders"."crm" in ('follow_up_boss', 'other')),
	CONSTRAINT "orders_sms_consent_proof" CHECK (not "orders"."sms_consent" or ("orders"."phone" is not null and "orders"."sms_consent_at" is not null and "orders"."sms_consent_text" is not null)),
	CONSTRAINT "orders_renewal_consent_proof" CHECK (("orders"."renewal_consent_at" is null) = ("orders"."renewal_consent_text" is null))
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"kind" text NOT NULL,
	"option" text NOT NULL,
	"seats" integer NOT NULL,
	"cohort_id" text,
	"status" text NOT NULL,
	"starts_at" bigint NOT NULL,
	"paid_through" bigint,
	"live_until" bigint,
	"minimum_until" bigint,
	"stripe_subscription_id" text,
	"order_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "plans_kind" CHECK ("plans"."kind" in ('library', 'cohort', 'agents')),
	CONSTRAINT "plans_status" CHECK ("plans"."status" in ('trialing', 'active', 'past_due', 'canceled', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"sets" text NOT NULL,
	"free" boolean DEFAULT false NOT NULL,
	"released_at" bigint NOT NULL,
	"files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	CONSTRAINT "skills_sets" CHECK ("skills"."sets" in ('owner_ops', 'agent', 'both')),
	CONSTRAINT "skills_status" CHECK ("skills"."status" in ('draft', 'published', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" bigint NOT NULL,
	"processed_at" bigint,
	"error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_owner_email_idx" ON "accounts" USING btree ("owner_email");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_session_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_order_idx" ON "plans" USING btree ("order_id");