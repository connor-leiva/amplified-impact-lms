-- R-5 Phase 3 (D-255): the Cohort page. Additive only: five nullable columns on cohorts, with no defaults, so every
-- existing row reads back exactly as it did (a null is an absent key, D-173). Nothing is dropped, renamed or retyped,
-- and no row is written: December's run is written by the one-time data step `2026-11-26-december-run`, not here.
--
--   cohorts.included_until    the day a seat's included time ends, a calendar date (`YYYY-MM-DD`, checked); its
--                             instant is the start of that day in America/Chicago. Text, not `date`: § 7.2 keeps
--                             every column of a record's table a number or text (a date is not an instant). New
--                             cohort prefills it; December's is written by Phase 5's data step
--   cohorts.words_checked_at  when the cohort's words were saved, which clears "Read them once"
--   cohorts.overlap_ok_at     when staff kept its sessions at the same time as another cohort's
--   cohorts.words             a new cohort's own words (the promise, how it works, the holiday note); December's are
--                             its course's
--   cohorts.hosts             the hosts of a cohort whose shape is not stored (December's, Q-28)
ALTER TABLE "cohorts" ADD COLUMN "included_until" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_included_until" CHECK ("cohorts"."included_until" is null or "cohorts"."included_until" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "words_checked_at" bigint;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "overlap_ok_at" bigint;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "words" jsonb;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "hosts" text;
