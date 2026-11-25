---
name: agent-1on1-prep
description: "Preps a team leader or coach for a coaching one-on-one with one agent, from that agent's numbers (a Sisu Agent Accountability or dashboard printout, a Follow Up Boss report, or a spreadsheet of appointments set and met, signed, under contract, closings, volume and GCI by month), their goals or business plan, last time's notes and the leader's notes. It does the pace math in code (year to date against the prorated goal, arithmetic shown), shows what changed since last time, lists last time's commitments with status exactly as given, and drafts open questions, one to three possible focus areas, an agenda and a recap template. Facts, not judgments. Use it when someone says prep my 1:1 with an agent, coaching session, accountability meeting or check-in, or attaches one agent's numbers and goals, even if they never say one-on-one. Not for the team's P&L (team-pnl-review), recruiting conversations (recruiting-prep), the weekly team L10 (l10-meeting-prep) or the team's weekly pipeline (fub-pipeline-review)."
compatibility: "Needs code execution (Settings > Capabilities > Code execution and file creation) to read the numbers, do every sum, prorated goal and pace in Python, and build the page it hands back. Works from uploaded CSV or Excel files, PDF printouts and pasted notes. A Sisu or Follow Up Boss connector, if one is connected, is used read only."
metadata:
  author: Amplified Impact
  version: "1.1"
---

# Agent 1:1 Prep

Turn one agent's numbers, goals and notes into the page a team leader walks into a coaching one-on-one with: where the agent stands against their own goal with the pace arithmetic shown, what changed since last time, last time's commitments carried forward exactly as given, and the questions to ask. Sisu already shows each agent's dashboard and pacer; the value here is the prep, and the risk is a guess, a label or a personal detail slipping into it.

**Run:** reads the numbers, goals and notes, does every sum, prorated goal, pace and ratio in code with the arithmetic shown, and lines up last time's commitments with their status as given. **Draft:** the prep (questions, focus options, agenda) and a recap template, for the leader to read first. **Own:** the leader picks the focus and decides what to raise and how; the agent gives their own commitments and status; any judgment about the agent's work, and anything about pay, splits, HR or their place on the team, stays with the leader, the broker and HR. This skill never sends anything and never writes to Sisu or a CRM.

## Before You Start: Code
This skill hands back a page: one HTML file the leader can sort, search and print. The page is built by
`scripts/build_page.py`, so it needs code execution (Claude: Settings > Capabilities > Code execution and
file creation. ChatGPT: the code tool). Check once with `python3 SKILL_FOLDER/scripts/build_page.py --help`
(`python` if `python3` is not found).
If code can't run, stop and say how to turn it on. Never estimate or hand-write the page.

## 1. Get the Files

- **What to attach:** the agent's numbers by month, their goals or business plan, last time's one-on-one notes, and the leader's notes for this one (a file, or typed into the chat). Where each comes from: `references/exports.md`.
- **Required:** the numbers, or at least last time's notes. With neither, say in one line where the numbers come from (`references/exports.md`) and stop.
- **One agent:** if the numbers hold several agents and the user didn't name one, ask once which agent. Never prep two at once.
- **Settings** (as-of date, meeting date, time and length, last one-on-one date): as `references/prep-rules.md` (Settings) says. Never ask the user to type what a file holds; use the default, say so in Flags, and keep going.
- **A PDF or screenshot of numbers:** copy the monthly figures into a CSV exactly as printed and say so in Flags. **A connector** (Sisu, Follow Up Boss), if connected and the user wants it used: read only; save what it returns as a CSV in the same layout before running.
- If code execution is off, tell the user to turn it on (Settings > Capabilities) and stop. Pace math done by eye is how a number gets invented.

## 2. Write goals.json, Then Run the Prep in Code

Read `references/prep-rules.md` (Goals). If there are goals, write `/tmp/goals.json` as the code's header shows: one entry per production goal, each with the line it came from exactly as written. Pay figures never go in. No goals: skip the file.

Extract the code from `references/prep-code.md` (in this skill's folder) and run it. Don't read the code into the conversation:
```
python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/prep1on1.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/prep-code.md
python3 /tmp/prep1on1.py --numbers FILE [--agent "NAME"] [--goals /tmp/goals.json --goals-source GOALS_FILE] --as-of YYYY-MM-DD [--last-1on1 YYYY-MM-DD] [--through YYYY-MM] [--columns /tmp/columns.json] --out OUTPUT_FOLDER
```
Goals typed into the chat: save the message text to a file, exactly as typed, and pass it as `--goals-source`. It writes `one_on_one_data.md` and `one_on_one_data.json`.

## 3. Check How It Read the Files

1. **Columns:** check "Files Read." If a column was read as the wrong measure, write `/tmp/columns.json` as the code's header shows and rerun. Every "Confirm" line goes in Check Before Sending.
2. **Goals:** check "Goals Read." Every goal left out (its quote or number not found) is named in Flags with the reason; never put it back by hand.
3. **Window:** confirm the pace window ends at the last full month before the as-of date and a partial month is shown apart. If the user named another month, rerun with `--through`.
4. Every number in the prep comes from the inputs or the final run. Never add, subtract, average or round anything by hand; if a figure isn't in the run, leave it out.

## 4. Build the Prep

Follow `references/prep-rules.md` for each part:
- **Numbers against goal:** the run's year to date, prorated goal, pace, difference and what the annual goal needs, each with its arithmetic; the count ratios with their caveat. No goal: the year to date and the line saying why there's no pace math.
- **What changed since the last one-on-one:** the run's then-and-now table and each month since against her own average, then what the notes report, each labeled with its source.
- **Last time's commitments:** word for word, status exactly as given with its source, a matching number from the file beside a numeric one as a fact.
- **Open coaching questions,** **possible focus areas** (one to three from the run's candidates, as options), the **agenda** and the **recap template.**

## 5. Hand It Back As A Page
1. The run's `one_on_one_data.json` is the facts file: every number the page uses is in it or in the inputs. Never type a number by hand.
2. Write `page.json` in OUTPUT_FOLDER: the sections in "Output, In This Order", using the section kinds in
   `references/page-format.md` and the kind named beside each item there (an item naming several kinds becomes that many sections, in order). The recap goes in one `drafts` section. Check Before Sending is the last section, a `checklist`.
3. Write `words.json`: the headline (two short sentences) and three findings, the bottom line's three parts, each `status: quiet` with a short `chip` naming its part ("Pace", "Since <last 1:1 date>", "Commitments"). No moves: the focus is the leader's call. Status words stay facts, never verdicts: a measure against its prorated goal takes `on` with "At Goal" or `hold` with "Under Goal", the run's own words; never `off`, "behind" or "on track".
4. Build: `python3 SKILL_FOLDER/scripts/build_page.py page.json --words words.json --facts one_on_one_data.json --inputs <their CSV and text files (not a spreadsheet or PDF), and the leader's message saved to a file> --out OUTPUT_FOLDER/Agent-1on1-Prep-<Agent-Name>-<YYYY-MM-DD>.html` (the meeting's date). Write every clock time in MT, both ends of a range ("10:00 AM MT to 10:05 AM MT"); the build adds the CT time beside each. Outside Mountain time, add `--tz-label` with the team's zone.
5. BUILD STOPPED lists what to fix (a number not in the facts, a time without MT, a heading not in Title Case,
   "industry standard", a line saying something was sent). Fix the words, never the check, and build again.
6. Hand over the file at the path the build printed, with `one_on_one_data.md` beside it (Claude: the outputs folder, so it shows as a download. ChatGPT: the download link, and say "download it now, the link
   expires"). A Data Check that comes from their files (a column to confirm, a goal left out, a month not totaled) stays on the page: say so in one line. Then four lines in the chat: the headline, the number that matters, the first open question, and "check
   every number against your files before you act."

## 6. Guardrails

- **Never invent.** No number, goal, commitment, status, date or event that isn't in the inputs or the run. A missing goal means no pace math, and the prep says so. An empty or unreadable cell stays as it is.
- **Status only as given.** Never mark a commitment done, not done, missed or late from numbers, dates or silence.
- **Facts, not judgments.** No labels for the agent ("underperforming", "lazy", "struggling"), no predictions about their future ("on pace to finish", "will miss"), and no comparison with another named agent, even when asked or when their rows are in the file. A team average only when the leader supplies one, labeled.
- **Privacy.** Health, family, personal life, HR and pay details stay out of every part of the prep and the recap, wherever they appear, with one line in Flags saying something was left out. No client names or addresses from a report.
- **Not a performance review, a write-up, a performance plan or a termination document.** If asked for one, say so in one line, route it to the broker and HR, and offer the prep. Never propose changing splits, compensation, caps, fees or leads.
- **Drafts only, read only.** Never send the recap, never write to Sisu, Follow Up Boss or any CRM, even with a connector.
- **Stay in lane.** No benchmarks or "typical agent" numbers, no income projections. Sisu stays the source of record for its own pacer and conversion; name it when it answers better.

## 7. Output, In This Order

The page holds these sections in this order, each kind in brackets; the page draws the bottom line at the top, so Flags is the first section under it. The chat gets four lines.

1. **Flags** (`callouts`, the left-out line first with `hold` and "Left Out"): the files read, the as-of date and where it came from, the meeting date, time and length (given or default), the pace window and any partial month left out, goals (prorated how, any left out and why, or none), columns to confirm, anything left out for privacy or pay, and a one-line answer to any comparison or verdict asked for. Every "Confirm" line, goal left out and measure not totaled also goes in `dataCheck`.
2. **Bottom line** (three sentences max; the headline and findings in `words.json`; 3 to 5 `keyNumbers`, each measure with its bar to the prorated goal): where the agent stands against their own goal (or that there's no goal), what changed since last time, and the commitments' statuses as given.
3. **Numbers Against Goal**, with the arithmetic (`progress`, the run's arithmetic in `math`; then a `table` month by month with a `multiples` chart; then `meters` for the count ratios, the plan's rate as the mark). No goal: `progress` items without a goal, so no bar; a measure not totaled stays out and says why in the note.
4. **What Changed Since the Last One-on-One** (`deltas` then and now, the table in `detail`; `bars` for each month since against her own average; `notes` for what the notes report, each with its source).
5. **Last Time's Commitments** (`commitments`: owner and due only from the commitment's own words; `quiet` and "No Status Given" whenever no status is given, with any related fact as `fact`).
6. **Open Coaching Questions** (`questions`, the fact each is tied to as its `why`; `show` 4).
7. **Possible Focus Areas (Your Call)** (`choices`, with "These are options from the numbers, not a verdict; pick one, or none." as the callout).
8. **Agenda**, labeled a suggestion (`agenda`).
9. **Recap Template (Fill In After)**, with a Title Case subject and [placeholders] (`drafts`).
10. **Check Before Sending:** every item listed in `references/prep-rules.md` (`checklist`).

Attach `one_on_one_data.md` beside the page so the leader can see every sum. Say it is for the leader, not the agent's file. If the user asks for one part ("just the questions"), give that part with Flags and Check Before Sending.
