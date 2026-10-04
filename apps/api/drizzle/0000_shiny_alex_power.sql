CREATE TYPE "public"."module_status" AS ENUM('draft', 'scheduled', 'published');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('agent', 'team');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"t" bigint NOT NULL,
	"who" text NOT NULL,
	"what" text NOT NULL,
	"tone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text NOT NULL,
	"action" text,
	"action_label" text NOT NULL,
	"audience" text NOT NULL,
	"channels" jsonb NOT NULL,
	"status" text NOT NULL,
	"at" bigint NOT NULL,
	"opens_pct" integer
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"impersonating" text
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start" bigint NOT NULL,
	"end" bigint NOT NULL,
	"weeks" integer,
	"status" text NOT NULL,
	"capacity" integer NOT NULL,
	"cadence" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dismissals" (
	"user_id" text NOT NULL,
	"announcement_id" text NOT NULL,
	CONSTRAINT "dismissals_user_id_announcement_id_pk" PRIMARY KEY("user_id","announcement_id")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"tier" "tier" NOT NULL,
	"icon" text NOT NULL,
	"for_who" text NOT NULL,
	"headline" text NOT NULL,
	"outcome" text NOT NULL,
	"outputs" jsonb NOT NULL,
	"platform" text NOT NULL,
	"run_label" text NOT NULL,
	"build" integer NOT NULL,
	"session" integer,
	"status" "module_status" NOT NULL,
	"opens" bigint,
	"order" integer NOT NULL,
	"dur" integer DEFAULT 0 NOT NULL,
	"instructor" text NOT NULL,
	"transcript" jsonb NOT NULL,
	"notes" text NOT NULL,
	"prompt" text NOT NULL,
	"files" jsonb NOT NULL,
	"resources" jsonb NOT NULL,
	"checklist" jsonb NOT NULL,
	"run_demo" jsonb
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"role" text NOT NULL,
	"perm" text NOT NULL,
	"allowed" boolean NOT NULL,
	CONSTRAINT "permissions_role_perm_pk" PRIMARY KEY("role","perm")
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"user_id" text NOT NULL,
	"module_id" text NOT NULL,
	"steps" jsonb NOT NULL,
	"built_at" bigint,
	"deployed_at" bigint,
	"runtime" text,
	"issue" text,
	"last_run" jsonb,
	CONSTRAINT "progress_user_id_module_id_pk" PRIMARY KEY("user_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"channel" text NOT NULL,
	"on" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upgrade_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"source" text NOT NULL,
	"at" bigint NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"desc" text NOT NULL,
	"cat" text NOT NULL,
	"type" text NOT NULL,
	"tier" "tier" NOT NULL,
	"size" text NOT NULL,
	"dl" integer DEFAULT 0 NOT NULL,
	"updated" bigint NOT NULL,
	"exec" boolean NOT NULL,
	"status" text NOT NULL,
	"storage_key" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"n" integer NOT NULL,
	"title" text NOT NULL,
	"start" bigint NOT NULL,
	"mins" integer NOT NULL,
	"zoom" text NOT NULL,
	"live" boolean DEFAULT false NOT NULL,
	"attended" integer,
	"replay" text,
	"views" integer DEFAULT 0 NOT NULL,
	"moved_from" bigint
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"seats" integer DEFAULT 7 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" "tier" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"seats" integer NOT NULL,
	"blurb" text NOT NULL,
	"features" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"tier" "tier",
	"role" text,
	"team_id" text,
	"cohort_id" text,
	"joined" bigint,
	"last" bigint,
	"status" text,
	"reminded" bigint,
	"nudged" bigint,
	"staff_role" text,
	"prefs" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
