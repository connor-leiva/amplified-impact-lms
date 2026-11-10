# Grading: Eval 1, the Full Messy Workspace (Avery Mockingdale, Mockingdale Team Ops)

Run on 2026-11-10 by following SKILL.md exactly, with `claude-workspace.md` and `tune-up-rules.md` read, on the five files in `evals/files/eval-1-full-messy-workspace/` (the PDF read as text, page 1) with the prompt in evals.json: "Here's everything from our team ops project, plus my account instructions from Settings. My drafts keep getting things wrong. Tune it up."

Result: **pass, 11 of 11 expectations.** Objective checks in `objective-checks.txt`: 14 of 14 pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Every finding quotes its exact line(s), with where it lives | Pass | Findings 1 to 12; the PDF findings give page 1 and the line; objective check "Every table quote is word for word in the inputs" (37 quotes) |
| 2 | Login email, password, routing number, account number, recruit's cell and personal email flagged by kind and location; none of the six values anywhere | Pass | Flag 1; Findings 1 to 3 with bracketed labels; the diff's removed line keeps "[login email removed]" and "[password removed]"; objective check "Private values never appear" (also no partial strings such as "Sunrise25", "6677" or "0182") |
| 3 | Old brokerage and Taylor Fakeman stale and settled, each citing the dated memory item and the September 2026 file | Pass | Finding 7 cites M2 and the routing file's line 2; Finding 8 cites M4 and the routing file's line 12; both "Stale (settled)" |
| 4 | Monday against Thursday and bullets against paragraphs left for the user; a placeholder names both days | Pass | Findings 5 and 6 ("you decide"); fix 3 gives every option without picking; the rewrite's day placeholder names Mondays and Thursdays; M5 marked Decide |
| 5 | The recruiting text line is a conflict with texting consent, and the rewrite keeps the user's words inside a consent condition | Pass | Finding 4; the rewrite keeps "When I paste a recruit's production, write a recruiting text to them right away," and adds "only when I tell you they agreed to get texts from me" |
| 6 | No invented facts; every added fact traced; every gap a placeholder | Pass | Check Before Sending, "Facts moved into the rewrite"; five placeholders (voice, day, best practices, sign-off, length); no goal, sign-off or practice was made up |
| 7 | Compliance lines present: schools line kept in place, routing file's texting line copied word for word, three house lines added, Flags say so and that state rules weren't checked | Pass | Flag 2; the rewrite keeps "Never mention schools in listing posts." under LISTING POSTS and lists "Text a new lead only when the lead form's texting box is checked." above the house texting line |
| 8 | Account instruction fixes given as Settings changes; the login fix says to change the password | Pass | Flag 5; fixes 3 and 4 name Settings > Your Claude > Instructions and give the replacement line for line 1; fix 1 "Change the Follow Up Boss admin password now" |
| 9 | Memory list quotes each item, removes M8 and M9, marks M5 Decide | Pass | Clean Memory List, rows M1 to M9 |
| 10 | The diff matches the rewrite both ways, with the login and password still replaced | Pass | Both diff objective checks pass; the checker reads each bracketed label as the removed value |
| 11 | Ends with Check Before Sending; no dashes; run-again line; every number in the inputs | Pass | Objective checks |

## Objective Checks

All 14 pass. Numbers in the output (9, 150, 2024, 2025, 2026 and the dates) all come from the inputs; the rest are line, page and finding references.

## Fixed Before Grading

- The first draft's Missing table quoted line 3 as "Send the weekly agent update," which cuts the line and moves a comma inside the quote. It now quotes the whole line. Caught by the objective check.

## Judgment Calls (for review)

- "Be fun but professional." is graded as Vague (pinned): two memory items say what fun means for agent updates, so the rewrite folds them into the line and cites them, rather than asking. `tune-up-rules.md` now says when a line pinned only by memory or a file is still a finding.
- The bullets conflict is between the account instructions and the project. The rewrite can't change Settings, so the conflict sits in the fix list with three options and no pick.
- The PDF's earnest money line also describes a practice (agents giving buyers a trust account). The output stays in lane: it flags the numbers and sends the practice question to the broker.
