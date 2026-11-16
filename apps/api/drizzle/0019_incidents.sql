CREATE TABLE "incident_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"at" bigint NOT NULL,
	"kind" text NOT NULL,
	"actor_user_id" text,
	"body" text,
	"link" text,
	CONSTRAINT "incident_events_kind" CHECK ("incident_events"."kind" in ('opened', 'signal', 'acknowledged', 'resolved', 'note')),
	CONSTRAINT "incident_events_body" CHECK ("incident_events"."body" is null or char_length("incident_events"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"fingerprint" text,
	"opened_at" bigint NOT NULL,
	"opened_by" text,
	"acknowledged_at" bigint,
	"acknowledged_by" text,
	"resolved_at" bigint,
	"resolved_by" text,
	CONSTRAINT "incidents_severity" CHECK ("incidents"."severity" in ('sev1', 'sev2', 'sev3')),
	CONSTRAINT "incidents_status" CHECK ("incidents"."status" in ('open', 'acknowledged', 'resolved')),
	CONSTRAINT "incidents_title" CHECK (char_length("incidents"."title") between 3 and 200),
	CONSTRAINT "incidents_resolved" CHECK (("incidents"."status" = 'resolved') = ("incidents"."resolved_at" is not null)),
	CONSTRAINT "incidents_acknowledged" CHECK ("incidents"."status" <> 'acknowledged' or "incidents"."acknowledged_at" is not null)
);
--> statement-breakpoint
CREATE INDEX "incident_events_incident_idx" ON "incident_events" USING btree ("incident_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_fingerprint_unresolved_idx" ON "incidents" USING btree ("fingerprint") WHERE "incidents"."status" <> 'resolved';--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");