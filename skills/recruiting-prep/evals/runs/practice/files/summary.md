# Recruit List Summary

## Columns Used

**PRACTICE Recruit List.xlsx [MLS Export]**: production file, header on row 3, 71 rows read. Period: 11/01/2025 to 10/31/2026
- Title lines: PRACTICE FILE: made-up example / Agent Production Report Bayside Example MLS Closed 11/01/2025 to 10/31/2026 All residential property types Generated 11/02/2026
- Mapped: mls_id = "Agent MLS ID"; name = "Agent Name"; office = "Office Name"; phone = "Agent Phone"; email = "Agent Email"; list_sides = "List Sides"; list_vol = "List Volume"; buy_sides = "Sell Sides"; buy_vol = "Sell Volume"; units = "Total Sides"; volume = "Total Volume"; prior_units = "Prior 12 Mo Total Sides"; prior_volume = "Prior 12 Mo Total Volume"
- Not used: "Office MLS ID"
- Rows with notes: 0 (notes are never read into tiers, signals, drafts or the CSV)

**PRACTICE Recruit List.xlsx [Our List]**: list file, header on row 2, 31 rows read. Period: not stated in the file
- Title lines: PRACTICE FILE: made-up example
- Mapped: name = "Name"; office = "Brokerage"; phone = "Cell"; email = "Email"; approx_units = "Approx Units"; text = "Text OK?"; last_touch = "Last Touch"; stage = "Stage"; notes = "Notes"
- Rows with notes: 22 (notes are never read into tiers, signals, drafts or the CSV)

## Merge

Rows read: 102. Merges: 19. Unique agents: 83.

| Merge rule | Merges |
|---|---|
| Same MLS agent ID | 2 |
| Same email | 9 |
| Same phone and last name | 8 |
| Same name and office | 0 |

- Repeated production row kept once: R065 Kit Parsniptoes (BSX50219)
- Two offices in the production report, rows added together: R054 Joss Cloversnout (BSX50439), 3 units across Foxglove Example Realty and Harborview Example Partners

**Opted out, kept in the CSV as Do not contact (1):** R083 Yara Cloversprout

**At your brokerage (Marigold Example Realty) and not on your roster (1), held from drafts:** R020 Dev Crumpetnook

## Tiers

Your offer document's levels: Established (25+ sides) = 25 or more; Growing (12 to 24 sides) = 12 to 24; Building (0 to 11 sides) = 0 to 11

| Tier | Agents | Units | Range | Volume | Listing / Buyer sides |
|---|---|---|---|---|---|
| Established (25+ sides) | 5 | 185 | 26 to 55 | $81,421,000 | 93 / 92 |
| Growing (12 to 24 sides) | 14 | 239 | 12 to 22 | $99,314,000 | 112 / 127 |
| Building (0 to 11 sides) | 49 | 260 | 0 to 11 | $107,477,500 | 119 / 141 |
| Not tiered: no production data | 14 | | | | |
| Do not contact | 1 | | | | |

**Established (25+ sides)**

| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |
|---|---|---|---|---|---|---|---|
| R001 | Pip Lanternpuddle | Willowmere Example Properties | 55 | $28,702,500 | Balanced | [Owner] | No consent on record |
| R002 | Juno Puddingbottom | Copperleaf Example Real Estate | 42 | $12,350,000 | Balanced | [Owner] | No consent on record |
| R003 | Jules Hobnobtoes | Foxglove Example Realty | 33 | $16,863,000 | Balanced | [Owner] | No consent on record |
| R004 | Hugo Parsnipmuffin | Lakeshore Example Homes | 29 | $10,214,500 | Buyer heavy | [Owner] | No consent on record |
| R005 | Dev Tansymuffin | Copperleaf Example Real Estate | 26 | $13,291,000 | Listing heavy | [Owner] | No consent on record |

**Growing (12 to 24 sides)**

| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |
|---|---|---|---|---|---|---|---|
| R006 | Cleo Lanternsnout | Bluegate Example Realty Group | 22 | $9,945,500 | Listing heavy | [Owner] | No consent on record |
| R007 | Marisol Quillpocket | Copperleaf Example Real Estate | 22 | $9,033,500 | Listing heavy | [Owner] | Documented consent |
| R008 | Arlo Clovertoes | Oakhaven Example Realty | 21 | $8,964,500 | Listing heavy | [Owner] | No consent on record |
| R009 | Wren Waffletoes | Northfield Example Brokers | 21 | $6,983,500 | Buyer heavy | [Owner] | No consent on record |
| R010 | Hattie Mittendumple | Foxglove Example Realty | 20 | $10,430,000 | Buyer heavy | [Owner] | No consent on record |
| R011 | Viggo Picklefluff | Foxglove Example Realty | 19 | $7,938,500 | Buyer heavy | [Owner] | No consent on record |
| R012 | Greer Gumdropsprout | Lakeshore Example Homes | 18 | $8,570,500 | Buyer heavy | [Owner] | No consent on record |
| R013 | Abe Junipermuffin | Maplewood Example Realty | 16 | $4,541,500 | Balanced | [Owner] | No consent on record |
| R014 | Petra Cloverhopper | Harborview Example Partners | 16 | $7,279,500 | Buyer heavy | [Owner] | No consent on record |
| R015 | Orrin Marblesnout | Granite Example Home Group | 15 | $7,904,000 | Listing heavy | [Owner] | No consent on record |
| R016 | Milo Tumblefluff | Pinecrest Example Homes | 13 | $3,997,000 | Buyer heavy | [Owner] | No consent on record |
| R017 | Ben Wafflewhistle | Pinecrest Example Homes | 12 | $4,286,000 | Balanced | [Owner] | No consent on record |
| R018 | Gwen Mittennoggin | Oakhaven Example Realty | 12 | $4,627,500 | Buyer heavy | [Owner] | No consent on record |
| R019 | Nora Juniperhopper | Lakeshore Example Homes | 12 | $4,812,500 | Listing heavy | [Owner] | No consent on record |

## Why Now

Default thresholds: up or down means a change of 25% or more and at least 3 units against the prior 12 months.

| ID | Name | Tier | Signal |
|---|---|---|---|
| R005 | Dev Tansymuffin | Established (25+ sides) | Your list says Pinecrest Example Homes (last touch 2026-04-20); the production report shows Copperleaf Example Real Estate; Up: 26 against 18 in the prior 12 months |
| R007 | Marisol Quillpocket | Growing (12 to 24 sides) | Up: 22 against 17 in the prior 12 months |
| R010 | Hattie Mittendumple | Growing (12 to 24 sides) | Up: 20 against 14 in the prior 12 months |
| R018 | Gwen Mittennoggin | Growing (12 to 24 sides) | Down: 12 against 16 in the prior 12 months |
| R028 | Flo Dapplewhistle | Building (0 to 11 sides) | Up: 9 against 6 in the prior 12 months |
| R034 | Suki Fiddlecrumb | Building (0 to 11 sides) | Down: 8 against 11 in the prior 12 months |
| R054 | Joss Cloversnout | Building (0 to 11 sides) | Listed under two offices in the production report (Foxglove Example Realty and Harborview Example Partners); all prior-period sides are under Harborview Example Partners, so the move looks like Harborview Example Partners to Foxglove Example Realty |
| R060 | Rafe Kettlesprout | Building (0 to 11 sides) | New production: 2 this period, 0 in the prior 12 months |

## Owners

| Tier | Agents | Owner | Basis |
|---|---|---|---|
| Established (25+ sides) | 5 | [Owner] (5) | no roster |
| Growing (12 to 24 sides) | 14 | [Owner] (14) | no roster |
| Building (0 to 11 sides) | 49 | [Owner] (49) | no roster |
| Not tiered: no production data | 14 | [Owner] (14) | no roster |

## Text Consent

| Tier | Documented consent | Consent noted, no record named | No consent on record |
|---|---|---|---|
| Established (25+ sides) | 0: none | 0: none | 5 |
| Growing (12 to 24 sides) | 1: R007 Marisol Quillpocket | 0: none | 13 |
| Building (0 to 11 sides) | 1: R022 Uma Marblebottom | 1: R065 Kit Parsniptoes | 47 |
| Not tiered: no production data | 1: R074 Flo Noodlebloom | 0: none | 13 |

## Notes Column

Rows with notes: 22. Rows whose notes match personal-detail keywords: 1, for 1 agent (kinds: family or familial status 1, personal finances 1). Keyword matching can miss some, so the leader should review the notes column in the source file. Note text is never shown here.

Self-reported units shown in the CSV but never used for tiers: 24 agents.
