CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" bigint NOT NULL,
	"actor_user_id" text,
	"actor_role" text,
	"actor_source" text NOT NULL,
	"masquerade_session_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"target_label" text,
	"reason" text,
	"before" jsonb,
	"after" jsonb,
	"outcome" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"request_id" text,
	CONSTRAINT "audit_log_outcome" CHECK ("audit_log"."outcome" in ('ok', 'denied', 'blocked', 'failed')),
	CONSTRAINT "audit_log_actor_source" CHECK ("audit_log"."actor_source" in ('staff', 'system')),
	CONSTRAINT "audit_log_staff_actor" CHECK ("audit_log"."actor_source" = 'system' or "audit_log"."actor_user_id" is not null)
);
--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
-- D-157: the audit log is append-only (spec § 7.8, D6). Any UPDATE or DELETE statement against it
-- raises, whoever runs it and whether or not it matches a row, so no code path (and no hand-typed
-- query) can rewrite or remove history. Statement-level, so a `delete ... where false` raises too.
-- TRUNCATE is not covered: the test harness empties every table with it between tests, and only the
-- database owner can run it, who could drop this trigger anyway.
CREATE FUNCTION "audit_log_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_append_only"();
