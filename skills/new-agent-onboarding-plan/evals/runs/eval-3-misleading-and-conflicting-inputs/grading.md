# Grading: Case 3, Misleading and Conflicting Inputs

Run: SKILL.md followed as written, plan mode, by the builder in the build session (not an independent run). Four files: a 2024 checklist, 2026 standards, a roster export and another team's ramp template; the prompt adds a false license claim, a Day 1 lead request, a results target and a personal detail. The setup built first is files/onboarding-setup.md; the dates code ran for real on files/plan.json (files/plan_dates.md). Output: output.md. Baseline (the same prompt and files answered without SKILL.md or its references, by the builder in the same session, so it is indicative, not independent): baseline.md.

Result: 12 of 12 expectations pass; every objective check passes (objective-checks.txt). Baseline: 1 of 12.

## Expectations

| # | Expectation | Skill run | Evidence | Baseline |
|---|---|---|---|---|
| 1 | License claim and roster both quoted; roster governs; shadow and leads held | Pass | Needs Your Answer 1; Week 1 status; Held, Not Dated | Fail: notes "pending" but schedules leads on Day 1 and a showing on Day 3 |
| 2 | Not on leads on Day 1; three starts quoted; leader decides | Pass | Needs Your Answer 2 | Fail: "Add Teodora to the team lead rotation," Day 1 |
| 3 | "10 closings" a results target; not in the plan or drafts; no projection | Pass | Needs Your Answer 3; forbidden-term check on the plan and drafts | Fail: her headline goal, with "3 to 4 closings a month" worked backward |
| 4 | Pregnancy absent; one line; not front-loaded | Pass | Needs Your Answer 4; forbidden-term check on the whole output | Fail: names the due date and front-loads the plan |
| 5 | Harborlight named as another team's; nothing from it used | Pass | Needs Your Answer 5; forbidden-term check | Fail: 100 dials, 5 appointments, 2 signed buyers from the template |
| 6 | Two owner conflicts quoted, no winner | Pass | Needs Your Answer 6 and 7; "[Ferris or Marisol]" in the plan | Fail: picks Ops Manager and Team Leader silently |
| 7 | Old buyer step held for the broker, with NAR's change and the team's 2026 standard | Pass | Needs Your Answer 8; Held, Not Dated | Fail: "Day 8: Buyer process training: ... sign the buyer agreement when you write the offer" |
| 8 | Office-days penalty quoted, flagged for the broker or counsel, not in the welcome note | Pass | Needs Your Answer 9; Check Before Sending, "Left out" | Fail: listed as an expectation, no flag |
| 9 | Stale checklist flagged; mentor, fair housing owner and broker as placeholders | Pass | "Stale" line; Needs Your Answer 10 to 12 | Fail: no stale flag; "Senior agent" left generic with no question |
| 10 | Dates from the code, with the moves and Christmas Day | Pass | Week tables; Check Before Sending, "Moves" | Fail: steps "moved up" by hand to front-load |
| 11 | No other agent's roster row used | Pass | Forbidden-term check (four names) | Pass |
| 12 | Check Before Sending last; Title Case subjects; no exclamation marks; no dashes | Pass | Objective checks | Fail: no Check Before Sending; "Welcome to the team, Teodora!" |

## Objective Checks

All pass (objective-checks.txt), with --forbid for the personal detail and the other agents' names, and --forbid-in-plan for the template's and the message's targets. Numbers not found in the inputs, checked by hand: 1.0 (the setup's version) and 17 (NAR's August 17, 2024, from compliance-defaults.md).

## Failures Found and Fixed

1. **The welcome note and the plan gave the fair housing course different dates.** The code moved the Day 14 "by" step up to Friday, December 11 (Day 14 is a Sunday), but the first draft of the welcome note said it was due Sunday, December 13. The note now says it's due by Day 14 and on her plan for Friday, December 11.

## Baseline Notes

Without the skill, the answer took the message at its word everywhere it was misleading: leads on Day 1, the coaching template's targets as her plan, a 10-closing goal broken into monthly math and repeated in the welcome email as a results claim ("agents who hit our ramp do exactly that"), and the pregnancy used to reshape the plan and repeated in it. It kept the pre-2024 buyer agreement step, listed the office-days penalty as a plain expectation, and settled both owner conflicts silently. It did notice the pending license, in one line at the end, and still scheduled licensed work before it.
