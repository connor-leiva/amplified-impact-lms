---
name: Listing-to-Live Launch Checklist
description: >-
  Use when preparing a real estate listing to go live on the MLS or when a
  seller has just signed a listing agreement: run a launch checklist (photos,
  disclosures, remarks, sign, lockbox, coming-soon vs active). Draft remarks
  and task lists only. Never publish to the MLS, and never put lockbox, gate,
  or alarm codes in a report.
---

# Listing-to-Live Launch Checklist

Goal: get a listing from signed agreement to "live" without missing the boring things that delay a launch (disclosures, photos, remarks, sign, lockbox, and office coming-soon rules) and without publishing anything until the user approves a named step.

## Who it's for

Listing agents, listing coordinators, and ops leads. This skill is for pre-launch and launch day. Once the property is under contract, switch to New Contract Intake and the Contract-to-Close tracker.

## What it connects to (system-agnostic)

Ask which system(s) they use for listings and how to read them: connector, CSV/export, shared Drive folder, email inbox, or browser. Listing tools vary even more than transaction tools. Examples: an MLS (browser only; the bot does not get a private MLS API), Dotloop / SkySlope / Brokermint / Lone Wolf / Paperless Pipeline / Open to Close for the listing file, Google Drive for photos and seller docs, and email.

**Fallback:** a Google Sheet listing-launch tracker plus a Drive folder per property and Gmail.

Optional CRM (Follow Up Boss or similar) for the seller record; do not change stage until approved.

## Guardrails

- **Drafts only.** Never hit publish/live/coming-soon in the MLS, never order photography, never email the seller or the photographer, and never place a sign or lockbox order unless the user explicitly approves that named action in the same conversation.
- **Never invent dates, measurements, taxes, HOA dues, room counts, or year built.** Copy those only from a document the seller or public record already provided, and cite the source. If two sources disagree (owner-stated sqft vs appraisal vs tax record), flag both; do not pick.
- **Never invent listing remarks that claim a fact not in the file** (new roof, warranty, views, "never flooded," school names, rental income). Draft remarks only from documented facts plus clearly marked placeholder brackets like `[confirm year of roof]`.
- **Never put lockbox codes, gate codes, alarm codes, combo-lock codes, or hide-a-key locations** in chat, email, the workbook, or remarks. Write `code-on-file-with-team` or "see the team's secure showing field." If the user pastes a code into chat, do not repeat it and ask them to store it in their showing tool instead.
- **Never handle wire instructions** (rare on listing launch, but the same rule applies).
- **Flag rather than guess** coming-soon eligibility, pocket-listing policy, and MLS fine risk. If office policy is not in memory, ask; do not assume a coming-soon status is allowed.
- **Minimize personal data.** Do not put the seller's phone, email, or travel dates in MLS remarks. Occupancy and showing instructions should be generic unless the seller agreed to specific public language.
- **Not legal or fair-housing advice.** Draft remarks must avoid steering and unprotected claims. If you are unsure about a phrase, flag it for the agent rather than publishing it.
- **Contact no one** until a named send or order is approved.
- Trust account rules vary by state (Utah-first playbook, otherwise general mode) and usually do not apply here unless a retainer is held; do not mix any retainer with operating commentary.

## Setup questions (ask once, then remember)

Ask one at a time. Save answers as memories.

1. **Role, team, and MLS/board name?** (memory: `tm.role`, `tm.team_name`, `tm.mls_name`)
2. **Which listing file system(s)** and how to read them? (memory: `tm.systems`, `tm.read_method`)
3. **Fallback Sheet and photo/doc folder pattern?** (memory: `tm.sheet_tracker`, `tm.listing_folder`)
4. **Official listing-launch checklist** from the brokerage or team (wins over any default). Include their coming-soon / office-exclusive policy if they have one. (memory: `tm.listing_checklist`, `tm.coming_soon_policy`)
5. **Preferred vendors** (photographer, sign shop, lockbox type) and how orders are placed (memory: `tm.listing_vendors`)
6. **Who approves MLS publish and seller emails?** (memory: `tm.approver`)
7. **Schedule?** Default suggestion: weekdays at 8:00 AM in the user's timezone for listings in a pre-launch status, plus on-demand when a listing agreement is signed. (memory: `tm.schedule`)

## Recommended routine

**Schedule:** Weekdays at 8:00 AM in the user's timezone (no-ops when nothing is in pre-launch).

**Cron (example, America/Chicago):** `0 8 * * 1-5`

**Routine prompt to save:**

```
Run @Listing-to-Live Launch Checklist.

Review listings in pre-launch (signed listing agreement, not yet live, or live with open launch items). Compare each file to the remembered brokerage launch checklist.

Draft MLS remarks only from documented facts, with [confirm …] brackets around anything unverified. Never publish to the MLS, never order vendors, and never send seller email unless I explicitly approve a named action in that conversation.

Never write lockbox, gate, or alarm codes into the report or remarks. Never invent measurements, taxes, HOA dues, or property claims.
```

## Procedure

1. **Load memory** and list pre-launch properties (from the Sheet, Drive, or file system).
2. **Inventory each file** against the remembered checklist. If no official checklist exists, ask for one and, until it arrives, use a clearly labeled unofficial starter list:
   - Fully signed listing agreement (and any office-required addenda)
   - Seller disclosures complete enough to deliver (state-specific; Utah files often use the Utah seller-disclosure packet, still only required if the broker checklist or user says so)
   - Lead-based paint disclosure if year built is documented as pre-1978; if year built is unknown, flag `year-built-unknown`
   - Photos / floor plan / video: scheduled, received, or missing (do not invent a shoot date)
   - Measurements and source
   - HOA name, dues, and docs if an HOA is documented
   - Listing remarks draft
   - Coming-soon vs active decision against remembered policy
   - Sign and flyer-box
   - Lockbox installed (yes/no only; no codes)
   - Showing instructions (no codes)
   - Seller preferred timing and occupancy, phrased safely
   - Pricing / CMA document present or not (do not invent a list price)
3. **Draft remarks** from documented facts only, with `[confirm …]` placeholders. Flag any phrase that could be a fair-housing or overclaim risk for the agent to rewrite.
4. **Propose actions** as IDs: LAUNCH-remarks, LAUNCH-photo-order, LAUNCH-sign-order, LAUNCH-seller-email, LAUNCH-mls-publish. All `draft-only`.
5. **Save** `listing-launch-YYYY-MM-DD` and send the chat summary.

If a sign-in or one-time code is needed, ask the owner in chat to complete that step, then continue.

## Output format

**Chat summary (short):**

- Listings in pre-launch and the next blocker for each
- Open checklist items
- Draft IDs waiting for approval
- One line: "Transaction support only, not legal or fair-housing advice. Nothing was published."

**Workbook sheets:**

1. `Launch-board`
2. `Checklist` (one row per item per listing)
3. `Remarks-drafts`
4. `Proposed-orders-and-emails`
5. `Flags`

## Sample output (EXAMPLE DATA ONLY)

The following listing details are fictional examples. They are not this user's listing.

**Chat summary (example)**

Listing-to-Live Launch Checklist for 10 Nov 2026 (example). 1 pre-launch file.

220 Sample Ave, Sample City, UT (example)
- Listing agreement: present-signed, dated 7 Nov 2026 (example)
- List price: $742,000 (printed on the listing agreement, not invented)
- Year built: 1984 (from the seller worksheet in the folder), lead-based paint item marked n/a based on that documented year
- Photos: not in the folder; no shoot confirmation on file (`missing`)
- Seller disclosures: packet uploaded, seller signature block blank (`present-unsigned`)
- Coming-soon: office policy memory says coming-soon requires broker approval, flagged, not scheduled
- Remarks draft: LAUNCH-remarks-220 (uses only documented bed/bath from the seller worksheet; roof age bracketed `[confirm roof year]`)
- Lockbox: not installed. No codes recorded.

Blocker: unsigned seller disclosures and no photos. Proposed drafts (not done): LAUNCH-photo-order, LAUNCH-seller-email (disclosures + photo scheduling). MLS publish is **not** offered until those two are present.

Transaction support only, not legal or fair-housing advice. Nothing was published.
