CREATE TABLE "ghl_logins" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_login_at" bigint NOT NULL,
	"ghl_contact_id" text,
	"ghl_synced_at" bigint,
	"ghl_attempts" integer DEFAULT 0 NOT NULL,
	"ghl_next_attempt_at" bigint,
	"ghl_error" text,
	"ghl_sync_stamp" text,
	"ghl_last_attempt_at" bigint
);
--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_sync_stamp" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "ghl_last_attempt_at" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ghl_sync_stamp" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ghl_last_attempt_at" bigint;