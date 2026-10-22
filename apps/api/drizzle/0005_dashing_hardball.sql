ALTER TABLE "ai101_waitlist" ADD COLUMN "team_size" text;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD COLUMN "december_interest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai101_waitlist" ADD CONSTRAINT "ai101_waitlist_team_size" CHECK ("ai101_waitlist"."team_size" is null or "ai101_waitlist"."team_size" in ('1-10', '11-25', '26-50', '51+'));