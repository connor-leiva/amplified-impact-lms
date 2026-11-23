-- A skill purchase can be stored before the buyer has an account (the stopgap Payment Link, while
-- guest checkout is off). `email` is how it is claimed later. `user_id` may be null until then.
-- The GHL columns match `orders`, so the same retry loop can copy the contact. Additive only.
ALTER TABLE "skill_purchases" ADD COLUMN "email" text;
ALTER TABLE "skill_purchases" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_contact_id" text;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_synced_at" bigint;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_next_attempt_at" bigint;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_error" text;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_sync_stamp" text;
ALTER TABLE "skill_purchases" ADD COLUMN "ghl_last_attempt_at" bigint;
CREATE UNIQUE INDEX "skill_purchases_email_skill_idx" ON "skill_purchases" USING btree ("email","skill_id") WHERE "user_id" is null;
