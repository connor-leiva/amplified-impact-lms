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
