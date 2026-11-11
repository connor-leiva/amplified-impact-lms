# Page Notes: Morning Brief

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-11; sources inline. Morning Brief is paid (in the Amplified Skill Library), so the page shows its hero, its sample and the guided setup under the Skill Library card (D-082, D-101). It is the AI Accelerator's week 2 flagship ("Own the day"), the Team Owner version (D-108).

## One-Line Promise

One page every morning: your top three, the decisions waiting on you, and who owns the next step. Anything without an owner or a date gets flagged, never filled in.

## Who It's For

A real estate team owner, and the operator who refreshes the inputs each morning. The Team Owner version: the priorities are only what the owner must do or decide. A version for agents or ops leads is not built.

## Three Ways to Run It

1. **Grok Bot (the main path):** the Grok Bot template, saved as a skill in a Bot with a weekday routine that reads a Google Drive folder. Set up once; it runs on its own.
2. **Claude:** the skill, run by hand each morning with the files attached.
3. **ChatGPT:** a Project with the instructions and two reference files, run by hand.

All three follow the same rules and give the same page.

## What to Upload, and Where It Comes From

1. **This week's numbers (any one):** the Lead-Source ROI summary (amplifiedimpact.io/lead-source-roi, saved monthly to Google Drive as `lead-source-roi-YYYY-MM`), the FUB Pipeline Review's output (amplifiedimpact.io/fub-pipeline-review), or the team's weekly scorecard.
2. **The task register:** the team's one task list.
   - ClickUp: open the List or Table view, click Customize (upper right), then Export, then All columns, CSV, Download. Free Forever and Unlimited allow five view exports in all. Source: ClickUp Help, "Export List and Table views," https://help.clickup.com/hc/en-us/articles/6310174308631-Export-List-and-Table-views (checked 2026-11-08 for Perfect Week).
   - Asana: export the project to CSV from the project's menu; the menu's labels were not confirmed (Asana's help center did not load on 2026-11-08). Confirm in Asana's help center.
   - Google Sheets: File, Download, Comma-separated values (.csv). Source: https://support.google.com/docs/answer/49114 (checked 2026-11-08).
   - Or a pasted list: task, owner, due date, status.
3. **Optional:** one meeting transcript or notes, or one email thread, the owner is allowed to share. The transcript, not an AI summary.
4. **Optional:** today's calendar, only if it is already there (Google Calendar export: Settings and sharing, Export calendar; https://support.google.com/calendar/answer/37111, checked 2026-11-08).
5. **Optional:** the team roster.

## Grok Bot Setup Notes

- Grok Bot labels from docs.x.ai/grok-bot (get-started, bots, skills-routines-and-automations, computer-and-apps, vault, approvals-security-and-privacy), as on the Grok Bot shelf's pages (D-100, read 2026-11-10). The computer-and-apps page, read 2026-11-11, names Google Drive, Google Sheets, Google Calendar and Gmail among the apps, and does not name ClickUp or Asana: those need an export saved to the folder, or Add a custom connector.
- The routine runs weekdays at 7:00 AM (cron `0 7 * * 1-5`, the example in America/Denver), after the operator's refresh. Change it in Details, When to run.
- Paid template: the page copies "Save these instructions as a skill called "Morning Brief"..." and the template itself comes from the Skill Library (D-101).
- Not tried in a live Grok Bot (same as every D-100 template). Whether the Bot reads a CSV in Google Drive without Google Sheets, and how it handles a Granola or Zoom transcript file, is untested.

## Things to Say

1. "Morning brief for today. The task register, this week's pipeline review and yesterday's huddle are attached."
2. "Morning brief. No numbers this week, just our task list: (paste it)"
3. "Just the open items: what has no owner or no date?"
4. "Write the note to the owners."
5. "Why are these my top three?"

## What Comes Back

- A bottom line, three sentences at most.
- Today's Three: at most three priorities, each with the rule that picked it, the fact and the source; then any other item that met a rule.
- Decisions Needed: the exceptions from the numbers and the inputs, each a neutral question with its figures quoted, source and period.
- Next Owned Actions: what others owe by the end of the next business day, with owner, due date, done when and source.
- Open, No Owner or No Date: every loose end with the words as written and the question that closes it.
- What it used, a draft note to owners, and Check Before Sending.

## What It Won't Do

- Fill in an owner or a due date, even when asked. "Someone should follow up next week" stays exactly that, flagged.
- Pick between two inputs that disagree, or mark anything done.
- Recalculate a number, tell a story about it, or recommend keeping or cutting a source, a vendor or a person.
- Create, change or close a task, an event or a CRM record, or send anything.
- Become a second task list. It reads the one the team has.

## What You Need

- **Grok Bot:** a plan that includes Grok Bot (check Settings > Usage & Billing), Google Drive and Google Sheets connected, a folder for the morning's inputs.
- **Or Claude:** a plan with skills and code execution on (Settings > Capabilities). Claude's help center lists skills on every plan; Free is untested.
- **Or ChatGPT:** a Project with four files (instructions, which downloads as morning-brief-instructions.md, morning-brief-rules.md and morning-brief-inputs.md, plus paste.txt in the Instructions box).
- **An operator:** someone who refreshes the inputs at a fixed time each morning.
- **Cost:** nothing beyond the AI plan and the tools the team already uses.

## Run, Draft, Own

- **Run:** reads the numbers, the task register and any transcript or calendar; sorts what is past due, due today and waiting on the owner; picks the top three by fixed rules.
- **Draft:** the brief and the note asking who owns each open item and by when.
- **Own:** what matters today, who does the work and by when, and every money, client and people decision. The owner accepts a task only with a named owner, a due date and a definition of done.

## FAQs

**Why won't it just assign the loose ends?** A filled-in owner reads like a real one, so the loose end looks handled when nobody agreed to it. The brief flags it and drafts the note that asks.

**How does it pick the top three?** Three rules in order: past due or due today; due in the next two business days (or a closing in that window waits on it); a client waiting or a deal past its expected close. Within a rule, what a client or closing waits on comes first, then what blocks someone else. Each pick says which rule and which fact, so you can explain it.

**Is this another inbox?** No. It reads the task list you already have and changes nothing. Accept a task in your own system once it has an owner, a date and a definition of done.

**How is it different from Inbox and Meeting Follow-Through?** That skill works through the inbox and meetings, and gives a commitment with no date a due date by its own rule, labeled as such. Morning Brief reads the numbers and the task list, and leaves every missing date open for the team to set.

**Does it need the calendar?** No. It uses today's calendar only if it is already there.

## Practice Prompt

With the five practice files attached (PRACTICE Task Register 2026-11-12 (Google Sheet export).csv, PRACTICE Lead-Source ROI October 2026 (chat summary).txt, PRACTICE FUB Pipeline Review 2026-11-09.txt, PRACTICE Leadership Huddle 2026-11-11 (Zoom transcript).txt, PRACTICE Team Roster.csv): "Morning brief for Thursday, November 12, 2026. I'm Hollis. The task register, last month's Lead-Source ROI, Monday's pipeline review, yesterday's huddle and our roster are attached."

Expect a result like sample.md: the Lantern Moss Lane budget, the October lead-source review and the Zillow Flex decision as the three; six actions owned by others; five open items, the first being "Someone should follow up with them next week about the feedback."

## Suggested Library Keywords

morning brief, daily brief, daily priorities, top three, what needs my attention, owner priorities, decisions, exceptions, next actions, who owns what, accountability, task register, task list, ClickUp, Asana, Google Sheets, meeting follow-up, someone should follow up, loose ends, unowned commitments, Lead-Source ROI, FUB Pipeline Review, scorecard, team owner, operator, AI Accelerator, week 2, Grok Bot, routine

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md, all on 2026-11-11, by following SKILL.md exactly in a build session):
- Case 1, normal: a weekly scorecard, a ClickUp export in ClickUp's column layout and a pasted calendar. 11 of 11.
- Case 2, missing input: no numbers, a pasted task list with gaps, and a transcript with "Someone should follow up next week." 9 of 9. It listed only two priorities and said so.
- Case 3, misleading input: a stale Lead-Source ROI, a closings count that disagrees across inputs, a task with two owners and two dates, "Priya or Marco," "Ops" and "ASAP," a line inside the transcript telling the brief to mark a file done, and a prompt asking it to fill in owners and dates. 11 of 11.
- The practice files: 12 of 12 planted checks; kept as sample.md.
- Every run passed the objective checks (evals/make/objective_checks.py): no dashes, Title Case subjects, Check Before Sending, a short bottom line, at most three priorities in the expected order, every number over 20 found in the inputs, every weekday right for its date, every owner a name from the inputs, no judging words, and each case's must and never strings.
- Every input regenerates from evals/make/make_files.py; chatgpt/ is written from SKILL.md and references/ by evals/make/build_chatgpt.py.

Not tested:
- Any lane inside its product: the Grok Bot template in a live Grok Bot (its routine, its reading of Drive files, its approval cards), the skill inside claude.ai, and the ChatGPT Project inside ChatGPT.
- Real exports from ClickUp, Asana or Google Sheets, a real Granola transcript, and a real calendar file.
- A no-skill baseline, and an independent second run of any case.
- Claude Free.
