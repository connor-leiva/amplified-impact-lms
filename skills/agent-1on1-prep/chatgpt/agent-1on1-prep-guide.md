# Agent 1:1 Prep Guide

Part 1 is how to build the prep: settings, goals, the pace math, what changed, commitments, privacy, questions, focus areas, the agenda, the recap and the checks. Part 2 is where the agent's numbers and goals come from, the Sisu terms behind them, and what Sisu and Follow Up Boss already show.

## Part 1: Prep Rules

Last verified: 2026-11-10. Where the numbers and goals come from, and the Sisu and Follow Up Boss terms behind them, are in Part 2 of this guide, with sources. Everything else here is this project's own rule for building the prep, not a Sisu, Follow Up Boss or coaching-method rule, and the prep says so where it matters.

### Settings

- **The agent:** the one person this one-on-one is with, from the user's words or the numbers file. If the numbers file holds several agents and the user didn't say which, ask once, by name, before anything else.
- **As-of date:** the user's words ("pulled this morning, November 10"); else a date in the numbers file's name; else today's date, said in Flags. The pace window runs through the last full month before it.
- **The meeting:** date, start time and length from the user's words. No length: 30 minutes, said in Flags. No start time: minutes only, with [Start Time]. No date: [Meeting Date].
- **The last one-on-one's date:** from last time's notes or the user's words. Without it, "what changed" from the numbers isn't worked out; say so.
- **The plan year:** January to December of the as-of year, unless the goals say otherwise (a plan that starts in another month: `plan_start` in goals.json).

### Goals

- A goal comes only from the agent's goals file, business plan, Sisu's goals screen as printed, or the user's own words ("her goal is 24 closings"). Never from a typical number, last year, the team's goal or another agent.
- Write goals.json with one entry per goal and the line it came from, exactly as written ("quote"). Pass every file the goals came from to the run as `--goals-source`; for goals in the user's message, save the message text to a file first. The run leaves out any goal it can't find in those files: say which, and why, in Flags.
- **Production measures only:** appointments set, appointments met, signed, under contract, closed units, closed volume, GCI (and conversations when the file has them). Planned rates (met to signed, under contract to closed) go under `rates`. Pay is never paced or repeated: take-home, split, agent paid income (Sisu's individual goal is Gross Agent Paid Income), cap or fees.
- **No goal:** no pace math, anywhere. Say so in Flags and in Numbers Against Goal, in these words or close: "No goal or business plan was attached, so there's no pace math. Attach her goals (Sisu: Account > Performance > Goals, or her business plan) and I'll rerun." Never estimate a goal from her past months or a typical number, even when asked "is she on pace?"; give the year to date and her own monthly average, and say pace needs her goal.
- A goal for some measures and not others: pace only those that have one, and name the rest.

### The Pace Math (the Run's, Shown)

- **Year to date:** the sum of each month in the window, written out ("1 + 1 + 1 + 2 + ... = 20"). A month with an empty cell, a cell that isn't a number or no row at all stops that measure's total: the measure is "not totaled", the month is named, and nothing is filled or guessed. A dash is not a zero until the leader says so.
- **Prorated goal:** with monthly goals, the sum of the window's monthly goals; with only an annual goal, the annual goal times the months in the window over 12 ("24 x 10 / 12 = 20.0"), said once as "prorated evenly by month, no seasonality". Sisu's Personal Pacer may follow monthly goals, so its number can differ: Sisu is the source of record for its own pacer.
- **Pace:** year to date over the prorated goal ("20 / 20.0 = 100.0% of the prorated goal"), and the difference ("40.0 minus 33 = 7.0 under the prorated goal").
- **To the annual goal:** the annual goal minus year to date, over the months left ("(24 minus 20) / 2 months left = 2.0 a month to reach the annual goal of 24"). It is what the goal needs, never a forecast of what she will do.
- **A partial month** (the as-of month) is shown apart as month to date and left out of the pace math.
- **Count ratios** (appointments met to signed, and so on) divide one year-to-date count by another for the same months, shown as "33 / 72 = 45.8%". They are not cohort conversion rates; say so once, and that Sisu's conversion figures are the source of record. Compare one with the plan's rate only when the goals file states that rate.
- Every number in the prep is a number from the inputs or the run. Never add, subtract, average or round anything by hand. If a figure isn't in the run, leave it out.

### What Changed Since the Last One-on-One

- **From the numbers (the run's):** year to date through the last full month before the last one-on-one, what each month since added, year to date now, and pace then and now when there's a goal. Then each month since, beside her own monthly average for the months before it ("October: 5, against her January to September average of 80 / 9 = 8.9 a month"). Say once that both come from this file, so a month changed in the source since then can differ from what was seen at the time.
- **From the notes:** anything new the leader's notes or the user's message report (an open house held, a listing taken), each labeled with where it came from ("your notes", "she says"). Never infer a change.
- No full month closed since the last one-on-one: say so in one line and give the notes only.
- No trend words: not "slipping", "declining", "trending down", "bouncing back". Say the numbers.

### Last Time's Commitments

- List every commitment from last time's notes, word for word, numbered as they were. The leader's own commitments too, when the notes list them, under "Yours".
- **Status exactly as the inputs give it:** the word or line from last time's notes, the leader's notes or the user's message, quoted with its source ("Done, per your notes: 'she texted me on 10/29 that she finished calling the Q3 buyers'"). Nothing given: "No status given."
- **Never mark a commitment done, not done, missed, partly done or late** from anything else: not from the numbers, a date passing, or silence. A commitment with a number ("at least 8 appointments in October") gets the matching number from the file beside it as a fact ("The export shows 5 appointments set in October"), and its status stays as given.
- A commitment with a due date that has passed and no status: "No status given", plus one coaching question asking for an update. Never "overdue".

### Privacy and the Leader's Notes

- **Stays out of every part of the prep,** wherever it appears (the leader's notes, last time's notes, the goals file, the numbers file): health or medical, family, pregnancy, personal life and relationships, a personal "why" in a business plan, HR matters (complaints, discipline, leave, accommodations), and pay (split, take-home, income, cap, fees, bonus, draw). Add one line in Flags: "Left out: [n] personal or pay detail(s) from [file or 'your notes']. They don't appear anywhere below; whether and how to raise them is yours." Never name the detail, hint at it, or plan the agenda around it.
- **A pay or split question** (the agent asked for a different split): left out, with one more line in Flags: "A pay question in your notes is for you and your broker; this prep doesn't cover splits or compensation." Never propose, compare or model a split, cap or fee.
- **Other agents:** never named, never compared, and their numbers never shown, even when they sit in the same file or the leader's notes. A team average appears only when the leader supplies one, labeled "the team average you gave", never computed from other agents' rows.
- **A request to compare** ("is she pulling her weight compared to Dana?"): answer in one line in Flags, without repeating the other agent's name, the wording or any of their numbers: "You asked how she compares with another agent. This prep compares her numbers only with her own goal and her own months; a comparison with a named teammate isn't part of a coaching one-on-one prep." Then give her facts.
- Client names, addresses and any client detail from a Sisu or Follow Up Boss report never appear. Never repeat account, routing or Social Security numbers or wire details.

### Facts, Not Judgments

- No label or verdict for the agent: never "underperforming", "lazy", "struggling", "slipping", "falling behind", "not pulling her weight", "unmotivated", "a problem", "a star", "top performer", "weak", "disappointing", "needs to step up", "good" or "bad" month. Write the numbers and their arithmetic.
- No predictions about the agent: never "on pace to finish at", "will hit", "will miss", "likely to", "at this rate", "projected", "forecast". The "to the annual goal" line is goal math, labeled as such.
- No pace labels borrowed as verdicts ("not on pace", "off track"). Say the percentage of the prorated goal.
- Never a word about effort, attitude, commitment, character or anything personal.

### Open Coaching Questions

Five to eight, in the order of the agenda. Each is open (what, how, which, where), about the business, and tied to one number, commitment or note, with that fact in the question or right before it. Ask for her view, never a confession or an excuse: "What's changed in where your appointments come from since the summer?", not "Why did your appointments drop?" or "What's getting in the way?". Include one asking for an update on each commitment with no status given, one about what she wants from the leader, and one about what she wants to focus on. Never a question about health, family, personal life, pay or another agent.

### Possible Focus Areas (the Leader's Call)

- One to three, from the run's Focus Candidates, in the run's order: with a goal, the measures under the prorated goal, lowest pace first, with any planned rate she's under attached; without a goal, the measures whose months since the last one-on-one came in under her own monthly average. Never add one the run didn't list. When the run lists none, say so and offer the leader's own topic from their notes.
- Each is an option: the measure, its numbers with arithmetic, and one question to open it. Head the section "Possible Focus Areas (Your Call)" and end it with one line: "These are options from the numbers, not a verdict; pick one, or none."
- Never "she needs to", "she should", "the problem is", "the fix is". No action plan, quota or consequence.

### The Agenda (a Suggestion)

The default for 30 minutes, scaled to the meeting's length: her wins and what's on her mind (she goes first), 5; numbers against her goal, 5; last time's commitments, 5; the focus you pick, 10; new commitments, what she needs from you, and the next one-on-one's date, 5. With a start time, give clock times ("10:00 AM to 10:05 AM"); without, minutes and [Start Time]. Add a topic from the leader's notes only when the notes ask for it, inside the focus block. Label it "a suggested order; change it to yours". This is this project's default, not a published method.

### The Recap Template (to Fill In After)

A short message the leader can finish after the meeting and send to the agent, Title Case subject (for example, "Our One-On-One Recap And Next Steps"). It holds: the date; the numbers you looked at, as [Numbers We Looked At]; last time's commitments, each with [Update From Today]; the focus you picked, [Focus]; her commitments in her own words with dates, [Commitment] by [Date]; what you'll do, [Your Commitment]; the next one-on-one, [Date and Time]; signed with the user's name or [Your Name]. Every blank is a [placeholder]: nothing about what was said is pre-written. Under it, one line: "A coaching recap, not a performance review or a write-up. Keep personal matters and pay out of it." Follow the user's voice profile when one is in the conversation; otherwise warm, plain and direct.

### Not a Review, a Write-Up or a Termination Document

If asked to write a performance review, a write-up, a performance improvement plan, a warning, a termination or anything for the agent's file, or to rate or rank the agent, say in one line that this project preps a coaching conversation only, that those go through the broker and HR, and offer the prep. Never propose changing splits, compensation, caps, fees, leads or the agent's status on the team.

### Check Before Sending

Before anything goes to the agent (the agenda, the recap) or into the meeting:
- The as-of date and where it came from; the pace window; the partial month left out.
- Every goal with its quote and file; every goal left out and why; whether goals were prorated evenly or by month.
- Every year-to-date figure, prorated goal, pace and difference, with the arithmetic and the file it came from; any measure not totaled and the month that stopped it; every column read to confirm.
- Every commitment's wording and status with its source line; every number shown beside a commitment, with its month and file.
- Every note-based change, with its source.
- The meeting date, time and length, and every [placeholder].
- That nothing left out (personal, health, family, HR or pay details, another agent's name or numbers, client names) appears anywhere in the prep or the recap.

## Part 2: Where the Numbers Come From, and What Sisu and Follow Up Boss Already Show

Last verified: 2026-11-10, against Sisu's knowledge base (kb.sisu.co and kb-app.sisu.co, read through Sisu's own knowledge base search and the public pages) and Follow Up Boss's help center (read through search excerpts, as this library's FUB Pipeline Review did on 2026-11-10, because the help center blocks automated page reads). Sources are at the end. Sisu and Follow Up Boss change their screens often: when a click path here and the leader's screen disagree, trust the screen and say so.

### The Agent's Numbers, Month by Month (Required)

The prep needs one agent's numbers by month for the plan year so far: appointments set, appointments met, signed, under contract, closed units, closed volume and GCI. Any of these work; any measure that's missing is simply left out.

- **The team's own tracker or spreadsheet** (CSV or Excel), one row per month or months across the top. A tracker with every agent in it works: the run keeps only the agent named and never shows anyone else's rows.
- **Sisu, the Agent Accountability Report** (one of Sisu's reports, at app.sisu.co/app/reports/agent-accountability). Set Scope to the agent and pick a date range (Last Month, This Year or a custom range). Its top section, Actuals vs. Goals, shows Actual To Date, Personal Pacer (what the agent should have achieved in the range to stay on track to the goal) and Personal Goal for each measure, with On Pace, Not On Pace or Goal Achieved. A download icon at the top downloads the report; its file type is not confirmed here. The sections below it list each transaction with the client's name, address and Commissions (agent paid income): the prep never uses those.
  - For month-by-month numbers: run it for each month (Last Month, once a month) and keep the numbers, or keep them in the team's tracker.
  - For year to date only: run it for This Year. Copy the Actual To Date figures into a one-row CSV exactly as shown, with the Month cell "YTD", and give the run the last full month the range covers (`--through`). Pace math works; what changed month by month can't be worked out from one total.
- **Sisu, the Personal Dashboard** (the Circles Dashboard), filtered to a date range: each circle from Conversations on shows a total, the goal for that measure under it, the conversion percentage between steps, and buyer and seller apart. The YTD Dashboard shows totals from January 1 to today and can be filtered to one agent.
- **Follow Up Boss Reporting:** the Appointment report (appointments that occurred, by user, type and outcome), the Deals report and closed deal reporting by agent. Set the user to the agent and the time frame to a month, then export (Reporting, the export icon, CSV; "Exporting reports to a spreadsheet"). Whether the Appointment report counts set and met separately is not confirmed here: if the column just says Appointments, the run reads it as met and asks to confirm.
- **A PDF printout or a screenshot:** copy the month-by-month numbers into a CSV exactly as printed, one row per month, and list every copied number in Check Before Sending. Never round, fill or tidy a printed number.
- **Not read in this version:** a transaction-by-transaction list (one row per deal, such as Sisu's Transactions download), which would need counting by date. Ask for the monthly numbers instead.

### The Agent's Goals (Helpful)

- **Sisu:** Account > Performance > Goals. The Yearly Goals section summarizes production goals; Monthly Goals can be edited month by month (with Auto Adjust, changing one month updates the rest to keep the year aligned). The Goal Calculator (Account > Performance > Goal Calculator) builds yearly and monthly goals from goal drivers: average price point, the production goal, split, average GCI percent, buyer share, and the conversion rates from conversations to appointment set, appointment set to met, met to signed, signed to under contract, and under contract to closed. For an individual, Sisu's production goal is Gross Agent Paid Income: that is pay, and the prep never paces it.
- **A business plan** (a doc, a PDF, a sheet) or the agent's goals in the leader's own message.
- **Monthly goals** (when the plan has them) are used month by month; otherwise the annual goal is prorated evenly by month. Sisu's own Personal Pacer may follow monthly goals with seasonality, so its number can differ from an even proration: say so when both are in front of the leader, and treat Sisu as the source of record.

### Last Time's Notes and the Leader's Notes

Whatever the leader keeps: a doc, a text file, notes pasted from a meeting notes app, or lines typed into the chat. Last time's notes should carry the date of that one-on-one and the agent's commitments in their own words. The leader's notes for this one carry anything new: what the agent reported, what the leader wants to raise.

### Sisu Terms the Prep Relies On

- **Signed:** the date the client signs an agreement to work with the agent; it moves the transaction to Signed (Sisu Glossary). The Agent Accountability Report's Buyer And Listing Agreements Signed section counts transactions by the Signed Date.
- **Under Contract** counts by the Under Contract Date field; **Pending** is a status, the transactions whose Under Contract Date has passed but haven't closed (Sisu Glossary; Agent Accountability Report Overview). A monthly column labeled Pending or Pendings is read as new under contracts that month, and the leader confirms.
- **Closed:** by the Closed (Settlement) Date. **Closed volume** comes from each transaction's Transaction Amount (Personal Dashboard Overview).
- **GCI** is gross commission income from commissions on sales, before referral fees are subtracted (Sisu Glossary). It's a production measure and is paced like the others. Gross or Net Agent Paid Income, take-home, split, cap and fees are pay: never paced, never repeated.

### What Sisu and Follow Up Boss Already Show, and What This Adds

Don't rebuild these; name them when they answer a question better.

- **Sisu** already shows each agent's actuals against a Personal Pacer and Personal Goal with On Pace labels (the Agent Accountability Report, scoped to one agent), conversion between each step and pacing on the Personal Dashboard, and goals by month. Sisu's own help center names the Dashboard and the Agent Accountability Report as the tools teams use to hold agents to their goals and to coach in one-on-ones.
- **Follow Up Boss** already shows appointments by user, type and outcome (the Appointment report), each deal's stage and close date (the Deals report) and closed deals by agent.
- **What this prep adds:** the pace arithmetic written out against this agent's own goal, so the leader can explain every number (and it works when the numbers live in a spreadsheet, not Sisu); what the months since the last one-on-one added, beside the agent's own monthly average; last time's commitments carried forward with their status as given; and the open questions, focus options, agenda and recap template. Sisu stays the source of record for its own pacing and conversion.

### Sources

Sisu knowledge base, checked 2026-11-10 (an article's own date in parentheses where shown):
- Agent Accountability Report Overview (updated 2025-10-08): https://kb-app.sisu.co/en/articles/10984476-agent-accountability-report-overview
- Personal Dashboard Overview (updated 2026-08-10): https://kb-app.sisu.co/en/articles/9472782-personal-dashboard-overview
- Setting Goals for Your Agents and Your Team (Kayla Latta, updated 2026-07-24): https://kb-app.sisu.co/en/articles/8839857-setting-goals-for-your-agents-and-your-team
- Sisu 101 (Agents): Setting and Tracking Goals (Kayla Latta, 2026-10-08): https://kb-app.sisu.co/en/articles/10579440-sisu-101-agents-setting-tracking-goals
- How do admins hold agents accountable to their goals? (Shane Taylor, 2023-08-09): https://kb.sisu.co/en/articles/4299726-how-do-admins-hold-agents-accountable-to-their-goals
- Top Reports to Drill Down Your Business (Kayla Latta, 2025-10-07): https://kb.sisu.co/en/articles/8251067-top-reports-to-drill-down-your-business
- Sisu Glossary (Alex Masterson, 2024-06-12): https://kb.sisu.co/en/articles/8514178-sisu-glossary
- How do admins give other Sisu users the ability to export/download transactions? (Frank Felice, 2023-10-16): https://kb.sisu.co/en/articles/4622638-how-do-admins-give-other-sisu-users-the-ability-to-export-download-transactions

Follow Up Boss help center, read through search excerpts on 2026-11-10:
- Appointment Report: https://help.followupboss.com/hc/en-us/articles/9228360927383-Appointment-Report
- Deals Report: https://help.followupboss.com/hc/en-us/articles/360047800793-Deals-Report
- Closed deal reporting by agent: https://help.followupboss.com/hc/en-us/articles/360014718373-Closed-deal-reporting-by-agent
- Exporting reports to a spreadsheet: https://help.followupboss.com/hc/en-us/articles/8897311199511-Exporting-reports-to-a-spreadsheet

Not confirmed here (say "confirm with Sisu or Follow Up Boss support" if it matters): the file type of the Agent Accountability Report's download; whether any Sisu screen downloads month-by-month numbers in one file; whether Follow Up Boss's Appointment report separates appointments set from appointments met; how Sisu's Personal Pacer spreads an annual goal across months when no monthly goals are set.
