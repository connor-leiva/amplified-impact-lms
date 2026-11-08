Prompt: "My agents keep texting me the same questions. Here are our five team documents. Build us a playbook skill they can install."
Files: Bluebird Agent Handbook.docx, Buyer Process SOP.pdf, Listing Launch Checklist.pdf, Marketing and Brand Rules.docx, Tech Stack Training Transcript.txt

---

# Bluebird Example Group Playbook: Built and Checked

**Bottom line:** I built `bluebird-example-group-playbook` from your 5 documents: 8 topic files that answer agents from your own wording and name the section every time. The biggest problem is closing gifts: your Agent Handbook says the team pays up to $150 per side, and your Marketing and Brand Rules say gifts are the agent's own expense, so the playbook shows both until you decide. Decide that first, then fill the gaps agents will hit in month one, starting with pay and pond rules.

## Needs Your Answer

1. **Closing gifts:** the team pays up to $150 per side (Agent Handbook, September 8, 2026) or the agent pays (Marketing and Brand Rules, August 20, 2026)? Tell me which and I'll rebuild as version 1.1.
2. **Pond rules:** the handbook points to a Lead Management SOP I don't have, and your October 6 training call says it isn't finished. Upload it when it's done and I'll add it.

## Your Playbook Skill

**File:** `bluebird-example-group-playbook.zip` (one folder at the root, ready to upload)

**Check result:** passed. Name, description (682 characters), frontmatter, folder-at-root ZIP, an Owner and Last updated line in every reference file, no em dashes, no phone numbers, account numbers or access codes. No warnings.

| File | Topic | Owner | Last updated |
|---|---|---|---|
| `SKILL.md` | How the playbook answers and routes | Team Lead | Built November 8, 2026 |
| `references/routing.md` | Who owns what, source documents, what isn't written yet | Operations Manager | September 8, 2026 |
| `references/lead-routing-and-ponds.md` | First call, logging, the New Lead action plan, the pond (not written yet) | Team Lead | October 6, 2026 (oldest source September 8, 2026) |
| `references/buyers-and-showings.md` | Before the first tour, showings, offers | Team Lead | May 14, 2026 |
| `references/listings.md` | Listing launch steps | Marketing Coordinator | July 1, 2026 |
| `references/marketing-and-brand.md` | Brand, social media, closing gifts (CONFLICT) | Marketing Coordinator | September 8, 2026 (oldest source August 20, 2026) |
| `references/crm-and-tech.md` | Logins, Follow Up Boss, Dotloop, Canva, Google Drive | Operations Manager | October 6, 2026 (oldest source September 8, 2026) |
| `references/meetings-and-expectations.md` | Monday meeting, Thursday role-play, logging | Team Lead | September 8, 2026 |
| `references/policies-and-compliance.md` | Legal questions and what the Designated Broker reviews | Team Lead | September 8, 2026 (oldest source May 14, 2026) |

How it behaves: it answers from these files only, ends every answer with "Source: [document], [section]," warns when a section is more than 12 months old, shows both sides of the closing gift conflict, sends contract, legal and compliance questions to the Designated Broker, and says "The playbook doesn't cover that" plus the role to ask when your documents are silent.

## Conflicts

**1. Who pays for closing gifts**
- Bluebird Agent Handbook, "Closing Gifts" (September 8, 2026): "The team pays for closing gifts up to $150 per side. Order them through the Marketing Coordinator at least one week before closing."
- Marketing and Brand Rules, "Closing Gifts" (August 20, 2026): "Closing gifts are the agent's own expense. The team does not reimburse closing gifts."
- Decision owner: Team Lead (the handbook gives the Team Lead team policy).

No other conflicts. The approval window appears only in the Marketing and Brand Rules (2 business days), and the logins process in the handbook and the training call agrees (#ops).

## Gaps

**The three a new agent hits first**
1. **When and how do I get paid, and what are the splits and fees?** None of the documents cover compensation. Likely owner: Team Lead.
2. **How are leads assigned to me, and what keeps me in the rotation?** Partly answered: the handbook gives the Team Lead "lead rotation decisions" and covers the first call, but nothing says how assignment works. Likely owner: Team Lead.
3. **When does a lead get taken back or moved to the pond?** The handbook says "Pond rules: see the Lead Management SOP," and on the October 6, 2026 training call (9:22): "We'll do pond rules on another call. That doc isn't finished." Likely owner: Team Lead.

**The rest, by topic**
- Contract to close: what the agent hands the Transaction Manager after acceptance and by when (a first-month question); how earnest money and wire instructions are handled (Transaction Manager).
- Time off and coverage: who covers an agent's clients when they're away (a first-month question); what hours agents must be reachable, beyond the first-call window (Team Lead).
- Leaving the team: what happens to an agent's leads, pipeline and pending deals, and what they owe or keep. The handbook's "Leaving the Team" section says "Coming soon." (Team Lead)
- Leads: which Follow Up Boss stages and tags the team uses; whether sphere leads are treated differently (Operations Manager, Team Lead).
- Buyers: who reviews the buyer agreement form (the SOP names "the brokerage's written buyer agreement" but not a reviewer); an open house safety policy (Designated Broker, Team Lead).
- Meetings: activity expectations beyond logging; who an agent's mentor is (Team Lead).
- Compliance: how texting consent is recorded; where to report a complaint or a mistake on a deal (Designated Broker).

**Documents referenced but not uploaded**
- Lead Management SOP (Agent Handbook, "Follow Up Boss"). The training call says it isn't finished.
- The team offer checklist (Buyer Process SOP, section 3: Google Drive, Bluebird > Buyers > Offer Checklist). The playbook tells agents where it lives but can't answer from it.

Every gap is in the playbook's `routing.md` under "Not Written Yet" with the role to ask. I didn't write a policy for any of them.

## Stale and Broker Review Flags

**Stale:** none. Your documents are dated May 14, 2026 to October 6, 2026, all within 12 months.

**For your broker (I don't rule on these)**
1. **Advertising.** Marketing and Brand Rules: "Every ad and social profile shows Storybook Realty Co. with the team name." Advertising rules vary by state. In the playbook as written.
2. **Coming soon marketing.** Listing Launch Checklist: "Coming soon marketing only as the MLS allows; ask the Designated Broker first." In the playbook as written, routed to the Designated Broker.

## Left Out

- No personal data found: no phone numbers, personal emails, codes, account details or individual compensation.
- Tech Stack Training Transcript, 9:15: an agent's question, which isn't policy. The answer at 9:22 is used for the pond gap.

## Test Set: 25 Questions

Run these in a new chat with the playbook switched on, before you share it.

**Should answer (20)**

| # | Question | Expected answer | Source |
|---|---|---|---|
| 1 | How fast do I need to call a new lead? | First call within 10 minutes during business hours (8:00 AM to 7:00 PM). | Agent Handbook, "Follow Up Boss" |
| 2 | When do I have to log my calls? | Log every conversation in Follow Up Boss the same day. | Agent Handbook, "Follow Up Boss" |
| 3 | Can I turn off the New Lead action plan on a lead? | Not without asking the Team Lead. Every new lead gets the Bluebird New Lead action plan. | Tech Stack Training Transcript, 2:10 |
| 4 | What has to happen before I tour homes with a new buyer? | A buyer consultation (in person or by video), the brokerage's written buyer agreement signed, and a preapproval letter or proof of funds. | Buyer Process SOP, 1 |
| 5 | Do I need a signed buyer agreement to talk with someone at my open house? | No. Talking with a buyer at an open house doesn't need one; a live virtual tour does. | Buyer Process SOP, 1 |
| 6 | My buyer doesn't have a preapproval yet but wants to tour. Who can okay that? | The Team Lead approves any exception. | Buyer Process SOP, 1 |
| 7 | How do I book showings? | Through ShowingTime. | Buyer Process SOP, 2 |
| 8 | When do I log showing feedback? | In Follow Up Boss within 24 hours. | Buyer Process SOP, 2 |
| 9 | Where's the offer checklist? | Google Drive: Bluebird > Buyers > Offer Checklist. | Buyer Process SOP, 3 |
| 10 | Who looks at non-standard terms in an offer? | The Designated Broker, before the offer goes out. | Buyer Process SOP, 3 |
| 11 | I just signed a listing. What do I do with the agreement? | Upload it to Dotloop within 24 hours of signing. | Listing Launch Checklist |
| 12 | Who schedules listing photos, and how fast? | The Marketing Coordinator, within 3 business days of the signed agreement. | Listing Launch Checklist |
| 13 | Does the team pay for listing photos? | Yes, up to $275 per listing, billed to the team. | Listing Launch Checklist |
| 14 | What day do listings go live? | Thursday, with the first open house the first weekend after going live. | Listing Launch Checklist |
| 15 | Can I market a listing as coming soon? | Only as the MLS allows, and ask the Designated Broker before any coming soon post. | Listing Launch Checklist |
| 16 | How long does marketing approval take? | Send it to the Marketing Coordinator and allow 2 business days. | Marketing and Brand Rules, "Brand" |
| 17 | Can I post a photo of my clients at the closing table? | Not without their written OK. | Marketing and Brand Rules, "Social Media" |
| 18 | Which meetings do I have to attend? | Monday sales meeting, 10:00 to 11:00 AM, required; Thursday role-play at 2:00 PM is optional and recommended in your first 90 days. | Agent Handbook, "Weekly Rhythm" |
| 19 | How do I get my logins? | Post in #ops; the Operations Manager sets you up within one business day. Don't share logins. | Agent Handbook, "Getting Help"; Tech Stack Training Transcript, 0:41 |
| 20 | Where do contracts go, and how do I name the file? | Dotloop; name each loop with the property address. | Tech Stack Training Transcript, 4:32 |

**Should send to a person (5)**

| # | Question | The answer should name | A wrong answer would |
|---|---|---|---|
| 21 | Can I write my own clause making the offer contingent on my buyer's job transfer? | The Designated Broker | Draft the clause or say whether it works |
| 22 | When does a lead I haven't called go back to the pond? | "The playbook doesn't cover that," the unfinished Lead Management SOP, and the Team Lead | Make up a number of days |
| 23 | Does the team pay for my closing gift? | Both versions (team pays up to $150 per side, Agent Handbook; agent's own expense, Marketing and Brand Rules) and the Team Lead | Pick one |
| 24 | Can I get a better split? | The Team Lead | Quote any split or promise anything |
| 25 | What's Storybook Realty Co.'s monthly desk fee? | Storybook Realty Co.'s own resources or the Designated Broker | Invent a fee |

## Message to Agents (Draft)

Read it over before you send it. I haven't sent anything.

**Subject: Our Team Playbook Is Now In Claude**

Hi team,

I've turned our SOPs into a Claude skill, the Bluebird Example Group Playbook. Ask it how we do things ("what do I need before a first tour?", "when do listings go live?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to the Designated Broker.

To add it (about two minutes, easiest on a computer):
1. Download the attached bluebird-example-group-playbook.zip. Don't unzip it.
2. In Claude, go to Customize, then Skills. Click +, then + Create skill, then Upload a skill, and choose the ZIP.
3. Make sure it's switched on. If Claude says skills need code execution, turn on Code execution and file creation in Settings, then Capabilities.

If an answer looks wrong or out of date, send me the question and the answer.

[Team Leader Name]

**How to get it to your agents**
- **If your agents use their own Claude accounts** (Free, Pro, Max or Ultra), send the ZIP with the message above. Each agent uploads it once.
- **If your team is on a Claude Team or Enterprise plan,** share it from Customize > Skills (three-dot menu, then Share), or an owner can provision it for everyone under Organization settings > Plugins & skills > Add > Upload a skill.
- **Before sharing,** run the 25 questions. When you settle closing gifts or finish the pond SOP, send it to me and I'll rebuild as version 1.1.

## Check Before Sending

| Item | In the playbook | Source |
|---|---|---|
| First call | Within 10 minutes during business hours (8:00 AM to 7:00 PM) | Agent Handbook, "Follow Up Boss" |
| Closing gifts (CONFLICT) | Team pays up to $150 per side, ordered at least one week before closing; or the agent's own expense | Agent Handbook, "Closing Gifts"; Marketing and Brand Rules, "Closing Gifts" |
| Meetings | Monday 10:00 to 11:00 AM; Thursday 2:00 PM; first 90 days | Agent Handbook, "Weekly Rhythm" |
| Showing feedback | Within 24 hours | Buyer Process SOP, 2 |
| Listing agreement upload | Within 24 hours of signing | Listing Launch Checklist |
| Photos | Within 3 business days; team pays up to $275 per listing | Listing Launch Checklist |
| Go live | On a Thursday; first open house the first weekend after | Listing Launch Checklist |
| Marketing approval | Allow 2 business days | Marketing and Brand Rules, "Brand" |
| Logins | Within one business day | Tech Stack Training Transcript, 0:41 |
| Offer checklist location | Bluebird > Buyers > Offer Checklist | Buyer Process SOP, 3 |
| Document dates | September 8, 2026; May 14, 2026; July 1, 2026; August 20, 2026; October 6, 2026 | Each document's header |
