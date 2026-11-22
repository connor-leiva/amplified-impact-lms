-- D-237: deleting a cohort's turned-in files when the cohort ends (the Subscription Agreement, Section 7). Additive:
-- two columns. A turn-in keeps its row (the team, who turned it in and when, its note and minutes, its files' names);
-- these say when its files were deleted from the bucket, and by whom. Epoch ms.
ALTER TABLE "submissions" ADD COLUMN "files_deleted_at" bigint;
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "files_deleted_by" text;
