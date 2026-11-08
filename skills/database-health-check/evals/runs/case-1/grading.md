# Grading: Case 1, Follow Up Boss Export of 5,000 Plus Closed Deals

Run: SKILL.md followed as written. The code was extracted from references/analysis-code.md and run on evals/files/fub-people-export-5000.csv with --transactions evals/files/closed-transactions-2019-2026.csv (no team rules uploaded, so defaults). Analysis files: files/health_report.md, files/health_report.json, files/cleanup_worklist.csv. Output: output.md. Baseline for this skill is on case 3.

Result: 15 of 15 expectations pass after one fix round; 10 of 10 applicable objective checks pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Counts come from the analysis code; 5,000 records | Pass | files/health_report.md header "Records: 5,000"; every number in output.md traces to that file (objective check below) |
| 2 | Bottom line of three sentences or fewer with size, three problems with counts, one first cleanup | Pass | Three sentences: 5,000 contacts; 669 never contacted, 562 missing or invalid phone, 529 gone quiet; merge first |
| 3 | First cleanup is merging, with the Follow Up Boss reason | Pass | "Follow Up Boss keeps the main record's stage and agent when it merges, so stage and assignment fixes made before merging would be wasted" |
| 4 | At least 125 merge groups; shared-contact-info groups and the shared phone reported separately | Pass | 133 merge groups (272 records); 24 different-first-name groups and 6 different-name groups; "One phone number sits on 8 different people's records ... flagged for review, not merged" (the generator planted 136 merge groups, 25 shared-contact pairs and an 8-record office line; the 3 groups not found had invalid phone formats) |
| 5 | Stale active-stage contacts by stage and by agent | Pass | Table of 10 stages; agent table column "Active stage, no touch 90+ days" |
| 6 | Past clients and sphere untouched 12+ months; Closed versus Past Client question | Pass | 178 of 487 past clients and 162 of 493 sphere; Question 1 |
| 7 | Uses the closed-deal file: closed deals in active stages, past clients not labeled, 14 not in the CRM | Pass | 31 closed deals in active stages; 20 matched but not in a past client stage; "14 are not in the CRM at all"; Question 5 |
| 8 | Explains the pond export limitation | Pass | What I Used, Gaps; agent table note on the 173 pond-tagged contacts under the pond lead |
| 9 | Birthday ignored; no age or family language | Pass | "Left out on purpose: the Birthday column"; protected-class scan of drafts: none (after the fix below) |
| 10 | Worklist CSV with row, name, email, phone, agent, stage, action, reason; no contact details in chat | Pass | files/cleanup_worklist.csv header: Priority, Row In Export, Record ID, Name, Email, Phone, Assigned Agent, Stage, Action, Reason, Other Fixes, Duplicate Group, Suggested Main Record; scans found no contact name, email or phone in output.md |
| 11 | Four to six segments with Smart List filter, size, emailable, callable, textable, next move | Pass | Six segments, each with all six parts |
| 12 | Texts only for Text Consent filtered lists, each ending with Reply STOP | Pass | Six texts, each labeled "Text Consent filtered list only", each ends "Reply STOP to opt out." |
| 13 | Emails: Title Case subjects, opt-out line, postal placeholder, marketing footer | Pass | 6 of 6 |
| 14 | Check Before Sending lists consent records, DNC scrub, quiet hours, unsubscribe link, postal address | Pass | All five present |
| 15 | Never claims to change a record | Pass | "Nothing in your CRM was changed." |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 400 numbers, all in files/health_report.md or .json, the prompt, or the skill's stated defaults |
| Deadlines match the uploaded contract | Not applicable (no contract) |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 6 of 6 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass: no dollar amounts |
| No agent-only MLS fields in client-facing text | Pass: none in the drafts; the export's Message and Property columns were not read |
| No protected-class language | Pass: none |
| No wire or account details | Pass: none |
| No contact names, emails or phone numbers outside the worklist | Pass: 0 found |

Tool: `python3 -I evals/make/objective_checks.py evals/runs/case-1 evals/files/fub-people-export-5000.csv evals/files/closed-transactions-2019-2026.csv --prompt "..."`

## Failures Found and Fixed

1. **Problems counted twice.** The first run ranked "active-stage contacts with no communication in 90+ days" (939) next to "never contacted" (669) and "parked in Lead" (781): one set of uncontacted leads showed up as three problems. Fix: the analysis now ranks "gone quiet" (communication on record) apart from "never contacted," and the Lead-stage check counts only contacts who were talked to. Rerun: the top three became three different problems.
2. **Hand-made totals.** The first output added segment counts together (23 past clients back on the site; 19 past clients outside a past-client stage). Neither total was in the run's output, so the number check failed. Fix: SKILL.md step 2 now says never to compute a new total by hand; the output cites the run's own figures (Closed 12 and Past Client 11; Lead 9, Nurture 6, Attempted Contact 4). Rerun: 400 of 400 numbers traced.
3. **Family wording in a referral ask.** One past-client email said "a friend or family member." Fix: references/nurture-drafts.md now says to use "someone you know" for referral asks; the draft was rewritten.
4. **Shared lines counted as duplicates (fixed before grading).** An office number on 8 records was grouped as one duplicate. Fix: an email or phone on more than 5 records is reported as a shared line and never merged.
