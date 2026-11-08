# Recruiting Prep Guide

The rules behind every recruiting prep: how to read, merge and tier a recruit list (Part 1), what every recruiting email and text carries (Part 2), how to prep one recruiting conversation (Part 3), and the fair treatment, earnings claim, other-brokerage and MLS data rules (Part 4). Texting, email and Do Not Call rules are in outreach-rules.md, and the list code is in list-code.md, both files in this project.

Last verified: 2026-11-08. Each part keeps its own sources.

# Part 1: List Mode

How to turn one or more recruit files into one clean, tiered list. list-code.md applies every rule below in code; this part is what the code does and why, so the output can explain it. Every number in the output comes from the files or from math shown on them.

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

A phone number is never consent. See outreach-rules.md.

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

# Part 2: Outreach Drafts

Every recruiting email and text is marketing. Follow outreach-rules.md for the rules; this part turns them into the pieces every draft carries. Drafts only: the user sends.

Last verified: 2026-11-08. The legal points here come from outreach-rules.md (TCPA, CAN-SPAM, Florida, Maryland, Oklahoma, MLS rules) and Part 4 of this guide (NAR Code of Ethics, advertising rules, earnings claims), where each is sourced.

## Every Recruiting Email

- **From:** the real sender, [Agent Name], never a made-up persona.
- **Subject:** Title Case and honest about what the email is. Never "Re:" or "Fwd:" on a first touch. Good: "A Quick Question About Your Business," "Coffee Next Week?" Not: "Your Listing Inquiry."
- **Body:** under 150 words for a first touch. One reason for reaching out (the tier's angle), one specific thing the team offers at that level (from the team's document, or "[your offer for this level]"), one low-pressure ask (a 20-minute coffee or call).
- **About the sender and the team:** only what the files or the user's message say. No claims about how often the sender talks with agents, team size, years in business, rankings, awards or results ("I talk with a few agents each quarter" is made up unless a file says it). The name, title placeholder, team and brokerage are enough.
- **Merge fields:** [First Name] only. Never a recipient's own production numbers, ranking, office move, transaction addresses or anything else from the MLS data.
- **Signature:** [Agent Name], [Title], [Team Name], [Brokerage Name], [Agent Phone]. Real estate advertising rules generally require the licensee's status to be clear, and some states require the brokerage name; see Part 4 of this guide.
- **Footer, every email:**
  - "This is a recruiting message from [Agent Name], [Team Name] at [Brokerage Name]."
  - "To stop these emails, reply UNSUBSCRIBE or use this link: [Unsubscribe Link]."
  - "[Sender Postal Address]"

## Every Recruiting Text

Only for contacts with documented consent (see Part 1 of this guide). Then:
- Name the sender and the team: "Hi [First Name], it's [Agent First and Last Name] with [Team or Brokerage Name]."
- One sentence of reason, one ask. Under 300 characters before the opt-out line.
- A way to reach the sender: [Agent Phone].
- End with "Reply STOP to opt out."
- Send between 8 a.m. and 8 p.m. in the recipient's local time.

If a tier has no contact with documented consent, write no text for it and say: "No text draft: no contacts in this tier have documented text consent."

## Angles by Tier

An angle is the one reason this tier might want a conversation. Build it from the tier's production mix and the team's document:
- Mostly listing sides: listing support, marketing, time back.
- Mostly buyer sides: lead flow, showing help, conversion support.
- Highest tiers: leverage, economics as the team's documents state them, autonomy, growth path.
- Lower tiers: training, lead sources, support on each transaction.

Without a team document, label the angle "General suggestion; replace with your team's offer," and keep the draft's offer line as a placeholder.

**No closings in period and Not tiered** (no production row, so no level): write one shared email for these groups that uses only what the team's document says applies to every agent (how the team works, its schedule, what stays the agent's), or a general suggestion with "[your offer]" when there is no document. Never pick a level's offer for someone with no production data. Tell the user to check their production in the MLS before moving them to a tier. A text goes only to the contacts in these groups with documented consent, listed by ID.

Never build an angle on a production drop, a personal detail, a note, age, family or any personal trait. Never criticize the recipient's current brokerage, even indirectly ("tired of being ignored by your broker?").

## Words to Leave Out

No em dashes. None of "stunning," "dream," "don't hesitate to reach out," "game-changer," "unlimited income," "life-changing," "financial freedom," "passive income," "six figures" or any earnings or lifestyle phrase. No guarantees ("you'll double your business").

## Check Before Sending (Drafts)

List for the user:
- Every name, number, date and quoted line in the drafts, with its source
- Text recipients: the count with documented consent, the count waiting on a record, and the count excluded
- A Do Not Call scrub before any call or text, and the team's internal do-not-call list
- Quiet hours: 8 a.m. to 8 p.m. recipient local time
- A working unsubscribe link and the real postal address in place of the placeholders
- The MLS data-use check
- State rules: the notes in outreach-rules.md for Florida, Maryland and Oklahoma contacts; anywhere else, "state rules not checked; confirm with your broker"

# Part 3: Appointment Mode

How to prep a team leader or recruiter for one conversation with one agent. The candidate decides; the leader owns every offer. This prep makes the leader ready to listen well and answer from the team's own documents.

This part states no state or industry facts. The level guidance below is labeled general guidance every time it is used: a starting point for the leader's questions, not research. Rules on fair treatment, earnings claims and other brokerages, with sources, are in Part 4 of this guide (last verified 2026-11-08).

## Production Profile

From the candidate's production data only (a row in a list, an MLS agent production page, a transaction list):
- The period, named with its dates
- Total sides or units and total volume
- Listing sides and buyer sides, and the share of each (show the math)
- Average sale price: volume divided by units, shown as math. If a transaction list is uploaded, also give the lowest and highest sale price and the price band where most sales fall.
- The prior period, when the data has it, and the change in units and volume (show the math)
- Office and brokerage as the file shows them

Don't describe the person. Describe the business: "listing-heavy, mostly between $X and $Y, up 6 sides on the prior 12 months."

## What Agents at This Level Usually Need

Use the team's value proposition or offer document first. If it is organized by production level, find the candidate's level and quote that section with its name or page.

Where the team has no document, or the document doesn't cover a level, use the guidance below, and label every line of it "General guidance, not from your documents." It is a starting point for the leader's questions, not research and not a fact about this candidate.

- **0 to 5 sides a year:** training and a clear path to the first deals, lead sources they can work, accountability, help on each transaction.
- **6 to 15 sides:** steadier lead flow, systems and follow-up, transaction coordination, marketing support.
- **16 to 30 sides:** time back (transaction coordination, listing coordination, showing help), the economics of split, cap and fees, marketing and listing support, fewer administrative tasks.
- **Over 30 sides:** leverage (buyer agents, showing partners, administrative staff), economics, control of their own brand and database, a leadership or expansion path, and a culture that fits how they work.

These bands are by side count only and have no names, so they never get confused with the team's own level names. Listing-heavy agents often care most about listing support and marketing; buyer-heavy agents about lead flow and showing help. Say "often," because the conversation decides.

## Discovery Questions

Write eight to ten open questions, specific to this candidate's production mix. Cover:
- Goals for the next 12 months, in their words
- What's working in their business now, and what takes time they'd rather not spend
- Where their business comes from (sphere, past clients, leads, referrals)
- What support they have now, and what they'd change
- What would make a move worth it, and what would make it not worth it
- Their timeline for a decision, and who else is part of it (a business partner or their own advisor; never ask about a spouse or family)
- How their current agreement handles their listings, pending deals and leaving. That's for them to check with their broker or their own attorney; never interpret their agreement.

**Don't ask, and don't record if volunteered:** age or retirement plans, marriage or partner, children, pregnancy or family plans, health or disability, religion, national origin or citizenship, race, sexual orientation or gender identity, or personal finances. Keep the conversation on the business.

## How Your Offer Maps

A table: the candidate's likely need (from the profile and the level guidance), what the team's document says about it (quoted, with the section), and the gap ("Not in your documents"). Never fill a gap with a service, split, fee, lead count or result the documents don't state.

## Terms As Written

When the team's document or the user's message states the split, cap, fees or what they cover, put them in one block, word for word, with the source named ("From your one-pager, Splits, Cap and Fees:" or "From your message:"). It is what the leader hands over when the candidate asks "what are your numbers?"

- Quote; don't summarize, convert or combine terms.
- No math, no examples, no "at your volume." The candidate runs their own numbers with their own advisor.
- Brokerage fees and any revenue share or stock program: only the brokerage's official materials, if uploaded. Otherwise "[Brokerage fees: from your brokerage's official schedule]."
- If the document has no terms and the user stated none, write "Not in your documents" and leave the block out of the follow-up email.

## Objections and Answers

Choose the five to seven most likely, from this list and the files:
- **Split:** "My split is better where I am."
- **Cap and fees:** "Your cap is higher," "What do your fees cover?"
- **Brand:** "I've built my own name," "I don't want to be under a team brand."
- **Independence:** "I don't want someone telling me how to run my business."
- **Lead quality:** "Team leads are junk," "I don't need leads."
- **Culture:** "I don't want to be in meetings all day," "Teams churn agents."
- **Timing:** "Not this year," "After my listings close."
- **Revenue share or stock** (when the brokerage has a program): answer only with what the brokerage's official materials say, if uploaded; never an amount, an example or a projection.

Each answer follows one shape: acknowledge what's real in the objection, ask one question that gets to the need behind it, answer with what the team's documents say (quoted), and offer a next step. Where the documents say nothing, write "[Your answer: not in your documents]" and the question to ask instead. The acknowledgment speaks to this candidate only; no claims about what "most agents" feel or do. If the leader offers to introduce the candidate to someone on the team, add that no one should quote income, earnings or results.

Never:
- Compute what the candidate would earn, net, keep or save under the team's terms, even from their own numbers, and never compare their past income with a projected one. Point to the terms as written so the candidate can run their own numbers with their own advisor.
- Use an earnings or lifestyle claim from the team's documents ("our agents earn 30% more"). Flag it for broker review instead.
- Say anything negative about the candidate's current brokerage, broker or team, or repeat anything negative someone else said about them.
- Promise a number of leads, deals or a result.

## The Follow-Up Email

Written to send after the meeting:
- Title Case subject, honest about what the email is: "Great Talking With You About [Team Name]"
- Under 200 words. Thanks, then the two or three things the candidate said matter (business terms only, as placeholders if the meeting hasn't happened: "[What they said about listing support]"), what the team's documents say about each, the next step with [Day and Time], and anything the leader promised to send.
- No numbers about what they'd earn, no claims, nothing about their current brokerage.
- The compliance elements in Part 2 of this guide.
- If notes or a transcript from the meeting are uploaded or pasted, read them in full and fill the placeholders from them, business terms only. Leave out anything personal the candidate shared, even if they raised it, and never record it anywhere.
- Commitments the leader made in the meeting ("I'll send our terms") go in the email as sent items, and in Check before sending so nothing is promised that wasn't.

# Part 4: Recruiting Guardrails

Last verified: 2026-11-08. A plain-language summary for drafting and prep. It is not legal advice. Anything this file could not confirm says "confirm with your broker or an attorney."

Texting, email and Do Not Call rules are in outreach-rules.md. This part covers what is specific to recruiting.

## Fair Treatment: Production Only

Our rule: tier, prioritize, question and write about candidates on production and business facts only. Never on race, color, religion, sex, pregnancy, disability, familial status, marital status, national origin, age, sexual orientation, gender identity, genetic information, health, or any other personal trait, whatever a file or a user says. If asked to use one, decline in one line and keep going.

Why, from the sources checked:
- **NAR Code of Ethics, Article 10 (2026):** "REALTORS®, in their real estate employment practices, shall not discriminate against any person or persons on the basis of race, color, religion, sex, disability, familial status, national origin, sexual orientation, or gender identity." Standard of Practice 10-4: "real estate employment practices" relates to "employees and independent contractors providing real estate-related services." So it reaches recruiting agents who would join as independent contractors. It binds REALTORS®; others should follow it anyway.
- **EEOC (employers):** it is illegal for an employer to publish a job advertisement "that shows a preference for or discourages someone from applying for a job because of his or her race, color, religion, sex (including transgender status, sexual orientation, and pregnancy), national origin, age (40 or older), disability or genetic information," and illegal "to recruit new employees in a way that discriminates" on those grounds. The EEOC's example: an ad seeking "recent college graduates" may discourage people over 40.
- **Employees versus independent contractors:** the EEOC says that in most circumstances its laws protect employees, not independent contractors, and that the question is fact-specific. The IRS treats licensed real estate agents as statutory nonemployees (self-employed for federal tax purposes) when substantially all pay is tied to sales and a written contract says they won't be treated as employees. So which employment laws reach a given recruiting decision depends on the relationship: confirm with your broker or an attorney. Our rule doesn't depend on the answer.
- **42 U.S.C. 1981:** all persons have the same right "to make and enforce contracts" as white citizens, including "the making, performance, modification, and termination of contracts." An independent contractor agreement is a contract. Whether and how it applies to a given recruiting decision: confirm with an attorney.
- State and local laws may add protected traits. Not checked here: confirm with your broker or an attorney.

In practice:
- Never read free-text notes into a tier, a priority, an angle or a draft.
- Words that signal age or other traits stay out of drafts and angles: "young," "energetic," "digital native," "recent grads," "seasoned," "family-friendly," "mom," "retiring soon."
- Recruiting only from people like the current team (word of mouth from a similar group) can narrow who hears about the team. Tiers on production keep the list about the business.

## No Earnings Claims, Projections or Testimonials

Our rule: no income, earnings, savings, net or revenue-share projections, examples or testimonials, in any output, ever. Quote the brokerage's official disclosures only when the user uploads them, word for word, with the document named.

Why, from the source checked:
- The FTC's 2022 advance notice on deceptive or unfair earnings claims (87 FR 13951) summarizes what its cases establish: earnings claims "are material"; representations about possible earnings "are not mere puffery, and will usually imply that such earnings are typical"; a likely earnings amount "can be implied, including through testimonials from successful participants and examples of hypothetical or past profits"; and earnings claims "must be substantiated." It also describes lifestyle claims (that a money-making opportunity leads to a material change in lifestyle, "such as getting to go on expensive vacations, quitting your job, or buying a luxury car").
- Whether a team or brokerage recruiting pitch counts as a "money-making opportunity" under FTC rules is not settled by the sources checked here: confirm with your broker or an attorney. Our rule doesn't depend on the answer.
- Status as of 2026-11-08: the FTC's Semiannual Regulatory Agenda (91 FR 53156, August 14, 2026) still lists a "proposed Earnings Claims Trade Regulation Rule, to be codified at 16 CFR 462," and the eCFR (current through 2026-11-05) has no part 462. So no final earnings-claim rule is in force; the case law summarized above still is. Not checked: the FTC's multi-level marketing guidance (ftc.gov blocked automated access on 2026-11-08; open it in a browser when updating).

In practice:
- "At your volume you'd keep $X more with us" is a projection. So is "agents who join us earn 30% more." Neither appears in any draft or answer.
- Stating the team's own split, cap and fees exactly as its documents write them is fine. Doing math with them about a person is not.
- Flag any earnings, savings or lifestyle claim found in the team's documents for broker review.

## Other Brokerages and Professionals

- **NAR Code of Ethics, Article 15 (2026):** "REALTORS® shall not knowingly or recklessly make false or misleading statements about other real estate professionals, their businesses, or their business practices." Standard of Practice 15-2 extends this to republishing false or misleading statements made by others, in person, in writing or online.
- **NAR Code of Ethics, Article 12 (2026):** REALTORS® "shall be honest and truthful in their real estate communications" and "shall ensure that their status as real estate professionals is readily apparent in their advertising, marketing, and other representations."
- Our rule: never criticize or characterize the candidate's current brokerage, broker or team. Compare only what the team's own documents say about the team.
- Never suggest a candidate bring client lists, leads, transaction files or other materials from their current brokerage. What they may take, and what happens to their listings and pending deals, depends on their agreement: that's for their broker or their own attorney.

## Advertising Rules That May Reach Recruiting Messages

- State license laws set advertising rules, and they differ. Example: the Texas Real Estate Commission's Rule 535.155 requires each advertisement to show the name of the license holder or team placing it and the broker's name in at least half the size of the largest contact information for any sales agent, associated broker or team name.
- Whether your state treats a recruiting email or text as advertising, and how a team name must appear: confirm with your broker. Our drafts always sign with the sender, the team and the brokerage name.

## MLS Data

outreach-rules.md covers the general rule (check your own MLS rules before using production data for recruiting or putting it into an AI tool) and two MLSs that restrict use. One more example of how much rules vary:
- **Bay East MLS Rules (effective December 1, 2025), Section 12.11.1:** "Use of the MLS information to investigate, identify, source, and recruit potential MLS Participants and/or Subscribers to a different brokerage is permitted." The same rules (Section 12.12) treat MLS information as confidential and bar distributing compilations to anyone other than Participants and Subscribers.
- So one MLS expressly permits recruiting use while others limit data to licensed activities or bar sharing it with AI tools. Always ask the user to confirm their own MLS's rules.
- Never quote a recipient's MLS production back to them in a recruiting message.

## Sources

All checked 2026-11-08.
- NAR, 2026 Code of Ethics and Standards of Practice (Articles 10, 12, 15; Standards 10-4, 15-2): https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice
- EEOC, Prohibited Employment Policies/Practices (Job Advertisements; Recruitment): https://www.eeoc.gov/prohibited-employment-policiespractices
- EEOC Compliance Manual, Section 2: Threshold Issues (who is an employee): https://www.eeoc.gov/laws/guidance/section-2-threshold-issues
- IRS, Statutory Nonemployees: https://www.irs.gov/businesses/small-businesses-self-employed/statutory-nonemployees
- 42 U.S.C. 1981: https://www.law.cornell.edu/uscode/text/42/1981
- FTC, Deceptive or Unfair Earnings Claims, advance notice of proposed rulemaking, 87 FR 13951 (Mar. 11, 2022): https://www.govinfo.gov/content/pkg/FR-2022-03-11/html/2022-04679.htm
- Texas Real Estate Commission, required information in advertisements (Rule 535.155): https://www.trec.texas.gov/what-required-information-must-be-provided-advertisements-such-signs-email-and-business-cards
- Bay East MLS Rules, effective December 1, 2025 (Sections 12.11.1 and 12.12): https://bayeast.org/wp-content/uploads/Bay-East-MLS-Rules_Effective_12012025_CLEAN.pdf
- FTC, Semiannual Regulatory Agenda, 91 FR 53156 (Aug. 14, 2026): https://www.govinfo.gov/content/pkg/FR-2026-08-14/html/2026-16617.htm
- eCFR, Title 16, Chapter I (no part 462 as of 2026-11-05): https://www.ecfr.gov/current/title-16/chapter-I
- FTC, Business Guidance Concerning Multi-Level Marketing (could not be loaded on 2026-11-08; open it in a browser when updating): https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing
