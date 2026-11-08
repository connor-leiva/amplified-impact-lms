# Database Health Check: Analysis Output

File: fub-people-export-no-consent.csv | Format: Follow Up Boss People export | Records: 800 | Header row: 2 | As of: 2026-11-08

Settings: active-stage stale after 90 days; past client and sphere after 365 days; new-lead stage after 60 days; never contacted if added 30+ days ago; quiet nurture after 180 days. Team rules used: none (defaults).

## Columns Used

| What | Column in the file |
|---|---|
| Name | Name |
| First name | First Name |
| Last name | Last Name |
| Stage | Stage |
| Source | Lead Source |
| Assigned agent | Assigned To |
| Date added | Date Added |
| Last communication | Last Communication |
| Is contacted | Is Contacted |
| Tags | Tags |
| Deal stage | Deal Stage |
| Deal close date | Deal Close Date |
| Timeframe | Timeframe |
| Email columns | Email 1, Email 2 |
| Phone columns | Phone 1, Phone 2 |


Last communication taken from: column 'Last Communication'


## Gaps In This Export

- No record ID column: the worklist identifies records by their row in this file, name and first email or phone.
- No text consent field (column or tag): text drafts are withheld.
- No lead-activity column: the Back On The Site segment could not run.
- Follow Up Boss exports pond leads with the pond's lead agent as the assignment and leaves out the pond name, so pond leads count under that agent unless the pond name was added as a tag before export.

## Contacts By Stage

| Stage | Read as | How | Contacts | % |
|---|---|---|---|---|
| Nurture | Nurture | default | 217 | 27.1% |
| Lead | New lead | default | 129 | 16.1% |
| Attempted Contact | Active lead | default | 87 | 10.9% |
| Sphere | Sphere | default | 73 | 9.1% |
| Trash | Inactive (trash, rejected, dead) | default | 49 | 6.1% |
| Spoke with Customer | Active lead | default | 41 | 5.1% |
| Closed | Past client | default | 41 | 5.1% |
| Past Client | Past client | default | 32 | 4.0% |
| Under Contract | Active client | default | 29 | 3.6% |
| Rejected | Inactive (trash, rejected, dead) | default | 27 | 3.4% |
| Showing Homes | Active client | default | 18 | 2.2% |
| Appointment Set | Active lead | default | 17 | 2.1% |
| Met with Customer | Active lead | default | 12 | 1.5% |
| Vendor | Other (vendor, agent, partner) | guess | 10 | 1.2% |
| Active Listing | Active client | default | 9 | 1.1% |
| Listing Agreement | Active client | default | 6 | 0.8% |
| Submitting Offers | Active client | default | 3 | 0.4% |


Stages to confirm with the team: guessed ['Vendor']; not recognized none

## Contacts By Source (Top 15)

| Source | Contacts | % |
|---|---|---|
| Zillow | 130 | 16.2% |
| Sphere | 102 | 12.8% |
| Website | 97 | 12.1% |
| Import | 95 | 11.9% |
| Referral | 88 | 11.0% |
| Facebook | 57 | 7.1% |
| Realtor.com | 53 | 6.6% |
| Open House | 50 | 6.2% |
| Past Client | 48 | 6.0% |
| Homes.com | 26 | 3.2% |
| Google PPC | 21 | 2.6% |
| (blank) | 20 | 2.5% |
| Sign Call | 13 | 1.6% |


All other sources: 0 contacts across 0 more source values.

## Contacts By Assigned Agent

| Agent | Contacts | % | Active stage | Active, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months | In merge groups |
|---|---|---|---|---|---|---|---|
| Clementine Rook | 246 | 30.8% | 102 | 42 | 26 | 18 | 11 |
| Ivo Saltmarsh | 230 | 28.8% | 104 | 50 | 34 | 14 | 13 |
| Pascal Wickerby | 179 | 22.4% | 75 | 24 | 27 | 13 | 11 |
| Delphine Ashgrove | 138 | 17.2% | 66 | 31 | 22 | 6 | 5 |
| (unassigned) | 7 | 0.9% | 4 | 1 | 0 | 0 | 0 |


## Contact Info

| Check | Contacts | % |
|---|---|---|
| No email | 60 | 7.5% |
| Email looks invalid or placeholder | 9 | 1.1% |
| Bounced-email tag | 9 | 1.1% |
| Unsubscribed from email (tag or column) | 27 | 3.4% |
| No phone | 81 | 10.1% |
| Phone not a valid 10-digit US number | 9 | 1.1% |
| Do Not Call (tag or column) | 11 | 1.4% |
| Opted out of texts (tag or column) | 0 | 0.0% |
| No valid email and no valid phone | 3 | 0.4% |


## Likely Duplicates

| Group type | Groups | Records |
|---|---|---|
| Same email or phone, same or near-identical name (merge candidates) | 20 | 40 |
| Same email or phone, different first name, same last name | 4 | 8 |
| Same email or phone, different names | 0 | 0 |
| Same or near-identical name only (review) | 3 | 6 |


Records that would go away if every merge group were merged: 20.

One email or phone on many records (not treated as duplicates): a phone on 7 records

## Active-Stage Contacts, No Communication In 90+ Days

148 of 351 active-stage contacts (42.2%): 80 gone quiet (communication on record, none in 90+ days) and 68 with no communication on record.

| Stage | Contacts |
|---|---|
| Lead | 88 |
| Attempted Contact | 25 |
| Spoke with Customer | 11 |
| Showing Homes | 8 |
| Under Contract | 6 |
| Appointment Set | 4 |
| Met with Customer | 3 |
| Active Listing | 1 |
| Listing Agreement | 1 |
| Submitting Offers | 1 |


| Agent | Contacts |
|---|---|
| Ivo Saltmarsh | 50 |
| Clementine Rook | 42 |
| Delphine Ashgrove | 31 |
| Pascal Wickerby | 24 |
| (unassigned) | 1 |


## Never Contacted, Added 30+ Days Ago

Basis: Is Contacted column. Contacts: 109.

| Agent | Contacts |
|---|---|
| Ivo Saltmarsh | 34 |
| Pascal Wickerby | 27 |
| Clementine Rook | 26 |
| Delphine Ashgrove | 22 |


| Source | Contacts |
|---|---|
| Referral | 21 |
| Zillow | 15 |
| Website | 14 |
| Sphere | 13 |
| Realtor.com | 11 |
| Import | 9 |
| Open House | 6 |
| Homes.com | 5 |


## Past Clients And Sphere

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients | 73 | 19 | 3 |
| Sphere | 73 | 32 | 10 |


Past clients found by: stage 73; tag only 0; closed-transaction file only 0. Past client stages: Closed, Past Client. Past client tags: Past Client, Past Clients, PastClient, past client.

| Agent | Past client or sphere, no touch |
|---|---|
| Clementine Rook | 18 |
| Ivo Saltmarsh | 14 |
| Pascal Wickerby | 13 |
| Delphine Ashgrove | 6 |


## Stage Problems

| Check | Contacts |
|---|---|
| Closed deal still in an active stage | 3 |
| Matches a closed transaction but not in a past client stage | 0 |
| Tagged as a past client but in a new, nurture or blank stage | 0 |
| No stage | 0 |
| In a new-lead stage 60+ days after being added, with communication on record (stage not updated) | 57 |
| Stage not recognized (needs a team definition) | 0 |
| Imported Stage or Imported Agent tag left from an import | 4 |


All contacts in a new-lead stage 60+ days after being added: 118 (the ones never contacted are counted under Never Contacted).

Closed deals by current stage: Under Contract 3

## Unassigned And Ponds

Unassigned (no agent, no pond, not trash): 7. Pond records found: 0 (pond tags only).

Unassigned by stage type: Nurture 3; Active lead 2; Active client 2

## Tags

Distinct tags: 36. Used on one contact only: 4. Near-duplicate groups: 6 (19 tags).

| Variants (contacts) | Total |
|---|---|
| Buyer (45); Buyers (30); buyer (17) | 92 |
| Seller (35); Sellers (30); seller (21) | 86 |
| Open House (32); Openhouse (22); open house (18); Open-House (9) | 81 |
| Past Client (32); past client (15); Past Clients (15); PastClient (9) | 71 |
| Sphere (23); sphere (11) | 34 |
| Investor (5); Investors (3); investor (3) | 11 |


## Text Consent

Consent field found: no. Documented yes: 0; documented no: 0; blank: 800. Textable (documented yes, valid phone, not opted out, not Do Not Call): 0.

## Ranked Problems (Records Affected)

| # | Problem | Records | % of database |
|---|---|---|---|
| 1 | Leads never contacted, added 30+ days ago | 109 | 13.6% |
| 2 | Missing or invalid phone (not trash) | 84 | 10.5% |
| 3 | Active-stage contacts gone quiet: communication on record, none in 90+ days | 80 | 10.0% |
| 4 | Missing or invalid email (not trash) | 62 | 7.8% |
| 5 | Stage problems (closed deals in active stages, no stage, contacted leads still in a new-lead stage, past clients in the wrong stage) | 60 | 7.5% |
| 6 | Past clients and sphere with no communication in 365+ days | 51 | 6.4% |
| 7 | Likely duplicates (records in merge groups) | 40 | 5.0% |
| 8 | Unassigned contacts | 7 | 0.9% |


First cleanup: Merge likely duplicates first. 5.0% of records sit in merge groups (rule: 1% or more). Follow Up Boss keeps the main record's stage and assigned agent when it merges, so stage and assignment fixes made before merging can be lost.

## Segment Candidates (Priority Order)

### Past Clients, No Touch In 12+ Months

Size 19 (also in an earlier segment: 0). Emailable 15; callable 18; textable with documented consent 0. Suggested next move: call list.
No communication on record: 3.
By agent: Clementine Rook 9; Pascal Wickerby 5; Delphine Ashgrove 3; Ivo Saltmarsh 2
Stages: Closed 12; Past Client 7
Top sources: Import 5; Referral 4; Past Client 3; Zillow 3; Open House 3

### Sphere, No Touch In 12+ Months

Size 32 (also in an earlier segment: 0). Emailable 27; callable 28; textable with documented consent 0. Suggested next move: email campaign.
No communication on record: 10.
By agent: Ivo Saltmarsh 12; Clementine Rook 9; Pascal Wickerby 8; Delphine Ashgrove 3
Stages: Sphere 32
Top sources: Sphere 13; Referral 11; Import 8

### Stalled Pipeline, No Touch In 90+ Days

Size 79 (also in an earlier segment: 0). Emailable 72; callable 70; textable with documented consent 0. Suggested next move: call list.
No communication on record: 0.
By agent: Clementine Rook 27; Ivo Saltmarsh 25; Delphine Ashgrove 16; Pascal Wickerby 10; (unassigned) 1
Stages: Lead 23; Attempted Contact 22; Spoke with Customer 11; Showing Homes 8; Under Contract 5; Appointment Set 4; Met with Customer 3; Active Listing 1
Top sources: Zillow 18; Website 10; Facebook 8; Import 7; Sphere 7

### Never-Worked Leads

Size 96 (also in an earlier segment: 0). Emailable 80; callable 79; textable with documented consent 0. Suggested next move: call list.
No communication on record: 96.
By agent: Ivo Saltmarsh 28; Clementine Rook 25; Pascal Wickerby 23; Delphine Ashgrove 20
Stages: Lead 65; Nurture 28; Attempted Contact 3
Top sources: Referral 16; Zillow 15; Website 14; Realtor.com 11; Sphere 7

### Quiet Nurture, No Touch In 180+ Days

Size 142 (also in an earlier segment: 28). Emailable 127; callable 122; textable with documented consent 0. Suggested next move: email campaign.
No communication on record: 29.
By agent: Clementine Rook 46; Pascal Wickerby 36; Ivo Saltmarsh 34; Delphine Ashgrove 25; (unassigned) 1
Stages: Nurture 142
Top sources: Zillow 25; Website 21; Import 16; Sphere 12; Referral 12

## Cleanup Worklist

Rows: 323 (one per record that needs work; trash and rejected records left out).

| Action | Records |
|---|---|
| Agent Follow-Up Or Pond Decision | 127 |
| Fill Missing Phone | 49 |
| Merge Candidate | 40 |
| Review New-Lead Stage | 31 |
| Fill Missing Email | 31 |
| Review Shared Contact Info | 15 |
| Fix Invalid Email | 8 |
| Assign Agent | 7 |
| Fix Invalid Phone | 7 |
| Fix Stage | 3 |
| Review Possible Duplicate (Name Only) | 3 |
| Clean Import Tag | 1 |
| Fill Missing Contact Info | 1 |


| Assigned agent | Worklist rows |
|---|---|
| Clementine Rook | 97 |
| Ivo Saltmarsh | 96 |
| Pascal Wickerby | 63 |
| Delphine Ashgrove | 60 |
| (unassigned) | 7 |

