-- R-5 audit (D-267): a cohort's announcement reaches only that cohort. Additive only: one nullable column with no default,
-- so every existing row reads back exactly as it did (a null is an absent key, D-173). Nothing is dropped, renamed or
-- retyped, and no row is written.
--
--   announcements.cohort_id   the cohort an announcement was sent to from its Cohort › Announcements tab. Null for every
--                             announcement made before this change: it reaches whom it always has (the program's).
ALTER TABLE "announcements" ADD COLUMN "cohort_id" text;
