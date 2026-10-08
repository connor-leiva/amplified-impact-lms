ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_contact_id" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_synced_at" bigint;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_next_attempt_at" bigint;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_error" text;