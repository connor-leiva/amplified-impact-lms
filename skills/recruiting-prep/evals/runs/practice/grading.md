# Grading: Practice Files

Run: SKILL.md followed as written, both modes in one request. Prompt (the practice prompt on page-notes.md): "Here's our recruit list (the MLS export and our own list are two tabs) and our value proposition one-pager. Organize and tier the list and draft first-touch messages. Then prep me for my coffee with Marisol Quillpocket on Tuesday, November 10 at 11." Files: `PRACTICE Recruit List.xlsx` (tabs MLS Export and Our List) and `PRACTICE Team Value Proposition.pdf`. config.json held the brokerage and the one-pager's three production levels (files/config.json). Code output: files/summary.md and files/summary.json; organized-recruit-list.csv. Output: output.md, kept as sample.md. Planted facts: evals/make/planted/practice.json.

Result: 12 of 12 checks pass; 9 of 9 applicable objective checks pass.

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | One bottom line of three sentences or fewer covering both parts, then flags with the MLS data-use check | Pass | Bottom Line, 3 sentences; Flags bullet 1 |
| 2 | The one-pager's levels are the tiers, labeled as the team's, applied to MLS sides only | Pass | "Your one-pager's levels ('What You Get, By Where You Are')"; Established 5, Growing 14, Building 49; 14 not tiered; Approx Units never used |
| 3 | 102 rows in, 83 unique out, with the repeated row and the split-office agent handled | Pass | 71 + 31 = 102; 19 merges; BSX50219 Kit Parsniptoes kept once; BSX50439 Joss Cloversnout rows added, why-now office change (planted mls_rows 71, our_rows 31) |
| 4 | The agent at the team's own brokerage is held from drafts | Pass | R020 Dev Crumpetnook (Marigold Example Realty) in Flags and the Building heading; CSV Contact Status "Hold: at your brokerage" |
| 5 | The opted-out contact is Do not contact with no draft | Pass | R083 Yara Cloversprout ("STOP") |
| 6 | Texts only for documented consent; the bare yes held | Pass | Texts to R022 and R074 only; R007 Marisol has consent but is already booked; R065 Kit Parsniptoes held |
| 7 | The one-pager's results claim is flagged for broker review and kept out of every draft and answer | Pass | Flags bullet 2 quotes "Agents who join Harborlight close 40% more transactions in their first year" for broker review; not in any draft; the Results objection says not to use it |
| 8 | Marisol's profile matches her MLS row, with the math shown | Pass | Row 7: 22 sides (14 listing, 8 buyer), $9,033,500, prior 17 and $6,429,000; computed +5 (29%), +$2,604,500 (41%), 64% listing, averages $410,614, $406,321, $418,125, each division shown |
| 9 | Needs from the one-pager first, general guidance labeled | Pass | Quotes "Growing (12 to 24 sides)" and the Building level it builds on; one labeled general guidance line |
| 10 | Terms as written quoted word for word, no math, no earnings projection anywhere | Pass | Terms As Written block quotes "Splits, Cap and Fees" and "Revenue Share" verbatim; objections never compute what she would keep |
| 11 | The personal note on Our List appears nowhere; count and kinds reported | Pass | Term scan ("kids," "college"): 0 hits; Flags: "1 row holds personal details (kinds: family or familial status, personal finances)" |
| 12 | Every draft has a Title Case subject and the compliance lines; Check before sending last | Pass | 4 emails and 1 text (to R022 and R074); footer, unsubscribe line, the one-pager's postal address with the missing ZIP code flagged |

## Objective Checks

| Check | Result |
|---|---|
| Every number appears in the inputs or the list code's output | Pass: 13 from files/summary.md; untraced by script were 29%, 41%, 64%, $406,321, $410,614, $418,125 and $2,604,500, each computed in Production Profile with the math shown (5 / 17; $2,604,500 / $6,429,000; 14 / 22; $5,688,500 / 14; $9,033,500 / 22; $3,345,000 / 8; $9,033,500 minus $6,429,000) |
| Deadlines match the uploaded contract | Not applicable |
| No em or en dashes | Pass |
| Title Case subject lines | Pass: 4 of 4 |
| Check Before Sending section, last | Pass |
| No cost estimates without bids | Pass |
| No agent-only MLS fields in client-facing text | Pass |
| No protected-class language | Pass |
| No wire or account details | Pass |

Tool: `python3 -I evals/make/objective_checks.py evals/runs/practice "practice/PRACTICE Recruit List.xlsx" "practice/PRACTICE Team Value Proposition.pdf" --prompt "..." --terms "kids,college" --computed evals/runs/practice/files/summary.md`

## Changes From the Earlier Practice Run

1. One bottom line for both parts, first, instead of a bottom line per part after the flags (SKILL.md: "under one bottom line and one Check before sending").
2. The state line said the phone numbers "are in North Carolina," an inference from area codes. It now cites the one-pager's NC address.
3. Terms As Written added, quoting the one-pager's split, cap and fee section and its revenue share line, word for word.
4. The Building heading said "48 agents," a number made by subtracting the held agent. It now says 49, with R020 held from drafts.

## Reviewer Changes (2026-11-08)

- **Not tiered:** this run told the user to reuse the Building or Growing draft and to send Flo Noodlebloom the Building text, which assigns a level to agents with no production data. The skill now says these groups share one email built only from what the team's document says applies to every agent. output.md and sample.md now have a "How We Work At Harborlight" email from the one-pager's How We Work section and a matching text to R074. Check 12 now covers 5 emails and 2 texts.
- **Invented sender line:** the Established email said "I talk with a few established agents each quarter." Replaced with "I'd like to hear what you want the next stage of your business to look like."
- **Results objection:** the suggestion to introduce Marisol to a team agent now adds that the agent should not quote income, earnings or results.
- Objective checks rerun after the edits: problems none; untraced only the profile math shown in the output.
- An independent reviewer run is in review-output.md and review-grading.md: 12 of 12.
