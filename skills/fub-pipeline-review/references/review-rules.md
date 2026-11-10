# Review Rules

Last verified: 2026-11-10. The Follow Up Boss facts behind these rules (default stages, what Last Communication and Last Activity mean, the Deals report's columns, the default Smart Lists, and what Follow Up Boss Reporting and Sisu already show) are in `fub-exports.md`, with sources. Everything else here is this skill's own rule for reading the exports, not a Follow Up Boss rule, and the review says so where it matters.

## Settings

- **As-of date:** the day the export was downloaded, from the user's words; else a date in the file name ("FUB People 2026-11-10.csv"); else today's date, said in Flags. Every day count runs to it.
- **Which People export is this week's:** the user's words, then the dates in the file names, then the file with the newer Date Added. Say which in What I Used. The run flags files that look swapped.
- **Stale:** nothing logged in more than 7 days, unless the user names another number (`--days`). Follow Up Boss's own Met/Appt Set Smart List uses 6.
- **Conversion period:** the user's ("this quarter," "since August 1," "October") as `--period-start` and `--period-end`; otherwise the 90 days ending on the as-of date. Say which.
- **Hot:** a tag named Hot (or with the word hot in it, such as "Hot Lead"). If the team marks hot leads another way (a tag such as "A Lead"), put it in rules.json as `hot_tags` and rerun.

## Reading Stages

The run reads each stage into a class and shows how:

| Class | Follow Up Boss default stages | Counted as |
|---|---|---|
| New lead | Lead | pipeline |
| Attempted | Attempted Contact | pipeline |
| Spoke | Spoke with Customer | pipeline, active |
| Appointment | Appointment Set, Met with Customer | pipeline, active |
| Active client | Showing Homes, Listing Agreement, Active Listing, Submitting Offers | pipeline, active |
| Under contract | Under Contract | pipeline, active |
| Closed | Closed | out of the pipeline |
| Nurture, Sphere | Nurture | out of the pipeline |
| Out | Rejected, Trash | out of the pipeline |

- A Follow Up Boss default is read without asking. A common custom stage (Pending read as under contract, Past Client as closed, Sphere as sphere) and any stage read from its name are marked "confirm" and go in Check Before Sending. When the user corrects one, write rules.json `stages` and rerun.
- **Deal stages are the team's own.** The run reads a deal stage with a closed word (closed, sold, funded, paid, won, complete, recorded) as closed, one with a fell-through word (fell through, lost, cancel, terminated, dead, withdrawn, expired, released) as fell through, and every other stage as open. List each deal stage's reading in What I Used; fix with rules.json `deal_stages`. Archived deals are left out of every check and counted.

## Aging

- **People:** days since last communication = the as-of date minus the Last Communication date, always written out: "11/10/2026 minus 10/21/2026 = 20 days." The People export has no date a person entered their stage. With last week's export, "in the same stage in both exports" is the only stage-age fact; never estimate how long someone has been in a stage.
- **Deals:** days in stage = the as-of date minus Entered Stage; days past close = the as-of date minus Close Date. Both written out.
- **"No communication logged"** means nothing is logged in Follow Up Boss, not that nobody talked: calls and texts from a personal phone don't show unless logged. Say it that way, never "never contacted" or "ignored."
- **Last Activity** is the lead's own activity (inquiries, searches). The run shows it when it is newer than the last communication, as a fact ("the lead's own Last Activity is 11/09/2026, after the last communication"), never as a score or "hot."

## Needs a Decision This Week: The Four Lists

Each list is the run's, in the run's order. Never add, drop, merge or reword an item, and never add a reason the run didn't give. One person appears in at most one of lists 1 to 3.

1. **Deals past their expected close date.** An open deal (not closed, fell through or archived) whose Close Date is before the as-of date, most days past first. From the Deals export; without one, from the People export's Deal Stage and Deal Close Date (one deal per person: say so). Each with the stage, agent, close date and days past, days in stage (Deals export only), the price exactly as exported, and the person's stage and last communication when the deal matches a person. Open deals with no close date are listed apart: list 1 can't check them.
2. **Appointment set, no next step in the export.** A person in an appointment stage (Appointment Set, Met with Customer, or a stage the user said is one) with nothing logged in more than the stale days (or nothing logged at all), no open deal (when there is deal data) and the same stage as last week (when last week's export is attached). Each check that couldn't run is named on the item ("movement check not run").
3. **Hot or active, nothing logged in more than the stale days.** A person in an active stage (spoke, appointment, active client, under contract), or tagged Hot in any stage but closed or out, with nothing logged in more than the stale days or none at all, and not already in list 1 or 2.
4. **Stages with no movement since last week.** A pipeline stage (new lead through under contract) with people in it this week where no one entered and no one left since last week's export. Name the people; mark "also above" for anyone already in lists 1 to 3. Only with last week's export.

A person whose Last Communication can't be used (after the as-of date, or not a date) is left out of lists 2 and 3 and named under them, with the odd row.

**Which item comes first** (for the bottom line): the deal in list 1 with the most days past; else the first person in list 2; else the first in list 3; else the first stage in list 4. It is the first item to discuss, not a judgment of anyone.

## What Moved Since Last Week

- Only with last week's People export. Show the run's stage changes as "from (last week's stage) to (this week's stage)," the people new in this week's export, and the people in last week's export but not this week's ("deleted, merged, moved out of view or outside the export's filter: the export doesn't say which").
- Never say why anyone moved, never call a move good or bad, and never infer a move from anything else.
- **Without last week's export:** one line, "Not checked: last week's export wasn't attached." Then never use the words moved, new this week, stuck, stalled or no movement anywhere in the review, and skip list 4. Say how to keep next week's comparison (save this export with the date in its name).

## Conversion by Lead Source and by Agent

- **Who counts:** people with a Date Added in the period. Each rate is the people now in that stage or further, over the people added: always written "4 / 11 = 36.4%," numerator and denominator every time, one decimal.
- **By current stage:** someone who reached an appointment and later went to Nurture, Rejected or Trash counts only in that last column, so the rates are a floor. Say this once under the tables.
- Fewer than 5 people added: shown, and labeled too few to compare.
- **Not the source of record.** Follow Up Boss's Lead Source report and Sisu report closed-deal conversion and lead source return. Say so once; this table is a snapshot for the meeting.
- No benchmarks or "typical" rates, and no ranking words (best, worst, top, bottom, leading, lagging). Rows stay in the run's order (most people added first).

## By Agent

Counts and dates only: records, people by stage class, active people with nothing logged in more than the stale days, active people with none logged, open deals, and items on each list. Never a word about anyone's effort, performance, attitude or reliability: no "dropping the ball," "slipping," "behind," "underperforming," "lazy," "needs to step up," "struggling" or "best agent." If the user asks who is dropping the ball or underperforming, say plainly that the review gives each agent's counts and dates for the meeting, and that a judgment about a person is the team leader's, made in a 1:1 with the agent (Amplified Impact's Agent 1:1 Prep is built for that). Then give the facts.

## Questions for Each Agent

Use the run's questions as written, grouped by agent, for the team leader to ask in the pipeline meeting. Each asks about one record's next step, never about the agent. Items with no agent go to the team leader under Unassigned. Never add a question the run didn't write, except one line asking an agent to confirm a stage the user said they'd check.

## Odd Rows

List every odd row the run found, with file, row, name, what's odd and how it was treated: a closed deal with no close date; a Last Activity, Last Communication or Date Added after the as-of date; a date cell that isn't a date; a row with no stage. Never fix, fill, guess or move a date. Say where the owner fixes it in Follow Up Boss (the person's profile or the deal card) and that a person does it.

## Set Up in Follow Up Boss (Instructions Only)

Only when a fix belongs in Follow Up Boss, write the steps for the owner, never as done:
- **A Smart List for list 3:** People > All People > Filters; Stage includes Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers and Under Contract (the team's own stages if renamed); Last Communication was more than 7 days ago; + New List, name it ("Active, Nothing Logged 7+ Days"), share it with the agents, Save List. A second list with Last Communication is empty catches "none logged." Say that Follow Up Boss's default Met/Appt Set list already covers the two appointment stages at 6 days.
- **Stage definitions:** when stages were read by guess or as common custom stages, the owner writes down what each means; only the Account Owner changes stages (Admin > Stages).
- **Odd deals:** the agent or owner opens the deal card and fixes the close date or stage.
- Action plans, automations and lead routing go to Amplified Impact's FUB Automation Audit; this review never designs them.

## Privacy and Fair Housing

- The review shows names, stages, sources, tags the run names (Hot), agents, dates, and deal names and prices exactly as exported. It never shows an email address or phone number, and never repeats the Message, Notes, Description, Background, Calls or Texts columns, a lender, credit, income or any family or personal detail, even when a file holds them.
- Nothing about who a lead is: no age, family status, religion, national origin, race, sex, disability or any protected characteristic, and nothing inferred from a name or a note. Every question is about a record's next step.
- The review is for the team's meeting, not for clients. Attach pipeline_review.md only for people in that meeting.

## Check Before Sending

- The as-of date and where it came from; the stale days; the conversion period.
- Which file was read as this week's and which as last week's, and how people were matched.
- Every stage read as a common custom stage or by guess, and every deal stage read as open.
- Every date and days count in lists 1 to 3, with its arithmetic and the file and column it came from.
- Every deal's close date, stage and price as exported; deals not matched to a person; open deals with no close date.
- Every rate's numerator and denominator, and the period.
- Every odd row, unfixed.
- That no email address, phone number or note text appears anywhere in the review.
