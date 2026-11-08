# Recruit List Summary

## Columns Used

**mls-agent-production-report.csv**: production file, header on row 3, 150 rows read. Period: 11/01/2025 to 10/31/2026
- Title lines: TEST FILE: made-up example / Agent Production Report Tri-County Example MLS Closed 11/01/2025 to 10/31/2026 All residential property types Generated 11/03/2026
- Mapped: mls_id = "Agent MLS ID"; name = "Agent Name"; office = "Office Name"; phone = "Agent Phone"; email = "Agent Email"; list_sides = "List Sides"; list_vol = "List Volume"; buy_sides = "Sell Sides"; buy_vol = "Sell Volume"; units = "Total Sides"; volume = "Total Volume"; prior_units = "Prior 12 Mo Total Sides"; prior_volume = "Prior 12 Mo Total Volume"
- Not used: "Office MLS ID"
- Rows with notes: 0 (notes are never read into tiers, signals, drafts or the CSV)

**recruit-tracker.xlsx**: list file, header on row 2, 55 rows read. Period: not stated in the file
- Title lines: TEST FILE: made-up example
- Mapped: name = "Name"; office = "Brokerage"; phone = "Cell"; email = "Email"; approx_units = "Approx Units"; text = "Text OK?"; last_touch = "Last Touch"; stage = "Stage"; notes = "Notes"
- Not used: "Source"
- Rows with notes: 48 (notes are never read into tiers, signals, drafts or the CSV)

## Merge

Rows read: 205. Merges: 36. Unique agents: 169.

| Merge rule | Merges |
|---|---|
| Same MLS agent ID | 3 |
| Same email | 18 |
| Same phone and last name | 10 |
| Same name and office | 5 |

- Repeated production row kept once: R078 Flo Parsniphopper (TCX20641)
- Two offices in the production report, rows added together: R047 Ezra Pickletoes (TCX20550), 11 units across Pinecrest Example Homes and Granite Example Home Group
- Two offices in the production report, rows added together: R065 Arlo Picklecrumb (TCX20557), 8 units across Pinecrest Example Homes and Silverline Example Realty

**Possible duplicates (same name, no shared ID, email or phone; not merged):**
- R011 Viggo Biscuitbutton (Maplewood Example Realty; mls-agent-production-report.csv row 91) / R162 Viggo Biscuitbutton (Oakhaven Example Realty; recruit-tracker.xlsx row 29)
- R123 Dot Kettlenook (Silverline Example Realty; mls-agent-production-report.csv row 135) / R144 Dot Kettlenook (Bluegate Example Realty Group; recruit-tracker.xlsx row 45)

**On your team, removed (3):** Joss Teacuppocket (Team Leader); Freya Gumdropbloom (Buyer Agent); Kenji Pepperpuddle (Buyer Agent)

**Opted out, kept in the CSV as Do not contact (3):** R164 Marta Lanternbottom; R165 Mae Hobnobnoggin; R166 Delia Kettlemuffin

## Tiers

Default tiers from this list's spread (nearest rank among 134 agents with at least 1 unit, after removing your team and opted-out contacts): 90th percentile = rank 121 = 23 units; 75th = rank 101 = 15; 50th = rank 67 = 8.
Tier 1: 23 or more. Tier 2: 15 to 22. Tier 3: 8 to 14. Tier 4: 1 to 7.

| Tier | Agents | Units | Range | Volume | Listing / Buyer sides |
|---|---|---|---|---|---|
| Tier 1 | 18 | 543 | 23 to 52 | $272,918,000 | 270 / 273 |
| Tier 2 | 16 | 299 | 15 to 22 | $143,426,000 | 156 / 143 |
| Tier 3 | 40 | 395 | 8 to 14 | $175,203,500 | 214 / 181 |
| Tier 4 | 60 | 206 | 1 to 7 | $92,323,500 | 93 / 113 |
| No closings in period | 8 | 0 | | | |
| Not tiered: no production data | 21 | | | | |
| Do not contact | 3 | | | | |
| On your team (removed) | 3 | | | | |

**Tier 1**

| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |
|---|---|---|---|---|---|---|---|
| R001 | Zeke Cloverbloom | Riverbend Example Realty | 52 | $27,070,000 | Balanced | Joss Teacuppocket | No consent on record |
| R002 | Tobin Cobblehopper | Oakhaven Example Realty | 48 | $18,623,500 | Buyer heavy | Joss Teacuppocket | No consent on record |
| R003 | Kenji Juniperpuddle | Silverline Example Realty | 47 | $26,857,000 | Balanced | Joss Teacuppocket | No consent on record |
| R004 | Nicolas Peppernoggin | Foxglove Example Realty | 39 | $17,989,500 | Balanced | Joss Teacuppocket | No consent on record |
| R005 | Theodora Ripplehopper | Pinecrest Example Homes | 34 | $19,357,500 | Listing heavy | Joss Teacuppocket | No consent on record |
| R006 | Remy Cobblewobble | Granite Example Home Group | 32 | $19,035,000 | Buyer heavy | Joss Teacuppocket | No consent on record |
| R007 | Hattie Dapplemuffin | Granite Example Home Group | 31 | $18,279,500 | Buyer heavy | Joss Teacuppocket | No consent on record |
| R008 | Emil Tumblesprout | Harborview Example Partners | 26 | $10,536,000 | Balanced | Joss Teacuppocket | No consent on record |
| R009 | Tova Noodlebutton | Riverbend Example Realty | 25 | $15,190,000 | Listing heavy | Joss Teacuppocket | No consent on record |
| R010 | Abe Gumdropsprout | Copperleaf Example Real Estate | 24 | $6,919,500 | Listing heavy | Joss Teacuppocket | No consent on record |
| R011 | Viggo Biscuitbutton | Maplewood Example Realty | 24 | $10,856,500 | Balanced | Joss Teacuppocket | No consent on record |
| R012 | Ben Kettledumple | Foxglove Example Realty | 23 | $9,965,500 | Balanced | Joss Teacuppocket | No consent on record |
| R013 | Joss Fiddlebloom | Bluegate Example Realty Group | 23 | $14,299,500 | Buyer heavy | Joss Teacuppocket | No consent on record |
| R014 | Kaia Ripplepuddle | Willowmere Example Properties | 23 | $12,346,500 | Balanced | Joss Teacuppocket | No consent on record |
| R015 | Kenji Puddingbloom | Silverline Example Realty | 23 | $6,914,000 | Listing heavy | Joss Teacuppocket | No consent on record |
| R016 | Mae Tansytoes | Pinecrest Example Homes | 23 | $11,938,000 | Balanced | Joss Teacuppocket | No consent on record |
| R017 | Mae Thimblecrumb | Riverbend Example Realty | 23 | $13,120,500 | Buyer heavy | Joss Teacuppocket | No consent on record |
| R018 | Marta Puddingmuffin | Granite Example Home Group | 23 | $13,620,000 | Listing heavy | Joss Teacuppocket | No consent on record |

**Tier 2**

| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |
|---|---|---|---|---|---|---|---|
| R019 | Lena Cloversprout | Riverbend Example Realty | 22 | $11,012,500 | Listing heavy | Pax Noodlebottom | No consent on record |
| R020 | Pia Wafflenook | Riverbend Example Realty | 21 | $7,929,000 | Listing heavy | Pax Noodlebottom | No consent on record |
| R021 | Arlo Saffronbloom | Bluegate Example Realty Group | 20 | $12,138,000 | Listing heavy | Pax Noodlebottom | No consent on record |
| R022 | Zora Lanternwobble | Lakeshore Example Homes | 20 | $9,673,000 | Buyer heavy | Pax Noodlebottom | No consent on record |
| R023 | Ben Brambletoes | Pinecrest Example Homes | 19 | $5,921,000 | Buyer heavy | Pax Noodlebottom | No consent on record |
| R024 | Cleo Marblesnout | Lakeshore Example Homes | 19 | $11,931,000 | Buyer heavy | Pax Noodlebottom | No consent on record |
| R025 | Emil Quibblewobble | Northfield Example Brokers | 19 | $8,560,500 | Balanced | Pax Noodlebottom | No consent on record |
| R026 | Rosa Picklenook | Riverbend Example Realty | 19 | $6,781,500 | Balanced | Pax Noodlebottom | No consent on record |
| R027 | Uma Bramblesprout | Willowmere Example Properties | 19 | $7,583,000 | Balanced | Pax Noodlebottom | No consent on record |
| R028 | Walt Marblenoggin | Granite Example Home Group | 19 | $12,701,500 | Balanced | Pax Noodlebottom | No consent on record |
| R029 | Juno Quillpuddle | Foxglove Example Realty | 18 | $5,355,000 | Listing heavy | Pax Noodlebottom | No consent on record |
| R030 | Remy Puddingbottom | Pinecrest Example Homes | 18 | $5,887,000 | Listing heavy | Pax Noodlebottom | No consent on record |
| R031 | Juno Lanterndumple | Harborview Example Partners | 17 | $10,192,500 | Listing heavy | Pax Noodlebottom | No consent on record |
| R032 | Nell Gumdropdumple | Riverbend Example Realty | 17 | $10,263,500 | Balanced | Pax Noodlebottom | No consent on record |
| R033 | Petra Teacupbloom | Lakeshore Example Homes | 17 | $8,841,500 | Listing heavy | Pax Noodlebottom | No consent on record |
| R034 | Bianca Biscuitwobble | Copperleaf Example Real Estate | 15 | $8,655,500 | Buyer heavy | Pax Noodlebottom | No consent on record |

## Why Now

Default thresholds: up or down means a change of 25% or more and at least 3 units against the prior 12 months.

| ID | Name | Tier | Signal |
|---|---|---|---|
| R002 | Tobin Cobblehopper | Tier 1 | New production: 48 this period, 0 in the prior 12 months |
| R012 | Ben Kettledumple | Tier 1 | Down: 23 against 35 in the prior 12 months |
| R016 | Mae Tansytoes | Tier 1 | Up: 23 against 18 in the prior 12 months |
| R024 | Cleo Marblesnout | Tier 2 | Up: 19 against 15 in the prior 12 months |
| R034 | Bianca Biscuitwobble | Tier 2 | Up: 15 against 12 in the prior 12 months |
| R039 | Cyrus Thimblemuffin | Tier 3 | Up: 12 against 8 in the prior 12 months |
| R040 | Ivy Kettlepocket | Tier 3 | Down: 12 against 16 in the prior 12 months |
| R042 | Kenji Noodlenoggin | Tier 3 | Up: 12 against 3 in the prior 12 months |
| R047 | Ezra Pickletoes | Tier 3 | Listed under two offices in the production report (Pinecrest Example Homes and Granite Example Home Group); all prior-period sides are under Pinecrest Example Homes, so the move looks like Pinecrest Example Homes to Granite Example Home Group |
| R048 | Jules Saffronbutton | Tier 3 | Your list says Silverline Example Realty (last touch 2026-05-30); the production report shows Willowmere Example Properties |
| R050 | Ezra Puddingtoes | Tier 3 | Up: 10 against 7 in the prior 12 months |
| R051 | Hugo Kettlebutton | Tier 3 | Down: 10 against 14 in the prior 12 months |
| R065 | Arlo Picklecrumb | Tier 3 | Listed under two offices in the production report (Pinecrest Example Homes and Silverline Example Realty); all prior-period sides are under Pinecrest Example Homes, so the move looks like Pinecrest Example Homes to Silverline Example Realty |
| R067 | Finn Sorrelwhistle | Tier 3 | Your list says Harborview Example Partners (last touch 2026-07-06); the production report shows Riverbend Example Realty |
| R073 | Wren Teacupwobble | Tier 3 | Down: 8 against 11 in the prior 12 months |
| R080 | Tova Nettlebutton | Tier 4 | Down: 7 against 10 in the prior 12 months |
| R090 | Quin Lanternmuffin | Tier 4 | Your list says Harborview Example Partners (last touch 2026-08-16); the production report shows Maplewood Example Realty |
| R119 | Walt Mittennook | Tier 4 | Your list says Northfield Example Brokers (last touch 2026-03-17); the production report shows Oakhaven Example Realty |
| R128 | Hugo Kettlesnout | Tier 4 | New production: 1 this period, 0 in the prior 12 months |

## Owners

| Tier | Agents | Owner | Basis |
|---|---|---|---|
| Tier 1 | 18 | Joss Teacuppocket (18) | suggested from roster roles |
| Tier 2 | 16 | Pax Noodlebottom (16) | suggested from roster roles |
| Tier 3 | 40 | Mira Tumblecrumb (40) | suggested from roster roles |
| Tier 4 | 60 | Mira Tumblecrumb (60) | suggested from roster roles |
| No closings in period | 8 | Mira Tumblecrumb (8) | suggested from roster roles |
| Not tiered: no production data | 21 | Mira Tumblecrumb (21) | suggested from roster roles |

## Text Consent

| Tier | Documented consent | Consent noted, no record named | No consent on record |
|---|---|---|---|
| Tier 1 | 0: none | 0: none | 18 |
| Tier 2 | 0: none | 0: none | 16 |
| Tier 3 | 2: R035 Ned Tumblesnout, R036 Vera Wafflesprout | 0: none | 38 |
| Tier 4 | 3: R080 Tova Nettlebutton, R100 Ola Thimblebutton, R118 Sam Nettlewobble | 3: R087 Hollis Parsnippocket, R101 Orrin Sorrelsnout, R134 Zeke Quillbutton | 54 |
| No closings in period | 0: none | 0: none | 8 |
| Not tiered: no production data | 2: R145 Fay Tansysprout, R163 Yuki Biscuitbottom | 2: R151 Joss Nettlefluff, R157 Pip Tumblebottom | 17 |

## Notes Column

Rows with notes: 48. Rows whose notes match personal-detail keywords: 2, for 2 agents (kinds: family or familial status 1, marital status 1, personal finances 1). Keyword matching can miss some, so the leader should review the notes column in the source file. Note text is never shown here.

Self-reported units shown in the CSV but never used for tiers: 37 agents.
