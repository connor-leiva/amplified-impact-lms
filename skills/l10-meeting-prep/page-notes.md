# Page Notes: L10 Meeting Prep

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-10; sources inline. The skill is paid (in the Amplified Skill Library), so the page shows its hero and sample with the Skill Library card; the setup words below are for the day it is free.

## One-Line Promise

Attach your scorecard, rocks, to-dos and issues list, and walk into your L10 with the agenda timed, every number checked against its own goal, and nothing missing filled in by guesswork.

## Who It's For

The integrator, team leader or ops lead who runs a real estate team's weekly EOS Level 10 Meeting, in any state and at any brokerage, on Ninety, Bloom Growth (formerly Traction Tools) or a spreadsheet.

## What to Upload, and Where It Comes From

1. **The scorecard (13 weeks is best).**
   - Ninety: Data in the left navigation, pick the team, the Weekly tab, a Date Range covering 13 weeks, the ... at the far right of the toolbar, Export as CSV. The newest week is on the left, and the skill sorts that out. Source: "Printing and Exporting Scorecards" (updated 2026-09-16), https://help.ninety.io/en/articles/14306054-printing-and-exporting-scorecards , checked 2026-11-10. Owners, Admins, Managers and Team Members can export; Observers can't. Ninety's "Data Export and Print Options" (2026-09-16, https://help.ninety.io/en/articles/14324178-data-export-and-print-options-in-ninety) says Manager, Admin or Owner for scorecards, so the page says "ask an admin if Export is missing."
   - Bloom Growth: the menu at the top right of a KPI tile, Export, pick the frequency and dates, Export. Or the whole meeting: Meetings list, the three dots by the meeting, Export All, which downloads a ZIP of CSVs (KPI (Metrics).csv, Quarterly Priorities (Goals).csv, O&O (Issues).csv, To-Dos, Headlines and more). Source: "Exporting Data," https://help.bloomgrowth.com/en/exporting-data (no date on the page), checked 2026-11-10. The article doesn't list the columns.
   - A spreadsheet: one row per measurable with Owner and Goal columns and one column per week. Google Sheets: File, Download, Microsoft Excel (.xlsx) (not checked against Google's help center).
2. **Rocks.** Ninety: Rocks, the team, the ... at the far right of the filter bar, Download Excel (tabs Rocks and Milestones). Source: "Exporting Rocks to a Spreadsheet" (2026-04-24), https://intercom.help/ninety/en/articles/14442542-exporting-rocks-to-a-spreadsheet , checked 2026-11-10. Bloom Growth: Quarterly Priorities (Goals).csv in the meeting export.
3. **Last week's to-dos.** Ninety: To-Dos, the team, the Download icon at the far right of the filter bar; turn the Archive toggle on first to include archived to-dos. Source: "Exporting To-Dos to a Spreadsheet" (2026-06-11), https://help.ninety.io/en/articles/14306128-exporting-to-dos-to-a-spreadsheet , checked 2026-11-10. The article doesn't say whether the Archive export also holds open to-dos, so the skill takes two to-do files and drops duplicates.
4. **The issues list.** Ninety: Issues, the team, the Download button on the filter bar (one tab for short-term and one for long-term). Bloom Growth: O&O (Issues).csv. Sources: the data export article above and "Exporting Issues to a Spreadsheet," https://help.ninety.io/en/articles/14306235-exporting-issues-to-a-spreadsheet (read through search excerpts).
5. **Headlines.** A Ninety Headlines download, Bloom's Headlines file, or typed into the chat.

Traction Tools became Bloom Growth in October 2022: https://www.bloomgrowth.com/blog/a-letter-to-our-community-about-traction-tools-and-bloom-growth (checked 2026-11-10).

## Things to Say

1. "Prep our L10 for Tuesday at 9:00 AM. Our Ninety exports are attached."
2. "Here's our scorecard and issues list. What's off track this week, and what should we IDS first?"
3. "Our L10 is Monday at 10. Bloom Growth export attached. Headlines: (paste them)."
4. "Just the scorecard: which numbers missed, and who still owes me a number?"
5. "Write the note to the owners who haven't put in their numbers."

## What Comes Back

- A three-sentence bottom line.
- What it read: each file, the week reviewed, how each goal was read (and any it had to assume), and anything missing.
- The agenda in EOS Worldwide's order with clock times (Segue, Scorecard, Rock Review, Headlines, To-Do List, IDS, Conclude; 90 minutes).
- The scorecard: each measurable against its own goal, misses marked, how many of the last 13 weeks missed, and every empty cell with its owner. Empty cells stay empty.
- Rocks with the status each owner gave, or "no status given."
- Headlines as given, with any personal detail (health, HR, pay) left out.
- Last week's to-dos, done or not done, with the completion rate and its arithmetic ("9 done / 11 with a status = 81.8%").
- The issues list as written, with a suggested order for IDS (dated client or money deadlines first, then issues tied to this week's misses or an off-track rock, then the rest), each with its reason. A suggestion: the team picks.
- Possible drop-downs that aren't on the list yet, for the team to decide.
- A short note asking owners for missing numbers or statuses, when anything is missing.
- A Check Before Sending list and the count file (l10_prep_data.md).

## What It Won't Do

- Fill an empty scorecard cell, even if you ask. It flags it for its owner.
- Call a rock on or off track. Only the owner says.
- Add, merge, reword or drop an issue, or invent an owner or due date.
- Judge anyone's performance, or give one person's completion rate.
- Change anything in Ninety, Bloom Growth or your spreadsheet, or send the note.
- Run the meeting, solve the issues or forecast anything.

## What You Need

- **Claude:** a plan with skills and code execution. Claude's help center says skills work on every plan and need code execution, which is on by default for Free, Pro, Max and Ultra (Settings > Capabilities > Code execution and file creation, called "Create and edit files" in the newer settings); Claude's docs list Pro and up for custom skills, so Free is unconfirmed. Sources as on the other skill pages: https://support.claude.com/en/articles/12512180-use-skills-in-claude and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (checked 2026-11-08 for D-068).
- **ChatGPT version:** a ChatGPT Project with four files (instructions.md, which downloads as l10-meeting-prep-instructions.md, l10-meeting-prep-guide.md and l10-prep-code.md, plus paste.txt in the Instructions box). It needs data analysis, which ChatGPT's free plan has only as "Limited" (https://chatgpt.com/pricing, as on /team-pnl-review). No connector.
- **Accounts:** Ninety or Bloom Growth with a role that can export (Ninety: not an Observer), or the team's spreadsheet.
- **No connector.** Exports and pasted lists only.
- **Cost:** nothing beyond the Claude or ChatGPT plan and the team's existing EOS tool.

## Run, Draft, Own

- **Run:** reads the exports, sorts the weeks, reads each goal, finds every miss and empty cell, and counts the to-dos, all in code.
- **Draft:** the prep, the suggested IDS order and the note to owners, for you to read first.
- **Own:** each owner's numbers and rock status; what drops to the Issues List; which issues the team IDSes and how they're solved.

## FAQs

**We already run our L10 in Ninety. Why this?** Ninety's Meetings tool already runs the L10 with its agenda, a live timer, the scorecard, rocks, headlines, open to-dos and issue voting ("Introduction to Meetings," 2026-10-07, https://help.eos.ninety.io/en/articles/13639439-introduction-to-meetings , checked 2026-11-10). This is the prep before it: who still owes a number or a rock status, last week's completion rate worked out, and a suggested order for IDS. Teams on a spreadsheet get the whole page.

**Why won't it fill in a missing number?** A filled-in number reads like a real one in the meeting. The owner gives it; the skill drafts the note asking for it.

**How does it decide what's a miss?** Each measurable against its own goal, in the goal's own direction ("80+," "<= 5"). When a goal has no direction, it says so, makes a best reading from the measurable's name (minutes and days read as at most) and lists it for you to confirm.

**Is this affiliated with EOS Worldwide?** No. The agenda comes from EOS Worldwide's public pages, cited in the skill. EOS and the Level 10 Meeting belong to EOS Worldwide.

**Where does the 90% to-do figure come from?** An EOS Worldwide blog post (Ken DeWitt, "Why You Hate Meetings and What You Can Do About It (Part Two)") calls a 90% completion rate "the minimum acceptable." The prep quotes it once for the team's rate, never for one person.

## Practice Prompt

With the five practice files attached (PRACTICE Scorecard Export 13 Weeks.csv, PRACTICE Rocks Q4 2026.csv, PRACTICE To-Dos.csv, PRACTICE Issues List.xlsx, PRACTICE Headlines.txt): "Prep our L10 for Tuesday, November 17 at 9:00 AM. Our scorecard, rocks, to-dos, issues list and headlines are attached."

The practice files are a made-up leadership team (Butterbean & Bramble): a scorecard in Ninety's export layout with 10 measurables over 13 weeks plus an empty current week, three empty cells, six rocks (one with no status), twelve to-dos and eight short-term and two long-term issues. Expect a result like sample.md: 4 misses, 3 empty cells for owners, 7 done / 10 = 70.0%, and the Gingersnap Court seller's cancel-by-Friday issue suggested first.

## Suggested Library Keywords

L10, level 10 meeting, EOS, traction, integrator, visionary, scorecard, measurables, rocks, to-dos, issues list, IDS, headlines, Ninety, Bloom Growth, Traction Tools, weekly leadership meeting, meeting prep, team leader, ops

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md, all on 2026-11-10):
- Case 1, a spreadsheet scorecard (weeks oldest first, "80+" goals and one bare "5") with Ninety-layout rocks and to-do workbooks, an issues CSV and a headlines file: 11 of 11. The bare "5" on Speed to Lead (Minutes) was first read as at least 5; the rule for lower-is-better names turned it into at most 5 and listed it to confirm. A headline's surgery detail was left out.
- Case 2, Bloom Growth-style CSVs (one row per measurable per week, two rocks with no status, three empty cells, one to-do with no status) with a prompt asking the skill to "fill in whatever makes sense": 11 of 11. It filled nothing, said why, and drafted the note to owners.
- The practice files: 10 of 10 planted checks; kept as sample.md.
- Every run passed the objective checks (evals/make/objective_checks.py): every number traced to the files, the prompt or the run's l10_prep_data.md; no dashes; Title Case subjects; Check Before Sending; a bottom line of three sentences or fewer; the IDS order labeled a suggestion; no judging words beyond one issue title quoted as written.
- Every fixture regenerates identically from evals/make/make_files.py, and references/prep-code.md is written from evals/make/l10_prep.py by embed_code.py.

Not tested:
- Real exports. The practice scorecard and the case 1 rocks and to-dos follow the columns Ninety's help center lists, but no real Ninety download has been run. Bloom Growth's help center names its CSVs but not their columns, so case 2's columns are made up. A real Ninety and a real Bloom Growth export should each be run once before release.
- Ninety's week column headers (the help center doesn't show them); the code reads the first date in any header.
- Headlines exported from Ninety or Bloom Growth as files (only a text file and pasted lines were run).
- The ChatGPT version inside ChatGPT, including whether data analysis can open a Project file (the instructions fall back to asking for the code file in the chat).
- A no-skill baseline (not run for this skill).
- Claude Free.
