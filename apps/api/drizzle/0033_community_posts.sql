-- D-231 (IMPLEMENTATION-SPEC.md B-34): the cohort Community, threads in spaces. Additive: two new tables.
-- A thread's first post is its body; every later post is a reply. Nothing is ever removed: a delete sets
-- `deleted_at` (a thread's, when its first post goes), so the posts-an-hour guard still counts it. Ids are
-- serials, so a thread's posts read in the order they were written. Epoch ms, like every learner instant.
CREATE TABLE "community_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"space" text NOT NULL,
	"title" text NOT NULL,
	"by_user_id" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"activity_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL REFERENCES "community_threads"("id"),
	"by_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint NOT NULL,
	"edited_at" bigint,
	"hidden" boolean DEFAULT false NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE INDEX "community_threads_cohort_idx" ON "community_threads" ("cohort_id", "activity_at");
--> statement-breakpoint
CREATE INDEX "community_posts_thread_idx" ON "community_posts" ("thread_id", "id");
--> statement-breakpoint
CREATE INDEX "community_posts_by_idx" ON "community_posts" ("by_user_id", "created_at");
