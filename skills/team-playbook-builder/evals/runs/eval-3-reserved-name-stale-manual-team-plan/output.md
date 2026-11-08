Prompt: "We're on a Claude Team plan. Build the playbook for my team from these two files, and tell me the best way to get it to my agents."
Files: Okafor Team Policy Manual.pdf, Contracts QA Training Call.vtt

---

# Okafor Example Team Playbook: Built and Checked

**Bottom line:** I built `okafor-example-team-playbook` from your policy manual and your September 30 training call: 6 topic files that answer agents from your own wording and name the section. The biggest problem is age: the policy manual is dated May 2024, so most answers will carry a "confirm it's still current" note until you refresh it, and two of its buyer steps predate the August 2024 industry changes, so I held them out. Since you're on a Team plan, the best way to get it to agents is to provision it as an owner (or share it with them), so nobody has to upload a file.

**About the name:** your team's name contains "Claudette," and a Claude skill's name can't contain the word "claude" anywhere, so the skill is `okafor-example-team-playbook`. Agents still see your full team name in its description.

## Needs Your Answer

1. **The 21-day pool rule:** on the September 30 call (00:02:09) you said "I'm not sure we're keeping that." Keep 21 days, change it, or drop it? Until you say, the playbook gives agents the written rule and your note.
2. **Buyer agreement timing:** the playbook uses the rule from your call (before the first showing, starting October 1). Confirm, and update the manual, which still says "before writing an offer."
3. **The policy manual (May 2024):** is the rest still current? When you send an updated version, I'll rebuild as version 1.1 and the stale notes go away.

## Your Playbook Skill

**File:** `okafor-example-team-playbook.zip` (one folder at the root, ready to upload or provision)

**Check result:** passed. Name (no reserved word), description (784 characters), frontmatter, folder-at-root ZIP, an Owner and Last updated line in every reference file, no em dashes, no phone numbers, account numbers or access codes, and neither held buyer step anywhere in the playbook.

| File | Topic | Owner | Last updated |
|---|---|---|---|
| `SKILL.md` | How the playbook answers and routes | Team Leader | Built November 8, 2026 |
| `references/routing.md` | Who owns what, source documents, what isn't written yet | Team Leader | September 30, 2026 (oldest source May 2024) |
| `references/buyers-and-showings.md` | Buyer agreement and preapproval before the first showing | Team Leader | September 30, 2026 (oldest source May 2024) |
| `references/policies-and-compliance.md` | Contract questions, custom clauses, addenda | Managing broker | September 30, 2026 (oldest source May 2024) |
| `references/transactions-handoff.md` | The 24-hour handoff, the deadline calendar | Transaction coordinator | September 30, 2026 (oldest source May 2024) |
| `references/listings.md` | Listing photos and social posts | Listing Manager | May 2024 (stale) |
| `references/meetings-and-expectations.md` | Lead follow-up, the shared pool (UNDER REVIEW), team meetings | Team Leader | September 30, 2026 (oldest source May 2024) |

How it behaves: it answers from these files only and cites the section, adds a "confirm it's still current" note to anything from the May 2024 manual, shows the pool rule as under review, sends every contract question, custom clause and non-standard addendum to Vince Fictionale and never drafts clause language, and says "The playbook doesn't cover that" plus the role to ask when your documents are silent.

## Conflicts

**1. When the buyer agreement gets signed**
- Okafor Team Policy Manual, section 2 (May 2024): "Have buyers sign the Exclusive Buyer Agency Agreement before writing an offer."
- Contracts Q and A Training Call, 00:00:15 (September 30, 2026): "Starting October 1, every buyer signs the brokerage's buyer agreement before the first showing. Not before the offer. Before the first showing."
- The manual's step is held out of the playbook anyway (see Broker Review), so the playbook shows only the call's rule, with its source. Decision owner: you, as Team Leader. Please confirm and update the manual.

## Gaps

**The three a new agent hits first**
1. **When and how do I get paid, and what are the splits and fees?** Neither document covers compensation. Likely owner: Team Leader.
2. **How are leads assigned to me?** The manual covers the 10-minute call and the shared pool, not assignment. Likely owner: Team Leader.
3. **How do I get my logins (CRM, MLS, transaction system)?** Not covered. Likely owner: Team Leader or whoever runs operations.

**The rest, by topic**
- Buyers: a buyer consultation before showings; showing scheduling and feedback (Team Leader). Partly answered: buyer agreement and preapproval are covered.
- Contract to close: how earnest money and wire instructions are handled (transaction coordinator).
- Marketing: who approves marketing before it goes out; the rules for agents' own social accounts (Team Leader).
- Time off and coverage; leaving the team (Team Leader).
- Compliance: how texting consent is recorded; where to report a complaint or a mistake (managing broker).

**Documents referenced but not uploaded:** none.

## Stale and Broker Review Flags

**Stale (dated more than 12 months before today)**
- Okafor Team Policy Manual, every section (1 to 7): dated May 2024. Each rule in the playbook carries that date, and the playbook tells agents to confirm with you. Two rules are backed by the newer call: the 24-hour handoff (00:01:41) and the managing broker for contract questions (00:00:45 and 00:01:13).

**For your broker (I don't rule on these)**
1. **Two buyer steps held out of the playbook.** Policy Manual, section 2: "Have buyers sign the Exclusive Buyer Agency Agreement before writing an offer" and "Check the MLS for the cooperating compensation before showing a home." NAR's practice changes took effect August 17, 2024: they removed offers of compensation from the MLS and require a written agreement with a buyer before touring a home. Your September 30 call already moved the agreement to before the first showing; the MLS compensation step has no replacement yet, so the playbook sends agents to you and Vince. Rules can differ by MLS and state, so confirm with your broker.
2. **Advertising.** Policy Manual, section 6: "Every post about a listing names Fable Ridge Realty." Advertising rules vary by state. In the playbook as written.

## Left Out

- Policy Manual, section 2: two buyer steps, held for broker review (above).
- Training call: agents' questions (they aren't policy; the answers are used).
- No personal data found: no phone numbers, emails, codes, account details or individual compensation.

## Test Set: 25 Questions

Run these in a new chat with the playbook switched on, before you share it. Your two documents hold about 15 rules, so questions 2, 5, 13 and 19 ask about the most-used rules in other words.

**Should answer (20)**

| # | Question | Expected answer | Source |
|---|---|---|---|
| 1 | How fast do I have to call a new lead? | Within 10 minutes between 8:00 AM and 8:00 PM, with the note that the section is dated May 2024 and to confirm with the Team Leader. | Policy Manual, section 1 |
| 2 | A lead came in this evening. Does the 10-minute rule still apply? | It applies between 8:00 AM and 8:00 PM (May 2024 note). | Policy Manual, section 1 |
| 3 | How long before an untouched lead goes back to the shared pool? | 21 days per the May 2024 manual, but it's under review: the Team Leader said on the September 30, 2026 call she isn't sure it's staying. Confirm with her. | Policy Manual, section 1; Training Call, 00:02:09 |
| 4 | When does my buyer need to sign the buyer agreement? | Before the first showing, starting October 1: the brokerage's buyer agreement. | Training Call, 00:00:15 |
| 5 | Can I show a home first and get the agreement signed when we write the offer? | No. Before the first showing, not before the offer. | Training Call, 00:00:15 |
| 6 | Does my buyer need a preapproval before we tour? | Yes, preapproval before the first showing (May 2024 note). | Policy Manual, section 2 |
| 7 | Who orders listing photos? | The Listing Manager (May 2024 note). | Policy Manual, section 3 |
| 8 | How quickly are listing photos ordered? | Within 2 business days of the signed listing agreement (May 2024 note). | Policy Manual, section 3 |
| 9 | How much does the team pay for listing photos? | Up to $250 (May 2024 note). | Policy Manual, section 3 |
| 10 | Can I post my listing on Instagram before it's active? | No posting a listing before it is active (May 2024 note). | Policy Manual, section 6 |
| 11 | What has to be in a social post about my listing? | It names Fable Ridge Realty (May 2024 note). | Policy Manual, section 6 |
| 12 | I just got an offer accepted. What do I do? | Every deal goes to the transaction coordinator within 24 hours of acceptance; email the fully signed contract. | Training Call, 00:01:41; Policy Manual, section 4 |
| 13 | Do we still use the transaction coordinator on every deal? | Yes, every deal, within 24 hours of acceptance. | Training Call, 00:01:41 |
| 14 | Who keeps the deadline calendar? | The transaction coordinator (May 2024 note). | Policy Manual, section 4 |
| 15 | When's the team meeting? | Every Wednesday at 9:00 AM (May 2024 note). | Policy Manual, section 5 |
| 16 | My buyer wants the seller to pay for a home warranty. How do I ask for it? | In the offer, on the standard form. Anything custom runs by Vince first. | Training Call, 00:00:45 |
| 17 | The listing agent sent their own addendum. What do I do? | Send it to Vince before the buyer signs anything; he reviews every non-standard addendum. | Training Call, 00:01:13 |
| 18 | Who answers contract or legal questions? | The managing broker, Vince Fictionale. | Policy Manual, section 7; Training Call |
| 19 | Do I need anyone to look at a non-standard addendum? | Yes, Vince reviews every non-standard addendum. | Training Call, 00:01:13 |
| 20 | What brokerage are we with? | Fable Ridge Realty. | Policy Manual, header and section 6 |

**Should send to a person (5)**

| # | Question | The answer should name | A wrong answer would |
|---|---|---|---|
| 21 | Write me a clause that makes the seller pay for a home warranty. | The standard form and Vince Fictionale | Draft any clause language |
| 22 | When do I get paid after a closing? | "The playbook doesn't cover that," and the Team Leader | Guess a timeline |
| 23 | Should I check the MLS for the buyer agent's compensation before a showing? | That it's under review, and the Team Leader and the managing broker | Tell the agent to check MLS compensation |
| 24 | Can I get a better split? | The Team Leader | Quote any split or promise anything |
| 25 | What's Fable Ridge Realty's policy on errors and omissions insurance? | Fable Ridge Realty's own resources or the managing broker | Invent a policy |

## Getting It to Your Agents (Team Plan)

**Best option, if you're an owner of your Claude organization: provision it.** Organization settings > Plugins & skills, click Add, choose Upload a skill, and pick the ZIP. Every member gets it, switched on by default. No agent uploads anything.

**If you're not an owner:**
- **Share it with your agents:** Customize > Skills, find the skill, click the three-dot menu, choose Share, and enter their names or emails. It shows up in their skills list switched off until they turn it on. When you update a shared skill, they get the new version at their next use.
- **Or publish it to your organization:** open the skill in Customize > Skills and click Publish to org. If your organization requires review, an owner approves it first.
- If you don't see Share or Publish to org, your organization's owner turns them on under Organization settings > Plugins & skills, on the Policy tab.

Either way, upload it to your own account first (Customize > Skills, +, + Create skill, Upload a skill) and run the 25 questions before anyone else sees it. Click paths are from Claude's Help Center, checked November 8, 2026.

## Message to Agents (Draft)

Read it over before you send it. I haven't sent anything.

**Subject: Our Team Playbook Is Now In Claude**

Hi team,

I've turned our policy manual and our contracts training into a Claude skill, the Okafor Example Team Playbook. Ask it how we do things ("when does my buyer sign the agreement?", "what do I do with a listing agent's addendum?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to Vince.

It's in your Claude skills list now. Turn it on in Customize, then Skills, if it isn't on already.

Some answers come with a note that a section is from May 2024. I'm updating the manual; until then, check those with me.

If an answer looks wrong or out of date, send me the question and the answer.

Claudette

## Check Before Sending

| Item | In the playbook | Source |
|---|---|---|
| Lead call | Within 10 minutes, 8:00 AM to 8:00 PM | Policy Manual, section 1 (May 2024) |
| Shared pool (UNDER REVIEW) | 21 days | Policy Manual, section 1 (May 2024); Training Call, 00:02:09 |
| Buyer agreement | Before the first showing, starting October 1 | Training Call, 00:00:15 (September 30, 2026) |
| Listing photos | Within 2 business days; team pays up to $250 | Policy Manual, section 3 (May 2024) |
| Handoff | Within 24 hours of acceptance | Training Call, 00:01:41; Policy Manual, section 4 |
| Team meeting | Every Wednesday at 9:00 AM | Policy Manual, section 5 (May 2024) |
| Contract questions and addenda | Vince Fictionale, managing broker | Policy Manual, section 7; Training Call, 00:00:45 and 00:01:13 |
| Document dates | May 2024; September 30, 2026 | Each document's header |
| Sign-off on the agent message | "Claudette," taken from the manual's owner line; change it if someone else sends it | Policy Manual, owner line |
