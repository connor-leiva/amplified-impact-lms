# Review Run: Practice Files

Independent reviewer run, 2026-11-08, from SKILL.md and its references only, before reading the builder's output. Prompt (the page's practice prompt): "Build our team playbook from these five documents. The fee schedule applies to every agent on the team." Files: the five in `practice/`. The generated playbook is in `review-playbook/`.

---

## Bottom Line

I built `lantern-lane-example-team-playbook` from all five documents: eight topic files plus `routing.md`, covering onboarding, leads and the pond, buyers, meetings, marketing, contract to close, splits and fees, and compliance. The biggest problem is the pond rule: the Policy Manual says 10 days and the Lead Routing and Pond SOP says 14 calendar days, so the playbook shows agents both and sends them to you. Decide the pond rule first, then update the onboarding checklist, which is from June 2024 and carries two buyer steps I held for your broker.

## Needs Your Answer

1. **Pond rule:** 10 days with no logged contact (Policy Manual, 3.4, March 2, 2026) or 14 calendar days with no logged call, text or email (Lead Routing and Pond SOP, The Pond, January 12, 2026)?
2. **Fee schedule:** included, since you said it applies to every agent. Individual arrangements stayed out.
3. No placeholders: the team name, brokerage and roles all came from your documents.

## Your Playbook Skill

`lantern-lane-example-team-playbook.zip` (one folder at the root, 10 files):

```
lantern-lane-example-team-playbook/
  SKILL.md
  references/
    routing.md                    Team Leader, built November 8, 2026
    onboarding.md                 Director of Operations, June 3, 2024 (stale)
    lead-routing-and-ponds.md     ISA Manager, March 2, 2026 (CONFLICT: pond rule)
    buyers-and-showings.md        Team Leader, June 3, 2024 (stale; UNDER REVIEW: buyer steps)
    meetings-and-expectations.md  Team Leader, March 2, 2026
    marketing-and-brand.md        Marketing Coordinator, March 2, 2026
    transactions-handoff.md       Transaction Coordinator, March 2, 2026
    compensation-and-fees.md      Team Leader, effective January 1, 2026
    policies-and-compliance.md    Team Leader, March 2, 2026
```

Check result: passed with 16 must-not-contain terms (every removed name, figure and held step). One warning for transactions@lanternlane-example.test, kept because it's the team's shared transactions inbox.

## Conflicts

**Pond rule.** Decision owner: Team Leader (the Policy Manual gives the Team Leader "conflicts between team documents").
- Policy Manual, 3.4 (March 2, 2026): "Pond rule: a team lead with no logged contact in Follow Up Boss for 10 days returns to the Team Pond, where any agent in the Lead Rotation may claim it."
- Lead Routing and Pond SOP, The Pond (January 12, 2026): "If an assigned team lead shows no logged call, text or email for 14 calendar days, a Follow Up Boss automation moves it to the Lantern Lane Pond."

The playbook shows both and sends agents to you.

## Gaps

**The three a new agent will hit first**
1. When and how do I get paid after a closing? On the training call (00:02:53) the Director of Operations said it "isn't written down anywhere yet." Ask: Team Leader.
2. What do I do before the first showing (consultation, written buyer agreement, preapproval)? The only written steps are the two held for your broker. Ask: Team Leader, and the Managing Broker for the buyer agreement.
3. Who covers my clients when I'm away, and how do I arrange it? Policy Manual, Section 8 says it "is being written. For now, talk to Avery." Ask: Team Leader.

**The rest, by topic**
- Pay and fees: how referral fees and lead source fees are handled. Ask: Team Leader.
- Buyers and showings: how to schedule showings and give feedback. Ask: Director of Operations.
- Listings: the process from listing appointment to live listing; who orders photos and signs, and who pays. Ask: Marketing Coordinator.
- Marketing: whether you can run your own social accounts and ads. Ask: Marketing Coordinator.
- Tech: partly answered. The checklist covers Follow Up Boss, MLS and lockbox access, but not SkySlope access. Ask: Director of Operations.
- Time off: partly answered. Lead response times are set for inside and outside business hours, but not when you must be reachable. Ask: Team Leader.
- Leaving the team: what happens to your leads, pipeline and pending deals, and what you owe or keep. Ask: Team Leader.
- Compliance: how texting and calling consent is recorded; where to report a complaint or a mistake on a deal. Ask: Managing Broker.

**Documents referenced but not uploaded**
- Open House Safety Policy (Onboarding Checklist, Week 3)
- The brand guide (Onboarding Checklist, Week 3)

## Stale and Broker Review Flags

**Stale (dated more than 12 months before today):**
- New Agent Onboarding Checklist, dated June 3, 2024: every step from it carries that date in the playbook, and the playbook tells agents to confirm with the Director of Operations.

**For your broker** (I haven't ruled on any of these):
- Onboarding Checklist, Week 4: the step to check the buyer agent compensation offered in the MLS before each showing, and the step to have the buyer sign the Buyer Agency Agreement only before writing an offer. NAR's practice changes took effect August 17, 2024: a written agreement with the buyer before touring, and no offers of compensation in the MLS. Both steps are held out of the playbook; agents are told the topic is under review. Confirm with your broker what the team does now; rules can differ by MLS and state.
- Policy Manual, 3.2: "call or text a newly assigned lead within 5 minutes." The step doesn't mention texting consent. In the playbook as written.
- Policy Manual, 6.2 and 6.3, and the training call (00:01:30): earnest money and wire fraud warnings. In the playbook as written.
- Policy Manual, 5.3: the rule for showing the brokerage name with the team name. Advertising rules vary by state. In the playbook as written.

## Left Out

- Policy Manual, Section 2 (Roles and Who to Ask): phone numbers (cell numbers and the brokerage office line). The playbook routes by role and Slack channel.
- New Agent Onboarding Checklist, Week 1, Office access row: an access code. The playbook keeps the step (the Director of Operations handles office access on Day 1).
- Compensation and Fee Schedule 2026, Section 4 (Individual Agreements): individual agent compensation.

## Test Set (25 Questions)

Run these in a new chat with the playbook turned on, before you share it.

**20 the playbook should answer**

| # | Question | Expected answer | Source |
|---|---|---|---|
| 1 | A lead just got assigned to me. How fast do I have to reach them? | Call or text within 5 minutes during business hours (8:00 AM to 8:00 PM Eastern). | Policy Manual, 3.2 |
| 2 | A lead got assigned to me after business hours. How long do I have? | Within 1 hour. | Policy Manual, 3.2 |
| 3 | How long do I have to accept a lead in Follow Up Boss? | 15 minutes. If you don't, it goes to the next agent. | Lead Routing and Pond SOP, Routing Steps |
| 4 | What do I have to do to stay in the Lead Rotation? | Attend the Tuesday team meeting, keep fewer than 20 leads in Attempted Contact, and finish the Follow Up Boss training videos. | Lead Routing and Pond SOP, Staying in the Lead Rotation |
| 5 | How many pond leads can I claim? | Up to 5 a week, if you're in the Lead Rotation. A claimed pond lead counts as a team-provided lead for compensation. | Lead Routing and Pond SOP, The Pond |
| 6 | Can my own sphere leads end up in the pond? | No. Tag them Sphere; sphere and self-generated leads are never moved to the pond. | Policy Manual, 3.5; Lead Routing and Pond SOP, Sphere Leads |
| 7 | Which Follow Up Boss stages do we use? | New Lead, Attempted Contact, Nurture, Active Client, Under Contract, Closed, Archive. Move a lead's stage within 24 hours of a change. | Lead Routing and Pond SOP, Stages |
| 8 | When do I have to log my calls and texts? | The same day, in Follow Up Boss. | Policy Manual, 3.3 |
| 9 | When's the team meeting, and do I have to be there? | Tuesdays, 9:30 to 10:30 AM, at the office or on Zoom. Required for every agent in the Lead Rotation. | Policy Manual, 4.1 |
| 10 | When do I get my Follow Up Boss login and lockbox key? | Follow Up Boss login on Day 2, MLS access and an electronic lockbox key on Day 3, from the Director of Operations. Plus the note that this section is dated June 3, 2024 and to confirm it with the Director of Operations. | Onboarding Checklist, Week 1 |
| 11 | Who do I ask about a login that isn't working? | The Director of Operations, in the #ops channel. | Policy Manual, Section 2 |
| 12 | Who has to approve my listing flyer, and how long does it take? | The Marketing Coordinator approves listing marketing before it's posted, printed or emailed. Allow 1 business day. | Policy Manual, 5.2 |
| 13 | Can I post my new listing on Instagram before it hits the MLS? | No. Don't post a listing on social media before it's active in the MLS. | Policy Manual, 5.4 |
| 14 | My offer got accepted. What do I send to transactions, and by when? | Within 24 hours of mutual acceptance, upload the fully signed contract and every addendum to SkySlope, and fill out the Deal Intake form (link pinned in #transactions). | Training Call, 00:00:16 |
| 15 | Who schedules the inspection? | You do. Scheduling inspections, access and repair negotiations are on the agent. | Training Call, 00:01:09 |
| 16 | The seller wants to push closing a week. Can I just agree by email? | No. Any date change needs a signed addendum. Send the Transaction Coordinator the details. | Training Call, 00:02:02 |
| 17 | Does the team pay for closing gifts? | Up to $100 per transaction. Order through the Marketing Coordinator at least 5 days before closing. | Training Call, 00:02:21 |
| 18 | What do I tell clients about wire fraud? | At the first meeting, tell every client we never email wire instructions, and to confirm any wire instructions by calling the title company at a number they find on their own. | Policy Manual, 6.3 |
| 19 | What's my split on a team lead? | 50% agent, 50% team, after Make-Believe Realty Group's brokerage split. | Compensation and Fee Schedule 2026, Section 1 |
| 20 | Is there a team cap? | Once the team's share of your commissions reaches $18,000 in a calendar year, your split on all leads becomes 85% agent and 15% team for the rest of that year. | Compensation and Fee Schedule 2026, Section 3 |

**5 the playbook should send to a person**

| # | Question | Role the answer should name | A wrong answer would |
|---|---|---|---|
| 21 | Can I add a clause saying the seller pays for a home warranty? | Managing Broker | Draft clause language |
| 22 | When do I get paid after a closing? | "The playbook doesn't cover that," Team Leader | Give a number of days |
| 23 | How long before a lead I haven't reached goes back to the pond? | Both versions (10 days, Policy Manual 3.4; 14 calendar days, Lead Routing and Pond SOP), and the Team Leader decides | Give one number as the rule |
| 24 | Can I get a better split than the schedule? | Team Leader | Give a figure or mention any other agent's arrangement |
| 25 | What's Make-Believe Realty Group's brokerage split? | Make-Believe Realty Group's own resources or the Managing Broker | Give a percentage |

Pass mark: every answerable question matches and cites its source; every routed question names the right role and invents nothing.

## Message to Agents (Draft)

```
Subject: Our Team Playbook Is Now In Claude

Hi team,

I've turned our SOPs into a Claude skill, the Lantern Lane Example Team Playbook. Ask it how we do things ("when does a lead go to the pond?", "what do I send transactions after acceptance?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to the Managing Broker.

To add it (about two minutes, easiest on a computer):
1. Download the attached lantern-lane-example-team-playbook.zip. Don't unzip it.
2. In Claude, go to Customize, then Skills. Click +, then + Create skill, then Upload a skill, and choose the ZIP.
3. Make sure it's switched on. If Claude says skills need code execution, turn on Code execution and file creation in Settings, then Capabilities.

If an answer looks wrong or out of date, send me the question and the answer.

[Team Leader Name]
```

**Sharing steps.** You didn't say which Claude plan your team is on:
- Agents on their own accounts: each one uploads the ZIP, as in the message.
- A Claude Team or Enterprise plan: share it from Customize > Skills (three-dot menu, Share), or an owner provisions it for everyone under Organization settings > Plugins & skills (Add, Upload a skill). Swap the three steps in the message for "It's in your Claude skills list now. Turn it on in Customize, then Skills."

## Check Before Sending

Verify each against your documents before you share the playbook:
- 5 minutes during business hours (8:00 AM to 8:00 PM Eastern), 1 hour outside (Policy Manual, 3.2); log the same day (3.3)
- 10 days (Policy Manual, 3.4) and 14 calendar days (Lead Routing and Pond SOP, The Pond): the conflict
- 15 minutes to accept; fewer than 20 leads in Attempted Contact; up to 5 pond leads per week; stage changes within 24 hours (Lead Routing and Pond SOP)
- Tuesdays, 9:30 to 10:30 AM (Policy Manual, 4.1); monthly one on one for the first 90 days (4.3); 1 business day for marketing approval (5.2)
- Day 1, Day 2, Day 3, Day 5, Day 10, Day 14, Day 15, Day 21 and Day 30 onboarding steps; 5 training modules; 2 shadowed showings; one paid headshot session (Onboarding Checklist, June 3, 2024)
- 24 hours of mutual acceptance; one business day for the intro email (Training Call, 00:00:16 and 00:00:39)
- Up to $100 per transaction for closing gifts, ordered at least 5 days before closing (Training Call, 00:02:21)
- 50% / 50% and 70% / 30% splits; $85 monthly fee on the 1st; $350 transaction coordination fee; $18,000 team cap, then 85% / 15% (Compensation and Fee Schedule 2026, Sections 1 to 3, effective January 1, 2026)
- Document dates: Policy Manual March 2, 2026; Lead Routing and Pond SOP January 12, 2026; Onboarding Checklist June 3, 2024; Training Call February 10, 2026
