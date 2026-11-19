-- D-190: a learner's checklist boxes and the accordions they leave open. Additive. Epoch ms, like
-- progress, so core reads a number and never a Date. Nothing here is rewritten or dropped.
CREATE TABLE "checklist_state" (
	"user_id" text NOT NULL,
	"module_id" text NOT NULL,
	"step_id" text NOT NULL,
	"item_id" text NOT NULL,
	"checked" boolean NOT NULL,
	"checked_at" bigint,
	"auto" boolean DEFAULT false NOT NULL,
	CONSTRAINT "checklist_state_user_id_module_id_step_id_item_id_pk" PRIMARY KEY("user_id","module_id","step_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "learner_prefs" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "learner_prefs_user_id_key_pk" PRIMARY KEY("user_id","key")
);
