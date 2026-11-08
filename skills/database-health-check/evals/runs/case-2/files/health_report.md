# Database Health Check: Analysis Output

File: brightwater-crm-contacts.csv | Format: Other CRM export (columns mapped by name) | Records: 1,200 | Header row: 3 | As of: 2026-11-08

Settings: active-stage stale after 60 days; past client and sphere after 365 days; new-lead stage after 60 days; never contacted if added 30+ days ago; quiet nurture after 180 days. Team rules used: past_client_days, past_client_tags, pond_after_days, pond_stages, pond_tags, sphere_tags, stage_classes, stale_days.

## Columns Used

| What | Column in the file |
|---|---|
| Record ID | Contact ID |
| Name | Full Name |
| Stage | Lead Status |
| Source | Lead Source |
| Assigned agent | Owner |
| Date added | Created Date |
| Last communication | Last Contacted |
| Lead activity | Last Website Visit |
| Tags | Labels |
| Email columns | Primary Email, Secondary Email |
| Phone columns | Mobile Phone, Home Phone |
| Text consent columns | SMS Opt-In |
| Email opt-out columns | Email Opt-Out |


Last communication taken from: column 'Last Contacted'


## Contacts By Stage

| Stage | Read as | How | Contacts | % |
|---|---|---|---|---|
| Long-Term Nurture | Nurture | team | 279 | 23.2% |
| New | New lead | team | 192 | 16.0% |
| SOI | Sphere | team | 163 | 13.6% |
| Warm | Active lead | team | 134 | 11.2% |
| Past Client | Past client | team | 101 | 8.4% |
| (blank) | No stage | none | 71 | 5.9% |
| Closed Lost | Inactive (trash, rejected, dead) | team | 58 | 4.8% |
| Active Buyer | Active client | team | 37 | 3.1% |
| Hot | Active lead | team | 37 | 3.1% |
| Investor | Not recognized | none | 30 | 2.5% |
| In Escrow | Active client | team | 28 | 2.3% |
| Appointment Booked | Active lead | team | 27 | 2.2% |
| Active Seller | Active client | team | 22 | 1.8% |
| Do Not Contact | Inactive (trash, rejected, dead) | team | 21 | 1.8% |


Stages to confirm with the team: guessed none; not recognized ['Investor']

## Contacts By Source (Top 15)

| Source | Contacts | % |
|---|---|---|
| Website | 222 | 18.5% |
| Zillow | 177 | 14.8% |
| Import | 160 | 13.3% |
| SOI | 132 | 11.0% |
| Referral | 128 | 10.7% |
| Open House | 113 | 9.4% |
| Facebook Ads | 110 | 9.2% |
| (blank) | 62 | 5.2% |
| Realtor.com | 52 | 4.3% |
| Sign Call | 44 | 3.7% |


All other sources: 0 contacts across 0 more source values.

## Contacts By Assigned Agent

| Agent | Contacts | % | Active stage | Active, no touch 60+ days | Never contacted | Past client or sphere, no touch 12+ months | In merge groups |
|---|---|---|---|---|---|---|---|
| Pell Mossgrove | 279 | 23.2% | 115 | 69 | 60 | 24 | 15 |
| Sunny Larkfield | 272 | 22.7% | 106 | 63 | 54 | 27 | 14 |
| Booker Quillfeather | 221 | 18.4% | 86 | 49 | 40 | 23 | 15 |
| Marigold Tumbletoes | 198 | 16.5% | 83 | 49 | 50 | 18 | 15 |
| Fennick Oddsworth | 178 | 14.8% | 65 | 39 | 40 | 21 | 10 |
| (unassigned) | 50 | 4.2% | 22 | 14 | 17 | 8 | 7 |
| (pond) | 2 | 0.2% | 0 | 0 | 0 | 1 | 0 |


## Contact Info

| Check | Contacts | % |
|---|---|---|
| No email | 77 | 6.4% |
| Email looks invalid or placeholder | 10 | 0.8% |
| Bounced-email tag | 0 | 0.0% |
| Unsubscribed from email (tag or column) | 35 | 2.9% |
| No phone | 159 | 13.2% |
| Phone not a valid 10-digit US number | 18 | 1.5% |
| Do Not Call (tag or column) | 0 | 0.0% |
| Opted out of texts (tag or column) | 35 | 2.9% |
| No valid email and no valid phone | 12 | 1.0% |


## Likely Duplicates

| Group type | Groups | Records |
|---|---|---|
| Same email or phone, same or near-identical name (merge candidates) | 38 | 76 |
| Same email or phone, different first name, same last name | 10 | 21 |
| Same email or phone, different names | 0 | 0 |
| Same or near-identical name only (review) | 7 | 14 |


Records that would go away if every merge group were merged: 38.

## Active-Stage Contacts, No Communication In 60+ Days

283 of 477 active-stage contacts (59.3%): 133 gone quiet (communication on record, none in 60+ days) and 150 with no communication on record.

| Stage | Contacts |
|---|---|
| New | 118 |
| Warm | 83 |
| Active Buyer | 22 |
| In Escrow | 19 |
| Hot | 19 |
| Appointment Booked | 13 |
| Active Seller | 9 |


| Agent | Contacts |
|---|---|
| Pell Mossgrove | 69 |
| Sunny Larkfield | 63 |
| Marigold Tumbletoes | 49 |
| Booker Quillfeather | 49 |
| Fennick Oddsworth | 39 |
| (unassigned) | 14 |


## Never Contacted, Added 30+ Days Ago

Basis: no communication on record. Contacts: 261.

| Agent | Contacts |
|---|---|
| Pell Mossgrove | 60 |
| Sunny Larkfield | 54 |
| Marigold Tumbletoes | 50 |
| Fennick Oddsworth | 40 |
| Booker Quillfeather | 40 |
| (unassigned) | 17 |


| Source | Contacts |
|---|---|
| Import | 45 |
| Zillow | 40 |
| Website | 31 |
| Open House | 30 |
| Facebook Ads | 27 |
| SOI | 25 |
| Referral | 23 |
| (blank) | 16 |


## Past Clients And Sphere

| Group | Contacts | No communication in 365+ days | Of those, none on record |
|---|---|---|---|
| Past clients | 110 | 55 | 14 |
| Sphere | 163 | 67 | 8 |


Past clients found by: stage 101; tag only 9; closed-transaction file only 0. Past client stages: Past Client. Past client tags: Closed Client, Closed Clients, closed client.

| Agent | Past client or sphere, no touch |
|---|---|
| Sunny Larkfield | 27 |
| Pell Mossgrove | 24 |
| Booker Quillfeather | 23 |
| Fennick Oddsworth | 21 |
| Marigold Tumbletoes | 18 |
| (unassigned) | 8 |
| (pond) | 1 |


## Stage Problems

| Check | Contacts |
|---|---|
| Closed deal still in an active stage | 0 |
| Matches a closed transaction but not in a past client stage | 0 |
| Tagged as a past client but in a new, nurture or blank stage | 9 |
| No stage | 71 |
| In a new-lead stage 60+ days after being added, with communication on record (stage not updated) | 114 |
| Stage not recognized (needs a team definition) | 30 |
| Imported Stage or Imported Agent tag left from an import | 0 |


All contacts in a new-lead stage 60+ days after being added: 189 (the ones never contacted are counted under Never Contacted).

## Unassigned And Ponds

Unassigned (no agent, no pond, not trash): 46. Pond records found: 62 (pond tags only).

Pond records by assigned agent: Sunny Larkfield 19; Pell Mossgrove 13; Booker Quillfeather 11; Marigold Tumbletoes 9; Fennick Oddsworth 8; (no agent) 2

Team pond rule: New, Warm with no communication in 45+ days. Pond candidates now: 213.

Unassigned by stage type: New lead 13; Sphere 9; Nurture 8; Active client 5; Active lead 4; Not recognized 4; No stage 2; Past client 1

## Tags

Distinct tags: 11. Used on one contact only: 0. Near-duplicate groups: 3 (8 tags).

| Variants (contacts) | Total |
|---|---|
| First-Time Buyer (58); first time buyer (58); First Time Buyer (42) | 158 |
| Closed Client (56); closed client (29); Closed Clients (25) | 110 |
| Move Up Seller (53); Move-Up Seller (38) | 91 |


## Text Consent

Consent field found: yes (SMS Opt-In). Documented yes: 323; documented no: 35; blank: 842. Textable (documented yes, valid phone, not opted out, not Do Not Call): 318.

## Ranked Problems (Records Affected)

| # | Problem | Records | % of database |
|---|---|---|---|
| 1 | Leads never contacted, added 30+ days ago | 261 | 21.8% |
| 2 | Stage problems (closed deals in active stages, no stage, contacted leads still in a new-lead stage, past clients in the wrong stage) | 194 | 16.2% |
| 3 | Missing or invalid phone (not trash) | 171 | 14.2% |
| 4 | Active-stage contacts gone quiet: communication on record, none in 60+ days | 133 | 11.1% |
| 5 | Past clients and sphere with no communication in 365+ days | 122 | 10.2% |
| 6 | Missing or invalid email (not trash) | 84 | 7.0% |
| 7 | Likely duplicates (records in merge groups) | 76 | 6.3% |
| 8 | Unassigned contacts | 46 | 3.8% |


First cleanup: Merge likely duplicates first. 6.3% of records sit in merge groups (rule: 1% or more). A merge keeps one record's stage and owner, so stage and assignment fixes made before merging can be lost (check how your CRM merges).

## Segment Candidates (Priority Order)

### Back On The Site

Size 46 (also in an earlier segment: 0). Emailable 41; callable 38; textable with documented consent 13. Suggested next move: call list.
No communication on record: 11.
By agent: Booker Quillfeather 12; Sunny Larkfield 9; Marigold Tumbletoes 9; Pell Mossgrove 7; Fennick Oddsworth 6; (unassigned) 3
Stages: SOI 11; Long-Term Nurture 9; New 7; Past Client 5; Investor 3; Warm 3; (blank) 3; Appointment Booked 2
Top sources: Website 15; Zillow 14; Realtor.com 12; Facebook Ads 5

### Past Clients, No Touch In 12+ Months

Size 55 (also in an earlier segment: 5). Emailable 50; callable 52; textable with documented consent 19. Suggested next move: call list.
No communication on record: 14.
By agent: Sunny Larkfield 14; Fennick Oddsworth 12; Booker Quillfeather 10; Pell Mossgrove 9; Marigold Tumbletoes 8; (unassigned) 2
Stages: Past Client 49; Long-Term Nurture 6
Top sources: Website 13; Zillow 8; SOI 8; Open House 7; Import 6

### Sphere, No Touch In 12+ Months

Size 67 (also in an earlier segment: 3). Emailable 64; callable 60; textable with documented consent 16. Suggested next move: email campaign.
No communication on record: 8.
By agent: Pell Mossgrove 15; Sunny Larkfield 13; Booker Quillfeather 13; Marigold Tumbletoes 10; Fennick Oddsworth 9; (unassigned) 6; (pond) 1
Stages: SOI 67
Top sources: Website 14; Zillow 9; Import 8; Referral 7; Facebook Ads 7

### Stalled Pipeline, No Touch In 60+ Days

Size 134 (also in an earlier segment: 3). Emailable 122; callable 115; textable with documented consent 28. Suggested next move: call list.
No communication on record: 1.
By agent: Pell Mossgrove 38; Sunny Larkfield 34; Booker Quillfeather 23; Fennick Oddsworth 18; Marigold Tumbletoes 18; (unassigned) 3
Stages: Warm 50; New 43; Active Buyer 12; In Escrow 10; Hot 9; Active Seller 6; Appointment Booked 4
Top sources: Website 31; SOI 20; Zillow 18; Import 15; Open House 13

### Never-Worked Leads

Size 239 (also in an earlier segment: 9). Emailable 218; callable 186; textable with documented consent 55. Suggested next move: call list.
No communication on record: 239.
By agent: Pell Mossgrove 54; Sunny Larkfield 52; Marigold Tumbletoes 47; Booker Quillfeather 37; Fennick Oddsworth 33; (unassigned) 16
Stages: New 75; Long-Term Nurture 62; Warm 33; (blank) 21; Active Buyer 10; Hot 10; In Escrow 9; Appointment Booked 9
Top sources: Import 40; Zillow 37; Website 28; Open House 27; Facebook Ads 26

### Quiet Nurture, No Touch In 180+ Days

Size 205 (also in an earlier segment: 65). Emailable 187; callable 166; textable with documented consent 53. Suggested next move: email campaign.
No communication on record: 62.
By agent: Sunny Larkfield 59; Pell Mossgrove 46; Marigold Tumbletoes 33; Fennick Oddsworth 32; Booker Quillfeather 31; (unassigned) 4
Stages: Long-Term Nurture 205
Top sources: Website 35; Zillow 31; Import 29; Referral 26; Open House 20

## Cleanup Worklist

Rows: 645 (one per record that needs work; trash and rejected records left out).

| Action | Records |
|---|---|
| Pond Candidate | 178 |
| Agent Follow-Up Or Pond Decision | 86 |
| Merge Candidate | 76 |
| Fill Missing Phone | 68 |
| Set Stage | 66 |
| Review New-Lead Stage | 46 |
| Assign Agent | 36 |
| Fill Missing Email | 35 |
| Review Shared Contact Info | 21 |
| Fix Invalid Phone | 11 |
| Fix Stage | 8 |
| Fix Invalid Email | 7 |
| Review Possible Duplicate (Name Only) | 6 |
| Archive Candidate | 1 |


| Assigned agent | Worklist rows |
|---|---|
| Pell Mossgrove | 159 |
| Sunny Larkfield | 129 |
| Booker Quillfeather | 109 |
| Marigold Tumbletoes | 109 |
| Fennick Oddsworth | 92 |
| (unassigned) | 46 |
| (pond) | 1 |

