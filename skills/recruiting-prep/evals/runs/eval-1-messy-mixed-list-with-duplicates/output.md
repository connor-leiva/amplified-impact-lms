# Recruiting Prep: Cardinal Example Team Recruit List

## Bottom Line

Your 205 rows are 169 unique agents; after taking out the 3 already on your team and the 3 who opted out, the rest break into 18 Tier 1, 16 Tier 2, 40 Tier 3, 60 Tier 4, 8 with no closings in the period and 21 with no MLS production data. The first calls are Joss on the 18 Tier 1 agents and Pax on the 16 in Tier 2, starting with the four whose production is new or up this period (R002, R016, R024, R034). No one in Tiers 1 or 2 has documented text consent, so their first touch is email, or a call after a Do Not Call scrub.

## Flags

- **MLS data check:** `mls-agent-production-report.csv` is a Tri-County Example MLS Agent Production Report. Confirm your MLS rules allow using this report for recruiting and putting it into an AI tool before you work this list.
- **Two kinds of numbers:** production comes only from the MLS report (closed 11/01/2025 to 10/31/2026, all residential property types, counted in sides). The tracker's "Approx Units" column is self-reported: it's in the CSV under Units Not Used and never sets a tier.
- **Notes left out:** 48 tracker rows have notes. I didn't read the Notes column into tiers, signals, angles or drafts, and it isn't in the CSV. 2 of those rows hold personal details (kinds: family or familial status, marital status, personal finances); consider deleting them from the tracker.
- **Placeholders to fill:** [Agent Name], [Title], [Agent Phone], [Unsubscribe Link], [Sender Postal Address], and [your offer for this level] in each draft, because no value proposition document was uploaded.
- **State rules:** the files don't say where your contacts are. If any are in Florida, Maryland or Oklahoma, those states add texting rules; for every other state, rules were not checked: confirm with your broker.

## What Was Merged

| File | Rows read |
|---|---|
| MLS report (`mls-agent-production-report.csv`) | 150 |
| Tracker (`recruit-tracker.xlsx`) | 55 |
| **Total** | **205** |

205 rows minus 36 merges = **169 unique agents**.

| Merge rule | Merges | What they were |
|---|---|---|
| Same MLS agent ID | 3 | One row pasted twice (R078 Flo Parsniphopper, TCX20641: identical, kept once) and two agents listed under two offices (R047 Ezra Pickletoes, TCX20550, and R065 Arlo Picklecrumb, TCX20557: rows added together) |
| Same email | 18 | Tracker rows matched to MLS agents, plus tracker rows entered twice with different capitalization or phone format |
| Same phone and last name | 10 | Tracker rows matched by cell number, including "Nico" (MLS: R004 Nicolas Peppernoggin) and "Theo" (MLS: R005 Theodora Ripplehopper) |
| Same name and office | 5 | Tracker rows with no phone or email whose brokerage matches the MLS office |

**Possible duplicates, not merged (please check):**
- Viggo Biscuitbutton: R011 in the MLS report (Maplewood Example Realty, MLS row 91) and R162 in the tracker (Oakhaven Example Realty, tracker row 29), with a different phone and email.
- Dot Kettlenook: R123 in the MLS report (Silverline Example Realty, MLS row 135) and R144 in the tracker (Bluegate Example Realty Group, tracker row 45), with a different phone and email.

Same name at different offices with no shared contact can be two people. If they're the same person, tell me and I'll merge them.

**Removed:**
- **On your team (3):** Joss Teacuppocket (Team Leader), Freya Gumdropbloom and Kenji Pepperpuddle (Buyer Agents) appear in the MLS report and match your roster. They're out of the tiers, the drafts and the CSV.
- **Opted out (3):** R164 Marta Lanternbottom ("STOP" in Text OK?), R165 Mae Hobnobnoggin ("opted out") and R166 Delia Kettlemuffin ("DNC"). They stay in the CSV as Do not contact so nobody re-adds them, and they get no draft.

## Tiers

**Default tiers from this list's spread, not your team's rules.** Tell me your tiers and I'll redo them.

How the cut points were set: 134 workable agents had at least one closed side in the MLS report. Sorted by sides, the 90th percentile (nearest rank: the 121st of 134) is 23 sides, the 75th (101st) is 15, and the 50th (67th) is 8.

| Tier | Rule | Agents | Sides | Range | Volume | Listing / Buyer sides |
|---|---|---|---|---|---|---|
| Tier 1 | 23 sides or more | 18 | 543 | 23 to 52 | $272,918,000 | 270 / 273 |
| Tier 2 | 15 to 22 | 16 | 299 | 15 to 22 | $143,426,000 | 156 / 143 |
| Tier 3 | 8 to 14 | 40 | 395 | 8 to 14 | $175,203,500 | 214 / 181 |
| Tier 4 | 1 to 7 | 60 | 206 | 1 to 7 | $92,323,500 | 93 / 113 |
| No closings in period | 0 sides in the MLS report | 8 | 0 | | | |
| Not tiered | no MLS production data (tracker only) | 21 | | | | |
| Do not contact | opted out | 3 | | | | |

Tiers use sides, so agents at different price points with the same workload land together; volume is shown for context.

**Tier 1**

| ID | Name | Office (MLS) | Sides | Volume | Side mix | Owner |
|---|---|---|---|---|---|---|
| R001 | Zeke Cloverbloom | Riverbend Example Realty | 52 | $27,070,000 | Balanced | Joss Teacuppocket |
| R002 | Tobin Cobblehopper | Oakhaven Example Realty | 48 | $18,623,500 | Buyer heavy | Joss Teacuppocket |
| R003 | Kenji Juniperpuddle | Silverline Example Realty | 47 | $26,857,000 | Balanced | Joss Teacuppocket |
| R004 | Nicolas Peppernoggin | Foxglove Example Realty | 39 | $17,989,500 | Balanced | Joss Teacuppocket |
| R005 | Theodora Ripplehopper | Pinecrest Example Homes | 34 | $19,357,500 | Listing heavy | Joss Teacuppocket |
| R006 | Remy Cobblewobble | Granite Example Home Group | 32 | $19,035,000 | Buyer heavy | Joss Teacuppocket |
| R007 | Hattie Dapplemuffin | Granite Example Home Group | 31 | $18,279,500 | Buyer heavy | Joss Teacuppocket |
| R008 | Emil Tumblesprout | Harborview Example Partners | 26 | $10,536,000 | Balanced | Joss Teacuppocket |
| R009 | Tova Noodlebutton | Riverbend Example Realty | 25 | $15,190,000 | Listing heavy | Joss Teacuppocket |
| R010 | Abe Gumdropsprout | Copperleaf Example Real Estate | 24 | $6,919,500 | Listing heavy | Joss Teacuppocket |
| R011 | Viggo Biscuitbutton | Maplewood Example Realty | 24 | $10,856,500 | Balanced | Joss Teacuppocket |
| R012 | Ben Kettledumple | Foxglove Example Realty | 23 | $9,965,500 | Balanced | Joss Teacuppocket |
| R013 | Joss Fiddlebloom | Bluegate Example Realty Group | 23 | $14,299,500 | Buyer heavy | Joss Teacuppocket |
| R014 | Kaia Ripplepuddle | Willowmere Example Properties | 23 | $12,346,500 | Balanced | Joss Teacuppocket |
| R015 | Kenji Puddingbloom | Silverline Example Realty | 23 | $6,914,000 | Listing heavy | Joss Teacuppocket |
| R016 | Mae Tansytoes | Pinecrest Example Homes | 23 | $11,938,000 | Balanced | Joss Teacuppocket |
| R017 | Mae Thimblecrumb | Riverbend Example Realty | 23 | $13,120,500 | Buyer heavy | Joss Teacuppocket |
| R018 | Marta Puddingmuffin | Granite Example Home Group | 23 | $13,620,000 | Listing heavy | Joss Teacuppocket |

**Tier 2**

| ID | Name | Office (MLS) | Sides | Volume | Side mix | Owner |
|---|---|---|---|---|---|---|
| R019 | Lena Cloversprout | Riverbend Example Realty | 22 | $11,012,500 | Listing heavy | Pax Noodlebottom |
| R020 | Pia Wafflenook | Riverbend Example Realty | 21 | $7,929,000 | Listing heavy | Pax Noodlebottom |
| R021 | Arlo Saffronbloom | Bluegate Example Realty Group | 20 | $12,138,000 | Listing heavy | Pax Noodlebottom |
| R022 | Zora Lanternwobble | Lakeshore Example Homes | 20 | $9,673,000 | Buyer heavy | Pax Noodlebottom |
| R023 | Ben Brambletoes | Pinecrest Example Homes | 19 | $5,921,000 | Buyer heavy | Pax Noodlebottom |
| R024 | Cleo Marblesnout | Lakeshore Example Homes | 19 | $11,931,000 | Buyer heavy | Pax Noodlebottom |
| R025 | Emil Quibblewobble | Northfield Example Brokers | 19 | $8,560,500 | Balanced | Pax Noodlebottom |
| R026 | Rosa Picklenook | Riverbend Example Realty | 19 | $6,781,500 | Balanced | Pax Noodlebottom |
| R027 | Uma Bramblesprout | Willowmere Example Properties | 19 | $7,583,000 | Balanced | Pax Noodlebottom |
| R028 | Walt Marblenoggin | Granite Example Home Group | 19 | $12,701,500 | Balanced | Pax Noodlebottom |
| R029 | Juno Quillpuddle | Foxglove Example Realty | 18 | $5,355,000 | Listing heavy | Pax Noodlebottom |
| R030 | Remy Puddingbottom | Pinecrest Example Homes | 18 | $5,887,000 | Listing heavy | Pax Noodlebottom |
| R031 | Juno Lanterndumple | Harborview Example Partners | 17 | $10,192,500 | Listing heavy | Pax Noodlebottom |
| R032 | Nell Gumdropdumple | Riverbend Example Realty | 17 | $10,263,500 | Balanced | Pax Noodlebottom |
| R033 | Petra Teacupbloom | Lakeshore Example Homes | 17 | $8,841,500 | Listing heavy | Pax Noodlebottom |
| R034 | Bianca Biscuitwobble | Copperleaf Example Real Estate | 15 | $8,655,500 | Buyer heavy | Pax Noodlebottom |

Tiers 3 and 4, the 8 with no closings and the 21 not tiered are in the CSV with every number.

## Why Now

Only what the files show. "Up" and "down" use a default threshold: a change of 25% or more and at least 3 sides against the MLS report's prior 12 months.

**Office changes**

| ID | Agent | Tier | What the data shows |
|---|---|---|---|
| R047 | Ezra Pickletoes | Tier 3 | Listed under two offices in the MLS report: Pinecrest Example Homes and Granite Example Home Group. All prior-period sides are under Pinecrest, so the move looks like Pinecrest to Granite. 11 sides across both rows. |
| R065 | Arlo Picklecrumb | Tier 3 | Listed under Pinecrest Example Homes and Silverline Example Realty. All prior-period sides are under Pinecrest, so the move looks like Pinecrest to Silverline. 8 sides across both rows. |
| R048 | Jules Saffronbutton | Tier 3 | Your tracker says Silverline Example Realty (last touch 2026-05-30); the MLS report shows Willowmere Example Properties. |
| R067 | Finn Sorrelwhistle | Tier 3 | Tracker: Harborview Example Partners (last touch 2026-07-06); MLS report: Riverbend Example Realty. |
| R090 | Quin Lanternmuffin | Tier 4 | Tracker: Harborview Example Partners (last touch 2026-08-16); MLS report: Maplewood Example Realty. |
| R119 | Walt Mittennook | Tier 4 | Tracker: Northfield Example Brokers (last touch 2026-03-17); MLS report: Oakhaven Example Realty. |

An office that differs between files can also mean the tracker is out of date. Confirm before you mention it to anyone, and never in a first-touch message.

**Production changes (MLS report, this period against the prior 12 months)**

| ID | Agent | Tier | Signal |
|---|---|---|---|
| R002 | Tobin Cobblehopper | Tier 1 | New production: 48 sides, 0 in the prior 12 months |
| R016 | Mae Tansytoes | Tier 1 | Up: 23 against 18 |
| R012 | Ben Kettledumple | Tier 1 | Down: 23 against 35 |
| R024 | Cleo Marblesnout | Tier 2 | Up: 19 against 15 |
| R034 | Bianca Biscuitwobble | Tier 2 | Up: 15 against 12 |
| R042 | Kenji Noodlenoggin | Tier 3 | Up: 12 against 3 |
| R039 | Cyrus Thimblemuffin | Tier 3 | Up: 12 against 8 |
| R050 | Ezra Puddingtoes | Tier 3 | Up: 10 against 7 |
| R040 | Ivy Kettlepocket | Tier 3 | Down: 12 against 16 |
| R051 | Hugo Kettlebutton | Tier 3 | Down: 10 against 14 |
| R073 | Wren Teacupwobble | Tier 3 | Down: 8 against 11 |
| R080 | Tova Nettlebutton | Tier 4 | Down: 7 against 10 |
| R128 | Hugo Kettlesnout | Tier 4 | New production: 1 side, 0 in the prior 12 months |

A drop is a data point for your planning, not a story about the person, and it never goes in a message.

## Owners by Tier

Suggested from your roster's roles:

| Tier | Agents | Suggested owner |
|---|---|---|
| Tier 1 | 18 | Joss Teacuppocket, Team Leader |
| Tier 2 | 16 | Pax Noodlebottom, Recruiting Director |
| Tier 3 | 40 | Mira Tumblecrumb, Appointment Setter (ISA), first touch; booked appointments go to Pax |
| Tier 4 | 60 | Mira Tumblecrumb, first touch; booked appointments go to Pax |
| No closings in period | 8 | Mira Tumblecrumb |
| Not tiered | 21 | Mira Tumblecrumb, to confirm current production before anything else |

## Angles and First-Touch Drafts

No value proposition document was uploaded, so each angle below is a **general suggestion; replace it with your team's offer**, and each draft has a [your offer for this level] line for you to fill. Every draft uses [First Name] only: no one's production, office or move appears in a message.

**Text consent across the list:** 7 contacts have documented consent (a form or opt-in with a date): 2 in Tier 3, 3 in Tier 4, 2 not tiered. 5 have a bare "yes" or "Y" with no record named (3 in Tier 4, 2 not tiered): no text until you confirm a written record. Everyone else is email only.

### Tier 1 (18 agents, owner Joss)

**Angle (general suggestion):** top producers with a near even listing and buyer mix (270 of 543 sides are listing sides). Lead with leverage and time back, not leads.

Subject: A Quick Question About Your Next Year

Hi [First Name],

I'm [Agent Name], [Title] of the Cardinal Example Team at Lanternbrook Example Realty. I'd like to hear how you want your business to run next year, and I'd value your perspective.

[Your offer for this level: one sentence on the support you give agents at this level.]

Would you be open to a 20-minute coffee in the next few weeks? I'm happy to come to you.

[Agent Name]
[Title], Cardinal Example Team
Lanternbrook Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Cardinal Example Team at Lanternbrook Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text:** none. No contacts in this tier have documented text consent.

### Tier 2 (16 agents, owner Pax)

**Angle (general suggestion):** established producers. Lead with what would make the next stage easier: transaction and listing support, and the economics as your documents state them.

Subject: Coffee Next Week?

Hi [First Name],

I'm [Agent Name] with the Cardinal Example Team at Lanternbrook Example Realty. I'd like to hear what's working in your business and what's taking more of your time than it should.

[Your offer for this level: one sentence on the support you give agents at this level.]

If you're open to it, I'd love 20 minutes over coffee. No pitch deck, just a conversation.

[Agent Name]
[Title], Cardinal Example Team
Lanternbrook Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Cardinal Example Team at Lanternbrook Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text:** none. No contacts in this tier have documented text consent.

### Tier 3 (40 agents, owner Mira for first touch)

**Angle (general suggestion):** growing agents with a slight listing lean (214 of 395 sides). Lead with listing support and systems.

Subject: Comparing Notes On Listing Support

Hi [First Name],

I'm [Agent Name] with the Cardinal Example Team at Lanternbrook Example Realty. We spend a lot of time on how agents get support around listings and transactions, and I'd like to compare notes with you.

[Your offer for this level: one sentence on the support you give agents at this level.]

Would a 20-minute call or coffee work sometime this month?

[Agent Name]
[Title], Cardinal Example Team
Lanternbrook Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Cardinal Example Team at Lanternbrook Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text (only to the 2 with documented consent: R035 Ned Tumblesnout, R036 Vera Wafflesprout)**

Hi [First Name], it's [Agent First and Last Name] with the Cardinal Example Team at Lanternbrook Example Realty. Would you be open to a 20-minute coffee this month to compare notes on listing support? [Agent Phone]. Reply STOP to opt out.

### Tier 4 (60 agents, owner Mira for first touch)

**Angle (general suggestion):** newer or part-time producers with a slight buyer lean (113 of 206 sides). Lead with lead sources, training and help on each transaction.

Subject: An Invitation To Talk About Your Business

Hi [First Name],

I'm [Agent Name] with the Cardinal Example Team at Lanternbrook Example Realty. We work with agents who are building their business and want more support on each deal.

[Your offer for this level: one sentence on the training, leads or transaction support you give agents at this level.]

Would you like to grab coffee and talk about where you want your business to go?

[Agent Name]
[Title], Cardinal Example Team
Lanternbrook Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Cardinal Example Team at Lanternbrook Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text (only to the 3 with documented consent: R080 Tova Nettlebutton, R100 Ola Thimblebutton, R118 Sam Nettlewobble)**

Hi [First Name], it's [Agent First and Last Name] with the Cardinal Example Team at Lanternbrook Example Realty. Would you be up for coffee to talk about where you want your business to go? [Agent Phone]. Reply STOP to opt out.

Held, no text yet: R087 Hollis Parsnippocket, R101 Orrin Sorrelsnout, R134 Zeke Quillbutton (bare "yes," no record named).

### No Closings in Period and Not Tiered (29 agents, owner Mira)

**First step:** confirm current production before choosing an angle. For the 21 not tiered, the tracker's approximate units are self-reported and weren't used.

Subject: Checking In From The Cardinal Example Team

Hi [First Name],

I'm [Agent Name] with the Cardinal Example Team at Lanternbrook Example Realty. I'd like to learn what you're focused on this year and share how our team works, in case it's ever useful to you.

[Your offer: one sentence on what you offer agents getting started or restarting.]

Would a short call work in the next couple of weeks?

[Agent Name]
[Title], Cardinal Example Team
Lanternbrook Example Realty
[Agent Phone]

This is a recruiting message from [Agent Name], Cardinal Example Team at Lanternbrook Example Realty.
To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link].
[Sender Postal Address]

**Text (only to the 2 with documented consent: R145 Fay Tansysprout, R163 Yuki Biscuitbottom)**

Hi [First Name], it's [Agent First and Last Name] with the Cardinal Example Team at Lanternbrook Example Realty. Could we set up a short call to hear what you're focused on this year? [Agent Phone]. Reply STOP to opt out.

Held, no text yet: R151 Joss Nettlefluff, R157 Pip Tumblebottom (bare "yes," no record named).

## The Organized CSV

`organized-recruit-list.csv`: 166 rows, one per unique agent (169 minus the 3 on your team), in tier order. Columns: Recruit ID, Name, Office (Production Report), Brokerage (Your List), Sources (file and row, so you can trace every merge), Merge Rule, TTM Units, TTM Volume, Listing Sides, Buyer Sides, Prior 12 Mo Units, Period, Outreach Tier, Tier Basis, Why Now, Side Mix, Suggested Owner, Email, Other Emails, Phone, Other Phones, Text Status, Contact Status, Stage (Your List), Last Touch (Your List), Possible Duplicate Of, Units Not Used (Source), Flags. No notes column.

If you load it into Follow Up Boss, Sisu or GoHighLevel, map the columns there; I haven't written to any system.

## Check Before Sending

- **Numbers in this report:** 150 and 55 rows read; 36 merges (3 + 18 + 10 + 5); 169 unique; 3 on your team; 3 opted out; cut points 23, 15 and 8 sides from 134 producing agents; tier counts 18, 16, 40, 60, 8 and 21; tier sides and volumes are sums of the MLS report's Total Sides and Total Volume, recomputable from the CSV.
- **Period:** every tier and signal uses the MLS report's closed dates, 11/01/2025 to 10/31/2026, and its Prior 12 Mo columns.
- **Drafts:** no production numbers, offices, dates or names other than [First Name], the team and the brokerage. Fill [your offer for this level] from your own documents; don't add results or earnings claims.
- **Texts:** 7 recipients with documented consent (R035, R036, R080, R100, R118, R145, R163). Check each record names your team or brokerage and the number. 5 held for a record (R087, R101, R134, R151, R157). Everyone else: email only.
- **Before any call or text:** scrub against the National Do Not Call Registry and your internal do-not-call list; R164, R165 and R166 are Do not contact.
- **Quiet hours:** texts only between 8 a.m. and 8 p.m. in the recipient's local time.
- **Email:** a working [Unsubscribe Link] that keeps working at least 30 days, your real [Sender Postal Address], and opt-outs honored within 10 business days.
- **MLS:** your MLS rules allow this use and an AI upload.
- **Possible duplicates:** R011 and R162 (Viggo Biscuitbutton), R123 and R144 (Dot Kettlenook), before Joss or Mira reach out.
- **State rules:** not checked for your contacts' states; confirm with your broker.
