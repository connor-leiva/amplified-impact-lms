# Grading: Practice Files (Gumdrop Hollow Home Team)

Run on 2026-11-10 by following SKILL.md exactly, with `fub-inputs.md`, `audit-rules.md`, `utah-texting-notes.md` and `outreach-rules.md` read, on the four practice files with the practice prompt: "Here are our Follow Up Boss action plans, our automations list, and our stages and lead sources. Audit them: what's missing, what's overlapping, and are our automated texts a problem?" Kept as sample.md. This is eval 1 in evals.json (the full practice set).

Result: **pass, 14 of 14 expectations.** Objective checks in `objective-checks.txt`: all pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Inventory: all 10 plans, all 7 automations (Back On Site off), the 3 initial texts and the Open House 3 Text, each with its source; Open House Visitor from the printed PDF | Pass | Inventory rows 1 to 21; row 4 source "printed PDF, page 1"; row 17 "Automation, off" |
| 2 | Days worked out from "after the previous step," with arithmetic (Spring Market Note at day 150 = 30 + 120) | Pass | "Day math" list under the inventory: "150 (30 + 120)"; objective check "Every written-out sum or difference is right" |
| 3 | Utah mode: 13-25a-103(3) Sunday and holiday line on the automated texts, 7 days a week and weekend open houses, not confirmed for texts, to the broker, no ruling | Pass | Flag 3; Texting-Consent Risk, "Utah" bullet; Fix 2 "ask your broker about Sundays"; Check Before Sending |
| 4 | Consent results: Facebook Risk, Open House 3 Text Risk, HomeFinder Check, Website Lower risk if records hold | Pass | Texting-Consent Risk table, one result per text |
| 5 | Wording: Facebook no sender or opt-out, HomeFinder no opt-out, Open House 3 Text days 0 and 2 no opt-out, the two fair housing phrases quoted once with the smallest change; action plan emails not flagged for unsubscribe | Pass | Template Wording; objective check "Each fair housing phrase quoted at most once"; last Template Wording bullet |
| 6 | Overlap 1: day 30 stage and tag start Nurture Drip and Market Email; same-day emails on days 0, 30, 150; stage link to confirm | Pass | Overlaps 1 and its table; "To confirm" |
| 7 | Overlap 2: Happy Closing Day! on day 30 plus the Closed stage start Closing Day Thank You's day 0 Happy Closing Day | Pass | Overlaps 2, "two closing-day emails on day 30" |
| 8 | Stages with nothing: Hot Prospect, Active Client, Sphere; Trash expected; Back On Site not counted | Pass | Gaps, "Stages with nothing attached" |
| 9 | Lead sources with nothing: Referral and Sign Call | Pass | Gaps, "Lead sources with nothing attached" |
| 10 | Stop on reply off: Facebook Seller Lead and Monthly Market Email as gaps; Under Contract to Close possibly on purpose, asked | Pass | Gaps, "Stop on reply off"; Question 3 |
| 11 | Portal Buyer 14 Day ends with no next step (email on day 14) | Pass | Gaps, "Ends with no next step" |
| 12 | Long-Term Nurture's 120 days (day 30 to day 150) against the labeled 90-day default; no other plan flagged | Pass | Gaps, "Long silence"; What I Used, "Defaults used" |
| 13 | Fix list ranked with consent first, click paths in FUB or a named Sample Drip Texter change, no claim of a change | Pass | Fix List items 1 to 3 are the consent items; objective check "No claim of a change made and no legal ruling" |
| 14 | TCPA basics once, with outreach-rules.md and its Last verified date; ends with Check Before Sending | Pass | "The basics" block; objective checks for the source line and the last section |

## Objective Checks

All pass. The computed days (2 to 365) each match their written-out sums. Numbers from the references, not the inputs (08, 13, 25, 47, 64.1200, 67, 103, 2021, 2025), are the citations in the basics block and the Utah line.

## Fixed Before Grading

- The first draft ranked the HomeFinder Example text below the fair housing fix. SKILL.md says every automated text to a new lead is a risk unless its trigger reaches only documented consent, so `audit-rules.md` now says a Check on a text to new leads ranks with the risks, and the HomeFinder text moved up to item 3.
- The first draft quoted the fair housing sentence twice (Template Wording and the fix list). The fix now points back to the quote.
- The first draft gave the fix for the template without a click path; `fub-inputs.md` now cites Admin > Email Templates (How to Use Merge Fields, updated 2025-02-25), and the fix uses it.
- The first draft didn't say whether Sample Drip Texter stops on a reply; it now lists that as not shown and asks.
- Source names in the inventory are short forms; What I Used now says which file each short form means.
