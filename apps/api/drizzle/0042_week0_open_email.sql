-- The Week 0 Is Open email. Additive only: four nullable columns on cohort_enrollments (its once-per-owner
-- marker, the same claim pattern as the cohort welcome's), a CHECK on the new status column, and a wider
-- CHECK on console_flags so the new flag key can be stored, dropped and re-added the way 0041 did. No row
-- is inserted for the flag, so it stays off (its default) until a Console flip. Nothing is dropped, renamed
-- or retyped.
--
-- Week 0's due date needs no column: the Week 0 module already stores it (modules.due_at, the week
-- builder's "Due"), and the job reads it there.
ALTER TABLE "cohort_enrollments" ADD COLUMN "week0_status" text;
--> statement-breakpoint
ALTER TABLE "cohort_enrollments" ADD COLUMN "week0_sent_at" bigint;
--> statement-breakpoint
ALTER TABLE "cohort_enrollments" ADD COLUMN "week0_claimed_at" bigint;
--> statement-breakpoint
ALTER TABLE "cohort_enrollments" ADD COLUMN "week0_error" text;
--> statement-breakpoint
ALTER TABLE "cohort_enrollments" ADD CONSTRAINT "cohort_enrollments_week0_status" CHECK ("week0_status" is null or "week0_status" in ('claimed', 'sent', 'failed', 'skipped'));
--> statement-breakpoint
ALTER TABLE "console_flags" DROP CONSTRAINT "console_flags_key";
--> statement-breakpoint
ALTER TABLE "console_flags" ADD CONSTRAINT "console_flags_key" CHECK ("console_flags"."key" in ('masquerade_enabled', 'cohort_welcome_email', 'week0_open_email'));
