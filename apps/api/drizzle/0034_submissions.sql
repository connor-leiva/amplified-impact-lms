-- D-230 (IMPLEMENTATION-SPEC.md B-24 to B-28): Turn in. Additive: one new table. Each turn-in is a version: a team's
-- latest for a week and a kind is the one it sees; staff see them all. `files` holds each file's bucket key, its name
-- and its size. `status` is what staff did with it, and never leaves the staff routes (B-25). Epoch ms.
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"module_id" text NOT NULL,
	"kind" text NOT NULL,
	"files" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"minutes" text DEFAULT '' NOT NULL,
	"by_user_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"status_at" bigint,
	"status_by" text,
	CONSTRAINT "submissions_kind" CHECK ("kind" in ('live_read', 'checkpoint')),
	CONSTRAINT "submissions_status" CHECK ("status" in ('received', 'picked', 'reviewed'))
);
--> statement-breakpoint
CREATE INDEX "submissions_team_idx" ON "submissions" ("team_id", "module_id", "kind", "id");
--> statement-breakpoint
CREATE INDEX "submissions_module_idx" ON "submissions" ("module_id", "id");
