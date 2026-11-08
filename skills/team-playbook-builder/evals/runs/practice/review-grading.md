# Review Grading: Practice Run

Independent reviewer run, 2026-11-08, from SKILL.md and its references alone, before reading the builder's output. Graded against the page's "what to look for" and the builder's 12 checks in `grading.md`. Output: `review-output.md`; playbook and ZIP: `review-playbook/`.

| Check | Result | Evidence |
|---|---|---|
| Finds the pond conflict (10 days versus 14 calendar days), both quotes, no winner | Pass | Conflicts section and the CONFLICT block in `lead-routing-and-ponds.md`, decision owner Team Leader |
| Finds both obvious gaps (pay timing; time off and coverage) with no policy written | Pass | Gaps, items 1 and 3 of the top three, quoting the call (00:02:53) and Policy Manual Section 8; both in `routing.md` Not Written Yet |
| Leaves out the individual agent's split | Pass | Section 4 absent; a scan of every output file for the name, split, dates and "waived" found nothing |
| Includes the team-wide schedule only because the leader confirmed it | Pass | `compensation-and-fees.md`, Sections 1 to 3 only, with the confirmation noted |
| Check script passes; one folder at the ZIP root | Pass | 16 must-not-contain terms, reported as a count only |
| Owner and Last updated in every topic file | Pass | Script enforces it |
| Stale checklist flagged and its date carried into the playbook | Pass | Every onboarding rule tagged June 3, 2024; the topic index marks it stale |
| Pre-August 17, 2024 buyer steps held out and sent to the broker | Pass | UNDER REVIEW block in `buyers-and-showings.md`; broker review item 1 cites the NAR change |
| Phone numbers and the door code removed | Pass | Scan and script patterns; the office access step keeps the checklist's own owner |
| Referenced but missing documents listed | Pass | Open House Safety Policy and the brand guide |
| 25-question test set: 20 with sources, 5 routed | Pass | Counted |
| Message to agents with a Title Case subject, sharing steps, Check before sending, no dashes | Pass | Last three sections; dash scan |

**Result: 12 of 12.**

## Compared With the Builder's Run

The two runs agree on the conflict, the top three gaps, the stale document, the held buyer steps, every removal and the comp file. Differences, none of them a miss:
- The builder put the held buyer steps in an UNDER REVIEW block inside `onboarding.md`; this run gave them `buyers-and-showings.md` so an agent asking about buyer agreements finds them. `playbook-template.md` now says a topic with a CONFLICT or UNDER REVIEW block keeps its own file even when it holds fewer than three rules.
- This run's first draft added a line to the conflict note suggesting the Follow Up Boss automation's number is the one agents live with. That leans toward one side, so it was cut before grading. The builder's run made and fixed the same kind of slip. The rule is clear; it just tempts.
- The sample's message said "about two minutes" to install, an unmeasured time claim. `agent-install.md`, sample.md and every run now say "a few clicks."
