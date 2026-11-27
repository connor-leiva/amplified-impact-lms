-- A comped Accelerator team is an order whose origin is 'comp': amount 0, no Stripe ids.
-- Additive: the previous check allowed 'offer' and 'payment_link', and both still pass.
-- No column is added, dropped, renamed or retyped, and no row is written.
ALTER TABLE "orders" DROP CONSTRAINT "orders_origin";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_origin" CHECK ("orders"."origin" in ('offer', 'payment_link', 'comp'));
