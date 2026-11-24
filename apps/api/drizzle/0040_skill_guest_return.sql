-- H-1 (Week 0 launch audit): the $37 guest return signs in only the account its own checkout created,
-- and only once. `created_user_id` is that account, set by the purchase that created it;
-- `guest_entered_at` is when the return spent the checkout. Additive only: two nullable columns, no
-- default, no rewrite of existing rows (null reads as "not created here" and "never entered").
ALTER TABLE "skill_purchases" ADD COLUMN "created_user_id" text;--> statement-breakpoint
ALTER TABLE "skill_purchases" ADD COLUMN "guest_entered_at" bigint;
