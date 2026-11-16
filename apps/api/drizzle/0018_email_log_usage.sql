CREATE TABLE "email_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" bigint NOT NULL,
	"to" text NOT NULL,
	"user_id" text,
	"template" text NOT NULL,
	"subject" text NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text,
	"status" text NOT NULL,
	"error_kind" text,
	CONSTRAINT "email_log_status" CHECK ("email_log"."status" in ('sent', 'failed', 'skipped')),
	CONSTRAINT "email_log_provider" CHECK ("email_log"."provider" in ('resend', 'outbox', 'log')),
	CONSTRAINT "email_log_error_kind" CHECK (("email_log"."status" = 'failed' and "email_log"."error_kind" in ('invalid_recipient', 'subject', 'render', 'config', 'provider')) or ("email_log"."status" <> 'failed' and "email_log"."error_kind" is null))
);
--> statement-breakpoint
CREATE TABLE "usage_daily" (
	"day" text NOT NULL,
	"user_id" text NOT NULL,
	"team_id" text,
	"kind" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "usage_daily_day_user_id_kind_pk" PRIMARY KEY("day","user_id","kind"),
	CONSTRAINT "usage_daily_day" CHECK ("usage_daily"."day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "usage_daily_kind" CHECK ("usage_daily"."kind" in ('sign_in', 'lesson_play', 'guide_view', 'session_join')),
	CONSTRAINT "usage_daily_count" CHECK ("usage_daily"."count" > 0)
);
--> statement-breakpoint
CREATE INDEX "email_log_at_idx" ON "email_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "email_log_user_idx" ON "email_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_log_template_idx" ON "email_log" USING btree ("template");--> statement-breakpoint
CREATE INDEX "usage_daily_team_idx" ON "usage_daily" USING btree ("team_id","day");