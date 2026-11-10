# Pipeline Review Data: As of 11/10/2026

Made by the review code. Every count, date and rate below comes from the files named here. No email address or phone number is shown anywhere.

## Files Read

- **this week's People export:** PRACTICE FUB People Export 2026-11-10.csv, 54 rows (header on row 2).
  Columns used: name = Name; first = First Name; last = Last Name; stage = Stage; source = Lead Source; agent = Assigned To; created = Date Added; last_comm = Last Communication; last_activity = Last Activity; tags = Tags; deal_stage = Deal Stage; deal_close = Deal Close Date; deal_price = Deal Price; emails (matching only, never shown) = Email 1; phones (matching only, never shown) = Phone 1.
- **last week's People export:** PRACTICE FUB People Export 2026-11-03 Last Week.csv, 52 rows (header on row 2).
  Columns used: name = Name; first = First Name; last = Last Name; stage = Stage; source = Lead Source; agent = Assigned To; created = Date Added; last_comm = Last Communication; last_activity = Last Activity; tags = Tags; deal_stage = Deal Stage; deal_close = Deal Close Date; deal_price = Deal Price; emails (matching only, never shown) = Email 1; phones (matching only, never shown) = Phone 1.
- **Deals export:** PRACTICE FUB Deals Report 2026-11-10.csv, 13 rows (header on row 2).
  Columns used: name = Name; stage = Stage; status = Status; entered = Entered Stage; close = Close Date; price = Price; agents = Team.

## Settings

- As of: 11/10/2026.
- Nothing logged in more than 7 days counts as stale (default 7 unless set).
- Conversion period: people with a Date Added from 08/12/2026 through 11/10/2026 (the default: the 90 days ending on the as-of date).
- Hot means a tag matching: Hot.

## Flags

- 3 odd row(s), listed under Odd Rows. None was fixed.

## Stage Reading

| Stage | Records | Read as | How read |
|---|---|---|---|
| Lead | 6 | New lead | Follow Up Boss default stage |
| Attempted Contact | 7 | Attempted | Follow Up Boss default stage |
| Spoke with Customer | 5 | Spoke | Follow Up Boss default stage |
| Appointment Set | 3 | Appointment | Follow Up Boss default stage |
| Met with Customer | 3 | Appointment | Follow Up Boss default stage |
| Showing Homes | 3 | Active client | Follow Up Boss default stage |
| Listing Agreement | 2 | Active client | Follow Up Boss default stage |
| Active Listing | 3 | Active client | Follow Up Boss default stage |
| Submitting Offers | 2 | Active client | Follow Up Boss default stage |
| Under Contract | 5 | Under contract | Follow Up Boss default stage |
| Closed | 4 | Closed | Follow Up Boss default stage |
| Nurture | 7 | Nurture | Follow Up Boss default stage |
| Rejected | 1 | Out (rejected, trash) | Follow Up Boss default stage |
| Trash | 2 | Out (rejected, trash) | Follow Up Boss default stage |
| (no stage) | 1 | No stage | no stage in the row |

## Pipeline by Stage

54 records; 39 in pipeline stages (new lead through under contract), 26 of them active (spoke, appointment, active client, under contract).

| Stage | Read as | Now | Last week | Last communication within 7 days | More than 7 days | None logged | Oldest last communication |
|---|---|---|---|---|---|---|---|
| Lead | New lead | 6 | 8 | 1 | 1 | 4 | Peregrine Zigzagger: 10/31/2026, 11/10/2026 minus 10/31/2026 = 10 days |
| Attempted Contact | Attempted | 7 | 5 | 3 | 4 | 0 | Theodora Wigglesby: 10/02/2026, 11/10/2026 minus 10/02/2026 = 39 days |
| Spoke with Customer | Spoke | 5 | 6 | 3 | 1 | 1 | Delphine Fluffernutter: 10/30/2026, 11/10/2026 minus 10/30/2026 = 11 days |
| Appointment Set | Appointment | 3 | 2 | 2 | 1 | 0 | Pemberton Quibblesworth: 10/21/2026, 11/10/2026 minus 10/21/2026 = 20 days |
| Met with Customer | Appointment | 3 | 3 | 0 | 2 | 1 | Tilda Fizzlebottom: 10/27/2026, 11/10/2026 minus 10/27/2026 = 14 days |
| Showing Homes | Active client | 3 | 4 | 2 | 1 | 0 | Wendell Crumbleton: 10/24/2026, 11/10/2026 minus 10/24/2026 = 17 days |
| Listing Agreement | Active client | 2 | 3 | 2 | 0 | 0 | Horatio Butterwick: 11/04/2026, 11/10/2026 minus 11/04/2026 = 6 days |
| Active Listing | Active client | 3 | 2 | 3 | 0 | 0 | Bartholomew Lumpkin: 11/03/2026, 11/10/2026 minus 11/03/2026 = 7 days |
| Submitting Offers | Active client | 2 | 2 | 2 | 0 | 0 | Ambrose Sprocketton: 11/05/2026, 11/10/2026 minus 11/05/2026 = 5 days |
| Under Contract | Under contract | 5 | 5 | 3 | 2 | 0 | Cosmo Gigglesworth: 10/31/2026, 11/10/2026 minus 10/31/2026 = 10 days |
| Closed | Closed | 4 | 3 | 1 | 3 | 0 | Calliope Whistlebrook: 09/15/2026, 11/10/2026 minus 09/15/2026 = 56 days |
| Nurture | Nurture | 7 | 6 | 0 | 7 | 0 | Zinnia Tufflewick: 06/18/2026, 11/10/2026 minus 06/18/2026 = 145 days |
| Rejected | Out (rejected, trash) | 1 | 1 | 0 | 1 | 0 | Desmond Fernsnap: 09/20/2026, 11/10/2026 minus 09/20/2026 = 51 days |
| Trash | Out (rejected, trash) | 2 | 1 | 0 | 1 | 1 | Fitzgerald Lollygag: 10/15/2026, 11/10/2026 minus 10/15/2026 = 26 days |
| (no stage) | No stage | 1 | 1 | 0 | 0 | 1 |  |

## Deals by Stage

| Stage | Read as | How read | Deals | Longest in stage (open deals) | Past expected close date | No close date |
|---|---|---|---|---|---|---|
| Buyer Agreement | open | no closed or fell-through word: read as open | 1 | Posy Bumbershoot: entered 10/22/2026, 11/10/2026 minus 10/22/2026 = 19 days | 0 | 1 |
| Listed | open | no closed or fell-through word: read as open | 2 | Bartholomew Lumpkin, 880 Gumdrop Way: entered 10/01/2026, 11/10/2026 minus 10/01/2026 = 40 days | 0 | 2 |
| Pending | open | no closed or fell-through word: read as open | 1 | Ferdinand Rattlecap, 77 Marzipan Ct: entered 09/22/2026, 11/10/2026 minus 09/22/2026 = 49 days | 1 | 0 |
| Under Contract | open | no closed or fell-through word: read as open | 4 | Petunia Quillby, 418 Gumdrop Way: entered 09/28/2026, 11/10/2026 minus 09/28/2026 = 43 days | 1 | 0 |
| Closed | closed | a closed word in the name | 3 |  | 0 | 0 |
| Fell Through | lost | a fell-through word in the name | 1 |  | 0 | 0 |

The Deals export has no Pipeline column, so buyer and seller deals are counted together.

1 archived deal(s) left out of every check.

Open deals with no close date (list 1 can't check them): Percival Scrumpkin, 14 Licorice Loop; Bartholomew Lumpkin, 880 Gumdrop Way; Posy Bumbershoot.

## What Moved Since Last Week

Compared with PRACTICE FUB People Export 2026-11-03 Last Week.csv: 51 people matched (51 by email).

### Stage Changes (9)

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

### New in This Week's Export (3)

| Person | Agent | Stage | Date Added |
|---|---|---|---|
| Humphrey Nimblefoot | Juniper Fogwhistle | Lead | 11/04/2026 |
| Imogen Oddsbody | Barnaby Crumpet | Lead | 11/06/2026 |
| Jasper Pumpernickel | Clementine Puddleby | Attempted Contact | 11/08/2026 |

### In Last Week's Export, Not in This Week's (1)

Deleted, merged, moved out of view or outside the export's filter: the export doesn't say which.

| Person | Agent last week | Stage last week |
|---|---|---|
| Kipling Rumbleford | Otis Marmaduke | Lead |

### Stage Counts, Last Week and This Week

| Stage | Last week | This week | Entered | Left |
|---|---|---|---|---|
| Lead | 8 | 6 | 2 | 4 |
| Attempted Contact | 5 | 7 | 3 | 1 |
| Spoke with Customer | 6 | 5 | 1 | 2 |
| Appointment Set | 2 | 3 | 1 | 0 |
| Met with Customer | 3 | 3 | 0 | 0 |
| Showing Homes | 4 | 3 | 0 | 1 |
| Listing Agreement | 3 | 2 | 0 | 1 |
| Active Listing | 2 | 3 | 1 | 0 |
| Submitting Offers | 2 | 2 | 0 | 0 |
| Under Contract | 5 | 5 | 1 | 1 |
| Closed | 3 | 4 | 1 | 0 |
| Nurture | 6 | 7 | 1 | 0 |
| Rejected | 1 | 1 | 0 | 0 |
| Trash | 1 | 2 | 1 | 0 |
| (no stage) | 1 | 1 | 0 | 0 |

## Needs a Decision This Week

List 1: 2 deals. List 2: 3 people. List 3: 7 people. List 4: 2 stages.

### 1. Deals Past Their Expected Close Date (2)

- **Ferdinand Rattlecap, 77 Marzipan Ct** (row 4; Pending; agent Otis Marmaduke): expected close 10/30/2026, 11 days past: 11/10/2026 minus 10/30/2026 = 11 days. In this stage since 09/22/2026: 11/10/2026 minus 09/22/2026 = 49 days. Price as exported: 538000. Person: Ferdinand Rattlecap, Under Contract, last communication 11/02/2026: 11/10/2026 minus 11/02/2026 = 8 days.
- **Petunia Quillby, 418 Gumdrop Way** (row 3; Under Contract; agent Barnaby Crumpet): expected close 11/06/2026, 4 days past: 11/10/2026 minus 11/06/2026 = 4 days. In this stage since 09/28/2026: 11/10/2026 minus 09/28/2026 = 43 days. Price as exported: 412500. Person: Petunia Quillby, Under Contract, last communication 11/07/2026: 11/10/2026 minus 11/07/2026 = 3 days.

### 2. Appointment Set, No Next Step in the Export (3)

- **Rufus Puddingstone** (Met with Customer; agent Hazel Tinkersnap): no communication logged; no open deal in the export; same stage as last week's export.
- **Pemberton Quibblesworth** (Appointment Set; agent Juniper Fogwhistle): last communication 10/21/2026: 11/10/2026 minus 10/21/2026 = 20 days; no open deal in the export; same stage as last week's export.
- **Tilda Fizzlebottom** (Met with Customer; agent Barnaby Crumpet): last communication 10/27/2026: 11/10/2026 minus 10/27/2026 = 14 days; no open deal in the export; same stage as last week's export.

### 3. Hot or Active, Nothing Logged in More Than 7 Days (7)

- **Lysander Jellybean** (Spoke with Customer; agent Juniper Fogwhistle): no communication logged; the lead's own Last Activity is 10/02/2026.
- **Bertram Puddlejump** (Nurture, tagged Hot; agent Clementine Puddleby): last communication 10/10/2026: 11/10/2026 minus 10/10/2026 = 31 days; the lead's own Last Activity is 11/02/2026, after the last communication.
- **Henrietta Hobnob** (Attempted Contact, tagged Hot; agent Hazel Tinkersnap): last communication 10/20/2026: 11/10/2026 minus 10/20/2026 = 21 days; the lead's own Last Activity is 11/09/2026, after the last communication.
- **Wendell Crumbleton** (Showing Homes; agent Barnaby Crumpet): last communication 10/24/2026: 11/10/2026 minus 10/24/2026 = 17 days; the lead's own Last Activity is 11/08/2026, after the last communication.
- **Posy Bumbershoot** (Met with Customer; agent Juniper Fogwhistle): last communication 10/29/2026: 11/10/2026 minus 10/29/2026 = 12 days.
- **Delphine Fluffernutter** (Spoke with Customer; agent Otis Marmaduke): last communication 10/30/2026: 11/10/2026 minus 10/30/2026 = 11 days.
- **Cosmo Gigglesworth** (Under Contract; agent Clementine Puddleby): last communication 10/31/2026: 11/10/2026 minus 10/31/2026 = 10 days.

### 4. Stages With No Movement Since Last Week (2)

- **Met with Customer:** 3 people, the same as last week, no one entered or left: Tilda Fizzlebottom, Rufus Puddingstone, Posy Bumbershoot (also above: Tilda Fizzlebottom, Rufus Puddingstone, Posy Bumbershoot).
- **Submitting Offers:** 2 people, the same as last week, no one entered or left: Ambrose Sprocketton, Esmeralda Inkwhistle.

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

Fewer than 5 people added in the period, too few to compare: Open House, Referral, Sphere.

## Conversion by Agent

| Agent | Added | Spoke or further | Appointment or further | Under contract or closed | Now in Nurture, Rejected or Trash |
|---|---|---|---|---|---|
| Otis Marmaduke | 9 | 6 / 9 = 66.7% | 4 / 9 = 44.4% | 0 / 9 = 0.0% | 1 |
| Barnaby Crumpet | 8 | 3 / 8 = 37.5% | 3 / 8 = 37.5% | 0 / 8 = 0.0% | 1 |
| Hazel Tinkersnap | 8 | 4 / 8 = 50.0% | 3 / 8 = 37.5% | 1 / 8 = 12.5% | 2 |
| Clementine Puddleby | 7 | 4 / 7 = 57.1% | 4 / 7 = 57.1% | 1 / 7 = 14.3% | 0 |
| Juniper Fogwhistle | 7 | 3 / 7 = 42.9% | 2 / 7 = 28.6% | 0 / 7 = 0.0% | 1 |
| All | 39 | 20 / 39 = 51.3% | 16 / 39 = 41.0% | 2 / 39 = 5.1% | 5 |

## By Agent (Whole Export)

| Agent | Records | New lead | Attempted | Spoke | Appointment | Active client | Under contract | Active (spoke through under contract) | Active, more than 7 days | Active, none logged | Open deals | List 1 | List 2 | List 3 | List 4 (people) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Barnaby Crumpet | 12 | 1 | 2 | 0 | 1 | 3 | 1 | 5 | 2 | 0 | 1 | 1 | 1 | 1 | 1 |
| Clementine Puddleby | 9 | 1 | 2 | 0 | 1 | 3 | 1 | 5 | 1 | 0 | 2 | 0 | 0 | 2 | 1 |
| Hazel Tinkersnap | 11 | 1 | 1 | 2 | 1 | 1 | 1 | 5 | 0 | 1 | 1 | 0 | 1 | 1 | 2 |
| Juniper Fogwhistle | 11 | 2 | 1 | 1 | 2 | 0 | 1 | 4 | 2 | 1 | 2 | 0 | 1 | 2 | 1 |
| Otis Marmaduke | 11 | 1 | 1 | 2 | 1 | 3 | 1 | 7 | 2 | 0 | 2 | 1 | 0 | 1 | 0 |

## Questions for Each Agent

### Barnaby Crumpet

1. Petunia Quillby, 418 Gumdrop Way (Under Contract, expected close 11/06/2026, 4 days past): what is the new expected close date, and what is it waiting on?
2. Tilda Fizzlebottom (Met with Customer, last communication 10/27/2026, 14 days ago, no next step in the export): what is the next step, and when?
3. Wendell Crumbleton (Showing Homes, last communication 10/24/2026, 17 days ago; the lead's own Last Activity is 11/08/2026, after the last communication): what is the plan for this week?

### Clementine Puddleby

1. Bertram Puddlejump (Nurture, tagged Hot, last communication 10/10/2026, 31 days ago; the lead's own Last Activity is 11/02/2026, after the last communication): what is the plan for this week?
2. Cosmo Gigglesworth (Under Contract, last communication 10/31/2026, 10 days ago): what is the plan for this week?
3. Ambrose Sprocketton (Submitting Offers in both weeks' exports; no one entered or left Submitting Offers this week): what is the next step, and when?

### Hazel Tinkersnap

1. Rufus Puddingstone (Met with Customer, no communication logged, no next step in the export): what is the next step, and when?
2. Henrietta Hobnob (Attempted Contact, tagged Hot, last communication 10/20/2026, 21 days ago; the lead's own Last Activity is 11/09/2026, after the last communication): what is the plan for this week?
3. Esmeralda Inkwhistle (Submitting Offers in both weeks' exports; no one entered or left Submitting Offers this week): what is the next step, and when?

### Juniper Fogwhistle

1. Pemberton Quibblesworth (Appointment Set, last communication 10/21/2026, 20 days ago, no next step in the export): what is the next step, and when?
2. Lysander Jellybean (Spoke with Customer, no communication logged; the lead's own Last Activity is 10/02/2026): what is the plan for this week?
3. Posy Bumbershoot (Met with Customer, last communication 10/29/2026, 12 days ago): what is the plan for this week?

### Otis Marmaduke

1. Ferdinand Rattlecap, 77 Marzipan Ct (Pending, expected close 10/30/2026, 11 days past): what is the new expected close date, and what is it waiting on?
2. Delphine Fluffernutter (Spoke with Customer, last communication 10/30/2026, 11 days ago): what is the plan for this week?

## Odd Rows (Flagged, Not Fixed)

| File | Row | Name | What's odd | How it was treated |
|---|---|---|---|---|
| PRACTICE FUB People Export 2026-11-10.csv | 37 | Leopold Whiffletree | Last Activity 11/14/2026 is after the as-of date 11/10/2026 | not used for aging or the decision list; check the record |
| PRACTICE FUB People Export 2026-11-10.csv | 38 | Millicent Twiddlesworth | no stage in the row | counted under (no stage); left out of the decision list |
| PRACTICE FUB Deals Report 2026-11-10.csv | 5 | Ottoline Velveteen, 9 Toffee Ln | stage Closed (read as closed) with no close date | left as is; not counted anywhere a close date is needed |

