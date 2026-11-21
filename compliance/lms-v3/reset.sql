-- The test learner's starting point for LMS v3's tests (D-225), as prepare.ts `reset` writes it: step 1 done, step 3
-- in progress (its one check item ticked), step 5 waiting on step 6 (nothing on step 6 ticked), not deployed, only
-- Week 0 open (no early access), the intake a draft holding the package's sample answers (saved Thu Nov 19, 4:02 PM CT),
-- sidebar expanded and light theme (no stored choice), the package's made-up people. Only a learner flagged as the
-- seeded test account (D-200), and the content must have been written by `prepare.ts content` first.
--   psql "$DATABASE_URL" -v email=<SEED_TEST_MEMBER_EMAIL> [-v state=s7|s8|deployed] -f compliance/lms-v3/reset.sql
-- `state` is the pixel test's `--assume`: s7 (every step but 5, which no longer waits), s8 (all eight) or deployed.
\set ON_ERROR_STOP on
\set QUIET on
\if :{?state}
\else
\set state s1
\endif
select case :'state'
    when 's7' then '["c1","c2","c3","c4","c6","c7","c8"]'
    when 's8' then '["c1","c2","c3","c4","c5","c6","c7","c8"]'
    when 'deployed' then '["c1","c2","c3","c4","c5","c6","c7","c8"]'
    else '["c1"]' end as steps,
  case :'state' when 'deployed' then '1795204800000' else '' end as deployed,
  case :'state' when 's7' then 'c6' else 'c3' end as item_step,
  case :'state' when 's7' then 's6-google' else 's3-time' end as item \gset
select id as uid, team_id as tid from users where lower(email) = lower(:'email') and is_test \gset
begin;
update users set name = 'Alex Morgan', early_access = false, prefs = coalesce(prefs, '{}'::jsonb) - 'sidebar' - 'theme' where id = :'uid';
update teams set name = 'Northline Realty' where id = :'tid';
delete from checklist_state where user_id = :'uid';
delete from video_progress where user_id = :'uid';
delete from learner_prefs where user_id = :'uid';
insert into progress (user_id, module_id, steps, deployed_at)
  values (:'uid', 'accelerator-week-0', :'steps'::jsonb, nullif(:'deployed', '')::bigint)
  on conflict (user_id, module_id) do update set steps = excluded.steps, built_at = null, deployed_at = excluded.deployed_at;
insert into checklist_state (user_id, module_id, step_id, item_id, checked, checked_at, auto)
  values (:'uid', 'accelerator-week-0', :'item_step', :'item', true, 1795125720000, false);
insert into team_intake (team_id, answers, updated_at, updated_by, submitted_at)
  values (:'tid', $json${"name":"Alex Morgan, alex@northlinerealty.example","team":"Northline Realty, an independent brokerage","size":"9 agents, 3 staff","lead-desk":"me","cadence":"Monday 9:00 AM team meeting, I run it. Thursday 2:00 PM pipeline review, our operations lead runs it.","operator":"A teammate","operator-name":"Our operations lead, ops@northlinerealty.example","ai":"Claude","books":"QuickBooks Online"}$json$::jsonb, 1795125720000, :'uid', null)
  on conflict (team_id) do update set answers = excluded.answers, updated_at = excluded.updated_at,
    updated_by = excluded.updated_by, submitted_at = null;
commit;
