# Pipeline Review: As of Tuesday, November 10, 2026

*Made-up example: what the skill returned for the three practice files and the practice prompt, run on 2026-11-10 and graded in evals/runs/case-1/grading.md (11 of 11 expectations, every objective check passing). Every team, agent, lead, street and number is made up. The day counts run to the as-of date in the prompt (November 10, 2026), so a run on another day should match it.*

Prompt: "Pipeline meeting is tomorrow morning. Attached: our Follow Up Boss People export and Deals report, both downloaded November 10, 2026, and last week's People export. Run the pipeline review."

## Flags

- **As of 11/10/2026:** you said the People export and Deals report were downloaded November 10, 2026, and their file names carry 2026-11-10. Every day count runs to that date.
- **Stale means nothing logged in more than 7 days** (the default; tell me another number and I'll rerun). Follow Up Boss's own Met/Appt Set Smart List uses 6.
- **Conversion period:** the default, people with a Date Added from 08/12/2026 through 11/10/2026 (the 90 days ending on the as-of date).
- **3 odd rows,** listed under Odd Rows. None was fixed.
- **Deal stages read by their names:** Buyer Agreement, Listed, Pending and Under Contract as open; Closed as closed; Fell Through as fell through. Confirm in Check Before Sending.
- The Deals export has no Pipeline column, so buyer and seller deals are counted together.

## Bottom Line

Of 54 people in this week's export, 26 are in active stages, and the decision list holds 2 deals past their expected close date, 3 appointment-stage people with no next step in the export, 7 hot or active people with nothing logged in more than 7 days, and 2 stages with no movement. Start with Ferdinand Rattlecap's deal at 77 Marzipan Ct (Pending, Otis Marmaduke), 11 days past its 10/30/2026 expected close. Since last week's export, 9 people changed stage, 3 are new, and 1 is no longer in the export.

## What I Used

- **This week:** PRACTICE FUB People Export 2026-11-10.csv, 54 people (downloaded November 10, 2026, as you said; its file name says 2026-11-10).
- **Last week:** PRACTICE FUB People Export 2026-11-03 Last Week.csv, 52 people. 51 people matched across the two weeks, all by email (emails were read only to match and are not shown anywhere).
- **Deals:** PRACTICE FUB Deals Report 2026-11-10.csv, 13 deals; 1 archived deal was left out of every check.
- **Columns used:** Name, Stage, Lead Source, Assigned To, Date Added, Last Communication, Last Activity and Tags from the People exports; Name, Stage, Status, Entered Stage, Close Date, Price and Team from the Deals export. The Notes, Message, email and phone columns were not used in the review.
- **Stages:** every stage in use is a Follow Up Boss default, read without guessing. One person has no stage (an odd row).
- **Gaps:** no Pipeline column in the Deals export. Every count is in the attached pipeline_review.md.

## Pipeline by Stage

54 records; 39 in pipeline stages (new lead through under contract), 26 of them active (spoke, appointment, active client, under contract).

| Stage | Now | Last week | Within 7 days | More than 7 days | None logged | Oldest last communication |
|---|---|---|---|---|---|---|
| Lead | 6 | 8 | 1 | 1 | 4 | Peregrine Zigzagger: 10/31/2026, 11/10/2026 minus 10/31/2026 = 10 days |
| Attempted Contact | 7 | 5 | 3 | 4 | 0 | Theodora Wigglesby: 10/02/2026, 11/10/2026 minus 10/02/2026 = 39 days |
| Spoke with Customer | 5 | 6 | 3 | 1 | 1 | Delphine Fluffernutter: 10/30/2026, 11/10/2026 minus 10/30/2026 = 11 days |
| Appointment Set | 3 | 2 | 2 | 1 | 0 | Pemberton Quibblesworth: 10/21/2026, 11/10/2026 minus 10/21/2026 = 20 days |
| Met with Customer | 3 | 3 | 0 | 2 | 1 | Tilda Fizzlebottom: 10/27/2026, 11/10/2026 minus 10/27/2026 = 14 days |
| Showing Homes | 3 | 4 | 2 | 1 | 0 | Wendell Crumbleton: 10/24/2026, 11/10/2026 minus 10/24/2026 = 17 days |
| Listing Agreement | 2 | 3 | 2 | 0 | 0 | Horatio Butterwick: 11/04/2026, 11/10/2026 minus 11/04/2026 = 6 days |
| Active Listing | 3 | 2 | 3 | 0 | 0 | Bartholomew Lumpkin: 11/03/2026, 11/10/2026 minus 11/03/2026 = 7 days |
| Submitting Offers | 2 | 2 | 2 | 0 | 0 | Ambrose Sprocketton: 11/05/2026, 11/10/2026 minus 11/05/2026 = 5 days |
| Under Contract | 5 | 5 | 3 | 2 | 0 | Cosmo Gigglesworth: 10/31/2026, 11/10/2026 minus 10/31/2026 = 10 days |
| Closed | 4 | 3 | 1 | 3 | 0 | Calliope Whistlebrook: 09/15/2026, 11/10/2026 minus 09/15/2026 = 56 days |
| Nurture | 7 | 6 | 0 | 7 | 0 | Zinnia Tufflewick: 06/18/2026, 11/10/2026 minus 06/18/2026 = 145 days |
| Rejected | 1 | 1 | 0 | 1 | 0 | Desmond Fernsnap: 09/20/2026, 11/10/2026 minus 09/20/2026 = 51 days |
| Trash | 2 | 1 | 0 | 1 | 1 | Fitzgerald Lollygag: 10/15/2026, 11/10/2026 minus 10/15/2026 = 26 days |
| (no stage) | 1 | 1 | 0 | 0 | 1 | |

"None logged" means nothing is logged in Follow Up Boss. Calls and texts from a personal phone don't show unless someone logs them.

### Deals by Stage

| Stage | Read as | Deals | Longest in stage (open deals) | Past expected close date | No close date |
|---|---|---|---|---|---|
| Buyer Agreement | open | 1 | Posy Bumbershoot: entered 10/22/2026, 11/10/2026 minus 10/22/2026 = 19 days | 0 | 1 |
| Listed | open | 2 | Bartholomew Lumpkin, 880 Gumdrop Way: entered 10/01/2026, 11/10/2026 minus 10/01/2026 = 40 days | 0 | 2 |
| Pending | open | 1 | Ferdinand Rattlecap, 77 Marzipan Ct: entered 09/22/2026, 11/10/2026 minus 09/22/2026 = 49 days | 1 | 0 |
| Under Contract | open | 4 | Petunia Quillby, 418 Gumdrop Way: entered 09/28/2026, 11/10/2026 minus 09/28/2026 = 43 days | 1 | 0 |
| Closed | closed | 3 | | 0 | 0 |
| Fell Through | fell through | 1 | | 0 | 0 |

Open deals with no close date, which list 1 can't check: Percival Scrumpkin, 14 Licorice Loop; Bartholomew Lumpkin, 880 Gumdrop Way; Posy Bumbershoot.

## What Moved Since Last Week

Compared with last week's export (51 people matched by email).

**Stage changes (9):**

| Person | Agent | Last week | This week |
|---|---|---|---|
| Ignatius Tumblewick | Clementine Puddleby | Spoke with Customer | Appointment Set |
| Winifred Waffleton | Juniper Fogwhistle | Under Contract | Closed |
| Clover Dewdrop | Hazel Tinkersnap | Showing Homes | Under Contract |
| Montgomery Elderwhistle | Otis Marmaduke | Listing Agreement | Active Listing |
| Primrose Noodleman | Barnaby Crumpet | Lead | Attempted Contact |
| Cornelius Oatcrumble | Hazel Tinkersnap | Lead | Spoke with Customer |
| Dorothea Gobbledy | Juniper Fogwhistle | Spoke with Customer | Nurture |
| Fitzgerald Lollygag | Otis Marmaduke | Attempted Contact | Trash |
| Gwendolyn Mumblecrust | Clementine Puddleby | Lead | Attempted Contact |

**New in this week's export (3):** Humphrey Nimblefoot (Juniper Fogwhistle, Lead, added 11/04/2026), Imogen Oddsbody (Barnaby Crumpet, Lead, added 11/06/2026), Jasper Pumpernickel (Clementine Puddleby, Attempted Contact, added 11/08/2026).

**In last week's export, not in this week's (1):** Kipling Rumbleford (Otis Marmaduke, Lead last week). Deleted, merged, moved out of view or outside the export's filter: the export doesn't say which.

## Needs a Decision This Week

### 1. Deals Past Their Expected Close Date (2)

- **Ferdinand Rattlecap, 77 Marzipan Ct** (Pending; Otis Marmaduke): expected close 10/30/2026, 11 days past (11/10/2026 minus 10/30/2026 = 11 days). In Pending since 09/22/2026 (11/10/2026 minus 09/22/2026 = 49 days). Price as exported: 538000. Ferdinand is in Under Contract, last communication 11/02/2026 (11/10/2026 minus 11/02/2026 = 8 days).
- **Petunia Quillby, 418 Gumdrop Way** (Under Contract; Barnaby Crumpet): expected close 11/06/2026, 4 days past (11/10/2026 minus 11/06/2026 = 4 days). In Under Contract since 09/28/2026 (11/10/2026 minus 09/28/2026 = 43 days). Price as exported: 412500. Petunia is in Under Contract, last communication 11/07/2026 (11/10/2026 minus 11/07/2026 = 3 days).

### 2. Appointment Set, No Next Step in the Export (3)

Each is in an appointment stage, in the same stage as last week's export, with no open deal in the Deals export and nothing logged in more than 7 days.

- **Rufus Puddingstone** (Met with Customer; Hazel Tinkersnap): no communication logged.
- **Pemberton Quibblesworth** (Appointment Set; Juniper Fogwhistle): last communication 10/21/2026 (11/10/2026 minus 10/21/2026 = 20 days).
- **Tilda Fizzlebottom** (Met with Customer; Barnaby Crumpet): last communication 10/27/2026 (11/10/2026 minus 10/27/2026 = 14 days).

### 3. Hot or Active, Nothing Logged in More Than 7 Days (7)

- **Lysander Jellybean** (Spoke with Customer; Juniper Fogwhistle): no communication logged; the lead's own Last Activity is 10/02/2026.
- **Bertram Puddlejump** (Nurture, tagged Hot; Clementine Puddleby): last communication 10/10/2026 (11/10/2026 minus 10/10/2026 = 31 days); the lead's own Last Activity is 11/02/2026, after the last communication.
- **Henrietta Hobnob** (Attempted Contact, tagged Hot; Hazel Tinkersnap): last communication 10/20/2026 (11/10/2026 minus 10/20/2026 = 21 days); the lead's own Last Activity is 11/09/2026, after the last communication.
- **Wendell Crumbleton** (Showing Homes; Barnaby Crumpet): last communication 10/24/2026 (11/10/2026 minus 10/24/2026 = 17 days); the lead's own Last Activity is 11/08/2026, after the last communication.
- **Posy Bumbershoot** (Met with Customer, open deal in Buyer Agreement; Juniper Fogwhistle): last communication 10/29/2026 (11/10/2026 minus 10/29/2026 = 12 days).
- **Delphine Fluffernutter** (Spoke with Customer; Otis Marmaduke): last communication 10/30/2026 (11/10/2026 minus 10/30/2026 = 11 days).
- **Cosmo Gigglesworth** (Under Contract; Clementine Puddleby): last communication 10/31/2026 (11/10/2026 minus 10/31/2026 = 10 days).

Bartholomew Lumpkin (Active Listing, last communication 11/03/2026, 7 days) is not on this list: 7 days is not more than 7.

### 4. Stages With No Movement Since Last Week (2)

- **Met with Customer:** the same 3 people as last week, and no one entered or left: Tilda Fizzlebottom, Rufus Puddingstone, Posy Bumbershoot (all three are also above).
- **Submitting Offers:** the same 2 people as last week, and no one entered or left: Ambrose Sprocketton, Esmeralda Inkwhistle.

## Conversion by Lead Source

People with a Date Added from 08/12/2026 through 11/10/2026: 39. Each rate is by the stage each person is in now.

| Lead source | Added | Spoke or further | Appointment or further | Under contract or closed | Now in Nurture, Rejected or Trash |
|---|---|---|---|---|---|
| Zillow | 11 | 4 / 11 = 36.4% | 4 / 11 = 36.4% | 1 / 11 = 9.1% | 1 |
| Realtor.com | 8 | 4 / 8 = 50.0% | 3 / 8 = 37.5% | 1 / 8 = 12.5% | 0 |
| Website | 8 | 5 / 8 = 62.5% | 3 / 8 = 37.5% | 0 / 8 = 0.0% | 0 |
| Facebook | 6 | 1 / 6 = 16.7% | 0 / 6 = 0.0% | 0 / 6 = 0.0% | 4 |
| Open House | 2 | 2 / 2 = 100.0% | 2 / 2 = 100.0% | 0 / 2 = 0.0% | 0 |
| Referral | 2 | 2 / 2 = 100.0% | 2 / 2 = 100.0% | 0 / 2 = 0.0% | 0 |
| Sphere | 2 | 2 / 2 = 100.0% | 2 / 2 = 100.0% | 0 / 2 = 0.0% | 0 |
| All | 39 | 20 / 39 = 51.3% | 16 / 39 = 41.0% | 2 / 39 = 5.1% | 5 |

Open House, Referral and Sphere each had fewer than 5 people added in the period: too few to compare.

## Conversion by Agent

| Agent | Added | Spoke or further | Appointment or further | Under contract or closed | Now in Nurture, Rejected or Trash |
|---|---|---|---|---|---|
| Otis Marmaduke | 9 | 6 / 9 = 66.7% | 4 / 9 = 44.4% | 0 / 9 = 0.0% | 1 |
| Barnaby Crumpet | 8 | 3 / 8 = 37.5% | 3 / 8 = 37.5% | 0 / 8 = 0.0% | 1 |
| Hazel Tinkersnap | 8 | 4 / 8 = 50.0% | 3 / 8 = 37.5% | 1 / 8 = 12.5% | 2 |
| Clementine Puddleby | 7 | 4 / 7 = 57.1% | 4 / 7 = 57.1% | 1 / 7 = 14.3% | 0 |
| Juniper Fogwhistle | 7 | 3 / 7 = 42.9% | 2 / 7 = 28.6% | 0 / 7 = 0.0% | 1 |
| All | 39 | 20 / 39 = 51.3% | 16 / 39 = 41.0% | 2 / 39 = 5.1% | 5 |

These rates go by current stage, so anyone who reached an appointment and later went to Nurture, Rejected or Trash counts only in the last column: the rates are a floor. Rows are in order of people added, not a ranking. For closed-deal conversion and lead source return, Follow Up Boss's Lead Source report and Sisu stay the source of record; this is a snapshot for the meeting.

## By Agent

Counts from this week's export. Active means spoke, appointment, active client or under contract.

| Agent | Records | Active (spoke through under contract) | Active, more than 7 days | Active, none logged | Open deals | List 1 | List 2 | List 3 | List 4 (people) |
|---|---|---|---|---|---|---|---|---|---|
| Barnaby Crumpet | 12 | 5 | 2 | 0 | 1 | 1 | 1 | 1 | 1 |
| Clementine Puddleby | 9 | 5 | 1 | 0 | 2 | 0 | 0 | 2 | 1 |
| Hazel Tinkersnap | 11 | 5 | 0 | 1 | 1 | 0 | 1 | 1 | 2 |
| Juniper Fogwhistle | 11 | 4 | 2 | 1 | 2 | 0 | 1 | 2 | 1 |
| Otis Marmaduke | 11 | 7 | 2 | 0 | 2 | 1 | 0 | 1 | 0 |

The stage-by-stage counts per agent are in pipeline_review.md.

## Questions for Each Agent

For the pipeline meeting. Each is about one record's next step.

**Barnaby Crumpet**
1. Petunia Quillby, 418 Gumdrop Way (Under Contract, expected close 11/06/2026, 4 days past): what is the new expected close date, and what is it waiting on?
2. Tilda Fizzlebottom (Met with Customer, last communication 10/27/2026, 14 days ago, no next step in the export): what is the next step, and when?
3. Wendell Crumbleton (Showing Homes, last communication 10/24/2026, 17 days ago; the lead's own Last Activity is 11/08/2026, after the last communication): what is the plan for this week?

**Clementine Puddleby**
1. Bertram Puddlejump (Nurture, tagged Hot, last communication 10/10/2026, 31 days ago; the lead's own Last Activity is 11/02/2026, after the last communication): what is the plan for this week?
2. Cosmo Gigglesworth (Under Contract, last communication 10/31/2026, 10 days ago): what is the plan for this week?
3. Ambrose Sprocketton (Submitting Offers in both weeks' exports; no one entered or left Submitting Offers this week): what is the next step, and when?

**Hazel Tinkersnap**
1. Rufus Puddingstone (Met with Customer, no communication logged, no next step in the export): what is the next step, and when?
2. Henrietta Hobnob (Attempted Contact, tagged Hot, last communication 10/20/2026, 21 days ago; the lead's own Last Activity is 11/09/2026, after the last communication): what is the plan for this week?
3. Esmeralda Inkwhistle (Submitting Offers in both weeks' exports; no one entered or left Submitting Offers this week): what is the next step, and when?

**Juniper Fogwhistle**
1. Pemberton Quibblesworth (Appointment Set, last communication 10/21/2026, 20 days ago, no next step in the export): what is the next step, and when?
2. Lysander Jellybean (Spoke with Customer, no communication logged; the lead's own Last Activity is 10/02/2026): what is the plan for this week?
3. Posy Bumbershoot (Met with Customer, last communication 10/29/2026, 12 days ago): what is the plan for this week?

**Otis Marmaduke**
1. Ferdinand Rattlecap, 77 Marzipan Ct (Pending, expected close 10/30/2026, 11 days past): what is the new expected close date, and what is it waiting on?
2. Delphine Fluffernutter (Spoke with Customer, last communication 10/30/2026, 11 days ago): what is the plan for this week?

## Odd Rows (Flagged, Not Fixed)

| File | Row | Name | What's odd | How it was treated |
|---|---|---|---|---|
| PRACTICE FUB People Export 2026-11-10.csv | 37 | Leopold Whiffletree | Last Activity 11/14/2026 is after the as-of date 11/10/2026 | Not used; check the record |
| PRACTICE FUB People Export 2026-11-10.csv | 38 | Millicent Twiddlesworth | No stage in the row | Counted under (no stage); left out of the decision list |
| PRACTICE FUB Deals Report 2026-11-10.csv | 5 | Ottoline Velveteen, 9 Toffee Ln | Stage Closed with no close date | Left as is; not counted anywhere a close date is needed |

Fixes happen in Follow Up Boss, by a person: Leopold's and Millicent's profiles, and the close date on Ottoline's deal card.

## Set Up in Follow Up Boss (Instructions Only)

Nothing here has been set up. If you want list 3 in Follow Up Boss itself, the owner or an admin can build it:
1. People > All People > Filters.
2. Stage includes Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers and Under Contract.
3. Last Communication was more than 7 days ago.
4. + New List, name it "Active, Nothing Logged 7+ Days," share it with the agents, Save List. A second list with Last Communication is empty catches people with none logged.

Follow Up Boss's default Met/Appt Set list already covers Appointment Set and Met with Customer at 6 days, so check it before building a new one.

## Check Before Sending

- **As-of date:** 11/10/2026, from your message ("downloaded November 10, 2026") and the file names. Stale: more than 7 days (default). Conversion period: 08/12/2026 through 11/10/2026 (default).
- **Files:** this week = PRACTICE FUB People Export 2026-11-10.csv; last week = PRACTICE FUB People Export 2026-11-03 Last Week.csv; 51 matched by email.
- **Deal stages read by name:** Buyer Agreement, Listed, Pending and Under Contract as open; Closed as closed; Fell Through as fell through. If Listed or Buyer Agreement means something else on your team, tell me and I'll rerun.
- **List 1:** Ferdinand Rattlecap, 77 Marzipan Ct: Close Date 10/30/2026, Entered Stage 09/22/2026, Price 538000 (Deals export, row 4). Petunia Quillby, 418 Gumdrop Way: Close Date 11/06/2026, Entered Stage 09/28/2026, Price 412500 (Deals export, row 3).
- **Lists 2 and 3:** each Last Communication date above is from the Last Communication column of this week's export; each Last Activity from its Last Activity column; Hot from the Tags column (Bertram Puddlejump, Henrietta Hobnob).
- **List 4:** from comparing the Stage column in both People exports.
- **Rates:** every rate above shows its numerator and denominator; they count people by current stage.
- **Open deals with no close date:** Percival Scrumpkin, 14 Licorice Loop; Bartholomew Lumpkin, 880 Gumdrop Way; Posy Bumbershoot.
- **Odd rows, unfixed:** Leopold Whiffletree (Last Activity 11/14/2026), Millicent Twiddlesworth (no stage), Ottoline Velveteen, 9 Toffee Ln (closed, no close date).
- **Privacy:** no email address, phone number or note text appears in this review. The attached pipeline_review.md holds lead names: share it only with the people in the meeting.
