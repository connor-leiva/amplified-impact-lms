-- R-5 Phase 5 (D-262): selling a seat in a cohort. Additive only: nullable columns with no defaults, so every existing
-- row reads back exactly as it did (a null is an absent key, D-173). Nothing is dropped, renamed or retyped, and no row
-- is written: December's values are copied onto its record by the one-time data step `2026-11-27-december-selling`.
--
--   cohorts.founding             founding, yes or no
--   cohorts.founding_closes_at   when founding prices stop selling (epoch ms), shown and edited as MT / CT
--   cohorts.lookup_key_full      paid in full's Stripe lookup key (made by hand in Stripe; the code never creates one)
--   cohorts.lookup_key_rollover  the Insiders key the full cart carries, and that two payments roll onto
--   cohorts.lookup_key_two_pay   two payments' lookup key
--   cohorts.two_pay              whether two payments are offered
--   cohorts.link_full            paid in full's Payment Link address (https)
--   cohorts.link_two_pay         two payments' Payment Link address (https)
--   cohorts.ghl_value            GoHighLevel's Cohort field value (Q-33)
--   cohorts.enrollment_closed_at when Close enrollment was pressed (epoch ms); null while enrollment is open. Close
--                                writes this and never `status` (PLAN.md § 2.5: R-5 never writes `live` or `completed`)
--   orders.cohort_id             the checkout's `ai_cohort`; null for none, which is December, forever
--
-- The seat cap is `cohorts.capacity` and the included-time end `cohorts.included_until`, both already here. No price
-- amount is stored: the price is Stripe's, read through the lookup keys (PLAN.md § 10.5).
ALTER TABLE "cohorts" ADD COLUMN "founding" boolean;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "founding_closes_at" bigint;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "lookup_key_full" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "lookup_key_rollover" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "lookup_key_two_pay" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "two_pay" boolean;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "link_full" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "link_two_pay" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "ghl_value" text;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "enrollment_closed_at" bigint;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_link_full" CHECK ("cohorts"."link_full" is null or "cohorts"."link_full" ~ '^https://');
--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_link_two_pay" CHECK ("cohorts"."link_two_pay" is null or "cohorts"."link_two_pay" ~ '^https://');
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cohort_id" text;
