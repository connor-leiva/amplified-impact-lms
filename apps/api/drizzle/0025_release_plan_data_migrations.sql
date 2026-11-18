-- D-175 (the learner build, PR 3): additive only. One new table, data_migrations: the one-time data
-- steps the deploy's curriculum ensure runs (the Nov 17 release plan first), each once, by id. Nothing
-- existing is dropped, renamed or retyped; plans.starts_at (0014) is untouched.
CREATE TABLE "data_migrations" (
	"id" text PRIMARY KEY NOT NULL,
	"ran_at" bigint NOT NULL,
	"summary" jsonb NOT NULL
);
