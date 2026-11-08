# Test Set, Message to Agents and Sharing

Last verified: 2026-11-08, against Claude's Help Center (links at the end). Claude's menus change, so the click paths carry the date they were checked.

## The 25-Question Test Set

The leader runs these in a new chat with the playbook turned on, before any agent sees it.

**20 the playbook should answer**
- Cover every topic file, at least one question each, and spend the rest on the topics agents ask about most in their first month (pay timing, leads, the transaction handoff, logins, meetings).
- Ask the way agents talk: "How long do I have before my lead goes back to the pond?" not "State the pond policy."
- Include the exact numbers, times and dollar amounts from the documents in the expected answers, and two or three "who do I ask about..." questions.
- Format: number, question, expected answer (one or two sentences), source (document and section).

**5 the playbook should send to a person**
1. A contract or legal question (for example, whether a clause can be added to an offer): expect the broker role, and no drafted language.
2. A question from the gaps list: expect "The playbook doesn't cover that" and the role from `routing.md`.
3. A question that hits a conflict: expect both versions with sources and the decision owner.
4. A question about one person's pay ("Can I get a better split than the schedule?"): expect the team leader role. Never use a removed name or figure in the test set.
5. A brokerage-wide question (brokerage fees, licensing, brokerage benefits): expect the brokerage's own resources or the broker.
- Format: number, question, the role the answer should name, and what a wrong answer would look like (a guessed policy, drafted contract language).

**Pass mark:** every answerable question matches and cites its source; every routed question names the right role and invents nothing. Any miss means a topic file needs a fix: rebuild in update mode.

## Message to Agents (Draft)

The leader sends it; never send it yourself. Title Case subject, short paragraphs, the leader's voice profile if there is one, otherwise warm, plain and direct. Fill every bracket.

```
Subject: Our Team Playbook Is Now In Claude

Hi team,

I've turned our SOPs into a Claude skill, the [Team Name] Playbook. Ask it how we do things ("when does a lead go to the pond?", "what do I send transactions after acceptance?") and it answers from our own documents and tells you which one.

When it doesn't know, it says so and tells you who to ask. Contract and legal questions still go to [broker role].

To add it (about two minutes, easiest on a computer):
1. Download the attached [team-slug]-playbook.zip. Don't unzip it.
2. In Claude, go to Customize, then Skills. Click +, then + Create skill, then Upload a skill, and choose the ZIP.
3. Make sure it's switched on. If Claude says skills need code execution, turn on Code execution and file creation in Settings, then Capabilities.

If an answer looks wrong or out of date, send me the question and the answer.

[Team Leader Name]
```

On a Team or Enterprise plan, swap the three steps for "It's in your Claude skills list now. Turn it on in Customize, then Skills."

## How to Share It, by Plan

**Agents on their own accounts (Free, Pro, Max, Ultra).** Each agent uploads the ZIP to their own account, as in the message. On these plans, each person uploads skills to their own account; there's no way to push a skill to someone else's. Skills added on the web or desktop app also work in chat on the phone apps. If an agent on Free doesn't see the upload option, skills may not be on their plan (Claude's pages disagree on Free).

**A Claude Team or Enterprise plan.** Three options, from the Help Center:
- **Share with specific people:** Customize > Skills, find the skill, click the three-dot menu, choose Share, and enter names or emails. It shows up in their skills list, off until they turn it on. Recipients get updates automatically.
- **Provision for everyone (owners):** Organization settings > Plugins & skills, click Add, choose Upload a skill, and pick the ZIP. It's on for everyone by default.
- **Publish to the organization:** open the skill in Customize > Skills and click Publish to org. If the organization requires review, an owner approves it first.
If the Share or Publish button is missing, the organization owner turns sharing or publishing on under Organization settings > Plugins & skills, on the Policy tab.

## Updating the Playbook

- Rebuild in update mode with the changed documents. The version goes up and the output lists what changed.
- Shared on a Team or Enterprise plan: when you update a shared skill, recipients get the new version at their next use. The Help Center doesn't spell out how to load a new ZIP into a shared skill; if you don't see a way, delete the old one, upload the new ZIP and share it again. Published: publish again (it may go through review).
- Agents on their own accounts: each agent deletes the old version (Customize > Skills, open the skill, click the three-dot menu next to the toggle, choose Delete) and uploads the new ZIP. Claude's Help Center doesn't describe replacing a skill in place, so delete first.

## If Something Goes Wrong

- **Upload fails:** the Help Center lists a ZIP over the size limit, a folder name that doesn't match the skill name, a missing SKILL.md, and invalid characters in the name or description. The check script catches all four; rerun it.
- **Claude doesn't use the playbook:** check that it's switched on in Customize > Skills, then name it in the question ("Use the [Team Name] playbook: ...").

## Sources

- Claude Help Center, "Use skills in Claude" (upload path, sharing, provisioning, publishing, deleting, troubleshooting, plans, code execution path): https://support.claude.com/en/articles/12512180-use-skills-in-claude (checked 2026-11-08)
- Claude Help Center, "Provision and manage skills for your organization" (owner upload path, on by default, publishing policy): https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization (checked 2026-11-08)
- Claude Help Center, "Create and edit files with Claude" (code execution on by default for Free, Pro, Max and Ultra): https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (checked 2026-11-08 by Amplified's vendor review)
- claude.com docs, "Extend Claude" (skills added on web or desktop work in chat on mobile): https://claude.com/docs/extend/overview (checked 2026-11-08 by Amplified's vendor review)
- claude.com docs, Skills overview (lists plans without Free): https://claude.com/docs/skills/overview (checked 2026-11-08 by Amplified's vendor review)
