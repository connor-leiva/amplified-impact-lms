CREATE TABLE "console_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"on" boolean NOT NULL,
	"sensitive" boolean NOT NULL,
	"updated_at" bigint,
	"updated_by" text,
	CONSTRAINT "console_flags_key" CHECK ("console_flags"."key" in ('masquerade_enabled'))
);
--> statement-breakpoint
-- Hand-written (D-168): the one Console flag, on and sensitive (spec § 7.13, D8). Never flipped yet,
-- so no time and no one. A repeat run changes nothing.
INSERT INTO "console_flags" ("key", "on", "sensitive", "updated_at", "updated_by") VALUES ('masquerade_enabled', true, true, NULL, NULL) ON CONFLICT ("key") DO NOTHING;
