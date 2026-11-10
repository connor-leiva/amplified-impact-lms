# FUB Pipeline Review Guide

Part 1 is how to read the exports and build the review. Part 2 is where each export comes from, what its columns mean, and what Follow Up Boss Reporting and Sisu already show.

## Part 1: Review Rules

Last verified: 2026-11-10. The Follow Up Boss facts behind these rules (default stages, what Last Communication and Last Activity mean, the Deals report's columns, the default Smart Lists, and what Follow Up Boss Reporting and Sisu already show) are in Part 2 of this guide, with sources. Everything else here is this project's own rule for reading the exports, not a Follow Up Boss rule, and the review says so where it matters.

### Settings

- **As-of date:** the day the export was downloaded, from the user's words; else a date in the file name ("FUB People 2026-11-10.csv"); else today's date, said in Flags. Every day count runs to it.
- **Which People export is this week's:** the user's words, then the dates in the file names, then the file with the newer Date Added. Say which in What I Used. The run flags files that look swapped.
- **Stale:** nothing logged in more than 7 days, unless the user names another number (`--days`). Follow Up Boss's own Met/Appt Set Smart List uses 6.
- **Conversion period:** the user's ("this quarter," "since August 1," "October") as `--period-start` and `--period-end`; otherwise the 90 days ending on the as-of date. Say which.
- **Hot:** a tag named Hot (or with the word hot in it, such as "Hot Lead"). If the team marks hot leads another way (a tag such as "A Lead"), put it in rules.json as `hot_tags` and rerun.

### Reading Stages

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

### Aging

- **People:** days since last communication = the as-of date minus the Last Communication date, always written out: "11/10/2026 minus 10/21/2026 = 20 days." The People export has no date a person entered their stage. With last week's export, "in the same stage in both exports" is the only stage-age fact; never estimate how long someone has been in a stage.
- **Deals:** days in stage = the as-of date minus Entered Stage; days past close = the as-of date minus Close Date. Both written out.
- **"No communication logged"** means nothing is logged in Follow Up Boss, not that nobody talked: calls and texts from a personal phone don't show unless logged. Say it that way, never "never contacted" or "ignored."
- **Last Activity** is the lead's own activity (inquiries, searches). The run shows it when it is newer than the last communication, as a fact ("the lead's own Last Activity is 11/09/2026, after the last communication"), never as a score or "hot."

### Needs a Decision This Week: The Four Lists

Each list is the run's, in the run's order. Never add, drop, merge or reword an item, and never add a reason the run didn't give. One person appears in at most one of lists 1 to 3.

1. **Deals past their expected close date.** An open deal (not closed, fell through or archived) whose Close Date is before the as-of date, most days past first. From the Deals export; without one, from the People export's Deal Stage and Deal Close Date (one deal per person: say so). Each with the stage, agent, close date and days past, days in stage (Deals export only), the price exactly as exported, and the person's stage and last communication when the deal matches a person. Open deals with no close date are listed apart: list 1 can't check them.
2. **Appointment set, no next step in the export.** A person in an appointment stage (Appointment Set, Met with Customer, or a stage the user said is one) with nothing logged in more than the stale days (or nothing logged at all), no open deal (when there is deal data) and the same stage as last week (when last week's export is attached). Each check that couldn't run is named on the item ("movement check not run").
3. **Hot or active, nothing logged in more than the stale days.** A person in an active stage (spoke, appointment, active client, under contract), or tagged Hot in any stage but closed or out, with nothing logged in more than the stale days or none at all, and not already in list 1 or 2.
4. **Stages with no movement since last week.** A pipeline stage (new lead through under contract) with people in it this week where no one entered and no one left since last week's export. Name the people; mark "also above" for anyone already in lists 1 to 3. Only with last week's export.

A person whose Last Communication can't be used (after the as-of date, or not a date) is left out of lists 2 and 3 and named under them, with the odd row.

**Which item comes first** (for the bottom line): the deal in list 1 with the most days past; else the first person in list 2; else the first in list 3; else the first stage in list 4. It is the first item to discuss, not a judgment of anyone.

### What Moved Since Last Week

- Only with last week's People export. Show the run's stage changes as "from (last week's stage) to (this week's stage)," the people new in this week's export, and the people in last week's export but not this week's ("deleted, merged, moved out of view or outside the export's filter: the export doesn't say which").
- Never say why anyone moved, never call a move good or bad, and never infer a move from anything else.
- **Without last week's export:** one line, "Not checked: last week's export wasn't attached." Then never use the words moved, new this week, stuck, stalled or no movement anywhere in the review, and skip list 4. Say how to keep next week's comparison (save this export with the date in its name).

### Conversion by Lead Source and by Agent

- **Who counts:** people with a Date Added in the period. Each rate is the people now in that stage or further, over the people added: always written "4 / 11 = 36.4%," numerator and denominator every time, one decimal.
- **By current stage:** someone who reached an appointment and later went to Nurture, Rejected or Trash counts only in that last column, so the rates are a floor. Say this once under the tables.
- Fewer than 5 people added: shown, and labeled too few to compare.
- **Not the source of record.** Follow Up Boss's Lead Source report and Sisu report closed-deal conversion and lead source return. Say so once; this table is a snapshot for the meeting.
- No benchmarks or "typical" rates, and no ranking words (best, worst, top, bottom, leading, lagging). Rows stay in the run's order (most people added first).

### By Agent

Counts and dates only: records, people by stage class, active people with nothing logged in more than the stale days, active people with none logged, open deals, and items on each list. Never a word about anyone's effort, performance, attitude or reliability: no "dropping the ball," "slipping," "behind," "underperforming," "lazy," "needs to step up," "struggling" or "best agent." If the user asks who is dropping the ball or underperforming, say plainly that the review gives each agent's counts and dates for the meeting, and that a judgment about a person is the team leader's, made in a 1:1 with the agent (Amplified Impact's Agent 1:1 Prep is built for that). Then give the facts.

### Questions for Each Agent

Use the run's questions as written, grouped by agent, for the team leader to ask in the pipeline meeting. Each asks about one record's next step, never about the agent. Items with no agent go to the team leader under Unassigned. Never add a question the run didn't write, except one line asking an agent to confirm a stage the user said they'd check.

### Odd Rows

List every odd row the run found, with file, row, name, what's odd and how it was treated: a closed deal with no close date; a Last Activity, Last Communication or Date Added after the as-of date; a date cell that isn't a date; a row with no stage. Never fix, fill, guess or move a date. Say where the owner fixes it in Follow Up Boss (the person's profile or the deal card) and that a person does it.

### Set Up in Follow Up Boss (Instructions Only)

Only when a fix belongs in Follow Up Boss, write the steps for the owner, never as done:
- **A Smart List for list 3:** People > All People > Filters; Stage includes Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers and Under Contract (the team's own stages if renamed); Last Communication was more than 7 days ago; + New List, name it ("Active, Nothing Logged 7+ Days"), share it with the agents, Save List. A second list with Last Communication is empty catches "none logged." Say that Follow Up Boss's default Met/Appt Set list already covers the two appointment stages at 6 days.
- **Stage definitions:** when stages were read by guess or as common custom stages, the owner writes down what each means; only the Account Owner changes stages (Admin > Stages).
- **Odd deals:** the agent or owner opens the deal card and fixes the close date or stage.
- Action plans, automations and lead routing go to Amplified Impact's FUB Automation Audit; this review never designs them.

### Privacy and Fair Housing

- The review shows names, stages, sources, tags the run names (Hot), agents, dates, and deal names and prices exactly as exported. It never shows an email address or phone number, and never repeats the Message, Notes, Description, Background, Calls or Texts columns, a lender, credit, income or any family or personal detail, even when a file holds them.
- Nothing about who a lead is: no age, family status, religion, national origin, race, sex, disability or any protected characteristic, and nothing inferred from a name or a note. Every question is about a record's next step.
- The review is for the team's meeting, not for clients. Attach pipeline_review.md only for people in that meeting.

### Check Before Sending

- The as-of date and where it came from; the stale days; the conversion period.
- Which file was read as this week's and which as last week's, and how people were matched.
- Every stage read as a common custom stage or by guess, and every deal stage read as open.
- Every date and days count in lists 1 to 3, with its arithmetic and the file and column it came from.
- Every deal's close date, stage and price as exported; deals not matched to a person; open deals with no close date.
- Every rate's numerator and denominator, and the period.
- Every odd row, unfixed.
- That no email address, phone number or note text appears anywhere in the review.

## Part 2: Follow Up Boss Exports, and What Follow Up Boss and Sisu Already Show

Last verified: 2026-11-10, against Follow Up Boss's help center (help.followupboss.com), Sisu's knowledge base (kb.sisu.co) and Follow Up Boss's Sisu integration page. Follow Up Boss's help center blocks automated page reads, so its articles were read through search excerpts on 2026-11-10; the export steps also match what this library's Database Health Check checked on 2026-11-08. Sources are at the end. Follow Up Boss changes its screens often: when a click path here and the user's screen disagree, trust the screen and say so.

### This Week's People Export (Required)

- **Who can export:** the Account Owner, and any user the owner gives Can Export (Admin > Team, the Can Export checkbox). Exporting respects each user's role: an agent's export holds only the people that agent can see, so run it as the owner or an admin for the whole team. The owner gets an email each time anyone exports. Exporting never changes or removes anyone.
- **Before exporting, turn on the columns the review reads.** On People, open the Columns menu (upper right) and check Stage, Source, Agent, Created, Last Communication, Last Activity and Tags. Follow Up Boss's People screen offers these as columns (People Overview; a Follow Up Boss help article on one coach's Smart Lists lists Stage, Last Activity, Last Communication, Agent, Pond and Created among its columns).
- **Steps:** People > All People (or a Smart List that holds the whole pipeline), check the box next to Name and choose Select All, click Export (the downward arrow), check Export All Columns, then Yes, Export People. A CSV downloads at once.
- **What Export All Columns holds** (the help center's list): Date Added, Name, First Name, Last Name, Stage, Lead Source, Assigned To, Last Assigned, Is Contacted, Listing Price, Tags, Email 1 to 6, Timeframe, Phone 1 to 6, addresses, property fields, Message, Description, Notes, Calls, Texts, Background, Deal Stage, Deal Close Date, Deal Price, campaign fields and custom fields. Without Export All Columns, the file holds the name plus the exportable columns turned on in the current view, and the first phone, email and address.
- **Not confirmed:** whether Last Communication and Last Activity come through with Export All Columns. They are People-view columns and Smart List filters, not on the help center's export list. If the file has no Last Communication column, export again without Export All Columns after turning those columns on in the view. The review says plainly when the column is missing and what it couldn't do without it.
- **No record ID.** The help center lists no ID column. The review matches the same person across two weeks by email, then phone, then name, and never shows the email or phone.
- **Ponds:** pond leads export under the pond's lead agent, and the pond name is left out. When one agent's count looks high, say this.

### A Deals Report Export (When the Team Uses Follow Up Boss Deals)

- **Steps:** Reporting, the Deals report, then in the upper right set Users, Time Frame and Filters (Pipeline, Status, Source, Users). Use + Add Columns under the report graph to add columns, click the export icon, choose the columns and export to CSV. The CSV keeps the column order of the report page. The same Can Export permission applies.
- **Columns the help center lists:** Name, Stage, Status (All Deals, Current Deals or Archived), Entered Stage (the date the deal entered its stage), Time in Stage (days), Close Date and Team. Search excerpts of the same article also list Price, Commission, Agent Commission and Team Commission. Add Price if it isn't on.
- **Pipeline** is a filter on the report; whether it can be a column is not confirmed. Without a Pipeline column, the review counts buyer and seller deals together. To keep them apart, export each pipeline separately.
- **Close Date** on a deal that isn't closed is the date the team expects it to close (Follow Up Boss's API calls the field the projected close date). Deal stages are the team's own: the Account Owner sets pipelines and stages (Admin > Deals, the settings gear). Follow Up Boss starts every account with a Buyers and a Sellers pipeline.
- **The People export's deal columns:** Deal Stage, Deal Close Date and Deal Price hold one deal per person. When several of a person's deals match a People filter, Follow Up Boss shows the one with the closest upcoming close date. Without a Deals export, the review uses these columns for list 1 and says so.

### Last Week's People Export (to See What Moved)

The same export, saved last week. Follow Up Boss keeps no weekly snapshot of everyone's stage, so the only way to compare is to keep last week's file. Each week, save the export with the date in its name (for example, "FUB People 2026-11-10.csv") and attach it next week.

### Follow Up Boss Facts the Review Relies On

- **Default stages** (Changing a Lead Stage): Lead (not spoken to yet; the default for new people), Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract (offer accepted), Nurture, Rejected, Closed (closed deal or post-closing), Trash. Lead, Closed and Trash are system stages. Only the Account Owner creates, renames or deletes stages (Admin > Stages). Teams often add stages such as Pending, Past Client or Sphere.
- **Last Communication** is the latest call, email, text, Zillow message or Inbox App conversation logged in Follow Up Boss (Filter Definitions). Calls and texts from an agent's personal phone don't show unless someone logs them, so "no communication logged" means nothing is logged in Follow Up Boss, not that nobody talked.
- **Last Activity** is the lead's own last activity: inquiries and property searches (Filter Definitions). It is never the agent's outreach.
- **Smart Lists:** People > All People > Filters, add filters, then + New List, name it, choose who to share it with, Save List. Sharing a list shares the filters, not the people: each agent sees only the matching people they can already see. Filter conditions include "was more than" (minutes to years) and "is empty."

### What Follow Up Boss Reporting and Sisu Already Show

Don't rebuild these. Say which one a team already has when it answers the question better.

- **Follow Up Boss Reporting:** the Agent Activity report (team performance by agent, counting new, initially assigned and currently assigned leads; action plan follow-up isn't counted); the Lead Source report (speed to action, first call, first text and first email by source, and "which lead source has the most closed deals," with Deals Closed, Deal Value, Deal Commission and Conversion Rate); the Appointment report (appointments that occurred, by user, type and outcome); the Deals report (each deal's stage, Entered Stage, Time in Stage and Close Date); the Deals Leaderboard (closed deals in the chosen pipelines); and closed deal reporting by agent. The Deals screen shows the total value of deals in each stage, close dates and total commission.
- **Follow Up Boss default Smart Lists:** Met/Appt Set (Stage includes Met with Customer and Appointment Set, Last Communication more than 6 days ago), Revived Prospects, Under Contract, Past Clients (Stage includes Closed, Last Communication more than 90 days ago) and others.
- **Sisu,** with its Follow Up Boss integration: pulls calls, texts, emails, conversations and new leads from Follow Up Boss into dashboards measured against goals; turns a deal created in Follow Up Boss in the Sisu Buyer or Sisu Seller pipeline into a Sisu transaction; and reports lead source effectiveness and return. The integration syncs in a nightly batch (about 2 AM, per Sisu's setup article) and needs the Account Owner's API key.

**What this review adds:** one named, dated list of what needs a decision this week across every agent, built from the export's own fields; aging worked out per record with the arithmetic shown; deals past their close date tied to the person and their last communication; last week against this week, person by person (no Follow Up Boss report keeps that snapshot); questions for each agent for the meeting; and odd rows flagged, never fixed. Its conversion table is a snapshot by current stage for the meeting. For official closed-deal conversion and lead source return, the Lead Source report and Sisu stay the source of record.

### Sources

Follow Up Boss help center, read through search excerpts on 2026-11-10 (an article's own last-updated date in parentheses where known):
- Export Contacts to a Spreadsheet (2026-04-21): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet
- Exporting reports to a spreadsheet: https://help.followupboss.com/hc/en-us/articles/8897311199511-Exporting-reports-to-a-spreadsheet
- Deals Report: https://help.followupboss.com/hc/en-us/articles/360047800793-Deals-Report
- Creating Deals: https://help.followupboss.com/hc/en-us/articles/360015220774-Creating-Deals
- Deals Leaderboard: https://help.followupboss.com/hc/en-us/articles/4402383606039-Deals-Leaderboard
- People Overview (2025-03-06): https://help.followupboss.com/hc/en-us/articles/360018115954-People-Overview
- Gabe Cordova's Smart Lists: https://help.followupboss.com/hc/en-us/articles/4408794102423-Gabe-Cordova-s-Smart-Lists
- Filter Definitions (2026-07-22): https://help.followupboss.com/hc/en-us/articles/360025651313-Filter-Definitions
- Lead Profile Overview: https://help.followupboss.com/hc/en-us/articles/9538400649495-Lead-Profile-Overview
- Changing a Lead Stage (2026-07-06): https://help.followupboss.com/hc/en-us/articles/360012456793-Changing-a-Lead-Stage
- Smart Lists Overview (2026-07-22): https://help.followupboss.com/hc/en-us/articles/1500008374882-Smart-Lists-Overview
- Default Smart Lists (2026-07-22): https://help.followupboss.com/hc/en-us/articles/4420635737239-Default-Smart-Lists
- Users, Roles & Permissions (2025-09-25): https://help.followupboss.com/hc/en-us/articles/4402370636567-Users-Roles-Permissions
- Agent activity report: https://help.followupboss.com/hc/en-us/articles/360014693073-Agent-activity-report
- Speed to lead & lead source report: https://help.followupboss.com/hc/en-us/articles/9229981219351-Lead-Source-Report
- Closed Deal Report by Lead Source: https://help.followupboss.com/hc/en-us/articles/360014628574-Closed-Deal-Report-by-Lead-Source
- Appointment Report: https://help.followupboss.com/hc/en-us/articles/9228360927383-Appointment-Report
- Closed deal reporting by agent: https://help.followupboss.com/hc/en-us/articles/360014718373-Closed-deal-reporting-by-agent
- Lead Ponds Overview (2024-11-15): https://help.followupboss.com/hc/en-us/articles/360048829034-Lead-Ponds-Overview
- Follow Up Boss API, deals (projectedCloseDate): https://docs.followupboss.com/reference/deals-post

Sisu, checked 2026-11-10:
- Setting up the Follow Up Boss integration: https://kb.sisu.co/en/articles/8380608-setting-up-the-follow-up-boss-integration
- Ins and outs of the Follow Up Boss integration: https://kb.sisu.co/en/articles/8400470-ins-outs-of-the-follow-up-boss-integration
- Follow Up Boss's Sisu integration page: https://followupboss.com/integrations/sisu

Third party, checked 2026-11-10: Bramlett Partners' Follow Up Boss classes page notes that calls and texts from a personal phone aren't tracked unless logged: https://support.bramlettpartners.com/article/820-2026-fub-classes

Not confirmed here (say "confirm with Follow Up Boss support" if it matters): whether Last Communication and Last Activity come through with Export All Columns; whether Pipeline can be a Deals report column; the Deals report's exact header for its price column; Follow Up Boss's own conversion rate formula.
