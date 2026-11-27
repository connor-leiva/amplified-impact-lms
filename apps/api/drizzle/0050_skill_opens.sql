-- R-5 Phase 7 (D-268): which skill a learner opened, per program-zone day. Additive only: a new table, and no row
-- written. People › Utah Life's "Most opened" card reads it (the group's agents' opens in the last 30 days); nothing
-- recorded which skill was opened before it, so the card fills from the day it ships. `usage_daily` keeps counting
-- every guide view as before.
--
--   skill_opens_daily.day       the program-zone calendar day, YYYY-MM-DD (as `usage_daily.day`)
--   skill_opens_daily.user_id   the learner (staff and a masquerade count nothing, as `recordUsage`)
--   skill_opens_daily.skill_id  the skill whose guide they opened
--   skill_opens_daily.count     how many times that day
CREATE TABLE IF NOT EXISTS "skill_opens_daily" (
	"day" text NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "skill_opens_daily_day_user_id_skill_id_pk" PRIMARY KEY("day","user_id","skill_id"),
	CONSTRAINT "skill_opens_daily_day" CHECK ("skill_opens_daily"."day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "skill_opens_daily_count" CHECK ("skill_opens_daily"."count" > 0)
);
