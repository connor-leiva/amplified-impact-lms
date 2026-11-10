---
name: fub-pipeline-review
description: "Runs a team leader's weekly Follow Up Boss pipeline review from their exports: this week's People export, a Deals export if they use FUB Deals, and last week's People export to see what moved. It ages every stage in code, showing the arithmetic, and lists what needs a decision this week: hot or active leads with nothing logged in 7 days, deals past their expected close date, appointments set with no next step and stages that didn't move. It adds conversion by lead source and by agent with numerators and denominators, questions for each agent, odd rows flagged and Check before sending. Read only. Use it when someone uploads a FUB export or asks for a pipeline review, pipeline meeting prep or what's stuck, even if they never say pipeline review. Not for cleaning or re-engaging the whole database (database-health-check), the team's money (team-pnl-review), the weekly EOS meeting (l10-meeting-prep), action plans and automations (fub-automation-audit) or one agent's coaching 1:1 (agent-1on1-prep)."
compatibility: Needs code execution (Settings > Capabilities > Code execution and file creation) to read the exports and do every count, date and rate in Python. Works from uploaded Follow Up Boss CSV exports. A CRM or Sisu connector, if one is connected, is used read only.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# FUB Pipeline Review

Turn this week's Follow Up Boss exports into the page a team leader runs the pipeline meeting from: every stage counted and aged, the short list of leads and deals that need a decision this week with each date worked out, what moved since last week, conversion with its math, and the questions to ask each agent. Follow Up Boss's reports and Sisu already show activity, closed deals and lead source return; what they don't give is one dated list across every agent, built from the export's own fields, with last week beside this week.

**Run:** reads the exports, reads each stage, does every count, date difference and rate in code, matches last week's people to this week's, and builds the four decision lists and the questions. **Draft:** the review and the questions for each agent, plus Smart List steps when a fix belongs in Follow Up Boss, for the team leader to read first. **Own:** the team leader decides what happens to each lead and deal; each agent gives their own next steps; the owner makes every stage, deal, Smart List or assignment change in Follow Up Boss; any judgment about an agent's work stays with the team leader. This skill never touches the CRM.

## 1. Get the Files

- **Required:** this week's People export (CSV, or XLSX). If none is uploaded, say in one line where it comes from (`references/fub-exports.md`) and stop.
- **Helpful:** a Deals report export (when the team uses Follow Up Boss Deals) and last week's People export. Without the Deals export, deals come from the People export's deal columns when they're there. Without last week's, nothing about movement is said.
- **The as-of date, the stale days, the period:** as `references/review-rules.md` (Settings) says. Never ask the user to type what a file already holds; use the default, say so in Flags, and keep going.
- **Connector:** a CRM or Sisu connector, if connected and the user wants it used, read only. The exports are still the source for this review.
- If code execution is off, tell the user to turn it on (Settings > Capabilities) and stop. Day counts done by eye are how a date gets invented.

## 2. Run the Review in Code

Extract the code from `references/pipeline-code.md` (in this skill's folder) and run it. Don't read the code into the conversation:
```
python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/fubpr.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/pipeline-code.md
python3 /tmp/fubpr.py --people THIS_WEEK [--deals DEALS] [--last-week LAST_WEEK] --as-of YYYY-MM-DD [--days 7] [--period-start YYYY-MM-DD] [--period-end YYYY-MM-DD] [--rules /tmp/rules.json] --out OUTPUT_FOLDER
```
It prints the data and writes `pipeline_review.md` and `pipeline_review.json` to OUTPUT_FOLDER. Never open raw contact rows in the conversation: the run never prints an email address or phone number, and the review shouldn't either.

## 3. Check How It Read the Files

Read `references/review-rules.md` and `references/fub-exports.md`. Then:
1. **Columns:** check "Files Read." If a column was read as the wrong thing, write `/tmp/rules.json` with `"columns"` as the code's header shows and rerun. If Last Communication is missing, say what that stopped and how to export it (`references/fub-exports.md`).
2. **Stages:** check "Stage Reading" and the deal stages. A stage marked "confirm" goes in Check Before Sending; if the user says how to read one, write `"stages"` or `"deal_stages"` and rerun. Say what you changed.
3. **Files:** confirm which People export is this week's. If the run flags them as swapped, ask before going on.
4. Every number, date and rate in the review comes from the final run. Never compute a new count, days figure, rate or total by hand; if it isn't in the run, leave it out.

## 4. Build the Review

Follow `references/review-rules.md` for each part:
- **Pipeline by stage:** the run's table (now, last week when attached, communication within and past the stale days, none logged, the oldest with its arithmetic), then deals by stage when there's a Deals export.
- **What moved:** the run's stage changes, new people and people no longer in the export; or the one "not checked" line.
- **Needs a decision this week:** the four lists exactly as the run built them, each item with its dates and arithmetic, each check that couldn't run named.
- **Conversion:** by lead source and by agent, every rate as numerator / denominator, with the current-stage caveat and the line saying Follow Up Boss's Lead Source report and Sisu are the source of record.
- **By agent:** the run's counts, nothing more.
- **Questions for each agent:** the run's questions, grouped by agent.
- **Set up in Follow Up Boss:** only when a fix belongs there, the steps for the owner, never described as done.

## 5. Guardrails

- **Read only. Never touch the CRM.** Never change a stage, assign or reassign a lead, add a tag, task, note or action plan, edit a deal, or send, schedule or post anything, even with a connector and even if asked. Where a fix belongs in Follow Up Boss, write the steps for the owner.
- **Never invent.** No stage, source, date, deal value, reason or movement that isn't in the files. An odd row (a closed deal with no close date, a Last Activity or Last Communication after the as-of date, a date that isn't a date) is flagged and left as is, never fixed, filled or guessed.
- **Facts about records, never judgments of people.** The by-agent section is counts and dates. No words about effort, performance, attitude or reliability, and no ranking of agents. If asked who is dropping the ball, say the review gives facts for the meeting and the judgment is the team leader's, then give the facts.
- **Privacy:** names, stages, sources, agents, dates, and deal names and prices as exported. Never an email address or phone number, and never the Notes, Message, Background, Calls or Texts columns or any lender, credit, income or family detail they hold.
- **Fair housing:** nothing about who a lead is. No protected characteristic, nothing inferred from a name or a note, nothing about neighborhoods or schools.
- **Stay in lane:** no benchmarks or "typical" rates, no forecasts of closings or income, no lead scoring or routing. Don't rebuild what Follow Up Boss Reporting or Sisu already show; name them when they answer a question better.

## 6. Output, In This Order

1. **Flags:** the as-of date and where it came from, the stale days and period (default or the user's), any missing file or column and what it stopped, the number of odd rows, and stages to confirm.
2. **Bottom line** (three sentences max): the active pipeline and how many items are on each decision list, the first item to discuss (by the rule in `references/review-rules.md`), and what moved, or that movement wasn't checked.
3. **What I Used:** each file and which week it is, columns used, stage readings, matching, and every gap.
4. **Pipeline by Stage**, with aging and its arithmetic, then **Deals by Stage** when there's a Deals export.
5. **What Moved Since Last Week**, or the one line saying it wasn't checked.
6. **Needs a Decision This Week:** lists 1 to 4.
7. **Conversion by Lead Source** and **Conversion by Agent**, every rate with its numerator and denominator.
8. **By Agent:** counts and dates only.
9. **Questions for Each Agent.**
10. **Odd Rows (Flagged, Not Fixed).**
11. **Set Up in Follow Up Boss** (instructions only), when a fix belongs there.
12. **Check Before Sending:** every item listed in `references/review-rules.md`.

Attach `pipeline_review.md` so anyone in the meeting can see each count. Say that it holds lead names and is for the team's meeting only. If the user asks for one part ("just the decision list"), give that part with Flags and Check Before Sending.
