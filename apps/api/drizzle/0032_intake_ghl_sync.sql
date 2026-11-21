-- D-229 (B-20): the intake's sync to GHL. Additive: five columns on team_intake, none of them rewriting a row.
-- `ghl_sync_status` is none (nothing to send), pending (a submit, or a save after it, waits its quiet minute),
-- synced or failed. Epoch ms, like the table's other times.
ALTER TABLE "team_intake" ADD COLUMN "ghl_sync_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_intake" ADD COLUMN "ghl_synced_at" bigint;--> statement-breakpoint
ALTER TABLE "team_intake" ADD COLUMN "ghl_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_intake" ADD COLUMN "ghl_error" text;--> statement-breakpoint
ALTER TABLE "team_intake" ADD COLUMN "ghl_next_at" bigint;
