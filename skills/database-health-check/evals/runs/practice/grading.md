# Grading: Practice Run (Kept as sample.md)

Run: SKILL.md followed as written on practice/PRACTICE-followupboss-people-export.csv with the page's practice prompt ("Here's our Follow Up Boss export. Run a database health check and give me a plan to work it."). Defaults, no team rules. Analysis files in files/. Output: output.md, copied to sample.md.

Result: 12 of 12 checks pass. The practice file has no case in evals.json, so it is held to case 1's expectations that apply to a Follow Up Boss export without a closed-deal file.

## Expectations (From Case 1, Where They Apply)

| Expectation | Result | Evidence |
|---|---|---|
| Counts from the code; 500 records | Pass | files/health_report.md "Records: 500" |
| Bottom line of three sentences or fewer with size, three problems, first cleanup | Pass | 500; 66, 61, 54; merge first (4.8% in merge groups) |
| Merge first, with the Follow Up Boss reason | Pass | Bottom line |
| Merge groups, shared contact info and the shared phone reported separately | Pass | 12 merge groups; 2 shared-contact groups; a phone on 7 records flagged, not merged |
| Stale active-stage contacts by stage and by agent | Pass | Stage table and agent line |
| Past clients and sphere untouched 12+ months; Closed versus Past Client question | Pass | 18 and 16; Question 1 |
| Pond export limitation explained | Pass | What I Used; note under the agent table (15 Lantern Lake leads under Rufus Tumbleweed) |
| Worklist CSV with the right columns; no contact details in chat | Pass | files/cleanup_worklist.csv, 205 rows; scans found none in output.md |
| Four to six segments with filter, size, counts, next move | Pass | Six |
| Texts only for consent-filtered lists; a segment with no consented contacts gets no text | Pass | 5 texts; Past Clients: "No text: none of these 18 shows a yes in Text Consent" |
| Emails: Title Case subjects, opt-out, postal placeholder, footer | Pass | 6 of 6 |
| Check Before Sending with consent, DNC, quiet hours, unsubscribe, address | Pass | All present |

## Objective Checks

| Check | Result |
|---|---|
| Every number traces to the inputs or the run's analysis output | Pass: 339 of 339 |
| No em or en dashes | Pass |
| Title Case subject lines | Pass: 6 of 6 |
| Check Before Sending section | Pass |
| No dollar amounts, protected-class language, wire or account details | Pass |
| No contact names, emails or phone numbers outside the worklist | Pass |
| Deadlines, cost estimates, agent-only MLS fields | Not applicable |

## Failures Found and Fixed

None on this run beyond the fixes made in cases 1 and 2, which it was run after.

## Review Update (2026-11-08)

An independent review changed the skill after this run. Nothing it changed alters a count above.
- files/ was regenerated with the reviewed analysis code, same inputs and settings. Every existing number is identical; the report now also shows merge groups split across agents and how text consent was recorded (signed buyer form 39, website form 37, open house sign in 32), and the worklist marks those merge rows.
- output.md was patched to match the reviewed skill: removed the sentence saying Follow Up Boss records "Import" as the source when an import file has no source column (not in Follow Up Boss's help center); the 6 merge groups (12 records) split across agents in Likely Duplicates, the merge step and a new Question 7; the consent breakdown in Text Consent, Question 6 and Check Before Sending; the third worklist action is now Fill Missing Phone (28 rows), the rule the reviewed skill states (the first cleanup, then the two other actions with the most rows); a Check Before Sending line that texts go one at a time. sample.md was refreshed from it.
- The objective checks were rerun on the patched output.md: every number traces to the run or the prompt, no dashes, no contact details, Title Case subjects, opt-out lines present.

## Independent Review Run (2026-11-08): review-output.md

Run by the reviewer from scratch with the practice prompt, before reading output.md, sample.md or this file. Same counts as the builder's run on every line. Held to case 1's expectations that apply (12).

Result: 12 of 12 pass.

| Expectation | Result | Evidence |
|---|---|---|
| Counts from the code; 500 records | Pass | health_report.md "Records: 500" |
| Bottom line, three sentences or fewer | Pass | 2 sentences: 500; 66, 61, 54; merge first |
| Merge first, with the Follow Up Boss reason | Pass | "Follow Up Boss keeps the main record's stage and agent when it merges" |
| Merge groups, shared contact info and the shared phone separate | Pass | 12 merge groups; 2 shared-contact groups; a phone on 7 records treated as a shared line |
| Stale active-stage by stage and by agent | Pass | both breakdowns |
| Past clients and sphere untouched; Closed versus Past Client question | Pass | 18 and 16; Question 1 |
| Pond export limitation | Pass | What I Used: 15 Lantern Lake contacts under Rufus Tumbleweed |
| Worklist CSV; no contact details in chat | Pass | 205 rows; objective_checks.py found none |
| Four to six segments with filter, size, counts, next move | Pass | six |
| Texts only for consent lists; none where nobody consented | Pass | 5 texts; Past Clients "none. No one in this segment has Text Consent on record" |
| Emails: Title Case, opt-out, postal placeholder, footer | Pass | 6 of 6 |
| Check Before Sending: consent, DNC, quiet hours, unsubscribe, address | Pass | all present |

Objective checks: 377 of 377 numbers trace to the run or the prompt; 0 dashes; no contact details; texts 166 to 214 characters, each ending "Reply STOP to opt out."

Compared with output.md: the same numbers. Differences that showed the skill was unclear, now fixed in the skill: which three worklist actions to explain; duplicates owned by two agents (6 merge groups here); and the Text Consent field recording website forms (37) and open house sign-ins (32), which count only with text consent wording. The builder's output also said Follow Up Boss records "Import" as the source when an import file has no source column; that is not in Follow Up Boss's help center, so it was removed from output.md and sample.md.
