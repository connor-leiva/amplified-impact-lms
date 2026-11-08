# Recruiting Prep: Pelican Example Group Pipeline

## Bottom Line

46 opportunity rows are 44 unique agents; 2 are on DND, leaving 42 to work: 7 in A, 9 in B, 15 in C and 11 in D under your rules, on production only. Start with the 7 A agents (Avery has 3, Jordan has 4), who lean listing-side, then the 9 B agents, who lean buyer-side. Six contacts have documented text consent; everyone else gets email first.

## Flags

- **About the notes:** I can't use the Recruiter Notes or anyone's personal circumstances to move people up or down, so the tiers below are your A to D rules applied to closed units and nothing else.
- **MLS data check:** the production fields say "MLS production report, closed 11/01/2025 to 10/31/2026." Confirm your MLS rules allow using that report for recruiting and putting it into an AI tool.
- **Notes left out:** 39 of the 46 rows have Recruiter Notes. I didn't read them into tiers, angles or drafts, and they aren't in the CSV. 11 rows (10 agents) hold personal details (kinds: marital status, family or familial status, health or disability, age, religion, national origin or citizenship, personal finances). Consider deleting those from GoHighLevel; they don't belong in a recruiting file.
- **Florida:** you're in Tampa, so Florida's texting rules apply on top of the federal ones, and Florida presumes a call to a Florida area code reaches a Florida resident (details under Check Before Sending).
- **No why-now signals:** this export has no prior-period production and no office history, so there's nothing in the data to show a change. Your tiers and the listing or buyer mix drive the angles.
- **Placeholders to fill:** [Agent Name], [Title], [Agent Phone], [Unsubscribe Link], [Sender Postal Address], and [your offer for this level] in each draft (no value proposition document was uploaded).

## What Was Merged

| File | Rows read |
|---|---|
| `ghl-agent-recruiting-opportunities.csv` (pipeline Agent Recruiting) | 46 |

46 rows minus 2 merges = **44 unique agents**.

| Merge rule | Merges | What they were |
|---|---|---|
| Same email | 2 | Rafe Teacuppocket (rows 10 and 44) and Rafe Tumblenoggin (rows 5 and 21) each have an open opportunity and an older lost one (created 2025-09-02) |

The two older lost rows carry "Old tracker estimate, 2025" in Production Source (16 and 3 units). That's a different period and source, so I used the current rows' MLS numbers (19 and 6 units) and show the old estimates in the CSV's Units Not Used (Source) column.

No possible duplicates. No roster was uploaded, and no one in the file lists Seagrape Example Realty as their current brokerage.

**Do not contact (2):** R043 Leon Crumpettoes and R044 Rafe Quillcrumb have DND set to true and a "dnd" tag. They stay in the CSV as "Do not contact" and get no draft.

## Tiers

**Your tiers,** applied to Closed Units 12 Mo (closed 11/01/2025 to 10/31/2026):

| Tier | Your rule | Agents | Units | Range | Volume | Listing / Buyer sides |
|---|---|---|---|---|---|---|
| A | 20 or more | 7 | 171 | 20 to 31 | $85,387,500 | 102 / 69 |
| B | 10 to 19 | 9 | 123 | 10 to 19 | $61,876,000 | 44 / 79 |
| C | 4 to 9 | 15 | 93 | 4 to 9 | $50,678,000 | 41 / 52 |
| D | under 4 | 11 | 21 | 0 to 3 | $9,764,500 | 9 / 12 |
| Do not contact | DND | 2 | | | | |

With the two DND contacts counted in, the tiers are A 7, B 10, C 15, D 12 (44).

**Tier A**

| ID | Name | Current Brokerage | Units | Volume | Listing / Buyer | Owner |
|---|---|---|---|---|---|---|
| R001 | Carla Tansyhopper | Maplewood Example Realty | 31 | $21,855,000 | 21 / 10 | Avery |
| R002 | Opal Cobblebottom | Summit Example Properties | 27 | $10,370,500 | 13 / 14 | Jordan |
| R003 | Tova Waffletoes | Bluegate Example Realty Group | 26 | $10,810,500 | 22 / 4 | Jordan |
| R004 | Lars Tansytoes | Pinecrest Example Homes | 24 | $8,155,000 | 9 / 15 | Avery |
| R005 | Hollis Teacupbloom | Granite Example Home Group | 22 | $13,972,000 | 10 / 12 | Avery |
| R006 | Gus Ripplepocket | Bluegate Example Realty Group | 21 | $11,467,500 | 10 / 11 | Jordan |
| R007 | Marta Ripplewhistle | Oakhaven Example Realty | 20 | $8,757,000 | 17 / 3 | Jordan |

**Tier B**

| ID | Name | Current Brokerage | Units | Volume | Owner |
|---|---|---|---|---|---|
| R008 | Rafe Teacuppocket | Silverline Example Realty | 19 | $10,541,500 | Avery |
| R009 | Selma Nettlefluff | Harborview Example Partners | 18 | $6,693,500 | Jordan |
| R010 | Zeke Waffledumple | Willowmere Example Properties | 16 | $6,077,500 | Jordan |
| R011 | Tess Bramblewobble | Bluegate Example Realty Group | 14 | $8,076,000 | Avery |
| R012 | Ava Marblehopper | Northfield Example Brokers | 13 | $7,106,000 | Avery |
| R013 | Willa Biscuitbottom | Harborview Example Partners | 12 | $7,244,000 | Jordan |
| R014 | Tobin Hobnobcrumb | Oakhaven Example Realty | 11 | $4,446,000 | Avery |
| R015 | Imani Ripplebottom | Maplewood Example Realty | 10 | $6,372,000 | Jordan |
| R016 | Lou Kettlesprout | Copperleaf Example Real Estate | 10 | $5,319,500 | Avery |

Tiers C and D are in the CSV with every number.

## Why Now

Nothing to report from this file: it has one period of production and one brokerage per agent. If you export an MLS report with prior-year production or an office history, I can add production changes and office moves.

## Owners by Tier

Every opportunity already has an Assigned To, and the split is already close to even, so I kept it:

| Tier | Avery Pelicanfeather | Jordan Seagrapebottom |
|---|---|---|
| A | 3 | 4 |
| B | 5 | 4 |
| C | 8 | 7 |
| D | 4 | 7 |
| **Total** | **20** | **22** |

If you'd rather even it out, moving one of Jordan's contacts to Avery does it. That's your call; I haven't changed anything in GoHighLevel.

## Angles and First-Touch Drafts

No value proposition document was uploaded, so each angle is a **general suggestion; replace it with your team's offer**, and each draft has a [your offer for this level] line. Drafts use [First Name] only, and nothing from the notes or anyone's production.

**Text consent:** 6 contacts have documented consent (an opt-in or signed form with a date): R001, R006 and R007 in A; R010 and R015 in B; R022 in C. 3 have a bare "Yes" with no record named (R005 in A; R018 and R021 in C): no text until you confirm a written record. Everyone else: email only.

### Tier A (7 agents)

**Angle (general suggestion):** top producers who lean listing-side (102 of 171 sides). Lead with listing support and time back.

**Email**

Subject: A Question About Your Listing Business

Hi [First Name],

I'm [Agent Name], [Title] with the Pelican Example Group at Seagrape Example Realty in Tampa. I'd like to hear what would give you more time on the listing side, and I'd value your take.

[Your offer for this level: one sentence on the listing support you give agents at this level.]

Would you be open to a 20-minute coffee in the next few weeks?

[Agent Name]
[Title], Pelican Example Group
Seagrape Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Pelican Example Group at Seagrape Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text (only to R001, R006, R007)**

Hi [First Name], it's [Agent First and Last Name] with the Pelican Example Group at Seagrape Example Realty. Would you be open to a 20-minute coffee to compare notes on listing support? [Agent Phone]. Reply STOP to opt out.

### Tier B (9 agents)

**Angle (general suggestion):** established agents who lean buyer-side (79 of 123 sides). Lead with lead flow and showing help.

**Email**

Subject: Coffee Next Week?

Hi [First Name],

I'm [Agent Name] with the Pelican Example Group at Seagrape Example Realty. I'd like to hear how you're finding buyers this year and what's taking more of your time than it should.

[Your offer for this level: one sentence on the lead flow or showing support you give agents at this level.]

If you're open to it, I'd love 20 minutes over coffee.

[Agent Name]
[Title], Pelican Example Group
Seagrape Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Pelican Example Group at Seagrape Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text (only to R010, R015)**

Hi [First Name], it's [Agent First and Last Name] with the Pelican Example Group at Seagrape Example Realty. Could we grab coffee and talk about how you're finding buyers this year? [Agent Phone]. Reply STOP to opt out.

### Tier C (15 agents)

**Angle (general suggestion):** growing agents with a mixed book (41 listing, 52 buyer sides). Lead with systems and help on each transaction.

**Email**

Subject: Comparing Notes On Your Business

Hi [First Name],

I'm [Agent Name] with the Pelican Example Group at Seagrape Example Realty. We spend a lot of time on how agents get support around each transaction, and I'd like to hear what would help you most.

[Your offer for this level: one sentence on the support you give agents at this level.]

Would a 20-minute call or coffee work this month?

[Agent Name]
[Title], Pelican Example Group
Seagrape Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Pelican Example Group at Seagrape Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text (only to R022)**

Hi [First Name], it's [Agent First and Last Name] with the Pelican Example Group at Seagrape Example Realty. Would a quick coffee this month work to compare notes on your business? [Agent Phone]. Reply STOP to opt out.

### Tier D (11 agents)

**Angle (general suggestion):** newer or part-time producers. Lead with training, lead sources and a clear path to the next deals.

**Email**

Subject: An Invitation To Talk About Your Next Year

Hi [First Name],

I'm [Agent Name] with the Pelican Example Group at Seagrape Example Realty. We work with agents who are building their business and want more support on each deal.

[Your offer for this level: one sentence on the training, leads or transaction support you give agents at this level.]

Would you like to grab coffee and talk about where you want your business to go?

[Agent Name]
[Title], Pelican Example Group
Seagrape Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Pelican Example Group at Seagrape Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text:** none. No contacts in this tier have documented text consent.

## The Organized CSV

`organized-recruit-list.csv`: 44 rows, one per unique agent, in tier order, with the GoHighLevel row numbers in Sources so you can trace each one. No notes column. Stage comes from the newest opportunity for each contact. Load it or filter it in GoHighLevel however you like; I haven't written to GoHighLevel.

## Check Before Sending

- **Numbers in this report:** 46 rows read; 2 merges by email; 44 unique; 2 DND; tier counts 7, 9, 15 and 11 (with DND: 7, 10, 15, 12); units and volumes per tier are sums of Closed Units 12 Mo and Closed Volume 12 Mo, recomputable from the CSV; owner counts from Assigned To.
- **Period:** every tier uses Closed Units 12 Mo from the MLS production report, closed 11/01/2025 to 10/31/2026. The two "Old tracker estimate, 2025" figures were not used.
- **Drafts:** no production numbers, notes or personal details; fill [your offer for this level] from your own documents, with no earnings or results claims.
- **Texts:** 6 recipients with documented consent (R001, R006, R007, R010, R015, R022). Check each record names Pelican Example Group or Seagrape Example Realty and the phone number. 3 held for a record (R005, R018, R021).
- **Florida (Florida Statutes 501.059):** Florida counts texts as telephonic sales calls and requires prior express written consent for a sales call or text that uses an automated system for selecting and dialing numbers, which is broader than the federal autodialer definition. Florida keeps a no sales solicitation calls list that includes Florida numbers on the National Registry. Once someone says they don't want calls or texts, don't contact them again. Whether Florida's 8 p.m. limit and three-per-24-hours rule in 501.616(6) reach a licensee's recruiting texts isn't clear: confirm with your broker or an attorney.
- **Before any call or text:** scrub against the National Do Not Call Registry, Florida's list and your internal do-not-call list; R043 and R044 are Do not contact.
- **Quiet hours:** texts only between 8 a.m. and 8 p.m. in the recipient's local time.
- **Email:** a working [Unsubscribe Link] (live at least 30 days), your real [Sender Postal Address], opt-outs honored within 10 business days.
- **MLS:** your MLS rules allow this use and an AI upload.
- **Notes cleanup:** remove the personal details from the 10 agents' Recruiter Notes in GoHighLevel.
