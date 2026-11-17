CREATE TABLE "staff_notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint NOT NULL,
	"deleted_at" bigint,
	"deleted_by" text,
	"delete_reason" text,
	CONSTRAINT "staff_notes_target_type" CHECK ("staff_notes"."target_type" in ('workspace', 'user')),
	CONSTRAINT "staff_notes_body" CHECK (char_length("staff_notes"."body") between 1 and 2000),
	CONSTRAINT "staff_notes_deleted" CHECK (("staff_notes"."deleted_at" is null and "staff_notes"."deleted_by" is null and "staff_notes"."delete_reason" is null) or ("staff_notes"."deleted_at" is not null and "staff_notes"."deleted_by" is not null and char_length("staff_notes"."delete_reason") between 10 and 500))
);
--> statement-breakpoint
CREATE INDEX "staff_notes_target_idx" ON "staff_notes" USING btree ("target_type","target_id");--> statement-breakpoint
-- D-158: staff notes are immutable (spec § 7.3). A DELETE always raises. An UPDATE raises unless it is
-- the one soft delete: the body, target, author and time unchanged, and the note not deleted before.
-- Row-level, so it judges each row the statement touches; the deletion columns' own CHECK makes the
-- three of them all-or-nothing. TRUNCATE is not covered, as on `audit_log` (migration 0015).
CREATE FUNCTION "staff_notes_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'staff_notes are immutable: DELETE is not allowed' USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.deleted_at IS NOT NULL
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.target_type IS DISTINCT FROM OLD.target_type
     OR NEW.target_id IS DISTINCT FROM OLD.target_id
     OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'staff_notes are immutable: only one soft delete is allowed' USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "staff_notes_immutable" BEFORE UPDATE OR DELETE ON "staff_notes" FOR EACH ROW EXECUTE FUNCTION "staff_notes_immutable"();
