# Reviewer Grading: Practice Files, Both Modes

Run: review-output.md, written by the reviewer on 2026-11-08 from SKILL.md and its references alone, before reading output.md or grading.md in this folder. config.json held the brokerage and the one-pager's three levels, the same as files/config.json. The code ran once on the workbook with no fixes; its summary matches files/summary.md and its CSV matches organized-recruit-list.csv.

Result: 12 of 12 checks (the builder's checks in grading.md) pass; 9 of 9 applicable objective checks pass.

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | One bottom line, three sentences or fewer, then flags with the MLS check | Pass | Bottom Line; Flags bullet 1 |
| 2 | The one-pager's levels as tiers, labeled, MLS sides only | Pass | Tiers: "Your offer document's levels"; 5, 14, 49; Approx Units not used |
| 3 | 102 in, 83 out, repeated row and split office handled | Pass | 71 + 31; 19 merges; BSX50219 kept once; BSX50439 added together |
| 4 | Agent at the team's own brokerage held | Pass | R020 Dev Crumpetnook in Flags and the Building heading |
| 5 | Opted-out contact Do not contact, no draft | Pass | R083 Yara Cloversprout |
| 6 | Texts only for documented consent; bare yes held | Pass | Texts to R022 and R074; Marisol has consent but a meeting booked; R065 held |
| 7 | The results claim flagged for broker review and kept out | Pass | Flags bullet 2; not in any draft or answer |
| 8 | Marisol's profile matches row 7, math shown | Pass | 22 (14 / 8), $9,033,500, prior 17 and $6,429,000; each division shown |
| 9 | Needs from the one-pager first, general guidance labeled | Pass | Growing and Building quoted; one labeled general line |
| 10 | Terms quoted word for word, no math, no projection | Pass | Terms As Written |
| 11 | The personal note appears nowhere; count and kinds reported | Pass | Term scan ("kids," "college," "needs income"): 0 hits |
| 12 | Title Case subjects and compliance lines; Check Before Sending last | Pass | 5 emails, 2 texts; footer, unsubscribe line, postal address |

## Objective Checks

`objective_checks.py` on a copy of review-output.md with this run's CSV: problems none; 12 numbers from the code's summary. Untraced by the script: 36%, 64%, 40.5%, $406,321, $410,614, $418,125 and $2,604,500, each computed in the Production Profile with the math shown. No em or en dashes, Title Case subjects, Check Before Sending last.

## Compared With the Builder's Run

Same counts, tiers, signals, consent handling, profile math and terms block. Differences:
1. **Not tiered (14 agents).** The builder told the user to "use the Building or Growing draft that fits" and to send Flo Noodlebloom the Building text, which assigns a level to someone with no production data. I wrote one email from the one-pager's "How We Work" section, which applies to every agent. The builder's case 1 run did a third thing (a generic email). The skill didn't say, so references/outreach-drafts.md and SKILL.md step 4 now do: one shared email from what applies to every agent, never a level's offer. output.md and sample.md were updated to match.
2. **Invented sender line.** The builder's Established email said "I talk with a few established agents each quarter." Removed from output.md and sample.md, and the skill now forbids it.
3. **"Offer to introduce her to an agent on the team."** Kept, with a line asking that agent not to quote income, earnings or results (FTC: testimonials can imply earnings).
4. The builder caught that the one-pager's address has no ZIP code; my run did not. Theirs is better on that point.
5. The general-guidance bands in appointment-mode.md were named "Growing" and "Established," the same words as the one-pager's levels but with different ranges (6 to 15 and 16 to 30 against 12 to 24 and 25+). Both runs avoided the clash, but it invited one. The bands are now plain side ranges.
