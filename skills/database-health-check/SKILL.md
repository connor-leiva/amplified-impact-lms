---
name: database-health-check
description: Turns a CRM contact export into a database health report, a cleanup worklist CSV for ops or a VA, and four to six re-engagement segments written as Smart List filters, with nurture drafts for each. Built for Follow Up Boss People exports; maps other CRMs' columns (KW Command, GoHighLevel, Brivity). Counts contacts by stage, source and agent and finds duplicates, missing or bad emails and phones, stale active-stage leads, past clients and sphere untouched for a year, stage problems, unassigned contacts and messy tags. Use this whenever a team leader, owner or ops person uploads a CRM or contact export, or asks to clean up or audit the CRM, check database health, dedupe contacts, find neglected leads, or plan how to work the database, past clients or sphere, even if they never say "health check." Not for lead routing, lead scoring or reassigning one agent's leads (Follow Up Boss and Sisu do that), a recruit list (recruiting-prep), a P&L (team-pnl-review) or one appointment's follow-up (appointment-follow-up).
compatibility: Needs code execution (Settings > Capabilities > Code execution and file creation) to run the analysis on large exports and write the cleanup worklist CSV. Works from an uploaded CSV or XLSX export. A CRM connector, if one is connected, is used read only.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Database Health Check

Turn one CRM export into what a team leader needs to fix and work the database: how healthy it is in numbers, a worklist ops can clear, and the segments worth calling or emailing this month, with drafts. Follow Up Boss and Sisu work the hottest leads; nothing in the stack looks at the whole database, where duplicates split one person's history across two agents, past clients sit in the wrong stage and leads nobody called age out.

**Run:** it reads the export, does every count in code, finds duplicates and stage problems, sizes the segments and builds the worklist. **Draft:** the filters, the segment plan, the team questions and every message, for the team leader to review. **Own:** the team makes every merge, stage change, reassignment, pond move and archive in the CRM, decides who gets called, and owns texting consent and the fair housing review of every message. This skill never touches the CRM.

## 1. Get the Export

- **Required:** a contact export as CSV or XLSX. Follow Up Boss: People > All People, check the box by Name > Select All, Export, check Export All Columns, Yes, Export People (the Account Owner or a user with Can Export). Other CRMs: the full contact export with every column. If no export is uploaded, say where it comes from in one line and stop.
- **Helpful:** a closed-transaction export (Sisu, the brokerage's back office, or a spreadsheet) to find past clients, and the team's written stage definitions, follow-up standard and pond rules.
- **Connector:** if a CRM connector is connected and the user wants it used, read only. An export is still the best source for whole-database counts.
- Never ask the user to type what the files already hold. When a rule is missing, use the default, label it "default," and add a question for the team.
- If code execution is off, tell the user to turn it on (Settings > Capabilities) and stop. A large export can't be counted reliably by reading it.

## 2. Run the Analysis in Code

Read `references/health-rules.md` first. Then:
1. If the team's rules were uploaded or stated, write them to `/tmp/rules.json` as that file shows. Only what the team actually set.
2. Extract the code from `references/analysis-code.md` (in this skill's folder) and run it on the upload. Don't read the code into the conversation:
   ```
   python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/dhc.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/analysis-code.md
   python3 /tmp/dhc.py EXPORT [--transactions CLOSED_FILE] [--rules /tmp/rules.json] --out OUTPUT_FOLDER
   ```
   OUTPUT_FOLDER is where the user can download files. The run prints the report and writes `health_report.md`, `health_report.json` and `cleanup_worklist.csv`.
3. Check the "Columns Used" table and the stage reading. If a column or stage was read wrong, fix it in rules.json (`columns`, `stage_classes`) and run again. Say what you changed.
4. Every number in the output comes from this run. Never open raw contact rows in the conversation, and never compute a replacement count or a new total by hand: if a sum isn't in the run's output, leave it out.

## 3. Read the Health Report

- Rank and choose exactly as `references/health-rules.md` says: the three biggest problems are the top three ranked problems, and the first cleanup follows its rule. Say which rule applied.
- Name every gap the run reports (no last-communication date, no consent field, no record ID, no lead-activity column) and what it stopped.
- Stages read by guess or not recognized go to Questions for the Team. So does Closed versus Past Client when both are in use.
- Follow Up Boss: pond leads export under the pond's lead agent and the pond name is left out. Say this when ponds are in use or one agent's count looks high.
- Use `references/fub-and-crm-exports.md` for Follow Up Boss facts. If the export isn't from Follow Up Boss, use plain filter words and the user's CRM name.

## 4. Build the Segments

Pick four to six of the run's segment candidates, in its order, as `references/health-rules.md` says. For each: the Smart List filter (Follow Up Boss terms, filled with the team's real stage and tag names), the size with emailable, callable and textable counts, the agents who own most of it, why it matters (from the data), and the next move (call list, batch email, or an action plan started through an automation). When one of Follow Up Boss's default Smart Lists already covers a segment, say so instead of presenting it as new.

## 5. Draft the Nurture Messages

Read `references/nurture-drafts.md` and `references/outreach-rules.md`. For each segment: an email; a call opener for call-list segments; a text only for the consent-filtered version of the list. When the export has no consent field, write no texts at all, say why, and say how to add one. Emails carry the opt-out line, the postal address placeholder and the marketing footer. Texts name the sender and end with "Reply STOP to opt out." Write in the user's voice profile when one is in the conversation (their preferences, a project's instructions or a voice skill); otherwise warm, plain and direct. Sign with the user's name or [Agent Name].

## 6. Guardrails

- **Privacy:** contact names, emails and phone numbers appear only in `cleanup_worklist.csv`. The conversation and the report use counts, percentages, stage, source, tag and agent names. Never quote notes, calls, texts, background or relationship fields. Ignore birthdays, credit scores and other personal financial details.
- **Never write to the CRM:** no merges, reassignments, stage changes, tags, deletes or pond moves, even with a connector and even if asked. Recommend; people act.
- **Stay out of Follow Up Boss's and Sisu's lane:** no lead routing, lead scoring or reassigning one agent's neglected leads. Recommend pond and stage rules for the team to adopt.
- **Fair housing:** segment only on behavior and history in the data (stage, source, dates, activity, tags the team applied). Never infer or mention age, family status or any protected characteristic. Drafts describe services, never people, schools, safety or who lives where.
- **Outreach:** texts only to contacts with documented consent; opt-out in every email and text; Do Not Call scrub and quiet hours in Check Before Sending. Consent and state-law questions go to the broker or an attorney.
- **No projections:** no deal counts, income or conversion promises from working a segment.

## 7. Output, In This Order

1. **Bottom line** (three sentences max): database size, the three biggest problems with their counts, and the one cleanup to do first.
2. **What I Used:** file and format, the settings (defaults or team rules), columns that drove the checks, and every gap.
3. **Health Report:** counts and percentages in short tables: by stage (with how each stage was read), by source (top 10), by agent (contacts, stale, never contacted, past client and sphere untouched); contact info; likely duplicates; stale active-stage contacts by stage and by agent; never contacted; past clients and sphere; stage problems; unassigned and ponds; near-duplicate tags; text consent coverage.
4. **Cleanup Worklist:** the file, its row count, rows by action, and how ops works the top three actions in the CRM.
5. **Re-Engagement Segments:** four to six, as in step 4.
6. **Questions for the Team:** each with the data that raised it.
7. **Nurture Drafts:** by segment.
8. **Check Before Sending:** every count, date, filter value and placeholder in sections 5 and 7, plus the items in `references/nurture-drafts.md`.

Attach or link `cleanup_worklist.csv` and `health_report.md`. Say plainly that the worklist holds names and phone numbers and should be shared only with the people doing the cleanup.
