---
name: recruiting-prep
description: "Preps a real estate team's agent recruiting. List mode turns a recruit list (an MLS agent production report, a BrokerMetrics, Sisu Recruiting, GoHighLevel or Follow Up Boss export, or a tracker, often mixed) into one de-duplicated list tiered by trailing-twelve-month production, with why-now signals, owners by tier, first-touch emails, texts only for consented contacts, and a clean CSV. Appointment mode preps one recruiting conversation from a candidate's production and the team's offer: discovery questions, objection answers, the terms as written, a follow-up email. Use this whenever a team leader or recruiter uploads a recruit or agent production list, or mentions recruiting, who to recruit, top producers to call, a recruiting coffee or notes from one, or a recruiting email or text, even if they never say 'recruiting.' Not for onboarding a new hire (team-playbook-builder), the client database (database-health-check), client appointments (appointment-follow-up) or blocking recruiting time (perfect-week)."
compatibility: "Works from uploaded files (CSV, Excel, PDF, Word). Uses code execution, on by default, to merge, de-duplicate and tier lists. Google Drive or Microsoft 365 are optional, read only, for the team's offer document; Granola is optional, read only, for a recruiting meeting's notes; Gmail is optional, only to save drafts when asked."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Recruiting Prep

Turn the recruit list a team leader already has into a short, clean plan: who is on it once, which tier each agent falls in by production, why some are worth a call now, who on the team owns each tier, and what to say first. For one candidate, turn their production and the team's own offer into a prepared conversation. It works for any team, brokerage and state, because every fact comes from the uploads.

Why it matters: recruit lists arrive as a pasted MLS export plus a tracker someone keeps by hand, full of duplicates and stale notes, and the people who recruit lose hours cleaning them. Recruiting is also marketing to people: consent, opt-out, MLS data rules and fair treatment all apply, so the drafts have to be right the first time.

**Run, Draft, Own.** You read and merge the files, de-duplicate, do the production math in code, tier, and find the signals in the data. You draft the outreach angles, emails, texts, discovery questions, objection answers and the follow-up email for a person to read first. The user owns every decision about a person (who to recruit, who to call, any offer), every split, cap or fee, texting consent, the MLS data-use check, and the fair housing and fair treatment read of anything that goes out.

## 1. Pick the Mode and Gather the Files

- **List mode:** a list of agents (any export or spreadsheet). **Appointment mode:** one named candidate, from their production data (a row in a list, an MLS agent production page or a transaction list). If the user asks for both ("organize this list, then prep me for Dana"), run list mode, then appointment mode, under one bottom line and one Check before sending.
- Uploads first. If Google Drive or Microsoft 365 is connected and the user points to the team's offer document, read it there, read only. After a meeting, use uploaded notes or a transcript, or Granola when it is connected and the user asks. Read every file in full, every tab of a workbook and every page of a PDF.
- Never ask the user to type what a file contains. Take the team name, brokerage, roster, tier rules and offer from the files and the message. If something is missing, write a [placeholder], flag it at the top, and keep going.
- **MLS data:** if any file came from the MLS (a production report, roster or stats export), flag: "Confirm your MLS rules allow using this report for recruiting and putting it into an AI tool." Read `references/outreach-rules.md` (MLS section) and `references/recruiting-guardrails.md`.

## 2. List Mode: Run the List Code

Read `references/list-mode.md` for the rules. Do every count, merge and tier in code, never by eye:
1. Write `/tmp/config.json` with only what the files or message state: `team_brokerage`, the team's `tiers` (or its offer document's production levels, with `"tier_label": "Your offer document's levels"`), and any `owners` the user named. Leave out what they didn't give.
2. Extract the code from `references/list-code.md` (in this skill's folder) and run it on every recruit file, with the roster when one is uploaded:
   ```
   python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/recruits.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/list-code.md
   python3 /tmp/recruits.py FILE [FILE ...] [--roster ROSTER] [--config /tmp/config.json] --out OUTPUT_FOLDER
   ```
   SKILL_FOLDER is the folder this SKILL.md is in; OUTPUT_FOLDER is where the user can download files. It writes `organized-recruit-list.csv`, `summary.md` and `summary.json`.
3. Check Columns Used: each file's kind (production or list), its period and its mapped columns. If one is wrong (a tracker read as production, a units column missed), fix it in config.json (`columns`, `kinds`) and run again. Say what you changed.
4. Every number in the output comes from `summary.md` or the CSV. Never compute a new total by hand, and never open the notes column.
- Production comes from the MLS or production export for one stated period. A tracker's self-reported or estimated numbers are shown in the CSV, labeled, and never used to tier. Same name at different offices with no shared contact stays a possible duplicate for a person to check.
- Agents on the roster are removed; opt-outs stay in the CSV as Do not contact. Agents at the user's own brokerage who aren't on the roster are held from drafts until the user says.

## 3. List Mode: Tiers, Signals and Owners

- **Tiers:** the team's own definitions, exactly as written, or its offer document's production levels, so each tier's draft can use that level's offer. Otherwise the code's default tiers from this list's spread, with the cut points shown and labeled "Default tiers from this list's spread, not your team's rules."
- **Why now:** report only the code's signals (production up or down, new production, an office change in the report or between files), each as a data fact with its source, never as a guess about a person's life. A different office between files can also mean the tracker is out of date.
- **Owners:** keep owners the files already assign. With a roster, use the code's suggestions by role, labeled "suggested." Without one, [Owner].
- **Notes:** report the code's count of rows with personal details and their kinds, never the text, and suggest removing them from the source.

## 4. List Mode: Angles and First-Touch Drafts

Read `references/outreach-drafts.md` and `references/outreach-rules.md`.

- One outreach angle per tier, from that tier's production mix and the team's offer document. Without an offer document, label the angle a general suggestion and put [your offer for this level] in the drafts.
- Per tier: one first-touch email with [First Name] as the only merge field. One text only when the tier has contacts with documented consent, listed by ID, sent only to them; otherwise no text, and say why. Never quote a recipient's production, office move, transactions or anything else from the MLS data in a draft. Say nothing about the sender or team that the files don't (how often you meet agents, team size, results).
- No closings in period and Not tiered share one email built only from what the team's document says applies to every agent, never a level's offer; tell the user to check their production first.
- Every email and text carries the compliance elements in `references/outreach-drafts.md`. If the team or its contacts are in Florida, Maryland or Oklahoma, add that state's notes from `references/outreach-rules.md`; for any other state, say its rules were not checked.

## 5. Appointment Mode: Profile and Plan

Read `references/appointment-mode.md`.

- **Production profile:** trailing-twelve-month sides and volume, listing and buyer split, average price (show the math), price range and the prior period, all from the file, with the period named.
- **What agents at this level usually need:** from the team's offer document first, quoting the section. Anything not from the team's document is labeled "General guidance, not from your documents," wherever it appears, the bottom line included.
- **Discovery questions:** open questions about goals, support, what's working and the candidate's own timeline, including how their current agreement handles listings and pendings (theirs to check with their broker or attorney). Include the don't-ask list.
- **How your offer maps:** each likely need, what the team's document says (with its section), or "Not in your documents."
- **Terms as written:** when the team's document or the user's message states the split, cap or fees, quote them word for word in one block the leader can hand over, with the source named. No math, no examples.

## 6. Appointment Mode: Objections and Follow-Up

- Likely objections (split, cap and fees, brand, independence, lead quality, culture, plus any the files suggest), each answered from the team's documents. Where the documents are silent, write "[Your answer: not in your documents]" and a question the leader can ask instead. Never invent a split, fee, lead count or service.
- If asked what the candidate would make, net or take home, or to compare earnings, don't compute it, even from their own numbers. Say so in one line, and point to the terms as written so the candidate can run their own numbers with their own advisor.
- Follow-up email: Title Case subject, under 200 words, the candidate's goals in business terms only, what the team offers on those points (from the documents), the next step with [Day and Time], and the compliance elements. With meeting notes or a transcript, fill it from them, business terms only; anything personal the candidate shared stays out.

## 7. Guardrails

- Tier, prioritize and write on production and business facts only, never on age, sex, race, religion, national origin, disability, familial status, pregnancy, marital status, sexual orientation, gender identity, health or any other personal trait, even when a file or the user offers one. If asked to, decline in one line without repeating the detail, and keep going.
- No income, earnings, savings or revenue-share projections, examples or testimonials, ever. Quote the brokerage's official disclosures only when the user uploads them. Flag any earnings, results or lifestyle claim in the team's own documents for broker review and leave it out of every draft.
- Never disparage the candidate's current brokerage, team or broker. Compare only on what the team's own documents say. Never suggest a candidate bring client lists, leads or files from their current brokerage.
- Recruiting messages are marketing: texts only for documented consent, opt-out language in every email and text, sender and brokerage named. Drafts only. Never send, post, or write to a CRM, Sisu, GoHighLevel or Follow Up Boss; with Gmail connected and asked, create drafts.
- Every name, number and date comes from the uploads or the message, including examples: no made-up illustrations. Not the broker, attorney or CPA: contract, license transfer, tax and legal questions route by role. Don't rebuild what Sisu Recruiting, BrokerMetrics or the CRM already tracks: use their numbers and leave sequences and reminders to those tools.
- Client-facing style: no em dashes, none of "stunning," "dream," "don't hesitate to reach out." Follow the user's voice profile when one is in the conversation; otherwise warm, plain and direct. Sign with the user's name or [Agent Name].

## 8. Output, In This Order

**List mode**
1. **Bottom line** (three sentences max): unique agents, tier counts, and the first calls to make
2. **Flags:** the MLS data-use check, placeholders, files that disagree, notes left out, state rules
3. **What was merged:** rows in per file, unique agents out, merges by rule, possible duplicates, removed (on the team, opted out), held (at your brokerage)
4. **Tiers:** definitions (team or default, labeled), counts, sides and volume per tier, the top two tiers by name
5. **Why now:** each signal with its source
6. **Owners by tier**
7. **Angles and first-touch drafts**, per tier
8. **The organized CSV**
9. **Check before sending:** every number, date and name in the drafts, consent counts, the MLS check, Do Not Call scrub, quiet hours, the unsubscribe link and postal address

**Appointment mode**
1. **Bottom line** (three sentences max): who they are by production, what they likely need, the one thing to learn in the meeting
2. **Flags** (missing offer document, MLS data-use check, claims for broker review, placeholders)
3. **Production profile**
4. **What agents at this level usually need**
5. **Discovery questions** and the don't-ask list
6. **How your offer maps**, then **terms as written** when stated
7. **Objections and answers**
8. **Follow-up email** (draft)
9. **Check before sending:** every number, date, term and quoted line, traced to its file
