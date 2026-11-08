# List Mode: Reading, Merging and Tiering a Recruit List

How to turn one or more recruit files into one clean, tiered list. `list-code.md` applies every rule below in code; this file is what the code does and why, so the output can explain it. Every number in the output comes from the files or from math shown on them.

Last verified: 2026-11-08 (export menus and column notes below; sources at the end).

## Where Recruit Lists Come From

Map columns by meaning, not by exact header. Common sources:

- **MLS agent production report or roster export.** Columns vary by MLS. Look for: agent name (often "Last, First"), MLS agent ID, office name and office ID, listing sides and volume, buyer (selling or co-op) sides and volume, total sides or units and total volume, sometimes a prior-period total, phone and email. The report header or file name usually states the closed-date range and property types. Record it. Some reports end with a totals row; it is not an agent.
- **BrokerMetrics (Proficiency Metrics).** The Contact Information and Overview grids export through File > Export. The help pages say the "all transactions" columns cover the agent's last 12 complete calendar months, and the Growth Analysis view compares the last twelve complete months with the previous twelve. Agent Movement shows agents who moved between offices in the same MLS in the last 365 days. Use these columns as they are; don't recompute them.
- **Sisu Recruiting & Onboarding.** Sisu tracks recruits like transactions (prospective recruits, new recruits, active agents, lost agents) with custom fields. On the Recruits page, the Download icon on the right exports the recruits currently displayed to a spreadsheet, with the columns from the Recruit Overview form. Use the stage and any production custom fields; keep the user's stages as they are.
- **GoHighLevel opportunities export.** Opportunities, then the three-dot (kebab) menu at the top right, then Export Opportunities; or open a Smart List and use its three-dot menu, Export. Expect opportunity name, contact name, phone, email, pipeline, stage, status (Open, Won, Lost, Abandoned), value, source, assigned user, tags, and any custom fields the team made (production, current brokerage, text consent). Opportunity value is not production; don't tier on it.
- **Follow Up Boss People export** (teams that track recruits with a stage or tag): People > All People, filter to the recruits, check the box next to Name and Select All, Export, check All Columns, Yes, Export People. Expect Name, Stage, Tags, Assigned To, Email 1, Phone 1 and custom fields.
- **A team spreadsheet or tracker.** Free-form: name, brokerage, cell, email, approximate units, source, a text OK column, last touch, stage, notes. Treat its production numbers as self-reported unless it names an MLS source and period.

## Periods and Units

- **Trailing twelve months (TTM)** means the 12 months the source states (for BrokerMetrics, the last 12 complete calendar months). Name the exact dates in the output.
- Use each source's own unit definition and say what it is ("sides," "units," "transactions"). If one file counts a double-ended sale as one unit and another as two sides, don't combine them; tier on the MLS file and say why.
- Never tier with numbers from a different period (a calendar year, "approx units," a number from last year's tracker). Show them in the CSV's Units Not Used column, labeled, and put agents with no TTM production in "Not tiered: no production data."
- A list file with a production column (a GoHighLevel or Sisu custom field) counts for tiers only when a production source column names an MLS or production report for the period. A source that says estimate, approximate, self-reported or tracker does not.

## Normalize, Then Merge

Normalize before matching:
- Names: "Last, First" to "First Last"; drop punctuation, suffixes (Jr, Sr, II, III) and extra spaces; compare in lowercase. Keep the best-formatted version for display.
- Emails: trim and lowercase.
- Phones: digits only, last 10 digits.
- Offices: lowercase; drop "LLC," "Inc," "the" and punctuation for comparison only. One office name inside the other counts as the same office.

Merge rows that share any of these, in this order, and record which rule merged each group:
1. The same MLS agent ID
2. The same email
3. The same phone and the same last name
4. The same full name and the same office

A phone or email on more than 3 different people's rows is an office line or shared inbox: never use it to match. MLS rosters often list an office number for agents without a direct line.

Do not merge rows that share only a name (same name, different offices, no shared phone or email). List them as "possible duplicates" for a person to check.

When rows merge:
- Production: take it from the MLS or production export. When one agent has more than one production row:
  - same office and the same numbers: a repeated row; keep one
  - two different offices: add the rows together for TTM and flag an office change
  - same office, different numbers: don't add them; use the larger row for the tier and flag it for a person to check
- Contact details: keep every distinct email and phone; show the team's own file first.
- Stage, owner and last touch: from the team's own file (the most recent last touch when there are several).
- Consent and opt-out: from whichever file records it. An opt-out anywhere wins.

Report: rows read per file, merges by rule, unique agents, possible duplicates, and removals.

## Removals and Holds

- **Already on the team:** any merged agent who matches the uploaded roster (by MLS ID, email, phone, or name plus the team's brokerage). Leave them out of tiers, drafts and the CSV; list them.
- **At your own brokerage, not on the roster:** keep them in tiers, mark "Hold: at your brokerage," and keep them out of drafts until the user says. Without a roster, every agent whose office is the user's brokerage is held this way.
- **Opted out:** STOP, opted out, unsubscribed, Do Not Call, DND or similar in any consent, opt-out, tag, stage or status field. Keep them in the CSV with Outreach Tier "Do not contact" and no owner. Never draft to them.
- **Notes:** free-text notes are never read for tiers, signals, angles or drafts and never copied into the CSV. The code counts rows whose notes match personal-detail keywords (family or familial status, including pregnancy; marital status; age; health or disability; religion; national origin or citizenship; race; sexual orientation or gender identity; personal finances) and reports the count and kinds only. Keywords can miss some, so tell the user to review the column in the source.

## Consent for Texts

Read the consent field into one of four values:
- **Documented consent:** the field names a record (a signed form, an opt-in with a date, a source): for example "Yes, signed opt-in 2026-03-02." These contacts may get the text draft.
- **Consent noted, no record named:** a bare "yes," "Y," or a checked box. No text until the user confirms a written record exists; say how many.
- **No consent on record:** blank, "no," or no consent column at all. Email only.
- **Opted out:** see Removals.

A phone number is never consent. See `outreach-rules.md`.

## Tiers

**Team tiers first.** If the user or a file gives tier rules ("A is 20 or more closings"), apply them exactly, label them "Your tiers," and use the team's names. If the team's value proposition or offer document is organized by production level ("Growing: 12 to 24 sides"), use those levels as the tiers, label them "Your offer document's levels," and use each level's offer in that tier's angle and draft. If the rules and the document disagree, use the rules and say so.

**Default tiers** (only when the team gives none). Built from this list's spread of TTM units among unique agents with at least one unit, after removing the team's own agents and opted-out contacts:
- The 90th, 75th and 50th percentile of TTM units (nearest rank: rank = the percentile times the count, rounded up).
- Tier 1: at or above the 90th percentile. Tier 2: at or above the 75th, below Tier 1. Tier 3: at or above the 50th, below Tier 2. Tier 4: at least 1 unit, below Tier 3.
- Zero closed units in the period (a production row with zero): "No closings in period." No production row at all: "Not tiered: no production data."
- With fewer than 10 producing agents, skip percentiles: rank by units and say the list is too small for tiers.
- Label them every time: "Default tiers from this list's spread, not your team's rules. Tell me your tiers and I'll redo them." Show each cut point.

Tier on units. Show TTM volume, listing sides and buyer sides next to units, and the tier's totals. Units compare agents across price points; volume moves with price, so it's context, not the tier.

## Why-Now Signals

Only what the data shows, each with its source:
- **Office change:** one agent under two offices in the production report; the office in the production report differs from the brokerage in the team's file (give both and the team file's last touch date); a movement or office-change column.
- **New production:** zero units in the prior period, some in this one.
- **Production up or down:** TTM against the prior 12 months when the file has both. Default threshold: a change of 25% or more and at least 3 units. Say it's a default.
- **Side mix:** with at least 5 units, 60% or more listing sides is "Listing heavy," 40% or less is "Buyer heavy," otherwise "Balanced." This shapes the angle, not the priority.

Never infer anything about a person's life, finances, family or plans. A production drop is a data point for the leader, not a story, and never appears in a draft. An office difference between files can also mean the team's file is out of date.

## Owners

Keep any owner already assigned in the files. When the user names owners, use them; several names split a tier by recruit last name. When a roster with roles is uploaded, suggest (labeled "suggested"):
- The top tier: the team leader or owner
- The second tier: the recruiting director or recruiter (the team leader if there is none)
- Lower tiers, no closings and not tiered: the appointment setter or ISA for the first touch, handing booked appointments to the recruiter (the recruiter, then the team leader, if there is no setter)

Two people with the same role split the tier by recruit last name. Without a roster or names: [Owner].

## The Organized CSV

One row per unique agent (roster members left out). Columns, in this order:

Recruit ID, Name, Office (Production Report), Brokerage (Your List), Sources, Merge Rule, TTM Units, TTM Volume, Listing Sides, Buyer Sides, Prior 12 Mo Units, Period, Outreach Tier, Tier Basis, Why Now, Side Mix, Suggested Owner, Email, Other Emails, Phone, Other Phones, Text Status, Contact Status, Stage (Your List), Last Touch (Your List), Possible Duplicate Of, Units Not Used (Source), Flags

- Sources: file and row numbers, so a person can trace every merge.
- Tier Basis: "Your tiers," "Your offer document's levels" or "Default tiers."
- Text Status: one of the four consent values above.
- Contact Status: "OK to email," "Hold: at your brokerage" or "Do not contact."
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
- Sisu, Recruiting & Onboarding: Recruits Page Overview (June 8, 2026; Download icon): https://kb-app.sisu.co/en/articles/15361806-recruiting-onboarding-recruits-page-overview
- HighLevel, Opportunities FAQs (export; modified April 21, 2026): https://help.gohighlevel.com/support/solutions/articles/155000002000-opportunities-faqs
- HighLevel, Smart Lists in Opportunities (export a Smart List): https://help.gohighlevel.com/support/solutions/articles/155000007734-smart-lists-in-opportunities
- HighLevel, Importing Opportunities (field names and statuses): https://help.gohighlevel.com/support/solutions/articles/155000002517-importing-opportunities
- Follow Up Boss, Export Contacts to a Spreadsheet (updated April 21, 2026): https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet

Not confirmed: the exact column headers of a GoHighLevel opportunities export or a Sisu recruits download (no account to export from), and the menus of any particular MLS's production report. Map by meaning, check the Columns Used section, and confirm with the vendor's or the MLS's support if a column is unclear.
