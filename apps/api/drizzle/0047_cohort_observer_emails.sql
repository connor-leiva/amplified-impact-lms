-- D-264: cohort observer emails. Additive only: two new tables and one new column with a constant default, so every
-- existing row reads back exactly as it did. Nothing is dropped, renamed or retyped, and no row is written.
--
--   console_settings          the Console's saved settings that are not on/off flags; one key today,
--                             `cohort_observer_emails` ({ "addresses": [...] }). No row: `COHORT_OBSERVER_EMAILS` applies
--   observer_copies           the observer copies' ledger: one row per (kind, unit, address), claimed before the send,
--                             so a cohort send is copied to an observer once however many ticks or replicas see it.
--                             Separate from `job_runs`, which stays the learners' ledger alone
--   email_log.observer_copy   true on an observer copy's log row, so the Console's learner counts leave it out
CREATE TABLE "console_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "console_settings_key" CHECK ("console_settings"."key" in ('cohort_observer_emails'))
);
--> statement-breakpoint
CREATE TABLE "observer_copies" (
	"kind" text NOT NULL,
	"unit" text NOT NULL,
	"address" text NOT NULL,
	"cohort_id" text,
	"template" text NOT NULL,
	"sent_at" bigint NOT NULL,
	CONSTRAINT "observer_copies_kind_unit_address_pk" PRIMARY KEY("kind","unit","address")
);
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "observer_copy" boolean DEFAULT false NOT NULL;
