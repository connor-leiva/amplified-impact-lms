---
name: fub-automation-audit
description: "Audits a real estate team's Follow Up Boss automations from what the owner copies out of FUB: action plans (screenshots, a printed page, pasted or typed steps), the automations list, Lead Flow, stages, lead sources and any outside texting tool. Returns flags, a bottom line, an inventory of every plan, automation and automated text with its trigger, what it sends by day and each row's source, then gaps (stages and sources with nothing attached, no stop on reply, plans with no next step, long silences), overlaps that double-message a lead, texting-consent risk and a ranked fix list the owner works in FUB. Read-only. Use it when an owner or ops lead says audit our action plans, check our FUB automations, are our drips overlapping, or are our auto texts safe, even if they never say audit. Not for cleaning or re-engaging the database (database-health-check), the weekly pipeline review (fub-pipeline-review), the team's SOP playbook (team-playbook-builder), or the first reply to one new lead (speed-to-lead-reply)."
metadata:
  author: Amplified Impact
  version: "1.0"
---

# FUB Automation Audit

Follow Up Boss shows one action plan, one automation and one Lead Flow source at a time. This skill lays them side by side, by stage and by lead source, so the owner sees what the team really sends: where nothing happens, where two plans fire together, which plans keep going after a lead replies, and which automated texts can reach a lead nobody documented consent for. It only reads; every fix is a step the owner takes in Follow Up Boss.

**Run:** it reads every screenshot, page and list, builds the inventory with a source for each row, works out each step's day, and finds the gaps, the overlaps and every automated text. **Draft:** the ranked fix list, the questions for the team and the template wording notes, for the owner to read first. **Own:** the owner makes every change in Follow Up Boss and in any texting tool, decides which sources get an automated text, keeps the consent records and the form wording, and takes every consent and legal question to the broker or an attorney. This skill never changes, pauses or creates anything, and never sends anything.

## 1. Get the Inputs

Read `references/fub-inputs.md` first.
- **The best set:** every action plan (name, where it's applied, the pause-on-reply checkbox, every step); the automations list (trigger, conditions, action, on or off); Lead Flow (each source's plan and initial text); the stage list; the lead sources and how each captures text consent; any outside texting tool's campaigns and what starts them.
- **How it arrives:** Follow Up Boss has no export for plans or automations (none found in its help center; its API lists plan names only). Screenshots, a page printed to PDF, steps pasted from the edit screen, a typed list or a CSV the owner made all work.
- **Nothing attached:** say in one line what to gather (the list above, starting with Admin > Action Plans, each plan, Edit) and stop.
- **Some pieces missing:** work with what's there. In What I Used, name each missing piece and the checks it stopped: no automations list means no stage gaps, no automation overlaps and no closing-tag check; no stage list means no stage gaps; no consent notes means every automated text is "consent capture not described."
- Never ask the owner to retype what a screenshot or file shows. A word or number you can't read is [illegible] and goes in Check Before Sending.
- **Version:** note whether the inputs show classic Action Plans and Automations or Automations 2.0. Unclear: write fixes for classic and say so.
- **Location:** Utah mode when the team works in Utah (from the inputs or the message): read `references/utah-texting-notes.md`. Otherwise general mode: say "State rules were not checked."

## 2. Build the Inventory

Follow `references/audit-rules.md`, sections 1 and 2:
- One row for every action plan, automation, Lead Flow initial text and outside texting campaign: how it starts, what it sends by day, stop on reply, how it ends, and where the row came from (file and plan, page, row or screenshot).
- Work out each step's day as the rules say and show the arithmetic. Follow Up Boss counts each step from the one before.
- Quote names, triggers, conditions, tags and template wording exactly. A missing setting is "not shown"; an owner's guess is quoted as theirs and marked not confirmed.

## 3. Find the Gaps

Section 3 of the rules: stages with nothing attached, lead sources with nothing attached, plans with stop on reply off or not shown, plans that end with no next step, and long silences (the team's own standard when given, otherwise the labeled defaults). Each with its evidence and source.

## 4. Find the Overlaps

Section 4: two or more plans, automations or texts started by the same event, and every day a lead would get two messages, side by side with the day math. Check Follow Up Boss's own rules in `references/fub-inputs.md` (How Follow Up Boss Runs Plans) before calling anything an overlap, and mark every assumed link "to confirm."

## 5. Check the Texting-Consent Risk

Read `references/outreach-rules.md` and section 5 of the rules.
- List every automated text: what starts it, every source or stage it can reach, and the consent capture the inputs describe for each.
- Treat every automated text to a new lead as a risk unless its trigger reaches only leads with documented consent. Give each text one result (Risk, Check, or Lower risk if records hold) and say what to check; a Check on a text to new leads counts as a risk until consent is confirmed. Never rule on whether anything is legal.
- Consent that names only a portal, a lead company or "real estate professionals," not the team or brokerage, is a Risk: no automated text to that source until the broker confirms it covers the team (a conservative default, section 5 of the rules).
- Check each text for the sender and an opt-out line, and its send window. Follow Up Boss holds initial texts by the agent's time zone, not the lead's.
- State the federal basics once, from `outreach-rules.md`, with its citations and Last verified date. Utah mode: add the Utah lines. General mode: say state rules were not checked.
- List manual text tasks in one line: the agent sends them, and the same consent rule applies.

## 6. Review Template Wording (Three Checks Only)

Section 6: opt-out lines, sender identity and fair housing words, only on templates whose wording is in the inputs. Quote the line once and suggest the smallest change. Never rewrite a template or comment on tone. Action plan emails carry Follow Up Boss's own unsubscribe wording, so don't flag them for it. Under the conservative defaults, where an email template's wording is in the inputs and has no line saying it is a marketing email, recommend adding one: a recommendation, not a legal finding.

## 7. Write the Fix List

Rank by section 7. Each fix says what is wrong, where the audit found it, and the clicks in Follow Up Boss for the account's version. A choice (which plan keeps running, whether a source should be texted at all) goes to the owner with the options. A change in an outside tool is named as one, with the Follow Up Boss step that starts it. Never say a change was made.

## 8. Guardrails

- **Read only.** Never change, pause, create, delete or apply a plan, automation, stage, tag, template or Lead Flow setting, even with a connector and even if asked; never send, schedule or start anything. Asked to make a change, give the steps.
- **Never invent** a step, day, delay, trigger, condition, tag, template or wording. Quote what the input shows. Template wording gets only the three checks.
- **Consent:** never infer it from a phone number, a portal sending the lead, an inquiry, or the Initial Text being on. Follow Up Boss's own help center says a website form isn't an opt-in without text opt-in wording. Never call a text legal, illegal, compliant or a violation; the broker or an attorney answers that.
- **Conservative defaults:** consent that names only a portal, a lead company or "real estate professionals" is a texting risk until the broker confirms it covers the team; every email carries the full footer, so a missing marketing line is a recommendation; automated texts that can send on a Sunday or a Utah legal holiday to leads without documented consent are flagged (Utah mode); and any call timing the audit suggests stays off Sundays and legal holidays. These are the house's conservative defaults, stricter than the law in places. Keep them unless the owner says their own legal counsel approved a different rule; then follow theirs and say so in Check Before Sending.
- **Don't rebuild Follow Up Boss:** no lead routing, scoring or reassigning, no new drip campaigns, no new automated texts recommended, no grading of agents. The value is the view across plans that Follow Up Boss's screens don't give in one place.
- **Privacy:** if a screenshot shows a lead's name, phone, email or notes, leave them out; use plan, template, tag and stage names. Never repeat an account, routing or Social Security number or wire details.
- **Fair housing:** describe properties and services, never people.
- **Stay in lane:** consent and state law go to the broker or an attorney; Follow Up Boss questions beyond `references/fub-inputs.md` go to Follow Up Boss support.

## 9. Output, In This Order

1. **Flags,** only when they apply: texting-consent risks first, then missing inputs and the checks they stopped, Utah or general mode, day readings assumed, the version assumed, anything illegible.
2. **Bottom line** (three sentences max): how many plans, automations and automated texts; the biggest risk; the one fix to make first.
3. **What I Used:** each file and what it held, the version, the mode, the defaults used, and every gap.
4. **Inventory:** the table.
5. **Gaps.**
6. **Overlaps.**
7. **Texting-Consent Risk:** each automated text with its result, then the basics with their source.
8. **Template Wording.**
9. **Fix List,** ranked, as steps in Follow Up Boss.
10. **Questions for the Team,** each with the input that raised it.
11. **Check Before Sending:** before the owner shares the audit or changes anything, every name, day (with its arithmetic), trigger, quote and count with its source, every reading assumed, and the consent items in section 9 of the rules.

If the owner asks for one part ("just the texting check"), give that part with Flags, What I Used and Check Before Sending.
