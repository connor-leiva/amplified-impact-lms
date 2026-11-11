ALTER TABLE "orders" DROP CONSTRAINT "orders_plan";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_option";--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_kind";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan" CHECK ("orders"."plan" in ('library', 'cohort', 'agents', 'membership'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_option" CHECK ("orders"."option" in ('full', 'two_pay', 'upfront', 'upto15', '16to40', 'year_upfront', 'monthly'));--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_kind" CHECK ("plans"."kind" in ('library', 'cohort', 'agents', 'membership'));