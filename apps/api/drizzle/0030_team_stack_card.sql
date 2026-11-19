CREATE TABLE "team_stack_card" (
	"team_id" text PRIMARY KEY NOT NULL,
	"rows" jsonb NOT NULL,
	"sent_at" bigint,
	"updated_at" bigint NOT NULL,
	"updated_by" text NOT NULL
);
