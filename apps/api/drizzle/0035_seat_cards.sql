-- D-236: the seat card form. Additive: one new table. One card per team per week: the team's answers to the week's
-- seat card (`answers`, by row), who saved them last and when, when the Operations Lead marked it ready for the owner,
-- and when the Team Owner signed it and who. A change after signing saves and the card stays signed (Connor, Nov 22).
-- Epoch ms.
CREATE TABLE "team_seat_cards" (
	"team_id" text NOT NULL,
	"module_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"updated_at" bigint NOT NULL,
	"updated_by" text NOT NULL,
	"ready_at" bigint,
	"signed_at" bigint,
	"signed_by" text,
	CONSTRAINT "team_seat_cards_team_id_module_id_pk" PRIMARY KEY("team_id","module_id")
);
--> statement-breakpoint
CREATE INDEX "team_seat_cards_module_idx" ON "team_seat_cards" ("module_id");
