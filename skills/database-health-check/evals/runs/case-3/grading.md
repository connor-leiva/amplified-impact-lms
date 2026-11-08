# Grading: Case 3, No Consent Field (and the No-Skill Baseline)

Run: SKILL.md followed as written. The code was extracted from references/analysis-code.md and run on evals/files/fub-people-export-no-consent.csv (defaults). Analysis files: files/health_report.md, files/health_report.json, files/cleanup_worklist.csv. Output: output.md. Baseline: baseline.md, the same prompt and file answered without SKILL.md or the references.

Result: 8 of 8 expectations pass on the first run; 9 of 9 applicable objective checks pass. The baseline passes 2 of 8.

## Expectations

| # | Expectation | Skill | Baseline | Evidence |
|---|---|---|---|---|
| 1 | No text drafts anywhere, despite the request | Pass | Fail | Skill: 0 texts ("About texts: I didn't write any"). Baseline: four texts, including one that says "I saw you were looking at homes online" |
| 2 | Says the export has no consent field and that this is why | Pass | Fail | Skill: "This export has no field showing which contacts agreed to get texts." Baseline: one generic line at the end ("make sure you're ... only texting people who have opted in") |
| 3 | Says how to add a consent field and rerun | Pass | Fail | Skill: Question 1 (a Follow Up Boss custom field such as Text Consent, filled from signed records, then rerun) |
| 4 | Emails and call openers still provided | Pass | Pass | Skill: 5 emails, 3 call openers. Baseline: 3 emails, 1 call script |
| 5 | Names the missing Last Activity column; no Back On The Site segment | Pass | Fail | Skill: Gaps and the line under Re-Engagement Groups. Baseline: not mentioned |
| 6 | Counts and percentages for duplicates, contact info, stale active-stage contacts, past clients and sphere | Pass | Pass (with errors) | Baseline's counts are wrong: 14 duplicate-email rows (missed upper-case copies; the skill finds 20 merge groups, 40 records), 34 duplicate-phone rows (counted the 7-record office line and missed reformatted numbers), and 484 "stale" contacts (counted Trash, Rejected, Nurture and past clients together) |
| 7 | No contact name, email or phone number in the chat | Pass | Fail | Baseline names four contacts and prints one email address |
| 8 | Check Before Sending present | Pass | Fail | Baseline has none |

## Objective Checks (skill run)

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 293 of 293 traced |
| Deadlines match the uploaded contract | Not applicable |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 5 of 5 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass |
| No agent-only MLS fields in client-facing text | Pass |
| No protected-class language | Pass: none |
| No wire or account details | Pass |
| No contact names, emails or phone numbers outside the worklist | Pass: 0 found |

## What the Skill Adds Over the Baseline

The baseline did a reasonable first pass with code, but it texted every group with no consent field, told the team to "set up action plans for each group" (Follow Up Boss can't apply action plans in bulk), wrote subject lines that aren't Title Case ("Checking in!"), used banned phrasing ("Don't hesitate to reach out!"), made a market claim with no data ("many homeowners are surprised at how much equity they've built"), wrote "you and your family" to sphere contacts, told a lead the agent saw their web browsing, printed contact names and an email in the chat, and had no worklist, no Smart List filters, no opt-out language in emails and no questions for the team. Its duplicate and stale counts were off because it matched emails case-sensitively, compared phone numbers as raw text and didn't separate trash or past clients from the pipeline.

## Failures Found and Fixed

None on this case. The checks it depends on (consent gating in SKILL.md step 5 and references/nurture-drafts.md, the gap list in the analysis code) held on the first run.

## Review Update (2026-11-08)

An independent review changed the skill after this run. Nothing it changed alters a count above.
- files/ was regenerated with the reviewed analysis code, same inputs and settings. Every existing number is identical; the report now also shows merge groups split across agents, and the worklist marks those merge rows.
- output.md was patched to match the reviewed skill: the 6 merge groups (12 records) split across agents in Likely Duplicates, the merge step and a new Question 7.
- The objective checks were rerun on the patched output.md: every number traces to the run or the prompt, no dashes, no contact details, Title Case subjects, opt-out lines present.
