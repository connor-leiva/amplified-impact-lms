# Perfect Week: Page Notes

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-08; sources inline.

## The Promise

Turn your real calendar and task list into a week that fits inside your working hours, then build it in Google Calendar without inviting anyone.

## Who It's For

Agents, team leaders and ops staff who feel behind: too many meetings, no protected time for prospecting or the big projects, and evenings that keep getting eaten. It works for one person on their own Claude account, with or without connectors.

## What to Upload, and Where It Comes From

Nothing to type. Either turn on the connectors, or attach two exports.

**Your calendar (one of these)**
- **Google Calendar connector** (best: the skill can also build the week). See "What You Need" below.
- **Google Calendar export (.ics):** on a computer, open Google Calendar. On the left under "My calendars," point to your calendar, click More, then Settings and sharing, then Export calendar. One .ics file downloads. It can't be done from the phone app, and a work account's admin can turn exporting off. (Google Calendar Help, "Export events from your Google Calendar," https://support.google.com/calendar/answer/37111, checked 2026-11-08.)
- **Outlook (classic Outlook for Microsoft 365, 2024 or 2021):** Calendar, select your calendar, then File, Save Calendar, More Options. Set Date Range to cover today through the end of your plan, then OK and Save. (Microsoft Support, "Export an Outlook calendar to Google Calendar," https://support.microsoft.com/en-us/outlook/export-an-outlook-calendar-to-google-calendar, checked 2026-11-08.)

**Your task list (one of these)**
- **ClickUp:** open your List or Table view, click Customize (upper right), then Export, then All columns, CSV, Download. Set Subtasks to "As separate tasks" first. Free Forever and Unlimited plans allow five view exports in all, and the newer Core plan has List view export only as a trial. (ClickUp Help, "Export List and Table views," https://help.clickup.com/hc/en-us/articles/6310174308631-Export-List-and-Table-views, and "Import and export feature availability and limits," https://help.clickup.com/hc/en-us/articles/30782347809815-Import-and-export-feature-availability-and-limits, both checked 2026-11-08.)
- **Todoist:** on the web, open the project, click the three dots (top right), then Import & export, then Export to CSV. (Todoist Help, https://www.todoist.com/help/articles/import-or-export-a-project-as-a-csv-file-in-todoist-YC8YvN, checked 2026-11-08.)
- **Asana:** export the project to CSV from the project's menu. Asana's current menu labels weren't confirmed on 2026-11-08 (its help center wouldn't load for checking), so the page should say "confirm in Asana's help center."
- **A spreadsheet:** Google Sheets: File, Download, Comma-separated values (.csv) (Google Docs Editors Help, https://support.google.com/docs/answer/49114, checked 2026-11-08). Excel files attach as they are.
- **A ClickUp or Asana connector** works instead of a file, read-only.

**Optional:** meeting notes through the Granola connector (it reads your commitments and standing 1:1s). Transcripts need a paid Granola plan (Anthropic's Granola listing, https://claude.com/marketplace/connectors/granola).

**Attaching in Claude:** click "+" in the chat box, then "Add files or photos" (Claude Help Center, "Upload files to Claude," https://support.claude.com/en/articles/8241126-uploading-files-to-claude, checked 2026-11-08). That page lists CSV, TXT, JSON and XLSX among supported types but doesn't name .ics. If Claude won't take the .ics, rename it to .txt and attach it again. Untested: whether claude.ai accepts .ics as is.

## Things to Say to It

1. "Plan my perfect week. My calendar export and ClickUp tasks are attached."
2. "I have too many meetings and never get to my big projects. Can you time-block my week?"
3. "Plan through the end of the quarter. I'm off the 26th and 27th. Morgan can take about 4 hours a week."
4. "Does my workload even fit in 9 to 5? No evenings."
5. "Make a summary I can send my team leader."
6. "Looks good. Build it in my Google Calendar." (Only after you've reviewed it.)

## What Comes Back

- A few intake questions first (hours, hard stops, evenings, who can take work, end date), never about what's already in your files.
- One plan page, built step by step: your week board (with Week A and Week B if your 1:1s alternate), where the hours go, a task check (hours needed against hours available, week by week), projects placed through your end date, hand-offs with each person's load, and the dates that drive it all.
- A summary for your manager or team leader (a PDF), followed by a "Check before sending" list.
- Only after a clear yes: the blocks built in Google Calendar as repeating series, with no guests, no notifications, fitted around anything new on your calendar, then a report of what was added, changed and left alone, with a one-pass undo. Without a connector that can create events: an .ics file you import into its own calendar.

## What It Won't Do

- Invite anyone, add guests, or send any email. Every calendar change goes out with notifications off.
- Touch other people's meetings: no moves, edits, deletes or RSVPs.
- Delete your own events unless you say so.
- Fill your evenings or weekends unless you offer them, with a cap. If the work doesn't fit, it says so and helps you take it to your manager.
- Do the transactions team's job: contract deadlines are shown "for planning; confirm with your transactions team," never tracked or moved.
- Work your CRM: a prospecting block protects the time, and the call list stays in Follow Up Boss or your CRM.
- Change your task tool, unless you ask.

## What You Need

- **A Claude plan with skills, and code execution on.** Anthropic's pages disagree on Free: the Help Center lists skills on Free, Pro, Max, Ultra, Team and Enterprise (https://support.claude.com/en/articles/12512180-use-skills-in-claude), while the claude.com docs list Pro and up (https://claude.com/docs/skills/overview). Say "Pro or higher" to be safe. Code execution is on by default on Free, Pro, Max and Ultra; to check, Settings, then Capabilities, then "Code execution and file creation" (called "Create and edit files" in the newer Settings layout) (https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude, checked 2026-11-08). On Team and Enterprise, an owner turns it on for the organization.
- **To build the week in your calendar: the Google Calendar connector, able to create events.** Anthropic's pages disagree here too. The Help Center says the Google Workspace connectors are "available for all users" and can "create, update, and delete events" (https://support.claude.com/en/articles/10166901-use-google-workspace-connectors). The Claude Docs page says the Google Calendar connector is Pro, Max, Ultra, Team and Enterprise only, and read-only (https://claude.com/docs/connectors/google/calendar). Anthropic's connector listing says it can "create and update events" and lists create_event, update_event and delete_event (https://claude.com/marketplace/connectors/google-calendar). All three pages rechecked 2026-11-08 by the reviewer, and the connector's own tool list in a Claude session that day did include create, update and delete. **What the page should say:** "To have Claude add the blocks for you, connect Google Calendar (Customize, then Connectors). Anthropic's own pages differ on which plans have it and on whether it can add events, so if you can't connect it, or it can only read your calendar, the skill gives you a calendar file to import instead. Everything before that works with no connector at all." On Team and Enterprise, an owner adds the connector first.
- **Connect it:** Customize, then Connectors, find Google Calendar, Connect, sign in. In each chat, turn it on from "+", then Connectors (https://claude.com/docs/connectors/google/calendar, checked 2026-11-08; https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities).
- **Cost:** nothing beyond your Claude plan. The ClickUp export limit above applies on ClickUp's Free Forever, Unlimited and Core plans.
- **Outlook users:** the plan works from an Outlook .ics export, and the skill can hand you an .ics file to import (Outlook.com and Outlook on the web: Calendar, Add calendar, Upload from file; https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web). The skill doesn't build directly in Outlook. Not tested.
- **Privacy:** calendar exports hold client names and addresses. Anthropic doesn't train on Google Calendar connector data, but files you attach are part of the chat. On Free, Pro, Max and Ultra, check Settings, then Privacy, "Help Improve our AI models" (https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings; https://support.claude.com/en/articles/10166901-use-google-workspace-connectors).

## Run, Draft, Own

- **Run:** Claude reads your calendar and tasks, does the hour math, and lays out the week, the task check and the projects.
- **Draft:** the plan page, the summary for your manager, and every calendar block. You review them before anything happens.
- **Own:** you decide what you take on, hand off, re-date or drop, and you have every conversation with your manager, team and clients. Nothing goes on your calendar without your clear yes, and no one is ever invited.

## FAQs

1. **Will it send invites to my team or clients?** No. It never adds guests, and every create, change or delete goes out with notifications off. Holds for new meetings say in the description that no invite went out; you invite people yourself when you're ready.
2. **Can it use my evenings if I'm behind?** Only if you offer specific evenings with a cap, and only if the daytime can't hold the work. In testing, offered evenings stayed empty when the daytime covered everything.
3. **What if nothing is connected?** Attach a calendar export and a task list export. You get everything except the calendar build, and the skill can hand you an .ics file to import into its own calendar (one delete undoes it).
4. **What about my showings and listing appointments?** Client appointments are fixed time, even after hours. The plan builds prep right before them and flags anything outside your hours. It never moves a meeting with a client on it.
5. **Can I undo it?** Yes. Every block carries a tag ("From your plan, added by Claude on [date]"), so the set is easy to find. In the chat where it was built, Claude has every event ID and can remove the whole set in one pass, notifications off. An imported file goes into its own calendar, which you can delete in Settings.

## Practice Prompt

Attach both practice files (`perfect-week-practice-calendar.ics` and `perfect-week-practice-tasks.csv`) and say:

> Plan my perfect week. I'm a team leader and I'm behind on everything. Nothing is connected here; my Google Calendar export and my ClickUp export are attached. I work 8 to 5 Mountain, Monday to Friday, and I'm out by 3:30 on Thursdays for school pickup. Lunch at noon, 30 minutes. No evenings or weekends for project work; listing appointments and the odd open house are client time. Morgan, my ops manager, can take about 4 hours a week. Tatum runs our transactions. Plan through December 18; I'm off November 26 and 27. Pat (the owner) wants me at about 5 hours a week on recruiting, and the Monday huddle and Tuesday team meeting stay. Go straight through to the summary for Pat; I'll look before anything goes on my calendar.

(If Claude won't take the .ics file, rename it to .txt.) The sample output on the page is this run.

## Library Keywords

time blocking, calendar, perfect week, ideal week, plan my week, too many meetings, work-life balance, weekly planning, prospecting time, team leader, Google Calendar, ClickUp, Todoist, productivity

## Tested and Not Tested

**Tested (2026-11-08, by running the skill as written on made-up files; see evals/runs/):**
- No connectors, practice files (Google Calendar .ics and ClickUp CSV): intake, reading repeating series with skipped and moved dates, sorting, holds, task check, projects, hand-offs, summary, stopping before step 8. Offered evenings left unused when not needed. 10 of 10 checks.
- An overloaded agent with evenings off (Todoist CSV, calendar set to a different time zone): gap shown, no evenings or weekend work, time zone note, list for the team leader, transactions routing. 9 of 9 checks. A no-skill baseline on the same files mislabeled time zones, suggested Saturday afternoons and missed the CE deadline.
- The step 8 rules with a simulated connector: nothing created before a clear yes, guest and meeting-move requests declined, re-read and fit, no attendees and notifications off on all 38 calls, recurring rules with UTC UNTIL and EXDATEs, nothing overlapping other people's meetings. 10 of 10 checks, plus an 18-check script (evals/make/check_calls.py).
- The plan page in Chromium at desktop and phone widths, light and dark.
- Independent review (2026-11-08): a second run of case 2 and of the practice prompt, written before reading the builder's runs (evals/runs/2/review-output.md, evals/runs/practice/review-output.md). Both passed every check and agreed with the builder's runs on every read, flag, hold, routing and privacy call; totals differ where the blocks differ, as they should. The review found two counting rules the skill left to judgment (Todoist's repeating dates, a big task due just after the end date) and wrote them into references/reading-exports.md, and renamed three made-up names that could pass for real ones.

**Not tested:**
- A live Google Calendar connector (case 3 simulated it from the connector's tool definitions as loaded 2026-11-08). Whether the connector a given account has can create events (see the conflict above).
- Uploading an .ics file to claude.ai (the .txt rename is the fallback).
- Asana and Outlook exports, the ClickUp and Asana connectors, and the Granola connector.
- Importing the skill's .ics file into Google Calendar or Outlook.
- Very large calendars (years of history) beyond the parsing approach.
- ChatGPT: there's no ChatGPT version. The skill's core is the calendar build with notification control, the interactive plan page, and code for reading exports. The ChatGPT Project format doesn't cover those, so this is a Claude-only skill.
