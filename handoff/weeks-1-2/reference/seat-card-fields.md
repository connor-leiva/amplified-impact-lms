# The Seat Card Form: What It Collects

Connor, Nov 20, 2026: the blank seat card is no longer a PDF. Teams fill it in and the owner signs it in the portal, in a form on the same drawer as the intake (D-229). A finished sample for each week stays a PDF in the Kit (made in Claude Design): "Finance Analyst Seat Card (Sample Team)" and "Lead Desk Monitor Seat Card (Sample Team)".

## Where It Opens

Step 6 of Week 1 ("Sign the Seat Card") and Week 2 ("Check the Misses List"), on both paths: the item ending `-fill` ("Fill in the Finance Analyst's seat card", "Fill in the Lead Desk Monitor's seat card"), button label `Open the seat card`. The next item, ending `-sign` ("Sign the seat card", role Owner), is the owner's signature. The item after that, ending `-checkpoint`, is the Turn in (D-230) for the checkpoint: now just a screenshot of the first run (Week 1: the note on the Owner Desk; Week 2: the first misses list), since the card comes through the form.

## The Fields

The week's standard words are already stored in `course.seatCard` (`SeatCard` in `packages/core/src/course-types.ts`). Show each as the starting point for the team's own answer.

| Field | `SeatCard` key | The Team Writes | Week 1 Standard (Finance Analyst) | Week 2 Standard (Lead Desk Monitor) |
|---|---|---|---|---|
| Seat | `seat` | Nothing (fixed) | Finance Analyst | Lead Desk Monitor |
| Reports To | `reportsTo` | Who it reports to | Owner | The team lead, or whoever owns the lead desk |
| Runs | `runs` | When and how often | Monthly, after the books close: the 5th at 6:00 AM MT, or the day after your close | Weekdays at 7:00 AM MT for connected teams, reading Sisu. Mondays at 7:00 AM MT for export teams |
| Pulls | `pulls` | What it reads | Last month's books and closings: from QuickBooks and Sisu for connected teams, or from last month's exports in AI Office / Map Your Spend / inbox for export teams | New leads with their first response time and call attempts: from Sisu for connected teams, or from the CRM's speed-to-lead report in AI Office / Lead Desk / inbox for export teams |
| Applies | `applies` | The standard it uses | Your confirmed map in team-file.json and the Standard Chart, with its three rules: revenue booked gross, the leader paid a commission, every expense in one home | The speed-to-lead standard: a human within 5 minutes, 8 call attempts in week one, referrals within the hour, after-hours leads by 9 the next morning |
| Produces | `produces` | What it makes and where it lands | Last month's numbers at the top of the Owner Desk, with the date: the headline, what moved more than 2 points, anything new that needs a home and one decision. The monthly report and the updated team file are saved in AI Office / Map Your Spend | A misses list for the team lead, added to the top of the Leadership Desk with the date and saved as a Gmail draft to the team lead: each lead with source, agent, minutes to first touch and attempts so far. Each agent's follow-up list, added to the top of the Team Board. Every lead shows by CRM link or ID, never a client name |
| Took Over | `tookOver` | The task, and **minutes per occurrence** from the team's Week 0 time baseline, or "not done today" | Baseline task 1, getting last month's numbers in front of the owner | Baseline task 2, checking one day of new leads for first touch and attempts. If nobody does it today, the gain is coverage |
| Can't Do | `cantDo` | What it must never do | Change the books, or fill a missing month with guesses. It says what is missing and stops | Call, text, reassign or update a lead. It drafts and never sends |
| First Run | `firstRun` | The date of the first run | Date and screenshot | Date and screenshot |
| Signed | (new) | The Team Owner signs, and the date is recorded | | |

These are each week's standard words after the Nov 20 changes (`data/week-N-card-changes.json` has the seeded value and the new one for every row that changes). The form shows whatever the week's `course.seatCard` holds. That is Connor's rule (Nov 21): the Week Builder's Seat Card card is where these words are edited, so the form reads them from there and keeps none of its own.

## Rules

- **Who:** the Team Owner and the Operations Lead fill it in (the same two who fill in the intake and the stack card, `mayEditIntake`). Only the Team Owner signs. Agents read it. Staff previewing see it read-only and nothing saves.
- **One per team per week.** Saving checks the `-fill` item for the team; signing checks the `-sign` item, on both paths, as the stack card's Send Back does (D-197).
- **Staff** can read every team's signed card for a week.
- **Words:** the course rules apply to the form's own words (its labels and hints): except on Can't Do, no line may say the hire sends, posts, updates the CRM or touches the books. The team's entries are its own; only reject a password or an account number, as the stack card does (`looksSecret`).
- **Nothing is emailed.**
