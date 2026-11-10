---
name: 1099 Vendor & Agent Readiness
description: >-
  Use when asked to get a real estate team ready for 1099s: track W-9s for
  vendors, transaction coordinators, photographers, stagers, coaches, and 1099
  agents; compare payments in QuickBooks Online to collected W-9s; and flag
  missing forms and year-to-date totals approaching the IRS threshold. Do not
  use to prepare or e-file the 1099 forms themselves, and do not assume anyone
  files expense reports.
---

# 1099 Vendor & Agent Readiness

Goal: keep a running picture of who the team paid, whether a W-9 is on file, and who is approaching or over the IRS information-return threshold, so January is a check, not a scramble. This is bookkeeping support, not tax advice, and the bot does not file anything.

## Who it's for

Team leaders and ops leaders who pay 1099 agents, transaction coordinators, photographers, stagers, assistants, coaches, or other contractors. Solo agents who pay a few vendors still benefit. Teams that run everyone as W-2 employees will use this only for outside vendors.

## What it connects to

- **QuickBooks Online connector**: vendors, 1099-eligible payment totals (checks, expenses, bills, ACH), vendor 1099 flags, and the expense accounts used for contractor spend. Export the 1099 Transaction Detail or Vendor Contact List if the connector cannot produce year-to-date totals.
- **Google Drive**: the W-9 folder. A completed W-9 counts as "on file" only when a document is actually there or QBO shows a completed vendor 1099 setup; do not take someone's word in a chat as a substitute without noting it as unverified.
- **Gmail**: W-9s that arrived as attachments and have not been filed in the folder yet. Move or copy only after the user asks; otherwise note "W-9 found in email, not yet in the W-9 folder."
- **Sheets**: optional vendor tracker if they already have one.

This skill does not use expense reports and does not prepare Form 1099-NEC, 1099-MISC, or 1096.

## Guardrails

- **Read-only by default.** Never edit a vendor record, never toggle "Track payments for 1099," never e-file, and never recategorize payments to change 1099 totals.
- **Write actions need fresh approval every time** (for example, saving a W-9 the user asked you to file in the Drive folder, or updating a tracker row they named).
- **Never display a TIN.** Do not write an SSN or EIN in chat, email, a sheet column, or a screenshot. Allowed: "TIN on file: yes/no," "TIN type: SSN / EIN / unknown," and "W-9 on file: yes/no."
- **Never invent totals or thresholds.** Look up the current IRS reporting threshold for the tax year in question on each run. For payments made in calendar year 2026 the IRS published a $2,000 threshold for many 1099-NEC and 1099-MISC payments (it was $600 for payments before 2026, and it is scheduled to adjust for inflation in later years). Confirm the current IRS figure before using it; if you cannot confirm it, flag that and do not guess.
- **Flag rather than guess** who is 1099-reportable. Corporations are often exempt from 1099-NEC except in special cases (for example, certain attorney payments). If entity type is unknown, mark `entity-unknown`; do not skip them and do not add them to a filing list.
- **Not tax or legal advice.** This skill does not decide whether someone is an independent contractor or an employee, and it does not decide which box of which form applies.
- **Last 4 only** on any bank accounts mentioned.
- **Trust funds.** Payments from a trust account are a red flag, not a 1099 source to process. Point those to Trust & Earnest Money Watch. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.** Do not email vendors asking for a W-9 unless the user explicitly approves a named draft.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team name, and who owns January filing** (usually the owner or their CPA)? (memory: `bk.role`, `bk.team_name`, `bk.1099_owner`)
2. **Which QBO company and which tax year** are we tracking? (memory: `bk.qbo_company`, `bk.1099_tax_year`)
3. **Where is the W-9 folder**, and what naming pattern do you want (`VendorName-W9-YYYY`)? (memory: `bk.w9_folder`)
4. **Which vendors are always in scope** (1099 agents, TCs, photographers, stagers, coaches)? Any vendors to exclude (for example, W-2 staff, already-known corporations confirmed by the CPA)? (memory: `bk.1099_scope`, `bk.1099_exclude`)
5. **CPA or tax preparer** who will actually file, if any? (memory: `bk.cpa_name`)
6. **May I draft (not send) W-9 request emails** when someone is missing a form? (memory: `bk.w9_draft_ok`)
7. **Schedule?** Default suggestion: the 15th of each month at 10:00 AM in the user's timezone, then every Monday at 10:00 AM from October 1 through January 31. (memory: `bk.schedule`)

## Recommended routine

**Schedule:** Monthly on the 15th at 10:00 AM, and weekly on Mondays at 10:00 AM from October through January.

**Cron (example, America/Chicago, monthly):** `0 10 15 * *`

**Cron (example, weekly peak season):** `0 10 * * 1`

**Routine prompt to save:**

```
Run @1099 Vendor & Agent Readiness for the current tax year.

Use the remembered QuickBooks company, W-9 folder, and in-scope vendor list. Pull year-to-date payments by vendor. Look up the current IRS 1099-NEC / 1099-MISC reporting threshold for this tax year and state the source.

Flag vendors at or above the threshold, vendors approaching it, vendors with payments but no W-9 on file, and vendors whose entity type is unknown. Do not display TINs. Do not edit vendors, recategorize payments, or file any forms.

Draft W-9 request emails only as drafts in the workbook (do not send) unless I approve a named message in that conversation.

If the list is clean, say so and attach the workbook.
```

## Procedure

1. **Load memory** and set the tax year (calendar year of the payments, unless they said otherwise).
2. **Look up the IRS threshold** for 1099-NEC and 1099-MISC for that year. Record the figure and the source URL or publication. If lookup fails, stop short of an "over threshold" conclusion and say why.
3. **Pull vendor payments year-to-date** from QBO: vendor name, payment total, payment methods, 1099 tracking flag if visible, and entity type if visible. Include 1099 agents paid through the books.
4. **Match W-9s.** For each in-scope vendor, check the W-9 folder (and QBO vendor record) for a form. Status: `W-9 on file`, `W-9 in email only`, `missing`, `illegible`, or `name-mismatch` (the W-9 legal name does not match the QBO vendor; flag, do not invent a correction).
5. **Classify, without deciding tax treatment:**
   - `over-threshold`: YTD payments at or above the looked-up threshold
   - `approaching`: YTD at or above 50% of the threshold (or a remembered percentage)
   - `under`
   - `entity-unknown`
   - `excluded-per-user` (on `bk.1099_exclude`)
   - `has-federal-withholding`: if QBO shows backup withholding, flag regardless of amount (the IRS requires reporting when tax was withheld, even below the threshold; note this as a reminder to confirm with their CPA, not as a filing instruction)
6. **Name and address gaps.** Flag missing mailing addresses needed for a form, without displaying any TIN.
7. **Draft (do not send)** W-9 requests for `missing` vendors if `bk.w9_draft_ok` is true, or always park drafts in the workbook.
8. **Carry forward** last run's open items and note who newly crossed the threshold.
9. **Save** `1099-readiness-YYYY-MM-DD` and send the chat summary.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Tax year and the IRS threshold you used, with source
- Counts: vendors paid, W-9s on file, missing W-9s, over threshold, approaching, entity-unknown
- The over-threshold and missing-W-9 lists (vendor name, YTD amount, W-9 status only, no TINs)
- A reminder that their CPA files the forms, and that this is not a filing
- One line: "Bookkeeping support only, not tax or legal advice."

**Workbook sheets:**

1. `Summary`
2. `Vendor-YTD` (no TIN column)
3. `Missing-W9`
4. `Over-or-approaching-threshold`
5. `Entity-unknown`
6. `Draft-W9-requests` (unsent)
7. `Open-items`

## Sample output (EXAMPLE DATA ONLY)

The following vendors and amounts are fictional examples. They are not this user's books. The threshold shown is an example of how to cite a looked-up figure.

**Chat summary (example)**

1099 Vendor & Agent Readiness as of 10 Nov 2026 (example), tax year 2026.

IRS threshold used: $2,000 for many 1099-NEC / 1099-MISC payments made in 2026, per IRS "Am I required to file a Form 1099" (confirm on IRS.gov on each live run; later years may be inflation-adjusted).

- 14 vendors with payments this year (example)
- 9 with a W-9 on file
- 3 missing a W-9
- 4 at or above $2,000
- 2 approaching ($1,000 to $1,999.99)
- 2 entity-unknown

Needs attention:
1. Riley Chen, $18,440.00 YTD (example), W-9 on file, over threshold
2. Pine Street Photography LLC, $4,200.00 YTD (example), W-9 missing, over threshold
3. Harbor Staging Co., $1,650.00 YTD (example), W-9 missing, approaching
4. Westvale Coaching, $2,400.00 YTD (example), W-9 on file, entity-unknown (do not assume reportable or exempt)

No TINs are shown. No vendor records were edited. No forms were filed. Draft W-9 requests for Pine Street Photography LLC and Harbor Staging Co. are in the workbook; they have not been sent.

Bookkeeping support only, not tax or legal advice.
