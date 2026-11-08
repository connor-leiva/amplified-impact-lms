# Grading: Eval 3, Friday Rollup (Outlook, No Connector)

Run: SKILL.md followed as written (step 7, Friday Rollup), with references/routing.md, meeting-commitments.md and drafting.md. Inputs: evals/files/eval-3-friday-rollup/ (both digests and the pasted Outlook threads, read in full). Output: output.md.

Objective checks: `python3 -I evals/make/objective_checks.py eval-3-friday-rollup evals/runs/eval-3-friday-rollup/output.md evals/files/eval-3-friday-rollup/*`

Result: 12 of 12 expectations pass, after one fix to SKILL.md found during the run (below); 10 of 10 objective checks pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Done, Open, Slipped right after the bottom line | Pass | "## Done, Open, Slipped" is the first section after the bottom line |
| 2 | Five Done items, each citing its proof | Pass | Done table: Q4 goals (sent Wednesday 4:10 PM), E&O (Hector, Thursday 2:00 PM), open house (Lena, Friday 11:00 AM), lockboxes (Hector, Friday 10:15 AM), photos (Example Photo Studio, Thursday 5:05 PM) |
| 3 | Gwen's roofer names Slipped and urgent; placeholder, no invented names | Pass | Slipped table "Urgent ... Gwen followed up Thursday at 9:20 AM"; Draft 1 uses [Roofer 1 name and phone] |
| 4 | Sam Loanson's flyer Slipped with a follow-up draft | Pass | Slipped table and Draft 3 |
| 5 | Felix's CMA and Ari's hand-off not marked done; no proof either way; suggests asking | Pass | "No proof either way (2)" table: "You weren't copied, so the pasted mail can't show it either way. Ask Felix"; Draft 4 to Ari |
| 6 | Open: Felix notes (today), holiday card proof (Monday), newsletter approval (Monday) | Pass | Open table, all three with dates |
| 7 | Q4 goals and Sam's flyer each appear once | Pass | "Items both digests listed (the Q4 goals and Sam Loanson's flyer) are counted once"; 10 tracked items in the bottom line |
| 8 | One draft to Felix covers the notes and the Sellmores' CMA | Pass | Draft 2, "Your Listing Presentation Notes And The Sellmore CMA" |
| 9 | No follow-up chases an item that isn't overdue | Pass | Holiday card proof: "Not due; no draft." Lena's item gets a reply to her request, not a chase |
| 10 | Says drafts are in the chat because there's no Outlook connector; claims no Outlook drafts or tasks | Pass | "No Outlook connector is set up, so these drafts are here to copy into Outlook. I didn't create any Outlook drafts or tasks." |
| 11 | Mae's settlement change counted as already with transactions, no date tracking | Pass | Routed and Skipped: "Nothing for you to track; confirm dates with your transactions team." |
| 12 | Covered through Friday, October 30, 2026 in Pacific Time; Check Before Sending; Title Case; no em dashes | Pass | "Covered through: Friday, October 30, 2026, 2:50 PM Pacific"; script checks pass |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass (0) |
| Every time appears in the inputs | Pass (14 of 14) |
| Every dollar amount appears in the inputs | Pass (none used) |
| Every other number appears in the inputs | Pass (82 of 82) |
| Title Case on subjects the skill wrote | Pass (3 of 3; two replies stay in their threads) |
| Check Before Sending section | Pass |
| Covered through line | Pass |
| No forbidden strings | Pass |
| Required strings (Done, Open, Slipped) | Pass |
| No banned phrases | Pass |
| No wire or account details, no protected-class language, no cost estimates | Pass (none in the inputs or output) |

## Failures Found and Fixed

- **Step 7 had only three buckets.** Read strictly, "Slipped (past due with no proof)" puts Felix's CMA to the Sellmores and Ari's lead hand-off under Slipped, although Bianca simply wasn't copied on either. That would fail expectation 5 and tell a leader that two teammates dropped work with no evidence. Fixed in SKILL.md step 7: "When the leader wasn't copied on the work, it isn't slipped either: list it as 'no proof either way' and suggest asking. Count items that appear in more than one digest once." The output above follows the fixed text.
- **An invented phrase in a draft.** The first wording of Draft 1 said the roofers were ones "our clients have been happy with," which is not in any input. Changed to "Here are two roofers to call." references/drafting.md already forbids this ("Never invent the deliverable, the names of vendors, a number or a document"); no skill change.
