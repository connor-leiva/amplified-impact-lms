# Grading: Practice Files (Jamie Testerson, My Real Estate Assistant)

Run on 2026-11-10 by following SKILL.md exactly, with `claude-workspace.md` and `tune-up-rules.md` read (`chatgpt-workspace.md` skipped: every piece came from Claude), on the four practice files with the practice prompt: "Tune up my Claude project. Attached are my project instructions, my two knowledge files and my memory, written out by Claude." This is eval 3 in evals.json, and the output is kept as sample.md.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: 14 of 14 pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Every finding quotes its exact line, with where it lives | Pass | Findings 1 to 12 each quote the line and name the piece and line (or memory item); objective check "Every table quote is word for word in the inputs" (34 quotes) |
| 2 | The seller's phone number in M10 flagged and never repeated | Pass | Flag 1; Finding 1 and memory row M10 quote it as "[client phone number removed]"; objective check "Private values never appear" (also no "0147", "801 555" or "(801)") |
| 3 | The email length conflict left for the user, with a placeholder naming both options | Pass | Finding 3 ("you decide"); fix 3 gives both; the rewrite's [Email length: ...] placeholder names both; memory M6 marked Decide |
| 4 | Fakewood and Jordan settled by dated memory and the October checklist; the 2025 goals and M9 asked | Pass | Findings 4 and 5 ("Stale (settled)") cite M2, M3, M4 and the checklist's lines 2 and 5; Finding 6 ("Stale (ask)"): "Only the dates say it's old: tell me the current goal"; M9 changed to [year] and [number] |
| 5 | The texting line is a conflict with texting consent, kept inside a consent condition | Pass | Finding 2 "Conflict (compliance)"; the rewrite: "Text new leads first only when I tell you they agreed to get texts from me, then email if they don't answer. Without that, email first."; fix 2 offers deleting it instead |
| 6 | No invented facts: brokerage, market, team, CRM from memory and traced; the gaps are placeholders | Pass | Check Before Sending, "Facts moved into the rewrite," each with its memory item; four placeholders for voice, email length, brand file and the example note; no goal, market or color invented |
| 7 | The three house compliance lines added, with Flags saying so and that state rules weren't checked | Pass | Flag 2; the rewrite's "Compliance (keep these lines)" block; objective checks for the fair housing, texting consent and drafts-only lines |
| 8 | The memory list quotes every item with Keep, Change, Remove or Decide, removing M10 and M11 | Pass | Clean Memory List, rows M1 to M11 |
| 9 | The diff matches the rewrite both ways | Pass | Objective checks "Diff: unchanged and added lines are the rewrite" and "Diff: unchanged and removed lines are the original" |
| 10 | Ends with Check Before Sending; no dashes; run-again line; every number in the inputs | Pass | Objective checks: section order, no dashes, run-again line, numbers |

## Objective Checks

All 14 pass. The only numbers in the output are from the inputs (100, 900, 550,000, 2025, 2026 and the dates), today's date, and line and finding references.

## Fixed Before Grading

- The first draft quoted the plan's goal as "30 closed transactions," with the comma inside the quote marks, which isn't the line as written. The sentence was reworded so the quote is exact. Caught by the objective check.
- The first draft gave each piece's line count in the header (15 and 17 lines). Those are counts the skill worked out, not facts from the inputs, so they came out; the line numbers in the table stay.
- The checker itself first cut the rewrite short at the "## How to write" line inside the code block, and checked quotes in the memory list's New Wording column; both were fixed in `objective_checks.py` before this grading.

## Judgment Calls (for review)

- Lines 4 to 6 ("Be professional.", "Make my emails sound good.", "Keep everything short but thorough.") collapse into two placeholders (voice and email length) rather than three. Each is still quoted as its own finding.
- The texting line keeps "then email if they don't answer" for consented leads and adds "Without that, email first." That second sentence follows the house texting rule; fix 2 offers deleting the line instead.
