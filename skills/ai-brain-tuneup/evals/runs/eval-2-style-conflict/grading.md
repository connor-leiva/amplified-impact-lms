# Grading: Eval 2, a Mostly Fine Workspace with a Style That Fights the Instructions (Quinn Exampleberg, Listing Writer)

Run on 2026-11-10 by following SKILL.md exactly, with `claude-workspace.md` and `tune-up-rules.md` read, on the four files in `evals/files/eval-2-style-conflict/` with the prompt in evals.json: "Here's my Listing Writer project: the instructions, my custom style, the one knowledge file and my memory. It's mostly fine, I think. Tune it up."

Result: **pass, 9 of 9 expectations.** Objective checks in `objective-checks.txt`: 15 of 15 pass (this case adds the QUICK CARD check).

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Every finding quotes its exact line, with where it lives | Pass | Findings 1 and 2; objective check "Every table quote is word for word in the inputs" (11 quotes) |
| 2 | Tone conflict found with both quotes; the user decides; the QUICK CARD doesn't settle it | Pass | Finding 2 quotes instructions line 8 and style line 1, and says the QUICK CARD's "Short sentences. One idea each." and "Plain words over real estate jargon." are neither formal nor casual; fix 3 gives both options without a pick |
| 3 | The client's phone number in M6 flagged and never repeated | Pass | Flag 1; Finding 1 and memory row M6 use "[client phone number removed]"; objective check "Private values never appear" |
| 4 | The QUICK CARD copied character for character, including its [VERIFY] line | Pass | Objective check "QUICK CARD copied character for character" (573 characters); Check Before Sending says the [VERIFY] bracket is the user's own |
| 5 | The user's three compliance lines kept word for word; no house lines added | Pass | Flag 2; the rewrite's Rules section is unchanged in the diff; no Compliance block was added |
| 6 | No invented facts: only Follow Up Boss and Rory Fakewell added, from memory, traced; the tone line is a placeholder naming both | Pass | The Missing table and Check Before Sending cite M5 and M2; the placeholder names formal and casual |
| 7 | Treated as mostly fine: no false stale or vague findings; every line but the tone line unchanged | Pass | Two findings only; fixes 4 and 6 say "none found"; the diff changes one line and adds two |
| 8 | The diff matches the rewrite both ways | Pass | Both diff objective checks pass |
| 9 | Ends with Check Before Sending; no dashes; run-again line; every number in the inputs | Pass | Objective checks |

## Objective Checks

All 15 pass. Numbers in the output (1,000, 489,000, 500 inside the QUICK CARD, and the dates) come from the inputs; the rest are line and finding references.

## Fixed Before Grading

None.

## Judgment Calls (for review)

- The style's lines 2 and 3 ("contractions, first names," and no "Dear" or "Sincerely") pull the same way as line 1, so they are named in Finding 2 rather than given findings of their own. Neither line fights the sign-off line or the template.
- The CRM and transaction coordinator move into the instructions from memory, as `tune-up-rules.md` section 4 says for a basic missing from the instructions. Their memory items are kept, since memory also serves chats outside the project.
- Flag 6 tells the user their style may have become a skill. That comes from `claude-workspace.md`, which marks the move as not confirmed on Claude's help center.
