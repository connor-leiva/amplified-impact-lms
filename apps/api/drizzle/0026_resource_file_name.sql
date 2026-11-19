-- D-188: one nullable column, nothing else (additive). A vault file's own name, as uploaded, for its
-- download's Content-Disposition. Like `storage_key`, it is never in a snapshot: the Vault's upload
-- actions write it beside the snapshot's columns (`routes/admin-actions.ts`).
ALTER TABLE "resources" ADD COLUMN "file_name" text;