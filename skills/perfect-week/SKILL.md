---
name: perfect-week
description: "Plans someone's ideal working week from their real calendar and task list: a weekly template, a check of every task against the hours the week really has, bigger projects placed week by week through an end date, hand-offs, and a summary for their manager. Then, only after a clear yes, it builds the blocks in Google Calendar with no guests and no invites. Works from a connected calendar or from an exported calendar (.ics) and a task list (CSV, Excel, a ClickUp, Asana or Todoist export). Use this whenever an agent, team leader or operator asks about time blocking, their calendar, too many meetings, an ideal week, plan my week, protecting prospecting time, fitting showings and listing appointments around everything else, feeling behind, or work-life balance, or attaches a calendar export or task list and asks what fits, even if they never say 'perfect week' or 'time blocking.' Not for turning the inbox and the day's meetings into follow-ups, drafts and delegations (use inbox-meeting-follow-through)."
metadata:
  author: Amplified Impact
  version: "1.1"
compatibility: "Builds the week in Google Calendar through the Google Calendar connector (step 8). Without it, the plan works from an exported calendar (.ics) and the skill hands back an .ics file to import. Task (ClickUp, Asana) and meeting-notes (Granola) connectors are optional; a task list CSV or spreadsheet works instead. Needs code execution for the plan page, reading exports and large calendar ranges."
---

# Perfect Week

Help someone get their calendar under control. Design the week they'd want, check it against everything on their plate, place their bigger projects, and then, only with their go-ahead, build it in Google Calendar without inviting anyone.

People usually ask for this when they feel behind. Keep each step short and concrete, and aim for a week they could live with, not one that fills every minute.

Run, Draft, Own: you read their calendar and tasks, do the hour math and lay out the week. The plan page, the summary and every calendar block are drafts they review first. Nothing is written to their calendar before step 8's clear yes, no one is ever invited, and they decide what they take on, hand off or drop, and have every conversation with their manager, team and clients themselves.

## The steps

Go in this order. Pause after each step so they can react, and let them stop anywhere: each step is useful on its own. If they'd rather see it all at once, run steps 3 to 7 in one pass, and still stop for step 8's yes.

1. Intake: a few questions about hours, limits and tools.
2. Read their calendar, tasks and recent meetings (read-only).
3. The perfect week: a weekly template.
4. Task check: does the week cover what they owe?
5. Projects: bigger work placed week by week through an end date.
6. Hand-offs: what other people should take.
7. A summary they can share with their manager.
8. Build it in Google Calendar.

Steps 3 to 6 all build one plan page, so they end with a single link. Read `references/plan-page.md` before step 3: it says how to build the page and which section each step adds.

Plan first, calendar second. Nothing is written to their calendar or task tool before step 8, and step 8 needs a clear yes.

## 1. Intake

Ask before anything else (with AskUserQuestion if it's available, up to four questions at a time; otherwise in plain text). Don't ask for anything you can read yourself in step 2, including anything in a file they attached.

- Working hours and time zone, e.g. 9:00 to 5:30 Central. Hard stops (school pickup, a class) and how they like lunch. For agents, the windows they keep for showings, listing appointments and open houses: that's client time inside their week, not overflow.
- Evenings and weekends. Default to none, and say that's the default. Offer overflow time only as something they choose, with a cap they set (e.g. two evenings, 7:30 to 9:30). For someone short on balance, the plan helps most by showing clearly what fits in their working hours.
- Who can take work: people who report to them, peers, a manager they can renegotiate with, or nobody. On a team that may be an ops manager, an assistant, an ISA or the transactions team.
- Where their work lives: which calendar, which task tool (ClickUp, Asana, a list), and whether they keep meeting notes (Granola or similar). If nothing is connected, ask them to attach an exported calendar (.ics) and a task list (CSV or spreadsheet); `references/reading-exports.md` says where each comes from.
- The end date for planning (default: end of the current quarter), plus days off, travel and holidays before then.
- Anything already agreed with their manager (for a team leader, the owner or partner they answer to): meetings that must stay, targets like "about 4 hours a week on client X" or "5 hours a week on recruiting".

## 2. Read what's there (read-only)

Calendar
- Pull today through the end date with the calendar connector's list tool, passing their working time zone (an IANA name such as America/Chicago) every time. Leave it out and times come back in the calendar's own zone, which may not be where they work.
- Check the calendar's own zone (the timeZone field in the list response). If it differs from their working zone, tell them: anything you create will look shifted in their calendar view, even though it's at the right time.
- Big date ranges often exceed the tool's output limit and get saved to a file. Parse the file with a short script instead of reading it by eye. Use pageSize 250 and follow nextPageToken until it's gone.
- From an attached .ics instead: parse it with a script, following `references/reading-exports.md` (repeating series, skipped and moved dates, time zones, who organized what). An export is a snapshot, so say what date it's from.
- Sort what you find:
  - Fixed: anything with other attendees or another organizer, answered or not. Leave these exactly as they are.
  - Their own named blocks (a class, a showing, a listing appointment, "TIMEBLOCK: board prep"): treat as fixed.
  - Their own generic placeholders ("Focus time", "Implementation time"): new blocks can sit on top of these and give them a job. Offer to clear them; don't delete them unasked.
  - Broadcast invites with no other guests and no reply (a team social, a webinar): ask whether they're going.
  - Contract deadlines the transactions team puts on the calendar (due diligence, settlement): dates that drive the blocks, owned by that team. Don't move, copy or track them, and label them "confirm dates with your transactions team."
- Note the patterns: weekly meetings, every-other-week meetings (check the real dates, since they often skip or shift around holidays), monthly reviews, meetings outside their hours, and double-bookings.

Tasks (from a task connector, or an attached CSV or spreadsheet)
- Open tasks assigned to them that are overdue or due before the end date: title, due date, status, list or project, and any time estimate. Get today's date from the tool or the shell before turning "this week" into dates. From a file, read its own columns (`references/reading-exports.md` maps the common ones) and keep only their open tasks.

Meetings (if a meeting-notes connector is available)
- The last few weeks of notes: commitments they made, standing agreements ("1:1 every Wednesday"), deadlines. Check the transcript when an exact detail matters.

If a source isn't connected or attached, ask them to attach an export or paste what you need rather than guessing at their workload. Never ask them to retype what a file already holds.

## 3. The perfect week

Build one weekly template, with A/B variations where something happens every other week. Fill it in this order:

1. Existing fixed meetings, where they are.
2. Daily rituals: a 15-minute launch (pick the day's top 3), one or two comms sweeps, a 15-minute shutdown. A weekly review near the end of the week to plan the next one.
3. Lunch every day, and short breaks between long stretches.
4. Focus blocks for each area of their work. Give each one a specific job ("L10 prep: final scorecard, issues list, rock status", "Prospecting: past-client calls from your CRM list") instead of a label like "work time". Put prep right before the meeting it feeds (listing presentation prep before a listing appointment) and follow-through right after it.
5. Holds for new recurring meetings the plan needs, such as a 1:1. Skip a hold if that meeting already exists on the calendar under any name.
6. Open time. A week packed to the minute breaks the first time something urgent lands, so leave roughly an hour a day unassigned unless they want it tighter.

Keep everything inside their working hours, respect any targets they gave, and total the hours by area.

Publish the plan page with the header, The week, Where the hours go, What each block is for, Team cadence, and Dates that drive the blocks. Flag the problems you found (double-bookings, meetings outside hours, invites that need fixing) on the blocks they affect.

Ask what they'd change before moving on.

## 4. Task check

For every task from step 2, decide:
- Where it lands: a specific block, or a recurring meeting. Items that need to come up in a recurring meeting go to that meeting first.
- The action: do it, hand it off, re-date it, park it, close or merge it, or wait on someone. Transaction file work (deadline tracking, compliance, under-contract updates) is the transactions team's: hand it off or wait on them, not hours in their week.
- Hours: their estimate, or yours, labeled as yours.

Then compare hours needed with hours the blocks provide, week by week, through the end date, and show the gap plainly. If it doesn't fit, say what you'd change: re-date, hand off, drop. Don't close a gap with evening work they didn't choose.

Add Recurring work and Task check to the plan page. Don't change their task tool unless they ask.

## 5. Projects through the end date

List their bigger projects from the tasks, notes and what they tell you. Treat this as the full scope through the end date unless they say otherwise, but expect some projects to grow.

Break each project into deliverables, each with hours, an earliest start and a due date. Place them week by week, earliest due date first:
1. Into the daytime focus blocks for that area.
2. Only if they opted in: into their evening or weekend slots, up to their cap. Give each slot one or two named deliverables, not "project time".

Leave growth room (unassigned project hours after the busiest stretch) and an ordered list of what moves to next quarter first if scope grows. Report anything that can't finish by its due date.

Add Projects to the plan page, and Evenings and weekends if they opted in.

## 6. Hand-offs

If they have people to hand work to, list who takes what: weekly items and one-time items, with hours per week. Ask how much each person can take on, and show each person's weekly load against that cap.

If there's no one to delegate to, make this a short list to raise with their manager: what to re-date, re-scope or move to someone else, and why.

Add Hand-offs to the plan page.

## 7. Shareable summary

Make a clean version for their manager: the week, hours by area, the project timeline, the hand-offs and the asks. Use the session's document tool (it can export a PDF) or make a PDF. Carry over the main visuals as charts: the week board, hours by area, project hours by week, hand-off loads, and the timeline. End your reply with "Check before sending": every date, hour total, meeting, name and ask in the summary, for them to verify before it goes anywhere.

Leave out anything personal or sensitive: health, pay, comp splits, commission and other dollar amounts, clients' personal details, private appointments. Calendars and documents get seen by coworkers, so keep the same rule for event titles and descriptions in step 8.

## 8. Build it in Google Calendar

Fill in Before the calendar on the plan page, then get a clear yes. Confirm the scope in a line (which blocks, from when, through when), then go. A yes that comes with changes you can't make (adding a guest, moving someone else's meeting) isn't a yes yet: say what you'll do instead and confirm the new scope. If no calendar connector is available, or it can't create events, stop after step 7 and offer two ways forward: help them connect one, or a calendar file they import themselves (`references/calendar-build.md`).

Three rules protect the people on their calendar:
- No invites. Never add attendees, and pass notificationLevel NONE on every create, update and delete. That is what guarantees nobody gets an email, holds included.
- Hands off other people's meetings. No edits, moves, deletes or RSVPs on anything with other attendees or another organizer.
- Don't delete their own events. If an old placeholder clashes with the plan, offer to clear it and wait for a yes.

Before creating anything
- Re-read the calendar. Calendars change fast, and the plan may be days or weeks old. Fit the plan around what's there now:
  - Skip holds for meetings that now exist.
  - Cut each block around new fixed meetings. Drop pieces too short to use (under 30 minutes for focus, under 15 for rituals) and keep a list of every change.
  - If a cut costs project hours before a deadline, move that work to another open block that week and say so.
- Skip their days off, travel and holidays.

Creating events (`references/calendar-build.md` has the connector's settings, checked 2026-11-08)
- Pass their working time zone on every create.
- Repeating blocks become recurring series: RRULE:FREQ=WEEKLY with BYDAY and an UNTIL in UTC (or COUNT), plus EXDATE;TZID=Area/City:YYYYMMDDTHHMMSS for skipped dates. When a block's job changes partway (Tuesday 10:00 is "Books cleanup" for two weeks, then "Dashboard build"), split it into separate series.
- Dated work (evening and weekend project blocks, one-off sessions) becomes single events.
- Title holds "Hold: [meeting]" and say in the description that no invite went out.
- Each description gives the block's job, the deliverables for each date on project blocks, and a closing tag like "From your plan (added by Claude on [date]). Solo block: no guests, no invites." The tag makes the whole set easy to find later.
- Color by area to match the plan page. No reminders on routine blocks (pass useDefaultReminders false, or the calendar's defaults fire); a 10-minute reminder on evening or weekend blocks if they want one. Mark reserve or growth blocks as free so they don't block anyone. Create plain events, never focus time or out of office, which can decline other people's meetings for them.
- Create one recurring event first, list it back, and check its times and skipped dates. Then create the rest in parallel batches, and record every event ID so the set can be changed or removed in one pass.

Check your work
- Re-read the full range. Confirm each series has the expected number of occurrences at the expected times, nothing you created has attendees, and nothing overlaps a meeting with other people.
- Update the plan page so Before the calendar records what was built, and the week board matches the calendar.
- Then tell them briefly: what you added, what you changed to fit, what you left alone and why, anything they need to decide (a placeholder to clear, an RSVP that affects a block), the time zone note if it applies, and that you can undo it all.

## Guardrails

- Every meeting, task, date and hour comes from their calendar, tasks, notes or what they tell you. Label your own hour estimates as yours, and never fill a missing deadline with a guess.
- Stay in lane: the transactions team owns contract deadlines and file work, and the CRM owns who to call. A prospecting block protects the time; the call list comes from Follow Up Boss or their CRM.
- No promises that a better week brings more closings, production or income.
- Read-only everywhere except step 8's calendar build: no RSVPs, no task tool or CRM changes unless they ask, nothing sent.

## Tone

Warm and direct. They may feel behind, and the plan should make the week feel possible, not more crowded. Name trade-offs plainly. If the work doesn't fit in their hours, say so and help them prepare the conversation with their manager instead of hiding the overflow in their evenings.

## Output, In This Order

Each step's reply:
1. Bottom line (three sentences max): what the step found and the one thing they need to decide.
2. What changed on the plan page, with the link, and the problems flagged.
3. The question for them before the next step.

Step 7 adds the summary, then "Check before sending." Step 8 ends with what was added, changed and left alone, the decisions, the time zone note if it applies, and how to undo it.
