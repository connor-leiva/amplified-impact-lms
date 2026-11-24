-- Cohort welcome email. Additive only: two nullable columns, one new table, and a wider CHECK on
-- console_flags so the new flag key can be stored. No row is inserted for the flag, so it stays off
-- (its default) until a Console flip. Nothing is dropped, renamed or retyped.
--
-- console_flags.turned_on_at is the switch-on time: set by an off-to-on flip, cleared by an
-- on-to-off flip. A flag already on takes its last flip's time, which was that switch-on.
ALTER TABLE "cohorts" ADD COLUMN "welcome_sends_at" bigint;
--> statement-breakpoint
CREATE TABLE "cohort_enrollments" (
	"user_id" text NOT NULL,
	"cohort_id" text NOT NULL,
	"account_id" text NOT NULL,
	"enrolled_at" bigint NOT NULL,
	"welcome_status" text,
	"welcome_sent_at" bigint,
	"welcome_claimed_at" bigint,
	"welcome_error" text,
	"ghl_contact_id" text,
	"ghl_synced_at" bigint,
	"ghl_attempts" integer DEFAULT 0 NOT NULL,
	"ghl_next_attempt_at" bigint,
	"ghl_error" text,
	"ghl_sync_stamp" text,
	"ghl_last_attempt_at" bigint,
	CONSTRAINT "cohort_enrollments_user_id_cohort_id_pk" PRIMARY KEY("user_id","cohort_id"),
	CONSTRAINT "cohort_enrollments_status" CHECK ("welcome_status" is null or "welcome_status" in ('claimed', 'sent', 'failed', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "console_flags" DROP CONSTRAINT "console_flags_key";
--> statement-breakpoint
ALTER TABLE "console_flags" ADD CONSTRAINT "console_flags_key" CHECK ("console_flags"."key" in ('masquerade_enabled', 'cohort_welcome_email'));
--> statement-breakpoint
ALTER TABLE "console_flags" ADD COLUMN "turned_on_at" bigint;
--> statement-breakpoint
UPDATE "console_flags" SET "turned_on_at" = "updated_at" WHERE "on" = true;
