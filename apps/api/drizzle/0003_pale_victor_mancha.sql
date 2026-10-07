CREATE TABLE "ai101_waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"email" text NOT NULL,
	"brokerage" text,
	"source" text NOT NULL,
	"src" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai101_waitlist_email_source_idx" ON "ai101_waitlist" USING btree ("email","source");