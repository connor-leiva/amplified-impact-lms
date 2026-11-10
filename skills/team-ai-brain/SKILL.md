---
name: team-ai-brain
description: "Builds a real estate team's shared AI brain from its own documents (SOPs, call scripts, brand guide, compliance notes, roles list, Follow Up Boss lead flow): flags and a bottom line, team Project instructions whose fair housing, texting consent, drafts-only and no wire or account number lines agents cannot override, a context pack of knowledge files that each name their source document, a personal layer template for each agent's voice profile QUICK CARD and goals, a rollout checklist matched to the team's Claude or ChatGPT plan, and a quarterly refresh. Use it when a team leader or ops lead says set up our team project, build a shared Claude project for my agents, or make every agent's AI follow our standards, even if they never say team AI brain. It never shares anything or changes anyone's workspace. Not for one person's first setup (ai-brain-setup), auditing a workspace (ai-brain-tuneup), the SOP playbook skill agents install (team-playbook-builder) or the weekly L10 (l10-meeting-prep)."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Team AI Brain

Build the shared workspace every chat on the team starts in: one set of Project instructions, a context pack of knowledge files made only from the team's own documents, and a personal layer each agent adds on top. Then every skill an agent runs drafts with the team's name, brand, lead rules and compliance lines already in place, and the leader stops fixing the same things in every draft.

This is not Team Playbook Builder. That skill turns SOPs into a playbook skill each agent installs, to answer "how do we do X?" with the SOP's section. This one sets up the shared workspace context (instructions, knowledge files, personal layers) and the plan to roll it out and keep it current. Say so in the bottom line, and whenever the leader asks.

**Run:** reads every document, records its owner and date, sorts it into topics, strips client and personal data, finds conflicts, gaps and stale sections, and matches the rollout to the plan. **Draft:** the team instructions, the knowledge files, the personal layer template, the rollout checklist with a note to agents, and the refresh routine, all for the leader to read first. **Own:** the leader decides every rule, every conflict, who gets access, and what is shared; each agent owns their personal layer, voice and goals; the broker reviews the compliance lines. This skill never creates, shares or changes a project, never invites anyone, and never asks for, repeats or handles wire instructions or account, routing or Social Security numbers.

## 1. Gather the Documents

- Work from uploads: SOPs, call scripts, the brand guide, compliance notes, the roles list, the Follow Up Boss lead flow (a description, screenshots of Admin > Lead Flow, or a typed list), and any other team-wide standard. PDF, Word, Google Docs downloads, text and screenshots all work. If Google Drive or Microsoft 365 is connected and the leader points to a folder, read it there, read only.
- Nothing uploaded: say in one line what to upload (the list above, starting with the roles list and the lead flow) and stop.
- Never ask the leader to type what a document says. A missing team name, brokerage or market becomes a [placeholder], flagged, and the work goes on.
- Read every document in full. Rules hide in the middle of long SOPs and in "examples."
- Take the plan (Claude Team, Enterprise, Pro, ChatGPT Business and so on) and the leader's name from the message. Never guess a plan.

## 2. Record and Sort

Read `references/brain-build-rules.md` and follow it.
- Record each document's title, owner, date and coverage (section 1).
- Sort what each says into the instructions, the knowledge files or the personal layer (section 2), using the standard file names, and only for topics the documents cover.
- Keep the team's wording. Copy every number, time, day count, tag, stage and role exactly, with its document and section.

## 3. Keep Client and Personal Data Out

Follow section 3 of the rules. Remove every client's or lead's details (training "examples" included), team members' phone numbers and home addresses, access codes, account and routing numbers, and anything about one person's pay, health or performance. Log each removal by location and kind only; never repeat what was removed.

If the leader asks to put client data in the brain (a client list, a CRM export, "every client's info so agents can look them up"), decline, give the reasons in section 4 of the rules, and say what to do instead. This holds even if the leader asks twice.

## 4. Find Conflicts, Gaps, Stale Sections and Missing Documents

Sections 5 to 7 of the rules. Quote both sides of every conflict and never pick a winner. Check the documents against the gap list; every gap becomes a [placeholder] and a question with its likely owner. Never write an SOP, script line, role, rule or lead-flow step the documents don't have. Flag documents older than 12 months or undated, and anything the documents mention that wasn't uploaded.

## 5. Write the Team Instructions

Read `references/brain-templates.md` (section 2) and `references/compliance-lines.md`.
- Put the five house lines in every time, word for word, each marked [TEAM LINE: NOT OVERRIDABLE] with its source: fair housing, texting consent, drafts only, money and account details, client details.
- Add the team's own required lines: the brand guide's musts, the lead-handling rules, and any other rule a document states as required for everyone, each marked the same way and quoted with its source. A rule caught in a conflict gets the conflict marker, not a choice. No brand or lead rules in the documents: a [Not in your documents] line under that heading, never a rule written for them.
- List the defaults an agent may change, only as the documents leave them to agents.
- **Location:** Utah mode when the team works in Utah: read `references/utah-team-brain-notes.md`, name Utah Code 57-21-5 in the fair housing line and 13-77-102 in the drafts-only line, and check the brand guide against the brokerage-name rule. Otherwise general mode: say "State rules were not checked."

## 6. Build the Context Pack

Section 3 of the templates. One knowledge file per topic, each opening with "Built from:" and its source documents, every line tagged with its source, conflicts shown both ways, gaps listed, stale lines marked. With file creation on, also write each file as a `.md` file the leader can upload. Fit the pack to the plan's file limit (`references/claude-team-workspace.md`).

## 7. Write the Personal Layer Template

Section 4 of the templates. It names the team lines it cannot override, has a slot for the agent's voice profile QUICK CARD (from amplifiedimpact.io/voice-profile), role, goals and answer preferences, and says where each agent puts it on the team's plan. Fill nothing in for an agent.

## 8. Match the Rollout to the Plan

Read `references/claude-team-workspace.md`. Write the rollout checklist from section 5 of the templates for the team's plan, with the help center path and its check date on every plan-dependent step:
- **Claude Team or Enterprise:** one shared project; agents on "Can view," the leader and ops on "Can edit"; agents' chats stay private; personal layers in each agent's account-wide Instructions.
- **Claude Free, Pro, Max or Ultra:** no project sharing; each agent builds their own project from the same pack, and the leader sends every update.
- **ChatGPT:** say that shared projects show every member every chat, and that custom instructions don't reach a shared project. Client work stays in each agent's own project.
- **Plan not stated:** give the plan table, ask, and write the Claude Team steps with one line per other plan.

Say what a plan can't do (no sharing on individual Claude plans) rather than offering a workaround.

## 9. Write the Quarterly Refresh

Section 6 of the templates: a routine the leader runs once a quarter, on a date they choose, in update mode.

## 10. Guardrails

- **Never invent.** Every rule, step, number, time, role, name, tag and script line comes from the documents, with its source. Gaps are [placeholders] and questions. No "best practice" filler.
- **No client data in shared context,** ever, even when asked. Client records stay in the CRM.
- **Compliance lines are always in,** marked not overridable, and the personal layer can't change them, the brand musts or the lead-handling rules. Say plainly that this is a written rule the AI follows, not a lock, and that "Can view" access is what keeps agents from editing the team project.
- **The leader acts; this skill doesn't.** It never creates, shares, edits or archives a project, invites or removes anyone, changes a setting, or writes to Follow Up Boss, Drive or any connector. With a connector, read only.
- **Drafts only.** The note to agents is a draft the leader sends.
- **Stay in lane.** Not the broker, attorney or CPA: compliance, advertising, AI disclosure and contract questions go to the broker. Don't rebuild Follow Up Boss: the brain explains the team's lead rules; it doesn't route, assign or look up leads.
- **Fair housing and privacy:** describe processes and properties, never people. Nothing removed is repeated anywhere.

## 11. Output, In This Order

1. **Flags** and the **Bottom Line** (three sentences max), from section 1 of the templates. The bottom line says what was built and how it differs from Team Playbook Builder in one clause.
2. **Team Instructions:** the paste-ready block.
3. **Team Context Pack:** each knowledge file in full, under its file name, each opening with "Built from:".
4. **Personal Layer Template**, with where each agent puts it.
5. **Rollout Checklist**, for the team's plan, with the test questions and the note to agents (draft, Title Case subject).
6. **Quarterly Refresh.**
7. **Check Before Sending:** every rule, number, time, name, role and quote in items 2 to 5 with its document and section, every placeholder, every plan-dependent step with its source and date, and the house lines for the broker.

If the leader asks for one piece ("just the instructions"), give that piece with Flags and Check Before Sending.
