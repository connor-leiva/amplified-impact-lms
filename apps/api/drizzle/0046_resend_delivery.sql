-- D-263: Resend's delivery events on the email log. Additive only: one new table, and nullable columns with no
-- defaults on email_log, so every existing row reads back exactly as it did (a null is an absent value, D-173). A
-- null count reads as 0. Nothing is dropped, renamed or retyped, and no row is written.
--
--   resend_events        every webhook event the log records, once: keyed by the webhook message id (`svix-id`),
--                        the same on every retry, so a redelivery inserts nothing. `email_id` is Resend's id for the
--                        email (`email_log.provider_id`). Only what the fold reads: no recipient, subject, sender,
--                        IP address or user agent. Pruned with the email log after 180 days
--   email_log.delivery_status ... clicked_link
--                        the row's delivery, written whole from `foldResendEvents` over its events after each new
--                        one (and when the row itself is written, for an event that came first)
CREATE TABLE "resend_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"email_id" text NOT NULL,
	"occurred_at" bigint NOT NULL,
	"received_at" bigint NOT NULL,
	"bounce_type" text,
	"bounce_sub_type" text,
	"bounce_message" text,
	"link" text,
	CONSTRAINT "resend_events_type" CHECK ("resend_events"."type" in ('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained', 'email.opened', 'email.clicked'))
);
--> statement-breakpoint
CREATE INDEX "resend_events_email_idx" ON "resend_events" USING btree ("email_id");
--> statement-breakpoint
CREATE INDEX "resend_events_received_idx" ON "resend_events" USING btree ("received_at");
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "delivery_status" text;
--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_delivery_status" CHECK ("email_log"."delivery_status" is null or "email_log"."delivery_status" in ('sent', 'delivered', 'delayed', 'bounced', 'complained'));
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "delivered_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "delayed_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "bounced_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "bounce_type" text;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "bounce_sub_type" text;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "bounce_message" text;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "complained_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "open_count" integer;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "opened_first_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "opened_last_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "click_count" integer;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "clicked_first_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "clicked_last_at" bigint;
--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "clicked_link" text;
--> statement-breakpoint
CREATE INDEX "email_log_provider_id_idx" ON "email_log" USING btree ("provider_id");
