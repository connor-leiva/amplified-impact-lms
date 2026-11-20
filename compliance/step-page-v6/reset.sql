-- The test learner's starting point for the v6 step page's tests (D-210), as prepare.ts `reset` writes it:
-- step 1 done, step 5 waiting (nothing on step 4 checked), nothing checked on step 2, no video progress, every
-- Reference row closed. Only a learner flagged as the seeded test account (D-200).
--   psql "$DATABASE_URL" -v email=<SEED_TEST_MEMBER_EMAIL> -f compliance/step-page-v6/reset.sql
\set ON_ERROR_STOP on
\set QUIET on
select id as uid from users where lower(email) = lower(:'email') and is_test \gset
begin;
delete from checklist_state where user_id = :'uid' and module_id = 'accelerator-week-0';
delete from video_progress where user_id = :'uid';
delete from learner_prefs where user_id = :'uid';
insert into progress (user_id, module_id, steps) values (:'uid', 'accelerator-week-0', '["c1"]'::jsonb)
  on conflict (user_id, module_id) do update set steps = excluded.steps, built_at = null, deployed_at = null;
commit;
