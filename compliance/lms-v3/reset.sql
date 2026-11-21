-- The test learner's starting point for LMS v3's tests (D-225), as prepare.ts `reset` writes it: step 1 done, step 3
-- in progress (its one check item ticked), step 5 waiting on step 6 (nothing on step 6 ticked), not deployed, only
-- Week 0 open (no early access), the intake a draft holding the package's sample answers (saved Thu Nov 19, 4:02 PM CT),
-- sidebar expanded and light theme (no stored choice), the package's made-up people. Only a learner flagged as the
-- seeded test account (D-200), and the content must have been written by `prepare.ts content` first.
--   psql "$DATABASE_URL" -v email=<SEED_TEST_MEMBER_EMAIL> -f compliance/lms-v3/reset.sql
\set ON_ERROR_STOP on
\set QUIET on
select id as uid, team_id as tid from users where lower(email) = lower(:'email') and is_test \gset
begin;
update users set name = 'Alex Morgan', early_access = false, prefs = coalesce(prefs, '{}'::jsonb) - 'sidebar' - 'theme' where id = :'uid';
update teams set name = 'Northline Realty' where id = :'tid';
delete from checklist_state where user_id = :'uid';
delete from video_progress where user_id = :'uid';
delete from learner_prefs where user_id = :'uid';
insert into progress (user_id, module_id, steps) values (:'uid', 'accelerator-week-0', '["c1"]'::jsonb)
  on conflict (user_id, module_id) do update set steps = excluded.steps, built_at = null, deployed_at = null;
insert into checklist_state (user_id, module_id, step_id, item_id, checked, checked_at, auto)
  values (:'uid', 'accelerator-week-0', 'c3', 's3-time', true, 1795125720000, false);
insert into team_intake (team_id, answers, updated_at, updated_by, submitted_at)
  values (:'tid', $json${"name":"Alex Morgan, alex@northlinerealty.example","team":"Northline Realty, an independent brokerage","size":"9 agents, 3 staff","lead-desk":"me","cadence":"Monday 9:00 AM team meeting, I run it. Thursday 2:00 PM pipeline review, our operations lead runs it.","operator":"A teammate","operator-name":"Our operations lead, ops@northlinerealty.example","ai":"Claude","books":"QuickBooks Online"}$json$::jsonb, 1795125720000, :'uid', null)
  on conflict (team_id) do update set answers = excluded.answers, updated_at = excluded.updated_at,
    updated_by = excluded.updated_by, submitted_at = null;
commit;
