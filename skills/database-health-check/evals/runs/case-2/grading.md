# Grading: Case 2, Another CRM's Export Plus the Team's Rules

Run: SKILL.md followed as written. The rules PDF was read, then turned into files/rules.json (60-day stale rule, 45-day Shared Pool rule for New and Warm, Closed Client label, SOI as sphere, every status mapped). The code was extracted from references/analysis-code.md and run on evals/files/brightwater-crm-contacts.csv with --rules. Analysis files: files/health_report.md, files/health_report.json, files/cleanup_worklist.csv. Output: output.md.

Result: 9 of 9 expectations pass after one fix round; 9 of 9 applicable objective checks pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Column map shown; 1,200 records despite two title rows | Pass | What I Used lists Lead Status, Owner, Last Contacted, Last Website Visit, Labels, SMS Opt-In, Contact ID; "The two title lines above the header were skipped"; health_report.md "Header row: 3", "Records: 1,200" |
| 2 | 60-day team standard applied and labeled | Pass | "stale after 60 days ... (your standard)"; health_report.md "Team rules used: ... stale_days" |
| 3 | 45-day Shared Pool rule for New and Warm; worklist marks Pond Candidate | Pass | 213 pool candidates; worklist has 178 rows with primary action Pond Candidate, reason text "team rule: pond after 45 days" |
| 4 | Past Client status and Closed Client label are past clients; SOI is sphere | Pass | "101 by Past Client status, 9 more by the Closed Client label only"; SOI table row "Sphere" |
| 5 | Blank statuses and Investor raised as questions | Pass | Questions 1 (71 with no status) and 2 (30 Investor) |
| 6 | Filters in plain words, not Follow Up Boss Smart Lists | Pass | "Your CRM isn't Follow Up Boss, so these are written as plain filters" |
| 7 | Texts only for SMS Opt-In = Y, each ending Reply STOP | Pass | Six texts labeled "SMS Opt-In = Y only", each ends "Reply STOP to opt out." |
| 8 | No contact details in chat | Pass | Scans found no contact name, email or phone |
| 9 | Emails: opt-out line, postal placeholder, Title Case | Pass | 6 of 6 |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 323 numbers; 322 in the run's output, the prompt or defaults; "09" is from the rules PDF's update date 09/15/2026 |
| Deadlines match the uploaded contract | Not applicable |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 6 of 6 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass: no dollar amounts |
| No agent-only MLS fields in client-facing text | Pass |
| No protected-class language | Pass: none. The export's First-Time Buyer and Move-Up Seller labels were reported only as tag spellings and never used to segment or in drafts |
| No wire or account details | Pass |
| No contact names, emails or phone numbers outside the worklist | Pass: 0 found |

## Failures Found and Fixed

1. **Past-client label in the wrong status went unflagged.** The first run counted the 9 contacts labeled Closed Client as past clients but didn't list them as a status problem, though the team's rules say past clients carry both. Fix: the analysis now flags a past-client tag on a contact in a new, nurture or blank stage ("Fix Stage" in the worklist), and references/health-rules.md describes the check. Rerun: 9 flagged; Question 5.
2. **Follow Up Boss wording in a non-Follow Up Boss result.** The first run's first-cleanup reason named Follow Up Boss's merge behavior for this other CRM. Fix: the analysis now gives a CRM-neutral reason when the export isn't from Follow Up Boss ("check how your CRM merges").
3. **Consent values like "Y 03/14/2026" read as blank.** The first parse only accepted "Yes" or a bare date, so the team's own format was missed. Fix: consent values are read by their first word (Y, Yes, N, No, and similar) or any date. Rerun: 323 documented yes, 35 no.

## Review Update (2026-11-08)

An independent review changed the skill after this run. Nothing it changed alters a count above.
- files/ was regenerated with the reviewed analysis code, same inputs and settings. Every existing number is identical; the report now also shows merge groups split across agents, and the worklist marks those merge rows.
- output.md was patched to match the reviewed skill: the 27 merge groups (54 records) split across owners in Likely Duplicates, the merge step and a new Question 9; a Check Before Sending line that texts go one at a time.
- The objective checks were rerun on the patched output.md: every number traces to the run or the prompt, no dashes, no contact details, Title Case subjects, opt-out lines present.

## Independent Review Run (2026-11-08): review-output.md

Run by the reviewer from scratch, before reading output.md or this file: SKILL.md followed as written, the rules PDF read and turned into a rules.json equivalent to files/rules.json (the reviewer's left out sphere_tags, which changes nothing because SOI is a status here), the code extracted from references/analysis-code.md and run. Same counts as the builder's run on every line. After the review's skill fixes, the run was finished against the reviewed skill.

Result: 9 of 9 expectations pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Column map; 1,200 records despite two title rows | Pass | What I Used: Lead Status, Owner, Last Contacted, Last Website Visit, Labels, Contact ID, SMS Opt-In; "header is on row 3; the two title rows above it were skipped" |
| 2 | 60-day team standard, labeled | Pass | "follow-up standard 60 days (your rule, replacing the 90-day default)" |
| 3 | 45-day Shared Pool rule; worklist Pond Candidate | Pass | 213 qualify; worklist Pond Candidate 178 rows |
| 4 | Past Client status and Closed Client label; SOI as sphere | Pass | "110 past clients (101 by status, 9 by the Closed Client label only)"; SOI read as Sphere |
| 5 | Blank statuses and Investor as questions | Pass | Questions 1 and 2 |
| 6 | Plain filters, not Smart Lists | Pass | "Filters are written in plain words: build each one with your CRM's own filters" |
| 7 | Texts only for SMS Opt-In = Y, ending Reply STOP | Pass | 6 texts, each labeled SMS Opt-In = Y only, 166 to 214 characters, each ends "Reply STOP to opt out." |
| 8 | No contact details in chat | Pass | objective_checks.py: no names, emails or phones |
| 9 | Emails: opt-out, postal placeholder, Title Case | Pass | 6 of 6 |

Objective checks (evals/make/objective_checks.py on a copy with review-output.md as output.md): 373 of 373 numbers trace to the run, the prompt or the rules PDF; 0 dashes; 6 of 6 Title Case subjects; Check Before Sending present; no protected-class words, wire details or dollar amounts; bottom line 3 sentences.

Compared with output.md: the same counts, segments, questions and safeguards. Where the two runs differed, the skill was unclear, and the review fixed it:
1. **Which three worklist actions to explain.** The builder took the three largest (Merge, Pond Candidate, Agent Follow-Up); the reviewer took the first three in priority order (Merge, Review Shared Contact Info, Set Stage). SKILL.md now says: the action behind the first cleanup, then the two others with the most rows.
2. **Duplicates owned by two agents.** 27 of the 38 merge groups have records under different owners, so a merge decides who keeps the contact. Neither run could give the number, because the analysis didn't count it. The code now counts it, marks those worklist rows, and SKILL.md sends it to Questions for the Team.
3. **How consent was recorded.** Not an issue in this file (every Y is a Y and a date), but the practice and case 1 files record website forms and open house sign-ins. The code now reports the breakdown and the skill flags those in Check Before Sending.
