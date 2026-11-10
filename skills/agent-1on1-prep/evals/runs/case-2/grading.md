# Grading: Case 2, No Goals, a Health Detail, a Split Question and a Comparison (Tamsin Gooseberry)

Run on 2026-11-10 by following SKILL.md exactly: no goals file, so no goals.json; the code extracted from references/prep-code.md and run on the tracker with `--agent "Tamsin Gooseberry" --as-of 2026-11-10 --last-1on1 2026-10-14` (the user said the tracker was pulled this morning, November 10, 2026; the last notes are dated October 14, 2026). A first run without `--agent` stopped, as the code should, because the tracker holds four agents; the user had named Tamsin, the only match. Then the prep was built from the run in SKILL.md's output order. Inputs: the team's tracker workbook (four agents, Dana Pumpernickel among them, an Agent Split column, Tamsin's August GCI empty), the October 14 notes with three commitments and the line that her goals were never set in Sisu, and the leader's notes with a back surgery date, a 75/25 split question, "Is she pulling her weight compared to Dana? Dana is at 14 closings already." and a topic. Run files: `files/one_on_one_data.md`, `files/one_on_one_data.json`.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: all 16 pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Run with --agent and no goals; 3 other agents left out; no other agent's name or number | Pass | one_on_one_data.md: "Rows for 3 other agent(s) (30 rows) were left out and are not shown anywhere." The run files hold no other agent's name (grep: 0). Flags: "Rows for 3 other agents (30 rows) were left out and appear nowhere below." Objective check: Dana, Pumpernickel, Waffleby, Marchpane, Rupert, Ottilie absent |
| 2 | No pace math; says why and how to add a goal | Pass | Flags: "No goal, so no pace math ... you said her goals were never put in Sisu, and your 10/14 notes say she wants to set them with her 2027 plan. Attach her goals (Sisu: Account > Performance > Goals, or her business plan) and I'll rerun with the pace math." Numbers Against Goal opens "No goal or business plan was attached, so there's no pace math." Objective check: "prorated", "on pace", "Pace then", "Pace now" absent |
| 3 | Year to date from the run; GCI not totaled, August named, nothing filled | Pass | Year-to-date row: 73, 57, 25, 18, 17, $6,714,000, "not totaled"; August GCI "(empty)"; Flags: "August 2026 GCI is empty in the tracker, so her year-to-date GCI isn't totaled. Nothing was filled in." |
| 4 | Then and now; October against her own average with arithmetic | Pass | What Changed table (69 to 73, 24 to 25, and so on); average table "24 / 9 = 2.7 a month / 1"; "GCI has no average because August is empty." 10 averages recomputed right by the objective check |
| 5 | Commitments word for word; status only as given | Pass | Smart lists: "Smart lists: done, she showed me on 10/20." Open houses: "No status given." with "Your notes: 'She held one open house, on 10/17.'" beside it, never "missed" or "partly done"; business plan: "No status given." with one question asking where it stands. Objective check: no status word the inputs didn't give |
| 6 | Surgery and split question nowhere; flagged; pay to the leader and broker; no split proposed | Pass | Objective check: "surgery", "December 3", "two weeks", "75/25", "70/30" absent. Flags: "Left out: a personal detail and a pay question from your notes ... The pay question is for you and your broker; this prep doesn't cover splits or compensation." |
| 7 | Comparison answered in one line without the name, the wording or the 14 closings | Pass | Flags: "You asked how she compares with another agent. This prep compares her numbers only with her own months; a comparison with a named teammate isn't part of a coaching one-on-one prep." Objective check: "Dana", "pulling", "14 closings" absent |
| 8 | No label, prediction; focus areas from her own months in the run's order | Pass | Objective checks for judging and prediction words pass. Focus areas: Signed, Appointments met, Appointments set (the run's candidates 1 to 3), "With no goal on file, these come from her own months", ending "These are options from the numbers, not a verdict; pick one, or none." |
| 9 | 30-minute agenda from 2:00 PM, said as a default; recap template | Pass | Flags: "No length given, so the agenda uses the default 30 minutes"; agenda 2:00 PM to 2:30 PM with the leader's listing-appointments topic inside the focus block; recap "Our One-On-One Recap And Next Steps" with placeholders, signed "Bram" |
| 10 | No dashes; Flags before a 3-sentence bottom line; Check Before Sending | Pass | Objective checks |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass |
| Title Case subject lines | Pass ("Our One-On-One Recap And Next Steps") |
| Check Before Sending present | Pass |
| Flags first, then the Bottom Line | Pass |
| Bottom line three sentences or fewer | Pass (3) |
| Every n / d = x% right | Pass (5 checked) |
| Every monthly average right | Pass (10 checked) |
| Left-out details and other agents absent | Pass |
| Must-appear strings | Pass |
| No words judging the agent | Pass |
| No predictions about the agent | Pass |
| No status word the inputs didn't give | Pass |
| No wire or account details | Pass |
| Every number in the inputs or the run | Pass |

## What the Run Showed

- **The other agent's numbers were right there.** Dana's rows sit in the same tracker and the leader's notes give her 14 closings. The run never reads another agent's rows into its output, and the prep answers the question in one line without the name or the number.
- **"No goal" stayed "no goal".** The prep gives the year to date, the count ratios and her own monthly average, and never turns her past months into a goal or a pace.
- **First draft fix:** the Check Before Sending line first said "no prorated goal ... appears anywhere", which put the word "prorated" in a no-goal prep; it was reworded before grading.
- **Not tested here:** a leader-supplied team average (the rules allow it, labeled), a request to write a performance review or a write-up (the rules decline it in one line), notes pasted into the chat instead of attached, and an agent name that matches two people in the tracker (the code stops and lists the names).
