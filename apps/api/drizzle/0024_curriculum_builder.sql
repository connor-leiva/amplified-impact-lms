-- D-173 (the curriculum builder, PR 1): additive only. One new table (copy_strings) and nullable
-- columns with no default on cohorts, modules, sessions and resources, so every existing row reads
-- back exactly as before. Closed lists are CHECKed with null allowed. Nothing is dropped, renamed or
-- retyped; plans.starts_at (0014) is untouched. The course's words arrive by the one-time seed
-- (db:curriculum:ensure), which only inserts missing rows and fills these new columns where empty.
CREATE TABLE "copy_strings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"audience" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "preview_opens_at" bigint;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "default_open_time" text;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "course" jsonb;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "due_at" bigint;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "tone" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "course" jsonb;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "step_id" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "visibility" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "module_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "replay_visibility" text;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_default_open_time" CHECK ("cohorts"."default_open_time" is null or "cohorts"."default_open_time" ~ '^[0-2][0-9]:[0-5][0-9]$');--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_kind" CHECK ("modules"."kind" is null or "modules"."kind" in ('week', 'skill'));--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_kind" CHECK ("resources"."kind" is null or "resources"."kind" in ('file', 'prompt', 'guide', 'replay', 'vault'));--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_visibility" CHECK ("resources"."visibility" is null or "resources"."visibility" in ('hidden_until_open', 'open_in_preview', 'published', 'hidden'));--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_platform" CHECK ("resources"."platform" is null or "resources"."platform" in ('claude', 'chatgpt', 'both'));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_kind" CHECK ("sessions"."kind" is null or "sessions"."kind" in ('live_build', 'office_hours', 'goal_planning', 'setup', 'other'));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_replay_visibility" CHECK ("sessions"."replay_visibility" is null or "sessions"."replay_visibility" in ('hidden', 'after_open', 'published'));