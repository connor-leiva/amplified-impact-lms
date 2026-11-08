# Database Health Check: Analysis Output

File: PRACTICE-followupboss-people-export.csv | Format: Follow Up Boss People export | Records: 500 | Header row: 2 | As of: 2026-11-08

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

## Contacts By Stage

| Stage | Read as | How | Contacts | % |
|---|---|---|---|---|
| Nurture | Nurture | default | 134 | 26.8% |
| Lead | New lead | default | 87 | 17.4% |
| Attempted Contact | Active lead | default | 45 | 9.0% |
| Trash | Inactive (trash, rejected, dead) | default | 38 | 7.6% |
| Sphere | Sphere | default | 37 | 7.4% |
| Closed | Past client | default | 30 | 6.0% |
| Past Client | Past client | default | 23 | 4.6% |
| Spoke with Customer | Active lead | default | 20 | 4.0% |
| Rejected | Inactive (trash, rejected, dead) | default | 17 | 3.4% |
| Showing Homes | Active client | default | 14 | 2.8% |
| Under Contract | Active client | default | 12 | 2.4% |
| Met with Customer | Active lead | default | 12 | 2.4% |
| Appointment Set | Active lead | default | 10 | 2.0% |
| Listing Agreement | Active client | default | 9 | 1.8% |
| Vendor | Other (vendor, agent, partner) | guess | 5 | 1.0% |
| Submitting Offers | Active client | default | 5 | 1.0% |
| Active Listing | Active client | default | 2 | 0.4% |


Stages to confirm with the team: guessed ['Vendor']; not recognized none

## Contacts By Source (Top 15)

| Source | Contacts | % |
|---|---|---|
| Zillow | 88 | 17.6% |
| Website | 68 | 13.6% |
| Sphere | 63 | 12.6% |
| Import | 55 | 11.0% |
| Referral | 53 | 10.6% |
| Realtor.com | 41 | 8.2% |
| Facebook | 37 | 7.4% |
| Open House | 27 | 5.4% |
| Past Client | 23 | 4.6% |
| Homes.com | 17 | 3.4% |
| Google PPC | 11 | 2.2% |
| (blank) | 10 | 2.0% |
| Sign Call | 7 | 1.4% |


All other sources: 0 contacts across 0 more source values.

## Contacts By Assigned Agent

| Agent | Contacts | % | Active stage | Active, no touch 90+ days | Never contacted | Past client or sphere, no touch 12+ months | In merge groups |
|---|---|---|---|---|---|---|---|
| Juniper Quickfoot | 119 | 23.8% | 52 | 20 | 14 | 6 | 3 |
| Barnaby Larkspur | 112 | 22.4% | 49 | 22 | 13 | 8 | 5 |
| Rufus Tumbleweed | 97 | 19.4% | 43 | 20 | 16 | 6 | 3 |
| Odessa Fernwhistle | 87 | 17.4% | 42 | 20 | 10 | 7 | 9 |
| Marisol Pinecone | 83 | 16.6% | 29 | 11 | 13 | 7 | 4 |
| (unassigned) | 2 | 0.4% | 1 | 1 | 0 | 0 | 0 |


## Contact Info

| Check | Contacts | % |
|---|---|---|
| No email | 34 | 6.8% |
| Email looks invalid or placeholder | 7 | 1.4% |
| Bounced-email tag | 6 | 1.2% |
| Unsubscribed from email (tag or column) | 19 | 3.8% |
| No phone | 61 | 12.2% |
| Phone not a valid 10-digit US number | 8 | 1.6% |
| Do Not Call (tag or column) | 6 | 1.2% |
| Opted out of texts (tag or column) | 13 | 2.6% |
| No valid email and no valid phone | 8 | 1.6% |


## Likely Duplicates

| Group type | Groups | Records |
|---|---|---|
| Same email or phone, same or near-identical name (merge candidates) | 12 | 24 |
| Same email or phone, different first name, same last name | 2 | 4 |
| Same email or phone, different names | 0 | 0 |
| Same or near-identical name only (review) | 1 | 2 |


Records that would go away if every merge group were merged: 12.

One email or phone on many records (not treated as duplicates): a phone on 7 records

## Active-Stage Contacts, No Communication In 90+ Days

94 of 216 active-stage contacts (43.5%): 54 gone quiet (communication on record, none in 90+ days) and 40 with no communication on record.

| Stage | Contacts |
|---|---|
| Lead | 57 |
| Attempted Contact | 12 |
| Showing Homes | 6 |
| Spoke with Customer | 5 |
| Listing Agreement | 4 |
| Met with Customer | 3 |
| Appointment Set | 3 |
| Under Contract | 2 |
| Submitting Offers | 2 |


| Agent | Contacts |
|---|---|
| Barnaby Larkspur | 22 |
| Rufus Tumbleweed | 20 |
| Juniper Quickfoot | 20 |
| Odessa Fernwhistle | 20 |
| Marisol Pinecone | 11 |
| (unassigned) | 1 |


## Never Contacted, Added 30+ Days Ago

Basis: Is Contacted column. Contacts: 66.

| Agent | Contacts |
|---|---|
| Rufus Tumbleweed | 16 |
| Juniper Quickfoot | 14 |
| Barnaby Larkspur | 13 |
| Marisol Pinecone | 13 |
| Odessa Fernwhistle | 10 |


| Source | Contacts |
|---|---|
| Zillow | 14 |
| Referral | 11 |
| Import | 8 |
| Sphere | 7 |
| Website | 6 |
| Facebook | 6 |
| Homes.com | 4 |
| (blank) | 3 |


## Past Clients And Sphere

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients | 53 | 18 | 5 |
| Sphere | 37 | 16 | 5 |


Past clients found by: stage 53; tag only 0; closed-transaction file only 0. Past client stages: Closed, Past Client. Past client tags: Past Client, Past Clients, PastClient, past client.

| Agent | Past client or sphere, no touch |
|---|---|
| Barnaby Larkspur | 8 |
| Marisol Pinecone | 7 |
| Odessa Fernwhistle | 7 |
| Juniper Quickfoot | 6 |
| Rufus Tumbleweed | 6 |


## Stage Problems

| Check | Contacts |
|---|---|
| Closed deal still in an active stage | 3 |
| Matches a closed transaction but not in a past client stage | 0 |
| Tagged as a past client but in a new, nurture or blank stage | 0 |
| No stage | 0 |
| In a new-lead stage 60+ days after being added, with communication on record (stage not updated) | 43 |
| Stage not recognized (needs a team definition) | 0 |
| Imported Stage or Imported Agent tag left from an import | 4 |


All contacts in a new-lead stage 60+ days after being added: 82 (the ones never contacted are counted under Never Contacted).

Closed deals by current stage: Submitting Offers 2; Showing Homes 1

## Unassigned And Ponds

Unassigned (no agent, no pond, not trash): 2. Pond records found: 15 (pond tags only).

Pond records by assigned agent (Follow Up Boss shows the pond's lead agent here): Rufus Tumbleweed 15

Unassigned by stage type: New lead 1; Sphere 1

## Tags

Distinct tags: 34. Used on one contact only: 1. Near-duplicate groups: 6 (19 tags).

| Variants (contacts) | Total |
|---|---|
| Seller (27); Sellers (18); seller (17) | 62 |
| Buyer (29); Buyers (19); buyer (8) | 56 |
| Past Client (23); Past Clients (12); past client (9); PastClient (8) | 52 |
| Open House (19); open house (11); Open-House (8); Openhouse (6) | 44 |
| Sphere (10); sphere (7) | 17 |
| Investors (3); investor (2); Investor (2) | 7 |


## Text Consent

Consent field found: yes (Text Consent). Documented yes: 108; documented no: 13; blank: 379. Textable (documented yes, valid phone, not opted out, not Do Not Call): 105.

## Ranked Problems (Records Affected)

| # | Problem | Records | % of database |
|---|---|---|---|
| 1 | Leads never contacted, added 30+ days ago | 66 | 13.2% |
| 2 | Missing or invalid phone (not trash) | 61 | 12.2% |
| 3 | Active-stage contacts gone quiet: communication on record, none in 90+ days | 54 | 10.8% |
| 4 | Stage problems (closed deals in active stages, no stage, contacted leads still in a new-lead stage, past clients in the wrong stage) | 46 | 9.2% |
| 5 | Missing or invalid email (not trash) | 38 | 7.6% |
| 6 | Past clients and sphere with no communication in 365+ days | 34 | 6.8% |
| 7 | Likely duplicates (records in merge groups) | 24 | 4.8% |
| 8 | Unassigned contacts | 2 | 0.4% |


First cleanup: Merge likely duplicates first. 4.8% of records sit in merge groups (rule: 1% or more). Follow Up Boss keeps the main record's stage and assigned agent when it merges, so stage and assignment fixes made before merging can be lost.

## Segment Candidates (Priority Order)

### Back On The Site

Size 31 (also in an earlier segment: 0). Emailable 25; callable 29; textable with documented consent 6. Suggested next move: call list.
No communication on record: 6.
By agent: Juniper Quickfoot 11; Barnaby Larkspur 8; Rufus Tumbleweed 7; Marisol Pinecone 3; Odessa Fernwhistle 2
Stages: Nurture 13; Lead 5; Attempted Contact 3; Past Client 3; Under Contract 2; Submitting Offers 1; Listing Agreement 1; Met with Customer 1
Top sources: Zillow 13; Website 7; Facebook 4; Realtor.com 4; Homes.com 2

### Past Clients, No Touch In 12+ Months

Size 18 (also in an earlier segment: 1). Emailable 14; callable 15; textable with documented consent 0. Suggested next move: call list.
No communication on record: 5.
By agent: Barnaby Larkspur 5; Marisol Pinecone 4; Juniper Quickfoot 4; Rufus Tumbleweed 3; Odessa Fernwhistle 2
Stages: Closed 11; Past Client 7
Top sources: Website 8; Zillow 3; Open House 2; Past Client 2; Import 2

### Sphere, No Touch In 12+ Months

Size 16 (also in an earlier segment: 0). Emailable 15; callable 15; textable with documented consent 3. Suggested next move: email campaign.
No communication on record: 5.
By agent: Odessa Fernwhistle 5; Rufus Tumbleweed 3; Barnaby Larkspur 3; Marisol Pinecone 3; Juniper Quickfoot 2
Stages: Sphere 16
Top sources: Sphere 9; Import 4; Referral 3

### Stalled Pipeline, No Touch In 90+ Days

Size 53 (also in an earlier segment: 6). Emailable 48; callable 45; textable with documented consent 3. Suggested next move: call list.
No communication on record: 0.
By agent: Juniper Quickfoot 13; Odessa Fernwhistle 12; Rufus Tumbleweed 11; Barnaby Larkspur 10; Marisol Pinecone 6; (unassigned) 1
Stages: Lead 17; Attempted Contact 12; Showing Homes 6; Spoke with Customer 5; Listing Agreement 4; Met with Customer 3; Appointment Set 3; Under Contract 2
Top sources: Zillow 11; Realtor.com 9; Facebook 8; Open House 5; Website 5

### Never-Worked Leads

Size 56 (also in an earlier segment: 3). Emailable 43; callable 48; textable with documented consent 8. Suggested next move: call list.
No communication on record: 56.
By agent: Rufus Tumbleweed 15; Barnaby Larkspur 12; Juniper Quickfoot 11; Marisol Pinecone 10; Odessa Fernwhistle 8
Stages: Lead 40; Nurture 16
Top sources: Zillow 12; Referral 10; Website 6; Facebook 6; Import 5

### Quiet Nurture, No Touch In 180+ Days

Size 79 (also in an earlier segment: 24). Emailable 66; callable 73; textable with documented consent 20. Suggested next move: email campaign.
No communication on record: 19.
By agent: Rufus Tumbleweed 20; Juniper Quickfoot 19; Barnaby Larkspur 17; Marisol Pinecone 14; Odessa Fernwhistle 9
Stages: Nurture 79
Top sources: Zillow 19; Referral 9; Realtor.com 9; Website 9; Sphere 8

## Cleanup Worklist

Rows: 205 (one per record that needs work; trash and rejected records left out).

| Action | Records |
|---|---|
| Agent Follow-Up Or Pond Decision | 79 |
| Fill Missing Phone | 28 |
| Review New-Lead Stage | 26 |
| Merge Candidate | 24 |
| Fill Missing Email | 16 |
| Review Shared Contact Info | 11 |
| Fix Invalid Phone | 6 |
| Fix Invalid Email | 4 |
| Fix Stage | 3 |
| Fill Missing Contact Info | 3 |
| Clean Import Tag | 3 |
| Assign Agent | 2 |


| Assigned agent | Worklist rows |
|---|---|
| Juniper Quickfoot | 46 |
| Rufus Tumbleweed | 45 |
| Barnaby Larkspur | 43 |
| Odessa Fernwhistle | 37 |
| Marisol Pinecone | 32 |
| (unassigned) | 2 |

