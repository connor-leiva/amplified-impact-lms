# List Mode: Reading, Merging and Tiering a Recruit List

How to turn one or more recruit files into one clean, tiered list. Do every count, merge and tier in code, then report the numbers. Every number in the output comes from the files or from math shown on them.

Last verified: 2026-11-08 (export menus and column notes below; sources at the end).

## Where Recruit Lists Come From

Map columns by meaning, not by exact header. Common sources:

- **MLS agent production report or roster export.** Columns vary by MLS. Look for: agent name (often "Last, First"), MLS agent ID, office name and office ID, listing sides and volume, buyer (selling or co-op) sides and volume, total sides or units and total volume, sometimes a prior-period total, phone and email. The report header or file name usually states the closed-date range and property types. Record it.
- **BrokerMetrics (Proficiency Metrics).** The Contact Information and Overview grids export through File > Export. The help pages say the "all transactions" columns cover the agent's last 12 complete calendar months, and the Growth columns compare that with the previous 12 months. Agent Movement shows agents who moved between offices in the same MLS in the last 365 days. Use these columns as they are; don't recompute them.
- **Sisu Recruiting & Onboarding.** Sisu tracks recruits like transactions (prospective recruits, new recruits, active agents, lost agents) with custom fields. Use the stage and any production custom fields; keep the user's stages as they are.
- **GoHighLevel opportunities export.** Opportunities > the three-dot menu > Export Opportunities (or a Smart List's Export). Expect opportunity name, contact name, phone, email, pipeline, stage, status (Open, Won, Lost, Abandoned), value, source, assigned user, tags, and any custom fields the team made (production, current brokerage, text consent). Opportunity value is not production; don't tier on it.
- **Follow Up Boss People export** (teams that track recruits with a stage or tag): People > All People, filter, select, Export. Expect Name, Stage, Tags, Assigned To, Email 1, Phone 1 and custom fields.
- **A team spreadsheet or tracker.** Free-form: name, brokerage, cell, email, approximate units, source, a text OK column, last touch, stage, notes. Treat its production numbers as self-reported unless it names an MLS source and period.

## Periods and Units

- **Trailing twelve months (TTM)** means the 12 months the source states (for BrokerMetrics, the last 12 complete calendar months). Name the exact dates in the output.
- Use each source's own unit definition and say what it is ("sides," "units," "transactions"). If one file counts a double-ended sale as one unit and another as two sides, don't combine them; tier on the MLS file and say why.
- Never tier with numbers from a different period (a calendar year, "approx units," a number from last year's tracker). Show them in their own column, labeled, and put agents with no TTM production data in "Not tiered: no production data for this period."

## Normalize, Then Merge

Normalize before matching:
- Names: "Last, First" to "First Last"; drop punctuation, suffixes (Jr, Sr, II, III) and extra spaces; compare in lowercase. Keep the best-formatted version for display.
- Emails: trim and lowercase.
- Phones: digits only, last 10 digits.
- Offices: lowercase; drop "LLC," "Inc," "the" and punctuation for comparison only.

Merge rows that share any of these, in this order, and record which rule merged each group:
1. The same MLS agent ID
2. The same email
3. The same phone and the same last name
4. The same full name and the same office

Do not merge rows that share only a name (same name, different offices, no shared phone or email). List them as "possible duplicates" for a person to check.

When rows merge:
- Production: take it from the MLS or production export. If one MLS agent ID appears under two offices in the same report, add the rows together for TTM and flag an office change.
- Contact details: keep every distinct email and phone; show the team's own file first.
- Stage, owner and last touch: from the team's own file.
- Consent and opt-out: from whichever file records it. An opt-out anywhere wins.

Report: rows read per file, rows merged, unique agents, merges by rule, possible duplicates, and removals.

## Removals

- **Already on the team:** any merged agent who matches the uploaded roster (by MLS ID, email, phone, or name plus office). Leave them out of tiers and drafts; list the count.
- **Opted out:** STOP, opted out, unsubscribed, Do Not Call, DND or similar in any file. Keep them in the CSV with Outreach Tier "Do not contact" and no owner. Never draft to them.
- **Notes:** free-text notes are never read for tiers, signals, angles or drafts and never copied into the CSV. If notes hold personal details, report the count of rows and the kinds (for example "family, health, age"), never the text.

## Consent for Texts

Read the consent field into one of four values:
- **Documented consent:** the field names a record (a signed form, an opt-in with a date, a source): for example "Yes, signed opt-in 2026-03-02." These contacts may get the text draft.
- **Consent noted, no record named:** a bare "yes," "Y," or a checked box. No text until the user confirms a written record exists; say how many.
- **No consent on record:** blank, "no," or no consent column at all. Email only.
- **Opted out:** see Removals.

A phone number is never consent. See `outreach-rules.md`.

## Tiers

**Team tiers first.** If the user or a file gives tier rules ("A is 20 or more closings"), apply them exactly, label them "your tiers," and use the team's names.

**Default tiers** (only when the team gives none). Build them from this list's spread of TTM units among unique agents with at least one unit, after removing the team's own agents and opted-out contacts:
- Find the 90th, 75th and 50th percentile of TTM units (nearest rank) and round each down to a whole number.
- Tier 1: at or above the 90th percentile cut. Tier 2: at or above the 75th, below Tier 1. Tier 3: at or above the 50th, below Tier 2. Tier 4: at least 1 unit, below Tier 3.
- No closed units in the period (an MLS row with zero): "No closings in period." No MLS row at all: "Not tiered: no production data."
- With fewer than 10 producing agents, skip percentiles: rank by units and say the list is too small for tiers.
- Label them every time: "Default tiers from this list's spread, not your team's rules. Tell me your tiers and I'll redo them." Show each cut point.

Tier on units. Show TTM volume, listing sides and buyer sides next to units, and the tier's totals. Units compare agents across price points; volume moves with price, so it's context, not the tier.

## Why-Now Signals

Only what the data shows, each with its source:
- **Office change:** one MLS agent ID under two offices in the report; the office in the MLS file differs from the brokerage in the team's file (give both and the team file's date if it has one); a movement or office-change column.
- **New production:** zero units in the prior period, some in this one.
- **Production up or down:** TTM against the prior 12 months when the file has both. Default threshold: a change of 25% or more and at least 3 units. Say it's a default.
- **Listing or buyer heavy:** 60% or more of sides on one side. This shapes the angle, not the priority.

Never infer anything about a person's life, finances, family or plans. A production drop is a data point for the leader, not a story, and never appears in a draft.

## Owners

When a roster with roles is uploaded, suggest (labeled "suggested"):
- Tier 1: the team leader or owner
- Tier 2: the recruiting director or recruiter (the team leader if there is none)
- Tiers 3 and 4: the appointment setter or ISA for the first touch, handing booked appointments to the recruiter
- Not tiered: the appointment setter, to confirm current production first

Keep any owner already assigned in the files. Split a tier between two people with the same role alphabetically by last name, and say so. Without a roster: [Owner].

## The Organized CSV

One row per unique agent. Columns, in this order:

Recruit ID, Name, Office (MLS), Brokerage (Your List), Sources, Merge Rule, TTM Units, TTM Volume, Listing Sides, Buyer Sides, Prior 12 Mo Units, Period, Outreach Tier, Tier Basis, Why Now, Suggested Owner, Email, Other Emails, Phone, Other Phones, Text Status, Contact Status, Stage (Your List), Last Touch (Your List), Possible Duplicate Of, Self-Reported Units (Not Used)

- Sources: file and row numbers, so a person can trace every merge.
- Tier Basis: "Your tiers" or "Default tiers."
- Text Status: one of the four consent values above.
- Contact Status: "OK to email" or "Do not contact."
- No notes column, no free text from notes, nothing personal.

## Sources

Checked 2026-11-08.
- BrokerMetrics help, Export: https://metrics.terradatum.com/help/export.htm
- BrokerMetrics help, Proficiency Metrics Overview View: https://metrics.terradatum.com/help/recruiting_overview.htm
- BrokerMetrics help, Contact Information: https://metrics.terradatum.com/help/recruiting_contact_information.htm
- BrokerMetrics help, Growth Analysis: https://metrics.terradatum.com/help/recruiting_growth_analysis.htm
- BrokerMetrics help, Agent Movement: https://metrics.terradatum.com/help/recruiting_agent_movement.htm
- Sisu, How does Sisu Recruiting work?: https://kb.sisu.co/en/articles/4856432-how-does-sisu-recruiting-work
- Sisu, Overview of Sisu Recruiting: https://kb.sisu.co/en/articles/4856387-overview-of-sisu-s-recruiting-onboarding-add-on
- HighLevel, Opportunities FAQs (export): https://help.gohighlevel.com/support/solutions/articles/155000002000-opportunities-faqs
- HighLevel, Smart Lists in Opportunities (export a Smart List): https://help.gohighlevel.com/support/solutions/articles/155000007734-smart-lists-in-opportunities
- HighLevel, Importing Opportunities (field names and statuses): https://help.gohighlevel.com/support/solutions/articles/155000002517-importing-opportunities
- Follow Up Boss, Export Contacts to a Spreadsheet: https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet

Not confirmed: the exact column headers of a GoHighLevel opportunities export or a Sisu recruit export (no account to export from). Map by meaning, and confirm with the vendor's support if a column is unclear.
