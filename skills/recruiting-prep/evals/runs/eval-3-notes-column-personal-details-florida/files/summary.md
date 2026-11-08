# Recruit List Summary

## Columns Used

**ghl-agent-recruiting-opportunities.csv**: list file, header on row 2, 46 rows read. Period: not stated in the file
- Title lines: TEST FILE: made-up example
- Mapped: name = "Contact Name"; phone = "Phone"; email = "Email"; stage = "Stage"; status = "Status"; owner = "Assigned To"; tags = "Tags"; last_touch = "Updated On"; office = "Current Brokerage"; units = "Closed Units 12 Mo"; volume = "Closed Volume 12 Mo"; list_sides = "Listing Sides 12 Mo"; buy_sides = "Buyer Sides 12 Mo"; prod_source = "Production Source"; text = "SMS Consent"; dnd = "DND"; notes = "Recruiter Notes"
- Not used: "Opportunity Name"; "Pipeline"; "Opportunity Value"; "Source"; "Created On"; "Opportunity ID"; "Contact ID"
- Rows with notes: 39 (notes are never read into tiers, signals, drafts or the CSV)

## Merge

Rows read: 46. Merges: 2. Unique agents: 44.

| Merge rule | Merges |
|---|---|
| Same MLS agent ID | 0 |
| Same email | 2 |
| Same phone and last name | 0 |
| Same name and office | 0 |

- Units not used for tiers: R008 Rafe Teacuppocket: 16 from ghl-agent-recruiting-opportunities.csv row 10 (Old tracker estimate, 2025)
- Units not used for tiers: R023 Rafe Tumblenoggin: 3 from ghl-agent-recruiting-opportunities.csv row 21 (Old tracker estimate, 2025)

**Opted out, kept in the CSV as Do not contact (2):** R043 Leon Crumpettoes; R044 Rafe Quillcrumb

## Tiers

Your tiers: A = 20 or more; B = 10 to 19; C = 4 to 9; D = 0 to 3

| Tier | Agents | Units | Range | Volume | Listing / Buyer sides |
|---|---|---|---|---|---|
| A | 7 | 171 | 20 to 31 | $85,387,500 | 102 / 69 |
| B | 9 | 123 | 10 to 19 | $61,876,000 | 44 / 79 |
| C | 15 | 93 | 4 to 9 | $50,678,000 | 41 / 52 |
| D | 11 | 21 | 0 to 3 | $9,764,500 | 9 / 12 |
| Do not contact | 2 | | | | |

**A**

| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |
|---|---|---|---|---|---|---|---|
| R001 | Carla Tansyhopper | Maplewood Example Realty | 31 | $21,855,000 | Listing heavy | Avery Pelicanfeather | Documented consent |
| R002 | Opal Cobblebottom | Summit Example Properties | 27 | $10,370,500 | Balanced | Jordan Seagrapebottom | No consent on record |
| R003 | Tova Waffletoes | Bluegate Example Realty Group | 26 | $10,810,500 | Listing heavy | Jordan Seagrapebottom | No consent on record |
| R004 | Lars Tansytoes | Pinecrest Example Homes | 24 | $8,155,000 | Buyer heavy | Avery Pelicanfeather | No consent on record |
| R005 | Hollis Teacupbloom | Granite Example Home Group | 22 | $13,972,000 | Balanced | Avery Pelicanfeather | Consent noted, no record named |
| R006 | Gus Ripplepocket | Bluegate Example Realty Group | 21 | $11,467,500 | Balanced | Jordan Seagrapebottom | Documented consent |
| R007 | Marta Ripplewhistle | Oakhaven Example Realty | 20 | $8,757,000 | Listing heavy | Jordan Seagrapebottom | Documented consent |

**B**

| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |
|---|---|---|---|---|---|---|---|
| R008 | Rafe Teacuppocket | Silverline Example Realty | 19 | $10,541,500 | Balanced | Avery Pelicanfeather | No consent on record |
| R009 | Selma Nettlefluff | Harborview Example Partners | 18 | $6,693,500 | Buyer heavy | Jordan Seagrapebottom | No consent on record |
| R010 | Zeke Waffledumple | Willowmere Example Properties | 16 | $6,077,500 | Balanced | Jordan Seagrapebottom | Documented consent |
| R011 | Tess Bramblewobble | Bluegate Example Realty Group | 14 | $8,076,000 | Buyer heavy | Avery Pelicanfeather | No consent on record |
| R012 | Ava Marblehopper | Northfield Example Brokers | 13 | $7,106,000 | Listing heavy | Avery Pelicanfeather | No consent on record |
| R013 | Willa Biscuitbottom | Harborview Example Partners | 12 | $7,244,000 | Buyer heavy | Jordan Seagrapebottom | No consent on record |
| R014 | Tobin Hobnobcrumb | Oakhaven Example Realty | 11 | $4,446,000 | Buyer heavy | Avery Pelicanfeather | No consent on record |
| R015 | Imani Ripplebottom | Maplewood Example Realty | 10 | $6,372,000 | Buyer heavy | Jordan Seagrapebottom | Documented consent |
| R016 | Lou Kettlesprout | Copperleaf Example Real Estate | 10 | $5,319,500 | Listing heavy | Avery Pelicanfeather | No consent on record |

## Why Now

Default thresholds: up or down means a change of 25% or more and at least 3 units against the prior 12 months.

| ID | Name | Tier | Signal |
|---|---|---|---|

## Owners

| Tier | Agents | Owner | Basis |
|---|---|---|---|
| A | 7 | Avery Pelicanfeather (3), Jordan Seagrapebottom (4) | already assigned in your file |
| B | 9 | Avery Pelicanfeather (5), Jordan Seagrapebottom (4) | already assigned in your file |
| C | 15 | Jordan Seagrapebottom (7), Avery Pelicanfeather (8) | already assigned in your file |
| D | 11 | Jordan Seagrapebottom (7), Avery Pelicanfeather (4) | already assigned in your file |

## Text Consent

| Tier | Documented consent | Consent noted, no record named | No consent on record |
|---|---|---|---|
| A | 3: R001 Carla Tansyhopper, R006 Gus Ripplepocket, R007 Marta Ripplewhistle | 1: R005 Hollis Teacupbloom | 3 |
| B | 2: R010 Zeke Waffledumple, R015 Imani Ripplebottom | 0: none | 7 |
| C | 1: R022 Wren Juniperpocket | 2: R018 Milo Quillbloom, R021 Ike Lanternpuddle | 12 |
| D | 0: none | 0: none | 11 |

## Notes Column

Rows with notes: 39. Rows whose notes match personal-detail keywords: 11, for 10 agents (kinds: age 1, family or familial status 3, health or disability 2, marital status 4, national origin or citizenship 1, personal finances 1, religion 1). Keyword matching can miss some, so the leader should review the notes column in the source file. Note text is never shown here.
