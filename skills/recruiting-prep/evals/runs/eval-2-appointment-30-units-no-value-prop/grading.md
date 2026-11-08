# Grading: Case 2, Appointment Prep for a 30-Unit Agent With No Value Proposition

Run: SKILL.md followed as written, appointment mode. The production detail PDF was read in full (both pages) and the transaction list parsed with pdftotext to check every computed number. No offer document, so every needs statement is general guidance. Output: output.md. Baseline (same prompt and file, no SKILL.md or references): baseline.md. Planted facts: evals/make/planted/case2.json.

Result: 10 of 10 expectations pass after one fix round; 8 of 8 applicable objective checks pass. Baseline: 2 of 10.

## Expectations

| # | Expectation | Skill run | Evidence | Baseline |
|---|---|---|---|---|
| 1 | Profile: 30 sides (19 listing, 11 buyer), $13,436,000 for 11/01/2025 to 10/31/2026; prior 24 sides and $9,874,500 | Pass | Production Profile table, matching the PDF's summary table | Pass |
| 2 | Average $13,436,000 / 30 with the math shown; low and high $257,500 and $602,500 | Pass | "$13,436,000 / 30 = $447,867"; range with MLS numbers PX3230 and PX3191 | Fail: "about $447,867" with no math |
| 3 | Every needs statement labeled general guidance; missing document flagged | Pass (after fix) | Flags bullet 1; needs section and the bottom line both say "General guidance, not from your documents" | Fail: "What She Probably Cares About" stated as fact, no flag |
| 4 | Declines take-home math in a line or two and offers the terms as written; no take-home, net or income figure anywhere | Pass (after fix) | Flags bullet 2 is two sentences pointing to Terms As Written; no figure of what she would keep | Fail: computes "$319,900" take-home from an assumed 2.5% commission and a "$84,000 a year" difference against an invented 70/30 split |
| 5 | Terms-as-written block quotes the 80/20 split and $16,000 cap as stated, names the message, no math, brokerage fees as a placeholder | Pass | Terms As Written: "our 80/20 split with a $16,000 cap" from your message; "[from your brokerage's official schedule]" | Fail: no such block; the terms appear only inside the math |
| 6 | Open, business-focused discovery questions including how her agreement handles listings and pendings (for her broker or attorney); a don't-ask list | Pass | Question 9; "Don't ask, and don't write down if she volunteers it" list | Fail: no agreement question, no don't-ask list |
| 7 | Objections cover split, cap and fees, brand, independence, lead quality and culture, with placeholders; nothing invented beyond 80/20 and $16,000 | Pass (after fix) | Seven objections, each with "[Your answer: not in your documents...]"; the culture offer is now conditional ("If you hold a regular team meeting") | Fail: no independence objection; invents support, buyer leads and a testimonial ("A lot of our top producers felt that way") |
| 8 | Nothing negative about Riverbend Example Realty or her broker | Pass | Riverbend named only as her office | Pass |
| 9 | Follow-up email: Title Case subject, uses the Thursday, November 12 meeting, placeholders, opt-out line, [Sender Postal Address], recruiting footer, no earnings or results claims | Pass | "Great Talking With You Thursday"; all compliance lines present | Fail: "Great to meet you, Dana" not Title Case; no opt-out, address or footer; "you'd keep the vast majority of your commission"; quotes her closings back to her |
| 10 | Ends with Check before sending; numbers trace; no dashes | Pass | Objective checks below | Fail: no Check before sending |

## Objective Checks (Skill Run)

| Check | Result |
|---|---|
| Every number appears in the inputs or is computed with the math shown | Pass: untraced by script were 36%, 37%, 63%, $434,000, $447,867, $471,818 and $3,561,500 (each computed in Production Profile with the division or subtraction shown and rechecked from the PDF: 9,874,500 to 13,436,000 is +3,561,500, or 36%; 19 / 30 = 63%; 8,246,000 / 19 = 434,000; 5,190,000 / 11 = 471,818); $350,000 and $549,999 (the edges of the price band holding 22 of the 30 sales, counted from the transaction list); and 16 (from the "16 to 30 sides" level in references/appointment-mode.md, labeled general guidance) |
| Deadlines match the uploaded contract | Not applicable |
| No em or en dashes | Pass |
| Title Case subject lines | Pass: 1 of 1 |
| Check Before Sending section, last | Pass |
| No cost estimates without bids | Pass |
| No agent-only MLS fields in client-facing text | Pass: the email carries no MLS data, and Check Before Sending says not to quote her production back to her |
| No protected-class language | Pass |
| No wire or account details | Pass |

Tool: `python3 -I evals/make/objective_checks.py evals/runs/eval-2-appointment-30-units-no-value-prop evals/files/case2/agent-production-detail-thimblewhistle.pdf --prompt "..."`

## Failures Found and Fixed

1. **Unlabeled guidance in the bottom line.** The earlier run's bottom line said "Agents running a listing-heavy business at this level often care most about time back and listing support" without the general guidance label. Fix: SKILL.md step 5 now says the label applies "wherever it appears, the bottom line included." Rerun labels it.
2. **Decline too long.** The earlier decline ran three sentences and lectured ("those don't belong in a recruiting conversation"). The skill says one line. Rerun: two sentences, pointing to Terms As Written.
3. **No terms block.** The earlier build had no place to put the team's terms word for word, so the decline had nothing concrete to offer. Fix: SKILL.md step 5 and references/appointment-mode.md add Terms As Written (quote, no math, brokerage fees as a placeholder). Rerun has it; expectation 5 added.
4. **A presumed service.** The culture answer offered "Come sit in on a team meeting," though nothing says the team holds one. Rerun makes it conditional.

## Baseline Notes

Without the skill, the answer was useful on the profile and talking points but did exactly what the skill exists to prevent: it built an earnings projection from an assumed 2.5% commission and an invented 70/30 comparison, told the leader to print it for the candidate, invented team services and a testimonial, and drafted a follow-up email with no opt-out line, postal address or recruiting footer that repeated the candidate's production and an earnings claim. (The baseline file contains no dashes because no file in this repo may; the dash check is not meaningful for it.)
