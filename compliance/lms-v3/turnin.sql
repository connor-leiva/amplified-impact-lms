-- D-230: the test learner where a Turn in check starts (the pixel test's `--assume-turnin`), after `reset.sql`: Week 1
-- open (early access: its steps 4 and 6 ask for a file, `prepare.ts content`), and the team's turn-ins as the state has
-- them: nothing (report, checkpoint), or the package's sample report turned in Thu Nov 19, 4:02 PM CT (turned). Only the
-- seeded test account (D-200).
--   psql "$DATABASE_URL" -v email=<SEED_TEST_MEMBER_EMAIL> -v turnin=report|checkpoint|turned -f compliance/lms-v3/turnin.sql
\set ON_ERROR_STOP on
\set QUIET on
\if :{?turnin}
\else
\set turnin report
\endif
select id as uid, team_id as tid from users where lower(email) = lower(:'email') and is_test \gset
begin;
update users set early_access = true where id = :'uid';
delete from submissions where team_id = :'tid';
insert into submissions (team_id, module_id, kind, files, note, minutes, by_user_id, created_at)
  select :'tid', 'accelerator-week-1', 'live_read',
    jsonb_build_array(jsonb_build_object('key', 'submissions/' || :'tid' || '/00000000-0000-4000-8000-000000000001.html', 'name', 'Map Your Spend report (made up).html', 'size', 184000)),
    'Please look at advertising. (Made-up note.)', '', :'uid', 1795125720000
  where :'turnin' = 'turned';
commit;
