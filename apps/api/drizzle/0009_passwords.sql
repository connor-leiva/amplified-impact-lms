CREATE TABLE "login_failures" (
	"key" text PRIMARY KEY NOT NULL,
	"failures" integer NOT NULL,
	"first_at" timestamp NOT NULL,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_passwords" (
	"user_id" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "remember" boolean DEFAULT true NOT NULL;