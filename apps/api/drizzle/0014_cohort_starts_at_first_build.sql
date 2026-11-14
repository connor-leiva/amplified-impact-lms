-- D-153: an AI Accelerator plan's skills and course open at the first live build, Wednesday, Dec 2,
-- 2026, 1:00 PM Central (12:00 PM Mountain) = 1796238000000 ms, not at purchase. New plans are written
-- that way (`initialPlanDates`); this moves every Accelerator plan bought before the change to the same
-- instant, test and smoke accounts included, so none can open a paid skill early. Only `cohort` plans:
-- Amplified Insiders, the Team Plan and the Agent Plan keep their dates, and access groups (Utah Life)
-- have no plan rows to move. After Dec 2 it changes nothing, and running it again changes nothing.
UPDATE "plans" SET "starts_at" = 1796238000000 WHERE "kind" = 'cohort' AND "starts_at" < 1796238000000;
