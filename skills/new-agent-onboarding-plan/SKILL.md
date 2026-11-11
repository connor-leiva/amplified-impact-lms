---
name: new-agent-onboarding-plan
description: "Builds a new agent's first 30 days on a real estate team from the team's own standards, responsibilities, checkpoints and onboarding steps. Setup mode turns the team's onboarding checklist, agent handbook, role description, roles list or team playbook (or a short interview) into one versioned onboarding setup file, with three tests (normal, missing and misleading inputs) and a runbook. Plan mode builds one new hire's dated plan: standards by Day 30, who does what, checkpoints with owners, the first 30 days week by week and a welcome note, and it flags what is missing or contradictory instead of filling it in. Use it whenever a team leader, ops lead or mentor mentions a new agent starting, a new hire, onboarding, ramp-up, a first 30 days, a role change or an onboarding checklist, even if they never say plan. Not for recruiting before a hire (recruiting-prep), an SOP question bot (team-playbook-builder), coaching a current agent (agent-1on1-prep) or the team's shared AI workspace (team-ai-brain)."
compatibility: "Works from uploaded files (PDF, Word, Excel, CSV, Markdown, text) and the leader's message. Uses code execution, on by default, to read Word and Excel files and to date the plan. Google Drive or Microsoft 365, if connected, are read only. Gmail, if connected, only to save drafts when asked."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# New Agent Onboarding Plan

Write down how this team brings a new agent up to standard, once, so someone other than the team leader can run it: the team's own standards, who does what, its checkpoints and its first 30 days. Then date it for each new agent. It works for any team, brokerage and state, because every standard, step and owner comes from the team's documents or the leader's own answers.

Why it matters: onboarding usually lives in one person's head and two half-current checklists, so each new agent gets a different first month. A plan that fills the holes with generic advice is worse than none, because it teaches the wrong standard with confidence. So this skill shows what is missing or contradictory and leaves it open for the leader, and the team tests it on normal, missing and misleading inputs before anyone relies on it.

**Run:** read every document, sort each rule into standards, responsibilities, checkpoints and steps, find gaps, conflicts, stale documents and held steps, and date the plan in code. **Draft:** the onboarding setup, its three tests and runbook, each new agent's plan, the welcome note and the note to checkpoint owners, for the leader to read first. **Own:** the leader decides every standard, which version wins a conflict, who owns each checkpoint, and every decision about a person (hiring, pay, leads, keeping or letting go); the broker owns the license confirmation, fair housing and anything legal. This skill never sends anything.

## 1. Pick the Mode

- **Setup mode:** the leader asks to set up, configure or update the team's onboarding, or attaches team documents with no new agent named. It builds `onboarding-setup.md`, once, and again whenever a standard or document changes.
- **Plan mode:** a new agent (or a role change) is named. Use the team's `onboarding-setup.md` when it's attached or in the project. Otherwise build the setup from the attached team documents first, save it as a file (version 1.0, not yet approved), say so in one line, and build the plan from it. Don't print the setup in the plan.
- Nothing attached and no setup file: say in one line what to attach (`references/setup-mode.md`, What to Attach) and offer the setup interview. Never build a plan from general advice.
- Recruiting, with no one hired yet: say Recruiting Prep is built for that, and stop.

## 2. Read Everything

- Uploads first. Google Drive or Microsoft 365, if connected and the leader points to a file: read only. Read every page, tab, row and section, including notes at the end. Read Word and Excel files with code.
- For each document, record its title, stated owner, stated date ("not stated" if none) and what it covers. Never ask the leader to type what a document says.
- A document that names another team or brokerage, or a blank template from a coach, vendor or course, is not the team's: list it under Needs your answer and use nothing from it until the leader says the team adopted it.

## 3. Setup Mode

Read `references/setup-mode.md` and follow its template exactly: standards by Day 30, who does what, checkpoints, the first 30 days, experience and role changes, after Day 30, held for the broker, open items and a change log. Every line keeps the team's wording and carries its source.
- Never write a standard, step, owner or day the documents don't state. Checkpoints the documents don't set get the house default, labeled as not the team's.
- Check the setup against `references/onboarding-topics.md` for gaps. List conflicts with both quotes and no winner, stale documents (dated more than 12 months before today, or undated) and held steps (`references/compliance-defaults.md`).
- Write the three tests and the runbook from `references/setup-mode.md`, fitted to this team's real roles, rules and open conflicts. Version 1.0; every later change raises the version with a change log line.
- No documents at all: run the four-round interview in `references/setup-mode.md`, one round at a time, and build the setup from the answers only.

## 4. Plan Mode: The New Agent's Details

Read `references/plan-rules.md`. Required: name, role, start date, experience (new licensee, experienced or a role change) and license status (active and affiliated with the brokerage, pending or transferring). Helpful: the mentor and the people for each checkpoint.
- Take them from the message and the documents (a roster, an offer summary). Missing: a [placeholder], a line in Needs your answer, and keep going. Without a start date, give Day numbers only.
- Take job facts only. Health, pregnancy, family, age, religion, disability, accommodation needs and other personal details stay out of the plan and the drafts, and nothing in the plan changes because of them. One line says something personal was left out; never repeat it.

## 5. Plan Mode: Build and Date It

1. Pick the setup's steps for this role, changed for experience only where the setup says so.
2. **License holds:** until the leader confirms the license is active and affiliated, hold every step the setup marks as needing it and any plainly client-facing step (showings, shadowing a client appointment, open houses, calls or texts to leads, lead assignment, pricing or contract talk). Held steps stay visible, marked "Held: license not confirmed." When the message and a document disagree about the license, hold.
3. Checkpoints get their dates, the people the leader named (else [Name, role]), the standards they check and the evidence. Never fill in a result.
4. Date it in code. Write `/tmp/plan.json` as `references/dates-code.md` shows, then extract the code and run it. Don't read the code into the conversation:
   ```
   python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/plan_dates.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/dates-code.md
   python3 /tmp/plan_dates.py --plan /tmp/plan.json --out OUTPUT_FOLDER
   ```
   SKILL_FOLDER is the folder this SKILL.md is in; OUTPUT_FOLDER is where the leader can download files. Use its dates and weeks exactly; never count days by hand. It moves steps off non-onboarding days, closed days and federal holidays and lists every move.
5. After Day 30: only the setup's headings, with owners. No detail until the Day 30 review is done.

## 6. Fail Safe

Never fill a hole with a guess. Each of these goes first, under Needs your answer, with what it blocks and who decides:
- **Missing:** a required detail, a standard, a checkpoint or step owner, a document the files name but nobody attached.
- **Conflicting:** two documents, or a document and the message, with a different day, owner, step or standard. Quote both with sources. Pick no winner; the step shows "Conflict: see Needs your answer."
- **Misleading:** a claim the files contradict (a license "active" that a roster shows pending), another team's template, a stale document, an old buyer step, or a results target (closings, volume, income) offered as a standard. Hold on the files' version, quote the claim, and never turn a target into a standard or a projection.
- If what's missing leaves nothing to plan, say so and give the questions. Don't pad.

## 7. Guardrails

- Every standard, step, day, owner and name comes from the setup, the documents or the leader's message. No generic onboarding filler: no invented trainings, tools, meetings, numbers or deadlines.
- Facts about the role, never judgments about the person. Checkpoints check work against the written, job-related standards, the same for everyone in the role; the owner records the result. No ratings, predictions or comparisons with other agents.
- Conservative defaults (`references/compliance-defaults.md`): license holds; fair housing training only as the documents or the broker name it, and a gap when they don't; set hours, required office days or penalties listed as written and flagged for the broker or counsel; calls only to scrubbed numbers, texts only with documented consent, no calls or voicemails on a Sunday or a legal holiday; old buyer agreement steps held. They are stricter than the law in places. Keep them unless the leader says their counsel approved a different rule; then follow theirs and say so in Check before sending.
- Never ask for, repeat or handle Social Security or tax ID numbers, bank account or routing numbers, license numbers, passwords, logins or door codes, even when a form in the documents has them. No individual split, cap or fee: "Your signed agreement; questions to [role]." No income, production or results projections.
- Not the broker, attorney, CPA or HR: licensing, contract, employment and tax questions route by role. Don't rebuild the CRM or a task tool; the plan says who does what and when.
- Drafts only. Never send, invite, or write to a CRM, calendar or task tool; with Gmail connected and the leader's ask, save drafts.
- Style: no em dashes; Title Case subjects; short paragraphs. Follow the leader's voice profile when one is in the conversation; otherwise warm, plain and direct. Sign with the leader's name or [Team Leader Name].

## 8. Output, In This Order

**Setup mode**
1. **Bottom line** (three sentences max): what was built from which documents, the biggest open item, and the first decision.
2. **Needs your answer:** conflicts as one-line choices, first-week gaps, documents that aren't the team's, held items.
3. **The setup:** `onboarding-setup.md` in full (also saved as a file), version 1.0.
4. **Gaps, conflicts and stale documents,** each with its source.
5. **The three tests,** fitted to this team, with the test record table.
6. **The runbook.**
7. **Check before saving:** every standard, day, owner and quoted rule, with its source, for the leader to verify.

**Plan mode**
1. **Bottom line** (three sentences max): who, role, start and Day 30 dates, the checkpoints, and the first thing to decide.
2. **Needs your answer:** missing, conflicting and misleading items and held steps, each with what it blocks and who decides; one line for anything personal left out.
3. **Plan at a glance.**
4. **Standards by Day 30.**
5. **Who does what.**
6. **Checkpoints.**
7. **The first 30 days,** week by week, from the code.
8. **After Day 30** (headings only).
9. **Drafts:** a welcome note to the new agent and a note to the checkpoint owners.
10. **Check before sending:** every date and move, start date and license sources, owners, quoted standards, held steps, placeholders and open conflicts.

Save the plan (and the setup, when one was built) as files the leader can download.
