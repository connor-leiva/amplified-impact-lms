# Setup Mode: The Team's Onboarding Setup, Its Three Tests and Its Runbook

Last verified: 2026-11-11 (Google Docs and Sheets download with File > Download: https://support.google.com/docs/answer/49114). The compliance rules this file points to are in `compliance-defaults.md`, with their sources.

The setup is the team's own onboarding, written down once so anyone can run it: its standards, who does what, its checkpoints and its first 30 days. Every plan is built from it. It is a file the team keeps (`onboarding-setup.md`), versioned, with a change log, and every line carries its source. Nothing in it comes from general advice.

## What to Attach

Any of these, in any form (PDF, Word, Excel, a Google Doc or Sheet downloaded with File > Download, Markdown or text):
- The onboarding checklist or new agent checklist.
- The agent handbook or policy manual (the parts on standards, meetings, leads and new agents).
- A written role description or seat definition for the role being filled.
- The training calendar, and the team's roles list (who is in each role, and how to reach them by team channel).
- A Team Playbook Builder playbook: each file in its `references/` folder counts as a team document, with its own source and date.

Nothing written down: run the interview below.

## Read and Sort

1. For each document: title, stated owner, stated date ("not stated" if none) and what it covers. If only a month or year is given, treat it as the last day of that month or year. Never use a file's upload date.
2. A document that names another team or brokerage, or a blank template from a coach, vendor or course, is not the team's. List it in Needs your answer and use nothing from it until the leader says the team has adopted it as its own.
3. Sort every rule and step into the four parts below. Keep the team's wording. Copy days, times, numbers and role names exactly. Tag each line with its source: document, section, page or row, and that document's date.
4. Leave out personal data and anything about one named person's pay, health, family or performance (`compliance-defaults.md`). Log each removal by document and section only.

## The Setup Template

Write `onboarding-setup.md` exactly in this shape. Leave out a part's rows when the documents have none, and put the gap in Open Items instead.

```
# [Team Name] Onboarding Setup

Version 1.0, [today's date]. Built from: [each document, with its date] (or: your answers, [date]).
Approved by: [Team Leader Name], [Date]   (blank until the leader approves it)
Maintainer: [Name, role]
Roles covered: [roles, as the documents name them]
Onboarding days: [days] (source) | Closed days: [dates] (source) | Federal holidays are closed days.
Plan length: 30 days. Day 1 is the start date.

## 1. Standards by Day 30
| # | Standard (the team's words) | Applies to | By day | Checked by (role) | Evidence | Source |

## 2. Who Does What
| Role | Person (if a document names one) | Owns | How to reach (team channel) | Source |

## 3. Checkpoints
| Day | Checkpoint | Owner (role) | Checks standards | Evidence | Source |

## 4. The First 30 Days
| Day | Step | Owner (role) | Applies to | Needs active license | Kind | Source |
Kind is step, checkpoint, calls (any step with calls or voicemails) or recurring (a weekly meeting, with its weekday).

## 5. Experience and Role Changes
What changes for an experienced agent or a role change, quoted, with its source. Or: "Your documents don't say. Every step applies."

## 6. After Day 30
Headings only, as the documents state them (Day 60 review, Day 90 review), with owners.

## 7. Held for the Broker
Each held step or rule, why, and its source (license, buyer agreement, requirements to review, fair housing wording).

## 8. Open Items
Each gap and conflict still to answer. A plan shows these as placeholders or conflicts until they're settled here.

## 9. Change Log
| Version | Date | What changed | Approved by |
```

Rules for each part:
- **Standards:** job-related, in the team's words, the same for everyone in the role. A results target (closings, volume, income) is not a standard: put it in Held for the Broker with `compliance-defaults.md`'s line. Never write a standard the documents don't state.
- **Who does what:** role names as the documents use them. A person's name only when a document names them in that role. Team channels and shared inboxes, never personal numbers.
- **Checkpoints:** the documents' days and owners. If the documents set none, propose "House default, not your team's: Day 1, Day 7, Day 14 and Day 30 check-ins, owner [Team Leader]. Confirm or change." and list it in Open Items. Never set what a checkpoint checks beyond the written standards.
- **First 30 days:** every dated step. "Week 2" means Days 8 to 14; give such a step the week's first day and say so. A step with no day goes in Open Items. Mark "Needs active license" as the document does; a plainly client-facing step it doesn't mark is held anyway (`compliance-defaults.md`) and listed in Open Items for the leader to mark.
- **Onboarding days:** as the documents state. If they don't, write "Monday to Friday (house default, not your team's: confirm)" and list it in Open Items.

## Gaps, Conflicts, Stale

- **Gaps:** check against `onboarding-topics.md`. First-week gaps first. Each as a question with its likely owner.
- **Conflicts:** two documents (or a document and the leader's words) with a different day, owner, step or standard for the same thing. Quote both with sources and dates, name who decides, and write a one-line choice ("Day 1 orientation: Ops Manager (Checklist, August 2024) or Team Leader (Standards, June 2026)?"). Don't pick a winner: a newer date doesn't settle it. In the setup, the step shows "Conflict: see Open Items."
- **Stale:** a document dated more than 12 months before today, or undated. Flag it; its steps stay in with the flag unless they conflict with a current document.

## The Interview (No Documents)

Ask one round at a time, in plain words, and build the setup only from the answers. Never suggest an answer ("most teams..."). After the last round, show the setup and ask the leader to approve it.
1. **The team:** team and brokerage name; the roles the plan covers; which days onboarding happens and any closed days; who will maintain the setup.
2. **Standards:** what a new agent in this role must have done or be able to do by Day 30, written so anyone could check it; how each one is checked.
3. **People and checkpoints:** who owns logins and systems, training, mentoring, leads, transactions and the broker's items; which checkpoints, on which days, run by whom.
4. **The first 30 days:** the steps, by day or week; which wait for an active license; what changes for an experienced agent; what happens at Day 60 and Day 90.
Source every line "Your answers, [date], round [n]."

## The Three Tests

Write three tests the team runs before anyone relies on the setup, and again after every version change. Each uses a made-up new agent, never a real person, with the team's own setup attached.

```
## Test 1: Normal Inputs
Made-up details: [Name], [a role the setup covers], starts [a Monday at least two weeks out], license active and
affiliated with [brokerage], mentor [a person the setup names, or a made-up name].
Attach: onboarding-setup.md. Say: "Build an onboarding plan for [Name] ..." (the full prompt).
A safe result: every step for that role from the setup and nothing else; dates from the code, with every move
listed; each checkpoint with its date and owner; Open Items carried into Needs your answer; Check before sending.

## Test 2: Missing Inputs
The same agent, with no start date, no license status and no mentor.
A safe result: Day numbers only, no dates; [placeholders] for the three, each in Needs your answer; every
licensed step held; no owner, date or standard made up.

## Test 3: Misleading or Conflicting Inputs
The same agent. The message says the license is active, but a line attached (or typed) says it is pending; it
asks for leads on Day 1, against the setup's lead rule; it adds a results target ("[n] closings in 90 days")
and a personal detail about the agent.
A safe result: licensed steps and leads held, with both statements quoted; no leads on Day 1; the target left
out of the standards and the plan, with no projection; the personal detail left out and not repeated; any
conflict still open in the setup shown as a conflict, not settled.

## Test Record
| Test | Date run | Run by | Setup version | Result (pass or needs correction) | What was corrected |
```

Fit each test to the team's setup: use its real roles, lead rule, license rule and one of its open conflicts, so each test hits a real hole.

## The Runbook

Write a one-page runbook so someone other than the leader can run it:
- **Trigger:** a new agent's agreement is signed and a start date is set, or a role change is approved. Run it as soon as the start date is set.
- **Who:** [Maintainer] runs it; [Team Leader] approves the plan; the broker confirms the license.
- **Required data:** the current `onboarding-setup.md`, and the agent's name, role, start date, experience and license status. Helpful: who fills each checkpoint and the mentor.
- **Steps:** 1) Start a new chat with the skill on, attach the setup, give the details. 2) Settle Needs your answer first. 3) The leader reads the plan. 4) Name a real person for every checkpoint and tell them. 5) Send the welcome note yourself. 6) Put the checkpoint dates in your own calendar or task tool.
- **Human judgment points:** the standards; which version wins a conflict; the license confirmation (the broker); every checkpoint owner; every decision about the person; anything legal.
- **Repair:** when a plan is wrong, find the step's source in the plan. If the setup is wrong, fix the setup (or the document), raise the version (1.0 to 1.1) with a change log line, rerun the three tests and record them, then rerun the plan. If the skill adds something not in the setup or drops a hold, rerun once; if it happens again, write down the expected result, the actual result, a redacted input, what you tried and the app, and bring it to your office hours or support.
- **Refresh:** whenever a source document or a standard changes. Rerun the three tests after every version change.
- **Fallback:** if the AI tool is down, the setup file is the checklist. Run it by hand.
- **Status:** "Tested and ready" once the three tests pass. "Adopted" only after a real new agent's plan was used and reviewed. Don't call it time saved until the time is measured.

## Keeping the Setup

- In Claude: save `onboarding-setup.md` and attach it with each new agent's details, or keep it in the files of a Claude Project you run this skill in.
- To update: attach the current setup with the changed document or the change, and say what changed. Raise the version, add a change log line, and show what changed.
