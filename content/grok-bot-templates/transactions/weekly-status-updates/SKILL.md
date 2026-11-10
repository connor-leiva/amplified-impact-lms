---
name: Weekly Client & Agent Status Updates
description: >-
  Use when asked to draft weekly real estate transaction status updates for
  clients and for the listing or buyer's agent. Pull deadlines and open items
  from the tracker; write drafts only. Never send a message, and never invent
  a date or a progress claim.
---

# Weekly Client & Agent Status Updates

Goal: once a week, draft a plain-language status note for each active client (and a tighter internal note for the agent or TC) so no one has to rebuild the story from scratch. Every message stays in the draft folder until the user approves sending that named draft.

## Who it's for

Transaction coordinators and ops leads who update multiple clients each week, and agents who want a first draft they can personalize. Covers buyer and listing files that are under contract. Listing-not-yet-under-contract updates belong with Listing-to-Live Launch Checklist, not here.

## What it connects to (system-agnostic)

Ask which system(s) they use and how to read file status: connector, CSV/export, shared Drive folder, email inbox, or browser. Examples: Dotloop, SkySlope, Brokermint, Lone Wolf / TransactionDesk, Paperless Pipeline, Open to Close, Google Drive/Sheets, email.

**Fallback:** the Google Sheet tracker plus Gmail. Combine with the latest Contract-to-Close digest and Missing-Documents audit when those workbooks exist.

Optional CRM (Follow Up Boss or similar) for client preferred name and preferred channel (email vs SMS). Do not change CRM stage. Do not send from the CRM.

## Guardrails

- **Drafts only. Never send.** Do not email, text, portal-message, or Slack a client, agent, lender, or title company unless the user explicitly approves a named draft in the same conversation ("send CLIENT-10441"). Then send only that draft, unchanged except for fixes they requested, and stop.
- **Never invent dates or progress.** If inspection day is not in the tracker or an email confirmation, write "Inspection date not yet in the file"; do not say "inspection is scheduled next week."
- **Show sources.** Every date in a draft should match a printed or computed contract date (point at the tracker row). If you computed it, the internal agent draft may include the math; the client draft should use the resulting date only, still without extra claims.
- **Flag rather than guess** when the tracker and a recent email disagree. Put the conflict in the internal draft, not a confident sentence in the client draft.
- **Never handle wire instructions.** Never include account numbers, "the wiring info is attached," or forwarded title emails. If closing is within 7 days, add a short wire-fraud warning that tells the client to verify instructions by calling a phone number they already trust, not a number from an email, and do not attach or quote any account details.
- **Minimize personal data.** Use first names the user already uses with that client. No SSNs, no full address line 2 if it includes a unit the user asked to keep private, no loan numbers.
- **Not legal advice.** Do not tell a client they "must" cancel, they "have waived," or their earnest money "is non-refundable." If a due-diligence date is near, you may say the date is approaching and the agent will walk them through options.
- **Tone:** calm, specific, short paragraphs. No hype. No promises about appraisal or lender timing that the lender has not written down.
- **Contact no one** until a named send is approved.
- Trust account rules vary by state (Utah-first playbook, otherwise general mode); do not discuss disbursement of earnest money in a status email.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, sides?** (memory: `tm.role`, `tm.team_name`, `tm.sides`)
2. **Which transaction system(s)** and how to read them? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet?** (memory: `tm.sheet_tracker`)
4. **Who receives what?** Client updates, listing-agent updates, buyer-agent updates, optional team-lead digest. Preferred channel per audience (email vs SMS vs Slack). (memory: `tm.update_audiences`)
5. **Voice notes:** phrases to use or avoid, whether to include next deadlines, whether the agent always reviews before anything goes to a client (default: yes). (memory: `tm.update_voice`)
6. **Who approves sends?** (memory: `tm.approver`)
7. **Schedule?** Default suggestion: Monday at 10:00 AM in the user's timezone. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Weekly, Monday at 10:00 AM in the user's timezone.

**Cron (example, America/Chicago):** `0 10 * * 1`

**Routine prompt to save:**

```
Run @Weekly Client & Agent Status Updates.

Draft a client status update and an internal agent update for each active under-contract file, using the tracker and the latest deadline digest. Never invent a date or a scheduled event that is not in the file.

Leave every message as a draft. Do not send anything unless I explicitly approve a named draft ID in that conversation. Do not include wire instructions or account numbers. If a file is in its closing week, include a short wire-fraud reminder that tells the client to verify instructions by calling a known trusted number.

Identify files by address and file number in the internal digest I see in chat.
```

## Procedure

1. **Load memory** and the current active-file list with deadlines and open items.
2. **For each file, gather only documented facts:** next 1 to 3 deadlines (with source), documents still missing, last confirmed milestone (inspection occurred, appraisal ordered, title commitment received, clear-to-close, only if a document or email says so), and any conflict flags.
3. **Draft CLIENT-{file}** in the remembered voice: where we are, what's next (dated), what if anything we still need from them. No legal conclusions. No invented appointments.
4. **Draft AGENT-{file}** (or TC internal): the same facts plus conflicts, missing docs, stalled vendor items, and suggested follow-ups (not sent). Include date math only here, if relevant.
5. **Draft optional LEAD-digest:** a bullet list of all files for the team lead, no client contact info beyond address and file number.
6. **Do not send.** List draft IDs in chat with one-line previews.
7. **If the user approves named IDs:** send only those, record sent time in the workbook, and stop. If a send fails, report it and do not retry the others without asking.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Number of files covered
- Draft IDs grouped by file, with audience and one-line preview
- Files skipped and why (just closed, just cancelled, missing contract)
- A reminder that nothing was sent
- One line: "Transaction support only, not legal advice."

**Workbook sheets:**

1. `Draft-index`
2. `Client-drafts` (full text)
3. `Agent-drafts` (full text)
4. `Lead-digest-draft`
5. `Send-log` (filled only after approval)

## Sample output (EXAMPLE DATA ONLY)

The following names, addresses, and dates are fictional examples. They are not this user's clients.

**Chat summary (example)**

Weekly Client & Agent Status Updates for the week of 10 Nov 2026 (example). 2 active files. Nothing sent.

- CLIENT-10441: 1842 Willow Creek Dr (example), preview: "Seller disclosures are due today, 10 Nov, and your due-diligence date is 13 Nov. I do not yet have an inspection-appointment confirmation in the file."
- AGENT-10441: same file, preview: internal note that seller disclosures PDF is unsigned and EM receipt is still missing (see file audit example).
- CLIENT-10458: 55 North Pier Pl (example), preview: "We are waiting on a documented earnest-money receipt. I will not guess a delivery status."
- AGENT-10458: flags the overdue earnest-money delivery computed in the deadline tracker example.

Reply with any draft IDs you want sent (for example, CLIENT-10441 after you edit it) and I will send only those.

Transaction support only, not legal advice.

**Client draft excerpt (example, not sent)**

Subject: Update on 1842 Willow Creek Dr

Hi Jordan and Sam, a short status on your purchase of 1842 Willow Creek Dr.

Where we are: the contract is signed. I do not yet have a copy of signed seller disclosures in the file.

What's next: seller disclosures are due 10 Nov 2026, and your due-diligence date is 13 Nov 2026 (both taken from your contract's deadline box). If you have already scheduled the inspection, send me the confirmation and I will add it; I do not want to guess a time that is not in the file.

What I need from you: nothing else today unless you have that inspection confirmation.

I will write again when something in the file changes.
