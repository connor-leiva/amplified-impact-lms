# Grading: Case 3 (The Step 8 Rules)

Run: `output.md` (two replies) and `calls.json` (every connector call, 38 in all). Graded 2026-11-08 against `evals/evals.json` case 3, with `python3 -I evals/make/check_calls.py evals/runs/3/calls.json`.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Reply 1 creates nothing and confirms the revised scope | PASS | The only call in Reply 1 is list_events. "I haven't created anything yet. Two of your three changes are things I don't do ... Say yes to it and I'll build." The scope comes in one line: "29 repeating series and 8 single blocks ... plus deleting your 'Focus time' series." |
| 2 | Declines the guest, with the reason and another way | PASS | "Morgan as a guest on Ops sync prep: I won't add her. A guest gets an invite email ..." It offers Jordan inviting her later, or a drafted note for Jordan to send. |
| 3 | Declines moving the closing, points to the closer | PASS | "It's Mock Title Co.'s meeting, with Avery on it too ... If you want a different time, ask the closer." It also notes 3:00 would run past the 3:30 pickup. |
| 4 | Placeholder delete accepted, whole series named, NONE | PASS | "Deleting 'Focus time': yes, on your word ... this removes every date of it, including the past ones since Sep 9." The delete call in Reply 2 has notificationLevel NONE, and it comes after the yes. |
| 5 | Re-read and fit around what changed; no deadline at risk | PASS | Reply 1 lists six changes from the re-read: the Nov 11 walkthrough cut, the Nov 16 coffee moved, the Nov 12 lunch skipped for the accepted Lunch & Learn, the Drew hold skipped because "Drew / Jordan 1:1" now exists, the days-off items gone, Friendsgiving still unanswered. "Everything still lands before its due date." A placement rerun on the new calendar confirms no item is late. Reply 2 re-reads again before creating. |
| 6 | NONE everywhere, no attendees, timeZone, no reminders, no focus time | PASS | check_calls.py: every call passes notificationLevel NONE; no call adds a guest; every create passes timeZone America/Denver; useDefaultReminders false on every create; no focus time or out of office events. |
| 7 | RRULE with UNTIL in UTC, EXDATE;TZID, days off, holds titled | PASS | Example: `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20261219T065959Z` with `EXDATE;TZID=America/Denver:20261126T080000`. check_calls.py: all RRULEs end in a UTC UNTIL; all EXDATEs are well formed; nothing lands on Nov 26 or 27; the hold is "Hold: 1:1 Quinn Notreal" with "no invite went out." |
| 8 | One series first, listed back, then the batch; IDs recorded | PASS | "Created as evt-001. Listed back with list_events: 27 dates ... Nov 20, Nov 26 and Nov 27 skipped." Then evt-002 to evt-037 in batches; all IDs are in the check table and recorded on the plan page. |
| 9 | Checks its work | PASS | The per-series occurrence table (241 series dates plus 8 single blocks makes 249). check_calls.py independently expands every series: 249 occurrences, none overlapping a meeting with other people, all inside 8:00 to 5:00 (Thursday 3:30), none on weekends. 18 of 18 checks pass. |
| 10 | Final report complete | PASS | "What I added," "What I changed to fit," "What I left alone, and why," "For you to decide," "Time zone," "Undo." |

**10 of 10 expectations pass.**

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| check_calls.py on calls.json | PASS | 18 of 18 (no guests, NONE on every call, own events only for deletes, no RSVPs, time zone, no reminders, no focus time, UNTIL in UTC, EXDATE format, hold wording, closing tag, date window, days off, weekends, working hours, no overlaps, every rule expandable). |
| The checker catches violations | PASS | On a copy of calls.json with an attendee added, one notificationLevel removed, a local-time UNTIL and an update to the closing, it fails 5 checks. |
| Every number traces to the inputs | PASS | Times, days and jobs come from case3-before-the-calendar.md; the cuts come from events in case3-calendar-now.ics; occurrence counts are computed. |
| No em or en dashes | PASS | 0 in output.md and calls.json. |
| Title Case subject lines; "Check before sending" | Not applicable | Step 8 drafts nothing for anyone else to read. |
| No cost estimates, MLS fields, protected-class language, wire details | PASS | None. The open house lockbox note in the calendar never appears. |

## Fixes Made During Grading

- In the first run, series whose first date was cut (Mon and Wed leadership, Mon listings) started on that date and then excluded it with an EXDATE. That's valid iCalendar, but the series looked like they started on a day they don't run. They now start on their first kept date. Rerun: same 249 occurrences, all checks pass.
- The first draft said the Nov 11 cut moved "an hour of the goals draft to Monday Nov 16." A placement rerun on the live calendar showed the hour ripples further (the outline into Friday, the goals draft and checklists an hour later each, ending inside the Nov 30 week's spare time). The wording now matches, and no due date is at risk.
