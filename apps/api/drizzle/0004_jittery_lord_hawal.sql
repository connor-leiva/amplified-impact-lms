ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_contact_id" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_synced_at" bigint;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_next_attempt_at" bigint;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_error" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "sms_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "sms_consent_at" bigint;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "sms_consent_text" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD CONSTRAINT "ai101_waitlist_sms_consent_proof" CHECK (not "ai101_waitlist"."sms_consent" or ("ai101_waitlist"."phone" is not null and "ai101_waitlist"."sms_consent_at" is not null and "ai101_waitlist"."sms_consent_text" is not null));