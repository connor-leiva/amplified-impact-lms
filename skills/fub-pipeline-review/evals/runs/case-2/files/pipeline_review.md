# Pipeline Review Data: As of 11/10/2026

Made by the review code. Every count, date and rate below comes from the files named here. No email address or phone number is shown anywhere.

## Files Read

- **this week's People export:** kettlecorn-fub-people-export-2026-11-10.csv, 44 rows (header on row 2).
  Columns used: name = Name; first = First Name; last = Last Name; stage = Stage; source = Lead Source; agent = Assigned To; created = Date Added; last_comm = Last Communication; last_activity = Last Activity; tags = Tags; deal_stage = Deal Stage; deal_close = Deal Close Date; deal_price = Deal Price; emails (matching only, never shown) = Email 1; phones (matching only, never shown) = Phone 1.

## Settings

- As of: 11/10/2026.
- Nothing logged in more than 7 days counts as stale (default 7 unless set).
- Conversion period: people with a Date Added from 08/01/2026 through 11/10/2026 (as given).
- Hot means a tag matching: Hot.

## Flags

- No Deals export: list 1 used the People export's Deal Stage, Deal Close Date and Deal Price columns, which hold one deal per person.
- Last week's People export was not attached: what moved, and list 4 (stages with no movement), were not run. Nothing in this review says anything moved.
- 5 odd row(s), listed under Odd Rows. None was fixed.

## Stage Reading

| Stage | Records | Read as | How read |
|---|---|---|---|
| Lead | 7 | New lead | Follow Up Boss default stage |
| Attempted Contact | 6 | Attempted | Follow Up Boss default stage |
| Spoke with Customer | 4 | Spoke | Follow Up Boss default stage |
| Appointment Set | 3 | Appointment | Follow Up Boss default stage |
| Met with Customer | 3 | Appointment | Follow Up Boss default stage |
| Showing Homes | 3 | Active client | Follow Up Boss default stage |
| Listing Agreement | 1 | Active client | Follow Up Boss default stage |
| Active Listing | 1 | Active client | Follow Up Boss default stage |
| Submitting Offers | 1 | Active client | Follow Up Boss default stage |
| Under Contract | 1 | Under contract | Follow Up Boss default stage |
| Closed | 1 | Closed | Follow Up Boss default stage |
| Nurture | 5 | Nurture | Follow Up Boss default stage |
| Rejected | 1 | Out (rejected, trash) | Follow Up Boss default stage |
| Trash | 1 | Out (rejected, trash) | Follow Up Boss default stage |
| Pending | 3 | Under contract | common custom stage: confirm |
| Past Client | 3 | Closed | common custom stage: confirm |

## Pipeline by Stage

44 records; 33 in pipeline stages (new lead through under contract), 20 of them active (spoke, appointment, active client, under contract).

| Stage | Read as | Now | Last communication within 7 days | More than 7 days | None logged | Date can't be used | Oldest last communication |
|---|---|---|---|---|---|---|---|
| Lead | New lead | 7 | 1 | 2 | 4 | 0 | Zara Puddlecrumb: 10/27/2026, 11/10/2026 minus 10/27/2026 = 14 days |
| Attempted Contact | Attempted | 6 | 0 | 6 | 0 | 0 | Fergus Gumbleton: 10/05/2026, 11/10/2026 minus 10/05/2026 = 36 days |
| Spoke with Customer | Spoke | 4 | 2 | 1 | 0 | 1 | Prudence Fiddlewhip: 10/29/2026, 11/10/2026 minus 10/29/2026 = 12 days |
| Appointment Set | Appointment | 3 | 2 | 1 | 0 | 0 | Mortimer Quibbleton: 10/22/2026, 11/10/2026 minus 10/22/2026 = 19 days |
| Met with Customer | Appointment | 3 | 1 | 1 | 1 | 0 | Silas Thimblewood: 10/30/2026, 11/10/2026 minus 10/30/2026 = 11 days |
| Showing Homes | Active client | 3 | 1 | 1 | 0 | 1 | Oswin Tumbledown: 10/25/2026, 11/10/2026 minus 10/25/2026 = 16 days |
| Listing Agreement | Active client | 1 | 1 | 0 | 0 | 0 | Ulric Bramblepatch: 11/04/2026, 11/10/2026 minus 11/04/2026 = 6 days |
| Active Listing | Active client | 1 | 1 | 0 | 0 | 0 | Verity Gooseberry: 11/09/2026, 11/10/2026 minus 11/09/2026 = 1 day |
| Submitting Offers | Active client | 1 | 1 | 0 | 0 | 0 | Wallace Crumpetsby: 11/06/2026, 11/10/2026 minus 11/06/2026 = 4 days |
| Under Contract | Under contract | 1 | 1 | 0 | 0 | 0 | Yvette Plumpudding: 11/08/2026, 11/10/2026 minus 11/08/2026 = 2 days |
| Closed | Closed | 1 | 0 | 1 | 0 | 0 | Nathaniel Pebbleshoe: 09/02/2026, 11/10/2026 minus 09/02/2026 = 69 days |
| Nurture | Nurture | 5 | 0 | 5 | 0 | 0 | Horace Mumbleton: 08/30/2026, 11/10/2026 minus 08/30/2026 = 72 days |
| Rejected | Out (rejected, trash) | 1 | 0 | 1 | 0 | 0 | Lionel Crumbsworth: 09/10/2026, 11/10/2026 minus 09/10/2026 = 61 days |
| Trash | Out (rejected, trash) | 1 | 0 | 0 | 1 | 0 |  |
| Pending | Under contract | 3 | 2 | 1 | 0 | 0 | Rowena Puddlefoot: 11/01/2026, 11/10/2026 minus 11/01/2026 = 9 days |
| Past Client | Closed | 3 | 0 | 3 | 0 | 0 | Odette Fizzlethorpe: 07/15/2026, 11/10/2026 minus 07/15/2026 = 118 days |

Open deals with no close date (list 1 can't check them): Silas Thimblewood's deal; Verity Gooseberry's deal.

## What Moved Since Last Week

Not run: last week's People export was not attached.

## Needs a Decision This Week

List 1: 1 deal. List 2: 2 people. List 3: 6 people. List 4: not run.

### 1. Deals Past Their Expected Close Date (1)

- **Lucinda Wafflebury's deal** (row 8; Under Contract; agent Rosalie Tinkwhistle): expected close 11/02/2026, 8 days past: 11/10/2026 minus 11/02/2026 = 8 days. Price as exported: 375000. Person: Lucinda Wafflebury, Pending, last communication 11/06/2026: 11/10/2026 minus 11/06/2026 = 4 days.

### 2. Appointment Set, No Next Step in the Export (2)

- **Nettie Crumblewood** (Met with Customer; agent Marisa Quenchley): no communication logged; no open deal in the export; movement check not run (no last week's export).
- **Mortimer Quibbleton** (Appointment Set; agent Fennimore Gaddlesby): last communication 10/22/2026: 11/10/2026 minus 10/22/2026 = 19 days; no open deal in the export; movement check not run (no last week's export).

### 3. Hot or Active, Nothing Logged in More Than 7 Days (6)

- **Theodosia Crankwhistle** (Nurture, tagged Hot; agent Fennimore Gaddlesby): last communication 10/05/2026: 11/10/2026 minus 10/05/2026 = 36 days; the lead's own Last Activity is 10/30/2026, after the last communication.
- **Quincy Marbleton** (Attempted Contact, tagged Hot; agent Rosalie Tinkwhistle): last communication 10/14/2026: 11/10/2026 minus 10/14/2026 = 27 days; the lead's own Last Activity is 11/07/2026, after the last communication.
- **Oswin Tumbledown** (Showing Homes; agent Augustin Pebbleworth): last communication 10/25/2026: 11/10/2026 minus 10/25/2026 = 16 days; the lead's own Last Activity is 11/09/2026, after the last communication.
- **Prudence Fiddlewhip** (Spoke with Customer; agent Fennimore Gaddlesby): last communication 10/29/2026: 11/10/2026 minus 10/29/2026 = 12 days.
- **Silas Thimblewood** (Met with Customer; agent Augustin Pebbleworth): last communication 10/30/2026: 11/10/2026 minus 10/30/2026 = 11 days.
- **Rowena Puddlefoot** (Pending; agent Marisa Quenchley): last communication 11/01/2026: 11/10/2026 minus 11/01/2026 = 9 days.

Left out of lists 2 and 3 because their Last Communication can't be used (after the as-of date or not a date; see Odd Rows): Ingrid Sockwhistle, Kestrel Bumbleford.

### 4. Stages With No Movement Since Last Week

Not run: last week's People export was not attached.

## Conversion by Lead Source

People with a Date Added from 08/01/2026 through 11/10/2026: 34. Each rate is by the stage each person is in now.

| Lead source | Added | Spoke or further | Appointment or further | Under contract or closed | Now in Nurture, Rejected or Trash |
|---|---|---|---|---|---|
| Zillow | 12 | 5 / 12 = 41.7% | 5 / 12 = 41.7% | 0 / 12 = 0.0% | 2 |
| Website | 7 | 3 / 7 = 42.9% | 2 / 7 = 28.6% | 0 / 7 = 0.0% | 1 |
| Realtor.com | 6 | 3 / 6 = 50.0% | 2 / 6 = 33.3% | 1 / 6 = 16.7% | 1 |
| Open House | 5 | 4 / 5 = 80.0% | 3 / 5 = 60.0% | 1 / 5 = 20.0% | 0 |
| (no source) | 2 | 0 / 2 = 0.0% | 0 / 2 = 0.0% | 0 / 2 = 0.0% | 1 |
| Sphere | 2 | 2 / 2 = 100.0% | 1 / 2 = 50.0% | 0 / 2 = 0.0% | 0 |
| All | 34 | 17 / 34 = 50.0% | 13 / 34 = 38.2% | 2 / 34 = 5.9% | 5 |

Fewer than 5 people added in the period, too few to compare: (no source), Sphere.

## Conversion by Agent

| Agent | Added | Spoke or further | Appointment or further | Under contract or closed | Now in Nurture, Rejected or Trash |
|---|---|---|---|---|---|
| Augustin Pebbleworth | 9 | 5 / 9 = 55.6% | 4 / 9 = 44.4% | 0 / 9 = 0.0% | 1 |
| Marisa Quenchley | 9 | 4 / 9 = 44.4% | 4 / 9 = 44.4% | 1 / 9 = 11.1% | 2 |
| Fennimore Gaddlesby | 8 | 5 / 8 = 62.5% | 3 / 8 = 37.5% | 1 / 8 = 12.5% | 1 |
| Rosalie Tinkwhistle | 8 | 3 / 8 = 37.5% | 2 / 8 = 25.0% | 0 / 8 = 0.0% | 1 |
| All | 34 | 17 / 34 = 50.0% | 13 / 34 = 38.2% | 2 / 34 = 5.9% | 5 |

1 record(s) with no usable Date Added (empty, not a date, or after the as-of date) are left out of conversion.

## By Agent (Whole Export)

| Agent | Records | New lead | Attempted | Spoke | Appointment | Active client | Under contract | Active (spoke through under contract) | Active, more than 7 days | Active, none logged | Open deals | List 1 | List 2 | List 3 | List 4 (people) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Augustin Pebbleworth | 11 | 2 | 1 | 1 | 2 | 2 | 0 | 5 | 2 | 0 | 1 | 0 | 0 | 2 | 0 |
| Fennimore Gaddlesby | 11 | 1 | 1 | 2 | 2 | 0 | 1 | 5 | 2 | 0 | 1 | 0 | 1 | 2 | 0 |
| Marisa Quenchley | 11 | 2 | 1 | 0 | 1 | 3 | 2 | 6 | 1 | 1 | 3 | 0 | 1 | 1 | 0 |
| Rosalie Tinkwhistle | 11 | 2 | 3 | 1 | 1 | 1 | 1 | 4 | 0 | 0 | 1 | 1 | 0 | 1 | 0 |

## Questions for Each Agent

### Augustin Pebbleworth

1. Oswin Tumbledown (Showing Homes, last communication 10/25/2026, 16 days ago; the lead's own Last Activity is 11/09/2026, after the last communication): what is the plan for this week?
2. Silas Thimblewood (Met with Customer, last communication 10/30/2026, 11 days ago): what is the plan for this week?

### Fennimore Gaddlesby

1. Mortimer Quibbleton (Appointment Set, last communication 10/22/2026, 19 days ago, no next step in the export): what is the next step, and when?
2. Theodosia Crankwhistle (Nurture, tagged Hot, last communication 10/05/2026, 36 days ago; the lead's own Last Activity is 10/30/2026, after the last communication): what is the plan for this week?
3. Prudence Fiddlewhip (Spoke with Customer, last communication 10/29/2026, 12 days ago): what is the plan for this week?

### Marisa Quenchley

1. Nettie Crumblewood (Met with Customer, no communication logged, no next step in the export): what is the next step, and when?
2. Rowena Puddlefoot (Pending, last communication 11/01/2026, 9 days ago): what is the plan for this week?

### Rosalie Tinkwhistle

1. Lucinda Wafflebury's deal (Under Contract, expected close 11/02/2026, 8 days past): what is the new expected close date, and what is it waiting on?
2. Quincy Marbleton (Attempted Contact, tagged Hot, last communication 10/14/2026, 27 days ago; the lead's own Last Activity is 11/07/2026, after the last communication): what is the plan for this week?

## Odd Rows (Flagged, Not Fixed)

| File | Row | Name | What's odd | How it was treated |
|---|---|---|---|---|
| kettlecorn-fub-people-export-2026-11-10.csv | 3 | Gertrude Fizzlewick | Deal Stage Closed (read as closed) with no Deal Close Date | left as is; not counted anywhere a close date is needed |
| kettlecorn-fub-people-export-2026-11-10.csv | 4 | Horace Mumbleton | Last Activity 12/02/2026 is after the as-of date 11/10/2026 | not used for aging or the decision list; check the record |
| kettlecorn-fub-people-export-2026-11-10.csv | 5 | Ingrid Sockwhistle | Last Communication 11/19/2026 is after the as-of date 11/10/2026 | not used for aging or the decision list; check the record |
| kettlecorn-fub-people-export-2026-11-10.csv | 6 | Jethro Puffington | Date Added 11/12/2026 is after the as-of date 11/10/2026 | left out of conversion; check the record |
| kettlecorn-fub-people-export-2026-11-10.csv | 7 | Kestrel Bumbleford | Last Communication is not a date (31/10/2026) | not used for aging or the decision list; check the record |

