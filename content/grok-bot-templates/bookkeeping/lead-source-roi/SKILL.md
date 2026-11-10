---
name: Lead-Source ROI
description: >-
  Use when asked to compare marketing and lead-generation spend in QuickBooks
  Online to closed units, volume, and GCI in Follow Up Boss or another CRM by
  lead source, and to flag sources that are untagged, unprofitable, or missing
  from one side. Do not use for weekly card categorization alone or for
  commission split calculations.
---

# Lead-Source ROI

Goal: once a month, put "what we spent" next to "what actually closed" for each lead source, so the owner can see cost per closing and cost per GCI dollar, and see the spend or the deals that were never tagged. This is bookkeeping and production support, not tax advice and not a promise that a source will perform the same next month.

## Who it's for

Agents and team leaders who buy leads or run ads (Zillow, Realtor.com, Google, Facebook, open houses, sphere, and the rest) and want the P&L to talk to the CRM. Ops leaders who report source performance to the owner.

## What it connects to

- **QuickBooks Online connector**: expenses for the month and year-to-date in marketing, advertising, lead-generation, and related accounts, preferably with vendor and class/location. Export Transaction Detail by Account if needed.
- **Follow Up Boss (browser, export, or API if connected)**: closed deals in the period with lead source, close date, sale price, and GCI if present. If FUB is not the CRM, use the remembered CRM the same way.
- **Google Drive / Sheets**: the source-mapping table (QBO vendor or category → CRM lead-source name) and the monthly ROI workbook.
- **Gmail (optional)**: vendor invoices that explain an untagged ad charge.

This skill does not use expense reports. Card charges should already be categorized; if a large marketing charge is still uncategorized, flag it and point to Weekly Card & Bank Audit rather than guessing the source.

## Guardrails

- **Read-only by default.** Never recategorize QBO expenses, never change a CRM lead source, never delete or merge a contact, and never turn an ad account on or off.
- **Write actions need fresh approval every time** (for example, applying a source tag the user named).
- **Never invent numbers.** If GCI is missing on a CRM close, leave GCI blank and compute volume from sale price only where the sale price is present. Do not estimate GCI as "3% of sale price" or any other assumed rate.
- **Flag rather than guess** when a QBO vendor does not map to a CRM source, or when a closed deal has no source.
- **Do not invent ROI conclusions** beyond the arithmetic ("spend ÷ closings = cost per close"). Do not tell them to cancel a source.
- **Last 4 only** on any payment account mentioned.
- **Minimize personal data.** Report production as counts, volume, GCI, and source, not buyer or seller names. Property address is optional and only when needed to identify an untagged close.
- **Not tax, legal, or investment advice.**
- **Trust funds stay out** of spend totals. Trust account rules vary by state (Utah-first playbook, otherwise general mode).
- **Contact no one.**

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role and team name?** (memory: `bk.role`, `bk.team_name`)
2. **Which QBO company, and which expense accounts count as lead-source spend?** (lead gen, ads, SOA/sphere mailers, open-house costs, realtor-media, and so on) (memory: `bk.qbo_company`, `bk.roi_spend_accounts`)
3. **Which CRM**, and how should I read it? Browser login, CSV export dropped in Drive, or a connector. Default CRM assumption only after they name it (often Follow Up Boss). (memory: `tm.crm`, `tm.crm_read_method`)
4. **Which CRM field is the lead source**, and which date field defines "closed this month" (close date vs settlement vs marked-won)? (memory: `bk.roi_source_field`, `bk.roi_close_date_field`)
5. **Mapping table.** Walk through their top vendors (Zillow, Realtor.com, Google Ads, Meta, Homes.com, OpCity, a ISA shop, postcard vendor) and match each to the CRM source name. Save as `bk.roi_source_map`. Unmapped vendors get flagged every month, not forced into "Other."
6. **Do you track QBO classes by lead source as well as by agent?** If yes, prefer class over vendor when both exist and note conflicts. (memory: `bk.lead_source_classes`)
7. **Any sources that are relationship-based** (sphere, past clients, agent referrals) where spend will be $0 or shared? (memory: `bk.roi_organic_sources`)
8. **Schedule?** Default suggestion: the 5th of each month at 10:00 AM in the user's timezone, after month-end categorization has had a couple of days. (memory: `bk.schedule`)

## Recommended routine

**Schedule:** Monthly, on the 5th at 10:00 AM in the user's timezone.

**Cron (example, America/Chicago):** `0 10 5 * *`

**Routine prompt to save:**

```
Run @Lead-Source ROI for the prior calendar month and for year-to-date.

Use the remembered QuickBooks spend accounts, CRM, close-date rule, and vendor-to-source mapping. Pull marketing and lead-gen spend from QuickBooks Online and closed production from the CRM.

Compare spend to closed units, volume, and GCI (only where GCI is present; do not estimate GCI). Flag unmapped spend and closings with no lead source.

Do not recategorize expenses or edit CRM records unless I explicitly approve specific lines in that conversation. No buyer or seller names in the summary.

Save the dated workbook and send a short chat summary.
```

## Procedure

1. **Load memory** (spend accounts, CRM method, mapping, close-date rule).
2. **Pull QBO spend** for the prior month and YTD from the remembered accounts: date, vendor, amount, category, class, memo. Exclude transfers, trust activity, and anything the user marked out of scope.
3. **Map each spend line** through `bk.roi_source_map`. Status: `mapped`, `unmapped`, or `conflict` (class says one source, vendor map says another).
4. **Pull CRM closings** for the same month and YTD using the remembered date field: source, close date, sale price if present, GCI if present, file or deal id. Do not invent GCI.
5. **Normalize CRM sources** through the same mapping (CRM name is usually already the canonical name). Flag blank or "Unknown" sources.
6. **Join on source** and compute, only from real numbers:
   - Spend
   - Closed units
   - Volume (sum of sale prices that are present; note if some sale prices are missing)
   - GCI (sum where present; note coverage, e.g. "GCI present on 7 of 9 closes")
   - Cost per closing = spend ÷ closed units, only if units > 0
   - Cost per GCI dollar = spend ÷ GCI, only if GCI > 0
   - Closings with $0 mapped spend (organic or untagged spend)
   - Spend with 0 closings
7. **Do not project** future closings or assign pipeline a dollar value unless the user also asked for a separate pipeline snapshot, and even then, keep it on its own sheet, never blended into actual ROI.
8. **Carry forward** last month's unmapped items that are still unmapped.
9. **Save** `lead-source-roi-YYYY-MM` and send the chat summary.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Period (month and YTD)
- Total mapped spend, closed units, volume, GCI coverage
- A compact table of sources: spend, units, volume, GCI, cost per close, cost per GCI dollar
- Unmapped spend total and no-source closings
- One line: "Bookkeeping support only, not tax or investment advice. GCI was not estimated."

**Workbook sheets:**

1. `Summary`
2. `ROI-by-source-month`
3. `ROI-by-source-YTD`
4. `Unmapped-spend`
5. `Closings-without-source`
6. `Mapping-table`
7. `Open-items`

## Sample output (EXAMPLE DATA ONLY)

The following sources, spend, and production figures are fictional examples. They are not this user's results.

**Chat summary (example)**

Lead-Source ROI for October 2026 (example). Spend from QBO marketing and lead-gen accounts. Closings from Follow Up Boss using close date.

October totals (example): mapped spend $6,140.00 · 6 closings · volume $2,410,000 · GCI present on 6 of 6 closes, totaling $66,300.00.

| Source (example) | Spend | Closes | Volume | GCI | Cost / close | Spend / GCI $ |
| --- | --- | --- | --- | --- | --- | --- |
| Zillow | $2,400.00 | 2 | $840,000 | $23,100.00 | $1,200.00 | $0.10 |
| Google Ads | $1,890.00 | 1 | $410,000 | $11,275.00 | $1,890.00 | $0.17 |
| Sphere / SOI | $150.00 | 2 | $790,000 | $21,725.00 | $75.00 | $0.01 |
| Open house | $420.00 | 1 | $370,000 | $10,200.00 | $420.00 | $0.04 |
| Facebook Ads | $1,280.00 | 0 | $0 | $0.00 | None | None |
| Untagged spend | $299.00 | None | None | None | None | None |
| Closings with no source | None | 0 | None | None | None | None |

Untagged spend: $299.00 Zillow Prefplus on 7 Oct still uncategorized in QBO (see Weekly Card & Bank Audit). Not mapped, not assigned to Zillow.

Facebook Ads shows spend and no October closes; that is a fact about this month, not a recommendation to cancel the source.

Nothing was changed in QuickBooks or Follow Up Boss.

Bookkeeping support only, not tax or investment advice. GCI was not estimated.
