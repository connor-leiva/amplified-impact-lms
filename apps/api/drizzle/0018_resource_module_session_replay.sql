-- D-172 R2-gaps: two nullable columns, nothing else (additive). The Resource Vault's "Attached to"
-- (the AI Employee a resource is attached to, set by Edit details) and a past session's replay link
-- (Attach replay). No foreign key: deleting a draft AI Employee leaves its resources reading "—".
-- Its final number is 0023, after the chain's 0018-0022 (regenerated when #153's final branch merges).
ALTER TABLE "resources" ADD COLUMN "module_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "replay_url" text;
