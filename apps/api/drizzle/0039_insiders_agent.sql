ALTER TABLE "orders" DROP CONSTRAINT "orders_plan";--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_kind";--> statement-breakpoint
ALTER TABLE "access_groups" DROP CONSTRAINT "access_groups_plan";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan" CHECK ("orders"."plan" in ('library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent'));--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_kind" CHECK ("plans"."kind" in ('library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent'));--> statement-breakpoint
ALTER TABLE "access_groups" ADD CONSTRAINT "access_groups_plan" CHECK ("access_groups"."plan" in ('library', 'cohort', 'agents', 'membership', 'agent_plan', 'insiders_agent'));