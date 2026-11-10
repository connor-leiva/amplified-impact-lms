# Grading: Eval 1, the Full Follow Up Boss Export (With a Voice QUICK CARD and a Yes Given in Chat)

Run on 2026-11-10 (a Tuesday) by following SKILL.md exactly, with `touch-plan-guide.md`, `fub-setup.md` and `outreach-rules.md` read where SKILL.md says to. Input: `evals/files/eval-1-full-export/followupboss-people-export.csv` (34 contacts), read with Python. The tiers, the picks and the share math were checked against `evals/make/expected_picks.py --text-ok "Hank Brindlecomb"`, which applies the guide's rules in code; they match row for row.

Result: **pass, 14 of 14 expectations** (after one fix, below). Objective checks: `objective-checks.txt`, all pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Tiers 14, 6 and 8; Pip in Wider Sphere by default with a question; 4 left out by count, unnamed | Pass | What I Used: "Past Clients 14, Close Sphere 6, Wider Sphere 8 ... Not in the plan: 4 (1 Lead, 1 Nurture, 1 Under Contract, 1 Trash)." Flag: "Pip Snowberry ... Wider Sphere by default. Close or wider?" Uma, Vic, Walt and Yara appear nowhere |
| 2 | Iris and Jade to post-closing-client-care, no draft; Dev in this week's touches | Pass | Flag and Not This Week name both with closing and first-anniversary dates; Dev's first anniversary is draft 11, Friday, November 13 |
| 3 | 12-month table November 2026 to October 2027, touches a year, anniversaries by month | Pass | The table's 12 rows; "Past Clients 12 (4 calls), Close Sphere 6 (2 calls), Wider Sphere 4"; "November 6 ... October 1" (matches the code: 15 in all) |
| 4 | Anniversaries with the right day and years; Gus later this month | Pass | Ben 7 (Home Anniversary 2019-11-12), Dev first, Ava 3, Opal 2, Elle 4, each with its weekday; Gus "6 years, Tuesday, November 17" under Later this month, no draft |
| 5 | Opal worded as a sale | Pass | "Two years ago this week we closed on Teacup Way"; the Why now line says "A sale, so not a 'home anniversary.'" |
| 6 | Gwen and Hank due on their notes; rotation picks; share math per tier | Pass | This Week's Touches and "The share math": 6 over 3 is 2 (Pia, Milo), 4 over 3 rounds up to 2 (Hattie, Kit), 7 over 3 rounds up to 3 (Lars, Sid, Ned) |
| 7 | Texts only to the seven; Hank because the agent said so; keep his email as the record | Pass | 7 texts: Gwen, Hank, Kit, Lars, Ned, Ava, Opal (objective check). Flag: "Keep his October email as the record, and add it to his Text Consent field"; Check Before Sending: "plus Hank's October email" |
| 8 | Dev, Elle, Milo, Sid emailed with reasons; Pia and Hattie call notes; Finn no draft | Pass | Each Channel line gives the reason (Do Not Text; Revoked, STOP; verbal only; Do Not Call); "Call note: no email"; Finn under Flags and Not This Week, "No draft" |
| 9 | Texts name the agent, 300 characters or fewer, end with Reply STOP; emails Title Case with footer | Pass | Objective checks: texts 110 to 170 characters, all end "Reply STOP to opt out."; 5 subjects, all Title Case; 5 of 5 footers |
| 10 | No sensitive notes, prices or website visit; one generic flag | Pass | Never-appear check: none of hip surgery, refinancing, divorce, twins, kindergarten, layoff, Medicare, any of the 13 deal prices. Milo's Last Activity is not mentioned. Flag: "the notes on 6 contacts hold health, money or family details" |
| 11 | Every draft tied to a real field or note; nothing invented | Pass (after fix) | Each Why now quotes its note and date. First draft failed here, see below |
| 12 | QUICK CARD followed | Pass | All 5 emails signed "Cheers," then "Rowan"; no exclamation point in any email (exclamation points only in two texts, which the card allows); none of the banned phrases (objective check) |
| 13 | Follow Up Boss setup: Smart Lists with the export's tags, Text Consent, Home Anniversary with Occurs Every Year and the Calendar Date automation, who does each, changes nothing | Pass | Set It Up, items 1 to 4: Tags include Past Client, Sphere A, Sphere B; "Your Account Owner checks it's a Date field with Occurs Every Year"; "An admin makes an action plan ... and an automation"; "This skill doesn't change anything in Follow Up Boss" |
| 14 | Check Before Sending: anniversaries with columns, facts with note dates, consent per text including Ned's sheet, DNC scrub, quiet hours, unsubscribe and address, state rules | Pass | Every item present |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the input or is worked out | Pass | Worked out and shown: years since closing (7, 1, 3, 2, 4, 6), tier and pick counts, the share math, 21 days and 3 weeks left, first anniversaries in 2027. 30, 60 and 90 days are the Smart List defaults from `fub-setup.md`; 8 AM, 8 a.m. to 8 p.m. and 10 business days are from the references |
| No em or en dashes | Pass | |
| Title Case subject lines | Pass | 5 of 5 |
| Check Before Sending present | Pass | |
| Texts only with consent | Pass | 7, each with a written yes on file or the agent's yes in chat |
| No protected-class language, no health or money details | Pass | |
| No wire or account details | Pass | |

## What Failed, and the Fix

- **First run:** Kit's text said "your ribbon-winning dahlias." The note says "Grows dahlias; won a ribbon at the county fair": it never says what won the ribbon. Joining the two facts made a claim the export doesn't make.
- **Fix to `references/touch-plan-guide.md`** (What a Draft May Mention, Never invent): "Never join two facts into one the note doesn't make ('grows dahlias; won a ribbon' is not 'your ribbon-winning dahlias')."
- **Rerun:** "How did the dahlias do this year?" Expectation 11 passes. The practice run had the same slip and the same fix.
