-- D-172 R2-gaps: two nullable columns, nothing else (additive). The Resource Vault's "Attached to"
-- (the AI Employee a resource is attached to, set by Edit details) and a past session's replay link
-- (Attach replay). No foreign key: deleting a draft AI Employee leaves its resources reading "—".
-- Regenerated with `db:generate` whenever its base gains a migration, so it always comes last.
ALTER TABLE "resources" ADD COLUMN "module_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "replay_url" text;
