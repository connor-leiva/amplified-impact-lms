# Page Notes: FUB Pipeline Review

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-10; sources inline and in references/fub-exports.md. Follow Up Boss's help center blocks automated page reads, so its articles were read through search excerpts; the People export steps also match what /database-health-check checked on 2026-11-08. The skill is paid (in the Amplified Skill Library), so the page shows its hero and sample with the Skill Library card; the setup words below are for the day it is free.

## One-Line Promise

Attach this week's Follow Up Boss export (and last week's, and your Deals report if you use FUB Deals) and walk into your pipeline meeting with every stage counted and aged, a dated list of what needs a decision this week, and the question to ask each agent.

## Who It's For

The team leader or ops leader who runs a real estate team's weekly pipeline meeting from Follow Up Boss, in any state and at any brokerage. They need to be the Account Owner or have Follow Up Boss's Can Export permission, so the export holds the whole team.

## What Follow Up Boss Reporting and Sisu Already Give, and What This Adds

Follow Up Boss's own Reporting already shows each agent's lead counts (the Agent Activity report), speed to action and closed deals by lead source with a conversion rate (the Lead Source report), appointments by user, type and outcome (the Appointment report), each deal's stage, time in stage and close date (the Deals report), and closed deals by agent; its default Met/Appt Set Smart List already lists appointment-stage people with no communication in 6 days. Sisu, with its Follow Up Boss integration, already turns Follow Up Boss calls, texts, emails and conversations into activity dashboards against goals, turns deals in its buyer and seller pipelines into Sisu transactions, and reports lead source return. This skill doesn't rebuild those. It adds one named, dated list of what needs a decision this week across every agent, built from the export's own fields (hot or active leads with nothing logged, deals past their expected close date tied to the person, appointment-stage people with no next step, stages that didn't move); aging worked out per record with the arithmetic shown; last week against this week, person by person, which no Follow Up Boss report keeps; the questions to ask each agent in the meeting; and odd rows flagged instead of quietly counted. Its conversion table is a snapshot by current stage for the meeting; the Lead Source report and Sisu stay the source of record. Sources: references/fub-exports.md (Follow Up Boss help center articles read 2026-11-10; Sisu's "Setting up the Follow Up Boss integration," https://kb.sisu.co/en/articles/8380608-setting-up-the-follow-up-boss-integration , and "Ins and outs of the Follow Up Boss integration," https://kb.sisu.co/en/articles/8400470-ins-outs-of-the-follow-up-boss-integration , checked 2026-11-10).

## What to Upload, and Where It Comes From

1. **This week's People export (required).** In Follow Up Boss, on People, open the Columns menu (upper right) and turn on Stage, Source, Agent, Created, Last Communication, Last Activity and Tags. Then People > All People, check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once. Run it as the Account Owner or a user with Can Export (Admin > Team, the Can Export checkbox); an agent's export holds only that agent's people. Source: "Export Contacts to a Spreadsheet" (updated 2026-04-21), https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet , read through search excerpts 2026-11-10. Not confirmed: whether Last Communication and Last Activity come through with Export All Columns (the help center doesn't list them). If they're missing, export again without Export All Columns; the skill says plainly when they're missing.
2. **A Deals report export (if you use Follow Up Boss Deals).** Reporting, the Deals report, set Users, Time Frame and Filters in the upper right, + Add Columns under the graph to add Price, then the export icon, choose the columns, export to CSV. The help center lists Name, Stage, Status, Entered Stage, Time in Stage, Close Date and Team. Sources: "Deals Report," https://help.followupboss.com/hc/en-us/articles/360047800793-Deals-Report , and "Exporting reports to a spreadsheet," https://help.followupboss.com/hc/en-us/articles/8897311199511-Exporting-reports-to-a-spreadsheet , read through search excerpts 2026-11-10. Pipeline is a filter; whether it can be a column isn't confirmed, so export buyers and sellers separately to keep them apart.
3. **Last week's People export (to see what moved).** The same export, saved last week. Follow Up Boss keeps no weekly snapshot of stages, so save each week's export with the date in its name.

## Things to Say

1. "Pipeline meeting is tomorrow. This week's FUB export, last week's and our Deals report are attached. Run the pipeline review."
2. "Here's our Follow Up Boss export. What needs a decision this week?"
3. "Run the review with 10 days instead of 7 for stale, and conversion for October."
4. "Just the questions for each agent."
5. "Give me the Smart List steps for list 3 so we can watch it in Follow Up Boss."

## What Comes Back

- Flags: the as-of date and where it came from, the settings, anything missing and what it stopped, odd rows, stages to confirm.
- A three-sentence bottom line.
- What it read: each file, which week it is, the columns, how each stage was read, how people were matched.
- The pipeline by stage: how many people, last week's count, how many were communicated with in the last 7 days, how many longer, how many have none logged, and the oldest, with the math ("11/10/2026 minus 10/21/2026 = 20 days"). Deals by stage with days in stage.
- What moved since last week: every stage change, new people, people no longer in the export.
- Needs a decision this week: deals past their expected close date; appointment-stage people with no next step in the export; hot or active people with nothing logged in more than 7 days; stages where no one entered or left since last week. Each with its dates and math.
- Conversion by lead source and by agent, every rate with its numerator and denominator ("4 / 11 = 36.4%").
- Each agent's counts, facts only.
- The questions to ask each agent in the meeting, one per record.
- Odd rows, flagged and never fixed.
- Smart List steps when a fix belongs in Follow Up Boss, as instructions.
- A Check Before Sending list and the count file (pipeline_review.md).

## What It Won't Do

- Change anything in Follow Up Boss: no stage changes, assignments, tags, tasks, notes, action plans or deal edits, and nothing sent.
- Invent a stage, source, date, deal value or reason, or say anything moved without last week's export.
- Fix an odd row (a closed deal with no close date, a date after the export date, a date that isn't a date).
- Judge an agent, rank agents, or say who is "dropping the ball."
- Repeat an email address, phone number or anything from the Notes columns, or say anything about who a lead is.
- Give benchmarks, forecasts, lead scores or routing; build action plans or automations.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's help center says skills work on every plan and need code execution, which is on by default for Free, Pro, Max and Ultra (Settings > Capabilities > Code execution and file creation, called "Create and edit files" in the newer settings); Claude's docs list Pro and up for custom skills, so Free is unconfirmed. Sources as on the other skill pages: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (checked 2026-11-08 for D-068).
- **ChatGPT version:** a ChatGPT Project with three files (instructions.md, which downloads as fub-pipeline-review-instructions.md, fub-pipeline-review-guide.md and fub-pipeline-code.md, plus paste.txt in the Instructions box). It needs data analysis, which ChatGPT's free plan has only as "Limited" (https://chatgpt.com/pricing, as on /team-pnl-review). No connector.
- **Follow Up Boss:** the Account Owner, or a user with Can Export. Deals only if the team uses Follow Up Boss Deals.
- **No connector.** Exports only.
- **Cost:** nothing beyond the Claude or ChatGPT plan and Follow Up Boss.

## Run, Draft, Own

- **Run:** reads the exports, reads each stage, does every count, date difference and rate in code, matches last week's people to this week's, and builds the decision lists and questions.
- **Draft:** the review, the questions for each agent, and Smart List steps, for the team leader to read first.
- **Own:** what happens to each lead and deal; each agent's next steps; every change in Follow Up Boss; any judgment about an agent's work.

## FAQs

**Follow Up Boss and Sisu already have reports. Why this?** See the paragraph above, in short: they show activity, closed deals and lead source return. This gives one dated list of what needs a decision this week across every agent, last week against this week, and the questions for the meeting, from the export's own fields.

**What does "no communication logged" mean?** Nothing is logged in Follow Up Boss. Calls and texts from an agent's personal phone don't show unless someone logs them, so the question to the agent is about the next step, not a verdict.

**Why does it need last week's export?** Follow Up Boss doesn't keep a weekly snapshot of everyone's stage. Without last week's file, the skill says nothing about what moved.

**Will it tell me which agent is underperforming?** No. It gives each agent's counts and dates for the meeting, and the questions. A judgment about a person is yours, made with them in a 1:1.

**What if our stages are custom?** Follow Up Boss's default stages are read automatically. A custom stage (Pending, Past Client, anything else) is read from its name and listed for you to confirm; tell it what the stage means and it reruns.

## Practice Prompt

With the three practice files attached (PRACTICE FUB People Export 2026-11-10.csv, PRACTICE FUB People Export 2026-11-03 Last Week.csv, PRACTICE FUB Deals Report 2026-11-10.csv): "Pipeline meeting is tomorrow morning. Attached: our Follow Up Boss People export and Deals report, both downloaded November 10, 2026, and last week's People export. Run the pipeline review."

The practice files are a made-up team: 54 people and 5 agents this week, 52 people last week, and 13 deals, in Follow Up Boss's Export All Columns layout (with emails, phones and notes, which the review must never repeat). The prompt names the download date, so every day count runs to November 10, 2026 whatever day you practise. Expect a result like sample.md: 2 deals past their expected close date (Ferdinand Rattlecap's first, 11 days past), 3 appointment-stage people with no next step, 7 hot or active people with nothing logged in more than 7 days, 2 stages with no movement, 9 stage changes, and 3 odd rows.

## Suggested Library Keywords

follow up boss, fub, pipeline review, pipeline meeting, weekly pipeline, sales meeting, team meeting, lead follow-up, stale leads, aging, last communication, deals past close date, expected close date, appointment set, met with customer, stage movement, what moved, conversion by lead source, conversion by agent, smart list, people export, deals report, sisu, team leader, ops

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md, all on 2026-11-10):
- Case 1, the full practice set (this week's and last week's People exports and a Deals report): 11 of 11. The edge cases held: a lead at exactly 7 days stayed off the stale list, a stale person with a past-due deal showed once, under the deal, and an appointment-stage person with an open deal went to list 3, not list 2. Kept as sample.md.
- Case 2, a People export only, with five odd rows (a closed deal with no close date, a future Last Activity, a future Last Communication, a future Date Added and a day-first date that can't be read), two custom stages and notes holding family, school, preapproval and credit details, with the prompt asking "which agent is dropping the ball": 10 of 10. It said nothing moved, flagged every odd row without fixing it, kept the two unusable dates off the stale lists, gave every rate its numerator and denominator, and answered the agent question with facts, not a judgment.
- Every run passed the objective checks (evals/make/objective_checks.py): every number traced to the files, the prompt or the run's pipeline_review.md; every day count and every rate re-computed and right; no email, phone or note text; no dashes; Flags before a three-sentence bottom line; Check Before Sending; no judging words beyond the user's own question quoted once.
- Every fixture regenerates identically from evals/make/make_files.py, and references/pipeline-code.md is written from evals/make/fub_pipeline.py by embed_code.py.

Not tested:
- A real Follow Up Boss export. The practice People exports follow the columns the help center lists for Export All Columns plus Last Communication and Last Activity, which it doesn't list; the Deals export follows the Deals report's listed columns plus Price. One real People export and one real Deals export should be run before release.
- An export without Last Communication, a Deals export with a Pipeline column, and a team with renamed stages.
- The ChatGPT version inside ChatGPT, including whether data analysis can open a Project file (the instructions fall back to asking for the code file in the chat).
- A no-skill baseline (not run for this skill).
- Claude Free.
