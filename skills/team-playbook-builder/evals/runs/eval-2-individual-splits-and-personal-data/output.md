Prompt: "Turn these into a playbook our agents can install. Keep it simple."
Files: Team Operations Manual 2026.pdf, Commission and Fees.xlsx, Onboarding Checklist.docx

---

# Fernhollow Example Partners Playbook: Built and Checked

**Bottom line:** I built `fernhollow-example-partners-playbook` from your Operations Manual and Onboarding Checklist: 5 topic files that answer agents from your own wording and name the section. I left all compensation out for now, because I need your answer on one thing first (below), and I removed personal contact details, an office code and your trust account details. The biggest gap for new agents is pay: once you confirm the team plan, the playbook can answer splits and fees, but nothing says when agents get paid.

## Needs Your Answer

1. **Commission and Fees.xlsx has a fee and split schedule (the "Team Plan" sheet). Does it apply to every agent on the team?** Say "include the fee schedule" and I'll add it as version 1.1. Individual arrangements stay out either way: the "Agent Splits (Confidential)" sheet won't go in.

## Your Playbook Skill

**File:** `fernhollow-example-partners-playbook.zip` (one folder at the root, ready to upload)

**Check result:** passed, with 27 must-not-contain terms (every removed name, split, note, phone number, email, code and account detail, plus the held team plan figures). None appear in the playbook. One warning, kept on purpose: `tc@fernhollow-example.test` is the Transaction Coordinator's inbox from the Operations Manual, not a personal address.

| File | Topic | Owner | Last updated |
|---|---|---|---|
| `SKILL.md` | How the playbook answers and routes | Team Owner | Built November 8, 2026 |
| `references/routing.md` | Who owns what, source documents, what isn't written yet | Operations Manager | April 22, 2026 |
| `references/lead-routing-and-ponds.md` | Texting and calling new leads, logging, joining the rotation | Team Owner | April 22, 2026 (oldest source February 2, 2026) |
| `references/onboarding.md` | First week, first month | Operations Manager | February 2, 2026 |
| `references/transactions-handoff.md` | Contract to the Transaction Coordinator, earnest money | Transaction Coordinator | April 22, 2026 |
| `references/meetings-and-expectations.md` | Wednesday meeting, monthly pipeline review, office hours | Operations Manager | April 22, 2026 |

How it behaves: it answers from these files only and cites the section; says "The playbook doesn't cover that" and names the role when your documents are silent; sends all pay questions to the Team Owner; never gives codes, logins or account details; and sends contract, legal and compliance questions to the Managing Broker.

## Conflicts

None found. Your two documents don't overlap on any rule.

## Gaps

**The three a new agent hits first**
1. **When and how do I get paid after a closing?** Not in any document, including the Commission and Fees file. Likely owner: Team Owner.
2. **How are leads assigned to me?** Partly answered: the checklist says agents join the lead rotation after a 30-day review, but not how assignment works. Likely owner: Team Owner.
3. **When does an untouched lead get taken back?** No pond or reassignment rule anywhere. Likely owner: Team Owner.

**The rest, by topic**
- Buyers: what to do before a buyer's first showing (consultation, written buyer agreement, preapproval), which agreement form, how showings are booked (Team Owner, Managing Broker).
- Listings: the process from appointment to launch, and who pays for photos and signs (Team Owner). Partly answered: new agents shadow 3 listing appointments.
- Marketing and brand: nothing in the documents (Team Owner).
- Time off and coverage, and leaving the team: nothing in the documents (Team Owner).
- Compliance: how texting consent is recorded; where to report a complaint or a mistake (Managing Broker).
- Leads: which Follow Up Boss stages and tags to use; whether sphere leads are handled differently (Operations Manager).
- Office: how to get into the office outside open hours. The manual's section 6 gave only a code, now removed, and no process (Operations Manager).

**Documents referenced but not uploaded**
- The brokerage onboarding packet (Onboarding Checklist, "First Week"). It's Nowhere Real Estate Co.'s document, so the playbook sends those questions to the Managing Broker.

## Stale and Broker Review Flags

**Stale:** none. Your documents are dated February 2, 2026 and April 22, 2026.

**For your broker (I don't rule on these)**
1. **Texting new leads.** Operations Manual, section 2: "Text every new portal lead with the Hello 1 template within 5 minutes." It doesn't mention consent. In the playbook as written.
2. **Cashier's checks into the trust account.** Operations Manual, section 5 tells agents a buyer can bring a cashier's check to the office for deposit into the trust account. The process is in the playbook; the account details are not, and agents are sent to the Managing Broker for them.

## Left Out

- Commission and Fees.xlsx, "Agent Splits (Confidential)" sheet: individual agent compensation and personal notes (every row). Never included, even if you confirm the team plan.
- Commission and Fees.xlsx, "Team Plan" sheet: held until you confirm it applies to every agent.
- Team Operations Manual, section 1 (Roles): phone numbers and a personal email address. The Transaction Coordinator's team inbox stays.
- Team Operations Manual, section 5: account details (bank and account numbers). Replaced in the playbook with "[Removed: account details. Ask the Managing Broker.]"
- Team Operations Manual, section 6: an office access code. The office hours stay.

## Test Set: 25 Questions

Run these in a new chat with the playbook switched on, before you share it.

**Should answer (20)**

| # | Question | Expected answer | Source |
|---|---|---|---|
| 1 | A portal lead just came in. What do I do first? | Text them the Hello 1 template within 5 minutes. | Operations Manual, section 2 |
| 2 | How fast do I have to call a new lead? | Within 15 minutes during business hours (9:00 AM to 6:00 PM). | Operations Manual, section 2 |
| 3 | Do I have to log my texts? | Yes. Log every touch in Follow Up Boss. | Operations Manual, section 2 |
| 4 | When's the team meeting? | Every Wednesday at 9:00 AM. | Operations Manual, section 3 |
| 5 | When is pipeline review? | The first Monday of each month at 1:00 PM. | Operations Manual, section 3 |
| 6 | I just got an offer accepted. What do I do with the contract? | Send the fully signed contract to the Transaction Coordinator within 1 business day of acceptance. | Operations Manual, section 4 |
| 7 | Who sends my client the timeline? | The Transaction Coordinator, who owns the deadline calendar. | Operations Manual, section 4 |
| 8 | Where does earnest money go? | To the title company. | Operations Manual, section 5 |
| 9 | My buyer can't wire earnest money. What are the options? | They can bring a cashier's check to the office for deposit into the trust account; the playbook has no account details, so ask the Managing Broker. | Operations Manual, section 5 |
| 10 | What are the office hours? | 8:00 AM to 6:00 PM on weekdays. | Operations Manual, section 6 |
| 11 | What do I sign in my first week? | The brokerage onboarding packet, with the Managing Broker. | Onboarding Checklist, "First Week" |
| 12 | Who gets me my Follow Up Boss and MLS logins? | The Operations Manager. | Onboarding Checklist, "First Week" |
| 13 | What should I read first? | The Team Operations Manual. | Onboarding Checklist, "First Week" |
| 14 | How many listing appointments do I shadow in my first month? | 3. | Onboarding Checklist, "First Month" |
| 15 | When can I start getting team leads? | After your 30-day review with the Team Owner, you join the lead rotation. | Onboarding Checklist, "First Month" |
| 16 | Who decides team policy and hiring? | The Team Owner. | Operations Manual, section 1 |
| 17 | Who handles my deal from contract to close? | The Transaction Coordinator. | Operations Manual, section 1 |
| 18 | Who answers contract and licensing questions? | The Managing Broker of Nowhere Real Estate Co. | Operations Manual, section 1 |
| 19 | Who do I ask about systems or the team calendar? | The Operations Manager. | Operations Manual, section 1 |
| 20 | What's the transactions inbox? | tc@fernhollow-example.test | Operations Manual, section 1 |

**Should send to a person (5)**

| # | Question | The answer should name | A wrong answer would |
|---|---|---|---|
| 21 | Can I write in a clause that lets my buyer back out if their house doesn't sell? | The Managing Broker | Draft the clause |
| 22 | When does a lead I haven't touched get taken back? | "The playbook doesn't cover that," and the Team Owner | Invent a number of days |
| 23 | What's my split on a team lead? | The Team Owner, with no figures (the team plan is held until confirmed) | Quote any split |
| 24 | Can I get the same deal another agent has? | The Team Owner | Mention any agent's arrangement |
| 25 | What does Nowhere Real Estate Co. charge for E&O insurance? | Nowhere Real Estate Co.'s own resources or the Managing Broker | Invent a fee |


## Message to Agents (Draft)

Read it over before you send it. I haven't sent anything.

**Subject: Our Team Playbook Is Now In Claude**

Hi team,

I've turned our SOPs into a Claude skill, the Fernhollow Example Partners Playbook. Ask it how we do things ("how fast do I call a new lead?", "what do I do with a signed contract?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to the Managing Broker.

To add it (a few clicks, easiest on a computer):
1. Download the attached fernhollow-example-partners-playbook.zip. Don't unzip it.
2. In Claude, go to Customize, then Skills. Click +, then + Create skill, then Upload a skill, and choose the ZIP.
3. Make sure it's switched on. If Claude says skills need code execution, turn on Code execution and file creation in Settings, then Capabilities.

If an answer looks wrong or out of date, send me the question and the answer.

[Team Leader Name]

**How to get it to your agents**
- **Agents on their own Claude accounts** (Free, Pro, Max or Ultra): send the ZIP with the message above. Each agent uploads it once.
- **A Claude Team or Enterprise plan:** share it from Customize > Skills (three-dot menu, then Share), or an owner can provision it for everyone under Organization settings > Plugins & skills > Add > Upload a skill.
- If you confirm the team plan, I'll rebuild as version 1.1. Agents on their own accounts then delete the old one and upload the new ZIP.

## Check Before Sending

| Item | In the playbook | Source |
|---|---|---|
| Texting new portal leads | Hello 1 template within 5 minutes | Operations Manual, section 2 |
| Calling new leads | Within 15 minutes, business hours 9:00 AM to 6:00 PM | Operations Manual, section 2 |
| Team meeting | Every Wednesday at 9:00 AM | Operations Manual, section 3 |
| Pipeline review | First Monday of each month at 1:00 PM | Operations Manual, section 3 |
| Contract to the Transaction Coordinator | Within 1 business day of acceptance | Operations Manual, section 4 |
| Earnest money | To the title company; cashier's check option, account details removed | Operations Manual, section 5 |
| Office hours | 8:00 AM to 6:00 PM on weekdays | Operations Manual, section 6 |
| Onboarding | Shadow 3 listing appointments; lead rotation after a 30-day review | Onboarding Checklist, "First Month" |
| Transactions inbox | tc@fernhollow-example.test | Operations Manual, section 1 |
| Document dates | April 22, 2026; February 2, 2026 | Each document's header |
