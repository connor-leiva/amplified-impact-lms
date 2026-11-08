# Database Health Check: Analysis Output

File: fub-people-export-5000.csv | Format: Follow Up Boss People export | Records: 5,000 | Header row: 2 | As of: 2026-11-08

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
| Lead activity | Last Activity |
| Is contacted | Is Contacted |
| Tags | Tags |
| Deal stage | Deal Stage |
| Deal close date | Deal Close Date |
| Timeframe | Timeframe |
| Email columns | Email 1, Email 2 |
| Phone columns | Phone 1, Phone 2 |
| Text consent columns | Text Consent |


Last communication taken from: column 'Last Communication'


## Gaps In This Export

- No record ID column: the worklist identifies records by their row in this file, name and first email or phone.
- Follow Up Boss exports pond leads with the pond's lead agent as the assignment and leaves out the pond name, so pond leads count under that agent unless the pond name was added as a tag before export.

Columns ignored for privacy: Birthday

## Contacts By Stage

| Stage | Read as | How | Contacts | % |
|---|---|---|---|---|
| Nurture | Nurture | default | 1,349 | 27.0% |
| Lead | New lead | default | 844 | 16.9% |
| Attempted Contact | Active lead | default | 517 | 10.3% |
| Sphere | Sphere | default | 493 | 9.9% |
| Trash | Inactive (trash, rejected, dead) | default | 302 | 6.0% |
| Spoke with Customer | Active lead | default | 257 | 5.1% |
| Closed | Past client | default | 235 | 4.7% |
| Past Client | Past client | default | 223 | 4.5% |
| Rejected | Inactive (trash, rejected, dead) | default | 148 | 3.0% |
| Showing Homes | Active client | default | 110 | 2.2% |
| Met with Customer | Active lead | default | 106 | 2.1% |
| Appointment Set | Active lead | default | 97 | 1.9% |
| Under Contract | Active client | default | 77 | 1.5% |
| Listing Agreement | Active client | default | 67 | 1.3% |
| Submitting Offers | Active client | default | 62 | 1.2% |
| Vendor | Other (vendor, agent, partner) | guess | 58 | 1.2% |
| Active Listing | Active client | default | 55 | 1.1% |


Stages to confirm with the team: guessed ['Vendor']; not recognized none

## Contacts By Source (Top 15)

| Source | Contacts | % |
|---|---|---|
| Zillow | 825 | 16.5% |
| Sphere | 668 | 13.4% |
| Import | 637 | 12.7% |
| Website | 628 | 12.6% |
| Referral | 488 | 9.8% |
| Realtor.com | 348 | 7.0% |
| Open House | 347 | 6.9% |
| Facebook | 329 | 6.6% |
| Past Client | 236 | 4.7% |
| Homes.com | 153 | 3.1% |
| Google PPC | 135 | 2.7% |
| (blank) | 113 | 2.3% |
| Sign Call | 93 | 1.9% |


All other sources: 0 contacts across 0 more source values.

## Contacts By Assigned Agent

| Agent | Contacts | % | Active stage | Active, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months | In merge groups |
|---|---|---|---|---|---|---|---|
| Juniper Quickfoot | 776 | 15.5% | 351 | 145 | 99 | 60 | 36 |
| Barnaby Larkspur | 769 | 15.4% | 324 | 142 | 110 | 51 | 51 |
| Odessa Fernwhistle | 682 | 13.6% | 298 | 138 | 89 | 57 | 29 |
| Desmond Puddlejump | 619 | 12.4% | 272 | 124 | 88 | 40 | 38 |
| Rufus Tumbleweed | 601 | 12.0% | 279 | 111 | 74 | 36 | 26 |
| Marisol Pinecone | 535 | 10.7% | 231 | 95 | 65 | 27 | 26 |
| Hazel Thimbleberry | 480 | 9.6% | 201 | 75 | 70 | 26 | 32 |
| Calloway Brightwater | 475 | 9.5% | 210 | 99 | 64 | 38 | 32 |
| (unassigned) | 63 | 1.3% | 26 | 10 | 10 | 5 | 2 |


## Contact Info

| Check | Contacts | % |
|---|---|---|
| No email | 416 | 8.3% |
| Email looks invalid or placeholder | 56 | 1.1% |
| Bounced-email tag | 60 | 1.2% |
| Unsubscribed from email (tag or column) | 161 | 3.2% |
| No phone | 529 | 10.6% |
| Phone not a valid 10-digit US number | 83 | 1.7% |
| Do Not Call (tag or column) | 102 | 2.0% |
| Opted out of texts (tag or column) | 136 | 2.7% |
| No valid email and no valid phone | 51 | 1.0% |


## Likely Duplicates

| Group type | Groups | Records |
|---|---|---|
| Same email or phone, same or near-identical name (merge candidates) | 133 | 272 |
| Same email or phone, different first name, same last name | 24 | 48 |
| Same email or phone, different names | 6 | 12 |
| Same or near-identical name only (review) | 83 | 167 |


Records that would go away if every merge group were merged: 139.

One email or phone on many records (not treated as duplicates): a phone on 8 records

## Active-Stage Contacts, No Communication In 90+ Days

939 of 2,192 active-stage contacts (42.8%): 529 gone quiet (communication on record, none in 90+ days) and 410 with no communication on record.

| Stage | Contacts |
|---|---|
| Lead | 552 |
| Attempted Contact | 158 |
| Spoke with Customer | 63 |
| Showing Homes | 39 |
| Met with Customer | 29 |
| Appointment Set | 26 |
| Active Listing | 20 |
| Under Contract | 20 |
| Submitting Offers | 17 |
| Listing Agreement | 15 |


| Agent | Contacts |
|---|---|
| Juniper Quickfoot | 145 |
| Barnaby Larkspur | 142 |
| Odessa Fernwhistle | 138 |
| Desmond Puddlejump | 124 |
| Rufus Tumbleweed | 111 |
| Calloway Brightwater | 99 |
| Marisol Pinecone | 95 |
| Hazel Thimbleberry | 75 |
| (unassigned) | 10 |


## Never Contacted, Added 30+ Days Ago

Basis: Is Contacted column. Contacts: 669.

| Agent | Contacts |
|---|---|
| Barnaby Larkspur | 110 |
| Juniper Quickfoot | 99 |
| Odessa Fernwhistle | 89 |
| Desmond Puddlejump | 88 |
| Rufus Tumbleweed | 74 |
| Hazel Thimbleberry | 70 |
| Marisol Pinecone | 65 |
| Calloway Brightwater | 64 |
| (unassigned) | 10 |


| Source | Contacts |
|---|---|
| Zillow | 124 |
| Website | 101 |
| Import | 83 |
| Sphere | 77 |
| Referral | 61 |
| Facebook | 49 |
| Open House | 45 |
| Realtor.com | 44 |


## Past Clients And Sphere

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients | 487 | 178 | 51 |
| Sphere | 493 | 162 | 39 |


Past clients found by: stage 458; tag only 0; closed-transaction file only 29. Past client stages: Closed, Past Client. Past client tags: Past Client, Past Clients, PastClient, past client.

| Agent | Past client or sphere, no touch |
|---|---|
| Juniper Quickfoot | 60 |
| Odessa Fernwhistle | 57 |
| Barnaby Larkspur | 51 |
| Desmond Puddlejump | 40 |
| Calloway Brightwater | 38 |
| Rufus Tumbleweed | 36 |
| Marisol Pinecone | 27 |
| Hazel Thimbleberry | 26 |
| (unassigned) | 5 |


Closed-transaction file closed-transactions-2019-2026.csv: 167 closed rows; matched by email or phone 147; name only 6 (not used for fixes); not found in the export 14.

## Stage Problems

| Check | Contacts |
|---|---|
| Closed deal still in an active stage | 31 |
| Matches a closed transaction but not in a past client stage | 20 |
| Tagged as a past client but in a new, nurture or blank stage | 0 |
| No stage | 0 |
| In a new-lead stage 60+ days after being added, with communication on record (stage not updated) | 426 |
| Stage not recognized (needs a team definition) | 0 |
| Imported Stage or Imported Agent tag left from an import | 54 |


All contacts in a new-lead stage 60+ days after being added: 781 (the ones never contacted are counted under Never Contacted).

Closed deals by current stage: Showing Homes 9; Under Contract 6; Active Listing 5; Attempted Contact 4; Spoke with Customer 3; Met with Customer 2; Submitting Offers 2

## Unassigned And Ponds

Unassigned (no agent, no pond, not trash): 63. Pond records found: 173 (pond tags only).

Pond records by assigned agent (Follow Up Boss shows the pond's lead agent here): Desmond Puddlejump 173

Unassigned by stage type: Nurture 21; Active lead 14; Sphere 8; New lead 7; Past client 7; Active client 5; Other (vendor, agent, partner) 1

## Tags

Distinct tags: 38. Used on one contact only: 0. Near-duplicate groups: 7 (21 tags).

| Variants (contacts) | Total |
|---|---|
| Seller (265); Sellers (146); seller (142) | 553 |
| Open House (204); Open-House (126); Openhouse (107); open house (103) | 540 |
| Buyer (270); Buyers (129); buyer (127) | 526 |
| Past Client (185); past client (98); Past Clients (95); PastClient (71) | 449 |
| Sphere (135); sphere (65) | 200 |
| Investors (32); Investor (29); investor (23) | 84 |
| VIP (14); vip (9) | 23 |


## Text Consent

Consent field found: yes (Text Consent). Documented yes: 1,309; documented no: 136; blank: 3,555. Textable (documented yes, valid phone, not opted out, not Do Not Call): 1,252.

## Ranked Problems (Records Affected)

| # | Problem | Records | % of database |
|---|---|---|---|
| 1 | Leads never contacted, added 30+ days ago | 669 | 13.4% |
| 2 | Missing or invalid phone (not trash) | 562 | 11.2% |
| 3 | Active-stage contacts gone quiet: communication on record, none in 90+ days | 529 | 10.6% |
| 4 | Stage problems (closed deals in active stages, no stage, contacted leads still in a new-lead stage, past clients in the wrong stage) | 474 | 9.5% |
| 5 | Missing or invalid email (not trash) | 429 | 8.6% |
| 6 | Past clients and sphere with no communication in 365+ days | 340 | 6.8% |
| 7 | Likely duplicates (records in merge groups) | 272 | 5.4% |
| 8 | Unassigned contacts | 63 | 1.3% |


First cleanup: Merge likely duplicates first. 5.4% of records sit in merge groups (rule: 1% or more). Follow Up Boss keeps the main record's stage and assigned agent when it merges, so stage and assignment fixes made before merging can be lost.

## Segment Candidates (Priority Order)

### Back On The Site

Size 305 (also in an earlier segment: 0). Emailable 266; callable 267; textable with documented consent 86. Suggested next move: call list.
No communication on record: 77.
By agent: Juniper Quickfoot 48; Desmond Puddlejump 44; Odessa Fernwhistle 43; Barnaby Larkspur 37; Rufus Tumbleweed 36; Hazel Thimbleberry 36; Marisol Pinecone 27; Calloway Brightwater 26
Stages: Nurture 104; Lead 85; Attempted Contact 30; Spoke with Customer 21; Showing Homes 12; Closed 12; Past Client 11; Appointment Set 7
Top sources: Zillow 101; Website 77; Facebook 48; Realtor.com 47; Homes.com 14

### Past Clients, No Touch In 12+ Months

Size 178 (also in an earlier segment: 9). Emailable 160; callable 153; textable with documented consent 43. Suggested next move: call list.
No communication on record: 51.
By agent: Juniper Quickfoot 30; Odessa Fernwhistle 27; Barnaby Larkspur 26; Rufus Tumbleweed 23; Calloway Brightwater 22; Desmond Puddlejump 21; Hazel Thimbleberry 17; Marisol Pinecone 10
Stages: Past Client 81; Closed 78; Lead 9; Nurture 6; Attempted Contact 4
Top sources: Import 29; Website 28; Referral 27; Past Client 24; Zillow 23

### Sphere, No Touch In 12+ Months

Size 162 (also in an earlier segment: 0). Emailable 143; callable 144; textable with documented consent 45. Suggested next move: email campaign.
No communication on record: 39.
By agent: Juniper Quickfoot 30; Odessa Fernwhistle 30; Barnaby Larkspur 25; Desmond Puddlejump 19; Marisol Pinecone 17; Calloway Brightwater 16; Rufus Tumbleweed 13; Hazel Thimbleberry 9
Stages: Sphere 162
Top sources: Sphere 75; Referral 43; Import 40; (blank) 1; Open House 1

### Stalled Pipeline, No Touch In 90+ Days

Size 527 (also in an earlier segment: 45). Emailable 441; callable 457; textable with documented consent 138. Suggested next move: call list.
No communication on record: 11.
By agent: Juniper Quickfoot 89; Barnaby Larkspur 76; Odessa Fernwhistle 75; Desmond Puddlejump 71; Rufus Tumbleweed 64; Marisol Pinecone 57; Calloway Brightwater 55; Hazel Thimbleberry 33
Stages: Lead 182; Attempted Contact 130; Spoke with Customer 63; Showing Homes 35; Met with Customer 27; Appointment Set 25; Active Listing 18; Under Contract 17
Top sources: Zillow 94; Import 67; Website 62; Realtor.com 55; Sphere 43

### Never-Worked Leads

Size 581 (also in an earlier segment: 64). Emailable 488; callable 477; textable with documented consent 131. Suggested next move: call list.
No communication on record: 581.
By agent: Barnaby Larkspur 96; Juniper Quickfoot 81; Desmond Puddlejump 80; Odessa Fernwhistle 76; Rufus Tumbleweed 68; Hazel Thimbleberry 61; Marisol Pinecone 58; Calloway Brightwater 52
Stages: Lead 363; Nurture 190; Attempted Contact 24; Showing Homes 2; Appointment Set 1; Submitting Offers 1
Top sources: Zillow 117; Website 90; Import 63; Sphere 55; Referral 49

### Quiet Nurture, No Touch In 180+ Days

Size 863 (also in an earlier segment: 223). Emailable 748; callable 723; textable with documented consent 203. Suggested next move: email campaign.
No communication on record: 190.
By agent: Barnaby Larkspur 136; Juniper Quickfoot 131; Desmond Puddlejump 123; Odessa Fernwhistle 101; Marisol Pinecone 96; Rufus Tumbleweed 94; Hazel Thimbleberry 91; Calloway Brightwater 75
Stages: Nurture 863
Top sources: Zillow 173; Website 132; Sphere 86; Import 85; Referral 74

## Cleanup Worklist

Rows: 2,208 (one per record that needs work; trash and rejected records left out).

| Action | Records |
|---|---|
| Agent Follow-Up Or Pond Decision | 792 |
| Fill Missing Phone | 293 |
| Merge Candidate | 272 |
| Review New-Lead Stage | 235 |
| Fill Missing Email | 202 |
| Review Possible Duplicate (Name Only) | 94 |
| Review Shared Contact Info | 68 |
| Assign Agent | 61 |
| Fix Invalid Phone | 55 |
| Fix Stage | 46 |
| Clean Import Tag | 34 |
| Fix Invalid Email | 31 |
| Fill Missing Contact Info | 22 |
| Archive Candidate | 3 |


| Assigned agent | Worklist rows |
|---|---|
| Juniper Quickfoot | 332 |
| Barnaby Larkspur | 328 |
| Desmond Puddlejump | 293 |
| Odessa Fernwhistle | 289 |
| Rufus Tumbleweed | 251 |
| Marisol Pinecone | 232 |
| Hazel Thimbleberry | 210 |
| Calloway Brightwater | 210 |
| (unassigned) | 63 |

