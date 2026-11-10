# Grading: Case 1, the Full Practice Set (Thimbleberry Home Team)

Run on 2026-11-10 by following SKILL.md exactly: the code extracted from references/pipeline-code.md with the one-line command in step 2 and run on the three files with `--as-of 2026-11-10` (the user said the exports were downloaded November 10, 2026, and the file names carry the date), no rules.json needed (every stage is a Follow Up Boss default), then the review built from the run in SKILL.md's output order. Inputs are the practice files, copied to evals/files/case1: this week's People export (54 people, 5 agents, in the column layout Follow Up Boss's help center lists for Export All Columns, plus Last Communication and Last Activity), last week's People export (52 people), and a Deals report export (13 deals). Run files: `files/pipeline_review.md`, `files/pipeline_review.json`. This run is also the practice run kept as sample.md.

Result: **pass, 11 of 11 expectations.** Objective checks in `objective-checks.txt`: all pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Figures from the code; as of 11/10/2026 with its source; which export is this week's; matched by email, none shown | Pass | Flags: "As of 11/10/2026: you said the People export and Deals report were downloaded November 10, 2026, and their file names carry 2026-11-10." What I Used names this week's and last week's files and "51 people matched across the two weeks, all by email (emails were read only to match and are not shown anywhere)." Every number traces to the files or pipeline_review.md (objective check) |
| 2 | List 1: Ferdinand first (11 days), Petunia second (4 days), arithmetic, days in stage, price as exported; no-close-date deals apart | Pass | "expected close 10/30/2026, 11 days past (11/10/2026 minus 10/30/2026 = 11 days). In Pending since 09/22/2026 (... = 49 days). Price as exported: 538000." Petunia's line the same with 43 days and 412500. The three open deals with no close date are listed under Deals by Stage and in Check Before Sending |
| 3 | List 2: Rufus (none logged), Pemberton (20), Tilda (14), same stage, no open deal | Pass | List 2 opens with "Each is in an appointment stage, in the same stage as last week's export, with no open deal in the Deals export and nothing logged in more than 7 days," then the three in the run's order |
| 4 | List 3: the seven; Bartholomew at 7 days off; Ferdinand not twice | Pass | Seven items with arithmetic, Bertram "Nurture, tagged Hot", Henrietta "tagged Hot". The line "Bartholomew Lumpkin (Active Listing, last communication 11/03/2026, 7 days) is not on this list: 7 days is not more than 7." Ferdinand (8 days) appears only under his deal in list 1 |
| 5 | List 4: Met with Customer (all also above), Submitting Offers | Pass | "Met with Customer: the same 3 people as last week ... (all three are also above)." "Submitting Offers: ... Ambrose Sprocketton, Esmeralda Inkwhistle." |
| 6 | Nine changes, three new, Kipling with no reason invented | Pass | Stage changes table (9 rows, last week and this week); new in this week's export (3, with Date Added); "Kipling Rumbleford ... Deleted, merged, moved out of view or outside the export's filter: the export doesn't say which." |
| 7 | Conversion for 08/12 to 11/10, n / d, current-stage caveat, FUB and Sisu named, no benchmarks or ranking | Pass | Both tables show "4 / 11 = 36.4%" style cells (42 rates, all re-computed correctly by the objective check); "These rates go by current stage ... the rates are a floor. Rows are in order of people added, not a ranking. For closed-deal conversion and lead source return, Follow Up Boss's Lead Source report and Sisu stay the source of record" |
| 8 | Three odd rows flagged, none fixed | Pass | Odd Rows table: Leopold Whiffletree (Last Activity 11/14/2026), Millicent Twiddlesworth (no stage), Ottoline Velveteen, 9 Toffee Ln (Closed, no close date), each "not used" or "left as is", with where a person fixes it in Follow Up Boss |
| 9 | No email, phone or note text | Pass | Objective checks: no email pattern, no phone pattern, no "555", no Notes or Message text; "Preapproved", "Sprocketwheel", "baby", "Credit score" absent |
| 10 | By-agent counts only; questions about records' next steps | Pass | By Agent table is counts; each question reads "(record facts): what is the next step, and when?" or "what is the plan for this week?" or, for deals, "what is the new expected close date, and what is it waiting on?"; no judging words (objective check) |
| 11 | No dashes; Flags before a 3-sentence bottom line; Check Before Sending with as-of, deal stage readings, list 1's dates and prices, odd rows | Pass | Objective checks; Check Before Sending lists each of these, with the Deals export row numbers for list 1 |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass |
| Title Case subject lines | Pass (no subject lines: the review drafts no email) |
| Check Before Sending present | Pass |
| Flags first, then the Bottom Line | Pass |
| Bottom line three sentences or fewer | Pass (3) |
| No email address, no phone number, no Notes or Message text | Pass |
| Every "A minus B = N days" right | Pass (32 checked) |
| Every "n / d = x%" right, and every percentage shows n / d | Pass (42 checked) |
| Every number in the inputs or the run | Pass |
| No words judging a person; no wire or account details | Pass |

## What the Run Showed

- **The edge cases held.** Bartholomew Lumpkin's last communication is exactly 7 days old and stays off list 3; Ferdinand Rattlecap is stale at 8 days but shows once, under his deal; Posy Bumbershoot is in an appointment stage but has an open deal (Buyer Agreement), so she is in list 3, not list 2.
- **The future close dates are not odd.** An open deal's Close Date after the as-of date is its expected close; only a closed deal with no close date was flagged. A first draft of the code flagged three future Deal Close Dates in the People export as odd; that was wrong and was fixed before this run.
- **Two hand totals were caught and moved into the code.** A first draft of this output added each agent's active stages by hand and quoted "14 stages"; the code now prints the active count per agent, and the stage count was dropped. Every number in the final output comes from the run.
- **Not tested here:** a real Follow Up Boss export, a Deals export with a Pipeline column, a team with renamed stages, and an export without Last Communication.
