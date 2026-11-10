---
name: l10-meeting-prep
description: "Preps a real estate team leader or integrator for the weekly EOS Level 10 Meeting from what they export or paste: the scorecard (Ninety, Bloom Growth, formerly Traction Tools, or a spreadsheet), rocks, last week's to-dos, the issues list and headlines. Returns the agenda in L10 order with times, the scorecard with each miss shown against that measurable's own goal and every empty cell flagged for its owner (never filled), rocks with the status each owner gave, to-dos due with the completion rate and its arithmetic, the issues list with a suggested IDS order, and headlines. Read only. Use it whenever someone says prep my L10, get ready for our Level 10 or leadership meeting, attaches a Ninety or Bloom Growth export or a scorecard CSV, or asks what's off track this week, even if they never say L10. Not for a daily pass over email and meetings (inbox-meeting-follow-through), turning meetings into tasks in a task manager (task-sync-starter), the team P&L (team-pnl-review) or planning the week (perfect-week)."
compatibility: Needs code execution (Settings > Capabilities > Code execution and file creation) to read the exports and do every count in Python. Works from uploaded CSV or XLSX exports, or lists pasted into the chat. No connector needed.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# L10 Meeting Prep

Turn the week's exports into the page an integrator or team leader walks into the Level 10 Meeting with: the agenda with times, every number against its own goal, each rock's status as its owner gave it, last week's to-dos with the completion rate worked out, and the issues list in a suggested order. Prepping by hand means clicking through every tool and doing the to-do math in your head; the risk is that a blank cell or a missing rock status quietly becomes a guess.

**Run:** reads the exports, sorts the weeks, reads each goal, finds every miss and every empty cell, and counts the to-dos, all in code. **Draft:** the prep itself, the suggested IDS order and a note asking owners for what's missing, for the user to read first. **Own:** each owner gives their own numbers and their rock's status; the team decides what drops to the Issues List, which issues to IDS and what gets solved. This skill never writes to Ninety, Bloom Growth or a spreadsheet, and never judges anyone's performance.

## 1. Get the Files

- **What to attach:** the scorecard (13 weeks is best), the rocks, last week's to-dos, the issues list, and headlines (a file or pasted). Where each comes from: `references/exports.md`. Any of them can be pasted instead.
- **Required:** the scorecard, or at least one of the others. With nothing to work from, say in one line where the scorecard export comes from (`references/exports.md`) and stop.
- **The meeting date and start time:** from the user's message. No date: use today's date, say so at the top, and offer to rerun. No start time: give minutes only and write [Start Time].
- Never ask the user to type what a file already holds. A missing file is a gap in What I Used, and that section of the prep says what to attach next time.
- If code execution is off, tell the user to turn it on (Settings > Capabilities) and stop. Counting by eye is how a blank becomes a zero.

## 2. Run the Prep in Code

Extract the code from `references/prep-code.md` (in this skill's folder) and run it. Don't read the code into the conversation:
```
python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/l10.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/prep-code.md
python3 /tmp/l10.py --scorecard FILE [--rocks FILE] [--todos FILE [--todos FILE2]] [--issues FILE] [--headlines FILE] --meeting-date YYYY-MM-DD [--start HH:MM] [--goals /tmp/goals.json] --out OUTPUT_FOLDER
```
- Pasted lists: save them to a file exactly as pasted (a CSV for a table, a .txt for headlines) and pass the file. Never retype or tidy them.
- One workbook with several tabs can go to more than one option; each option picks its own tab.
- It prints the data and writes `l10_prep_data.md` and `l10_prep_data.json` to OUTPUT_FOLDER.

## 3. Check How It Read the Files

Read `references/prep-rules.md` and `references/l10-agenda.md`. Then:
1. **Columns:** check "Files Read." If a column was read as the wrong thing, or a file wasn't recognized, write `/tmp/goals.json` with `"columns"` as the code's header shows and rerun. Say what you changed.
2. **Week reviewed:** confirm it's the last full week before the meeting. A newer week with no numbers is "not entered yet" and is left out. If the user named another week, rerun with `--week`.
3. **Goals:** check "How Each Goal Was Read." For every ASSUMED direction, follow the rule in `references/prep-rules.md` (a lower-is-better name gets "at most" through goals.json and a rerun), and list each one to confirm.
4. Every number in the prep comes from the final run. Never compute a new count, rate, average or total by hand; if a figure isn't in the run, leave it out.

## 4. Build the Prep

Follow `references/prep-rules.md` for each part:
- **Agenda:** the seven sections in EOS Worldwide's order with the run's clock times (`references/l10-agenda.md`). If the user's own agenda differs, use theirs and say so.
- **Scorecard:** the week's table with each miss as "number against goal in words," the 13-week miss count, and every empty cell with its owner and week. Empty stays empty.
- **Rock Review:** each rock, owner and due date with the status exactly as given, or "no status given."
- **Headlines:** as given, with any personal detail left out as the rules say.
- **To-Do List:** the counted to-dos with done or not done, the completion rate with its arithmetic, then carried-over, not-due-yet and no-status lists.
- **IDS:** the issues list as written, then the suggested order by the three tiers, each with its reason from the files, the first three marked "suggested top three." Label it a suggestion; the team picks.
- **Possible drop-downs:** this week's misses, rocks given as off track, and headlines with a problem in them, listed apart and not added to the list.

## 5. Draft the Note to Owners

Only when something is missing or needs an owner's word (an empty or non-number cell in the 13 weeks, a rock or a counted to-do with no status, an assumed goal direction): the short note in `references/prep-rules.md`, one line per owner, asking only for the number, the status or the direction. Title Case subject. Follow the user's voice profile when one is in the conversation; otherwise plain and friendly. Sign with the user's name or [Your Name].

## 6. Guardrails

- **Never fill a missing number.** An empty cell stays empty and goes to its owner, even when the user asks to fill it in "so it looks complete." Say plainly that only the owner can give it, and offer the note to owners instead.
- **Never mark a rock on or off track.** Repeat the status the file or the user gave, or "no status given." Don't infer one from milestones, dates, numbers or issues, and don't hint ("looks on track").
- **Never invent** an issue, owner, due date, goal, headline or to-do. Possible drop-downs are listed apart, never added to the Issues List.
- **No judgments of people.** No words about anyone's effort, performance, attitude or reliability; no per-person completion rates; no "struggling," "slipping," "needs to step up" or "underperforming." The IDS order is about issues, never owners.
- **Read only.** Never write to Ninety, Bloom Growth, a spreadsheet or a CRM, and never send the note. With a connector, read only.
- **Privacy:** leave out health, family-medical, pay, HR and legal details about a person from headlines and issues; say one was left out. Never repeat client financial details, account, loan or Social Security numbers, or wire instructions, even if a file holds them.
- **Stay in lane:** the meeting decides, solves and assigns. No forecasts, no benchmarks beyond the one EOS Worldwide to-do standard in `references/prep-rules.md`, and no advice on a contract, a deal or an employee; route those to the broker, the attorney or HR.

## 7. Output, In This Order

1. **Bottom line** (three sentences max): the week reviewed, misses and empty cells this week, rocks by status given, the completion rate, and the suggested first issue.
2. **What I Used:** files, meeting date and start time, the week reviewed, goals read and any directions assumed or fixed, column fixes, and every gap.
3. **Agenda** with times.
4. **Scorecard:** the week's table, misses, the 13-week counts, and Empty Cells for Owners.
5. **Rock Review.**
6. **Customer and Employee Headlines.**
7. **To-Do List**, with the completion rate's arithmetic.
8. **IDS: Issues List and Suggested Order**, labeled a suggestion, then long-term issues if any.
9. **Possible Drop-Downs (Not on the List).**
10. **Note to Owners** (draft), only when something is missing or needs an owner's word.
11. **Check Before Sending:** every item listed in `references/prep-rules.md`.

Attach `l10_prep_data.md` so anyone can see each count. If the user asks for one part ("just the scorecard"), give that part with What I Used and Check Before Sending.
