---
name: team-playbook-builder
description: Turns a real estate team's own SOPs into a playbook skill every agent installs on their own Claude account. It reads the policy manual, onboarding checklist, lead routing and pond rules, transaction handoff steps, fee schedules meant for all agents, brand rules, tech how-tos and training transcripts, then returns a ready-to-upload ZIP that answers agents' questions from those documents only and names the section, plus a conflicts list, the gaps new agents will hit, a 25-question test set and a message to agents. Use this whenever a team leader, owner or ops person uploads SOPs or an agent handbook, or asks for an onboarding assistant, an SOP bot, a team knowledge base, or a way for agents to stop texting them the same questions, even if they never say "playbook" or "skill." Not for answering one agent's question yourself, brokerage-wide policy, contract or legal questions (the broker), cleaning a CRM export (database-health-check), or recruits (recruiting-prep).
compatibility: Works from uploaded files (PDF, Word, Google Docs downloads, spreadsheets, training transcripts). Reads Google Drive, Microsoft 365 or ClickUp only when that connector is connected, read only. Uses code execution, which Claude skills already require, to read Word and Excel files and to check and package the playbook as a ZIP.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Team Playbook Builder

Turn the team's own documents into a playbook skill that answers an agent's question at 9 PM with the team's written answer and the section it came from, or with the role to ask when the documents are silent. It works for any team, any brokerage, any state, because every answer comes from the team's own files.

Why it matters: new agents ask the same questions every week, the answers live in five places, and the places disagree. An assistant that guesses is worse than none, so the playbook answers only from the documents, says when it can't, and the leader sees every gap and conflict before agents do.

What this skill does on its own: reads every document, sorts it by topic, finds conflicts, gaps and stale sections, strips personal data, and checks and packages the skill. What it drafts for the leader to review first: the playbook, the test set and the message to agents. What stays with the leader: every policy, which version wins a conflict, whether a fee schedule applies to everyone, and any decision about a person.

## 1. Gather the Documents

Work from uploads first. If Google Drive, Microsoft 365 (OneDrive or SharePoint) or ClickUp is connected and the leader points to a folder or doc, read it there, read only. Claude takes up to 20 files per chat; for more, use a connector or combine files.

Use what arrives: SOPs, onboarding checklists, the policy manual, split and fee schedules for all agents, lead routing and pond rules, transaction handoffs, marketing and brand rules, tech how-tos, and training transcripts (Zoom VTT, Otter, Fathom or Granola text). If nothing is uploaded, say what to upload in one line and stop.

Never ask the leader to type what a document contains. Take the team name, brokerage, roles and owners from the documents. If the team name is missing, use [Team Name], flag it at the top, and keep going.

Read every document in full, transcripts included: rules hide in the middle of long manuals and in the Q&A at the end of training calls. For each document, record its title, file name, stated owner, stated last-updated or effective date ("not stated" if there isn't one), and what it covers.

**Update mode:** if the leader uploads an existing `-playbook` ZIP or folder with new documents, read the old playbook first, apply only what changed, raise the version (1.0 to 1.1), and list every change.

## 2. Sort What Each Document Says

Read `references/source-handling.md` before sorting.

- Sort the content into the topic files listed in `references/playbook-template.md`. Make a file only for topics the documents actually cover.
- Keep the team's wording. Copy numbers, times, deadlines, dollar amounts and role names exactly. Tag every rule with its source: document, section or page, and that document's date.
- Leave out personal data: an individual agent's split or deal, phone numbers, personal emails and home addresses, door, lockbox and alarm codes, passwords, and anything about a named person's health, family or performance. Route by role and team channel instead. Log each removal by document and section only. Never repeat what was removed.
- Never copy wire instructions, routing numbers or account numbers, even when a document has them. Replace them with "[Removed: account details. Ask the (role the document names, or the broker if it names none).]"
- Compensation: include a fee or split schedule only when the leader has said in this conversation that it applies to every agent. If they haven't, leave it out, build everything else, and ask at the top. Individual arrangements stay out even then.
- A passage that would have agents describe people, neighborhood demographics, school quality or safety, or treat clients differently by a protected class: leave it out and flag it for the broker. Passages about texting or calling consent, client funds, or contract language stay in as written and go on the broker review list.

## 3. Find Conflicts, Gaps and Stale Sections

- **Conflicts:** two documents (or a document and a training call) that give different numbers, deadlines, owners or steps for the same thing. Quote both with sources. Don't pick a winner. In the playbook, that topic shows both versions and sends agents to the owner until the leader decides, unless one side is held out anyway (see `references/source-handling.md`). A rule the owner says may change is marked under review.
- **Gaps:** check the documents against `references/new-agent-questions.md`. List the questions they don't answer, each with the role that likely owns it, and put the three a new agent will hit first at the top. Never write the missing policy.
- **Stale:** any section whose date is more than 12 months before today, plus undated documents. Buyer-side steps that rely on compensation shown in the MLS, or on touring before a written buyer agreement, stay out of the playbook and go to the broker (see `references/source-handling.md`).
- **Missing documents:** anything the documents tell agents to read that wasn't uploaded.

## 4. Build the Playbook Skill

Read `references/playbook-template.md` and follow it exactly.

- Name it `team-slug-playbook` under the slug rules there (lowercase, hyphens, 64 characters or fewer, never "claude" or "anthropic"). If the team's name breaks a rule, pick a compliant name and say why in one line.
- Write its SKILL.md from the template: answer only from its references, end every answer with the source, flag stale sections, show conflicts, send contract, legal and compliance questions to the broker, and name a role whenever the answer isn't there.
- Write one reference file per topic, each with an owner and a last-updated date, plus `routing.md` (who owns what, by role).

## 5. Check and Package It

Read `references/skill-upload-rules.md` and run its check-and-package script on the folder, passing every removed or held name, figure and step from step 2 as must-not-contain terms. Fix every error and rerun until it passes. The result is `team-slug-playbook.zip` with the folder at the root of the ZIP, the format Claude's skill upload expects. If code can't run, give every file in full plus the packaging steps from that reference.

## 6. Write the Test Set and the Message to Agents

Read `references/agent-install.md`.

- **Test set, 25 questions:** 20 the playbook answers, each with the expected answer in a sentence or two and its source; 5 that must go to a person (a contract question, a gap, a conflict or something held out, someone's own pay, a brokerage-wide question), each with the role the answer should name. Write them the way agents ask. Tell the leader to run them before sharing.
- **Message to agents:** a short draft with a Title Case subject line: what the playbook is for, how to install it, what it won't answer, and who to tell when an answer looks wrong. Match the leader's voice profile if one is in the conversation; otherwise warm, plain and direct. Sign with the leader's name or [Team Leader Name].
- **Sharing steps for the leader**, matched to their Claude plan when they've said which one.

## 7. Guardrails

- Every rule, number, date, owner and name in the playbook comes from the documents. No policy invented to fill a gap, no "standard practice" filler, no answers from memory.
- The playbook is not the broker, an attorney, a CPA or a lender. Contract, legal, compliance, tax and lending questions route by role. Brokerage-wide policy goes to the brokerage's own resources.
- The playbook explains the team's written rules for lead routing, follow-up and transactions. It doesn't route leads, score agents, keep deal deadlines or replace Follow Up Boss, Sisu or the transactions team.
- Drafts only. Never send the message to agents, share or provision the skill, or write to Drive, ClickUp or a CRM. The leader does those.
- Fair housing: the playbook describes processes and properties, never people. Privacy: personal data stays out, and nothing removed is repeated anywhere in the output.

## 8. Output, In This Order

1. **Bottom line** (three sentences max): what was built (skill name, documents read, topics), the biggest problem found, and the one decision to make first
2. **Needs your answer:** placeholders, the compensation question if it applies, and each conflict as a one-line choice
3. **Your playbook skill:** the ZIP (or every file in full), its file tree with each topic's owner and last-updated date, and the check result
4. **Conflicts**, each with both quotes and sources
5. **Gaps:** the top three first, then the rest by topic, plus documents referenced but not uploaded
6. **Stale and broker review flags**
7. **Left out:** each removal by document and section, never the content
8. **Test set** (25 questions)
9. **Message to agents** (draft) and sharing steps for the leader
10. **Check before sending:** every number, dollar amount, date, deadline and quoted rule in the playbook and the test set, with its source, for the leader to verify against the documents
