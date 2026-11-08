Prompt: "Build our team playbook from these five documents. The fee schedule applies to every agent on the team."
Files: 01 Lantern Lane Policy Manual.pdf, 02 Lead Routing and Pond SOP.docx, 03 New Agent Onboarding Checklist.xlsx, 04 Training Call Handing Off a Deal to Transactions.vtt, 05 Compensation and Fee Schedule 2026.pdf

---

# Lantern Lane Example Team Playbook: Built and Checked

**Bottom line:** I built `lantern-lane-example-team-playbook` from your 5 documents: 8 topic files that answer agents only from your own wording and name the section every time. The biggest problem is that your Policy Manual and your Lead Routing SOP give different pond rules (10 days versus 14 calendar days), so the playbook shows agents both until you pick one. Decide that first, then look at the three gaps new agents will hit in month one: when they get paid, what to do before a buyer's first showing, and who covers their clients when they're away.

## Needs Your Answer

1. **Pond rule:** 10 days (Policy Manual 3.4, March 2, 2026) or 14 calendar days (Lead Routing and Pond SOP, January 12, 2026)? Tell me which and I'll rebuild as version 1.1.
2. **Onboarding checklist:** it's dated June 3, 2024, more than 12 months ago. Is it still current? The playbook warns agents about its age until you confirm.
3. **Two buyer steps held out** of the playbook (see Broker Review). Do you want to replace them with your current process?

The fee schedule is in, as you confirmed it applies to every agent. Section 4 (individual agreements) is not, and won't be.

## Your Playbook Skill

**File:** `lantern-lane-example-team-playbook.zip` (one folder at the root, ready to upload)

**Check result:** passed. Name, description (729 characters), frontmatter, folder-at-root ZIP, an Owner and Last updated line in every reference file, no em dashes, no phone numbers, account numbers or access codes, and none of the removed names or figures. One warning, kept on purpose: `transactions@lanternlane-example.test` is your shared transactions inbox from the Policy Manual.

| File | Topic | Owner | Last updated |
|---|---|---|---|
| `SKILL.md` | How the playbook answers and routes | Team Leader | Built November 8, 2026 |
| `references/routing.md` | Who owns what, source documents, what isn't written yet | Team Leader | March 2, 2026 |
| `references/lead-routing-and-ponds.md` | Lead sources, routing, first contact, stages, the pond (CONFLICT) | ISA Manager | March 2, 2026 (oldest source January 12, 2026) |
| `references/onboarding.md` | Weeks 1 to 4, buyer steps (UNDER REVIEW), the first 90 days | Director of Operations | March 2, 2026 (most of it June 3, 2024, flagged stale) |
| `references/transactions-handoff.md` | After acceptance, who owns what, date changes, earnest money, closing gifts | Transaction Coordinator | March 2, 2026 (oldest source February 10, 2026) |
| `references/marketing-and-brand.md` | Canva templates, approvals, brokerage name, social | Marketing Coordinator | March 2, 2026 |
| `references/compensation-and-fees.md` | Splits, fees, team cap | Team Leader | January 1, 2026 |
| `references/meetings-and-expectations.md` | Tuesday meeting, 90-day one on ones, Follow Up Boss habits | Team Leader | March 2, 2026 (oldest source January 12, 2026) |
| `references/policies-and-compliance.md` | Who decides, legal questions, client funds, fair housing | Team Leader | March 2, 2026 (oldest source February 10, 2026) |

How it behaves: it answers from these files only, ends every answer with "Source: [document], [section]," warns when a section is more than 12 months old, shows both sides of the pond conflict, sends contract, legal and compliance questions to the Managing Broker, and says "The playbook doesn't cover that" plus the role to ask when your documents are silent.

## Conflicts

**1. When a lead goes back to the pond**
- 01 Lantern Lane Policy Manual, section 3.4 (March 2, 2026): "a team lead with no logged contact in Follow Up Boss for 10 days returns to the Team Pond, where any agent in the Lead Rotation may claim it."
- 02 Lead Routing and Pond SOP, "The Pond" (January 12, 2026): "If an assigned team lead shows no logged call, text or email for 14 calendar days, a Follow Up Boss automation moves it to the Lantern Lane Pond."
- Decision owner: Team Leader (the Policy Manual gives the Team Leader "conflicts between team documents"). The SOP says a Follow Up Boss automation makes the move, so it's worth checking which number the automation uses.

No other conflicts. Two near-matches agree: both documents say stages move within 24 hours, and both put the Tuesday meeting first for staying in the Lead Rotation.

## Gaps

**The three a new agent hits first**
1. **When and how do I get paid after a closing?** On the February 10, 2026 training call, the answer was "That isn't written down anywhere yet... For now, ask Avery." The fee schedule covers splits and fees but not timing. Likely owner: Team Leader.
2. **What do I do before a buyer's first showing?** Nothing current covers the buyer consultation, the written buyer agreement or preapproval. The only buyer steps are the two held for broker review. Likely owner: Team Leader, with the Managing Broker.
3. **Who covers my clients when I'm away?** Policy Manual section 8, "Time Off and Coverage," says "This section is being written. For now, talk to Avery." Likely owner: Team Leader.

**The rest, by topic**
- Pay and fees: how referral fees and lead source fees are handled (Team Leader).
- Buyers and showings: which buyer agreement form and who reviews it (Managing Broker); how to schedule showings and give feedback (Director of Operations).
- Listings: the whole process from listing appointment to launch, who orders photos and signs and who pays (Team Leader or Marketing Coordinator).
- Marketing: whether agents can run their own social accounts and ads (Marketing Coordinator). Partly answered: the manual covers templates, approvals, the brokerage name and not posting before a listing is active.
- Meetings: how long the mentor relationship lasts (Team Leader). Partly answered: the checklist says the Team Leader assigns the mentor.
- Leaving the team: what happens to an agent's leads, pipeline and pending deals, and what they owe or keep (Team Leader).
- Compliance: how texting consent is recorded (Managing Broker); where to report a complaint or a mistake on a deal (Managing Broker or Team Leader).

**Documents referenced but not uploaded**
- Open House Safety Policy (Onboarding Checklist, Week 3: "Review the Open House Safety Policy with the Team Leader first")
- The brand guide (Onboarding Checklist, Week 3: "Set up your email signature from the brand guide")

Every gap above is listed in the playbook's `routing.md` under "Not Written Yet" with the role to ask. I didn't write a policy for any of them.

## Stale and Broker Review Flags

**Stale (dated more than 12 months before today)**
- 03 New Agent Onboarding Checklist, every row: dated June 3, 2024. The playbook's onboarding file carries that date and tells agents to confirm with the Director of Operations.

**For your broker (I don't rule on these)**
1. **Two buyer steps held out of the playbook.** Onboarding Checklist, Week 4: checking "the buyer agent compensation offered in the MLS" before each showing, and having the buyer sign the Buyer Agency Agreement "before you write an offer." NAR's practice changes took effect August 17, 2024: they removed offers of compensation from the MLS and require a written agreement with a buyer before touring a home. These steps look written for the old rules. The playbook tells agents the buyer steps are under review and sends them to you and the Managing Broker. Rules can differ by MLS and state, so confirm with your broker.
2. **Texting new leads.** Policy Manual 3.2 says to "call or text a newly assigned lead within 5 minutes" and doesn't mention consent. It's in the playbook as written.
3. **Client funds and wires.** Policy Manual 6.2 and 6.3 and the training call (00:01:30) cover earnest money and wire fraud warnings. In the playbook as written.
4. **Advertising.** Policy Manual 5.3 requires "Make-Believe Realty Group" with the team name on every ad, sign and social profile. Advertising rules vary by state. In the playbook as written.

## Left Out

- 01 Policy Manual, section 2 (Roles table): phone numbers (three personal cell numbers and the brokerage office line). Agents are routed by role and Slack channel instead.
- 03 Onboarding Checklist, Week 1, "Office access" row: an access code.
- 03 Onboarding Checklist, Week 4: two buyer steps, held for broker review (above).
- 05 Compensation and Fee Schedule 2026, section 4 (Individual Agreements): individual agent compensation. It stays out even though the schedule applies to everyone.
- 04 Training Call: side conversation that isn't policy.

The check script was run with every removed name, number and figure as a must-not-contain term. None appear in the playbook.

## Test Set: 25 Questions

Run these in a new chat with the playbook switched on, before you share it.

**Should answer (20)**

| # | Question | Expected answer | Source |
|---|---|---|---|
| 1 | How fast do I have to reach a new lead after it's assigned to me? | Within 5 minutes during business hours (8:00 AM to 8:00 PM Eastern), and within 1 hour outside business hours. | Policy Manual, 3.2 |
| 2 | I got a lead notification. How long do I have to accept it? | 15 minutes in Follow Up Boss, or it goes to the next agent. | Lead Routing and Pond SOP, Routing Steps 4 |
| 3 | What do I have to do to stay in the Lead Rotation? | Attend the Tuesday team meeting, keep fewer than 20 leads in Attempted Contact, and finish the Follow Up Boss training videos. | Lead Routing and Pond SOP, Staying in the Lead Rotation |
| 4 | How many pond leads can I grab in a week? | Up to 5 pond leads per week; a claimed pond lead counts as a team-provided lead for compensation. | Lead Routing and Pond SOP, The Pond |
| 5 | Will my sphere contacts ever get moved to the pond? | No. Sphere and self-generated leads are never moved to the pond. Tag them Sphere. | Policy Manual, 3.5; Lead Routing and Pond SOP, Sphere Leads |
| 6 | Which Follow Up Boss stages do we use, and how fast do I update them? | New Lead, Attempted Contact, Nurture, Active Client, Under Contract, Closed, Archive; move a stage within 24 hours of a change. | Lead Routing and Pond SOP, Stages; Policy Manual, 4.2 |
| 7 | When's the team meeting? | Tuesdays, 9:30 to 10:30 AM, at the office or on Zoom; required for every agent in the Lead Rotation. | Policy Manual, 4.1 |
| 8 | What's my split on a deal from my own sphere? | 70% agent, 30% team, after the brokerage split. | Fee Schedule, section 1 |
| 9 | What's my split on a lead from the rotation? | 50% agent, 50% team, after the brokerage split. | Fee Schedule, section 1 |
| 10 | What's the monthly team fee and what does it cover? | $85, charged on the 1st; it covers the Follow Up Boss seat, Canva Pro and the team website. | Fee Schedule, section 2 |
| 11 | How does the team cap work? | Once the team's share reaches $18,000 in a calendar year, the split on all leads becomes 85% agent and 15% team for the rest of that year. | Fee Schedule, section 3 |
| 12 | Is there a fee for the transaction coordinator? | $350 per closed transaction, paid from the agent's side at closing. | Fee Schedule, section 2 |
| 13 | We just got an accepted offer. What do I send transactions, and by when? | Within 24 hours of mutual acceptance, upload the fully signed contract and every addendum to SkySlope and fill out the Deal Intake form (link pinned in #transactions). | Training Call, 00:00:16 |
| 14 | Who schedules the inspection? | The agent schedules inspections and arranges access; repair negotiations are the agent's too, and the Transaction Coordinator drafts the paperwork on the brokerage's form. | Training Call, 00:01:09 |
| 15 | Who do I ask for my Follow Up Boss login and MLS access? | The Director of Operations: Follow Up Boss login by Day 2, MLS access and an electronic lockbox key by Day 3. Expect the stale note: dated June 3, 2024, confirm with the Director of Operations. | Onboarding Checklist, Week 1 |
| 16 | The seller wants to push closing a week. Can I just agree by email? | No. Any date change needs a signed addendum; send the details to the Transaction Coordinator, and contract wording goes to the Managing Broker. | Training Call, 00:02:02 |
| 17 | Does the team pay for closing gifts? | Up to $100 per transaction; order through the Marketing Coordinator at least 5 days before closing. | Training Call, 00:02:21 |
| 18 | Who approves my listing flyer, and how long does it take? | The Marketing Coordinator approves listing marketing before it's posted, printed or emailed; allow 1 business day. | Policy Manual, 5.2 |
| 19 | Can I post my new listing on Instagram before it goes live? | No. Don't post a listing on social media before it is active in the MLS. | Policy Manual, 5.4 |
| 20 | What do I tell my buyer about wiring earnest money? | Earnest money goes straight to title; the team never emails wire instructions, and the buyer confirms any wire instructions by calling title at a number they find on their own. | Policy Manual, 6.2 and 6.3; Training Call, 00:01:30 |

**Should send to a person (5)**

| # | Question | The answer should name | A wrong answer would |
|---|---|---|---|
| 21 | Can I add a clause to my buyer's offer saying the seller pays for a home warranty? | The Managing Broker | Draft the clause or say yes or no |
| 22 | When will I get paid for my closing next week? | "The playbook doesn't cover that," and the Team Leader | Guess a number of days |
| 23 | How many days until an untouched lead goes back to the pond? | Both versions (10 days, Policy Manual 3.4; 14 calendar days, Lead Routing and Pond SOP) and the Team Leader | Pick one number |
| 24 | Can I get a better split than the schedule? | The Team Leader | Mention any individual arrangement, or promise anything |
| 25 | What does Make-Believe Realty Group charge for E&O insurance? | Make-Believe Realty Group's own resources or the Managing Broker | Invent a fee |

## Message to Agents (Draft)

Read it over before you send it. I haven't sent anything.

**Subject: Our Team Playbook Is Now In Claude**

Hi team,

I've turned our SOPs into a Claude skill, the Lantern Lane Example Team Playbook. Ask it how we do things ("when does a lead go to the pond?", "what do I send transactions after acceptance?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to the Managing Broker.

To add it (about two minutes, easiest on a computer):
1. Download the attached lantern-lane-example-team-playbook.zip. Don't unzip it.
2. In Claude, go to Customize, then Skills. Click +, then + Create skill, then Upload a skill, and choose the ZIP.
3. Make sure it's switched on. If Claude says skills need code execution, turn on Code execution and file creation in Settings, then Capabilities.

If an answer looks wrong or out of date, send me the question and the answer.

[Team Leader Name]

**How to get it to your agents**
- **If your agents use their own Claude accounts** (Free, Pro, Max or Ultra), send the ZIP with the message above. Each agent uploads it once. Skills added on the web or desktop app also work in chat on the phone apps.
- **If your team is on a Claude Team or Enterprise plan,** you can skip the uploads: share it from Customize > Skills (three-dot menu, then Share, then names or emails), or an owner can provision it for everyone under Organization settings > Plugins & skills > Add > Upload a skill. Then use the one-line version of step 1 to 3: "It's in your Claude skills list now. Turn it on in Customize, then Skills."
- **Before sharing,** run the 25 questions. When you settle the pond rule, send me the answer and I'll rebuild it as version 1.1; agents on their own accounts delete the old one and upload the new ZIP.

## Check Before Sending

Every number, dollar amount, date and quoted rule in the playbook and the test set, with its source. Check each against your documents.

| Item | In the playbook | Source |
|---|---|---|
| First contact | 5 minutes in business hours (8:00 AM to 8:00 PM Eastern); 1 hour outside | Policy Manual, 3.2 |
| ISA first call | Within 5 minutes during business hours | Lead Routing and Pond SOP, Routing Steps 2 |
| Accepting a lead | Within 15 minutes | Lead Routing and Pond SOP, Routing Steps 4 |
| Lead Rotation | Fewer than 20 leads in Attempted Contact | Lead Routing and Pond SOP |
| Pond rule (CONFLICT) | 10 days versus 14 calendar days | Policy Manual, 3.4; Lead Routing and Pond SOP, The Pond |
| Pond claims | Up to 5 per week | Lead Routing and Pond SOP, The Pond |
| Stage updates | Within 24 hours | Lead Routing and Pond SOP, Stages; Policy Manual, 4.2 |
| Team meeting | Tuesdays, 9:30 to 10:30 AM | Policy Manual, 4.1 |
| New agent one on ones | Once a month during the first 90 days | Policy Manual, 4.3 |
| Listing marketing approval | Allow 1 business day | Policy Manual, 5.2 |
| Splits | 50% / 50% team-provided; 70% / 30% self-generated and sphere | Fee Schedule, section 1 |
| Monthly team fee | $85, charged on the 1st | Fee Schedule, section 2 |
| Transaction coordination fee | $350 per closed transaction | Fee Schedule, section 2 |
| Team cap | $18,000 in a calendar year, then 85% / 15% | Fee Schedule, section 3 |
| Handoff | Within 24 hours of mutual acceptance; intro email within one business day | Training Call, 00:00:16 and 00:00:39 |
| Closing gifts | Up to $100 per transaction; order at least 5 days before closing | Training Call, 00:02:21 |
| Onboarding days | Day 1, 2, 3, 5, 10, 14, 15, 21 and 30; 5 training modules; 2 shadowed buyer showings; one headshot session | Onboarding Checklist, Weeks 1 to 4 |
| Document dates | March 2, 2026 (version 3.2); January 12, 2026; June 3, 2024; February 10, 2026; effective January 1, 2026 | Each document's header |
| Shared inbox | transactions@lanternlane-example.test | Policy Manual, section 2 |
