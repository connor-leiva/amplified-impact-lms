-- A skill bought on its own (Connor, 2026-11-23): $37 once, lifetime access to that skill including
-- later updates. A full refund sets refunded_at and ends access. Not an order and not a plan.
-- user_id is the buyer. account_id is their team's account when they have one, and does not share
-- the skill with the team. order_id stays null. Additive: a new table only.
CREATE TABLE "skill_purchases" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "account_id" text,
  "skill_id" text NOT NULL,
  "order_id" text,
  "stripe_session_id" text NOT NULL,
  "stripe_payment_intent_id" text,
  "amount" integer,
  "purchased_at" bigint NOT NULL,
  "refunded_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX "skill_purchases_session_idx" ON "skill_purchases" ("stripe_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "skill_purchases_user_skill_idx" ON "skill_purchases" ("user_id", "skill_id");
--> statement-breakpoint
CREATE INDEX "skill_purchases_payment_intent_idx" ON "skill_purchases" ("stripe_payment_intent_id");
