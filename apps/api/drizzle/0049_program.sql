-- R-5 Phase 6 (D-265): the program record. Additive only: a new table, and no row written. Every read of the course's
-- shared words falls back to December's `cohorts.course` while it holds no row, so nothing reads differently until the
-- one-time data step `2026-11-28-program` copies December's shared words here (copied, not moved: `cohorts.course` on
-- `dec26` stays as it is, PLAN.md § 10.8).
--
--   programs.id      the program's id (`accelerator`, the one program today)
--   programs.name    its name, as the admin's Program page shows it
--   programs.course  what every cohort that runs it shares: the course intro, the rules, the before and after pages
--                    and the glossary (a `CohortCourse`, the shape `cohorts.course` has always had)
--
-- `cohorts.program_id` (Phase 2, migration 0043) names a cohort's program; null reads as the one program.
CREATE TABLE IF NOT EXISTS "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"course" jsonb
);
