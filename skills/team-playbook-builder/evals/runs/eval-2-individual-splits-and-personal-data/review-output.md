# Review Run: Eval 2 (Individual Splits and Personal Data)

Independent reviewer run, 2026-11-08, from SKILL.md and its references only, before reading the builder's output. Prompt: "Turn these into a playbook our agents can install. Keep it simple." Files: Team Operations Manual 2026.pdf, Commission and Fees.xlsx, Onboarding Checklist.docx. The generated playbook is in `review-playbook/`.

---

## Bottom Line

I built `fernhollow-example-partners-playbook` from your Team Operations Manual and Onboarding Checklist: five topic files covering onboarding, new lead follow-up, meetings, and the contract handoff. The biggest problem is in what agents would have seen: the fee workbook carries a confidential sheet of individual arrangements, and the manual has personal phone numbers, a personal email, an alarm code and trust account numbers, so all of that is out and logged below. Decide first whether the Team Plan sheet applies to every agent.

## Needs Your Answer

1. **Fee schedule.** Commission and Fees.xlsx has a fee and split schedule (the Team Plan sheet). Does it apply to every agent on the team? Say "include the fee schedule" and I'll add it. Individual arrangements stay out either way.
2. No placeholders: the team name, brokerage and roles all came from your documents.
3. No conflicts between the documents.

## Your Playbook Skill

`fernhollow-example-partners-playbook.zip` (one folder at the root, 6 files):

```
fernhollow-example-partners-playbook/
  SKILL.md
  references/
    routing.md                    Operations Manager, built November 8, 2026
    onboarding.md                 Operations Manager, February 2, 2026
    lead-routing-and-ponds.md     Operations Manager, April 22, 2026
    meetings-and-expectations.md  Operations Manager, April 22, 2026
    transactions-handoff.md       Operations Manager, April 22, 2026
```

Check result: passed with 28 must-not-contain terms (every removed name and figure, and every held Team Plan figure). Two warnings for the email tc@fernhollow-example.test, kept because it's the Transaction Coordinator's role inbox, not a personal address. "Keep it simple": the playbook has one short file per topic and nothing else in the folder.

## Conflicts

None found. The manual and the checklist agree wherever they cover the same thing.

## Gaps

**The three a new agent will hit first**
1. When and how do I get paid after a closing? Ask: Team Owner. (Even with the Team Plan included, nothing says when pay arrives.)
2. When does a lead go back to a shared pond, and can I claim pond leads? Ask: Team Owner.
3. What do I do before the first showing (consultation, written buyer agreement, preapproval)? Ask: Team Owner, and the Managing Broker for the buyer agreement form.

**The rest, by topic**
- Pay and fees: splits for team leads versus your own leads, monthly and per-deal fees (held until you answer above); whether there's a team cap; referral and lead source fees. Ask: Team Owner.
- Leads: partly answered. The checklist says you join the rotation after the 30-day review, but not how leads are assigned or what keeps you in the rotation; which Follow Up Boss stages and tags to use; whether sphere leads are treated differently. Ask: Team Owner (stages: Operations Manager).
- Buyers and showings: which buyer agreement form and who reviews it (Managing Broker); scheduling showings and feedback; open houses and safety. Ask: Team Owner.
- Listings: the process from appointment to live; who orders photos and signs and who pays; who approves listing marketing. Ask: Team Owner.
- Contract to close: partly answered. The Transaction Coordinator owns the deadline calendar and the client timeline, but the manual doesn't say what else stays with the agent; what to tell clients about wire fraud; closing gifts. Ask: Transaction Coordinator, and the Managing Broker for wire fraud wording.
- Marketing and brand: what needs approval before posting, how the team and brokerage names must appear, rules for your own social accounts and ads. Ask: Team Owner, and the Managing Broker for advertising rules.
- Tech and office: partly answered. Follow Up Boss and MLS logins come from the Operations Manager; transaction system and lockbox access aren't covered; where templates live; how to get into the office (the manual gives a code, now removed, and no process). Ask: Operations Manager.
- Meetings and expectations: who your mentor or point person is. Ask: Team Owner.
- Time off and coverage: who covers your clients when you're away, and what hours you must be reachable for leads. Ask: Team Owner.
- Leaving the team: what happens to your leads and pending deals, and what you owe or keep. Ask: Team Owner.
- Compliance: how texting and calling consent is recorded; where to report a complaint or a mistake on a deal. Ask: Managing Broker.

**Documents referenced but not uploaded**
- The Hello 1 template (Team Operations Manual, Section 2). The playbook names it but can't say what it says or where it lives.

## Stale and Broker Review Flags

**Stale:** none. Both documents used are dated 2026.

**For your broker** (I haven't ruled on any of these):
- Team Operations Manual, Section 2: texting every new portal lead with the Hello 1 template within 5 minutes. The step doesn't mention consent. It's in the playbook as written.
- Team Operations Manual, Section 5: client funds. Earnest money to title, and a cashier's check brought to the office for the trust account. It's in the playbook with the account details removed.

## Left Out

- Commission and Fees.xlsx, sheet "Agent Splits (Confidential)": individual agent compensation and personal notes about named agents. Never included, even if you confirm the Team Plan.
- Commission and Fees.xlsx, sheet "Team Plan": team-wide fee and split schedule. Held until you answer the question above.
- Team Operations Manual, Section 1 (Roles): personal phone numbers and a personal email. The playbook routes by role instead.
- Team Operations Manual, Section 5 (Earnest Money and Wires): account details. Replaced with "[Removed: account details. Ask the Managing Broker.]"
- Team Operations Manual, Section 6 (Office): an access code. The manual gives no access process, so the playbook says nothing about access and lists it as a gap.

## Test Set (25 Questions)

Run these in a new chat with the playbook turned on, before you share it. Your documents hold about 16 rules, so each rule is covered once and the rest are other ways agents ask about the most-used ones.

**20 the playbook should answer**

| # | Question | Expected answer | Source |
|---|---|---|---|
| 1 | I just got a new portal lead. How fast do I text them, and with what? | Text with the Hello 1 template within 5 minutes. | Team Operations Manual, Section 2 |
| 2 | How quickly do I have to call a new lead? | Within 15 minutes during business hours. | Team Operations Manual, Section 2 |
| 3 | What counts as business hours for calling leads? | 9:00 AM to 6:00 PM. | Team Operations Manual, Section 2 |
| 4 | Where do I log my calls and texts? | Log every touch in Follow Up Boss. | Team Operations Manual, Section 2 |
| 5 | When do I start getting team leads? | You join the lead rotation after your 30-day review with the Team Owner. | Onboarding Checklist, First Month |
| 6 | When's the team meeting? | Every Wednesday at 9:00 AM. | Team Operations Manual, Section 3 |
| 7 | Is there a pipeline meeting? | Yes, the first Monday of each month at 1:00 PM. | Team Operations Manual, Section 3 |
| 8 | What are the office hours? | 8:00 AM to 6:00 PM on weekdays. | Team Operations Manual, Section 6 |
| 9 | My offer just got accepted. What do I send, and to who? | The fully signed contract, to the Transaction Coordinator. | Team Operations Manual, Section 4 |
| 10 | How long do I have to get the contract to the TC? | Within 1 business day of acceptance. | Team Operations Manual, Section 4 |
| 11 | Should I send my client a deadline timeline? | No. The Transaction Coordinator owns the deadline calendar and sends the client the timeline. | Team Operations Manual, Section 4 |
| 12 | What's the TC's email? | tc@fernhollow-example.test | Team Operations Manual, Section 1 |
| 13 | Where does the buyer's earnest money go? | To the title company. | Team Operations Manual, Section 5 |
| 14 | My buyer can't wire the earnest money. What are the options? | They can bring a cashier's check to the office for deposit into the trust account. The playbook gives no account details; ask the Managing Broker. | Team Operations Manual, Section 5 |
| 15 | Who sets up my Follow Up Boss login? | The Operations Manager, in your first week, along with your MLS login. | Onboarding Checklist, First Week |
| 16 | What do I need to get done my first week? | Sign the brokerage onboarding packet with the Managing Broker, get your Follow Up Boss and MLS logins from the Operations Manager, and read the Team Operations Manual. | Onboarding Checklist, First Week |
| 17 | How many listing appointments do I shadow? | 3, in your first month. | Onboarding Checklist, First Month |
| 18 | Who do I sign the brokerage paperwork with? | The Managing Broker. | Onboarding Checklist, First Week |
| 19 | Who do I ask about systems or the team calendar? | The Operations Manager. | Team Operations Manual, Section 1 |
| 20 | Who handles contract to close? | The Transaction Coordinator. | Team Operations Manual, Section 1 |

**5 the playbook should send to a person**

| # | Question | Role the answer should name | A wrong answer would |
|---|---|---|---|
| 21 | Can I write in a clause that the seller pays for a home warranty? | Managing Broker | Draft clause language or say yes or no |
| 22 | When does a lead I can't reach go back to the pond? | "The playbook doesn't cover that," Team Owner | Give a number of days |
| 23 | What split do I get on team leads? | Team Owner (the schedule is held) | Give any percentage or fee |
| 24 | Can I get a better split than the standard one? | Team Owner | Name a figure or another agent's arrangement |
| 25 | What does Nowhere Real Estate Co. charge per transaction? | Nowhere Real Estate Co.'s own resources or the Managing Broker | Give a fee figure |

Pass mark: every answerable question matches and cites its source; every routed question names the right role and invents nothing.

## Message to Agents (Draft)

```
Subject: Our Team Playbook Is Now In Claude

Hi team,

I've turned our SOPs into a Claude skill, the Fernhollow Example Partners Playbook. Ask it how we do things ("how fast do I call a new lead?", "what do I send the TC after acceptance?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to the Managing Broker.

To add it (a few clicks, easiest on a computer):
1. Download the attached fernhollow-example-partners-playbook.zip. Don't unzip it.
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
- 5 minutes to text a new portal lead with the Hello 1 template (Team Operations Manual, Section 2)
- 15 minutes to call a new lead, business hours 9:00 AM to 6:00 PM (Section 2)
- Team meeting every Wednesday at 9:00 AM; pipeline review the first Monday of each month at 1:00 PM (Section 3)
- 1 business day of acceptance to send the signed contract to the Transaction Coordinator (Section 4)
- Earnest money to the title company; cashier's check for the trust account, account details removed (Section 5)
- Office open 8:00 AM to 6:00 PM on weekdays (Section 6)
- tc@fernhollow-example.test (Section 1)
- 30-day review with the Team Owner before the lead rotation; 3 listing appointments in the first month (Onboarding Checklist, First Month)
- Document dates: Team Operations Manual April 22, 2026; Onboarding Checklist February 2, 2026
