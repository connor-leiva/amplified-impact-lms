CREATE TABLE "masquerade_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_user_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"started_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"hard_expires_at" bigint NOT NULL,
	"extend_count" integer DEFAULT 0 NOT NULL,
	"ended_at" bigint,
	"end_reason" text,
	"auth_session_id" text NOT NULL,
	"staff_auth_session_id" text NOT NULL,
	"started_from" text,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "masquerade_sessions_reason" CHECK (char_length("masquerade_sessions"."reason") between 10 and 500),
	CONSTRAINT "masquerade_sessions_not_self" CHECK ("masquerade_sessions"."staff_user_id" <> "masquerade_sessions"."target_user_id"),
	CONSTRAINT "masquerade_sessions_end_reason" CHECK (("masquerade_sessions"."ended_at" is null and "masquerade_sessions"."end_reason" is null) or ("masquerade_sessions"."ended_at" is not null and "masquerade_sessions"."end_reason" in ('exit', 'expired', 'signed_out', 'revoked'))),
	CONSTRAINT "masquerade_sessions_expiry" CHECK ("masquerade_sessions"."expires_at" <= "masquerade_sessions"."hard_expires_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "masquerade_sessions_one_live_idx" ON "masquerade_sessions" USING btree ("staff_user_id") WHERE "masquerade_sessions"."ended_at" is null;