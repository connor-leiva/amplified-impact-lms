CREATE TABLE "team_intake" (
	"team_id" text PRIMARY KEY NOT NULL,
	"answers" jsonb NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text NOT NULL,
	"submitted_at" bigint
);
