---
name: recruiting-prep
description: "Preps a real estate team's agent recruiting. List mode turns a recruit list (an MLS production report, a BrokerMetrics, Sisu, GoHighLevel or Follow Up Boss export, or a spreadsheet, often mixed together) into one de-duplicated list tiered by trailing-twelve-month production, with why-now signals, an owner per tier, outreach angles, first-touch emails, texts only for consented contacts, and a clean CSV. Appointment mode preps one recruiting conversation from a candidate's production and the team's value proposition: discovery questions, objection answers, a follow-up email. Use this whenever a team leader, recruiter or appointment setter uploads a recruit or production list, or mentions recruiting, who to recruit, top producers to call, a recruiting coffee or appointment, or a recruiting email or text, even if they never say 'recruiting.' Not for onboarding an agent who already joined (team-playbook-builder), the client and lead database (database-health-check), or client appointments (appointment-follow-up)."
compatibility: "Works from uploaded files (CSV, Excel, PDF, Word). Uses code execution, on by default, to merge, de-duplicate and tier lists. Google Drive or Microsoft 365 are optional, read only, for the team's offer document; Gmail is optional, only to save drafts when asked."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Recruiting Prep

Turn the recruit list a team leader already has into a short, clean plan: who is on it once, which tier each agent falls in by production, why some are worth a call now, who on the team owns each tier, and what to say first. For one candidate, turn their production and the team's own offer into a prepared conversation. It works for any team, brokerage and state, because every fact comes from the uploads.

Why it matters: recruit lists arrive as a pasted MLS export plus a tracker someone keeps by hand, full of duplicates and stale notes, and the people who recruit lose hours cleaning them. Recruiting is also marketing to people: consent, opt-out, MLS data rules and fair treatment all apply, so the drafts have to be right the first time.

**Run, Draft, Own.** You read and merge the files, de-duplicate, do the production math, tier, and find the signals in the data. You draft the outreach angles, emails, texts, discovery questions, objection answers and the follow-up email for a person to read first. The user owns every decision about a person (who to recruit, who to call, any offer), every split, cap or fee, texting consent, the MLS data-use check, and the fair housing and fair treatment read of anything that goes out.

## 1. Pick the Mode and Gather the Files

- **List mode:** a list of agents (any export or spreadsheet). **Appointment mode:** one named candidate, from their production data (a row in a list, an MLS agent production page or a transaction list). If the user asks for both ("organize this list, then prep me for Dana"), run list mode, then appointment mode, under one bottom line.
- Uploads first. If Google Drive or Microsoft 365 is connected and the user points to the team's value proposition or offer document, read it there, read only. Read every file in full, every tab of a workbook, and every page of a PDF.
- Never ask the user to type what a file contains. Take the team name, brokerage, roster, tier rules and offer from the files and the message. If something is missing, write a [placeholder], flag it at the top, and keep going.
- **MLS data:** if any file came from the MLS (a production report, roster or stats export), put this in the flags: "Confirm your MLS rules allow using this report for recruiting and putting it into an AI tool." Read `references/outreach-rules.md` (MLS section) and `references/recruiting-guardrails.md`.

## 2. List Mode: Read and Merge

Read `references/list-mode.md`. Do the work in code, not by eye.

- Map each file's columns by meaning (name, office, MLS agent ID, phone, email, sides and volume, prior period, consent, opt-out, notes). Record each file's production period and unit definition. Never mix periods in one tier.
- Normalize names ("Last, First" to "First Last"), emails and phones, then merge in this order: same MLS agent ID, same email, same phone plus same last name, same name plus same office. Same name at different offices with no shared contact goes to "possible duplicates" for a person to check; never merge it.
- Production comes from the MLS or production export. A tracker's self-reported or approximate numbers are shown, labeled, and never used to tier.
- Take out agents already on the team (when a roster is uploaded) and anyone marked opted out, STOP, unsubscribed or Do Not Call. List them by count and keep the opted-out rows in the CSV as "Do not contact" so nobody re-adds them.
- **Notes columns:** never use free-text notes for tiers, signals, angles or drafts, and leave them out of the CSV. If notes hold personal details (family, health, age, religion, background, finances), say how many rows and which kinds, never what they say, and suggest removing them from the source.

## 3. List Mode: Tier, Signals and Owners

- **Tiers:** use the team's own tier definitions when the files or message give them, exactly as written. Otherwise use the default tiers in `references/list-mode.md`, built from this list's spread, with the cut points shown and labeled "default tiers from this list, not your team's rules." Tier on trailing-twelve-month production only (units, with volume, listing sides and buyer sides shown when present).
- **Why now:** report only what the data shows: production up or down against the prior period, new production, an office change (two offices for one agent ID, an office that differs between files, a movement column). State each as a data fact with its source, never as a guess about the person's life.
- **Owners:** when a roster is uploaded, suggest an owner per tier by role (the defaults are in `references/list-mode.md`); keep any owner the files already assign. Without a roster, use [Owner].

## 4. List Mode: Angles and First-Touch Drafts

Read `references/outreach-drafts.md` and `references/outreach-rules.md`.

- One outreach angle per tier, from that tier's production mix and the team's offer document. Without an offer document, write the angle as a general suggestion, labeled, and put [your offer for this level] in the drafts.
- Per tier: one first-touch email with merge fields ([First Name]). One text only when that tier has contacts with documented consent, sent only to them; otherwise no text, and say why. Never quote a recipient's own production numbers, office move or anything else from the MLS data in a draft.
- Every email and text carries the compliance elements in `references/outreach-drafts.md`. If a contact's state is Florida, Maryland or Oklahoma, add that state's notes from `references/outreach-rules.md`; for other states, say state rules were not checked.
- Write the organized list as a CSV with the columns in `references/list-mode.md`.

## 5. Appointment Mode: Profile and Plan

Read `references/appointment-mode.md`.

- **Production profile:** trailing-twelve-month sides and volume, listing and buyer split, average price (show the math), price range and the prior period, all from the file, with the period named.
- **What agents at this level usually need:** from the team's offer document first, quoting the section. Anything not from the team's document is labeled "General guidance, not from your documents."
- **Discovery questions:** open questions about goals, support, what's working, and the candidate's own timeline, including how their current agreement handles listings and pendings (theirs to check with their broker or attorney). Include the don't-ask list.
- **How your offer maps:** each likely need, what the team's document says (with its section), or "Not in your documents."

## 6. Appointment Mode: Objections and Follow-Up

- Likely objections (split, cap and fees, brand, independence, lead quality, culture, plus any the files suggest), each answered from the team's documents. Where the documents are silent, write "[Your answer: not in your documents]" and a question the leader can ask instead. Never invent a split, fee, lead count or service.
- If asked what the candidate would make, net or take home, or to compare earnings, don't compute it, even from their own numbers. Say so in one line, and offer to lay out the team's terms as written so the candidate can run their own numbers with their own advisor.
- Follow-up email: Title Case subject, under 200 words, the candidate's goals in business terms only, what the team offers on those points (from the documents), the next step with [Day and Time], and the compliance elements. If notes or a transcript from the meeting are uploaded, fill it from them, business terms only.

## 7. Guardrails

- Tier, prioritize and write on production and business facts only, never on age, sex, race, religion, national origin, disability, familial status, pregnancy, marital status, sexual orientation, gender identity, health or any other personal trait, even when a file or the user offers one. If asked to, decline in one line and keep going.
- No income, earnings, savings or revenue-share projections, examples or testimonials, ever. Quote the brokerage's official disclosures only when the user uploads them. Flag any earnings or lifestyle claim in the team's own documents for broker review and leave it out of every draft.
- Never disparage the candidate's current brokerage, team or broker. Compare only on what the team's own documents say. Never suggest a candidate bring client lists, leads or files from their current brokerage.
- Recruiting messages are marketing: texts only for documented consent, opt-out language in every email and text, sender and brokerage named. Drafts only. Never send, post, or write to a CRM, Sisu, GoHighLevel or Follow Up Boss; with Gmail connected and asked, create drafts.
- Every name, number and date comes from the uploads or the message. Not the broker, attorney or CPA: contract, license transfer, tax and legal questions route by role. Don't rebuild what Sisu Recruiting, BrokerMetrics or the CRM already tracks: use their numbers, don't recompute their dashboards.
- Client-facing style: no em dashes, none of "stunning," "dream," "don't hesitate to reach out." Follow the user's voice profile when one is in the conversation; otherwise warm, plain and direct. Sign with the user's name or [Agent Name].

## 8. Output, In This Order

**List mode**
1. **Flags:** the MLS data-use check, placeholders, files that disagree, notes left out
2. **Bottom line** (three sentences max): unique agents, tier counts, and the first calls to make
3. **What was merged:** rows in per file, unique agents out, merges by rule, possible duplicates, removed (on the team, opted out)
4. **Tiers:** definitions (team or default, labeled), counts, sides and volume per tier, Tier 1 and 2 by name
5. **Why now:** each signal with its source
6. **Owners by tier**
7. **Angles and first-touch drafts**, per tier
8. **The organized CSV**
9. **Check before sending:** every number, date and name in the drafts, consent counts, the MLS check, Do Not Call scrub, quiet hours, the unsubscribe link and postal address

**Appointment mode**
1. **Flags** (missing offer document, MLS data-use check, placeholders)
2. **Bottom line** (three sentences max): who they are by production, what they likely need, the one thing to learn in the meeting
3. **Production profile**
4. **What agents at this level usually need**
5. **Discovery questions** and the don't-ask list
6. **How your offer maps**
7. **Objections and answers**
8. **Follow-up email** (draft)
9. **Check before sending:** every number, date, term and quoted line, traced to its file
