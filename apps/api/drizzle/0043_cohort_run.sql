-- R-5 (D-254): a cohort owns its run and its shape. Additive only: four nullable columns on cohorts and one on
-- sessions, with no defaults, so every existing row reads back exactly as it did (a null is an absent key, D-173).
-- Nothing is dropped, renamed or retyped, and no row is written: December's run is written by Phase 3's one-time
-- data step, not here.
--
--   cohorts.run          the cohort's weeks: an ordered list of { moduleId, n, opensAt, dueAt }
--   cohorts.shape        its weeks of building, setup week, rhythm and hosts
--   cohorts.program_id   the program it runs (one today)
--   cohorts.archived_at  when it was archived, hidden from the pickers (Phase 9)
--   sessions.slot        the rhythm slot that laid a session out; null on a session made or edited by hand
ALTER TABLE "cohorts" ADD COLUMN "run" jsonb;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "shape" jsonb;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "program_id" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "archived_at" bigint;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "slot" text;
